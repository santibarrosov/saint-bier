import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { Pencil, Plus, Sparkles, Trash2, Users, Wand2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { KegStatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useToast } from "@/components/ui/toast"

import { db } from "@/data/db"
import { useEvent, useKegs, useSettings } from "@/data/hooks"
import { eventRepo } from "@/data/repositories/eventRepo"
import { kegRepo } from "@/data/repositories/kegRepo"
import { calcEstimatedConsumption, suggestKegsForLiters } from "@/lib/eventCalc"
import { calcBatchCost, calcMarginPct } from "@/lib/costCalc"
import { formatCurrency, formatLiters, formatPercent } from "@/lib/format"

export function EventoDetail() {
  const { id } = useParams<{ id: string }>()
  const event = useEvent(id)
  const kegs = useKegs() ?? []
  const settings = useSettings()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [notes, setNotes] = useState(event?.notes ?? "")

  const assignedKegs = kegs.filter((k) => event?.assignedKegIds.includes(k.id))
  const readyKegs = kegs.filter((k) => k.status === "listo" || event?.assignedKegIds.includes(k.id))

  const estimatedLiters = event ? calcEstimatedConsumption(event.guestCount, event.litersPerAdultOverride ?? settings.litersPerAdult) : 0
  const assignedLiters = assignedKegs.reduce((sum, k) => sum + (k.estimatedRemainingL ?? k.capacityL), 0)

  const costData = useLiveQuery(async () => {
    if (!event) return null
    const inventoryItems = await db.inventoryItems.toArray()
    const inventoryById = new Map(inventoryItems.map((i) => [i.id, i]))
    let totalCost = 0
    for (const keg of assignedKegs) {
      if (!keg.currentBatchId) continue
      const batch = await db.batches.get(keg.currentBatchId)
      if (!batch) continue
      const breakdown = calcBatchCost(batch, settings, inventoryById)
      totalCost += breakdown.costPerLiter * (keg.estimatedRemainingL ?? keg.capacityL)
    }
    return totalCost
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.assignedKegIds.join(","), settings])

  if (!event) return null

  const toggleKeg = async (kegId: string) => {
    const set = new Set(event.assignedKegIds)
    if (set.has(kegId)) set.delete(kegId)
    else set.add(kegId)
    await eventRepo.update(event.id, { assignedKegIds: [...set] })
  }

  const autoSuggest = async () => {
    const suggestion = suggestKegsForLiters(estimatedLiters, kegs)
    if (suggestion.kegIds.length === 0) {
      toast({ title: "No hay barriles listos para sugerir", variant: "warning" })
      return
    }
    await eventRepo.update(event.id, { assignedKegIds: suggestion.kegIds })
    if (suggestion.shortfallL > 0) {
      toast({ title: "Asignados, pero puede faltar volumen", description: `Faltarían ~${formatLiters(suggestion.shortfallL, 0)}`, variant: "warning" })
    } else {
      toast({ title: "Barriles sugeridos asignados", variant: "success" })
    }
  }

  const sendToEvent = async () => {
    for (const k of assignedKegs) {
      if (k.status === "listo") await kegRepo.setStatus(k.id, "en_evento", { location: event.venue })
    }
    toast({ title: "Barriles marcados como en evento", variant: "success" })
  }

  const addChecklistItem = async () => {
    if (!newChecklistItem) return
    await eventRepo.update(event.id, {
      checklist: [...event.checklist, { id: crypto.randomUUID(), label: newChecklistItem, done: false }],
    })
    setNewChecklistItem("")
  }

  const removeChecklistItem = async (itemId: string) => {
    await eventRepo.update(event.id, { checklist: event.checklist.filter((c) => c.id !== itemId) })
  }

  const saveNotes = async () => {
    await eventRepo.update(event.id, { notes })
  }

  const balance = event.budget - event.deposit
  const margin = costData != null ? calcMarginPct(event.budget, costData) : null

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title={event.name}
        description={`${event.venue} · ${event.client}`}
        back
        actions={
          <>
            <Button variant="secondary" size="icon" asChild>
              <Link to={`/eventos/${event.id}/editar`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
            </Button>
          </>
        }
      />

      <SectionCard title="Consumo estimado">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="flex items-center justify-center gap-1 font-display text-lg font-semibold text-[var(--color-text)]">
              <Users className="h-4 w-4" /> {event.guestCount}
            </p>
            <p className="text-[10px] uppercase text-[var(--color-text-faint)]">invitados</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-primary)]">{formatLiters(estimatedLiters, 0)}</p>
            <p className="text-[10px] uppercase text-[var(--color-text-faint)]">estimados</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-text)]">{formatLiters(assignedLiters, 0)}</p>
            <p className="text-[10px] uppercase text-[var(--color-text-faint)]">asignados</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Barriles asignados"
        actions={
          <Button size="sm" variant="secondary" onClick={autoSuggest}>
            <Wand2 className="h-4 w-4" /> Sugerir
          </Button>
        }
      >
        {readyKegs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">No hay barriles listos todavía.</p>
        ) : (
          <div className="space-y-2">
            {readyKegs.map((k) => (
              <label key={k.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
                <Checkbox checked={event.assignedKegIds.includes(k.id)} onCheckedChange={() => toggleKeg(k.id)} />
                <span className="flex-1 text-sm text-[var(--color-text)]">
                  {k.physicalLabel} · {k.capacityL} L
                </span>
                <KegStatusBadge status={k.status} />
              </label>
            ))}
          </div>
        )}
        {assignedKegs.some((k) => k.status === "listo") && (
          <Button variant="secondary" className="w-full" onClick={sendToEvent}>
            <Sparkles className="h-4 w-4" /> Marcar asignados como "en evento"
          </Button>
        )}
      </SectionCard>

      <SectionCard title="Presupuesto y cobro">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox label="Presupuesto" value={formatCurrency(event.budget)} />
          <StatBox label="Seña" value={formatCurrency(event.deposit)} />
          <StatBox label="Saldo" value={formatCurrency(balance)} />
        </div>
        {margin != null && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Margen estimado: <span className="font-medium text-[var(--color-text)]">{formatPercent(margin, 0)}</span>
          </p>
        )}
      </SectionCard>

      <SectionCard title="Checklist del día">
        <div className="space-y-2">
          {event.checklist.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
              <Checkbox checked={item.done} onCheckedChange={() => eventRepo.toggleChecklistItem(event.id, item.id)} />
              <span className={`flex-1 text-sm ${item.done ? "text-[var(--color-text-faint)] line-through" : "text-[var(--color-text)]"}`}>
                {item.label}
              </span>
              <button type="button" onClick={() => removeChecklistItem(item.id)}>
                <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              </button>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Agregar ítem" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} />
          <Button type="button" variant="secondary" onClick={addChecklistItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Notas">
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
      </SectionCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar este evento?"
        destructive
        confirmLabel="Eliminar"
        onConfirm={async () => {
          await eventRepo.remove(event.id)
          toast({ title: "Evento eliminado" })
          navigate("/eventos")
        }}
      />
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] py-2.5">
      <p className="font-display text-base font-semibold text-[var(--color-text)]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
    </div>
  )
}
