// src/services/pvgisService.ts
// Fetches real solar irradiance data from the EU PVGIS API (free, no key needed).
// Falls back to latitude-based estimation when the API is unavailable.
//
// PVGIS docs: https://re.jrc.ec.europa.eu/pvg_tools/en/

export interface PVGISResult {
  hsp: number;                    // Peak Solar Hours (h/day)
  annualIrradianceKWhM2: number;  // Global irradiance kWh/m²/year
  optimalTiltDeg: number;         // Recommended tilt angle (°)
  optimalAzimuthDeg: number;      // Recommended azimuth (°)
  source: "pvgis" | "estimate";   // Whether data came from API or fallback
}

interface PVGISApiResponse {
  outputs: {
    totals: {
      fixed: {
        E_y: number;            // Annual PV production (kWh/kWp) at 0% losses
        H_i_opt: number;        // Optimal irradiance (kWh/m²/year)
        SD_y: number;           // Std deviation
        l_aoi: number;
        l_spec: string;
        l_tg: number;
        l_total: number;
      };
    };
  };
  inputs: {
    location: { latitude: number; longitude: number; elevation: number };
    mounting_system: {
      fixed: { slope: { value: number }; azimuth: { value: number } };
    };
  };
  meta: { inputs: Record<string, unknown> };
}

/**
 * Fetch actual solar irradiance data from PVGIS for the given coordinates.
 * The API is free and public, maintained by the EU Joint Research Centre.
 *
 * @param latitude  Decimal degrees, positive = North
 * @param longitude Decimal degrees, positive = East
 * @returns PVGISResult with HSP and optimal orientation
 * @throws Error if the network request fails (caller should handle and fall back)
 */
export async function fetchPVGISData(
  latitude: number,
  longitude: number
): Promise<PVGISResult> {
  const params = new URLSearchParams({
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
    peakpower: "1",   // 1 kWp for normalized output
    loss: "0",        // 0% losses → pure irradiance output
    outputformat: "json",
    pvtechchoice: "crystSi",
    mountingplace: "building",
    optimalangles: "1",   // let PVGIS find optimal tilt + azimuth
  });

  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${params}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    // 8 second timeout via AbortController
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`PVGIS API error: ${response.status} ${response.statusText}`);
  }

  const data: PVGISApiResponse = await response.json();
  const totals = data.outputs.totals.fixed;

  // E_y = annual kWh/kWp at 0% losses ≈ annual irradiance in kWh/m²
  // HSP = E_y / 365 (daily equivalent)
  const hsp = parseFloat((totals.E_y / 365).toFixed(2));
  const optimalTilt = data.inputs.mounting_system.fixed.slope.value;
  const optimalAzimuth = data.inputs.mounting_system.fixed.azimuth.value;

  return {
    hsp,
    annualIrradianceKWhM2: totals.E_y,
    optimalTiltDeg: optimalTilt,
    // PVGIS returns azimuth as 0=South, ±180=North — convert to compass (180=S)
    optimalAzimuthDeg: optimalAzimuth + 180,
    source: "pvgis",
  };
}

/**
 * Latitude-based HSP fallback (same as the existing calculateHSP).
 * Used when PVGIS is unavailable or user is offline.
 */
export function estimateHSP(latitude: number): number {
  const absLat = Math.abs(latitude);
  if (absLat <= 10) return 6.5;
  if (absLat <= 20) return 6.0;
  if (absLat <= 30) return 5.5;
  if (absLat <= 37) return 5.2;
  if (absLat <= 42) return 4.8;
  if (absLat <= 48) return 4.2;
  if (absLat <= 55) return 3.8;
  if (absLat <= 60) return 3.2;
  return 2.8;
}

/**
 * Returns a human-readable description for an HSP value.
 */
export function describeHSP(hsp: number): string {
  if (hsp >= 6.0) return "Muy alta — zona tropical/subtropical";
  if (hsp >= 5.0) return "Alta — zona mediterránea / sur peninsular";
  if (hsp >= 4.5) return "Media-alta — centro peninsular";
  if (hsp >= 4.0) return "Media — norte peninsular / zona atlántica";
  if (hsp >= 3.5) return "Media-baja — zona nublada / alta latitud";
  return "Baja — zona norte o muy nublada";
}
