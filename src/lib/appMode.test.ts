import { describe, expect, it } from 'vitest'
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
  it('keeps authenticated mode after the auth query is gone', () => {
    const storage = memoryStorage()
    expect(resolveDesignPreviewMode({ search: '?auth=1', development: true, previewBuild: false, storage })).toBe(false)
    expect(resolveDesignPreviewMode({ search: '', development: true, previewBuild: false, storage })).toBe(false)
  })

  it('allows an explicit return to fixture preview', () => {
    const storage = memoryStorage('authenticated')
    expect(resolveDesignPreviewMode({ search: '?preview=1', development: true, previewBuild: false, storage })).toBe(true)
  })

  it('preserves a hosted subpath in the callback URL', () => {
    expect(authRedirectUrl({ href: 'https://metavirus.github.io/mtg-magiccon/#wallet' } as Location))
      .toBe('https://metavirus.github.io/mtg-magiccon/?auth=1')
  })
})

