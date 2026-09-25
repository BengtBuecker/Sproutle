import { describe, expect, it } from 'vitest'
import { buildTree } from './tree'
import {
  FOLLOW_ZOOM,
  PAN_MARGIN,
  START_CAMERA,
  ZOOM_MAX,
  cameraReducer,
  clampCamera,
  groundSpan,
  groundY,
  newestPlacement,
  treeBounds,
  worldFromModel,
  zoomFit,
} from './world'
import type { Camera } from './world'
import { cameraWindowOf } from '../test/cameraTestUtils'

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
    const view = cameraWindowOf(camera)
    const newest = newestPlacement(after)
    expect(view.left).toBeLessThanOrEqual(newest.x)
    expect(view.right).toBeGreaterThanOrEqual(newest.x)
    expect(view.top).toBeLessThanOrEqual(newest.y)
    expect(view.bottom).toBeGreaterThanOrEqual(newest.y)
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
    const wide = worldFromModel(
      buildTree('water', [
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
      ]),
    )
    const camera = cameraReducer(START_CAMERA, { type: 'frame-tree' }, wide)
    expect(camera.zoom).toBe(zoomFit(wide))
    const followed = cameraReducer(camera, { type: 'follow-growth' }, wide)
    expect(followed.zoom).toBe(FOLLOW_ZOOM)
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
    })
    expect(driftCamera.focusX).toBe((bounds.minX + bounds.maxX) / 2)
    expect(driftCamera.focusY).toBe((bounds.minY + bounds.maxY) / 2)

    const wide = worldFromModel(
      buildTree('water', [
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
      ]),
    )
    const wideBounds = treeBounds(wide)
    const clamped = clampCamera(wide, { focusX: 99_999, focusY: 0, zoom: 1, following: true })
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
