/**
 * Chart utility helpers and palette configuration for Recharts dashboard.
 */

// Premium dark theme color palette
export const CHART_THEME = {
  primary: '#3b82f6',     // Bright Blue
  secondary: '#a855f7',   // Purple
  success: '#10b981',     // Emerald Green
  warning: '#f59e0b',     // Amber
  danger: '#ef4444',      // Red
  info: '#06b6d4',        // Cyan
  muted: '#64748b',       // Muted gray
  backgrounds: [
    'rgba(59, 130, 246, 0.1)',
    'rgba(168, 85, 247, 0.1)',
    'rgba(16, 185, 129, 0.1)',
    'rgba(245, 158, 11, 0.1)'
  ],
  colors: [
    '#3b82f6',
    '#a855f7',
    '#10b981',
    '#f59e0b',
    '#06b6d4',
    '#ec4899',
    '#14b8a6'
  ]
}

/**
 * Format currency to standard USD format
 */
export function formatChartCurrency(val: number): string {
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}k`
  }
  return `$${val.toFixed(0)}`
}

/**
 * Helper to group array items by a key
 */
export function groupBy<T>(array: T[], keyGetter: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  array.forEach((item) => {
    const key = keyGetter(item)
    const collection = map[key]
    if (!collection) {
      map[key] = [item]
    } else {
      collection.push(item)
    }
  })
  return map
}
