import './OfficialMapLegend.css'

const symbols = [
  ['elevator', 'Elevator'], ['atm', 'ATM'], ['restrooms', 'Restrooms'],
  ['gender-neutral-restrooms', 'Gender neutral restrooms'], ['accessible-restroom', 'Accessible restroom'],
  ['concessions', 'Concessions'], ['mothers-room', 'Mothers’ room'], ['info-booth', 'Info booth'],
  ['escalator', 'Escalator'], ['first-aid', 'First aid'], ['pin-sponsor', 'Pin program sponsor'],
  ['featured-exhibitor', 'Featured exhibitor'], ['open-late', 'Featured exhibitor plus (open late)'],
  ['featured-artist', 'Featured artists'],
]
const featured = [
  ['Beadle & Grimm’s', '2071'], ['Card Kingdom', '3098'], ['CM Games', '3110'], ['Dragon Shield', '2059'],
  ['Galactus Roma', '6061'], ['Gamegenic', '3059'], ['Heavy Play', '7079'], ['Kess Co.', '1089'],
  ['Misty Mountain Gaming', '1079'], ['Propaganda', '5107'], ['Star City Games', '8107'],
  ['TCGplayer', '2089'], ['Three for One Trading', '4097'],
]
const lateNight = [
  ['Cool Stuff Inc', '2117'], ['Face to Face Games', '3117'], ['J.K. Entertainment', '6117'],
  ['Journey’s End Games', '4117'], ['Manatrust', '8119'], ['Pastimes', '1117'], ['Strike Zone', '2129'],
  ['Toamagic.com', '5117'], ['Tier 1 Games', '1129'], ['Yakata Games', '7117'],
]
const sponsors = [
  ['Cool Stuff Inc', '2117'], ['Extra Life', 'Gathering Grounds'], ['J.K. Entertainment', '6117'],
  ['Journey’s End Games', '4117'], ['Pink Bunny Games', '9078'], ['Stomping Grounds', '3104'],
]

function Icon({ name }: { name: string }) {
  return <img src={`${import.meta.env.BASE_URL}maps/legend-${name}.webp`} alt="" width={28} height={30} />
}

function BoothList({ title, rows }: { title: string; rows: string[][] }) {
  return <section className="official-legend-section"><h3>{title}</h3>
    <dl className="official-legend-booths">{rows.map(([name, location]) => <div key={name}><dt>{name}</dt><dd>{location}</dd></div>)}</dl>
  </section>
}

export function OfficialMapLegend() {
  return <div className="official-map-legend">
    <section className="official-legend-section official-legend-symbol-section"><h3>Map symbols</h3>
      <ul className="official-legend-symbols">{symbols.map(([icon, label]) => <li key={icon}><Icon name={icon} /><span>{label}</span></li>)}</ul>
    </section>
    <section className="official-legend-section"><h3><Icon name="important-location" />Important locations</h3>
      <ul className="official-legend-locations">
        <li>Ticketed Play Hub</li><li>Quiet Room · C104</li><li>Accessibility help desk at Registration</li>
        <li>Lost and Found</li><li>Magic Meet & Greets wristband distribution <span>(select meet and greets)</span></li>
      </ul>
    </section>
    <BoothList title="Featured exhibitors" rows={featured} />
    <BoothList title="Featured late night exhibitors" rows={lateNight} />
    <BoothList title="Pin sponsors" rows={sponsors} />
  </div>
}
