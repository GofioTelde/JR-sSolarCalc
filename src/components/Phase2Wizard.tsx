"use client";
// src/components/Phase2Wizard.tsx
// Step-by-step guided wizard for non-technical users.
// Collects: grid access → installation modality → consumption → autonomy → panel type.

import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import {
  MODALITY_INFO,
  type InstallationModality,
} from "@/constants/system";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep =
  | "grid_access"
  | "objective"
  | "consumption"
  | "autonomy"
  | "panel_type"
  | "inverter_phase";

interface WizardAnswers {
  hasGrid: boolean | null;
  modality: InstallationModality | null;
  monthlyKWh: number;
  autonomyDays: number;
  panelType: "monofacial" | "bifacial";
  inverterPhases: 1 | 3;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the ordered step sequence given the current answers. */
function buildStepFlow(answers: WizardAnswers): WizardStep[] {
  const steps: WizardStep[] = ["grid_access"];
  if (answers.hasGrid) steps.push("objective");
  steps.push("consumption");
  const modInfo = answers.modality ? MODALITY_INFO[answers.modality] : null;
  if (modInfo?.hasBatteries) steps.push("autonomy");
  steps.push("panel_type");
  steps.push("inverter_phase");
  return steps;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  current: number;
  total: number;
}
const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => (
  <div className="flex items-center gap-2 mb-6">
    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.round((current / total) * 100)}%` }}
      />
    </div>
    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
      {current} / {total}
    </span>
  </div>
);

interface ChoiceCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  isSelected?: boolean;
  onClick: () => void;
  accentBorder?: string;
  accentBg?: string;
}
const ChoiceCard: React.FC<ChoiceCardProps> = ({
  icon,
  title,
  subtitle,
  isSelected,
  onClick,
  accentBorder = "border-blue-500",
  accentBg = "bg-blue-50 dark:bg-blue-900/20",
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      isSelected
        ? `${accentBorder} ${accentBg} shadow-md`
        : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800",
    ].join(" ")}
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div>
        <div className="font-semibold text-gray-800 dark:text-white text-base leading-snug">
          {title}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            {subtitle}
          </div>
        )}
      </div>
      {isSelected && (
        <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        </div>
      )}
    </div>
  </button>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const Phase2Wizard: React.FC = () => {
  const { data, update } = useProject();

  // ---- local state ----
  const [answers, setAnswers] = useState<WizardAnswers>({
    hasGrid: null,
    modality: null,
    monthlyKWh: 300,
    autonomyDays: 3,
    panelType: "monofacial",
    inverterPhases: 1,
  });
  const [currentStep, setCurrentStep] = useState<WizardStep>("grid_access");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from context on first render
  useEffect(() => {
    if (hydrated) return;
    const saved: Partial<WizardAnswers> = {};

    if (data.installationModality) {
      const info = MODALITY_INFO[data.installationModality];
      saved.modality = data.installationModality;
      saved.hasGrid = info.installationType === "on-grid";
    } else if (data.installationType) {
      saved.hasGrid = data.installationType === "on-grid";
    }
    if (data.consumption?.monthlyKWh) saved.monthlyKWh = data.consumption.monthlyKWh;
    if (data.consumption?.autonomyDays) saved.autonomyDays = data.consumption.autonomyDays;
    if (data.panelType) saved.panelType = data.panelType;
    if (data.inverterPhases) saved.inverterPhases = data.inverterPhases;

    setAnswers((a) => ({ ...a, ...saved }));
    setHydrated(true);
  }, [data, hydrated]);

  // ---- derived state ----
  const stepFlow = buildStepFlow(answers);
  const stepIndex = stepFlow.indexOf(currentStep);
  const hasBatteries =
    answers.modality ? MODALITY_INFO[answers.modality].hasBatteries : false;

  // ---- persistence: write to context whenever answers change (after hydration) ----
  useEffect(() => {
    if (!hydrated) return;
    if (answers.modality === null) return; // don't persist incomplete

    const info = MODALITY_INFO[answers.modality];
    update({
      installationModality: answers.modality,
      installationType: info.installationType,
      hasBatteries: info.hasBatteries,
      panelType: answers.panelType,
      inverterPhases: answers.inverterPhases,
      consumption: {
        monthlyKWh: answers.monthlyKWh,
        autonomyDays: hasBatteries ? answers.autonomyDays : 0,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, hydrated]);

  // ---- navigation ----
  const goNext = () => {
    const next = stepFlow[stepIndex + 1];
    if (next) setCurrentStep(next);
  };

  const goBack = () => {
    const prev = stepFlow[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const setAnswer = <K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  // Auto-advance helpers (for card choices)
  const pickModality = (modality: InstallationModality) => {
    const info = MODALITY_INFO[modality];
    setAnswers((a) => {
      const updated = {
        ...a,
        modality,
        autonomyDays: info.autonomyDefault > 0 ? info.autonomyDefault : a.autonomyDays,
      };
      // schedule navigation after state settles
      setTimeout(() => {
        const flow = buildStepFlow(updated);
        const idx = flow.indexOf("objective");
        const next = flow[idx + 1] ?? flow[flow.length - 1];
        setCurrentStep(next);
      }, 120);
      return updated;
    });
  };

  const pickGridAccess = (hasGrid: boolean) => {
    setAnswers((a) => {
      const updated = { ...a, hasGrid, modality: hasGrid ? a.modality : "aislada" as InstallationModality };
      if (!hasGrid) {
        // off-grid forces "aislada" and auto-advances to consumption
        setTimeout(() => setCurrentStep("consumption"), 120);
      } else {
        setTimeout(() => setCurrentStep("objective"), 120);
      }
      return updated;
    });
  };

  const pickPanel = (panelType: "monofacial" | "bifacial") => {
    setAnswer("panelType", panelType);
    setTimeout(() => setCurrentStep("inverter_phase"), 120);
  };

  // ---- daily consumption display ----
  const dailyKWh = (answers.monthlyKWh / 30).toFixed(1);

  // ---- render ----
  return (
    <div className="max-w-lg mx-auto px-4 py-2">

      {/* Phase badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full px-5 py-2 mb-3">
          <span className="text-blue-700 dark:text-blue-400 font-bold">⚙️ Fase 2</span>
          <span className="text-blue-600 dark:text-blue-300 font-medium">Tu instalación</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Responde unas preguntas sencillas — el sistema hace el resto
        </p>
      </div>

      <ProgressBar current={stepIndex + 1} total={stepFlow.length} />

      {/* ---------------------------------------------------------------- */}
      {/* STEP 1 — Grid access */}
      {/* ---------------------------------------------------------------- */}
      {currentStep === "grid_access" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center leading-snug">
            ¿Tu instalación tendrá acceso a la red eléctrica?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            La red eléctrica es el suministro normal de tu hogar o local
          </p>
          <div className="space-y-3 pt-2">
            <ChoiceCard
              icon="🔌"
              title="Sí, tengo o tendré acceso a la red"
              subtitle="Casa, piso, local, nave con suministro eléctrico"
              isSelected={answers.hasGrid === true}
              onClick={() => pickGridAccess(true)}
              accentBorder="border-green-500"
              accentBg="bg-green-50 dark:bg-green-900/20"
            />
            <ChoiceCard
              icon="🏕️"
              title="No, es una instalación aislada"
              subtitle="Casa rural sin red, caravana, barco, finca, refugio…"
              isSelected={answers.hasGrid === false}
              onClick={() => pickGridAccess(false)}
              accentBorder="border-blue-500"
              accentBg="bg-blue-50 dark:bg-blue-900/20"
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 2 — Objective (only if grid = yes) */}
      {/* ---------------------------------------------------------------- */}
      {currentStep === "objective" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center leading-snug">
            ¿Cuál es tu objetivo principal?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Elige el que mejor describe lo que quieres conseguir
          </p>
          <div className="space-y-3 pt-2">
            {(
              [
                "autoconsumo_sin_baterias",
                "autoconsumo_con_baterias",
                "autoconsumo_0_inyeccion",
                "respaldo_ups",
              ] as InstallationModality[]
            ).map((mod) => {
              const info = MODALITY_INFO[mod];
              return (
                <ChoiceCard
                  key={mod}
                  icon={info.icon}
                  title={info.label}
                  subtitle={info.description}
                  isSelected={answers.modality === mod}
                  onClick={() => pickModality(mod)}
                  accentBorder={info.borderClass}
                  accentBg={info.bgClass}
                />
              );
            })}
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              ← Volver
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 3 — Consumption */}
      {/* ---------------------------------------------------------------- */}
      {currentStep === "consumption" && (
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-snug">
              ¿Cuánto consume tu hogar o negocio?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mira tu última factura eléctrica — busca "kWh" o "energía consumida"
            </p>
          </div>

          {/* Current modality reminder */}
          {answers.modality && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${MODALITY_INFO[answers.modality].bgClass} ${MODALITY_INFO[answers.modality].textClass}`}
            >
              <span>{MODALITY_INFO[answers.modality].icon}</span>
              <span className="font-medium">{MODALITY_INFO[answers.modality].label}</span>
            </div>
          )}

          {/* Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Consumo mensual
              </label>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {answers.monthlyKWh} kWh
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="3000"
              step="10"
              value={answers.monthlyKWh}
              onChange={(e) => setAnswer("monthlyKWh", Number(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>30 kWh</span>
              <span>3 000 kWh</span>
            </div>

            {/* Manual input */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="number"
                min="30"
                max="3000"
                value={answers.monthlyKWh}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 30 && v <= 3000) setAnswer("monthlyKWh", v);
                }}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-center font-bold"
              />
              <span className="text-gray-600 dark:text-gray-400 text-sm">kWh / mes</span>
            </div>
          </div>

          {/* Daily display */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Consumo diario estimado</div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{dailyKWh} kWh/día</div>
          </div>

          {/* Reference table */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Referencia orientativa</div>
            {[
              { label: "Piso pequeño (1-2 pers.)", value: "100–200 kWh" },
              { label: "Casa familiar (3-4 pers.)", value: "250–450 kWh" },
              { label: "Casa grande / chalet", value: "500–900 kWh" },
              { label: "Local comercial pequeño", value: "300–600 kWh" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>{r.label}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold shadow transition-all inline-flex items-center gap-2"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 4 — Autonomy (only if hasBatteries) */}
      {/* ---------------------------------------------------------------- */}
      {currentStep === "autonomy" && (
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-snug">
              ¿Cuántos días sin sol quieres estar cubierto?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Son los días que las baterías alimentan tu hogar sin que haya generación solar
            </p>
          </div>

          {answers.modality && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
              <span>💡</span>
              <span>{MODALITY_INFO[answers.modality].autonomyRecommend}</span>
            </div>
          )}

          {/* Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Días de autonomía
              </label>
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                {answers.autonomyDays}
                <span className="text-base font-normal text-gray-500 ml-1">días</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={answers.autonomyDays}
              onChange={(e) => setAnswer("autonomyDays", Number(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1 día</span>
              <span>10 días</span>
            </div>
          </div>

          {/* Estimated battery capacity */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Capacidad de batería estimada necesaria
            </div>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {((answers.monthlyKWh / 30) * answers.autonomyDays).toFixed(1)} kWh
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow transition-all inline-flex items-center gap-2"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 5 — Panel type */}
      {/* ---------------------------------------------------------------- */}
      {currentStep === "panel_type" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-snug">
              ¿Qué tipo de panel prefieres?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Si no sabes cuál elegir, el monofacial es la opción más habitual
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <ChoiceCard
              icon="🔆"
              title="Monofacial — Recomendado"
              subtitle="Tecnología estándar, probada y más económica. Ideal para la mayoría de instalaciones."
              isSelected={answers.panelType === "monofacial"}
              onClick={() => pickPanel("monofacial")}
              accentBorder="border-orange-500"
              accentBg="bg-orange-50 dark:bg-orange-900/20"
            />
            <ChoiceCard
              icon="✨"
              title="Bifacial — Mayor eficiencia"
              subtitle="Capta luz por ambas caras (+10–30% en condiciones ideales). Precio algo mayor."
              isSelected={answers.panelType === "bifacial"}
              onClick={() => pickPanel("bifacial")}
              accentBorder="border-purple-500"
              accentBg="bg-purple-50 dark:bg-purple-900/20"
            />
          </div>

          {/* Summary card */}
          <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm border border-gray-200 dark:border-gray-700">
            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumen de tu configuración</div>
            {answers.modality && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Modalidad</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {MODALITY_INFO[answers.modality].icon} {MODALITY_INFO[answers.modality].shortLabel}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Consumo</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {answers.monthlyKWh} kWh/mes
              </span>
            </div>
            {hasBatteries && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Autonomía</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {answers.autonomyDays} días
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Panel</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">
                {answers.panelType === "monofacial" ? "Monofacial" : "Bifacial"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              ← Volver
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 6 — Inverter phase */}
      {/* ---------------------------------------------------------------- */}
      {currentStep === "inverter_phase" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-snug">
              ¿Tu instalación eléctrica es monofásica o trifásica?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mira el cuadro eléctrico: si tiene un solo interruptor diferencial principal es monofásica. Si tiene tres, es trifásica.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <ChoiceCard
              icon="〰️"
              title="Monofásica — La más habitual"
              subtitle="Viviendas, pisos y negocios pequeños. Una sola fase de 230 V."
              isSelected={answers.inverterPhases === 1}
              onClick={() => {
                setAnswer("inverterPhases", 1);
                goNext();
              }}
              accentBorder="border-blue-500"
              accentBg="bg-blue-50 dark:bg-blue-900/20"
            />
            <ChoiceCard
              icon="⚡"
              title="Trifásica — Para alta potencia"
              subtitle="Industria, talleres, fincas con maquinaria. Tres fases de 400 V entre sí."
              isSelected={answers.inverterPhases === 3}
              onClick={() => {
                setAnswer("inverterPhases", 3);
                goNext();
              }}
              accentBorder="border-purple-500"
              accentBg="bg-purple-50 dark:bg-purple-900/20"
            />
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
            <span>💡</span>
            <span>Si no estás seguro, la mayoría de viviendas y locales pequeños son <strong>monofásicas</strong>.</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              ← Volver
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Phase2Wizard;
