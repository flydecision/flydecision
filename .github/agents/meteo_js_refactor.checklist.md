# meteo_js_refactor.checklist.md

## Objetivo

Checklist operativo para validar, durante el refactor de `src/meteo.js`, que no se rompe ninguna funcionalidad pública ni ningún flujo crítico.

Este archivo está diseñado para usarse **fase a fase**, con la regla de que el código debe **recolocarse antes de modificarse**.

---

## Regla de uso

Antes de cerrar cada fase del refactor:

1. ejecutar las comprobaciones no destructivas
2. ejecutar las comprobaciones funcionales del área tocada
3. ejecutar las comprobaciones de contratos públicos afectados
4. revisar consola del navegador y validar que no aparecen errores nuevos
5. marcar esta checklist y anotar observaciones

Si una fase toca solo una zona concreta, no hace falta repetir todas las pruebas destructivas, pero sí las de contratos públicos relacionados.

---

## Criterio de bloqueo

No continuar a la siguiente fase si ocurre cualquiera de estas situaciones:

- una función invocada desde HTML inline deja de existir o deja de ser accesible
- una función publicada en `window` deja de estar disponible
- cambia el comportamiento visible de la tabla sin haber sido solicitado
- se pierde una clave persistida o deja de leerse correctamente
- aparece una regresión en modo edición de favoritos, filtro de distancia, sliders, onboarding o runtime Android/Web
- aparecen errores nuevos en consola durante la carga base o durante la interacción del área modificada

---

## Preparación de validación

## Entorno base

- abrir la app con datos reales y dejar que cargue completamente
- abrir DevTools en consola
- confirmar que la carga inicial no arroja errores
- confirmar que existe una tabla renderizada o, si no hay favoritos, que se activa el flujo esperado de edición

## Copia de seguridad recomendada antes de pruebas destructivas

- exportar configuración y favoritos desde la propia app antes de tocar fases que afecten persistencia
- no ejecutar pruebas destructivas si no existe copia de seguridad actual de favoritos/configuración

---

## Contratos públicos a preservar

## A. Funciones invocadas desde HTML inline

Estas funciones deben seguir accesibles con el mismo nombre mientras exista HTML inline:

- `alternardivDistancia`
- `filtroVerSoloFavoritos`
- `desmarcarFavoritos`
- `abrirFavoritos`
- `guardarFavoritos`
- `abrirLinkExterno`
- `activarEdicionFavoritos`
- `sugerirGuiaFavoritos`
- `alternardivConfiguracion`
- `resetFiltroDistancia`
- `resetFiltroCondiciones`
- `finalizarEdicionFavoritos`
- `alternarMostrarProbPrecipitacion`
- `alternarMostrarVientoAlturas`
- `alternarMostrarXC`
- `alternarHorasNoche`
- `alternarMostrarCizalladura`
- `alternarMostrarRafagosidad`
- `alternarAplicarCalibracion`
- `importarConfiguracion`
- `exportarConfiguracion`
- `btnRestablecerConfiguración`
- `sugerirGuiaPrincipal`

## B. Funciones y valores publicados en `window`

Estos contratos deben seguir vivos mientras su uso siga existiendo:

- `window.accionCargarFavoritos`
- `window.accionCargarPerfil`
- `window.calcularIndicesPreferencia`
- `window.resetFiltroCondiciones`
- `window.resetFiltroDistancia`
- `window.abrirLinkExterno`
- `window.sliderHorasValues`
- `window.horasCrudasRangoHorario`
- `window.indicesHorasRangoHorario`
- `window.bdGlobalDespegues`
- `window.oldUpdatingMF`
- `window.oldUpdatingEC`

## C. Claves persistidas sensibles

Estas claves no deben renombrarse ni cambiar de semántica sin migración explícita y reversible:

- `METEO_FAVORITOS_LISTA`
- `METEO_PRIMERA_VISITA_HECHA`
- `METEO_GUIA_PRINCIPAL_VISTA`
- `METEO_GUIA_FAVORITOS_VISTA`
- `METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO`
- `METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN`
- `METEO_CHECKBOX_SOLO_HORAS_DE_LUZ`
- `METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION`
- `METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS`
- `METEO_CHECKBOX_MOSTRAR_XC`
- `METEO_CHECKBOX_MOSTRAR_CIZALLADURA`
- `METEO_CHECKBOX_MOSTRAR_RAFAGOSIDAD`
- `METEO_CHECKBOX_APLICAR_CALIBRACION`
- `METEO_VELOCIDAD_MINIMA`
- `METEO_VELOCIDAD_IDEAL`
- `METEO_VELOCIDAD_MAXIMA`
- `METEO_RACHA_MAX`
- `METEO_FILTRO_DISTANCIA_LAT_INICIAL`
- `METEO_FILTRO_DISTANCIA_LON_INICIAL`
- `METEO_FLAG_CRASH_DETECTADO`
- `METEO_CRASH_COUNTER`

---

## Smoke test de contratos públicos

## 1. Comprobación rápida de símbolos públicos

Ejecutar en consola del navegador:

```js
[
  'alternardivDistancia',
  'filtroVerSoloFavoritos',
  'desmarcarFavoritos',
  'abrirFavoritos',
  'guardarFavoritos',
  'activarEdicionFavoritos',
  'sugerirGuiaFavoritos',
  'alternardivConfiguracion',
  'finalizarEdicionFavoritos',
  'alternarMostrarProbPrecipitacion',
  'alternarMostrarVientoAlturas',
  'alternarMostrarXC',
  'alternarHorasNoche',
  'alternarMostrarCizalladura',
  'alternarMostrarRafagosidad',
  'alternarAplicarCalibracion',
  'importarConfiguracion',
  'exportarConfiguracion',
  'btnRestablecerConfiguración',
  'sugerirGuiaPrincipal',
  'construir_tabla'
].map(name => [name, typeof window[name]]);
```

Resultado esperado:

- todas las entradas deben devolver `function`

## 2. Comprobación rápida de exports necesarios en `window`

Ejecutar en consola:

```js
[
  'calcularIndicesPreferencia',
  'resetFiltroCondiciones',
  'resetFiltroDistancia',
  'abrirLinkExterno'
].map(name => [name, typeof window[name]]);
```

Resultado esperado:

- todas las entradas deben devolver `function`

---

## Comprobaciones no destructivas por invocación

Estas pruebas deben ejecutarse siempre que la fase afecte a compatibilidad pública, mensajes, paneles, sliders, distancia o runtime.

## Paneles y ayudas

- invocar `alternardivConfiguracion(new Event('click'))`
- comprobar que abre y cierra el panel de configuración
- invocar `alternardivDistancia(new Event('click'))`
- comprobar que abre y cierra el panel de distancia
- invocar `sugerirGuiaPrincipal(true)`
- cerrar el modal sin errores
- invocar `sugerirGuiaFavoritos(true)` estando en edición de favoritos o entrando temporalmente en ella
- cerrar la guía o sugerencia sin errores

## Filtros y resets

- invocar `window.resetFiltroCondiciones(false)`
- comprobar que el slider y el estado visual quedan reseteados sin reconstrucción
- invocar `window.resetFiltroDistancia(false)`
- comprobar que el slider y el estado visual quedan reseteados sin reconstrucción
- invocar `filtrarDespeguesProvincias()` con el buscador vacío
- comprobar que no desaparecen bloques erróneamente

## Rango horario y utilidades públicas

- invocar `window.calcularIndicesPreferencia(null)`
- comprobar que devuelve un resultado válido sin excepción
- comprobar que `window.sliderHorasValues`, `window.horasCrudasRangoHorario` y `window.indicesHorasRangoHorario` siguen poblándose tras reconstruir tabla

## Reconstrucción base

- invocar `construir_tabla(false, true)`
- comprobar que la tabla se recompone sin errores visibles
- comprobar consola: sin errores nuevos

## Enlaces externos

- invocar `window.abrirLinkExterno('https://flydecision.com/ayuda')`
- validar que la invocación sigue siendo válida
- en entorno web, comprobar apertura en nueva pestaña
- en entorno nativo, validar el flujo previsto del navegador integrado o launcher si aplica

---

## Comprobaciones funcionales por área

## Favoritos

### Smoke no destructivo

- invocar `activarEdicionFavoritos()`
- comprobar entrada en modo edición
- comprobar ocultación del filtro horario
- comprobar contador visual de favoritos
- invocar `finalizarEdicionFavoritos()` con favoritos válidos y comprobar salida correcta

### Funcionalidad interactiva

- marcar/desmarcar un favorito individual desde la tabla
- comprobar actualización del icono, clases y contador
- activar/desactivar `filtroVerSoloFavoritos()`
- comprobar reconstrucción de tabla y contador correcto

### Funcionalidad semidestructiva

- probar `desmarcarFavoritos()` y cancelar el modal
- probar `desmarcarFavoritos()` y aceptar solo si existe copia de seguridad previa
- comprobar reconstrucción completa posterior

### Importación/exportación

- invocar `guardarFavoritos()` y validar flujo según web/nativo
- invocar `abrirFavoritos()` y cancelar sin importar
- validar que `window.accionCargarFavoritos` sigue registrándose y eliminándose correctamente

## Configuración y checks

- alternar `alternarMostrarProbPrecipitacion()`
- alternar `alternarMostrarVientoAlturas()`
- alternar `alternarMostrarXC()`
- alternar `alternarMostrarCizalladura()`
- alternar `alternarMostrarRafagosidad()`
- alternar `alternarAplicarCalibracion()`
- tras cada toggle, comprobar que la tabla se reconstruye y que los bloques/filas mostradas siguen siendo coherentes

## Horario

- alternar `alternarHorasNoche()`
- comprobar persistencia del check
- comprobar que se conserva el flujo esperado de recarga
- comprobar que el slider horario vuelve a quedar coherente tras la recarga

## Distancia y geolocalización

- abrir panel de distancia
- mover slider de distancia
- activar y desactivar inclusión de no favoritos
- abrir el menú de geolocalización
- seleccionar origen por mapa si el entorno de prueba lo permite
- probar GPS si el entorno de prueba lo permite
- comprobar que la tabla se reconstruye y filtra sin errores

## Tabla y buscador

- escribir texto en el buscador
- comprobar ocultación/visualización completa de bloques de despegue
- comprobar sugerencias globales cuando no hay coincidencias en favoritos
- usar `agregarDespegueDesdeBuscador(id)` si aplica y validar reconstrucción

## Mensajes y modales

- abrir un modal simple con `mensajeModalAceptar('', 'test')`
- cerrar sin error
- abrir un modal aceptar/cancelar con `mensajeModalAceptarCancelar('', 'test')`
- validar cierre correcto
- si una fase toca callbacks por nombre, probar explícitamente un helper que dispare una función publicada en `window`

## Configuración import/export

- invocar `exportarConfiguracion()`
- validar flujo según web/nativo
- invocar `importarConfiguracion()` y cancelar
- comprobar que `window.accionCargarPerfil` sigue registrándose y eliminándose correctamente

## Reset global

- invocar `btnRestablecerConfiguración()`
- cancelar el modal
- no aceptar salvo sesión específica de prueba con copia de seguridad previa

---

## Comprobaciones del runtime híbrido

Estas pruebas son obligatorias en fases que toquen runtime, app-navigation, red o links externos.

## Web

- recargar la página y comprobar carga base
- simular foco/blur de pestaña y volver
- comprobar que no aparecen errores nuevos en el detector de `visibilitychange`
- comprobar que `cicloActualizacion()` sigue actualizando sin errores si la fase tocó esta zona

## Android / Capacitor

- pulsar botón atrás con un modal abierto
- pulsar botón atrás con panel de configuración abierto
- pulsar botón atrás en modo edición de favoritos
- pulsar botón atrás sin overlays para llegar al flujo de salida
- validar retorno desde background (`resume`) si el entorno de prueba lo permite
- validar monitor de red nativo si la fase tocó esa zona

---

## Puertas de salida por fase

## Fase 0 y 0.5

- inventario de contratos públicos completo
- smoke de símbolos públicos completado
- checklist base creada y adoptada

## Fase 1

- todas las funciones invocadas desde HTML inline siguen accesibles
- todos los exports mínimos en `window` siguen accesibles
- mensajes, configuración y favoritos funcionan igual que antes

## Fase 2 y 2.5

- `construir_tabla(false, true)` funciona sin errores
- no se rompe el fallback a caché
- no cambia el orden efectivo de los side effects visibles

## Fase 3

- sliders siguen respondiendo igual
- toggles siguen reconstruyendo igual
- scoring y filtros puros no alteran el render visible

## Fase 4

- modo edición de favoritos intacto
- import/export intacto
- filtro de distancia intacto
- mapa y geolocalización intactos

## Fase 5

- back button intacto
- resume intacto
- monitor de red intacto
- apertura de enlaces externos intacta

## Fase 6

- misma tabla visible para los mismos datos y estado
- mismo número de bloques visibles
- mismas filas por despegue según checks activos
- buscador, favoritos y acciones masivas siguen encontrando correctamente fila principal y celdas objetivo

---

## Registro de validación por fase

Copiar y completar al cerrar cada fase:

```text
Fase:
Fecha:
Archivos movidos:
Funciones recolocadas:
Contratos públicos afectados:

Smoke de símbolos públicos:
- [ ] OK

Smoke no destructivo del área tocada:
- [ ] OK

Comprobaciones funcionales del área tocada:
- [ ] OK

Consola sin errores nuevos:
- [ ] OK

Observaciones:
-

Bloqueos detectados:
-
```

---

## Nota final

Si durante una fase aparece la necesidad de cambiar una firma, un nombre público, una key persistida o la estructura efectiva de la tabla, el cambio **no debe ejecutarse directamente**.

Primero hay que:

1. introducir un adaptador compatible
2. validar esta checklist
3. solo después plantear la eliminación del contrato anterior en una fase posterior y explícita