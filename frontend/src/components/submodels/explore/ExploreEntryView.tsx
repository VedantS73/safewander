import { useEffect, useRef, useState } from 'react'
import { useGeolocation } from '../../../hooks/useGeolocation'
import { useReverseGeocode } from '../../../hooks/useReverseGeocode'
import type { NearbyPlace } from '../../../types/places'
import { AlertsSidebar } from './AlertsSidebar'
import { ExploreMapCanvas, type LayerToggles } from './ExploreMapCanvas'
import { LocationSafetyCard } from './LocationSafetyCard'
import { SafeHavenLayerFilters } from './SafeHavenLayerFilters'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

/** Search radius for safe haven points from the backend (km). */
const NEARBY_RADIUS_KM = 15

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

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState<string | null>(null)

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

  useEffect(() => {
    if (lat == null || lng == null) {
      setNearbyPlaces([])
      setPlacesError(null)
      return
    }

    const controller = new AbortController()
    setPlacesLoading(true)
    setPlacesError(null)

    const url = `${API_BASE}/places/nearby?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&radius_km=${NEARBY_RADIUS_KM}`

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Could not load nearby places')
        return r.json() as Promise<{ places: NearbyPlace[] }>
      })
      .then((data) => setNearbyPlaces(data.places ?? []))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return
        setPlacesError(e.message)
        setNearbyPlaces([])
      })
      .finally(() => setPlacesLoading(false))

    return () => controller.abort()
  }, [lat, lng])

  const resolvedAddress =
    MAPBOX_TOKEN
      ? address
      : lng != null && lat != null
        ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        : null

  return (
    <div className="explore-entry flex min-h-0 flex-1 flex-col">
      <div className="explore-entry__map">
        <ExploreMapCanvas
          accessToken={MAPBOX_TOKEN}
          lng={lng}
          lat={lat}
          layers={layers}
          places={nearbyPlaces}
        />
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
          <SafeHavenLayerFilters
            layers={layers}
            onChange={setLayers}
            placesLoading={placesLoading}
            placesError={placesError}
            nearbyCount={nearbyPlaces.length}
          />
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
