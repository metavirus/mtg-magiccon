import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { buildMonitoringCandidateRows } from './lib/build_monitoring_candidates.mjs'

const reportPath = process.argv[2]
if (!reportPath) throw new Error('Usage: pnpm monitor:stage <monitor-report.json>')

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !secretKey) {
  if (process.argv.includes('--allow-missing')) {
    console.log('Monitoring findings: SKIP (SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required)')
    process.exit(0)
  }
  throw new Error('Monitoring findings cannot be staged: configure the GitHub Actions secret SUPABASE_SECRET_KEY with a modern server-only key for pavjsexxbueuzhzgemgy.')
}
if (!supabaseUrl.includes('pavjsexxbueuzhzgemgy.supabase.co')) throw new Error('Refusing to stage findings outside canonical project pavjsexxbueuzhzgemgy.')
if (!secretKey.startsWith('sb_secret_')) throw new Error('SUPABASE_SECRET_KEY must be a modern server-only secret key.')

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))
const changes = Array.isArray(report.changes) ? report.changes : []
if (!changes.length) {
  console.log('Monitoring findings: PASS (no source changes to stage)')
  process.exit(0)
}

const candidateRows = buildMonitoringCandidateRows(report)

const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const fingerprints = candidateRows.map(row => row.fingerprint)
const existingResult = await client.from('monitoring_findings').select('fingerprint,occurrence_count').in('fingerprint', fingerprints)
if (existingResult.error) throw existingResult.error
const existingCounts = new Map((existingResult.data ?? []).map(row => [row.fingerprint, row.occurrence_count]))
const rows = candidateRows.map(row => ({ ...row, occurrence_count: (existingCounts.get(row.fingerprint) ?? 0) + 1 }))
const { error } = await client.from('monitoring_findings').upsert(rows, { onConflict: 'fingerprint' })
if (error) throw error
console.log(`Monitoring findings: PASS (${changes.length} changed source(s) collapsed to ${rows.length} Kavi review candidate(s); fingerprints deduplicated)`)
