import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { CatalogProductImageDetail } from './CatalogProductImageDetail'

afterEach(cleanup)
it('opens the packaged detail asset for zoom without switching to the remote source', () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  render(<CatalogProductImageDetail src="./merchandise/atlanta-2026/jace-detail.webp" title="Jace hoodie" />)
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge Jace hoodie' }))
  const dialog = screen.getByRole('dialog', { name: 'Jace hoodie image viewer' })
  expect(within(dialog).getByRole('img')).toHaveAttribute('src', './merchandise/atlanta-2026/jace-detail.webp')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }))
  expect(within(dialog).getByText('150%')).toBeVisible()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close image viewer' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge Jace hoodie' }))
  expect(screen.getByText('100%')).toBeVisible()
})
