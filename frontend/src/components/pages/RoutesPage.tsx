import { Alert, Button, Input, Segmented, Spin } from 'antd'
import { EnvironmentOutlined, FlagOutlined, CompassOutlined } from '@ant-design/icons'
import { useCallback, useMemo, useState } from 'react'

import { RoutesMapCanvas, type RouteModeKey } from '../routes/RoutesMapCanvas'
import { fetchDrivingRouteGeoJSON, forwardGeocode, type LngLat } from '../../lib/mapboxRouting'

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

const TAB_OPTIONS: { label: string; value: RouteModeKey }[] = [
  { label: 'Safest Route', value: 'safest' },
  { label: 'Fastest Route', value: 'fastest' },
  { label: 'Balanced Route', value: 'balanced' },
]

export function RoutesPage() {
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [start, setStart] = useState<LngLat | null>(null)
  const [end, setEnd] = useState<LngLat | null>(null)
  const [route, setRoute] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null)
  const [routeMode, setRouteMode] = useState<RouteModeKey>('fastest')

  const hasRoute = useMemo(() => route != null && start != null && end != null, [route, start, end])

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

    try {
      const [s, e] = await Promise.all([forwardGeocode(a, TOKEN), forwardGeocode(b, TOKEN)])
      setStart(s)
      setEnd(e)
      const line = await fetchDrivingRouteGeoJSON(s, e, TOKEN)
      setRoute(line)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStart(null)
      setEnd(null)
      setRoute(null)
    } finally {
      setLoading(false)
    }
  }, [fromQuery, toQuery])

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
              Route options use the same path for now; future versions can optimize each mode.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
