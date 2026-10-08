import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

export const DEFAULT_EMAIL_LEDGER_PATH = '.surveyor-runtime/email-delivery.json'

export async function loadEmailDeliveryLedger(ledgerPath) {
  let ledger
  try { ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8')) }
  catch (error) {
    if (error.code === 'ENOENT') return { version: 1, deliveries: {} }
    throw new Error('Email delivery ledger cannot be read; refusing to send.', { cause: error })
  }
  if (ledger.version !== 1 || !ledger.deliveries || typeof ledger.deliveries !== 'object' || Array.isArray(ledger.deliveries)) {
    throw new Error('Email delivery ledger is invalid; refusing to send.')
  }
  if (Object.values(ledger.deliveries).some(entry => !entry || !['sending', 'uncertain', 'retryable', 'delivered'].includes(entry.status)
    || typeof entry.messageId !== 'string' || (entry.status === 'delivered' && typeof entry.receiptMessageId !== 'string'))) {
    throw new Error('Email delivery ledger contains an invalid receipt; refusing to send.')
  }
  return ledger
}

export async function saveEmailDeliveryLedger(ledgerPath, ledger) {
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  const temporaryPath = `${ledgerPath}.${randomUUID()}.tmp`
  try {
    const handle = await fs.open(temporaryPath, 'wx')
    try { await handle.writeFile(`${JSON.stringify(ledger, null, 2)}\n`); await handle.sync() }
    finally { await handle.close() }
    await fs.rename(temporaryPath, ledgerPath)
  } finally { await fs.rm(temporaryPath, { force: true }) }
}

export function stableAlertMessageId(alertKey) {
  return `<magiccon-${createHash('sha256').update(alertKey).digest('hex')}@notifications.invalid>`
}

// Only an explicit negative SMTP reply proves this attempt was not accepted.
// A timeout/disconnect after DATA may have delivered the mail despite the error.
function explicitlyRejected(error) {
  return Number.isInteger(error.responseCode) && error.responseCode >= 400 && error.responseCode <= 599
}

export async function deliverTicketedPlayAvailabilityEmails({
  alerts, sendMail, from, to, ledgerPath = DEFAULT_EMAIL_LEDGER_PATH,
  loadLedger = loadEmailDeliveryLedger, saveLedger = saveEmailDeliveryLedger,
  now = () => new Date().toISOString(),
}) {
  const ledger = await loadLedger(ledgerPath)
  const result = { sent: [], skipped: [] }
  for (const alert of alerts) {
    const existing = ledger.deliveries[alert.alertKey]
    if (existing?.status === 'delivered') { result.skipped.push(alert.alertKey); continue }
    if (existing && existing.status !== 'retryable') {
      throw new Error(`Email delivery uncertain for ${alert.alertKey}; refusing automatic resend. Reconcile the retained ledger and SMTP delivery before retrying.`)
    }
    const messageId = stableAlertMessageId(alert.alertKey)
    ledger.deliveries[alert.alertKey] = { status: 'sending', messageId, attemptedAt: now() }
    // Failure here prevents SMTP. Failure after SMTP leaves this durable sending
    // marker, which blocks a blind retry even if the final receipt cannot save.
    await saveLedger(ledgerPath, ledger)
    let receipt
    try {
      receipt = await sendMail({ from, to, subject: alert.subject, text: alert.text, messageId,
        headers: { 'X-MagicCon-Alert-Key': alert.alertKey } })
    } catch (error) {
      ledger.deliveries[alert.alertKey] = { ...ledger.deliveries[alert.alertKey],
        status: explicitlyRejected(error) ? 'retryable' : 'uncertain', completedAt: now() }
      await saveLedger(ledgerPath, ledger)
      throw new Error(`Email delivery ${ledger.deliveries[alert.alertKey].status} for ${alert.alertKey}. Baseline must not advance.`)
    }
    if (!receipt?.messageId || !Array.isArray(receipt.accepted) || receipt.accepted.length === 0 || receipt.rejected?.length) {
      ledger.deliveries[alert.alertKey] = { ...ledger.deliveries[alert.alertKey], status: 'uncertain', completedAt: now() }
      await saveLedger(ledgerPath, ledger)
      throw new Error(`Email delivery uncertain for ${alert.alertKey}; SMTP receipt did not confirm all recipients. Baseline must not advance.`)
    }
    ledger.deliveries[alert.alertKey] = { ...ledger.deliveries[alert.alertKey], status: 'delivered',
      deliveredAt: now(), receiptMessageId: receipt.messageId }
    await saveLedger(ledgerPath, ledger)
    result.sent.push(receipt.messageId)
  }
  return result
}
