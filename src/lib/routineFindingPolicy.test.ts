import { describe, expect, it } from 'vitest'
import { classifyRoutineFinding, routineFindingConsequence, type RoutineFindingAssessment } from './routineFindingPolicy'

const safe: RoutineFindingAssessment = {
  domain: 'hotel_detail', confidence: 0.97, stableTargetBound: true, deterministicFields: true,
  reversible: true, sourceEvidencePreserved: true, contradictory: false, destructiveOrCancellation: false,
}

describe('routine surveyor finding policy', () => {
  it.each(['flight_schedule', 'hotel_detail', 'event_status', 'official_detail'] as const)('auto-applies a safe %s field update', domain => {
    expect(classifyRoutineFinding({ ...safe, domain })).toBe('auto_apply')
    expect(routineFindingConsequence(domain).signal).not.toMatch(/review|codex/i)
  })

  it.each([
    { confidence: 0.89 }, { stableTargetBound: false }, { deterministicFields: false },
    { reversible: false }, { sourceEvidencePreserved: false }, { contradictory: true }, { destructiveOrCancellation: true },
  ])('routes unsafe or unresolved facts to review: %o', override => {
    expect(classifyRoutineFinding({ ...safe, ...override })).toBe('needs_review')
  })
})
