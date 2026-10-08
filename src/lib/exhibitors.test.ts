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
  it('keeps exhibitor notes, mentions and activity private at every integration point', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toContain("if (input.objectKind === 'exhibitor') return")
    expect(app).toContain("note.objectKind === 'exhibitor' ? [] : extractNoteMentions")
    expect(app).toContain("notes.filter(note => note.objectKind !== 'exhibitor')")
    expect(app).toContain("input = { ...input, visibility: 'private' }")
    expect(app).toContain("canEdit={detail.kind !== 'exhibitor' || canWriteNotes}")
    const guard = readFileSync('supabase/migrations/20261008020043_exhibitor_private_activity_guard.sql', 'utf8')
    expect(guard).not.toContain("'exhibitor'")
    const schema = readFileSync('supabase/migrations/20261008015414_exhibitor_directory.sql', 'utf8')
    expect(schema).toContain("check (object_kind <> 'exhibitor' or visibility = 'private')")
  })
})
