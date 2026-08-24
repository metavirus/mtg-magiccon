export function paidEventPriceAmount(price?: string) {
  if (!price) return null
  const normalized = price.trim().toLowerCase()
  if (!normalized || normalized === 'free' || normalized === 'included') return null
  const amount = Number(normalized.replace(/[^0-9.]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function canPurchaseEvent(price?: string) {
  return paidEventPriceAmount(price) !== null
}

export function applyPurchaseTransition(state: string, purchased: boolean) {
  return { state: purchased ? 'committed' : state, purchased }
}

export function showCalendarPurchaseMarker(purchased: boolean) {
  return purchased
}
