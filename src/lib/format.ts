import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

export function formatCurrency(n: number): string {
  return currencyFormatter.format(Number.isFinite(n) ? n : 0)
}

export function formatLiters(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)} L`
}

export function formatKg(n: number): string {
  if (n < 1) return `${Math.round(n * 1000)} g`
  return `${n.toFixed(2)} kg`
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function formatGravity(n: number): string {
  return n.toFixed(3)
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: es })
  } catch {
    return iso
  }
}

export function formatDateShort(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "dd/MM/yy")
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: es })
  } catch {
    return iso
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
