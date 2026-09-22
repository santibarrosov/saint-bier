import type { AppSettings, Batch, Recipe } from "@/data/types"
import { formatDate } from "@/lib/format"

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

/** Frase de ingredientes "en criollo" a partir de la receta estructurada. */
export function autoIngredientsNote(recipe: Recipe): string {
  const maltNames = recipe.fermentables
    .filter((f) => f.type === "malta_base" || f.type === "malta_especial")
    .map((f) => f.name)
  const otherFermentableNames = recipe.fermentables
    .filter((f) => f.type === "azucar" || f.type === "extracto")
    .map((f) => f.name)
  const hopNames = [...new Set(recipe.hops.map((h) => h.name))]
  const adjunctNames = recipe.adjuncts.map((a) => a.name)

  const parts: string[] = []
  if (maltNames.length) parts.push(`malta ${joinNatural(maltNames)}`)
  if (hopNames.length) parts.push(`lupulada con ${joinNatural(hopNames)}`)
  if (adjunctNames.length) parts.push(`con un toque de ${joinNatural(adjunctNames)}`)
  if (otherFermentableNames.length) parts.push(joinNatural(otherFermentableNames))

  if (parts.length === 0) return ""
  return `Elaborada con ${parts.join(", ")}.`
}

export function publicBatchUrl(baseUrl: string, batchCode: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  return `${trimmed}/${batchCode}.html`
}

function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
}

export interface PublicPageOptions {
  batch: Batch
  recipe: Recipe
  settings: AppSettings
}

export function buildPublicBatchPage({ batch, recipe, settings }: PublicPageOptions): string {
  const abv = batch.og && batch.fg ? ((batch.og - batch.fg) * 131.25).toFixed(1) : recipe.targets.abv.toFixed(1)
  const ibu = Math.round(recipe.targets.ibu)
  const tastingNote = recipe.publicTastingNote?.trim()
  const ingredientsNote = recipe.publicIngredientsNote?.trim() || autoIngredientsNote(recipe)
  const brandStory = settings.brandStory?.trim()
  const phone = settings.whatsappPhone?.trim()
  const instagram = settings.instagramHandle?.trim().replace(/^@/, "")

  const stars = [1, 2, 3, 4, 5]
    .map((n) => {
      const msg = `${"⭐️".repeat(n)} para ${recipe.name} (lote ${batch.code}). Mi comentario: `
      const href = phone ? whatsappLink(phone, msg) : "#"
      return `<a class="star-btn" href="${href}" ${phone ? 'target="_blank" rel="noopener"' : "aria-disabled=\"true\""}>${"★".repeat(n)}${"☆".repeat(5 - n)}</a>`
    })
    .join("\n")

  const chopperaMsg = `Hola! Vi la etiqueta de ${recipe.name} en una fiesta y quiero cotizar una chopera Saint Bier para mi evento.`

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
<title>${escapeHtml(recipe.name)} — Saint Bier</title>
<meta name="description" content="${escapeHtml(tastingNote ?? recipe.style)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #15110d; --bg-raised: #1c1610; --bg-elevated: #241c14;
    --border: #382c1f; --text: #f5eee2; --text-muted: #b9a992; --text-faint: #7f7161;
    --primary: #e0a83a; --primary-fg: #1a1209;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    max-width: 520px;
    margin: 0 auto;
    padding: 28px 20px 56px;
  }
  h1, h2, .display { font-family: 'Fraunces', Georgia, serif; }
  .brand { display: flex; align-items: center; gap: 10px; justify-content: center; margin-bottom: 28px; }
  .brand-mark { width: 34px; height: 34px; border-radius: 50%; border: 1.4px solid var(--primary); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; color: var(--primary); font-weight: 700; }
  .brand-word { line-height: 1; }
  .brand-word .saint { display: block; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--primary); }
  .brand-word .bier { display: block; font-size: 19px; font-weight: 600; }
  .hero { text-align: center; margin-bottom: 28px; }
  .hero .style { color: var(--primary); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .hero h1 { font-size: 34px; font-weight: 700; margin: 0 0 4px; line-height: 1.1; }
  .hero .date { color: var(--text-faint); font-size: 13px; }
  .stats { display: flex; gap: 10px; justify-content: center; margin: 22px 0; }
  .stat { flex: 1; max-width: 130px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 16px; padding: 14px 8px; text-align: center; }
  .stat .val { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: var(--primary); }
  .stat .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin-top: 2px; }
  .card { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 16px; }
  .card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary); margin: 0 0 10px; font-weight: 600; }
  .card p { margin: 0; color: var(--text); line-height: 1.55; font-size: 15px; }
  .card.story p { color: var(--text-muted); }
  .rate-title { text-align: center; font-size: 18px; font-weight: 600; margin: 32px 0 4px; }
  .rate-sub { text-align: center; color: var(--text-faint); font-size: 13px; margin-bottom: 14px; }
  .stars { display: flex; flex-direction: column; gap: 8px; }
  .star-btn { display: block; text-align: center; text-decoration: none; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--primary); font-size: 20px; letter-spacing: 4px; }
  .cta-row { display: flex; gap: 10px; margin-top: 28px; }
  .cta { flex: 1; text-align: center; text-decoration: none; padding: 15px 10px; border-radius: 14px; font-weight: 600; font-size: 14px; }
  .cta.primary { background: var(--primary); color: var(--primary-fg); }
  .cta.secondary { background: transparent; border: 1.4px solid var(--border); color: var(--text); }
  footer { text-align: center; color: var(--text-faint); font-size: 11px; margin-top: 36px; }
</style>
</head>
<body>
  <div class="brand">
    <div class="brand-mark">S</div>
    <div class="brand-word"><span class="saint">Saint</span><span class="bier">Bier</span></div>
  </div>

  <div class="hero">
    <div class="style">${escapeHtml(recipe.style)}</div>
    <h1>${escapeHtml(recipe.name)}</h1>
    <div class="date">Cocinada el ${escapeHtml(formatDate(batch.brewDate))}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="val">${abv}%</div><div class="lbl">ABV</div></div>
    <div class="stat"><div class="val">${ibu}</div><div class="lbl">IBU</div></div>
  </div>

  ${tastingNote ? `<div class="card"><h2>A qué sabe</h2><p>${escapeHtml(tastingNote)}</p></div>` : ""}
  ${ingredientsNote ? `<div class="card"><h2>Ingredientes</h2><p>${escapeHtml(ingredientsNote)}</p></div>` : ""}
  ${brandStory ? `<div class="card story"><h2>Sobre Saint Bier</h2><p>${escapeHtml(brandStory)}</p></div>` : ""}

  <div class="rate-title">¿Qué te pareció?</div>
  <div class="rate-sub">Un toque y te abre WhatsApp con el mensaje listo</div>
  <div class="stars">
    ${stars}
  </div>

  <div class="cta-row">
    ${instagram ? `<a class="cta secondary" href="https://instagram.com/${escapeHtml(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
    ${phone ? `<a class="cta primary" href="${whatsappLink(phone, chopperaMsg)}" target="_blank" rel="noopener">Quiero una chopera</a>` : ""}
  </div>

  <footer>Lote ${escapeHtml(batch.code)} · Saint Bier</footer>
</body>
</html>
`
}
