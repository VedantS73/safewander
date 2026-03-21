/**
 * Mapbox Geocoding + Directions (driving). Requires VITE_MAPBOX_ACCESS_TOKEN.
 */

export type LngLat = [number, number]

export async function forwardGeocode(query: string, token: string): Promise<LngLat> {
  const q = query.trim()
  if (!q) throw new Error('Enter a place name or address.')

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(token)}&limit=1`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not look up that place. Try a different search.')
  const data = (await res.json()) as {
    features?: { center?: [number, number] }[]
  }
  const center = data.features?.[0]?.center
  if (!center) throw new Error(`No results for “${q}”.`)
  return [center[0], center[1]]
}

/** Single driving route; same geometry used for all “route mode” tabs until logic differs. */
export async function fetchDrivingRouteGeoJSON(
  start: LngLat,
  end: LngLat,
  token: string,
): Promise<GeoJSON.Feature<GeoJSON.LineString>> {
  const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not compute a route between these points.')
  const data = (await res.json()) as {
    routes?: { geometry: GeoJSON.LineString }[]
    code?: string
  }
  const geometry = data.routes?.[0]?.geometry
  if (!geometry) throw new Error('No driving route found. Try different locations.')

  return {
    type: 'Feature',
    properties: {},
    geometry,
  }
}
