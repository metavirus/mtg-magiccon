import fs from 'node:fs/promises'
import nodemailer from 'nodemailer'
import { planTicketedPlayAvailabilityEmails } from './lib/ticketed_play_email_alert.mjs'

const [reportPath, closurePath] = process.argv.slice(2)
if (!reportPath || !closurePath) throw new Error('Usage: node scripts/send_ticketed_availability_alert.mjs <monitor-report.json> <closure-manifest.json>')

const [report, closure] = await Promise.all([
  fs.readFile(reportPath, 'utf8').then(JSON.parse),
  fs.readFile(closurePath, 'utf8').then(JSON.parse),
])
const alerts = planTicketedPlayAvailabilityEmails(report, closure)
if (!alerts.length) {
  console.log('Ticketed Play availability email: QUIET (no verified watched reopening)')
  process.exit(0)
}

const username = process.env.ALERT_GMAIL_USERNAME
const password = process.env.ALERT_GMAIL_APP_PASSWORD
const to = process.env.ALERT_EMAIL_TO
if (!username || !password || !to) {
  throw new Error('A watched Ticketed Play event reopened, but ALERT_GMAIL_USERNAME, ALERT_GMAIL_APP_PASSWORD, and ALERT_EMAIL_TO are not all configured. Baseline must not advance.')
}

const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: username, pass: password } })
const messageIds = []
for (const alert of alerts) {
  const result = await transporter.sendMail({
    from: username,
    to,
    subject: alert.subject,
    text: alert.text,
    headers: { 'X-MagicCon-Alert-Key': alert.alertKey },
  })
  if (!result.messageId) throw new Error(`Gmail accepted no message ID for Ticketed Play alert ${alert.alertKey}. Baseline must not advance.`)
  messageIds.push(result.messageId)
}
console.log(`Ticketed Play availability email: SENT (${messageIds.length} message${messageIds.length === 1 ? '' : 's'}: ${messageIds.join(', ')})`)
