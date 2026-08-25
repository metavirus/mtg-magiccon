import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { surfaceFromHash } from '../App'
import { AUTH_MODE_KEY, authRedirectUrl, resolveDesignPreviewMode } from './appMode'

function memoryStorage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: (key: string) => key === AUTH_MODE_KEY ? value : null,
    setItem: (key: string, next: string) => { if (key === AUTH_MODE_KEY) value = next },
    removeItem: (key: string) => { if (key === AUTH_MODE_KEY) value = null },
  }
}

describe('application mode', () => {
  it('uses live auth by default', () => {
    const storage = memoryStorage()
    expect(resolveDesignPreviewMode({ search: '?auth=1', development: true, previewBuild: false, storage })).toBe(false)
    expect(resolveDesignPreviewMode({ search: '', development: true, previewBuild: false, storage })).toBe(false)
  })

  it('requires auth on hosted preview unless fixture preview is explicitly requested', () => {
    const storage = memoryStorage()
    expect(resolveDesignPreviewMode({ search: '', development: false, previewBuild: true, storage })).toBe(false)
    expect(resolveDesignPreviewMode({ search: '?preview=1', development: false, previewBuild: true, storage })).toBe(true)
    expect(resolveDesignPreviewMode({ search: '?auth=1', development: false, previewBuild: true, storage })).toBe(false)
  })

  it('remembers authenticated mode until fixture preview is explicitly requested', () => {
    const storage = memoryStorage('authenticated')
    expect(resolveDesignPreviewMode({ search: '', development: false, previewBuild: true, storage })).toBe(false)
    expect(resolveDesignPreviewMode({ search: '?preview=1', development: false, previewBuild: true, storage })).toBe(true)
  })

  it('allows an explicit return to fixture preview', () => {
    const storage = memoryStorage('authenticated')
    expect(resolveDesignPreviewMode({ search: '?preview=1', development: true, previewBuild: false, storage })).toBe(true)
  })

  it('preserves a hosted subpath in the callback URL', () => {
    expect(authRedirectUrl({ href: 'https://metavirus.github.io/mtg-magiccon/#wallet' } as Location))
      .toBe('https://metavirus.github.io/mtg-magiccon/?auth=1')
  })

  it('maps stable surface hashes and falls back to Home', () => {
    expect(surfaceFromHash('#activity')).toBe('activity')
    expect(surfaceFromHash('#Wallet')).toBe('wallet')
    expect(surfaceFromHash('#explore?type=play&group=high_signal')).toBe('explore')
    expect(surfaceFromHash('#calendar-con')).toBe('home')
    expect(surfaceFromHash('')).toBe('home')
  })

  it('does not advertise fixture or test entry points on the public login screen', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(appSource).not.toContain('Open preview mode')
    expect(appSource).not.toContain('Open as Chris')
    expect(appSource).not.toContain('Magic links stay parked')
  })
})
