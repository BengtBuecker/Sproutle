export interface StoredProgress {
  dayNumber: number
  stem: string
  sprouts: string[]
}

export interface StoredStreak {
  lastPlayedDay: number | null
  count: number
}

const PROGRESS_KEY = 'sproutle:progress'
const STREAK_KEY = 'sproutle:streak'

export function loadProgress(): StoredProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Record<string, unknown>
    if (
      typeof candidate.dayNumber !== 'number' ||
      typeof candidate.stem !== 'string' ||
      !Array.isArray(candidate.sprouts) ||
      !candidate.sprouts.every((word) => typeof word === 'string')
    ) {
      return null
    }
    return parsed as StoredProgress
  } catch {
    return null
  }
}

export function saveProgress(progress: StoredProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    return
  }
}

export function loadStreak(): StoredStreak | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Record<string, unknown>
    if (
      (candidate.lastPlayedDay !== null && typeof candidate.lastPlayedDay !== 'number') ||
      typeof candidate.count !== 'number'
    ) {
      return null
    }
    return parsed as StoredStreak
  } catch {
    return null
  }
}

export function saveStreak(streak: StoredStreak): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak))
  } catch {
    return
  }
}
