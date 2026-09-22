import { Link } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { AlertTriangle, Barrel, Beer, Droplets, PartyPopper, Thermometer } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { SectionCard } from "@/components/shared/SectionCard"
import { Logo } from "@/components/layout/Logo"

import { db } from "@/data/db"
import { useSettings } from "@/data/hooks"
import { isHarvestStale } from "@/lib/yeastCalc"
import { formatDate, formatLiters, todayIso } from "@/lib/format"

export function Dashboard() {
  const settings = useSettings()

  const data = useLiveQuery(async () => {
    const [batches, kegs, events, inventoryItems, yeastHarvests, recipes] = await Promise.all([
      db.batches.toArray(),
      db.kegs.toArray(),
      db.events.toArray(),
      db.inventoryItems.toArray(),
      db.yeastHarvests.toArray(),
      db.recipes.toArray(),
    ])

    const now = new Date()
    const litersThisMonth = batches
      .filter((b) => {
        const d = parseISO(b.brewDate)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, b) => sum + b.batchVolumeL, 0)

    const kegsReady = kegs.filter((k) => k.status === "listo").length
    const kegsAtEvent = kegs.filter((k) => k.status === "en_evento")

    const nextEvent = events.filter((e) => e.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date))[0]

    const activeBatches = batches.filter((b) => b.status !== "envasada" && b.status !== "finalizada")
    const fermenterBatch = activeBatches[0]
    const fermenterRecipe = fermenterBatch ? recipes.find((r) => r.id === fermenterBatch.recipeId) : undefined
    const daysSinceBrew = fermenterBatch ? differenceInCalendarDays(now, parseISO(fermenterBatch.brewDate)) : 0
    const plannedTotalDays = fermenterRecipe ? fermenterRecipe.plannedFermentationDays + fermenterRecipe.plannedConditioningDays : 0
    const daysRemaining = Math.max(0, plannedTotalDays - daysSinceBrew)

    const lowStock = inventoryItems.filter((i) => !i.archived && i.stockQty <= i.minStockQty)
    const staleHarvests = yeastHarvests.filter((h) => !h.discarded && isHarvestStale(h.harvestDate))
    const stalledFermentation = activeBatches.filter((b) => {
      if (b.status !== "fermentando") return false
      const lastLog = [...b.fermentationLogs].sort((a, c) => c.date.localeCompare(a.date))[0]
      const daysSinceLog = lastLog ? differenceInCalendarDays(now, parseISO(lastLog.date)) : differenceInCalendarDays(now, parseISO(b.brewDate))
      return daysSinceLog >= 3
    })
    const kegsOutLong = kegsAtEvent.filter((k) => differenceInCalendarDays(now, parseISO(k.locationSince)) >= 3)

    return {
      litersThisMonth,
      kegsReady,
      nextEvent,
      fermenterBatch,
      daysSinceBrew,
      daysRemaining,
      lowStock,
      staleHarvests,
      stalledFermentation,
      kegsOutLong,
      fermenterCount: activeBatches.length,
    }
  }, [], undefined)

  if (!data) return null

  const alerts: Array<{ label: string; to: string }> = [
    ...data.lowStock.map((i) => ({ label: `Stock bajo: ${i.name}`, to: "/inventario" })),
    ...data.staleHarvests.map((h) => ({ label: `Cosecha de ${h.strainName} con más de 14 días`, to: "/levaduras" })),
    ...data.stalledFermentation.map((b) => ({ label: `${b.code} sin registro de temperatura reciente`, to: `/cocciones/${b.id}` })),
    ...data.kegsOutLong.map((k) => ({ label: `${k.physicalLabel} en evento hace más de 3 días — ¿lo trajiste?`, to: "/barriles" })),
  ]

  return (
    <div className="space-y-5 pb-6">
      <div className="mb-1 hidden md:block">
        <Logo markSize={44} wordmarkClassName="text-2xl" />
      </div>
      <PageHeader title="Dashboard" description="Todo tu negocio de un vistazo." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Droplets} label="Litros este mes" value={formatLiters(data.litersThisMonth, 0)} />
        <StatCard icon={Barrel} label="Barriles listos" value={String(data.kegsReady)} />
        <StatCard
          icon={PartyPopper}
          label="Próximo evento"
          value={data.nextEvent ? formatDate(data.nextEvent.date) : "—"}
          sublabel={data.nextEvent?.name}
        />
        <StatCard
          icon={Thermometer}
          label="Fermentador"
          value={data.fermenterBatch ? data.fermenterBatch.code : "Libre"}
          sublabel={data.fermenterBatch ? `~${data.daysRemaining} días para envasar` : `${settings.fermenterCount} disponible(s)`}
          accent={data.fermenterBatch ? "warning" : "success"}
        />
      </div>

      {alerts.length > 0 && (
        <SectionCard title="Alertas">
          <div className="space-y-2">
            {alerts.map((a, idx) => (
              <Link
                key={idx}
                to={a.to}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-[var(--color-warning-soft)] px-3 py-2.5 text-sm text-[var(--color-warning)]"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {a.label}
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {!data.fermenterBatch && (
        <SectionCard title="El fermentador está libre" description="Es el mejor momento para arrancar la próxima cocción.">
          <Link to="/cocciones/nueva" className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
            <Beer className="h-4 w-4" /> Nueva cocción
          </Link>
        </SectionCard>
      )}
    </div>
  )
}
