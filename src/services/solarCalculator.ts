// src/services/solarCalculator.ts
// Core solar PV dimensioning engine.

import type {
  Panel,
  InversorHibrido,
  StringConfig,
} from "@/types/catalog.types";
import { estimateHSP } from "@/services/pvgisService";
import type { InstallationModality } from "@/constants/system";

// Re-export for legacy imports in other components
export { estimateHSP as calculateHSP };
export { describeHSP as getHSPDescription } from "@/services/pvgisService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerformanceFactorBreakdown {
  wiring: number; // cable losses (%)
  inverter: number; // inverter/MPPT efficiency loss (%)
  temperature: number; // thermal derating (%)
  soiling: number; // dust/dirt (%)
  mismatch: number; // module mismatch (%)
  shading: number; // partial shading (%)
  total: number; // resulting PR = product of (1 - loss_i)
}

export interface SolarCalculationInput {
  latitude: number;
  monthlyKWh: number;
  panelWp: number;
  hasBatteries: boolean;
  autonomyDays: number;
  installationType: "on-grid" | "off-grid";
  installationModality?: InstallationModality;
  batteryUsefulCapacityKWh?: number;
  hspOverride?: number; // from PVGIS or manual entry
  performanceFactorOverride?: number; // 0-1, user-configurable
}

export interface SolarCalculationResult {
  hsp: number;
  hspSource: "pvgis" | "estimate" | "manual";
  dailyEnergyKWh: number;
  performanceFactor: number;
  performanceBreakdown: PerformanceFactorBreakdown;
  requiredPowerWp: number;
  numPanels: number;
  totalPanelPowerWp: number;
  annualGenerationKWh: number;
  batteryCapacityNeededKWh: number;
  numBatteries: number;
  minInverterKW: number;
  recommendedSystemType: "hibrido" | "separados";
  recommendationReason: string;
  needsBatteries: boolean;
  /** Extra items to buy/configure not covered by the main catalog */
  extraEquipment: string[];
  /** Plain-language note about what this modality means for the installation */
  modalityNote: string;
}

// ---------------------------------------------------------------------------
// Performance factor breakdown
// ---------------------------------------------------------------------------

/**
 * Default performance factor losses.
 * All values in % (0–100). Each loss degrades PR multiplicatively.
 */
export const DEFAULT_PR_LOSSES = {
  wiring: 2, // DC + AC wiring
  inverter: 3, // inverter conversion loss
  temperature: 5, // thermal derating (varies by climate)
  soiling: 3, // dust, pollen, bird droppings
  mismatch: 2, // cell/module manufacturing spread
  shading: 5, // inter-row / near-obstacle shading
} as const;

export type PRLossesInput = {
  wiring?: number;
  inverter?: number;
  temperature?: number;
  soiling?: number;
  mismatch?: number;
  shading?: number;
};

export function buildPerformanceFactor(
  overrides: PRLossesInput = {},
): PerformanceFactorBreakdown {
  const v = { ...DEFAULT_PR_LOSSES, ...overrides };
  const total =
    (1 - v.wiring / 100) *
    (1 - v.inverter / 100) *
    (1 - v.temperature / 100) *
    (1 - v.soiling / 100) *
    (1 - v.mismatch / 100) *
    (1 - v.shading / 100);
  return { ...v, total: parseFloat(total.toFixed(4)) };
}

// ---------------------------------------------------------------------------
// Temperature derating for panel voltage (string sizing)
// ---------------------------------------------------------------------------

/**
 * Typical cell temperature under STC is 25°C.
 * In summer, cells can reach 70°C → Voc decreases (coef < 0).
 * In winter, cells can drop to -10°C → Voc increases (risk of overvoltage).
 */
export function tempCorrectedVoltage(
  v_stc: number,
  coefPctPerDegC: number, // e.g. -0.28 %/°C
  cellTempC: number,
): number {
  return v_stc * (1 + (coefPctPerDegC / 100) * (cellTempC - 25));
}

// ---------------------------------------------------------------------------
// String configuration calculator
// ---------------------------------------------------------------------------

/**
 * Given a selected panel and hybrid inverter, calculate the optimal
 * series/parallel string configuration for each MPPT input.
 *
 * Rules:
 *   - Voc_cold × series ≤ Vmppt_max  (no overvoltage at cold temps)
 *   - Vmp_hot × series ≥ Vmppt_min   (MPPT tracking at hot temps)
 *   - Isc × parallel ≤ Isc_mppt_max  (no overcurrent per MPPT)
 */
/**
 * Given a selected panel and hybrid inverter, calculate the optimal
 * series/parallel string configuration for each MPPT input.
 *
 * When `requiredPanels` is provided the function finds the smallest
 * multiple of (panelsInSeries × stringsPerMppt × mpptCount) that is
 * ≥ requiredPanels, guaranteeing all strings have equal panel counts.
 */
export function calculateStringConfig(
  panel: Panel,
  inverter: InversorHibrido,
  requiredPanels?: number,
): StringConfig {
  const [vMin, vMax] = inverter.mppt_rango_voltaje;
  const iscMax = inverter.mppt_corriente_cortocircuito_max;
  const impMax = inverter.mppt_corriente_max;
  const numMppts = inverter.mppt_numero;
  const maxStringsPerMppt =
    inverter.strings_por_mppt > 0 ? inverter.strings_por_mppt : 2;

  // Temperature-corrected voltages
  const vocCold = tempCorrectedVoltage(
    panel.voc,
    panel.coeficiente_temperatura_voc,
    -10,
  );
  const vmpHot = tempCorrectedVoltage(
    panel.vmp,
    panel.coeficiente_temperatura_voc,
    70,
  );

  const seriesMax = Math.max(1, Math.floor(vMax / vocCold));
  const seriesMin = Math.max(1, Math.ceil(vMin / vmpHot));

  const parallelByIsc = Math.max(1, Math.floor(iscMax / panel.isc));
  const parallelByImp = Math.max(1, Math.floor(impMax / panel.imp));
  const maxParallelPerMppt = Math.min(
    parallelByIsc,
    parallelByImp,
    maxStringsPerMppt,
  );

  let panelsInSeries: number;
  let stringsPerMppt: number;

  if (requiredPanels && requiredPanels > 0) {
    // Find (series, parallel) combo that minimises total panels ≥ requiredPanels
    let bestSeries = seriesMax;
    let bestParallel = 1;
    let bestTotal = Infinity;

    for (let s = seriesMin; s <= seriesMax; s++) {
      for (let p = 1; p <= maxParallelPerMppt; p++) {
        const total = s * p * numMppts;
        if (total >= requiredPanels && total < bestTotal) {
          bestTotal = total;
          bestSeries = s;
          bestParallel = p;
        }
      }
    }
    // If no combo covers requiredPanels use maximum capacity
    if (bestTotal === Infinity) {
      bestSeries = seriesMax;
      bestParallel = maxParallelPerMppt;
    }

    panelsInSeries = bestSeries;
    stringsPerMppt = bestParallel;
  } else {
    // Original behaviour: max series, constrained parallel
    panelsInSeries = Math.max(seriesMin, Math.min(seriesMax, seriesMax));
    stringsPerMppt = Math.min(maxParallelPerMppt, maxStringsPerMppt);
  }

  const totalPanels = panelsInSeries * stringsPerMppt * numMppts;
  const stringVoltageVmp = panelsInSeries * panel.vmp;
  const stringVoltageVoc = panelsInSeries * panel.voc;
  const stringCurrent = panel.imp;
  const withinMpptRange = stringVoltageVmp >= vMin && stringVoltageVoc <= vMax;

  const warning = !withinMpptRange
    ? `El string de ${panelsInSeries} paneles (${stringVoltageVmp.toFixed(0)}V Vmp) puede salir del rango MPPT [${vMin}–${vMax}V].`
    : panelsInSeries < seriesMin
      ? `Tensión de string podría ser insuficiente en días muy calurosos.`
      : undefined;

  return {
    panelsInSeries,
    parallelStrings: stringsPerMppt,
    stringsPerMppt,
    totalPanels,
    stringVoltageVmp,
    stringVoltageVoc,
    stringCurrent,
    withinMpptRange,
    warning,
  };
}

// ---------------------------------------------------------------------------
// Main dimensioning engine
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Modality-specific metadata
// ---------------------------------------------------------------------------

const MODALITY_NOTES: Record<InstallationModality, string> = {
  autoconsumo_sin_baterias:
    "El sistema se conecta a la red. Produces durante el día y consumes de la red por la noche. Sin almacenamiento.",
  autoconsumo_0_inyeccion:
    "El inversor regula la producción para no superar tu consumo en cada momento. Requiere sensor CT clamp.",
  autoconsumo_con_baterias:
    "Produces y almacenas energía. La batería cubre la noche y la red actúa como respaldo.",
  aislada:
    "Sin conexión a la red. Las baterías son el único suministro cuando no hay sol. Dimensiona con margen.",
  respaldo_ups:
    "La red es tu fuente principal. Las baterías y paneles se activan automáticamente en caso de corte.",
};

export function calculateSolarSystem(
  input: SolarCalculationInput,
): SolarCalculationResult {
  const {
    latitude,
    monthlyKWh,
    panelWp,
    hasBatteries,
    autonomyDays,
    installationType,
    installationModality,
    batteryUsefulCapacityKWh = 4.1,
    hspOverride,
    performanceFactorOverride,
  } = input;

  const needsBatteries = hasBatteries || installationType === "off-grid";

  // 1. Peak Solar Hours
  const hsp = hspOverride ?? estimateHSP(latitude);
  const hspSource: SolarCalculationResult["hspSource"] = hspOverride
    ? "pvgis"
    : "estimate";

  // 2. Daily energy consumption
  const dailyEnergyKWh = monthlyKWh / 30;

  // 3. Performance factor (PR)
  const prBreakdown = buildPerformanceFactor();
  const performanceFactor = performanceFactorOverride ?? prBreakdown.total;

  // 4. Total Wp of panels needed  (1.20 safety margin: degradation, worst-case radiation, tolerances)
  const requiredPowerWp =
    (dailyEnergyKWh / (hsp * performanceFactor)) * 1000 * 1.2;

  // 5. Number of panels
  let numPanels = Math.ceil(requiredPowerWp / panelWp);
  // Asegurar que el número de paneles sea siempre par
  if (numPanels % 2 !== 0) {
    numPanels += 1;
  }
  const totalPanelPowerWp = numPanels * panelWp;

  // 6. Annual generation estimate
  const annualGenerationKWh =
    (totalPanelPowerWp / 1000) * hsp * 365 * performanceFactor;

  // 7. Battery capacity needed (useful)
  const dod = 0.9; // LiFePO4 at 90% DoD
  const batteryCapacityNeededKWh = needsBatteries
    ? (dailyEnergyKWh * autonomyDays) / dod
    : 0;

  // 8. Number of batteries
  const numBatteries = needsBatteries
    ? Math.ceil(batteryCapacityNeededKWh / batteryUsefulCapacityKWh)
    : 0;

  // 9. Minimum inverter power
  // Must handle full PV peak output; 110 % gives comfortable headroom.
  // (Old formula dailyEnergyKWh * 1.5 * 1000 was dimensionally wrong — kWh ≠ kW.)
  const minInverterW = totalPanelPowerWp * 1.1;
  const minInverterKW = minInverterW / 1000;

  // 10. System type recommendation — modality-aware
  let recommendedSystemType: "hibrido" | "separados";
  let recommendationReason: string;
  const extraEquipment: string[] = [];

  switch (installationModality) {
    case "aislada":
      if (minInverterKW <= 8) {
        recommendedSystemType = "hibrido";
        recommendationReason = `Instalación aislada (${minInverterKW.toFixed(1)} kW): inversor híbrido con función isla integrada + baterías. Un solo equipo gestiona paneles, baterías y cargas AC.`;
      } else {
        recommendedSystemType = "separados";
        recommendationReason = `Instalación aislada de alta potencia (${minInverterKW.toFixed(1)} kW): regulador MPPT + inversor independientes. Mayor flexibilidad y opciones de ampliación.`;
      }
      extraEquipment.push("Cuadro de protecciones DC (fusibles, seccionador)");
      extraEquipment.push("Cuadro de protecciones AC para instalación aislada");
      break;

    case "autoconsumo_sin_baterias":
      recommendedSystemType = "hibrido";
      recommendationReason = `Autoconsumo sin almacenamiento: inversor híbrido monofásico/trifásico conectado a red. Sencillo y económico para reducir la factura eléctrica.`;
      break;

    case "autoconsumo_0_inyeccion":
      recommendedSystemType = "hibrido";
      recommendationReason = `Sistema 0-inyección: el inversor híbrido permite limitar la producción via sensor CT clamp para no verter excedentes a la red.`;
      extraEquipment.push("Sensor CT clamp (medidor de consumo/inyección)");
      extraEquipment.push(
        "Activar función 0-inyección en la configuración del inversor",
      );
      break;

    case "respaldo_ups":
      recommendedSystemType = "hibrido";
      recommendationReason = `Sistema de respaldo UPS: inversor híbrido con función EPS/bypass — conmuta automáticamente a baterías en caso de corte de red.`;
      extraEquipment.push(
        "Verificar que el inversor seleccionado dispone de función EPS/bypass",
      );
      break;

    case "autoconsumo_con_baterias":
    default:
      if (minInverterKW <= 10) {
        recommendedSystemType = "hibrido";
        recommendationReason = `Sistema ${minInverterKW.toFixed(1)} kW con baterías: inversor híbrido todo-en-uno — MPPT, cargador de baterías e inversor integrados.`;
      } else {
        recommendedSystemType = "separados";
        recommendationReason = `Sistema de alta potencia (${minInverterKW.toFixed(1)} kW): regulador MPPT + baterías + inversor independientes para máxima flexibilidad.`;
      }
  }

  const modalityNote = installationModality
    ? MODALITY_NOTES[installationModality]
    : MODALITY_NOTES["autoconsumo_con_baterias"];

  return {
    hsp,
    hspSource,
    dailyEnergyKWh,
    performanceFactor,
    performanceBreakdown: prBreakdown,
    requiredPowerWp,
    numPanels,
    totalPanelPowerWp,
    annualGenerationKWh,
    batteryCapacityNeededKWh,
    numBatteries,
    minInverterKW,
    recommendedSystemType,
    recommendationReason,
    needsBatteries,
    extraEquipment,
    modalityNote,
  };
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

import type { CostEstimate } from "@/types/catalog.types";
import {
  PRICE_PER_WP_EUR,
  PRICE_PER_KWH_BATTERY_EUR,
  PRICE_PER_KW_INVERTER_EUR,
  OTHERS_FACTOR,
  DEFAULT_ELECTRICITY_PRICE_EUR,
} from "@/constants/system";

export function estimateCost(params: {
  panelType: "monofacial" | "bifacial";
  totalPanelWp: number;
  numBatteries: number;
  batteryUsefulKwh: number;
  inverterKw: number;
  annualGenerationKWh: number;
  electricityPriceEur?: number;
}): CostEstimate {
  const {
    panelType,
    totalPanelWp,
    numBatteries,
    batteryUsefulKwh,
    inverterKw,
    annualGenerationKWh,
    electricityPriceEur = DEFAULT_ELECTRICITY_PRICE_EUR,
  } = params;

  const panelsCostEur = totalPanelWp * PRICE_PER_WP_EUR[panelType];
  const batteriesCostEur =
    numBatteries * batteryUsefulKwh * PRICE_PER_KWH_BATTERY_EUR;
  const inverterCostEur = inverterKw * PRICE_PER_KW_INVERTER_EUR;
  const subTotal = panelsCostEur + batteriesCostEur + inverterCostEur;
  const othersCostEur = subTotal * OTHERS_FACTOR;
  const totalCostEur = subTotal + othersCostEur;

  const annualSavingsEur = annualGenerationKWh * electricityPriceEur;
  const paybackYears =
    annualSavingsEur > 0
      ? parseFloat((totalCostEur / annualSavingsEur).toFixed(1))
      : 0;

  return {
    panelsCostEur: Math.round(panelsCostEur),
    batteriesCostEur: Math.round(batteriesCostEur),
    inverterCostEur: Math.round(inverterCostEur),
    othersCostEur: Math.round(othersCostEur),
    totalCostEur: Math.round(totalCostEur),
    annualSavingsEur: Math.round(annualSavingsEur),
    paybackYears,
    electricityPriceEurKwh: electricityPriceEur,
  };
}
