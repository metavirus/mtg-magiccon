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
  void search
  void development
  void previewBuild
  storage.removeItem(AUTH_MODE_KEY)
  return true
}

export function authRedirectUrl(location: Pick<Location, 'href'>) {
  const redirect = new URL(location.href)
  redirect.search = '?auth=1'
  redirect.hash = ''
  return redirect.toString()
}
