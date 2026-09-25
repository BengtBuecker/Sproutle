import { useEffect, useMemo, useReducer, useRef } from 'react'
import { buildTree, ROOT_ID } from '../game/tree'
import {
  ART_COLORS,
  START_CAMERA,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  cameraReducer,
  decorateWorld,
  groundSpan,
  groundY,
  worldFromModel,
} from '../game/world'
import type { Camera, CameraAction, WorldPlacement } from '../game/world'

interface TreeProps {
  stem: string
  sprouts: readonly string[]
  seed: number
}

export default function Tree({ stem, sprouts, seed }: TreeProps) {
  const model = useMemo(() => buildTree(stem, sprouts), [stem, sprouts])
  const world = useMemo(() => worldFromModel(model), [model])
  const art = useMemo(() => decorateWorld(world, seed), [world, seed])
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
  const limbById = new Map(art.branchLimbs.map((limb) => [limb.nodeId, limb]))
  const twigById = new Map(art.twigs.map((twig) => [twig.nodeId, twig]))

  function renderNode(id: string, parent: WorldPlacement | null) {
    const placement = world.placements[id]
    const { node } = placement
    const isNew = node.sproutIndex === newestSproutIndex && node.sproutIndex >= 0
    const limb = parent ? limbById.get(node.id) : undefined
    const twig = node.word === null ? undefined : twigById.get(node.id)
    return (
      <g key={node.id} className={isNew ? 'grow' : undefined}>
        {limb && (
          <path
            d={limb.d}
            pathLength={1}
            className="branch"
            style={{ stroke: ART_COLORS.branch, strokeWidth: limb.width }}
          />
        )}
        {node.word && twig ? (
          <>
            <path d={twig.d} pathLength={1} className="twig" style={{ stroke: ART_COLORS.twig }} />
            <circle cx={twig.leafX} cy={twig.leafY} r={4} className="leaf-dot" />
            <text x={twig.labelX} y={twig.labelY} className="leaf-label">
              {node.word}
            </text>
          </>
        ) : (
          <>
            <circle cx={placement.x} cy={placement.y} r={3} className="stem-dot" />
            {node.kind && (
              <text x={placement.x + 8} y={placement.y + 4} className="chunk-label">
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
        <g className="roots-in">
          {art.roots.map((root, index) => (
            <path
              key={index}
              d={root.d}
              pathLength={1}
              className="root"
              style={{ stroke: ART_COLORS.root, strokeWidth: root.width }}
            />
          ))}
        </g>
        <line
          x1={ground.left}
          y1={groundY}
          x2={ground.right}
          y2={groundY}
          pathLength={1}
          className="ground"
          style={{ stroke: ART_COLORS.ground }}
        />
        <g className="grass">
          {art.grassTufts.map((tuft, index) => (
            <path
              key={index}
              d={tuft.d}
              className="grass-blade"
              style={{ stroke: ART_COLORS.grass }}
            />
          ))}
        </g>
        {renderNode(ROOT_ID, null)}
      </g>
    </svg>
  )
}
