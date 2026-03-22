/**
 * Mapbox Geocoding + Directions (driving). Requires VITE_MAPBOX_ACCESS_TOKEN.
 * Route modes use Mapbox `alternatives` when available and score by proximity to crime points.
 */

import type { NearbyCrimeEvent } from '../types/crimeEvents'

export type LngLat = [number, number]

export type RouteModeKey = 'safest' | 'fastest' | 'balanced'

export type RouteCandidate = {
  geometry: GeoJSON.LineString
  /** seconds */
  duration: number
  /** meters */
  distance: number
}

const EARTH_R_M = 6_371_000

function toRad(d: number): number {
  return (d * Math.PI) / 180
}

/** Great-circle distance in meters */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Distance from point P to segment AB (meters), spherical approximation via projection on segment in lat/lng then haversine to closest point */
function distancePointToSegmentMeters(p: LngLat, a: LngLat, b: LngLat): number {
  const ax = a[0]
  const ay = a[1]
  const bx = b[0]
  const by = b[1]
  const px = p[0]
  const py = p[1]
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-18) return haversineMeters(p, a)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const proj: LngLat = [ax + t * dx, ay + t * dy]
  return haversineMeters(p, proj)
}

/** Minimum distance (m) from a lat/lng point to a route polyline */
export function minDistancePointToRouteMeters(lng: number, lat: number, coords: [number, number][]): number {
  if (coords.length < 2) return Infinity
  const p: LngLat = [lng, lat]
  let min = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distancePointToSegmentMeters(p, coords[i] as LngLat, coords[i + 1] as LngLat)
    if (d < min) min = d
  }
  return min
}

/**
 * Higher = worse (more / closer crime near the polyline).
 * Sums a soft penalty for each crime within `influenceM` of the line.
 */
export function routeCrimeExposureScore(coords: [number, number][], crimes: NearbyCrimeEvent[], influenceM = 450): number {
  if (!crimes.length || coords.length < 2) return 0
  let score = 0
  for (const c of crimes) {
    const d = minDistancePointToRouteMeters(c.longitude, c.latitude, coords)
    if (d < influenceM) {
      score += (influenceM - d) / influenceM
    }
  }
  return score
}

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

type DirectionsResponse = {
  routes?: {
    geometry: GeoJSON.LineString
    duration: number
    distance: number
  }[]
  code?: string
}

/**
 * Request driving routes with alternatives when Mapbox can provide them.
 */
export async function fetchDrivingRouteAlternatives(start: LngLat, end: LngLat, token: string): Promise<RouteCandidate[]> {
  const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&alternatives=true&annotations=duration,distance&access_token=${encodeURIComponent(token)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not compute a route between these points.')
  const data = (await res.json()) as DirectionsResponse
  const routes = data.routes
  if (!routes?.length) throw new Error('No driving route found. Try different locations.')

  return routes.map((r) => ({
    geometry: r.geometry,
    duration: r.duration,
    distance: r.distance,
  }))
}

/** Legacy single-route helper (fastest / first route only). */
export async function fetchDrivingRouteGeoJSON(
  start: LngLat,
  end: LngLat,
  token: string,
): Promise<GeoJSON.Feature<GeoJSON.LineString>> {
  const candidates = await fetchDrivingRouteAlternatives(start, end, token)
  const first = candidates[0]
  return {
    type: 'Feature',
    properties: {},
    geometry: first.geometry,
  }
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max <= min) return values.map(() => 0)
  return values.map((v) => (v - min) / (max - min))
}

/**
 * Pick a route by mode. Uses crime_events from the corridor when provided.
 * - fastest: minimum travel time
 * - safest: minimum crime exposure score (ties → shorter time)
 * - balanced: blend of normalized duration + crime (~45% time / 55% risk)
 */
export function pickRouteByMode(
  candidates: RouteCandidate[],
  mode: RouteModeKey,
  crimes: NearbyCrimeEvent[],
): GeoJSON.Feature<GeoJSON.LineString> {
  if (candidates.length === 0) {
    throw new Error('No route candidates')
  }
  if (candidates.length === 1) {
    return { type: 'Feature', properties: { mode }, geometry: candidates[0].geometry }
  }
  if (crimes.length === 0) {
    const best = candidates.reduce((a, b) => (a.duration <= b.duration ? a : b))
    return { type: 'Feature', properties: { mode }, geometry: best.geometry }
  }

  const coordsList = candidates.map((c) => c.geometry.coordinates as [number, number][])
  const risks = coordsList.map((coords) => routeCrimeExposureScore(coords, crimes))
  const durations = candidates.map((c) => c.duration)

  if (mode === 'fastest') {
    let bestIdx = 0
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].duration < candidates[bestIdx].duration) bestIdx = i
    }
    return { type: 'Feature', properties: { mode }, geometry: candidates[bestIdx].geometry }
  }

  if (mode === 'safest') {
    let bestIdx = 0
    for (let i = 1; i < candidates.length; i++) {
      if (risks[i] < risks[bestIdx]) bestIdx = i
      else if (risks[i] === risks[bestIdx] && candidates[i].duration < candidates[bestIdx].duration) bestIdx = i
    }
    return { type: 'Feature', properties: { mode }, geometry: candidates[bestIdx].geometry }
  }

  // balanced
  const durN = normalize(durations)
  const riskN = normalize(risks)
  let bestIdx = 0
  let bestScore = Infinity
  for (let i = 0; i < candidates.length; i++) {
    const score = 0.45 * durN[i] + 0.55 * riskN[i]
    if (score < bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return { type: 'Feature', properties: { mode }, geometry: candidates[bestIdx].geometry }
}
