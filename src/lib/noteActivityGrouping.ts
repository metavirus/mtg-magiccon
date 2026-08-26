export type GroupableNote = {
  id: string
  objectId: string
  updatedAtIso: string
}

export type NoteObjectGroup<T extends GroupableNote> = {
  id: string
  notes: T[]
}

export function noteGroupFactLabel(note: { author: string; updatedAt: string }) {
  return `${note.author} · ${note.updatedAt}`
}

export function isSyntheticNoteGroupId(id: string) {
  return id.startsWith('note-group-')
}

export function groupNotesByObject<T extends GroupableNote>(notes: T[]): NoteObjectGroup<T>[] {
  const groups = new Map<string, NoteObjectGroup<T>>()
  const ordered = [...notes].sort((a, b) => new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime())

  for (const note of ordered) {
    const key = note.objectId || `note-${note.id}`
    const existing = groups.get(key)
    if (existing) existing.notes.push(note)
    else groups.set(key, { id: key, notes: [note] })
  }

  return [...groups.values()]
}
