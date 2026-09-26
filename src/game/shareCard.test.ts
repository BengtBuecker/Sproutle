import { describe, expect, it } from 'vitest'
import { ART_COLORS } from './world'
import { buildShareSvg } from './shareCard'
import { buildTree } from './tree'
import { decorateWorld, worldFromModel } from './world'

const STATS = { points: 19, found: 2, streak: 3, height: 10 }

describe('buildShareSvg', () => {
  it('renders the grown Tree plus the stats footer', () => {
    const svg = buildShareSvg('water', ['backwater', 'watery'], STATS, 7)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Sproutle')
    expect(svg).toContain('Stem: WATER')
    expect(svg).toContain('backwater')
    expect(svg).toContain('watery')
    expect(svg).toContain('Points: 19')
    expect(svg).toContain('Sprouts found: 2')
    expect(svg).toContain('Streak: 3')
    expect(svg).toContain('Height: 10 m')
  })

  it('never reveals words not yet grown', () => {
    const svg = buildShareSvg('water', ['backwater'], STATS, 7)
    expect(svg).not.toContain('waterproof')
    expect(svg).not.toContain('watery')
    expect(svg).not.toContain('seawater')
  })

  it('renders a valid standalone artifact with zero Sprouts', () => {
    const svg = buildShareSvg('water', [], { points: 0, found: 0, streak: 0, height: 0 }, 7)
    expect(svg).toContain('Stem: WATER')
    expect(svg).toContain('Points: 0')
    expect(svg).toContain('Sprouts found: 0')
    expect(svg).toContain('Streak: 0')
    expect(svg).toContain('Height: 0 m')
  })

  it('colors the Stem root differently from grown leaves', () => {
    const svg = buildShareSvg('water', ['watery'], STATS, 7)
    expect(svg).toContain('fill="#166534"')
    expect(svg).toContain('fill="#22c55e"')
  })

  it('renders the new art style: trunk, foliage, Branches, Twigs, Leaves, Roots and the grass line', () => {
    const svg = buildShareSvg('water', ['backwater'], STATS, 7)
    expect(svg).toContain('stroke="#8a5a3b"')
    expect(svg).toContain('stroke="#4a7c3f"')
    expect(svg).toContain('stroke="#a1724f"')
    expect(svg).toContain('stroke="#79b45d"')
    expect(svg).toContain('stroke="#5f9448"')
    expect(svg).toContain(`stroke="${ART_COLORS.trunk}"`)
    expect(svg).toContain(`fill="${ART_COLORS.foliage}"`)
  })

  it('is deterministic for a given Puzzle day and varies between days', () => {
    const today = buildShareSvg('water', ['backwater', 'watery'], STATS, 7)
    expect(today).toBe(buildShareSvg('water', ['backwater', 'watery'], STATS, 7))
    expect(today).not.toBe(buildShareSvg('water', ['backwater', 'watery'], STATS, 8))
  })

  it('anchors the Tree at the Ground with the Roots kept inside the canvas above the stats', () => {
    const svg = buildShareSvg('water', ['backwater'], STATS, 7)
    const height = Number(svg.match(/height="([\d.]+)"/)![1])
    const shiftY = Number(svg.match(/<g transform="translate\(0 ([\d.]+)\)">/)![1])
    const groundLine = svg.match(/<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/)!
    expect(groundLine[2]).toBe('0')
    expect(groundLine[4]).toBe('0')
    expect(shiftY).toBeGreaterThan(0)

    const world = worldFromModel(buildTree('water', ['backwater']))
    const art = decorateWorld(world, 7)
    const deepestRoot = shiftY + Math.max(...art.roots.map((root) => root.endY))
    expect(deepestRoot).toBeLessThan(height)
  })
})
