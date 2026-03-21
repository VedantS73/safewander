import { useEffect, useRef, useState } from 'react'
import { useGeolocation } from '../../../hooks/useGeolocation'
import { useReverseGeocode } from '../../../hooks/useReverseGeocode'
import { AlertsSidebar } from './AlertsSidebar'
import { ExploreMapCanvas, type LayerToggles } from './ExploreMapCanvas'
import { LocationSafetyCard } from './LocationSafetyCard'
import { SafeHavenLayerFilters } from './SafeHavenLayerFilters'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

/** Demo score until your API returns a real value */
const DEMO_SAFETY_SCORE = 88

function defaultAlertsOpen(): boolean {
  if (typeof window === 'undefined') return true
  return !window.matchMedia('(max-width: 640px)').matches
}

function defaultIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 640px)').matches
}

export function ExploreEntryView() {
  const { coords, error: geoError, loading: coordsLoading } = useGeolocation()
  const lng = coords?.longitude ?? null
  const lat = coords?.latitude ?? null

  const { address, loading: addressLoading } = useReverseGeocode(lng, lat, MAPBOX_TOKEN)

  const [layers, setLayers] = useState<LayerToggles>({
    police: false,
    hospitals: false,
    cameras: false,
  })

  const [alertsOpen, setAlertsOpen] = useState(defaultAlertsOpen)
  const [isMobile, setIsMobile] = useState(defaultIsMobile)
  const alertsContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    setIsMobile(media.matches)
    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    if (!alertsOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      const container = alertsContainerRef.current
      if (!target || !container) return
      if (!container.contains(target)) {
        setAlertsOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [alertsOpen])

  const resolvedAddress =
    MAPBOX_TOKEN
      ? address
      : lng != null && lat != null
        ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        : null

  return (
    <div className="explore-entry flex min-h-0 flex-1 flex-col">
      <div className="explore-entry__map">
        <ExploreMapCanvas accessToken={MAPBOX_TOKEN} lng={lng} lat={lat} layers={layers} />
      </div>

      <div className="explore-entry__overlay pointer-events-none">
        <div className={`explore-entry__left pointer-events-auto ${isMobile && alertsOpen ? 'hidden' : ''}`}>
          <LocationSafetyCard
            address={resolvedAddress}
            addressLoading={Boolean(MAPBOX_TOKEN && addressLoading)}
            coordsLoading={coordsLoading}
            geoError={geoError}
            safetyScore={DEMO_SAFETY_SCORE}
          />
          <SafeHavenLayerFilters layers={layers} onChange={setLayers} />
        </div>

        <div
          ref={alertsContainerRef}
          className={`explore-entry__right pointer-events-auto ${isMobile && alertsOpen ? 'explore-entry__right--mobile-open' : ''}`}
        >
          <AlertsSidebar isMobile={isMobile} open={alertsOpen} onToggle={() => setAlertsOpen((o) => !o)} />
        </div>
      </div>
    </div>
  )
}
