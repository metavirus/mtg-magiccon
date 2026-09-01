function retainedEventIds(proofs = []) {
  const ids = new Set()
  for (const proof of proofs) {
    for (const readback of proof?.readbacks ?? []) {
      const evidence = readback?.observed?.evidence
      for (const event of evidence?.events ?? []) if (event?.eventId) ids.add(String(event.eventId))
      if (evidence?.event?.id) ids.add(String(evidence.event.id))
    }
  }
  return ids
}

export function closeTicketedPlayTransitions({ transitions = [], availabilityReadback = [], proofs = [], sourceId }) {
  const transitionKeys = new Set(transitions.map(item => String(item.eventId)))
  const observed = availabilityReadback.filter(item => transitionKeys.has(String(item.event_id)))
  const canonicalKeys = new Set(observed.map(item => String(item.event_id)))
  const evidenceKeys = retainedEventIds(proofs)
  const uncovered = [...transitionKeys].filter(eventId => !canonicalKeys.has(eventId) && !evidenceKeys.has(eventId))

  if (uncovered.length) {
    throw new Error(`Surveyor closure blocked: Ticketed Play transition(s) lacked canonical availability or retained-evidence readback: ${uncovered.join(', ')}.`)
  }

  const evidenceOnly = [...transitionKeys].filter(eventId => !canonicalKeys.has(eventId))
  return {
    disposition: evidenceOnly.length ? 'retained_evidence' : 'canonical_update',
    targets: [
      ...(observed.length ? [{ kind: 'explore_availability', identifier: sourceId }] : []),
      ...proofs.flatMap(proof => proof.targets ?? []),
    ],
    readbacks: [
      ...(observed.length ? [{ system: 'supabase', relation: 'ticketed_play_current_availability', match: { event_ids: [...canonicalKeys] }, observed }] : []),
      ...proofs.flatMap(proof => proof.readbacks ?? []),
    ],
    rationale: evidenceOnly.length
      ? `${observed.length} Ticketed Play transition(s) updated canonical availability; ${evidenceOnly.length} unresolved identity transition(s) remained retained source evidence for review.`
      : 'Current availability was projected to Explore; useful selection impact was routed on existing Home and Inbox surfaces.',
  }
}
