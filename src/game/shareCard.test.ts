import { describe, expect, it } from 'vitest'
import { buildShareSvg } from './shareCard'

const STATS = { points: 19, found: 2, streak: 3 }

describe('buildShareSvg', () => {
  it('renders the grown Tree plus the stats footer', () => {
    const svg = buildShareSvg('water', ['backwater', 'watery'], STATS)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Sproutle')
    expect(svg).toContain('Stem: WATER')
    expect(svg).toContain('backwater')
    expect(svg).toContain('watery')
    expect(svg).toContain('Points: 19')
    expect(svg).toContain('Sprouts found: 2')
    expect(svg).toContain('Streak: 3')
  })

  it('never reveals words not yet grown', () => {
    const svg = buildShareSvg('water', ['backwater'], STATS)
    expect(svg).not.toContain('waterproof')
    expect(svg).not.toContain('watery')
    expect(svg).not.toContain('seawater')
  })

  it('renders a valid standalone artifact with zero Sprouts', () => {
    const svg = buildShareSvg('water', [], { points: 0, found: 0, streak: 0 })
    expect(svg).toContain('Stem: WATER')
    expect(svg).toContain('Points: 0')
    expect(svg).toContain('Sprouts found: 0')
    expect(svg).toContain('Streak: 0')
  })

  it('colors the Stem root differently from grown leaves', () => {
    const svg = buildShareSvg('water', ['watery'], STATS)
    expect(svg).toContain('fill="#a3e635"')
    expect(svg).toContain('fill="#4ade80"')
  })
})
