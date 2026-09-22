import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/EmptyState"
import { useToast } from "@/components/ui/toast"

import { useActiveRecipes, useSettings } from "@/data/hooks"
import { recipeRepo } from "@/data/repositories/recipeRepo"
import { batchRepo } from "@/data/repositories/batchRepo"
import { scaleRecipe, calcOG } from "@/lib/brewCalc"
import { formatGravity } from "@/lib/format"
import { FlaskConical } from "lucide-react"

const schema = z.object({
  recipeId: z.string().min(1, "Elegí una receta"),
  brewDate: z.string().min(1),
  batchVolumeL: z.coerce.number().positive(),
  efficiencyPct: z.coerce.number().min(1).max(100),
  preBoilVolumeL: z.coerce.number().min(0).optional(),
  postBoilVolumeL: z.coerce.number().min(0).optional(),
  mashPh: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CoccionForm() {
  const location = useLocation()
  const navState = location.state as { recipeId?: string; volumeL?: number; efficiencyPct?: number } | null
  const recipes = useActiveRecipes()
  const settings = useSettings()
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipeId: navState?.recipeId ?? "",
      brewDate: new Date().toISOString().slice(0, 10),
      batchVolumeL: navState?.volumeL ?? settings.defaultBatchVolumeL,
      efficiencyPct: navState?.efficiencyPct ?? settings.defaultEfficiencyPct,
    },
  })

  const recipeId = form.watch("recipeId")
  const batchVolumeL = form.watch("batchVolumeL")
  const efficiencyPct = form.watch("efficiencyPct")

  const [selectedRecipe, setSelectedRecipe] = useState<Awaited<ReturnType<typeof recipeRepo.get>>>(undefined)

  useEffect(() => {
    if (!recipeId) {
      setSelectedRecipe(undefined)
      return
    }
    recipeRepo.get(recipeId).then(setSelectedRecipe)
  }, [recipeId])

  const preview = useMemo(() => {
    if (!selectedRecipe || !batchVolumeL || !efficiencyPct) return null
    const scaled = scaleRecipe(selectedRecipe, batchVolumeL, efficiencyPct)
    const og = calcOG({ fermentables: scaled.fermentables, adjuncts: scaled.adjuncts, volumeL: batchVolumeL, efficiencyPct })
    return { scaled, og }
  }, [selectedRecipe, batchVolumeL, efficiencyPct])

  if (recipes && recipes.length === 0) {
    return (
      <div>
        <PageHeader title="Nueva cocción" back />
        <EmptyState
          icon={FlaskConical}
          title="Necesitás al menos una receta"
          description="Cargá una receta primero para poder escalarla y arrancar una cocción."
          action={
            <Button asChild>
              <a href="/recetas/nueva">Crear receta</a>
            </Button>
          }
        />
      </div>
    )
  }

  const onSubmit = async (values: FormValues) => {
    if (!selectedRecipe || !preview) return
    const batch = await batchRepo.create({
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      status: "cociendo",
      brewDate: values.brewDate,
      mashSteps: [],
      mashPh: values.mashPh,
      preBoilVolumeL: values.preBoilVolumeL,
      postBoilVolumeL: values.postBoilVolumeL,
      og: Number(preview.og.toFixed(3)),
      fermentationLogs: [],
      fermentables: preview.scaled.fermentables,
      hops: preview.scaled.hops,
      adjuncts: preview.scaled.adjuncts,
      batchVolumeL: values.batchVolumeL,
      notes: values.notes,
    })
    toast({ title: `Cocción ${batch.code} creada`, variant: "success" })
    navigate(`/cocciones/${batch.id}`)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-6">
      <PageHeader title="Nueva cocción" description="Se genera un código único y se descuenta el stock." back />

      <SectionCard title="Receta y fecha">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Receta" error={form.formState.errors.recipeId?.message} className="sm:col-span-2">
            <Select {...form.register("recipeId")}>
              <option value="">— elegí una receta —</option>
              {recipes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.style})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fecha de cocción">
            <Input type="date" {...form.register("brewDate")} />
          </FormField>
          <FormField label="Volumen del lote (L)">
            <Input type="number" step="0.5" {...form.register("batchVolumeL")} />
          </FormField>
          <FormField label="Eficiencia esperada (%)">
            <Input type="number" step="1" {...form.register("efficiencyPct")} />
          </FormField>
        </div>
      </SectionCard>

      {preview && (
        <SectionCard title="Ingredientes escalados" description={`DO estimada: ${formatGravity(preview.og)}`}>
          <div className="space-y-1 text-sm">
            {preview.scaled.fermentables.map((f) => (
              <div key={f.id} className="flex justify-between text-[var(--color-text-muted)]">
                <span>{f.name}</span>
                <span>{f.amountKg.toFixed(2)} kg</span>
              </div>
            ))}
            {preview.scaled.hops.map((h) => (
              <div key={h.id} className="flex justify-between text-[var(--color-text-muted)]">
                <span>{h.name}</span>
                <span>{h.amountG.toFixed(0)} g</span>
              </div>
            ))}
            {preview.scaled.adjuncts.map((a) => (
              <div key={a.id} className="flex justify-between text-[var(--color-text-muted)]">
                <span>{a.name}</span>
                <span>{a.amountKg.toFixed(2)} kg</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Datos del día de cocción" description="Podés completar el resto después, desde la ficha.">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Volumen pre-hervor (L)">
            <Input type="number" step="0.5" {...form.register("preBoilVolumeL")} />
          </FormField>
          <FormField label="Volumen post-hervor (L)">
            <Input type="number" step="0.5" {...form.register("postBoilVolumeL")} />
          </FormField>
          <FormField label="pH de macerado" className="col-span-2">
            <Input type="number" step="0.01" {...form.register("mashPh")} />
          </FormField>
        </div>
        <FormField label="Notas">
          <Textarea rows={3} {...form.register("notes")} />
        </FormField>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!selectedRecipe || form.formState.isSubmitting}>
          Crear cocción
        </Button>
      </div>
    </form>
  )
}
