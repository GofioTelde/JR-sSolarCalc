# Calculadora Solar Fotovoltaica

Herramienta web interactiva para el dimensionado y presupuesto de instalaciones solares fotovoltaicas residenciales e industriales.

## Funcionalidades

- **Dimensionado automático** a partir del consumo eléctrico del usuario
- **5 modalidades de instalación**: autoconsumo sin baterías, autoconsumo con vertido 0, autoconsumo con baterías, instalación aislada, respaldo UPS
- **2 tipos de sistema**: híbrido (todo-en-uno) y componentes separados
- **Soporte monofásico y trifásico**
- **Catálogo de componentes** con precios estimados de mercado (sin IVA):
  - Paneles solares monofaciales y bifaciales
  - Inversores híbridos, de red y off-grid
  - Controladores MPPT
  - Baterías LiFePO4 (48V y HV)
- **Resumen de presupuesto** con lista de materiales desglosada
- **Contador de visitas** (accesible con la combinación de teclas `v` `i` `s`)

## Stack técnico

- [Next.js 14](https://nextjs.org) App Router
- TypeScript estricto
- Tailwind CSS
- Supabase (contador de visitas)

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de entorno

Crea un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Despliegue

Compatible con [Vercel](https://vercel.com). Consulta la [documentación de despliegue de Next.js](https://nextjs.org/docs/app/building-your-application/deploying).

> Los precios del catálogo son orientativos (mercado 2024, sin IVA) y pueden variar según proveedor y cantidades.
