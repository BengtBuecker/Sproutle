import { describe, expect, it } from 'vitest'
import { buildTree } from './tree'
import { groundY, worldFromModel } from './world'

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
