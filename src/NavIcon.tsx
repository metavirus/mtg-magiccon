import type { ReactNode } from 'react'

export type NavIconName = 'home' | 'calendar' | 'plan' | 'explore' | 'map' | 'wallet' | 'trip' | 'notes' | 'activity'

const paths: Record<NavIconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  plan: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v18M8 9h13M8 15h13"/></>,
  explore: <><path d="m12 3-1.2 3.8a5.7 5.7 0 0 1-4 4L3 12l3.8 1.2a5.7 5.7 0 0 1 4 4L12 21l1.2-3.8a5.7 5.7 0 0 1 4-4L21 12l-3.8-1.2a5.7 5.7 0 0 1-4-4Z"/><path d="m19 3-.35 1.15a2.2 2.2 0 0 1-1.5 1.5L16 6l1.15.35a2.2 2.2 0 0 1 1.5 1.5L19 9l.35-1.15a2.2 2.2 0 0 1 1.5-1.5L22 6l-1.15-.35a2.2 2.2 0 0 1-1.5-1.5Z"/></>,
  map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3Z"/><path d="M8 3v15M16 6v15"/></>,
  wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a2 2 0 0 1 2 2v13H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3"/><path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z"/><path d="M16 13.5h.01"/></>,
  trip: <><path d="M22 2 9.5 14.5"/><path d="m22 2-7 20-4-8-8-4Z"/></>,
  notes: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  activity: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
}

export function NavIcon({ name }: { name: NavIconName }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
