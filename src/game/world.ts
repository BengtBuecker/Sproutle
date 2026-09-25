import { ROOT_ID } from './tree'
import type { TreeModel, TreeNode } from './tree'

export interface WorldPlacement {
  node: TreeNode
  x: number
  y: number
}

export interface World {
  placements: Record<string, WorldPlacement>
  nodesByGeneration: Map<number, WorldPlacement[]>
  maxGeneration: number
  width: number
  height: number
  originX: number
}

const GENERATION_GAP = 90
const HORIZONTAL_STEP = 70
const EDGE_MARGIN = 60
const LABEL_SPACE = 90

export const groundY = 0

export function worldFromModel(model: TreeModel): World {
  const placements: Record<string, WorldPlacement> = {}
  const nodesByGeneration = new Map<number, WorldPlacement[]>()
  let nextSlot = 0
  let maxGeneration = 0

  function place(id: string, generation: number): number {
    maxGeneration = maxGeneration < generation ? generation : maxGeneration
    const children = model.childOrder[id]
    const slot =
      children.length === 0
        ? nextSlot++
        : children.reduce((sum, child) => sum + place(child, generation + 1), 0) / children.length
    const placement: WorldPlacement = {
      node: model.nodes[id],
      x: slot * HORIZONTAL_STEP,
      y: groundY - generation * GENERATION_GAP,
    }
    placements[id] = placement
    const generationPlacements = nodesByGeneration.get(generation)
    if (generationPlacements) generationPlacements.push(placement)
    else nodesByGeneration.set(generation, [placement])
    return slot
  }

  place(ROOT_ID, 0)

  const leafCount = nextSlot
  const spread = leafCount === 0 ? 0 : (leafCount - 1) * HORIZONTAL_STEP
  return {
    placements,
    nodesByGeneration,
    maxGeneration,
    width: 2 * EDGE_MARGIN + spread + LABEL_SPACE,
    height: maxGeneration * GENERATION_GAP,
    originX: EDGE_MARGIN,
  }
}

export function worldViewBox(
  world: World,
  padTop: number,
  padBottom: number,
): { minX: number; minY: number; width: number; height: number } {
  return {
    minX: -world.originX,
    minY: -(world.height + padTop),
    width: world.width,
    height: world.height + padTop + padBottom,
  }
}

export function groundSpan(world: World): { left: number; right: number } {
  return { left: -world.originX, right: -world.originX + world.width }
}
