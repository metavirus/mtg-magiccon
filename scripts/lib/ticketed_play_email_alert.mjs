const ALERTABLE_STATES = new Set(['available', 'waitlist', 'potential_opening'])
const VERIFIED_DISPOSITIONS = new Set(['canonical_update', 'routed_signal', 'retained_evidence'])

export function planTicketedPlayAvailabilityEmail(report, closureManifest) {
  const ticketedChanges = (report.changes ?? []).filter(change => change.intakeKind === 'ticketed_play_inventory')
  const verifiedClosure = (closureManifest.catches ?? []).some(item =>
    item.sourceId === 'atlanta-ticketed-play-inventory'
    && VERIFIED_DISPOSITIONS.has(item.disposition)
    && Array.isArray(item.readbacks)
    && item.readbacks.length > 0
  )
  if (!verifiedClosure) return null

  for (const change of ticketedChanges) {
    const watches = new Map((change.availabilityWatches ?? []).filter(watch => watch.emailAlert === true).map(watch => [String(watch.sourceEventKey), watch]))
    for (const transition of change.transitions ?? []) {
      const watch = watches.get(String(transition.sourceEventKey))
      if (!watch || !ALERTABLE_STATES.has(transition.availability)) continue
      const isAvailable = transition.availability === 'available'
      const isWaitlist = transition.availability === 'waitlist'
      const stateLabel = isAvailable ? 'available again' : isWaitlist ? 'accepting a waitlist' : 'possibly opening'
      const registrationUrl = watch.registrationUrl || transition.event?.sourceUrl
      return {
        alertKey: `ticketed-play:${transition.sourceEventKey}:${transition.availability}:${report.checkedAt}`,
        subject: `ALERT! ${watch.title} is ${stateLabel}`,
        text: [
          `${watch.title} is ${stateLabel}.`,
          '',
          isAvailable ? 'A purchase spot appears to be open. Act quickly if Juan still wants to join.' : isWaitlist ? 'The event now offers a waitlist. Join it if Juan still wants a spot.' : 'The SOLD OUT label disappeared, but a purchase control was not confirmed. Check the registration page now.',
          '',
          registrationUrl,
          '',
          `Confirmed by the MagicCon surveyor at ${report.checkedAt}.`,
        ].join('\n'),
      }
    }
  }
  return null
}
