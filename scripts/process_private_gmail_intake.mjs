import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { planPrivateGmailIntake } from './lib/private_gmail_intake.mjs'

const FLIGHT_ITINERARY = 'atlanta-2026-delta-hogfbx'
const CANONICAL_PROJECT_REF = 'pavjsexxbueuzhzgemgy'

const sqlLiteral = value => `'${String(value).replaceAll("'", "''")}'`

async function loadCanonicalDatabaseUrl() {
  try {
    const envFile = await fs.readFile('.secrets/database.env', 'utf8')
    const value = envFile.split(/\r?\n/).find(line => line.startsWith('SUPABASE_DB_URL='))?.slice('SUPABASE_DB_URL='.length).trim()
    if (!value || !value.includes(CANONICAL_PROJECT_REF) || !value.includes(':5432/') || !value.includes('sslmode=require')) return null
    return value
  } catch {
    return null
  }
}

function applyReceiptWithPsql(plan, databaseUrl) {
  const receipt = plan.operation.receipt
  const attendees = plan.operation.attendeePersonKeys
  const eventIds = plan.operation.eventIds
  const eventValues = eventIds.map(eventId => `(${sqlLiteral(eventId)})`).join(',')
  const sql = `
begin;
do $guard$
begin
  if (select count(*) from public.companion_members where person_key = 'kavi' and active and user_id is not null) <> 1 then
    raise exception 'canonical_owner_binding_ambiguous';
  end if;
  if (select count(*) from public.companion_members where person_key in (${attendees.map(sqlLiteral).join(',')}) and active and user_id is not null) <> ${attendees.length} then
    raise exception 'canonical_attendee_binding_unavailable';
  end if;
  if (select count(distinct event_id) from public.ticketed_play_current_availability where event_id in (${eventIds.map(sqlLiteral).join(',')})) <> ${eventIds.length} then
    raise exception 'canonical_event_binding_unavailable';
  end if;
end
$guard$;

with receipt_row as (
  insert into public.wallet_receipts (
    owner_id, source_system, source_message_id, source_thread_id, receipt_type, title, vendor,
    receipt_date, amount, currency, attendee_person_key, attendee_person_keys, line_items,
    original_html, confidence, updated_at
  )
  select owner.user_id, ${sqlLiteral(receipt.source_system)}, ${sqlLiteral(receipt.source_message_id)},
    ${receipt.source_thread_id ? sqlLiteral(receipt.source_thread_id) : 'null'}, ${sqlLiteral(receipt.receipt_type)},
    ${sqlLiteral(receipt.title)}, ${sqlLiteral(receipt.vendor)}, ${sqlLiteral(receipt.receipt_date)}::timestamptz,
    ${Number(receipt.amount)}, ${sqlLiteral(receipt.currency)}, ${sqlLiteral(receipt.attendee_person_key)},
    array[${receipt.attendee_person_keys.map(sqlLiteral).join(',')}]::text[],
    ${sqlLiteral(JSON.stringify(receipt.line_items))}::jsonb, ${sqlLiteral(receipt.original_html)},
    ${sqlLiteral(receipt.confidence)}, now()
  from public.companion_members owner
  where owner.person_key = 'kavi' and owner.active and owner.user_id is not null
  on conflict (owner_id, source_system, source_message_id) do update set
    source_thread_id = excluded.source_thread_id,
    receipt_type = excluded.receipt_type,
    title = excluded.title,
    vendor = excluded.vendor,
    receipt_date = excluded.receipt_date,
    amount = excluded.amount,
    currency = excluded.currency,
    attendee_person_key = excluded.attendee_person_key,
    attendee_person_keys = excluded.attendee_person_keys,
    line_items = excluded.line_items,
    original_html = excluded.original_html,
    confidence = excluded.confidence,
    updated_at = now()
  returning id
), event_ids(event_id) as (
  values ${eventValues}
), selection_values(selection_key, selection_value) as (
  values ('state', 'committed'), ('purchased', 'true'), ('purchase_locked', 'true')
)
insert into public.user_selections (
  owner_id, object_id, object_kind, selection_key, selection_value, metadata, updated_at
)
select attendee.user_id, 'explore-' || events.event_id, 'event', selections.selection_key,
  selections.selection_value,
  jsonb_build_object('source_system', 'gmail', 'source_message_id', ${sqlLiteral(plan.sourceMessageId)}, 'wallet_receipt_id', receipt_row.id),
  now()
from public.companion_members attendee
cross join receipt_row
cross join event_ids events
cross join selection_values selections
where attendee.person_key in (${attendees.map(sqlLiteral).join(',')}) and attendee.active and attendee.user_id is not null
on conflict (owner_id, object_id, selection_key) do update set
  selection_value = excluded.selection_value,
  metadata = excluded.metadata,
  updated_at = excluded.updated_at;

do $readback$
begin
  if (
    select count(*)
    from public.user_selections selections
    join public.companion_members attendee on attendee.user_id = selections.owner_id
    where attendee.person_key in (${attendees.map(sqlLiteral).join(',')})
      and selections.object_id in (${eventIds.map(eventId => sqlLiteral(`explore-${eventId}`)).join(',')})
      and selections.selection_key in ('state', 'purchased', 'purchase_locked')
  ) <> ${eventIds.length * attendees.length * 3} then
    raise exception 'receipt_applied_without_complete_purchase_lock_readback';
  end if;
end
$readback$;

select json_build_object(
  'status', 'applied',
  'kind', 'receipt',
  'sourceMessageId', ${sqlLiteral(plan.sourceMessageId)},
  'receiptId', (select id from public.wallet_receipts where source_system = 'gmail' and source_message_id = ${sqlLiteral(plan.sourceMessageId)}),
  'attendeeCount', ${attendees.length},
  'purchaseLockCount', ${eventIds.length * attendees.length}
)::text;
commit;
`
  const result = spawnSync('psql', [databaseUrl, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  })
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Canonical direct-database receipt intake failed.')
  const line = result.stdout.split(/\r?\n/).map(value => value.trim()).find(value => value.startsWith('{'))
  if (!line) throw new Error('Canonical direct-database receipt intake returned no readback.')
  return JSON.parse(line)
}
const inputPath = process.argv[2]
const raw = inputPath && inputPath !== '-'
  ? await fs.readFile(inputPath, 'utf8')
  : await new Promise((resolve, reject) => {
      let body = ''
      process.stdin.setEncoding('utf8')
      const finish = () => {
        process.stdin.pause()
        resolve(body.trim())
      }
      process.stdin.on('data', chunk => {
        body += chunk
        if (body.includes('\n')) finish()
      })
      process.stdin.on('end', finish)
      process.stdin.on('error', reject)
    })

let message
try {
  message = JSON.parse(raw)
} catch {
  console.log(JSON.stringify({ status: 'not_covered', kind: 'unknown', sourceMessageId: null, reason: 'normalized_input_invalid_json' }))
  process.exit(0)
}

const plan = planPrivateGmailIntake(message)
if (plan.status !== 'covered') {
  console.log(JSON.stringify(plan))
  process.exit(0)
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !secretKey) {
  const databaseUrl = plan.kind === 'receipt' && plan.operation.eventIds.length ? await loadCanonicalDatabaseUrl() : null
  if (databaseUrl) {
    console.log(JSON.stringify(applyReceiptWithPsql(plan, databaseUrl)))
    process.exit(0)
  }
  console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_writer_credentials_unavailable' }))
  process.exit(0)
}
if (!supabaseUrl.includes(`${CANONICAL_PROJECT_REF}.supabase.co`) || !secretKey.startsWith('sb_secret_')) {
  console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_writer_identity_unverified' }))
  process.exit(0)
}

const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const owner = await client.from('companion_members').select('user_id').eq('person_key', 'kavi').eq('active', true).not('user_id', 'is', null)
if (owner.error) throw owner.error
if (owner.data?.length !== 1) {
  console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_owner_binding_ambiguous' }))
  process.exit(0)
}
const ownerId = owner.data[0].user_id

if (plan.kind === 'receipt') {
  if (plan.operation.eventIds.length) {
    const eventBinding = await client.from('ticketed_play_current_availability').select('event_id').in('event_id', plan.operation.eventIds)
    if (eventBinding.error || new Set((eventBinding.data ?? []).map(row => row.event_id)).size !== plan.operation.eventIds.length) {
      console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_event_binding_unavailable' }))
      process.exit(0)
    }
  }
  const attendeeBindings = await client.from('companion_members').select('person_key,user_id').in('person_key', plan.operation.attendeePersonKeys).eq('active', true).not('user_id', 'is', null)
  if (attendeeBindings.error) throw attendeeBindings.error
  const attendeeOwners = new Map((attendeeBindings.data ?? []).map(row => [row.person_key, row.user_id]))
  if (attendeeOwners.size !== plan.operation.attendeePersonKeys.length || plan.operation.attendeePersonKeys.some(personKey => !attendeeOwners.get(personKey))) {
    console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_attendee_binding_unavailable' }))
    process.exit(0)
  }
  const receipt = { owner_id: ownerId, ...plan.operation.receipt }
  const write = await client.from('wallet_receipts').upsert(receipt, { onConflict: 'owner_id,source_system,source_message_id' }).select('id,source_message_id,attendee_person_key,attendee_person_keys').single()
  if (write.error) throw write.error
  const selections = plan.operation.attendeePersonKeys.flatMap(personKey => plan.operation.eventIds.flatMap(eventId => [
    ['state', 'committed'], ['purchased', 'true'], ['purchase_locked', 'true'],
  ].map(([selection_key, selection_value]) => ({
    owner_id: attendeeOwners.get(personKey),
    object_id: `explore-${eventId}`,
    object_kind: 'event',
    selection_key,
    selection_value,
    metadata: { source_system: 'gmail', source_message_id: plan.sourceMessageId, wallet_receipt_id: write.data.id },
    updated_at: new Date().toISOString(),
  }))))
  if (selections.length) {
    const locks = await client.from('user_selections').upsert(selections, { onConflict: 'owner_id,object_id,selection_key' })
    if (locks.error) throw locks.error
  }
  const readback = await client.from('wallet_receipts').select('id,source_message_id,attendee_person_key,attendee_person_keys').eq('owner_id', ownerId).eq('source_system', 'gmail').eq('source_message_id', plan.sourceMessageId).single()
  if (readback.error) throw readback.error
  const attendeeOwnerIds = [...new Set(attendeeOwners.values())]
  const lockReadback = plan.operation.eventIds.length
    ? await client.from('user_selections').select('owner_id,object_id,selection_key,selection_value').in('owner_id', attendeeOwnerIds).in('object_id', plan.operation.eventIds.map(eventId => `explore-${eventId}`)).in('selection_key', ['state', 'purchased', 'purchase_locked'])
    : { data: [], error: null }
  if (lockReadback.error) throw lockReadback.error
  const expectedLockCount = plan.operation.eventIds.length * attendeeOwnerIds.length * 3
  if ((lockReadback.data?.length ?? 0) !== expectedLockCount) throw new Error('Receipt applied without complete purchase-lock readback.')
  console.log(JSON.stringify({ status: 'applied', kind: 'receipt', sourceMessageId: plan.sourceMessageId, receiptId: readback.data.id, attendeeCount: attendeeOwnerIds.length, purchaseLockCount: plan.operation.eventIds.length * attendeeOwnerIds.length }))
} else {
  const applied = await client.rpc(plan.operation.rpc, plan.operation.args)
  if (applied.error) throw applied.error
  const [legs, evidence, signal] = await Promise.all([
    client.from('trip_flight_legs').select('leg_key,flight_number,departure_airport,arrival_airport,departure_at,arrival_at').eq('itinerary_key', FLIGHT_ITINERARY),
    client.from('trip_flight_source_evidence').select('id,source_ref').eq('source_kind', 'gmail').eq('source_ref', plan.sourceMessageId).maybeSingle(),
    client.from('monitoring_concepts').select('id,attention_state').eq('owner_id', ownerId).eq('concept_key', 'atlanta:trip:flight:hogfbx').maybeSingle(),
  ])
  if (legs.error) throw legs.error
  if (evidence.error) throw evidence.error
  if (signal.error) throw signal.error
  if (!evidence.data) throw new Error('Flight executor returned without retained source-evidence readback.')
  console.log(JSON.stringify({ status: 'applied', kind: 'flight', sourceMessageId: plan.sourceMessageId, executorResult: applied.data, legCount: legs.data?.length ?? 0, evidenceRetained: true, signalPresent: Boolean(signal.data) }))
}
