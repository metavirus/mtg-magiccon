import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Pages deployment workflow contract', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
  const workflow = fs.readFileSync(path.resolve('.github/workflows/deploy-pages.yml'), 'utf8')

  it('runs the complete deployment gate before preparing or uploading the artifact', () => {
    const gate = workflow.indexOf('pnpm check:deploy')
    const prepare = workflow.indexOf('pnpm prepare:pages-artifact')
    const upload = workflow.indexOf('actions/upload-pages-artifact')

    expect(gate).toBeGreaterThan(-1)
    expect(prepare).toBeGreaterThan(gate)
    expect(upload).toBeGreaterThan(prepare)
  })

  it('keeps the deployment gate complete and canonical', () => {
    const gate = packageJson.scripts['check:deploy'] as string

    expect(gate).toContain('pnpm build')
    expect(gate).toContain('pnpm test')
    expect(gate).toContain('pnpm validate:text')
    expect(gate).toContain('pnpm validate:secrets')
    expect(gate).toContain('pnpm validate:github-run-verifier')
    expect(packageJson.scripts['check:ship']).toBe('pnpm check:deploy')
  })

  it('uses truthful local Pages command names', () => {
    expect(packageJson.scripts['publish:pages']).toBeUndefined()
    expect(packageJson.scripts['prepare:pages']).toBe('pnpm check:deploy && pnpm prepare:pages-artifact')
  })
})
