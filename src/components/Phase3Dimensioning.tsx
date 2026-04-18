"use client";
// src/components/Phase3Dimensioning.tsx
// Dimensioning engine UI with:
//  - PVGIS real irradiance fetch
//  - Configurable performance ratio (PR) losses
//  - System type recommendation with user override

import React, { useCallback, useEffect, useState } from "react";
import { useProject } from "@/context/ProjectContext";
import {
  calculateSolarSystem,
  buildPerformanceFactor,
  DEFAULT_PR_LOSSES,
  type SolarCalculationResult,
} from "@/services/solarCalculator";
import { fetchPVGISData, describeHSP } from "@/services/pvgisService";
import { SYSTEM_TYPE_INFO, MODALITY_INFO, type SystemTypeKey } from "@/constants/system";

const DEFAULT_PANEL_WP = 400; // reference for Phase 3 display (user picks real panel in Phase 4)

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  unit,
  color = "gray",
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: "orange" | "blue" | "green" | "purple" | "gray";
}) {
  const textCls = {
    orange: "text-orange-600 dark:text-orange-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
    gray: "text-gray-700 dark:text-gray-300",
  }[color];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${textCls} leading-tight`}>
        {value}
        {unit && (
          <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  subtitle,
  children,
  colorClass = "orange",
}: {
  step: number;
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  colorClass?: "orange" | "blue" | "yellow" | "green" | "purple";
}) {
  const palette = {
    orange: {
      wrap: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800",
      bubble: "bg-orange-500",
    },
    blue: {
      wrap: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800",
      bubble: "bg-blue-500",
    },
    yellow: {
      wrap: "from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 border-yellow-200 dark:border-yellow-800",
      bubble: "bg-yellow-500",
    },
    green: {
      wrap: "from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-green-200 dark:border-green-800",
      bubble: "bg-green-500",
    },
    purple: {
      wrap: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800",
      bubble: "bg-purple-500",
    },
  }[colorClass];

  return (
    <div
      className={`mb-6 bg-gradient-to-r ${palette.wrap} border rounded-xl p-5`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full ${palette.bubble} text-white flex items-center justify-center font-bold text-lg`}
        >
          {step}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white mb-1">
            {icon} {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  onConfirm: (systemType: SystemTypeKey) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Phase3Dimensioning: React.FC<Props> = ({ onConfirm }) => {
  const { data, update } = useProject();

  const [calc, setCalc] = useState<SolarCalculationResult | null>(null);
  const [confirmedSystemType, setConfirmedSystemType] =
    useState<SystemTypeKey>("hibrido");

  // PVGIS state
  const [pvgisLoading, setPvgisLoading] = useState(false);
  const [pvgisError, setPvgisError] = useState<string | null>(null);
  const [hspOverride, setHspOverride] = useState<number | undefined>(undefined);
  const [pvgisOptimalTilt, setPvgisOptimalTilt] = useState<number | null>(null);
  const [pvgisSource, setPvgisSource] = useState<"estimate" | "pvgis">("estimate");

  // PR losses
  const [prLosses, setPrLosses] =
    useState<Record<keyof typeof DEFAULT_PR_LOSSES, number>>({ ...DEFAULT_PR_LOSSES });
  const [showPrEditor, setShowPrEditor] = useState(false);

  const missingData =
    !data.location?.latitude || !data.consumption?.monthlyKWh;

  // Re-run calculation whenever relevant inputs change
  const runCalc = useCallback(() => {
    if (!data.location?.latitude || !data.consumption?.monthlyKWh) return;

    const prBreakdown = buildPerformanceFactor(prLosses);
    const result = calculateSolarSystem({
      latitude: data.location.latitude,
      monthlyKWh: data.consumption.monthlyKWh,
      panelWp: DEFAULT_PANEL_WP,
      hasBatteries: data.hasBatteries ?? true,
      autonomyDays: data.consumption.autonomyDays ?? 3,
      installationType: data.installationType ?? "on-grid",
      installationModality: data.installationModality,
      hspOverride,
      performanceFactorOverride: prBreakdown.total,
    });
    setCalc(result);
  }, [
    data.location,
    data.consumption,
    data.hasBatteries,
    data.installationType,
    hspOverride,
    prLosses,
  ]);

  // Init: restore saved state
  useEffect(() => {
    if (data.solarCalc?.confirmedSystemType) {
      setConfirmedSystemType(data.solarCalc.confirmedSystemType);
    }
    if (data.solarCalc?.hspSource === "pvgis" && data.solarCalc.hsp) {
      setHspOverride(data.solarCalc.hsp);
      setPvgisSource("pvgis");
    }
    if (data.solarCalc?.prLosses) {
      setPrLosses({ ...DEFAULT_PR_LOSSES, ...data.solarCalc.prLosses });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    runCalc();
  }, [runCalc]);

  // After first calc, default confirmedSystemType to recommendation
  useEffect(() => {
    if (calc && !data.solarCalc?.confirmedSystemType) {
      setConfirmedSystemType(calc.recommendedSystemType);
    }
  }, [calc, data.solarCalc]);

  // -------------------------------------------------------------------------
  // PVGIS fetch
  // -------------------------------------------------------------------------
  const handleFetchPVGIS = async () => {
    if (!data.location?.latitude || !data.location?.longitude) return;
    setPvgisLoading(true);
    setPvgisError(null);
    try {
      const result = await fetchPVGISData(
        data.location.latitude,
        data.location.longitude
      );
      setHspOverride(result.hsp);
      setPvgisOptimalTilt(result.optimalTiltDeg);
      setPvgisSource("pvgis");
    } catch (err) {
      setPvgisError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con PVGIS. Comprueba tu conexión a internet."
      );
    } finally {
      setPvgisLoading(false);
    }
  };

  const handleResetHSP = () => {
    setHspOverride(undefined);
    setPvgisSource("estimate");
    setPvgisOptimalTilt(null);
    setPvgisError(null);
  };

  // -------------------------------------------------------------------------
  // Confirm
  // -------------------------------------------------------------------------
  const handleConfirm = () => {
    if (!calc) return;
    const prBreakdown = buildPerformanceFactor(prLosses);
    void prBreakdown; // used in render only
    update({
      systemType: confirmedSystemType,
      solarCalc: {
        hsp: calc.hsp,
        hspSource: pvgisSource,
        dailyEnergyKWh: calc.dailyEnergyKWh,
        performanceFactor: calc.performanceFactor,
        prLosses,
        requiredPowerWp: calc.requiredPowerWp,
        numPanels: calc.numPanels,
        totalPanelPowerWp: calc.totalPanelPowerWp,
        annualGenerationKWh: calc.annualGenerationKWh,
        batteryCapacityNeededKWh: calc.batteryCapacityNeededKWh,
        minInverterKW: calc.minInverterKW,
        recommendedSystemType: calc.recommendedSystemType,
        confirmedSystemType,
        optimalTiltDeg: pvgisOptimalTilt ?? undefined,
      },
    });
    onConfirm(confirmedSystemType);
  };

  // -------------------------------------------------------------------------
  // Guard
  // -------------------------------------------------------------------------
  if (missingData) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          Completa la Fase 1 (localización) y la Fase 2 (consumo) antes de
          continuar.
        </p>
      </div>
    );
  }

  if (!calc) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Calculando…
      </div>
    );
  }

  const recommended = SYSTEM_TYPE_INFO[calc.recommendedSystemType];
  const confirmed = SYSTEM_TYPE_INFO[confirmedSystemType];
  const prBreakdown = buildPerformanceFactor(prLosses);
  const stepCount = calc.needsBatteries ? 5 : 4;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-full px-6 py-2 mb-4">
          <span className="text-purple-700 dark:text-purple-400 font-bold text-lg">
            📐 Fase 3
          </span>
          <span className="text-purple-600 dark:text-purple-300 font-medium">
            Dimensionado del Sistema
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
          Análisis y Recomendación
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Calculado para{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {data.location?.locationName || `${data.location?.latitude?.toFixed(2)}°`}
          </span>{" "}
          · Latitud {data.location?.latitude?.toFixed(2)}°
        </p>
      </div>

      {/* Modality context banner */}
      {data.installationModality && (
        <div className={`mb-6 flex items-start gap-3 px-4 py-3 rounded-xl border ${MODALITY_INFO[data.installationModality].bgClass} ${MODALITY_INFO[data.installationModality].borderClass}`}>
          <span className="text-xl flex-shrink-0">{MODALITY_INFO[data.installationModality].icon}</span>
          <div>
            <div className={`font-semibold text-sm ${MODALITY_INFO[data.installationModality].textClass}`}>
              {MODALITY_INFO[data.installationModality].label}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {calc.modalityNote}
            </div>
          </div>
        </div>
      )}

      {/* Extra equipment notice */}
      {calc.extraEquipment.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl">
          <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-2 flex items-center gap-2">
            ⚠️ Equipamiento adicional necesario para esta modalidad
          </div>
          <ul className="space-y-1">
            {calc.extraEquipment.map((item, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <span className="mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1 — HSP + PVGIS */}
      {/* ------------------------------------------------------------------ */}
      <StepCard
        step={1}
        icon="☀️"
        title="Irradiación Solar (HSP)"
        subtitle="Las Horas Solar Pico estiman la energía solar disponible. Puedes obtener datos reales de PVGIS."
        colorClass="orange"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <KpiCard
            label={`HSP ${pvgisSource === "pvgis" ? "(PVGIS ✓)" : "(estimado)"}`}
            value={calc.hsp}
            unit="h/día"
            color="orange"
          />
          <div className="col-span-2 md:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700 flex flex-col justify-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Clasificación
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {describeHSP(calc.hsp)}
            </div>
            {pvgisOptimalTilt !== null && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                Inclinación óptima PVGIS: {pvgisOptimalTilt}°
              </div>
            )}
          </div>
        </div>

        {/* PVGIS action row */}
        <div className="flex flex-wrap gap-2 items-center">
          {pvgisSource === "estimate" ? (
            <button
              onClick={handleFetchPVGIS}
              disabled={pvgisLoading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
            >
              {pvgisLoading ? (
                <>
                  <span className="animate-spin">⏳</span> Consultando PVGIS…
                </>
              ) : (
                <>🌍 Obtener datos reales PVGIS</>
              )}
            </button>
          ) : (
            <button
              onClick={handleResetHSP}
              className="px-4 py-2 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-sm font-medium rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              ↩ Volver a estimación
            </button>
          )}
          {pvgisError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              ⚠ {pvgisError}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          * PVGIS es la base de datos de irradiación solar de la Comisión Europea (JRC). Requiere conexión a internet.
        </p>
      </StepCard>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2 — PR / Losses */}
      {/* ------------------------------------------------------------------ */}
      <StepCard
        step={2}
        icon="⚙️"
        title="Factor de Rendimiento (PR)"
        subtitle="El PR recoge todas las pérdidas del sistema. Puedes ajustarlo a tu clima y tipo de instalación."
        colorClass="blue"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <KpiCard
            label="PR total"
            value={`${(prBreakdown.total * 100).toFixed(1)}%`}
            color="blue"
          />
          <KpiCard
            label="Pérdida temperatura"
            value={`${prLosses.temperature}%`}
            color="blue"
          />
          <KpiCard
            label="Pérdida suciedad"
            value={`${prLosses.soiling}%`}
            color="blue"
          />
        </div>

        <button
          onClick={() => setShowPrEditor((v) => !v)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3 inline-flex items-center gap-1"
        >
          {showPrEditor ? "▲ Ocultar ajuste fino" : "▼ Ajustar pérdidas del sistema"}
        </button>

        {showPrEditor && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {(
              Object.keys(DEFAULT_PR_LOSSES) as (keyof typeof DEFAULT_PR_LOSSES)[]
            ).map((key) => {
              const labels: Record<string, string> = {
                wiring: "Cableado (%)",
                inverter: "Inversor (%)",
                temperature: "Temperatura (%)",
                soiling: "Suciedad (%)",
                mismatch: "Mismatch (%)",
                shading: "Sombreado (%)",
              };
              return (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {labels[key]}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={prLosses[key]}
                    onChange={(e) =>
                      setPrLosses((prev) => ({
                        ...prev,
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  />
                </div>
              );
            })}
            <div className="col-span-2 md:col-span-3 text-right">
              <button
                onClick={() => setPrLosses({ ...DEFAULT_PR_LOSSES })}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Restaurar valores por defecto
              </button>
            </div>
          </div>
        )}
      </StepCard>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3 — Consumption */}
      {/* ------------------------------------------------------------------ */}
      <StepCard
        step={3}
        icon="📊"
        title="Análisis de Consumo"
        subtitle={`Con PR ${(calc.performanceFactor * 100).toFixed(1)}% el sistema necesita más potencia instalada que el consumo real.`}
        colorClass="yellow"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            label="Consumo diario"
            value={calc.dailyEnergyKWh.toFixed(2)}
            unit="kWh/día"
            color="blue"
          />
          <KpiCard
            label="Potencia necesaria"
            value={(calc.requiredPowerWp / 1000).toFixed(2)}
            unit="kWp"
            color="blue"
          />
          <KpiCard
            label="PR aplicado"
            value={`${(calc.performanceFactor * 100).toFixed(1)}%`}
            color="blue"
          />
        </div>
      </StepCard>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4 — Panels */}
      {/* ------------------------------------------------------------------ */}
      <StepCard
        step={4}
        icon="🔆"
        title="Dimensionado de Paneles"
        subtitle={`Referencia: panel de ${DEFAULT_PANEL_WP}Wp. Elige el modelo real en la Fase 4 y el contador se actualiza.`}
        colorClass="yellow"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            label="Nº paneles (ref.)"
            value={calc.numPanels}
            unit="uds."
            color="orange"
          />
          <KpiCard
            label="Potencia total"
            value={(calc.totalPanelPowerWp / 1000).toFixed(2)}
            unit="kWp"
            color="orange"
          />
          <KpiCard
            label="Generación anual est."
            value={calc.annualGenerationKWh.toFixed(0)}
            unit="kWh/año"
            color="green"
          />
        </div>
      </StepCard>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 5 — Batteries (conditional) */}
      {/* ------------------------------------------------------------------ */}
      {calc.needsBatteries && (
        <StepCard
          step={5}
          icon="🔋"
          title="Almacenamiento de Energía"
          subtitle="Capacidad calculada con DoD 90% (LiFePO4). Ajustable en Fase 2."
          colorClass="green"
        >
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Capacidad útil necesaria"
              value={calc.batteryCapacityNeededKWh.toFixed(2)}
              unit="kWh"
              color="green"
            />
            <KpiCard
              label="Nº baterías (ref. 5kWh)"
              value={`~${calc.numBatteries}`}
              unit="uds."
              color="green"
            />
          </div>
        </StepCard>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP — Inverter */}
      {/* ------------------------------------------------------------------ */}
      <StepCard
        step={stepCount}
        icon="⚡"
        title="Dimensionado del Inversor"
        subtitle="Potencia mínima requerida para gestionar toda la generación PV y la demanda pico."
        colorClass="purple"
      >
        <KpiCard
          label="Potencia mínima inversor"
          value={calc.minInverterKW.toFixed(1)}
          unit="kW"
          color="purple"
        />
      </StepCard>

      {/* ------------------------------------------------------------------ */}
      {/* System recommendation */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          🎯 Recomendación del Sistema
        </h3>

        {/* Recommendation box */}
        <div
          className={`p-5 rounded-xl border-2 ${recommended.borderClass} ${recommended.bgClass} mb-5`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">{recommended.icon}</div>
            <div>
              <div className={`text-lg font-bold ${recommended.textClass}`}>
                Sistema {recommended.label} Recomendado
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {calc.recommendationReason}
              </p>
            </div>
          </div>
        </div>

        {/* Override selector */}
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          ✏️ Puedes cambiar el tipo de sistema:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.entries(SYSTEM_TYPE_INFO) as [SystemTypeKey, typeof SYSTEM_TYPE_INFO[SystemTypeKey]][]).map(
            ([key, info]) => {
              const isSelected = confirmedSystemType === key;
              const isRec = calc.recommendedSystemType === key;
              return (
                <button
                  key={key}
                  onClick={() => setConfirmedSystemType(key)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `${info.borderClass} ${info.bgClass} shadow-md`
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  {isRec && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      Rec.
                    </span>
                  )}
                  <div className="font-semibold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                    <span>{info.icon}</span>
                    {info.label}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {info.description}
                  </p>
                  {isSelected && (
                    <div className={`text-xs mt-2 ${info.textClass} font-medium`}>
                      ✓ Seleccionado
                    </div>
                  )}
                </button>
              );
            }
          )}
        </div>

        {confirmedSystemType !== calc.recommendedSystemType && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            ℹ️ Has elegido <strong>{confirmed.label}</strong> en lugar del sistema <strong>{recommended.label}</strong> sugerido.
            La Fase 4 mostrará los componentes disponibles para tu elección.
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleConfirm}
          className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg inline-flex items-center gap-3"
        >
          <span>Continuar con Sistema {confirmed.label}</span>
          <span>→</span>
        </button>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Seleccionarás los componentes concretos en la Fase 4
        </p>
      </div>
    </div>
  );
};

export default Phase3Dimensioning;
