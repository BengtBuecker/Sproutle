import { describe, expect, it } from 'vitest'
import { stemOfTheDay, utcDayNumber } from './stemOfTheDay'
import type { WordFamilies } from '../domain/wordFamily'

const FAMILIES: WordFamilies = {
  play: { stem: 'play', words: ['play', 'player'] },
  port: { stem: 'port', words: ['port', 'sport'] },
  hand: { stem: 'hand', words: ['hand', 'handle'] },
}

const utc = (iso: string) => new Date(iso)

describe('utcDayNumber', () => {
  it('counts whole days since the Unix epoch', () => {
    expect(utcDayNumber(utc('1970-01-01T00:00:00.000Z'))).toBe(0)
    expect(utcDayNumber(utc('1970-01-02T00:00:00.000Z'))).toBe(1)
  })

  it('gives every instant of a UTC day the same day number', () => {
    expect(utcDayNumber(utc('2026-09-25T00:00:00.001Z'))).toBe(
      utcDayNumber(utc('2026-09-25T23:59:59.999Z')),
    )
  })
})

describe('stemOfTheDay', () => {
  it('maps each UTC date deterministically onto the curated stems', () => {
    expect(stemOfTheDay(FAMILIES, utc('1970-01-01T00:00:00.000Z')).stem).toBe('hand')
    expect(stemOfTheDay(FAMILIES, utc('1970-01-02T00:00:00.000Z')).stem).toBe('play')
    expect(stemOfTheDay(FAMILIES, utc('1970-01-03T00:00:00.000Z')).stem).toBe('port')
  })

  it('wraps around after the last stem', () => {
    expect(stemOfTheDay(FAMILIES, utc('1970-01-04T00:00:00.000Z')).stem).toBe('hand')
  })

  it('is stable for every instant of a UTC day', () => {
    const morning = stemOfTheDay(FAMILIES, utc('2026-09-25T00:00:00.001Z'))
    const evening = stemOfTheDay(FAMILIES, utc('2026-09-25T23:59:59.999Z'))
    expect(morning.stem).toBe(evening.stem)
  })

  it('rolls over exactly at UTC midnight', () => {
    const before = stemOfTheDay(FAMILIES, utc('2026-09-25T23:59:59.999Z'))
    const after = stemOfTheDay(FAMILIES, utc('2026-09-26T00:00:00.000Z'))
    expect(before.stem).not.toBe(after.stem)
    expect(after.stem).toBe(stemOfTheDay(FAMILIES, utc('2026-09-26T12:00:00.000Z')).stem)
  })

  it('rejects an empty family list', () => {
    expect(() => stemOfTheDay({}, utc('2026-09-25T00:00:00.000Z'))).toThrow()
  })
})
