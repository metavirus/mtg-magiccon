import { createClient } from '@supabase/supabase-js'
import { assertSupabaseProjectIdentity } from './projectIdentity'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = (() => {
  if (!url || !key) return null
  assertSupabaseProjectIdentity(url)
  if (key.startsWith('sb_secret_') || key.split('.').length === 3) {
    throw new Error('Only a modern Supabase publishable key is permitted in browser configuration.')
  }
  return createClient(url, key)
})()
