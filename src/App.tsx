import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { WORD_FAMILIES } from './data/wordFamilies'
import { stemOfTheDay, utcDayNumber } from './game/stemOfTheDay'
import type { Clock } from './game/stemOfTheDay'
import { loadProgress, loadStreak, saveProgress, saveStreak } from './game/progress'
import { prefersReducedMotion } from './game/motion'
import { buildShareSvg, downloadShareImage } from './game/shareCard'
import { buildTree } from './game/tree'
import { heightMeters, worldFromModel } from './game/world'
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
  invalid: { message: 'invalid', animation: 'shake', text: 'text-rose-600' },
  duplicate: { message: 'already sprouted', animation: 'pulse-once', text: 'text-sky-600' },
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
  const isComplete = findableWords.length > 0 && sprouts.length === findableWords.length
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const world = useMemo(
    () => worldFromModel(buildTree(family.stem, sprouts)),
    [family.stem, sprouts],
  )
  const height = heightMeters(world)
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
    setBannerDismissed(false)
  }, [currentDay])

  useEffect(() => {
    if (!isComplete || bannerDismissed) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setBannerDismissed(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isComplete, bannerDismissed])

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
        height,
      }, currentDay),
    )
  }

  return (
    <div className="fixed inset-0 bg-white text-stone-900">
      <div className="absolute inset-0">
        <Tree world={world} seed={currentDay} complete={isComplete} />
      </div>
      {isComplete && !bannerDismissed && (
        <aside
          role="status"
          className="banner-in pointer-events-auto absolute left-1/2 top-24 z-20 flex -translate-x-1/2 flex-col items-center gap-2 rounded-lg bg-white px-5 py-4 text-stone-900 shadow-xl ring-1 ring-stone-200"
        >
          <p className="text-sm font-semibold text-emerald-700">
            All {findableWords.length} Sprouts found — the Tree is Complete!
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={share}
              autoFocus
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Share your Tree
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss"
              className="rounded-full bg-stone-200 px-5 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              Dismiss
            </button>
          </div>
        </aside>
      )}
      <main className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Sproutle</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-stone-500">Stem</p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-wide">{family.stem}</h2>
          </div>
          <div className="text-right text-base sm:text-lg text-stone-700">
            <p>
              {sprouts.length} of {findableWords.length}
            </p>
            <p>Points: {points}</p>
            <p>Streak: {displayedStreak}</p>
            <p>Height: {height} m</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
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
                className="rounded bg-white px-4 py-2 text-center text-xl sm:text-2xl tracking-wide text-stone-900 shadow-sm ring-1 ring-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {feedback && (
              <p role="status" className={FEEDBACK[feedback.kind].text}>
                {FEEDBACK[feedback.kind].message}
              </p>
            )}
          </form>
          <button
            type="button"
            onClick={share}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm sm:text-base font-semibold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Share result
          </button>
        </div>
      </main>
    </div>
  )
}
