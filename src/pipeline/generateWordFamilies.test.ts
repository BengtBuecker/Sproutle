import { describe, expect, it } from 'vitest'
import { generateWordFamilies } from './generateWordFamilies'

const PLAY_FAMILY_WORDS = ['play', 'player', 'display', 'playful', 'replay']

describe('generateWordFamilies', () => {
  it('keeps the PLAY family: PLAYER, DISPLAY, PLAYFUL, REPLAY and PLAY itself', () => {
    const words = [...PLAY_FAMILY_WORDS, 'portable', 'sport']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families).toEqual([
      { stem: 'play', words: ['display', 'play', 'player', 'playful', 'replay'] },
    ])
  })

  it('rejects junk words that do not contain the stem', () => {
    const words = [...PLAY_FAMILY_WORDS, 'layp', 'xyzzy', 'plpa', 'ypal']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['display', 'play', 'player', 'playful', 'replay'])
  })

  it('rejects proper nouns (capitalised words)', () => {
    const words = [...PLAY_FAMILY_WORDS, 'Playmobil', 'PlayStation', 'London']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['display', 'play', 'player', 'playful', 'replay'])
  })

  it('rejects malformed tokens (digits, hyphens, apostrophes, empty lines)', () => {
    const words = [...PLAY_FAMILY_WORDS, 'play123', 'play-er', "player's", '', '   ']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['display', 'play', 'player', 'playful', 'replay'])
  })

  it('strips surrounding whitespace and CR from lines', () => {
    const words = ['  play  ', '  player  ', 'display\r', 'playful\r\n', 'replay']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['display', 'play', 'player', 'playful', 'replay'])
  })

  it('deduplicates repeated words', () => {
    const words = ['play', 'play', 'player', 'player', 'replay']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['play', 'player', 'replay'])
  })

  it('sorts each family alphabetically', () => {
    const words = ['replay', 'display', 'play', 'player', 'playful']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['display', 'play', 'player', 'playful', 'replay'])
  })

  it('supports letters before, after, or both around the stem', () => {
    const words = ['play', 'replay', 'player', 'display', 'displayed']
    const result = generateWordFamilies(['play'], words, 1)
    expect(result.families[0].words).toEqual(['display', 'displayed', 'play', 'player', 'replay'])
  })

  it('emits one family per candidate stem', () => {
    const words = ['play', 'player', 'port', 'portable', 'sport']
    const result = generateWordFamilies(['play', 'port'], words, 1)
    expect(result.families).toEqual([
      { stem: 'play', words: ['play', 'player'] },
      { stem: 'port', words: ['port', 'portable', 'sport'] },
    ])
  })
})

describe('generateWordFamilies vetting', () => {
  it('rejects a candidate whose family is below the minimum size', () => {
    const words = ['play', 'player', 'replay', 'zap', 'zappy']
    const result = generateWordFamilies(['play', 'zap'], words, 3)
    expect(result.families).toEqual([{ stem: 'play', words: ['play', 'player', 'replay'] }])
    expect(result.rejected).toEqual([
      { stem: 'zap', familySize: 2, reason: 'below-minimum-family-size' },
    ])
  })

  it('keeps a candidate exactly at the minimum size', () => {
    const words = ['play', 'player', 'replay']
    const result = generateWordFamilies(['play'], words, 3)
    expect(result.families).toEqual([{ stem: 'play', words: ['play', 'player', 'replay'] }])
    expect(result.rejected).toEqual([])
  })

  it('rejects a candidate stem that is not itself a word in the list', () => {
    const words = ['play', 'player', 'replay', 'playful', 'plaything']
    const result = generateWordFamilies(['play', 'playe'], words, 2)
    expect(result.families).toEqual([
      {
        stem: 'play',
        words: ['play', 'player', 'playful', 'plaything', 'replay'],
      },
    ])
    expect(result.rejected).toEqual([
      { stem: 'playe', familySize: 1, reason: 'stem-not-a-word' },
    ])
  })

  it('rejects every candidate against an empty word list', () => {
    const result = generateWordFamilies(['play', 'port'], [], 1)
    expect(result.families).toEqual([])
    expect(result.rejected).toHaveLength(2)
  })
})
