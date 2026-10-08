import { supabase } from './supabase'
import type { Exhibitor } from '../components/ExhibitorDirectory'

export type ExhibitorOffer = { title: string; description: string; price?: string; url?: string; link?: string }
export type DirectoryExhibitor = Exhibitor & { specials?: ExhibitorOffer[]; exclusives?: ExhibitorOffer[] }
export const exhibitorObjectId = (id: string) => `exhibitor-atlanta-2026-${id}`
export function safeExhibitorUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  const candidate = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#]|$)/i.test(trimmed) ? `https://${trimmed}` : trimmed
  try { const url = new URL(candidate); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : '' } catch { return '' }
}
export const exhibitorQaFixtures: DirectoryExhibitor[] = [
  { id: 'qa-card-shop', name: 'QA Card Shop', booth: '101', profileUrl: 'https://www.mtgfestivals.com/', description: 'QA fixture: singles, sealed products, and trading accessories. This is sample content for viewport verification, not an Atlanta listing.', website: 'https://www.mtgfestivals.com/', storeUrl: '', imageUrl: '', aliases: ['Sample Cards'], visitReason: '', specials: [{ title: 'QA bundle offer', description: 'Sample sleeves and deck-box bundle.', price: '$25' }], exclusives: [{ title: 'QA convention playmat', description: 'Sample convention-exclusive artwork.', url: 'https://www.mtgfestivals.com/' }] },
  { id: 'qa-art-studio', name: 'QA Illustration & Collectibles Studio', booth: '202, 204', profileUrl: '', description: 'QA fixture: art prints and collectibles.', website: '', storeUrl: '', imageUrl: '', aliases: ['Sample Art'], visitReason: '' },
  { id: 'qa-accessories', name: 'QA Tabletop Accessories', booth: '', profileUrl: '', description: '', website: '', storeUrl: '', imageUrl: '', aliases: [], visitReason: '' },
]
export async function loadExhibitors(): Promise<DirectoryExhibitor[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('exhibitor_directory').select('record').eq('event_key', 'magiccon_atlanta_2026').eq('active', true)
  if (error) throw error
  return (data ?? []).map(({ record }) => ({ ...record, aliases: record.aliases ?? [], visitReason: record.visitReason ?? '' } as DirectoryExhibitor)).sort((a, b) => a.name.localeCompare(b.name))
}
