import { describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { aggregatePrintingQuantities, buildArtistCardCatalogSeed as buildSeed, buildArtistInventoryReconciliation } from '../build_artist_card_catalog_seed_sql.mjs'

const options = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  cardSource: { name: 'Test cards', path: 'private/cards.csv' },
  profileSource: { name: 'Test profiles', path: 'private/profiles.csv' },
}
const buildArtistCardCatalogSeed = (cards, profiles) => buildSeed(cards, profiles, options)

const printing = {
  'Scryfall ID': 'stormwing-id',
  'Set code': 'M21',
  'Set name': 'Core Set 2021',
  'Collector number': '73',
  Foil: 'normal',
  Rarity: 'rare',
  Artist: 'Test Artist',
  Name: 'Stormwing Entity',
  Quantity: '1',
}

function csv(rows) {
  const headers = Object.keys(printing)
  return [headers.join(','), ...rows.map(row => headers.map(key => row[key] ?? '').join(','))].join('\n')
}

describe('artist inventory snapshot seed', () => {
  it('leaves reviewed attendance outside routine imports, including the former hardcoded artists', () => {
    const artists = ['Cynthia Sheppard', 'Mark Poole', 'Serena Malyon', 'Rebecca Guay']
    const seed = buildArtistCardCatalogSeed(
      csv(artists.map((Artist, index) => ({ ...printing, Artist, 'Scryfall ID': `card-${index}` }))),
      ['artist_name,priority_reason', ...artists.map(artist => `${artist},Old import priority`)].join('\n'),
    )
    expect(seed.artistCount).toBe(4)
    expect(seed.printingCount).toBe(4)
    expect(seed.sql).toContain('insert into public.artist_cards')
    expect(seed.sql).not.toMatch(/artist_appearances|attending_status|appearance_days|official_profile_url|source_note|priority_reason/i)
    expect(seed.sql).not.toContain('magiccon_atlanta_2026')
    expect(seed.sql).not.toContain('Old import priority')
  })

  it('imports only artists supplied by card or profile evidence', () => {
    const seed = buildArtistCardCatalogSeed(csv([printing]), 'artist_name\nProfile Only Artist')
    expect(seed.artistCount).toBe(2)
    expect(seed.sql.match(/insert into public.artists \(/g)).toHaveLength(2)
    expect(seed.sql).not.toMatch(/Cynthia Sheppard|Mark Poole|Serena Malyon|Rebecca Guay/)
  })

  it('sums duplicate identities, keeps finishes distinct, and preserves last-row metadata', () => {
    const rows = [printing, { ...printing, 'Set code': 'm21', Quantity: '3', Name: 'Latest name' },
      { ...printing, Foil: 'foil', Quantity: '2' }]
    const before = structuredClone(rows)
    const result = aggregatePrintingQuantities(rows)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ Quantity: 4, Name: 'Latest name' })
    expect(result[1]).toMatchObject({ Quantity: 2, Foil: 'foil' })
    expect(rows).toEqual(before)
  })

  it('retains the existing missing-quantity default and explicit zero', () => {
    expect(aggregatePrintingQuantities([
      { ...printing, Quantity: '' }, { ...printing, Quantity: '0' }, { ...printing, Quantity: '2' },
    ])[0].Quantity).toBe(3)
  })

  it('keeps different printing identities separate', () => {
    expect(aggregatePrintingQuantities([
      printing, { ...printing, 'Scryfall ID': 'other-id' },
      { ...printing, 'Set code': 'other' }, { ...printing, 'Collector number': '74' },
    ])).toHaveLength(4)
  })

  it('generates one absolute quantity upsert per identity, making snapshot replay idempotent', () => {
    const snapshot = csv([printing, printing, { ...printing, Foil: 'foil', Quantity: '3' }])
    const first = buildArtistCardCatalogSeed(snapshot, 'artist_name\nTest Artist')
    const replay = buildArtistCardCatalogSeed(snapshot, 'artist_name\nTest Artist')
    expect(replay).toEqual(first)
    expect(first.printingCount).toBe(2)
    expect(first.sql.match(/insert into public.artist_card_printings/g)).toHaveLength(2)
    expect(first.sql).toContain("'73', 'normal', 'rare',")
    expect(first.sql).toContain("'73', 'foil', 'rare',")
    expect(first.sql).toContain(`select '${options.ownerId}'::uuid, id, 2,`)
    expect(first.sql).toContain(`select '${options.ownerId}'::uuid, id, 3,`)
    expect(first.sql.match(/quantity = excluded.quantity,/g)).toHaveLength(2)
    expect(first.sql).not.toMatch(/quantity\s*=\s*[^,;]+\+/)
  })

  it('requires an explicit owner and both source descriptors', () => {
    expect(() => buildSeed(csv([printing]), 'artist_name\nTest')).toThrow(/UUID ownerId/)
    expect(() => buildSeed(csv([printing]), 'artist_name\nTest', { ...options, ownerId: 'not-a-uuid' })).toThrow(/UUID ownerId/)
    expect(() => buildSeed(csv([printing]), 'artist_name\nTest', { ownerId: options.ownerId })).toThrow(/cardSource/)
    expect(() => buildSeed(csv([printing]), 'artist_name\nTest', { ...options, profileSource: { name: 'x' } })).toThrow(/profileSource/)
  })

  it('retains original nonblank parsed record ordinals across skipped and multiline records', () => {
    const seed = buildArtistCardCatalogSeed(
      csv([printing, { ...printing, Artist: '' }, { ...printing, Name: '"A\nmultiline name"' }]),
      'artist_name,collection_card_count\n,0\nTest Artist,3',
    )
    expect(seed.printingCount).toBe(1)
    expect(seed.sql.match(/array\[1, 3\]::integer\[\]/g)).toHaveLength(2)
    expect(seed.sql).toContain('array[2]::integer[]')
    expect(seed.sql).not.toContain('array[1, 2]::integer[]')
  })

  it('writes private fields only to owner tables and binds source batches to that owner', () => {
    const seed = buildArtistCardCatalogSeed(csv([printing]), 'artist_name,collection_card_count,unique_collection_printings\nTest Artist,9,4')
    const sharedArtist = seed.sql.split('insert into public.artists (')[1].split('insert into public.artist_collection_profiles')[0]
    const sharedPrinting = seed.sql.split('insert into public.artist_card_printings (')[1].split('inventory_upsert as')[0]
    expect(sharedArtist).not.toMatch(/collection_card_count|unique_collection_printings/)
    expect(sharedPrinting).not.toMatch(/quantity|local_image/)
    expect(seed.sql).toContain('on conflict (owner_id, source_path, source_sha256)')
    expect(seed.sql).toContain('on conflict (owner_id, artist_id)')
    expect(seed.sql.match(/on conflict \(owner_id, printing_id\)/g)).toHaveLength(2)
    expect(seed.sql).toContain(`where owner_id = '${options.ownerId}'::uuid and source_path = 'private/cards.csv'`)
    expect(seed.sql).toContain(`source_sha256 = '${crypto.createHash('sha256').update(csv([printing])).digest('hex')}'`)
    expect(seed.sql).toContain(`where owner_id = '${options.ownerId}'::uuid and source_path = 'private/profiles.csv'`)
    expect(seed.sql).toContain("'stormwing-id|m21|73|normal'")
    expect(seed.sql).toContain('on conflict (source_row_id)')
  })

  it('keeps unknown source times null and changes legacy assessment time only when assessment content changes', () => {
    const seed = buildArtistCardCatalogSeed(csv([printing]), 'artist_name\nTest Artist')
    expect(seed.sql).toContain("array[1]::integer[], null, now(), 'source_linked'")
    expect(seed.sql).toContain('array[1]::integer[], null,\n')
    expect(seed.sql).toContain('assessed_at = case when')
    expect(seed.sql).toContain('is distinct from')
    expect(seed.sql).toContain('then now() else artist_card_assessments.assessed_at end')
    const timeGuard = seed.sql.split('assessed_at = case when')[1].split('then now()')[0]
    expect(timeGuard).toContain('artist_card_assessments.visual_assessment_notes')
    expect(timeGuard).toContain('excluded.visual_assessment_notes')
    expect(timeGuard).not.toMatch(/created_at|source_batch_id|source_record_ordinals|review_rank/)
  })

  it('reconciles only private inventory and provenance, guarded by exact legacy quantities and source hashes', () => {
    const cards = csv([printing, { ...printing, Quantity: '3' }])
    const result = buildArtistInventoryReconciliation(cards, 'artist_name,collection_card_count\nTest Artist,99', options)
    expect(result.quantity).toBe(4)
    expect(result.printingCount).toBe(1)
    expect(result.lastRowQuantityHash).toBe(crypto.createHash('sha256').update('stormwing-id|m21|73|normal:3').digest('hex'))
    expect(result.sql).toContain('Exact owner/source/hash batches are required')
    expect(result.sql).toContain('Hosted last-row quantity snapshot mismatch')
    expect(result.sql).toContain('Reconciliation preservation/readback guard failed')
    expect(result.sql).toContain('array[1,2]::integer[]')
    expect(result.sql).not.toMatch(/(?:insert into|update|delete from) public\.(?:artists|artist_cards|artist_card_printings|artist_signing_interests|artist_import_batches)\b/)
    const assessmentWrite = result.sql.split('update public.artist_card_assessments')[1].split('update public.artist_collection_profiles')[0]
    expect(assessmentWrite).not.toMatch(/assessed_at|updated_at|visual_assessment_notes|card_art_category/)
    const profileWrite = result.sql.split('update public.artist_collection_profiles')[1].split('do $$')[0]
    expect(profileWrite).not.toMatch(/collection_card_count|unique_collection_printings|imported_at/)
  })

  it('refuses reconciliation without owner/source identity or a nonempty inventory', () => {
    expect(() => buildArtistInventoryReconciliation(csv([printing]), 'artist_name\nTest')).toThrow(/UUID/)
    expect(() => buildArtistInventoryReconciliation('', 'artist_name\nTest', options)).toThrow(/empty inventory/)
  })
})
