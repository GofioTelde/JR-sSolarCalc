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
import {
  getBatteryVoltageClass,
  getBatteryVoltageLabel,
} from "@/services/componentCompatibility";

import panelesMono from "@/data/paneles_monofaciales.json";
import panelesBi from "@/data/paneles_bifaciales.json";
import bateriasData from "@/data/baterias.json";
import inversoresHib from "@/data/inversores_hibridos.json";
import inversoresRed from "@/data/inversores_red.json";
import modulosSep from "@/data/modulos_separados.json";
import kitsRaw from "@/data/kits.json";

const ALL_PANELS_MONO = panelesMono as unknown as Panel[];
const ALL_PANELS_BI = panelesBi as unknown as Panel[];
const ALL_BATTERIES = bateriasData as unknown as Bateria[];
const ALL_HYBRID = inversoresHib as unknown as InversorHibrido[];
const ALL_RED = inversoresRed as unknown as InversorRed[];
const ALL_MPPT = (
  modulosSep as unknown as (ControladorMPPT | InversorOffGrid)[]
).filter((m) => m.tipo === "mppt") as ControladorMPPT[];
const ALL_OFFGRID = (
  modulosSep as unknown as (ControladorMPPT | InversorOffGrid)[]
).filter((m) => m.tipo === "inversor") as InversorOffGrid[];

interface Kit {
  id: string;
  nombre: string;
  tipo_instalacion: string;
  fases: number;
  potencia_pv_wp: number;
  energia_almacenada_kwh: number;
  descripcion: string;
  componentes: {
    inversor_red_id?: string;
    inversor_hibrido_id?: string;
    inversor_offgrid_id?: string;
    mppt_id?: string;
    bateria_id?: string;
    baterias_cantidad?: number;
    paneles_cantidad: number;
    panel_potencia_wp: number;
  };
  precio_total: number;
  precio_estimado: boolean;
  adecuado_consumo_kwh_dia: [number, number];
}
const ALL_KITS = kitsRaw as Kit[];

// ---------------------------------------------------------------------------
// Power/capacity chip selector
// ---------------------------------------------------------------------------

function ChipSelector({
  label,
  values,
  selected,
  recommended,
  minValue,
  formatChip,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number;
  recommended: number;
  /** Values strictly below this are locked (not selectable). */
  minValue?: number;
  formatChip: (v: number) => string;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
        🟢 Verde = recomendado · 🔵 Azul = superior al recomendado (mejor, más caro) · 🔴 Rojo = inferior al recomendado
        {minValue !== undefined && " · ⬜ Gris = no disponible (mínimo técnico)"}
      </p>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const isSelected = v === selected;
          const isRec = v === recommended;
          const isBelow = v < recommended;
          const isAbove = v > recommended;
          const isLocked = minValue !== undefined && v < minValue;
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
                    ? isRec
                      ? "bg-green-500 text-white border-green-500 shadow-md"
                      : isBelow
                        ? "bg-red-500 text-white border-red-500 shadow-md"
                        : "bg-blue-500 text-white border-blue-500 shadow-md"
                    : isRec
                      ? "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40"
                      : isBelow
                        ? "border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:border-red-500"
                        : isAbove
                          ? "border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-500 bg-white dark:bg-gray-800",
              ].join(" ")}
            >
              {isRec && !isSelected && !isLocked && (
                <span className="absolute -top-2 -right-1.5 text-[9px] font-bold border border-green-400 rounded-full px-1 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400">
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
      <div className="flex flex-wrap items-center justify-between mb-2 gap-x-2 gap-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{icon}</span>
          <span className="font-semibold text-gray-800 dark:text-white text-sm leading-snug break-words">
            {title}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cls.badge}`}
        >
          {badge}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-2 text-xs">
            <span className="text-gray-400 dark:text-gray-500 shrink-0">
              {r.label}
            </span>
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
  isSuperior: boolean;
  isInsufficient: boolean;
  minInverterKW: number;
  onClick: () => void;
}

const InverterCard: React.FC<InverterCardProps> = ({
  inv,
  isSelected,
  isRecommended,
  isSuperior,
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
        isInsufficient
          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 opacity-60 cursor-not-allowed"
          : isSelected
            ? isRecommended
              ? "cursor-pointer border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md"
              : isSuperior
                ? "cursor-pointer border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                : "cursor-pointer border-gray-400 bg-white dark:bg-gray-800 shadow-md"
            : isRecommended
              ? "cursor-pointer border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 hover:border-green-500"
              : isSuperior
                ? "cursor-pointer border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 hover:border-blue-400"
                : "cursor-pointer border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isSelected}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {isSelected && (
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isRecommended ? "bg-green-500" : isSuperior ? "bg-blue-500" : "bg-gray-500"}`}>
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
            <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              Recomendado
            </span>
          )}
          {isSuperior && !isRecommended && (
            <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              Superior
            </span>
          )}
          {isInsufficient && (
            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              ⚠ Insuficiente
            </span>
          )}
          <span className={`text-xl font-bold ${isRecommended ? "text-green-600 dark:text-green-400" : isSuperior ? "text-blue-600 dark:text-blue-400" : isInsufficient ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
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
  isSuperior: boolean;
  isInsufficient: boolean;
  onClick: () => void;
}

const MpptCard: React.FC<MpptCardProps> = ({
  mppt,
  isSelected,
  isRecommended,
  isSuperior,
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
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
      isInsufficient
        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 opacity-60 cursor-not-allowed"
        : isSelected
          ? isRecommended
            ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md cursor-pointer"
            : isSuperior
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md cursor-pointer"
              : "border-gray-400 bg-white dark:bg-gray-800 shadow-md cursor-pointer"
          : isRecommended
            ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 hover:border-green-500 cursor-pointer"
            : isSuperior
              ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 hover:border-blue-400 cursor-pointer"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 cursor-pointer",
    ]
      .filter(Boolean)
      .join(" ")}
    aria-pressed={isSelected}
  >
    <div className="flex items-start justify-between mb-2 gap-2">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {isSelected && (
          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isRecommended ? "bg-green-500" : isSuperior ? "bg-blue-500" : "bg-gray-500"}`}>
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
          <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            Recomendado
          </span>
        )}
        {isSuperior && !isRecommended && (
          <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            Superior
          </span>
        )}
        {isInsufficient && (
          <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            ⚠ Insuficiente
          </span>
        )}
        <span className={`text-xl font-bold ${isRecommended ? "text-green-600 dark:text-green-400" : isSuperior ? "text-blue-600 dark:text-blue-400" : isInsufficient ? "text-red-500 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
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

  // Declared early so allBatteryKwh can filter by it
  const [selectedBatteryVoltageClass, setSelectedBatteryVoltageClass] =
    useState<"LV" | "HV" | null>(null);

  // Only show kWh chips matching the selected voltage class (LV or HV)
  const allBatteryKwh = useMemo(() => {
    const batteries = selectedBatteryVoltageClass
      ? ALL_BATTERIES.filter(
          (b) => getBatteryVoltageClass(b) === selectedBatteryVoltageClass,
        )
      : ALL_BATTERIES;
    return [...new Set(batteries.map((b) => b.capacidad_util_kwh))].sort(
      (a, b) => a - b,
    );
  }, [selectedBatteryVoltageClass]);

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

  // For each kWh tier, compute the minimum BMS count needed and whether the need is covered.
  // Distinguishes modular batteries (sub-200V, N modules per tower = 1 BMS) from
  // complete packs (200V, each unit = 1 BMS).  Goal: fewer BMS = lower cost.
  const batteryTierInfo = useMemo(() => {
    const classBatteries = selectedBatteryVoltageClass
      ? ALL_BATTERIES.filter(
          (b) => getBatteryVoltageClass(b) === selectedBatteryVoltageClass,
        )
      : ALL_BATTERIES;
    const map = new Map<number, {
      unitsNeeded: number;   // BMS count (NOT module count)
      canCover: boolean;
      maxUnits: number;
      isModular: boolean;    // true = modular tower (sub-200V), modules stack in 1 BMS
      modulesNeeded: number; // modules per BMS (only meaningful when isModular)
    }>();
    for (const kwh of allBatteryKwh) {
      const atTier = classBatteries.filter((b) => b.capacidad_util_kwh === kwh);
      let bestBMS = Infinity;
      let bestCanCover = false;
      let bestMaxUnits = 1;
      let bestIsModular = false;
      let bestModules = 1;

      for (const bat of atTier) {
        const isCompletePack = bat.tension_nominal >= 200;
        if (isCompletePack) {
          // Each physical unit = 1 independent BMS
          const rawBMS = batteryCapNeeded > 0 ? Math.ceil(batteryCapNeeded / kwh) : 1;
          const cappedBMS = Math.min(rawBMS, bat.max_paralelo);
          const covers = cappedBMS * kwh >= batteryCapNeeded;
          if (rawBMS < bestBMS || (rawBMS === bestBMS && covers && !bestCanCover)) {
            bestBMS = cappedBMS;
            bestCanCover = covers;
            bestMaxUnits = bat.max_paralelo;
            bestIsModular = false;
            bestModules = cappedBMS;
          }
        } else {
          // Modular tower: up to max_paralelo modules per tower, 1 tower = 1 BMS
          const capPerTower = bat.max_paralelo * kwh;
          const rawBMS = batteryCapNeeded > 0 ? Math.ceil(batteryCapNeeded / capPerTower) : 1;
          const covers = rawBMS * capPerTower >= batteryCapNeeded;
          const modsInFirstTower = batteryCapNeeded > 0
            ? Math.min(Math.ceil(batteryCapNeeded / kwh / rawBMS), bat.max_paralelo)
            : 1;
          if (rawBMS < bestBMS || (rawBMS === bestBMS && covers && !bestCanCover)) {
            bestBMS = rawBMS;
            bestCanCover = covers;
            bestMaxUnits = bat.max_paralelo;
            bestIsModular = true;
            bestModules = modsInFirstTower;
          }
        }
      }

      map.set(kwh, {
        unitsNeeded: bestBMS === Infinity ? 1 : bestBMS,
        canCover: bestCanCover,
        maxUnits: bestMaxUnits,
        isModular: bestIsModular,
        modulesNeeded: bestModules,
      });
    }
    return map;
  }, [allBatteryKwh, selectedBatteryVoltageClass, batteryCapNeeded]);

  const recommendedKwh = useMemo(() => {
    if (!needsBatteries || batteryCapNeeded === 0) return allBatteryKwh[0] ?? 0;
    // 1. Prefer any 1-BMS solution (modular tower OR single complete pack)
    const singleBMS = allBatteryKwh.find((k) => {
      const info = batteryTierInfo.get(k);
      return info?.unitsNeeded === 1 && info?.canCover;
    });
    if (singleBMS) return singleBMS;
    // 2. No 1-BMS option — pick fewest BMS that can fully cover the need
    const feasible = allBatteryKwh.filter((k) => batteryTierInfo.get(k)?.canCover);
    if (feasible.length > 0) {
      return feasible.reduce((best, k) => {
        const bu = batteryTierInfo.get(k)!.unitsNeeded;
        const bb = batteryTierInfo.get(best)!.unitsNeeded;
        return bu < bb || (bu === bb && k > best) ? k : best;
      });
    }
    // 3. Nothing can fully cover — pick largest kWh available
    return allBatteryKwh[allBatteryKwh.length - 1] ?? 0;
  }, [allBatteryKwh, batteryTierInfo, batteryCapNeeded, needsBatteries]);

  // Selection state
  const [selectedWp, setSelectedWp] = useState<number>(() => recommendedWp);
  const [selectedKwh, setSelectedKwh] = useState<number>(() => recommendedKwh);
  const [selectedInverterId, setSelectedInverterId] = useState<string>("");
  const [selectedMpptId, setSelectedMpptId] = useState<string | null>(null);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [showStringConfig, setShowStringConfig] = useState(false);
  const [bottomEdgeM, setBottomEdgeM] = useState<number>(0.3);

  // HV batteries require a hybrid inverter — MPPT controllers and off-grid inverters
  // work at 12/24/48V and are incompatible with a 100V+ battery bus.
  const hvIncompatiblePath =
    selectedBatteryVoltageClass === "HV" && useOffGridInverter;
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

  const batteriesAtKwh = useMemo(() => {
    let filtered = ALL_BATTERIES.filter(
      (b) => b.capacidad_util_kwh === selectedKwh,
    ).sort((a, b) => b.eficiencia_carga_descarga - a.eficiencia_carga_descarga);

    // Filter by voltage class if selected
    if (selectedBatteryVoltageClass) {
      filtered = filtered.filter((b) => {
        const batteryClass = getBatteryVoltageClass(b);
        return batteryClass === selectedBatteryVoltageClass;
      });
    }

    return filtered;
  }, [selectedKwh, selectedBatteryVoltageClass]);

  // Explicit panel / battery selection within a tier
  // Lazy initializers ensure the recommended items are pre-selected from the very first render.
  const [selectedPanelId, setSelectedPanelId] = useState<string>(() => {
    const saved = data.selectedComponents?.panelId;
    if (saved && rawPanels.find((p) => p.id === saved)) return saved;
    return (
      rawPanels
        .filter((p) => p.potencia_pmax === recommendedWp)
        .sort((a, b) => b.eficiencia - a.eficiencia)[0]?.id ?? ""
    );
  });
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>(() => {
    const saved = data.selectedComponents?.batteryId;
    if (saved && ALL_BATTERIES.find((b) => b.id === saved)) return saved;
    return (
      ALL_BATTERIES.filter((b) => b.capacidad_util_kwh === recommendedKwh)
        .sort((a, b) => b.eficiencia_carga_descarga - a.eficiencia_carga_descarga)[0]?.id ?? ""
    );
  });

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
    )
      .filter((b) => {
        if (selectedBatteryVoltageClass) {
          const batteryClass = getBatteryVoltageClass(b);
          return batteryClass === selectedBatteryVoltageClass;
        }
        return true;
      })
      .sort(
        (a, b) => b.eficiencia_carga_descarga - a.eficiencia_carga_descarga,
      )[0];
    if (best) setSelectedBatteryId(best.id);
  }, [selectedKwh, selectedBatteryVoltageClass]);

  // When voltage class changes → snap selectedKwh to a valid value for the new class
  useEffect(() => {
    if (allBatteryKwh.length === 0) return;
    if (!allBatteryKwh.includes(selectedKwh)) {
      // Pick closest valid value (prefer ≥ recommended, else largest available)
      const snap =
        allBatteryKwh.find((k) => k >= recommendedKwh) ??
        allBatteryKwh[allBatteryKwh.length - 1];
      setSelectedKwh(snap);
    }
  }, [selectedBatteryVoltageClass]); // eslint-disable-line react-hooks/exhaustive-deps

  // When battery voltage class changes → reset inverter selection to force re-selection
  useEffect(() => {
    if (useHybridInverter && selectedBatteryVoltageClass) {
      setSelectedInverterId("");
    }
  }, [selectedBatteryVoltageClass, useHybridInverter]);

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
    // híbrido — filter by phase AND battery voltage compatibility
    let hybridInverters = [...ALL_HYBRID].filter(
      (i) => i.fases === inverterPhases,
    );

    // If user has selected a battery voltage class, filter inverters accordingly
    if (needsBatteries && selectedBatteryVoltageClass) {
      hybridInverters = hybridInverters.filter((inv) => {
        const invBatteryClass = inv.bateria_tension >= 100 ? "HV" : "LV";
        return invBatteryClass === selectedBatteryVoltageClass;
      });
    }

    return hybridInverters.sort(
      (a, b) => a.potencia_ac_nominal - b.potencia_ac_nominal,
    );
  }, [
    useOffGridInverter,
    useGridTieInverter,
    inverterPhases,
    needsBatteries,
    selectedBatteryVoltageClass,
  ]);

  const mpptOptions = useMemo(
    () =>
      [...ALL_MPPT].sort(
        (a, b) => a.corriente_max_salida - b.corriente_max_salida,
      ),
    [],
  );

  // Kits matching the current installation type and phase count
  const matchingKits = useMemo(() => {
    let tipoFilter: string[] = [];
    if (useGridTieInverter) tipoFilter = ["red_sin_baterias"];
    else if (useOffGridInverter) tipoFilter = ["aislada"];
    else if (useHybridInverter && needsBatteries)
      tipoFilter = ["red_con_baterias_lv", "red_con_baterias_hv"];
    else if (useHybridInverter && !needsBatteries)
      tipoFilter = ["red_sin_baterias"];
    return ALL_KITS.filter(
      (k) =>
        tipoFilter.includes(k.tipo_instalacion) && k.fases === inverterPhases,
    );
  }, [
    useGridTieInverter,
    useOffGridInverter,
    useHybridInverter,
    needsBatteries,
    inverterPhases,
  ]);

  const handleKitSelect = useCallback(
    (kitId: string) => {
      if (selectedKitId === kitId) {
        setSelectedKitId(null);
        return;
      }
      const kit = ALL_KITS.find((k) => k.id === kitId);
      if (!kit) return;
      setSelectedKitId(kitId);
      // Set battery voltage class from kit type
      if (kit.tipo_instalacion === "red_con_baterias_hv") {
        setSelectedBatteryVoltageClass("HV");
      } else if (kit.tipo_instalacion === "red_con_baterias_lv") {
        setSelectedBatteryVoltageClass("LV");
      }
      // Apply inverter
      const invId =
        kit.componentes.inversor_hibrido_id ??
        kit.componentes.inversor_red_id ??
        kit.componentes.inversor_offgrid_id;
      if (invId) setSelectedInverterId(invId);
      // Apply battery
      if (kit.componentes.bateria_id) {
        const bat = ALL_BATTERIES.find(
          (b) => b.id === kit.componentes.bateria_id,
        );
        if (bat) {
          setSelectedKwh(bat.capacidad_util_kwh);
          setSelectedBatteryId(bat.id);
        }
      }
      // Apply MPPT
      if (kit.componentes.mppt_id) setSelectedMpptId(kit.componentes.mppt_id);
      // Apply panel — closest Wp in catalog
      const targetWp = kit.componentes.panel_potencia_wp;
      const closestWp = allPanelWps.reduce((best, wp) =>
        Math.abs(wp - targetWp) < Math.abs(best - targetWp) ? wp : best,
      );
      setSelectedWp(closestWp);
    },
    [selectedKitId, allPanelWps],
  );

  // Resolved inverter: if the user hasn't explicitly picked one (or their pick is no longer
  // in the list), fall back to the smallest inverter that covers minInverterKW.
  // This ensures the recommended inverter is visually selected from the first render
  // and canConfirm is true without waiting for the useEffect.
  const resolvedInverterId = useMemo(() => {
    if (inverterOptions.length === 0) return selectedInverterId;
    if (selectedInverterId && inverterOptions.find((i) => i.id === selectedInverterId))
      return selectedInverterId;
    const getKw = (i: (typeof inverterOptions)[0]) =>
      useOffGridInverter
        ? ((i as InversorOffGrid).potencia_nominal ?? 0) / 1000
        : (i as InversorHibrido | InversorRed).potencia_ac_nominal / 1000;
    const recommended =
      inverterOptions.find((i) => getKw(i) >= minInverterKW) ??
      inverterOptions[inverterOptions.length - 1];
    return recommended?.id ?? "";
  }, [selectedInverterId, inverterOptions, minInverterKW, useOffGridInverter]);

  // Keep selectedInverterId state in sync (for explicit user choices and saves)
  useEffect(() => {
    if (inverterOptions.length === 0) return;
    if (
      !selectedInverterId ||
      !inverterOptions.find((i) => i.id === selectedInverterId)
    ) {
      setSelectedInverterId(resolvedInverterId);
    }
  }, [inverterOptions, minInverterKW]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Derived quantities
  // -------------------------------------------------------------------------

  const selectedHybrid = ALL_HYBRID.find((i) => i.id === resolvedInverterId);
  const selectedOffGrid = ALL_OFFGRID.find((i) => i.id === resolvedInverterId);
  const selectedGridTie = ALL_RED.find((i) => i.id === resolvedInverterId);

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

  // Calculate total batteries needed (simple calculation for kit filtering)
  const totalBatteriesNeeded = useMemo(() => {
    if (!needsBatteries || !selectedBattery) return 0;

    const isHV = getBatteryVoltageClass(selectedBattery) === "HV";

    if (isHV && selectedHybrid) {
      const inverterVoltage = selectedHybrid.bateria_tension;
      const batteryVoltage = selectedBattery.tension_nominal;
      const seriesNeeded = Math.ceil(inverterVoltage / batteryVoltage);
      const capacityPerSeriesString =
        selectedBattery.capacidad_util_kwh * seriesNeeded;
      const parallelNeeded = Math.ceil(
        batteryCapNeeded / capacityPerSeriesString,
      );
      return seriesNeeded * parallelNeeded;
    }

    // For LV, just calculate parallel (assumes series=1)
    const parallelNeeded = Math.ceil(batteryCapNeeded / selectedBattery.capacidad_util_kwh);
    return parallelNeeded;
  }, [needsBatteries, selectedBattery, selectedHybrid, batteryCapNeeded]);

  // Filter available battery kits based on calculated needs
  const availableBatteryKits = useMemo(() => {
    if (!needsBatteries || !selectedBattery || !selectedBatteryVoltageClass || totalBatteriesNeeded === 0) {
      return [];
    }

    const isHV = selectedBatteryVoltageClass === "HV";
    const targetInstallationType = isHV ? "red_con_baterias_hv" : "red_con_baterias_lv";

    // Filter kits that:
    // 1. Are battery-equipped kits (not off-grid or grid-only)
    // 2. Have the right voltage class
    // 3. Have a matching battery model
    // 4. Have approximately the right number of batteries (exact match or ±1)
    return ALL_KITS.filter((kit) => {
      const isRightType = kit.tipo_instalacion.includes("red_con_baterias");
      if (!isRightType) return false;

      const isRightVoltageClass = kit.tipo_instalacion === targetInstallationType;
      if (!isRightVoltageClass) return false;

      const hasSameBattery = kit.componentes.bateria_id === selectedBattery.id;
      if (!hasSameBattery) return false;

      // Show kits with exact match or within ±1 battery
      const kitBatteriesQty = kit.componentes.baterias_cantidad ?? 0;
      const isRightQuantity = Math.abs(kitBatteriesQty - totalBatteriesNeeded) <= 1;
      if (!isRightQuantity) return false;

      return true;
    }).sort((a, b) => {
      // Sort by proximity to needed quantity
      const aDiff = Math.abs((a.componentes.baterias_cantidad ?? 0) - totalBatteriesNeeded);
      const bDiff = Math.abs((b.componentes.baterias_cantidad ?? 0) - totalBatteriesNeeded);
      return aDiff - bDiff;
    });
  }, [needsBatteries, selectedBattery, selectedBatteryVoltageClass, totalBatteriesNeeded]);

  // Auto-select first available kit when kits are available
  useEffect(() => {
    if (availableBatteryKits.length > 0) {
      if (!selectedKitId || !availableBatteryKits.find((k) => k.id === selectedKitId)) {
        setSelectedKitId(availableBatteryKits[0].id);
      }
    } else {
      setSelectedKitId("");
    }
  }, [availableBatteryKits, selectedKitId]);

  // HV system kits — one kit per option, sorted by coverage (full-coverage first)
  const hvSystemKits = useMemo(() => {
    if (!needsBatteries || selectedBatteryVoltageClass !== "HV") return [];

    return ALL_KITS
      .filter(k => k.tipo_instalacion === "red_con_baterias_hv" && k.fases === inverterPhases)
      .map(kit => {
        const coversNeed = kit.energia_almacenada_kwh >= batteryCapNeeded;
        const shortage = Math.max(0, batteryCapNeeded - kit.energia_almacenada_kwh);
        const battery = ALL_BATTERIES.find(b => b.id === kit.componentes.bateria_id);
        return { kit, coversNeed, shortage, bmsIntegrado: battery?.bms_integrado ?? true };
      })
      .sort((a, b) => {
        // Full-coverage kits first (least excess first), then partial by most kWh
        if (a.coversNeed !== b.coversNeed) return a.coversNeed ? -1 : 1;
        if (a.coversNeed) return a.kit.energia_almacenada_kwh - b.kit.energia_almacenada_kwh;
        return b.kit.energia_almacenada_kwh - a.kit.energia_almacenada_kwh;
      });
  }, [needsBatteries, selectedBatteryVoltageClass, batteryCapNeeded, inverterPhases]);

  // Calculate number of batteries considering both voltage match (series) and capacity (parallel)
  const batteryConfig = useMemo(() => {
    if (!needsBatteries || !selectedBattery) {
      return {
        series: 0,
        parallel: 0,
        total: 0,
        explanation: "",
        numBMSUnits: 0,
        bmsDistribution: [],
        bmsInfo: "",
      };
    }

    // For HV batteries, we need to match inverter voltage with series connection
    const isHV = getBatteryVoltageClass(selectedBattery) === "HV";

    if (isHV && selectedHybrid) {
      const inverterVoltage = selectedHybrid.bateria_tension;
      const batteryVoltage = selectedBattery.tension_nominal;
      const moduleKwh = selectedBattery.capacidad_util_kwh;
      const maxModules = selectedBattery.max_paralelo; // max modules per tower (series)

      // 200V complete packs are already assembled towers — connect in PARALLEL only.
      // Sub-200V modules (51V, 100V, 102V) are stacked in SERIES inside a tower.
      const isCompletePack = batteryVoltage >= 200;

      if (isCompletePack) {
        // Each unit IS a complete tower with its own BMS. Connect units in parallel.
        const unitsNeeded = Math.min(maxModules, Math.ceil(batteryCapNeeded / moduleKwh));
        const totalCapacity = unitsNeeded * moduleKwh;
        const towersFeasible = unitsNeeded <= 2;
        const bmsDistribution = Array.from({ length: unitsNeeded }, (_, i) => ({
          bmsIndex: i + 1, seriesCount: 1, parallelCount: 1,
          totalForBMS: 1, voltage: batteryVoltage, capacity: moduleKwh,
        }));
        return {
          series: 1,
          parallel: unitsNeeded,
          total: unitsNeeded,
          explanation: unitsNeeded === 1
            ? `1 unidad · ${batteryVoltage}V · ${moduleKwh.toFixed(1)} kWh (BMS integrado)`
            : `${unitsNeeded} unidades en paralelo · ${totalCapacity.toFixed(1)} kWh total`,
          numBMSUnits: unitsNeeded,
          bmsDistribution,
          bmsInfo: `${unitsNeeded} pack${unitsNeeded > 1 ? "s" : ""} ${batteryVoltage}V en paralelo · BMS integrado en cada uno`,
          towersFeasible,
          towersNeeded: unitsNeeded,
        };
      }

      // --- MODULAR TOWER: modules connect in SERIES inside one tower (1 BMS per tower) ---
      // Minimum modules to reach inverter bus voltage
      const minSeries = Math.ceil(inverterVoltage / batteryVoltage);
      // Ideal: fit all needed kWh into 1 tower, using up to maxModules
      const seriesForKwh = Math.ceil(batteryCapNeeded / moduleKwh);
      const optimalSeries = Math.min(maxModules, Math.max(minSeries, seriesForKwh));
      const capacityOneTower = moduleKwh * optimalSeries;

      if (capacityOneTower >= batteryCapNeeded) {
        // 1 tower is enough
        const totalCapacity = capacityOneTower;
        return {
          series: optimalSeries,
          parallel: 1,
          total: optimalSeries,
          explanation: `1 torre · ${optimalSeries} módulo${optimalSeries > 1 ? "s" : ""} en serie · ${optimalSeries * batteryVoltage}V · ${totalCapacity.toFixed(1)} kWh`,
          numBMSUnits: 1,
          bmsDistribution: [{ bmsIndex: 1, seriesCount: optimalSeries, parallelCount: 1,
            totalForBMS: optimalSeries, voltage: optimalSeries * batteryVoltage, capacity: totalCapacity }],
          bmsInfo: `1 torre · ${optimalSeries} módulos en serie · 1 BMS`,
          towersFeasible: true,
          towersNeeded: 1,
        };
      }

      // Need 2 towers (each with maxModules modules in series, connected in parallel)
      const twoTowerCapacity = capacityOneTower * 2;
      const towersNeeded = twoTowerCapacity >= batteryCapNeeded ? 2 : 3; // 3 = not feasible
      const towersFeasible = towersNeeded <= 2;
      const totalCapacity = optimalSeries * moduleKwh * towersNeeded;
      const bmsDistribution = Array.from({ length: towersNeeded }, (_, i) => ({
        bmsIndex: i + 1, seriesCount: optimalSeries, parallelCount: 1,
        totalForBMS: optimalSeries, voltage: optimalSeries * batteryVoltage, capacity: capacityOneTower,
      }));
      return {
        series: optimalSeries,
        parallel: towersNeeded,
        total: optimalSeries * towersNeeded,
        explanation: towersFeasible
          ? `2 torres en paralelo · ${optimalSeries} módulos/torre · ${totalCapacity.toFixed(1)} kWh total`
          : `${towersNeeded} torres necesarias (supera el máximo recomendado de 2)`,
        numBMSUnits: towersNeeded,
        bmsDistribution,
        bmsInfo: `${towersNeeded} torres · ${optimalSeries} módulos/torre · ${towersNeeded} BMS`,
        towersFeasible,
        towersNeeded,
      };
    }

    // For LV batteries (48V standard), just calculate capacity
    const parallelNeeded = Math.ceil(
      batteryCapNeeded / selectedBattery.capacidad_util_kwh,
    );

    // Calculate number of independent BMS units needed
    const maxParalleloPerBMS = selectedBattery.max_paralelo || 1;
    const numBMSUnits = Math.ceil(parallelNeeded / maxParalleloPerBMS);

    // Distribute batteries across BMS units (for LV, series=1)
    const bmsDistribution = [];
    let remainingParallel = parallelNeeded;
    for (let i = 0; i < numBMSUnits; i++) {
      const parallelForThisBMS = Math.min(
        remainingParallel,
        maxParalleloPerBMS,
      );
      const capacity = selectedBattery.capacidad_util_kwh * parallelForThisBMS;
      bmsDistribution.push({
        bmsIndex: i + 1,
        seriesCount: 1, // LV always series 1
        parallelCount: parallelForThisBMS,
        totalForBMS: parallelForThisBMS,
        voltage: selectedBattery.tension_nominal,
        capacity,
      });
      remainingParallel -= parallelForThisBMS;
    }

    let bmsInfo =
      numBMSUnits > 1
        ? `Tu sistema necesita ${numBMSUnits} grupos de baterías, cada uno con su BMS integrado:\n`
        : `Tu sistema requiere ${parallelNeeded} baterías en paralelo. El BMS integrado puede manejar hasta ${maxParalleloPerBMS} en paralelo.`;

    bmsDistribution.forEach((dist) => {
      if (numBMSUnits > 1) {
        bmsInfo += `\nGrupo ${dist.bmsIndex}: ${dist.parallelCount} baterías (${dist.capacity.toFixed(1)}kWh)`;
      }
    });

    return {
      series: 1,
      parallel: parallelNeeded,
      total: parallelNeeded,
      explanation: `${parallelNeeded} baterías en paralelo (${selectedBattery.capacidad_util_kwh}kWh × ${parallelNeeded} = ${(selectedBattery.capacidad_util_kwh * parallelNeeded).toFixed(1)}kWh)`,
      numBMSUnits,
      bmsDistribution,
      bmsInfo,
    };
  }, [needsBatteries, selectedBattery, selectedHybrid, batteryCapNeeded]);

  const numBatteries = batteryConfig.total;

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
    !!resolvedInverterId &&
    (!needsBatteries || !!selectedBattery);

  // -------------------------------------------------------------------------
  // Confirm
  // -------------------------------------------------------------------------

  const handleConfirm = useCallback(() => {
    update({
      panelBottomEdgeHeightM: bottomEdgeM,
      selectedComponents: {
        panelId: selectedPanel!.id,
        inverterId: resolvedInverterId,
        batteryId: needsBatteries ? (selectedBattery?.id ?? null) : null,
        mpptId: useOffGridInverter ? selectedMpptId : null,
        numPanels,
        numBatteries: needsBatteries ? numBatteries : 0,
        batterySeriesPerTower: needsBatteries ? batteryConfig.series : undefined,
        batteryTowersCount: needsBatteries ? batteryConfig.parallel : undefined,
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
    resolvedInverterId,
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
        <>
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

          {/* HV configuration summary */}
          {needsBatteries &&
            selectedBatteryVoltageClass === "HV" &&
            selectedHybrid &&
            selectedBattery && (() => {
              const towers = batteryConfig.towersNeeded ?? batteryConfig.parallel;
              const feasible = batteryConfig.towersFeasible ?? towers <= 2;
              const capPerTower = (selectedBattery.capacidad_util_kwh * batteryConfig.series).toFixed(1);
              // 200V complete packs have series=1: each unit IS a standalone pack, not a stacked tower
              const isCompletePack = batteryConfig.series === 1;
              const unitLabel = isCompletePack ? "Unidades" : "Torres";
              const kwhLabel = isCompletePack ? "kWh/unidad" : "kWh/Torre";
              const modLabel = isCompletePack ? "Mód/unid" : "Módulos/Torre";
              return (
                <div className={`mb-6 p-3 border rounded-xl ${feasible ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"}`}>
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2 uppercase">
                    ⚡ Configuración HV — {isCompletePack ? `Packs autónomos ${selectedBattery.tension_nominal}V` : "Sistema de Torres"}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-white dark:bg-indigo-900/30 rounded p-2 text-center">
                      <div className="text-[10px] text-gray-500">{modLabel}</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">{batteryConfig.series}</div>
                    </div>
                    <div className="bg-white dark:bg-indigo-900/30 rounded p-2 text-center">
                      <div className="text-[10px] text-gray-500">{kwhLabel}</div>
                      <div className="font-bold text-green-600 dark:text-green-400">{capPerTower} kWh</div>
                    </div>
                    <div className={`rounded p-2 text-center ${towers === 1 ? "bg-green-100 dark:bg-green-900/30" : towers === 2 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                      <div className="text-[10px] text-gray-500">{unitLabel}</div>
                      <div className={`font-bold ${towers === 1 ? "text-green-600 dark:text-green-400" : towers === 2 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>{towers}</div>
                    </div>
                  </div>
                  {towers === 1 && (
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400">
                      {isCompletePack
                        ? `✓ 1 unidad standalone ${selectedBattery.tension_nominal}V · ${capPerTower} kWh · BMS integrado`
                        : `✓ 1 torre/kit: ${batteryConfig.series} módulo${batteryConfig.series > 1 ? "s" : ""} en serie → ${batteryConfig.series * selectedBattery.tension_nominal}V · ${capPerTower} kWh · 1 BMS integrado`}
                    </div>
                  )}
                  {towers === 2 && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-400">
                      {isCompletePack
                        ? `✓ 2 unidades ${selectedBattery.tension_nominal}V en paralelo → ${(parseFloat(capPerTower) * 2).toFixed(1)} kWh total · 2 BMS (1 por unidad)`
                        : `✓ 2 torres idénticas en paralelo: ${batteryConfig.series} módulo${batteryConfig.series > 1 ? "s" : ""}/torre → ${(parseFloat(capPerTower) * 2).toFixed(1)} kWh total · 2 BMS`}
                    </div>
                  )}
                  {!feasible && (
                    <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-600">
                      {isCompletePack
                        ? `⚠️ Se necesitan ${towers} unidades de ${capPerTower} kWh cada una. Coste elevado — considera cambiar a sistema LV (48V) o elegir un pack de mayor capacidad.`
                        : `⚠️ Se necesitarían ${towers} torres — no recomendado. Elige una batería con mayor capacidad por módulo para resolverlo con 1 o 2 torres.`}
                    </div>
                  )}
                </div>
              );
            })()}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BATTERIES TYPE SELECTION (LV vs HV) */}
      {/* ------------------------------------------------------------------ */}
      {needsBatteries && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">
                Tipo de Sistema de Baterías
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Elige el tipo de tensión — determinará qué baterías e inversores
                verás disponibles
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* LV Option */}
            <button
              type="button"
              onClick={() => setSelectedBatteryVoltageClass("LV")}
              className={[
                "text-left rounded-xl border-2 p-4 transition-all select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
                selectedBatteryVoltageClass === "LV"
                  ? "border-green-500 bg-green-100 dark:bg-green-900/40 shadow-md"
                  : selectedBatteryVoltageClass === "HV"
                    ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60"
                    : "border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-600",
              ].join(" ")}
              aria-pressed={selectedBatteryVoltageClass === "LV"}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">
                    LV — Bajo Voltaje (Estándar)
                  </div>
                  <div className="text-xl font-black text-green-600 dark:text-green-400">
                    48V
                  </div>
                </div>
                {selectedBatteryVoltageClass === "LV" && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-white"
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
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                <li>✓ Más económico</li>
                <li>✓ La opción más común</li>
                <li>✓ Compatible con la mayoría de inversores</li>
              </ul>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Recomendado para la mayoría de instalaciones
              </div>
            </button>

            {/* HV Option */}
            <button
              type="button"
              onClick={() => setSelectedBatteryVoltageClass("HV")}
              className={[
                "text-left rounded-xl border-2 p-4 transition-all select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
                selectedBatteryVoltageClass === "HV"
                  ? "border-green-500 bg-green-100 dark:bg-green-900/40 shadow-md"
                  : selectedBatteryVoltageClass === "LV"
                    ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60"
                    : "border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-600",
              ].join(" ")}
              aria-pressed={selectedBatteryVoltageClass === "HV"}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">
                    HV — Alto Voltaje (Premium)
                  </div>
                  <div className="text-xl font-black text-green-600 dark:text-green-400">
                    100V+
                  </div>
                </div>
                {selectedBatteryVoltageClass === "HV" && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-white"
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
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                <li>✓ Mayor potencia y capacidad</li>
                <li>✓ Más eficiente en sistemas grandes</li>
                <li>✓ Mejor para ampliaciones futuras</li>
              </ul>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Para sistemas avanzados / profesionales
              </div>
            </button>
          </div>

          {selectedBatteryVoltageClass && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              ℹ️{" "}
              <strong>
                Sistema bloqueado a {selectedBatteryVoltageClass}:
              </strong>{" "}
              Solo verás baterías e inversores{" "}
              {selectedBatteryVoltageClass === "LV" ? "48V" : "100V+"}{" "}
              compatibles. Si cambias de opinión,{" "}
              <button
                type="button"
                onClick={() => setSelectedBatteryVoltageClass(null)}
                className="font-bold underline hover:no-underline"
              >
                reinicia la selección
              </button>
              .
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KITS RECOMENDADOS */}
      {/* ------------------------------------------------------------------ */}
      {(() => {
        // HV battery kits always appear in the dedicated hvSystemKits section — never here.
        // LV battery kits are hidden when HV is selected (incompatible).
        const visibleKits = matchingKits.filter(k => {
          if (k.tipo_instalacion === "red_con_baterias_hv") return false;
          if (k.tipo_instalacion === "red_con_baterias_lv" && selectedBatteryVoltageClass === "HV") return false;
          return true;
        });
        if (visibleKits.length === 0) return null;
        return (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📦</span>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">
                Kits recomendados
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Un kit es un <strong>paquete completo</strong> (inversor + baterías + paneles). Compras 1 kit, no varios.
                {needsBatteries && batteryCapNeeded > 0 && ` Tu necesidad: ${batteryCapNeeded.toFixed(1)} kWh.`}
              </p>
            </div>
          </div>
          {selectedKitId && (
            <div className="mb-3 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
              <span className="font-bold">📦 Kit aplicado:</span>
              <span className="flex-1">
                {ALL_KITS.find((k) => k.id === selectedKitId)?.nombre}
              </span>
              <button
                onClick={() => setSelectedKitId(null)}
                className="ml-auto text-indigo-400 hover:text-indigo-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}
          <div className="space-y-3">
            {visibleKits.map((kit, idx) => {
              const isSelected = selectedKitId === kit.id;
              const kitCoversNeed = needsBatteries && batteryCapNeeded > 0
                ? kit.energia_almacenada_kwh >= batteryCapNeeded
                : true;
              const isKitRec = idx === 0 && kitCoversNeed;
              const isKitSup = kitCoversNeed && !isKitRec;
              const isKitInsuff = !kitCoversNeed;
              const batQty = kit.componentes.baterias_cantidad ?? 0;
              return (
                <div
                  key={kit.id}
                  className={[
                    "w-full rounded-xl border-2 p-3 cursor-pointer transition-all",
                    isSelected
                      ? isKitRec
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md"
                        : isKitSup
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-red-400 bg-red-50 dark:bg-red-900/10 shadow-md"
                      : isKitRec
                        ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 hover:border-green-500"
                        : isKitSup
                          ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 hover:border-blue-400"
                          : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 hover:border-red-400",
                  ].join(" ")}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleKitSelect(kit.id)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleKitSelect(kit.id)
                  }
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-gray-800 dark:text-white leading-tight">
                      {kit.nombre}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isKitRec && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Recomendado</span>}
                      {isKitSup && <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Superior</span>}
                      {isKitInsuff && <span className="bg-red-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Insuficiente</span>}
                      {isSelected && (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isKitRec ? "bg-green-500" : isKitSup ? "bg-blue-500" : "bg-red-400"}`}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 leading-snug">
                    {kit.descripcion}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold text-xs px-2 py-1 rounded-lg">
                      ☀️ {(kit.potencia_pv_wp / 1000).toFixed(1)} kWp
                    </span>
                    {kit.energia_almacenada_kwh > 0 ? (
                      <span className={`font-bold text-xs px-2 py-1 rounded-lg ${kitCoversNeed ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"}`}>
                        🔋 {kit.energia_almacenada_kwh.toFixed(1)} kWh{batQty > 1 ? ` (${batQty} baterías)` : ""}
                        {kitCoversNeed && needsBatteries && batteryCapNeeded > 0 && " ✓"}
                        {!kitCoversNeed && needsBatteries && batteryCapNeeded > 0 && ` / ${batteryCapNeeded.toFixed(1)} kWh necesarios`}
                      </span>
                    ) : (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs px-2 py-1 rounded-lg">Sin batería · Red pura</span>
                    )}
                    <span className="ml-auto font-bold text-base text-indigo-600 dark:text-indigo-400">
                      {kit.precio_total.toLocaleString("es-ES")} €
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        );
      })()}

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
            accent="green"
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
      {/* HV SYSTEM KITS — shown when HV is selected, before battery picker  */}
      {/* ------------------------------------------------------------------ */}
      {needsBatteries && selectedBatteryVoltageClass === "HV" && hvSystemKits.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📦</span>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">
                Kits HV recomendados
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Un kit HV es una unidad completa con sus módulos internos — no son unidades separadas. Elige el que mejor se adapte a tu necesidad de{" "}
                <strong>{batteryCapNeeded.toFixed(1)} kWh</strong>.
              </p>
            </div>
          </div>
          <div className="p-3 mb-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
            ℹ️ Cada kit es una <strong>solución completa</strong>: inversor + baterías + paneles ya dimensionados. <strong>Compras 1 kit</strong>, no varios. Las baterías HV llevan el BMS integrado — no hace falta comprarlo por separado.
          </div>
          <div className="space-y-3">
            {hvSystemKits.map(({ kit, coversNeed, shortage, bmsIntegrado }, idx) => {
              const isSelected = selectedKitId === kit.id;
              const isRecommended = idx === 0 && coversNeed;
              const isSuperiorKit = coversNeed && !isRecommended;
              const isInsuffKit = !coversNeed;
              const batQty = kit.componentes.baterias_cantidad ?? 1;
              return (
                <div
                  key={kit.id}
                  className={[
                    "w-full rounded-xl border-2 p-3 cursor-pointer transition-all",
                    isSelected
                      ? isRecommended
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md"
                        : isSuperiorKit
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                          : "border-red-400 bg-red-50 dark:bg-red-900/10 shadow-md"
                      : isRecommended
                        ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 hover:border-green-500"
                        : isSuperiorKit
                          ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 hover:border-blue-400"
                          : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 hover:border-red-400",
                  ].join(" ")}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleKitSelect(kit.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleKitSelect(kit.id)}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="font-bold text-xs text-gray-800 dark:text-white leading-tight flex-1">
                      {kit.nombre}
                    </span>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isSelected && (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isRecommended ? "bg-green-500" : isSuperiorKit ? "bg-blue-500" : "bg-red-400"}`}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        </div>
                      )}
                      {isRecommended && <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Recomendado</span>}
                      {isSuperiorKit && <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Superior</span>}
                      {isInsuffKit && <span className="bg-red-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Insuficiente</span>}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 leading-snug">
                    {kit.descripcion}
                  </p>

                  {/* Coverage + specs row */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold text-xs px-2 py-1 rounded-lg">
                      ☀️ {(kit.potencia_pv_wp / 1000).toFixed(1)} kWp
                    </span>
                    <span className={`font-bold text-xs px-2 py-1 rounded-lg ${coversNeed ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"}`}>
                      🔋 {kit.energia_almacenada_kwh} kWh{batQty > 1 ? ` (${batQty} baterías)` : ""}
                      {coversNeed ? " ✓" : ` / ${batteryCapNeeded.toFixed(1)} kWh necesarios`}
                    </span>
                    {bmsIntegrado && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">✓ BMS incluido</span>
                    )}
                    <span className="ml-auto font-bold text-base text-indigo-600 dark:text-indigo-400">
                      {kit.precio_total.toLocaleString("es-ES")} €
                    </span>
                  </div>
                  {!coversNeed && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-500">
                      ⚠ Faltan {shortage.toFixed(1)} kWh — puedes añadir baterías adicionales compatibles
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {selectedKitId && hvSystemKits.some(({ kit }) => kit.id === selectedKitId) && (
            <div className="mt-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
              <span className="font-bold">📦 Kit aplicado:</span>
              <span className="flex-1">{ALL_KITS.find((k) => k.id === selectedKitId)?.nombre}</span>
              <button onClick={() => setSelectedKitId(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 font-bold">✕</button>
            </div>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            Puedes ajustar la selección manual de batería e inversor en las secciones siguientes.
          </p>
        </section>
      )}

      {/* Show prompt if batteries needed but type not selected */}
      {needsBatteries && !selectedBatteryVoltageClass && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">👆</span>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100 mb-1">
                Primero: selecciona el tipo de sistema
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Para continuar, elige si prefieres un sistema{" "}
                <strong>LV (48V, estándar)</strong> o{" "}
                <strong>HV (100V+, premium)</strong> en la sección anterior.
                Esto filtrará automáticamente todas las opciones compatibles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BATTERIES */}
      {/* ------------------------------------------------------------------ */}
      {needsBatteries && selectedBatteryVoltageClass && (
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
            formatChip={(v) => {
              if (!needsBatteries || batteryCapNeeded === 0) return `${v} kWh`;
              const info = batteryTierInfo.get(v);
              if (!info) return `${v} kWh`;
              if (!info.canCover) return `${v} kWh · máx ${info.maxUnits} (insuf.)`;
              const bms = info.unitsNeeded;
              if (info.isModular && bms === 1)
                return `${v} kWh · ${info.modulesNeeded} mód. · 1 BMS`;
              return `${v} kWh · ${bms} BMS`;
            }}
            onSelect={setSelectedKwh}
          />
          {selectedKwh < recommendedKwh && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl text-xs text-red-700 dark:text-red-300">
              ⚠️ <strong>Capacidad insuficiente:</strong> has elegido{" "}
              {selectedKwh} kWh útiles pero tu consumo requiere{" "}
              {batteryCapNeeded.toFixed(1)} kWh. Con esta batería necesitarás{" "}
              {Math.ceil(batteryCapNeeded / selectedKwh)} unidades y puede que
              no cubra toda la noche.
            </div>
          )}

          {/* Show available battery kits based on calculated needs */}
          {availableBatteryKits.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-3">
                📦 Kits de baterías disponibles
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {availableBatteryKits.map((kit) => {
                  const isSelected = kit.id === selectedKitId;
                  const isReccommended = kit.id === availableBatteryKits[0].id;
                  const kitBatQty = kit.componentes.baterias_cantidad ?? 1;
                  const numKitsNeeded = Math.max(1, Math.ceil(totalBatteriesNeeded / kitBatQty));
                  const kitTotalPrice = numKitsNeeded * kit.precio_total;
                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => setSelectedKitId(kit.id)}
                      className={[
                        "relative flex-shrink-0 w-52 text-left p-2.5 rounded-xl border-2 text-xs transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300",
                      ].join(" ")}
                    >
                      {isReccommended && !isSelected && (
                        <span className="absolute -top-2 -right-1.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 12 12"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2 6l3 3 5-5"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="font-semibold text-gray-700 dark:text-gray-200 leading-tight mb-1 pr-2 pl-5 text-[10px]">
                        {kit.nombre.replace(/Kit\s+/i, "").replace(/\s+con\s+.*/, "")}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-[10px] pl-5">
                        {numKitsNeeded === 1
                          ? `1 kit · ${kitBatQty} batería${kitBatQty > 1 ? "s" : ""} · ${kit.energia_almacenada_kwh.toFixed(1)} kWh`
                          : `${numKitsNeeded} kits · ${kitBatQty * numKitsNeeded} baterías · ${(kit.energia_almacenada_kwh * numKitsNeeded).toFixed(1)} kWh`}
                      </div>
                      <div className="text-blue-600 dark:text-blue-400 text-[10px] pl-5 font-semibold">
                        {numKitsNeeded > 1 && <span className="text-gray-400 font-normal">{numKitsNeeded} × {kit.precio_total.toLocaleString("es-ES")} € = </span>}
                        {kitTotalPrice.toLocaleString("es-ES")} €
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {batteriesAtKwh.length === 0 && selectedBatteryVoltageClass && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-300 mb-3">
              ⚠️ <strong>Sin baterías disponibles</strong> en{" "}
              {selectedBatteryVoltageClass === "LV" ? "48V" : "100V+"} a{" "}
              {selectedKwh} kWh. Intenta otra capacidad.
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
            <>
              <DetailCard
                icon="🔋"
                title={selectedBattery.nombre}
                badge={
                  selectedBatteryVoltageClass === "HV"
                    ? batteryConfig.parallel === 1
                      ? `1 torre · ${batteryConfig.series} mód. en serie · ${(selectedBattery.capacidad_util_kwh * batteryConfig.series).toFixed(1)} kWh`
                      : `${batteryConfig.parallel} torres · ${numBatteries} mód. totales · ${(selectedBattery.capacidad_util_kwh * numBatteries).toFixed(1)} kWh`
                    : `×${numBatteries} uds. · ${(numBatteries * selectedBattery.capacidad_util_kwh).toFixed(1)} kWh`
                }
                accent="green"
                rows={[
                  {
                    label: "Tipo",
                    value: getBatteryVoltageLabel(selectedBattery),
                  },
                  {
                    label: "Tensión unitaria",
                    value: `${selectedBattery.tension_nominal} V`,
                  },
                  ...(selectedBatteryVoltageClass === "HV" && selectedHybrid
                    ? [
                        {
                          label: "Módulos/torre (serie)",
                          value: `${batteryConfig.series} → ${selectedBattery.tension_nominal * batteryConfig.series}V`,
                        },
                        {
                          label: "Torres en paralelo",
                          value: `${batteryConfig.parallel} torre${batteryConfig.parallel > 1 ? "s" : ""} · ${(selectedBattery.capacidad_util_kwh * numBatteries).toFixed(1)} kWh`,
                        },
                      ]
                    : []),
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
                    label: "BMS",
                    value: selectedBattery.bms_integrado ? "Integrado" : "Externo",
                  },
                  {
                    label: selectedBatteryVoltageClass === "HV" ? "Módulos/torre máx." : "Paralelo máx.",
                    value: `${selectedBattery.max_paralelo} uds.`,
                  },
                ]}
              />

              {/* HV tower configuration detail */}
              {selectedBatteryVoltageClass === "HV" && selectedHybrid && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
                  <div className="font-bold mb-2">🏗️ Arquitectura de torres HV</div>
                  <div className="space-y-1.5">
                    <div className="font-mono bg-white dark:bg-indigo-900/40 p-2 rounded text-[11px]">
                      {batteryConfig.explanation}
                    </div>
                    {batteryConfig.parallel === 2 && (
                      <div className="flex gap-2">
                        {batteryConfig.bmsDistribution.map((dist) => (
                          <div key={dist.bmsIndex} className="flex-1 bg-white dark:bg-indigo-900/30 rounded p-2 text-center">
                            <div className="text-[9px] text-gray-500 mb-1">Torre {dist.bmsIndex}</div>
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">{dist.seriesCount} mód.</div>
                            <div className="text-[10px]">{dist.voltage}V · {dist.capacity.toFixed(1)} kWh</div>
                            <div className="text-[9px] text-green-600 dark:text-green-400">1 BMS</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(batteryConfig.towersFeasible === false || (batteryConfig.towersNeeded ?? 0) > 2) && (
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-700 dark:text-amber-400 font-semibold">
                        ⚠️ {batteryConfig.parallel} torres no recomendado — elige una batería de mayor capacidad por módulo
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl text-xs text-green-700 dark:text-green-300">
                ✓{" "}
                <strong>
                  Sistema {selectedBatteryVoltageClass === "HV" ? "HV" : "LV"}{" "}
                  compatible:
                </strong>{" "}
                todos los inversores mostrados son compatibles con esta batería.
                Solo verás opciones que funcionan bien juntas.
              </div>
            </>
          )}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* HV + separados incompatibility warning                             */}
      {/* ------------------------------------------------------------------ */}
      {hvIncompatiblePath && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <p className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">
                Las baterías HV no son compatibles con reguladores MPPT ni inversores off-grid
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mb-2">
                Las baterías de alta tensión (100V+) trabajan a un voltaje de bus DC que los reguladores MPPT y los inversores off-grid del catálogo no soportan — están diseñados para baterías de 12/24/48V.
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 font-semibold">
                💡 Solución: vuelve al paso anterior y elige el tipo de sistema <strong>Híbrido</strong>. Los inversores híbridos incluyen el MPPT integrado y tienen el bus DC preparado para baterías HV.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MPPT — separados con baterías (before batteries and off-grid inverter) */}
      {/* ------------------------------------------------------------------ */}
      {useOffGridInverter && !hvIncompatiblePath && mpptOptions.length > 0 && (
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
                isSuperior={!insufficient && m.id !== recommendedMpptId}
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

          {needsBatteries && selectedBattery && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Seleccionaste:</strong> Batería{" "}
              {getBatteryVoltageLabel(selectedBattery)} (
              {selectedBattery.tension_nominal}V). Se mostrarán{" "}
              {getBatteryVoltageClass(selectedBattery) === "HV"
                ? "inversores HV"
                : "inversores 48V"}{" "}
              compatible
              {getBatteryVoltageClass(selectedBattery) === "HV" ? "s HV" : "s"}.
            </div>
          )}

          {inverterOptions.length === 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              ⚠ No hay inversores{" "}
              {inverterPhases === 1 ? "monofásicos" : "trifásicos"} en el
              catálogo.
            </div>
          )}

          {(() => {
            // inverterOptions is already filtered by voltage class (LV/HV) — use directly.
            // The old ±10V tolerance check broke modular HV batteries (51.2V module ≠ 200V bus).
            const availableInverters = inverterOptions as InversorHibrido[];

            return (
              <>
                {availableInverters.map((inv) => {
                  const kw = inv.potencia_ac_nominal / 1000;
                  const covers = kw >= minInverterKW;
                  const isRec =
                    covers &&
                    inv.id ===
                      availableInverters.find(
                        (i) => i.potencia_ac_nominal / 1000 >= minInverterKW,
                      )?.id;
                  return (
                    <InverterCard
                      key={inv.id}
                      inv={inv}
                      isSelected={resolvedInverterId === inv.id}
                      isRecommended={isRec}
                      isSuperior={covers && !isRec}
                      isInsufficient={!covers}
                      minInverterKW={minInverterKW}
                      onClick={() => setSelectedInverterId(inv.id)}
                    />
                  );
                })}
              </>
            );
          })()}

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
                isSelected={resolvedInverterId === inv.id}
                isRecommended={isRec}
                isSuperior={covers && !isRec}
                isInsufficient={!covers}
                minInverterKW={minInverterKW}
                onClick={() => setSelectedInverterId(inv.id)}
              />
            );
          })}
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* INVERTER — off-grid (separados con baterías, LV only) */}
      {/* ------------------------------------------------------------------ */}
      {useOffGridInverter && !hvIncompatiblePath && (
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
                isSelected={resolvedInverterId === inv.id}
                isRecommended={isRec}
                isSuperior={covers && !isRec}
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
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400 flex-1 min-w-0">
                Cables, soportes, protecciones (~18%)
              </span>
              <span className="font-medium text-gray-800 dark:text-white flex-shrink-0">
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
