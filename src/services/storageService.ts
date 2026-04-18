// src/services/storageService.ts
import type { SystemTypeKey, InstallationModality } from "@/constants/system";
import type { StringConfig, CostEstimate } from "@/types/catalog.types";

// ---------------------------------------------------------------------------
// Sub-interfaces
// ---------------------------------------------------------------------------

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number;
  locationName: string;
  magneticDeclination: number;
  magneticSouth?: number;
  declinationDirection?: string;
  geographicSouth?: number;
}

export interface ConsumptionData {
  monthlyKWh: number;
  autonomyDays: number;
}

export type PanelType = "monofacial" | "bifacial";
export type SystemType = SystemTypeKey;
export type InstallationType = "on-grid" | "off-grid";

/** User-adjustable performance ratio losses (all in %). */
export interface PRLossesOverride {
  wiring?: number;
  inverter?: number;
  temperature?: number;
  soiling?: number;
  mismatch?: number;
  shading?: number;
}

export interface SelectedComponents {
  panelId: string;
  inverterId: string;
  batteryId: string | null;
  mpptId: string | null;
  numPanels: number;
  numBatteries: number;
  stringConfig?: StringConfig;
  /** Panel mounting orientation derived from available surface */
  panelOrientation?: "portrait" | "landscape";
}

export interface SolarCalcSnapshot {
  hsp: number;
  hspSource: "pvgis" | "estimate" | "manual";
  dailyEnergyKWh: number;
  performanceFactor: number;
  prLosses?: PRLossesOverride;
  requiredPowerWp: number;
  numPanels: number;
  totalPanelPowerWp: number;
  annualGenerationKWh: number;
  batteryCapacityNeededKWh: number;
  minInverterKW: number;
  recommendedSystemType: SystemType;
  confirmedSystemType: SystemType;
  costEstimate?: CostEstimate;
  /** Optimal tilt angle in degrees from PVGIS */
  optimalTiltDeg?: number;
}

// ---------------------------------------------------------------------------
// Root project data
// ---------------------------------------------------------------------------

export interface ProjectData {
  // Fase 1
  location?: LocationData;

  // Fase 2
  consumption?: ConsumptionData;
  panelType?: PanelType;
  systemType?: SystemType;
  installationType?: InstallationType;
  hasBatteries?: boolean;
  installationModality?: InstallationModality;
  /** Number of electrical phases: 1 = single-phase, 3 = three-phase */
  inverterPhases?: 1 | 3;

  // Fase 3
  solarCalc?: SolarCalcSnapshot;

  // Fase 4
  selectedComponents?: SelectedComponents;
  /** Height of panel bottom edge above ground/roof (m) */
  panelBottomEdgeHeightM?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const STORAGE_KEY = "solar_calc_project_data";

export const storageService = {
  saveProjectData(data: Partial<ProjectData>): void {
    try {
      const existing = this.getProjectData();
      const updated = deepMerge(existing, data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("[storageService] saveProjectData:", err);
    }
  },

  getProjectData(): ProjectData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProjectData) : {};
    } catch (err) {
      console.error("[storageService] getProjectData:", err);
      return {};
    }
  },

  clearProjectData(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Typed partial update for a single top-level key. */
  updateKey<K extends keyof ProjectData>(key: K, value: ProjectData[K]): void {
    const current = this.getProjectData();
    current[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shallow-merge at the top level, deep-merge nested objects. */
function deepMerge(
  target: ProjectData,
  source: Partial<ProjectData>
): ProjectData {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof ProjectData)[]) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      // @ts-expect-error — dynamic deep merge
      result[key] = { ...tv, ...sv };
    } else if (sv !== undefined) {
      // @ts-expect-error — dynamic assignment
      result[key] = sv;
    }
  }
  return result;
}
