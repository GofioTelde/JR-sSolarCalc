// src/services/geocodingService.ts
// City geocoding via Open-Meteo Geocoding API.
// Free, no API key required. Returns lat, lon, elevation, country.

export interface GeocodingResult {
  id: number;
  name: string;
  /** Full display label: "Alicante, España" */
  label: string;
  latitude: number;
  longitude: number;
  /** Elevation in metres (may be 0 for some results) */
  elevation: number;
  country: string;
  countryCode: string;
  admin1?: string; // Region/state
  population?: number;
}

/**
 * Search for cities by name.
 * Returns up to `count` results sorted by population (most populated first).
 */
export async function searchCity(
  query: string,
  count = 6
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query.trim());
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
    const json = await res.json();

    const results: GeocodingResult[] = (json.results ?? []).map(
      (r: {
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        elevation?: number;
        country?: string;
        country_code?: string;
        admin1?: string;
        population?: number;
      }) => ({
        id: r.id,
        name: r.name,
        label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation ?? 0,
        country: r.country ?? "",
        countryCode: r.country_code ?? "",
        admin1: r.admin1,
        population: r.population,
      })
    );

    return results;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("La búsqueda tardó demasiado. Comprueba tu conexión.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
