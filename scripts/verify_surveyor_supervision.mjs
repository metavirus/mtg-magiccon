import fs from 'node:fs/promises'
import { validateSurveyorSupervisionCompletion } from './lib/surveyor_supervision_contract.mjs'

const [reportPath, manifestPath] = process.argv.slice(2)
if (!reportPath || !manifestPath) throw new Error('Usage: pnpm monitor:verify-supervision <downloaded-cloud-report.json> <downloaded-cloud-closure-manifest.json>')
const [report, manifest] = await Promise.all([reportPath, manifestPath].map(async path => JSON.parse(await fs.readFile(path, 'utf8'))))
const result = validateSurveyorSupervisionCompletion(report, manifest)
console.log(`Surveyor supervision artifact gate: PASS (${result.checkedAt}; ${result.catchCount} closed catches; complete public coverage). Verify cloud baseline acceptance and cache-save steps separately; replay alone is not completion.`)
