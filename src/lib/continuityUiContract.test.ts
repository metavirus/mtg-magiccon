import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

describe('continuity failure presentation contract', () => {
  it('retries stale note authentication and keeps a notes-only failure off global surfaces', () => {
    expect(appSource).toContain('retryOnceAfterUnauthorized(fetchNotes, () => client.auth.refreshSession())')
    expect(appSource).toContain("notes: () => lane('notes',")
    expect(appSource).not.toContain('global-alert-popover')
  })
})
