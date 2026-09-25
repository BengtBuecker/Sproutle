import { useMemo } from 'react'
import { buildTree, ROOT_ID } from '../game/tree'
import { layoutTree, treeCanvasSize } from '../game/treeLayout'

interface TreeProps {
  stem: string
  sprouts: readonly string[]
}

export default function Tree({ stem, sprouts }: TreeProps) {
  const model = useMemo(() => buildTree(stem, sprouts), [stem, sprouts])
  const layout = useMemo(() => layoutTree(model), [model])
  const newestSproutIndex = sprouts.length - 1
  const { width, height } = treeCanvasSize(layout.maxDepth, layout.leafCount)

  function renderNode(id: string, parent: { x: number; y: number } | null) {
    const placement = layout.placements[id]
    const { node, x, y } = placement
    const isNew = node.sproutIndex === newestSproutIndex && node.sproutIndex >= 0
    return (
      <g key={node.id} className={isNew ? 'grow' : undefined}>
        {parent && (
          <line x1={parent.x} y1={parent.y} x2={x} y2={y} pathLength={1} className="branch" />
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
        {model.childOrder[id].map((childId) => renderNode(childId, { x, y }))}
      </g>
    )
  }

  return (
    <svg role="img" aria-label="Tree" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
      {renderNode(ROOT_ID, null)}
    </svg>
  )
}
