import type jsPDF from "jspdf"
import type { Batch } from "@/data/types"
import { BATCH_STATUS_LABELS, HOP_USE_LABELS } from "@/lib/constants"
import { calcABV, calcAttenuation } from "@/lib/brewCalc"
import { formatDate, formatGravity, formatKg, formatLiters, formatPercent } from "@/lib/format"

const INK = "#1a1209"
const AMBER = "#c48a28"
const MUTED = "#6b5c47"

/** jsPDF/autotable se cargan on-demand: no vale la pena tenerlos en el bundle inicial. */
export async function buildBrewSheetPdf(batch: Batch): Promise<jsPDF> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new JsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  let y = 56

  doc.setFont("times", "bold")
  doc.setFontSize(20)
  doc.setTextColor(INK)
  doc.text("Saint Bier", margin, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(MUTED)
  doc.text("Ficha de cocción — trazabilidad", margin, y + 14)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(AMBER)
  doc.text(batch.code, pageWidth - margin, y, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(INK)
  doc.text(`${batch.recipeName}  ·  ${BATCH_STATUS_LABELS[batch.status]}`, pageWidth - margin, y + 16, {
    align: "right",
  })

  y += 40
  doc.setDrawColor(AMBER)
  doc.setLineWidth(1)
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, textColor: INK, cellPadding: 3 },
    head: [["Cocción", "Trasvase", "Envasado", "Volumen", "Eficiencia real"]],
    body: [
      [
        formatDate(batch.brewDate),
        formatDate(batch.transferDate),
        formatDate(batch.packageDate),
        formatLiters(batch.batchVolumeL),
        batch.measuredEfficiencyPct ? formatPercent(batch.measuredEfficiencyPct) : "—",
      ],
    ],
    headStyles: { textColor: MUTED, fontStyle: "bold", fontSize: 8 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16

  const og = batch.og
  const fg = batch.fg
  const abv = og && fg ? calcABV(og, fg) : undefined
  const attenuation = og && fg ? calcAttenuation(og, fg) : undefined

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, textColor: INK, cellPadding: 3 },
    head: [["DO", "DF", "ABV", "Atenuación", "pH macerado", "Volumen pre-hervor", "Volumen post-hervor"]],
    body: [
      [
        og ? formatGravity(og) : "—",
        fg ? formatGravity(fg) : "—",
        abv ? formatPercent(abv) : "—",
        attenuation ? formatPercent(attenuation) : "—",
        batch.mashPh?.toFixed(2) ?? "—",
        batch.preBoilVolumeL ? formatLiters(batch.preBoilVolumeL) : "—",
        batch.postBoilVolumeL ? formatLiters(batch.postBoilVolumeL) : "—",
      ],
    ],
    headStyles: { textColor: MUTED, fontStyle: "bold", fontSize: 8 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16

  if (batch.mashSteps.length > 0) {
    y = sectionTitle(doc, "Macerado", margin, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Paso", "Temp (°C)", "Minutos", "pH"]],
      body: batch.mashSteps.map((s) => [s.name, s.tempC.toFixed(1), String(s.minutes), s.phMeasured?.toFixed(2) ?? "—"]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [28, 22, 16], textColor: 255, fontSize: 8 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 16
  }

  if (batch.fermentables.length > 0) {
    y = sectionTitle(doc, "Fermentables", margin, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Nombre", "Cantidad", "Color (°L)"]],
      body: batch.fermentables.map((f) => [f.name, formatKg(f.amountKg), f.colorLovibond.toFixed(0)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [28, 22, 16], textColor: 255, fontSize: 8 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 16
  }

  if (batch.hops.length > 0) {
    y = sectionTitle(doc, "Lúpulos", margin, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Nombre", "Cantidad", "%AA", "Uso", "Tiempo (min)"]],
      body: batch.hops.map((h) => [h.name, `${h.amountG} g`, `${h.alphaAcidPct}%`, HOP_USE_LABELS[h.use], String(h.timeMin)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [28, 22, 16], textColor: 255, fontSize: 8 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 16
  }

  if (batch.fermentationLogs.length > 0) {
    if (y > 650) {
      doc.addPage()
      y = 56
    }
    y = sectionTitle(doc, "Temperaturas de fermentación", margin, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Fecha", "Temp (°C)", "Nota"]],
      body: batch.fermentationLogs.map((l) => [formatDate(l.date), l.tempC.toFixed(1), l.note ?? ""]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [28, 22, 16], textColor: 255, fontSize: 8 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 16
  }

  if (batch.notes) {
    y = sectionTitle(doc, "Notas", margin, y)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(INK)
    const lines = doc.splitTextToSize(batch.notes, pageWidth - margin * 2)
    doc.text(lines, margin, y)
  }

  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  doc.text(
    `Generado el ${formatDate(new Date().toISOString())} — Saint Bier`,
    margin,
    doc.internal.pageSize.getHeight() - 24,
  )

  return doc
}

function sectionTitle(doc: jsPDF, title: string, margin: number, y: number): number {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor("#c48a28")
  doc.text(title.toUpperCase(), margin, y)
  return y + 12
}

export async function downloadBrewSheetPdf(batch: Batch): Promise<void> {
  const doc = await buildBrewSheetPdf(batch)
  doc.save(`${batch.code}.pdf`)
}
