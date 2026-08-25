const [mode, value] = process.argv.slice(2)
if (!['content', 'status'].includes(mode) || !value) throw new Error('Usage: node --use-system-ca scripts/fetch_public_verification.mjs <content|status> <https-url>')

const url = new URL(value)
if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Public verification accepts only credential-free HTTPS URLs.')

const response = await fetch(url, {
  method: mode === 'status' ? 'HEAD' : 'GET',
  redirect: 'follow',
  signal: AbortSignal.timeout(20_000),
  headers: { 'cache-control': 'no-cache', 'user-agent': 'MagicCon public verifier/1.0' },
})
if (!response.ok) throw new Error(`Public verification fetch returned HTTP ${response.status}: ${url}`)
process.stdout.write(mode === 'status' ? String(response.status) : await response.text())
