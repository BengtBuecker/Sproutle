import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { WORD_FAMILIES } from './data/wordFamilies'
import { stemOfTheDay, utcDayNumber } from './game/stemOfTheDay'
import type { Clock } from './game/stemOfTheDay'
import { loadProgress, loadStreak, saveProgress, saveStreak } from './game/progress'
import { prefersReducedMotion } from './game/motion'
import { buildShareSvg, downloadShareImage } from './game/shareCard'
import Tree from './components/Tree'

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

const DEFAULT_CLOCK: Clock = () => new Date()
const ROLLOVER_CHECK_MS = 60_000
const REDUCED_MOTION_FEEDBACK_MS = 400

export default function App({ clock = DEFAULT_CLOCK }: AppProps) {
  const [currentDay, setCurrentDay] = useState(() => utcDayNumber(clock()))
  const family = stemOfTheDay(WORD_FAMILIES, clock())
  const findableWords = family.words.filter((word) => word !== family.stem)
  const [sprouts, setSprouts] = useState<string[]>(() => {
    const stored = loadProgress()
    if (stored === null || stored.dayNumber !== currentDay || stored.stem !== family.stem) {
      return []
    }
    return [...new Set(stored.sprouts)].filter((word) => findableWords.includes(word))
  })
  const [streak, setStreak] = useState(() => {
    const stored = loadStreak()
    return stored ?? { lastPlayedDay: null, count: 0 }
  })
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const points = sprouts.reduce((sum, sprout) => sum + sprout.length, 0)
  const displayedStreak =
    streak.lastPlayedDay !== null && streak.lastPlayedDay >= currentDay - 1 ? streak.count : 0

  useEffect(() => {
    saveProgress({ dayNumber: currentDay, stem: family.stem, sprouts })
  }, [currentDay, family.stem, sprouts])

  useEffect(() => {
    if (streak.lastPlayedDay !== null) saveStreak(streak)
  }, [streak])

  useEffect(() => {
    const timer = setInterval(() => {
      const day = utcDayNumber(clock())
      if (day !== currentDay) {
        setCurrentDay(day)
        setSprouts([])
        setDraft('')
        setFeedback(null)
      }
    }, ROLLOVER_CHECK_MS)
    return () => clearInterval(timer)
  }, [clock, currentDay])

  useEffect(() => {
    if (feedback === null || !prefersReducedMotion()) return
    const timer = setTimeout(() => setFeedback(null), REDUCED_MOTION_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  function grow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const word = draft.trim().toLowerCase()
    if (word.length === 0) return
    setDraft('')
    if (!findableWords.includes(word)) {
      setFeedback((f) => ({ kind: 'invalid', nonce: (f?.nonce ?? 0) + 1 }))
      return
    }
    if (sprouts.includes(word)) {
      setFeedback((f) => ({ kind: 'duplicate', nonce: (f?.nonce ?? 0) + 1 }))
      return
    }
    setSprouts((s) => [...s, word])
    setStreak((s) =>
      s.lastPlayedDay === currentDay
        ? s
        : {
            lastPlayedDay: currentDay,
            count: s.lastPlayedDay === currentDay - 1 ? s.count + 1 : 1,
          },
    )
    setFeedback(null)
  }

  function share() {
    downloadShareImage(
      buildShareSvg(family.stem, sprouts, {
        points,
        found: sprouts.length,
        streak: displayedStreak,
      }),
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 sm:gap-8 bg-slate-900 text-slate-100 px-4 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-100">Sproutle</h1>
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <p className="text-xs sm:text-sm uppercase tracking-widest text-slate-400">Stem</p>
        <h2 className="text-4xl sm:text-6xl font-bold tracking-wide">{family.stem}</h2>
      </div>
      <div className="w-full max-w-3xl overflow-x-auto">
        <Tree stem={family.stem} sprouts={sprouts} />
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
            className="rounded bg-slate-800 px-4 py-2 text-center text-xl sm:text-2xl tracking-wide text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {feedback && (
          <p role="status" className={FEEDBACK[feedback.kind].text}>
            {FEEDBACK[feedback.kind].message}
          </p>
        )}
      </form>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-1">
        <p className="text-base sm:text-lg text-slate-300">
          {sprouts.length} of {findableWords.length}
        </p>
        <p className="text-base sm:text-lg text-slate-300">Points: {points}</p>
        <p className="text-base sm:text-lg text-slate-300">Streak: {displayedStreak}</p>
      </div>
      <button
        type="button"
        onClick={share}
        className="rounded-full bg-emerald-500 px-5 py-2 text-sm sm:text-base font-semibold text-slate-900 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        Share result
      </button>
    </div>
  )
}
