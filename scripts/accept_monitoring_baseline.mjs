import fs from 'node:fs/promises'
import path from 'node:path'
import { acceptClosedPublicWatchChanges } from './lib/monitoring_baseline_acceptance.mjs'
import { validateSurveyorClosureManifest } from './lib/surveyor_closure_contract.mjs'

const [reportPath, manifestPath] = process.argv.slice(2)
if (!reportPath || !manifestPath) throw new Error('Usage: pnpm monitor:accept-report <monitor-report.json> <closure-manifest.json>')

const root = process.cwd()
const [report, manifest, watchSet] = await Promise.all([
  fs.readFile(reportPath, 'utf8').then(JSON.parse),
  fs.readFile(manifestPath, 'utf8').then(JSON.parse),
  fs.readFile(path.join(root, 'monitoring', 'watch-set.json'), 'utf8').then(JSON.parse),
])
validateSurveyorClosureManifest(manifest, report)
if (report.mode !== 'check') throw new Error(`Monitoring baseline acceptance blocked: report mode must be check, found ${report.mode ?? 'missing'}.`)

const statePath = path.join(root, watchSet.stateFile || '.monitoring-state/watch-state.local.json')
const state = JSON.parse(await fs.readFile(statePath, 'utf8'))
const accepted = acceptClosedPublicWatchChanges(report, manifest, state)
await fs.writeFile(statePath, `${JSON.stringify(accepted.state, null, 2)}\n`, 'utf8')
console.log(`Monitoring baseline acceptance: PASS (${accepted.acceptedSourceIds.length} reviewed public source${accepted.acceptedSourceIds.length === 1 ? '' : 's'} advanced${accepted.acceptedSourceIds.length ? `: ${accepted.acceptedSourceIds.join(', ')}` : ''})`)
