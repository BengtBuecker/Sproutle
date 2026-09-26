import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Tree from '../components/Tree'
import { WORD_FAMILIES } from '../data/wordFamilies'
import { buildTree } from '../game/tree'
import { decorateWorld, groundSpan, worldFromModel } from '../game/world'

afterEach(() => {
  cleanup()
})

const PORT = WORD_FAMILIES['port'].words.filter((word) => word !== 'port')
const portWorld = worldFromModel(buildTree('port', PORT))

describe('Tree at the scale of the largest Word family', () => {
  it('keeps the whole world model intact: every findable word placed once', () => {
    expect(PORT.length).toBeGreaterThan(700)
    expect(portWorld.sproutCount).toBe(PORT.length)
    expect(Object.keys(portWorld.placements).length).toBeGreaterThan(PORT.length)
  })

  it('renders every Leaf label of the large Tree', () => {
    render(<Tree world={portWorld} seed={20260926} />)
    const svg = screen.getByRole('img', { name: 'Tree' })
    expect(svg.querySelectorAll('.leaf-label')).toHaveLength(PORT.length)
    expect(svg.querySelector('.ground')).not.toBeNull()
    expect(svg.querySelectorAll('.grass-blade').length).toBeGreaterThan(0)
  })

  it('keeps camera interaction working across the wide spread', () => {
    render(<Tree world={portWorld} seed={20260926} />)
    const svg = screen.getByRole('img', { name: 'Tree' })
    for (let index = 0; index < 10; index++) {
      fireEvent.wheel(svg, { deltaY: -240, ctrlKey: true })
    }
    const zoomed = svg.querySelector('.camera-group')!.getAttribute('style')!
    fireEvent.wheel(svg, { deltaY: 240 })
    const panned = svg.querySelector('.camera-group')!.getAttribute('style')!
    expect(panned).not.toBe(zoomed)
  })

  it('stays artistically intact: art decoration covers the full spread', () => {
    const art = decorateWorld(portWorld, 20260926)
    expect(art.branchLimbs).toHaveLength(Object.keys(portWorld.placements).length - 1)
    expect(art.twigs).toHaveLength(PORT.length)
    const ground = groundSpan(portWorld)
    for (const tuft of art.grassTufts) {
      expect(tuft.x).toBeGreaterThanOrEqual(ground.left)
      expect(tuft.x).toBeLessThanOrEqual(ground.right)
    }
  })
})
