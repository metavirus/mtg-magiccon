export function projectResolutionToInfo(resolution: any, observation: any): null | { feed: Record<string, unknown>; topic: Record<string, unknown> | null }
export function monitoringConceptBaselineFromInfo(extracted: any, topic: any): Record<string, any> | null
export function projectRegisteredFactResolution(resolution: any, observation: any, topic: any): null | { mutation: Record<string, any> | null; receipt: Record<string, any> }
export function verifyRegisteredFactReadback(receipt: any, topic: any): boolean
