export type SafeHavenPlaceType = 'police_station' | 'camera' | 'hospital'

export type NearbyPlace = {
  id: number
  type: SafeHavenPlaceType
  name: string
  /** Longitude WGS84 */
  x: number
  /** Latitude WGS84 */
  y: number
  distance_m: number
}

export type PlacesNearbyResponse = {
  places: NearbyPlace[]
}
