import type { ReactNode } from 'react'
import prizeWall from '../../public/prize-wall/current.json'
import './PrizeWallPreview.css'

type Prize = { name: string; tix: number; qualifier: string; imageUrl?: string; retained?: boolean }
type CatalogLink = { label: string; url: string; format: string; use: string; name?: string }
const prices: Prize[] = prizeWall.prices
const links: CatalogLink[] = prizeWall.catalogLinks
const allStarting = prices.every(row => row.qualifier === 'starting')
const optionalItems = prizeWall.optionalItems.filter(item => !/and more|cool magic related/i.test(item))

export function PrizeWallPreview({ counter }: { counter?: ReactNode }) {
  return <section className="catalog-browser prize-wall-preview" role="tabpanel" aria-label="Prize Wall catalog">
    <header className="catalog-browser-heading prize-wall-heading">
      <div><h2>Prize Wall preview</h2></div>
      {counter}
    </header>
    <table className="prize-wall-price-list">
      <thead><tr><th scope="col">Prize</th><th scope="col">{allStarting ? 'Starting Prize Tix' : 'Prize Tix'}</th></tr></thead>
      <tbody>
        {prices.map(({ name, tix, qualifier, imageUrl, retained }) => <tr key={name}>
          <th scope="row"><span className="prize-wall-item">
            {imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer" aria-label={`View ${name} image`}><img src={imageUrl} alt="" loading="lazy" /></a>}
            {name}
          </span></th>
          <td>{retained && <small>Last listed </small>}{!allStarting && qualifier === 'starting' ? 'From ' : ''}{tix.toLocaleString('en-US')}</td>
        </tr>)}
      </tbody>
    </table>
    {optionalItems.length > 0 && <p>May also include {optionalItems.join(', ')}.</p>}
    {links.filter(link => !link.name).map(link => <a className="map-back-link" key={link.url} href={link.url} target="_blank" rel="noreferrer">
      {link.format === 'image' ? 'View prize listing' : 'View official prize catalog'} ↗
    </a>)}
    <footer>
      <a className="map-back-link" href={prizeWall.sourceUrl} target="_blank" rel="noreferrer">Official Prize Wall ↗</a>
    </footer>
  </section>
}
