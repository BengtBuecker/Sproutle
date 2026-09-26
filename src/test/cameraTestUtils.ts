import { expect } from 'vitest'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/world'
import type { Camera, WorldPlacement } from '../game/world'

export type CameraView = Pick<Camera, 'focusX' | 'focusY' | 'zoom'>

export function cameraWindowOf(camera: CameraView) {
  const halfWidth = VIEW_WIDTH / 2 / camera.zoom
  const halfHeight = VIEW_HEIGHT / 2 / camera.zoom
  return {
    left: camera.focusX - halfWidth,
    right: camera.focusX + halfWidth,
    top: camera.focusY - halfHeight,
    bottom: camera.focusY + halfHeight,
  }
}

export function expectPlacementInView(camera: CameraView, placement: WorldPlacement) {
  const view = cameraWindowOf(camera)
  expect(view.left).toBeLessThanOrEqual(placement.x)
  expect(view.right).toBeGreaterThanOrEqual(placement.x)
  expect(view.top).toBeLessThanOrEqual(placement.y)
  expect(view.bottom).toBeGreaterThanOrEqual(placement.y)
}
