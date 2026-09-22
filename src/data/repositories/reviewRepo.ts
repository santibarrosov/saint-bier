import { db } from "../db"
import type { Review } from "../types"
import { newId, nowIso } from "@/lib/id"

export type ReviewInput = Omit<Review, "id" | "createdAt" | "updatedAt">

export const reviewRepo = {
  async list(): Promise<Review[]> {
    return db.reviews.orderBy("createdAt").reverse().toArray()
  },

  async listByBatch(batchId: string): Promise<Review[]> {
    return db.reviews.where("batchId").equals(batchId).reverse().sortBy("createdAt")
  },

  async create(input: ReviewInput): Promise<Review> {
    const now = nowIso()
    const review: Review = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.reviews.add(review)
    return review
  },

  async remove(id: string): Promise<void> {
    await db.reviews.delete(id)
  },
}
