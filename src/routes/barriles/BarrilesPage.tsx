import { useState } from "react"
import { ArrowRight, Barrel, History, MapPin, Plus, Settings2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { FormField } from "@/components/shared/FormField"
import { EmptyState } from "@/components/shared/EmptyState"
import { KegStatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

import { useBatches, useKegs } from "@/data/hooks"
import { kegRepo } from "@/data/repositories/kegRepo"
import { KEG_CAPACITY_OPTIONS_L, KEG_STATUS_ORDER, type Keg, type KegCapacityL, type KegStatus } from "@/data/types"
import { KEG_NEXT_STATUS, KEG_STATUS_LABELS } from "@/lib/constants"
import { formatDate, formatDateShort, todayIso } from "@/lib/format"

interface KegFormState {
  physicalLabel: string
  capacityL: string
  location: string
  notes: string
}

const EMPTY_FORM: KegFormState = { physicalLabel: "", capacityL: "20", location: "Depósito", notes: "" }

export function BarrilesPage() {
  const kegs = useKegs() ?? []
  const batches = useBatches() ?? []
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<KegFormState>(EMPTY_FORM)

  const [statusDialogKeg, setStatusDialogKeg] = useState<Keg | null>(null)
  const [locationDialogKeg, setLocationDialogKeg] = useState<Keg | null>(null)
  const [locationInput, setLocationInput] = useState("")
  const [fillDialogKeg, setFillDialogKeg] = useState<Keg | null>(null)
  const [fillBatchId, setFillBatchId] = useState("")
  const [historyDialogKeg, setHistoryDialogKeg] = useState<Keg | null>(null)

  const counts = KEG_STATUS_ORDER.map((s) => ({ status: s, count: kegs.filter((k) => k.status === s).length }))

  const saveKeg = async () => {
    if (!form.physicalLabel) return
    await kegRepo.create({
      physicalLabel: form.physicalLabel,
      capacityL: Number(form.capacityL) as KegCapacityL,
      status: "vacio_sucio",
      location: form.location,
      locationSince: new Date().toISOString(),
      notes: form.notes || undefined,
    })
    toast({ title: "Barril agregado", variant: "success" })
    setForm(EMPTY_FORM)
    setDialogOpen(false)
  }

  const advance = async (keg: Keg) => {
    const next = KEG_NEXT_STATUS[keg.status]
    if (!next) return
    if (next === "lleno") {
      setFillDialogKeg(keg)
      setFillBatchId("")
      return
    }
    await kegRepo.setStatus(keg.id, next)
  }

  const setStatus = async (keg: Keg, status: KegStatus) => {
    if (status === "lleno") {
      setStatusDialogKeg(null)
      setFillDialogKeg(keg)
      setFillBatchId("")
      return
    }
    await kegRepo.setStatus(keg.id, status)
    setStatusDialogKeg(null)
  }

  const confirmFill = async () => {
    if (!fillDialogKeg) return
    const batch = batches.find((b) => b.id === fillBatchId)
    await kegRepo.setStatus(fillDialogKeg.id, "lleno", {
      batchId: batch?.id,
      batchCode: batch?.code,
      filledDate: todayIso(),
      remainingL: fillDialogKeg.capacityL,
    })
    toast({ title: "Barril lleno", variant: "success" })
    setFillDialogKeg(null)
  }

  const saveLocation = async () => {
    if (!locationDialogKeg || !locationInput) return
    await kegRepo.moveLocation(locationDialogKeg.id, locationInput)
    setLocationDialogKeg(null)
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Barriles"
        description="Dónde está cada barril y desde cuándo."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo barril
          </Button>
        }
      />

      {kegs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {counts
            .filter((c) => c.count > 0)
            .map((c) => (
              <div key={c.status} className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-1.5 text-xs">
                <span className="font-semibold text-[var(--color-text)]">{c.count}</span>{" "}
                <span className="text-[var(--color-text-muted)]">{KEG_STATUS_LABELS[c.status]}</span>
              </div>
            ))}
        </div>
      )}

      {kegs.length === 0 ? (
        <EmptyState
          icon={Barrel}
          title="Sin barriles cargados"
          description="Cargá tus Cornelius de 20 y 70 L para llevar el control de dónde están."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo barril
            </Button>
          }
        />
      ) : (
        KEG_STATUS_ORDER.map((status) => {
          const list = kegs.filter((k) => k.status === status)
          if (list.length === 0) return null
          return (
            <div key={status}>
              <h2 className="mb-2 font-display text-base font-semibold text-[var(--color-text)]">{KEG_STATUS_LABELS[status]}</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {list.map((k) => (
                  <Card key={k.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display text-base font-semibold text-[var(--color-text)]">{k.physicalLabel}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{k.capacityL} L</p>
                        </div>
                        <KegStatusBadge status={k.status} />
                      </div>

                      {k.currentBatchCode && (
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Lote: {k.currentBatchCode}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setLocationDialogKeg(k)
                          setLocationInput(k.location)
                        }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-faint)]"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {k.location} · desde {formatDateShort(k.locationSince)}
                      </button>

                      <div className="mt-3 flex gap-2">
                        {KEG_NEXT_STATUS[k.status] && (
                          <Button size="sm" className="flex-1" onClick={() => advance(k)}>
                            {KEG_STATUS_LABELS[KEG_NEXT_STATUS[k.status]!]} <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setHistoryDialogKeg(k)} title="Historial">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setStatusDialogKeg(k)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo barril</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Etiqueta / ID físico">
              <Input value={form.physicalLabel} onChange={(e) => setForm((f) => ({ ...f, physicalLabel: e.target.value }))} placeholder="Ej: Cornelius #3" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Capacidad">
                <Select value={form.capacityL} onChange={(e) => setForm((f) => ({ ...f, capacityL: e.target.value }))}>
                  {KEG_CAPACITY_OPTIONS_L.map((l) => (
                    <option key={l} value={l}>
                      {l} L
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Ubicación">
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveKeg}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusDialogKeg} onOpenChange={(o) => !o && setStatusDialogKeg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado — {statusDialogKeg?.physicalLabel}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {KEG_STATUS_ORDER.map((s) => (
              <Button key={s} variant={statusDialogKeg?.status === s ? "default" : "secondary"} onClick={() => statusDialogKeg && setStatus(statusDialogKeg, s)}>
                {KEG_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!locationDialogKeg} onOpenChange={(o) => !o && setLocationDialogKeg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubicación — {locationDialogKeg?.physicalLabel}</DialogTitle>
          </DialogHeader>
          <FormField label="Dónde está ahora">
            <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} autoFocus />
          </FormField>
          <DialogFooter>
            <Button onClick={saveLocation}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fillDialogKeg} onOpenChange={(o) => !o && setFillDialogKeg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Qué lote entra en {fillDialogKeg?.physicalLabel}?</DialogTitle>
          </DialogHeader>
          <FormField label="Lote" hint="Queda guardado en el historial del barril.">
            <Select value={fillBatchId} onChange={(e) => setFillBatchId(e.target.value)}>
              <option value="">— sin especificar —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.recipeName}
                </option>
              ))}
            </Select>
          </FormField>
          <DialogFooter>
            <Button onClick={confirmFill}>Marcar como lleno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialogKeg} onOpenChange={(o) => !o && setHistoryDialogKeg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial — {historyDialogKeg?.physicalLabel}</DialogTitle>
          </DialogHeader>
          {!historyDialogKeg?.history || historyDialogKeg.history.length === 0 ? (
            <p className="text-sm text-[var(--color-text-faint)]">Todavía no pasó ningún lote registrado por este barril.</p>
          ) : (
            <div className="space-y-2">
              {historyDialogKeg.history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm">
                  <span className="text-[var(--color-text)]">{h.batchCode || "Lote sin especificar"}</span>
                  <span className="text-xs text-[var(--color-text-faint)]">{formatDate(h.filledDate)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
