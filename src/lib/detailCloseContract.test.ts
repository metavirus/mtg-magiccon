import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const densitySource = readFileSync(resolve(process.cwd(), 'src/density.css'), 'utf8')

describe('scrolling detail close controls', () => {
  it('keeps every independently scrolling modal close control persistent and right-anchored', () => {
    expect(appSource.match(/persistent-detail-close/g)).toHaveLength(5)
    // The card grid owns its responsive close placement; generic sticky styling
    // would consume a desktop grid cell and displace the art/details.
    expect(appSource).toContain('className="detail-close artist-card-popover-close"')
    expect(appSource).not.toMatch(/className="[^"]*persistent-detail-close[^"]*artist-card-popover-close/)
    expect(densitySource).toContain('.artist-card-popover-close{position:absolute;right:12px;top:12px}')
    expect(densitySource).toContain('.persistent-detail-close{position:sticky!important;z-index:12!important;top:8px!important;float:right;justify-self:end')
  })
})
