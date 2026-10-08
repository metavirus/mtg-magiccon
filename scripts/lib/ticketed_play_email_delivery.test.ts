import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { deliverTicketedPlayAvailabilityEmails, loadEmailDeliveryLedger, stableAlertMessageId } from './ticketed_play_email_delivery.mjs'

const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true }))) })
async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'magiccon-email-test-'))
  directories.push(directory)
  return { ledgerPath: path.join(directory, 'email-delivery.json'), from: 'sender@example.test', to: 'recipient@example.test',
    alerts: ['first', 'second'].map(alertKey => ({ alertKey, subject: alertKey, text: 'Synthetic test only' })) }
}
const accepted = (message: any) => ({ messageId: message.messageId, accepted: ['recipient@example.test'], rejected: [] })

describe('durable watched-email delivery', () => {
  it('skips the first delivered mail after the second SMTP rejection and retries only the second', async () => {
    const options = await fixture()
    const sendMail = vi.fn().mockImplementationOnce(accepted).mockRejectedValueOnce({ responseCode: 550 })
    await expect(deliverTicketedPlayAvailabilityEmails({ ...options, sendMail })).rejects.toThrow('retryable')
    const retry = vi.fn(accepted)
    const result = await deliverTicketedPlayAvailabilityEmails({ ...options, sendMail: retry })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(retry.mock.calls[0][0].subject).toBe('second')
    expect(result.skipped).toEqual(['first'])
    expect((await loadEmailDeliveryLedger(options.ledgerPath)).deliveries.second.status).toBe('delivered')
  })

  it('retains uncertain transport delivery and never resends it automatically', async () => {
    const options = await fixture()
    options.alerts = options.alerts.slice(0, 1)
    await expect(deliverTicketedPlayAvailabilityEmails({ ...options, sendMail: vi.fn().mockRejectedValue({ code: 'ETIMEDOUT' }) })).rejects.toThrow('uncertain')
    const resend = vi.fn(accepted)
    await expect(deliverTicketedPlayAvailabilityEmails({ ...options, sendMail: resend })).rejects.toThrow('refusing automatic resend')
    expect(resend).not.toHaveBeenCalled()
  })

  it('writes sending before SMTP and blocks a retry if the delivered receipt cannot persist', async () => {
    const options = await fixture()
    options.alerts = options.alerts.slice(0, 1)
    const { saveEmailDeliveryLedger } = await import('./ticketed_play_email_delivery.mjs')
    let saves = 0
    const sendMail = vi.fn(async (message: any) => {
      expect((await loadEmailDeliveryLedger(options.ledgerPath)).deliveries.first.status).toBe('sending')
      expect(message.messageId).toBe(stableAlertMessageId('first'))
      return accepted(message)
    })
    await expect(deliverTicketedPlayAvailabilityEmails({ ...options, sendMail,
      saveLedger: async (file: string, ledger: any) => { if (++saves === 2) throw new Error('Synthetic disk failure'); await saveEmailDeliveryLedger(file, ledger) },
    })).rejects.toThrow('Synthetic disk failure')
    const resend = vi.fn(accepted)
    await expect(deliverTicketedPlayAvailabilityEmails({ ...options, sendMail: resend })).rejects.toThrow('uncertain')
    expect(resend).not.toHaveBeenCalled()
  })

  it('does not send if the pre-SMTP ledger write fails', async () => {
    const options = await fixture()
    const sendMail = vi.fn(accepted)
    await expect(deliverTicketedPlayAvailabilityEmails({ ...options, sendMail, saveLedger: async () => { throw new Error('Synthetic disk failure') } })).rejects.toThrow('Synthetic disk failure')
    expect(sendMail).not.toHaveBeenCalled()
  })
})
