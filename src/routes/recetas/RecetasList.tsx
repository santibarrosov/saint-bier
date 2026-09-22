import { Link } from "react-router-dom"
import { FlaskConical, Plus } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { useActiveRecipes } from "@/data/hooks"
import { formatLiters, formatPercent } from "@/lib/format"

export function RecetasList() {
  const recipes = useActiveRecipes()

  return (
    <div>
      <PageHeader
        title="Recetas"
        description="Tu recetario, con escalado y cálculo automático."
        actions={
          <Button asChild>
            <Link to="/recetas/nueva">
              <Plus className="h-4 w-4" /> Nueva
            </Link>
          </Button>
        }
      />

      {recipes && recipes.length === 0 && (
        <EmptyState
          icon={FlaskConical}
          title="Todavía no cargaste ninguna receta"
          description="Creá tu primera receta con maltas, lúpulos y levadura para poder escalarla y usarla en una cocción."
          action={
            <Button asChild>
              <Link to="/recetas/nueva">
                <Plus className="h-4 w-4" /> Nueva receta
              </Link>
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((r) => (
          <Link key={r.id} to={`/recetas/${r.id}`}>
            <Card className="h-full transition-colors hover:border-[var(--color-primary)]">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-primary)]">{r.style}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-[var(--color-text)]">{r.name}</h3>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                  <span>{formatLiters(r.targetVolumeL, 0)}</span>
                  <span>ABV {formatPercent(r.targets.abv)}</span>
                  <span>IBU {r.targets.ibu.toFixed(0)}</span>
                  <span>SRM {r.targets.srm.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
