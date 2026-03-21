import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import { CRIME_NEWS_ICON_ID, loadExploreMapIconsIntoMap, SAFE_HAVEN_ICON_IDS } from '../../../lib/mapSafeHavenIcons'
import type { NearbyCrimeEvent } from '../../../types/crimeEvents'
import type { NearbyPlace } from '../../../types/places'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type LayerToggles = {
  police: boolean
  hospitals: boolean
  cameras: boolean
  /** Press / crime news from n8n */
  crimeNews: boolean
  /** Safety heatmap: green near safe havens, red from crime_events */
  heatmap: boolean
}

type Props = {
  accessToken: string | undefined
  lng: number | null
  lat: number | null
  layers: LayerToggles
  places: NearbyPlace[]
  crimeEvents: NearbyCrimeEvent[]
}

const SOURCE_ID = 'safe-haven-points'
const LAYER_ID = 'safe-haven-symbols'

const CRIME_SOURCE_ID = 'crime-news-points'
const CRIME_HEATMAP_SOURCE_ID = 'crime-heatmap-points'
const SAFE_HAVEN_HEATMAP_SOURCE_ID = 'safe-haven-heatmap-points'
const CRIME_LAYER_ID = 'crime-news-symbols'
const CRIME_HEATMAP_LAYER_ID = 'crime-events-heatmap'
const SAFE_HAVEN_HEATMAP_LAYER_ID = 'safe-haven-safety-heatmap'

const TYPE_COLORS: Record<string, string> = {
  police_station: '#2563eb',
  hospital: '#dc2626',
  camera: '#d97706',
}

function iconIdForPlaceType(t: NearbyPlace['type']): string {
  if (t === 'police_station') return SAFE_HAVEN_ICON_IDS.police_station
  if (t === 'hospital') return SAFE_HAVEN_ICON_IDS.hospital
  return SAFE_HAVEN_ICON_IDS.camera
}

function labelForType(t: string): string {
  if (t === 'police_station') return 'Police station'
  if (t === 'hospital') return 'Hospital'
  if (t === 'camera') return 'Camera'
  return t
}

function placesToGeoJSON(places: NearbyPlace[], layers: LayerToggles): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const p of places) {
    if (p.type === 'police_station' && !layers.police) continue
    if (p.type === 'hospital' && !layers.hospitals) continue
    if (p.type === 'camera' && !layers.cameras) continue

    features.push({
      type: 'Feature',
      properties: {
        color: TYPE_COLORS[p.type] ?? '#64748b',
        icon: iconIdForPlaceType(p.type),
        name: p.name,
        placeType: p.type,
        distance_m: p.distance_m,
      },
      geometry: { type: 'Point', coordinates: [p.x, p.y] },
    })
  }
  return { type: 'FeatureCollection', features }
}

function crimeEventsToGeoJSON(events: NearbyCrimeEvent[], show: boolean): GeoJSON.FeatureCollection {
  if (!show) return { type: 'FeatureCollection', features: [] }
  const features: GeoJSON.Feature[] = events.map((e) => ({
    type: 'Feature' as const,
    properties: {
      icon: CRIME_NEWS_ICON_ID,
      title: e.original_title,
      crimeType: e.crime_type,
      location: e.location,
      link: e.original_link,
      distance_m: e.distance_m,
      dateStr: e.crime_date ?? '',
      timeStr: e.crime_time ?? '',
    },
    geometry: { type: 'Point' as const, coordinates: [e.longitude, e.latitude] },
  }))
  return { type: 'FeatureCollection', features }
}

/** All nearby crime points for heatmap (independent of pin toggle). */
function crimeEventsToHeatmapGeoJSON(events: NearbyCrimeEvent[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = events.map((e) => ({
    type: 'Feature' as const,
    properties: { w: 1 },
    geometry: { type: 'Point' as const, coordinates: [e.longitude, e.latitude] },
  }))
  return { type: 'FeatureCollection', features }
}

/** Safe haven points for green “calmer” heat (respects layer toggles). */
function placesToSafeHavenHeatmapGeoJSON(places: NearbyPlace[], layers: LayerToggles): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const p of places) {
    if (p.type === 'police_station' && !layers.police) continue
    if (p.type === 'hospital' && !layers.hospitals) continue
    if (p.type === 'camera' && !layers.cameras) continue
    features.push({
      type: 'Feature' as const,
      properties: { w: 1 },
      geometry: { type: 'Point' as const, coordinates: [p.x, p.y] },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Green heat — wider radius so stations/hospitals/cameras read as “safer” zones. */
const SAFE_HAVEN_HEATMAP_PAINT = {
  'heatmap-weight': 1,
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.35, 12, 1.4, 16, 1.9],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(16, 185, 129, 0)',
    0.15,
    'rgba(52, 211, 153, 0.25)',
    0.35,
    'rgba(34, 197, 94, 0.5)',
    0.55,
    'rgba(22, 163, 74, 0.68)',
    0.8,
    'rgba(21, 128, 61, 0.82)',
    1,
    'rgba(6, 78, 59, 0.9)',
  ],
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 18, 12, 48, 16, 78],
  'heatmap-opacity': 0.52,
}

/** Red heat — crime_events density (drawn above green so overlap reads as risk). */
const CRIME_HEATMAP_PAINT = {
  'heatmap-weight': 1,
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.45, 15, 2.1],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(248, 113, 113, 0)',
    0.2,
    'rgba(239, 68, 68, 0.4)',
    0.45,
    'rgba(220, 38, 38, 0.65)',
    0.7,
    'rgba(185, 28, 28, 0.82)',
    1,
    'rgba(127, 29, 29, 0.92)',
  ],
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 28, 16, 45],
  'heatmap-opacity': 0.58,
}

const EUROPE_CENTER: [number, number] = [14.5, 52.0]
const EUROPE_OVERVIEW_ZOOM = 3.35
const EUROPE_OVERVIEW_PITCH = 0
const EUROPE_OVERVIEW_BEARING = 0

const FOCUSED_PITCH = 62
const FOCUSED_BEARING = 38

const ICON_SIZE = 0.216

function apply3DAtmosphere(map: mapboxgl.Map) {
  map.setFog({
    color: 'rgb(186, 210, 235)',
    'high-color': 'rgb(36, 92, 223)',
    'horizon-blend': 0.045,
    'space-color': 'rgb(11, 11, 25)',
    'star-intensity': 0.35,
  })
}

function addTerrainIfPossible(map: mapboxgl.Map) {
  try {
    if (map.getSource('mapbox-dem')) return
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    })
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.25 })
  } catch {
    /* optional */
  }
}

export function ExploreMapCanvas({ accessToken, lng, lat, layers, places, crimeEvents }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!accessToken || !containerRef.current) return

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: EUROPE_CENTER,
      zoom: EUROPE_OVERVIEW_ZOOM,
      pitch: EUROPE_OVERVIEW_PITCH,
      bearing: EUROPE_OVERVIEW_BEARING,
      maxPitch: 85,
      antialias: true,
    })

    map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true,
      }),
      'bottom-right',
    )

    map.on('load', () => {
      apply3DAtmosphere(map)
      addTerrainIfPossible(map)

      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      map.addSource(SOURCE_ID, { type: 'geojson', data: empty })
      map.addSource(CRIME_SOURCE_ID, { type: 'geojson', data: empty })
      map.addSource(CRIME_HEATMAP_SOURCE_ID, { type: 'geojson', data: empty })
      map.addSource(SAFE_HAVEN_HEATMAP_SOURCE_ID, { type: 'geojson', data: empty })

      void (async () => {
        let useCircles = false
        try {
          await loadExploreMapIconsIntoMap(map)
        } catch (e) {
          console.error('Explore map icons failed to load; using circles', e)
          useCircles = true
        }

        if (useCircles) {
          map.addLayer({
            id: SAFE_HAVEN_HEATMAP_LAYER_ID,
            type: 'heatmap',
            source: SAFE_HAVEN_HEATMAP_SOURCE_ID,
            maxzoom: 18,
            paint: SAFE_HAVEN_HEATMAP_PAINT as mapboxgl.HeatmapPaint,
            layout: { visibility: 'none' },
          })
          map.addLayer({
            id: CRIME_HEATMAP_LAYER_ID,
            type: 'heatmap',
            source: CRIME_HEATMAP_SOURCE_ID,
            maxzoom: 18,
            paint: CRIME_HEATMAP_PAINT as mapboxgl.HeatmapPaint,
            layout: { visibility: 'none' },
          })
          map.addLayer({
            id: LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-radius': 3,
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.92,
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#ffffff',
            },
          })
          map.addLayer({
            id: CRIME_LAYER_ID,
            type: 'circle',
            source: CRIME_SOURCE_ID,
            paint: {
              'circle-radius': 3.5,
              'circle-color': '#7c3aed',
              'circle-opacity': 0.92,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })
        } else {
          map.addLayer({
            id: SAFE_HAVEN_HEATMAP_LAYER_ID,
            type: 'heatmap',
            source: SAFE_HAVEN_HEATMAP_SOURCE_ID,
            maxzoom: 18,
            paint: SAFE_HAVEN_HEATMAP_PAINT as mapboxgl.HeatmapPaint,
            layout: { visibility: 'none' },
          })
          map.addLayer({
            id: CRIME_HEATMAP_LAYER_ID,
            type: 'heatmap',
            source: CRIME_HEATMAP_SOURCE_ID,
            maxzoom: 18,
            paint: CRIME_HEATMAP_PAINT as mapboxgl.HeatmapPaint,
            layout: { visibility: 'none' },
          })
          map.addLayer({
            id: LAYER_ID,
            type: 'symbol',
            source: SOURCE_ID,
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': ICON_SIZE,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
            paint: { 'icon-opacity': 1 },
          })
          map.addLayer({
            id: CRIME_LAYER_ID,
            type: 'symbol',
            source: CRIME_SOURCE_ID,
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': ICON_SIZE,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
            paint: { 'icon-opacity': 1 },
          })
        }

        const setPointer = () => {
          map.getCanvas().style.cursor = 'pointer'
        }
        const clearPointer = () => {
          map.getCanvas().style.cursor = ''
        }

        map.on('click', LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
          const f = e.features?.[0]
          if (!f?.properties) return
          const name = String(f.properties.name ?? 'Unknown')
          const pt = String(f.properties.placeType ?? '')
          const dist = f.properties.distance_m
          const d =
            typeof dist === 'number'
              ? dist
              : typeof dist === 'string'
                ? Number.parseFloat(dist)
                : Number.NaN
          const distLabel = Number.isFinite(d) ? ` · ${Math.round(d)} m away` : ''
          popupRef.current?.remove()
          popupRef.current = new mapboxgl.Popup({ maxWidth: '300px', offset: 6 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="text-sm text-slate-900">
                <div class="font-semibold">${escapeHtml(name)}</div>
                <div class="mt-0.5 text-xs text-slate-600">${escapeHtml(labelForType(pt))}${escapeHtml(distLabel)}</div>
              </div>`,
            )
            .addTo(map)
        })

        map.on('click', CRIME_LAYER_ID, (e: mapboxgl.MapLayerMouseEvent) => {
          const f = e.features?.[0]
          if (!f?.properties) return
          const title = String(f.properties.title ?? 'News')
          const crimeType = String(f.properties.crimeType ?? '')
          const loc = String(f.properties.location ?? '')
          const link = String(f.properties.link ?? '')
          const dateStr = String(f.properties.dateStr ?? '')
          const timeStr = String(f.properties.timeStr ?? '')
          const dist = f.properties.distance_m
          const d =
            typeof dist === 'number'
              ? dist
              : typeof dist === 'string'
                ? Number.parseFloat(dist)
                : Number.NaN
          const distLine = Number.isFinite(d) ? `<div class="mt-1 text-[11px] text-slate-400">~${Math.round(d)} m away</div>` : ''
          const when = [dateStr, timeStr].filter(Boolean).join(' ')
          popupRef.current?.remove()
          const linkHtml = link
            ? `<a class="mt-1 inline-block text-xs font-medium text-violet-700 underline" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open source</a>`
            : ''
          popupRef.current = new mapboxgl.Popup({ maxWidth: '320px', offset: 6 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="text-sm text-slate-900">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-violet-700">News</div>
                <div class="mt-0.5 font-semibold leading-snug">${escapeHtml(title)}</div>
                <div class="mt-1 text-xs text-slate-600">${escapeHtml(crimeType)}</div>
                <div class="mt-0.5 text-xs text-slate-500">${escapeHtml(loc)}</div>
                ${when ? `<div class="mt-1 text-[11px] text-slate-400">${escapeHtml(when)}</div>` : ''}
                ${distLine}
                ${linkHtml}
              </div>`,
            )
            .addTo(map)
        })

        map.on('mouseenter', LAYER_ID, setPointer)
        map.on('mouseleave', LAYER_ID, clearPointer)
        map.on('mouseenter', CRIME_LAYER_ID, setPointer)
        map.on('mouseleave', CRIME_LAYER_ID, clearPointer)

        setMapReady(true)
      })()
    })

    mapRef.current = map
    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      setMapReady(false)
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [accessToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || lng == null || lat == null) return
    map.flyTo({
      center: [lng, lat],
      zoom: 15,
      pitch: FOCUSED_PITCH,
      bearing: FOCUSED_BEARING,
      duration: 5200,
      curve: 1.05,
      essential: true,
    })
  }, [mapReady, lng, lat])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || lng == null || lat == null) return
    markerRef.current?.remove()
    markerRef.current = new mapboxgl.Marker({ color: '#22c55e' })
      .setLngLat([lng, lat])
      .addTo(map)
  }, [mapReady, lng, lat])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    const crimeSrc = map.getSource(CRIME_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    const heatSrc = map.getSource(CRIME_HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    const safeHeatSrc = map.getSource(SAFE_HAVEN_HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (!src || !crimeSrc || !heatSrc || !safeHeatSrc) return
    if (lng == null || lat == null) {
      src.setData({ type: 'FeatureCollection', features: [] })
      crimeSrc.setData({ type: 'FeatureCollection', features: [] })
      heatSrc.setData({ type: 'FeatureCollection', features: [] })
      safeHeatSrc.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    src.setData(placesToGeoJSON(places, layers))
    crimeSrc.setData(crimeEventsToGeoJSON(crimeEvents, layers.crimeNews))
    heatSrc.setData(crimeEventsToHeatmapGeoJSON(crimeEvents))
    safeHeatSrc.setData(placesToSafeHavenHeatmapGeoJSON(places, layers))
  }, [mapReady, lng, lat, layers, places, crimeEvents])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vis = layers.heatmap ? 'visible' : 'none'
    if (map.getLayer(SAFE_HAVEN_HEATMAP_LAYER_ID)) map.setLayoutProperty(SAFE_HAVEN_HEATMAP_LAYER_ID, 'visibility', vis)
    if (map.getLayer(CRIME_HEATMAP_LAYER_ID)) map.setLayoutProperty(CRIME_HEATMAP_LAYER_ID, 'visibility', vis)
  }, [mapReady, layers.heatmap])

  if (!accessToken) {
    return (
      <div className="explore-map explore-map--placeholder flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        <p className="max-w-xs px-4 text-center text-sm">
          Add <code className="rounded bg-slate-200 px-1">VITE_MAPBOX_ACCESS_TOKEN</code> to your{' '}
          <code className="rounded bg-slate-200 px-1">.env</code> to show the map.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="explore-map h-full w-full" />
}
