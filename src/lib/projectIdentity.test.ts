import { describe, expect, it } from 'vitest'
import { assertSupabaseProjectIdentity } from './projectIdentity'

describe('project identity guard', () => {
  it('accepts only the expected project host', () => expect(() => assertSupabaseProjectIdentity('https://pavjsexxbueuzhzgemgy.supabase.co')).not.toThrow())
  it('rejects another project', () => expect(() => assertSupabaseProjectIdentity('https://wrong.supabase.co')).toThrow(/identity mismatch/))
})
