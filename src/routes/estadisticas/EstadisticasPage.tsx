import { useLiveQuery } from "dexie-react-hooks"
import { BarChart3, Beer, Droplets, PartyPopper } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart"

import { db } from "@/data/db"
import { useSettings } from "@/data/hooks"
import { calcBatchCost } from "@/lib/costCalc"
import { groupByMonth, rankByStyle } from "@/lib/stats"
import { formatCurrency, formatLiters } from "@/lib/format"

export function EstadisticasPage() {
  const settings = useSettings()

  const data = useLiveQuery(async () => {
    const [batches, recipes, events, inventoryItems] = await Promise.all([
      db.batches.toArray(),
      db.recipes.toArray(),
      db.events.toArray(),
      db.inventoryItems.toArray(),
    ])
    const styleByRecipeId = new Map(recipes.map((r) => [r.id, r.style]))
    const inventoryById = new Map(inventoryItems.map((i) => [i.id, i]))

    const litersByMonth = groupByMonth(batches, (b) => b.brewDate, (b) => b.batchVolumeL)
    const revenueByMonth = groupByMonth(events, (e) => e.date, (e) => e.budget)
    const styles = rankByStyle(
      batches,
      (b) => styleByRecipeId.get(b.recipeId) ?? "—",
      (b) => b.batchVolumeL,
    )

    const totalLiters = batches.reduce((sum, b) => sum + b.batchVolumeL, 0)
    const totalRevenue = events.reduce((sum, e) => sum + e.budget, 0)
    const avgCostPerLiter = batches.length
      ? batches.reduce((sum, b) => sum + calcBatchCost(b, settings, inventoryById).costPerLiter, 0) / batches.length
      : 0

    return { litersByMonth, revenueByMonth, styles, totalLiters, totalRevenue, avgCostPerLiter, eventCount: events.length, batchCount: batches.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  if (!data) return null

  const hasData = data.batchCount > 0 || data.eventCount > 0

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Estadísticas" description="El panorama del negocio a través del tiempo." />

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Todavía no hay datos para mostrar"
          description="A medida que cargues cocciones y eventos, acá vas a ver litros, ingresos y estilos a lo largo del tiempo."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Droplets} label="Litros totales" value={formatLiters(data.totalLiters, 0)} />
            <StatCard icon={PartyPopper} label="Eventos" value={String(data.eventCount)} />
            <StatCard icon={BarChart3} label="Ingresos totales" value={formatCurrency(data.totalRevenue)} />
            <StatCard icon={Beer} label="Costo prom./L" value={formatCurrency(data.avgCostPerLiter)} />
          </div>

          <SectionCard title="Litros producidos por mes">
            <MonthlyBarChart data={data.litersByMonth} color="#e0a83a" valueFormatter={(v) => formatLiters(v, 0)} />
          </SectionCard>

          <SectionCard title="Ingresos por mes" description="Presupuesto total de los eventos de cada mes.">
            <MonthlyBarChart data={data.revenueByMonth} color="#7c9a52" valueFormatter={formatCurrency} />
          </SectionCard>

          {data.styles.length > 0 && (
            <SectionCard title="Estilos más producidos" description="Litros totales por estilo, de mayor a menor.">
              <div className="space-y-2">
                {data.styles.map((s, idx) => (
                  <div key={s.style} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-sm font-semibold text-[var(--color-text-faint)]">#{idx + 1}</span>
                      <span className="text-sm text-[var(--color-text)]">{s.style}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--color-text)]">{formatLiters(s.liters, 0)}</p>
                      <p className="text-[10px] uppercase text-[var(--color-text-faint)]">{s.count} cocción{s.count === 1 ? "" : "es"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
