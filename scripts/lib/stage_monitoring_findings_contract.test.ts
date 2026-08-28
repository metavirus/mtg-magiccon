import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('monitoring staging process lifecycle', () => {
  it('lets the zero-change Supabase projection drain naturally on Windows', () => {
    const source = fs.readFileSync('scripts/stage_monitoring_findings.mjs', 'utf8')
    const zeroChangeBranch = source.slice(source.indexOf('if (!changes.length)'), source.indexOf('const hasTicketedInventory'))
    expect(zeroChangeBranch).not.toContain('process.exit')
    expect(zeroChangeBranch).toContain('} else {')
  })
})
