import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { LEGACY_BADGE_RECEIPTS, LEGACY_PUBLIC_ARTIFACTS, LEGACY_RECEIPT_COMMIT } from './lib/private_receipt_migration_contract.mjs'

const outputPath = process.argv[2]
if (!outputPath) throw new Error('Output manifest path is required.')
const workDir = path.dirname(outputPath)
await fs.mkdir(workDir, { recursive: true })

function readHistoricalFile(sourcePath) {
  return execFileSync('git', ['show', `${LEGACY_RECEIPT_COMMIT}:${sourcePath}`], { encoding: null, maxBuffer: 20 * 1024 * 1024, windowsHide: true })
}

const artifacts = []
for (const artifact of LEGACY_PUBLIC_ARTIFACTS) {
  const localPath = path.join(workDir, path.basename(artifact.sourcePath))
  await fs.writeFile(localPath, readHistoricalFile(artifact.sourcePath))
  artifacts.push({ ...artifact, localPath })
}

const historicalApp = readHistoricalFile('src/App.tsx').toString('utf8')
function proofPatch(functionName, nextFunctionName, receiptId) {
  const start = historicalApp.indexOf(`function ${functionName}`)
  const end = historicalApp.indexOf(`function ${nextFunctionName}`, start + 1)
  if (start < 0 || end < 0) throw new Error(`Historical proof section is unavailable for ${functionName}.`)
  const section = historicalApp.slice(start, end)
  const orderCode = section.match(/const orderCode = '([^']+)'/)?.[1]
  const orderUrl = section.match(/href="(https:\/\/conventions\.leapevent\.tech\/c\/[^"\s]+)"/)?.[1]
  if (!orderCode || !orderUrl) throw new Error(`Historical private proof fields are incomplete for ${functionName}.`)
  return { receiptId, lineIndex: 0, orderCode, orderUrl }
}

const receiptPatches = [
  proofPatch('BlackLotusProofDetail', 'JuanPremiumProofDetail', LEGACY_BADGE_RECEIPTS.blackLotus.receiptId),
  proofPatch('JuanPremiumProofDetail', 'PersonBubbles', LEGACY_BADGE_RECEIPTS.juanPremium.receiptId),
]

await fs.writeFile(outputPath, JSON.stringify({
  projectRef: 'pavjsexxbueuzhzgemgy',
  bucket: 'private-receipt-artifacts',
  artifacts: artifacts.map(({ sourcePath: _sourcePath, ...artifact }) => artifact),
  receiptPatches,
}))
console.log(JSON.stringify({ status: 'prepared', sourceCommit: LEGACY_RECEIPT_COMMIT, artifactCount: artifacts.length, receiptPatchCount: receiptPatches.length }))
