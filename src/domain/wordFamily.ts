export interface WordFamily {
  stem: string
  words: string[]
}

export type WordFamilies = Record<string, WordFamily>

export type StemRejectionReason = 'below-minimum-family-size' | 'stem-not-a-word'

export interface RejectedStem {
  stem: string
  familySize: number
  reason: StemRejectionReason
}
