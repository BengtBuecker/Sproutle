import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import App from '../App'
import { WORD_FAMILIES } from '../data/wordFamilies'

afterEach(cleanup)

const TODAY = '2026-09-25T15:04:05.000Z'
const FIRST_INSTANT_AFTER_MIDNIGHT = '2026-09-26T00:00:00.000Z'
const TOTAL = WORD_FAMILIES['water'].words.length

function mountApp() {
  return render(<App clock={() => new Date(TODAY)} />)
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
