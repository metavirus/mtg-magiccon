import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const target = 'public/prize-wall/current.json'
const receiptFile = '.codex-local/prize-wall-ingest/publication.json'
const publicUrl = 'https://metavirus.github.io/mtg-magiccon/prize-wall/current.json'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const writeReceipt = value => fs.writeFile(receiptFile, `${JSON.stringify(value, null, 2)}\n`)
export async function publishPrizeWall({ execute = run, expected, liveMatches, receipt = writeReceipt, wait = () => new Promise(resolve => setTimeout(resolve, 15000)), attempts = 40 }) {
try {
  const modified = execute('git', ['status', '--porcelain', '--untracked-files=no']).split('\n').filter(Boolean)
  if (modified.some(line => !line.endsWith(target))) throw Error('Refusing publication with unrelated changed files')
  if (modified.length) {
    execute('git', ['config', 'user.name', 'github-actions[bot]'])
    execute('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'])
    execute('git', ['add', '--', target])
    const staged = execute('git', ['diff', '--cached', '--name-only'])
    if (staged !== target) throw Error('Unexpected staged publication scope')
    execute('git', ['commit', '-m', 'Update official Prize Wall details'])
    // Never force or rebase over an unrelated release. A race retries next run.
    execute('git', ['push', 'origin', 'HEAD:main'])
  }
  const commit = execute('git', ['rev-parse', 'HEAD'])
  if (await liveMatches()) {
    await receipt({ status: 'live_unchanged', commit, publicUrl, sha256: expected })
  } else {
    // GITHUB_TOKEN pushes do not trigger push workflows. Explicit dispatch is
    // essential, and also recovers a prior commit whose dispatch/deploy failed.
    execute('gh', ['workflow', 'run', 'deploy-pages.yml', '--ref', 'main'])
    await receipt({ status: 'deploying', commit, publicUrl, sha256: expected })
    let verified = false
    for (let attempt = 0; attempt < attempts; attempt++) {
      await wait()
      if (await liveMatches()) { verified = true; break }
    }
    if (!verified) throw Error('Prize Wall update committed but exact public JSON did not verify before deadline')
    await receipt({ status: 'live', commit, publicUrl, sha256: expected })
  }
} catch (error) {
  await receipt({ status: 'failed', reason: error.message.slice(0, 500) })
  throw error
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'metavirus/mtg-magiccon' || process.env.GITHUB_REF !== 'refs/heads/main') throw Error('Prize Wall publication is restricted to the canonical main cloud workflow')
  const expected = digest(await fs.readFile(target))
  await publishPrizeWall({ expected, liveMatches: async () => {
    try {
      const response = await fetch(`${publicUrl}?verify=${Date.now()}`, { signal: AbortSignal.timeout(15000) })
      return response.ok && digest(Buffer.from(await response.arrayBuffer())) === expected
    } catch { return false }
  } })
  console.log(await fs.readFile(receiptFile, 'utf8'))
}
