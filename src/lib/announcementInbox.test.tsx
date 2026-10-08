import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MentionInbox } from '../App'

vi.mock('./supabase', () => ({ supabase: null }))
afterEach(cleanup)
type Props = ComponentProps<typeof MentionInbox>
const alert = (id: string, reviewState = 'needs-review') => ({ id, title: id, summary: `${id} details`, reviewState, severity: 'notice' }) as Props['alerts'][number]

describe('announcement envelope', () => {
  it('shows multiple announcements with their own titles, excludes read items, and preserves dismissal', () => {
    const onOpenAlert = vi.fn()
    const onDismissAlert = vi.fn()
    const onRestoreAlert = vi.fn()
    const exhibitor = alert('Exhibitor directory')
    const { container } = render(<MentionInbox items={[]} alerts={[exhibitor, alert('Panels released'), alert('Already read', 'reviewed'), alert('Dismissed news', 'archived')]} onOpenAlert={onOpenAlert} onDismissAlert={onDismissAlert} onRestoreAlert={onRestoreAlert} onOpenMention={vi.fn()} onDismissMention={vi.fn()} onRestoreMention={vi.fn()} />)
    expect(screen.getByLabelText('Inbox, 2 unread')).toBeTruthy()
    expect(screen.queryByText('Already read')).toBeNull()
    expect(container.querySelector('.has-urgent')).toBeNull()
    const inbox = container.querySelector('details')!
    inbox.open = true
    fireEvent.click(screen.getByRole('button', { name: /Exhibitor directory details/ }))
    expect(onOpenAlert).toHaveBeenCalledWith(exhibitor)
    expect(inbox.open).toBe(false)
    fireEvent.click(screen.getByLabelText('Dismiss Exhibitor directory'))
    expect(onDismissAlert).toHaveBeenCalledWith(exhibitor)
    fireEvent.click(screen.getByLabelText('Restore Dismissed news'))
    expect(onRestoreAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'Dismissed news' }))
  })
})
