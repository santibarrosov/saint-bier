import { db } from "../db"
import type { InventoryItem, InventoryTransaction, InventoryTransactionType } from "../types"
import { newId, nowIso } from "@/lib/id"

export type InventoryItemInput = Omit<InventoryItem, "id" | "createdAt" | "updatedAt">

export const inventoryRepo = {
  async list(): Promise<InventoryItem[]> {
    return db.inventoryItems.orderBy("name").toArray()
  },

  async get(id: string): Promise<InventoryItem | undefined> {
    return db.inventoryItems.get(id)
  },

  async create(input: InventoryItemInput): Promise<InventoryItem> {
    const now = nowIso()
    const item: InventoryItem = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.inventoryItems.add(item)
    return item
  },

  async update(id: string, patch: Partial<InventoryItemInput>): Promise<void> {
    await db.inventoryItems.update(id, { ...patch, updatedAt: nowIso() })
  },

  async archive(id: string): Promise<void> {
    await db.inventoryItems.update(id, { archived: true, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.inventoryItems.delete(id)
  },

  async listLowStock(): Promise<InventoryItem[]> {
    const items = await db.inventoryItems.filter((i) => !i.archived).toArray()
    return items.filter((i) => i.stockQty <= i.minStockQty)
  },

  async listTransactions(itemId?: string): Promise<InventoryTransaction[]> {
    const all = await db.inventoryTransactions.orderBy("createdAt").reverse().toArray()
    return itemId ? all.filter((t) => t.itemId === itemId) : all
  },

  /** Aplica un movimiento de stock (positivo o negativo) y registra la transacción. */
  async applyMovement(
    itemId: string,
    deltaQty: number,
    type: InventoryTransactionType,
    opts?: { batchId?: string; note?: string },
  ): Promise<void> {
    await db.transaction("rw", db.inventoryItems, db.inventoryTransactions, async () => {
      const item = await db.inventoryItems.get(itemId)
      if (!item) return
      const newQty = Math.max(0, item.stockQty + deltaQty)
      await db.inventoryItems.update(itemId, { stockQty: newQty, updatedAt: nowIso() })

      const tx: InventoryTransaction = {
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        itemId,
        itemName: item.name,
        type,
        deltaQty,
        batchId: opts?.batchId,
        note: opts?.note,
      }
      await db.inventoryTransactions.add(tx)
    })
  },
}
