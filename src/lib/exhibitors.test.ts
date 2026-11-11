import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { exhibitorObjectId, safeExhibitorUrl } from './exhibitors'

vi.mock('./supabase', () => ({ supabase: null }))

describe('exhibitor integration boundaries', () => {
  it('keeps stable identities and permits only ordinary public links', () => {
    expect(exhibitorObjectId('669990')).toBe('exhibitor-atlanta-2026-669990')
    expect(safeExhibitorUrl('www.example.com/store')).toBe('https://www.example.com/store')
    for (const value of ['javascript:alert(1)', 'data:text/html,test', 'https://user:secret@example.com']) expect(safeExhibitorUrl(value)).toBe('')
  })
  it('keeps exhibitor saves out of Activity and suppresses mentions on private notes', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toContain("if (input.objectKind === 'exhibitor') return")
    expect(app).toMatch(/\(note\.objectKind === 'exhibitor' \|\| note\.objectId\.startsWith\('personal-calendar:'\)\) && note\.visibility === 'private'\s*\? \[\] : extractNoteMentions/)
    expect(app).toContain("notes.filter(note => note.objectKind !== 'exhibitor')")
    expect(app).not.toContain("input = { ...input, visibility: 'private' }")
    expect(app).toContain("canEdit={detail.kind !== 'exhibitor' || canWriteNotes}")
    const guard = readFileSync('supabase/migrations/20261008020043_exhibitor_private_activity_guard.sql', 'utf8')
    expect(guard).not.toContain("'exhibitor'")
  })
})
