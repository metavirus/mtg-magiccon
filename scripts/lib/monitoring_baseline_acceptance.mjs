export function stageTicketedPlayBaselineSnapshot(state, current, checkedAt, hasReviewableDiff) {
  const next = structuredClone(state)
  next.version = 2
  if (!Array.isArray(state.accepted) || state.accepted.length === 0) {
    next.accepted = current
    next.acceptedAt = checkedAt
    delete next.pending
  } else if (hasReviewableDiff) {
    next.pending = { events: current, detectedAt: checkedAt }
  } else {
    delete next.pending
  }
  return next
}

export function acceptClosedPublicWatchChanges(report, manifest, state) {
  if (state.checkedAt !== report.checkedAt) {
    throw new Error(`Monitoring baseline acceptance blocked: state checkedAt ${state.checkedAt ?? 'missing'} does not match report ${report.checkedAt ?? 'missing'}.`)
  }

  const next = structuredClone(state)
  next.accepted ??= {}
  next.pending ??= {}
  const acceptedSourceIds = []

  for (const item of manifest.catches ?? []) {
    if (item.intakeKind !== 'public_watch') continue
    const pending = next.pending[item.sourceId]
    if (!pending || pending.detectedAt !== report.checkedAt) {
      throw new Error(`Monitoring baseline acceptance blocked: exact pending snapshot missing for ${item.sourceId} at ${report.checkedAt}.`)
    }
    const { detectedAt: _detectedAt, ...snapshot } = pending
    next.accepted[item.sourceId] = { ...snapshot, acceptedAt: report.checkedAt }
    delete next.pending[item.sourceId]
    acceptedSourceIds.push(item.sourceId)
  }

  return { state: next, acceptedSourceIds }
}

export function acceptClosedTicketedPlayChanges(report, manifest, state) {
  const catchItem = (manifest.catches ?? []).find(item => item.intakeKind === 'ticketed_play_inventory')
  if (!catchItem) return { state: structuredClone(state), accepted: false }

  const pending = state.pending
  if (!pending || pending.detectedAt !== report.checkedAt) {
    throw new Error(`Ticketed Play baseline acceptance blocked: exact pending snapshot missing at ${report.checkedAt ?? 'missing'}.`)
  }
  if (JSON.stringify(pending.events ?? []) !== JSON.stringify(report.ticketedPlay?.inventory ?? [])) {
    throw new Error('Ticketed Play baseline acceptance blocked: pending inventory does not match the verified report.')
  }

  const next = structuredClone(state)
  next.accepted = pending.events
  next.acceptedAt = report.checkedAt
  delete next.pending
  return { state: next, accepted: true }
}
