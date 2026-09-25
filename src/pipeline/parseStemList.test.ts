import { describe, expect, it } from 'vitest'
import { parseStemList } from './parseStemList'

describe('parseStemList', () => {
  it('reads one lowercase stem per line, lowercasing input', () => {
    const { stems } = parseStemList('play\nPORT\nhand\n')
    expect(stems).toEqual(['play', 'port', 'hand'])
  })

  it('skips comment and blank lines, collecting them as ignored', () => {
    const { stems, ignored } = parseStemList('# curated stems\n\nplay\n\nport\n')
    expect(stems).toEqual(['play', 'port'])
    expect(ignored).toEqual([])
  })

  it('collects malformed lines instead of failing', () => {
    const { stems, ignored } = parseStemList('play\npl@y\n\nplay 123\n')
    expect(stems).toEqual(['play'])
    expect(ignored).toEqual(['pl@y', 'play 123'])
  })

  it('deduplicates repeated stems', () => {
    const { stems } = parseStemList('play\nport\nplay\n')
    expect(stems).toEqual(['play', 'port'])
  })
})
