import type { Map } from 'mapbox-gl'

/** Mapbox `icon-image` ids — must match GeoJSON feature `icon` property. */
export const SAFE_HAVEN_ICON_IDS = {
  police_station: 'safe-haven-police',
  hospital: 'safe-haven-hospital',
  camera: 'safe-haven-camera',
} as const

const ICON_URLS: [string, string][] = [
  [SAFE_HAVEN_ICON_IDS.police_station, '/icons/safe-haven/police.svg'],
  [SAFE_HAVEN_ICON_IDS.hospital, '/icons/safe-haven/hospital.svg'],
  [SAFE_HAVEN_ICON_IDS.camera, '/icons/safe-haven/camera.svg'],
]

/** Logical icon size in CSS pixels; raster is 2× for retina. */
const ICON_LOGICAL_PX = 128

/**
 * Mapbox `loadImage` only accepts PNG/JPEG (not SVG). Rasterize SVG in the browser first.
 */
async function rasterizeSvgUrlToPngDataUrl(svgUrl: string): Promise<string> {
  const res = await fetch(svgUrl)
  if (!res.ok) throw new Error(`Failed to fetch ${svgUrl}`)
  const svgText = await res.text()
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = 'anonymous'
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Could not decode SVG: ${svgUrl}`))
      el.src = objectUrl
    })

    const scale = 2
    const px = ICON_LOGICAL_PX * scale
    const canvas = document.createElement('canvas')
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.clearRect(0, 0, px, px)
    ctx.drawImage(img, 0, 0, px, px)

    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Crime / press news pins on Explore (distinct from safe-haven). */
export const CRIME_NEWS_ICON_ID = 'crime-news'

/**
 * Load icons as PNG (rasterized from SVG) into the map style.
 */
export function loadSafeHavenIconsIntoMap(map: Map): Promise<void> {
  return Promise.all(ICON_URLS.map(([id, url]) => loadOneIcon(map, id, url))).then(() => undefined)
}

export function loadCrimeNewsIconIntoMap(map: Map): Promise<void> {
  return loadOneIcon(map, CRIME_NEWS_ICON_ID, '/icons/crime-news.svg')
}

/** Safe-haven + crime-news icons (Explore map). */
export function loadExploreMapIconsIntoMap(map: Map): Promise<void> {
  return Promise.all([loadSafeHavenIconsIntoMap(map), loadCrimeNewsIconIntoMap(map)]).then(() => undefined)
}

function loadOneIcon(map: Map, id: string, svgUrl: string): Promise<void> {
  return rasterizeSvgUrlToPngDataUrl(svgUrl).then(
    (pngDataUrl) =>
      new Promise((resolve, reject) => {
        map.loadImage(pngDataUrl, (err, image) => {
          if (err || !image) {
            reject(err ?? new Error(`Failed to load rasterized icon: ${id}`))
            return
          }
          try {
            if (map.hasImage(id)) map.removeImage(id)
            map.addImage(id, image, { pixelRatio: 2 })
          } catch (e) {
            reject(e)
            return
          }
          resolve()
        })
      }),
  )
}
