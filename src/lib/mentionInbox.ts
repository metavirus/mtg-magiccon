export function partitionMentionInboxItems<T extends { dismissedAt: string | null }>(items: T[]) {
  return {
    active: items.filter(item => !item.dismissedAt),
    dismissed: items.filter(item => Boolean(item.dismissedAt)),
  }
}
