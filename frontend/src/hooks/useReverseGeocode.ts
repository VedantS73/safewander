import { useEffect, useState } from 'react'

/** Mapbox reverse geocoding — needs VITE_MAPBOX_ACCESS_TOKEN */
export function useReverseGeocode(
  longitude: number | null,
  latitude: number | null,
  token: string | undefined,
) {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (longitude == null || latitude == null || !token) {
      setAddress(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${encodeURIComponent(token)}&limit=1`

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Geocoding failed')
        return r.json()
      })
      .then((data: { features?: { place_name?: string }[] }) => {
        const name = data.features?.[0]?.place_name
        setAddress(name ?? 'Address unavailable')
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return
        setError(e.message)
        setAddress(null)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [longitude, latitude, token])

  return { address, loading, error }
}
