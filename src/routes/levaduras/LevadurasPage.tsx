import { useMemo, useState } from "react"
import { Beaker, Microscope, Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

import { useYeastHarvests, useYeastStrains } from "@/data/hooks"
import { yeastRepo } from "@/data/repositories/yeastRepo"
import { YEAST_TYPE_LABELS } from "@/lib/constants"
import { calcPitchDose, harvestAgeDays, isGenerationHigh, isHarvestStale } from "@/lib/yeastCalc"
import { formatDate } from "@/lib/format"
import type { YeastType } from "@/data/types"

export function LevadurasPage() {
  const strains = useYeastStrains() ?? []
  const harvests = useYeastHarvests() ?? []
  const { toast } = useToast()

  const [strainDialog, setStrainDialog] = useState(false)
  const [harvestDialog, setHarvestDialog] = useState(false)

  // strain form
  const [sName, setSName] = useState("")
  const [sLab, setSLab] = useState("")
  const [sType, setSType] = useState<YeastType>("ale")
  const [sAtt, setSAtt] = useState("75")

  // harvest form
  const [hStrainId, setHStrainId] = useState("")
  const [hGeneration, setHGeneration] = useState("1")
  const [hDate, setHDate] = useState(new Date().toISOString().slice(0, 10))
  const [hViability, setHViability] = useState("95")

  // pitching calc
  const [calcHarvestId, setCalcHarvestId] = useState("")
  const [calcVolume, setCalcVolume] = useState("100")
  const [calcOg, setCalcOg] = useState("1.050")

  const activeHarvests = harvests.filter((h) => !h.discarded)
  const calcHarvest = activeHarvests.find((h) => h.id === calcHarvestId)
  const calcStrain = strains.find((s) => s.id === calcHarvest?.strainId)

  const pitchResult = useMemo(() => {
    if (!calcHarvest || !calcVolume || !calcOg) return null
    return calcPitchDose({
      volumeL: Number(calcVolume),
      og: Number(calcOg),
      yeastType: calcStrain?.type ?? "ale",
      viabilityPct: calcHarvest.viabilityPct,
    })
  }, [calcHarvest, calcStrain, calcVolume, calcOg])

  const saveStrain = async () => {
    if (!sName) return
    await yeastRepo.createStrain({ name: sName, lab: sLab || undefined, type: sType, attenuationPct: Number(sAtt) || undefined })
    toast({ title: "Cepa guardada", variant: "success" })
    setSName("")
    setSLab("")
    setStrainDialog(false)
  }

  const saveHarvest = async () => {
    const strain = strains.find((s) => s.id === hStrainId)
    if (!strain) return
    await yeastRepo.createHarvest({
      strainId: strain.id,
      strainName: strain.name,
      generation: Number(hGeneration) || 1,
      harvestDate: hDate,
      viabilityPct: Number(hViability) || 100,
    })
    toast({ title: "Cosecha guardada", variant: "success" })
    setHarvestDialog(false)
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Levaduras" description="Cepas, cosechas y dosis de inoculación." />

      <Tabs defaultValue="cosechas">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="cosechas">Cosechas</TabsTrigger>
          <TabsTrigger value="cepas">Cepas</TabsTrigger>
        </TabsList>

        <TabsContent value="cosechas" className="space-y-5">
          <SectionCard title="Calculadora de dosis" description="Elegí una cosecha y el volumen/DO objetivo.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Cosecha" className="sm:col-span-1">
                <Select value={calcHarvestId} onChange={(e) => setCalcHarvestId(e.target.value)}>
                  <option value="">— elegir —</option>
                  {activeHarvests.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.strainName} gen.{h.generation} ({formatDate(h.harvestDate)})
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Volumen (L)">
                <Input type="number" value={calcVolume} onChange={(e) => setCalcVolume(e.target.value)} />
              </FormField>
              <FormField label="DO objetivo">
                <Input type="number" step="0.001" value={calcOg} onChange={(e) => setCalcOg(e.target.value)} />
              </FormField>
            </div>
            {pitchResult && (
              <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] p-3 text-center">
                <div>
                  <p className="font-display text-lg font-semibold text-[var(--color-text)]">
                    {pitchResult.targetCellsBillions.toFixed(0)} mil M
                  </p>
                  <p className="text-[10px] uppercase text-[var(--color-text-faint)]">células objetivo</p>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-[var(--color-primary)]">
                    {pitchResult.requiredSlurryL.toFixed(2)} L
                  </p>
                  <p className="text-[10px] uppercase text-[var(--color-text-faint)]">de slurry a inocular</p>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">Cosechas</h2>
            <Button size="sm" onClick={() => setHarvestDialog(true)}>
              <Plus className="h-4 w-4" /> Nueva cosecha
            </Button>
          </div>

          {activeHarvests.length === 0 ? (
            <EmptyState icon={Microscope} title="Sin cosechas registradas" description="Registrá tu primera cosecha de levadura." />
          ) : (
            <div className="space-y-2">
              {activeHarvests.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {h.strainName} · gen. {h.generation}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDate(h.harvestDate)} · {h.viabilityPct}% viabilidad · {harvestAgeDays(h.harvestDate)} días
                    </p>
                    <div className="mt-1 flex gap-1.5">
                      {isHarvestStale(h.harvestDate) && <Badge variant="warning">Más de 14 días</Badge>}
                      {isGenerationHigh(h.generation) && <Badge variant="danger">Generación alta</Badge>}
                    </div>
                  </div>
                  <button type="button" onClick={() => yeastRepo.discardHarvest(h.id)} title="Descartar">
                    <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cepas" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">Cepas</h2>
            <Button size="sm" onClick={() => setStrainDialog(true)}>
              <Plus className="h-4 w-4" /> Nueva cepa
            </Button>
          </div>
          {strains.length === 0 ? (
            <EmptyState icon={Beaker} title="Sin cepas cargadas" description="Cargá las cepas que usás habitualmente." />
          ) : (
            <div className="space-y-2">
              {strains.map((s) => (
                <div key={s.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3.5">
                  <p className="text-sm font-medium text-[var(--color-text)]">{s.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {s.lab && `${s.lab} · `}
                    {YEAST_TYPE_LABELS[s.type]}
                    {s.attenuationPct && ` · ${s.attenuationPct}% atenuación típica`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={strainDialog} onOpenChange={setStrainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cepa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Nombre">
              <Input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ej: US-05" />
            </FormField>
            <FormField label="Laboratorio / origen">
              <Input value={sLab} onChange={(e) => setSLab(e.target.value)} placeholder="Ej: Fermentis" />
            </FormField>
            <FormField label="Tipo">
              <Select value={sType} onChange={(e) => setSType(e.target.value as YeastType)}>
                {Object.entries(YEAST_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Atenuación típica (%)">
              <Input type="number" value={sAtt} onChange={(e) => setSAtt(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button onClick={saveStrain}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={harvestDialog} onOpenChange={setHarvestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cosecha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Cepa">
              <Select value={hStrainId} onChange={(e) => setHStrainId(e.target.value)}>
                <option value="">— elegir —</option>
                {strains.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Generación">
                <Input type="number" value={hGeneration} onChange={(e) => setHGeneration(e.target.value)} />
              </FormField>
              <FormField label="Viabilidad (%)">
                <Input type="number" value={hViability} onChange={(e) => setHViability(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Fecha de cosecha">
              <Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button onClick={saveHarvest} disabled={!hStrainId}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
