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
  maxGeneration: number
  leafCount: number
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
  return {
    placements,
    nodesByGeneration,
    maxGeneration,
    leafCount,
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
export const FOLLOW_ZOOM = 1

export const PAN_MARGIN = 120
const BOUNDS_PAD_LEFT = 10
const BOUNDS_PAD_TOP = 10
const BOUNDS_PAD_BOTTOM = 4

export interface Camera {
  focusX: number
  focusY: number
  zoom: number
  following: boolean
}

export const START_CAMERA: Camera = { focusX: 0, focusY: 0, zoom: 1, following: true }

export type CameraAction =
  | { type: 'frame-ground' }
  | { type: 'frame-tree' }
  | { type: 'frame-puzzle' }
  | { type: 'follow-growth' }
  | { type: 'set-following'; following: boolean }

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
  })
}

export function cameraReducer(camera: Camera, action: CameraAction, world: World): Camera {
  switch (action.type) {
    case 'frame-ground':
      return frameGround(world, camera)
    case 'frame-tree':
      return frameTree(world, camera)
    case 'frame-puzzle': {
      const hasSprouts = Object.values(world.placements).some(
        (placement) => placement.node.word !== null,
      )
      return hasSprouts ? frameTree(world, camera) : frameGround(world, camera)
    }
    case 'follow-growth': {
      if (!camera.following) return camera
      const target = newestPlacement(world)
      return clampCamera(world, {
        ...camera,
        focusX: target.x,
        focusY: target.y,
        zoom: FOLLOW_ZOOM,
      })
    }
    case 'set-following':
      return { ...camera, following: action.following }
  }
}
