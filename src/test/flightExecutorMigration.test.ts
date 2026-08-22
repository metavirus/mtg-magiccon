import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260822222758_enforce_flight_update_consequence_guards.sql'), 'utf8')

describe('live flight executor consequence guards', () => {
  it('requires explicit non-cancellation and complete changed legs in the database wrapper', () => {
    expect(migration).toMatch(/jsonb_typeof\(p_match_evidence -> 'cancellation_or_rebooking'\) <> 'boolean'/)
    expect(migration).toMatch(/cancellation_or_rebooking'\)::boolean is distinct from false/)
    expect(migration).toMatch(/jsonb_typeof\(p_match_evidence -> 'changed_legs_complete'\) <> 'boolean'/)
    expect(migration).toMatch(/changed_legs_complete'\)::boolean is distinct from true/)
  })

  it('removes the callable internal executor from service and browser roles', () => {
    expect(migration).toMatch(/revoke all on function public\.apply_confident_flight_schedule_update_internal[\s\S]+from public, anon, authenticated, service_role/)
    expect(migration).toMatch(/grant execute on function public\.apply_confident_flight_schedule_update[\s\S]+to service_role/)
  })
})
