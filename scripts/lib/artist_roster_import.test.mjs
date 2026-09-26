import { execFileSync } from 'node:child_process'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('reviewed shared roster import boundary', () => {
  it('changes only shared identities and appearances, never owner import history or cards', () => {
    const sql = execFileSync(process.execPath, ['scripts/build_artist_roster_sql.mjs', '--stdout'], { encoding: 'utf8' })
    expect(sql.match(/(?:insert into|update) public\.[a-z_]+/g)).toEqual([
      'insert into public.artists', 'update public.artists', 'insert into public.artist_appearances',
    ])
    expect(sql).toContain("'artist_import_batches' as table_name")
    expect(sql).toContain("raise exception 'Unrelated card/personal state changed")
    expect(sql).not.toMatch(/delete from|truncate/i)
    expect(sql).toContain('p.appearance_days is null) <> 65')
    expect(sql.trim().endsWith('commit;')).toBe(true)
  })
  it('preserves source aliases and does not turn a joint credit into an attendee', () => {
    const { artists } = JSON.parse(readFileSync('research/precanon/artists/2026-09-25-official-roster.json', 'utf8'))
    expect(artists).toHaveLength(65)
    expect(artists.find(a => a.sourceName === 'Cynthia Shepard').canonicalName).toBe('Cynthia Sheppard')
    expect(artists.find(a => a.sourceName === 'kelogsloops').canonicalName).toBe('kelogsloops')
    expect(artists.some(a => a.canonicalName === 'Rebecca Guay')).toBe(false)
  })
})
