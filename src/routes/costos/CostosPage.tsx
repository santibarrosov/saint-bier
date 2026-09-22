import { useState } from "react"
import { Link } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { Coins, Plus, Settings, Star, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { db } from "@/data/db"
import { useBatches, useReviews, useSettings } from "@/data/hooks"
import { reviewRepo } from "@/data/repositories/reviewRepo"
import { calcBatchCost, calcSuggestedPrice } from "@/lib/costCalc"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

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

      <ReviewsSection />
    </div>
  )
}

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-1">
          <Star
            className={cn("h-6 w-6", n <= value ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--color-border-strong)]")}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewsSection() {
  const reviews = useReviews() ?? []
  const batches = useBatches() ?? []
  const [batchId, setBatchId] = useState("")
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")

  const byBatch = new Map<string, { code: string; total: number; count: number }>()
  const byStyle = new Map<string, { total: number; count: number }>()
  for (const r of reviews) {
    const b = byBatch.get(r.batchId) ?? { code: r.batchCode, total: 0, count: 0 }
    b.total += r.rating
    b.count += 1
    byBatch.set(r.batchId, b)

    const s = byStyle.get(r.style) ?? { total: 0, count: 0 }
    s.total += r.rating
    s.count += 1
    byStyle.set(r.style, s)
  }

  const addReview = async () => {
    const batch = batches.find((b) => b.id === batchId)
    if (!batch) return
    const recipe = await db.recipes.get(batch.recipeId)
    await reviewRepo.create({
      batchId: batch.id,
      batchCode: batch.code,
      style: recipe?.style ?? "—",
      rating,
      comment: comment || undefined,
      source: "manual",
    })
    setComment("")
    setRating(5)
  }

  return (
    <SectionCard title="Reseñas" description="Cargá a mano lo que te llega por WhatsApp desde el portal público.">
      {byStyle.size > 0 && (
        <div className="space-y-1.5">
          {[...byStyle.entries()].map(([style, agg]) => (
            <div key={style} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text)]">{style}</span>
              <span className="flex items-center gap-1 text-[var(--color-primary)]">
                <Star className="h-3.5 w-3.5 fill-current" /> {(agg.total / agg.count).toFixed(1)} ({agg.count})
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border-hairline)] bg-[var(--color-bg-elevated)] p-3.5">
        <FormField label="Lote">
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">— elegir —</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.recipeName}
              </option>
            ))}
          </Select>
        </FormField>
        <StarRow value={rating} onChange={setRating} />
        <Input placeholder="Comentario (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button variant="secondary" className="w-full" onClick={addReview} disabled={!batchId}>
          <Plus className="h-4 w-4" /> Cargar reseña
        </Button>
      </div>

      {reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="flex items-center gap-1 text-[var(--color-text)]">
                  <Star className="h-3.5 w-3.5 fill-[var(--color-primary)] text-[var(--color-primary)]" /> {r.rating} · {byBatch.get(r.batchId)?.code}
                </p>
                {r.comment && <p className="text-xs text-[var(--color-text-muted)]">{r.comment}</p>}
              </div>
              <button type="button" onClick={() => reviewRepo.remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
