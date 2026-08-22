import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260822223827_allow_guarded_airline_assigned_replacements.sql'), 'utf8')

describe('live flight executor consequence guards', () => {
  it('requires explicit replacement classification and complete changed legs in the database wrapper', () => {
    expect(migration).toMatch(/jsonb_typeof\(p_match_evidence -> 'cancellation_or_rebooking'\) <> 'boolean'/)
    expect(migration).toMatch(/jsonb_typeof\(p_match_evidence -> 'airline_assigned_replacement'\) <> 'boolean'/)
    expect(migration).toMatch(/jsonb_typeof\(p_match_evidence -> 'changed_legs_complete'\) <> 'boolean'/)
    expect(migration).toMatch(/changed_legs_complete'\)::boolean is distinct from true/)
  })

  it('allows only an explicit no-action/no-choice stable airline replacement', () => {
    expect(migration).toMatch(/user_action_required[\s\S]+distinct from false/)
    expect(migration).toMatch(/unresolved_choice[\s\S]+distinct from false/)
    expect(migration).toMatch(/same_itinerary[\s\S]+same_travelers[\s\S]+same_carrier[\s\S]+same_dates[\s\S]+same_routes/)
  })

  it('keeps the guarded public wrapper service-only', () => {
    expect(migration).toMatch(/grant execute on function public\.apply_confident_flight_schedule_update[\s\S]+to service_role/)
  })
})
