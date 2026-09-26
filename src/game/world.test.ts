import { describe, expect, it } from 'vitest'
import { buildTree } from './tree'
import {
  FOLLOW_ZOOM,
  HEIGHT_SCALE_TICKS,
  METERS_PER_GENERATION,
  PAN_MARGIN,
  START_CAMERA,
  VIEW_HEIGHT,
  ZOOM_MAX,
  cameraReducer,
  clampCamera,
  decorateWorld,
  finaleArt,
  groundSpan,
  groundY,
  heightMeters,
  heightScaleView,
  metersToWorldY,
  newestPlacement,
  treeBounds,
  worldFromModel,
  zoomFit,
} from './world'
import type { Camera } from './world'
import { cameraWindowOf, expectPlacementInView } from '../test/cameraTestUtils'

const PATH_NUMBERS = /^M (-?[\d.]+) (-?[\d.]+) Q (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)$/

const WIDE_WORDS = [
  'watery',
  'waterproof',
  'backwater',
  'seawater',
  'cutwater',
  'eyewater',
  'dewater',
  'rewater',
  'unwater',
  'waterbed',
  'waterbird',
  'waterboard',
  'waterbottle',
  'waterborne',
  'watercolour',
  'watercooled',
  'watercourse',
  'watercraft',
  'watercross',
  'waterdrum',
]

function wideWorld() {
  return worldFromModel(buildTree('water', WIDE_WORDS))
}

function bowOf(d: string): number {
  const match = d.match(PATH_NUMBERS)
  if (!match) return -1
  const [mx, my, cx, cy, ex, ey] = match.slice(1).map(Number)
  if ([mx, my, cx, cy, ex, ey].some(Number.isNaN)) return -1
  const straightX = (mx + ex) / 2
  const straightY = (my + ey) / 2
  return Math.hypot(cx - straightX, cy - straightY)
}

describe('decorateWorld day-seeded art', () => {
  const world = worldFromModel(buildTree('water', ['watery', 'waterproof', 'backwater']))

  it('is deterministic for a given Puzzle day', () => {
    expect(decorateWorld(world, 7)).toEqual(decorateWorld(world, 7))
  })

  it('varies the art between Puzzle days', () => {
    expect(decorateWorld(world, 7)).not.toEqual(decorateWorld(world, 8))
  })

  it('curves every Branch into an organic limb instead of a diagram line', () => {
    const art = decorateWorld(world, 7)
    const edges = Object.values(world.placements).filter((p) => p.node.parent !== null)
    expect(art.branchLimbs).toHaveLength(edges.length)
    for (const limb of art.branchLimbs) {
      expect(limb.d).toMatch(PATH_NUMBERS)
      expect(bowOf(limb.d)).toBeGreaterThan(0.5)
      expect(limb.width).toBeGreaterThan(0)
    }
  })

  it('connects each Sprout to its Leaf with a Twig and keeps the word on the Leaf', () => {
    const art = decorateWorld(world, 7)
    const wordNodes = Object.values(world.placements).filter((p) => p.node.word !== null)
    expect(art.twigs).toHaveLength(wordNodes.length)
    for (const twig of art.twigs) {
      const node = world.placements[twig.nodeId]
      expect(node.node.word).toBeTruthy()
      expect(twig.leafX).toBeGreaterThan(node.x)
      expect(Math.hypot(twig.leafX - node.x, twig.leafY - node.y)).toBeGreaterThan(0)
    }
  })

  it('spreads Roots beneath the Ground on a fresh day', () => {
    const art = decorateWorld(worldFromModel(buildTree('water', [])), 7)
    expect(art.roots.length).toBeGreaterThanOrEqual(3)
    for (const root of art.roots) {
      expect(root.endY).toBeGreaterThan(groundY)
      expect(root.d).toMatch(PATH_NUMBERS)
    }
  })

  it('sits a grass line with tufts across the Ground', () => {
    const art = decorateWorld(world, 7)
    expect(art.grassTufts.length).toBeGreaterThan(0)
    const ground = groundSpan(world)
    for (const tuft of art.grassTufts) {
      expect(tuft.x).toBeGreaterThanOrEqual(ground.left)
      expect(tuft.x).toBeLessThanOrEqual(ground.right)
    }
  })
})

describe('cameraReducer framing', () => {
  it('frames the Ground on a fresh day: stem and ground line inside the view', () => {
    const world = worldFromModel(buildTree('water', []))
    const camera = cameraReducer(START_CAMERA, { type: 'frame-ground' }, world)
    const view = cameraWindowOf(camera)
    const ground = groundSpan(world)
    expect(view.left).toBeLessThanOrEqual(ground.left)
    expect(view.right).toBeGreaterThanOrEqual(ground.right)
    expect(view.top).toBeLessThanOrEqual(-1)
    expect(view.bottom).toBeGreaterThanOrEqual(groundY)
  })

  it('frames the Puzzle by its progress: Ground when fresh, whole Tree when grown', () => {
    const empty = worldFromModel(buildTree('water', []))
    const fresh = cameraReducer(START_CAMERA, { type: 'frame-puzzle' }, empty)
    const freshView = cameraWindowOf(fresh)
    expect(freshView.left).toBeLessThanOrEqual(groundSpan(empty).left)
    expect(freshView.bottom).toBeGreaterThanOrEqual(groundY)

    const grown = worldFromModel(buildTree('water', ['watery', 'waterproof', 'backwater']))
    const restored = cameraReducer(START_CAMERA, { type: 'frame-puzzle' }, grown)
    const restoredView = cameraWindowOf(restored)
    const bounds = treeBounds(grown)
    expect(restoredView.left).toBeLessThanOrEqual(bounds.minX)
    expect(restoredView.right).toBeGreaterThanOrEqual(bounds.maxX)
  })

  it('frames the whole existing Tree on a mid-day reload', () => {
    const world = worldFromModel(
      buildTree('water', ['watery', 'waterproof', 'backwater', 'seawater', 'cutwater']),
    )
    const camera = cameraReducer(START_CAMERA, { type: 'frame-tree' }, world)
    const view = cameraWindowOf(camera)
    const bounds = treeBounds(world)
    expect(view.left).toBeLessThanOrEqual(bounds.minX)
    expect(view.right).toBeGreaterThanOrEqual(bounds.maxX)
    expect(view.top).toBeLessThanOrEqual(bounds.minY)
    expect(view.bottom).toBeGreaterThanOrEqual(bounds.maxY)
    expect(camera.zoom).toBe(zoomFit(world))
  })

  it('never zooms beyond the clamp range the spec allows', () => {
    const world = worldFromModel(buildTree('water', ['watery', 'waterproof']))
    const camera = clampCamera(world, {
      focusX: 0,
      focusY: 0,
      zoom: ZOOM_MAX + 5,
      following: true,
      eased: true,
    })
    expect(camera.zoom).toBe(ZOOM_MAX)
    const zoomedOut = clampCamera(world, { ...camera, zoom: 0.001 })
    expect(zoomedOut.zoom).toBe(zoomFit(world))
  })
})

describe('cameraReducer following', () => {
  const before = worldFromModel(buildTree('water', ['watery', 'waterproof']))
  const after = worldFromModel(buildTree('water', ['watery', 'waterproof', 'cutwater']))

  it('pans so the newest Sprout appears in view while following', () => {
    let camera = cameraReducer(START_CAMERA, { type: 'frame-tree' }, before)
    camera = cameraReducer(camera, { type: 'follow-growth' }, after)
    expectPlacementInView(camera, newestPlacement(after))
  })

  it('holds still when following is off and resumes after set-following', () => {
    const camera = cameraReducer(START_CAMERA, { type: 'frame-tree' }, before)
    const stopped = cameraReducer(camera, { type: 'set-following', following: false }, after)
    expect(stopped.following).toBe(false)
    const heldCamera = cameraReducer(stopped, { type: 'follow-growth' }, after)
    expect(heldCamera).toEqual(stopped)
    const resumed = cameraReducer(heldCamera, { type: 'set-following', following: true }, after)
    expect(resumed.following).toBe(true)
    const panned = cameraReducer(resumed, { type: 'follow-growth' }, after)
    expect(panned).not.toEqual(heldCamera)
  })

  it('follows at a fixed close-up zoom: the whole Tree is not always visible', () => {
    const wide = wideWorld()
    const camera = cameraReducer(START_CAMERA, { type: 'frame-tree' }, wide)
    expect(camera.zoom).toBe(zoomFit(wide))
    const followed = cameraReducer(camera, { type: 'follow-growth' }, wide)
    expect(followed.zoom).toBe(FOLLOW_ZOOM)
    expect(followed.zoom).toBeGreaterThan(1)
    const view = cameraWindowOf(followed)
    const bounds = treeBounds(wide)
    const treeWiderThanView = bounds.maxX - bounds.minX > view.right - view.left
    expect(treeWiderThanView).toBe(true)
  })

  it('keeps the pan inside the Tree bounds plus a margin', () => {
    const world = worldFromModel(
      buildTree('water', ['watery', 'waterproof', 'backwater', 'seawater', 'cutwater']),
    )
    const bounds = treeBounds(world)
    const driftCamera = clampCamera(world, {
      focusX: 99_999,
      focusY: -99_999,
      zoom: 1,
      following: true,
      eased: true,
    })
    expect(driftCamera.focusX).toBe((bounds.minX + bounds.maxX) / 2)
    expect(driftCamera.focusY).toBe((bounds.minY + bounds.maxY) / 2)

    const wide = wideWorld()
    const wideBounds = treeBounds(wide)
    const clamped = clampCamera(wide, {
      focusX: 99_999,
      focusY: 0,
      zoom: 1,
      following: true,
      eased: true,
    })
    const view = cameraWindowOf(clamped)
    expect(view.right).toBeLessThanOrEqual(wideBounds.maxX + PAN_MARGIN)
    expect(view.left).toBeGreaterThanOrEqual(wideBounds.minX - PAN_MARGIN)
    expect(clamped.focusY).toBe((wideBounds.minY + wideBounds.maxY) / 2)
  })

  it('returns a new camera state without mutating the previous one', () => {
    const world = worldFromModel(buildTree('water', ['watery']))
    const previous: Camera = { ...START_CAMERA }
    const next = cameraReducer(previous, { type: 'follow-growth' }, world)
    expect(previous).toEqual(START_CAMERA)
    expect(next).not.toBe(previous)
  })
})

describe('cameraReducer manual control', () => {
  it('pans by screen deltas divided by zoom and pauses auto-follow', () => {
    const world = wideWorld()
    const start = clampCamera(world, {
      focusX: 700,
      focusY: -50,
      zoom: 1,
      following: true,
      eased: true,
    })
    const panned = cameraReducer(start, { type: 'pan', dx: 200, dy: 80 }, world)
    expect(panned.focusX).toBeCloseTo(900)
    expect(panned.following).toBe(false)
    expect(panned.eased).toBe(false)
    expect(panned.zoom).toBe(1)
  })

  it('pans vertically when the view is deeper than the screen', () => {
    const deep = worldFromModel(buildTree('water', ['awater', 'seawater', 'seawaters']))
    const start = clampCamera(deep, {
      focusX: 110,
      focusY: -176,
      zoom: 2,
      following: true,
      eased: true,
    })
    const panned = cameraReducer(start, { type: 'pan', dx: 0, dy: 100 }, deep)
    expect(panned.focusY).toBeCloseTo(-126)
  })

  it('zooms from screen deltas and clamps to the fitted minimum and 2.5x max', () => {
    const world = wideWorld()
    const start = clampCamera(world, {
      focusX: 700,
      focusY: -50,
      zoom: 2,
      following: true,
      eased: true,
    })
    const zoomedIn = cameraReducer(start, { type: 'zoom', factor: 3 }, world)
    expect(zoomedIn.zoom).toBe(ZOOM_MAX)
    expect(zoomedIn.eased).toBe(false)
    expect(zoomedIn.following).toBe(false)
    const zoomedOut = cameraReducer(start, { type: 'zoom', factor: 0.001 }, world)
    expect(zoomedOut.zoom).toBe(zoomFit(world))
  })

  it('resumes auto-follow at the follow zoom on the newest Sprout', () => {
    const world = wideWorld()
    const manual = clampCamera(world, {
      focusX: 700,
      focusY: -50,
      zoom: 1.5,
      following: false,
      eased: false,
    })
    const resumed = cameraReducer(manual, { type: 'resume-follow' }, world)
    expect(resumed.following).toBe(true)
    expect(resumed.zoom).toBe(FOLLOW_ZOOM)
    expect(resumed.eased).toBe(true)
    const view = cameraWindowOf(resumed)
    const newest = newestPlacement(world)
    expect(view.left).toBeLessThanOrEqual(newest.x)
    expect(view.right).toBeGreaterThanOrEqual(newest.x)
    expect(view.top).toBeLessThanOrEqual(newest.y)
    expect(view.bottom).toBeGreaterThanOrEqual(newest.y)
  })

  it('eases the automatic pans and keeps manual motion instant', () => {
    const world = wideWorld()
    const followed = cameraReducer(START_CAMERA, { type: 'follow-growth' }, world)
    expect(followed.eased).toBe(true)
    const panned = cameraReducer(followed, { type: 'pan', dx: 10, dy: 0 }, world)
    expect(panned.eased).toBe(false)
    const zoomed = cameraReducer(panned, { type: 'zoom', factor: 1.2 }, world)
    expect(zoomed.eased).toBe(false)
    const resumed = cameraReducer(zoomed, { type: 'resume-follow' }, world)
    expect(resumed.eased).toBe(true)
  })
})

describe('height scale', () => {
  it('adds a fixed five meters per Branch generation, topping out at 30 m', () => {
    expect(METERS_PER_GENERATION).toBe(5)
    expect(heightMeters(worldFromModel(buildTree('water', [])))).toBe(0)
    expect(heightMeters(worldFromModel(buildTree('water', ['waterproof'])))).toBe(5)
    expect(
      heightMeters(worldFromModel(buildTree('water', ['waterproof', 'waterproofing']))),
    ).toBe(10)
    expect(
      heightMeters(worldFromModel(buildTree('water', ['awater', 'seawater', 'seawaters']))),
    ).toBe(15)
    expect(
      heightMeters(
        worldFromModel(
          buildTree('water', [
            'watera',
            'waterab',
            'waterabc',
            'waterabcd',
            'waterabcde',
            'waterabcdef',
          ]),
        ),
      ),
    ).toBe(30)
  })

  it('maps meters to world heights above the Ground', () => {
    expect(metersToWorldY(0)).toBe(groundY)
    expect(metersToWorldY(5)).toBeLessThan(groundY)
    expect(metersToWorldY(30)).toBeLessThan(metersToWorldY(5))
  })

  it('places the scale ticks at 1 m and the 5, 10, 25 and 30 m markers', () => {
    expect(HEIGHT_SCALE_TICKS.map((tick) => tick.meters)).toEqual([1, 5, 10, 25, 30])
    expect(HEIGHT_SCALE_TICKS.filter((tick) => tick.major).map((tick) => tick.meters)).toEqual([
      5, 10, 25, 30,
    ])
  })

  it('projects ticks with the camera: the focused height sits at screen center', () => {
    const camera: Camera = {
      focusX: 0,
      focusY: metersToWorldY(10),
      zoom: 2,
      following: true,
      eased: true,
    }
    const view = heightScaleView(camera)
    const tenMeters = view.find((tick) => tick.meters === 10)!
    expect(tenMeters.screenY).toBeCloseTo(VIEW_HEIGHT / 2)
    const fiveMeters = view.find((tick) => tick.meters === 5)!
    expect(fiveMeters.screenY).toBeGreaterThan(tenMeters.screenY)
    expect(fiveMeters.screenY).toBeCloseTo(
      VIEW_HEIGHT / 2 + (metersToWorldY(5) - metersToWorldY(10)) * 2,
    )
  })
})

describe('worldFromModel orientation', () => {
  it('anchors the first Branch generation at the Ground and grows upward, negative y', () => {
    const world = worldFromModel(buildTree('water', ['waterproof']))
    const generation = world.nodesByGeneration.get(1)!
    for (const placement of generation) {
      expect(placement.y).toBeLessThanOrEqual(groundY)
    }
    expect(groundY - generation[0].y).toBeGreaterThan(0)
  })

  it('places generation 0 (the Stem origin) on the Ground line', () => {
    const world = worldFromModel(buildTree('water', []))
    expect(world.nodesByGeneration.get(0)![0].y).toBe(groundY)
  })

  it('spreads Leaves horizontally: same-generation siblings never share an x', () => {
    const world = worldFromModel(buildTree('water', ['watery', 'waterproof', 'backwater']))
    for (const placements of world.nodesByGeneration.values()) {
      const xs = placements.map((placement) => placement.x)
      expect(new Set(xs).size).toBe(xs.length)
    }
  })

  it('is rotated: a three-leaf, one-generation Tree is wider than tall', () => {
    const world = worldFromModel(buildTree('water', ['watery', 'waterproof', 'backwater']))
    expect(world.maxGeneration).toBe(1)
    expect(world.width).toBeGreaterThan(world.height)
  })

  it('grows every placement upward: the deepest generation sits strictly below the Ground', () => {
    const world = worldFromModel(
      buildTree('water', ['backwater', 'backwatered', 'waterproof', 'waterproofing']),
    )
    for (const generation of world.nodesByGeneration.values()) {
      for (const placement of generation) {
        expect(placement.y).toBeLessThanOrEqual(0)
      }
    }
    const deepest = Math.min(
      ...world.nodesByGeneration.get(2)!.map((placement) => placement.y),
    )
    expect(deepest).toBeLessThan(world.nodesByGeneration.get(1)![0].y!)
  })
})

describe('finaleArt reaches the stars', () => {
  const world = worldFromModel(buildTree('water', WIDE_WORDS))

  it('is deterministic for a given Puzzle day and varies between days', () => {
    expect(finaleArt(world, 7)).toEqual(finaleArt(world, 7))
    expect(finaleArt(world, 7)).not.toEqual(finaleArt(world, 8))
  })

  it('extends crown limbs skyward from the treetop', () => {
    const finale = finaleArt(world, 7)
    expect(finale.crownLimbs.length).toBeGreaterThan(0)
    for (const limb of finale.crownLimbs) {
      const match = limb.d.match(PATH_NUMBERS)
      expect(match).not.toBeNull()
      const [, , my, , , ey] = match!.slice(1).map(Number)
      expect(ey).toBeLessThan(my)
      expect(limb.width).toBeGreaterThan(0)
    }
  })

  it('sprinkles stars in the sky strictly above the treetop', () => {
    const finale = finaleArt(world, 7)
    const bounds = treeBounds(world)
    expect(finale.stars.length).toBeGreaterThan(0)
    for (const star of finale.stars) {
      expect(star.y).toBeLessThan(-world.height)
      expect(star.x).toBeGreaterThanOrEqual(bounds.minX)
      expect(star.x).toBeLessThanOrEqual(bounds.maxX)
      expect(star.r).toBeGreaterThan(0)
    }
  })
})
