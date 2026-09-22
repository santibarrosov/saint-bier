import type { LucideIcon } from "lucide-react"
import {
  Barrel,
  Beer,
  Coins,
  CalendarClock,
  FlaskConical,
  LayoutDashboard,
  Microscope,
  PartyPopper,
  Settings,
  Warehouse,
} from "lucide-react"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Aparece en la barra inferior de mobile (máximo 4, el resto va en "Más"). */
  primary?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { to: "/cocciones", label: "Cocciones", icon: Beer, primary: true },
  { to: "/barriles", label: "Barriles", icon: Barrel, primary: true },
  { to: "/eventos", label: "Eventos", icon: PartyPopper, primary: true },
  { to: "/recetas", label: "Recetas", icon: FlaskConical },
  { to: "/levaduras", label: "Levaduras", icon: Microscope },
  { to: "/inventario", label: "Inventario", icon: Warehouse },
  { to: "/costos", label: "Costos", icon: Coins },
  { to: "/planificador", label: "Planificador", icon: CalendarClock },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
]
