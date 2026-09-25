import { useState } from 'react'
import type { FormEvent } from 'react'
import { WORD_FAMILIES } from './data/wordFamilies'
import { stemOfTheDay } from './game/stemOfTheDay'
import type { Clock } from './game/stemOfTheDay'

interface AppProps {
  clock?: Clock
}

type FeedbackKind = 'invalid' | 'duplicate'

interface Feedback {
  kind: FeedbackKind
  nonce: number
}

const FEEDBACK: Record<FeedbackKind, { message: string; animation: string; text: string }> = {
  invalid: { message: 'invalid', animation: 'shake', text: 'text-rose-400' },
  duplicate: { message: 'already sprouted', animation: 'pulse-once', text: 'text-sky-300' },
}

export default function App({ clock = () => new Date() }: AppProps) {
  const family = stemOfTheDay(WORD_FAMILIES, clock())
  const [sprouts, setSprouts] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const points = sprouts.reduce((sum, sprout) => sum + sprout.length, 0)

  function grow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const word = draft.trim().toLowerCase()
    if (word.length === 0) return
    setDraft('')
    if (!family.words.includes(word)) {
      setFeedback((f) => ({ kind: 'invalid', nonce: (f?.nonce ?? 0) + 1 }))
      return
    }
    if (sprouts.includes(word)) {
      setFeedback((f) => ({ kind: 'duplicate', nonce: (f?.nonce ?? 0) + 1 }))
      return
    }
    setSprouts((s) => [...s, word])
    setFeedback(null)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-900 text-slate-100">
      <h1 className="text-4xl font-bold text-slate-100">Sproutle</h1>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm uppercase tracking-widest text-slate-400">Stem</p>
        <h2 className="text-6xl font-bold tracking-wide">{family.stem}</h2>
      </div>
      <form aria-label="Grow a word" onSubmit={grow} className="flex flex-col items-center gap-2">
        <div
          key={feedback?.nonce}
          className={feedback ? FEEDBACK[feedback.kind].animation : undefined}
          onAnimationEnd={() => setFeedback(null)}
        >
          <input
            autoFocus
            aria-label="Grow a word"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="rounded bg-slate-800 px-4 py-2 text-center text-2xl tracking-wide text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {feedback && (
          <p role="status" className={FEEDBACK[feedback.kind].text}>
            {FEEDBACK[feedback.kind].message}
          </p>
        )}
      </form>
      <p className="text-lg text-slate-300">
        {sprouts.length} of {family.words.length}
      </p>
      <p className="text-lg text-slate-300">Points: {points}</p>
    </div>
  )
}
