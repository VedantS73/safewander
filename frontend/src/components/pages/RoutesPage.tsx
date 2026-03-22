import { Alert, Button, Input, Segmented, Spin } from 'antd'
import { AimOutlined, EnvironmentOutlined, FlagOutlined, CompassOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { RoutesMapCanvas } from '../routes/RoutesMapCanvas'
import {
  fetchDrivingRouteAlternatives,
  forwardGeocode,
  haversineMeters,
  pickRouteByMode,
  reverseGeocode,
  type LngLat,
  type RouteCandidate,
  type RouteModeKey,
} from '../../lib/mapboxRouting'
import type { NearbyCrimeEvent } from '../../types/crimeEvents'

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const TAB_OPTIONS: { label: string; value: RouteModeKey }[] = [
  { label: 'Safest Route', value: 'safest' },
  { label: 'Fastest Route', value: 'fastest' },
  { label: 'Balanced Route', value: 'balanced' },
]

async function fetchCrimesAlongCorridor(start: LngLat, end: LngLat): Promise<NearbyCrimeEvent[]> {
  const midLat = (start[1] + end[1]) / 2
  const midLng = (start[0] + end[0]) / 2
  const halfChordKm = haversineMeters(start, end) / 1000 / 2
  const radiusKm = Math.min(100, Math.max(12, halfChordKm + 12))
  try {
    const res = await fetch(
      `${API_BASE}/crime-events/nearby?latitude=${encodeURIComponent(String(midLat))}&longitude=${encodeURIComponent(String(midLng))}&radius_km=${encodeURIComponent(String(radiusKm))}`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as { events?: NearbyCrimeEvent[] }
    return data.events ?? []
  } catch {
    return []
  }
}

export function RoutesPage() {
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [locatingFrom, setLocatingFrom] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [start, setStart] = useState<LngLat | null>(null)
  const [end, setEnd] = useState<LngLat | null>(null)
  const [route, setRoute] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null)
  const [routeMode, setRouteMode] = useState<RouteModeKey>('fastest')
  const [routeCandidates, setRouteCandidates] = useState<RouteCandidate[] | null>(null)
  const [corridorCrimes, setCorridorCrimes] = useState<NearbyCrimeEvent[]>([])

  const hasRoute = useMemo(() => route != null && start != null && end != null, [route, start, end])

  const fillCurrentLocationAsFrom = useCallback(async () => {
    if (!TOKEN) {
      setError('Mapbox token missing. Set VITE_MAPBOX_ACCESS_TOKEN in .env')
      return
    }
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }
    setLocatingFrom(true)
    setError(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        })
      })
      const lng = pos.coords.longitude
      const lat = pos.coords.latitude
      const label = await reverseGeocode(lng, lat, TOKEN)
      setFromQuery(label)
    } catch (e: unknown) {
      let msg = 'Could not get your location.'
      if (e && typeof e === 'object' && 'code' in e) {
        const code = (e as GeolocationPositionError).code
        msg =
          code === 1
            ? 'Location permission denied. Allow location access to use this.'
            : (e as GeolocationPositionError).message || msg
      } else if (e instanceof Error) {
        msg = e.message
      }
      setError(msg)
    } finally {
      setLocatingFrom(false)
    }
  }, [TOKEN])

  const onNavigate = useCallback(async () => {
    if (!TOKEN) {
      setError('Mapbox token missing. Set VITE_MAPBOX_ACCESS_TOKEN in .env')
      return
    }
    const a = fromQuery.trim()
    const b = toQuery.trim()
    if (!a || !b) {
      setError('Enter both where you are and where you’re going.')
      return
    }

    setLoading(true)
    setError(null)
    setRoute(null)
    setStart(null)
    setEnd(null)
    setRouteCandidates(null)
    setCorridorCrimes([])

    try {
      const [s, e] = await Promise.all([forwardGeocode(a, TOKEN), forwardGeocode(b, TOKEN)])
      setStart(s)
      setEnd(e)

      const [crimes, candidates] = await Promise.all([
        fetchCrimesAlongCorridor(s, e),
        fetchDrivingRouteAlternatives(s, e, TOKEN),
      ])

      setCorridorCrimes(crimes)
      setRouteCandidates(candidates)
      setRoute(pickRouteByMode(candidates, routeMode, crimes))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStart(null)
      setEnd(null)
      setRoute(null)
      setRouteCandidates(null)
      setCorridorCrimes([])
    } finally {
      setLoading(false)
    }
  }, [fromQuery, toQuery, routeMode])

  useEffect(() => {
    if (!routeCandidates?.length || start == null || end == null) return
    setRoute(pickRouteByMode(routeCandidates, routeMode, corridorCrimes))
  }, [routeMode, routeCandidates, corridorCrimes, start, end])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="space-y-2">
          <Input
            size="large"
            placeholder="Where am I? (address or place)"
            value={fromQuery}
            onChange={(e) => setFromQuery(e.target.value)}
            prefix={<EnvironmentOutlined className="text-green-600" />}
            disabled={loading}
            suffix={
              <Button
                type="text"
                size="small"
                className="!mr-[-4px] shrink-0"
                icon={<AimOutlined />}
                loading={locatingFrom}
                disabled={loading}
                onClick={() => void fillCurrentLocationAsFrom()}
                aria-label="Use current location"
                title="Use current location"
              />
            }
          />
          <Input
            size="large"
            placeholder="Where to go? (address or place)"
            value={toQuery}
            onChange={(e) => setToQuery(e.target.value)}
            prefix={<FlagOutlined className="text-red-500" />}
            disabled={loading}
          />
        </div>
        <Button type="primary" size="large" block icon={<CompassOutlined />} loading={loading} onClick={() => void onNavigate()}>
          Navigate
        </Button>
        {error && (
          <Alert type="warning" showIcon title={error} className="!text-sm" />
        )}
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-100">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <Spin size="large" description="Finding route…" />
          </div>
        )}
        <RoutesMapCanvas accessToken={TOKEN} route={route} start={start} end={end} routeMode={routeMode} />

        {hasRoute && (
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-sm">
            <Segmented<RouteModeKey>
              block
              size="large"
              value={routeMode}
              onChange={(v) => setRouteMode(v)}
              options={TAB_OPTIONS}
            />
            <p className="mt-2 text-center text-xs text-slate-500">
              <strong>Fastest</strong> minimizes drive time. <strong>Safest</strong> prefers routes farther from nearby{' '}
              <code className="rounded bg-slate-100 px-0.5 text-[10px]">crime_events</code> when Mapbox offers alternatives.{' '}
              <strong>Balanced</strong> mixes time and exposure.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
