import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

describe('Activity inbox routing contract', () => {
  it('opens Inbox-only findings as retained object details instead of casting Inbox to a blank surface', () => {
    expect(appSource).toContain("if (item.destination === 'Inbox')")
    expect(appSource).toContain('openObjectDetail(item.objectDetail)')
    expect(appSource).toContain('onOpenAlert={() => { if (saleInboxSignal) openActivityItem(saleInboxSignal) }}')
  })

  it('closes the inbox popover before opening its alert', () => {
    expect(appSource).toContain("event.currentTarget.closest('details.mention-inbox')")
    expect(appSource).toContain('onClick={openAlertButton}')
  })
})
