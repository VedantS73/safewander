/**
 * Client-only persistence for the Monitor page (travel timer + trusted contacts).
 */

export const MONITOR_STORAGE_KEYS = {
  travelTimer: 'safewander.monitor.travelTimer.v1',
  trustedContacts: 'safewander.monitor.trustedContacts.v1',
} as const

export type TravelTimerPersist = {
  /** User-facing note, e.g. "I'll be home in 15 mins" */
  message: string
  /** Original duration in minutes (for display) */
  durationMinutes: number
  /** When the timer should fire (epoch ms) */
  endsAt: number
}

export type TrustedContact = {
  id: string
  name: string
  phone?: string
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadTravelTimer(): TravelTimerPersist | null {
  const v = readJson<TravelTimerPersist>(MONITOR_STORAGE_KEYS.travelTimer)
  if (!v || typeof v.endsAt !== 'number' || typeof v.message !== 'string') return null
  return v
}

export function saveTravelTimer(state: TravelTimerPersist | null): void {
  if (state == null) {
    localStorage.removeItem(MONITOR_STORAGE_KEYS.travelTimer)
    return
  }
  localStorage.setItem(MONITOR_STORAGE_KEYS.travelTimer, JSON.stringify(state))
}

export function loadTrustedContacts(): TrustedContact[] {
  const v = readJson<TrustedContact[]>(MONITOR_STORAGE_KEYS.trustedContacts)
  if (!Array.isArray(v)) return []
  return v.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
}

export function saveTrustedContacts(contacts: TrustedContact[]): void {
  localStorage.setItem(MONITOR_STORAGE_KEYS.trustedContacts, JSON.stringify(contacts))
}
