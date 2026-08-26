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
  })
})
