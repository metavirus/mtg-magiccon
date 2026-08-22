export type RoutineFindingDomain = 'flight_schedule' | 'hotel_detail' | 'event_status' | 'official_detail'

export type RoutineFindingAssessment = {
  domain: RoutineFindingDomain
  confidence: number
  stableTargetBound: boolean
  deterministicFields: boolean
  reversible: boolean
  sourceEvidencePreserved: boolean
  contradictory: boolean
  destructiveOrCancellation: boolean
}

export type RoutineFindingDisposition = 'auto_apply' | 'needs_review'

export function classifyRoutineFinding(finding: RoutineFindingAssessment): RoutineFindingDisposition {
  return finding.confidence >= 0.9
    && finding.stableTargetBound
    && finding.deterministicFields
    && finding.reversible
    && finding.sourceEvidencePreserved
    && !finding.contradictory
    && !finding.destructiveOrCancellation
    ? 'auto_apply'
    : 'needs_review'
}

export function routineFindingConsequence(domain: RoutineFindingDomain) {
  const consequences: Record<RoutineFindingDomain, { target: string; signal: string }> = {
    flight_schedule: { target: 'Trip flight leg', signal: 'Your Atlanta flight changed.' },
    hotel_detail: { target: 'Matched Trip hotel', signal: 'Your Atlanta hotel details changed.' },
    event_status: { target: 'Matched event', signal: 'An Atlanta event status changed.' },
    official_detail: { target: 'Maintained Info topic', signal: 'Useful Atlanta information changed.' },
  }
  return consequences[domain]
}
