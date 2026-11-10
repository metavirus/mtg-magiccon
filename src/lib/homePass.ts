type BadgeReceipt = {
  id: string
  receipt_type: string
  attendee_person_key: string
  attendee_person_keys: string[]
}

// Prefer an individual/transfer receipt over the original shared order.
export function personalBadgeReceipt<T extends BadgeReceipt>(receipts: T[], personKey?: string): T | undefined {
  if (!personKey) return undefined
  const attendees = (receipt: T) => receipt.attendee_person_keys.length ? receipt.attendee_person_keys : [receipt.attendee_person_key]
  return receipts.filter(receipt => receipt.receipt_type === 'badge' && attendees(receipt).includes(personKey))
    .sort((a, b) => attendees(a).length - attendees(b).length)[0]
}
