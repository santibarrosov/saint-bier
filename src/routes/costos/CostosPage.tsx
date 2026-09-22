import { Link } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { Coins, Settings } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"

import { db } from "@/data/db"
import { useSettings } from "@/data/hooks"
import { calcBatchCost, calcSuggestedPrice } from "@/lib/costCalc"
import { formatCurrency, formatPercent } from "@/lib/format"

export function CostosPage() {
  const settings = useSettings()

  const rows = useLiveQuery(async () => {
    const [batches, recipes, inventoryItems] = await Promise.all([
      db.batches.toArray(),
      db.recipes.toArray(),
      db.inventoryItems.toArray(),
    ])
    const inventoryById = new Map(inventoryItems.map((i) => [i.id, i]))
    const styleByRecipeId = new Map(recipes.map((r) => [r.id, r.style]))

    return batches.map((b) => {
      const breakdown = calcBatchCost(b, settings, inventoryById)
      return {
        batch: b,
        style: styleByRecipeId.get(b.recipeId) ?? "—",
        breakdown,
        suggestedPrice: calcSuggestedPrice(breakdown.costPerLiter, settings.targetMarginPct),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const byStyle = new Map<string, { totalCost: number; count: number }>()
  for (const row of rows ?? []) {
    const entry = byStyle.get(row.style) ?? { totalCost: 0, count: 0 }
    entry.totalCost += row.breakdown.costPerLiter
    entry.count += 1
    byStyle.set(row.style, entry)
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Costos"
        description={`Margen objetivo: ${formatPercent(settings.targetMarginPct, 0)}`}
        actions={
          <Button variant="secondary" size="icon" asChild>
            <Link to="/ajustes">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {rows && rows.length === 0 && (
        <EmptyState icon={Coins} title="Sin cocciones para analizar" description="Los costos se calculan automáticamente a partir de tus cocciones." />
      )}

      {byStyle.size > 0 && (
        <SectionCard title="Costo promedio por estilo">
          <div className="space-y-2">
            {[...byStyle.entries()].map(([style, agg]) => (
              <div key={style} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm">
                <span className="text-[var(--color-text)]">{style}</span>
                <span className="text-[var(--color-text-muted)]">{formatCurrency(agg.totalCost / agg.count)}/L</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {rows && rows.length > 0 && (
        <SectionCard title="Costo por cocción">
          <div className="space-y-2">
            {rows.map(({ batch, style, breakdown, suggestedPrice }) => (
              <div key={batch.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{batch.code}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{style}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-semibold text-[var(--color-text)]">{formatCurrency(breakdown.costPerLiter)}/L</p>
                    <p className="text-xs text-[var(--color-primary)]">sugerido {formatCurrency(suggestedPrice)}/L</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--color-text-faint)] sm:grid-cols-3">
                  <span>Insumos: {formatCurrency(breakdown.ingredientsCost)}</span>
                  <span>Gas: {formatCurrency(breakdown.gasCost)}</span>
                  <span>Sanitizante: {formatCurrency(breakdown.sanitizerCost)}</span>
                  <span>Mano de obra: {formatCurrency(breakdown.laborCost)}</span>
                  <span>Amortización: {formatCurrency(breakdown.kegAmortizationCost)}</span>
                  <span>Total: {formatCurrency(breakdown.totalCost)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
