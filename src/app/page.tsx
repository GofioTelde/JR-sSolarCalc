"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VisitCounter } from "@/components/VisitCounter";
import MagneticCalculatorComponent from "@/components/magnetic/MagneticCalculator";
import Phase2Wizard from "@/components/Phase2Wizard";
import Phase3Dimensioning from "@/components/Phase3Dimensioning";
import Phase4ComponentSelection from "@/components/Phase4ComponentSelection";
import Phase5Summary from "@/components/Phase5Summary";
import { ProjectProvider, useProject } from "@/context/ProjectContext";

// ---------------------------------------------------------------------------
// Constants (inline to keep page.tsx self-contained)
// ---------------------------------------------------------------------------

const PHASES = [
  {
    id: 1,
    icon: "🧭",
    short: "Localización",
    full: "Cálculo de Declinación Magnética",
    color: "yellow",
  },
  {
    id: 2,
    icon: "⚙️",
    short: "Instalación",
    full: "Tipo y consumo",
    color: "blue",
  },
  {
    id: 3,
    icon: "📐",
    short: "Dimensionado",
    full: "Análisis y Recomendación",
    color: "purple",
  },
  {
    id: 4,
    icon: "🛒",
    short: "Componentes",
    full: "Selección de Componentes",
    color: "indigo",
  },
  {
    id: 5,
    icon: "✅",
    short: "Resumen",
    full: "Lista de compra",
    color: "emerald",
  },
] as const;

type PhaseColor = "yellow" | "blue" | "purple" | "indigo" | "emerald";
type PhaseId = (typeof PHASES)[number]["id"];

const COLOR_MAP: Record<
  PhaseColor,
  {
    active: string;
    done: string;
    ring: string;
    text: string;
    sub: string;
    btn: string;
  }
> = {
  yellow: {
    active:
      "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg",
    done: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-400",
    sub: "text-yellow-600 dark:text-yellow-300",
    btn: "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
  },
  blue: {
    active: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg",
    done: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    sub: "text-blue-600 dark:text-blue-300",
    btn: "from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
  },
  purple: {
    active: "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg",
    done: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-400",
    sub: "text-purple-600 dark:text-purple-300",
    btn: "from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
  },
  indigo: {
    active:
      "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg",
    done: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-700 dark:text-indigo-400",
    sub: "text-indigo-600 dark:text-indigo-300",
    btn: "from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
  },
  emerald: {
    active:
      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg",
    done: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    sub: "text-emerald-600 dark:text-emerald-300",
    btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
  },
};

// ---------------------------------------------------------------------------
// Inner app (needs ProjectContext)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Help modal
// ---------------------------------------------------------------------------

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            🌞 Cómo usar JR's SolarCalc
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {/* Intro */}
          <p className="text-gray-600 dark:text-gray-300">
            Esta herramienta te guía paso a paso para dimensionar una
            instalación solar fotovoltaica. Sigue las 5 fases en orden:
          </p>

          {/* Phases */}
          {(
            [
              {
                phase: "Fase 1 — Localización",
                icon: "🧭",
                color:
                  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
                desc: "Introduce tus coordenadas o busca tu ubicación. El sistema calcula la declinación magnética local para orientar correctamente los paneles solares hacia el sur geográfico.",
              },
              {
                phase: "Fase 2 — Instalación",
                icon: "⚙️",
                color:
                  "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
                desc: "Define el tipo de sistema (híbrido o separados), si quieres baterías, tu consumo mensual en kWh y los días de autonomía deseados. También elige el tipo de panel (monofacial o bifacial).",
              },
              {
                phase: "Fase 3 — Dimensionado",
                icon: "📐",
                color:
                  "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
                desc: "El sistema consulta PVGIS para obtener las Horas de Sol Pico (HSP) de tu ubicación y calcula la potencia de paneles y capacidad de baterías necesarias. Puedes ajustar las pérdidas del sistema.",
              },
              {
                phase: "Fase 4 — Componentes",
                icon: "🛒",
                color:
                  "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300",
                desc: "Selecciona los componentes concretos: paneles (Wp), baterías (kWh) e inversor. El sistema preselecciona la opción óptima. Puedes cambiarla libremente.",
              },
              {
                phase: "Fase 5 — Resumen",
                icon: "✅",
                color:
                  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300",
                desc: "Obtén la lista de compra completa con cantidades y precios estimados de mercado (sin IVA, IGIC). También incluye las protecciones eléctricas necesarias e instrucciones de instalación.",
              },
            ] as const
          ).map(({ phase, icon, color, desc }) => (
            <div key={phase} className={`rounded-xl p-3 ${color}`}>
              <p className="font-bold mb-1">
                {icon} {phase}
              </p>
              <p className="text-xs opacity-90">{desc}</p>
            </div>
          ))}

          {/* Color coding */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <p className="font-bold text-gray-800 dark:text-white mb-2">
              🎨 Código de colores
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Verde</strong> — Opción recomendada por el sistema
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Azul</strong> — Superior al recomendado (más potente o
                  más caro)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Rojo</strong> — Inferior al recomendado (puede ser
                  insuficiente)
                </span>
              </div>
            </div>
          </div>

          {/* Battery BMS note */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-1">🔋 Nota sobre baterías HV</p>
            <p>
              Las baterías HV modulares (como Pylontech, BYD, Growatt ARK)
              agrupan varios módulos en una sola torre con un único BMS. El
              sistema recomienda la configuración con el menor número de BMS
              (menor coste). "1 BMS · 7 mód." = una sola unidad con 7 módulos
              internos.
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            ⚠️ Los precios son orientativos. Consulta siempre a un instalador
            certificado antes de realizar cualquier compra o instalación
            eléctrica.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { data, reset } = useProject();

  const [currentPhase, setCurrentPhase] = useState<PhaseId>(1);
  const [maxPhase, setMaxPhase] = useState<PhaseId>(1);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmedSystemType, setConfirmedSystemType] = useState<
    "hibrido" | "separados"
  >("hibrido");

  // Restore progress from persisted context data
  useEffect(() => {
    if (data.selectedComponents?.panelId) {
      setMaxPhase(5);
      setCurrentPhase(5);
    } else if (data.solarCalc) {
      setMaxPhase(4);
      if (data.solarCalc.confirmedSystemType) {
        setConfirmedSystemType(data.solarCalc.confirmedSystemType);
      }
    } else if (data.consumption?.monthlyKWh) {
      setMaxPhase(3);
    } else if (data.location?.latitude) {
      setMaxPhase(2);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPhaseInfo = PHASES.find((p) => p.id === currentPhase)!;
  const colors = COLOR_MAP[currentPhaseInfo.color as PhaseColor];

  const goTo = (phase: PhaseId) => {
    if (phase <= maxPhase) {
      setCurrentPhase(phase);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const advance = (to: PhaseId) => {
    setMaxPhase((m) => (to > m ? to : m) as PhaseId);
    setCurrentPhase(to);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const handlePhase1Done = () => {
    if (!data.location?.latitude || !data.location?.longitude) {
      alert(
        "⚠️ Por favor, completa los datos de localización antes de continuar.",
      );
      return;
    }
    advance(2);
  };

  const handlePhase2Done = () => advance(3);

  const handlePhase3Done = (sysType: "hibrido" | "separados") => {
    setConfirmedSystemType(sysType);
    advance(4);
  };

  const handlePhase4Done = () => advance(5);

  const handleReset = () => {
    reset();
    setCurrentPhase(1);
    setMaxPhase(1);
    setConfirmedSystemType("hibrido");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 print:bg-white">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* ---------------------------------------------------------------- */}
        {/* Header */}
        {/* ---------------------------------------------------------------- */}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

        <header className="text-center mb-8 print:hidden">
          <div className="flex justify-between items-center mb-4">
            <VisitCounter />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(true)}
                title="Ayuda"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold text-sm"
              >
                ?
              </button>
              <ThemeToggle />
            </div>
          </div>

          <div className="inline-block p-3 bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-600 dark:to-yellow-600 rounded-2xl mb-3 shadow-lg">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow">
              🌞 JR's SolarCalc
            </h1>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Instalaciones Fotovoltaicas
          </h2>

          {/* Current phase badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 border ${colors.ring}`}
          >
            <span className={`font-medium text-sm ${colors.text}`}>
              {currentPhaseInfo.icon} Fase {currentPhase}
            </span>
            <span className={`text-sm ${colors.sub}`}>
              {currentPhaseInfo.full}
            </span>
          </div>

          {/* Phase navigator + labels */}
          <div className="hidden sm:flex justify-center gap-1.5 mb-4">
            {PHASES.map((phase) => {
              const isDone = phase.id < currentPhase;
              const isActive = phase.id === currentPhase;
              const isLocked = phase.id > maxPhase;
              const pc = COLOR_MAP[phase.color as PhaseColor];
              return (
                <div
                  key={phase.id}
                  className="flex flex-col items-center gap-1 w-16"
                >
                  <button
                    onClick={() => goTo(phase.id as PhaseId)}
                    disabled={isLocked}
                    title={phase.full}
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                      isActive
                        ? `${pc.active} scale-110`
                        : isDone
                          ? pc.done
                          : isLocked
                            ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer hover:scale-105",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : phase.id}
                  </button>
                  <span
                    className={`text-[10px] text-center leading-tight ${isActive ? pc.text + " font-semibold" : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {phase.short}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Phase navigator — mobile only (no labels) */}
          <div className="flex sm:hidden justify-center items-center gap-1.5 mb-4">
            {PHASES.map((phase) => {
              const isDone = phase.id < currentPhase;
              const isActive = phase.id === currentPhase;
              const isLocked = phase.id > maxPhase;
              const pc = COLOR_MAP[phase.color as PhaseColor];
              return (
                <button
                  key={phase.id}
                  onClick={() => goTo(phase.id as PhaseId)}
                  disabled={isLocked}
                  title={phase.full}
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                    isActive
                      ? `${pc.active} scale-110`
                      : isDone
                        ? pc.done
                        : isLocked
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer hover:scale-105",
                  ].join(" ")}
                >
                  {isDone ? "✓" : phase.id}
                </button>
              );
            })}
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Main content card */}
        {/* ---------------------------------------------------------------- */}
        <main className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 transition-colors duration-300 print:shadow-none print:border-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 print:hidden" />
          <div className="p-5 md:p-8">
            {/* FASE 1 */}
            {currentPhase === 1 && (
              <div>
                <MagneticCalculatorComponent />
                <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 print:hidden">
                  <button
                    onClick={handlePhase1Done}
                    className={`px-8 py-3 bg-gradient-to-r ${colors.btn} text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2`}
                  >
                    Continuar <span>→</span>
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Los datos de localización se guardan automáticamente
                  </p>
                </div>
              </div>
            )}

            {/* FASE 2 */}
            {currentPhase === 2 && (
              <div>
                <Phase2Wizard />
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 print:hidden">
                  <button
                    onClick={() => goTo(1)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium inline-flex items-center gap-1.5 text-sm"
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={handlePhase2Done}
                    className={`px-6 py-2.5 bg-gradient-to-r ${colors.btn} text-white rounded-xl font-bold shadow hover:shadow-lg transition-all inline-flex items-center gap-2`}
                  >
                    Analizar y Dimensionar →
                  </button>
                </div>
              </div>
            )}

            {/* FASE 3 */}
            {currentPhase === 3 && (
              <div>
                <Phase3Dimensioning onConfirm={handlePhase3Done} />
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
                  <button
                    onClick={() => goTo(2)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium inline-flex items-center gap-1.5 text-sm"
                  >
                    ← Atrás
                  </button>
                </div>
              </div>
            )}

            {/* FASE 4 */}
            {currentPhase === 4 && (
              <div>
                <Phase4ComponentSelection
                  confirmedSystemType={confirmedSystemType}
                  onConfirm={handlePhase4Done}
                />
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
                  <button
                    onClick={() => goTo(3)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium inline-flex items-center gap-1.5 text-sm"
                  >
                    ← Atrás
                  </button>
                </div>
              </div>
            )}

            {/* FASE 5 */}
            {currentPhase === 5 && (
              <div>
                <Phase5Summary onReset={handleReset} />
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
                  <button
                    onClick={() => goTo(4)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium inline-flex items-center gap-1.5 text-sm"
                  >
                    ← Atrás
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ---------------------------------------------------------------- */}
        {/* Footer */}
        {/* ---------------------------------------------------------------- */}
        <footer className="mt-8 text-center print:hidden">
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            ⚡ JR's SolarCalc v1.0 · Dimensionado profesional de instalaciones
            solares
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            &copy; JR 2026. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — wraps everything in ProjectProvider
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
