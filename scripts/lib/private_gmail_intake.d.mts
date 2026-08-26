export type PrivateIntakeResult =
  | { status: 'covered'; kind: 'receipt' | 'flight'; sourceMessageId: string; operation: any }
  | { status: 'not_covered'; kind: string; sourceMessageId: string | null; reason: string }

export function planPrivateGmailIntake(message: unknown): PrivateIntakeResult
export function summarizePrivateIntake(result: PrivateIntakeResult): Record<string, unknown>
