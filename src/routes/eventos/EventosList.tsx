import { Link } from "react-router-dom"
import { PartyPopper, Plus, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { useEvents } from "@/data/hooks"
import { formatDate } from "@/lib/format"

export function EventosList() {
  const events = useEvents()

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Fiestas, salones y la logística de cada una."
        actions={
          <Button asChild>
            <Link to="/eventos/nuevo">
              <Plus className="h-4 w-4" /> Nuevo
            </Link>
          </Button>
        }
      />

      {events && events.length === 0 && (
        <EmptyState
          icon={PartyPopper}
          title="Sin eventos cargados"
          description="Creá tu próximo evento para estimar consumo, asignar barriles y armar el checklist."
          action={
            <Button asChild>
              <Link to="/eventos/nuevo">
                <Plus className="h-4 w-4" /> Nuevo evento
              </Link>
            </Button>
          }
        />
      )}

      <div className="space-y-2.5">
        {events?.map((e) => (
          <Link key={e.id} to={`/eventos/${e.id}`}>
            <Card className="transition-colors hover:border-[var(--color-primary)]">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-[var(--color-text)]">{e.name}</p>
                  <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{e.venue}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-faint)]">
                    <Users className="h-3.5 w-3.5" /> {e.guestCount} invitados
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-[var(--color-text-faint)]">{formatDate(e.date)}</p>
                  <div className="mt-1.5">
                    <PaymentStatusBadge status={e.paymentStatus} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
