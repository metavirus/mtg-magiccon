import { describe, expect, it } from 'vitest'
import { applyPurchaseTransition, canPurchaseEvent, paidEventPriceAmount, showCalendarPurchaseMarker } from './eventPurchase'

describe('paid event purchase state', () => {
  it('allows only a positive paid price', () => {
    expect(canPurchaseEvent('$25')).toBe(true)
    expect(paidEventPriceAmount('$110.00')).toBe(110)
    for (const price of ['Free', 'included', '$0', '$0.00', '', undefined]) expect(canPurchaseEvent(price)).toBe(false)
  })

  it('forces committed when purchased', () => {
    expect(applyPurchaseTransition('tentative', true)).toEqual({ state: 'committed', purchased: true })
  })

  it('leaves committed selected when purchase is undone', () => {
    expect(applyPurchaseTransition('committed', false)).toEqual({ state: 'committed', purchased: false })
  })

  it('shows a calendar list marker only for purchased events', () => {
    expect(showCalendarPurchaseMarker(true)).toBe(true)
    expect(showCalendarPurchaseMarker(false)).toBe(false)
  })
})
