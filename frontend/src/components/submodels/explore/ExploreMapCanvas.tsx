import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

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
}

const SOURCE_ID = 'safe-haven-points'
const LAYER_ID = 'safe-haven-circles'

function buildSafeHavenGeoJSON(
  lng: number,
  lat: number,
  layers: LayerToggles,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  if (layers.police) {
    features.push(point(lng + 0.002, lat + 0.001, '#2563eb'))
    features.push(point(lng - 0.0015, lat + 0.002, '#2563eb'))
  }
  if (layers.hospitals) {
    features.push(point(lng - 0.002, lat - 0.001, '#dc2626'))
    features.push(point(lng + 0.0005, lat + 0.0025, '#dc2626'))
  }
  if (layers.cameras) {
    features.push(point(lng + 0.001, lat - 0.002, '#d97706'))
    features.push(point(lng + 0.003, lat + 0.0005, '#d97706'))
  }
  return { type: 'FeatureCollection', features }
}

function point(lng: number, lat: number, color: string): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { color },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  }
}

/** Initial frame before GPS: high-level view over continental Europe */
const EUROPE_CENTER: [number, number] = [14.5, 52.0]
const EUROPE_OVERVIEW_ZOOM = 3.35
/** Low pitch at continent scale keeps borders readable; user location flight still uses 3D tilt */
const EUROPE_OVERVIEW_PITCH = 0
const EUROPE_OVERVIEW_BEARING = 0

/** Tighter 3D view once we lock onto the user (streets + buildings read well here) */
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

export function ExploreMapCanvas({ accessToken, lng, lat, layers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
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
      /* Right-drag = rotate, two-finger drag (touch) = pitch — defaults on */
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

      const initial = buildSafeHavenGeoJSON(EUROPE_CENTER[0], EUROPE_CENTER[1], {
        police: false,
        hospitals: false,
        cameras: false,
      })
      map.addSource(SOURCE_ID, { type: 'geojson', data: initial })
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      setMapReady(true)
    })

    mapRef.current = map
    return () => {
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
      /* Slower, calmer glide than the short 2.2s flight */
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
    if (!map || !mapReady || lng == null || lat == null) return
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    src.setData(buildSafeHavenGeoJSON(lng, lat, layers))
  }, [mapReady, lng, lat, layers])

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
