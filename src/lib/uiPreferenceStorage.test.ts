import { expect, it, vi } from 'vitest'
import { uiPreferenceStorage } from './uiPreferenceStorage'
import { resolveDesignPreviewMode } from './appMode'

it('keeps views usable when storage is full or its getter is denied', () => {
  const denied = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
  try {
    expect(uiPreferenceStorage.getItem('magiccon-plan-view')).toBeNull()
    expect(() => uiPreferenceStorage.setItem('magiccon-plan-view', 'list')).not.toThrow()
    expect(() => uiPreferenceStorage.removeItem('magiccon-plan-view')).not.toThrow()
    expect(resolveDesignPreviewMode({ search: '?auth=1', development: false, previewBuild: false, storage: uiPreferenceStorage })).toBe(false)
    expect(resolveDesignPreviewMode({ search: '', development: false, previewBuild: false, storage: uiPreferenceStorage })).toBe(false)
  } finally { denied.mockRestore() }
})
