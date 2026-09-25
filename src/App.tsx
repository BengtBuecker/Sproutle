import { WORD_FAMILIES } from './data/wordFamilies'
import { stemOfTheDay } from './game/stemOfTheDay'
import type { Clock } from './game/stemOfTheDay'

interface AppProps {
  clock?: Clock
}

export default function App({ clock = () => new Date() }: AppProps) {
  const family = stemOfTheDay(WORD_FAMILIES, clock())
  const sproutsFound = 0
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-900 text-slate-100">
      <h1 className="text-4xl font-bold text-slate-100">Sproutle</h1>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm uppercase tracking-widest text-slate-400">Stem</p>
        <h2 className="text-6xl font-bold tracking-wide">{family.stem}</h2>
      </div>
      <p className="text-lg text-slate-300">
        {sproutsFound} of {family.words.length}
      </p>
    </div>
  )
}
