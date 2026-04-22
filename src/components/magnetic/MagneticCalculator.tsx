"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { MagneticCalculator } from "@/services/magneticCalculator";
import { Coordinates } from "@/types/magnetic.types";
import { searchCity, type GeocodingResult } from "@/services/geocodingService";
import { useProject } from "@/context/ProjectContext";
import Compass from "./Compass";

// ---------------------------------------------------------------------------
// Quick-access example cities
// ---------------------------------------------------------------------------

const EXAMPLE_CITIES = [
  { name: "Las Palmas", lat: 28.1461, lon: -15.4216, alt: 8 },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, alt: 650 },
  { name: "Barcelona", lat: 41.3851, lon: 2.1734, alt: 12 },
  { name: "Sevilla", lat: 37.3891, lon: -5.9845, alt: 7 },
  { name: "Valencia", lat: 39.4699, lon: -0.3763, alt: 15 },
  { name: "Bilbao", lat: 43.263, lon: -2.935, alt: 19 },
  { name: "Málaga", lat: 36.7213, lon: -4.4214, alt: 11 },
  { name: "Zaragoza", lat: 41.6488, lon: -0.8891, alt: 200 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MagneticCalculatorComponent: React.FC = () => {
  const { data, update, reset } = useProject();

  // ---- state ----
  const [coordinates, setCoordinates] = useState<Coordinates>({
    latitude: 0,
    longitude: 0,
    altitude: 0,
  });
  const [locationName, setLocationName] = useState("");
  const [result, setResult] = useState<any>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);

  // Search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Alert
  const [alert, setAlert] = useState<{ message: string; show: boolean }>({
    message: "",
    show: false,
  });

  // ---- helpers ----
  const showAlert = (message: string) => {
    setAlert({ message, show: true });
    setTimeout(() => setAlert({ message: "", show: false }), 3000);
  };

  const calcAndSave = useCallback(
    (coords: Coordinates, name: string) => {
      const r = MagneticCalculator.calculateDeclination(coords);
      setResult(r);
      // Save through context so all other phases see the updated location immediately.
      // Also clear downstream stale data (solarCalc, selectedComponents) when location changes.
      update({
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude || 0,
          locationName: name,
          magneticDeclination: r.declination,
          magneticSouth: r.magneticSouth,
          declinationDirection: r.declinationDirection,
          geographicSouth: r.geographicSouth,
        },
        solarCalc: undefined,
        selectedComponents: undefined,
      });
      return r;
    },
    [update],
  );

  // ---- initial load from context (context already hydrated from localStorage) ----
  useEffect(() => {
    if (data.location) {
      const c = {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        altitude: data.location.altitude || 0,
      };
      setCoordinates(c);
      setLocationName(data.location.locationName || "");
      setQuery(data.location.locationName || "");
      const r = MagneticCalculator.calculateDeclination(c);
      setResult(r);
    }
    const info = MagneticCalculator.getModelInfo();
    setModelInfo(info);
    // Only run once on mount — data is stable at this point
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- close suggestions when clicking outside ----
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ---- city search (debounced) ----
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCity(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        if (results.length === 0)
          setSearchError(
            "No se encontraron resultados. Prueba con otro nombre o escribe las coordenadas manualmente.",
          );
      } catch (err) {
        setSearchError((err as Error).message);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectCity = useCallback(
    (city: GeocodingResult) => {
      const coords = {
        latitude: city.latitude,
        longitude: city.longitude,
        altitude: city.elevation,
      };
      setCoordinates(coords);
      setLocationName(city.name);
      setQuery(city.label);
      setSuggestions([]);
      setShowSuggestions(false);
      calcAndSave(coords, city.name);
    },
    [calcAndSave],
  );

  const handleExampleClick = useCallback(
    (loc: (typeof EXAMPLE_CITIES)[0]) => {
      const coords = {
        latitude: loc.lat,
        longitude: loc.lon,
        altitude: loc.alt,
      };
      setCoordinates(coords);
      setLocationName(loc.name);
      setQuery(loc.name);
      setSuggestions([]);
      setShowSuggestions(false);
      calcAndSave(coords, loc.name);
    },
    [calcAndSave],
  );

  // ---- manual coordinate change ----
  const handleCoordChange = useCallback(
    (field: keyof Coordinates, value: string) => {
      if (value.includes(",")) {
        showAlert("Usa punto (.) como separador decimal, no coma (,)");
        return;
      }
      const num = parseFloat(value);
      if (isNaN(num) && value !== "" && value !== "-") return;
      const newCoords = { ...coordinates, [field]: isNaN(num) ? 0 : num };
      setCoordinates(newCoords);
      calcAndSave(newCoords, locationName);
    },
    [coordinates, locationName, calcAndSave],
  );

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Phase badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-full px-5 py-2 mb-3">
          <span className="text-yellow-700 dark:text-yellow-400 font-bold">
            🧭 Fase 1
          </span>
          <span className="text-yellow-600 dark:text-yellow-300 font-medium">
            Localización
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Busca la ciudad donde se hará la instalación
        </p>
      </div>

      {/* Reset button — only shown when there is existing project data */}
      {(data.location ||
        data.consumption ||
        data.solarCalc ||
        data.selectedComponents) && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "¿Borrar todos los datos del proyecto y empezar de nuevo?",
                )
              ) {
                reset();
                setCoordinates({ latitude: 0, longitude: 0, altitude: 0 });
                setLocationName("");
                setQuery("");
                setResult(null);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            🗑 Nueva instalación
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CITY SEARCH — main input */}
      {/* ------------------------------------------------------------------ */}
      <div ref={searchBoxRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          🔍 Buscar ciudad
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Escribe el nombre de la ciudad…"
            className="w-full px-4 py-3 pr-10 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-base focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500 transition-colors"
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {searching ? (
              <span className="animate-spin text-yellow-500">⏳</span>
            ) : (
              <span className="text-gray-400">🔍</span>
            )}
          </div>
        </div>

        {/* Search error */}
        {searchError && !showSuggestions && (
          <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
            {searchError}
          </p>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => handleSelectCity(city)}
                className="w-full text-left px-4 py-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
              >
                <div className="font-medium text-gray-800 dark:text-white text-sm">
                  {city.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                  <span>
                    {city.admin1 ? `${city.admin1}, ` : ""}
                    {city.country}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>
                    {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                  </span>
                  {city.elevation > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">
                        ·
                      </span>
                      <span>{city.elevation} m</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Result card — shown once a city is selected */}
      {/* ------------------------------------------------------------------ */}
      {result && locationName && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                📍 {locationName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                <span>
                  Lat:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {coordinates.latitude.toFixed(4)}°
                  </strong>
                </span>
                <span>
                  Lon:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {coordinates.longitude.toFixed(4)}°
                  </strong>
                </span>
                <span>
                  Alt:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {coordinates.altitude} m
                  </strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-yellow-700 dark:text-yellow-400">
                {result.declination.toFixed(2)}°
                <span className="text-sm font-normal ml-1">
                  {result.declinationDirection === "E" ? "Este" : "Oeste"}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Declinación magnética
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Quick-access examples */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Ciudades frecuentes:
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_CITIES.map((loc) => (
            <button
              key={loc.name}
              onClick={() => handleExampleClick(loc)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                locationName === loc.name
                  ? "bg-yellow-500 text-white shadow"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-600"
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Manual coords (always visible) */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Coordenadas
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(["latitude", "longitude", "altitude"] as (keyof Coordinates)[]).map(
            (field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">
                  {
                    {
                      latitude: "Latitud (°)",
                      longitude: "Longitud (°)",
                      altitude: "Altitud (m)",
                    }[field]
                  }
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    coordinates[field] === 0 && field !== "altitude"
                      ? ""
                      : String(coordinates[field])
                  }
                  onChange={(e) => handleCoordChange(field, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:outline-none focus:border-yellow-500 dark:focus:border-yellow-500"
                  placeholder={
                    {
                      latitude: "28.1461",
                      longitude: "-15.4216",
                      altitude: "0",
                    }[field]
                  }
                />
              </div>
            ),
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Compass + results */}
      {/* ------------------------------------------------------------------ */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <Compass
            geographicSouth={result.geographicSouth}
            magneticSouth={result.magneticSouth}
            declination={result.declination}
            declinationDirection={result.declinationDirection}
          />

          {/* Key data */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                Declinación magnética
              </div>
              <div className="text-xl font-bold text-yellow-700 dark:text-yellow-400 leading-tight">
                {result.declination.toFixed(2)}°
              </div>
              <div className="text-xs font-normal text-gray-600 dark:text-gray-400 mt-0.5">
                hacia el{" "}
                {result.declinationDirection === "E" ? "Este" : "Oeste"}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                Sur magnético (azimut)
              </div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                {result.magneticSouth.toFixed(1)}°
              </div>
            </div>
          </div>

          {/* Solar orientation note */}
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 text-sm text-gray-700 dark:text-gray-300">
            <strong>☀️ Orientación de paneles:</strong> Apunta tu brújula a{" "}
            <strong className="text-orange-600 dark:text-orange-400">
              {result.magneticSouth.toFixed(1)}°
            </strong>{" "}
            para mirar al sur geográfico exacto. Corrección de{" "}
            <strong>{result.declination.toFixed(2)}°</strong> hacia el{" "}
            {result.declinationDirection === "E" ? "Este" : "Oeste"} aplicada.
          </div>

          {/* Additional data collapsible */}
          {result.additionalData && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                Ver datos magnéticos completos
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {[
                  {
                    label: "Inclinación",
                    value: `${(result.additionalData.inclination ?? 0).toFixed(2)}°`,
                  },
                  {
                    label: "Intensidad total",
                    value: `${((result.additionalData.totalIntensity ?? 0) / 1000).toFixed(1)} µT`,
                  },
                  {
                    label: "Componente Norte",
                    value: `${((result.additionalData.northComponent ?? 0) / 1000).toFixed(1)} µT`,
                  },
                  {
                    label: "Componente Este",
                    value: `${((result.additionalData.eastComponent ?? 0) / 1000).toFixed(1)} µT`,
                  },
                  {
                    label: "Componente Vertical",
                    value: `${((result.additionalData.verticalComponent ?? 0) / 1000).toFixed(1)} µT`,
                  },
                  { label: "Modelo", value: modelInfo?.name ?? "WMM" },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="bg-gray-50 dark:bg-gray-700 rounded p-2"
                  >
                    <div className="text-gray-400 dark:text-gray-500">
                      {d.label}
                    </div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 break-words">
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Alert */}
      {alert.show && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-white dark:bg-gray-900 border border-red-400 rounded-xl p-4 shadow-xl flex items-center gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="text-red-600 dark:text-red-400 font-medium text-sm">
              {alert.message}
            </p>
            <button
              onClick={() => setAlert({ message: "", show: false })}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagneticCalculatorComponent;
