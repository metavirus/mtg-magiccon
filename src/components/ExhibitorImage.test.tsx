import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ExhibitorImage } from './ExhibitorImage'

afterEach(cleanup)
it('shows supplied logos without cropping and falls back when media fails', () => {
  const { container, rerender } = render(<ExhibitorImage src="https://example.com/logo.png" name="Card Supply" logo />)
  fireEvent.error(screen.getByRole('img', { name: 'Card Supply logo' }))
  expect(screen.queryByRole('img')).toBeNull()
  expect(container).toHaveTextContent('CS')
  rerender(<ExhibitorImage src="https://example.com/new.png" name="Card Supply" logo />)
  expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/new.png')
})
it('never creates an empty product placeholder or renders unsafe media', () => {
  const { container } = render(<ExhibitorImage src="javascript:alert(1)" name="Offer" />)
  expect(container).toBeEmptyDOMElement()
})
