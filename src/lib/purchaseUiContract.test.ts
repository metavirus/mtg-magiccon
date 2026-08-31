import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const densitySource = readFileSync(resolve(process.cwd(), 'src/density.css'), 'utf8')
const companionCodeMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260831055541_publish_ticketed_play_companion_codes.sql'), 'utf8')
const privateIntakeSource = readFileSync(resolve(process.cwd(), 'scripts/process_private_gmail_intake.mjs'), 'utf8')

describe('paid-event detail layout contract', () => {
  it('keeps the official link concise and pairs it with the compact purchase action', () => {
    expect(appSource).not.toContain('Opens MagicCon listing')
    expect(appSource.match(/<EventDetailActions event=/g)).toHaveLength(3)
    expect(appSource).toContain('className="event-detail-actions"')
    expect(densitySource).toContain('.event-detail-actions{display:grid;grid-template-columns:minmax(0,1fr) auto')
  })

  it('keeps purchase confirmation bounded and the Plan purchase button outside the row button', () => {
    expect(densitySource).toContain('.purchase-confirm{max-width:calc(100vw - 32px);flex-wrap:wrap;white-space:normal}')
    expect(appSource).toMatch(/<\/button>\s*<PurchaseControl event=\{event\}/)
    expect(appSource).toContain('onClick={click => click.stopPropagation()}')
  })

  it('uses the participant badge as the single Calendar purchase marker', () => {
    expect(appSource).not.toContain('className="calendar-purchase-lock"')
    expect(appSource).toContain("participant.purchased ? <ActionIcon name=\"lock\"")
    expect(densitySource).toContain('.plan-participant.purchased .person-bubble,.agenda-event .plan-participant.purchased .person-bubble{box-shadow:0 0 0 1px #f0b26f,0 0 0 3px #8f6148}')
    expect(densitySource).toContain('border:1px solid #e0a47b;border-radius:50%;background:#442d23;color:#e0a47b')
  })

  it('uses PurchaseControl as the single paid-event price source in every detail header', () => {
    expect(appSource).toContain('{!canPurchaseEvent(selected.price) && <span><EventPriceLabel event={selected} /></span>}')
    expect(appSource.match(/!canPurchaseEvent\(event\.price\) && <span><EventPriceLabel event=\{event\} icon \/>/g)).toHaveLength(2)
  })

  it('uses a neutral lotus icon only for Black Lotus Included prices', () => {
    expect(appSource).toContain("event.kind === 'Black Lotus' && event.price.toLowerCase() === 'included'")
    expect(appSource).toContain('className="included-lotus-icon" aria-label="Black Lotus included"')
    expect(densitySource).toMatch(/\.included-lotus-icon\{[^}]*color:#8d99a8[^}]*\}/)
  })

  it('shows a public event-level Companion code without depending on private receipt visibility', () => {
    expect(appSource).not.toContain("receipts.flatMap(receipt => receipt.line_items).find(line => line.event_id === selectedEvent.id)")
    expect(appSource).toContain("{event.companionCode && <section")
    expect(appSource).toContain("<strong>{event.companionCode}</strong>")
    expect(appSource).toContain('aria-label="Magic Companion event code"')
    expect(appSource).toContain('https://magic.wizards.com/products/companion-app')
    expect(densitySource).toContain('.companion-code-panel{display:grid;grid-template-columns:minmax(0,1fr) auto auto')
  })

  it('publishes receipt-discovered Companion codes through the public event projection', () => {
    expect(companionCodeMigration).toContain('for select to anon, authenticated')
    expect(companionCodeMigration).toContain('ticketed_play_public_companion_codes')
    expect(companionCodeMigration).toContain("('ticketed-944088', 'V2JYNWE')")
    expect(companionCodeMigration).toContain("('ticketed-944091', 'V2JYNWE')")
    expect(privateIntakeSource).toContain(".upsert({ event_id: eventId, companion_code: companionCode")
    expect(privateIntakeSource).toContain('Receipt applied without public Companion code readback.')
  })

  it('refreshes newly ingested receipt evidence when an installed app returns online or foreground', () => {
    expect(appSource).toContain("window.addEventListener('online', refreshReceipts)")
    expect(appSource).toContain("document.addEventListener('visibilitychange', refreshVisibleReceipts)")
    expect(appSource).toContain("window.removeEventListener('online', refreshReceipts)")
    expect(appSource).toContain("document.removeEventListener('visibilitychange', refreshVisibleReceipts)")
  })
})
