# refactor.agent.md

## Objetivo

Refactorizar `meteo.js` de forma **incremental, segura y reversible**, manteniendo el comportamiento visible de la app y reduciendo el acoplamiento entre:

- estado y persistencia
- servicios de datos
- lógica de dominio
- controladores de feature
- render/UI
- runtime híbrido Android/Web

El punto de llegada no es una reescritura total, sino convertir `meteo.js` en un **entrypoint/orquestador** y mover responsabilidades a módulos con límites claros.

La regla dominante de todo el plan es esta:

**El código debe recolocarse, no rediseñarse.**

---

## Diagnóstico real

El archivo actual no es solo grande. También concentra y mezcla responsabilidades que se pisan entre sí:

- estado global mutable (`soloFavoritos`, `modoEdicionFavoritos`, caches, checks, origen geográfico, arrays auxiliares de sliders, timestamps, timers, flags de crash)
- persistencia en `localStorage`
- caché en RAM + IndexedDB + fallback offline
- lógica de filtros y puntuación
- guías, onboarding, mensajes y modales
- geolocalización, mapa Leaflet y runtime Capacitor
- construcción de tabla, ordenación, filtrado visual y sincronización de controles

Además, `meteo.js` no depende solo de código interno. También depende de **contratos históricos** que deben tratarse como API pública mientras dure el refactor:

- funciones llamadas desde `onclick="..."` en `index.html`
- callbacks resueltos por nombre mediante `window[nombreFuncion]`
- funciones publicadas manualmente en `window`
- claves de `localStorage` e IndexedDB ya persistidas en personas usuarias reales
- ids, clases y `data-*` usados por JS y CSS
- estructura concreta de la tabla y número dinámico de filas por despegue
- flujos Android/Web ligados a `backButton`, `resume`, `visibilitychange`, red y apertura de enlaces externos

Conclusión:

`meteo.js` hace a la vez de:

- bootstrap de aplicación
- store mutable en memoria
- adapter de persistencia
- servicio de datos
- controlador de features
- renderer principal
- coordinador de runtime híbrido

El refactor debe separar esas capas **sin romper contratos públicos ni cambiar el comportamiento visible**.

---

## Principios del refactor

1. **No hacer reescritura completa.**
2. **No cambiar comportamiento visible salvo bug real corregido.**
3. **Trabajar en fases pequeñas, revisables y reversibles.**
4. **Priorizar extracción de módulos de bajo riesgo primero.**
5. **No tocar CSS salvo necesidad estricta.**
6. **No romper nombres públicos requeridos por HTML inline o listeners ya conectados.**
7. **Cada fase debe dejar checklist manual de validación.**
8. **El estado persistente y el efímero deben quedar claramente separados.**
9. **Las funciones puras deben vivir fuera de los controladores de UI.**
10. **`construir_tabla()` debe dejar de ser la “función dios”.**
11. **Priorizar recolocación sobre modificación.**
12. **Mantener compatibilidad pública con wrappers, bridges o adaptadores antes de eliminar globals o contratos existentes.**
13. **No cambiar el orden efectivo de side effects sin necesidad estricta.**
14. **No mezclar simplificación semántica con traslado físico del código en la misma fase si eso aumenta riesgo.**

---

## Restricción principal

El código debe ser **recolocado, no rediseñado**.

### Regla operativa

- mover funciones completas antes de reescribirlas
- conservar firmas, nombres públicos y efectos laterales esperados
- evitar cambios semánticos salvo corrección mínima imprescindible
- si una extracción obliga a cambiar llamadas existentes, crear primero una capa de compatibilidad
- cualquier mejora interna debe ser invisible para HTML, CSS, `window`, `localStorage` y runtime nativo/web

---

## Objetivo arquitectónico

### Estado final buscado

- `meteo.js` o `index.js` será el **entrypoint**
- la carga de datos irá a **services/**
- la persistencia irá a **state/**
- la lógica pura irá a **domain/**
- los flujos de negocio concretos irán a **features/**
- el render y la manipulación visual estarán en **ui/**
- la compatibilidad heredada quedará aislada en una capa explícita y temporal

### Meta realista de la primera ola

No hace falta una granularidad extrema al principio. La primera versión puede agrupar varios módulos, siempre que las responsabilidades queden limpias y los contratos públicos se mantengan.

### Compatibilidad obligatoria en todas las fases

Antes de mover nada, asumir que los siguientes elementos son contratos estables y no deben romperse:

- ids, clases y `data-*` ya usados por JS o CSS
- nombres de funciones usados por HTML inline
- nombres de funciones resueltos a través de `window`
- claves actuales de `localStorage` e IndexedDB
- orden visual y agrupación de filas de la tabla
- flujo Android/Web existente de mensajes, paneles, `resume` y `backButton`

---

## Estructura propuesta

### Versión objetivo recomendada

```text
/js/meteo/
  index.js

  compat/
    public-api.js

  state/
    app-state.js
    preferences-store.js
    favorites-store.js
    cache-store.js

  services/
    meteo-data-service.js
    geolocation-service.js
    map-service.js

  domain/
    filters.js
    scoring.js
    time-range.js
    distance.js
    orientation.js

  ui/
    messages/
      message-manager.js
      dialog-helpers.js
    guides/
      principal-guide.js
      favoritos-guide.js
      onboarding.js
    sliders/
      horario-slider.js
      configuracion-slider.js
      distancia-slider.js
      condiciones-slider.js
    table/
      table-controller.js
      table-layout.js
      table-renderer.js
      table-headers.js
      table-rows.js
      table-view-model.js
    panels/
      filtros-panel.js
      configuracion-panel.js
      focus-mode.js

  features/
    favorites/
      favorites-controller.js
      favorites-import-export.js
      favorites-bulk-actions.js
    distance-filter/
      distance-filter-controller.js
    app-navigation/
      back-button-controller.js
      runtime-controller.js

  utils/
    dom.js
    storage.js
    dates.js
    constants.js
```

### Versión mínima viable para la primera iteración

```text
/js/meteo/
  index.js

  compat/
    public-api.js

  state/
    app-state.js
    preferences-store.js
    favorites-store.js
    cache-store.js

  services/
    meteo-data-service.js
    geolocation-service.js

  domain/
    time-range.js
    distance.js
    orientation.js

  ui/
    messages.js
    guides.js
    sliders.js
    table-layout.js
    table-renderer.js

  features/
    favorites.js
    distance-filter.js
    app-navigation.js
```

---

## Responsabilidades por módulo

## `index.js`

### Responsabilidad

Ser el **entrypoint y orquestador** de la app.

### Debe hacer

- inicializar módulos
- hidratar estado inicial
- conectar listeners principales
- coordinar la carga inicial
- invocar el render de alto nivel

### No debe hacer

- lógica de negocio meteorológica
- acceso directo a `localStorage` repartido
- lógica de fetch/offline
- montar el HTML completo de la tabla
- contener helpers sueltos sin relación

---

## `compat/public-api.js`

### Responsabilidad

Mantener la **compatibilidad pública temporal** mientras se mueve código a módulos.

### Debe absorber

- publicación controlada de funciones en `window`
- adaptadores para `onclick="..."` existentes
- registro de callbacks aún resueltos por nombre
- wrappers para funciones llamadas desde HTML generado dinámicamente

### Debe evitar

- lógica de negocio real
- acceso directo a DOM salvo el imprescindible para preservar contratos
- convertirse en un segundo `meteo.js`

### Motivo

Sin esta capa, la extracción incremental rompe fácilmente la app por dependencias históricas de `window` y del HTML inline.

---

## `state/app-state.js`

### Responsabilidad

Guardar el **estado efímero en memoria** de la sesión actual.

### Debe contener

- modo edición de favoritos
- estado visual de filtros abiertos/cerrados
- flags efímeros de UI
- selección actual de sliders
- estado actual offline/online ya resuelto
- datos ya cargados en memoria si se decide centralizar ahí
- timestamps y banderas efímeras de actualización
- estado de crash/recovery mientras dure la sesión
- arrays auxiliares del slider horario y derivados calculados
- timers o referencias runtime si se decide centralizarlos explícitamente

### No debe contener

- lógica de fetch
- render DOM
- persistencia real en IndexedDB o `localStorage`

---

## `state/preferences-store.js`

### Responsabilidad

Centralizar **lectura/escritura de preferencias persistentes**.

### Debe absorber

- límites de viento
- checks de visualización
- rango horario preferido
- flags de guías vistas
- flags de primera visita
- coordenadas persistidas del origen

### Debe exponer

- getters tipados
- setters pequeños y coherentes
- defaults centralizados

---

## `state/favorites-store.js`

### Responsabilidad

Centralizar la persistencia de favoritos.

### Debe absorber

- `obtenerFavoritos()`
- escritura de favoritos
- limpieza completa
- migración nombre -> ID
- normalización a `Number`

### Debe evitar

- tocar DOM
- actualizar iconos o contadores visuales
- decidir modales de confirmación

---

## `state/cache-store.js`

### Responsabilidad

Gestionar caché persistente y su acceso:

- IndexedDB
- claves de caché
- versión del esquema
- serialización si hace falta

### Debe absorber

- `initDB`
- `guardarEnCacheIDB`
- `leerDeCacheIDB`

---

## `services/meteo-data-service.js`

### Responsabilidad

Gestionar la **carga de datos meteorológicos** y su estrategia de resolución.

### Debe absorber

- lectura desde RAM cache
- fetch de `meteo-datos.json`
- fetch de `meteo-datos-ecmwf.json`
- fallback a IndexedDB
- determinación de `esModoOffline`
- devolución de un objeto homogéneo de datos y origen

### Interfaz recomendada

```js
async function getForecastData({ forceReload = false }) {
  return {
    data,
    dataEcmwf,
    source: 'memory' | 'network' | 'indexeddb',
    isOffline,
  };
}
```

---

## `services/geolocation-service.js`

### Responsabilidad

Abstraer la geolocalización del dispositivo.

### Debe absorber

- uso de `Capacitor.Plugins.Geolocation`
- fallback a `navigator.geolocation`
- permisos
- errores amigables y estados intermedios

### No debe hacer

- abrir modales
- decidir cómo se pinta el mapa
- reconstruir la tabla

---

## `services/map-service.js`

### Responsabilidad

Encapsular la integración con Leaflet.

### Debe absorber

- inicialización del mapa
- reposicionamiento
- creación/actualización de marcador
- invalidación de tamaño
- listeners del mapa puro

### No debe hacer

- persistir coordenadas
- decidir si filtra favoritos
- abrir o cerrar mensajes globales

---

## `domain/time-range.js`

### Responsabilidad

Agrupar toda la lógica pura de tiempo y rango horario.

### Debe absorber

- `HORAS_LUZ_CON_MARGEN`
- `esCeldaNoche()`
- cálculo de índices válidos
- cálculo de preferencia horaria por día
- helpers para traducir índice de slider -> hora real
- lógica de pips diarios

---

## `domain/distance.js`

### Responsabilidad

Funciones puras de geografía y distancia.

### Debe absorber

- fórmula de Haversine
- utilidades auxiliares relacionadas

---

## `domain/orientation.js`

### Responsabilidad

Generar o preparar visualizaciones/transformaciones ligadas a orientaciones.

### Debe absorber

- `createOrientationSVG()`
- helpers relacionados con orientación del viento o parsing de orientaciones

---

## `domain/filters.js`

### Responsabilidad

Aplicar filtros de negocio sobre los datos ya cargados.

### Debe incluir

- filtro favoritos
- filtro distancia
- filtro buscador
- inclusión temporal de no favoritos en distancia
- composición de filtros

### Nota

El filtrado puramente visual posterior al render no debe moverse aquí hasta que el contrato de tabla y el pipeline estén estabilizados.

---

## `domain/scoring.js`

### Responsabilidad

Aislar la lógica meteorológica y de puntuación.

### Debe incluir

- límites de condiciones
- umbrales de cizalladura
- cálculo de puntuaciones para despegue/XC
- normalización de semáforos y colores
- reglas puras hoy dispersas

### Nota

No forzar esta extracción si implica tocar a la vez render, layout y filtros. Primero estabilizar pipeline.

---

## `ui/messages/message-manager.js`

### Responsabilidad

Ser la capa visual de mensajes y modales.

### Debe absorber

- `GestorMensajes`
- creación/eliminación del nodo actual
- render de botones
- configuración de modal vs no modal
- compatibilidad temporal con callbacks resueltos por nombre

### Debe evitar

- decidir lógica de negocio del mensaje
- ejecutar operaciones de favoritos o tabla directamente salvo callback inyectado

---

## `ui/messages/dialog-helpers.js`

### Responsabilidad

Agrupar helpers de alto nivel sobre el message manager.

### Debe absorber

- `mensajeModalAceptar`
- `mensajeModalAceptarCancelar`
- mensajes reutilizables simples
- adaptadores para transición progresiva de `accionesAceptar` string -> callback real

---

## `ui/guides/*`

### Responsabilidad

Contener la lógica de guías y onboarding:

- guía principal
- guía favoritos
- onboarding de primera visita

### Restricción

No mover la guía inicial junto con cambios simultáneos de modo, favoritos y carga de tabla si no hay pipeline estable.

---

## `ui/sliders/*`

### Responsabilidad

Separar por slider o por grupo lógico la lógica de noUiSlider.

### Debe absorber

- configuración del slider horario
- configuración del slider de preferencias horarias
- configuración del slider de distancia
- configuración del slider de condiciones
- binding de eventos
- reconstrucción/reconfiguración sin mezclar con el resto de la tabla

### Restricción

Respetar el orden actual de eventos `slide`, `change`, `set` y reconstrucciones asociadas.

---

## `ui/panels/*`

### Responsabilidad

Controlar paneles visuales y estado de foco.

### Debe absorber

- blur/enfoque de fondo
- apertura/cierre de configuración
- apertura/cierre de filtros
- sincronización de clases visuales

---

## `ui/table/table-layout.js`

### Responsabilidad

Definir el **contrato estructural de la tabla** para que otras piezas no dependan de cálculos duplicados o layout implícito.

### Debe absorber

- cálculo de número de filas por despegue según checks activos
- helpers para localizar fila principal, celda favorito y bloques renderizados
- constantes o helpers de grupos de filas visuales

### Motivo

Favoritos, buscador y render comparten hoy un contrato implícito sobre la tabla. Ese contrato debe hacerse explícito antes de extraer el renderer completo.

---

## `ui/table/table-view-model.js`

### Responsabilidad

Transformar datos crudos + estado + preferencias en una estructura lista para render.

### Debe producir

- bloques por despegue
- filas visibles según checks
- ordenación final
- metadatos de columnas
- view model de cabeceras y celdas

### Objetivo

Que el renderer deje de pensar y solo pinte.

---

## `ui/table/table-renderer.js`

### Responsabilidad

Renderizar la tabla desde un view model ya preparado.

### Debe hacer

- construir `thead`
- construir `tbody`
- usar `DocumentFragment`
- delegar detalles a `table-headers.js` y `table-rows.js`

### No debe hacer

- fetch
- persistencia
- cálculo de filtros
- cálculo de rango horario

---

## `ui/table/table-controller.js`

### Responsabilidad

Ser el coordinador específico de la tabla.

### Debe hacer

- pedir datos preparados
- pedir render
- sincronizar post-render si hace falta
- ofrecer una función de alto nivel equivalente al actual `construir_tabla()`

---

## `features/favorites/*`

### Responsabilidad

Agrupar el flujo completo de favoritos como feature.

### Submódulos

- `favorites-controller.js`: activar/desactivar modo edición, coordinar acciones
- `favorites-import-export.js`: abrir/guardar/importar/exportar
- `favorites-bulk-actions.js`: marcar masivo, desmarcar, confirmaciones de lote

### Restricción

No mover esta feature sin preservar el contrato de tabla y el estado de modo edición.

---

## `features/distance-filter/*`

### Responsabilidad

Controlar el flujo de filtro por distancia como feature:

- apertura de mapa
- selección de origen
- activar/desactivar inclusión de no favoritos
- sincronizar slider y tabla

### Restricción

Services de geo/mapa deben quedar por debajo del controller de feature, no sustituyendo el flujo de negocio completo.

---

## `features/app-navigation/*`

### Responsabilidad

Centralizar navegación específica de app / Android / back button / jerarquía de cierres y runtime transversal.

### Debe absorber

- política de cierre de overlays y paneles
- flujos de “si está esto abierto, cierro esto antes que salir”
- confirmación de salida si aplica
- coordinación de `resume`, `visibilitychange`, red y reintentos cuando se separe del entrypoint

---

## `utils/*`

### Responsabilidad

Pequeñas utilidades transversales:

- DOM helpers
- wrappers de storage
- fechas
- constantes

### Criterio

Solo meter aquí utilidades realmente genéricas, no lógica de negocio disfrazada.

---

## Mapa de responsabilidades actuales a mover

### Mover primero (bajo riesgo)

- `compat/public-api.js` como capa de compatibilidad inicial
- `GestorMensajes` y helpers de modal
- persistencia de favoritos
- preferencias persistentes
- IndexedDB/cache
- `obtenerDistanciaKm`
- `createOrientationSVG`
- contrato de tabla

### Mover después (riesgo medio)

- descomposición interna de `construir_tabla()` en subfunciones estables sin cambiar comportamiento
- estado efímero y runtime
- geolocalización y mapa con controller por encima
- lógica de sliders y rango horario
- offline / recarga / panel de estado

### Mover al final (alto riesgo)

- extracción del renderer de tabla
- view model intermedio completo
- eliminación de bridges de compatibilidad heredados

---

## Pipeline objetivo para reemplazar `construir_tabla()`

### Estado actual

`construir_tabla()` mezcla:

- decisión de modo inicial
- onboarding
- carga de datos
- fallback offline
- migración de favoritos
- aplicación de filtros
- construcción/actualización de sliders
- lectura de selección horaria
- render completo de tabla
- sincronización post-render
- limpieza de estado de crash y scroll

### Pipeline objetivo

```js
async function construirTabla(opts = {}) {
  ensurePublicCompatibility();
  const appMode = resolveInitialMode();
  const forecastData = await loadForecastData(opts);
  const normalizedState = hydrateState(appMode, forecastData);
  const persistentState = migrateAndNormalizePersistentState(forecastData);
  const filteredData = applyFilters(normalizedState, persistentState, forecastData);
  const timeRange = resolveTimeRange(normalizedState, filteredData);
  const viewModel = buildTableViewModel(filteredData, normalizedState, persistentState, timeRange);
  renderTable(viewModel);
  syncUiAfterRender(viewModel, normalizedState, persistentState);
}
```

### Subfunciones recomendadas

- `ensurePublicCompatibility()`
- `resolveInitialMode()`
- `loadForecastData()`
- `migrateAndNormalizePersistentState()`
- `hydrateState()`
- `applyFilters()`
- `resolveTimeRange()`
- `buildTableViewModel()`
- `renderTable()`
- `syncUiAfterRender()`

### Restricción

La descomposición debe respetar inicialmente el **mismo orden efectivo de side effects** que hoy tiene `construir_tabla()`.

---

## Fases del refactor

## Fase 0 — Blindaje y cartografía

### Objetivo

Entender dependencias y preparar el terreno antes de mover piezas.

### Tareas

- inventariar variables globales
- inventariar funciones públicas
- localizar ids/classes del DOM usados por JS
- localizar `onclick` inline y funciones expuestas en `window`
- inventariar claves de `localStorage` e IndexedDB
- mapear quién llama a `construir_tabla()`
- anotar listeners y side effects delicados
- documentar contratos implícitos con HTML/CSS
- documentar contrato estructural de la tabla
- documentar flujo runtime Android/Web

### Entregables

- tabla de globals
- tabla de funciones públicas
- tabla de contratos públicos a preservar
- lista de zonas de riesgo
- checklist manual inicial

---

## Fase 0.5 — Capa de compatibilidad

### Objetivo

Crear una base segura para mover código sin romper contratos históricos.

### Tareas

- crear `compat/public-api.js`
- centralizar exposición temporal de funciones públicas en `window`
- encapsular callbacks por nombre usados por modales
- definir `ui/table/table-layout.js` o equivalente mínimo con el esquema de filas por despegue
- introducir wrappers sin cambiar firmas ni comportamiento

### Resultado esperado

- el refactor posterior no depende de mantener funciones dispersas en ámbito global
- el contrato público queda explícito
- la tabla tiene un esquema compartido por render, favoritos y buscador

---

## Fase 1 — Extracción de módulos seguros

### Objetivo

Reducir tamaño y ruido del archivo sin tocar aún el núcleo del render.

### Mover

- `state/app-state.js` mínimo
- `ui/messages/message-manager.js`
- `ui/messages/dialog-helpers.js`
- `state/preferences-store.js`
- `state/favorites-store.js`
- `domain/distance.js`
- `domain/orientation.js`
- `utils/constants.js`
- consolidación del bridge de compatibilidad creado en Fase 0.5

### Resultado esperado

- `meteo.js` sigue funcionando igual
- el entrypoint consume módulos pequeños
- menos acceso directo a `localStorage`
- los contratos públicos siguen vivos mediante adaptadores

---

## Fase 2 — Servicios de datos y caché

### Objetivo

Sacar del flujo principal la estrategia de obtención de datos.

### Mover

- `state/cache-store.js`
- `services/meteo-data-service.js`

### Resultado esperado

- `construir_tabla()` deja de hacer fetch/IndexedDB directamente
- la resolución memory/network/indexeddb queda encapsulada

---

## Fase 2.5 — Descomposición interna de `construir_tabla()`

### Objetivo

Separar el pipeline principal antes de extraer features o renderer completos.

### Tareas

- extraer subfunciones con los mismos efectos laterales y mismo orden de ejecución
- aislar decisión de modo, carga de datos, migraciones, filtros, rango horario, render y sincronización post-render
- mantener inicialmente estas subfunciones en el mismo archivo o en un `table-controller` mínimo si eso reduce riesgo

### Resultado esperado

- el flujo principal se vuelve legible sin alterar comportamiento
- se reduce el riesgo de mover favoritos, distancia y sliders a ciegas

---

## Fase 3 — Tiempo, sliders y filtros puros

### Objetivo

Separar lógica pura de tiempo y selección horaria.

### Mover

- `domain/time-range.js`
- `domain/scoring.js` en la parte realmente pura y desacoplada
- parte de `ui/sliders/*`
- `ui/panels/*`
- `domain/filters.js`

### Resultado esperado

- las transformaciones temporales dejan de depender del render
- los sliders tienen su propio módulo de configuración y eventos
- la lógica de scoring deja de estar mezclada con la representación cuando sea seguro extraerla
- paneles y focus mode dejan de depender del entrypoint

---

## Fase 4 — Features de favoritos y distancia

### Objetivo

Agrupar flujos completos por feature.

### Mover

- `features/favorites/*`
- `features/distance-filter/*`
- `services/geolocation-service.js`
- `services/map-service.js`

### Resultado esperado

- favoritos y distancia dejan de ser “trozos desperdigados”
- la lógica de UI y persistencia queda más legible
- los controladores de feature quedan por encima de stores/services, no mezclados con render

---

## Fase 5 — Runtime, navegación y conectividad

### Objetivo

Separar el comportamiento transversal de Android/Web sin romper la UX actual.

### Mover

- `features/app-navigation/*`
- lógica de `backButton`
- lógica de `resume` / `visibilitychange`
- monitor de red y panel de actualizaciones cuando sea viable

### Resultado esperado

- la navegación y recuperación no siguen enterradas en el entrypoint
- el comportamiento nativo/web se mantiene con límites más claros

---

## Fase 6 — Extraer render de tabla

### Objetivo

Separar preparación de datos y representación visual.

### Mover

- `ui/table/table-view-model.js`
- `ui/table/table-renderer.js`
- `ui/table/table-headers.js`
- `ui/table/table-rows.js`

### Resultado esperado

- renderer casi tonto
- view model reutilizable y testeable
- mayor facilidad para futuras mejoras visuales
- favoritos, buscador y acciones masivas dejan de depender del layout implícito

---

## Qué NO hacer en la primera ola

- no migrar a framework
- no convertir todo a TypeScript de golpe
- no rehacer HTML/CSS
- no renombrar masivamente ids/classes
- no cambiar la forma de usar noUiSlider si no es necesario
- no mezclar este refactor con rediseño visual de tabla
- no eliminar `onclick` inline ni `window.*` hasta tener bridge de compatibilidad estable
- no alterar claves persistidas salvo migración explícita y reversible

---

## Riesgos principales

### 1. Dependencia del orden de inicialización

Hay mucha lógica que asume globals ya listas y elementos DOM ya presentes. Mover esto sin cuidado puede romper cosas silenciosamente.

### 2. Mezcla de persistencia y UI en favoritos

Favoritos actualiza `localStorage`, contadores, iconos, filas y cabeceras. Extraer por capas sin romper esa sincronía requiere pasos pequeños.

### 3. Complejidad del rango horario

La lógica de índices, pips, días y horas de luz tiene bastante estado cruzado. Cualquier cambio debe validar comportamiento real.

### 4. Offline y recuperación tras crash

Hay gestión de fallback offline, timers y recuperación automática que no debe perderse.

### 5. Onboarding en la carga inicial

La primera visita cambia modos, muestra modales y altera flujo. Sacarlo sin mapear bien ese comportamiento puede romper la experiencia de entrada.

### 6. Contratos públicos históricos

Hay funciones llamadas desde HTML inline, callbacks resueltos por nombre y exports a `window`. Romperlos demasiado pronto produciría regresiones silenciosas.

### 7. Contrato estructural de la tabla

Favoritos, buscador y render comparten el cálculo de filas por despegue y la localización de celdas por posición/clase. Ese contrato debe estabilizarse antes de mover el renderer.

### 8. Runtime híbrido Android/Web

`backButton`, `resume`, `visibilitychange`, monitor de red y apertura de enlaces externos forman un mismo flujo transversal que no debe fragmentarse sin un controller claro.

---

## Checklist manual de regresión

## Flujo base

- carga normal con favoritos existentes
- carga normal sin favoritos -> fuerza edición
- primera visita -> onboarding correcto
- reconstrucción de tabla sin errores
- `construir_tabla()` mantiene el mismo orden efectivo de side effects

## Favoritos

- activar edición de favoritos
- finalizar edición con favoritos
- intentar finalizar sin favoritos
- marcar/desmarcar favorito individual
- marcar/desmarcar visibles en bloque
- importar favoritos
- exportar favoritos
- filtro “ver solo favoritos”

## Distancia / geo

- abrir mapa
- seleccionar origen en mapa
- usar GPS nativo / navegador
- activar filtro de distancia
- activar “incluir no favoritos”
- resetear origen o reabrir mapa

## Runtime / Android / Web

- botón atrás Android con overlays, modales, edición y salida
- retorno desde background (`resume` / `visibilitychange`)
- estado offline/online y badge coherente
- apertura de enlaces externos desde tooltips y botones

## Sliders

- mover slider horario
- pulsar pips diarios
- reconstrucción correcta del rango
- slider de configuración horario
- slider de distancia
- slider de condiciones

## Guías y mensajes

- guía principal
- guía favoritos
- modales aceptar/cancelar
- mensajes no modales

## Conectividad

- fallback a IndexedDB cuando no hay red
- recuperación al volver la red
- badge o aviso offline coherente
- panel de actualizaciones y tiempos relativos coherentes

## Robustez

- detector de crash
- recuperación tras carga fallida
- ausencia de errores en consola graves

---

## Convenciones para el agente

### Reglas de ejecución

- trabajar fase a fase
- no tocar más de una zona de alto riesgo por commit
- validar cada fase contra `meteo_js_refactor.checklist.md`
- después de cada fase, listar:
  - archivos creados
  - funciones movidas
  - funciones adaptadas
  - side effects vigilados
  - checklist de validación

### Reglas de diseño

- mantener nombres públicos cuando dependan de HTML inline
- crear un bridge de compatibilidad antes de eliminar globals históricos
- preferir wrappers y adaptadores antes que romper contratos existentes
- aislar funciones puras primero
- introducir imports/exports solo cuando la fase lo permita
- no cambiar la semántica del CSS ni los selectores del DOM
- preservar claves de persistencia y nombres de stores
- extraer funciones completas con cambios mínimos antes de simplificarlas

### Reglas de entrega por fase

Cada fase debe dejar:

1. resumen de objetivo
2. diff conceptual
3. archivos nuevos
4. funciones trasladadas
5. riesgos
6. checklist manual
7. nota explícita de compatibilidad

### Artefacto obligatorio de validación

Usar `meteo_js_refactor.checklist.md` como checklist viva de compatibilidad durante todo el proceso.

---

## Prompt operativo recomendado para el agente

```text
Analiza meteo.js y ejecuta un refactor incremental sin cambiar comportamiento visible.

Objetivos:
1. Mantener 100% la funcionalidad actual.
2. Reducir acoplamiento entre estado, servicios, UI y render.
3. Dejar meteo.js como entrypoint/orquestador.
4. Recolocar código antes de simplificarlo.

Reglas:
- No hagas reescritura completa.
- Trabaja por fases pequeñas y reversibles.
- No cambies ids/classes del DOM salvo necesidad estricta.
- No toques CSS salvo impacto imprescindible.
- Conserva nombres públicos usados por HTML o listeners externos.
- Mantén intactos `window`, `onclick` inline y claves persistidas mientras no exista capa de compatibilidad equivalente.
- En cada fase enumera funciones/globals afectadas, riesgos y checklist manual.

Plan técnico:

Fase 0:
- inventaria globals, funciones públicas, claves persistidas, contratos DOM, `window`, HTML inline y runtime Android/Web.

Fase 0.5:
- crea una capa de compatibilidad pública (`compat/public-api.js`) para mantener `window` y `onclick` inline funcionando.
- extrae contrato estructural de tabla a `ui/table/table-layout.js`.

Fase 1:
- crea un `state/app-state.js` mínimo para estado efímero.
- consolida la capa de compatibilidad pública creada en Fase 0.5.
- extrae GestorMensajes y helpers a `ui/messages/*`.
- extrae preferencias persistentes a `state/preferences-store.js`.
- extrae favoritos persistidos a `state/favorites-store.js`.
- extrae utilidades puras a `domain/distance.js` y `domain/orientation.js`.

Fase 2:
- extrae IndexedDB/cache a `state/cache-store.js`.
- extrae fetch/caché/offline a `services/meteo-data-service.js`.

Fase 2.5:
- divide internamente `construir_tabla()` en subfunciones manteniendo exactamente el mismo orden de efectos laterales.

Fase 3:
- extrae lógica de tiempo y rango horario a `domain/time-range.js`.
- extrae la parte pura de scoring a `domain/scoring.js` cuando ya no dependa del render directo.
- separa configuración de sliders en `ui/sliders/*`.
- mueve paneles y focus mode a `ui/panels/*`.
- centraliza filtros puros en `domain/filters.js`.

Fase 4:
- agrupa favoritos como feature en `features/favorites/*`.
- agrupa filtro de distancia como feature en `features/distance-filter/*`.
- abstrae geolocalización y mapa en `services/*` sin romper el controller de feature.

Fase 5:
- separa runtime híbrido, navegación Android, resume y conectividad sin cambiar la UX.

Fase 6:
- extrae render de tabla a `ui/table/*`.
- deja `meteo.js` como coordinador.

Importante:
- no cambies comportamiento visible
- recoloca antes de simplificar
- mantén intactos los contratos públicos mientras haya HTML inline o callbacks por nombre
- minimiza regresiones
- prioriza compatibilidad y claridad
```

---

## Criterio de éxito

El refactor se considerará exitoso si:

- `meteo.js` deja de ser el contenedor de todas las responsabilidades
- el comportamiento visible se mantiene
- el flujo de tabla es más entendible
- favoritos, mensajes, servicios de datos, runtime y rango horario quedan claramente separados
- futuras mejoras pueden añadirse sin volver a engordar el entrypoint
- el código se ha recolocado con cambios mínimos y justificados
