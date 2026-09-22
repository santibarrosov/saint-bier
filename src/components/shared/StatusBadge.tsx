import { Badge } from "@/components/ui/badge"
import type { BatchStatus, EventPaymentStatus, KegStatus } from "@/data/types"
import { BATCH_STATUS_LABELS, EVENT_PAYMENT_STATUS_LABELS, KEG_STATUS_COLOR_VAR, KEG_STATUS_LABELS } from "@/lib/constants"

export function KegStatusBadge({ status }: { status: KegStatus }) {
  return (
    <Badge variant="neutral" dotColor={KEG_STATUS_COLOR_VAR[status]}>
      {KEG_STATUS_LABELS[status]}
    </Badge>
  )
}

const BATCH_STATUS_VARIANT: Record<BatchStatus, "neutral" | "primary" | "success" | "warning" | "info"> = {
  planificada: "neutral",
  cociendo: "warning",
  fermentando: "info",
  madurando: "info",
  carbonatando: "warning",
  envasada: "success",
  finalizada: "success",
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge variant={BATCH_STATUS_VARIANT[status]}>{BATCH_STATUS_LABELS[status]}</Badge>
}

const PAYMENT_STATUS_VARIANT: Record<EventPaymentStatus, "danger" | "warning" | "success"> = {
  "sin_seña": "danger",
  "señado": "warning",
  pagado: "success",
}

export function PaymentStatusBadge({ status }: { status: EventPaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_VARIANT[status]}>{EVENT_PAYMENT_STATUS_LABELS[status]}</Badge>
}
