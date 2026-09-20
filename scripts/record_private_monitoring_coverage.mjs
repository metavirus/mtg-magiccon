import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { privateCoverageReceipt } from './lib/private_monitoring_coverage.mjs'

// No connector, Gmail mutation, public-source baseline, or canonical writer.
const input = process.argv[2]
if (!input) throw new Error('Usage: node scripts/record_private_monitoring_coverage.mjs <ignored-private-attempt.json>')
const root = process.cwd()
const file = path.join(root, '.monitoring-state/private/gmail-coverage.local.json')
let previous = null
try { previous = JSON.parse(await readFile(file, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const config = JSON.parse(await readFile(path.join(root, 'monitoring/gmail-watch-queries.json'), 'utf8'))
const attempt = JSON.parse(await readFile(path.resolve(input), 'utf8'))
const receipt = privateCoverageReceipt(previous, attempt, config.queries.map(q => q.id))
await mkdir(path.dirname(file), { recursive: true })
await writeFile(`${file}.tmp`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
await rename(`${file}.tmp`, file)
console.log(JSON.stringify({ status: receipt.lastAttempt.status, capability: receipt.lastAttempt.capability, lastSuccessfulSearchThrough: receipt.lastSuccessfulSearchThrough, unresolvedCount: receipt.unresolvedCandidates.length }))
