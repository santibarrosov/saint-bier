import { useMemo, useState } from "react"
import { parseISO, addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval } from "date-fns"
import { es } from "date-fns/locale"
import { AlertTriangle, Beer, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

import { useActiveRecipes, useEvents, useFermenterActiveBatches, useSettings } from "@/data/hooks"
import { calcBackwardSchedule, checkFermenterConflict, fermenterWindowFor } from "@/lib/scheduler"
import { BATCH_STATUS_LABELS } from "@/lib/constants"
import { formatDate, todayIso } from "@/lib/format"
import type { Batch, Event } from "@/data/types"

export function PlanificadorPage() {
  const recipes = useActiveRecipes() ?? []
  const events = useEvents() ?? []
  const activeBatches = useFermenterActiveBatches() ?? []
  const settings = useSettings()

  const [recipeId, setRecipeId] = useState("")
  const [eventDate, setEventDate] = useState(todayIso())

  const recipe = recipes.find((r) => r.id === recipeId)

  const schedule = useMemo(() => {
    if (!recipe || !eventDate) return null
    return calcBackwardSchedule(eventDate, {
      fermentationDays: recipe.plannedFermentationDays,
      conditioningDays: recipe.plannedConditioningDays,
      carbonationDays: recipe.plannedCarbonationDays,
    })
  }, [recipe, eventDate])

  const conflict = useMemo(() => {
    if (!schedule) return null
    return checkFermenterConflict(
      { start: parseISO(schedule.requiredBrewDate), end: parseISO(schedule.requiredPackageDate) },
      activeBatches,
      settings.fermenterCount,
    )
  }, [schedule, activeBatches, settings.fermenterCount])

  const agendaItems = useMemo(() => {
    const items: Array<{ date: string; label: string; type: "brew" | "event" }> = []
    for (const b of activeBatches) {
      items.push({ date: b.brewDate, label: `${b.code} — cocción (${BATCH_STATUS_LABELS[b.status]})`, type: "brew" })
    }
    for (const e of events) {
      if (e.date >= todayIso()) items.push({ date: e.date, label: `${e.name} — ${e.venue}`, type: "event" })
    }
    return items.sort((a, b) => a.date.localeCompare(b.date))
  }, [activeBatches, events])

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Planificador" description="Con un solo fermentador, la fecha de cocción lo es todo." />

      <SectionCard title="¿Cuándo tengo que cocinar?" description="Elegí receta y fecha de evento; calcula hacia atrás.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Receta">
            <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              <option value="">— elegir —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fecha del evento">
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </FormField>
        </div>

        {schedule && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatBox label="Cocinar el" value={formatDate(schedule.requiredBrewDate)} />
            <StatBox label="Envasar el" value={formatDate(schedule.requiredPackageDate)} />
            <StatBox label="Listo el" value={formatDate(schedule.requiredReadyDate)} />
          </div>
        )}

        {conflict?.hasConflict && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
            <div className="text-sm text-[var(--color-danger)]">
              <p className="font-medium">El fermentador va a estar ocupado</p>
              {conflict.overlapping.map((w) => (
                <p key={w.batchId} className="text-xs opacity-90">
                  {w.batchCode}: {format(w.start, "d MMM", { locale: es })} — {format(w.end, "d MMM", { locale: es })}
                </p>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <Tabs defaultValue="agenda">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="mes">Mes</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda">
          <SectionCard title="Próximos">
            {agendaItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-faint)]">Nada por venir todavía.</p>
            ) : (
              <div className="space-y-2">
                {agendaItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-3 py-2.5">
                    {item.type === "brew" ? (
                      <Beer className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    ) : (
                      <PartyPopper className="h-4 w-4 shrink-0 text-[var(--color-violet)]" />
                    )}
                    <span className="flex-1 text-sm text-[var(--color-text)]">{item.label}</span>
                    <span className="text-xs text-[var(--color-text-faint)]">{formatDate(item.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="mes">
          <MonthView batches={activeBatches} events={events} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] py-2.5">
      <p className="font-display text-sm font-semibold text-[var(--color-text)]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
    </div>
  )
}

function MonthView({ batches, events }: { batches: Batch[]; events: Event[] }) {
  const [month, setMonth] = useState(new Date())
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const windows = batches.map(fermenterWindowFor)

  return (
    <SectionCard
      title={format(month, "MMMM yyyy", { locale: es })}
      actions={
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-[var(--color-text-faint)]">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isOccupied = windows.some((w) => isWithinInterval(day, { start: w.start, end: w.end }))
          const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), day))
          const dayBrews = batches.filter((b) => isSameDay(parseISO(b.brewDate), day))

          return (
            <div
              key={day.toISOString()}
              className={`flex min-h-14 flex-col items-center gap-1 rounded-[var(--radius-sm)] p-1 text-xs ${
                inMonth ? "bg-[var(--color-bg-elevated)]" : "bg-transparent opacity-30"
              } ${isOccupied ? "ring-1 ring-inset ring-[var(--color-primary)]/40" : ""}`}
            >
              <span className="text-[var(--color-text-muted)]">{format(day, "d")}</span>
              <div className="flex flex-wrap justify-center gap-0.5">
                {dayBrews.map((b) => (
                  <span key={b.id} className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" title={b.code} />
                ))}
                {dayEvents.map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full bg-[var(--color-violet)]" title={e.name} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 pt-1 text-xs text-[var(--color-text-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" /> Cocción
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-violet)]" /> Evento
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="neutral" className="px-1.5 py-0.5">
            &nbsp;
          </Badge>
          Fermentador ocupado
        </span>
      </div>
    </SectionCard>
  )
}
