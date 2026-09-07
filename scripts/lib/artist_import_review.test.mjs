import { describe, expect, it } from 'vitest'
import { reviewArtistCardImport, renderArtistImportReview } from '../review_artist_card_import.mjs'

const headers = ['Scryfall ID', 'Set code', 'Collector number', 'Foil', 'Artist', 'Name', 'Quantity']
const row = ['id-a', 'abc', '1', 'normal', 'Artist A', 'Card A', '2']
const csv = rows => [headers, ...rows].map(fields => fields.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')

describe('local artist import review', () => {
  it('is unchanged on replay, sums duplicates, and keeps finishes separate', () => {
    const source = csv([row, row, [...row.slice(0, 3), 'foil', ...row.slice(4)]])
    const report = reviewArtistCardImport(source, source)
    expect(report.counts).toEqual({ added: 0, quantityChanged: 0, metadataChanged: 0, missing: 0 })
    expect(report.after).toMatchObject({ printingCount: 2, copies: 6, duplicateGroups: 1 })
  })
  it('reports additions, quantity and metadata changes, and retained missing items', () => {
    const before = csv([row, ['id-b', ...row.slice(1)]])
    const after = csv([['id-a', 'abc', '1', 'normal', 'Artist A', 'Renamed', '5'], ['id-c', ...row.slice(1)]])
    const report = reviewArtistCardImport(before, after)
    expect(report.counts).toEqual({ added: 1, quantityChanged: 1, metadataChanged: 1, missing: 1 })
    expect(report.quantityChanged[0]).toMatchObject({ before: 2, after: 5, delta: 3 })
    expect(report.metadataChanged[0].changes).toEqual([{ field: 'Name', before: 'Card A', after: 'Renamed' }])
    expect(report.missing[0].disposition).toContain('never automatically delete')
  })
  it('uses parsed ordinals before exclusions, including multiline text', () => {
    const report = reviewArtistCardImport(null, csv([['', '', '', '', '', '', '8'], [...row.slice(0, 5), 'Multi\nline', '2'], row]))
    expect(report.after.excluded[0].record).toBe(1)
    expect(report.added[0].sourceRecordOrdinals).toEqual([2, 3])
    expect(report.after.duplicateMetadataConflicts[0].fields).toEqual(['Name'])
  })
  it('labels an initial snapshot honestly and binds exact bytes with hashes', () => {
    const source = csv([row])
    const report = reviewArtistCardImport(null, source)
    expect(report.mode).toBe('initial-uncompared')
    expect(renderArtistImportReview(report)).toContain('not verified as new to the database')
    expect(report.after.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(reviewArtistCardImport(source, source + '\n').after.sha256).not.toBe(report.after.sha256)
  })
  it('requires identity columns and complete eligible identities', () => {
    expect(() => reviewArtistCardImport(null, 'Name\nCard')).toThrow('Missing CSV column')
    expect(() => reviewArtistCardImport(null, csv([['', ...row.slice(1)]]))).toThrow('Incomplete printing identity')
  })
  it('flags suspicious quantities and handles a valid empty export as missing, not deletion', () => {
    const report = reviewArtistCardImport(csv([row]), csv([]))
    expect(report.counts.missing).toBe(1)
    expect(report.after.printingCount).toBe(0)
    expect(reviewArtistCardImport(null, csv([[...row.slice(0, 6), 'abc']])).after.warnings).toHaveLength(1)
  })
})
