import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('daily surveyor browser contract', () => {
  it('installs Chromium before the browser-backed inventory check', () => {
    const workflow = fs.readFileSync(path.resolve('.github/workflows/daily-surveyor.yml'), 'utf8')
    const install = workflow.indexOf('pnpm exec playwright install chromium')
    const monitor = workflow.indexOf('node scripts/monitoring_watch_check.mjs')

    expect(install).toBeGreaterThan(-1)
    expect(monitor).toBeGreaterThan(install)
  })

  it('waits for all three convention days before inventory extraction', () => {
    const scraper = fs.readFileSync(path.resolve('scripts/lib/ticketed_play_inventory.mjs'), 'utf8')

    expect(scraper).toContain("document.querySelectorAll('.schedule-day')")
    expect(scraper).toContain('return days.size >= 3')
    expect(scraper).toContain("/\\bSOLD OUT\\b/i.test(document.body.innerText)")
    expect(scraper).toContain('registrationControlMissing: controls.length === 0')
  })

  it('retries the known transient Supabase runner clock-skew response', () => {
    const staging = fs.readFileSync(path.resolve('scripts/stage_monitoring_findings.mjs'), 'utf8')

    expect(staging).toContain('fetchWithClockSkewRetry')
    expect(staging).toContain('/JWT issued at future/i')
    expect(staging).toContain('global: { fetch: fetchWithClockSkewRetry }')
  })

  it('verifies closure before baseline save and always uploads its receipt', () => {
    const workflow = fs.readFileSync(path.resolve('.github/workflows/daily-surveyor.yml'), 'utf8')
    const verify = workflow.indexOf('pnpm monitor:verify-closure')
    const save = workflow.indexOf('- name: Save monitoring baseline')

    expect(verify).toBeGreaterThan(-1)
    expect(save).toBeGreaterThan(verify)
    expect(workflow).toContain("if: success() && inputs.replay_run_id == ''")
    expect(workflow).toContain('work/monitoring/closure-manifest.json')
    expect(workflow.indexOf('if: always()', save)).toBeGreaterThan(save)
  })

  it('sends a watched reopening alert only after closure and before accepting the baseline', () => {
    const workflow = fs.readFileSync(path.resolve('.github/workflows/daily-surveyor.yml'), 'utf8')
    const verify = workflow.indexOf('pnpm monitor:verify-closure')
    const email = workflow.indexOf('node scripts/send_ticketed_availability_alert.mjs')
    const save = workflow.indexOf('- name: Save monitoring baseline')

    expect(email).toBeGreaterThan(verify)
    expect(save).toBeGreaterThan(email)
    expect(workflow).toContain('ALERT_GMAIL_APP_PASSWORD: ${{ secrets.ALERT_GMAIL_APP_PASSWORD }}')
  })
})
