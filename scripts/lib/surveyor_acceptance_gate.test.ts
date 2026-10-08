import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { completeSurveyorClosureManifest } from './surveyor_closure_contract.mjs'

describe('cloud acceptance coverage gate', () => {
  it('rejects local operational execution before touching cloud or workstation baselines', async () => {
    for (const script of ['run_daily_surveyor.mjs', 'prepare_surveyor_state.mjs']) {
      await expect(promisify(execFile)(process.execPath, [path.resolve('scripts', script)], { env: { ...process.env, GITHUB_ACTIONS: 'false' } })).rejects.toMatchObject({ stderr: expect.stringContaining('cloud-only') })
    }
  })
  it('refuses zero-catch partial coverage before writing any accepted state', async () => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'magiccon-acceptance-test-'))
    const script = path.resolve('scripts/accept_monitoring_baseline.mjs')
    const report = { checkedAt: '2026-10-08T12:00:00Z', mode: 'check', coverageStatus: 'partial', changes: [] }
    try {
      await fs.mkdir(path.join(scratch, 'monitoring'))
      await fs.mkdir(path.join(scratch, '.monitoring-state'))
      await fs.writeFile(path.join(scratch, 'monitoring/watch-set.json'), JSON.stringify({ stateFile: '.monitoring-state/watch.json' }))
      const prior = JSON.stringify({ checkedAt: 'earlier', accepted: { source: 'preserve' } })
      await fs.writeFile(path.join(scratch, '.monitoring-state/watch.json'), prior)
      await fs.writeFile(path.join(scratch, 'report.json'), JSON.stringify(report))
      await fs.writeFile(path.join(scratch, 'manifest.json'), JSON.stringify(completeSurveyorClosureManifest(report, new Map())))
      await expect(promisify(execFile)(process.execPath, [script, 'report.json', 'manifest.json'], { cwd: scratch })).rejects.toMatchObject({ stderr: expect.stringContaining('coverage is not complete') })
      expect(await fs.readFile(path.join(scratch, '.monitoring-state/watch.json'), 'utf8')).toBe(prior)
    } finally { await fs.rm(scratch, { recursive: true, force: true }) }
  })
})
