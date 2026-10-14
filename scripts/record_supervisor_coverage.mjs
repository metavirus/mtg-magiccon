// Artifact-only completion ledger; no discovery, staging, credentials or acceptance.
import fs from 'node:fs/promises'
import path from 'node:path'
import { reviewedSourceProjectionCoverage } from './lib/reviewed_source_projection.mjs'
import { verifySupervisorCoverage, supervisorReceipt } from './lib/supervisor_coverage_receipt.mjs'
import { validateSurveyorCheckpoint } from './lib/surveyor_checkpoint.mjs'
import { surveyorReportDigest } from './lib/surveyor_closure_contract.mjs'

const [artifactDir, runMetadataPath] = process.argv.slice(2)
if (!artifactDir || !runMetadataPath) throw new Error('Usage: pnpm monitor:record-supervision <downloaded-artifact-dir> <exact-gh-run-metadata.json>')
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'))
const ledger = '.monitoring-state/private/supervisor-coverage.local.json'
const previous = await read(ledger).catch(error => { if (error.code === 'ENOENT') return null; throw error })
const checkedAt = new Date().toISOString()
let attempt
try {
  const [report, manifest, receipt, run, reviews, gmail, queries, checkpoint] = await Promise.all([
    read(path.join(artifactDir, 'monitor-check.json')), read(path.join(artifactDir, 'closure-manifest.json')),
    read(path.join(artifactDir, 'run-receipt.json')), read(runMetadataPath), read('monitoring/reviewed-source-projections.json'),
    read('.monitoring-state/private/gmail-coverage.local.json').catch(error => { if (error.code === 'ENOENT') return null; throw error }), read('monitoring/gmail-watch-queries.json'), read(path.join(artifactDir, 'baseline-checkpoint.json'))])
  validateSurveyorCheckpoint(checkpoint, ['.monitoring-state/watch-state.local.json', '.monitoring-state/ticketed-play-inventory.local.json'])
  if (checkpoint.reportDigest !== surveyorReportDigest(report)) throw new Error('Checkpoint is not bound to the exact downloaded report')
  const artifacts = {}
  for (const review of Object.values(reviews)) {
    if (!/^src\/data\/[a-zA-Z0-9_.-]+\.json$/.test(review.projectionPath)) throw new Error('Invalid projection path')
    artifacts[review.projectionPath] = await fs.readFile(review.projectionPath)
  }
  const sources = Object.values(checkpoint.files['.monitoring-state/watch-state.local.json'].content.accepted)
  const projectionCoverage = reviewedSourceProjectionCoverage(sources, reviews, artifacts)
  attempt = verifySupervisorCoverage({ report, manifest, receipt, run, projectionCoverage, gmail,
    queryIds: queries.queries.map(query => query.id), checkedAt })
} catch (error) {
  attempt = { checkedAt, publicStatus: 'unfinished', reason: error.message }
  process.exitCode = 1
}
await fs.mkdir(path.dirname(ledger), { recursive: true })
await fs.writeFile(`${ledger}.tmp`, `${JSON.stringify(supervisorReceipt(previous, attempt), null, 2)}\n`)
await fs.rename(`${ledger}.tmp`, ledger)
console.log(JSON.stringify(attempt))
