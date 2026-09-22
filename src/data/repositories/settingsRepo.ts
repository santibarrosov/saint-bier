import { db, DEFAULT_SETTINGS, ensureSettings } from "../db"
import type { AppSettings } from "../types"

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    return ensureSettings()
  },

  async update(patch: Partial<Omit<AppSettings, "id">>): Promise<void> {
    const current = await ensureSettings()
    await db.settings.put({ ...current, ...patch })
  },

  async reset(): Promise<void> {
    await db.settings.put(DEFAULT_SETTINGS)
  },
}
