import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { Camera, Check, Play, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Logo } from "@/components/layout/Logo"

import { useBatch, useRecipe, useYeastHarvests } from "@/data/hooks"
import { batchRepo } from "@/data/repositories/batchRepo"
import type { BrewStep, BrewStepCapture } from "@/data/types"
import { buildBoilAlarms, buildBrewSteps, addCustomBoilAlarm } from "@/lib/brewSession"
import { computeBoilTimerState, computeRemainingSec, formatTimer } from "@/lib/brewTimer"
import { fireAlarm, primeAudio, requestNotificationPermission } from "@/lib/alarm"
import { useWakeLock } from "@/hooks/useWakeLock"
import { calcMeasuredEfficiency, calcABV } from "@/lib/brewCalc"
import { calcPitchDose } from "@/lib/yeastCalc"
import { newId, nowIso } from "@/lib/id"
import { formatPercent } from "@/lib/format"

export function ModoCoccion() {
  const { id } = useParams<{ id: string }>()
  const batch = useBatch(id)
  const recipe = useRecipe(batch?.recipeId)
  const harvests = useYeastHarvests() ?? []
  const navigate = useNavigate()
  const { held: wakeLockHeld, supported: wakeLockSupported } = useWakeLock(true)
  const [, setTick] = useState(0)
  const firedStepAlarms = useRef<Set<string>>(new Set())

  useEffect(() => {
    primeAudio()
    void requestNotificationPermission()
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  // inicializa la sesión una sola vez, cuando la cocción y la receta ya cargaron
  useEffect(() => {
    if (!batch || batch.brewSession) return
    void batchRepo.initBrewSessionIfMissing(batch.id, () => ({
      active: true,
      currentStepIndex: 0,
      steps: buildBrewSteps(batch, recipe?.boilTimeMin),
      boilAlarms: buildBoilAlarms(batch),
    }))
  }, [batch, recipe])

  const session = batch?.brewSession
  const steps = session?.steps ?? []
  const currentStep = session && session.currentStepIndex < steps.length ? steps[session.currentStepIndex] : undefined
  const isSummary = Boolean(session && session.currentStepIndex >= steps.length)

  const boilTimeMin = currentStep?.key === "boil" ? (currentStep.plannedDurationSec ?? 3600) / 60 : 0
  const boilState =
    currentStep?.key === "boil" && session?.boilStartedAt
      ? computeBoilTimerState(session.boilStartedAt, boilTimeMin, session.boilAlarms)
      : undefined

  // dispara alarmas de hervor apenas corresponde, y persiste los flags (contra la sesión
  // fresca, no la de este render) para no repetir
  useEffect(() => {
    if (!batch || !boilState) return
    if (boilState.dueToWarn.length === 0 && boilState.dueToTrigger.length === 0) return

    const triggerIds = new Set(boilState.dueToTrigger.map((a) => a.id))
    const warnIds = new Set(boilState.dueToWarn.map((a) => a.id))
    for (const a of boilState.dueToTrigger) fireAlarm("¡Agregar ahora!", a.label)
    for (const a of boilState.dueToWarn) fireAlarm("En 2 minutos...", a.label, { warning: true })

    void batchRepo.updateBrewSession(batch.id, (fresh) => ({
      ...fresh,
      boilAlarms: fresh.boilAlarms.map((a) => {
        if (triggerIds.has(a.id)) return { ...a, triggered: true, warned: true }
        if (warnIds.has(a.id)) return { ...a, warned: true }
        return a
      }),
    }))
  })

  // dispara una alarma simple cuando un paso cronometrado (no-hervor) llega a cero
  useEffect(() => {
    if (!currentStep?.startedAt || !currentStep.plannedDurationSec || currentStep.status !== "active") return
    if (currentStep.key === "boil" || firedStepAlarms.current.has(currentStep.id)) return
    const remaining = computeRemainingSec(currentStep.startedAt, currentStep.plannedDurationSec)
    if (remaining <= 0) {
      firedStepAlarms.current.add(currentStep.id)
      fireAlarm("¡Listo!", currentStep.label)
    }
  })

  // Todo lo que sigue escribe siempre contra el estado fresco leído dentro de la
  // transacción (batchRepo.updateBrewSession), nunca contra `session`/`currentStep` de
  // este closure — si dos capturas se guardan casi al mismo tiempo (ej. temp + pH del
  // mismo botón), cada escritura tiene que partir del resultado real de la anterior o
  // se pisan entre sí.

  async function updateCurrentStep(updater: (s: BrewStep) => BrewStep) {
    if (!batch || !currentStep) return
    const stepId = currentStep.id
    await batchRepo.updateBrewSession(batch.id, (fresh) => ({
      ...fresh,
      steps: fresh.steps.map((s) => (s.id === stepId ? updater(s) : s)),
    }))
  }

  async function startTimer() {
    if (!batch || !currentStep) return
    const now = nowIso()
    const isBoil = currentStep.key === "boil"
    await updateCurrentStep((s) => ({ ...s, status: "active", startedAt: now }))
    if (isBoil) await batchRepo.updateBrewSession(batch.id, (fresh) => ({ ...fresh, boilStartedAt: now }))
  }

  async function markDone() {
    if (!batch || !currentStep) return
    await updateCurrentStep((s) => ({ ...s, status: "done", completedAt: nowIso() }))
    await batchRepo.updateBrewSession(batch.id, (fresh) => ({ ...fresh, currentStepIndex: fresh.currentStepIndex + 1 }))
  }

  async function addCapture(label: string, value: string, unit?: string) {
    if (!value) return
    const capture: BrewStepCapture = { id: newId(), label, value, unit, at: nowIso() }
    await updateCurrentStep((s) => ({ ...s, captures: [...s.captures, capture] }))
  }

  async function addNote(note: string) {
    await updateCurrentStep((s) => ({ ...s, note }))
  }

  async function onPhoto(file: File) {
    if (!batch) return
    await batchRepo.update(batch.id, { photoBlob: file })
  }

  async function addAlarm(label: string, minutesRemaining: number) {
    if (!batch) return
    await batchRepo.updateBrewSession(batch.id, (fresh) => ({
      ...fresh,
      boilAlarms: [...fresh.boilAlarms, addCustomBoilAlarm(label, minutesRemaining)],
    }))
  }

  async function finishSession() {
    if (!batch) return
    await batchRepo.updateBrewSession(batch.id, (fresh) => ({ ...fresh, active: false }))
    await batchRepo.update(batch.id, { status: "fermentando" })
    navigate(`/cocciones/${batch.id}`)
  }

  if (!batch || !session) {
    return (
      <div className="grain-bg flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-pulse-soft">
          <Logo markSize={32} wordmarkClassName="text-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="grain-bg flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <p className="font-display text-base font-semibold text-[var(--color-text)]">{batch.code}</p>
          <p className="text-xs text-[var(--color-text-faint)]">
            {isSummary ? "Resumen" : `Paso ${session.currentStepIndex + 1} de ${steps.length}`}
          </p>
        </div>
        <Link to={`/cocciones/${batch.id}`} className="rounded-full p-2 text-[var(--color-text-faint)] hover:bg-[var(--color-bg-raised)]">
          <X className="h-6 w-6" />
        </Link>
      </header>

      {!wakeLockSupported && (
        <p className="bg-[var(--color-warning-soft)] px-4 py-2 text-center text-xs text-[var(--color-warning)]">
          Tu navegador no soporta mantener la pantalla prendida sola — desactivá el apagado automático a mano.
        </p>
      )}
      {wakeLockSupported && !wakeLockHeld && (
        <p className="bg-[var(--color-warning-soft)] px-4 py-2 text-center text-xs text-[var(--color-warning)]">
          No se pudo mantener la pantalla prendida. Tocá la pantalla si se atenúa.
        </p>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-6">
        {!isSummary && currentStep && (
          <StepView
            step={currentStep}
            boilState={boilState}
            batch={batch}
            harvests={harvests}
            onStart={startTimer}
            onDone={markDone}
            onCapture={addCapture}
            onNote={addNote}
            onPhoto={onPhoto}
            onAddAlarm={addAlarm}
          />
        )}
        {isSummary && <SummaryView batch={batch} onFinish={finishSession} />}
      </main>
    </div>
  )
}

const NO_TIMER_KEYS = new Set(["heat_water", "chill", "pitch"])

function StepView({
  step,
  boilState,
  batch,
  harvests,
  onStart,
  onDone,
  onCapture,
  onNote,
  onPhoto,
  onAddAlarm,
}: {
  step: BrewStep
  boilState?: ReturnType<typeof computeBoilTimerState>
  batch: NonNullable<ReturnType<typeof useBatch>>
  harvests: NonNullable<ReturnType<typeof useYeastHarvests>>
  onStart: () => void
  onDone: () => void
  onCapture: (label: string, value: string, unit?: string) => void
  onNote: (note: string) => void
  onPhoto: (file: File) => void
  onAddAlarm: (label: string, minutesRemaining: number) => void
}) {
  const [noteDraft, setNoteDraft] = useState(step.note ?? "")
  const hasTimer = step.plannedDurationSec !== undefined && !NO_TIMER_KEYS.has(step.key)
  const remaining = step.startedAt && step.plannedDurationSec ? computeRemainingSec(step.startedAt, step.plannedDurationSec) : undefined

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-center font-display text-3xl font-semibold text-[var(--color-text)]">{step.label}</h1>

      {hasTimer && (
        <div className="text-center">
          {step.status !== "active" ? (
            <Button size="lg" className="h-20 w-full text-2xl" onClick={onStart}>
              <Play className="h-6 w-6" /> Empezar
            </Button>
          ) : (
            <p className={`font-display text-7xl font-bold tabular-nums ${remaining === 0 ? "text-[var(--color-danger)]" : "text-[var(--color-primary)]"}`}>
              {formatTimer(remaining ?? 0)}
            </p>
          )}
        </div>
      )}

      {step.key === "boil" && step.status === "active" && (
        <BoilAlarms boilState={boilState} onAddAlarm={onAddAlarm} />
      )}

      <StepCaptureFields step={step} batch={batch} harvests={harvests} onCapture={onCapture} />

      <div className="flex items-center gap-3">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] py-3 text-sm text-[var(--color-text-muted)]">
          <Camera className="h-4 w-4" /> Foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
        </label>
      </div>

      <Input
        placeholder="Nota libre..."
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => onNote(noteDraft)}
      />

      {step.captures.length > 0 && (
        <div className="space-y-1 rounded-[var(--radius-md)] bg-[var(--color-bg-raised)] p-3 text-xs text-[var(--color-text-muted)]">
          {step.captures.map((c) => (
            <div key={c.id} className="flex justify-between">
              <span>{c.label}</span>
              <span>
                {c.value}
                {c.unit ?? ""}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button size="lg" variant={hasTimer ? "secondary" : "default"} className="h-16 w-full text-lg" onClick={onDone}>
        <Check className="h-5 w-5" /> Marcar hecho
      </Button>
    </div>
  )
}

function BoilAlarms({
  boilState,
  onAddAlarm,
}: {
  boilState?: ReturnType<typeof computeBoilTimerState>
  onAddAlarm: (label: string, minutesRemaining: number) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState("")
  const [minutes, setMinutes] = useState("")

  if (!boilState) return null

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-4">
      {boilState.nextAlarm ? (
        <p className="text-center text-sm text-[var(--color-text)]">
          Próxima adición: <span className="font-semibold text-[var(--color-primary)]">{boilState.nextAlarm.label}</span>
          {boilState.nextAlarmEtaSec !== undefined && boilState.nextAlarmEtaSec > 0 && (
            <span className="block text-xs text-[var(--color-text-faint)]">en {formatTimer(boilState.nextAlarmEtaSec)}</span>
          )}
        </p>
      ) : (
        <p className="text-center text-sm text-[var(--color-text-faint)]">Sin más adiciones pendientes.</p>
      )}

      {showAdd ? (
        <div className="mt-3 flex gap-2">
          <Input placeholder="Ej: Whirlfloc" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
          <Input placeholder="min" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-20" />
          <Button
            size="sm"
            onClick={() => {
              if (!label || !minutes) return
              onAddAlarm(label, Number(minutes))
              setLabel("")
              setMinutes("")
              setShowAdd(false)
            }}
          >
            OK
          </Button>
        </div>
      ) : (
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-[var(--color-text-faint)]" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Agregar alarma (whirlfloc, nutriente...)
        </button>
      )}
    </div>
  )
}

function StepCaptureFields({
  step,
  batch,
  harvests,
  onCapture,
}: {
  step: BrewStep
  batch: NonNullable<ReturnType<typeof useBatch>>
  harvests: NonNullable<ReturnType<typeof useYeastHarvests>>
  onCapture: (label: string, value: string, unit?: string) => void
}) {
  if (step.key === "mash") {
    return <TwoFieldCapture aLabel="Temp real" aUnit="°C" bLabel="pH" onCapture={onCapture} onSyncPh={(ph) => void batchRepo.update(batch.id, { mashPh: Number(ph) })} />
  }

  if (step.key === "boil") {
    return <BoilCaptureFields batch={batch} onCapture={onCapture} />
  }

  if (step.key === "chill") {
    return <SingleFieldCapture label="Temp de enfriado" unit="°C" onCapture={onCapture} />
  }

  if (step.key === "pitch") {
    return <PitchHelper batch={batch} harvests={harvests} />
  }

  return null
}

function SingleFieldCapture({ label, unit, onCapture }: { label: string; unit: string; onCapture: (label: string, value: string, unit?: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <div className="flex gap-2">
      <Input placeholder={label} type="number" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
      <Button
        variant="secondary"
        onClick={() => {
          if (!value) return
          onCapture(label, value, unit)
          setValue("")
        }}
      >
        Guardar
      </Button>
    </div>
  )
}

function TwoFieldCapture({
  aLabel,
  aUnit,
  bLabel,
  onCapture,
  onSyncPh,
}: {
  aLabel: string
  aUnit: string
  bLabel: string
  onCapture: (label: string, value: string, unit?: string) => void
  onSyncPh?: (value: string) => void
}) {
  const [a, setA] = useState("")
  const [b, setB] = useState("")
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder={`${aLabel} (${aUnit})`} type="number" value={a} onChange={(e) => setA(e.target.value)} />
      <Input placeholder={bLabel} type="number" value={b} onChange={(e) => setB(e.target.value)} />
      <Button
        variant="secondary"
        className="col-span-2"
        onClick={() => {
          if (a) onCapture(aLabel, a, aUnit)
          if (b) {
            onCapture(bLabel, b)
            onSyncPh?.(b)
          }
          setA("")
          setB("")
        }}
      >
        Guardar medición
      </Button>
    </div>
  )
}

function BoilCaptureFields({ batch, onCapture }: { batch: NonNullable<ReturnType<typeof useBatch>>; onCapture: (label: string, value: string, unit?: string) => void }) {
  const [preVol, setPreVol] = useState("")
  const [preOg, setPreOg] = useState("")
  const [postVol, setPostVol] = useState("")
  const [postOg, setPostOg] = useState("")

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Vol. pre-hervor (L)" type="number" value={preVol} onChange={(e) => setPreVol(e.target.value)} />
        <Input placeholder="DO pre-hervor" type="number" step="0.001" value={preOg} onChange={(e) => setPreOg(e.target.value)} />
      </div>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          if (preVol) {
            onCapture("Vol. pre-hervor", preVol, "L")
            void batchRepo.update(batch.id, { preBoilVolumeL: Number(preVol) })
          }
          if (preOg) onCapture("DO pre-hervor", preOg)
          setPreVol("")
          setPreOg("")
        }}
      >
        Guardar pre-hervor
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Vol. post-hervor (L)" type="number" value={postVol} onChange={(e) => setPostVol(e.target.value)} />
        <Input placeholder="DO post-hervor" type="number" step="0.001" value={postOg} onChange={(e) => setPostOg(e.target.value)} />
      </div>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          if (postVol) {
            onCapture("Vol. post-hervor", postVol, "L")
            void batchRepo.update(batch.id, { postBoilVolumeL: Number(postVol) })
          }
          if (postOg) {
            onCapture("DO post-hervor", postOg)
            void batchRepo.update(batch.id, { og: Number(postOg) })
          }
          setPostVol("")
          setPostOg("")
        }}
      >
        Guardar post-hervor
      </Button>
    </div>
  )
}

function PitchHelper({ batch, harvests }: { batch: NonNullable<ReturnType<typeof useBatch>>; harvests: NonNullable<ReturnType<typeof useYeastHarvests>> }) {
  const [harvestId, setHarvestId] = useState("")
  const harvest = harvests.find((h) => h.id === harvestId)

  const dose = useMemo(() => {
    if (!harvest || !batch.og) return null
    return calcPitchDose({ volumeL: batch.batchVolumeL, og: batch.og, yeastType: "ale", viabilityPct: harvest.viabilityPct })
  }, [harvest, batch.og, batch.batchVolumeL])

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-4">
      <Select value={harvestId} onChange={(e) => setHarvestId(e.target.value)}>
        <option value="">— elegí la cosecha —</option>
        {harvests
          .filter((h) => !h.discarded)
          .map((h) => (
            <option key={h.id} value={h.id}>
              {h.strainName} gen.{h.generation} ({h.viabilityPct}%)
            </option>
          ))}
      </Select>
      {dose && (
        <p className="text-center text-sm text-[var(--color-text)]">
          Inocular <span className="font-semibold text-[var(--color-primary)]">{dose.requiredSlurryL.toFixed(2)} L</span> de slurry
        </p>
      )}
      {!batch.og && <p className="text-center text-xs text-[var(--color-text-faint)]">Cargá la DO post-hervor para calcular la dosis.</p>}
    </div>
  )
}

function SummaryView({ batch, onFinish }: { batch: NonNullable<ReturnType<typeof useBatch>>; onFinish: () => void }) {
  const efficiency =
    batch.og && batch.postBoilVolumeL ? calcMeasuredEfficiency(batch.fermentables, batch.adjuncts, batch.postBoilVolumeL, batch.og) : undefined
  const abv = batch.og && batch.fg ? calcABV(batch.og, batch.fg) : undefined

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-[var(--color-text)]">¡Cocción terminada!</h1>
      <p className="text-[var(--color-text-muted)]">{batch.code}</p>

      <div className="grid w-full grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-4">
          <p className="font-display text-2xl font-semibold text-[var(--color-primary)]">{batch.og?.toFixed(3) ?? "—"}</p>
          <p className="text-xs text-[var(--color-text-faint)]">DO</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-4">
          <p className="font-display text-2xl font-semibold text-[var(--color-primary)]">{efficiency ? formatPercent(efficiency, 0) : "—"}</p>
          <p className="text-xs text-[var(--color-text-faint)]">Eficiencia real</p>
        </div>
      </div>
      {abv && <p className="text-sm text-[var(--color-text-muted)]">ABV estimado: {formatPercent(abv)}</p>}

      <Button size="lg" className="h-16 w-full text-lg" onClick={onFinish}>
        Guardar y finalizar
      </Button>
    </div>
  )
}
