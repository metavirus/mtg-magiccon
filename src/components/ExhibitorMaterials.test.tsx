import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ExhibitorMaterials } from './ExhibitorMaterials'
afterEach(cleanup)
describe('quiet vendor materials', () => {
  it('opens a zoomable image without expanding vendor copy', () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
    render(<ExhibitorMaterials sections={[{ title: 'Vendor-posted exclusives', offers: [{ title: 'Playmat art', description: '', imageUrl: 'https://example.com/art.jpg' }] }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enlarge Playmat art' }))
    expect(screen.getByRole('dialog', { name: 'Playmat art image viewer' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('150%')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Fit' }))
    expect(screen.getByText('100%')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close image viewer' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('shows product images before closed vendor copy without requiring expansion', () => {
    render(<ExhibitorMaterials sections={[{ title: 'Vendor-posted exclusives', offers: [{ title: 'Convention playmat', description: 'While supplies last.', price: '25', imageUrl: 'https://example.com/playmat.jpg' }] }]} />)
    const image = screen.getByRole('img', { name: 'Convention playmat' })
    expect(image).toHaveAttribute('src', 'https://example.com/playmat.jpg')
    expect(image.closest('details')).toBeNull()
    expect(screen.getByText('Vendor description & offers (1)').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('While supplies last.')).toBeInTheDocument()
  })
  it('retains ordinary promotions behind a closed disclosure, never relabeling zero as free', () => {
    render(<ExhibitorMaterials description="Vendor marketing" sections={[{ title: 'Vendor-posted offers', offers: [
      { title: 'First four shoppers', description: 'Save one cent', price: '0.00' },
      { title: 'Playmat', description: 'Exclusive artwork', price: '24.95' },
    ] }]} />)
    const disclosure = screen.getByText('Vendor description & offers (2)').closest('details')!
    expect(disclosure).not.toHaveAttribute('open')
    // jsdom does not implement native details toggling; prove the retained structure.
    expect(disclosure).toContainElement(screen.getByText('Save one cent'))
    expect(screen.getByText('First four shoppers')).not.toHaveTextContent('Listed price')
    expect(screen.getByText('Playmat · Listed price 24.95')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Vendor description & offers (2)'))
  })
})
