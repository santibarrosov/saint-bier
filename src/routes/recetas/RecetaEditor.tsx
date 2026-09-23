import { useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, FlaskConical } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"

import { useRecipe, useYeastStrains, useInventoryItems } from "@/data/hooks"
import { recipeRepo } from "@/data/repositories/recipeRepo"
import type { Recipe } from "@/data/types"
import { BEER_STYLES, FERMENTABLE_TYPE_LABELS, HOP_USE_LABELS } from "@/lib/constants"
import { calcRecipeStats } from "@/lib/brewCalc"
import { formatGravity, formatPercent } from "@/lib/format"

import { recipeFormSchema, DEFAULT_RECIPE_VALUES, type RecipeFormValues } from "./recipeFormSchema"

function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    style: recipe.style,
    targetVolumeL: recipe.targetVolumeL,
    efficiencyPct: recipe.efficiencyPct,
    yeastStrainId: recipe.yeastStrainId,
    plannedFermentationDays: recipe.plannedFermentationDays,
    plannedConditioningDays: recipe.plannedConditioningDays,
    plannedCarbonationDays: recipe.plannedCarbonationDays,
    boilTimeMin: recipe.boilTimeMin ?? 60,
    targetOg: recipe.targets.og,
    targetFg: recipe.targets.fg,
    targetAbv: recipe.targets.abv,
    targetIbu: recipe.targets.ibu,
    targetSrm: recipe.targets.srm,
    notes: recipe.notes ?? "",
    publicTastingNote: recipe.publicTastingNote ?? "",
    publicIngredientsNote: recipe.publicIngredientsNote ?? "",
    fermentables: recipe.fermentables.map((f) => ({ ...f })),
    hops: recipe.hops.map((h) => ({ ...h })),
    adjuncts: recipe.adjuncts.map((a) => ({ ...a })),
  }
}

export function RecetaEditor() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useRecipe(id)
  const yeastStrains = useYeastStrains() ?? []
  const inventoryItems = useInventoryItems() ?? []
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: DEFAULT_RECIPE_VALUES,
  })

  useEffect(() => {
    if (existing) form.reset(recipeToFormValues(existing))
  }, [existing]) // eslint-disable-line react-hooks/exhaustive-deps

  const fermentables = useFieldArray({ control: form.control, name: "fermentables" })
  const hops = useFieldArray({ control: form.control, name: "hops" })
  const adjuncts = useFieldArray({ control: form.control, name: "adjuncts" })

  const watched = useWatch({ control: form.control })

  const liveStats = useMemo(() => {
    return calcRecipeStats({
      fermentables: (watched.fermentables ?? []).map((f) => ({
        id: "",
        name: f?.name ?? "",
        type: f?.type ?? "malta_base",
        amountKg: Number(f?.amountKg) || 0,
        potentialPpg: Number(f?.potentialPpg) || 0,
        colorLovibond: Number(f?.colorLovibond) || 0,
      })),
      hops: (watched.hops ?? []).map((h) => ({
        id: "",
        name: h?.name ?? "",
        alphaAcidPct: Number(h?.alphaAcidPct) || 0,
        amountG: Number(h?.amountG) || 0,
        use: h?.use ?? "hervor",
        timeMin: Number(h?.timeMin) || 0,
      })),
      adjuncts: (watched.adjuncts ?? []).map((a) => ({
        id: "",
        name: a?.name ?? "",
        amountKg: Number(a?.amountKg) || 0,
        potentialPpg: Number(a?.potentialPpg) || 0,
        timing: a?.timing ?? "",
      })),
      targetVolumeL: Number(watched.targetVolumeL) || 0,
      efficiencyPct: Number(watched.efficiencyPct) || 0,
    })
  }, [watched])

  const maltaItems = inventoryItems.filter((i) => i.category === "malta")
  const lupuloItems = inventoryItems.filter((i) => i.category === "lupulo")
  const adjuntoItems = inventoryItems.filter((i) => i.category === "adjunto")

  const onSubmit = async (values: RecipeFormValues) => {
    const input = {
      name: values.name,
      style: values.style,
      targetVolumeL: values.targetVolumeL,
      efficiencyPct: values.efficiencyPct,
      yeastStrainId: values.yeastStrainId || undefined,
      plannedFermentationDays: values.plannedFermentationDays,
      plannedConditioningDays: values.plannedConditioningDays,
      plannedCarbonationDays: values.plannedCarbonationDays,
      boilTimeMin: values.boilTimeMin,
      targets: { og: values.targetOg, fg: values.targetFg, abv: values.targetAbv, ibu: values.targetIbu, srm: values.targetSrm },
      notes: values.notes,
      publicTastingNote: values.publicTastingNote,
      publicIngredientsNote: values.publicIngredientsNote,
      fermentables: values.fermentables.map((f) => ({ ...f, id: crypto.randomUUID() })),
      hops: values.hops.map((h) => ({ ...h, id: crypto.randomUUID() })),
      adjuncts: values.adjuncts.map((a) => ({ ...a, id: crypto.randomUUID() })),
    }

    if (isEdit && id) {
      await recipeRepo.update(id, input)
      toast({ title: "Receta actualizada", variant: "success" })
      navigate(`/recetas/${id}`)
    } else {
      const created = await recipeRepo.create(input)
      toast({ title: "Receta creada", variant: "success" })
      navigate(`/recetas/${created.id}`)
    }
  }

  const ingredientCount = fermentables.fields.length + hops.fields.length + adjuncts.fields.length

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="pb-6">
      <PageHeader title={isEdit ? "Editar receta" : "Nueva receta"} back />

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ingredientes">
            Ingredientes{ingredientCount > 0 && ` (${ingredientCount})`}
          </TabsTrigger>
          <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-5">
          <SectionCard title="Datos generales">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nombre" error={form.formState.errors.name?.message} className="sm:col-span-2">
                <Input placeholder="Ej: Ámbar del pueblo" {...form.register("name")} />
              </FormField>
              <FormField label="Estilo" error={form.formState.errors.style?.message}>
                <Input list="beer-styles" placeholder="Estilo" {...form.register("style")} />
                <datalist id="beer-styles">
                  {BEER_STYLES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Levadura">
                <Select {...form.register("yeastStrainId")}>
                  <option value="">— sin definir —</option>
                  {yeastStrains.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Volumen objetivo" hint="Litros a los que rinde esta receta" error={form.formState.errors.targetVolumeL?.message}>
                <Input type="number" step="0.1" {...form.register("targetVolumeL")} />
              </FormField>
              <FormField
                label="Eficiencia de macerado"
                hint="% del azúcar de la malta que realmente pasa al mosto. 65-70% es típico en olla, 75-80% con sistemas más eficientes."
                error={form.formState.errors.efficiencyPct?.message}
              >
                <Input type="number" step="1" {...form.register("efficiencyPct")} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Objetivos" description="Los números a los que apunta esta receta — se comparan con lo estimado en la pestaña Ingredientes.">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <FormField label="DO" hint="Densidad inicial">
                <Input type="number" step="0.001" {...form.register("targetOg")} />
              </FormField>
              <FormField label="DF" hint="Densidad final">
                <Input type="number" step="0.001" {...form.register("targetFg")} />
              </FormField>
              <FormField label="ABV %" hint="Alcohol">
                <Input type="number" step="0.1" {...form.register("targetAbv")} />
              </FormField>
              <FormField label="IBU" hint="Amargor">
                <Input type="number" step="1" {...form.register("targetIbu")} />
              </FormField>
              <FormField label="SRM" hint="Color">
                <Input type="number" step="0.5" {...form.register("targetSrm")} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Notas">
            <Textarea rows={3} placeholder="Cualquier detalle para recordar la próxima vez que cocines esta receta" {...form.register("notes")} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="ingredientes" className="space-y-5">
          <SectionCard
            title="Fermentables"
            description="Potencial en PPG (36 pale ale, 38 pilsen, 25 munich oscura son valores típicos) y color en grados Lovibond °L (2-3 maltas base, 10-40 caramelo, 300+ tostadas)."
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  fermentables.append({ name: "", type: "malta_base", amountKg: 0, potentialPpg: 36, colorLovibond: 2 })
                }
              >
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            }
          >
            {fermentables.fields.length === 0 && <p className="text-sm text-[var(--color-text-faint)]">Sin fermentables todavía.</p>}
            <div className="space-y-3">
              {fermentables.fields.map((field, idx) => (
                <Card key={field.id} className="space-y-3 border-[var(--color-border-hairline)] bg-[var(--color-bg-elevated)] p-3.5">
                  <div className="flex items-start gap-2">
                    <FormField label="Nombre" className="flex-1">
                      <Input placeholder="Ej: Pale Ale Malt" {...form.register(`fermentables.${idx}.name`)} />
                    </FormField>
                    <Button type="button" variant="ghost" size="icon-sm" className="mt-6" onClick={() => fermentables.remove(idx)}>
                      <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField label="Tipo">
                      <Select {...form.register(`fermentables.${idx}.type`)}>
                        {Object.entries(FERMENTABLE_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Cantidad (kg)">
                      <Input type="number" step="0.01" {...form.register(`fermentables.${idx}.amountKg`)} />
                    </FormField>
                    <FormField label="Potencial (PPG)">
                      <Input type="number" step="1" {...form.register(`fermentables.${idx}.potentialPpg`)} />
                    </FormField>
                    <FormField label="Color (°L)">
                      <Input type="number" step="1" {...form.register(`fermentables.${idx}.colorLovibond`)} />
                    </FormField>
                  </div>
                  <FormField label="Vincular a inventario (opcional)">
                    <Select {...form.register(`fermentables.${idx}.inventoryItemId`)}>
                      <option value="">— sin vincular —</option>
                      {maltaItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.stockQty} {i.unit})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </Card>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Lúpulos"
            description="% de ácido alfa según el paquete, y minutos de hervor restantes en el momento de la adición (60 = se agrega al arrancar el hervor, 0 = al apagar el fuego)."
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => hops.append({ name: "", alphaAcidPct: 10, amountG: 0, use: "hervor", timeMin: 60 })}
              >
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            }
          >
            {hops.fields.length === 0 && <p className="text-sm text-[var(--color-text-faint)]">Sin lúpulos todavía.</p>}
            <div className="space-y-3">
              {hops.fields.map((field, idx) => (
                <Card key={field.id} className="space-y-3 border-[var(--color-border-hairline)] bg-[var(--color-bg-elevated)] p-3.5">
                  <div className="flex items-start gap-2">
                    <FormField label="Nombre" className="flex-1">
                      <Input placeholder="Ej: Cascade" {...form.register(`hops.${idx}.name`)} />
                    </FormField>
                    <Button type="button" variant="ghost" size="icon-sm" className="mt-6" onClick={() => hops.remove(idx)}>
                      <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField label="Ácido alfa (%)">
                      <Input type="number" step="0.1" {...form.register(`hops.${idx}.alphaAcidPct`)} />
                    </FormField>
                    <FormField label="Cantidad (g)">
                      <Input type="number" step="1" {...form.register(`hops.${idx}.amountG`)} />
                    </FormField>
                    <FormField label="Uso">
                      <Select {...form.register(`hops.${idx}.use`)}>
                        {Object.entries(HOP_USE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Tiempo (min)">
                      <Input type="number" step="1" {...form.register(`hops.${idx}.timeMin`)} />
                    </FormField>
                  </div>
                  <FormField label="Vincular a inventario (opcional)">
                    <Select {...form.register(`hops.${idx}.inventoryItemId`)}>
                      <option value="">— sin vincular —</option>
                      {lupuloItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.stockQty} {i.unit})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </Card>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Adjuntos"
            description="Miel, mosto de uva, especias, etc. Potencial en PPG si aporta azúcar fermentable (miel ≈ 35), 0 si no aporta (especias, frutas de aroma)."
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => adjuncts.append({ name: "", amountKg: 0, potentialPpg: 0, timing: "Fermentador" })}
              >
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            }
          >
            {adjuncts.fields.length === 0 && <p className="text-sm text-[var(--color-text-faint)]">Sin adjuntos todavía.</p>}
            <div className="space-y-3">
              {adjuncts.fields.map((field, idx) => (
                <Card key={field.id} className="space-y-3 border-[var(--color-border-hairline)] bg-[var(--color-bg-elevated)] p-3.5">
                  <div className="flex items-start gap-2">
                    <FormField label="Nombre" className="flex-1">
                      <Input placeholder="Ej: Miel" {...form.register(`adjuncts.${idx}.name`)} />
                    </FormField>
                    <Button type="button" variant="ghost" size="icon-sm" className="mt-6" onClick={() => adjuncts.remove(idx)}>
                      <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="Cantidad (kg)">
                      <Input type="number" step="0.01" {...form.register(`adjuncts.${idx}.amountKg`)} />
                    </FormField>
                    <FormField label="Potencial (PPG)">
                      <Input type="number" step="1" {...form.register(`adjuncts.${idx}.potentialPpg`)} />
                    </FormField>
                    <FormField label="Momento">
                      <Input placeholder="Ej: Fermentador" {...form.register(`adjuncts.${idx}.timing`)} />
                    </FormField>
                  </div>
                  <FormField label="Vincular a inventario (opcional)">
                    <Select {...form.register(`adjuncts.${idx}.inventoryItemId`)}>
                      <option value="">— sin vincular —</option>
                      {adjuntoItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.stockQty} {i.unit})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </Card>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="avanzado" className="space-y-5">
          <SectionCard title="Tiempos planificados" description="Alimentan al planificador de producción y a Modo Cocción.">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FormField label="Fermentación (días)">
                <Input type="number" {...form.register("plannedFermentationDays")} />
              </FormField>
              <FormField label="Maduración (días)">
                <Input type="number" {...form.register("plannedConditioningDays")} />
              </FormField>
              <FormField label="Carbonatación (días)">
                <Input type="number" {...form.register("plannedCarbonationDays")} />
              </FormField>
              <FormField label="Hervor (minutos)">
                <Input type="number" {...form.register("boilTimeMin")} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Portal público" description="Para la página que ve un invitado al escanear el QR del barril.">
            <FormField label="A qué sabe" hint="En criollo, no en grados Plato">
              <Textarea rows={2} placeholder="Ej: Amarga y cítrica, con final seco. Ideal bien fría." {...form.register("publicTastingNote")} />
            </FormField>
            <FormField label="Ingredientes (opcional)" hint="Si lo dejás vacío, se arma solo a partir de las maltas, lúpulos y adjuntos de arriba.">
              <Textarea rows={2} placeholder="Se autogenera si lo dejás vacío" {...form.register("publicIngredientsNote")} />
            </FormField>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-20 z-10 mt-5 rounded-[var(--radius-lg)] border border-[var(--color-primary)]/30 bg-[var(--color-bg-overlay)]/95 p-4 backdrop-blur md:static md:bottom-auto">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
          <FlaskConical className="h-4 w-4" /> Estimado con los ingredientes actuales
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          <Stat label="DO" value={formatGravity(liveStats.og)} />
          <Stat label="DF" value={formatGravity(liveStats.fg)} />
          <Stat label="ABV" value={formatPercent(liveStats.abv)} />
          <Stat label="IBU" value={liveStats.ibu.toFixed(0)} />
          <Stat label="SRM" value={liveStats.srm.toFixed(1)} />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Guardar receta
        </Button>
      </div>
    </form>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold text-[var(--color-text)]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
    </div>
  )
}
