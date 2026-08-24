const SOLD_OUT = /\b(sold\s*out|fully\s*booked|no\s*(?:tickets?|spots?|seats?)\s*(?:left|available))\b/i
const WAITLIST = /\b(join\s+(?:the\s+)?waitlist|wait\s*list|waitlist)\b/i
const UNAVAILABLE = /\b(registration\s+closed|sales?\s+closed|unavailable|not\s+available)\b/i
const AVAILABLE_ACTION = /\b(buy|purchase|register|reserve|add\s+to\s+cart|get\s+tickets?)\b/i

/**
 * Resolve source availability from explicit listing/control evidence.
 * Ambiguous pages stay unknown; they must not silently become available.
 */
export function inferTicketedPlayAvailability({ title = '', controls = [] } = {}) {
  const titleText = String(title)
  const controlEvidence = controls.map(control => ({
    text: String(control?.text ?? ''),
    disabled: Boolean(control?.disabled),
  }))

  if (SOLD_OUT.test(titleText) || controlEvidence.some(control => SOLD_OUT.test(control.text))) return 'sold_out'
  if (controlEvidence.some(control => WAITLIST.test(control.text)) || WAITLIST.test(titleText)) return 'waitlist'
  if (controlEvidence.some(control => UNAVAILABLE.test(control.text))) return 'unavailable'
  if (controlEvidence.some(control => AVAILABLE_ACTION.test(control.text) && !control.disabled)) return 'available'
  if (controlEvidence.some(control => AVAILABLE_ACTION.test(control.text) && control.disabled)) return 'unavailable'
  return 'unknown'
}
