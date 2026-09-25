import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import App from '../App'
import { WORD_FAMILIES } from '../data/wordFamilies'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const TODAY = '2026-09-25T15:04:05.000Z'
const FIRST_INSTANT_AFTER_MIDNIGHT = '2026-09-26T00:00:00.000Z'
const TOTAL = WORD_FAMILIES['water'].words.filter((word) => word !== 'water').length
const TOTAL_WIND = WORD_FAMILIES['wind'].words.filter((word) => word !== 'wind').length

function mountApp() {
  return render(<App clock={() => new Date(TODAY)} />)
}

function tree() {
  return screen.getByRole('img', { name: 'Tree' })
}

function groupOf(label: string) {
  return within(tree()).getByText(label).closest('g')!
}

function grow(word: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Grow a word' }), {
    target: { value: word },
  })
  fireEvent.submit(screen.getByRole('form', { name: 'Grow a word' }))
}

describe('App', () => {
  it('shows the Stem matching the deterministic date mapping', () => {
    mountApp()
    expect(screen.getByRole('heading', { name: 'water', level: 2 })).toBeInTheDocument()
  })

  it('rolls the Puzzle over exactly at UTC midnight', () => {
    const { unmount } = mountApp()
    expect(screen.getByRole('heading', { name: 'water', level: 2 })).toBeInTheDocument()
    unmount()
    render(<App clock={() => new Date(FIRST_INSTANT_AFTER_MIDNIGHT)} />)
    expect(screen.getByRole('heading', { name: 'wind', level: 2 })).toBeInTheDocument()
  })
})

describe('App tree growth', () => {
  it('renders the Tree with the Stem as its root', () => {
    mountApp()
    expect(screen.getByRole('img', { name: 'Tree' })).toBeInTheDocument()
  })

  it('labels every Sprout with its word', () => {
    mountApp()
    grow('backwater')
    grow('watery')
    grow('waterproof')
    const tree = screen.getByRole('img', { name: 'Tree' })
    for (const word of ['backwater', 'watery', 'waterproof']) {
      expect(within(tree).getByText(word)).toBeInTheDocument()
    }
  })

  it('grows a new Sprout off the branch of the word it extends', () => {
    mountApp()
    grow('waterproof')
    grow('waterproofing')
    expect(groupOf('waterproof')).toContainElement(groupOf('waterproofing'))
  })

  it('shares a twig between a word and its extension', () => {
    mountApp()
    grow('waterproof')
    grow('waterproofs')
    expect(groupOf('waterproof')).toContainElement(groupOf('waterproofs'))
  })

  it('keeps unrelated words on separate limbs', () => {
    mountApp()
    grow('waterproof')
    grow('waterproofing')
    grow('watery')
    expect(groupOf('waterproof')).not.toContainElement(groupOf('watery'))
  })

  it('decomposes a word into a prefix branch and a suffix twig around the Stem', () => {
    mountApp()
    grow('backwatered')
    expect(groupOf('BACK')).toContainElement(groupOf('backwatered'))
  })

  it('grows the leaf when a later Sprout completes an existing branch', () => {
    mountApp()
    grow('backwatered')
    grow('backwater')
    expect(groupOf('backwater')).toHaveClass('grow')
    expect(groupOf('backwater')).toContainElement(groupOf('backwatered'))
  })

  it('animates only the newest Sprout', () => {
    mountApp()
    grow('waterproof')
    expect(groupOf('waterproof')).toHaveClass('grow')
    grow('waterproofing')
    expect(groupOf('waterproofing')).toHaveClass('grow')
    expect(groupOf('waterproof')).not.toHaveClass('grow')
  })
})

describe('App daily continuity', () => {
  it('restores Sprouts, Points, counter, Tree and Streak after a reload', () => {
    const { unmount } = mountApp()
    grow('backwater')
    grow('watery')
    expect(screen.getByText(`2 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 15')).toBeInTheDocument()
    unmount()

    mountApp()
    expect(screen.getByText(`2 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 15')).toBeInTheDocument()
    expect(within(tree()).getByText('backwater')).toBeInTheDocument()
    expect(within(tree()).getByText('watery')).toBeInTheDocument()
    expect(screen.getByText('Streak: 1')).toBeInTheDocument()
  })

  it('starts a fresh Puzzle after a reload on a new UTC day', () => {
    const { unmount } = mountApp()
    grow('backwater')
    grow('watery')
    unmount()

    render(<App clock={() => new Date('2026-09-26T10:00:00.000Z')} />)
    expect(screen.getByRole('heading', { name: 'wind', level: 2 })).toBeInTheDocument()
    expect(screen.getByText(`0 of ${TOTAL_WIND}`)).toBeInTheDocument()
    expect(screen.queryByText('Points: 15')).not.toBeInTheDocument()
    expect(within(tree()).queryByText('backwater')).not.toBeInTheDocument()
  })

  it('clears today\'s Sprouts at UTC midnight and advances the Streak on consecutive days', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      let now = new Date('2026-09-25T23:00:00.000Z')
      render(<App clock={() => new Date(now)} />)

      grow('watery')
      expect(screen.getByText('Streak: 1')).toBeInTheDocument()
      grow('waterproof')
      expect(screen.getByText('Streak: 1')).toBeInTheDocument()

      now = new Date('2026-09-26T00:00:30.000Z')
      act(() => {
        vi.advanceTimersByTime(61_000)
      })
      expect(screen.getByRole('heading', { name: 'wind', level: 2 })).toBeInTheDocument()
      expect(screen.getByText(`0 of ${TOTAL_WIND}`)).toBeInTheDocument()
      expect(screen.getByText('Points: 0')).toBeInTheDocument()

      grow('windy')
      expect(screen.getByText('Streak: 2')).toBeInTheDocument()
      expect(screen.getByText('Points: 5')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('resets the Streak after a gap of days', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      let now = new Date('2026-09-25T23:00:00.000Z')
      render(<App clock={() => new Date(now)} />)

      grow('watery')
      expect(screen.getByText('Streak: 1')).toBeInTheDocument()

      now = new Date('2026-09-26T00:00:30.000Z')
      act(() => {
        vi.advanceTimersByTime(61_000)
      })
      grow('windy')
      expect(screen.getByText('Streak: 2')).toBeInTheDocument()

      now = new Date('2026-09-30T00:00:30.000Z')
      act(() => {
        vi.advanceTimersByTime(61_000)
      })
      grow('handy')
      expect(screen.getByText('Streak: 1')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a Streak of zero before anything is grown', () => {
    mountApp()
    expect(screen.getByText('Streak: 0')).toBeInTheDocument()
  })
})

describe('App shareable result', () => {
  it('downloads a share artifact with the grown Tree and stats, client-side only', async () => {
    mountApp()
    grow('backwater')
    const created: Blob[] = []
    const savedCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const savedRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(URL, 'createObjectURL', {
      value: (blob: Blob) => {
        created.push(blob)
        return 'blob:mock'
      },
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true })
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Share result' }))
      expect(created).toHaveLength(1)
      expect(created[0].type).toBe('image/svg+xml')
      expect(clickSpy).toHaveBeenCalledTimes(1)
      const svg = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(created[0])
      })
      expect(svg).toContain('backwater')
      expect(svg).toContain('Points: 9')
      expect(svg).toContain('Sprouts found: 1')
      expect(svg).not.toContain('waterproof')
    } finally {
      clickSpy.mockRestore()
      if (savedCreate) Object.defineProperty(URL, 'createObjectURL', savedCreate)
      else delete (URL as { createObjectURL?: unknown }).createObjectURL
      if (savedRevoke) Object.defineProperty(URL, 'revokeObjectURL', savedRevoke)
      else delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL
    }
  })
})

describe('App keyboard and motion', () => {
  it('is operable by keyboard alone: the word field starts focused and the Share control is a real button', () => {
    mountApp()
    expect(screen.getByRole('textbox', { name: 'Grow a word' })).toHaveFocus()
    const share = screen.getByRole('button', { name: 'Share result' })
    expect(share.tabIndex).toBeGreaterThanOrEqual(0)
    expect(share.tagName).toBe('BUTTON')
  })

  it('clears feedback on a timer when the player prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query.includes('reduce'), media: query }),
    )
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      mountApp()
      grow('waterz')
      expect(screen.getByRole('status')).toHaveTextContent('invalid')
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })

  it('keeps feedback until the shake ends when motion is allowed', () => {
    mountApp()
    grow('waterz')
    expect(screen.getByRole('status')).toHaveTextContent('invalid')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('App layout: vertical Tree, fixed HUD', () => {
  function treeZone() {
    return screen.getByRole('img', { name: 'Tree' }).parentElement!
  }
  function hudPane() {
    return screen.getByRole('form', { name: 'Grow a word' }).closest('main')!
  }

  it('keeps the HUD as a fixed overlay in front of the Tree zone, page unscrollable', () => {
    mountApp()
    grow('backwater')
    grow('watery')
    grow('waterproof')
    expect(document.documentElement.scrollHeight).toBe(document.documentElement.clientHeight)
    expect(treeZone()).toHaveClass('absolute', 'inset-0')
    expect(hudPane()).toHaveClass('absolute', 'inset-0', 'z-10')
    expect(
      hudPane().compareDocumentPosition(treeZone()) & Node.DOCUMENT_POSITION_PRECEDING,
    ).not.toBe(0)
    expect(
      treeZone().compareDocumentPosition(hudPane()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)
    expect(treeZone()).not.toContainElement(screen.getByRole('button', { name: 'Share result' }))
    expect(treeZone()).not.toContainElement(screen.getByRole('textbox', { name: 'Grow a word' }))
    expect(treeZone()).not.toContainElement(screen.getByRole('heading', { name: 'water', level: 2 }))
    expect(treeZone()).not.toContainElement(screen.getByText(`3 of ${TOTAL}`))
    expect(treeZone()).not.toContainElement(screen.getByText('Points: 25'))
    expect(treeZone()).not.toContainElement(screen.getByText('Streak: 1'))
  })

  it('never reallocates the interface while words grow the Tree', () => {
    mountApp()
    grow('backwater')
    const hudElements = [
      hudPane(),
      treeZone(),
      screen.getByRole('button', { name: 'Share result' }),
      screen.getByRole('textbox', { name: 'Grow a word' }),
      screen.getByRole('heading', { name: 'water', level: 2 }),
    ]
    const before = {
      zoneScrollHeight: treeZone().scrollHeight,
      zoneClientHeight: treeZone().clientHeight,
      pageScrollHeight: document.documentElement.scrollHeight,
      pageClientHeight: document.documentElement.clientHeight,
    }
    grow('waterproof')
    grow('waterproofing')
    grow('watery')
    expect(treeZone().scrollHeight).toBe(before.zoneScrollHeight)
    expect(treeZone().clientHeight).toBe(before.zoneClientHeight)
    expect(document.documentElement.scrollHeight).toBe(before.pageScrollHeight)
    expect(document.documentElement.clientHeight).toBe(before.pageClientHeight)
    expect(hudPane()).toBe(hudElements[0])
    expect(treeZone()).toBe(hudElements[1])
    expect(screen.getByRole('button', { name: 'Share result' })).toBe(hudElements[2])
    expect(screen.getByRole('textbox', { name: 'Grow a word' })).toBe(hudElements[3])
    expect(screen.getByRole('heading', { name: 'water', level: 2 })).toBe(hudElements[4])
    expect(screen.getByText('Points: 38')).toBeVisible()
    expect(screen.getByText(`4 of ${TOTAL}`)).toBeVisible()
    expect(screen.getByText('Streak: 1')).toBeVisible()
  })

  it('grows the Tree field upward as chains deepen, and sideways as Leaves spread', () => {
    mountApp()
    const aspect = () => {
      const [, , width, height] = screen
        .getByRole('img', { name: 'Tree' })
        .getAttribute('viewBox')!
        .split(' ')
        .map(Number)
      return height / width
    }
    grow('awater')
    grow('seawater')
    grow('seawaters')
    const deep = aspect()
    expect(deep).toBeGreaterThan(0.6)
    grow('waterproof')
    expect(aspect()).toBeLessThan(deep)
  })
})

describe('App word entry', () => {
  it('counts a valid word once: the counter moves and Points accrue by full length', () => {
    mountApp()
    expect(screen.getByText(`0 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 0')).toBeInTheDocument()

    grow('backwater')
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 9')).toBeInTheDocument()

    grow('waterproof')
    expect(screen.getByText(`2 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 19')).toBeInTheDocument()
  })

  it('is case- and whitespace-insensitive when matching a word', () => {
    mountApp()
    grow('  BackWater  ')
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 9')).toBeInTheDocument()
  })

  it('rejects the Stem itself: it is the root, not a Sprout', () => {
    mountApp()
    grow('water')
    expect(screen.getByRole('status')).toHaveTextContent('invalid')
    expect(screen.getByText(`0 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 0')).toBeInTheDocument()
  })

  it('shakes and shows "invalid" and adds nothing for a word outside the family', () => {
    mountApp()
    grow('waterz')
    expect(screen.getByRole('status')).toHaveTextContent('invalid')
    expect(screen.getByRole('textbox', { name: 'Grow a word' }).closest('.shake')).not.toBeNull()
    expect(screen.getByText(`0 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 0')).toBeInTheDocument()
  })

  it('clears the feedback once the shake has played out', () => {
    mountApp()
    grow('waterz')
    const shaking = screen.getByRole('textbox', { name: 'Grow a word' }).closest('.shake')!
    fireEvent.animationEnd(shaking)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shakes again for a second consecutive invalid word', () => {
    mountApp()
    grow('waterz')
    const firstInput = screen.getByRole('textbox', { name: 'Grow a word' })
    grow('waterr')
    const secondInput = screen.getByRole('textbox', { name: 'Grow a word' })
    expect(secondInput).not.toBe(firstInput)
    expect(secondInput).toHaveFocus()
    expect(secondInput.closest('.shake')).not.toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('invalid')
  })

  it('pulses "already sprouted" and does not double-count a duplicate', () => {
    mountApp()
    grow('backwater')
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument()

    grow('backwater')
    expect(screen.getByRole('status')).toHaveTextContent('already sprouted')
    expect(screen.getByRole('textbox', { name: 'Grow a word' }).closest('.pulse-once')).not.toBeNull()
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 9')).toBeInTheDocument()
  })

  it('empties the text field after invalid and duplicate feedback', () => {
    mountApp()
    grow('waterz')
    expect(screen.getByRole('textbox', { name: 'Grow a word' })).toHaveValue('')
    grow('backwater')
    expect(screen.getByRole('textbox', { name: 'Grow a word' })).toHaveValue('')
    grow('backwater')
    expect(screen.getByRole('textbox', { name: 'Grow a word' })).toHaveValue('')
  })

  it('lets the player continue after invalid and duplicate feedback', () => {
    mountApp()
    grow('waterz')
    grow('backwater')
    grow('backwater')
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 9')).toBeInTheDocument()

    grow('watery')
    expect(screen.getByText(`2 of ${TOTAL}`)).toBeInTheDocument()
    expect(screen.getByText('Points: 15')).toBeInTheDocument()
  })
})
