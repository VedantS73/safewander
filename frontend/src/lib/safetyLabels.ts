/** Maps 0–100 safety score to a short label for UI. */
export type SafetyLevel = 'Very safe' | 'Safe' | 'OK' | 'Not safe'

export function getSafetyLevel(score: number): SafetyLevel {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (s >= 80) return 'Very safe'
  if (s >= 60) return 'Safe'
  if (s >= 40) return 'OK'
  return 'Not safe'
}

export function getSafetyLevelColor(level: SafetyLevel): string {
  switch (level) {
    case 'Very safe':
      return 'green'
    case 'Safe':
      return 'cyan'
    case 'OK':
      return 'gold'
    case 'Not safe':
      return 'red'
    default:
      return 'default'
  }
}
