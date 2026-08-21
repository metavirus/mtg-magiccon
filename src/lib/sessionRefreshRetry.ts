type RequestResult = {
  error: unknown
  status: number
}

type RefreshResult = {
  error: unknown
}

export async function retryOnceAfterUnauthorized<T extends RequestResult>(
  request: () => PromiseLike<T>,
  refreshSession: () => PromiseLike<RefreshResult>,
): Promise<T> {
  let result = await request()

  if (result.error && result.status === 401) {
    const refreshed = await refreshSession()
    if (!refreshed.error) result = await request()
  }

  return result
}
