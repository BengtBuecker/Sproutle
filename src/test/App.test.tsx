import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import App from '../App'

afterEach(cleanup)

const TODAY = '2026-09-25T15:04:05.000Z'
const LAST_INSTANT_BEFORE_MIDNIGHT = '2026-09-25T23:59:59.999Z'
const FIRST_INSTANT_AFTER_MIDNIGHT = '2026-09-26T00:00:00.000Z'

describe('App', () => {
  it('renders the game screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Sproutle' })).toBeInTheDocument()
  })

  it('shows the Stem matching the deterministic date mapping', () => {
    render(<App clock={() => new Date(TODAY)} />)
    expect(screen.getByRole('heading', { name: 'water', level: 2 })).toBeInTheDocument()
  })

  it('rolls the Puzzle over exactly at UTC midnight', () => {
    const { unmount } = render(
      <App clock={() => new Date(LAST_INSTANT_BEFORE_MIDNIGHT)} />,
    )
    expect(screen.getByRole('heading', { name: 'water', level: 2 })).toBeInTheDocument()
    unmount()
    render(<App clock={() => new Date(FIRST_INSTANT_AFTER_MIDNIGHT)} />)
    expect(screen.getByRole('heading', { name: 'wind', level: 2 })).toBeInTheDocument()
  })

  it('shows 0 of the Word family total before any Sprout', () => {
    render(<App clock={() => new Date(TODAY)} />)
    expect(screen.getByText('0 of 244')).toBeInTheDocument()
  })
})
