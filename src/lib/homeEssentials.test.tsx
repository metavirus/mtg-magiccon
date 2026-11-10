import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { HomeEssentials } from '../App'
import { previewInfoTopics } from './infoKnowledge'
import { screenReads } from './screenFreshness'

afterEach(cleanup)
type Props = ComponentProps<typeof HomeEssentials>
function props(key: 'kavi' | 'chris' | 'juan' | 'kyle', receipt = true): Props {
  const names = { kavi: 'Kavi', chris: 'Chris', juan: 'Juan', kyle: 'Kyle' } as const
  return {
    companion: { key, name: names[key], badgeTier: key === 'kavi' || key === 'chris' ? 'black_lotus' : 'premium', bubbleLabel: '', bubbleColor: '', blackLotusEntitled: false, relationship: '', sortOrder: 0 },
    receipts: receipt ? [{ id: 'my-pass', receipt_type: 'badge', title: 'My badge', vendor: 'MagicCon', receipt_date: '', amount: 0, currency: 'USD', attendee_person_key: key, attendee_person_keys: [key], line_items: [], receipt_artifacts: [] }] : [],
    topics: previewInfoTopics, onOpenPass: vi.fn(), onOpenWallet: vi.fn(), onOpenGuide: vi.fn(), onOpenMap: vi.fn(),
  }
}
describe('Home essentials actions', () => {
  it.each([['kavi', 'black-lotus'], ['chris', 'chris-black-lotus'], ['juan', 'juan-premium'], ['kyle', 'badge:my-pass']] as const)('opens the correct saved pass for %s', (person, target) => {
    const input = props(person)
    render(<HomeEssentials {...input} />)
    fireEvent.click(screen.getByRole('button', { name: /Open badge proof/ }))
    expect(input.onOpenPass).toHaveBeenCalledWith(target)
  })
  it('provides a neutral Wallet link when no personal badge is saved', () => {
    const input = props('kyle', false)
    render(<HomeEssentials {...input} />)
    expect(screen.queryByText('Premium Weekend')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Passes & receipts/ }))
    expect(input.onOpenWallet).toHaveBeenCalledOnce()
    expect(input.onOpenPass).not.toHaveBeenCalled()
  })
  it('opens the maintained entry/hours guides and map', () => {
    const input = props('kavi')
    render(<HomeEssentials {...input} />)
    fireEvent.click(screen.getByRole('button', { name: /Getting in/ }))
    expect(input.onOpenGuide).toHaveBeenLastCalledWith(previewInfoTopics.find(topic => topic.topic_key === 'will-call'))
    fireEvent.click(screen.getByRole('button', { name: /Show floor hours/ }))
    expect(input.onOpenGuide).toHaveBeenLastCalledWith(previewInfoTopics.find(topic => topic.topic_key === 'hours'))
    fireEvent.click(screen.getByRole('button', { name: /Find your way/ }))
    expect(input.onOpenMap).toHaveBeenCalledOnce()
    expect(screenReads('home', 'guide')).toEqual(expect.arrayContaining(['walletReceipts', 'info']))
  })
})
