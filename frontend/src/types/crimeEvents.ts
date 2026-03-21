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
