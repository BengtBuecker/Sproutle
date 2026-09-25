import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  MIN_WORD_FAMILY_SIZE,
  generateWordFamilies,
} from '../src/pipeline/generateWordFamilies'
import { parseWordList } from '../src/pipeline/parseWordList'
import { parseStemList } from '../src/pipeline/parseStemList'
import { renderWordFamiliesModule } from '../src/pipeline/renderWordFamiliesModule'

const wordList = parseWordList(readFileSync('data/words/words_alpha.txt', 'utf8'))
const { stems, ignored } = parseStemList(readFileSync('data/stems.txt', 'utf8'))
for (const line of ignored) {
  console.warn(`Ignoring malformed stem list line: "${line}"`)
}

const result = generateWordFamilies(stems, wordList, MIN_WORD_FAMILY_SIZE)
for (const { stem, familySize, reason } of result.rejected) {
  console.warn(`Rejected stem "${stem}" (${reason}; Word family size: ${familySize})`)
}
if (result.families.length === 0) {
  console.error('No candidate Stem qualified - refusing to write Word family data.')
  process.exit(1)
}
console.log(`Bundling Word families for ${result.families.length} stem(s)`)

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/wordFamilies.ts', renderWordFamiliesModule(result))
