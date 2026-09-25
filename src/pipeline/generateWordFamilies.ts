import type { RejectedStem, WordFamily } from '../domain/wordFamily'

export const MIN_WORD_FAMILY_SIZE = 10

export interface PipelineResult {
  families: WordFamily[]
  rejected: RejectedStem[]
}

export function generateWordFamilies(
  candidates: readonly string[],
  words: readonly string[],
  minFamilySize: number,
): PipelineResult {
  const dictionary = new Set(
    words.map((w) => w.trim()).filter((w) => /^[a-z]+$/.test(w)),
  )
  const families: WordFamily[] = []
  const rejected: RejectedStem[] = []

  for (const candidate of candidates) {
    const stem = candidate.trim().toLowerCase()
    const familyWords = [...dictionary].filter((w) => w.includes(stem)).sort()
    if (!dictionary.has(stem)) {
      rejected.push({ stem, familySize: familyWords.length, reason: 'stem-not-a-word' })
      continue
    }
    if (familyWords.length < minFamilySize) {
      rejected.push({ stem, familySize: familyWords.length, reason: 'below-minimum-family-size' })
      continue
    }
    families.push({ stem, words: familyWords })
  }

  return { families, rejected }
}
