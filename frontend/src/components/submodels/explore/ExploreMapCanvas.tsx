import { useCallback, useEffect, useRef, useState } from 'react'
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
  /** Heatmap mode: light basemap + green/red heat (uses all nearby points; pin toggles only affect icons) */
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

const STYLE_STREETS = 'mapbox://styles/mapbox/streets-v12'
const STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11'

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

function crimeEventsToHeatmapGeoJSON(events: NearbyCrimeEvent[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = events.map((e) => ({
    type: 'Feature' as const,
    properties: { w: 1 },
    geometry: { type: 'Point' as const, coordinates: [e.longitude, e.latitude] },
  }))
  return { type: 'FeatureCollection', features }
}

/** All safe-haven types for heatmap — ignores pin toggles (heatmap shows full picture). */
function placesToSafeHavenHeatmapGeoJSON(places: NearbyPlace[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const p of places) {
    if (p.type !== 'police_station' && p.type !== 'hospital' && p.type !== 'camera') continue
    features.push({
      type: 'Feature' as const,
      properties: { w: 1 },
      geometry: { type: 'Point' as const, coordinates: [p.x, p.y] },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Muted green — low saturation, lower opacity */
const SAFE_HAVEN_HEATMAP_PAINT = {
  'heatmap-weight': 1,
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.42, 12, 1.15, 16, 1.65],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(22, 101, 52, 0)',
    0.25,
    'rgba(22, 163, 74, 0.34)',
    0.5,
    'rgba(21, 128, 61, 0.5)',
    0.75,
    'rgba(22, 101, 52, 0.64)',
    1,
    'rgba(20, 83, 45, 0.76)',
  ],
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 16, 12, 40, 16, 62],
  'heatmap-opacity': 0.56,
}

/** Muted red — softer, not neon */
const CRIME_HEATMAP_PAINT = {
  'heatmap-weight': 1,
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.62, 15, 1.85],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(185, 28, 28, 0)',
    0.25,
    'rgba(239, 68, 68, 0.34)',
    0.5,
    'rgba(220, 38, 38, 0.5)',
    0.75,
    'rgba(185, 28, 28, 0.64)',
    1,
    'rgba(127, 29, 29, 0.76)',
  ],
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 26, 16, 40],
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

function clearFogAndTerrain(map: mapboxgl.Map) {
  try {
    map.setTerrain(null)
  } catch {
    /* ignore */
  }
  try {
    map.setFog(null)
  } catch {
    /* ignore */
  }
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

  const propsRef = useRef({ places, crimeEvents, layers, lng, lat })
  propsRef.current = { places, crimeEvents, layers, lng, lat }

  /** Tracks last applied basemap for heatmap mode (light vs streets) to avoid redundant setStyle */
  const heatmapStyleSyncedRef = useRef<boolean | null>(null)
  const setupExploreLayersRef = useRef<(map: mapboxgl.Map) => Promise<void>>(async () => {})

  const syncSources = useCallback((map: mapboxgl.Map) => {
    const { places: pl, crimeEvents: ce, layers: ly, lng: lg, lat: lt } = propsRef.current
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    const crimeSrc = map.getSource(CRIME_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    const heatSrc = map.getSource(CRIME_HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    const safeHeatSrc = map.getSource(SAFE_HAVEN_HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (!src || !crimeSrc || !heatSrc || !safeHeatSrc) return
    if (lg == null || lt == null) {
      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      src.setData(empty)
      crimeSrc.setData(empty)
      heatSrc.setData(empty)
      safeHeatSrc.setData(empty)
      return
    }
    src.setData(placesToGeoJSON(pl, ly))
    crimeSrc.setData(crimeEventsToGeoJSON(ce, ly.crimeNews))
    heatSrc.setData(crimeEventsToHeatmapGeoJSON(ce))
    safeHeatSrc.setData(placesToSafeHavenHeatmapGeoJSON(pl))
    const vis = ly.heatmap ? 'visible' : 'none'
    if (map.getLayer(SAFE_HAVEN_HEATMAP_LAYER_ID)) map.setLayoutProperty(SAFE_HAVEN_HEATMAP_LAYER_ID, 'visibility', vis)
    if (map.getLayer(CRIME_HEATMAP_LAYER_ID)) map.setLayoutProperty(CRIME_HEATMAP_LAYER_ID, 'visibility', vis)
  }, [])

  const setupExploreLayers = useCallback(
    async (map: mapboxgl.Map) => {
      const heatmapOn = propsRef.current.layers.heatmap
      if (heatmapOn) {
        clearFogAndTerrain(map)
      } else {
        apply3DAtmosphere(map)
        addTerrainIfPossible(map)
      }

      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      map.addSource(SOURCE_ID, { type: 'geojson', data: empty })
      map.addSource(CRIME_SOURCE_ID, { type: 'geojson', data: empty })
      map.addSource(CRIME_HEATMAP_SOURCE_ID, { type: 'geojson', data: empty })
      map.addSource(SAFE_HAVEN_HEATMAP_SOURCE_ID, { type: 'geojson', data: empty })

      let useCircles = false
      try {
        await loadExploreMapIconsIntoMap(map)
      } catch (e) {
        console.error('Explore map icons failed to load; using circles', e)
        useCircles = true
      }

      const addHeatmaps = () => {
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
      }

      if (useCircles) {
        addHeatmaps()
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
        addHeatmaps()
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

      syncSources(map)
    },
    [syncSources],
  )

  setupExploreLayersRef.current = setupExploreLayers

  useEffect(() => {
    if (!accessToken || !containerRef.current) return

    mapboxgl.accessToken = accessToken
    const initialHeatmap = propsRef.current.layers.heatmap
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: initialHeatmap ? STYLE_LIGHT : STYLE_STREETS,
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
      void setupExploreLayersRef.current(map).then(() => setMapReady(true))
    })

    mapRef.current = map
    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      setMapReady(false)
      heatmapStyleSyncedRef.current = null
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [accessToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (heatmapStyleSyncedRef.current === null) {
      heatmapStyleSyncedRef.current = layers.heatmap
      return
    }
    if (heatmapStyleSyncedRef.current === layers.heatmap) return

    const nextHeatmap = layers.heatmap
    map.setStyle(nextHeatmap ? STYLE_LIGHT : STYLE_STREETS)
    map.once('style.load', () => {
      void setupExploreLayersRef.current(map).then(() => {
        heatmapStyleSyncedRef.current = nextHeatmap
      })
    })
  }, [layers.heatmap, mapReady])

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
    syncSources(map)
  }, [mapReady, layers, places, crimeEvents, lng, lat, syncSources])

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
