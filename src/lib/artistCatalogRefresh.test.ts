import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadArtistCatalogFromSupabase } from '../App'

const mock = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: mock }))

let tables: Record<string, unknown[]>
let filters: Array<[string, string, string]>
beforeEach(() => {
  mock.from.mockClear()
  filters = []
  tables = { artists: [{ id: 'artist', display_name: 'Test Artist', canonical_name: 'Test Artist' }], artist_appearances: [{ artist_id: 'artist', event_key: 'magiccon_atlanta_2026', attending_status: 'confirmed', appearance_days: 'Friday' }], artist_cards: [], artist_card_printings: [], artist_card_assessments: [] }
  mock.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(async () => ({ data: tables[table] ?? [], error: null })) }
    query.select.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.eq.mockImplementation((key: string, value: string) => { filters.push([table, key, value]); return query })
    return query
  })
})

describe('artist catalog refresh boundaries', () => {
  it('uses only the requested owner holdings, never shared quantities or other owners', async () => {
    tables.artist_cards = [{ id: 'card', artist_id: 'artist', card_name: 'Example' }]
    tables.artist_card_printings = [{ id: 'printing', card_id: 'card', quantity: 999 }, { id: 'other', card_id: 'card', quantity: 888 }]
    tables.artist_collection_inventory = [{ owner_id: 'owner', printing_id: 'printing', quantity: 3 }, { owner_id: 'stranger', printing_id: 'other', quantity: 9 }]
    const result = await loadArtistCatalogFromSupabase('owner')
    expect(result.cards.map(card => [card.printingId, card.quantity])).toEqual([['printing', 3]])
    expect(filters).toContainEqual(['artist_collection_inventory', 'owner_id', 'owner'])
    expect(filters).toContainEqual(['artist_card_assessments', 'owner_id', 'owner'])
    tables.artist_collection_inventory = []
    expect((await loadArtistCatalogFromSupabase('owner')).cards).toEqual([])
  })
  it('coalesces only concurrent reads and fetches again after success', async () => {
    const first = loadArtistCatalogFromSupabase('owner')
    expect(loadArtistCatalogFromSupabase('owner')).toBe(first)
    expect((await first).artists[0].attendance).toBe('Friday')
    tables.artist_appearances = [{ artist_id: 'artist', event_key: 'magiccon_atlanta_2026', attending_status: 'confirmed', appearance_days: 'Sunday' }]
    expect((await loadArtistCatalogFromSupabase('owner')).artists[0].attendance).toBe('Sunday')
    expect(mock.from).toHaveBeenCalledTimes(12)
  })
  it('queries Atlanta and rejects unrelated convention rows even in a mixed response', async () => {
    tables.artist_appearances.push({ artist_id: 'artist', event_key: 'other_convention', attending_status: 'not_attending', appearance_days: 'Never' })
    const catalog = await loadArtistCatalogFromSupabase('owner')
    expect(filters).toContainEqual(['artist_appearances', 'event_key', 'magiccon_atlanta_2026'])
    expect(catalog.artists[0].attendance).toBe('Friday')
  })
  it('returns an honest empty event catalog, not historical fixtures', async () => {
    tables.artist_appearances = []
    expect(await loadArtistCatalogFromSupabase('owner')).toEqual({ artists: [], cards: [] })
  })
  it('does not share in-flight reads across owners', async () => {
    const first = loadArtistCatalogFromSupabase('one')
    const second = loadArtistCatalogFromSupabase('two')
    expect(second).not.toBe(first)
    await Promise.all([first, second])
  })
  it('retries after a failed request instead of retaining the rejection', async () => {
    mock.from.mockImplementationOnce(() => { throw new Error('Temporary failure') })
    await expect(loadArtistCatalogFromSupabase('owner')).rejects.toThrow('Temporary failure')
    expect((await loadArtistCatalogFromSupabase('owner')).artists).toHaveLength(1)
  })
})
