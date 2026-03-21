/** Crime / news row from GET /api/crime-events/nearby */
export type NearbyCrimeEvent = {
  id: number
  latitude: number
  longitude: number
  original_title: string
  original_link: string
  crime_date: string | null
  crime_time: string | null
  location: string
  crime_type: string
  distance_m: number
}

/** Last-N-hours feed from GET /api/crime-events/recent (Live alerts sidebar) */
export type CrimeRecentAlert = {
  id: number
  latitude: number
  longitude: number
  original_title: string
  original_link: string
  crime_date: string | null
  crime_time: string | null
  location: string
  crime_type: string
  created_at: string
}
