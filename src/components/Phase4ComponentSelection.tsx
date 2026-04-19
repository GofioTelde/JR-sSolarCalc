"use client";
// src/components/Phase4ComponentSelection.tsx
// Component selection with standard-power / standard-capacity pickers,
// panel tilt angle, bottom-edge height and portrait/landscape orientation.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "@/context/ProjectContext";
import {
  calculateStringConfig,
  estimateCost,
} from "@/services/solarCalculator";
import {
  SYSTEM_TYPE_INFO,
  MODALITY_INFO,
  type SystemTypeKey,
} from "@/constants/system";
import type {
  Panel,
  Bateria,
  InversorHibrido,
  InversorRed,
  ControladorMPPT,
  InversorOffGrid,
} from "@/types/catalog.types";

import panelesMono from "@/data/paneles_monofaciales.json";
import panelesBi from "@/data/paneles_bifaciales.json";
import bateriasData from "@/data/baterias.json";
import inversoresHib from "@/data/inversores_hibridos.json";
import inversoresRed from "@/data/inversores_red.json";
import modulosSep from "@/data/modulos_separados.json";

const ALL_PANELS_MONO = panelesMono as Panel[];
const ALL_PANELS_BI = panelesBi as Panel[];
const ALL_BATTERIES = bateriasData as Bateria[];
const ALL_HYBRID = inversoresHib as InversorHibrido[];
const ALL_RED = inversoresRed as InversorRed[];
const ALL_MPPT = (modulosSep as (ControladorMPPT | InversorOffGrid)[]).filter(
  (m) => m.tipo === "mppt",
) as ControladorMPPT[];
const ALL_OFFGRID = (
  modulosSep as (ControladorMPPT | InversorOffGrid)[]
).filter((m) => m.tipo === "inversor") as InversorOffGrid[];

// ---------------------------------------------------------------------------
// Power/capacity chip selector
// ---------------------------------------------------------------------------

function ChipSelector({
  label,
  values,
  selected,
  recommended,
  minValue,
  warnBelow,
  formatChip,
  onSelect,
  accentColor,
}: {
  label: string;
  values: number[];
  selected: number;
  recommended: number;
  /** Values strictly below this are locked (not selectable). */
  minValue?: number;
  /** Values strictly below this are shown in red but remain selectable. */
  warnBelow?: number;
  formatChip: (v: number) => string;
  onSelect: (v: number) => void;
  accentColor: "orange" | "green";
}) {
  const accent = {
    orange: {
      chip: "bg-orange-500 text-white border-orange-500",
      rec: "border-orange-400 text-orange-600 dark:text-orange-400",
    },
    green: {
      chip: "bg-green-500 text-white border-green-500",
      rec: "border-green-500 text-green-600 dark:text-green-400",
    },
  }[accentColor];

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        {label}
      </p>
      {minValue !== undefined && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">
          🔒 Las opciones en gris no cubren el mínimo recomendado — sólo puedes
          elegir igual o superior
        </p>
      )}
      {warnBelow !== undefined && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
          🟢 Verde = capacidad recomendada · 🔴 Rojo = inferior a la recomendada (puedes elegirla pero puede ser insuficiente)
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const isSelected = v === selected;
          const isRec = v === recommended;
          const isLocked = minValue !== undefined && v < minValue;
          const isWarn = warnBelow !== undefined && v < warnBelow;
          return (
            <button
              key={v}
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && onSelect(v)}
              className={[
                "relative px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-all select-none",
                isLocked
                  ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-900 cursor-not-allowed line-through"
                  : isSelected
                    ? isWarn
                      ? "bg-red-500 text-white border-red-500"
                      : accent.chip
                    : isWarn
                      ? "border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:border-red-500"
                      : isRec
                        ? "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:border-green-600"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-400 bg-white dark:bg-gray-800",
              ].join(" ")}
            >
              {isRec && !isSelected && !isLocked && (
                <span
                  className={`absolute -top-2 -right-1.5 text-[9px] font-bold border rounded-full px-1 bg-white dark:bg-gray-800 ${accent.rec}`}
                >
                  Rec
                </span>
              )}
              {formatChip(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail card for selected panel / battery / inverter
// ---------------------------------------------------------------------------

function DetailCard({
  icon,
  title,
  badge,
  rows,
  accent,
}: {
  icon: string;
  title: string;
  badge: string;
  rows: { label: string; value: string }[];
  accent: "orange" | "green" | "blue";
}) {
  const cls = {
    orange: {
      border: "border-orange-300 dark:border-orange-700",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      badge:
        "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400",
    },
    green: {
      border: "border-green-300 dark:border-green-700",
      bg: "bg-green-50 dark:bg-green-900/20",
      badge:
        "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
    },
    blue: {
      border: "border-blue-300 dark:border-blue-700",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
    },
  }[accent];

  return (
    <div className={`rounded-xl border-2 ${cls.border} ${cls.bg} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-gray-800 dark:text-white text-sm leading-snug">
            {title}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls.badge}`}
        >
          {badge}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-2 text-xs">
            <span className="text-gray-400 dark:text-gray-500 shrink-0">{r.label}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 text-right break-words">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white text-base">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// InverterCard — full-spec card for hybrid, off-grid and grid-tie inverters
// ---------------------------------------------------------------------------

interface InverterCardProps {
  inv: InversorHibrido | InversorOffGrid | InversorRed;
  isSelected: boolean;
  isRecommended: boolean;
  isInsufficient: boolean;
  minInverterKW: number;
  onClick: () => void;
}

const InverterCard: React.FC<InverterCardProps> = ({
  inv,
  isSelected,
  isRecommended,
  isInsufficient,
  onClick,
}) => {
  const handleClick = isInsufficient ? undefined : onClick;
  const isHybrid = inv.tipo === "hibrido";
  const isRed = inv.tipo === "red";
  const isOffGrid = inv.tipo === "inversor";
  const hib = isHybrid ? (inv as InversorHibrido) : null;
  const red = isRed ? (inv as InversorRed) : null;
  const off = isOffGrid ? (inv as InversorOffGrid) : null;

  const kw = isHybrid
    ? (hib!.potencia_ac_nominal / 1000).toFixed(1)
    : isRed
      ? (red!.potencia_ac_nominal / 1000).toFixed(1)
      : ((off!.potencia_nominal ?? 0) / 1000).toFixed(1);

  const fases = isHybrid
    ? hib!.fases
    : isRed
      ? red!.fases
      : ((off as InversorOffGrid & { fases?: number }).fases ?? 1);
  const tension_sal = isHybrid
    ? hib!.tension_salida
    : isRed
      ? red!.tension_salida
      : off!.tension_salida;
  const efic = isHybrid
    ? hib!.eficiencia_max
    : isRed
      ? red!.eficiencia_max
      : off!.eficiencia;

  const specRows: { label: string; value: string; highlight?: boolean }[] = [];

  if (isHybrid && hib) {
    specRows.push(
      {
        label: "Entradas MPPT",
        value: `${hib.mppt_numero} × MPPT`,
        highlight: true,
      },
      {
        label: "Rango MPPT",
        value: `${hib.mppt_rango_voltaje[0]}–${hib.mppt_rango_voltaje[1]} V`,
      },
      { label: "Corriente max/MPPT", value: `${hib.mppt_corriente_max} A` },
      {
        label: "Icc max/MPPT",
        value: `${hib.mppt_corriente_cortocircuito_max} A`,
      },
      { label: "Strings por MPPT", value: `${hib.strings_por_mppt}` },
      { label: "Tensión DC nominal", value: `${hib.voltage_dc_nominal} V` },
      {
        label: "PV máx. total",
        value: `${(hib.potencia_pv_max / 1000).toFixed(1)} kW`,
      },
      {
        label: "Batería",
        value: `${hib.bateria_tension} V · ${hib.bateria_compatibilidad}`,
        highlight: true,
      },
      {
        label: "I carga/descarga",
        value: `${hib.bateria_corriente_carga_max} / ${hib.bateria_corriente_descarga_max} A`,
      },
    );
  } else if (isRed && red) {
    specRows.push(
      {
        label: "Entradas MPPT",
        value: `${red.mppt_numero} × MPPT`,
        highlight: true,
      },
      {
        label: "Rango MPPT",
        value: `${red.mppt_rango_voltaje[0]}–${red.mppt_rango_voltaje[1]} V`,
      },
      { label: "Corriente max/MPPT", value: `${red.mppt_corriente_max} A` },
      {
        label: "PV máx. total",
        value: `${(red.potencia_pv_max / 1000).toFixed(1)} kW`,
      },
    );
  } else if (off) {
    const entIn = Array.isArray(off.tension_entrada)
      ? `${(off.tension_entrada as number[]).join(" / ")} V`
      : `${off.tension_entrada} V`;
    specRows.push(
      { label: "Tensión entrada DC", value: entIn, highlight: true },
      {
        label: "Potencia pico",
        value: `${((off.potencia_pico ?? 0) / 1000).toFixed(1)} kW`,
      },
      { label: "Forma de onda", value: off.forma_onda },
    );
  }

  specRows.push(
    {
      label: "Salida AC",
      value: `${fases === 3 ? "3F" : "1F"} · ${tension_sal} V · 50 Hz`,
    },
    { label: "Eficiencia máx.", value: `${efic} %`, highlight: true },
    {
      label: "Comunicación",
      value: (isHybrid
        ? hib!.comunicacion
        : isRed
          ? red!.comunicacion
          : (off?.comunicacion ?? [])
      ).join(", "),
    },
    {
      label: "Dimensiones",
      value: `${inv.dimensiones_mm[0]}×${inv.dimensiones_mm[1]}×${inv.dimensiones_mm[2]} mm`,
    },
    { label: "Peso", value: `${inv.peso_kg} kg` },
  );

  return (
    <div
      role="button"
      tabIndex={isInsufficient ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => !isInsufficient && e.key === "Enter" && onClick()}
      className={[
        "relative rounded-xl border-2 p-3 transition-all select-none mb-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isInsufficient
          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed"
          : isSelected
            ? "cursor-pointer border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
            : "cursor-pointer border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isSelected}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {isSelected && (
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                viewBox="0 0 12 12"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2 6l3 3 5-5"
                />
              </svg>
            </div>
          )}
          <span className="font-bold text-gray-800 dark:text-white text-sm leading-tight break-words">
            {inv.nombre}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isRecommended && (
            <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              Rec.
            </span>
          )}
          {isInsufficient && (
            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              ⚠ Baja
            </span>
          )}
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {kw} kW
          </span>
        </div>
      </div>

      {/* Spec grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        {specRows.map((r, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="text-gray-400 dark:text-gray-500 shrink-0">
              {r.label}
            </span>
            <span
              className={`font-medium ${r.highlight ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"} text-right break-words`}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {/* Protections */}
      <div className="mt-2 flex flex-wrap gap-1">
        {inv.protecciones.map((p) => (
          <span
            key={p}
            className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MpptCard — full-spec card for MPPT controllers
// ---------------------------------------------------------------------------

interface MpptCardProps {
  mppt: ControladorMPPT;
  isSelected: boolean;
  isRecommended: boolean;
  isInsufficient: boolean;
  onClick: () => void;
}

const MpptCard: React.FC<MpptCardProps> = ({
  mppt,
  isSelected,
  isRecommended,
  isInsufficient,
  onClick,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={isInsufficient ? undefined : onClick}
    onKeyDown={(e) => !isInsufficient && e.key === "Enter" && onClick()}
    className={[
      "relative rounded-xl border-2 p-3 transition-all select-none mb-2",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500",
      isInsufficient
        ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed"
        : isSelected
          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md cursor-pointer"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-300 dark:hover:border-yellow-600 cursor-pointer",
    ]
      .filter(Boolean)
      .join(" ")}
    aria-pressed={isSelected}
  >
    <div className="flex items-start justify-between mb-2 gap-2">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {isSelected && (
          <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 12 12"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2 6l3 3 5-5"
              />
            </svg>
          </div>
        )}
        <span className="font-bold text-gray-800 dark:text-white text-sm break-words">
          {mppt.nombre}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isRecommended && (
          <span className="bg-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            Rec.
          </span>
        )}
        {isInsufficient && (
          <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            ⚠ Insuf.
          </span>
        )}
        <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
          {mppt.corriente_max_salida} A
        </span>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
      {[
        {
          label: "Tensión entrada máx.",
          value: `${mppt.tension_entrada_max} V`,
          highlight: true,
        },
        {
          label: "Tensión batería",
          value: mppt.tension_bateria.join(" / ") + " V",
          highlight: true,
        },
        { label: "Tensión inicio MPPT", value: `${mppt.tension_inicio} V` },
        { label: "Eficiencia", value: `${mppt.eficiencia} %`, highlight: true },
        { label: "Comunicación", value: mppt.comunicacion.join(", ") || "—" },
        {
          label: "Dimensiones",
          value: `${mppt.dimensiones_mm[0]}×${mppt.dimensiones_mm[1]}×${mppt.dimensiones_mm[2]} mm`,
        },
        { label: "Peso", value: `${mppt.peso_kg} kg` },
        {
          label: "Temp. operación",
          value: `${mppt.temperatura_operacion[0]}…${mppt.temperatura_operacion[1]} °C`,
        },
      ].map((r, i) => (
        <div key={i} className="flex justify-between gap-2">
          <span className="text-gray-400 dark:text-gray-500 shrink-0">
            {r.label}
          </span>
          <span
            className={`font-medium ${r.highlight ? "text-yellow-700 dark:text-yellow-300" : "text-gray-700 dark:text-gray-300"} text-right break-words`}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-2 flex flex-wrap gap-1">
      {mppt.protecciones.map((p) => (
        <span
          key={p}
          className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full"
        >
          {p}
        </span>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  confirmedSystemType: SystemTypeKey;
  onConfirm: () => void;
}

// ---------------------------------------------------------------------------
// Row spacing calculator
// Minimum pitch (front-to-front) so the row behind casts no shadow from
// 10:00 to 14:00 solar time on the winter solstice (Dec 21).
// ---------------------------------------------------------------------------

function calcRowSpacing(
  panelLengthM: number,
  tiltDeg: number,
  latitude: number,
): {
  pitchM: number; // front-to-front minimum distance
  gapM: number; // clear gap between rows
  elevDeg: number; // reference solar elevation used
} {
  const decl = -23.45 * (Math.PI / 180); // Dec-21 declination
  const lat = latitude * (Math.PI / 180);
  const H = 30 * (Math.PI / 180); // 2h before noon → 30° hour angle
  const sinEl =
    Math.sin(lat) * Math.sin(decl) +
    Math.cos(lat) * Math.cos(decl) * Math.cos(H);
  const elev = Math.asin(Math.max(sinEl, 0.05)); // clamp to avoid ÷0 near polar regions
  const tilt = tiltDeg * (Math.PI / 180);
  const pitch =
    panelLengthM * (Math.cos(tilt) + Math.sin(tilt) / Math.tan(elev));
  const horizProj = panelLengthM * Math.cos(tilt);
  return {
    pitchM: Math.round(pitch * 100) / 100,
    gapM: Math.round((pitch - horizProj) * 100) / 100,
    elevDeg: Math.round(elev * (180 / Math.PI) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Helpers — derive orientation from available surface and panel dimensions
// ---------------------------------------------------------------------------

function deriveOrientation(
  _panel: Panel,
  _numPanels: number,
): "portrait" | "landscape" {
  return "portrait";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Phase4ComponentSelection: React.FC<Props> = ({
  confirmedSystemType,
  onConfirm,
}) => {
  const { data, update } = useProject();

  const panelType = data.panelType ?? "monofacial";
  const needsBatteries =
    (data.hasBatteries ?? true) || data.installationType === "off-grid";
  const modality = data.installationModality;
  const calcData = data.solarCalc;
  const minInverterKW = calcData?.minInverterKW ?? 3;
  const batteryCapNeeded = calcData?.batteryCapacityNeededKWh ?? 0;
  const requiredPowerWp = calcData?.requiredPowerWp ?? 0;
  // Default tilt: PVGIS optimal or latitude estimate
  const defaultTilt =
    calcData?.optimalTiltDeg ??
    Math.round((data.location?.latitude ?? 37) * 0.9);

  // Inverter / component type logic:
  //
  //  híbrido               → hybrid inverter (all-in-one, valid for grid AND island/aislada)
  //  separados + sin bat   → grid-tie string inverter (MPPT integrated)
  //  separados + con bat   → MPPT controller + batteries + off-grid inverter (all separate)
  //
  const isOffGrid = modality === "aislada";
  const useHybridInverter = confirmedSystemType === "hibrido";
  const useGridTieInverter =
    confirmedSystemType === "separados" && !needsBatteries;
  const useOffGridInverter =
    confirmedSystemType === "separados" && needsBatteries;

  const rawPanels =
    panelType === "monofacial" ? ALL_PANELS_MONO : ALL_PANELS_BI;

  // -------------------------------------------------------------------------
  // All unique powers / capacities from the catalogs
  // -------------------------------------------------------------------------

  const allPanelWps = useMemo(
    () =>
      [...new Set(rawPanels.map((p) => p.potencia_pmax))].sort((a, b) => a - b),
    [rawPanels],
  );

  const allBatteryKwh = useMemo(
    () =>
      [...new Set(ALL_BATTERIES.map((b) => b.capacidad_util_kwh))].sort(
        (a, b) => a - b,
      ),
    [],
  );

  // Recommended defaults — closest to required / minimal units
  const recommendedWp = useMemo(() => {
    if (requiredPowerWp === 0)
      return allPanelWps[Math.floor(allPanelWps.length / 2)];
    // Pick power where ceil(required / wp) is minimised (fewest panels), tie-break: closest
    return allPanelWps.reduce((best, wp) => {
      const nb = Math.ceil(requiredPowerWp / best);
      const nc = Math.ceil(requiredPowerWp / wp);
      return nc < nb ||
        (nc === nb &&
          Math.abs(wp - requiredPowerWp) < Math.abs(best - requiredPowerWp))
        ? wp
        : best;
    });
  }, [allPanelWps, requiredPowerWp]);

  const recommendedKwh = useMemo(() => {
    if (!needsBatteries || batteryCapNeeded === 0) return allBatteryKwh[0];
    return (
      allBatteryKwh.find((k) => k >= batteryCapNeeded) ??
      allBatteryKwh[allBatteryKwh.length - 1]
    );
  }, [allBatteryKwh, batteryCapNeeded, needsBatteries]);

  // -------------------------------------------------------------------------
  // Selection state
  // -------------------------------------------------------------------------

  const [selectedWp, setSelectedWp] = useState<number>(() => recommendedWp);
  const [selectedKwh, setSelectedKwh] = useState<number>(() => recommendedKwh);
  const [selectedInverterId, setSelectedInverterId] = useState<string>("");
  const [selectedMpptId, setSelectedMpptId] = useState<string | null>(null);
  const [showStringConfig, setShowStringConfig] = useState(false);
  const [bottomEdgeM, setBottomEdgeM] = useState<number>(0.3);
  const [tiltDeg, setTiltDeg] = useState<number>(defaultTilt);

  // Restore from saved state
  useEffect(() => {
    const sel = data.selectedComponents;
    if (sel?.panelId) {
      const p = rawPanels.find((x) => x.id === sel.panelId);
      if (p) {
        setSelectedWp(p.potencia_pmax);
        setSelectedPanelId(sel.panelId);
      }
    }
    if (sel?.batteryId) {
      const b = ALL_BATTERIES.find((x) => x.id === sel.batteryId);
      if (b) {
        setSelectedKwh(b.capacidad_util_kwh);
        setSelectedBatteryId(sel.batteryId);
      }
    }
    if (sel?.inverterId) setSelectedInverterId(sel.inverterId);
    if (sel?.mpptId) setSelectedMpptId(sel.mpptId);
    if (data.panelBottomEdgeHeightM)
      setBottomEdgeM(data.panelBottomEdgeHeightM);
    if (calcData?.optimalTiltDeg) setTiltDeg(calcData.optimalTiltDeg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase filtering from wizard answer
  const inverterPhases = data.inverterPhases ?? 1;

  // -------------------------------------------------------------------------
  // All panels / batteries at selected tier — for catalog browser
  // -------------------------------------------------------------------------

  const panelsAtWp = useMemo(
    () =>
      rawPanels
        .filter((p) => p.potencia_pmax === selectedWp)
        .sort((a, b) => b.eficiencia - a.eficiencia),
    [rawPanels, selectedWp],
  );

  const batteriesAtKwh = useMemo(
    () =>
      ALL_BATTERIES.filter((b) => b.capacidad_util_kwh === selectedKwh).sort(
        (a, b) => b.eficiencia_carga_descarga - a.eficiencia_carga_descarga,
      ),
    [selectedKwh],
  );

  // Explicit panel / battery selection within a tier
  const [selectedPanelId, setSelectedPanelId] = useState<string>("");
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>("");

  // When the Wp chip changes → auto-pick best panel in that tier
  useEffect(() => {
    const best = rawPanels
      .filter((p) => p.potencia_pmax === selectedWp)
      .sort((a, b) => b.eficiencia - a.eficiencia)[0];
    if (best) setSelectedPanelId(best.id);
  }, [selectedWp, rawPanels]);

  // When the kWh chip changes → auto-pick best battery in that tier
  useEffect(() => {
    const best = ALL_BATTERIES.filter(
      (b) => b.capacidad_util_kwh === selectedKwh,
    ).sort(
      (a, b) => b.eficiencia_carga_descarga - a.eficiencia_carga_descarga,
    )[0];
    if (best) setSelectedBatteryId(best.id);
  }, [selectedKwh]);

  // -------------------------------------------------------------------------
  // Derived panel/battery from selected ID
  // -------------------------------------------------------------------------

  const selectedPanel = useMemo(
    () => rawPanels.find((p) => p.id === selectedPanelId) ?? null,
    [rawPanels, selectedPanelId],
  );

  const selectedBattery = useMemo(() => {
    if (!needsBatteries) return null;
    return ALL_BATTERIES.find((b) => b.id === selectedBatteryId) ?? null;
  }, [selectedBatteryId, needsBatteries]);

  // Inverter options — ALL matching, sorted by power
  const inverterOptions = useMemo(() => {
    if (useOffGridInverter) {
      return [...ALL_OFFGRID].sort(
        (a, b) => (a.potencia_nominal ?? 0) - (b.potencia_nominal ?? 0),
      );
    }
    if (useGridTieInverter) {
      return [...ALL_RED]
        .filter((i) => i.fases === inverterPhases)
        .sort((a, b) => a.potencia_ac_nominal - b.potencia_ac_nominal);
    }
    // híbrido — filter by phase
    return [...ALL_HYBRID]
      .filter((i) => i.fases === inverterPhases)
      .sort((a, b) => a.potencia_ac_nominal - b.potencia_ac_nominal);
  }, [useOffGridInverter, useGridTieInverter, inverterPhases]);

  const mpptOptions = useMemo(
    () =>
      [...ALL_MPPT].sort(
        (a, b) => a.corriente_max_salida - b.corriente_max_salida,
      ),
    [],
  );

  // Default inverter: smallest one that covers minInverterKW
  useEffect(() => {
    if (inverterOptions.length === 0) return;
    const getKw = (i: (typeof inverterOptions)[0]) =>
      useOffGridInverter
        ? ((i as InversorOffGrid).potencia_nominal ?? 0) / 1000
        : (i as InversorHibrido | InversorRed).potencia_ac_nominal / 1000;
    const recommended =
      inverterOptions.find((i) => getKw(i) >= minInverterKW) ??
      inverterOptions[inverterOptions.length - 1];
    if (
      !selectedInverterId ||
      !inverterOptions.find((i) => i.id === selectedInverterId)
    ) {
      setSelectedInverterId(recommended.id);
    }
  }, [inverterOptions, minInverterKW]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Derived quantities
  // -------------------------------------------------------------------------

  const selectedHybrid = ALL_HYBRID.find((i) => i.id === selectedInverterId);
  const selectedOffGrid = ALL_OFFGRID.find((i) => i.id === selectedInverterId);
  const selectedGridTie = ALL_RED.find((i) => i.id === selectedInverterId);

  // Recommended MPPT: smallest one whose output current covers the array needs
  // Estimate: array power / battery voltage / 0.9 efficiency
  const neededMpptCurrentA = useMemo(() => {
    const battV = selectedBattery?.tension_nominal ?? 48;
    return requiredPowerWp / battV / 0.9;
  }, [requiredPowerWp, selectedBattery]);

  const recommendedMpptId = useMemo(() => {
    const suitable = mpptOptions.filter(
      (m) => m.corriente_max_salida >= neededMpptCurrentA,
    );
    return (suitable[0] ?? mpptOptions[mpptOptions.length - 1])?.id ?? null;
  }, [mpptOptions, neededMpptCurrentA]);

  useEffect(() => {
    if (
      mpptOptions.length > 0 &&
      (!selectedMpptId || !mpptOptions.find((m) => m.id === selectedMpptId))
    ) {
      setSelectedMpptId(recommendedMpptId);
    }
  }, [mpptOptions, recommendedMpptId]); // eslint-disable-line react-hooks/exhaustive-deps

  const inverterKw = selectedHybrid
    ? selectedHybrid.potencia_ac_nominal / 1000
    : selectedOffGrid
      ? (selectedOffGrid.potencia_nominal ?? 0) / 1000
      : selectedGridTie
        ? selectedGridTie.potencia_ac_nominal / 1000
        : minInverterKW;

  // Formula-based panel count (before string rounding)
  const formulaPanels = selectedPanel
    ? Math.ceil(requiredPowerWp / selectedPanel.potencia_pmax)
    : 0;

  // String config — pass formulaPanels so equal-string rounding is applied
  const stringCfg = useMemo(
    () =>
      selectedPanel && selectedHybrid
        ? calculateStringConfig(selectedPanel, selectedHybrid, formulaPanels)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPanel?.id, selectedHybrid?.id, formulaPanels],
  );

  // Definitive panel count: use string-rounded total when inverter is known
  const numPanels =
    selectedHybrid && stringCfg ? stringCfg.totalPanels : formulaPanels;

  const numBatteries =
    needsBatteries && selectedBattery
      ? Math.ceil(batteryCapNeeded / selectedBattery.capacidad_util_kwh)
      : 0;

  // Panel orientation
  const panelOrientation = useMemo(
    () =>
      selectedPanel ? deriveOrientation(selectedPanel, numPanels) : "portrait",
    [selectedPanel, numPanels],
  );

  // Heights — computed for both orientations.
  // In the JSON: ancho_mm = long side, alto_mm = short side.
  // Portrait (en pie): long side vertical → height along slope = ancho_mm
  // Landscape (apaisado): long side horizontal → height along slope = alto_mm
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const heightPortraitM = selectedPanel ? selectedPanel.ancho_mm / 1000 : 1.75;
  const heightLandscapeM = selectedPanel ? selectedPanel.alto_mm / 1000 : 0.54;
  const topEdgePortraitM = bottomEdgeM + heightPortraitM * Math.sin(tiltRad);
  const topEdgeLandscapeM = bottomEdgeM + heightLandscapeM * Math.sin(tiltRad);

  // Row spacing — for both orientations
  const latitude = data.location?.latitude ?? 37;
  const rowSpacingPortrait = calcRowSpacing(heightPortraitM, tiltDeg, latitude);
  const rowSpacingLandscape = calcRowSpacing(
    heightLandscapeM,
    tiltDeg,
    latitude,
  );
  const rowSpacing =
    panelOrientation === "portrait" ? rowSpacingPortrait : rowSpacingLandscape;

  // Cost estimate
  const costEst = useMemo(() => {
    if (!selectedPanel || inverterKw === 0) return null;
    return estimateCost({
      panelType,
      totalPanelWp: numPanels * selectedPanel.potencia_pmax,
      numBatteries,
      batteryUsefulKwh: selectedBattery?.capacidad_util_kwh ?? 0,
      inverterKw,
      annualGenerationKWh: calcData?.annualGenerationKWh ?? 0,
    });
  }, [
    selectedPanel,
    numPanels,
    numBatteries,
    selectedBattery,
    inverterKw,
    panelType,
    calcData,
  ]);

  const canConfirm =
    !!selectedPanel &&
    !!selectedInverterId &&
    (!needsBatteries || !!selectedBattery);

  // -------------------------------------------------------------------------
  // Confirm
  // -------------------------------------------------------------------------

  const handleConfirm = useCallback(() => {
    update({
      panelBottomEdgeHeightM: bottomEdgeM,
      selectedComponents: {
        panelId: selectedPanel!.id,
        inverterId: selectedInverterId,
        batteryId: needsBatteries ? (selectedBattery?.id ?? null) : null,
        mpptId: useOffGridInverter ? selectedMpptId : null,
        numPanels,
        numBatteries: needsBatteries ? numBatteries : 0,
        stringConfig: stringCfg ?? undefined,
        panelOrientation,
      },
      solarCalc: calcData
        ? {
            ...calcData,
            costEstimate: costEst ?? undefined,
            optimalTiltDeg: tiltDeg,
          }
        : undefined,
    });
    onConfirm();
  }, [
    selectedPanel,
    selectedInverterId,
    selectedBattery,
    selectedMpptId,
    needsBatteries,
    numPanels,
    numBatteries,
    confirmedSystemType,
    stringCfg,
    costEst,
    calcData,
    bottomEdgeM,
    tiltDeg,
    panelOrientation,
    update,
    onConfirm,
  ]);

  const systemInfo = SYSTEM_TYPE_INFO[confirmedSystemType];

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="max-w-lg mx-auto px-2 py-2">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-5 py-2 mb-3">
          <span className="text-indigo-700 dark:text-indigo-400 font-bold">
            🛒 Fase 4
          </span>
          <span className="text-indigo-600 dark:text-indigo-300 font-medium">
            Componentes
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sistema{" "}
          <strong className="text-gray-700 dark:text-gray-200">
            {systemInfo.icon} {systemInfo.label}
          </strong>
          {modality && (
            <>
              {" "}
              ·{" "}
              <span className={MODALITY_INFO[modality].textClass}>
                {MODALITY_INFO[modality].shortLabel}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Need summary */}
      {calcData && (
        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {(requiredPowerWp / 1000).toFixed(1)} kWp
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Potencia paneles
            </div>
          </div>
          {needsBatteries && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {batteryCapNeeded.toFixed(1)} kWh
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                Bat. necesaria
              </div>
            </div>
          )}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {minInverterKW.toFixed(1)} kW
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              Inv. mínimo
            </div>
          </div>
          {!needsBatteries && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {calcData.annualGenerationKWh.toFixed(0)}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                kWh/año est.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Components checklist — separados / modular */}
      {/* ------------------------------------------------------------------ */}
      {confirmedSystemType === "separados" && (
        <div className="mb-5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 mb-2 uppercase tracking-wide">
            🔗 Componentes de tu instalación
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>
                <strong>Paneles solares</strong> — generan electricidad DC ·
                elige abajo
              </span>
            </li>

            {/* Separados sin baterías → inversor de red */}
            {useGridTieInverter && (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    <strong>Inversor de red</strong> — convierte DC en AC y
                    vuelca producción a la red · elige abajo
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold mt-0.5">ℹ</span>
                  <span className="text-blue-700 dark:text-blue-300">
                    El inversor de red lleva el <strong>MPPT integrado</strong>.
                  </span>
                </li>
              </>
            )}

            {/* Separados con baterías → MPPT + baterías + inversor off-grid (todos por separado) */}
            {useOffGridInverter && (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    <strong>Regulador MPPT</strong> — carga las baterías desde
                    los paneles · elige abajo
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    <strong>Baterías LiFePO4</strong> — almacenan la energía
                    para usarla cuando no hay sol · elige abajo
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    <strong>Inversor</strong> — convierte DC de baterías en AC
                    230V · elige abajo
                  </span>
                </li>
              </>
            )}

            {/* Híbrido con baterías */}
            {useHybridInverter && needsBatteries && (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    <strong>Baterías LiFePO4</strong> — almacenan energía solar
                    sobrante · elige abajo
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    <strong>Inversor híbrido</strong> — todo en uno: MPPT,
                    cargador y inversor ·{" "}
                    {isOffGrid ? "modo isla sin red · " : ""}elige abajo
                  </span>
                </li>
                {isOffGrid && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold mt-0.5">ℹ</span>
                    <span className="text-amber-700 dark:text-amber-300">
                      Verifica que el modelo elegido incluye{" "}
                      <strong>modo isla (off-grid)</strong>.
                    </span>
                  </li>
                )}
              </>
            )}

            {/* Híbrido sin baterías */}
            {useHybridInverter && !needsBatteries && (
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>
                  <strong>Inversor híbrido</strong> — MPPT + inversor en uno ·
                  vuelca a la red · elige abajo
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PANELS */}
      {/* ------------------------------------------------------------------ */}
      <Section
        icon="🔆"
        title={`Paneles ${panelType === "monofacial" ? "Monofaciales" : "Bifaciales"}`}
        subtitle={`Potencia total necesaria: ${(requiredPowerWp / 1000).toFixed(2)} kWp · Elige la potencia por panel`}
      >
        <ChipSelector
          label={`Potencia por panel — necesitarás ${Math.ceil(requiredPowerWp / selectedWp)} paneles de ${selectedWp} Wp`}
          values={allPanelWps}
          selected={selectedWp}
          recommended={recommendedWp}
          formatChip={(v) => `${v} Wp`}
          onSelect={setSelectedWp}
          accentColor="orange"
        />

        {/* Catalog browser: all panels at selected Wp */}
        {panelsAtWp.length > 1 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Modelos disponibles a {selectedWp} Wp
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {panelsAtWp.map((p) => {
                const isSelected = p.id === selectedPanelId;
                const isBest = p.id === panelsAtWp[0].id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPanelId(p.id)}
                    className={[
                      "relative flex-shrink-0 w-36 text-left p-2 rounded-xl border-2 text-xs transition-all",
                      isSelected
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300",
                    ].join(" ")}
                  >
                    {isBest && (
                      <span className="absolute -top-2 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Rec.
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center">
                        <svg
                          className="w-2 h-2 text-white"
                          fill="none"
                          viewBox="0 0 12 12"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2 6l3 3 5-5"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="font-semibold text-gray-700 dark:text-gray-200 leading-tight mb-1 pr-2 pl-4 text-[11px]">
                      {p.nombre.replace(/^Panel (Mono|Bi)facial\s*/i, "")}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {p.eficiencia}% ef.
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {p.tecnologia}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedPanel && (
          <DetailCard
            icon="🔆"
            title={selectedPanel.nombre}
            badge={`×${numPanels} uds. · ${(numPanels * selectedPanel.superficie_m2).toFixed(1)} m²`}
            accent="orange"
            rows={[
              { label: "Eficiencia", value: `${selectedPanel.eficiencia}%` },
              {
                label: "Vmp / Voc",
                value: `${selectedPanel.vmp}V / ${selectedPanel.voc}V`,
              },
              {
                label: "Dimensiones",
                value: `${selectedPanel.ancho_mm}×${selectedPanel.alto_mm} mm`,
              },
              {
                label: "Garantía potencia",
                value: `${selectedPanel.garantia_potencia} años`,
              },
              { label: "Peso", value: `${selectedPanel.peso_kg} kg` },
              { label: "Tecnología", value: selectedPanel.tecnologia },
            ]}
          />
        )}
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* BATTERIES */}
      {/* ------------------------------------------------------------------ */}
      {needsBatteries && (
        <Section
          icon="🔋"
          title="Baterías LiFePO4"
          subtitle={`Capacidad útil necesaria: ${batteryCapNeeded.toFixed(1)} kWh — elige la capacidad por batería`}
        >
          <ChipSelector
            label="Capacidad útil por batería"
            values={allBatteryKwh}
            selected={selectedKwh}
            recommended={recommendedKwh}
            warnBelow={recommendedKwh}
            formatChip={(v) => `${v} kWh`}
            onSelect={setSelectedKwh}
            accentColor="green"
          />
          {selectedKwh < recommendedKwh && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl text-xs text-red-700 dark:text-red-300">
              ⚠️ <strong>Capacidad insuficiente:</strong> has elegido {selectedKwh} kWh útiles pero tu consumo requiere {batteryCapNeeded.toFixed(1)} kWh. Con esta batería necesitarás {Math.ceil(batteryCapNeeded / selectedKwh)} unidades y puede que no cubra toda la noche.
            </div>
          )}

          {/* Catalog browser: all batteries at selected kWh */}
          {batteriesAtKwh.length > 1 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Modelos disponibles a {selectedKwh} kWh útiles
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {batteriesAtKwh.map((b) => {
                  const isSelected = b.id === selectedBatteryId;
                  const isBest = b.id === batteriesAtKwh[0].id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBatteryId(b.id)}
                      className={[
                        "relative flex-shrink-0 w-36 text-left p-2 rounded-xl border-2 text-xs transition-all",
                        isSelected
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300",
                      ].join(" ")}
                    >
                      {isBest && (
                        <span className="absolute -top-2 -right-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          Rec.
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-white"
                            fill="none"
                            viewBox="0 0 12 12"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2 6l3 3 5-5"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="font-semibold text-gray-700 dark:text-gray-200 leading-tight mb-1 pr-2 pl-4 text-[11px]">
                        {b.nombre.replace(/^Bater[ií]a\s+LiFePO4\s*/i, "")}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {b.eficiencia_carga_descarga}% ef.
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {b.tension_nominal}V ·{" "}
                        {b.ciclos_vida_80dod.toLocaleString()} ciclos
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedBattery && (
            <DetailCard
              icon="🔋"
              title={selectedBattery.nombre}
              badge={`×${numBatteries} uds. · ${(numBatteries * selectedBattery.capacidad_util_kwh).toFixed(1)} kWh útiles`}
              accent="green"
              rows={[
                {
                  label: "Tensión",
                  value: `${selectedBattery.tension_nominal} V`,
                },
                {
                  label: "Ciclos (80% DoD)",
                  value: selectedBattery.ciclos_vida_80dod.toLocaleString(),
                },
                {
                  label: "Eficiencia",
                  value: `${selectedBattery.eficiencia_carga_descarga}%`,
                },
                {
                  label: "Garantía",
                  value: `${selectedBattery.garantia} años`,
                },
                {
                  label: "BMS integrado",
                  value: selectedBattery.bms_integrado ? "Sí" : "No",
                },
                {
                  label: "Paralelo máx.",
                  value: `${selectedBattery.max_paralelo} uds.`,
                },
              ]}
            />
          )}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MPPT — separados con baterías (before batteries and off-grid inverter) */}
      {/* ------------------------------------------------------------------ */}
      {useOffGridInverter && mpptOptions.length > 0 && (
        <Section
          icon="🎛️"
          title="Regulador MPPT"
          subtitle={`Carga las baterías desde los paneles · Corriente mínima necesaria: ${neededMpptCurrentA.toFixed(1)} A`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            El recomendado (
            {recommendedMpptId
              ? mpptOptions.find((m) => m.id === recommendedMpptId)
                  ?.corriente_max_salida
              : "—"}{" "}
            A) ya cubre tu instalación. Puedes elegir uno superior si quieres
            ampliar en el futuro.
          </p>
          {mpptOptions.map((m) => {
            const insufficient = m.corriente_max_salida < neededMpptCurrentA;
            return (
              <MpptCard
                key={m.id}
                mppt={m}
                isSelected={selectedMpptId === m.id}
                isRecommended={m.id === recommendedMpptId}
                isInsufficient={insufficient}
                onClick={() => setSelectedMpptId(m.id)}
              />
            );
          })}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INVERTER — hybrid (hibrido, all modalities) */}
      {/* ------------------------------------------------------------------ */}
      {useHybridInverter && (
        <Section
          icon="⚡"
          title="Inversor Híbrido"
          subtitle={
            isOffGrid
              ? `${inverterPhases === 1 ? "Monofásico" : "Trifásico"} · Modo isla (sin red) · MPPT + baterías integrado · Mínimo: ${minInverterKW.toFixed(1)} kW`
              : needsBatteries
                ? `${inverterPhases === 1 ? "Monofásico" : "Trifásico"} · Gestiona paneles, baterías y red · Mínimo: ${minInverterKW.toFixed(1)} kW`
                : `${inverterPhases === 1 ? "Monofásico" : "Trifásico"} · MPPT + inversor en uno · Mínimo: ${minInverterKW.toFixed(1)} kW`
          }
        >
          {isOffGrid && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
              ℹ️ <strong>Instalación aislada:</strong> los inversores híbridos
              modernos incluyen <strong>modo isla (off-grid)</strong> —
              funcionan sin red pública. Verifica que el modelo elegido tiene
              esta función activada.
            </div>
          )}
          {inverterOptions.length === 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              ⚠ No hay inversores{" "}
              {inverterPhases === 1 ? "monofásicos" : "trifásicos"} en el
              catálogo.
            </div>
          )}
          {(inverterOptions as InversorHibrido[]).map((inv) => {
            const kw = inv.potencia_ac_nominal / 1000;
            const covers = kw >= minInverterKW;
            const isRec =
              covers &&
              inv.id ===
                (inverterOptions as InversorHibrido[]).find(
                  (i) => i.potencia_ac_nominal / 1000 >= minInverterKW,
                )?.id;
            return (
              <InverterCard
                key={inv.id}
                inv={inv}
                isSelected={selectedInverterId === inv.id}
                isRecommended={isRec}
                isInsufficient={!covers}
                minInverterKW={minInverterKW}
                onClick={() => setSelectedInverterId(inv.id)}
              />
            );
          })}
          {selectedPanel && selectedHybrid && (
            <div className="mt-2">
              <button
                onClick={() => setShowStringConfig((v) => !v)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {showStringConfig ? "▲" : "▼"} Ver configuración de string
                (avanzado)
              </button>
              {showStringConfig && stringCfg && (
                <div
                  className={`mt-2 p-3 rounded-xl border-2 text-xs ${stringCfg.withinMpptRange ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"}`}
                >
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      ["Paneles en serie", stringCfg.panelsInSeries],
                      ["Strings/MPPT", stringCfg.stringsPerMppt],
                      [
                        "Vmp string",
                        `${stringCfg.stringVoltageVmp.toFixed(0)} V`,
                      ],
                      [
                        "Voc string",
                        `${stringCfg.stringVoltageVoc.toFixed(0)} V`,
                      ],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        className="bg-white dark:bg-gray-800 rounded p-2 text-center"
                      >
                        <div className="text-gray-500">{label}</div>
                        <div className="font-bold text-gray-800 dark:text-white">
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p
                    className={
                      stringCfg.withinMpptRange
                        ? "text-green-700 dark:text-green-400"
                        : "text-amber-700 dark:text-amber-400"
                    }
                  >
                    {stringCfg.withinMpptRange
                      ? `✓ Dentro del rango MPPT [${selectedHybrid.mppt_rango_voltaje[0]}–${selectedHybrid.mppt_rango_voltaje[1]} V]`
                      : `⚠ ${stringCfg.warning}`}
                  </p>
                  <p className="text-gray-500 mt-1">
                    {stringCfg.panelsInSeries} p/string ×{" "}
                    {stringCfg.stringsPerMppt} strings ×{" "}
                    {selectedHybrid.mppt_numero} MPPTs ={" "}
                    <strong>{stringCfg.totalPanels} paneles</strong>
                    {stringCfg.totalPanels > formulaPanels && (
                      <span className="text-gray-400">
                        {" "}
                        (redondeado de {formulaPanels})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INVERTER — grid-tie (separados sin baterías) */}
      {/* ------------------------------------------------------------------ */}
      {useGridTieInverter && (
        <Section
          icon="⚡"
          title="Inversor de Red"
          subtitle={`${inverterPhases === 1 ? "Monofásico" : "Trifásico"} · MPPT integrado · Vuelca producción a la red · Mínimo: ${minInverterKW.toFixed(1)} kW`}
        >
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
            ℹ️ El inversor de red convierte la energía solar en AC y la vuelca a
            tu red doméstica, reduciendo la factura. Lleva el{" "}
            <strong>MPPT integrado</strong> — no necesitas regulador separado.
          </div>
          {inverterOptions.length === 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              ⚠ No hay inversores{" "}
              {inverterPhases === 1 ? "monofásicos" : "trifásicos"} en el
              catálogo.
            </div>
          )}
          {(inverterOptions as InversorRed[]).map((inv) => {
            const kw = inv.potencia_ac_nominal / 1000;
            const covers = kw >= minInverterKW;
            const isRec =
              covers &&
              inv.id ===
                (inverterOptions as InversorRed[]).find(
                  (i) => i.potencia_ac_nominal / 1000 >= minInverterKW,
                )?.id;
            return (
              <InverterCard
                key={inv.id}
                inv={inv}
                isSelected={selectedInverterId === inv.id}
                isRecommended={isRec}
                isInsufficient={!covers}
                minInverterKW={minInverterKW}
                onClick={() => setSelectedInverterId(inv.id)}
              />
            );
          })}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INVERTER — off-grid (separados con baterías) */}
      {/* ------------------------------------------------------------------ */}
      {useOffGridInverter && (
        <Section
          icon="⚡"
          title="Inversor"
          subtitle={`Convierte DC de baterías en AC 230V · Mínimo requerido: ${minInverterKW.toFixed(1)} kW`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            El recomendado ya cubre tu carga. Puedes elegir uno de mayor
            potencia si tienes electrodomésticos de alta potencia o prevés
            ampliar.
          </p>
          {(inverterOptions as InversorOffGrid[]).map((inv) => {
            const kw = (inv.potencia_nominal ?? 0) / 1000;
            const covers = kw >= minInverterKW;
            const isRec =
              covers &&
              inv.id ===
                (inverterOptions as InversorOffGrid[]).find(
                  (i) => (i.potencia_nominal ?? 0) / 1000 >= minInverterKW,
                )?.id;
            return (
              <InverterCard
                key={inv.id}
                inv={inv}
                isSelected={selectedInverterId === inv.id}
                isRecommended={isRec}
                isInsufficient={!covers}
                minInverterKW={minInverterKW}
                onClick={() => setSelectedInverterId(inv.id)}
              />
            );
          })}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INSTALLATION GEOMETRY */}
      {/* ------------------------------------------------------------------ */}
      <Section
        icon="📐"
        title="Montaje e inclinación"
        subtitle="Estos datos generan el diagrama de instalación en la fase siguiente"
      >
        <div className="space-y-4">
          {/* Tilt angle */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ángulo de inclinación
              </label>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {tiltDeg}°
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="1"
              value={tiltDeg}
              onChange={(e) => setTiltDeg(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>10° (casi plano)</span>
              <span>60° (casi vertical)</span>
            </div>
            {calcData?.optimalTiltDeg && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                💡 Ángulo óptimo PVGIS para tu ubicación:{" "}
                {calcData.optimalTiltDeg}°
              </p>
            )}
          </div>

          {/* Bottom edge height */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Altura del borde inferior
              </label>
              <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                {bottomEdgeM.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.50"
              step="0.05"
              value={bottomEdgeM}
              onChange={(e) => setBottomEdgeM(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0.10 m</span>
              <span>1.50 m</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Distancia desde el suelo o cubierta al borde inferior del panel
            </p>
          </div>

          {/* Both orientations — recommended highlighted */}
          {selectedPanel && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Orientación del panel
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Portrait */}
                <div
                  className={`rounded-xl border-2 p-3 ${panelOrientation === "portrait" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">↕</span>
                      <span className="font-bold text-sm text-gray-800 dark:text-white">
                        En pie (vertical)
                      </span>
                    </div>
                    {panelOrientation === "portrait" && (
                      <span className="text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ancho</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedPanel.alto_mm} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alto (en el plano)</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedPanel.ancho_mm} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borde inferior</span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">
                        {bottomEdgeM.toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borde superior</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {topEdgePortraitM.toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        Paso mín. entre filas
                      </span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {rowSpacingPortrait.pitchM} m
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                      <span className="text-gray-500 font-medium">
                        Superficie necesaria
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {(
                          numPanels *
                          (selectedPanel.alto_mm / 1000) *
                          rowSpacingPortrait.pitchM
                        ).toFixed(1)}{" "}
                        m²
                      </span>
                    </div>
                  </div>
                </div>
                {/* Landscape */}
                <div
                  className={`rounded-xl border-2 p-3 ${panelOrientation === "landscape" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">↔</span>
                      <span className="font-bold text-sm text-gray-800 dark:text-white">
                        Apaisado (horizontal)
                      </span>
                    </div>
                    {panelOrientation === "landscape" && (
                      <span className="text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ancho</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedPanel.ancho_mm} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alto (en el plano)</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedPanel.alto_mm} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borde inferior</span>
                      <span className="font-medium text-teal-600 dark:text-teal-400">
                        {bottomEdgeM.toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borde superior</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {topEdgeLandscapeM.toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        Paso mín. entre filas
                      </span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {rowSpacingLandscape.pitchM} m
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                      <span className="text-gray-500 font-medium">
                        Superficie necesaria
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {(
                          numPanels *
                          (selectedPanel.ancho_mm / 1000) *
                          rowSpacingLandscape.pitchM
                        ).toFixed(1)}{" "}
                        m²
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Row spacing note */}
          {selectedPanel && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              📏 <strong>Paso mínimo entre filas</strong> calculado sin sombras
              de 10h a 14h · solsticio de invierno (21 dic) · lat.{" "}
              {latitude.toFixed(1)}° · elev. solar ref. {rowSpacing.elevDeg}°.
              El espacio libre entre paneles es: en pie{" "}
              {rowSpacingPortrait.gapM} m · apaisado {rowSpacingLandscape.gapM}{" "}
              m.
            </p>
          )}
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Cost estimate */}
      {/* ------------------------------------------------------------------ */}
      {costEst && (
        <div className="mb-6 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 font-semibold text-gray-800 dark:text-white text-sm">
            💶 Estimación de coste orientativa
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Paneles ({numPanels} uds.)
              </span>
              <span className="font-medium text-gray-800 dark:text-white">
                {costEst.panelsCostEur.toLocaleString("es-ES")} €
              </span>
            </div>
            {needsBatteries && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Baterías ({numBatteries} uds.)
                </span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {costEst.batteriesCostEur.toLocaleString("es-ES")} €
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Inversor</span>
              <span className="font-medium text-gray-800 dark:text-white">
                {costEst.inverterCostEur.toLocaleString("es-ES")} €
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Cables, soportes, protecciones (~18%)
              </span>
              <span className="font-medium text-gray-800 dark:text-white">
                {costEst.othersCostEur.toLocaleString("es-ES")} €
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold text-base">
              <span className="text-gray-800 dark:text-white">
                Total estimado
              </span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {costEst.totalCostEur.toLocaleString("es-ES")} €
              </span>
            </div>
            {costEst.annualSavingsEur > 0 && (
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Amortización estimada</span>
                <span>
                  ~{costEst.paybackYears} años · ahorro{" "}
                  {costEst.annualSavingsEur.toLocaleString("es-ES")} €/año
                </span>
              </div>
            )}
          </div>
          <p className="px-4 pb-3 text-[10px] text-gray-400 dark:text-gray-500">
            * Precios orientativos de mercado. Los precios reales varían según
            proveedor y fecha.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CTA */}
      {/* ------------------------------------------------------------------ */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
        {!canConfirm && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
            ⚠️ Selecciona panel{needsBatteries ? ", batería" : ""} e inversor
            para continuar.
          </p>
        )}
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`w-full py-3.5 rounded-xl font-bold shadow text-base transition-all ${
            canConfirm
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-lg"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          Ver lista de compra →
        </button>
      </div>
    </div>
  );
};

export default Phase4ComponentSelection;
