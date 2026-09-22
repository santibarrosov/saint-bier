import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import type { FermentationLogEntry } from "@/data/types"

interface FermentationChartProps {
  logs: FermentationLogEntry[]
}

const AMBER = "#e0a83a"

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: FermentationLogEntry }> }) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[var(--color-text)]">{format(parseISO(entry.date), "d MMM")}</p>
      <p className="text-sm font-semibold text-[var(--color-primary)]">{entry.tempC.toFixed(1)} °C</p>
      {entry.note && <p className="mt-0.5 max-w-[160px] text-xs text-[var(--color-text-muted)]">{entry.note}</p>}
    </div>
  )
}

export function FermentationChart({ logs }: FermentationChartProps) {
  const data = [...logs].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
            width={38}
            domain={["dataMin - 2", "dataMax + 2"]}
            tickFormatter={(v: number) => `${v}°`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="tempC"
            stroke={AMBER}
            strokeWidth={2}
            strokeLinecap="round"
            dot={{ r: 4, fill: AMBER, stroke: "var(--color-bg-raised)", strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: AMBER, stroke: "var(--color-bg-raised)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
