import { useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

import { useEvent, useSettings } from "@/data/hooks"
import { eventRepo } from "@/data/repositories/eventRepo"
import { calcEstimatedConsumption } from "@/lib/eventCalc"
import { DEFAULT_EVENT_CHECKLIST, EVENT_PAYMENT_STATUS_LABELS } from "@/lib/constants"
import { formatLiters, todayIso } from "@/lib/format"

const schema = z.object({
  name: z.string().min(1, "Ponele un nombre"),
  date: z.string().min(1),
  client: z.string().min(1, "Requerido"),
  venue: z.string().min(1, "Requerido"),
  guestCount: z.coerce.number().min(1),
  litersPerAdultOverride: z.coerce.number().min(0).optional(),
  budget: z.coerce.number().min(0),
  deposit: z.coerce.number().min(0),
  paymentStatus: z.enum(["sin_seña", "señado", "pagado"]),
})
type FormValues = z.infer<typeof schema>

export function EventoForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useEvent(id)
  const settings = useSettings()
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      date: todayIso(),
      client: "",
      venue: "",
      guestCount: 50,
      budget: 0,
      deposit: 0,
      paymentStatus: "sin_seña",
    },
  })

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        date: existing.date,
        client: existing.client,
        venue: existing.venue,
        guestCount: existing.guestCount,
        litersPerAdultOverride: existing.litersPerAdultOverride,
        budget: existing.budget,
        deposit: existing.deposit,
        paymentStatus: existing.paymentStatus,
      })
    }
  }, [existing]) // eslint-disable-line react-hooks/exhaustive-deps

  const guestCount = form.watch("guestCount")
  const litersOverride = form.watch("litersPerAdultOverride")

  const estimatedLiters = useMemo(
    () => calcEstimatedConsumption(Number(guestCount) || 0, litersOverride || settings.litersPerAdult),
    [guestCount, litersOverride, settings.litersPerAdult],
  )

  const onSubmit = async (values: FormValues) => {
    if (isEdit && id) {
      await eventRepo.update(id, values)
      toast({ title: "Evento actualizado", variant: "success" })
      navigate(`/eventos/${id}`)
    } else {
      const created = await eventRepo.create({
        ...values,
        assignedKegIds: [],
        checklist: DEFAULT_EVENT_CHECKLIST.map((label) => ({ id: crypto.randomUUID(), label, done: false })),
      })
      toast({ title: "Evento creado", variant: "success" })
      navigate(`/eventos/${created.id}`)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-6">
      <PageHeader title={isEdit ? "Editar evento" : "Nuevo evento"} back />

      <SectionCard title="Datos del evento">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre" error={form.formState.errors.name?.message} className="sm:col-span-2">
            <Input placeholder="Ej: Cumpleaños de Martina" {...form.register("name")} />
          </FormField>
          <FormField label="Cliente" error={form.formState.errors.client?.message}>
            <Input {...form.register("client")} />
          </FormField>
          <FormField label="Salón" error={form.formState.errors.venue?.message}>
            <Input {...form.register("venue")} />
          </FormField>
          <FormField label="Fecha">
            <Input type="date" {...form.register("date")} />
          </FormField>
          <FormField label="Cantidad de invitados" error={form.formState.errors.guestCount?.message}>
            <Input type="number" {...form.register("guestCount")} />
          </FormField>
          <FormField label={`Litros/adulto (default: ${settings.litersPerAdult})`}>
            <Input type="number" step="0.05" placeholder={String(settings.litersPerAdult)} {...form.register("litersPerAdultOverride")} />
          </FormField>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] p-3 text-center">
          <p className="font-display text-xl font-semibold text-[var(--color-primary)]">{formatLiters(estimatedLiters, 0)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">estimados para el evento</p>
        </div>
      </SectionCard>

      <SectionCard title="Presupuesto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Presupuesto ($)">
            <Input type="number" {...form.register("budget")} />
          </FormField>
          <FormField label="Seña ($)">
            <Input type="number" {...form.register("deposit")} />
          </FormField>
          <FormField label="Estado de cobro">
            <Select {...form.register("paymentStatus")}>
              {Object.entries(EVENT_PAYMENT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Guardar evento
        </Button>
      </div>
    </form>
  )
}
