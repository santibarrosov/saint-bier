import type jsPDF from "jspdf"
import type { Batch, Recipe } from "@/data/types"
import { generateQrDataUrl } from "@/lib/qr"
import { publicBatchUrl } from "@/lib/publicPage"

const COLS = 2
const ROWS = 5
const MARGIN = 28
const GUTTER = 14

export interface LabelSheetOptions {
  batch: Batch
  recipe: Recipe
  publicPortalBaseUrl: string
}

export async function buildLabelSheetPdf({ batch, recipe, publicPortalBaseUrl }: LabelSheetOptions): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf")
  const doc = new JsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const url = publicPortalBaseUrl ? publicBatchUrl(publicPortalBaseUrl, batch.code) : batch.code
  const qrDataUrl = await generateQrDataUrl(url, 300)

  const colWidth = (pageWidth - MARGIN * 2 - GUTTER * (COLS - 1)) / COLS
  const rowHeight = (pageHeight - MARGIN * 2 - GUTTER * (ROWS - 1)) / ROWS
  const abv = batch.og && batch.fg ? ((batch.og - batch.fg) * 131.25).toFixed(1) : recipe.targets.abv.toFixed(1)

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = MARGIN + c * (colWidth + GUTTER)
      const y = MARGIN + r * (rowHeight + GUTTER)

      doc.setDrawColor(200, 190, 175)
      doc.setLineDashPattern([2, 2], 0)
      doc.roundedRect(x, y, colWidth, rowHeight, 6, 6)
      doc.setLineDashPattern([], 0)

      const qrSize = rowHeight - 20
      doc.addImage(qrDataUrl, "PNG", x + 10, y + (rowHeight - qrSize) / 2, qrSize, qrSize)

      const textX = x + qrSize + 24
      const textWidth = colWidth - qrSize - 34

      doc.setFont("times", "bold")
      doc.setFontSize(13)
      doc.setTextColor("#1a1209")
      const nameLines: string[] = doc.splitTextToSize(recipe.name, textWidth)
      doc.text(nameLines.slice(0, 2), textX, y + 24)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor("#6b5c47")
      doc.text(recipe.style, textX, y + 24 + nameLines.slice(0, 2).length * 14 + 4)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor("#c48a28")
      doc.text(`${abv}% ABV`, textX, y + rowHeight - 24)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor("#6b5c47")
      doc.text(batch.code, textX, y + rowHeight - 10)
    }
  }

  return doc
}

export async function downloadLabelSheetPdf(opts: LabelSheetOptions): Promise<void> {
  const doc = await buildLabelSheetPdf(opts)
  doc.save(`${opts.batch.code}-etiquetas.pdf`)
}
