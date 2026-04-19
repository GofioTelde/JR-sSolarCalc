// src/services/componentCompatibility.ts
// Component compatibility and recommendation logic for HV/LV batteries and inverters

import type {
  Bateria,
  InversorHibrido,
  InversorRed,
  Panel,
  ControladorMPPT,
  InversorOffGrid,
} from "@/types/catalog.types";

// ---------------------------------------------------------------------------
// Battery voltage classification
// ---------------------------------------------------------------------------

export type BatteryVoltageClass = "LV" | "HV";

/**
 * Classify a battery as LV (Low Voltage ~48V) or HV (High Voltage 100V+)
 */
export function getBatteryVoltageClass(battery: Bateria): BatteryVoltageClass {
  if (battery.tipo === "lifepo4_hv" || battery.tension_nominal >= 100) {
    return "HV";
  }
  return "LV";
}

/**
 * Get the voltage class label for a battery
 */
export function getBatteryVoltageLabel(battery: Bateria): string {
  const cls = getBatteryVoltageClass(battery);
  return cls === "HV" ? "HV (Alto Voltaje)" : "LV (Bajo Voltaje 48V)";
}

// ---------------------------------------------------------------------------
// Inverter compatibility with batteries
// ---------------------------------------------------------------------------

interface InverterBatteryCompatibility {
  canUseHV: boolean;
  canUseLV: boolean;
  recommendedVoltageClass: "HV" | "LV" | "both";
}

/**
 * Check if a hybrid inverter is compatible with a battery voltage class
 */
export function checkInverterBatteryCompatibility(
  inverter: InversorHibrido,
  battery: Bateria,
): boolean {
  const batteryVoltage = battery.tension_nominal;
  const inverterBatteryVoltage = inverter.bateria_tension;

  // Allow ±10V tolerance for the nominal voltage match
  const tolerance = 10;
  return Math.abs(batteryVoltage - inverterBatteryVoltage) <= tolerance;
}

/**
 * Get inverter battery voltage capabilities
 */
export function getInverterBatteryCapabilities(
  inverter: InversorHibrido,
): InverterBatteryCompatibility {
  const batVoltage = inverter.bateria_tension;
  const isHV = batVoltage >= 100;
  const isLV = batVoltage <= 60;
  const isBoth = batVoltage > 60 && batVoltage < 100; // Mid-range, unlikely but possible

  return {
    canUseHV: isHV,
    canUseLV: isLV,
    recommendedVoltageClass: isHV ? "HV" : isLV ? "LV" : "both",
  };
}

// ---------------------------------------------------------------------------
// Panel-string configuration compatibility
// ---------------------------------------------------------------------------

/**
 * Check if a panel string is compatible with an inverter MPPT range
 */
export function checkPanelStringCompatibility(
  numPanels: number,
  panelVmp: number,
  inverterMpptRange: [number, number],
): boolean {
  const stringVoltage = numPanels * panelVmp;
  return (
    stringVoltage >= inverterMpptRange[0] &&
    stringVoltage <= inverterMpptRange[1]
  );
}

// ---------------------------------------------------------------------------
// Recommendation levels and colors
// ---------------------------------------------------------------------------

export type RecommendationLevel = "optimal" | "recommended" | "suboptimal";
export type ComponentColor = "green" | "blue" | "red";

export const RECOMMENDATION_COLORS: Record<
  RecommendationLevel,
  ComponentColor
> = {
  optimal: "green", // 🟢 Superior/optimal choice
  recommended: "blue", // 🔵 Recommended choice
  suboptimal: "red", // 🔴 Not recommended (but selectable with warning)
};

/**
 * Get human-readable description for recommendation level
 */
export function getRecommendationDescription(
  level: RecommendationLevel,
): string {
  switch (level) {
    case "optimal":
      return "Recomendación superior";
    case "recommended":
      return "Recomendable";
    case "suboptimal":
      return "No recomendable";
  }
}

// ---------------------------------------------------------------------------
// Inverter sizing recommendations
// ---------------------------------------------------------------------------

export interface InverterRecommendation {
  inverter: InversorHibrido | InversorRed | InversorOffGrid;
  level: RecommendationLevel;
  reason: string;
  isInsufficientPower: boolean;
}

/**
 * Recommend an inverter based on required power
 * Returns sorted list from worst to best
 */
export function recommendInverters(
  inverters: (InversorHibrido | InversorRed | InversorOffGrid)[],
  requiredPowerW: number,
  minPowerW: number, // Absolute minimum to function
): InverterRecommendation[] {
  const recommendations = inverters
    .map((inv) => {
      const invPower =
        "potencia_ac_nominal" in inv
          ? inv.potencia_ac_nominal
          : (inv.potencia_nominal ?? 0);

      const isInsufficient = invPower < minPowerW;
      const isOptimal =
        invPower >= requiredPowerW && invPower <= requiredPowerW * 1.3;
      const isRecommended =
        invPower >= requiredPowerW && invPower <= requiredPowerW * 1.5;

      let level: RecommendationLevel;
      let reason = "";

      if (isInsufficient) {
        level = "suboptimal";
        reason = `Potencia insuficiente (${invPower}W < ${minPowerW}W mínimo)`;
      } else if (isOptimal) {
        level = "optimal";
        reason = `Potencia óptima para ${requiredPowerW}W requeridos`;
      } else if (isRecommended) {
        level = "recommended";
        reason = `Potencia adecuada para ${requiredPowerW}W requeridos`;
      } else {
        level = "suboptimal";
        reason = `Potencia excesiva para los requisitos`;
      }

      return {
        inverter: inv,
        level,
        reason,
        isInsufficientPower: isInsufficient,
      };
    })
    .sort((a, b) => {
      // Sort: optimal > recommended > suboptimal
      const levelOrder = { optimal: 3, recommended: 2, suboptimal: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    });

  return recommendations;
}

// ---------------------------------------------------------------------------
// Battery sizing recommendations
// ---------------------------------------------------------------------------

export interface BatteryRecommendation {
  battery: Bateria;
  level: RecommendationLevel;
  reason: string;
  isInsufficient: boolean;
}

/**
 * Recommend batteries based on required capacity
 * Returns sorted list from worst to best
 */
export function recommendBatteries(
  batteries: Bateria[],
  requiredCapacityKwh: number,
  targetBatteryCount: number = 1,
): BatteryRecommendation[] {
  const recommendations = batteries
    .map((bat) => {
      const totalCapacity = bat.capacidad_util_kwh * targetBatteryCount;
      const isInsufficient = totalCapacity < requiredCapacityKwh;
      const isOptimal =
        totalCapacity >= requiredCapacityKwh &&
        totalCapacity <= requiredCapacityKwh * 1.2;
      const isRecommended =
        totalCapacity >= requiredCapacityKwh &&
        totalCapacity <= requiredCapacityKwh * 1.5;

      let level: RecommendationLevel;
      let reason = "";

      if (isInsufficient) {
        level = "suboptimal";
        reason = `Capacidad insuficiente (${totalCapacity.toFixed(2)}kWh < ${requiredCapacityKwh.toFixed(2)}kWh)`;
      } else if (isOptimal) {
        level = "optimal";
        reason = `Capacidad óptima`;
      } else if (isRecommended) {
        level = "recommended";
        reason = `Capacidad recomendable`;
      } else {
        level = "suboptimal";
        reason = `Capacidad excesiva para los requisitos`;
      }

      return {
        battery: bat,
        level,
        reason,
        isInsufficient,
      };
    })
    .sort((a, b) => {
      // Sort: optimal > recommended > suboptimal
      const levelOrder = { optimal: 3, recommended: 2, suboptimal: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    });

  return recommendations;
}

// ---------------------------------------------------------------------------
// Panel sizing recommendations
// ---------------------------------------------------------------------------

export interface PanelRecommendation {
  panel: Panel;
  level: RecommendationLevel;
  reason: string;
}

/**
 * Recommend panels based on required power
 */
export function recommendPanels(
  panels: Panel[],
  requiredWp: number,
): PanelRecommendation[] {
  const recommendations = panels
    .map((panel) => {
      const isOptimal =
        panel.potencia_pmax >= requiredWp &&
        panel.potencia_pmax <= requiredWp * 1.1;
      const isRecommended =
        panel.potencia_pmax >= requiredWp &&
        panel.potencia_pmax <= requiredWp * 1.25;

      let level: RecommendationLevel;
      let reason = "";

      if (panel.potencia_pmax < requiredWp) {
        level = "suboptimal";
        reason = `Potencia insuficiente (${panel.potencia_pmax}Wp)`;
      } else if (isOptimal) {
        level = "optimal";
        reason = `Potencia óptima`;
      } else if (isRecommended) {
        level = "recommended";
        reason = `Potencia recomendable`;
      } else {
        level = "suboptimal";
        reason = `Potencia excesiva`;
      }

      return {
        panel,
        level,
        reason,
      };
    })
    .sort((a, b) => {
      const levelOrder = { optimal: 3, recommended: 2, suboptimal: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    });

  return recommendations;
}

// ---------------------------------------------------------------------------
// Filter inverters by battery compatibility
// ---------------------------------------------------------------------------

/**
 * Filter hybrid inverters to only those compatible with the selected battery
 */
export function filterInvertersByBatteryCompatibility(
  inverters: InversorHibrido[],
  battery: Bateria,
): { compatible: InversorHibrido[]; incompatible: InversorHibrido[] } {
  const compatible: InversorHibrido[] = [];
  const incompatible: InversorHibrido[] = [];

  for (const inv of inverters) {
    if (checkInverterBatteryCompatibility(inv, battery)) {
      compatible.push(inv);
    } else {
      incompatible.push(inv);
    }
  }

  return { compatible, incompatible };
}
