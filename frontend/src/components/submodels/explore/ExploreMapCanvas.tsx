import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import { SAFE_HAVEN_ICON_IDS, loadSafeHavenIconsIntoMap } from '../../../lib/mapSafeHavenIcons'
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
}

type Props = {
  accessToken: string | undefined
  lng: number | null
  lat: number | null
  layers: LayerToggles
  /** Places from GET /api/places/nearby (filtered by toggles on the map). */
  places: NearbyPlace[]
}

const SOURCE_ID = 'safe-haven-points'
const LAYER_ID = 'safe-haven-symbols'

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

/** Initial frame before GPS: high-level view over continental Europe */
const EUROPE_CENTER: [number, number] = [14.5, 52.0]
const EUROPE_OVERVIEW_ZOOM = 3.35
const EUROPE_OVERVIEW_PITCH = 0
const EUROPE_OVERVIEW_BEARING = 0

const FOCUSED_PITCH = 62
const FOCUSED_BEARING = 38

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
    /* terrain optional — some tokens/styles may differ */
  }
}

export function ExploreMapCanvas({ accessToken, lng, lat, layers, places }: Props) {
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

      const initial: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      map.addSource(SOURCE_ID, { type: 'geojson', data: initial })

      void (async () => {
        try {
          await loadSafeHavenIconsIntoMap(map)
        } catch (e) {
          console.error('Safe haven icons failed to load; falling back to circles', e)
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
          wireLayerInteractions(map)
          setMapReady(true)
          return
        }

        map.addLayer({
          id: LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'icon-image': ['get', 'icon'],
            // Was 0.72; ~0.3× for smaller pins on the map
            'icon-size': 0.216,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-anchor': 'center',
          },
          paint: {
            'icon-opacity': 1,
          },
        })

        wireLayerInteractions(map)
        setMapReady(true)
      })()
    })

    function wireLayerInteractions(mapInstance: mapboxgl.Map) {
      const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
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
        popupRef.current = new mapboxgl.Popup({ maxWidth: '280px', offset: 6 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="text-sm text-slate-900">
              <div class="font-semibold">${escapeHtml(name)}</div>
              <div class="mt-0.5 text-xs text-slate-600">${escapeHtml(labelForType(pt))}${escapeHtml(distLabel)}</div>
            </div>`,
          )
          .addTo(mapInstance)
      }

      mapInstance.on('click', LAYER_ID, onClick)
      mapInstance.on('mouseenter', LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })
      mapInstance.on('mouseleave', LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = ''
      })
    }

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
    if (!src) return
    if (lng == null || lat == null) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    src.setData(placesToGeoJSON(places, layers))
  }, [mapReady, lng, lat, layers, places])

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
