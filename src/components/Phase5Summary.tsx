"use client";
// src/components/Phase5Summary.tsx
// Final shopping list — what to buy, how many, estimated cost.
// Print-ready and mobile-first.

import React from "react";
import { useProject } from "@/context/ProjectContext";
import { MODALITY_INFO } from "@/constants/system";

import panelesMono from "@/data/paneles_monofaciales.json";
import panelesBi   from "@/data/paneles_bifaciales.json";
import bateriasData from "@/data/baterias.json";
import inversoresHib from "@/data/inversores_hibridos.json";
import inversoresRed from "@/data/inversores_red.json";
import modulosSep from "@/data/modulos_separados.json";
import proteccionesData from "@/data/protecciones.json";
import type {
  Panel, Bateria, InversorHibrido, InversorRed, ControladorMPPT, InversorOffGrid, Proteccion,
} from "@/types/catalog.types";

const ALL_PROT = proteccionesData as Proteccion[];

// ---------------------------------------------------------------------------
// Catalog lookups
// ---------------------------------------------------------------------------

const ALL = [
  ...(panelesMono  as unknown as Panel[]),
  ...(panelesBi    as unknown as Panel[]),
  ...(bateriasData as unknown as Bateria[]),
  ...(inversoresHib as unknown as InversorHibrido[]),
  ...(inversoresRed as unknown as InversorRed[]),
  ...(modulosSep   as unknown as (ControladorMPPT | InversorOffGrid)[]),
] as unknown as { id: string; nombre: string; [k: string]: unknown }[];

function byId(id: string) { return ALL.find((c) => c.id === id) ?? null; }

// ---------------------------------------------------------------------------
// Modality installation notes
// ---------------------------------------------------------------------------

const MODALITY_INSTALL_NOTES: Record<string, string[]> = {
  autoconsumo_sin_baterias: [
    "Conecta el inversor entre el cuadro eléctrico y la red. No se necesita batería.",
    "Avisa a tu distribuidora eléctrica de la nueva instalación de autoconsumo.",
    "Registra la instalación según el RD 244/2019 para acogerte a la compensación de excedentes.",
  ],
  autoconsumo_0_inyeccion: [
    "Instala el sensor CT clamp en la acometida para medir el consumo en tiempo real.",
    "Configura el parámetro 'Limitación de inyección = 0 W' en el inversor.",
    "Con este modo NO hay vertido a la red — el inversor reduce producción si el consumo baja.",
  ],
  autoconsumo_con_baterias: [
    "Conecta las baterías según el esquema del fabricante del inversor (tensión de bus DC).",
    "Configura la estrategia de carga: prioridad solar → baterías → red.",
    "Registra la instalación según el RD 244/2019.",
  ],
  aislada: [
    "Instala un cuadro DC con fusibles y seccionador entre paneles e inversor/MPPT.",
    "Instala un cuadro AC con protecciones para las cargas de la instalación.",
    "Configura el inversor en modo isla (off-grid). Sin conexión a la red pública.",
    "Dimensiona el generador de respaldo (opcional) para periodos de baja radiación prolongados.",
  ],
  respaldo_ups: [
    "Activa la función EPS/bypass en el inversor para conmutación automática.",
    "El tiempo de conmutación típico es < 20 ms — compatible con la mayoría de equipos sensibles.",
    "Las baterías se cargan de la red en días normales y del sol cuando hay radiación.",
    "Define qué cargas quieres respaldar y conéctalas al circuito EPS del inversor.",
  ],
};

// ---------------------------------------------------------------------------
// Panel tilt diagram (SVG side-view)
// ---------------------------------------------------------------------------

interface TiltDiagramProps {
  tiltDeg: number;
  panelHeightAlongSlopeM: number; // dimension going up the slope
  bottomEdgeM: number;
  orientation: "portrait" | "landscape";
}

function PanelTiltDiagram({ tiltDeg, panelHeightAlongSlopeM, bottomEdgeM, orientation }: TiltDiagramProps) {
  const θ = (Math.max(5, Math.min(85, tiltDeg)) * Math.PI) / 180;
  const H = panelHeightAlongSlopeM;
  const hRise = H * Math.sin(θ);
  const hProj = H * Math.cos(θ);
  const topEdgeM = bottomEdgeM + hRise;

  // Adaptive scale: fit in ~260 x 220 px drawing area
  const scale = Math.min(160 / (topEdgeM + 0.35), 220 / (hProj + 0.7));

  const padLeft  = 80;  // room for left dimension labels
  const padRight = 70;  // room for right dimension labels
  const padTop   = 20;
  const padBot   = 40;  // room for ground hatching + angle label

  const drawW = (hProj + 0.7) * scale;
  const drawH = (topEdgeM + 0.35) * scale;
  const svgW  = drawW + padLeft + padRight;
  const svgH  = drawH + padTop  + padBot;

  // SVG coords: y=0 top, y increases downward
  const groundY = svgH - padBot;

  // Panel bottom-edge point
  const bx = padLeft + 0.2 * scale;
  const by = groundY - bottomEdgeM * scale;

  // Panel top-edge point
  const tx = bx + hProj * scale;
  const ty = by - hRise * scale;

  // Panel thickness (visual): 40 mm
  const thick = 0.04 * scale;
  const sin_θ = Math.sin(θ);
  const cos_θ = Math.cos(θ);
  // Back-face offset direction (perpendicular pointing downward-right)
  const dpx = sin_θ;
  const dpy = cos_θ;

  const pts = [
    `${bx.toFixed(1)},${by.toFixed(1)}`,
    `${tx.toFixed(1)},${ty.toFixed(1)}`,
    `${(tx + dpx * thick).toFixed(1)},${(ty + dpy * thick).toFixed(1)}`,
    `${(bx + dpx * thick).toFixed(1)},${(by + dpy * thick).toFixed(1)}`,
  ].join(" ");

  // Dimension line positions
  const dimLeftX  = padLeft - 12;
  const dimRightX = tx + padRight * 0.6;

  // Angle arc
  const arcR = Math.min(32, hProj * scale * 0.45);
  const arcX = bx + arcR;
  const arcY = by - arcR * Math.sin(θ) * 0.0; // start on horizontal
  // Arc from horizontal (bx+arcR, by) counter-clockwise to panel direction
  const arcEx = bx + arcR * cos_θ;
  const arcEy = by - arcR * sin_θ;

  const fmtM = (v: number) => `${v.toFixed(2)} m`;

  return (
    <svg
      viewBox={`0 0 ${svgW.toFixed(1)} ${svgH.toFixed(1)}`}
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label={`Diagrama de inclinación. Ángulo ${tiltDeg}°, borde inferior ${fmtM(bottomEdgeM)}, borde superior ${fmtM(topEdgeM)}`}
    >
      <defs>
        <marker id="arrowU" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,6 L3,0 L6,6" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </marker>
        <marker id="arrowD" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L3,6 L6,0" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </marker>
      </defs>

      {/* Ground hatching */}
      {[...Array(16)].map((_, i) => (
        <line key={i}
          x1={i * 22} y1={groundY}
          x2={i * 22 - 11} y2={groundY + 14}
          stroke="#9ca3af" strokeWidth={1.1}
        />
      ))}
      {/* Ground line */}
      <line x1={0} y1={groundY} x2={svgW} y2={groundY} stroke="#4b5563" strokeWidth={2.5} />

      {/* Vertical dotted lines from panel edges to ground */}
      <line x1={bx} y1={by} x2={bx} y2={groundY}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={tx} y1={ty} x2={tx} y2={groundY}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />

      {/* Panel (blue rectangle) */}
      <polygon points={pts} fill="#3b82f6" fillOpacity={0.75} stroke="#1e40af" strokeWidth={1.5} />

      {/* Solar-cell grid lines on panel (decorative) */}
      {[0.25, 0.5, 0.75].map((t) => {
        const lx1 = bx + t * hProj * scale;
        const ly1 = by - t * hRise * scale;
        return (
          <line key={t}
            x1={lx1} y1={ly1}
            x2={lx1 + dpx * thick} y2={ly1 + dpy * thick}
            stroke="#93c5fd" strokeWidth={0.8}
          />
        );
      })}

      {/* === h_bottom dimension (left side) === */}
      {/* Tick at ground level */}
      <line x1={dimLeftX - 4} y1={groundY} x2={dimLeftX + 4} y2={groundY} stroke="#dc2626" strokeWidth={1.5} />
      {/* Tick at bottom edge */}
      <line x1={dimLeftX - 4} y1={by} x2={dimLeftX + 4} y2={by} stroke="#dc2626" strokeWidth={1.5} />
      {/* Arrow line */}
      <line x1={dimLeftX} y1={groundY - 2} x2={dimLeftX} y2={by + 2}
        stroke="#dc2626" strokeWidth={1.5} strokeDasharray="none" />
      {/* Label */}
      <text
        x={dimLeftX - 6} y={(groundY + by) / 2 + 4}
        textAnchor="end" fontSize={10} fill="#dc2626" fontWeight="600"
      >
        {fmtM(bottomEdgeM)}
      </text>
      <text
        x={dimLeftX - 6} y={(groundY + by) / 2 - 6}
        textAnchor="end" fontSize={9} fill="#dc2626"
      >
        h↓
      </text>

      {/* === h_top dimension (right side) === */}
      {/* Tick at ground level */}
      <line x1={dimRightX - 4} y1={groundY} x2={dimRightX + 4} y2={groundY} stroke="#16a34a" strokeWidth={1.5} />
      {/* Tick at top edge */}
      <line x1={dimRightX - 4} y1={ty} x2={dimRightX + 4} y2={ty} stroke="#16a34a" strokeWidth={1.5} />
      {/* Arrow line */}
      <line x1={dimRightX} y1={groundY - 2} x2={dimRightX} y2={ty + 2}
        stroke="#16a34a" strokeWidth={1.5} />
      {/* Label */}
      <text
        x={dimRightX + 6} y={(groundY + ty) / 2 + 4}
        textAnchor="start" fontSize={10} fill="#16a34a" fontWeight="600"
      >
        {fmtM(topEdgeM)}
      </text>
      <text
        x={dimRightX + 6} y={(groundY + ty) / 2 - 6}
        textAnchor="start" fontSize={9} fill="#16a34a"
      >
        h↑
      </text>

      {/* === Angle arc === */}
      <path
        d={`M ${(bx + arcR).toFixed(1)} ${by.toFixed(1)} A ${arcR} ${arcR} 0 0 0 ${arcEx.toFixed(1)} ${arcEy.toFixed(1)}`}
        fill="none" stroke="#f59e0b" strokeWidth={1.5}
      />
      <text
        x={(bx + arcR * (cos_θ + 1) * 0.5 + 4).toFixed(1)}
        y={(by - arcR * sin_θ * 0.5 + 3).toFixed(1)}
        fontSize={10} fill="#d97706" fontWeight="600"
      >
        {tiltDeg}°
      </text>

      {/* === Orientation label above panel === */}
      <text
        x={((bx + tx) / 2).toFixed(1)} y={(ty - 8).toFixed(1)}
        textAnchor="middle" fontSize={10} fill="#1d4ed8" fontWeight="700"
      >
        {orientation === "portrait" ? "↕ Vertical" : "↔ Horizontal"}
      </text>

      {/* === horizontal projection label === */}
      <text
        x={((bx + tx) / 2).toFixed(1)} y={(groundY + padBot * 0.65).toFixed(1)}
        textAnchor="middle" fontSize={9} fill="#6b7280"
      >
        proyección: {fmtM(hProj)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-gray-500 dark:text-gray-400 text-sm">{label}</span>
      <span className="font-medium text-gray-800 dark:text-white text-sm text-right max-w-[55%] break-words">{value}</span>
    </div>
  );
}

function Block({ title, color = "gray", children }: {
  title: string;
  color?: "gray" | "orange" | "green" | "blue" | "purple" | "emerald";
  children: React.ReactNode;
}) {
  const border = { gray: "border-gray-200 dark:border-gray-700", orange: "border-orange-200 dark:border-orange-800", green: "border-green-200 dark:border-green-800", blue: "border-blue-200 dark:border-blue-800", purple: "border-purple-200 dark:border-purple-800", emerald: "border-emerald-200 dark:border-emerald-800" }[color];
  const header = { gray: "bg-gray-50 dark:bg-gray-800", orange: "bg-orange-50 dark:bg-orange-900/20", green: "bg-green-50 dark:bg-green-900/20", blue: "bg-blue-50 dark:bg-blue-900/20", purple: "bg-purple-50 dark:bg-purple-900/20", emerald: "bg-emerald-50 dark:bg-emerald-900/20" }[color];
  return (
    <div className={`border ${border} rounded-xl overflow-hidden mb-5 print:mb-4 print:break-inside-avoid`}>
      <div className={`${header} px-4 py-2.5 font-bold text-gray-800 dark:text-white text-sm`}>{title}</div>
      <div className="bg-white dark:bg-gray-800/50 px-4 py-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props { onReset: () => void; }

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Phase5Summary: React.FC<Props> = ({ onReset }) => {
  const { data, reset } = useProject();

  const { location, consumption, installationType, hasBatteries, panelType, installationModality,
          solarCalc, selectedComponents, systemType, panelBottomEdgeHeightM } = data;

  const needsBatteries = (hasBatteries ?? true) || installationType === "off-grid";

  const panel   = selectedComponents?.panelId   ? byId(selectedComponents.panelId)   : null;
  const battery = selectedComponents?.batteryId ? byId(selectedComponents.batteryId) : null;
  const inverter = selectedComponents?.inverterId ? byId(selectedComponents.inverterId) : null;
  const mppt    = selectedComponents?.mpptId    ? byId(selectedComponents.mpptId)    : null;

  const modalityInfo = installationModality ? MODALITY_INFO[installationModality] : null;
  const installNotes = installationModality ? (MODALITY_INSTALL_NOTES[installationModality] ?? []) : [];

  const costEst = solarCalc?.costEstimate;

  // ---------------------------------------------------------------------------
  // Protection elements auto-selection
  // ---------------------------------------------------------------------------
  const protecciones = React.useMemo(() => {
    if (!selectedComponents || !solarCalc) return [];
    const isc = ((panel as unknown) as { isc?: number })?.isc ?? 10;
    const numStrings = selectedComponents.stringConfig?.parallelStrings ?? 1;
    const vocString = selectedComponents.stringConfig?.stringVoltageVoc ?? 500;
    const inverterKw = solarCalc.minInverterKW ?? 3;
    const isTrifasico = (data.inverterPhases ?? 1) === 3;
    const inverterAcA = isTrifasico
      ? (inverterKw * 1000) / (400 * 1.732)
      : (inverterKw * 1000) / 230;
    const fuseA = Math.ceil(isc * 1.25 / 5) * 5;
    const secA = Math.min(100, Math.ceil(isc * numStrings * 1.25 / 10) * 10);

    const pick = <T extends Proteccion>(
      tipo: string,
      pred: (p: T) => boolean,
      fallback?: (arr: T[]) => T,
    ): T | null => {
      const arr = ALL_PROT.filter((p) => p.tipo === tipo) as T[];
      const found = arr.find(pred);
      return found ?? (fallback ? fallback(arr) : arr[0] ?? null);
    };

    const items: { item: Proteccion; qty: number; unit: string; nota: string }[] = [];

    // DC fusibles — one per string (+2 spare)
    const fuse = pick<Proteccion>("fusible_dc", (p) => (p.amperaje ?? 0) >= fuseA && (p.tension_max ?? 0) >= vocString);
    if (fuse) items.push({ item: fuse, qty: numStrings * 2, unit: "uds.", nota: `${numStrings} strings × 2 polos` });

    // DC seccionador
    const sec = pick<Proteccion>("seccionador_dc", (p) => (p.amperaje ?? 0) >= secA && (p.tension_max ?? 0) >= vocString);
    if (sec) items.push({ item: sec, qty: 1, unit: "ud.", nota: "Cuadro DC paneles" });

    // SPD DC
    const spdDc = pick<Proteccion>("spd_dc", (p) => (p.tension_max ?? 0) >= vocString);
    if (spdDc) items.push({ item: spdDc, qty: 1, unit: "ud.", nota: "Protección rayos DC" });

    // AC magnetotérmico
    const magA = Math.ceil(inverterAcA * 1.25 / 5) * 5;
    const mag = pick<Proteccion>("magnetotermico_ac", (p) => (p.amperaje ?? 0) >= magA && (p.polos ?? 1) === (isTrifasico ? 3 : 1));
    if (mag) items.push({ item: mag, qty: 1, unit: "ud.", nota: `${inverterKw.toFixed(1)} kW → ${magA}A` });

    // AC diferencial
    const dif = pick<Proteccion>("diferencial_ac", (p) => (p.amperaje ?? 0) >= magA && (p.polos ?? 2) === (isTrifasico ? 4 : 2));
    if (dif) items.push({ item: dif, qty: 1, unit: "ud.", nota: "30mA Tipo A" });

    // SPD AC
    const spdAc = pick<Proteccion>("spd_ac", (p) => (p.polos ?? 1) === (isTrifasico ? 3 : 1));
    if (spdAc) items.push({ item: spdAc, qty: 1, unit: "ud.", nota: "Protección rayos AC" });

    // Cable DC 6mm² (always a safe default)
    const cabDc = ALL_PROT.find((p) => p.tipo === "cable_dc" && (p as Proteccion).seccion_mm2 === 6) as Proteccion | undefined;
    if (cabDc) items.push({ item: cabDc, qty: 1, unit: "rollo 100m", nota: "Positivo + negativo DC" });

    // Cable AC
    const cabAc = pick<Proteccion>("cable_ac", (p) => (p.corriente_max ?? 0) >= inverterAcA && (p.fases ?? 1) === (isTrifasico ? 3 : 1));
    if (cabAc) items.push({ item: cabAc, qty: 1, unit: "rollo 50m", nota: "Cuadro AC" });

    // Monitor
    const mon = ALL_PROT.find((p) => p.tipo === "monitorizacion" && !(p as Proteccion).display) as Proteccion | undefined;
    if (mon) items.push({ item: mon, qty: 1, unit: "ud.", nota: "App móvil" });

    // Puesta a tierra
    const cabTie = ALL_PROT.find((p) => p.tipo === "puesta_tierra" && (p as Proteccion).seccion_mm2 === 16) as Proteccion | undefined;
    if (cabTie) items.push({ item: cabTie, qty: 1, unit: "rollo 50m", nota: "Tierra estructura + equipos" });
    const pica = ALL_PROT.find((p) => p.tipo === "puesta_tierra" && (p as Proteccion).longitud_m) as Proteccion | undefined;
    if (pica) items.push({ item: pica, qty: 1, unit: "ud.", nota: "Electrodo de tierra" });

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComponents, solarCalc, panel, data.inverterPhases]);

  const systemTypeLabel: Record<string, string> = {
    hibrido: "Híbrido", separados: "Componentes separados",
  };

  const dateStr = new Date().toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="max-w-lg mx-auto px-2 py-2 print:max-w-full print:px-6 print:py-4">

      {/* Print-only header */}
      <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-gray-300">
        <h1 className="text-2xl font-bold">🌞 JR's SolarCalc — Lista de Compra</h1>
        <p className="text-sm text-gray-500 mt-1">Generado el {dateStr}</p>
      </div>

      {/* Screen header */}
      <div className="text-center mb-6 print:hidden">
        <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-5 py-2 mb-3">
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">✅ Fase 5</span>
          <span className="text-emerald-600 dark:text-emerald-300 font-medium">Lista de compra</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Lleva esta lista a la tienda para comprar los componentes
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero KPIs */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
            {selectedComponents?.numPanels ?? solarCalc?.numPanels ?? "—"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Paneles</div>
        </div>
        {needsBatteries && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {selectedComponents?.numBatteries ?? "—"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Baterías</div>
          </div>
        )}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {solarCalc?.hsp ?? "—"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">HSP h/día</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {solarCalc ? solarCalc.annualGenerationKWh.toFixed(0) : "—"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">kWh/año est.</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Installation summary */}
      {/* ------------------------------------------------------------------ */}
      <Block title="📋 Resumen de la instalación" color="blue">
        {modalityInfo && (
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${modalityInfo.bgClass} ${modalityInfo.textClass} text-sm font-medium`}>
            <span>{modalityInfo.icon}</span>
            <span>{modalityInfo.label}</span>
          </div>
        )}
        {location?.locationName && <Row label="Ubicación" value={location.locationName} />}
        {location && (
          <Row label="Coordenadas" value={`${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`} />
        )}
        <Row label="Consumo mensual" value={`${consumption?.monthlyKWh ?? "—"} kWh/mes`} />
        <Row label="Consumo diario" value={consumption ? `${(consumption.monthlyKWh / 30).toFixed(1)} kWh/día` : "—"} />
        {needsBatteries && consumption && (
          <Row label="Autonomía" value={`${consumption.autonomyDays} días`} />
        )}
        <Row label="Tipo de panel" value={panelType === "monofacial" ? "Monofacial" : "Bifacial"} />
        <Row label="Sistema" value={systemTypeLabel[systemType ?? "hibrido"] ?? "—"} />
        {solarCalc && (
          <>
            <Row label="HSP" value={`${solarCalc.hsp} h/día`} />
            <Row label="Potencia necesaria" value={`${(solarCalc.requiredPowerWp / 1000).toFixed(2)} kWp`} />
            <Row label="Generación anual est." value={`${solarCalc.annualGenerationKWh.toFixed(0)} kWh/año`} />
          </>
        )}
      </Block>

      {/* ------------------------------------------------------------------ */}
      {/* Shopping list */}
      {/* ------------------------------------------------------------------ */}
      <Block title="🛒 Lista de componentes a comprar" color="emerald">
        <div className="space-y-4">

          {/* Panel */}
          {panel && selectedComponents && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <span className="text-2xl flex-shrink-0">🔆</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white text-sm truncate">{panel.nombre}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {panel.potencia_pmax as number} Wp · {panel.tecnologia as string} · {panel.eficiencia as number}% efic.
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {panel.ancho_mm as number} × {panel.alto_mm as number} mm · {panel.peso_kg as number} kg
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Garantía: {panel.garantia_producto as number}a producto / {panel.garantia_potencia as number}a potencia
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">×{selectedComponents.numPanels}</div>
                <div className="text-[10px] text-gray-400">unidades</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {((panel.superficie_m2 as number) * selectedComponents.numPanels).toFixed(1)} m²
                </div>
              </div>
            </div>
          )}

          {/* Battery */}
          {needsBatteries && battery && selectedComponents && (() => {
            const isModularTow = (battery.tipo as string) === "lifepo4_hv" && (battery.tension_nominal as number) < 200;
            const towers = selectedComponents.batteryTowersCount ?? 1;
            const totalMods = selectedComponents.numBatteries ?? 1;
            const kwh_ud = battery.capacidad_util_kwh as number;
            const totalKwh = (kwh_ud * totalMods).toFixed(1);
            const unitLabel = isModularTow ? `${totalMods} mód.` : `×${totalMods}`;
            const subLabel = isModularTow ? `${towers} BMS · ${totalKwh} kWh` : "unidades";
            return (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <span className="text-2xl flex-shrink-0">🔋</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 dark:text-white text-sm truncate">{battery.nombre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {kwh_ud} kWh útiles · {battery.tension_nominal as number} V
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(battery.ciclos_vida_80dod as number).toLocaleString()} ciclos · {battery.eficiencia_carga_descarga as number}% efic.
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Garantía: {battery.garantia as number} años</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">{unitLabel}</div>
                  <div className="text-[10px] text-gray-400">{subLabel}</div>
                  {!isModularTow && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{totalKwh} kWh útiles</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Inverter */}
          {inverter && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <span className="text-2xl flex-shrink-0">⚡</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white text-sm truncate">{inverter.nombre}</div>
                {(inverter.potencia_ac_nominal as number) > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {((inverter.potencia_ac_nominal as number) / 1000).toFixed(1)} kW AC
                    {(inverter.mppt_numero as number) > 0 && ` · ${inverter.mppt_numero as number} MPPTs`}
                  </div>
                )}
                {(inverter.potencia_nominal as number) > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {((inverter.potencia_nominal as number) / 1000).toFixed(1)} kW · {inverter.forma_onda as string}
                  </div>
                )}
                {(inverter.eficiencia_max as number) > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{inverter.eficiencia_max as number}% efic. máx.</div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">×1</div>
                <div className="text-[10px] text-gray-400">unidad</div>
              </div>
            </div>
          )}

          {/* MPPT controller */}
          {mppt && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <span className="text-2xl flex-shrink-0">🎛️</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 dark:text-white text-sm truncate">{mppt.nombre}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {mppt.corriente_max_salida as number}A · Vdc máx. {mppt.tension_entrada_max as number}V
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">×1</div>
                <div className="text-[10px] text-gray-400">unidad</div>
              </div>
            </div>
          )}
        </div>
      </Block>

      {/* ------------------------------------------------------------------ */}
      {/* Shopping list with prices */}
      {/* ------------------------------------------------------------------ */}
      {selectedComponents && (() => {
        const isAislada = installationModality === "aislada";
        const EXPLAIN: Record<string, string> = {
          panel:                  "Captan la luz solar y la convierten en electricidad DC.",
          battery:                "Almacenan la energía sobrante para usarla de noche o en días nublados.",
          mppt:                   "Regula la carga de las baterías desde los paneles y maximiza la energía captada.",
          inverter_hibrido:       "Cerebro de la instalación: convierte DC en AC 230V, gestiona baterías y red eléctrica.",
          inverter_hibrido_isla:  "Cerebro de la instalación aislada: convierte DC en AC 230V y gestiona baterías en modo isla, sin necesidad de red eléctrica.",
          inverter_offgrid:       "Convierte la corriente DC de las baterías en AC 230V para alimentar tus electrodomésticos.",
          inverter_red:           "Convierte la corriente DC de los paneles en AC 230V y vuelca la producción solar a la red eléctrica.",
        };

        type LineItem = { label: string; explain: string; qty: number; unit: string; precioUd: number | null; total: number | null };
        const lines: LineItem[] = [];

        const panelObj   = panel   as (Panel   & { precio_ud?: number }) | null;
        const battObj    = battery as (Bateria & { precio_ud?: number }) | null;
        const invObj     = inverter as ({ precio_ud?: number; nombre?: string }) | null;
        const mpptObj    = mppt    as ({ precio_ud?: number; nombre?: string }) | null;

        if (panelObj) {
          const qty = selectedComponents.numPanels ?? 1;
          const pud = panelObj.precio_ud ?? null;
          lines.push({ label: panelObj.nombre, explain: EXPLAIN.panel, qty, unit: "uds.", precioUd: pud, total: pud ? pud * qty : null });
        }
        if (mpptObj) {
          const pud = mpptObj.precio_ud ?? null;
          lines.push({ label: (mpptObj as {nombre?:string}).nombre ?? "Controlador MPPT", explain: EXPLAIN.mppt, qty: 1, unit: "ud.", precioUd: pud, total: pud });
        }
        if (needsBatteries && battObj) {
          const totalModules = selectedComponents.numBatteries ?? 1;
          const pud = battObj.precio_ud ?? null;
          const kwh_ud = battObj.capacidad_util_kwh as number;
          const isHVBatt = (battObj.tipo as string) === "lifepo4_hv";
          const isModularTower = isHVBatt && (battObj.tension_nominal as number) < 200;
          if (isModularTower) {
            const seriesPerTower = selectedComponents.batterySeriesPerTower ?? totalModules;
            const towers = selectedComponents.batteryTowersCount ?? 1;
            const totalKwh = (kwh_ud * totalModules).toFixed(1);
            const kwhExplain = towers === 1
              ? `${kwh_ud} kWh/mód. × ${seriesPerTower} mód. en serie = ${totalKwh} kWh · 1 torre`
              : `${kwh_ud} kWh/mód. × ${seriesPerTower} mód./torre × ${towers} torres = ${totalKwh} kWh`;
            lines.push({ label: battObj.nombre, explain: kwhExplain, qty: totalModules, unit: "mód.", precioUd: pud, total: pud ? pud * totalModules : null });
          } else {
            const totalKwh = (kwh_ud * totalModules).toFixed(1);
            const hvTag = isHVBatt ? ` · ${battObj.tension_nominal as number}V HV` : "";
            const kwhExplain = `${kwh_ud} kWh/ud × ${totalModules} = ${totalKwh} kWh útiles${hvTag}`;
            lines.push({ label: battObj.nombre, explain: kwhExplain, qty: totalModules, unit: "uds.", precioUd: pud, total: pud ? pud * totalModules : null });
          }
        }
        if (invObj) {
          const invTipo = (invObj as { tipo?: string }).tipo;
          const explainKey = invTipo === "hibrido" && isAislada ? "inverter_hibrido_isla"
            : invTipo === "hibrido" ? "inverter_hibrido"
            : invTipo === "red" ? "inverter_red"
            : "inverter_offgrid";
          const pud = invObj.precio_ud ?? null;
          lines.push({ label: (invObj as {nombre?:string}).nombre ?? "Inversor", explain: EXPLAIN[explainKey], qty: 1, unit: "ud.", precioUd: pud, total: pud });
        }

        const protLines = protecciones.map(({ item, qty, unit, nota }) => {
          const pud = item.precio_ud ?? item.precio_m ?? null;
          return { label: item.nombre, explain: nota, qty, unit, precioUd: pud, total: pud ? pud * qty : null };
        });

        // Estructura soporte (~8% del total componentes principales)
        const mainTotal = lines.reduce((s, l) => s + (l.total ?? 0), 0);
        const estructuraCost = Math.round(mainTotal * 0.08);
        const manoCost = Math.round(mainTotal * 0.18);

        const protTotal  = protLines.reduce((s, l) => s + (l.total ?? 0), 0);
        const grandTotal = mainTotal + protTotal + estructuraCost + manoCost;

        return (
          <Block title="🛒 Lista de compra completa" color="purple">
            {/* Disclaimer */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              ⚠️ <strong>Precios estimados</strong> — valores orientativos de mercado (sin IVA, IGIC). Los precios reales varían según proveedor, marca y fecha. Solicita presupuesto a un instalador certificado.
            </div>

            {/* Main components */}
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Componentes principales</p>
            <div className="space-y-2 mb-4">
              {lines.map((l, i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight truncate">{l.label}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 break-words">{l.explain}</p>
                    </div>
                    <div className="flex-shrink-0 text-right ml-2">
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">{l.qty} {l.unit}</p>
                      {l.total !== null && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium whitespace-nowrap">
                          ~{l.total.toLocaleString("es-ES")} €
                        </p>
                      )}
                      {l.qty > 1 && l.precioUd && (
                        <p className="text-[10px] text-gray-400 font-normal whitespace-nowrap">({l.precioUd} €/ud)</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* HV battery cost warning when many complete packs needed */}
            {needsBatteries && battObj && (battObj.tipo as string) === "lifepo4_hv" && (battObj.tension_nominal as number) >= 200 && (selectedComponents.numBatteries ?? 0) > 2 && (() => {
              const qty = selectedComponents.numBatteries ?? 0;
              const kwh_ud = battObj.capacidad_util_kwh as number;
              const totalKwh = (kwh_ud * qty).toFixed(1);
              const pud = battObj.precio_ud as number | null;
              const voltaje = battObj.tension_nominal as number;
              return (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-xs">
                  <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                    ⚠️ Batería HV {voltaje}V — {qty} unidades ({totalKwh} kWh)
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 mb-2">
                    Las baterías HV de alta capacidad integran electrónica de potencia interna, lo que las hace más caras por kWh que las LV (48V). Con {qty} unidades el coste es elevado.{pud ? ` Precio/ud: ${pud.toLocaleString("es-ES")} €.` : ""}
                  </p>
                  <p className="text-amber-600 dark:text-amber-500">
                    💡 Si tu inversor lo permite, considera cambiar a sistema LV (48V): baterías Pylontech US5000 a ~1.300 €/ud ofrecen 4,77 kWh cada una, con un coste total muy inferior para la misma capacidad.
                  </p>
                </div>
              );
            })()}

            {/* Protections */}
            {protLines.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Protecciones y cableado (obligatorios)</p>
                <div className="space-y-1 mb-4">
                  {protLines.map((l, i) => (
                    <div key={i} className="flex justify-between items-start py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{l.label}</p>
                        {l.explain && <p className="text-[10px] text-gray-400 dark:text-gray-500">{l.explain}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{l.qty} {l.unit}</p>
                        {l.total !== null && <p className="text-[10px] text-purple-600 dark:text-purple-400">~{l.total.toLocaleString("es-ES")} €</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Structure + labor */}
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Otros costes</p>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Estructura de soporte</p>
                  <p className="text-[10px] text-gray-400">Raíles, tornillería y anclajes para fijar los paneles al tejado o suelo</p>
                </div>
                <p className="text-purple-600 dark:text-purple-400 font-medium flex-shrink-0 whitespace-nowrap">~{estructuraCost.toLocaleString("es-ES")} €</p>
              </div>
              <div className="flex justify-between gap-2 py-1.5 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Mano de obra instalación</p>
                  <p className="text-[10px] text-gray-400">Instalador certificado (obligatorio para legalización)</p>
                </div>
                <p className="text-purple-600 dark:text-purple-400 font-medium flex-shrink-0 whitespace-nowrap">~{manoCost.toLocaleString("es-ES")} €</p>
              </div>
            </div>

            {/* Grand total */}
            <div className="rounded-xl bg-purple-600 dark:bg-purple-700 p-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">Total estimado</p>
                  <p className="text-[10px] text-purple-200">Sin IVA · precios orientativos</p>
                </div>
                <p className="font-bold text-2xl">{grandTotal.toLocaleString("es-ES")} €</p>
              </div>
              {costEst?.annualSavingsEur && costEst.annualSavingsEur > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-500 flex justify-between text-sm">
                  <span className="text-purple-200">Ahorro est. anual</span>
                  <span className="font-semibold">{costEst.annualSavingsEur.toLocaleString("es-ES")} €/año</span>
                </div>
              )}
              {costEst?.paybackYears && costEst.paybackYears > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-purple-200">Amortización estimada</span>
                  <span className="font-semibold">~{costEst.paybackYears} años</span>
                </div>
              )}
            </div>
          </Block>
        );
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* Orientation */}
      {/* ------------------------------------------------------------------ */}
      {location?.magneticSouth && (
        <Block title="🧭 Orientación de los paneles" color="orange">
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            Orienta los paneles hacia el <strong>sur geográfico</strong> usando el azimut magnético calculado.
          </div>
          <Row label="Azimut magnético sur" value={`${location.magneticSouth.toFixed(1)}°`} />
          {location.magneticDeclination !== undefined && (
            <Row label="Declinación magnética" value={`${location.magneticDeclination.toFixed(2)}° ${location.declinationDirection ?? ""}`} />
          )}
          <Row label="Sur geográfico" value={`${location.geographicSouth ?? 180}°`} />
          {location.altitude !== undefined && (
            <Row label="Altitud" value={`${location.altitude} m`} />
          )}
        </Block>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Panel tilt diagram */}
      {/* ------------------------------------------------------------------ */}
      {selectedComponents && panel && (() => {
        const orientation = selectedComponents.panelOrientation ?? "portrait";
        // ancho_mm = long side, alto_mm = short side (JSON convention)
        const longMm  = panel.ancho_mm as number;
        const shortMm = panel.alto_mm  as number;
        // Portrait: long side vertical → height along slope = long side
        const heightPortraitM  = longMm  / 1000;
        // Landscape: short side vertical → height along slope = short side
        const heightLandscapeM = shortMm / 1000;

        const bottomEdge = panelBottomEdgeHeightM ?? 0.30;
        const tilt = solarCalc?.optimalTiltDeg
          ?? Math.round((location?.latitude ?? 37) * 0.9);
        const tiltRad = (tilt * Math.PI) / 180;
        const topEdgePortrait  = bottomEdge + heightPortraitM  * Math.sin(tiltRad);
        const topEdgeLandscape = bottomEdge + heightLandscapeM * Math.sin(tiltRad);

        // Row spacing (winter solstice, 10h solar time)
        const lat = location?.latitude ?? 37;
        const elevDeg = Math.max(5, 90 - lat - 23.45);
        const elevRad = (elevDeg * Math.PI) / 180;
        const pitchPortrait  = heightPortraitM  * (Math.cos(tiltRad) + Math.sin(tiltRad) / Math.tan(elevRad));
        const pitchLandscape = heightLandscapeM * (Math.cos(tiltRad) + Math.sin(tiltRad) / Math.tan(elevRad));
        const gapPortrait  = +(pitchPortrait  - heightPortraitM  * Math.cos(tiltRad)).toFixed(2);
        const gapLandscape = +(pitchLandscape - heightLandscapeM * Math.cos(tiltRad)).toFixed(2);

        const numPanels = selectedComponents.numPanels ?? 1;

        const cards = [
          {
            key: "portrait" as const,
            label: "↕ Vertical (retrato)",
            anchoMm: shortMm,
            altoMm:  longMm,
            height:  heightPortraitM,
            topEdge: topEdgePortrait,
            pitch:   pitchPortrait,
            gap:     gapPortrait,
            // Surface needed: numPanels × panel_width × row_pitch
            surfaceM2: +(numPanels * (shortMm / 1000) * pitchPortrait).toFixed(1),
          },
          {
            key: "landscape" as const,
            label: "↔ Horizontal (apaisado)",
            anchoMm: longMm,
            altoMm:  shortMm,
            height:  heightLandscapeM,
            topEdge: topEdgeLandscape,
            pitch:   pitchLandscape,
            gap:     gapLandscape,
            surfaceM2: +(numPanels * (longMm / 1000) * pitchLandscape).toFixed(1),
          },
        ];

        return (
          <Block title="📐 Diagrama de inclinación del panel" color="purple">
            <div className="mb-4 flex justify-center">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-2 text-center text-xs">
                <span className="text-gray-400">Inclinación óptima: </span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-base">{tilt}°</span>
                <span className="text-gray-400 ml-2">· Borde inferior: </span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{bottomEdge.toFixed(2)} m</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {cards.map((c) => {
                const isSelected = c.key === orientation;
                return (
                  <div
                    key={c.key}
                    className={`rounded-xl border-2 p-3 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-gray-800 dark:text-white">{c.label}</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                          Seleccionado
                        </span>
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg mb-3">
                      <PanelTiltDiagram
                        tiltDeg={tilt}
                        panelHeightAlongSlopeM={c.height}
                        bottomEdgeM={bottomEdge}
                        orientation={c.key}
                      />
                    </div>

                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ancho visible</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{c.anchoMm} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Alto en el plano</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{c.altoMm} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Borde inferior</span>
                        <span className="font-medium text-teal-600 dark:text-teal-400">{bottomEdge.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Borde superior</span>
                        <span className="font-medium text-purple-600 dark:text-purple-400">{c.topEdge.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Paso mín. entre filas</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">{c.pitch.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Espacio libre entre filas</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{c.gap} m</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                        <span className="text-gray-500 font-medium">Superficie necesaria</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{c.surfaceM2} m²</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              📏 Paso mínimo calculado sin sombras de 10h–14h · solsticio de invierno (21 dic) · lat. {lat.toFixed(1)}° · elev. solar ref. {elevDeg.toFixed(1)}°
            </p>
          </Block>
        );
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* String config */}
      {/* ------------------------------------------------------------------ */}
      {selectedComponents?.stringConfig && (
        <Block title="🔌 Configuración de string" color="blue">
          <Row label="Paneles en serie por string" value={`${selectedComponents.stringConfig.panelsInSeries}`} />
          <Row label="Strings por MPPT" value={`${selectedComponents.stringConfig.stringsPerMppt}`} />
          <Row label="Tensión Vmp del string" value={`${selectedComponents.stringConfig.stringVoltageVmp.toFixed(0)} V`} />
          <Row label="Tensión Voc del string" value={`${selectedComponents.stringConfig.stringVoltageVoc.toFixed(0)} V`} />
          <Row label="Total paneles configuración" value={`${selectedComponents.stringConfig.totalPanels} uds.`} />
          {selectedComponents.stringConfig.warning && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⚠ {selectedComponents.stringConfig.warning}</p>
          )}
        </Block>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Installation notes */}
      {/* ------------------------------------------------------------------ */}
      {installNotes.length > 0 && (
        <Block title="📝 Notas de instalación" color="gray">
          <ul className="space-y-2">
            {installNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-gray-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Actions */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 flex flex-col gap-3 pt-5 border-t border-gray-200 dark:border-gray-700 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => {
            const lines = [
              "=== LISTA DE COMPRA SOLAR ===",
              location?.locationName ? `Ubicación: ${location.locationName}` : "",
              modalityInfo ? `Modalidad: ${modalityInfo.label}` : "",
              `Consumo: ${consumption?.monthlyKWh ?? "—"} kWh/mes`,
              "",
              "COMPONENTES:",
              panel && selectedComponents ? `- ${panel.nombre} ×${selectedComponents.numPanels}` : "",
              needsBatteries && battery && selectedComponents ? `- ${battery.nombre} ×${selectedComponents.numBatteries}` : "",
              inverter ? `- ${inverter.nombre} ×1` : "",
              mppt ? `- ${mppt.nombre} ×1` : "",
              "",
              costEst ? `TOTAL ESTIMADO: ${costEst.totalCostEur.toLocaleString("es-ES")} €` : "",
            ].filter(Boolean).join("\n");
            navigator.clipboard.writeText(lines).then(() => alert("Lista copiada al portapapeles ✓"));
          }}
          className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          📋 Copiar lista al portapapeles
        </button>
        <button
          onClick={() => {
            if (window.confirm("¿Seguro que quieres empezar de nuevo? Se borrarán todos los datos.")) {
              reset();
              onReset();
            }
          }}
          className="w-full py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          🔄 Empezar de nuevo
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-5">
        ⚡ JR's SolarCalc v1.0 · Resumen generado el {dateStr}
      </p>
    </div>
  );
};

export default Phase5Summary;
