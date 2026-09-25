import { useEffect, useMemo, useReducer, useRef } from 'react'
import { buildTree, ROOT_ID } from '../game/tree'
import {
  START_CAMERA,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  cameraReducer,
  groundSpan,
  groundY,
  worldFromModel,
} from '../game/world'
import type { Camera, CameraAction, WorldPlacement } from '../game/world'

interface TreeProps {
  stem: string
  sprouts: readonly string[]
}

export default function Tree({ stem, sprouts }: TreeProps) {
  const model = useMemo(() => buildTree(stem, sprouts), [stem, sprouts])
  const world = useMemo(() => worldFromModel(model), [model])
  const worldRef = useRef(world)
  useEffect(() => {
    worldRef.current = world
  })

  const [camera, dispatch] = useReducer(
    (state: Camera, action: CameraAction) => cameraReducer(state, action, worldRef.current),
    world,
    (initialWorld) =>
      cameraReducer(START_CAMERA, { type: 'frame-puzzle' }, initialWorld),
  )

  const grownCount = useRef(sprouts.length)
  useEffect(() => {
    if (sprouts.length > grownCount.current) dispatch({ type: 'follow-growth' })
    grownCount.current = sprouts.length
  }, [sprouts.length])

  useEffect(() => {
    dispatch({ type: 'frame-puzzle' })
  }, [stem])

  const newestSproutIndex = sprouts.length - 1

  function renderNode(id: string, parent: WorldPlacement | null) {
    const placement = world.placements[id]
    const { node, x, y } = placement
    const isNew = node.sproutIndex === newestSproutIndex && node.sproutIndex >= 0
    return (
      <g key={node.id} className={isNew ? 'grow' : undefined}>
        {parent && (
          <line
            x1={parent.x}
            y1={parent.y}
            x2={x}
            y2={y}
            pathLength={1}
            className="branch"
          />
        )}
        {node.word ? (
          <>
            <circle cx={x} cy={y} r={4} className="leaf-dot" />
            <text x={x + 8} y={y + 4} className="leaf-label">
              {node.word}
            </text>
          </>
        ) : (
          <>
            <circle cx={x} cy={y} r={3} className="stem-dot" />
            {node.kind && (
              <text x={x + 8} y={y + 4} className="chunk-label">
                {node.chunk.toUpperCase()}
              </text>
            )}
          </>
        )}
        {model.childOrder[id].map((childId) => renderNode(childId, placement))}
      </g>
    )
  }

  const ground = groundSpan(world)
  const transform = `translate(${VIEW_WIDTH / 2}px, ${VIEW_HEIGHT / 2}px) scale(${camera.zoom}) translate(${-camera.focusX}px, ${-camera.focusY}px)`
  return (
    <svg
      role="img"
      aria-label="Tree"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-full w-full"
    >
      <g
        className="camera-group"
        style={{ transform, transformOrigin: '0 0', transformBox: 'view-box' }}
      >
        <line x1={ground.left} y1={groundY} x2={ground.right} y2={groundY} pathLength={1} className="ground" />
        {renderNode(ROOT_ID, null)}
      </g>
    </svg>
  )
}
