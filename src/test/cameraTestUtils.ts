import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/world'
import type { Camera } from '../game/world'

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
