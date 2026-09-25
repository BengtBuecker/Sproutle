import { describe, expect, it } from 'vitest'
import { parseWordList } from './parseWordList'

describe('parseWordList', () => {
  it('splits raw text into words, trimming whitespace and line endings', () => {
    expect(parseWordList('a\r\nbb\r\n  c  \r\nddd\r\n')).toEqual(['a', 'bb', 'c', 'ddd'])
  })

  it('drops empty lines', () => {
    expect(parseWordList('a\n\n\nb\n\n')).toEqual(['a', 'b'])
  })

  it('returns an empty list for empty text', () => {
    expect(parseWordList('')).toEqual([])
  })
})
