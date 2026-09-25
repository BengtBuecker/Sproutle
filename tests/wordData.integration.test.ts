import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MIN_WORD_FAMILY_SIZE,
  generateWordFamilies,
} from '../src/pipeline/generateWordFamilies'
import { parseWordList } from '../src/pipeline/parseWordList'
import { parseStemList } from '../src/pipeline/parseStemList'
import { renderWordFamiliesModule } from '../src/pipeline/renderWordFamiliesModule'

const WORD_LIST_PATH = 'data/words/words_alpha.txt'
const STEMS_PATH = 'data/stems.txt'
const GENERATED_PATH = 'src/data/wordFamilies.ts'

describe('word family pipeline against the real inputs', () => {
  const wordList = parseWordList(readFileSync(WORD_LIST_PATH, 'utf8'))
  const { stems } = parseStemList(readFileSync(STEMS_PATH, 'utf8'))
  const result = generateWordFamilies(stems, wordList, MIN_WORD_FAMILY_SIZE)

  it('proves the PLAY family from the real word list', () => {
    const play = result.families.find((f) => f.stem === 'play')
    expect(play).toBeDefined()
    for (const word of ['play', 'player', 'display', 'playful', 'replay']) {
      expect(play!.words).toContain(word)
    }
  })

  it('vetts every bundled family against the minimum Word family size', () => {
    expect(result.families.length).toBeGreaterThan(0)
    for (const family of result.families) {
      expect(family.words.length).toBeGreaterThanOrEqual(MIN_WORD_FAMILY_SIZE)
      expect(family.words).toContain(family.stem)
    }
    for (const { stem, familySize, reason } of result.rejected) {
      expect(stems).toContain(stem)
      if (reason === 'below-minimum-family-size') {
        expect(familySize).toBeLessThan(MIN_WORD_FAMILY_SIZE)
      }
    }
  })

  it('keeps the committed data module fresh with the inputs', () => {
    expect(readFileSync(GENERATED_PATH, 'utf8')).toBe(
      renderWordFamiliesModule(result),
    )
  })
})
