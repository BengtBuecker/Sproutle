import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import App from '../App'
import { WORD_FAMILIES } from '../data/wordFamilies'
import { buildTree } from '../game/tree'
import {
  ZOOM_MAX,
  groundSpan,
  newestPlacement,
  treeBounds,
  worldFromModel,
  zoomFit,
} from '../game/world'
import { cameraWindowOf, expectPlacementInView } from './cameraTestUtils'
import type { CameraView } from './cameraTestUtils'

function cameraOf(): CameraView {
  const group = screen
    .getByRole('img', { name: 'Tree' })
    .querySelector('.camera-group')! as HTMLElement
  const numbers = group.style.transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  return { focusX: -numbers[3], focusY: -numbers[4], zoom: numbers[2] }
}

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

  it('grows the Roots in once per day load while the Ground grass line shows immediately', () => {
    mountApp()
    const treeSvg = screen.getByRole('img', { name: 'Tree' })
    const roots = treeSvg.querySelector('.roots-in')
    expect(roots).not.toBeNull()
    expect(roots!.querySelectorAll('.grass-blade').length).toBe(0)
    expect(treeSvg.querySelectorAll('.grass-blade').length).toBeGreaterThan(0)
    expect(treeSvg.querySelector('.ground')).not.toBeNull()
  })

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
    expect(treeZone()).not.toContainElement(screen.getByText('Height: 5 m'))
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

  it('pans the camera upward as chains deepen and sideways as Leaves spread', () => {
    mountApp()
    grow('waterproof')
    const shallowY = cameraOf().focusY
    grow('awater')
    grow('seawater')
    grow('seawaters')
    const deepY = cameraOf().focusY
    expect(deepY).toBeLessThan(shallowY)
    const sidewaysX = cameraOf().focusX
    grow('watery')
    expect(cameraOf().focusX).toBeGreaterThan(sidewaysX)
  })

  it('pans the camera to every newly grown word so the newest growth always appears in view', () => {
    mountApp()
    const words = WORD_FAMILIES['water'].words.filter((word) => word !== 'water').slice(0, 20)
    const seenFocuses = new Set<string>()
    for (const [index, word] of words.entries()) {
      grow(word)
      const world = worldFromModel(buildTree('water', words.slice(0, index + 1)))
      const newest = newestPlacement(world)
      const view = cameraWindowOf(cameraOf())
      expect(view.left).toBeLessThanOrEqual(newest.x)
      expect(view.right).toBeGreaterThanOrEqual(newest.x)
      expect(view.top).toBeLessThanOrEqual(newest.y)
      expect(view.bottom).toBeGreaterThanOrEqual(newest.y)
      seenFocuses.add(`${cameraOf().focusX},${cameraOf().focusY}`)
    }
    expect(seenFocuses.size).toBeGreaterThan(1)
  })

  it('starts a fresh day with the camera framing the Ground', () => {
    mountApp()
    const world = worldFromModel(buildTree('water', []))
    const view = cameraWindowOf(cameraOf())
    const ground = groundSpan(world)
    expect(view.left).toBeLessThanOrEqual(ground.left)
    expect(view.right).toBeGreaterThanOrEqual(ground.right)
    expect(view.top).toBeLessThanOrEqual(-1)
    expect(view.bottom).toBeGreaterThanOrEqual(0)
  })

  it('frames the whole existing Tree after a mid-day reload', () => {
    const words = ['waterproof', 'watery', 'backwater', 'seawater']
    const { unmount } = mountApp()
    for (const word of words) grow(word)
    unmount()

    mountApp()
    const view = cameraWindowOf(cameraOf())
    const bounds = treeBounds(worldFromModel(buildTree('water', words)))
    expect(view.left).toBeLessThanOrEqual(bounds.minX)
    expect(view.right).toBeGreaterThanOrEqual(bounds.maxX)
    expect(view.top).toBeLessThanOrEqual(bounds.minY)
    expect(view.bottom).toBeGreaterThanOrEqual(bounds.maxY)
  })
})

describe('App height scale', () => {
  it('shows a Height readout in meters that climbs with Branch generations', () => {
    mountApp()
    expect(screen.getByText('Height: 0 m')).toBeInTheDocument()
    grow('waterproof')
    expect(screen.getByText('Height: 5 m')).toBeInTheDocument()
    grow('waterproofing')
    expect(screen.getByText('Height: 10 m')).toBeInTheDocument()
  })

  it('marks the height scale at 1 m and the 5, 10, 25 and 30 m markers', () => {
    mountApp()
    const svg = tree()
    const labels = [...svg.querySelectorAll('.height-tick-label')].map((el) => el.textContent)
    expect(labels).toEqual(['5 m', '10 m', '25 m', '30 m'])
    expect(svg.querySelectorAll('.height-tick-minor').length).toBe(1)
    expect(svg.querySelectorAll('.height-tick-major').length).toBe(4)
    expect(svg.querySelector('.height-ruler')).not.toBeNull()
  })

  it('keeps tick positions world-locked while labels stay screen-fixed and readable', () => {
    mountApp()
    grow('waterproof')
    grow('waterproofing')
    const svg = tree()
    const scale = svg.querySelector('.height-scale')!
    expect(svg.querySelector('.camera-group')!.contains(scale)).toBe(false)
    const tenMeters = [...scale.querySelectorAll('.height-tick-label')].find(
      (el) => el.textContent === '10 m',
    )!
    const yBefore = tenMeters.getAttribute('y')
    fireEvent.wheel(svg, { deltaY: -240, ctrlKey: true })
    expect(tenMeters.getAttribute('y')).not.toBe(yBefore)
  })
})

describe('App manual camera control', () => {
  it('pans with the mouse wheel and pauses auto-follow until the follow control resumes it', () => {
    mountApp()
    const words = WORD_FAMILIES['water'].words.filter((word) => word !== 'water').slice(0, 18)
    for (const word of words.slice(0, 16)) grow(word)
    const before = cameraOf()
    fireEvent.wheel(tree(), { deltaY: 240 })
    expect(cameraOf().focusY).toBeGreaterThan(before.focusY)
    const followButton = screen.getByRole('button', { name: 'Follow the Tree' })
    expect(followButton.tagName).toBe('BUTTON')
    expect(followButton.tabIndex).toBeGreaterThanOrEqual(0)
    const frozen = cameraOf()
    grow(words[16])
    expect(cameraOf()).toEqual(frozen)
    fireEvent.click(followButton)
    expect(screen.queryByRole('button', { name: 'Follow the Tree' })).not.toBeInTheDocument()
    expectPlacementInView(cameraOf(), newestPlacement(worldFromModel(buildTree('water', [...words, words[16]]))))
    grow(words[17])
    expectPlacementInView(
      cameraOf(),
      newestPlacement(worldFromModel(buildTree('water', [...words, words[16], words[17]]))),
    )
  })

  it('zooms with ctrl+wheel, clamped to the fitted minimum and 2.5x max', () => {
    mountApp()
    const words = ['waterproof', 'watery', 'backwater']
    for (const word of words) grow(word)
    for (let index = 0; index < 8; index++) {
      fireEvent.wheel(tree(), { deltaY: -240, ctrlKey: true })
    }
    expect(cameraOf().zoom).toBe(ZOOM_MAX)
    for (let index = 0; index < 15; index++) {
      fireEvent.wheel(tree(), { deltaY: 240, ctrlKey: true })
    }
    expect(cameraOf().zoom).toBe(zoomFit(worldFromModel(buildTree('water', words))))
  })

  it('pans by dragging the Tree', () => {
    mountApp()
    const words = ['waterproof', 'watery', 'backwater', 'seawater', 'cutwater']
    for (const word of words) grow(word)
    fireEvent.wheel(tree(), { deltaY: -240, ctrlKey: true })
    fireEvent.wheel(tree(), { deltaY: -240, ctrlKey: true })
    const before = cameraOf()
    expect(before.zoom).toBe(ZOOM_MAX)
    fireEvent.pointerDown(tree(), { pointerId: 1, clientX: 500, clientY: 500 })
    fireEvent.pointerMove(tree(), { pointerId: 1, clientX: 600, clientY: 440 })
    expect(cameraOf().focusX).toBeLessThan(before.focusX)
    expect(cameraOf().focusY).toBeGreaterThan(before.focusY)
    expect(screen.getByRole('button', { name: 'Follow the Tree' })).toBeInTheDocument()
    fireEvent.pointerUp(tree(), { pointerId: 1 })
  })

  it('zooms by pinching', () => {
    mountApp()
    grow('waterproof')
    fireEvent.pointerDown(tree(), { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerDown(tree(), { pointerId: 2, clientX: 200, clientY: 100 })
    const before = cameraOf().zoom
    fireEvent.pointerMove(tree(), { pointerId: 1, clientX: 50, clientY: 100 })
    fireEvent.pointerMove(tree(), { pointerId: 2, clientX: 250, clientY: 100 })
    expect(cameraOf().zoom).toBeGreaterThan(before)
    fireEvent.pointerUp(tree(), { pointerId: 1 })
    fireEvent.pointerUp(tree(), { pointerId: 2 })
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
