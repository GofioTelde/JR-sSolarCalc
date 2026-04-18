// src/types/catalog.types.ts
// Canonical TypeScript interfaces for all JSON catalog data.
// Import from here instead of defining inline in components.

// ---------------------------------------------------------------------------
// Solar panels
// ---------------------------------------------------------------------------

export interface PanelBase {
  id: string;
  nombre: string;
  tipo: "monofacial" | "bifacial";
  precio_ud?: number;
  precio_estimado?: boolean;
  potencia_pmax: number;        // Wp
  vmp: number;                  // V
  imp: number;                  // A
  voc: number;                  // V
  isc: number;                  // A
  eficiencia: number;           // %
  ancho_mm: number;
  alto_mm: number;
  espesor_mm: number;
  superficie_m2: number;
  peso_kg: number;
  celdas: number;
  tecnologia: string;
  coeficiente_temperatura_pmax: number;   // %/°C
  coeficiente_temperatura_voc: number;    // %/°C
  coeficiente_temperatura_isc: number;    // %/°C
  noct: number;                           // °C
  garantia_potencia: number;              // years
  garantia_producto: number;              // years
}

export interface PanelMonofacial extends PanelBase {
  tipo: "monofacial";
}

export interface PanelBifacial extends PanelBase {
  tipo: "bifacial";
  potencia_posterior: number;   // Wp (rear-side contribution)
  factor_bifacial: number;      // 0-1
}

export type Panel = PanelMonofacial | PanelBifacial;

// ---------------------------------------------------------------------------
// Batteries
// ---------------------------------------------------------------------------

export interface Bateria {
  id: string;
  nombre: string;
  tipo: "lifepo4" | "lifepo4_hv" | string;
  capacidad_nominal_kwh: number;
  capacidad_util_kwh: number;
  tension_nominal: number;                // V
  corriente_descarga_continua: number;    // A
  corriente_descarga_pico: number;        // A
  corriente_carga_max: number;            // A
  potencia_descarga_nominal: number;      // W
  potencia_descarga_pico: number;         // W
  profundidad_descarga: number;           // %
  ciclos_vida_80dod: number;
  ciclos_vida_90dod: number;
  eficiencia_carga_descarga: number;      // %
  temperatura_operacion: [number, number];
  temperatura_almacenamiento: [number, number];
  bms_integrado: boolean;
  protecciones: string[];
  comunicacion: string[];
  dimensiones_mm: [number, number, number];
  peso_kg: number;
  montaje: string;
  modular: boolean;
  max_paralelo: number;
  garantia: number;                       // years
  autodescarga_mensual: number;           // %
  precio_ud?: number;
  precio_estimado?: boolean;
}

// ---------------------------------------------------------------------------
// Hybrid inverters
// ---------------------------------------------------------------------------

export interface InversorHibrido {
  id: string;
  nombre: string;
  tipo: "hibrido";
  potencia_ac_nominal: number;            // W
  potencia_ac_max: number;                // W
  potencia_pv_max: number;                // W
  mppt_numero: number;
  mppt_corriente_max: number;             // A per MPPT
  mppt_rango_voltaje: [number, number];   // [min, max] V
  mppt_corriente_cortocircuito_max: number; // A
  strings_por_mppt: number;
  voltage_dc_nominal: number;             // V
  bateria_tension: number;                // V
  bateria_corriente_carga_max: number;    // A
  bateria_corriente_descarga_max: number; // A
  bateria_compatibilidad: string;
  eficiencia_max: number;                 // %
  eficiencia_mppt: number;                // %
  forma_onda: string;
  frecuencia_salida: number;              // Hz
  tension_salida: number;                 // V (230 = monophase, 400 = triphase)
  fases: number;
  protecciones: string[];
  comunicacion: string[];
  dimensiones_mm: [number, number, number];
  peso_kg: number;
  temperatura_operacion: [number, number];
  humedad_operacion: [number, number];
  precio_ud?: number;
  precio_estimado?: boolean;
}

// ---------------------------------------------------------------------------
// Grid-tie string inverter (inversor de red — no battery capability)
// ---------------------------------------------------------------------------

export interface InversorRed {
  id: string;
  nombre: string;
  tipo: "red";
  potencia_ac_nominal: number;
  potencia_pv_max: number;
  mppt_numero: number;
  mppt_corriente_max: number;
  mppt_rango_voltaje: [number, number];
  eficiencia_max: number;
  eficiencia_mppt: number;
  frecuencia_salida: number;
  tension_salida: number;
  fases: number;
  protecciones: string[];
  comunicacion: string[];
  dimensiones_mm: [number, number, number];
  peso_kg: number;
  temperatura_operacion: [number, number];
  humedad_operacion: [number, number];
  precio_ud?: number;
  precio_estimado?: boolean;
}

// ---------------------------------------------------------------------------
// Separate components (MPPT controllers + off-grid inverters)
// ---------------------------------------------------------------------------

export interface ControladorMPPT {
  id: string;
  nombre: string;
  tipo: "mppt";
  corriente_max_salida: number;           // A
  tension_entrada_max: number;            // V
  tension_bateria: number[];              // supported V values e.g. [12, 24, 48]
  eficiencia: number;                     // %
  tension_inicio: number;                 // V
  protecciones: string[];
  comunicacion: string[];
  dimensiones_mm: [number, number, number];
  peso_kg: number;
  temperatura_operacion: [number, number];
  humedad_operacion: [number, number];
  precio_ud?: number;
  precio_estimado?: boolean;
}

export interface InversorOffGrid {
  id: string;
  nombre: string;
  tipo: "inversor";
  potencia_nominal: number;               // W
  potencia_pico: number;                  // W
  tension_entrada: number | number[];     // V
  tension_salida: number;                 // V
  frecuencia_salida: number;              // Hz
  eficiencia: number;                     // %
  forma_onda: string;
  fases?: number;                         // 1 = monofásico, 3 = trifásico
  protecciones: string[];
  comunicacion?: string[];
  dimensiones_mm: [number, number, number];
  peso_kg: number;
  temperatura_operacion: [number, number];
  humedad_operacion: [number, number];
  precio_ud?: number;
  precio_estimado?: boolean;
}

export type ModuloSeparado = ControladorMPPT | InversorOffGrid;

// ---------------------------------------------------------------------------
// Protection & common elements (protecciones.json)
// ---------------------------------------------------------------------------

export type TipoProteccion =
  | "fusible_dc"
  | "seccionador_dc"
  | "spd_dc"
  | "magnetotermico_ac"
  | "diferencial_ac"
  | "spd_ac"
  | "cable_dc"
  | "cable_ac"
  | "monitorizacion"
  | "sensor_ct"
  | "puesta_tierra";

export interface Proteccion {
  id: string;
  nombre: string;
  tipo: TipoProteccion;
  amperaje?: number;
  tension_max?: number;
  polos?: number;
  seccion_mm2?: number;
  corriente_max?: number;
  corriente_descarga_ka?: number;
  nivel_proteccion_kv?: number;
  sensibilidad_ma?: number;
  clase?: string;
  curva?: string;
  poder_corte_ka?: number;
  fases?: number;
  canales?: number;
  protocolo?: string[];
  display?: boolean;
  longitud_m?: number;
  norma?: string;
  precio_ud?: number;
  precio_m?: number;
}

// ---------------------------------------------------------------------------
// Union of all catalog items
// ---------------------------------------------------------------------------

export type CatalogItem = Panel | Bateria | InversorHibrido | ModuloSeparado;

// ---------------------------------------------------------------------------
// String configuration result
// ---------------------------------------------------------------------------

export interface StringConfig {
  panelsInSeries: number;
  parallelStrings: number;
  stringsPerMppt: number;
  totalPanels: number;
  stringVoltageVmp: number;    // V (at Vmp)
  stringVoltageVoc: number;    // V (at Voc)
  stringCurrent: number;       // A (at Imp)
  withinMpptRange: boolean;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

export interface CostEstimate {
  panelsCostEur: number;
  batteriesCostEur: number;
  inverterCostEur: number;
  othersCostEur: number;    // cables, protections, structure ~15%
  totalCostEur: number;
  annualSavingsEur: number;
  paybackYears: number;
  electricityPriceEurKwh: number;
}
