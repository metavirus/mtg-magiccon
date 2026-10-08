import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { validateSurveyorCheckpoint } from './lib/surveyor_checkpoint.mjs'

const root = process.cwd()
const exec = promisify(execFile)
const gh = async args => (await exec('gh', args, { cwd: root, env: process.env, timeout: 60000, maxBuffer: 4 * 1024 * 1024 })).stdout
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'))
const exists = async file => fs.access(file).then(() => true, () => false)
const watch = await read('monitoring/watch-set.json')
const allowedPaths = [watch.stateFile, watch.ticketedPlayInventory?.stateFile].filter(Boolean)
const replay = Boolean(process.env.SURVEYOR_REPLAY_RUN_ID)
const runs = JSON.parse(await gh(['api', 'repos/metavirus/mtg-magiccon/actions/workflows/daily-surveyor.yml/runs?per_page=30'])).workflow_runs
  .filter(run => String(run.id) !== process.env.GITHUB_RUN_ID && run.status === 'completed')
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'magiccon-surveyor-restore-'))
let baselineRecovered = false
let runtimeRecovered = false
let runtimeTime = await read('.surveyor-runtime/run-receipt.json').then(receipt => Date.parse(receipt.recordedAt) || 0, () => 0)
let acceptedTime = await read(allowedPaths[0]).then(state => Date.parse(state.checkedAt) || 0, () => 0)
for (const run of runs) {
  if (baselineRecovered && runtimeRecovered) break
  const artifacts = JSON.parse(await gh(['api', `repos/metavirus/mtg-magiccon/actions/runs/${run.id}/artifacts`])).artifacts.filter(item => !item.expired)
  if (!replay && !baselineRecovered && artifacts.some(item => item.name === 'daily-magiccon-baseline')) {
    const target = path.join(scratch, `baseline-${run.id}`)
    await gh(['run', 'download', String(run.id), '--repo', 'metavirus/mtg-magiccon', '-n', 'daily-magiccon-baseline', '-D', target])
    const checkpoint = validateSurveyorCheckpoint(await read(path.join(target, 'baseline-checkpoint.json')), allowedPaths)
    if (Date.parse(checkpoint.checkedAt) >= acceptedTime) {
      for (const file of allowedPaths) {
        await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true })
        await fs.writeFile(path.join(root, file), `${JSON.stringify(checkpoint.files[file].content, null, 2)}\n`)
      }
      acceptedTime = Date.parse(checkpoint.checkedAt)
      console.log(`Accepted baseline restored from verified artifact ${run.id}`)
    }
    baselineRecovered = true
  }
  if (!runtimeRecovered && artifacts.some(item => item.name === 'daily-magiccon-runtime')) {
    const target = path.join(scratch, `runtime-${run.id}`)
    await gh(['run', 'download', String(run.id), '--repo', 'metavirus/mtg-magiccon', '-n', 'daily-magiccon-runtime', '-D', target])
    const receipt = await read(path.join(target, 'run-receipt.json'))
    if (receipt.schemaVersion !== 1 || !Number.isFinite(Date.parse(receipt.recordedAt))) throw new Error('Retained runtime receipt invalid')
    if (Date.parse(receipt.recordedAt) >= runtimeTime) {
      await fs.mkdir('.surveyor-runtime', { recursive: true })
      for (const file of ['run-receipt.json', 'email-delivery.json', 'pending.json', 'pending-report.json', 'pending-manifest.json']) {
        const source = path.join(target, file)
        if (await exists(source)) await fs.copyFile(source, path.join('.surveyor-runtime', file))
        else if (file.startsWith('pending')) await fs.rm(path.join('.surveyor-runtime', file), { force: true })
      }
      runtimeTime = Date.parse(receipt.recordedAt)
    }
    runtimeRecovered = true
  }
}
if (!replay) {
  const baseline = await read(allowedPaths[0]).catch(() => null)
  if (!Number.isFinite(Date.parse(baseline?.checkedAt)) || !Object.keys(baseline?.accepted ?? {}).length) throw new Error('Accepted cloud baseline unavailable in cache and verified artifacts; stop before cold discovery')
}
console.log(`Surveyor state preflight: PASS (${replay ? 'retained replay' : 'accepted public baseline'}; retained work and delivery receipts restored independently)`)
