import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const workingDir = path.join(repoRoot, 'local-assets', 'artist-card-working')
const cardPath = path.join(workingDir, 'artist_card_candidates.normalized.csv')
const outputPath = path.join(workingDir, 'spotted_artist_cards_preview.html')
const imageDir = path.join(repoRoot, 'local-assets', 'artist-card-images', 'original')
const processedImageDir = path.join(repoRoot, 'local-assets', 'artist-card-images', 'processed')
const processedManifestPath = path.join(processedImageDir, 'previews-manifest.csv')
const largeManifestPath = path.join(processedImageDir, 'large1-manifest.csv')
const spottedArtists = ['Cynthia Sheppard', 'Mark Poole', 'Serena Malyon', 'Rebecca Guay']

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') quoted = false
      else cell += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell.length || row.length) row.push(cell.replace(/\r$/, '')), rows.push(row)
  const [headers = [], ...body] = rows.filter(item => item.some(value => value.trim().length))
  return body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pretty(value) {
  return escapeHtml(value || '—')
}

function imageSrc(card) {
  if (card.local_image_found !== 'yes' || !card.local_image_filename) return ''
  const [filename] = card.local_image_filename.split(';').map(item => item.trim()).filter(Boolean)
  if (!filename) return ''
  const absolutePath = path.join(imageDir, filename)
  if (!usableFile(absolutePath)) return ''
  return fileUrl(absolutePath)
}

const cards = parseCsv(fs.readFileSync(cardPath, 'utf8'))
const processedImages = fs.existsSync(processedManifestPath)
  ? new Map(parseCsv(fs.readFileSync(processedManifestPath, 'utf8')).map(row => [row.original_filename, row]))
  : new Map()
const largeImages = fs.existsSync(largeManifestPath)
  ? new Map(parseCsv(fs.readFileSync(largeManifestPath, 'utf8')).map(row => [row.original_filename, row]))
  : new Map()

function processedImageSrc(card) {
  if (!card.local_image_filename) return ''
  const [filename] = card.local_image_filename.split(';').map(item => item.trim()).filter(Boolean)
  const processed = processedImages.get(filename)
  if (!processed?.preview_filename) return ''
  const absolutePath = path.join(processedImageDir, processed.preview_filename)
  if (!usableFile(absolutePath)) return ''
  return fileUrl(absolutePath)
}

function largeImageSrc(card) {
  if (!card.local_image_filename) return ''
  const [filename] = card.local_image_filename.split(';').map(item => item.trim()).filter(Boolean)
  const processed = largeImages.get(filename) || processedImages.get(filename)
  if (!processed?.large_filename) return ''
  const absolutePath = path.join(processedImageDir, processed.large_filename)
  if (!usableFile(absolutePath)) return ''
  return fileUrl(absolutePath)
}

function fileUrl(filePath) {
  return `file:///${filePath.replaceAll('\\', '/')}`
}

function usableFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0
}

const sections = spottedArtists.map(artist => {
  const artistCards = cards
    .filter(card => card.artist_name.toLowerCase() === artist.toLowerCase())
    .sort((a, b) => Number(b.review_rank) - Number(a.review_rank) || a.card_name.localeCompare(b.card_name))

  const cardItems = artistCards.length
    ? artistCards.map(card => {
      const src = processedImageSrc(card) || imageSrc(card)
      const largeSrc = largeImageSrc(card) || src
      return `
      <li class="card-row">
        <button class="art-frame" type="button" ${src ? `data-large="${largeSrc}" data-title="${escapeHtml(card.card_name)}"` : ''}>
          ${src ? `<img src="${src}" alt="${escapeHtml(card.card_name)} card art" loading="lazy">` : '<div class="missing-art">No local art</div>'}
        </button>
        <div class="card-copy">
          <strong>${pretty(card.card_name)}</strong>
          <span>${pretty(card.set_code)} #${pretty(card.collector_number)} · ${pretty(card.foil)} · ${pretty(card.rarity)} · qty ${pretty(card.quantity)}</span>
          <small>${pretty(card.taste_match)} · ${pretty(card.visual_style_category)} · ${pretty(card.special_treatment)}</small>
          ${card.style_notes ? `<p class="style-note">${pretty(card.style_notes)}</p>` : ''}
        </div>
      </li>
    `}).join('')
    : '<li class="empty"><strong>No owned cards found in normalized table yet.</strong><span>This artist can stay as a watch/confirmed artist row without card matches.</span></li>'

  return `
    <section>
      <div class="artist-head">
        <h2>${escapeHtml(artist)}</h2>
        <span>${artistCards.length} card${artistCards.length === 1 ? '' : 's'}</span>
      </div>
      <ol class="card-grid">${cardItems}</ol>
    </section>
  `
}).join('\n')

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spotted artist card preview</title>
  <style>
    :root{color-scheme:dark;--bg:#07111f;--card:#0f2035;--line:#2a4160;--text:#edf4ff;--muted:#9eb2cc;--accent:#d79cff;--gold:#f5c95e}
    *{box-sizing:border-box}
    body{margin:0;padding:28px;font-family:Inter,Segoe UI,system-ui,sans-serif;background:linear-gradient(135deg,#07111f,#111326);color:var(--text)}
    main{max-width:1180px;margin:0 auto;display:grid;gap:16px}
    header{display:grid;gap:8px;margin-bottom:4px}
    h1{margin:0;font-size:clamp(30px,5vw,54px);line-height:.95;letter-spacing:-.04em}
    p{margin:0;color:var(--muted);font-size:15px;line-height:1.5}
    section{border:1px solid var(--line);border-radius:18px;background:rgba(15,32,53,.82);overflow:hidden}
    .artist-head{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line)}
    h2{margin:0;color:var(--accent);font-size:21px}
    .artist-head span{color:var(--gold);font-weight:800}
    ol{list-style:none;margin:0;padding:0}
    .card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;padding:16px}
    li{display:grid;gap:4px;padding:13px 18px;border:1px solid rgba(42,65,96,.65);border-radius:16px;background:rgba(7,17,31,.58)}
    li:first-child{border-top:0}
    strong{font-size:16px}
    span,small{color:var(--muted)}
    small{font-size:12px}
    .empty strong{color:#cbd8ea}
    .card-row{grid-template-columns:112px minmax(0,1fr);gap:14px;align-items:start}
    .art-frame{width:112px;min-height:156px;border-radius:12px;background:#091525;border:1px solid rgba(126,160,207,.35);overflow:hidden;display:grid;place-items:center;padding:0;cursor:zoom-in;box-shadow:0 12px 34px rgba(0,0,0,.24)}
    .art-frame:hover{border-color:var(--gold);transform:translateY(-1px)}
    img{display:block;width:100%;height:auto}
    .missing-art{padding:10px;text-align:center;color:var(--muted);font-size:12px}
    .card-copy{display:grid;gap:4px;min-width:0}
    .style-note{margin-top:6px;font-size:13px;color:#c7d6eb}
    .lightbox{position:fixed;inset:0;z-index:20;display:none;place-items:center;padding:28px;background:rgba(1,6,14,.86);backdrop-filter:blur(10px)}
    .lightbox.open{display:grid}
    .lightbox-panel{max-width:min(92vw,720px);display:grid;gap:12px}
    .lightbox img{max-width:100%;max-height:82vh;border-radius:18px;border:1px solid rgba(245,201,94,.45);box-shadow:0 30px 90px rgba(0,0,0,.58)}
    .lightbox-title{color:var(--text);font-weight:800;text-align:center}
    .lightbox-close{position:fixed;top:18px;right:18px;width:48px;height:48px;border-radius:16px;border:1px solid var(--line);background:#10223a;color:var(--text);font-size:28px;cursor:pointer}
    @media(max-width:640px){body{padding:14px}.artist-head{align-items:start;flex-direction:column;gap:4px}.card-grid{grid-template-columns:1fr;padding:12px}li{padding:12px}.card-row{grid-template-columns:92px minmax(0,1fr);gap:10px}.art-frame{width:92px;min-height:128px}}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Spotted artists + owned-card matches</h1>
      <p>Quick local preview generated from normalized artist/card tables. Raw CSVs stay quarantined; this page is not part of the app.</p>
    </header>
    ${sections}
  </main>
  <div class="lightbox" id="lightbox" aria-hidden="true">
    <button class="lightbox-close" type="button" aria-label="Close">×</button>
    <div class="lightbox-panel">
      <img alt="">
      <div class="lightbox-title"></div>
    </div>
  </div>
  <script>
    const lightbox = document.querySelector('#lightbox')
    const lightboxImage = lightbox.querySelector('img')
    const lightboxTitle = lightbox.querySelector('.lightbox-title')
    function closeLightbox() {
      lightbox.classList.remove('open')
      lightbox.setAttribute('aria-hidden', 'true')
      lightboxImage.removeAttribute('src')
    }
    document.querySelectorAll('.art-frame[data-large]').forEach(button => {
      button.addEventListener('click', () => {
        lightboxImage.src = button.dataset.large
        lightboxImage.alt = button.dataset.title + ' card art'
        lightboxTitle.textContent = button.dataset.title
        lightbox.classList.add('open')
        lightbox.setAttribute('aria-hidden', 'false')
      })
    })
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox || event.target.closest('.lightbox-close')) closeLightbox()
    })
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeLightbox()
    })
  </script>
</body>
</html>
`

fs.writeFileSync(outputPath, html)
console.log(outputPath)
