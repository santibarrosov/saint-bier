import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ToastProvider } from "@/components/ui/toast"
import { AppShell } from "@/components/layout/AppShell"
import { Logo } from "@/components/layout/Logo"

const Dashboard = lazy(() => import("@/routes/Dashboard").then((m) => ({ default: m.Dashboard })))
const RecetasList = lazy(() => import("@/routes/recetas/RecetasList").then((m) => ({ default: m.RecetasList })))
const RecetaEditor = lazy(() => import("@/routes/recetas/RecetaEditor").then((m) => ({ default: m.RecetaEditor })))
const RecetaDetail = lazy(() => import("@/routes/recetas/RecetaDetail").then((m) => ({ default: m.RecetaDetail })))
const CoccionesList = lazy(() => import("@/routes/cocciones/CoccionesList").then((m) => ({ default: m.CoccionesList })))
const CoccionForm = lazy(() => import("@/routes/cocciones/CoccionForm").then((m) => ({ default: m.CoccionForm })))
const CoccionDetail = lazy(() => import("@/routes/cocciones/CoccionDetail").then((m) => ({ default: m.CoccionDetail })))
const ModoCoccion = lazy(() => import("@/routes/cocciones/ModoCoccion").then((m) => ({ default: m.ModoCoccion })))
const LevadurasPage = lazy(() => import("@/routes/levaduras/LevadurasPage").then((m) => ({ default: m.LevadurasPage })))
const InventarioPage = lazy(() => import("@/routes/inventario/InventarioPage").then((m) => ({ default: m.InventarioPage })))
const BarrilesPage = lazy(() => import("@/routes/barriles/BarrilesPage").then((m) => ({ default: m.BarrilesPage })))
const EventosList = lazy(() => import("@/routes/eventos/EventosList").then((m) => ({ default: m.EventosList })))
const EventoDetail = lazy(() => import("@/routes/eventos/EventoDetail").then((m) => ({ default: m.EventoDetail })))
const EventoForm = lazy(() => import("@/routes/eventos/EventoForm").then((m) => ({ default: m.EventoForm })))
const CostosPage = lazy(() => import("@/routes/costos/CostosPage").then((m) => ({ default: m.CostosPage })))
const PlanificadorPage = lazy(() => import("@/routes/planificador/PlanificadorPage").then((m) => ({ default: m.PlanificadorPage })))
const AjustesPage = lazy(() => import("@/routes/ajustes/AjustesPage").then((m) => ({ default: m.AjustesPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-pulse-soft">
        <Logo markSize={32} wordmarkClassName="text-lg" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="cocciones/:id/modo-coccion" element={<ModoCoccion />} />

            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />

              <Route path="recetas" element={<RecetasList />} />
              <Route path="recetas/nueva" element={<RecetaEditor />} />
              <Route path="recetas/:id" element={<RecetaDetail />} />
              <Route path="recetas/:id/editar" element={<RecetaEditor />} />

              <Route path="cocciones" element={<CoccionesList />} />
              <Route path="cocciones/nueva" element={<CoccionForm />} />
              <Route path="cocciones/:id" element={<CoccionDetail />} />

              <Route path="levaduras" element={<LevadurasPage />} />
              <Route path="inventario" element={<InventarioPage />} />
              <Route path="barriles" element={<BarrilesPage />} />

              <Route path="eventos" element={<EventosList />} />
              <Route path="eventos/nuevo" element={<EventoForm />} />
              <Route path="eventos/:id" element={<EventoDetail />} />
              <Route path="eventos/:id/editar" element={<EventoForm />} />

              <Route path="costos" element={<CostosPage />} />
              <Route path="planificador" element={<PlanificadorPage />} />
              <Route path="ajustes" element={<AjustesPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}
