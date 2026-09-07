import { useCallback, useEffect, useRef, useState } from 'react'

const historyKey = 'magicconNavigation'

/** App buttons and native history share the same route transition. */
export function useHashNavigation(onRouteChange: (hash: string) => void) {
  const onChange = useRef(onRouteChange)
  onChange.current = onRouteChange
  const currentHash = useRef(window.location.hash)
  const position = useRef(0)
  const session = useRef(`navigation-${Date.now()}-${Math.random()}`)
  const [canGoBack, setCanGoBack] = useState(false)

  const stampEntry = useCallback(() => {
    window.history.replaceState({ ...window.history.state, [historyKey]: { session: session.current, position: position.current } }, '')
  }, [])

  const syncRoute = useCallback(() => {
    currentHash.current = window.location.hash
    setCanGoBack(position.current > 0)
    onChange.current(window.location.hash)
  }, [])

  useEffect(() => {
    stampEntry()
    const handleLocationChange = () => {
      // A native traversal can emit both popstate and hashchange.
      if (currentHash.current === window.location.hash) return
      const entry = window.history.state?.[historyKey]
      if (entry?.session === session.current) position.current = entry.position
      else {
        // Ordinary hash links create entries without our app metadata.
        position.current += 1
        stampEntry()
      }
      syncRoute()
    }
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [stampEntry, syncRoute])

  const navigate = useCallback((hash: string) => {
    if (window.location.hash !== hash) {
      position.current += 1
      window.history.pushState({ [historyKey]: { session: session.current, position: position.current } }, '', `${window.location.pathname}${window.location.search}${hash}`)
    }
    syncRoute()
  }, [syncRoute])

  const goBack = useCallback(() => {
    if (position.current > 0) window.history.back()
  }, [])

  return { navigate, goBack, canGoBack }
}
