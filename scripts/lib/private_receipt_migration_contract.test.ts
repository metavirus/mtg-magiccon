import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expectedLegacyObjectPaths, LEGACY_PUBLIC_ARTIFACTS, LEGACY_RECEIPT_COMMIT } from './private_receipt_migration_contract.mjs'

describe('one-time private receipt migration lane', () => {
  it('binds exactly nine historical files to deterministic private paths', () => {
    expect(LEGACY_RECEIPT_COMMIT).toBe('cd84772')
    expect(LEGACY_PUBLIC_ARTIFACTS).toHaveLength(9)
    expect(new Set(expectedLegacyObjectPaths()).size).toBe(9)
    expect(LEGACY_PUBLIC_ARTIFACTS.every(artifact => artifact.receiptId && artifact.capturedAt)).toBe(true)
  })

  it('is manual, exact-main, exact-SHA, non-artifact-producing, and completion-marked', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/temporary-private-receipt-migration.yml'), 'utf8')
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).not.toContain('schedule:')
    expect(workflow).toContain('test "${GITHUB_REF}" = "refs/heads/main"')
    expect(workflow).toContain('test "${TARGET_SHA}" = "${GITHUB_SHA}"')
    expect(workflow).toContain('verify_private_receipt_migration.mjs --preflight')
    expect(workflow).toContain('verify_private_receipt_migration.mjs --complete')
    expect(workflow).not.toContain('upload-artifact')
    expect(readFileSync(join(process.cwd(), 'scripts/verify_private_receipt_migration.mjs'), 'utf8')).toContain("'application/json'")
  })

  it('preserves legacy HTML until downloaded checksum proof and compensates new receipt failure', () => {
    const executor = readFileSync(join(process.cwd(), 'scripts/process_private_gmail_intake.mjs'), 'utf8')
    const downloadAt = executor.indexOf('.download(artifactManifest.object_path)')
    const clearAt = executor.indexOf("update({ original_html: null")
    expect(downloadAt).toBeGreaterThan(0)
    expect(clearAt).toBeGreaterThan(downloadAt)
    expect(executor).toContain("if (!existingReceipt.data) await client.from('wallet_receipts').delete()")
  })

  it('accepts only checksum-identical object/manifest reruns', () => {
    const helper = readFileSync(join(process.cwd(), 'scripts/migrate_private_receipt_artifacts.mjs'), 'utf8')
    expect(helper).toContain('existingManifest')
    expect(helper).toContain('storedHash !== artifact.sha256')
    expect(helper).toContain('upsert: false')
    expect(helper).toContain('Existing manifest conflicts')
  })
})
