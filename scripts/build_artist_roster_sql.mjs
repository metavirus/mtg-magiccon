import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Generates a reviewed attendance-only transaction; never connects to a database.
const path = 'research/precanon/artists/2026-09-25-official-roster.json'
const raw = readFileSync(path, 'utf8')
const source = JSON.parse(raw)
const rows = source.artists
if (source.eventKey !== 'magiccon_atlanta_2026' || rows.length !== 65
  || new Set(rows.map(row => row.sourceId)).size !== rows.length
  || new Set(rows.map(row => row.canonicalName)).size !== rows.length
  || rows.some(row => !row.canonicalName || !/^\d+$/.test(row.booth)
    || row.profileUrl !== `https://mcatlanta.mtgfestivals.com/en-us/art-of-magic/artist-directory/artist-showroom.html?gtID=${row.sourceId}`)) {
  throw new Error('Reviewed roster identity/count/booth/profile contract failed.')
}
const quote = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const hash = createHash('sha256').update(raw).digest('hex')
const preserved = ['artist_import_batches', 'artist_collection_inventory', 'artist_collection_profiles', 'artist_card_assessments', 'artist_cards', 'artist_card_printings', 'artist_signing_interests', 'user_selections']
const snapshot = table => `select ${quote(table)} as table_name, count(*) as row_count, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as hash from public.${table} t`
const sql = `begin;
-- Reviewed source: ${path}; SHA256 ${hash}.
-- Serialize this small roster update and guarantee personal/card state stays untouched.
lock table public.artists, public.artist_appearances in share row exclusive mode;
create temporary table roster_preserved_before on commit drop as ${preserved.map(snapshot).join('\nunion all\n')};
create temporary table reviewed_roster (source_id text, source_name text, canonical_name text primary key, booth text, profile_url text, image_url text) on commit drop;
insert into reviewed_roster values
${rows.map(r => `(${[r.sourceId, r.sourceName, r.canonicalName, r.booth, r.profileUrl, r.imageUrl].map(quote).join(',')})`).join(',\n')};
insert into public.artists (canonical_name, display_name, profile_image_url)
select canonical_name, canonical_name, image_url from reviewed_roster
on conflict (canonical_name) do nothing;
update public.artists a set profile_image_url = r.image_url
from reviewed_roster r where a.canonical_name = r.canonical_name
and nullif(a.profile_image_url, '') is null and r.image_url is not null;
insert into public.artist_appearances (artist_id, event_key, attending_status, appearance_days, booth, official_profile_url, source_note)
select a.id, 'magiccon_atlanta_2026', 'confirmed', null, r.booth, r.profile_url,
  'Official Atlanta 2026 artist directory, reviewed 2026-09-25. Listed as ' || r.source_name || '. Individual days and signing hours not published.'
from reviewed_roster r join public.artists a using(canonical_name)
on conflict (artist_id, event_key) do update set attending_status = excluded.attending_status,
appearance_days = excluded.appearance_days, booth = excluded.booth,
official_profile_url = excluded.official_profile_url, source_note = excluded.source_note
where (artist_appearances.attending_status, artist_appearances.appearance_days, artist_appearances.booth, artist_appearances.official_profile_url, artist_appearances.source_note)
is distinct from (excluded.attending_status, excluded.appearance_days, excluded.booth, excluded.official_profile_url, excluded.source_note);
do $$ begin
if (select count(*) from reviewed_roster r join public.artists a using(canonical_name)
join public.artist_appearances p on p.artist_id=a.id and p.event_key='magiccon_atlanta_2026'
where p.attending_status='confirmed' and p.booth=r.booth and p.official_profile_url=r.profile_url and p.appearance_days is null) <> 65
then raise exception 'Roster readback mismatch'; end if;
if exists ((select * from roster_preserved_before) except (${preserved.map(snapshot).join('\nunion all\n')}))
then raise exception 'Unrelated card/personal state changed: roster transaction aborted'; end if;
end $$;
commit;
`
if (process.argv.includes('--stdout')) process.stdout.write(sql)
else {
  mkdirSync('.monitoring-state/artist-release-2026-09-25', { recursive: true })
  writeFileSync('.monitoring-state/artist-release-2026-09-25/roster.sql', sql)
  console.log(`Reviewed roster SQL generated: ${rows.length} entries; SHA256 ${hash}`)
}
