import type { ReactNode } from 'react'
import './PrizeWallPreview.css'

const officialPrizeWall = 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'

const startingCosts = [
  { name: 'Play Boosters', tix: 500 },
  { name: 'Collector Boosters', tix: 2500 },
  { name: 'Commander Precons', tix: 5000 },
  { name: 'Bundles', tix: 6000 },
  { name: 'Jumbo cards (12 × 17 in.)', tix: 20000 },
  { name: 'Oversized cards (23 × 32 in.)', tix: 40000 },
  { name: 'Uncut Sheets', tix: 50000 },
]

export function PrizeWallPreview({ counter }: { counter?: ReactNode }) {
  return <section className="catalog-browser prize-wall-preview" role="tabpanel" aria-label="Prize Wall catalog">
    <header className="catalog-browser-heading prize-wall-heading">
      <div><h2>Prize Wall preview</h2></div>
      {counter}
    </header>
    <table className="prize-wall-price-list">
      <thead><tr><th scope="col">Prize</th><th scope="col">Starting Prize Tix</th></tr></thead>
      <tbody>
        {startingCosts.map(({ name, tix }) => <tr key={name}>
          <th scope="row">{name}</th>
          <td>{tix.toLocaleString('en-US')}</td>
        </tr>)}
      </tbody>
    </table>
    <p>May also include deck boxes, sleeves, playmats, dice, and Secret Lairs.</p>
    <footer>
      <a className="map-back-link" href={officialPrizeWall} target="_blank" rel="noreferrer">Official Prize Wall ↗</a>
    </footer>
  </section>
}
