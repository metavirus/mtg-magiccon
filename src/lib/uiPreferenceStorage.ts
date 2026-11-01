/** Chrome only: inability to remember a view/filter must never crash a page.
 * Account data must use the verified offline boundary, never this wrapper. */
export const uiPreferenceStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(key) { try { return localStorage.getItem(key) } catch { return null } },
  setItem(key, value) { try { localStorage.setItem(key, value) } catch { /* Optional UI preference. */ } },
  removeItem(key) { try { localStorage.removeItem(key) } catch { /* Optional UI preference. */ } },
}
