/** Publish each fulfilled lane immediately. Failed/obsolete reads leave the
 * last acknowledged snapshot intact and never write a cache for a new owner. */
export async function publishHydrationLane<T>(
  read: Promise<T>,
  isCurrent: () => boolean,
  publish: (value: T) => void,
  failed: () => void,
): Promise<void> {
  try {
    const value = await read
    if (isCurrent()) publish(value)
  } catch {
    if (isCurrent()) failed()
  }
}
