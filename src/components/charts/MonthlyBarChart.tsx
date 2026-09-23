import type { MonthlyPoint } from "@/lib/stats"
import { formatMonthLabel } from "@/lib/stats"

interface MonthlyBarChartProps {
  data: MonthlyPoint[]
  color: string
  valueFormatter: (v: number) => string
}

/**
 * Barras hechas a mano en vez de con recharts: la versión de recharts instalada (3.10.1,
 * la última estable — no hay una más nueva que lo corrija) calcula mal la altura de las
 * barras en BarChart — la proporción ENTRE barras da bien, pero la escala absoluta contra
 * el dominio real no, así que terminan casi invisibles. LineChart (los otros gráficos de
 * la app) no tiene este problema. Para una serie mensual simple, un componente propio es
 * más confiable que perseguir un bug de la librería.
 */
export function MonthlyBarChart({ data, color, valueFormatter }: MonthlyBarChartProps) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--color-text-faint)]">Todavía no hay datos suficientes.</p>
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex h-48 w-full items-end gap-2 border-b border-[var(--color-border)] pb-1">
      {data.map((d) => {
        const heightPct = Math.max(2, (d.value / maxValue) * 100)
        return (
          <div key={d.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{valueFormatter(d.value)}</span>
            <div
              className="w-full rounded-t-[4px]"
              style={{ height: `${heightPct}%`, backgroundColor: color, minHeight: 3 }}
              title={`${formatMonthLabel(d.month)}: ${valueFormatter(d.value)}`}
            />
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">{formatMonthLabel(d.month)}</span>
          </div>
        )
      })}
    </div>
  )
}
