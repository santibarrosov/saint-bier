import { db } from "../db"
import type { Event } from "../types"
import { newId, nowIso } from "@/lib/id"

export type EventInput = Omit<Event, "id" | "createdAt" | "updatedAt">

export const eventRepo = {
  async list(): Promise<Event[]> {
    return db.events.orderBy("date").toArray()
  },

  async get(id: string): Promise<Event | undefined> {
    return db.events.get(id)
  },

  async create(input: EventInput): Promise<Event> {
    const now = nowIso()
    const event: Event = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.events.add(event)
    return event
  },

  async update(id: string, patch: Partial<EventInput>): Promise<void> {
    await db.events.update(id, { ...patch, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.events.delete(id)
  },

  async toggleChecklistItem(id: string, itemId: string): Promise<void> {
    const event = await db.events.get(id)
    if (!event) return
    const checklist = event.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c))
    await db.events.update(id, { checklist, updatedAt: nowIso() })
  },

  async nextUpcoming(): Promise<Event | undefined> {
    const all = await db.events.orderBy("date").toArray()
    const todayIso = new Date().toISOString().slice(0, 10)
    return all.find((e) => e.date >= todayIso)
  },
}
