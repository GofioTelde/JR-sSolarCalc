import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = "https://jrssolarcalc.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "JR's SolarCalc — Calculadora de Instalación Solar Fotovoltaica",
    template: "%s | JR's SolarCalc",
  },
  description:
    "Calcula gratis el dimensionado de tu instalación solar fotovoltaica: número de paneles, baterías, inversor y presupuesto orientativo. Datos reales de PVGIS, cálculo de HSP y declinación magnética. Herramienta gratuita paso a paso.",
  keywords: [
    "calculadora solar fotovoltaica",
    "dimensionado instalación solar",
    "calculadora paneles solares",
    "cálculo placas solares",
    "instalación fotovoltaica online",
    "horas de sol pico HSP",
    "PVGIS calculadora solar",
    "dimensionado baterías solar",
    "presupuesto instalación solar",
    "cálculo inversor solar",
    "autoconsumo solar fotovoltaico",
    "declinación magnética solar",
    "energía solar España",
    "calculo sistema fotovoltaico",
  ],
  authors: [{ name: "Juan Rafael" }],
  creator: "Juan Rafael",
  publisher: "JR's SolarCalc",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: BASE_URL,
    siteName: "JR's SolarCalc",
    title: "JR's SolarCalc — Calculadora de Instalación Solar Fotovoltaica",
    description:
      "Herramienta gratuita para dimensionar instalaciones solares fotovoltaicas: paneles, baterías, inversor y presupuesto. Datos reales de PVGIS.",
  },
  twitter: {
    card: "summary_large_image",
    title: "JR's SolarCalc — Calculadora Solar Fotovoltaica Gratuita",
    description:
      "Dimensiona tu instalación solar gratis: número de paneles, baterías, inversor y presupuesto orientativo paso a paso.",
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JR's SolarCalc",
  url: BASE_URL,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  description:
    "Calculadora gratuita para el dimensionado de instalaciones solares fotovoltaicas: paneles, baterías, inversor, HSP con PVGIS y presupuesto orientativo.",
  inLanguage: "es",
  author: {
    "@type": "Person",
    name: "Juan Rafael",
  },
  featureList: [
    "Cálculo de declinación magnética",
    "Integración con PVGIS para HSP",
    "Dimensionado de paneles fotovoltaicos",
    "Dimensionado de baterías",
    "Selección de inversor",
    "Presupuesto orientativo",
    "Lista de materiales completa",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.className} antialiased dark:bg-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
