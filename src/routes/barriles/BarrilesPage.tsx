import { useState } from "react"
import { ArrowRight, Barrel, MapPin, Plus, Settings2 } from "lucide-react"

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

import { useKegs } from "@/data/hooks"
import { kegRepo } from "@/data/repositories/kegRepo"
import { KEG_STATUS_ORDER, type Keg, type KegStatus } from "@/data/types"
import { KEG_NEXT_STATUS, KEG_STATUS_LABELS } from "@/lib/constants"
import { formatDateShort } from "@/lib/format"

interface KegFormState {
  physicalLabel: string
  capacityL: "20" | "70"
  location: string
  notes: string
}

const EMPTY_FORM: KegFormState = { physicalLabel: "", capacityL: "20", location: "Depósito", notes: "" }

export function BarrilesPage() {
  const kegs = useKegs() ?? []
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<KegFormState>(EMPTY_FORM)

  const [statusDialogKeg, setStatusDialogKeg] = useState<Keg | null>(null)
  const [locationDialogKeg, setLocationDialogKeg] = useState<Keg | null>(null)
  const [locationInput, setLocationInput] = useState("")

  const counts = KEG_STATUS_ORDER.map((s) => ({ status: s, count: kegs.filter((k) => k.status === s).length }))

  const saveKeg = async () => {
    if (!form.physicalLabel) return
    await kegRepo.create({
      physicalLabel: form.physicalLabel,
      capacityL: Number(form.capacityL) as 20 | 70,
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
    await kegRepo.setStatus(keg.id, next)
  }

  const setStatus = async (keg: Keg, status: KegStatus) => {
    await kegRepo.setStatus(keg.id, status)
    setStatusDialogKeg(null)
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
                <Select value={form.capacityL} onChange={(e) => setForm((f) => ({ ...f, capacityL: e.target.value as "20" | "70" }))}>
                  <option value="20">20 L</option>
                  <option value="70">70 L</option>
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
    </div>
  )
}
