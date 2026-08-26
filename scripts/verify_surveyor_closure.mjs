import fs from 'node:fs/promises'
import { validateSurveyorClosureManifest } from './lib/surveyor_closure_contract.mjs'

const [reportPath, manifestPath] = process.argv.slice(2)
if (!reportPath || !manifestPath) throw new Error('Usage: pnpm monitor:verify-closure <monitor-report.json> <closure-manifest.json>')

const [report, manifest] = await Promise.all([
  fs.readFile(reportPath, 'utf8').then(JSON.parse),
  fs.readFile(manifestPath, 'utf8').then(JSON.parse),
])
validateSurveyorClosureManifest(manifest, report)
console.log(`Surveyor closure: PASS (${manifest.catches.length} meaningful catch${manifest.catches.length === 1 ? '' : 'es'} reached verified terminal outcomes)`)
