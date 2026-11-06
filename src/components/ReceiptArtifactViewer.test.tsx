import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { downloadReceiptArtifact, type ReceiptArtifact } from '../lib/receiptArtifacts'
import { ReceiptArtifactViewer } from './ReceiptArtifactViewer'

vi.mock('../lib/receiptArtifacts', () => ({ downloadReceiptArtifact: vi.fn() }))

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

it('shows a ready page while another hangs and retries only the missing page', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { revokeObjectURL: vi.fn() }))
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  const pages = [1, 2].map(number => ({
    id: String(number), display_label: `Page ${number}`, mime_type: 'image/png',
  })) as ReceiptArtifact[]
  const download = vi.mocked(downloadReceiptArtifact)
  download.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce('blob:page-2').mockResolvedValueOnce('blob:page-1')
  await act(async () => { render(<ReceiptArtifactViewer artifacts={pages} ownerId="owner-a" title="Order" />) })
  expect(screen.getByText('1 of 2 pages available')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show proof' }))
  expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', 'blob:page-2')
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close enlarged receipt' }))
  const retry = screen.getByRole('button', { name: 'Retry Page 1' })
  await act(async () => { fireEvent.click(retry) })
  expect(download.mock.calls.map(([page]) => page.id)).toEqual(['1', '2', '1'])
  fireEvent.click(screen.getByRole('button', { name: 'Show proof' }))
  expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', 'blob:page-1')
  fireEvent.click(screen.getByRole('button', { name: 'Next receipt page' }))
  expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', 'blob:page-2')
})
