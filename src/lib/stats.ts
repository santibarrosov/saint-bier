export interface MonthlyPoint {
  month: string // "yyyy-MM"
  value: number
}

/** Agrupa una lista por mes (a partir de una fecha ISO en cada item) y suma un valor numérico. */
export function groupByMonth<T>(items: T[], getDate: (item: T) => string, getValue: (item: T) => number): MonthlyPoint[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const monthKey = getDate(item).slice(0, 7)
    map.set(monthKey, (map.get(monthKey) ?? 0) + getValue(item))
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, value]) => ({ month, value }))
}

export interface StyleRanking {
  style: string
  liters: number
  count: number
}

/** Ranquea estilos por litros producidos (y cantidad de cocciones), de mayor a menor. */
export function rankByStyle<T>(items: T[], getStyle: (item: T) => string, getLiters: (item: T) => number): StyleRanking[] {
  const map = new Map<string, StyleRanking>()
  for (const item of items) {
    const style = getStyle(item)
    const entry = map.get(style) ?? { style, liters: 0, count: 0 }
    entry.liters += getLiters(item)
    entry.count += 1
    map.set(style, entry)
  }
  return [...map.values()].sort((a, b) => b.liters - a.liters)
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
}
