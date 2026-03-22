import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import type { LngLat, RouteModeKey } from '../../lib/mapboxRouting'

const ROUTE_SOURCE = 'routes-page-line'
const ROUTE_LAYER = 'routes-page-line-layer'

export type { RouteModeKey }

/** ~city / town area when centering on the user (no route yet). */
export const MY_LOCATION_PREVIEW_ZOOM = 11

type Props = {
  accessToken: string | undefined
  route: GeoJSON.Feature<GeoJSON.LineString> | null
  start: LngLat | null
  end: LngLat | null
  routeMode: RouteModeKey
  /** Live GPS / “where I am” — shown as its own marker, independent of routed start/end. */
  myLocation: LngLat | null
  /** Right-click: pass clicked lng/lat (e.g. fill “Where to go?”). */
  onRightClickLngLat?: (coords: LngLat) => void
}

const MODE_COLORS: Record<RouteModeKey, string> = {
  fastest: '#2563eb',
  safest: '#16a34a',
  balanced: '#d97706',
}

const DEFAULT_CENTER: [number, number] = [14.5, 52.0]
const DEFAULT_ZOOM = 3.35

export function RoutesMapCanvas({
  accessToken,
  route,
  start,
  end,
  routeMode,
  myLocation,
  onRightClickLngLat,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const myLocationMarkerRef = useRef<mapboxgl.Marker | null>(null)
  /** Only auto-fly to the user once at ~city zoom when there’s no route to frame. */
  const didFlyToMyLocationRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!accessToken || !containerRef.current) return

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }),
      'bottom-right',
    )

    map.on('load', () => {
      map.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MODE_COLORS.fastest,
          'line-width': 5,
          'line-opacity': 0.9,
        },
      })
      setMapReady(true)
    })

    mapRef.current = map
    return () => {
      setMapReady(false)
      startMarkerRef.current?.remove()
      endMarkerRef.current?.remove()
      myLocationMarkerRef.current?.remove()
      startMarkerRef.current = null
      endMarkerRef.current = null
      myLocationMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [accessToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const src = map.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined
    if (!src) return

    if (route) {
      src.setData(route)
    } else {
      src.setData({ type: 'FeatureCollection', features: [] })
    }

    if (map.getLayer(ROUTE_LAYER)) {
      map.setPaintProperty(ROUTE_LAYER, 'line-color', MODE_COLORS[routeMode])
    }

    startMarkerRef.current?.remove()
    endMarkerRef.current?.remove()
    startMarkerRef.current = null
    endMarkerRef.current = null

    if (start) {
      startMarkerRef.current = new mapboxgl.Marker({ color: '#22c55e' }).setLngLat(start).addTo(map)
    }
    if (end) {
      endMarkerRef.current = new mapboxgl.Marker({ color: '#dc2626' }).setLngLat(end).addTo(map)
    }

    const framingRoute = Boolean(route?.geometry?.coordinates?.length)
    if (framingRoute) {
      didFlyToMyLocationRef.current = true
      const coords = route!.geometry!.coordinates as [number, number][]
      const bounds = new mapboxgl.LngLatBounds()
      for (const c of coords) {
        bounds.extend(c)
      }
      map.fitBounds(bounds, { padding: { top: 96, bottom: 96, left: 48, right: 48 }, maxZoom: 15, duration: 800 })
    } else if (start && end) {
      didFlyToMyLocationRef.current = true
      const bounds = new mapboxgl.LngLatBounds(start, end)
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 })
    }
  }, [mapReady, route, start, end, routeMode])

  // GPS dot + one-time city-level pan to the user (does not re-run when only route markers change).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const framingRoute = Boolean(route?.geometry?.coordinates?.length)
    const framingTwo = Boolean(start && end)

    if (myLocation) {
      if (!myLocationMarkerRef.current) {
        myLocationMarkerRef.current = new mapboxgl.Marker({ color: '#0ea5e9' })
          .setLngLat(myLocation)
          .addTo(map)
      } else {
        myLocationMarkerRef.current.setLngLat(myLocation)
      }
    } else {
      myLocationMarkerRef.current?.remove()
      myLocationMarkerRef.current = null
    }

    if (!framingRoute && !framingTwo && myLocation && !didFlyToMyLocationRef.current) {
      map.easeTo({
        center: myLocation,
        zoom: MY_LOCATION_PREVIEW_ZOOM,
        duration: 1100,
      })
      didFlyToMyLocationRef.current = true
    }
  }, [mapReady, myLocation, route, start, end])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !onRightClickLngLat) return

    const handler = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault()
      onRightClickLngLat([e.lngLat.lng, e.lngLat.lat])
    }
    map.on('contextmenu', handler)
    return () => {
      map.off('contextmenu', handler)
    }
  }, [mapReady, onRightClickLngLat])

  if (!accessToken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        <p className="max-w-xs px-4 text-center text-sm">
          Add <code className="rounded bg-slate-200 px-1">VITE_MAPBOX_ACCESS_TOKEN</code> to{' '}
          <code className="rounded bg-slate-200 px-1">.env</code> to show the map and route.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="h-full w-full min-h-[200px]" />
}
