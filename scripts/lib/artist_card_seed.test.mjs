import { describe, expect, it } from 'vitest'
import { aggregatePrintingQuantities, buildArtistCardCatalogSeed } from '../build_artist_card_catalog_seed_sql.mjs'

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
    expect(first.sql).toContain("'73', 'normal', 'rare', coalesce(2, 1)")
    expect(first.sql).toContain("'73', 'foil', 'rare', coalesce(3, 1)")
    expect(first.sql.match(/quantity = excluded.quantity,/g)).toHaveLength(2)
    expect(first.sql).not.toMatch(/quantity\s*=\s*[^,;]+\+/)
  })
})
