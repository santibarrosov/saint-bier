import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import type { FermentationLogEntry } from "@/data/types"

interface GravityChartProps {
  logs: FermentationLogEntry[]
}

const INFO_BLUE = "#6e8fa6"

interface GravityPoint {
  date: string
  gravity: number
  note?: string
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: GravityPoint }> }) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[var(--color-text)]">{format(parseISO(entry.date), "d MMM")}</p>
      <p className="text-sm font-semibold" style={{ color: INFO_BLUE }}>
        {entry.gravity.toFixed(3)}
      </p>
      {entry.note && <p className="mt-0.5 max-w-[160px] text-xs text-[var(--color-text-muted)]">{entry.note}</p>}
    </div>
  )
}

/** Gráfico de densidad, separado del de temperatura — nunca comparten eje (escalas y unidades no relacionadas). */
export function GravityChart({ logs }: GravityChartProps) {
  const data: GravityPoint[] = logs
    .filter((l): l is FermentationLogEntry & { gravity: number } => l.gravity != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ date: l.date, gravity: l.gravity, note: l.note }))

  if (data.length === 0) return null

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border-hairline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => format(parseISO(v), "d/M")}
            tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            domain={["dataMin - 0.003", "dataMax + 0.003"]}
            tickFormatter={(v: number) => v.toFixed(3)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="gravity"
            stroke={INFO_BLUE}
            strokeWidth={2}
            strokeLinecap="round"
            dot={{ r: 4, fill: INFO_BLUE, stroke: "var(--color-bg-raised)", strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: INFO_BLUE, stroke: "var(--color-bg-raised)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
