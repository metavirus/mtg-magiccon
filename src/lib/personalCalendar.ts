export type PersonalCalendarEvent = {
  id: string; owner_id: string; title: string; event_date: string; start_time: string; end_time: string
  visibility: 'private' | 'shared'; invited_user_ids: string[]; updated_at: string
}
export type PersonalCalendarDraft = Pick<PersonalCalendarEvent, 'title' | 'event_date' | 'start_time' | 'end_time' | 'visibility' | 'invited_user_ids'>
export const personalCalendarFields = 'id,owner_id,title,event_date,start_time,end_time,visibility,invited_user_ids,updated_at'
export const personalCalendarObjectId = (id: string) => `personal-calendar:${id}`
export function validatePersonalCalendarEvent(draft: PersonalCalendarDraft): string | null {
  if (!draft.title.trim() || draft.title.trim().length > 160) return 'Enter a title of 1–160 characters.'
  const parsed = new Date(`${draft.event_date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.event_date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.event_date) return 'Choose a valid date.'
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/
  if (!time.test(draft.start_time) || !time.test(draft.end_time)) return 'Choose start and end times.'
  if (draft.end_time.slice(0, 5) <= draft.start_time.slice(0, 5)) return 'End time must be after start time on the same day.'
  return null
}
export function canReadPersonalCalendarEvent(event: PersonalCalendarEvent, userId: string | undefined, activeCompanion: boolean) {
  return Boolean(userId && (event.owner_id === userId || activeCompanion && (event.visibility === 'shared' || event.invited_user_ids.includes(userId))))
}
export function personalCalendarTime(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}
