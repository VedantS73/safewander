import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import type { CommunityFeelingPoint } from '../../types/communityFeelings'

type Props = {
  accessToken: string | undefined
  feelings: CommunityFeelingPoint[]
  /** Optional user location for marker + bounds */
  userLng: number | null
  userLat: number | null
}

const SOURCE_ID = 'community-feelings-points'
const LAYER_ID = 'community-feelings-circles'

const DEFAULT_CENTER: [number, number] = [10.45, 51.16]
const DEFAULT_ZOOM = 4.2

function feelingsToGeoJSON(feelings: CommunityFeelingPoint[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = feelings.map((f) => ({
    type: 'Feature' as const,
    id: f.id,
    properties: {
      feeling: f.feeling,
      created_at: f.created_at,
    },
    geometry: { type: 'Point' as const, coordinates: [f.longitude, f.latitude] },
  }))
  return { type: 'FeatureCollection', features }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function labelForFeeling(n: number): string {
  const labels: Record<number, string> = {
    1: 'Great (1)',
    2: 'Good (2)',
    3: 'Okay (3)',
    4: 'Uneasy (4)',
    5: 'Bad (5)',
  }
  return labels[n] ?? `Feeling ${n}`
}

export function CommunityFeelingsMap({ accessToken, feelings, userLng, userLat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!accessToken || !containerRef.current) return

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right')

    map.on('load', () => {
      // Fix blank map when container laid out after first paint
      map.resize()
      requestAnimationFrame(() => map.resize())

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: feelingsToGeoJSON(feelings),
      })
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 5, 12, 14, 18, 22],
          'circle-color': [
            'match',
            ['to-number', ['get', 'feeling']],
            1,
            '#059669',
            2,
            '#65a30d',
            3,
            '#ca8a04',
            4,
            '#ea580c',
            5,
            '#dc2626',
            '#64748b',
          ],
          'circle-opacity': 0.88,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      map.on('click', LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f?.properties) return
        const feeling = Number(f.properties.feeling)
        const created = String(f.properties.created_at ?? '')
        popupRef.current?.remove()
        popupRef.current = new mapboxgl.Popup({ maxWidth: '260px', offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="text-sm text-slate-900">
              <div class="font-semibold">${escapeHtml(labelForFeeling(feeling))}</div>
              <div class="mt-1 text-xs text-slate-500">${escapeHtml(created)}</div>
            </div>`,
          )
          .addTo(map)
      })
      map.on('mouseenter', LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })

      setMapReady(true)
    })

    const onWinResize = () => map.resize()
    window.addEventListener('resize', onWinResize)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.resize()
      })
      resizeObserver.observe(containerRef.current)
    }

    mapRef.current = map
    return () => {
      window.removeEventListener('resize', onWinResize)
      resizeObserver?.disconnect()
      popupRef.current?.remove()
      popupRef.current = null
      markerRef.current?.remove()
      markerRef.current = null
      setMapReady(false)
      map.remove()
      mapRef.current = null
    }
  }, [accessToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    src.setData(feelingsToGeoJSON(feelings))

    const coords: [number, number][] = feelings.map((f) => [f.longitude, f.latitude])
    if (userLng != null && userLat != null) coords.push([userLng, userLat])

    if (coords.length === 0) {
      map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 0 })
      return
    }

    if (coords.length === 1) {
      map.easeTo({ center: coords[0], zoom: 12, duration: 600 })
      return
    }

    const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0])
    for (let i = 1; i < coords.length; i++) bounds.extend(coords[i])
    map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 650 })
  }, [mapReady, feelings, userLng, userLat])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    markerRef.current?.remove()
    markerRef.current = null
    if (userLng == null || userLat == null) return
    markerRef.current = new mapboxgl.Marker({ color: '#22c55e' }).setLngLat([userLng, userLat]).addTo(map)
  }, [mapReady, userLng, userLat])

  if (!accessToken) {
    return (
      <div className="community-feelings-map community-feelings-map--placeholder flex h-full min-h-[280px] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-center text-sm text-slate-500">
        <p className="max-w-xs px-4">
          Add <code className="rounded bg-slate-200 px-1">VITE_MAPBOX_ACCESS_TOKEN</code> to your{' '}
          <code className="rounded bg-slate-200 px-1">.env</code> to show the map.
        </p>
      </div>
    )
  }

  return (
    <div className="community-feelings-map relative h-full min-h-[280px] w-full min-w-0 overflow-hidden rounded-lg">
      {/* Fills parent height (Community page sets explicit px height so Mapbox is not 0×0) */}
      <div ref={containerRef} className="h-full w-full min-h-[280px]" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-md border border-slate-200 bg-white/95 px-2 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
        <div className="mb-1 font-semibold uppercase tracking-wide text-slate-600">Sentiment</div>
        <div className="flex items-center gap-1">
          {[
            { n: 1, c: 'bg-emerald-600' },
            { n: 2, c: 'bg-lime-600' },
            { n: 3, c: 'bg-amber-500' },
            { n: 4, c: 'bg-orange-600' },
            { n: 5, c: 'bg-red-600' },
          ].map(({ n, c }) => (
            <span key={n} className={`inline-block h-3 w-6 rounded-sm ${c}`} title={`${n}/5`} />
          ))}
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] text-slate-500">
          <span>better</span>
          <span>worse</span>
        </div>
      </div>
    </div>
  )
}
