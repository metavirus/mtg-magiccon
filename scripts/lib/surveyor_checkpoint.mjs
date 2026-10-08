import { surveyorReportDigest } from './surveyor_closure_contract.mjs'
import { validateSurveyorSupervisionCompletion } from './surveyor_supervision_contract.mjs'

export function validateSurveyorCheckpoint(checkpoint, allowedPaths) {
  if (checkpoint?.schemaVersion !== 1 || checkpoint.checkedAt !== checkpoint.report?.checkedAt) throw new Error('Accepted checkpoint identity invalid')
  validateSurveyorSupervisionCompletion(checkpoint.report, checkpoint.manifest)
  if (checkpoint.reportDigest !== surveyorReportDigest(checkpoint.report) || checkpoint.closureDigest !== surveyorReportDigest(checkpoint.manifest)) throw new Error('Accepted checkpoint evidence digest mismatch')
  const paths = Object.keys(checkpoint.files ?? {})
  if (paths.length !== allowedPaths.length || paths.some(file => !allowedPaths.includes(file) || !/^\.monitoring-state\/[a-zA-Z0-9_.-]+\.json$/.test(file) || file.includes('private'))) throw new Error('Accepted checkpoint public file set invalid')
  for (const file of paths) {
    const record = checkpoint.files[file]
    if (record.digest !== surveyorReportDigest(record.content)) throw new Error(`Accepted checkpoint file digest mismatch: ${file}`)
  }
  const state = checkpoint.files[allowedPaths[0]].content
  if (state.checkedAt !== checkpoint.checkedAt || !Object.keys(state.accepted ?? {}).length || Object.keys(state.pending ?? {}).length) throw new Error('Accepted checkpoint contains unaccepted watch state')
  return checkpoint
}
