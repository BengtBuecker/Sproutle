import { useMemo } from 'react'
import { buildTree, ROOT_ID } from '../game/tree'
import type { TreeModel, TreeNode } from '../game/tree'

interface TreeProps {
  stem: string
  sprouts: readonly string[]
}

const X_STEP = 120
const Y_STEP = 38
const MARGIN_X = 40
const MARGIN_Y = 30
const LABEL_SPACE = 150

interface Placement {
  node: TreeNode
  x: number
  y: number
}

interface Layout {
  placements: Record<string, Placement>
  maxDepth: number
  leafCount: number
}

function layout(model: TreeModel): Layout {
  const placements: Record<string, Placement> = {}
  let nextSlot = 0
  let maxDepth = 0
  let leafCount = 0

  function place(id: string, depth: number): number {
    maxDepth = Math.max(maxDepth, depth)
    const children = model.childOrder[id]
    let slot: number
    if (children.length === 0) {
      slot = nextSlot
      nextSlot += 1
    } else {
      slot = children.reduce((sum, child) => sum + place(child, depth + 1), 0) / children.length
    }
    placements[id] = {
      node: model.nodes[id],
      x: MARGIN_X + depth * X_STEP,
      y: MARGIN_Y + slot * Y_STEP,
    }
    return slot
  }

  place(ROOT_ID, 0)
  leafCount = nextSlot
  return { placements, maxDepth, leafCount }
}

export default function Tree({ stem, sprouts }: TreeProps) {
  const model = useMemo(() => buildTree(stem, sprouts), [stem, sprouts])
  const layoutResult = useMemo(() => layout(model), [model])
  const { placements } = layoutResult
  const newestSproutIndex = sprouts.length - 1
  const width = MARGIN_X + (layoutResult.maxDepth + 1) * X_STEP + LABEL_SPACE
  const height = MARGIN_Y + (layoutResult.leafCount + 1) * Y_STEP

  function renderNode(id: string, parent: Placement | null) {
    const placement = placements[id]
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

  return (
    <svg role="img" aria-label="Tree" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
      {renderNode(ROOT_ID, null)}
    </svg>
  )
}
