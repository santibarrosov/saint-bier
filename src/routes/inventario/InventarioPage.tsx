import { useState } from "react"
import { AlertTriangle, Package, Pencil, Plus, Warehouse } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

import { useInventoryItems } from "@/data/hooks"
import { inventoryRepo } from "@/data/repositories/inventoryRepo"
import type { InventoryCategory, InventoryItem } from "@/data/types"
import { INVENTORY_CATEGORY_LABELS } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"

const CATEGORIES: InventoryCategory[] = ["malta", "lupulo", "adjunto", "otro"]

interface ItemFormState {
  category: InventoryCategory
  name: string
  unit: InventoryItem["unit"]
  stockQty: string
  minStockQty: string
  costPerUnit: string
}

const EMPTY_FORM: ItemFormState = { category: "malta", name: "", unit: "kg", stockQty: "0", minStockQty: "0", costPerUnit: "0" }

export function InventarioPage() {
  const items = useInventoryItems() ?? []
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM)

  const [moveOpen, setMoveOpen] = useState(false)
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null)
  const [moveQty, setMoveQty] = useState("")

  const lowStock = items.filter((i) => !i.archived && i.stockQty <= i.minStockQty)

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setForm({
      category: item.category,
      name: item.name,
      unit: item.unit,
      stockQty: String(item.stockQty),
      minStockQty: String(item.minStockQty),
      costPerUnit: String(item.costPerUnit),
    })
    setDialogOpen(true)
  }

  const saveItem = async () => {
    if (!form.name) return
    const payload = {
      category: form.category,
      name: form.name,
      unit: form.unit,
      stockQty: Number(form.stockQty) || 0,
      minStockQty: Number(form.minStockQty) || 0,
      costPerUnit: Number(form.costPerUnit) || 0,
    }
    if (editingId) {
      await inventoryRepo.update(editingId, payload)
      toast({ title: "Insumo actualizado", variant: "success" })
    } else {
      await inventoryRepo.create(payload)
      toast({ title: "Insumo creado", variant: "success" })
    }
    setDialogOpen(false)
  }

  const openMove = (item: InventoryItem) => {
    setMoveItem(item)
    setMoveQty("")
    setMoveOpen(true)
  }

  const applyMove = async () => {
    if (!moveItem || !moveQty) return
    await inventoryRepo.applyMovement(moveItem.id, Number(moveQty), "compra", { note: "Compra manual" })
    toast({ title: "Stock actualizado", variant: "success" })
    setMoveOpen(false)
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Inventario"
        description="Maltas, lúpulos y adjuntos con stock y costo."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nuevo insumo
          </Button>
        }
      />

      {lowStock.length > 0 && (
        <SectionCard title="Lista de compras" description="Insumos en o por debajo del stock mínimo.">
          <div className="space-y-2">
            {lowStock.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-warning-soft)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                  <span className="text-sm text-[var(--color-text)]">{i.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {i.stockQty} / {i.minStockQty} {i.unit}
                  </span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openMove(i)}>
                  Cargar compra
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Sin insumos cargados"
          description="Cargá maltas, lúpulos y adjuntos para llevar el stock y vincularlos a tus recetas."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nuevo insumo
            </Button>
          }
        />
      ) : (
        CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat && !i.archived)
          if (catItems.length === 0) return null
          return (
            <div key={cat}>
              <h2 className="mb-2 font-display text-base font-semibold text-[var(--color-text)]">{INVENTORY_CATEGORY_LABELS[cat]}</h2>
              <div className="space-y-2">
                {catItems.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)]">{i.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {i.stockQty} {i.unit} · {formatCurrency(i.costPerUnit)}/{i.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.stockQty <= i.minStockQty && <Badge variant="warning">Stock bajo</Badge>}
                      <Button variant="ghost" size="icon-sm" onClick={() => openMove(i)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Nombre">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Categoría">
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as InventoryCategory }))}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {INVENTORY_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Unidad">
                <Select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as InventoryItem["unit"] }))}>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="unidad">unidad</option>
                  <option value="L">L</option>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Stock actual">
                <Input type="number" value={form.stockQty} onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))} />
              </FormField>
              <FormField label="Stock mínimo">
                <Input type="number" value={form.minStockQty} onChange={(e) => setForm((f) => ({ ...f, minStockQty: e.target.value }))} />
              </FormField>
              <FormField label="Costo/unidad">
                <Input type="number" value={form.costPerUnit} onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))} />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar compra — {moveItem?.name}</DialogTitle>
          </DialogHeader>
          <FormField label={`Cantidad a sumar (${moveItem?.unit})`}>
            <Input type="number" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} autoFocus />
          </FormField>
          <DialogFooter>
            <Button onClick={applyMove}>
              <Package className="h-4 w-4" /> Cargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
