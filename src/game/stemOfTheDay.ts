import type { WordFamily, WordFamilies } from '../domain/wordFamily'

const MS_PER_DAY = 86_400_000

export type Clock = () => Date

export function utcDayNumber(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY)
}

export function stemOfTheDay(families: WordFamilies, date: Date): WordFamily {
  const stems = Object.keys(families).sort()
  if (stems.length === 0) {
    throw new Error('No Word families bundled')
  }
  return families[stems[utcDayNumber(date) % stems.length]]
}
