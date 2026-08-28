import type { NavIconName } from '../NavIcon'

export type Surface = 'home' | 'calendar' | 'plan' | 'explore' | 'map' | 'info' | 'wallet' | 'trip' | 'artists' | 'notes' | 'activity'
export type MobileNavigationGroup = 'events' | 'more'

export type NavigationDestination = {
  name: string
  icon: NavIconName
  surface: Surface
  desktopPlacement: 'primary' | 'footer'
  mobileGroup?: MobileNavigationGroup
  mobileNote?: string
}

export const navigationDestinations: NavigationDestination[] = [
  { name: 'Home', icon: 'home', surface: 'home', desktopPlacement: 'primary' },
  { name: 'Explore', icon: 'explore', surface: 'explore', desktopPlacement: 'primary', mobileGroup: 'events', mobileNote: 'Discover' },
  { name: 'Plan', icon: 'plan', surface: 'plan', desktopPlacement: 'primary', mobileGroup: 'events', mobileNote: 'Compare' },
  { name: 'Calendar', icon: 'calendar', surface: 'calendar', desktopPlacement: 'primary', mobileGroup: 'events', mobileNote: 'Agenda' },
  { name: 'Map', icon: 'map', surface: 'map', desktopPlacement: 'primary' },
  { name: 'Info', icon: 'info', surface: 'info', desktopPlacement: 'primary' },
  { name: 'Wallet', icon: 'wallet', surface: 'wallet', desktopPlacement: 'primary', mobileGroup: 'more', mobileNote: 'Passes & receipts' },
  { name: 'Trip', icon: 'trip', surface: 'trip', desktopPlacement: 'primary', mobileGroup: 'more', mobileNote: 'Hotels & flights' },
  { name: 'Artists', icon: 'artists', surface: 'artists', desktopPlacement: 'primary', mobileGroup: 'more', mobileNote: 'Signing plans' },
  { name: 'Notes', icon: 'notes', surface: 'notes', desktopPlacement: 'primary', mobileGroup: 'more', mobileNote: 'Shared context' },
  { name: 'Activity', icon: 'activity', surface: 'activity', desktopPlacement: 'footer', mobileGroup: 'more', mobileNote: 'Signals & changes' },
]

export const surfaces = navigationDestinations.map(destination => destination.surface)
export const primaryDestinations = navigationDestinations.filter(destination => destination.desktopPlacement === 'primary')
export const activityDestination = navigationDestinations.find(destination => destination.surface === 'activity')!

export function mobileDrawerDestinations(group: MobileNavigationGroup) {
  return navigationDestinations.filter(destination => destination.mobileGroup === group)
}

export function navigationDestination(surface: Surface) {
  return navigationDestinations.find(destination => destination.surface === surface)!
}
