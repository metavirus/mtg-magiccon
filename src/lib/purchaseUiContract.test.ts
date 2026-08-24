import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const densitySource = readFileSync(resolve(process.cwd(), 'src/density.css'), 'utf8')

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
})
