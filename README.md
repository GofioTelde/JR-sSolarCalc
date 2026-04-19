# Calculadora Solar Fotovoltaica

Herramienta web interactiva para el dimensionado y presupuesto de instalaciones solares fotovoltaicas residenciales e industriales. Diseñada para usuarios no técnicos: la calculadora explica cada decisión con lenguaje claro y muestra el precio real de cada opción.

## Funcionalidades

- **Dimensionado automático** a partir del consumo eléctrico del usuario
- **5 modalidades de instalación**: autoconsumo sin baterías, autoconsumo con vertido 0, autoconsumo con baterías, instalación aislada, respaldo UPS
- **2 tipos de sistema**: híbrido (todo-en-uno) y componentes separados
- **Soporte monofásico y trifásico**
- **Catálogo de componentes** con precios estimados de mercado (sin IVA):
  - Paneles solares monofaciales y bifaciales
  - Inversores híbridos, de red y off-grid
  - Controladores MPPT
  - Baterías LiFePO4 (48V LV y 200V HV)
- **Validación de compatibilidad** entre baterías HV/LV e inversores
- **Sistema de kits preconfigurados** — siempre se recomienda 1 kit completo (nunca varios kits en paralelo)
- **Información de cobertura en cada kit** — se indica si 1 kit cubre la necesidad o cuánto falta
- **Aviso de coste elevado** cuando se seleccionan muchas baterías HV (>2 unidades)
- **Resumen de presupuesto** con lista de materiales desglosada, precios por unidad y kWh totales
- **Contador de visitas** (accesible con la combinación de teclas `v` `i` `s`)

## Conceptos clave para el usuario

### ¿Qué es un kit?
Un kit es un paquete completo: inversor + baterías + paneles ya dimensionados para trabajar juntos. **Se compra 1 kit**, no varios. Si un kit incluye 2 o más baterías, eso es parte del mismo paquete. Nunca se recomienda comprar múltiples kits en paralelo si existe uno solo que cubra la necesidad.

### Baterías LV (48V) vs HV (200V)
- **LV (baja tensión, 48V)**: baterías más económicas por kWh, fáciles de ampliar conectando más en paralelo. Compatibles con la mayoría de inversores híbridos.
- **HV (alta tensión, 200V)**: cada unidad es un pack autónomo con BMS integrado. Más caras por kWh pero más compactas y eficientes. Requieren inversores compatibles HV específicos (Fronius GEN24, FOX-ESS H3, etc.).
- Si el coste de las baterías HV resulta elevado (más de 2 unidades), la calculadora sugiere valorar un sistema LV como alternativa.

### ¿Cuántas baterías necesito?
La calculadora lo calcula automáticamente en función del consumo diario y los días de autonomía seleccionados. La lista de compra muestra el kWh por unidad y el total, para que sea fácil comparar opciones.

## Stack técnico

- [Next.js 14](https://nextjs.org) App Router
- TypeScript estricto
- Tailwind CSS
- Supabase (contador de visitas)

## Fuentes de Datos

### Datos de Irradiancia Solar

- **Fuente:** [PVGIS (EU Photovoltaic Geographical Information System)](https://re.jrc.ec.europa.eu/pvg_tools/en/)
- **Proveedor:** Joint Research Centre (JRC) de la Comisión Europea
- **Descripción:** API pública para cálculo de generación solar fotovoltaica basada en datos satelitales y modelos meteorológicos
- **Uso:** Estimación de radiación solar horizontal y generación anual de energía

### Datos Geográficos

- **Fuente:** [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- **Descripción:** Geocodificación libre de ubicaciones (latitud, longitud, elevación, país)
- **Uso:** Localización automática de instalaciones

### Datos de Declinación Magnética

- **Modelo:** World Magnetic Model 2020 (WMM2020)
- **Proveedor:** NOAA National Centers for Environmental Information (NCEI) y British Geological Survey (BGS)
- **Uso:** Cálculo de azimut real para orientación de paneles

### Catálogo de Componentes

- **Paneles solares:** Especificaciones técnicas de fabricantes estándar
- **Baterías LiFePO4:** Modelos Pylontech, Growatt ARK XH, FOX-ESS, BYD, Huawei LUNA2000, Suntaic, Hoymiles (48V LV y 200V HV)
- **Inversores híbridos:** Growatt, Deye, Solis, Fronius, FOX-ESS, Huawei, Azzurro, Ingeteam
- **Inversores de red:** Modelos monofásicos y trifásicos
- **Controladores MPPT:** Victron Energy, Tensite
- **Precios:** Orientativos de mercado 2024–2025 sin IVA — pueden variar según proveedor y cantidades

#### Actualización de Datos de Componentes

Para actualizar el catálogo de componentes en el futuro, revisa:

- `/src/data/paneles_monofaciales.json` - Paneles monofaciales
- `/src/data/paneles_bifaciales.json` - Paneles bifaciales
- `/src/data/baterias.json` - Baterías LiFePO4 (LV y HV). Campos clave: `tipo` (`lifepo4` = LV, `lifepo4_hv` = HV), `tension_nominal`, `max_paralelo`, `precio_ud`
- `/src/data/inversores_hibridos.json` - Inversores híbridos con soporte LV/HV. Campo clave: `bateria_tension` (tensión del bus DC)
- `/src/data/inversores_red.json` - Inversores de red (grid-tie)
- `/src/data/modulos_separados.json` - Controladores MPPT e inversores off-grid
- `/src/data/kits.json` - Kits preconfigurados. Campos clave: `energia_almacenada_kwh` (kWh totales del kit), `baterias_cantidad` (unidades incluidas), `precio_total` (precio del kit completo)

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

## Notas Importantes

- Los precios del catálogo son **orientativos** (mercado 2024–2025, sin IVA) y pueden variar según proveedor y cantidades
- La herramienta valida automáticamente la **compatibilidad entre baterías HV/LV e inversores** — si seleccionas una batería HV (200V), solo aparecerán inversores HV compatibles
- Las recomendaciones de componentes se basan en relación precio/capacidad/eficiencia — siempre puedes seleccionar opciones superiores (mejores) o inferiores (con advertencia)
- Los **kits se recomiendan siempre como unidad singular** — la calculadora nunca sugiere comprar varios kits iguales en paralelo; si ningún kit cubre la necesidad, se indica la diferencia y se sugiere añadir baterías adicionales compatibles
