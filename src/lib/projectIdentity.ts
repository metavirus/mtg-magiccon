export const EXPECTED_PROJECT_REF = 'pavjsexxbueuzhzgemgy'

export function assertSupabaseProjectIdentity(url: string): void {
  let host: string
  try { host = new URL(url).hostname } catch { throw new Error('Supabase URL is invalid.') }
  if (host !== `${EXPECTED_PROJECT_REF}.supabase.co`) {
    throw new Error(`Project identity mismatch: expected ${EXPECTED_PROJECT_REF}.`)
  }
}
