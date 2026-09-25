import { ROOT_ID } from './tree'
import type { TreeModel, TreeNode } from './tree'

export interface Placement {
  node: TreeNode
  x: number
  y: number
}

export interface TreeLayout {
  placements: Record<string, Placement>
  maxDepth: number
  leafCount: number
}

const X_STEP = 120
const Y_STEP = 38
const MARGIN_X = 40
const MARGIN_Y = 30
const LABEL_SPACE = 150

export function layoutTree(model: TreeModel): TreeLayout {
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

export function treeCanvasSize(maxDepth: number, leafCount: number): { width: number; height: number } {
  return {
    width: MARGIN_X + (maxDepth + 1) * X_STEP + LABEL_SPACE,
    height: MARGIN_Y + (leafCount + 1) * Y_STEP,
  }
}
