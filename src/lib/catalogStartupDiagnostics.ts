/** Local DOM diagnostics for an explicitly requested startup investigation.
 * No payload, identity, message text, network request or telemetry is recorded. */
export function catalogStartupDiagnostics() {
  const enabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa')?.split(',').includes('startup')
  if (!enabled) return (_phase: string, _error?: unknown) => {}
  const root = document.documentElement
  for (const attribute of [...root.attributes]) {
    if (attribute.name.startsWith('data-startup-catalog-read-')) root.removeAttribute(attribute.name)
  }
  return (phase: string, error?: unknown) => {
    const now = String(Math.round(performance.now()))
    root.setAttribute('data-startup-catalog-read-phase', phase)
    root.setAttribute('data-startup-catalog-read-ms', now)
    const stage = phase.replace(/-(?:pending|ready|error|unavailable)$/, '')
    root.setAttribute(`data-startup-catalog-read-${stage}-state`, phase.slice(stage.length + 1) || phase)
    root.setAttribute(`data-startup-catalog-read-${stage}-ms`, now)
    if (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
      root.setAttribute('data-startup-catalog-read-error-code', typeof code === 'string' && /^(?:PGRST[0-9]{3}|[0-9A-Z]{5})$/.test(code) ? code : 'READ_FAILED')
    }
  }
}
