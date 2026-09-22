import { Link } from "react-router-dom"
import { Beer, Plus } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { BatchStatusBadge } from "@/components/shared/StatusBadge"
import { useBatches } from "@/data/hooks"
import { formatDate, formatGravity, formatLiters } from "@/lib/format"

export function CoccionesList() {
  const batches = useBatches()

  return (
    <div>
      <PageHeader
        title="Cocciones"
        description="El brew log: una ficha por lote, con trazabilidad completa."
        actions={
          <Button asChild>
            <Link to="/cocciones/nueva">
              <Plus className="h-4 w-4" /> Nueva
            </Link>
          </Button>
        }
      />

      {batches && batches.length === 0 && (
        <EmptyState
          icon={Beer}
          title="Todavía no registraste ninguna cocción"
          description="Arrancá una cocción a partir de una receta para llevar la ficha completa del lote."
          action={
            <Button asChild>
              <Link to="/cocciones/nueva">
                <Plus className="h-4 w-4" /> Nueva cocción
              </Link>
            </Button>
          }
        />
      )}

      <div className="space-y-2.5">
        {batches?.map((b) => (
          <Link key={b.id} to={`/cocciones/${b.id}`}>
            <Card className="transition-colors hover:border-[var(--color-primary)]">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-semibold text-[var(--color-text)]">{b.code}</span>
                    <BatchStatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{b.recipeName}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-[var(--color-text-faint)]">
                  <p>{formatDate(b.brewDate)}</p>
                  <p>
                    {formatLiters(b.batchVolumeL, 0)} {b.og ? `· DO ${formatGravity(b.og)}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
