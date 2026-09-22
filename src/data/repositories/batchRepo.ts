import { db } from "../db"
import type { Batch } from "../types"
import { newId, nowIso } from "@/lib/id"
import { inventoryRepo } from "./inventoryRepo"

export type BatchInput = Omit<Batch, "id" | "createdAt" | "updatedAt" | "code" | "stockDeducted">

async function nextBatchCode(brewDate: string): Promise<string> {
  const year = new Date(brewDate).getFullYear()
  const all = await db.batches.toArray()
  const prefix = `SB-${year}-`
  const nums = all
    .filter((b) => b.code.startsWith(prefix))
    .map((b) => Number.parseInt(b.code.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(3, "0")}`
}

export const batchRepo = {
  async list(): Promise<Batch[]> {
    return db.batches.orderBy("brewDate").reverse().toArray()
  },

  async get(id: string): Promise<Batch | undefined> {
    return db.batches.get(id)
  },

  async create(input: BatchInput): Promise<Batch> {
    const now = nowIso()
    const code = await nextBatchCode(input.brewDate)
    const batch: Batch = { ...input, id: newId(), code, createdAt: now, updatedAt: now, stockDeducted: false }
    await db.batches.add(batch)
    await deductStockForBatch(batch)
    return batch
  },

  async update(id: string, patch: Partial<BatchInput>): Promise<void> {
    await db.batches.update(id, { ...patch, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.batches.delete(id)
  },

  async addFermentationLog(id: string, entry: { date: string; tempC: number; note?: string }): Promise<void> {
    const batch = await db.batches.get(id)
    if (!batch) return
    const logs = [...batch.fermentationLogs, { id: newId(), ...entry }].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    await db.batches.update(id, { fermentationLogs: logs, updatedAt: nowIso() })
  },

  async removeFermentationLog(id: string, logId: string): Promise<void> {
    const batch = await db.batches.get(id)
    if (!batch) return
    const logs = batch.fermentationLogs.filter((l) => l.id !== logId)
    await db.batches.update(id, { fermentationLogs: logs, updatedAt: nowIso() })
  },

  /** Cocciones cuyo fermentador sigue ocupado (no envasadas/finalizadas todavía). */
  async listFermenterActive(): Promise<Batch[]> {
    const all = await db.batches.toArray()
    return all.filter((b) => b.status !== "envasada" && b.status !== "finalizada")
  },
}

async function deductStockForBatch(batch: Batch): Promise<void> {
  if (batch.stockDeducted) return
  const movements: Array<{ itemId: string; qty: number; note: string }> = []

  for (const f of batch.fermentables) {
    if (f.inventoryItemId) movements.push({ itemId: f.inventoryItemId, qty: f.amountKg, note: `Cocción ${batch.code}` })
  }
  for (const h of batch.hops) {
    // Los ítems de inventario de lúpulo se cargan en gramos.
    if (h.inventoryItemId) movements.push({ itemId: h.inventoryItemId, qty: h.amountG, note: `Cocción ${batch.code}` })
  }
  for (const a of batch.adjuncts) {
    if (a.inventoryItemId) movements.push({ itemId: a.inventoryItemId, qty: a.amountKg, note: `Cocción ${batch.code}` })
  }

  if (movements.length === 0) return

  for (const m of movements) {
    await inventoryRepo.applyMovement(m.itemId, -m.qty, "consumo", { batchId: batch.id, note: m.note })
  }
  await db.batches.update(batch.id, { stockDeducted: true })
}
