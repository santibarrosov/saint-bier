import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Copy, Download, ImagePlus, Plus, Printer, QrCode, Timer, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useToast } from "@/components/ui/toast"
import { FermentationChart } from "@/components/charts/FermentationChart"

import { useBatch, useRecipe, useSettings } from "@/data/hooks"
import { batchRepo } from "@/data/repositories/batchRepo"
import { calcABV, calcAttenuation, calcMeasuredEfficiency } from "@/lib/brewCalc"
import { BATCH_STATUS_LABELS, BATCH_STATUS_ORDER } from "@/lib/constants"
import { formatDate, formatGravity, formatPercent, todayIso } from "@/lib/format"
import { downloadBrewSheetPdf } from "@/lib/pdf/brewSheetPdf"
import { generateQrDataUrl } from "@/lib/qr"
import { buildPublicBatchPage, publicBatchUrl } from "@/lib/publicPage"
import { primeAudio } from "@/lib/alarm"
import type { Batch, Recipe, AppSettings } from "@/data/types"

const coreSchema = z.object({
  status: z.enum(["planificada", "cociendo", "fermentando", "madurando", "carbonatando", "envasada", "finalizada"]),
  brewDate: z.string().min(1),
  transferDate: z.string().optional(),
  packageDate: z.string().optional(),
  batchVolumeL: z.coerce.number().positive(),
  preBoilVolumeL: z.coerce.number().min(0).optional(),
  postBoilVolumeL: z.coerce.number().min(0).optional(),
  mashPh: z.coerce.number().min(0).optional(),
  og: z.coerce.number().min(0.98).max(1.2).optional(),
  fg: z.coerce.number().min(0.98).max(1.2).optional(),
  notes: z.string().optional(),
  gasCost: z.coerce.number().min(0).optional(),
  sanitizerCost: z.coerce.number().min(0).optional(),
  laborHours: z.coerce.number().min(0).optional(),
  otherCost: z.coerce.number().min(0).optional(),
})
type CoreValues = z.infer<typeof coreSchema>

export function CoccionDetail() {
  const { id } = useParams<{ id: string }>()
  const batch = useBatch(id)
  const recipe = useRecipe(batch?.recipeId)
  const settings = useSettings()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const form = useForm<CoreValues>({ resolver: zodResolver(coreSchema) })

  useEffect(() => {
    if (!batch) return
    form.reset({
      status: batch.status,
      brewDate: batch.brewDate,
      transferDate: batch.transferDate,
      packageDate: batch.packageDate,
      batchVolumeL: batch.batchVolumeL,
      preBoilVolumeL: batch.preBoilVolumeL,
      postBoilVolumeL: batch.postBoilVolumeL,
      mashPh: batch.mashPh,
      og: batch.og,
      fg: batch.fg,
      notes: batch.notes,
      gasCost: batch.costOverrides?.gasCost,
      sanitizerCost: batch.costOverrides?.sanitizerCost,
      laborHours: batch.costOverrides?.laborHours,
      otherCost: batch.costOverrides?.otherCost,
    })
  }, [batch]) // eslint-disable-line react-hooks/exhaustive-deps

  const [logDate, setLogDate] = useState(todayIso())
  const [logTemp, setLogTemp] = useState("")
  const [logNote, setLogNote] = useState("")

  const [stepName, setStepName] = useState("")
  const [stepTemp, setStepTemp] = useState("")
  const [stepMinutes, setStepMinutes] = useState("")

  const photoUrl = useMemo(() => (batch?.photoBlob ? URL.createObjectURL(batch.photoBlob) : null), [batch?.photoBlob])

  if (!batch) return null

  const abv = batch.og && batch.fg ? calcABV(batch.og, batch.fg) : undefined
  const attenuation = batch.og && batch.fg ? calcAttenuation(batch.og, batch.fg) : undefined

  const onSubmitCore = async (values: CoreValues) => {
    let measuredEfficiencyPct = batch.measuredEfficiencyPct
    const actualVolume = values.postBoilVolumeL ?? values.batchVolumeL
    if (values.og && actualVolume) {
      measuredEfficiencyPct = Number(
        calcMeasuredEfficiency(batch.fermentables, batch.adjuncts, actualVolume, values.og).toFixed(1),
      )
    }

    await batchRepo.update(batch.id, {
      status: values.status,
      brewDate: values.brewDate,
      transferDate: values.transferDate || undefined,
      packageDate: values.packageDate || undefined,
      batchVolumeL: values.batchVolumeL,
      preBoilVolumeL: values.preBoilVolumeL,
      postBoilVolumeL: values.postBoilVolumeL,
      mashPh: values.mashPh,
      og: values.og,
      fg: values.fg,
      notes: values.notes,
      measuredEfficiencyPct,
      costOverrides: {
        gasCost: values.gasCost,
        sanitizerCost: values.sanitizerCost,
        laborHours: values.laborHours,
        otherCost: values.otherCost,
      },
    })
    toast({ title: "Cocción actualizada", variant: "success" })
  }

  const addLog = async () => {
    if (!logTemp) return
    await batchRepo.addFermentationLog(batch.id, { date: logDate, tempC: Number(logTemp), note: logNote || undefined })
    setLogTemp("")
    setLogNote("")
  }

  const addStep = async () => {
    if (!stepName || !stepTemp) return
    const steps = [
      ...batch.mashSteps,
      { id: crypto.randomUUID(), name: stepName, tempC: Number(stepTemp), minutes: Number(stepMinutes) || 0 },
    ]
    await batchRepo.update(batch.id, { mashSteps: steps })
    setStepName("")
    setStepTemp("")
    setStepMinutes("")
  }

  const removeStep = async (stepId: string) => {
    await batchRepo.update(batch.id, { mashSteps: batch.mashSteps.filter((s) => s.id !== stepId) })
  }

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await batchRepo.update(batch.id, { photoBlob: file })
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={batch.code}
        description={batch.recipeName}
        back
        actions={
          <>
            <Button variant="secondary" size="icon" onClick={() => downloadBrewSheetPdf(batch)} title="Exportar PDF">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
            </Button>
          </>
        }
      />

      {(batch.status === "planificada" || batch.status === "cociendo") && (
        <Button asChild size="lg" className="h-16 w-full text-lg">
          <Link to={`/cocciones/${batch.id}/modo-coccion`} onClick={() => primeAudio()}>
            <Timer className="h-5 w-5" /> {batch.brewSession?.active ? "Reanudar Modo Cocción" : "Modo Cocción"}
          </Link>
        </Button>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <StatBox label="DO" value={batch.og ? formatGravity(batch.og) : "—"} />
        <StatBox label="DF" value={batch.fg ? formatGravity(batch.fg) : "—"} />
        <StatBox label="ABV" value={abv ? formatPercent(abv) : "—"} />
        <StatBox label="Atenuación" value={attenuation ? formatPercent(attenuation, 0) : "—"} />
        <StatBox label="Eficiencia real" value={batch.measuredEfficiencyPct ? formatPercent(batch.measuredEfficiencyPct, 0) : "—"} />
      </div>

      <form onSubmit={form.handleSubmit(onSubmitCore)} className="space-y-5">
        <SectionCard title="Estado y fechas">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Estado" className="col-span-2">
              <Select {...form.register("status")}>
                {BATCH_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {BATCH_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Cocción">
              <Input type="date" {...form.register("brewDate")} />
            </FormField>
            <FormField label="Trasvase">
              <Input type="date" {...form.register("transferDate")} />
            </FormField>
            <FormField label="Envasado" className="col-span-2 sm:col-span-1">
              <Input type="date" {...form.register("packageDate")} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Volúmenes y densidad">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField label="Volumen del lote (L)">
              <Input type="number" step="0.5" {...form.register("batchVolumeL")} />
            </FormField>
            <FormField label="Pre-hervor (L)">
              <Input type="number" step="0.5" {...form.register("preBoilVolumeL")} />
            </FormField>
            <FormField label="Post-hervor (L)">
              <Input type="number" step="0.5" {...form.register("postBoilVolumeL")} />
            </FormField>
            <FormField label="pH macerado">
              <Input type="number" step="0.01" {...form.register("mashPh")} />
            </FormField>
            <FormField label="DO medida">
              <Input type="number" step="0.001" {...form.register("og")} />
            </FormField>
            <FormField label="DF medida">
              <Input type="number" step="0.001" {...form.register("fg")} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Costos de esta cocción" description="Dejalo vacío para usar los valores por defecto de Ajustes.">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Gas ($)">
              <Input type="number" step="1" {...form.register("gasCost")} />
            </FormField>
            <FormField label="Sanitizante ($)">
              <Input type="number" step="1" {...form.register("sanitizerCost")} />
            </FormField>
            <FormField label="Horas de trabajo">
              <Input type="number" step="0.5" {...form.register("laborHours")} />
            </FormField>
            <FormField label="Otros costos ($)">
              <Input type="number" step="1" {...form.register("otherCost")} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Notas y foto">
          <Textarea rows={3} {...form.register("notes")} />
          <div className="flex items-center gap-3">
            {photoUrl && <img src={photoUrl} alt="Foto de la cocción" className="h-16 w-16 rounded-[var(--radius-sm)] object-cover" />}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <ImagePlus className="h-4 w-4" />
              {photoUrl ? "Cambiar foto" : "Agregar foto"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
            </label>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>

      <SectionCard title="Macerado">
        <div className="space-y-2">
          {batch.mashSteps.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm">
              <span className="text-[var(--color-text)]">{s.name}</span>
              <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                <span>{s.tempC}°C</span>
                <span>{s.minutes} min</span>
                <button type="button" onClick={() => removeStep(s.id)}>
                  <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Paso" className="col-span-2" value={stepName} onChange={(e) => setStepName(e.target.value)} />
          <Input placeholder="°C" type="number" value={stepTemp} onChange={(e) => setStepTemp(e.target.value)} />
          <Input placeholder="min" type="number" value={stepMinutes} onChange={(e) => setStepMinutes(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={addStep}>
          <Plus className="h-4 w-4" /> Agregar paso
        </Button>
      </SectionCard>

      <SectionCard title="Temperaturas de fermentación">
        {batch.fermentationLogs.length > 0 ? (
          <FermentationChart logs={batch.fermentationLogs} />
        ) : (
          <p className="text-sm text-[var(--color-text-faint)]">Todavía no hay registros.</p>
        )}
        <div className="grid grid-cols-4 gap-2">
          <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          <Input placeholder="°C" type="number" step="0.1" value={logTemp} onChange={(e) => setLogTemp(e.target.value)} />
          <Input placeholder="Nota" className="col-span-2" value={logNote} onChange={(e) => setLogNote(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={addLog}>
          <Plus className="h-4 w-4" /> Agregar registro
        </Button>
        {batch.fermentationLogs.length > 0 && (
          <div className="space-y-1 pt-1">
            {[...batch.fermentationLogs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>
                    {formatDate(l.date)} — {l.tempC}°C {l.note && `· ${l.note}`}
                  </span>
                  <button type="button" onClick={() => batchRepo.removeFermentationLog(batch.id, l.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </SectionCard>

      {recipe && <PublicPortalSection batch={batch} recipe={recipe} settings={settings} />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar ${batch.code}?`}
        description="Esta acción no se puede deshacer."
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          await batchRepo.remove(batch.id)
          toast({ title: "Cocción eliminada" })
          navigate("/cocciones")
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

function PublicPortalSection({ batch, recipe, settings }: { batch: Batch; recipe: Recipe; settings: AppSettings }) {
  const { toast } = useToast()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const baseUrl = settings.publicPortalBaseUrl?.trim()
  const url = baseUrl ? publicBatchUrl(baseUrl, batch.code) : null

  useEffect(() => {
    if (!url) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    generateQrDataUrl(url).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!baseUrl) {
    return (
      <SectionCard title="Portal público">
        <p className="text-sm text-[var(--color-text-muted)]">
          Configurá la URL del portal en{" "}
          <Link to="/ajustes" className="text-[var(--color-primary)] underline">
            Ajustes
          </Link>{" "}
          para poder generar la página y el QR de este lote.
        </p>
      </SectionCard>
    )
  }

  const downloadHtml = () => {
    const html = buildPublicBatchPage({ batch, recipe, settings })
    const blob = new Blob([html], { type: "text/html" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${batch.code}.html`
    a.click()
    // revocar recién después: hacerlo en el mismo tick puede cortar la descarga a mitad de camino
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    toast({ title: "Página descargada", description: `Subila a tu hosting para que quede en ${url}` })
  }

  const printLabels = async () => {
    const { downloadLabelSheetPdf } = await import("@/lib/pdf/labelSheetPdf")
    await downloadLabelSheetPdf({ batch, recipe, publicPortalBaseUrl: baseUrl })
  }

  const copyUrl = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast({ title: "URL copiada" })
  }

  return (
    <SectionCard title="Portal público" description="La ficha que ve un invitado al escanear el QR del barril.">
      <div className="flex flex-col items-center gap-3">
        {qrDataUrl && <img src={qrDataUrl} alt="QR del portal público" className="h-40 w-40 rounded-[var(--radius-md)] bg-white p-2" />}
        <button type="button" onClick={copyUrl} className="flex items-center gap-1.5 text-xs text-[var(--color-text-faint)]">
          <Copy className="h-3.5 w-3.5" /> {url}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={downloadHtml}>
          <QrCode className="h-4 w-4" /> Descargar página
        </Button>
        <Button variant="secondary" onClick={printLabels}>
          <Printer className="h-4 w-4" /> Imprimir etiquetas
        </Button>
      </div>
    </SectionCard>
  )
}
