export const CONCEPT_RULE_VERSION: number
export function extractMonitoringConcept(observation: Record<string, any>): Record<string, any> | null
export function reconcileMonitoringObservation(observation: Record<string, any>, existingConcept?: Record<string, any> | null): Record<string, any>
export function monitoringObservationFromChange(change: Record<string, any>, checkedAt: string): Record<string, any>
