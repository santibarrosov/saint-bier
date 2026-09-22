import { newId } from "@/lib/id"
import type { Batch, BoilAlarm, BrewStep, BrewStepKey } from "@/data/types"

function makeStep(key: BrewStepKey, label: string, plannedDurationSec?: number): BrewStep {
  return { id: newId(), key, label, status: "pending", plannedDurationSec, captures: [] }
}

const DEFAULT_RECIRCULATE_SEC = 15 * 60
const DEFAULT_MASH_OUT_SEC = 10 * 60
const DEFAULT_SPARGE_SEC = 30 * 60
const DEFAULT_MASH_SEC = 60 * 60
const DEFAULT_WHIRLPOOL_SEC = 15 * 60
const DEFAULT_BOIL_MIN = 60

/**
 * Arma el timeline fijo del día de cocción. El macerado se expande a un paso por cada
 * MashStep ya cargado en la cocción (mismos datos que la ficha normal); si no hay ninguno,
 * se genera un macerado único por defecto. El resto de los pasos sin datos estructurados
 * llevan una duración sugerida que se puede ajustar antes de arrancar el timer.
 */
export function buildBrewSteps(batch: Batch, boilTimeMin: number = DEFAULT_BOIL_MIN): BrewStep[] {
  const steps: BrewStep[] = [makeStep("heat_water", "Calentar agua")]

  if (batch.mashSteps.length > 0) {
    for (const m of batch.mashSteps) {
      steps.push(makeStep("mash", `Macerado: ${m.name} (${m.tempC}°C)`, m.minutes * 60))
    }
  } else {
    steps.push(makeStep("mash", "Macerado", DEFAULT_MASH_SEC))
  }

  steps.push(makeStep("recirculate", "Recirculado", DEFAULT_RECIRCULATE_SEC))
  steps.push(makeStep("mash_out", "Mash out", DEFAULT_MASH_OUT_SEC))
  steps.push(makeStep("sparge", "Lavado", DEFAULT_SPARGE_SEC))
  steps.push(makeStep("boil", "Hervor", boilTimeMin * 60))
  steps.push(makeStep("whirlpool", "Whirlpool", DEFAULT_WHIRLPOOL_SEC))
  steps.push(makeStep("chill", "Enfriado"))
  steps.push(makeStep("pitch", "Inoculación de levadura"))

  return steps
}

/**
 * Agrupa los lúpulos de hervor por minuto de adición y arma una alarma por marca,
 * de mayor a menor (la de 60' entra primero, la de flameout al final).
 */
export function buildBoilAlarms(batch: Batch): BoilAlarm[] {
  const boilHops = batch.hops.filter((h) => h.use === "hervor" || h.use === "primera_wort")
  const byTime = new Map<number, string[]>()
  for (const h of boilHops) {
    const list = byTime.get(h.timeMin) ?? []
    list.push(h.name)
    byTime.set(h.timeMin, list)
  }

  return [...byTime.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([minutesRemaining, names]) => ({
      id: newId(),
      label: `${names.join(", ")} — ${minutesRemaining} min`,
      minutesRemaining,
      warned: false,
      triggered: false,
    }))
}

export function addCustomBoilAlarm(label: string, minutesRemaining: number): BoilAlarm {
  return { id: newId(), label, minutesRemaining, warned: false, triggered: false }
}
