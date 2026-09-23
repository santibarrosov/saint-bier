import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Beer, Copy, Pencil, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useToast } from "@/components/ui/toast"

import { useRecipe, useYeastStrains } from "@/data/hooks"
import { recipeRepo } from "@/data/repositories/recipeRepo"
import { calcRecipeStats, scaleRecipe } from "@/lib/brewCalc"
import { HOP_USE_LABELS } from "@/lib/constants"
import { formatGravity, formatKg, formatLiters, formatPercent } from "@/lib/format"

export function RecetaDetail() {
  const { id } = useParams<{ id: string }>()
  const recipe = useRecipe(id)
  const yeastStrains = useYeastStrains() ?? []
  const navigate = useNavigate()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [scaleVolume, setScaleVolume] = useState<number | undefined>(undefined)
  const [scaleEfficiency, setScaleEfficiency] = useState<number | undefined>(undefined)

  const volume = scaleVolume ?? recipe?.targetVolumeL ?? 0
  const efficiency = scaleEfficiency ?? recipe?.efficiencyPct ?? 0

  const scaled = useMemo(() => {
    if (!recipe) return null
    return scaleRecipe(recipe, volume, efficiency)
  }, [recipe, volume, efficiency])

  const scaledStats = useMemo(() => {
    if (!recipe || !scaled) return null
    return calcRecipeStats({ ...scaled, targetVolumeL: volume, efficiencyPct: efficiency })
  }, [recipe, scaled, volume, efficiency])

  if (!recipe) return null

  const yeastName = yeastStrains.find((y) => y.id === recipe.yeastStrainId)?.name

  const goBrew = () => {
    navigate("/cocciones/nueva", { state: { recipeId: recipe.id, volumeL: volume, efficiencyPct: efficiency } })
  }

  const duplicate = async () => {
    const copy = await recipeRepo.duplicate(recipe)
    toast({ title: "Receta duplicada", variant: "success" })
    navigate(`/recetas/${copy.id}/editar`)
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={recipe.name}
        description={recipe.style}
        back
        actions={
          <>
            <Button variant="secondary" size="icon" onClick={duplicate} title="Duplicar receta">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" asChild>
              <Link to={`/recetas/${recipe.id}/editar`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <StatBox label="DO" value={formatGravity(recipe.targets.og)} />
        <StatBox label="DF" value={formatGravity(recipe.targets.fg)} />
        <StatBox label="ABV" value={formatPercent(recipe.targets.abv)} />
        <StatBox label="IBU" value={recipe.targets.ibu.toFixed(0)} />
        <StatBox label="SRM" value={recipe.targets.srm.toFixed(0)} />
      </div>

      <SectionCard title="Escalar receta" description="Simulá otro volumen o eficiencia sin modificar la receta original.">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Volumen objetivo (L)">
            <Input type="number" step="1" value={volume} onChange={(e) => setScaleVolume(Number(e.target.value))} />
          </FormField>
          <FormField label="Eficiencia (%)">
            <Input type="number" step="1" value={efficiency} onChange={(e) => setScaleEfficiency(Number(e.target.value))} />
          </FormField>
        </div>
        {scaledStats && (
          <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] p-3 sm:grid-cols-5">
            <StatBox label="DO" value={formatGravity(scaledStats.og)} />
            <StatBox label="DF" value={formatGravity(scaledStats.fg)} />
            <StatBox label="ABV" value={formatPercent(scaledStats.abv)} />
            <StatBox label="IBU" value={scaledStats.ibu.toFixed(0)} />
            <StatBox label="SRM" value={scaledStats.srm.toFixed(1)} />
          </div>
        )}
        <Button className="w-full" onClick={goBrew}>
          <Beer className="h-4 w-4" /> Crear cocción con estos valores
        </Button>
      </SectionCard>

      <SectionCard title="Datos generales">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Info label="Volumen de referencia" value={formatLiters(recipe.targetVolumeL, 0)} />
          <Info label="Eficiencia de referencia" value={formatPercent(recipe.efficiencyPct, 0)} />
          <Info label="Levadura" value={yeastName ?? "—"} />
          <Info label="Fermentación" value={`${recipe.plannedFermentationDays} días`} />
          <Info label="Maduración" value={`${recipe.plannedConditioningDays} días`} />
          <Info label="Carbonatación" value={`${recipe.plannedCarbonationDays} días`} />
        </dl>
      </SectionCard>

      {recipe.fermentables.length > 0 && (
        <SectionCard title="Fermentables (a volumen de referencia)">
          <div className="divide-y divide-[var(--color-border-hairline)]">
            {recipe.fermentables.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--color-text)]">{f.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  {formatKg(f.amountKg)} · {f.potentialPpg} PPG · {f.colorLovibond}°L
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {recipe.hops.length > 0 && (
        <SectionCard title="Lúpulos (a volumen de referencia)">
          <div className="divide-y divide-[var(--color-border-hairline)]">
            {recipe.hops.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--color-text)]">{h.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  {h.amountG} g · {h.alphaAcidPct}% AA · {HOP_USE_LABELS[h.use]} {h.timeMin}min
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {recipe.adjuncts.length > 0 && (
        <SectionCard title="Adjuntos (a volumen de referencia)">
          <div className="divide-y divide-[var(--color-border-hairline)]">
            {recipe.adjuncts.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--color-text)]">{a.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  {formatKg(a.amountKg)} · {a.timing}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {recipe.notes && (
        <SectionCard title="Notas">
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{recipe.notes}</p>
        </SectionCard>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar esta receta?"
        description="Las cocciones ya guardadas con esta receta no se ven afectadas."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          await recipeRepo.remove(recipe.id)
          toast({ title: "Receta eliminada" })
          navigate("/recetas")
        }}
      />
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] py-2.5 text-center">
      <p className="font-display text-base font-semibold text-[var(--color-text)]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-text-faint)]">{label}</dt>
      <dd className="text-[var(--color-text)]">{value}</dd>
    </div>
  )
}
