export const CONCEPT_RULE_VERSION: number
export function extractMonitoringConcept(observation: Record<string, any>): Record<string, any> | null
export function extractMonitoringConcepts(observation: Record<string, any>): Record<string, any>[]
export function reconcileMonitoringObservation(observation: Record<string, any>, existingConcept?: Record<string, any> | null, extractedOverride?: Record<string, any> | null): Record<string, any>
export function factualChoiceFindingForResolution(resolution: Record<string, any>, observation: Record<string, any>, canonicalArticle: Record<string, any>): Record<string, any> | null
export function monitoringObservationFromChange(change: Record<string, any>, checkedAt: string): Record<string, any>
