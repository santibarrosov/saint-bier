import { useEffect } from "react"
import { useForm } from "react-hook-form"

import { PageHeader } from "@/components/layout/PageHeader"
import { SectionCard } from "@/components/shared/SectionCard"
import { FormField } from "@/components/shared/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"

import { useSettings } from "@/data/hooks"
import { settingsRepo } from "@/data/repositories/settingsRepo"
import type { AppSettings } from "@/data/types"
import { InstallButton } from "@/components/shared/InstallPrompt"

type FormValues = Omit<AppSettings, "id">

export function AjustesPage() {
  const settings = useSettings()
  const { toast } = useToast()

  const form = useForm<FormValues>({ defaultValues: settings })

  useEffect(() => {
    form.reset(settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hourlyRate, settings.defaultGasCost])

  const onSubmit = async (values: FormValues) => {
    await settingsRepo.update(values)
    toast({ title: "Ajustes guardados", variant: "success" })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-6">
      <PageHeader title="Ajustes" description="Los valores por defecto que usan las calculadoras." />

      <SectionCard title="Instalar app" description="Para tenerla en la pantalla de inicio y que funcione sin conexión.">
        <InstallButton />
      </SectionCard>

      <SectionCard title="Costos por defecto">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Valor hora ($)">
            <Input type="number" {...form.register("hourlyRate", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Gas por cocción ($)">
            <Input type="number" {...form.register("defaultGasCost", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Sanitizante por cocción ($)">
            <Input type="number" {...form.register("defaultSanitizerCost", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Amortización de envases ($/L)">
            <Input type="number" {...form.register("kegAmortizationPerLiter", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Margen objetivo (%)">
            <Input type="number" {...form.register("targetMarginPct", { valueAsNumber: true })} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Producción">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Eficiencia por defecto (%)">
            <Input type="number" {...form.register("defaultEfficiencyPct", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Volumen de lote por defecto (L)">
            <Input type="number" {...form.register("defaultBatchVolumeL", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Cantidad de fermentadores">
            <Input type="number" {...form.register("fermenterCount", { valueAsNumber: true })} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Eventos">
        <FormField label="Litros por adulto">
          <Input type="number" step="0.05" {...form.register("litersPerAdult", { valueAsNumber: true })} />
        </FormField>
      </SectionCard>

      <SectionCard title="Portal público" description="Usado para generar el QR de cada barril y sus links de contacto.">
        <FormField
          label="URL base donde subís las páginas"
          hint="Ej: https://tuusuario.github.io/saintbier/b — se le agrega /CODIGO-DE-LOTE.html"
        >
          <Input placeholder="https://..." {...form.register("publicPortalBaseUrl")} />
        </FormField>
        <FormField label="WhatsApp del operario" hint="Formato internacional sin +, ej: 5491122334455">
          <Input placeholder="5491122334455" {...form.register("whatsappPhone")} />
        </FormField>
        <FormField label="Instagram">
          <Input placeholder="saintbier" {...form.register("instagramHandle")} />
        </FormField>
        <FormField label="Historia de la marca">
          <Textarea rows={3} {...form.register("brandStory")} />
        </FormField>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Guardar ajustes
        </Button>
      </div>
    </form>
  )
}
