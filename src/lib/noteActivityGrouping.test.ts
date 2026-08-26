import { describe, expect, it } from 'vitest'
import { groupNotesByObject, isSyntheticNoteGroupId, noteGroupFactLabel } from './noteActivityGrouping'

describe('groupNotesByObject', () => {
  it('collects different authors and bursts under their shared object', () => {
    const groups = groupNotesByObject([
      { id: 'older-hex', objectId: 'event-hex', updatedAtIso: '2026-08-25T09:00:00Z', author: 'Kavi' },
      { id: 'menu', objectId: 'event-menu', updatedAtIso: '2026-08-25T10:00:00Z', author: 'Chris' },
      { id: 'latest-hex', objectId: 'event-hex', updatedAtIso: '2026-08-25T11:00:00Z', author: 'Juan' },
    ])

    expect(groups.map(group => group.id)).toEqual(['event-hex', 'event-menu'])
    expect(groups[0].notes.map(note => note.id)).toEqual(['latest-hex', 'older-hex'])
  })

  it('keeps the groups ordered by each object conversation’s latest note', () => {
    const groups = groupNotesByObject([
      { id: 'a', objectId: 'event-a', updatedAtIso: '2026-08-24T09:00:00Z' },
      { id: 'b', objectId: 'event-b', updatedAtIso: '2026-08-26T09:00:00Z' },
      { id: 'a-new', objectId: 'event-a', updatedAtIso: '2026-08-25T09:00:00Z' },
    ])

    expect(groups.map(group => group.id)).toEqual(['event-b', 'event-a'])
  })

  it('labels grouped entries by speaker and time and identifies synthetic group details', () => {
    expect(noteGroupFactLabel({ author: 'Juan', updatedAt: 'Aug 26, 9:20 AM' })).toBe('Juan · Aug 26, 9:20 AM')
    expect(isSyntheticNoteGroupId('note-group-explore-ticketed-123')).toBe(true)
    expect(isSyntheticNoteGroupId('explore-ticketed-123')).toBe(false)
  })
})
