import { useMemo } from 'react'
import { buildTree, ROOT_ID } from '../game/tree'
import { groundY, groundSpan, worldFromModel, worldViewBox } from '../game/world'
import type { WorldPlacement } from '../game/world'

interface TreeProps {
  stem: string
  sprouts: readonly string[]
}

const VIEW_PAD_TOP = 30
const VIEW_PAD_BOTTOM = 4

export default function Tree({ stem, sprouts }: TreeProps) {
  const model = useMemo(() => buildTree(stem, sprouts), [stem, sprouts])
  const world = useMemo(() => worldFromModel(model), [model])
  const newestSproutIndex = sprouts.length - 1
  const viewBox = worldViewBox(world, VIEW_PAD_TOP, VIEW_PAD_BOTTOM)

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
  return (
    <svg
      role="img"
      aria-label="Tree"
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
      className="h-full w-full"
    >
      <line x1={ground.left} y1={groundY} x2={ground.right} y2={groundY} pathLength={1} className="ground" />
      {renderNode(ROOT_ID, null)}
    </svg>
  )
}
