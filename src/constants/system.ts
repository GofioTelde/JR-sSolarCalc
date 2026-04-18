// src/constants/system.ts
// Single source of truth for system-wide UI constants.
// Import from here instead of re-defining in each component.

// ---------------------------------------------------------------------------
// System type metadata
// ---------------------------------------------------------------------------

export type SystemTypeKey = "hibrido" | "separados";

export const SYSTEM_TYPE_INFO: Record<
  SystemTypeKey,
  {
    icon: string;
    label: string;
    description: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
    badgeClass: string;
  }
> = {
  hibrido: {
    icon: "🔄",
    label: "Híbrido",
    description: "Inversor todo-en-uno: MPPT + cargador de baterías + inversor integrados en un solo equipo.",
    borderClass: "border-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    textClass: "text-blue-700 dark:text-blue-300",
    badgeClass: "bg-blue-500 text-white",
  },
  separados: {
    icon: "🔗",
    label: "Componentes Separados",
    description: "Paneles + regulador MPPT + baterías + inversor, cada pieza independiente. Máxima flexibilidad.",
    borderClass: "border-yellow-500",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    textClass: "text-yellow-700 dark:text-yellow-300",
    badgeClass: "bg-yellow-500 text-white",
  },
} as const;

// ---------------------------------------------------------------------------
// Phase metadata
// ---------------------------------------------------------------------------

export type PhaseColor = "yellow" | "blue" | "purple" | "indigo" | "emerald";

export const PHASES = [
  {
    id: 1 as const,
    icon: "🧭",
    short: "Localización",
    full: "Cálculo de Declinación Magnética",
    color: "yellow" as PhaseColor,
    description:
      "Calcula la declinación magnética exacta para orientar correctamente tus paneles",
  },
  {
    id: 2 as const,
    icon: "⚙️",
    short: "Configuración",
    full: "Parámetros del Sistema",
    color: "blue" as PhaseColor,
    description:
      "Define el consumo y las preferencias de tu instalación fotovoltaica",
  },
  {
    id: 3 as const,
    icon: "📐",
    short: "Dimensionado",
    full: "Análisis y Recomendación",
    color: "purple" as PhaseColor,
    description:
      "El sistema analiza tus datos y recomienda la mejor solución energética",
  },
  {
    id: 4 as const,
    icon: "🛒",
    short: "Componentes",
    full: "Selección de Componentes",
    color: "indigo" as PhaseColor,
    description:
      "Elige los componentes concretos — el sistema pre-selecciona los más adecuados",
  },
  {
    id: 5 as const,
    icon: "✅",
    short: "Resumen",
    full: "Resumen Final",
    color: "emerald" as PhaseColor,
    description: "Revisa el diseño completo de tu instalación solar",
  },
] as const;

export type PhaseId = (typeof PHASES)[number]["id"];

// ---------------------------------------------------------------------------
// Color palette per phase (Tailwind classes)
// ---------------------------------------------------------------------------

export const PHASE_COLORS: Record<
  PhaseColor,
  {
    activeBubble: string;
    doneBubble: string;
    ring: string;
    text: string;
    subtext: string;
    gradient: string;
  }
> = {
  yellow: {
    activeBubble:
      "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg scale-110",
    doneBubble:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-400",
    subtext: "text-yellow-600 dark:text-yellow-300",
    gradient:
      "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
  },
  blue: {
    activeBubble:
      "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-110",
    doneBubble:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    subtext: "text-blue-600 dark:text-blue-300",
    gradient:
      "from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
  },
  purple: {
    activeBubble:
      "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-110",
    doneBubble:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-400",
    subtext: "text-purple-600 dark:text-purple-300",
    gradient:
      "from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
  },
  indigo: {
    activeBubble:
      "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg scale-110",
    doneBubble:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-700 dark:text-indigo-400",
    subtext: "text-indigo-600 dark:text-indigo-300",
    gradient:
      "from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
  },
  emerald: {
    activeBubble:
      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg scale-110",
    doneBubble:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    ring: "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    subtext: "text-emerald-600 dark:text-emerald-300",
    gradient:
      "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
  },
};

// ---------------------------------------------------------------------------
// Installation modality
// ---------------------------------------------------------------------------

export type InstallationModality =
  | "autoconsumo_sin_baterias"
  | "autoconsumo_0_inyeccion"
  | "autoconsumo_con_baterias"
  | "aislada"
  | "respaldo_ups";

export const MODALITY_INFO: Record<
  InstallationModality,
  {
    icon: string;
    label: string;
    shortLabel: string;
    description: string;
    hasBatteries: boolean;
    installationType: "on-grid" | "off-grid";
    autonomyDefault: number;
    autonomyRecommend: string;
    accentColor: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
  }
> = {
  autoconsumo_sin_baterias: {
    icon: "💡",
    label: "Autoconsumo sin baterías",
    shortLabel: "Autoconsumo básico",
    description:
      "Genera tu propia energía y reduce la factura. Cuando no hay sol usas la red normalmente.",
    hasBatteries: false,
    installationType: "on-grid",
    autonomyDefault: 0,
    autonomyRecommend: "Sin almacenamiento",
    accentColor: "amber",
    borderClass: "border-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-900/20",
    textClass: "text-amber-700 dark:text-amber-300",
  },
  autoconsumo_0_inyeccion: {
    icon: "⚡",
    label: "Autoconsumo 0-inyección",
    shortLabel: "0-inyección",
    description:
      "Produces solo lo que consumes en cada momento. No viertes energía sobrante a la red.",
    hasBatteries: false,
    installationType: "on-grid",
    autonomyDefault: 0,
    autonomyRecommend: "Sin almacenamiento",
    accentColor: "orange",
    borderClass: "border-orange-500",
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    textClass: "text-orange-700 dark:text-orange-300",
  },
  autoconsumo_con_baterias: {
    icon: "🔋",
    label: "Autoconsumo con baterías",
    shortLabel: "Con baterías",
    description:
      "Produce, almacena y consume. Mayor independencia de la red y protección ante subidas de precio.",
    hasBatteries: true,
    installationType: "on-grid",
    autonomyDefault: 2,
    autonomyRecommend: "1–3 días recomendado",
    accentColor: "green",
    borderClass: "border-green-500",
    bgClass: "bg-green-50 dark:bg-green-900/20",
    textClass: "text-green-700 dark:text-green-300",
  },
  aislada: {
    icon: "🏕️",
    label: "Instalación aislada",
    shortLabel: "Aislada (off-grid)",
    description:
      "Sin conexión a la red eléctrica. Las baterías son imprescindibles para tener suministro de noche.",
    hasBatteries: true,
    installationType: "off-grid",
    autonomyDefault: 3,
    autonomyRecommend: "3–5 días recomendado",
    accentColor: "blue",
    borderClass: "border-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    textClass: "text-blue-700 dark:text-blue-300",
  },
  respaldo_ups: {
    icon: "🛡️",
    label: "Respaldo / UPS solar",
    shortLabel: "Respaldo UPS",
    description:
      "Protección ante cortes de luz. Las baterías se cargan de la red y del sol para usarse en emergencias.",
    hasBatteries: true,
    installationType: "on-grid",
    autonomyDefault: 1,
    autonomyRecommend: "4–8 horas típico (≈ 0.5 días)",
    accentColor: "purple",
    borderClass: "border-purple-500",
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    textClass: "text-purple-700 dark:text-purple-300",
  },
};

// ---------------------------------------------------------------------------
// Price estimates (retail, per unit — rough market averages €)
// ---------------------------------------------------------------------------

export const PRICE_PER_WP_EUR = {
  monofacial: 0.38,  // €/Wp retail installed
  bifacial: 0.48,
} as const;

export const PRICE_PER_KWH_BATTERY_EUR = 280; // €/kWh useful capacity
export const PRICE_PER_KW_INVERTER_EUR = 160;  // €/kW AC nominal
export const OTHERS_FACTOR = 0.18;             // 18% for cabling, structure, protections
export const DEFAULT_ELECTRICITY_PRICE_EUR = 0.22; // €/kWh (Spain avg)
