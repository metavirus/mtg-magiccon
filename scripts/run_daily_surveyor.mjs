import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { runSurveyorRuntime } from './lib/surveyor_runtime.mjs'
import * as closureContract from './lib/surveyor_closure_contract.mjs'

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'metavirus/mtg-magiccon') throw new Error('Daily surveyor runtime is cloud-only for metavirus/mtg-magiccon; use injected tests for local development')

const root = process.cwd()
const work = path.join(root, 'work/monitoring')
const runtime = path.join(root, '.surveyor-runtime')
const reportPath = path.join(work, 'monitor-check.json')
const manifestPath = path.join(work, 'closure-manifest.json')
const json = value => `${JSON.stringify(value, null, 2)}\n`
async function atomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${crypto.randomUUID()}.tmp`
  await fs.writeFile(temporary, json(value))
  await fs.rename(temporary, file)
}
async function read(file) { return JSON.parse(await fs.readFile(file, 'utf8')) }
async function child(script, args = [], capture = false) {
  return new Promise((resolve, reject) => {
    const processChild = spawn(process.execPath, ['--use-system-ca', path.join(root, 'scripts', script), ...args],
      { cwd: root, env: { ...process.env, SURVEYOR_MANAGED_RUNTIME: '1' }, stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'] })
    let output = ''
    if (capture) processChild.stdout.on('data', bytes => { output += bytes })
    processChild.on('error', reject)
    processChild.on('close', code => code === 0 ? resolve(output) : reject(Object.assign(new Error('Child failed'), { code: `CHILD_EXIT_${code}` })))
  })
}
const ops = {
  async loadPending() {
    try { return await read(path.join(runtime, 'pending.json')) }
    catch (error) { if (error.code === 'ENOENT') return null; throw error }
  },
  readReplay: () => read(reportPath),
  async discover() {
    const report = JSON.parse(await child('monitoring_watch_check.mjs', [], true))
    await atomic(reportPath, report)
    // Never let a previous closure appear to describe a new incomplete report.
    await fs.rm(manifestPath, { force: true })
    return report
  },
  async stage(report) {
    await atomic(reportPath, report)
    await child('stage_monitoring_findings.mjs', [reportPath, manifestPath])
    return read(manifestPath)
  },
  validatePendingEditorial(manifest, report) {
    return closureContract.validatePendingSurveyorEditorialManifest(manifest, report)
  },
  async savePending(pending) {
    await atomic(path.join(runtime, 'pending-report.json'), pending.report)
    if (pending.manifest) await atomic(path.join(runtime, 'pending-manifest.json'), pending.manifest)
    else await fs.rm(path.join(runtime, 'pending-manifest.json'), { force: true })
    await atomic(path.join(runtime, 'pending.json'), pending)
  },
  async writeReceipt(receipt) {
    await atomic(path.join(work, 'run-receipt.json'), receipt)
    if (!process.env.SURVEYOR_REPLAY_RUN_ID) await atomic(path.join(runtime, 'run-receipt.json'), receipt)
    await fs.mkdir(path.join(work, 'runtime'), { recursive: true })
    for (const name of ['run-receipt.json', 'email-delivery.json', 'pending.json', 'pending-report.json', 'pending-manifest.json']) {
      try { await fs.copyFile(path.join(runtime, name), path.join(work, 'runtime', name)) }
      catch (error) { if (error.code !== 'ENOENT') throw error }
    }
  },
  async saveRecovery(report, manifest, proof) {
    await atomic(path.join(work, 'recovery/monitor-check.json'), report)
    await atomic(path.join(work, 'recovery/closure-manifest.json'), manifest)
    await atomic(path.join(work, 'recovery/receipt.json'), proof)
  },
  verify: () => child('verify_surveyor_supervision.mjs', [reportPath, manifestPath]),
  alert: () => child('send_ticketed_availability_alert.mjs', [reportPath, manifestPath]),
  accept: () => child('accept_monitoring_baseline.mjs', [reportPath, manifestPath]),
  async saveCheckpoint(report, manifest) {
    const watch = await read(path.join(root, 'monitoring/watch-set.json'))
    if (report.ticketedPlay?.stateFile && path.resolve(root, report.ticketedPlay.stateFile) !== path.resolve(root, watch.ticketedPlayInventory?.stateFile ?? '')) throw new Error('Ticketed baseline identity mismatch')
    const files = [...new Set([watch.stateFile, report.ticketedPlay?.stateFile].filter(Boolean))]
    const publicFiles = {}
    for (const relative of files) {
      const normalized = path.relative(root, path.resolve(root, relative)).replaceAll('\\', '/')
      if (!/^\.monitoring-state\/[a-zA-Z0-9_.-]+\.json$/.test(normalized) || normalized.includes('private')) throw new Error('Unsafe public baseline path')
      const bytes = await fs.readFile(path.join(root, normalized))
      const target = path.join(work, 'baseline', normalized)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, bytes)
      const content = JSON.parse(bytes.toString('utf8'))
      publicFiles[normalized] = { content, digest: closureContract.surveyorReportDigest(content) }
    }
    const checkpoint = { schemaVersion: 1, runId: process.env.GITHUB_RUN_ID ?? 'local-test',
      checkedAt: report.checkedAt, reportDigest: closureContract.surveyorReportDigest(report),
      closureDigest: closureContract.surveyorReportDigest(manifest), report, manifest, files: publicFiles }
    await atomic(path.join(work, 'baseline-checkpoint.json'), checkpoint)
    await atomic(path.join(work, 'baseline/baseline-checkpoint.json'), checkpoint)
    return checkpoint
  },
  async clearPending() {
    for (const name of ['pending.json', 'pending-report.json', 'pending-manifest.json']) await fs.rm(path.join(runtime, name), { force: true })
  },
}
await fs.mkdir(work, { recursive: true })
const result = await runSurveyorRuntime({ ops, runId: process.env.GITHUB_RUN_ID ?? 'local-test', replayRunId: process.env.SURVEYOR_REPLAY_RUN_ID || null })
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,
  `ready_for_cache=${result.readyForCache}\nbaseline_ready=${result.readyForCache}\noperational_status=${result.operationalStatus}\n`)
console.log(`Surveyor runtime: ${result.operationalStatus}${result.overdue ? ' (overdue)' : ''}`)
process.exitCode = result.exitCode
