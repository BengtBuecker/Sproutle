import { ROOT_ID } from './tree'
import type { TreeModel, TreeNode } from './tree'

export interface WorldPlacement {
  node: TreeNode
  x: number
  y: number
}

export interface World {
  placements: Record<string, WorldPlacement>
  nodesByGeneration: Map<number, WorldPlacement[]>
  childOrder: Record<string, string[]>
  maxGeneration: number
  leafCount: number
  sproutCount: number
  width: number
  height: number
  originX: number
}

const GENERATION_GAP = 90
const HORIZONTAL_STEP = 70
const EDGE_MARGIN = 60
const LABEL_SPACE = 90

export const groundY = 0

export function worldFromModel(model: TreeModel): World {
  const placements: Record<string, WorldPlacement> = {}
  const nodesByGeneration = new Map<number, WorldPlacement[]>()
  let nextSlot = 0
  let maxGeneration = 0

  function place(id: string, generation: number): number {
    maxGeneration = maxGeneration < generation ? generation : maxGeneration
    const children = model.childOrder[id]
    const slot =
      children.length === 0
        ? nextSlot++
        : children.reduce((sum, child) => sum + place(child, generation + 1), 0) / children.length
    const placement: WorldPlacement = {
      node: model.nodes[id],
      x: slot * HORIZONTAL_STEP,
      y: groundY - generation * GENERATION_GAP,
    }
    placements[id] = placement
    const generationPlacements = nodesByGeneration.get(generation)
    if (generationPlacements) generationPlacements.push(placement)
    else nodesByGeneration.set(generation, [placement])
    return slot
  }

  place(ROOT_ID, 0)

  const leafCount = nextSlot
  const spread = leafCount === 0 ? 0 : (leafCount - 1) * HORIZONTAL_STEP
  const sproutCount = Object.values(placements).filter(
    (placement) => placement.node.word !== null,
  ).length
  return {
    placements,
    nodesByGeneration,
    childOrder: model.childOrder,
    maxGeneration,
    leafCount,
    sproutCount,
    width: 2 * EDGE_MARGIN + spread + LABEL_SPACE,
    height: maxGeneration * GENERATION_GAP,
    originX: EDGE_MARGIN,
  }
}

export function groundSpan(world: World): { left: number; right: number } {
  return { left: -world.originX, right: -world.originX + world.width }
}

export const VIEW_WIDTH = 1200
export const VIEW_HEIGHT = 800
export const ZOOM_MAX = 2.5
export const FOLLOW_ZOOM = 2

export const METERS_PER_GENERATION = 5

export function heightMeters(world: World): number {
  return world.maxGeneration * METERS_PER_GENERATION
}

export function metersToWorldY(meters: number): number {
  return groundY - (meters * GENERATION_GAP) / METERS_PER_GENERATION
}

export interface HeightTick {
  meters: number
  major: boolean
}

export const HEIGHT_SCALE_TICKS: HeightTick[] = [
  { meters: 1, major: false },
  { meters: 5, major: true },
  { meters: 10, major: true },
  { meters: 25, major: true },
  { meters: 30, major: true },
]

export interface HeightTickView extends HeightTick {
  worldY: number
  screenY: number
}

export function heightScaleView(camera: Camera): HeightTickView[] {
  return HEIGHT_SCALE_TICKS.map((tick) => {
    const worldY = metersToWorldY(tick.meters)
    return {
      ...tick,
      worldY,
      screenY: VIEW_HEIGHT / 2 + (worldY - camera.focusY) * camera.zoom,
    }
  })
}

export function cameraTransform(camera: Camera): string {
  return `translate(${VIEW_WIDTH / 2}px, ${VIEW_HEIGHT / 2}px) scale(${camera.zoom}) translate(${-camera.focusX}px, ${-camera.focusY}px)`
}

export const PAN_MARGIN = 120
const BOUNDS_PAD_LEFT = 10
const BOUNDS_PAD_TOP = 10
const BOUNDS_PAD_BOTTOM = 4

export interface Camera {
  focusX: number
  focusY: number
  zoom: number
  following: boolean
  eased: boolean
}

export const START_CAMERA: Camera = {
  focusX: 0,
  focusY: 0,
  zoom: 1,
  following: true,
  eased: true,
}

export type CameraAction =
  | { type: 'frame-ground' }
  | { type: 'frame-tree' }
  | { type: 'frame-puzzle' }
  | { type: 'follow-growth' }
  | { type: 'set-following'; following: boolean }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'resume-follow' }

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function treeBounds(world: World): Bounds {
  return {
    minX: -BOUNDS_PAD_LEFT,
    maxX: (world.leafCount - 1) * HORIZONTAL_STEP + LABEL_SPACE,
    minY: -world.height - BOUNDS_PAD_TOP,
    maxY: BOUNDS_PAD_BOTTOM,
  }
}

export function zoomFit(world: World): number {
  const bounds = treeBounds(world)
  const spanWidth = bounds.maxX - bounds.minX
  const spanHeight = bounds.maxY - bounds.minY
  return Math.min(1, Math.min(VIEW_WIDTH / spanWidth, VIEW_HEIGHT / spanHeight))
}

function centerOrClamp(value: number, low: number, high: number): number {
  if (low > high) return (low + high) / 2
  return Math.min(high, Math.max(low, value))
}

export function clampCamera(world: World, camera: Camera): Camera {
  const bounds = treeBounds(world)
  const zoom = Math.min(ZOOM_MAX, Math.max(zoomFit(world), camera.zoom))
  const halfWidth = VIEW_WIDTH / 2 / zoom
  const halfHeight = VIEW_HEIGHT / 2 / zoom
  return {
    ...camera,
    zoom,
    focusX: centerOrClamp(
      camera.focusX,
      bounds.minX - PAN_MARGIN + halfWidth,
      bounds.maxX + PAN_MARGIN - halfWidth,
    ),
    focusY: centerOrClamp(
      camera.focusY,
      bounds.minY - PAN_MARGIN + halfHeight,
      bounds.maxY + PAN_MARGIN - halfHeight,
    ),
  }
}

export function newestPlacement(world: World): WorldPlacement {
  let newest = world.placements[ROOT_ID]
  for (const placement of Object.values(world.placements)) {
    if (placement.node.sproutIndex > newest.node.sproutIndex) newest = placement
  }
  return newest
}

function frameGround(world: World, camera: Camera): Camera {
  return clampCamera(world, {
    ...camera,
    focusX: 0,
    focusY: groundY,
    zoom: 1,
    following: true,
    eased: true,
  })
}

function frameTree(world: World, camera: Camera): Camera {
  const bounds = treeBounds(world)
  return clampCamera(world, {
    ...camera,
    focusX: (bounds.minX + bounds.maxX) / 2,
    focusY: (bounds.minY + bounds.maxY) / 2,
    zoom: zoomFit(world),
    following: true,
    eased: true,
  })
}

function followNewestGrowth(world: World, camera: Camera, following: boolean): Camera {
  const target = newestPlacement(world)
  return clampCamera(world, {
    ...camera,
    focusX: target.x,
    focusY: target.y,
    zoom: FOLLOW_ZOOM,
    following,
    eased: true,
  })
}

export function cameraReducer(camera: Camera, action: CameraAction, world: World): Camera {
  switch (action.type) {
    case 'frame-ground':
      return frameGround(world, camera)
    case 'frame-tree':
      return frameTree(world, camera)
    case 'frame-puzzle':
      return world.sproutCount > 0 ? frameTree(world, camera) : frameGround(world, camera)
    case 'follow-growth': {
      if (!camera.following) return camera
      return followNewestGrowth(world, camera, true)
    }
    case 'pan':
      return clampCamera(world, {
        ...camera,
        focusX: camera.focusX + action.dx / camera.zoom,
        focusY: camera.focusY + action.dy / camera.zoom,
        following: false,
        eased: false,
      })
    case 'zoom':
      return clampCamera(world, {
        ...camera,
        zoom: camera.zoom * action.factor,
        following: false,
        eased: false,
      })
    case 'resume-follow':
      return followNewestGrowth(world, camera, true)
    case 'set-following':
      return { ...camera, following: action.following }
  }
}

export interface BranchLimb {
  nodeId: string
  d: string
  width: number
}

export interface Twig {
  nodeId: string
  d: string
  leafX: number
  leafY: number
  labelX: number
  labelY: number
}

export interface RootCurve {
  d: string
  width: number
  endX: number
  endY: number
}

export interface GrassTuft {
  x: number
  d: string
}

export interface WorldArt {
  branchLimbs: BranchLimb[]
  twigs: Twig[]
  roots: RootCurve[]
  grassTufts: GrassTuft[]
}

const MAX_BRANCH_BOW = 16
const BRANCH_BASE_WIDTH = 7
const BRANCH_WIDTH_PER_GENERATION = 1.2
const BRANCH_MIN_WIDTH = 2
const TWIG_MIN_LENGTH = 26
const TWIG_LENGTH_RANGE = 20
const TWIG_MIN_ANGLE_DEG = -75
const TWIG_ANGLE_RANGE_DEG = 120
const TWIG_BOW_RANGE = 12
const TWIG_LABEL_GAP = 8
const ROOT_MIN_LENGTH = 45
const ROOT_LENGTH_RANGE = 55
const ROOT_MIN_ANGLE_DEG = 25
const ROOT_ANGLE_RANGE_DEG = 130
const ROOT_BOW_RANGE = 18
const ROOT_MIN_WIDTH = 3
const ROOT_WIDTH_RANGE = 1.5
const ROOT_COUNT_BASE = 3
const ROOT_COUNT_RANGE = 3
const GRASS_SPACING = 55
const TUFT_MIN_HEIGHT = 5
const TUFT_HEIGHT_RANGE = 6
const TUFT_LEAN_RANGE = 8
const TUFT_EDGE_PAD_SLOTS = 0.15
const TUFT_POSITION_JITTER = 0.7

const CROWN_MAX_LIMBS = 12
const CROWN_MIN_LENGTH = 40
const CROWN_LENGTH_RANGE = 60
const CROWN_WIDTH = 2.5
const CROWN_BOW_RANGE = 12
const CROWN_LEAN_RANGE = 20
const CROWN_DELAY_STEP = 60
const STAR_COUNT = 36
const STAR_MIN_RADIUS = 1
const STAR_RADIUS_RANGE = 1.5
const SKY_HEIGHT = 340
const SKY_PAD = 40
const STAR_DELAY_BASE = 400
const STAR_DELAY_STEP = 40

export const ART_COLORS = {
  branch: '#92400e',
  twig: '#b45309',
  root: '#78350f',
  grass: '#16a34a',
  ground: '#166534',
} as const

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function curvedPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bow: number,
): string {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const controlX = midX - (dy / length) * bow
  const controlY = midY + (dx / length) * bow
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
}

export function decorateWorld(world: World, seed: number): WorldArt {
  const random = mulberry32(seed)
  const generationOf = new Map<string, number>()
  for (const [generation, placements] of world.nodesByGeneration) {
    for (const placement of placements) {
      generationOf.set(placement.node.id, generation)
    }
  }

  const branchLimbs: BranchLimb[] = []
  for (const placement of Object.values(world.placements)) {
    if (placement.node.parent === null) continue
    const parent = world.placements[placement.node.parent]
    const bow = (random() - 0.5) * 2 * MAX_BRANCH_BOW
    const generation = generationOf.get(placement.node.id) ?? 0
    branchLimbs.push({
      nodeId: placement.node.id,
      d: curvedPath(parent, placement, bow),
      width: Math.max(
        BRANCH_MIN_WIDTH,
        BRANCH_BASE_WIDTH - generation * BRANCH_WIDTH_PER_GENERATION,
      ),
    })
  }

  const twigs: Twig[] = []
  for (const placement of Object.values(world.placements)) {
    if (placement.node.word === null) continue
    const angle = ((TWIG_MIN_ANGLE_DEG + random() * TWIG_ANGLE_RANGE_DEG) * Math.PI) / 180
    const length = TWIG_MIN_LENGTH + random() * TWIG_LENGTH_RANGE
    const leafX = placement.x + Math.cos(angle) * length
    const leafY = placement.y + Math.sin(angle) * length
    const bow = (random() - 0.5) * TWIG_BOW_RANGE
    twigs.push({
      nodeId: placement.node.id,
      d: curvedPath(placement, { x: leafX, y: leafY }, bow),
      leafX,
      leafY,
      labelX: leafX + TWIG_LABEL_GAP,
      labelY: leafY + TWIG_LABEL_GAP / 2,
    })
  }

  const base = world.placements[ROOT_ID]
  const rootCount = ROOT_COUNT_BASE + Math.floor(random() * ROOT_COUNT_RANGE)
  const roots: RootCurve[] = []
  for (let index = 0; index < rootCount; index++) {
    const angle = ((ROOT_MIN_ANGLE_DEG + random() * ROOT_ANGLE_RANGE_DEG) * Math.PI) / 180
    const length = ROOT_MIN_LENGTH + random() * ROOT_LENGTH_RANGE
    const endX = base.x + Math.cos(angle) * length
    const endY = base.y + Math.sin(angle) * length
    const bow = (random() - 0.5) * 2 * ROOT_BOW_RANGE
    roots.push({
      d: curvedPath(base, { x: endX, y: endY }, bow),
      width: ROOT_MIN_WIDTH + random() * ROOT_WIDTH_RANGE,
      endX,
      endY,
    })
  }

  const ground = groundSpan(world)
  const groundWidth = ground.right - ground.left
  const tuftCount = Math.max(6, Math.floor(groundWidth / GRASS_SPACING))
  const grassTufts: GrassTuft[] = []
  for (let index = 0; index < tuftCount; index++) {
    const x =
      ground.left +
      ((index + TUFT_EDGE_PAD_SLOTS + random() * TUFT_POSITION_JITTER) / tuftCount) *
        groundWidth
    const height = TUFT_MIN_HEIGHT + random() * TUFT_HEIGHT_RANGE
    const lean = (random() - 0.5) * TUFT_LEAN_RANGE
    grassTufts.push({
      x,
      d: `M ${x} ${groundY} q ${lean} ${-height / 2} ${lean * 1.6} ${-height}`,
    })
  }

  return { branchLimbs, twigs, roots, grassTufts }
}

export interface CrownLimb {
  d: string
  width: number
  delay: number
}

export interface FinaleStar {
  x: number
  y: number
  r: number
  delay: number
}

export interface FinaleArt {
  crownLimbs: CrownLimb[]
  stars: FinaleStar[]
}

export function finaleArt(world: World, seed: number): FinaleArt {
  const random = mulberry32((seed ^ 0x9e3779b9) >>> 0)
  const topY = -world.height
  const bounds = treeBounds(world)

  const crownTier = (world.nodesByGeneration.get(world.maxGeneration) ?? []).slice(
    0,
    CROWN_MAX_LIMBS,
  )
  const crownLimbs: CrownLimb[] = crownTier.map((placement, index) => {
    const length = CROWN_MIN_LENGTH + random() * CROWN_LENGTH_RANGE
    const endX = placement.x + (random() - 0.5) * CROWN_LEAN_RANGE
    const endY = placement.y - length
    const bow = (random() - 0.5) * 2 * CROWN_BOW_RANGE
    return {
      d: curvedPath(placement, { x: endX, y: endY }, bow),
      width: CROWN_WIDTH,
      delay: index * CROWN_DELAY_STEP,
    }
  })

  const skyTop = topY - SKY_PAD - SKY_HEIGHT
  const skyBottom = topY - SKY_PAD
  const stars: FinaleStar[] = []
  for (let index = 0; index < STAR_COUNT; index++) {
    stars.push({
      x: bounds.minX + random() * (bounds.maxX - bounds.minX),
      y: skyTop + random() * (skyBottom - skyTop),
      r: STAR_MIN_RADIUS + random() * STAR_RADIUS_RANGE,
      delay: STAR_DELAY_BASE + index * STAR_DELAY_STEP,
    })
  }
  return { crownLimbs, stars }
}
