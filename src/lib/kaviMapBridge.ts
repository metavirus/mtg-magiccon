export const mapGuideTopics = {
  registration: 'will-call',
  'ticketed-play-hub': 'ticketed-play',
  'ticketed-play-on-demand': 'on-demand-play',
  'prize-wall': 'prize-tix',
} as const
export type MapGuidePlace = keyof typeof mapGuideTopics

export type MapPlaceRequest = { kind: 'vendor' | 'artist'; name: string; booth?: string }
export type MapUpperPlace = 'mana-stage' | 'black-lotus'
export type MapMessage =
  | { type: 'kavimap:select' | 'kavimap:open'; version: 1; place: MapPlaceRequest }
  | { type: 'kavimap:levels'; version: 1; placeId?: MapUpperPlace }
  | { type: 'kavimap:event'; version: 1; eventId: string }
  | { type: 'kavimap:guide'; version: 1; placeId: MapGuidePlace }
  | { type: 'kavimap:catalog'; version: 1; family: 'prize_wall' }
  | { type: 'kavimap:return'; version: 1 }

export function readMapMessage(event: Pick<MessageEvent, 'source' | 'origin' | 'data'>, source: Window | null | undefined): MapMessage | null {
  if (!source || event.source !== source || event.origin !== 'null') return null
  const d = event.data
  if (!d || d.version !== 1) return null
  const size = Object.keys(d).length
  if (d.type === 'kavimap:levels') {
    return size === 2 || (size === 3 && (d.placeId === 'mana-stage' || d.placeId === 'black-lotus')) ? d : null
  }
  if (d.type === 'kavimap:event') return size === 3 && typeof d.eventId === 'string' && /^[\w-]{1,160}$/.test(d.eventId) ? d : null
  if (d.type === 'kavimap:guide') return size === 3 && typeof d.placeId === 'string' && Object.hasOwn(mapGuideTopics, d.placeId) ? d : null
  if (d.type === 'kavimap:catalog') return size === 3 && d.family === 'prize_wall' ? d : null
  if (d.type === 'kavimap:return') return size === 2 ? d : null
  if (!['kavimap:select', 'kavimap:open'].includes(d.type) || Object.keys(d).length !== 3) return null
  const p = d.place
  if (!p || !['vendor', 'artist'].includes(p.kind) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 160 || (p.booth !== undefined && (typeof p.booth !== 'string' || p.booth.length > 40)) || Object.keys(p).some(k => !['kind', 'name', 'booth'].includes(k))) return null
  return d
}
export const mapNameKey = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
export function matchMapRecord<T extends { name: string; aliases?: string[]; booth?: string | null }>(place: MapPlaceRequest, rows: T[]): T | undefined {
  // Official map captions use these shortened forms; keep mappings explicit,
  // scoped to kind, and independent of booth number (directory numbers can lag).
  const aliases: Record<string, Record<string, string>> = {
    vendor: { 'Daria Aksenova / World of Trash':'Daria Aksenova', Sirius:'Sirius Dice', Gamegenic:'Gamegenic GmbH', 'Face to Face':'Face to Face Games', 'Frost Giant Games':'Frost Giant Games LLC', 'Norse Foundry':'Norse Foundry LLC', 'The Mana Vault':'The Mana Vault MKE', 'Mage’s Sanctum':'Mages Sanctum LLC', 'Toamagic.com':'TOAMagic', 'Allen Panakal':'Panakal Art Ltd', GIRUDO:'Girudo, Inc.', 'Foam Brain Games':'Foam Brain', 'The Manamart':'Manamart', 'Mythic Goblin':'Mythic Goblin Ltd', 'Nerd Gear Gaming':'Nerd Gear Gaming Inc.', 'Pink Bunny Games':'Pink Bunny Games llc', Manatrust:'ManaTrust Trading SRL' },
    artist: { 'Thomas Baxa':'Thomas M. Baxa', 'Olena "Lena" Richards':'Olena Richards', 'Jason Engle':'Jason A. Engle', 'Tomas Wanerstrand':'Tom Wanerstrand' },
  }
  const key = mapNameKey(aliases[place.kind]?.[place.name] ?? place.name)
  const names = rows.filter(row => [row.name, ...(row.aliases ?? [])].some(name => mapNameKey(name) === key))
  if (names.length === 1) return names[0]
  // A booth alone is not identity: several vendors can share a numbered island.
  if (names.length > 1 && place.booth) {
    const atBooth = names.filter(row => row.booth?.split(/[,;\s]+/).includes(place.booth!))
    if (atBooth.length === 1) return atBooth[0]
  }
  return undefined
}

export function mapBoothFacts<T extends {label: string; value: string}>(facts: T[] | undefined, booth?: string): Array<T | {label: string; value: string}> {
  return booth ? [{label: 'Booth', value: booth}, ...(facts ?? []).filter(fact => fact.label !== 'Booth')] : facts ?? []
}
