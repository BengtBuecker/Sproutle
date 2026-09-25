import { splitLines } from './splitLines'

export function parseWordList(text: string): string[] {
  return splitLines(text)
}
