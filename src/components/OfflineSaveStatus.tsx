import { useEffect, useState } from 'react'
import { getOfflineLaneStatuses, OFFLINE_LANE_STATUS_EVENT, retryFailedOfflineLanes } from '../lib/offlineLaneCache'
import './ArtistAssetStatus.css'
import './OfflineSaveStatus.css'

/** Failure-only: a rendered server result is not a verified device copy. */
export function OfflineSaveStatus({ ownerId, identityFailed = false, onRetryIdentity }: {
  ownerId?: string
  identityFailed?: boolean
  onRetryIdentity?: () => void
}) {
  const [, refresh] = useState(0)
  const [retryOwner, setRetryOwner] = useState<string>()
  const retrying = Boolean(ownerId && retryOwner === ownerId)
  useEffect(() => {
    const update = () => refresh(value => value + 1)
    window.addEventListener(OFFLINE_LANE_STATUS_EVENT, update)
    return () => window.removeEventListener(OFFLINE_LANE_STATUS_EVENT, update)
  }, [])
  // Read by the current owner on every render; never carry another account's failure.
  const failed = ownerId && getOfflineLaneStatuses(ownerId).some(row => row.status === 'failed')
  if (!ownerId || (!failed && !identityFailed && !retrying)) return null
  return <div className="artist-asset-status offline-save-status" role="status">
    <small>{identityFailed ? 'Offline access couldn’t be saved on this device.' : 'Some content isn’t available offline.'}</small>
    <button type="button" disabled={retrying} onClick={() => {
      setRetryOwner(ownerId)
      if (identityFailed) onRetryIdentity?.()
      void retryFailedOfflineLanes(ownerId).finally(() => setRetryOwner(current => current === ownerId ? undefined : current))
    }}>{retrying ? 'Retrying…' : 'Retry'}</button>
  </div>
}
