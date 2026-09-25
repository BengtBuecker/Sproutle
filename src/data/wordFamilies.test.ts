import { describe, expect, it } from 'vitest'
import { MIN_WORD_FAMILY_SIZE } from '../pipeline/generateWordFamilies'
import { WORD_FAMILIES } from './wordFamilies'

describe('bundled Word families', () => {
  it('ships vetted families the game can consume', () => {
    const families = Object.values(WORD_FAMILIES)
    expect(families.length).toBeGreaterThan(0)
    for (const family of families) {
      expect(family.stem).toBeTruthy()
      expect(family.words).toContain(family.stem)
      expect(family.words.length).toBeGreaterThanOrEqual(MIN_WORD_FAMILY_SIZE)
    }
  })

  it('exposes one family per curated Stem, keyed by Stem', () => {
    for (const [stem, family] of Object.entries(WORD_FAMILIES)) {
      expect(family.stem).toBe(stem)
    }
  })
})
