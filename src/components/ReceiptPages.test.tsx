import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReceiptPages } from './ReceiptPages'

afterEach(cleanup)
describe('receipt originals reader', () => {
  it('enlarges unchanged originals, zooms, changes pages and restores the opener', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') })
    render(<ReceiptPages title="Badge proof" pages={[
      { url: 'blob:original-1', label: 'Original page 1', mimeType: 'image/png' },
      { url: 'blob:original-2', label: 'Original page 2', mimeType: 'image/png' },
    ]} />)
    expect(screen.getByText('Browse original pages').parentElement).not.toHaveAttribute('open')
    const opener = screen.getByRole('button', { name: 'Show proof' })
    opener.focus()
    fireEvent.click(opener)
    const reader = screen.getByRole('dialog')
    expect(within(reader).getByRole('img').getAttribute('src')).toBe('blob:original-1')
    fireEvent.click(within(reader).getByRole('button', { name: 'Zoom in' }))
    expect(within(reader).getByRole('img').style.width).toBe('150%')
    fireEvent.click(within(reader).getByRole('button', { name: 'Next receipt page' }))
    expect(within(reader).getByRole('img').getAttribute('src')).toBe('blob:original-2')
    fireEvent.click(within(reader).getByRole('button', { name: 'Fit receipt to width' }))
    expect(within(reader).getByRole('img').style.width).toBe('100%')
    fireEvent.click(within(reader).getByRole('button', { name: 'Close enlarged receipt' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })
})
