import { splitLines } from './splitLines'

const WORD_SHAPE = /^[a-z]+$/

export interface StemList {
  stems: string[]
  ignored: string[]
}

export function parseStemList(text: string): StemList {
  const stems: string[] = []
  const ignored: string[] = []
  for (const line of splitLines(text)) {
    if (line.startsWith('#')) continue
    const stem = line.toLowerCase()
    if (!WORD_SHAPE.test(stem)) {
      ignored.push(line)
      continue
    }
    if (!stems.includes(stem)) stems.push(stem)
  }
  return { stems, ignored }
}
