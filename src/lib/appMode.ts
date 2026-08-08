export const AUTH_MODE_KEY = 'magiccon:app-mode:v1'

type ModeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function resolveDesignPreviewMode({
  search,
  development,
  previewBuild,
  storage,
}: {
  search: string
  development: boolean
  previewBuild: boolean
  storage: ModeStorage
}) {
  const params = new URLSearchParams(search)

  if (params.get('preview') === '1') {
    storage.removeItem(AUTH_MODE_KEY)
    return true
  }

  if (params.get('auth') === '1') {
    storage.setItem(AUTH_MODE_KEY, 'authenticated')
    return false
  }

  if (storage.getItem(AUTH_MODE_KEY) === 'authenticated') return false

  return previewBuild || !development
}

export function authRedirectUrl(location: Pick<Location, 'href'>) {
  const redirect = new URL(location.href)
  redirect.search = '?auth=1'
  redirect.hash = ''
  return redirect.toString()
}
