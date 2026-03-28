# Fase 0 - Inventario operativo de src/meteo.js

## Variables globales top-level críticas

| Área | Símbolos | Ubicación aproximada |
| --- | --- | --- |
| Caché y modo | `DATOS_METEO_CACHE`, `DATOS_METEO_ECMWF_CACHE`, `esModoOffline` | `src/meteo.js:6-7`, `src/meteo.js:78` |
| Favoritos | `soloFavoritos`, `modoEdicionFavoritos`, `totalFavoritos`, `totalDespeguesDisponibles`, `idsPendientesDeConfirmacion`, `estadoPendienteDeAplicar` | `src/meteo.js:8-11`, `src/meteo.js:1327-1328` |
| Preferencias persistidas | `VelocidadMin`, `VelocidadIdeal`, `VelocidadMax`, `RachaMax`, `XCTechoLims`, `XCCapeLims`, `XCCinLims`, `chkAplicarCalibracion`, `chkMostrarRafagosidad`, `chkMostrarVientoAlturas`, `chkMostrarCizalladura`, `chkMostrarProbPrecipitacion`, `chkMostrarXC` | `src/meteo.js:14-27`, `src/meteo.js:44-64` |
| Slider horario | `sliderHorasValues`, `indicesHorasRangoHorario` y sus espejos en `window` | `src/meteo.js:38-39`, `src/meteo.js:1711`, `src/meteo.js:1763`, `src/meteo.js:1854-1888` |
| Datos cargados | `bdGlobalDespegues`, `window.bdGlobalDespegues` | `src/meteo.js:42`, `src/meteo.js:2747` |
| Filtro distancia | `centroLat`, `centroLon`, `mapaLeaflet`, `marcadorActual` | `src/meteo.js:96-110` |

## Contratos públicos desde HTML inline

### index.html

- `alternardivDistancia(event)` - `src/index.html:83`
- `filtroVerSoloFavoritos()` - `src/index.html:88`
- `desmarcarFavoritos()` - `src/index.html:93`
- `abrirFavoritos()` - `src/index.html:97`
- `guardarFavoritos()` - `src/index.html:101`
- `abrirLinkExterno(url)` - `src/index.html:105`, `src/index.html:439`, `src/index.html:441`
- `activarEdicionFavoritos()` - `src/index.html:109`
- `sugerirGuiaFavoritos(true)` - `src/index.html:114`
- `alternardivConfiguracion(event)` - `src/index.html:118`, `src/index.html:228`
- `resetFiltroDistancia()` - `src/index.html:147`
- `resetFiltroCondiciones()` - `src/index.html:184`
- `finalizarEdicionFavoritos()` - `src/index.html:216`
- `alternarMostrarProbPrecipitacion()` - `src/index.html:323`
- `alternarMostrarVientoAlturas()` - `src/index.html:331`
- `alternarMostrarXC()` - `src/index.html:339`
- `alternarHorasNoche()` - `src/index.html:353`
- `alternarMostrarCizalladura()` - `src/index.html:361`
- `alternarMostrarRafagosidad()` - `src/index.html:369`
- `alternarAplicarCalibracion()` - `src/index.html:377`
- `importarConfiguracion()` - `src/index.html:419`
- `exportarConfiguracion()` - `src/index.html:422`
- `btnRestablecerConfiguración()` - `src/index.html:425`
- `sugerirGuiaPrincipal(true)` - `src/index.html:437`

## Exposición directa en window y callbacks por nombre

### Asignaciones directas observadas

- `window.accionCargarFavoritos` - `src/meteo.js:1109`
- `window.sliderHorasValues` - `src/meteo.js:1711`, `src/meteo.js:1979`, `src/meteo.js:1992`
- `window.calcularIndicesPreferencia` - `src/meteo.js:1763`
- `window.horasCrudasRangoHorario` - `src/meteo.js:1854-1885`
- `window.indicesHorasRangoHorario` - `src/meteo.js:1888-1906`
- `window.accionCargarPerfil` - `src/meteo.js:2299`
- `window.bdGlobalDespegues` - `src/meteo.js:2747`
- `window.oldUpdatingMF`, `window.oldUpdatingEC` - `src/meteo.js:6150-6151`
- `window.resetFiltroCondiciones` - `src/meteo.js:6371`
- `window.resetFiltroDistancia` - `src/meteo.js:6398`
- `window.abrirLinkExterno` - `src/meteo.js:6820`

### Resolución dinámica por nombre

- `mensajeModalAceptar(..., accionesAceptar)` recorre nombres y ejecuta `window[nombreFuncion]` - `src/meteo.js:473-481`
- `mensajeModalAceptarCancelar(..., accionesAceptar)` hace la misma resolución - `src/meteo.js:518-527`

## Persistencia a preservar

### localStorage

- Límites y scoring: `METEO_VELOCIDAD_MINIMA`, `METEO_VELOCIDAD_IDEAL`, `METEO_VELOCIDAD_MAXIMA`, `METEO_RACHA_MAX`, `METEO_XC_TECHO_LIMS`, `METEO_XC_CAPE_LIMS`, `METEO_XC_CIN_LIMS`
- Rango horario: `METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO`, `METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN`
- Toggles visuales: `METEO_CHECKBOX_APLICAR_CALIBRACION`, `METEO_CHECKBOX_MOSTRAR_RAFAGOSIDAD`, `METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS`, `METEO_CHECKBOX_MOSTRAR_CIZALLADURA`, `METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION`, `METEO_CHECKBOX_MOSTRAR_XC`, `METEO_CHECKBOX_SOLO_HORAS_DE_LUZ`
- Distancia/origen: `METEO_FILTRO_DISTANCIA_LAT_INICIAL`, `METEO_FILTRO_DISTANCIA_LON_INICIAL`
- Favoritos y primera visita: `METEO_FAVORITOS_LISTA`, `METEO_PRIMERA_VISITA_HECHA`, `METEO_GUIA_PRINCIPAL_VISTA`, `METEO_GUIA_FAVORITOS_VISTA`
- Recuperación: `METEO_FLAG_CRASH_DETECTADO`, `METEO_CRASH_COUNTER`

### IndexedDB

- Base: `FlyDecisionDB`
- Object store: `meteoCache`
- Entrada principal observada: `forecastData`

## Puntos de invocación de construir_tabla

### Arranque y bootstrap

- `actualizarOrigenGlobal()` - `src/meteo.js:122`
- selección manual en mapa - `src/meteo.js:137`
- cierre de onboarding y primeras acciones - `src/meteo.js:1007`, `src/meteo.js:1041`, `src/meteo.js:1098`, `src/meteo.js:1526`
- `DOMContentLoaded` principal - `src/meteo.js:5262`

### Preferencias y sliders

- toggles de configuración - `src/meteo.js:1593-1638`
- filtro horario - `src/meteo.js:1714`, `src/meteo.js:1993`
- sliders de viento y racha - `src/meteo.js:5730`, `src/meteo.js:5763`, `src/meteo.js:5901`

### Favoritos, buscador y resets

- agregar desde buscador - `src/meteo.js:5218`, `src/meteo.js:5224`
- crash recovery / refresco inicial - `src/meteo.js:5289`, `src/meteo.js:5324`
- reset filtros globales - `src/meteo.js:6395`, `src/meteo.js:6428`

### Runtime híbrido

- network/heartbeat - `src/meteo.js:5478`, `src/meteo.js:5588`
- resume/foreground - `src/meteo.js:6696`, `src/meteo.js:6701`, `src/meteo.js:6711`

## Listeners y side effects delicados

- listeners top-level de mapa y modales al cargar script - `src/meteo.js:101-331`
- `window.addEventListener('click', ...)` para cierres externos - `src/meteo.js:331`
- `document.addEventListener('DOMContentLoaded', ...)` bootstrap principal - `src/meteo.js:5262`
- monitor online/offline + heartbeat - `src/meteo.js:5837-6246`
- Android back button jerárquico - `src/meteo.js:6471-6590`
- resume nativo y `visibilitychange` web - `src/meteo.js:6655-6753`
- exportación de links externos con `Capacitor.Browser` o `window.open` - `src/meteo.js:6732-6820`

## Contrato estructural de tabla

- El número de filas por despegue depende de `chkMostrarProbPrecipitacion`, `chkMostrarVientoAlturas`, `chkMostrarXC`, `chkMostrarCizalladura` y `chkMostrarRafagosidad`
- El cálculo está duplicado al menos en tres zonas: gestión masiva de favoritos, actualización visual de favoritos y filtrado por buscador/provincia
- Ubicaciones base: `src/meteo.js:1342-1351`, `src/meteo.js:1426-1435`, `src/meteo.js:4972-4981`

## Riesgos bloqueantes para mover código

- No romper nombres públicos usados por `onclick` o por `window[nombreFuncion]`
- No cambiar el orden de side effects al cargar `meteo.js`
- No alterar claves persistidas ni su semántica booleana por defecto
- No introducir un segundo cálculo distinto de filas por despegue
- No convertir todavía `construir_tabla()` en pipeline distinto; solo recolocar piezas de bajo riesgo