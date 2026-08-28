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
