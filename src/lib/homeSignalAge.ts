const DAY_MS = 24 * 60 * 60 * 1000

export type HomeSignalAgeBucket = 'recent' | 'earlier'

export function homeSignalAgeBucket(checkedAtIso: string, now = Date.now()): HomeSignalAgeBucket | null {
  const checkedAt = new Date(checkedAtIso).getTime()
  if (!Number.isFinite(checkedAt)) return null
  const ageDays = Math.max(0, now - checkedAt) / DAY_MS
  if (ageDays <= 3) return 'recent'
  if (ageDays <= 14) return 'earlier'
  return null
}
