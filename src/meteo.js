// ---------------------------------------------------------------
// 🔴 VARIABLES O CONSTANTES GLOBALES
// ---------------------------------------------------------------

let ultimoIdLlamadaTabla = 0; // Control de concurrencia para evitar destellos en la tabla

// Aquí guardaremos los JSON
let DATOS_METEO_CACHE = null;
let DATOS_METEO_ECMWF_CACHE = null;
let soloFavoritos;
let soloSeguimiento = false;
//let favoritos = [];
let modoEdicionFavoritos = false;
let totalFavoritos = 0;
let totalDespeguesDisponibles = 0;

let VelocidadMin = Number(localStorage.getItem("METEO_VELOCIDAD_MINIMA")) || 0; 
let VelocidadIdeal = Number(localStorage.getItem("METEO_VELOCIDAD_IDEAL")) || 12;
let VelocidadMax = Number(localStorage.getItem("METEO_VELOCIDAD_MAXIMA")) || 20;  
let RachaMax = Number(localStorage.getItem("METEO_RACHA_MAX")) || 28;

// Valores límite para puntuación XC y colores en tabla
// Techo AGL: 800m ya permite volar, 1500m AGL es un día excelente (se suma a la montaña).
let XCTechoLims = JSON.parse(localStorage.getItem("METEO_XC_TECHO_LIMS")) || { rojo: 800, verde: 1500 };

// Ratio para rebajar el dato de Techo a algo realista para parapente (tasa caída 1.2 m/s)
let RATIO_TECHO_UTIL = 0.85;

// CAPE: 0-400 es ideal (desde día azul hasta cúmulos bonitos). >800 peligro de tormenta.
let XCCapeLims = JSON.parse(localStorage.getItem("METEO_XC_CAPE_LIMS")) || { idealMin: 0, idealMax: 400, riesgo: 800 };

// CIN: Inhibición convectiva. 0-50 el aire fluye bien. >150 actúa como tapón.
let XCCinLims = JSON.parse(localStorage.getItem("METEO_XC_CIN_LIMS")) || { verde: 50, rojo: 150 };

// Valores iniciales para que se vea la puntuación al seleccionar día de la semana
if (localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO') === null) {
    localStorage.setItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO', '10');
}

if (localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN') === null) {
    localStorage.setItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN', '20');
}

let sliderHorasValues = null; 
window.rangoHorarioPersonalizado = false; //flag
let indicesHorasRangoHorario = []; // Contiene los índices válidos (ej: [5, 6, 7, 8, ...])
window.indicesDiaActualSlider = []; // Índices del día visible en el slider
window.diaSeleccionadoSlider = null; // null = usar el automático inicial

// Variable global para almacenar todos los despegues (sin filtrar)
let bdGlobalDespegues = [];

const cacheSVG_Tabla = {};

let chkMostrarVientoAlturas = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS") !== "false"; // Por defecto true para que lo vean

let chkMostrarCizalladura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA") !== "true"; // Por defecto falso 

// ECMWF
const chkMostrarPrecipitacion = true; // Siempre activo
let chkMostrarProbPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION") !== "false";
let chkMostrarBaseNube = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE") !== "false"; // Base de nube inicializada
let chkMostrarTemperatura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_TEMPERATURA") !== "false";
let chkMostrarXC = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_XC") !== "false"; // true por defecto
let chkOrdenarPorXC = localStorage.getItem("METEO_CHECKBOX_ORDENAR_POR_XC") === "true"; // false por defecto
const PASOS_DIAS_SEGUIMIENTO = [1, 2, 3, 4, Infinity]; // el último paso = nunca se autoeliminan
let diasSeguimiento = (() => {
    const guardado = localStorage.getItem('METEO_DIAS_SEGUIMIENTO');
    if (guardado === 'infinito') return Infinity;
    const n = parseInt(guardado);
    return PASOS_DIAS_SEGUIMIENTO.includes(n) ? n : 3;
})();
const ecmwfMode = localStorage.getItem("METEO_CONFIG_ECMWF_MODE") || "off";

let chkMostrarVientoEcmwf = (ecmwfMode === "permanente");
let chkMostrarVientoEcmwfDesplegable = (ecmwfMode === "desplegable");
window.sessionExpandedEcmwfTakeoffs = new Set();

let chkMostrarBotonMinutely15 = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_MINUTELY15") === "true"; // false por defecto
let chkColorearFlechasBalizas = localStorage.getItem("METEO_CHECKBOX_COLOREAR_FLECHAS_BALIZAS") === "true"; 
let chkOcultarValoresBalizas = localStorage.getItem("METEO_CHECKBOX_OCULTAR_VALORES_BALIZAS") === "true"; 
let vientoMaxBalizaColor = Number(localStorage.getItem("METEO_VALOR_VIENTO_MAX_BALIZA_COLOR")) || 40; // Límite de viento rojo de balizas (por defecto 50)

window.modalMinutely15Abierto = false; // true mientras el usuario tiene abierto el modal de detalle 15 min

function alternarBotonMinutely15() {
    chkMostrarBotonMinutely15 = document.getElementById("chkMostrarBotonMinutely15").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_MINUTELY15", chkMostrarBotonMinutely15);
    if (typeof construir_tabla === 'function') construir_tabla();
}

// Función genérica para guardar los ajustes de memoria del mapa
window.alternarAjusteMemoriaMapa = function(idCheckbox, lsKey) {
    const checkbox = document.getElementById(idCheckbox);
    if (checkbox) {
        localStorage.setItem(lsKey, checkbox.checked);
    }
};

// Cargar los estados de los nuevos checkboxes de memoria del mapa (Por defecto: false)
window.addEventListener('DOMContentLoaded', () => {
    const ajustesMemoriaMapa = [
        { id: 'chkAbrirMapaInicio', key: 'METEO_ABRIR_MAPA_INICIO' },
        { id: 'chkRecordarPosicionMapa', key: 'METEO_RECORDAR_POSICION_MAPA' },
        { id: 'chkRecordarEstadoFiltroHorario', key: 'METEO_RECORDAR_ESTADO_FILTRO_HORARIO' },
        { id: 'chkRecordarCapasActivas', key: 'METEO_RECORDAR_CAPAS_ACTIVAS' },
        { id: 'chkRecordarTipoMapa', key: 'METEO_RECORDAR_TIPO_MAPA' },
        { id: 'chkRecordarFiltrosMapa', key: 'METEO_RECORDAR_FILTROS_MAPA' }
    ];

    ajustesMemoriaMapa.forEach(ajuste => {
        const checkbox = document.getElementById(ajuste.id);
        if (checkbox) {
            checkbox.checked = localStorage.getItem(ajuste.key) === 'true';
        }
    });
});

// Controlador dinámico de variables para el Modo Básico/Avanzado
function aplicarReglasModoSimpleAVariables(esSimple) {
    if (esSimple) {
        // En modo básico: Forzamos a falso las variables para que la tabla no las dibuje
        chkMostrarVientoAlturas = false;
        chkMostrarCizalladura = false;
        chkMostrarProbPrecipitacion = false;
        chkMostrarBaseNube = false; 
        chkMostrarTemperatura = false;
        chkMostrarXC = false;
        chkMostrarVientoEcmwf = false;
        chkMostrarVientoEcmwfDesplegable = false;
        chkMostrarBotonMinutely15 = false;
        chkColorearFlechasBalizas = false; 
        chkOcultarValoresBalizas = false;
    } else {
        // En modo avanzado: Recuperamos la preferencia real del usuario desde la memoria
        chkMostrarVientoAlturas = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS") !== "false";
        chkMostrarCizalladura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA") !== "false";
        chkMostrarProbPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION") !== "false";
        chkMostrarBaseNube = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE") !== "false";
        chkMostrarTemperatura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_TEMPERATURA") !== "false";
        chkMostrarXC = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_XC") !== "false";
        
        const modoEcmwfGuardado = localStorage.getItem("METEO_CONFIG_ECMWF_MODE") || "off";
        chkMostrarVientoEcmwf = (modoEcmwfGuardado === "permanente");
        chkMostrarVientoEcmwfDesplegable = (modoEcmwfGuardado === "desplegable");
        chkMostrarBotonMinutely15 = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_MINUTELY15") === "true";
        chkColorearFlechasBalizas = localStorage.getItem("METEO_CHECKBOX_COLOREAR_FLECHAS_BALIZAS") === "true"; 
        chkOcultarValoresBalizas = localStorage.getItem("METEO_CHECKBOX_OCULTAR_VALORES_BALIZAS") === "true";
    }

    // Sincronizar los checkboxes ocultos del menú Ajustes
    if (document.getElementById("chkMostrarVientoAlturas")) document.getElementById("chkMostrarVientoAlturas").checked = chkMostrarVientoAlturas;
    if (document.getElementById("chkMostrarCizalladura")) document.getElementById("chkMostrarCizalladura").checked = chkMostrarCizalladura;
    if (document.getElementById("chkMostrarProbPrecipitacion")) document.getElementById("chkMostrarProbPrecipitacion").checked = chkMostrarProbPrecipitacion;
    if (document.getElementById("chkMostrarBaseNube")) document.getElementById("chkMostrarBaseNube").checked = chkMostrarBaseNube; 
    if (document.getElementById("chkMostrarTemperatura")) document.getElementById("chkMostrarTemperatura").checked = chkMostrarTemperatura;
    if (document.getElementById("chkMostrarXC")) document.getElementById("chkMostrarXC").checked = chkMostrarXC;
    if (document.getElementById("chkMostrarBotonMinutely15")) document.getElementById("chkMostrarBotonMinutely15").checked = chkMostrarBotonMinutely15;
    if (document.getElementById("chkColorearFlechasBalizas")) document.getElementById("chkColorearFlechasBalizas").checked = chkColorearFlechasBalizas;
    if (document.getElementById("chkOcultarValoresBalizas")) document.getElementById("chkOcultarValoresBalizas").checked = chkOcultarValoresBalizas;

    // Inicialización del slider de viento máximo para balizas (Rango de 20 a 80 km/h)
    const vientoBalizasSlider = document.getElementById('viento-balizas-slider');
    if (vientoBalizasSlider) {
        noUiSlider.create(vientoBalizasSlider, {
            start: vientoMaxBalizaColor,
            connect: [true, true],
            step: 5, // Pasos de 5 en 5 km/h para acompañar la escala
            range: { min: 10, max: 60 },
            tooltips: [true],
            format: {
                to: value => Math.round(value),
                from: value => parseInt(value)
            }
        });

        // Evento 'change' (actualiza y redibuja las balizas al soltar el tirador)
        vientoBalizasSlider.noUiSlider.on('update', function(values) {
            const actual = Math.round(Number(values[0]));
            vientoMaxBalizaColor = actual;
            localStorage.setItem("METEO_VALOR_VIENTO_MAX_BALIZA_COLOR", actual);

            if (typeof window.REDES_BALIZAS !== 'undefined' && typeof window.actualizarIconosBalizas === 'function') {
                Object.values(window.REDES_BALIZAS).forEach(red => {
                    window.actualizarIconosBalizas(red.id);
                    if (typeof map !== 'undefined' && map && map.hasLayer(red.layerGroup)) {
                        map.removeLayer(red.layerGroup);
                        map.addLayer(red.layerGroup);
                    }
                });
            }
        });

        // Evento 'slide' (vibración háptica ligera durante el arrastre)
        vientoBalizasSlider.noUiSlider.on('slide', function() {
            if (typeof window.vibrarDispositivo === 'function') window.vibrarDispositivo();
        });

        // Ajustamos la habilitación inicial del deslizador
        actualizarEstadoSliderVientoBalizas();
    }

    const modoEcmwfFijar = esSimple ? "off" : (localStorage.getItem("METEO_CONFIG_ECMWF_MODE") || "off");
    if (modoEcmwfFijar === "off" && document.getElementById("radEcmwfOff")) document.getElementById("radEcmwfOff").checked = true;
    if (modoEcmwfFijar === "desplegable" && document.getElementById("radEcmwfDesplegable")) document.getElementById("radEcmwfDesplegable").checked = true;
    if (modoEcmwfFijar === "permanente" && document.getElementById("radEcmwfPermanente")) document.getElementById("radEcmwfPermanente").checked = true;
}

// Ejecutamos la función una vez en el arranque de la app
const modoSimpleInicial = localStorage.getItem("METEO_MODO_SIMPLE") === "true";
aplicarReglasModoSimpleAVariables(modoSimpleInicial);

// Si entra por url mapa con coordenadas y no hay configuración se marca este flag
const paramsArranque = new URLSearchParams(window.location.search);
if (paramsArranque.has('lat') && paramsArranque.has('lon')) {
    sessionStorage.setItem('METEO_ENTRO_POR_MAPA_YA_VISITADO', 'true');
}

// UMBRALES DE CIZALLADURA (Factor multiplicador)
const LIMITES_CIZALLADURA = {
    "180 m": { naranja: 1.8, rojo: 2.3 }, // +80% / +130%
    "120 m": { naranja: 1.6, rojo: 2.0 }, // +60% / +100%
    "80 m":  { naranja: 1.4, rojo: 1.7 }  // +40% / +70%
}

const HorariosMediosActualizacion = ["01:32", "03:02", "06:02", "11:22", "13:32", "16:22", "19:12", "23:22"]; // en UTC-0
const HorariosMediosActualizacionEcmwf = ["00:30", "07:10", "12:30", "19:10"]; 
const HorariosMediosActualizacionMin15 = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ":47"); // en UTC-0, cada hora a los :47

// Nota: aplico 1 min de más. Buscar: const OFFSET_MS = 1 * 60 * 1000;

// SEMÁFORO 🟢🟡🔴 UMBRALES DE "DATO DESACTUALIZADO" ======================
// 🟢 dentro de plazo | 🟡 aviso, algo retrasado | 🔴 alerta, muy retrasado (en balizas además pone gris el icono del mapa). Cifras en minutos. Los umbrales de Meteo-France y ECMWF se gestionan en el php del cron en la variable const UMBRAL_RETRASO_INUSUAL

// Arome-HD (ciclo medio ~3h, ver HorariosMediosActualizacion más arriba)
const AROME_UMBRAL_AMARILLO_MIN = 5 * 60;  
const AROME_UMBRAL_ROJO_MIN     = 6 * 60;  // php UMBRAL_RETRASO_INUSUAL

// Arome 15min (ciclo horario, ver HorariosMediosActualizacionMin15 más arriba)
const MIN15_UMBRAL_AMARILLO_MIN = 90;   
const MIN15_UMBRAL_ROJO_MIN     = 150;  

// ECMWF (ciclo medio ~6-7h, ver HorariosMediosActualizacionEcmwf más arriba)
const ECMWF_UMBRAL_AMARILLO_MIN = 10 * 60;  
const ECMWF_UMBRAL_ROJO_MIN     = 12 * 60; // php UMBRAL_RETRASO_INUSUAL

// Función genérica de semáforo: dado un timestamp en ms y los 2 umbrales (en minutos) de esa fuente, devuelve el emoji que toca
function calcularSemaforoAntiguedad(timestampMs, umbralAmarilloMin, umbralRojoMin, ahoraMs = Date.now()) {
    if (!timestampMs || timestampMs <= 0) return { minutos: null, emoji: '⚪', esAntiguo: false };
    const minutos = (ahoraMs - timestampMs) / 60000;
    let emoji = '🟢';
    let esAntiguo = false;
    if (minutos >= umbralRojoMin) { emoji = '🔴'; esAntiguo = true; }
    else if (minutos >= umbralAmarilloMin) { emoji = '🟡'; }
    return { minutos, emoji, esAntiguo };
}

let esModoOffline = false; // Nueva variable para controlar el estado de red

const CORTES_DISTANCIA_GLOBAL =[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 9999];

let guiaActiva = false;
let actualizacionesPendientes = [];

let autoSeleccionInicialHecha = false; // bandera de control para la selección o no automática de un día de la semana al arrancar

// Tiempo máximo (en milisegundos) que la app intentará descargar los datos si la conexión es lenta. Pasado este tiempo, forzará el uso de la caché offline.
const TIMEOUT_DESCARGA_DATOS_MS = 5000;

// Este mapa define el RANGO de 16 orientaciones que cubre cada una de las 8 selecciones del usuario.
// Usamos el formato '_ORIENTACION' para coincidir con la metadata.
const MAPA_RANGO_ORIENTACION = {
    'N': ['_N', '_NNE', '_NNO'],
    'NE': ['_NE', '_NNE', '_ENE'],
    'E': ['_E', '_ENE', '_ESE'],
    'SE': ['_SE', '_ESE', '_SSE'],
    'S': ['_S', '_SSE', '_SSO'],
    'SO': ['_SO', '_SSO', '_OSO'],
    'O': ['_O', '_OSO', '_ONO'],
    'NO': ['_NO', '_ONO', '_NNO']
};

/**
 * Mapa de conversión: 
 * Asigna las 16 orientaciones de la metadata a los 8 segmentos del icono
 */
const METADATA_TO_ICON_MAP = {
    'N':   ['N'],
    'NNE': ['N', 'NE'],
    'NE':  ['NE'],
    'ENE': ['NE', 'E'],
    'E':   ['E'],
    'ESE': ['E', 'SE'],
    'SE':  ['SE'],
    'SSE': ['SE', 'S'],
    'S':   ['S'],
    'SSO': ['S', 'SO'],
    'SO':  ['SO'],
    'OSO': ['SO', 'O'],
    'O':   ['O'],
    'ONO': ['O', 'NO'],
    'NO':  ['NO'],
    'NNO': ['N', 'NO']
};

const _ojoVerde = `<svg viewBox="0 4 24 16" width="24" height="24" preserveAspectRatio="xMidYMid meet" style="vertical-align: middle; margin-left: 4px;">
    <path class="ojo-color ojo-exterior" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="#16a34a" stroke="none"/>
    <circle class="ojo-color ojo-iris" cx="12" cy="12" r="4.5" fill="#16a34a" stroke="none"/>
    <circle class="ojo-color ojo-pupila" cx="12" cy="12" r="2.5" fill="#16a34a" stroke="none"/>
    </svg>`;

// SVG del ojo en estado desactivado: outline exterior 2px + un único círculo gris (iris+pupila unidos)
const ojo_seguimiento_desactivado = `<svg viewBox="0 4 24 16" width="24" height="24" preserveAspectRatio="xMidYMid meet">
    <path class="ojo-color ojo-exterior" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="ojo-color ojo-iris" cx="12" cy="12" r="3.5" fill="#888" stroke="none"/>
    </svg>`;

// Devuelve el SVG del ojo correcto para usar en template literals
function svgOjoBoton(esActivo) {
    if (esActivo) {
        return `<svg viewBox="0 4 24 16" width="24" height="24" preserveAspectRatio="xMidYMid meet">
        <path class="ojo-color ojo-exterior" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="#16a34a" stroke="none"/>
        <circle class="ojo-color ojo-iris" cx="12" cy="12" r="4.5" fill="#16a34a" stroke="none"/>
        <circle class="ojo-color ojo-pupila" cx="12" cy="12" r="2.5" fill="#16a34a" stroke="none"/>
        </svg>`;
    }
    return ojo_seguimiento_desactivado;
}

// Actualiza visualmente el botón ojo reemplazando el SVG completo (evita desajustes de r entre estados)
function actualizarVistaOjo(btn, esActivo) {
    if (!btn) return;
    btn.innerHTML = svgOjoBoton(esActivo);
}

// Registramos componente nativos <icon-****> en el navegador para reusarlos en cualquier HTML
class IconBaliza extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <span style="display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; color: #555; width: 22px; height: 22px; margin-right: 3px; user-select: none;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="22" x2="12" y2="4" />
                    <line x1="6" y1="8" x2="18" y2="8" />
                    <circle cx="6" cy="8" r="2" />
                    <circle cx="18" cy="8" r="2" />
                    <circle cx="12" cy="4" r="2" />
                    <line x1="4.5" y1="16" x2="19.5" y2="16"></line>
                    <polyline points="16.5 13 19.5 16 16.5 19"></polyline>
                </svg>
            </span>
        `;
    }
}
customElements.define('icon-baliza', IconBaliza);

class IconDespegue extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <span style="display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; color: #555; width: 22px; height: 22px; margin-right: 3px; user-select: none;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Pendiente de la montaña (Plana al principio y cae agresivamente hacia la derecha) -->
                    <path d="M 0 16.5 Q 12 16.5 20 24" stroke-width="2" />
                    <!-- Cordinos (5 líneas centradas en la nueva posición del piloto) -->
                    <path d="M 5 5 L 12 13 L 9 3.5 M 13 3 L 12 13 L 17 3.5 M 21 5 L 12 13" stroke-width="0.8" />
                    <!-- Vela del parapente (100% horizontal, desplazada arriba y a la derecha) -->
                    <path d="M 5 5 Q 13 -1 21 5 Q 13 3 5 5 Z" stroke-width="2" />
                    <!-- Piloto (Cabeza y cuerpo engrosados, desplazado arriba y a la derecha) -->
                    <circle cx="12" cy="11.5" r="1.6" fill="currentColor" stroke="none" />
                    <path d="M 12 13 L 13 15.5 L 15.5 15 M 13 15.5 L 11.5 18.5" stroke-width="2" />
                </svg>
            </span>
        `;
    }
}
customElements.define('icon-despegue', IconDespegue);

// ---------------------------------------------------------------
// 🔴 MINUTELY_15 (AROME HD) — Detalle de viento cada 15 min
// ---------------------------------------------------------------
let DATOS_METEO_MINUTELY15_CACHE = null;
let DATOS_METEO_MINUTELY15_LAST_FETCH = 0;

async function obtenerDatosMinutely15() {
    const ahora = Date.now();

    // Si ya tenemos los datos en memoria y han pasado MENOS de 5 minutos desde la última descarga, los reutilizamos.
    // Esto evita descargar el JSON continuamente si el usuario abre y cierra el modal en un corto periodo.
    if (DATOS_METEO_MINUTELY15_CACHE && (ahora - DATOS_METEO_MINUTELY15_LAST_FETCH < 5 * 60 * 1000)) {
        return DATOS_METEO_MINUTELY15_CACHE;
    }

    const res = await fetch(`https://flydecision.com/meteo-datos-15min.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const datos = await res.json();
    
    DATOS_METEO_MINUTELY15_CACHE = datos;
    DATOS_METEO_MINUTELY15_LAST_FETCH = ahora;
    
    return datos;
}

function buscarRespuestaMinutely15(idDespegue, datos) {
    if (!datos || !Array.isArray(datos.despegues)) return null;
    const idx = datos.despegues.findIndex(d => Number(d.ID) === Number(idDespegue));
    return (idx >= 0 && datos.respuestas && datos.respuestas[idx]) ? datos.respuestas[idx] : null;
}

function formatHoraMinutoLocal(d) {
    const hora = String(d.getHours()).padStart(2, '0');
    const minutos = String(d.getMinutes()).padStart(2, '0');
    return `${hora}:${minutos}`;
}

function svgFlechaVientoMinutely15(gradosDireccion) {
    return `<svg viewBox="0 0 30 36" class="flecha-viento" style="
        transform: rotate(${gradosDireccion + 180}deg);
        display: inline-block;
    ">
        <polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="black"/>
    </svg>`;
}

function construirTablaMinutely15Html(minutely15, idDespegue) {
    const tiempos = minutely15.time || [];
    const ahora = new Date();

    // Buscamos el despegue en la caché ya cargada de la tabla principal para sacar sus orientaciones favorables
    const despegueObj = (DATOS_METEO_CACHE && Array.isArray(DATOS_METEO_CACHE.despegues))
        ? DATOS_METEO_CACHE.despegues.find(d => Number(d.ID) === Number(idDespegue))
        : null;
    const orientaciones = (despegueObj && despegueObj.Orientaciones_Grados)
        ? despegueObj.Orientaciones_Grados.split(",").map(n => parseFloat(n.trim()))
        : [];

    let idxInicio = tiempos.findIndex(tStr => {
        const fecha = new Date(tStr.endsWith('Z') ? tStr : tStr + 'Z');
        return fecha >= ahora;
    });
    
    if (idxInicio === -1) {
        idxInicio = 0;
    } else {
        // Retrocedemos 1 columna (15 minutos antes). 
        // Usamos Math.max para asegurarnos de que si es 0, no baje a números negativos.
        idxInicio = Math.max(0, idxInicio - 1);
    }

    const NUM_PASOS = 21; // 6 horas x 4 pasos de 15 min
    const idxFin = Math.min(idxInicio + NUM_PASOS, tiempos.length);

    if (idxInicio >= tiempos.length) {
        return `<p style="text-align:center; color:#777;">${t('minutely15.sinDatos', { defaultValue: 'No hay datos disponibles para este despegue en este momento.' })}</p>`;
    }

    const filas = [
        { etiqueta: '80 m', tituloPlano: t('minutely15.viento80', { defaultValue: 'Viento 80 m' }), datos: minutely15.wind_speed_80m, tipo: 'vel' },
        { etiqueta: '<img src="icons/icono_direccion_45.webp" width="15" height="15">', tituloPlano: t('minutely15.direccion80', { defaultValue: 'Dirección 80 m' }), datos: minutely15.wind_direction_80m, tipo: 'dir', bordeAbajo: true },
        
        { etiqueta: '50 m', tituloPlano: t('minutely15.viento50', { defaultValue: 'Viento 50 m' }), datos: minutely15.wind_speed_50m, tipo: 'vel' },
        { etiqueta: '<img src="icons/icono_direccion_45.webp" width="15" height="15">', tituloPlano: t('minutely15.direccion50', { defaultValue: 'Dirección 50 m' }), datos: minutely15.wind_direction_50m, tipo: 'dir', bordeAbajo: true },
        
        { etiqueta: '20 m', tituloPlano: t('minutely15.viento20', { defaultValue: 'Viento 20 m' }), datos: minutely15.wind_speed_20m, tipo: 'vel' },
        { etiqueta: '<img src="icons/icono_direccion_45.webp" width="15" height="15">', tituloPlano: t('minutely15.direccion20', { defaultValue: 'Dirección 20 m' }), datos: minutely15.wind_direction_20m, tipo: 'dir', bordeAbajo: true },
        
        { etiqueta: '10 m', tituloPlano: t('minutely15.viento10', { defaultValue: 'Viento 10 m' }), datos: minutely15.wind_speed_10m, tipo: 'vel' },
        { etiqueta: '<img src="icons/icono_racha_48x42.webp" width="16" height="14">', tituloPlano: t('minutely15.racha10', { defaultValue: 'Racha 10 m' }), datos: minutely15.wind_gusts_10m, tipo: 'racha' },
        { etiqueta: '<img src="icons/icono_direccion_45.webp" width="15" height="15">', tituloPlano: t('minutely15.direccion10', { defaultValue: 'Dirección 10 m' }), datos: minutely15.wind_direction_10m, tipo: 'dir' }
        
    ];

    // --- 1. FILA DE HORAS (Agrupadas con colspan) ---
    let theadHtml = '<tr><th class="col-etiqueta-minutely15" rowspan="2"></th>';
    
    let currentHour = -1;
    let colspanCount = 0;
    let hourLabel = '';
    let isFirstGroup = true;

    for (let i = idxInicio; i < idxFin; i++) {
        const fecha = new Date(tiempos[i].endsWith('Z') ? tiempos[i] : tiempos[i] + 'Z');
        const h = fecha.getHours();
        
        if (currentHour === -1) {
            currentHour = h;
            hourLabel = `${h}`;
            colspanCount = 1;
        } else if (currentHour === h) {
            colspanCount++;
        } else {
            // Cerramos el grupo anterior y lo añadimos al HTML
            // Evitamos poner el borde gris en el primer grupo para que no pise el borde negro de la columna izquierda
            const borderClass = isFirstGroup ? '' : 'borde-hora-minutely15';
            theadHtml += `<th colspan="${colspanCount}" class="${borderClass}">${hourLabel}</th>`;
            isFirstGroup = false;
            
            // Empezamos a contar el nuevo grupo
            currentHour = h;
            hourLabel = `${h}`;
            colspanCount = 1;
        }
    }
    // Añadimos el último grupo que se quedó acumulado al terminar el bucle
    if (colspanCount > 0) {
        const borderClass = isFirstGroup ? '' : 'borde-hora-minutely15';
        theadHtml += `<th colspan="${colspanCount}" class="${borderClass}">${hourLabel}</th>`;
    }
    theadHtml += '</tr>';

    // --- 2. FILA DE MINUTOS (Individuales) ---
    theadHtml += '<tr>';
    for (let i = idxInicio; i < idxFin; i++) {
        const fecha = new Date(tiempos[i].endsWith('Z') ? tiempos[i] : tiempos[i] + 'Z');
        const m = fecha.getMinutes();
        const minLabel = `:${String(m).padStart(2, '0')}`; // Formato :00, :15, :30, :45
        
        // Ponemos borde izquierdo si es :00, SALVO que sea la primera columna absoluta (para no pisar la línea negra)
        const esNuevaHora = (m === 0 && i !== idxInicio); 
        const esAhora = (i === idxInicio);
        
        // Le bajamos un poco el tamaño de fuente y le quitamos la negrita a los minutos para que destaquen menos que la hora principal
        theadHtml += `<th class="${esNuevaHora ? 'borde-hora-minutely15' : ''} ${esAhora ? 'col-ahora-minutely15' : ''}" style="font-size: 0.85em; font-weight: normal;">${minLabel}</th>`;
    }
    theadHtml += '</tr>';

    let tbodyHtml = '';
    filas.forEach(fila => {
        // Detectamos si esta fila necesita borde inferior negro
        const claseBorde = fila.bordeAbajo ? ' separador-horizontal-minutely15' : '';
        
        tbodyHtml += `<tr><td class="col-etiqueta-minutely15${claseBorde}">${fila.etiqueta}</td>`;
        
        for (let i = idxInicio; i < idxFin; i++) {
            const valor = (fila.datos && fila.datos[i] !== undefined && fila.datos[i] !== null) ? fila.datos[i] : null;
            const fecha = new Date(tiempos[i].endsWith('Z') ? tiempos[i] : tiempos[i] + 'Z');
            const esNuevaHora = fecha.getMinutes() === 0;
            const esAhora = (i === idxInicio);
            
            // Añadimos la clase de borde a las celdas de datos también
            let clases = `${esNuevaHora ? 'borde-hora-minutely15' : ''} ${esAhora ? 'col-ahora-minutely15' : ''}${claseBorde}`;

            let contenidoCelda;
            if (valor === null) {
                contenidoCelda = '—';
            } 
            else if (fila.tipo === 'vel') {
                const velocidad = Math.round(Number(valor));
                const velocidadTolerableSuperior = VelocidadMax - (VelocidadMax - VelocidadIdeal) / 3;
                if (velocidad < VelocidadMin) clases += ' fondo-naranja';
                else if (velocidad <= velocidadTolerableSuperior) clases += ' fondo-verde';
                else if (velocidad < VelocidadMax) clases += ' fondo-naranja';
                else clases += ' fondo-rojo';
                contenidoCelda = velocidad;
            } 
            // LÓGICA PARA GESTIONAR EL COLOR DE LA RACHA
            else if (fila.tipo === 'racha') {
                const racha = Math.round(Number(valor));
                const rachaTolerable = RachaMax - (RachaMax - VelocidadMax) / 3;
                if (racha < rachaTolerable) clases += ' fondo-verde';
                else if (racha < RachaMax) clases += ' fondo-naranja';
                else clases += ' fondo-rojo';
                contenidoCelda = racha;
            } 
            else if (fila.tipo === 'dir') {
                const dirRedondeada = Math.round(Number(valor));
                let minimoAnguloDiferencia = 180;
                if (orientaciones.length > 0) {
                    minimoAnguloDiferencia = Math.min(...orientaciones.map(o => diferenciaAngular(dirRedondeada, o)));
                }
                clases += ' ' + colorPorDiferencia(minimoAnguloDiferencia);
                contenidoCelda = svgFlechaVientoMinutely15(dirRedondeada);
            }
            
            tbodyHtml += `<td class="${clases}" title="${fila.tituloPlano}">${contenidoCelda}</td>`;
        }
        tbodyHtml += '</tr>';
    });

    return `
        <div class="minutely15-wrap">
            <table class="tabla-minutely15">
                <thead>${theadHtml}</thead>
                <tbody>${tbodyHtml}</tbody>
            </table>
        </div>
        <p style="color:#888; text-align:center; margin-top:8px;">
            ${t('minutely15.notaModelo', { defaultValue: 'Modelo Arome 2.5 15 min (nowcasting)' })}
        </p>
    `;
}

window.abrirModalMinutely15 = async function(idDespegue, nombreDespegue) {
    window.modalMinutely15Abierto = true;
    window.modalMinutely15IdActual = idDespegue;
    window.modalMinutely15NombreActual = nombreDespegue;

    const botonAceptarMin15 = { texto: t('botones.cerrar'), onclick: () => { window.modalMinutely15Abierto = false; GestorMensajes.ocultar(); } };

    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `<p style="text-align:center;">${t('minutely15.cargando', { defaultValue: 'Cargando datos...' })}</p>`,
        botones: [botonAceptarMin15]
    });

    try {
        const datos = await obtenerDatosMinutely15();
        const respuesta = buscarRespuestaMinutely15(idDespegue, datos);

        const htmlTabla = (!respuesta || !respuesta.minutely_15)
            ? `<p style="text-align:center; color:#777;">${t('minutely15.sinDatos', { defaultValue: 'No hay datos disponibles para este despegue.' })}</p>`
            : construirTablaMinutely15Html(respuesta.minutely_15, idDespegue);

        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: `
                <p style="font-size: 1.2em; font-weight: bold; text-align:center; margin-bottom: 10px;"><icon-despegue></icon-despegue>${nombreDespegue}</p>
                ${htmlTabla}
            `,
            botones: [botonAceptarMin15]
        });
        // Ensanchamos el modal a mano (no usamos :has() por compatibilidad con WebViews antiguos)
        if (GestorMensajes.elementoActual) {
            const contenidoModal = GestorMensajes.elementoActual.querySelector('.mensaje-modal-contenido');
            if (contenidoModal) contenidoModal.classList.add('modal-minutely15-ancho');
        }
    } catch (err) {
        console.error('Error cargando datos minutely_15:', err);
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: `<p style="text-align:center; color:#c00;">${t('minutely15.errorCarga', { defaultValue: 'Error al cargar los datos.' })}</p>`,
            botones: [botonAceptarMin15]
        });
    }
};

// ===============================================================
// 🔴 VIBRACIÓN GLOBAL (HAPTICS) PARA TODOS LOS BOTONES DE LA APP
// ===============================================================

window.vibrarDispositivo = function() {
    const vibracionActiva = localStorage.getItem("METEO_VIBRACION_ACTIVA") !== "false"; // True por defecto
    if (vibracionActiva && typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
    }
};

// Escuchador global de clics para hacer vibrar todos los botones de la app
document.addEventListener('click', function(event) {
    const selectorBotones = 'button, .nav-item, .pip-dia-btn, [role="button"], .leaflet-bar a, .leaflet-control-layers-toggle, summary, .tippy-close-btn, .close-x, .close-btn, .cerrar-capas-btn, .filtro-orientacion, .centro-rosa, input[type="checkbox"]';
    const botonClicado = event.target.closest(selectorBotones);
    
    if (botonClicado) {
        // Excepciones que se gestionan localmente por culpa del stopPropagation de Leaflet
        if (botonClicado.classList.contains('btn-favorito-tabla') || 
            botonClicado.classList.contains('btn-ojo-tabla') || 
            botonClicado.classList.contains('btn-accion')) {
            return;
        }
        window.vibrarDispositivo(); // Llamada unificada
    }
}, { capture: true, passive: true });

// Función para alternar el checkbox de vibración
window.alternarVibracion = function() {
    const chk = document.getElementById("chkActivarVibracion");
    if (chk) {
        localStorage.setItem("METEO_VIBRACION_ACTIVA", chk.checked);
    }
};

// ===============================================================
// 🔴 FILTRO DISTANCIA. GESTIÓN DE UBICACIÓN (MAPA Y GPS UNIFICADO)
// ===============================================================

// 1. VARIABLES GLOBALES Y CONFIGURACIÓN
let centroLat = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL')) || 40.4168; // dummy Madrid
let centroLon = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LON_INICIAL')) || -3.7038;

// Elementos del Modal Mapa unificado
const modalMapa = document.getElementById('modal-mapa');
const btnAbrirGeo = document.getElementById('btn-abrir-geo-menu');
const btnCerrarMapa = document.getElementById('btn-cerrar-mapa');
const btnGpsMapa = document.getElementById('btn-gps-mapa');
const btnIncNoFavsDistancia = document.getElementById('btn-incluir-no-favs-distancia');

// Siempre empezamos desactivado al recargar la página
if (btnIncNoFavsDistancia) {
    btnIncNoFavsDistancia.classList.remove('activo', 'filtro-aplicado');
}

let mapaLeaflet = null;
let marcadorActual = null;

// 2. FUNCIÓN PARA ACTUALIZAR Y GUARDAR CUALQUIER CAMBIO
function actualizarOrigenGlobal(lat, lon, metodo) {
    centroLat = lat;
    centroLon = lon;
    
    localStorage.setItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL', lat);
    localStorage.setItem('METEO_FILTRO_DISTANCIA_LON_INICIAL', lon);

    construir_tabla();
}

// 3. FUNCIÓN COMPARTIDA (CLIC EN EL MAPA O AL LOCALIZAR GPS)
function seleccionarUbicacionYFiltrar(lat, lng, metodo) {
    // 1. GUARDAR EN LOCALSTORAGE INMEDIATAMENTE. 
    centroLat = lat;
    centroLon = lng;
    localStorage.setItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL', lat);
    localStorage.setItem('METEO_FILTRO_DISTANCIA_LON_INICIAL', lng);

    ponerMarcador(lat, lng);
    
    if(modalMapa) modalMapa.style.display = 'none';

    // RESTAURAR LA INTENCIÓN DE LA USUARIA SI EXISTE
    const sliderDistElem = document.getElementById('distancia-slider');
    if (window.distanciaPendienteFiltro !== undefined && window.distanciaPendienteFiltro !== null) {
        if (sliderDistElem && sliderDistElem.noUiSlider) {
            // Esto moverá el slider a donde el usuario lo arrastró inicialmente.
            // A su vez, disparará el evento 'set' que llamará a aplicarFiltrosVisuales() automáticamente.
            sliderDistElem.noUiSlider.set(window.distanciaPendienteFiltro);
        }
        window.distanciaPendienteFiltro = null; // Limpiamos la memoria
    } else {
        // Si no había intención previa, solo aplicamos filtros normales
        ejecutarOperacionPesada(() => { aplicarFiltrosVisuales(); });
    }
}

// 4. LÓGICA DE APERTURA DEL MAPA DIRECTAMENTE
if (btnAbrirGeo) {
    btnAbrirGeo.addEventListener('click', () => {
        if (modalMapa) modalMapa.style.display = 'flex';

        // Comprobamos si la usuaria ya tiene un origen guardado
        const tieneOrigenGuardado = localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL') !== null;

        if (!mapaLeaflet) {
            setTimeout(() => {
                // Si no hay origen, centramos en España (Lat 40.0, Lon -4.0) con un zoom general (6)
                const latInicial = tieneOrigenGuardado ? centroLat : 47.46;
                const lonInicial = tieneOrigenGuardado ? centroLon : 1.16;
                const zoomInicial = tieneOrigenGuardado ? 9 : 4;

                mapaLeaflet = L.map('mapa-selector').setView([latInicial, lonInicial], zoomInicial);
                
                L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    //attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://opentopomap.org/" target="_blank">Style OpenTopoMap</a>'
                }).addTo(mapaLeaflet);

                mapaLeaflet.on('click', function(e) {
                    seleccionarUbicacionYFiltrar(e.latlng.lat, e.latlng.lng, "Mapa");
                });

                // Solo ponemos el marcador si ya tenía un origen
                if (tieneOrigenGuardado) {
                    ponerMarcador(centroLat, centroLon);
                }
            }, 50);
        } else {
            // Si el mapa ya estaba creado en la memoria
            const latInicial = tieneOrigenGuardado ? centroLat : 47.46;
            const lonInicial = tieneOrigenGuardado ? centroLon : 1.16;
            const zoomInicial = tieneOrigenGuardado ? 8 : 4;

            mapaLeaflet.setView([latInicial, lonInicial], zoomInicial);
            
            setTimeout(() => { 
                mapaLeaflet.invalidateSize(); 
                
                if (tieneOrigenGuardado) {
                    ponerMarcador(centroLat, centroLon);
                } else if (marcadorActual) {
                    // Si no tiene origen (p.ej. acaba de resetear) pero había un marcador de antes, lo borramos
                    mapaLeaflet.removeLayer(marcadorActual);
                    marcadorActual = null;
                }
            }, 100);
        }
    });
}

function ponerMarcador(lat, lng) {
    const iconoRojo = L.icon({
        iconUrl: 'css/images/marker-icon-2x.png',
        shadowUrl: 'css/images/marker-shadow.png',
        iconSize:[35, 55],    
        iconAnchor:[17, 55],  
        popupAnchor:[1, -34],
        shadowSize:[55, 55]
    });

    if (marcadorActual) mapaLeaflet.removeLayer(marcadorActual);
    marcadorActual = L.marker([lat, lng], { icon: iconoRojo }).addTo(mapaLeaflet).openPopup();
}

/// 5. EVENTO BOTÓN INCLUIR NO FAVORITOS (<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">+<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">)
if (btnIncNoFavsDistancia) {
    btnIncNoFavsDistancia.addEventListener('click', (e) => {
        e.preventDefault(); 
        
        const estabaActivo = btnIncNoFavsDistancia.classList.contains('activo');
        const nuevoEstado = !estabaActivo;

        // 1. Lógica para cuando se quiere ACTIVAR
        if (nuevoEstado) {
            // Seguridad: Verificar si hay origen configurado
            if (!localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL')) {
                
                GestorMensajes.mostrar({
						tipo: 'modal',
						htmlContenido: t('origen.avisoInicialHtml'),
						botones:[
							{ texto: t('botones.cancelar'), estilo: 'secundario', onclick: function() { GestorMensajes.ocultar(); } },
                            { texto: t('botones.configurarOrigen'), onclick: function() { 
                                GestorMensajes.ocultar(); 
                                const btnGeo = document.getElementById('btn-abrir-geo-menu');
                                if (btnGeo) btnGeo.click(); // Simulamos un clic en el botón 📍
                            } }
						],
                        anchoBotones: 160
					});
                return;
            }
        }

        // 3. Pintamos el botón hundido (activo) y con el borde rojo (filtro-aplicado)
        if (nuevoEstado) {
            btnIncNoFavsDistancia.classList.add('activo', 'filtro-aplicado');
        } else {
            btnIncNoFavsDistancia.classList.remove('activo', 'filtro-aplicado');
        }
        
        const sliderDistElem = document.getElementById('distancia-slider');
        if (sliderDistElem && sliderDistElem.noUiSlider) {
            const currentIdx = Math.round(parseFloat(sliderDistElem.noUiSlider.get()));
            
            // --- Si se activa el botón y el slider estaba en "Todo", salta a 100km ---
            if (nuevoEstado && currentIdx === CORTES_DISTANCIA_GLOBAL.length - 1) {
                
                const idx100km = CORTES_DISTANCIA_GLOBAL.indexOf(100);
                ultimaDistanciaConfirmada = idx100km;
                sliderDistElem.noUiSlider.set(idx100km);
                
                // Forzar estilos del filtro principal
                const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
                //if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo');

                ejecutarOperacionPesada(() => construir_tabla(false, false));
            } 
            // Si el botón se toca y ya había un filtro de distancia aplicado (< 9999)
            else if (currentIdx < CORTES_DISTANCIA_GLOBAL.length - 1) {
                ejecutarOperacionPesada(() => construir_tabla(false, false)); 
            }
        }
    });
}

// 6. EVENTO UBICACIÓN DEL MÓVIL (GPS) EN EL MAPA
if (btnGpsMapa) {
    btnGpsMapa.addEventListener('click', async function() {
        const isApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
        const textoOriginal = btnGpsMapa.innerHTML;
        btnGpsMapa.innerHTML = `<span>${t('gps.buscando')}</span>`;

        const onLocationFound = (lat, lon) => {
            btnGpsMapa.innerHTML = textoOriginal;
            seleccionarUbicacionYFiltrar(lat, lon, "GPS");
        };

        const onLocationError = (errMsg) => {
            console.error("Error GPS:", errMsg);
            alert(`${t('gps.errorUbicacion')} ${errMsg}`);
            btnGpsMapa.innerHTML = textoOriginal;
        };

        if (isApp) {
            try {
                const Geolocation = Capacitor.Plugins.Geolocation;
                let check = await Geolocation.checkPermissions();
                if (check.location !== 'granted' && check.location !== 'coarse') {
                    await Geolocation.requestPermissions();
                }
                const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
                onLocationFound(pos.coords.latitude, pos.coords.longitude);
            } catch (err) {
                onLocationError(err.message.includes("disabled") ? t('gps.activaGps') : t('gps.revisaPermisos'));
            }
        } else { 
            if (!navigator.geolocation) {
                onLocationError(t('gps.noSoportado'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => onLocationFound(pos.coords.latitude, pos.coords.longitude),
                (err) => onLocationError(err.message),
                { enableHighAccuracy: false, timeout: 10000 }
            );
        }
    });
}

// 7. BOTÓN CERRAR MAPA (LA "X")
if (btnCerrarMapa) {
    btnCerrarMapa.addEventListener('click', () => {
        if(modalMapa) modalMapa.style.display = 'none';
        window.distanciaPendienteFiltro = null; // Limpiamos si cancela con la X
    });
}
window.addEventListener('click', (e) => {
    if (e.target === modalMapa) {
        modalMapa.style.display = 'none';
        window.distanciaPendienteFiltro = null; // Limpiamos si cancela clicando fuera
    }
});

// ---------------------------------------------------------------
// 🔴 MENSAJES
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 🟡 MENSAJES. Gestor de mensajes
// ---------------------------------------------------------------

// Contenido alinenado a la izquierda (si no se codifica nada)
const GestorMensajes = {
    
    // Referencia al elemento actual en el DOM
    elementoActual: null,

    /**
     * Muestra un mensaje dinámico.
     * @param {string} tipo - 'modal' (bloquea pantalla) o 'no-modal' (flotante). Ej: tipo: 'no-modal',
     * @param {string} posicion - Solo para no-modal: 'centro' o 'derecha'. Ej: posicion: 'centro',
     * @param {string} htmlContenido - Texto o HTML del mensaje. Ej: htmlContenido: '<p>✅ Importación realizada con éxito.</p>',
     * @param {Array} botones - Lista de botones. Ej: botones: ['ACEPTAR', 'CANCELAR'] o botones ['ACEPTAR'] u objetos personalizados.
     */
	 
    /* 	Ejemplo de mensaje puntual:
        
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: '<p>❌ Error: El resultado no puede ser negativo.</p>',
            botones: ['ACEPTAR']
        });
    */	
    
    /* 	Ejemplo de mensaje reutilizable (encapsulado en una función). Se usa para el onclick=avisoencapsuladoenfuncionquesea(); para mensajes puntuales recurrentes en un if,.... ; para mensajes que requieren parámetros, se puede crear una función que reciba el texto y llame al gestor function CON_PARAMETROS(texto). Si tiene que salir al inicio, se llama idealmente en un bloque que se ejecute una vez que la página esté lista, una vez que el DOM (la estructura de la página) se haya cargado. Ejemplo: document.addEventListener('DOMContentLoaded', (event) => {
                mostrar..Configuracion..Inicial();
                
            function mostrarSaludo() {
                GestorMensajes.mostrar({
                    tipo: 'modal',
                    htmlContenido: '<p>Hola, bienvenido al sistema</p>',
                    botones: ['ACEPTAR']
                });
            }
    */
 
    mostrar: function({ tipo = 'modal', posicion = 'centro', htmlContenido = '', botones =[], anchoBotones = null }) {
        
        // 1. Limpiar mensaje previo si existe
        this.ocultar();

        // 2. Crear el contenedor principal
        const div = document.createElement('div');
       
        // 3. Asignar clases y estructura según el tipo
        let contenedorContenido;

        if (tipo === 'modal') {
            div.className = 'mensaje-modal visible';
            // El modal necesita un wrapper interno para el recuadro blanco
            contenedorContenido = document.createElement('div');
            contenedorContenido.className = 'mensaje-modal-contenido';
            div.appendChild(contenedorContenido);
        } else {
            // El no-modal es el recuadro en sí mismo
            div.className = 'mensaje-no-modal visible';
            
            // Lógica de posición
            //if (posicion === 'centro') div.classList.add('posicion-centro');
            //else if (posicion === 'derecha') div.classList.add('posicion-derecha');
			if (posicion === 'derecha') div.classList.add('posicion-derecha');
            
            contenedorContenido = div; // Escribimos directamente en el div principal
        }

        // 4. Inyectar contenido HTML
        const divTexto = document.createElement('div');
        divTexto.innerHTML = htmlContenido;
        contenedorContenido.appendChild(divTexto);

        // 5. Generar Botones
        if (botones.length > 0) {
            const wrapperBotones = document.createElement('div');
            wrapperBotones.className = 'boton-mensajes-wrapper';

            botones.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.className = 'boton-mensajes';
                
                // Mapeo de botones estándar (strings) a configuración
                if (typeof btnConfig === 'string') {
                    const estandar = this._obtenerBotonEstandar(btnConfig);
                    btn.textContent = estandar.texto;
                    btn.onclick = estandar.accion;
                    if (estandar.claseExtra) btn.classList.add(estandar.claseExtra);
                } else {
                    // Configuración personalizada { texto, onclick, estilo }
                    btn.textContent = btnConfig.texto;
                    btn.onclick = btnConfig.onclick || (() => this.ocultar());
                    if (btnConfig.estilo === 'secundario') btn.classList.add('btn-secundario');
                }

                if (anchoBotones) {
                    // Si pasan un número (ej: 120), le añade 'px'. Si pasan un texto (ej: '120px' o '50%'), lo usa tal cual.
                    btn.style.width = typeof anchoBotones === 'number' ? `${anchoBotones}px` : anchoBotones;
                }
                
                btn.style.marginLeft = "10px";
                
                wrapperBotones.appendChild(btn);
            });

            contenedorContenido.appendChild(wrapperBotones);
        }

        // 6. Añadir al DOM
        document.body.appendChild(div);
        this.elementoActual = div;
    },

    ocultar: function() {
        if (this.elementoActual) {
            this.elementoActual.remove();
            this.elementoActual = null;
        }
    },

    // Definición de botones estándar para escribir menos código
    _obtenerBotonEstandar: function(clave) {
        switch(clave.toUpperCase()) {
            case 'ACEPTAR':
                return { texto: t('botones.aceptar'), accion: () => this.ocultar() };
            case 'SIGUIENTE':
                return { texto: t('botones.siguiente'), accion: () => this.ocultar() }; // Sobrescribir acción al llamar
            case 'TERMINAR':
                return { texto: t('botones.finalizar'), accion: () => this.ocultar() };
            case 'CANCELAR':
                return { texto: t('botones.cancelar'), accion: () => this.ocultar(), claseExtra: 'btn-secundario' };
            default:
                return { texto: clave, accion: () => this.ocultar() };
        }
    }
};

// ---------------------------------------------------------------
// 🟡 MENSAJES. Reusable Modal Aceptar
// ---------------------------------------------------------------

// Contenido alinenado al centro
function mensajeModalAceptar(titulo = '', contenido = '', accionesAceptar = '') { // accionesAceptar Nombres de funciones globales separadas por comas ('func1, func2') (acepta vacíos '')
    
    // Crear el HTML para el título, solo si se proporciona un valor (no nulo, no vacío)
    const htmlTitulo = (titulo && titulo.trim() !== '') 
        ? `<p style="font-size: 1.4em; font-weight: bold; text-align:center;">${titulo}</p>`
        : '';
		
	const listaFunciones = accionesAceptar
	.split(',') // Separar por comas
	.map(nombre => nombre.trim()) // Limpiar espacios en blanco
	.filter(nombre => nombre.length > 0); // Eliminar entradas vacías
    
    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${htmlTitulo}
                <div style="width: 100%;">${contenido || ''}</div>
            </div>
        `,
        botones: [
            {
                texto: t('botones.aceptar'),
                onclick: function() {
                    GestorMensajes.ocultar();
					listaFunciones.forEach(nombreFuncion => {
                        const func = window[nombreFuncion];
                        
                        if (typeof func === 'function') {
                            func(); 
                        } else {
                            console.error(`Error: La función global "${nombreFuncion}" no fue encontrada.`);
                        }
                    });
                }
            },
        ]
    });
}

// ---------------------------------------------------------------
// 🟡 MENSAJES. Reusable Modal Aceptar/Cancelar
// ---------------------------------------------------------------

// Contenido alinenado al centro
function mensajeModalAceptarCancelar(titulo = '', contenido = '', accionesAceptar = '') { // accionesAceptar Nombres de funciones globales separadas por comas ('func1, func2') (acepta vacíos '')

    const htmlTitulo = (titulo && titulo.trim() !== '') 
        ? `<p style="font-size: 1.4em; font-weight: bold; text-align:center;">${titulo}</p>`
        : '';
        
    const listaFunciones = accionesAceptar
        .split(',') // Separar por comas
        .map(nombre => nombre.trim()) // Limpiar espacios en blanco
        .filter(nombre => nombre.length > 0); // Eliminar entradas vacías
        
    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${htmlTitulo}
                <div style="width: 100%;">${contenido || ''}</div>
            </div>
        `,
        botones: [
            {
                texto: t('botones.cancelar'),
                estilo: 'secundario',
                onclick: function() {
                    GestorMensajes.ocultar();
                }
            },
            {
                texto: t('botones.aceptar'),
                onclick: function() {
                    GestorMensajes.ocultar();
                    
                    listaFunciones.forEach(nombreFuncion => {
                        const func = window[nombreFuncion];
                        
                        if (typeof func === 'function') {
                            func(); 
                        } else {
                            console.error(`Error: La función global "${nombreFuncion}" no fue encontrada.`);
                        }
                    });
                }
            }
        ]
    });
}

// ---------------------------------------------------------------
// 🟡 MENSAJES. Únicos
// ---------------------------------------------------------------

function mostrarConfirmacionMasiva(cantidad) {
    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2em; margin: 0;"><img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"></p>
                <p>${t('favoritos.confirmacionMasiva', { cantidad: cantidad })}</p>
            </div>
        `,
        botones: [
            {
				texto: t('botones.cancelar'),
				onclick: function() {
					GestorMensajes.ocultar(); // Cierra el modal
					idsPendientesDeConfirmacion = []; // Limpia memoria
					//mensajeFinalizarEdicionFavoritos();
				},
				estilo: 'secundario'
			},
            { 
                texto: t('botones.siMarcar'), 
                onclick: confirmarSeleccionMasiva // función existente
            }
        ]
    });
}

function mensajeAvisoRecarga(titulo = '', contenido = '') { // Opcional, puede ser '' o null
    
    // Crear el HTML para el título, solo si se proporciona un valor (no nulo, no vacío)
    const htmlTitulo = (titulo && titulo.trim() !== '') 
        ? `<p style="font-size: 1.4em; font-weight: bold; text-align:center;">${titulo}</p>`
        : '';
        
    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            ${htmlTitulo}
            ${contenido || ''}
        `,
        botones: [
            {
                texto: t('botones.aceptar'),
                onclick: function() {
                    GestorMensajes.ocultar();
                    location.reload(); 
                }
            },
        ]
    });
}

// ---------------------------------------------------------------
// 🔴 GUÍAS RÁPIDAS
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 🟡 GUÍA PRINCIPAL
// ---------------------------------------------------------------

function sugerirGuiaPrincipal(forzar = false) {

    if (!forzar && localStorage.getItem('METEO_GUIA_PRINCIPAL_VISTA') === 'true') {
        return; 
    }

    // Eliminamos el checkbox y simplificamos el texto de ayuda
    const htmlAyuda = !forzar 
        ? `<p style="color: #555; margin-top: 10px;">${t('guiaPrincipal.verEnAjustes')}</p>`
        : '';

    const botonesModal =[
        {
            texto: forzar ? t('botones.cancelar') : t('botones.no'), 
            estilo: 'secundario',
            onclick: function() {
                // Si el usuario pulsa "No" en la sugerencia automática, 
                // guardamos la bandera para que no vuelva a salir.
                if (!forzar) {
                    localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true');
                }
                GestorMensajes.ocultar();
            }
        },
        {
            texto: t('botones.verGuia'),
            onclick: function() {
                GestorMensajes.ocultar();
                localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true'); // Al verla, ya no la sugerimos más
                
                const panelConfig = document.getElementById("div-configuracion");
                if (panelConfig && panelConfig.classList.contains("activo")) {
                    alternardivConfiguracion(); 
                }
                setTimeout(() => iniciarGuiaPrincipal(true), 300);
            }
        }
    ];

    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2.5em; margin: 0 0 10px 0;">💡</p>
                <p style="font-size: 1.1em; font-weight: bold; margin: 0;">${t('guiaPrincipal.preguntaVerGuiaPrincipal')}</p>
                ${htmlAyuda}
            </div>
        `,
        botones: botonesModal,
        anchoBotones: '130px'
    });
}

function iniciarGuiaPrincipal(forzar = false) {

    if (!forzar && localStorage.getItem('METEO_GUIA_PRINCIPAL_VISTA') === 'true') {
        return; 
    }

    const esModoSimple = document.body.classList.contains('modo-simple');

    // Esto cierra buscadores, resetea filtros de distancia y vuelve a la tabla
    if (typeof clicBotonInicio === 'function') {
        clicBotonInicio();
    }

    // Garantizar siempre que los filtros estén limpios antes de que arranque la guía.
    // clicBotonInicio() solo los resetea en el 2.º clic (yaEnInicio), así que lo
    // forzamos explícitamente para que ningún elemento quede oculto y driver.js
    // pueda posicionar sus popups correctamente.
    if (typeof limpiarBuscador === 'function') limpiarBuscador();
    if (typeof resetFiltroDistancia === 'function') resetFiltroDistancia(false);
    if (typeof aplicarFiltrosVisuales === 'function') ejecutarOperacionPesada(() => { aplicarFiltrosVisuales(); });

    guiaActiva = true; //para que no muestre actualización si hay

    const driverObj = window.driver.js.driver({
        
        showProgress: true, 
        progressText: t('guiaPrincipal.progreso'),
        smoothScroll: true,
        overlayClickBehavior: () => {}, 
        overlayColor: 'rgba(0, 0, 0, 0.75)', 
        allowClose: true,      
        stageRadius: 8,   

        nextBtnText: t('guiaPrincipal.siguiente'),
        prevBtnText: '←',
        doneBtnText: t('guiaPrincipal.cerrar'),

        steps: [
            { 
                popover: { 
                    title: t('guiaPrincipal.pasos.paso1.titulo'), 
                    description: t('guiaPrincipal.pasos.paso1.descripcion') 
                } 
            },
            { 
                element: '#botones-dias-slider', 
                popover: { 
                    title: t('guiaPrincipal.pasos.diasSemana.titulo'), 
                    description: t('guiaPrincipal.pasos.diasSemana.descripcion')
                }
            },
            { 
                element: '#horario-slider', 
                popover: { 
                    title: t('guiaPrincipal.pasos.selectorHorario.titulo'), 
                    description: t('guiaPrincipal.pasos.selectorHorario.descripcion')
                } 
            },
            ...(!esModoSimple ? [{ 
                element: '#btn-ver-todos-dias',
                popover: { 
                    title: t('guiaPrincipal.pasos.btnVerTodosLosDias.titulo'), 
                    description: t('guiaPrincipal.pasos.btnVerTodosLosDias.descripcion')
                } 
            }] : []),
            { 
                element: '#buscador-despegues-provincias',
                popover: { 
                    title: t('guiaPrincipal.pasos.navSearch.titulo'), 
                    description: t('guiaPrincipal.pasos.navSearch.descripcion')
                } 
            },
            ...(!esModoSimple ? [{ 
                element: '#nav-distance',
                popover: { 
                    title: t('guiaPrincipal.pasos.navDistance.titulo'), 
                    description: t('guiaPrincipal.pasos.navDistance.descripcion')
                }
            }] : []),
            ...(!esModoSimple ? [{ 
                element: '#div-filtro-distancia-interno',
                popover: { 
                    title: t('guiaPrincipal.pasos.filtroDistancia.titulo'), 
                    description: t('guiaPrincipal.pasos.filtroDistancia.descripcion')
                },
                onHighlighted: () => {
                    const panel = document.getElementById('div-filtro-distancia');
                    if (panel && !panel.classList.contains('activo')) {
                        const btn = document.getElementById('nav-distance');
                        if (btn) btn.click();
                    }
                    setTimeout(() => { if (typeof driverObj !== 'undefined') driverObj.refresh(); }, 300);
                }
            }] : []),
            ...(!esModoSimple ? [{ 
                element: '#btn-abrir-geo-menu',
                popover: { 
                    title: t('guiaPrincipal.pasos.btnOrigen.titulo'), 
                    description: t('guiaPrincipal.pasos.btnOrigen.descripcion')
                }
            }] : []),
            ...(!esModoSimple ? [{ 
                element: '#btn-incluir-no-favs-distancia',
                popover: { 
                    title: t('guiaPrincipal.pasos.btnIncNoFavs.titulo'), 
                    description: t('guiaPrincipal.pasos.btnIncNoFavs.descripcion')
                }
            }] : []),
            ...(!esModoSimple ? [{ 
                element: '#distancia-slider',
                popover: { 
                    title: t('guiaPrincipal.pasos.sliderDistancia.titulo'), 
                    description: t('guiaPrincipal.pasos.sliderDistancia.descripcion') 
                },
                onDeselected: () => {
                    const panel = document.getElementById('div-filtro-distancia');
                    if (panel && panel.classList.contains('activo')) {
                        panel.classList.remove('activo');
                    }
                }
            }] : []),
            ...(!esModoSimple ? [{ 
                element: '#btn-filtro-seguimiento-toggle',
                popover: { 
                    title: t('guiaPrincipal.pasos.btnFiltroSeguimiento.titulo'), 
                    description: t('guiaPrincipal.pasos.btnFiltroSeguimiento.descripcion')
                }
            }] : []),
            { 
                element: '.columna-meteo.borde-grueso-abajo.borde-grueso-arriba.borde-grueso-izquierda', 
                popover: { 
                    title: t('guiaPrincipal.pasos.columnaMeteo.titulo'), 
                    description: t('guiaPrincipal.pasos.columnaMeteo.descripcion')
                },
                onHighlightStarted: () => {
                    setTimeout(() => { if (typeof driverObj !== 'undefined') driverObj.refresh(); }, 100);
                }
            },
            ...(chkMostrarCizalladura ? [{ 
                element: '.columna-meteo.columna-simbolo-fija.borde-grueso-izquierda.celda-altura-4px', 
                popover: { 
                    title: t('guiaPrincipal.pasos.filaCizalladura.titulo'), 
                    description: t('guiaPrincipal.pasos.filaCizalladura.descripcion')
                } 
            }] : []),
            { 
                element: '.columna-condiciones.borde-grueso-izquierda.borde-grueso-arriba.borde-grueso-abajo', 
                popover: { 
                    title: t('guiaPrincipal.pasos.columnaPuntuacion.titulo'), 
                    description: t('guiaPrincipal.pasos.columnaPuntuacion.descripcion') 
                } 
            },
            ...(chkMostrarCizalladura ? [{ 
                element: '.guia-rosa-vientos', 
                popover: { 
                    title: t('guiaPrincipal.pasos.rosaVientos.titulo'), 
                    description: t('guiaPrincipal.pasos.rosaVientos.descripcion') 
                } 
            }] : []),
            ...(chkMostrarCizalladura ? [{ 
                element: '.guia-nivel-actividad', 
                popover: { 
                    title: t('guiaPrincipal.pasos.nivelActividad.titulo'), 
                    description: t('guiaPrincipal.pasos.nivelActividad.descripcion') 
                } 
            }] : []),
            { 
                element: '.columna-despegue .btn-info', 
                popover: { 
                    title: t('guiaPrincipal.pasos.btnInfo.titulo'), 
                    description: t('guiaPrincipal.pasos.btnInfo.descripcion') 
                } 
            },
            { 
                element: '.btn-guia-mapa-directo', 
                popover: { 
                    title: t('guiaPrincipal.pasos.btnMapa.titulo'), 
                    description: t('guiaPrincipal.pasos.btnMapa.descripcion') 
                } 
            },
            { 
                element: '.btn-favorito-tabla', 
                popover: { 
                    title: t('guiaPrincipal.pasos.btnFavorito.titulo'), 
                    description: t('guiaPrincipal.pasos.btnFavorito.descripcion') 
                } 
            },
            ...(!esModoSimple ? [{ 
                element: '.btn-ojo-tabla', 
                popover: { 
                    title: t('guiaPrincipal.pasos.btnSeguimiento.titulo'), 
                    description: t('guiaPrincipal.pasos.btnSeguimiento.descripcion') 
                } 
            }] : []),
            { 
                element: '#nav-home',
                popover: { 
                    title: t('guiaPrincipal.pasos.navHome.titulo'), 
                    description: t('guiaPrincipal.pasos.navHome.descripcion')
                } 
            },
            { 
                element: '#nav-map',
                popover: { 
                    title: t('guiaPrincipal.pasos.navMap.titulo'), 
                    description: t('guiaPrincipal.pasos.navMap.descripcion')
                } 
            },
            { 
                element: '#nav-settings',
                popover: { 
                    title: t('guiaPrincipal.pasos.navSettings.titulo'), 
                    description: t('guiaPrincipal.pasos.navSettings.descripcion')
                } 
            }
        ],
        
        onDestroyStarted: () => {
            localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true'); 
            
            guiaActiva = false;
            
            // COMPROBAR SI HABÍA ALGO POSPUESTO
            if (actualizacionesPendientes.length > 0) {
                mostrarAvisoActualizacionMeteo(actualizacionesPendientes);
                actualizacionesPendientes = []; // Vaciamos la lista tras avisar
            }

            driverObj.destroy();

            setTimeout(() => {
            if (typeof clicBotonInicio === 'function') {
                    clicBotonInicio();
                }
            }, 100);
        }
    });

    driverObj.drive();
}

// ---------------------------------------------------------------
// 🟡 GUÍA FAVORITOS
// ---------------------------------------------------------------

function sugerirGuiaFavoritos(forzar = false) {

    if (window.onboardingMapaActivo) return;
    
    if (!forzar && localStorage.getItem('METEO_GUIA_FAVORITOS_VISTA') === 'true') {
        return; 
    }

    // Eliminamos el checkbox y ajustamos el texto informativo
    const htmlAyuda = !forzar 
        ? `<p style="color: #555; margin-top: 10px;">${t('guiaPrincipal.podrasVerla')}</p>`
        : '';

    const botonesModal =[
        {
            texto: forzar ? t('botones.cancelar') : t('botones.no'),
            estilo: 'secundario',
            onclick: function() {
                // Si es la sugerencia automática (!forzar) y pulsa No, 
                // marcamos como vista para que no vuelva a saltar.
                if (!forzar) {
                    localStorage.setItem('METEO_GUIA_FAVORITOS_VISTA', 'true');
                }
                GestorMensajes.ocultar();
            }
        },
        {
            texto: t('botones.verGuia'),
            onclick: function() {
                GestorMensajes.ocultar();
                localStorage.setItem('METEO_GUIA_FAVORITOS_VISTA', 'true'); // Marcamos como vista al aceptarla
                setTimeout(() => iniciarGuiaFavoritos(true), 300);
            }
        }
    ];

    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2.5em; margin: 0 0 10px 0;">💡</p>
                <p style="font-size: 1.1em; font-weight: bold; margin: 0;">${t('guiaPrincipal.preguntaVerGuia')}</p>
                ${htmlAyuda}
            </div>
        `,
        botones: botonesModal,
        anchoBotones: '130px'
    });
}

function iniciarGuiaFavoritos(forzar = false) {

    guiaActiva = true;

    if (!forzar && localStorage.getItem('METEO_GUIA_FAVORITOS_VISTA') === 'true') {
        return; 
    }

    const esModoSimple = document.body.classList.contains('modo-simple');

    // 1. Limpiamos solo el buscador y la lógica visual de los filtros
    if (typeof limpiarBuscador === 'function') limpiarBuscador();
    if (typeof aplicarFiltrosVisuales === 'function') ejecutarOperacionPesada(() => { aplicarFiltrosVisuales(); });

    // 2. Nos aseguramos de que el panel de Distancia esté abierto y visible
    const panelDistancia = document.getElementById("div-filtro-distancia");
    if (panelDistancia) {
        panelDistancia.classList.add("activo");
        
        // 3. RESETEAMOS EL SLIDER DE DISTANCIA A INFINITO (sin cerrar el panel)
        setTimeout(() => {
            const sliderDist = document.getElementById('distancia-slider');
            if (sliderDist && sliderDist.noUiSlider) {
                // Obtenemos el índice máximo de la escala (Infinito) y movemos el slider ahí
                const MAX_INDEX = CORTES_DISTANCIA_GLOBAL.length - 1;
                sliderDist.noUiSlider.set(MAX_INDEX);
                sliderDist.noUiSlider.updateOptions({}, true);
            }
        }, 50);
    }

    const driverObj = window.driver.js.driver({
        
        showProgress: true, 
        progressText: t('guiaPrincipal.progreso'),
        smoothScroll: true,
        overlayClickBehavior: () => {}, 
        overlayColor: 'rgba(0, 0, 0, 0.75)', 
        allowClose: true,      
        stageRadius: 8,   

        nextBtnText: t('guiaPrincipal.siguiente'),
        prevBtnText: '←',
        doneBtnText: t('guiaPrincipal.cerrar'),

        steps: [
            {  
                popover: { 
                    title: t('guiaFavoritos.pasos.intro.titulo'), 
                    description: t('guiaFavoritos.pasos.intro.descripcion')
                },            
            },

            { 
                element: '#tabla tbody tr:nth-child(1) td:first-child', 
                popover: { 
                    title: t('guiaFavoritos.pasos.celdaFavorito.titulo'), 
                    description: t('guiaFavoritos.pasos.celdaFavorito.descripcion')
                } 
            },

            ...(!esModoSimple ? [{ 
                element: '#tabla thead tr:first-child th:first-child', 
                popover: { 
                    title: t('guiaFavoritos.pasos.cabeceraFavorito.titulo'), 
                    description: t('guiaFavoritos.pasos.cabeceraFavorito.descripcion') 
                } 
            }] : []),

            { 
                element: '.guia-rosa-vientos', 
                popover: { 
                    title: t('guiaPrincipal.pasos.rosaVientos.titulo'), 
                    description: t('guiaPrincipal.pasos.rosaVientos.descripcion') 
                } 
            },
            { 
                element: '.guia-nivel-actividad', 
                popover: { 
                    title: t('guiaPrincipal.pasos.nivelActividad.titulo'), 
                    description: t('guiaPrincipal.pasos.nivelActividad.descripcion') 
                } 
            },

            { 
                element: '.columna-despegue .btn-info', 
                popover: { 
                    title: t('guiaFavoritos.pasos.btnInfoDespegue.titulo'), 
                    description: t('guiaFavoritos.pasos.btnInfoDespegue.descripcion') 
                } 
            },

            { 
                element: '.btn-guia-mapa-directo', 
                popover: { 
                    title: t('guiaFavoritos.pasos.btnMapaDespegue.titulo'), 
                    description: t('guiaFavoritos.pasos.btnMapaDespegue.descripcion') 
                } 
            },

            { 
                element: '#buscador-despegues-provincias',
                popover: { 
                    title: t('guiaFavoritos.pasos.buscador.titulo'), 
                    description: t('guiaFavoritos.pasos.buscador.descripcion')
                } 
            },

            ...(!esModoSimple ? [{ 
                element: '#div-filtro-distancia-interno',
                popover: { 
                    title: t('guiaFavoritos.pasos.filtroDistancia.titulo'), 
                    description: t('guiaFavoritos.pasos.filtroDistancia.descripcion')
                } 
            }] : []),

            ...(!esModoSimple ? [{ 
                element: '#btn-abrir-geo-menu',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnOrigen.titulo'), 
                    description: t('guiaFavoritos.pasos.btnOrigen.descripcion')
                } 
            }] : []),

            ...(!esModoSimple ? [{ 
                element: '#distancia-slider',
                popover: { 
                    title: t('guiaFavoritos.pasos.sliderDistancia.titulo'), 
                    description: t('guiaFavoritos.pasos.sliderDistancia.descripcion')
                } 
            }] : []),

            { 
                element: '#btn-filtro-favoritos-toggle',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnVerSoloFavs.titulo'), 
                    description: t('guiaFavoritos.pasos.btnVerSoloFavs.descripcion')
                } 
            },

            ...(!esModoSimple ? [{ 
                element: '#btn-desmarcar-favoritos',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnDesmarcarTodos.titulo'), 
                    description: t('guiaFavoritos.pasos.btnDesmarcarTodos.descripcion')
                } 
            }] : []),

            ...(!esModoSimple ? [{ 
                element: '#btn-abrir-favoritos',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnImportar.titulo'), 
                    description: t('guiaFavoritos.pasos.btnImportar.descripcion') 
                } 
            }] : []),

            ...(!esModoSimple ? [{ 
                element: '#btn-guardar-favoritos',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnExportar.titulo'), 
                    description: t('guiaFavoritos.pasos.btnExportar.descripcion') 
                } 
            }] : []),

            { 
                element: '#btn-guia-edicion-favoritos',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnGuiaEdicion.titulo'), 
                    description: t('guiaFavoritos.pasos.btnGuiaEdicion.descripcion') 
                } 
            },

            { 
                element: '#btn-finalizar-edicion-favoritos',
                popover: { 
                    title: t('guiaFavoritos.pasos.btnFinalizar.titulo'), 
                    description: t('guiaFavoritos.pasos.btnFinalizar.descripcion') 
                } 
            }
        ],
        
        onDestroyStarted: () => {
            localStorage.setItem('METEO_GUIA_FAVORITOS_VISTA', 'true'); // o FAVORITOS
            
            guiaActiva = false;
            
            // COMPROBAR SI HABÍA ALGO POSPUESTO
            if (actualizacionesPendientes.length > 0) {
                mostrarAvisoActualizacionMeteo(actualizacionesPendientes);
                actualizacionesPendientes = []; // Vaciamos la lista tras avisar
            }

            driverObj.destroy();
        }
    });

    driverObj.drive();
}

// ---------------------------------------------------------------
// 🔴 GESTIÓN DE FAVORITOS
// ---------------------------------------------------------------

// --- FUNCIÓN AUXILIAR PRIVADA ---
function _activarEdicionFavoritosSync(irAlMapa = false) {
    localStorage.setItem("METEO_CONFIG_FAVS_HECHA", "true");
    window.venirDeEdicionActiva = true; 
    modoEdicionFavoritos = true;

    if (typeof window.seguimientoPrevioEdicion === 'undefined' || window.seguimientoPrevioEdicion === null) {
        window.seguimientoPrevioEdicion = soloSeguimiento;
    }
    soloSeguimiento = false;
    soloFavoritos = false;

    if (typeof limpiarBuscador === 'function') {
        limpiarBuscador(); 
    }
    resetFiltroDistancia(false);

    // Vamos al mapa o a la tabla según corresponda
    if (irAlMapa) {
        cambiarVista('mapa');
        window.activarMenuInferior(document.getElementById('nav-map'));
    } else {
        cambiarVista('tabla');  
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
    }

    const btnFavsTog = document.getElementById('btn-filtro-favoritos-toggle');
    if (btnFavsTog) {
        btnFavsTog.classList.remove('filtro-aplicado', 'activo');
    }

    const panelDistancia = document.getElementById("div-filter-distancia") || document.getElementById("div-filtro-distancia");
    if (panelDistancia) {
        panelDistancia.classList.add("activo");
        setTimeout(() => {
            const sliderDist = document.getElementById('distancia-slider');
            if (sliderDist && sliderDist.noUiSlider) sliderDist.noUiSlider.updateOptions({}, true);
        }, 50);
    }

    const searchContainer = document.getElementById('floating-search-container');
    // Si vamos al mapa, no hace falta forzar la apertura del buscador de texto
    if (searchContainer && !irAlMapa) { 
        searchContainer.classList.remove('floating-search-hidden');
        buscadorVisible = true; 
    }
    
    if (inputBuscador) {
        inputBuscador.placeholder = t('buscador.placeholderEdicion') || "🔍 País, Región, Provincia o Despegue";
    }

    document.body.classList.add('modo-edicion-tabla');
    const divMenu = document.getElementById('div-menu');
    if (divMenu) divMenu.classList.add('mode-editing');
    
    const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
    if (divMenu2) divMenu2.classList.add('mode-editing');
    
    const panelHorario = document.querySelector('.div-filtro-horario');
    if (panelHorario) panelHorario.style.display = 'none';
    
    const divConfig = document.getElementById("div-configuracion");
    if (divConfig) divConfig.classList.remove("activo");

    if (typeof setModoEnfoque === "function") { setModoEnfoque(false); }

    construir_tabla();
    actualizarContadorVisualFavoritos(); 

    setTimeout(() => { sugerirGuiaFavoritos(); }, 500);
}

// --- FUNCIÓN PRINCIPAL 1: ACTIVAR DESDE LISTA ---
function activarEdicionFavoritos() {
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) overlay.classList.add('loader-activo');

    setTimeout(() => {
        _activarEdicionFavoritosSync(false); // false = Queremos quedarnos en la tabla
    }, 120);
}

// --- FUNCIÓN PRINCIPAL 2: ACTIVAR DESDE MAPA ---
function activarEdicionFavoritosConMapa() {
    if (!localStorage.getItem("METEO_PRIMERA_VISITA_HECHA")) {
        window.onboardingMapaActivo = true;
    }

    const overlay = document.getElementById('msgActualizando...');
    if (overlay) overlay.classList.add('loader-activo');

    _activarEdicionFavoritosSync(true); // true = Queremos ir directamente al mapa
}

function filtroVerSoloFavoritos() {
    const btn = document.getElementById('btn-filtro-favoritos-toggle');
    const iconContainer = document.getElementById('icon-filter-favs');
    const heartSvg = btn.querySelector('.heart-icon-svg');
    const favoritosActuales = obtenerFavoritos();

    if (!btn.classList.contains("activo") && favoritosActuales.length === 0) {
        mensajeModalAceptar('', t('favoritos.noTienesFavoritos'));
        return;
    }

    btn.classList.toggle("activo");
    const estaActivo = btn.classList.contains("activo");
    
    if (estaActivo) {
        soloFavoritos = true; 
        btn.classList.add('filtro-aplicado');
        // Pintamos el corazón de rojo relleno
        //heartSvg.setAttribute('fill', '#ff0000');
        //heartSvg.setAttribute('stroke', '#ff0000');
    } else {
        soloFavoritos = false;
        btn.classList.remove('filtro-aplicado');
        // Corazón vacío original
        //heartSvg.setAttribute('fill', 'none');
        //heartSvg.setAttribute('stroke', 'currentColor');
    }

    construir_tabla();
}

function desmarcarFavoritos() {
    const favoritosActuales = obtenerFavoritos();
    
    // Si ya está vacía, avisamos y no hacemos nada más
    if (favoritosActuales.length === 0) {
        GestorMensajes.mostrar({
            tipo: 'modal', // o 'no-modal' si lo prefieres menos invasivo
            htmlContenido: '<p style="text-align: center;">No hay despegues favoritos para desmarcar</p>',
            botones: ['ACEPTAR']
        });
        return;
    }

    // Si hay favoritos, pedimos confirmación con tu Gestor de Mensajes
    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2em; margin: 0;"><svg viewBox="0 0 24 24" style="width: 1em; height: 1em;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path><line x1="5" y1="5" x2="19" y2="19" stroke="red" stroke-width="3"></line></svg></p>
                <p>${t('favoritos.confirmarDesmarcarTodos')}</p>
            </div>
        `,
        botones:[
            {
                texto: t('botones.cancelar'),
                estilo: 'secundario',
                onclick: function() {
                    GestorMensajes.ocultar();
                }
            },
            {
                texto: t('botones.siDesmarcar'),
                onclick: function() {
                    // 1. Sobrescribimos el localStorage con un array vacío
                    localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify([]));

                    // Resetear estado del filtro "Ver solo favoritos" 
                    soloFavoritos = false;
                    const btn = document.getElementById('btn-filtro-favoritos-toggle');
                    if (btn) {
                        btn.classList.remove("activo", "filtro-aplicado");
                    }
                    
                    // 2. Actualizamos el contador visual ("<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> 0")
                    actualizarContadorVisualFavoritos();
                    
                    // 3. Restauramos el icono de la cabecera de la tabla a desmarcado
                    const thFavorito = document.getElementById('id-thFavorito');
                    if (thFavorito) {
                        thFavorito.innerHTML = '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                        thFavorito.title = t('favoritos.marcarTodos');
                    }

                    // 4. Reconstruimos la tabla para quitar el fondo verde/clases a todos de golpe
                    construir_tabla();

                    // 5. Cerramos el modal
                    GestorMensajes.ocultar();
                }
            }
        ]
    });
}

function abrirFavoritos() {
    window.accionCargarFavoritos = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt'; 
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let nuevosFavoritos = e.target.result
                        .split('\n')
                        .map(l => l.trim())
                        .filter(l => l.length > 0); 

                    // --- MIGRACIÓN AL VUELO SI ES UN ARCHIVO ANTIGUO (CON NOMBRES) ---
                    if (nuevosFavoritos.length > 0 && isNaN(Number(nuevosFavoritos[0]))) {
                        const bd = window.bdGlobalDespegues ||[];
                        const favsMigrados =[];
                        nuevosFavoritos.forEach(nombre => {
                            const match = bd.find(d => d.Despegue === nombre);
                            if (match && match.ID) {
                                favsMigrados.push(Number(match.ID));
                            }
                        });
                        nuevosFavoritos = favsMigrados;
                    } else {
                        // Son IDs numéricos nuevos
                        nuevosFavoritos = nuevosFavoritos.map(Number).filter(n => !isNaN(n));
                    }

                    if (nuevosFavoritos.length > 0) {
                        localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify(nuevosFavoritos));
                        localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true');
                        localStorage.setItem("METEO_PRIMERA_VISITA_HECHA", "true");
                        
                        if (typeof mensajeAvisoRecarga === 'function') {
                            mensajeAvisoRecarga('', `
                                <div style="text-align: center;">
                                    <p>${t('favoritos.importadosOk', { n: nuevosFavoritos.length })}</p>
                                </div>
                            `);
                        } else {
                            location.reload();
                        }
                    } else {
                        alert(t('favoritos.archivoVacio'));
                    }
                } catch (error) {
                    alert(t('favoritos.errorArchivo'));
                }
                
                delete window.accionCargarFavoritos; 
            };
            reader.readAsText(file);
        };
        input.click();
    };

    mensajeModalAceptarCancelar(
        '', 
        t('favoritos.importarAviso'), 
        'accionCargarFavoritos'
    );
}

async function guardarFavoritos() {
    // Aseguramos que guardamos un txt con puros números
    const favoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
        
    if (favoritos.length === 0) {
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: `<p style="text-align: center;">${t('favoritos.noHayParaExportar')}</p>`,
            botones: ['ACEPTAR']
        });
        return;
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-').slice(0, 5);
    let nombreArchivo = `${fecha}_Fly_Decision_Favorites.txt`;
    const contenido = favoritos.join('\n');

    const isApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

    if (isApp) {
        try {
            const { Filesystem, Dialog, Share } = Capacitor.Plugins; 

            // 1. Cuadro de diálogo previo para confirmación de exportación
            // const confirmResult = await Dialog.confirm({
            //     title: t('favoritos.exportar.tituloDialog'),
            //     message: t('favoritos.exportar.mensajeDialog'),
            //     okButtonTitle: t('favoritos.exportar.guardar'),
            //     cancelButtonTitle: t('favoritos.exportar.cancelar')
            // });

            // Si la usuaria cancela, detenemos el proceso aquí
            // if (!confirmResult.value) return;

            // 2. Guardamos la copia temporal en la Caché en segundo plano
            const resultCache = await Filesystem.writeFile({
                path: nombreArchivo, 
                data: contenido,
                directory: 'CACHE', 
                encoding: 'utf8',
                recursive: true
            });

            // 3. Abrimos DIRECTAMENTE el menú de compartir/guardar de Android 
            const canShare = await Share.canShare();
            if (canShare.value) {
                try {
                    await Share.share({
                        title: t('favoritos.exportar.tituloShare'),
                        text: t('favoritos.exportar.textoShare'),
                        files: [resultCache.uri], 
                        dialogTitle: t('favoritos.exportar.dialogTitle'),
                    });
                } catch (shareError) {
                    //alert("Cancelled / Cancelado.");
                }
            } else {
                alert("Your device does not support sharing files directly. / Tu dispositivo no permite compartir archivos directamente.");
            }

        } catch (error) {
            console.error("Error al guardar en Android:", error);
            alert("Vaya, algo ha fallado: " + error.message);
        }
    } else {
        const blob = new Blob([contenido], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo; 
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}

function obtenerFavoritos() {
    const data = localStorage.getItem("METEO_FAVORITOS_LISTA");
    if (!data) return[];
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed :[];
    } catch(e) {
        return[];
    }
}

function actualizarContadorVisualFavoritos() {
    const el = document.getElementById('contador-favoritos-texto');
    
    if (el) {
        const num = obtenerFavoritos().length;
        let texto = "";

        texto = (num === 1) 
            ? t('favoritos.tituloSingular', { n: num }) 
            : t('favoritos.tituloPlural', { n: num });
                
                el.innerHTML = texto;
    }
}

function toggleFavorito(id) {
    id = Number(id); // Aseguramos que es un número
    const favoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
    const indice = favoritos.indexOf(id);
    let esNuevoFavorito = false;

    if (indice === -1) {
        favoritos.push(id);
        esNuevoFavorito = true;
    } else {
        favoritos.splice(indice, 1);
    }

    localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify(favoritos));

    actualizarContadorVisualFavoritos();

    return esNuevoFavorito;
}

// =========================================================================
// 🛑 FUNCION AUXILIAR DE SINCRONIZACIÓN ESTÁTICA
// =========================================================================

window.toggleFavoritoDesdeTabla = function(id, btnElement) {
    const esFavoritoActual = obtenerFavoritos().map(Number).includes(Number(id));

    const ejecutarCambioDOM = () => {
        const esNuevoFavorito = toggleFavorito(id); 

        window.vibrarDispositivo();
        
        // Helper interno para actualizar estados de botones y filas
        const aplicarCambiosVisualesABotonYFila = (btn) => {
            btn.title = esNuevoFavorito ? t('favoritos.despegueFavorito') : t('favoritos.anadirAFavoritos');
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.setAttribute('fill', esNuevoFavorito ? '#e00' : 'none');
                svg.setAttribute('stroke', esNuevoFavorito ? '#e00' : '#555');
            }
            
            let fila = btn.closest('tr');
            if (fila) {
                fila.classList.toggle('favorito', esNuevoFavorito);
                let siguiente = fila.nextElementSibling;
                while (siguiente && !siguiente.classList.contains('fila-inicio-despegue')) {
                    siguiente.classList.toggle('favorito', esNuevoFavorito);
                    siguiente = siguiente.nextElementSibling;
                }
            }
        };

        // 1. Actualizar el botón presionado directamente
        if (btnElement && btnElement.tagName !== 'TD') {
            aplicarCambiosVisualesABotonYFila(btnElement);
        }

        // 2. Sincronizar el botón gemelo (en la tabla si clicamos en el mapa, o en el mapa si clicamos en la tabla)
        const botonesFav = document.querySelectorAll('.btn-favorito-tabla');
        botonesFav.forEach(btn => {
            const onclickText = btn.getAttribute('onclick') || '';
            if (onclickText.includes(`toggleFavoritoDesdeTabla(${id},`) || 
                onclickText.includes(`toggleFavoritoDesdeTabla('${id}',`)) {
                if (btn !== btnElement) aplicarCambiosVisualesABotonYFila(btn);
            }
        });

        // 3. Sincronizar el corazón en el modo edición (si aplica)
        const tdsEdicion = document.querySelectorAll(`.columna-favoritos[data-id="${id}"]`);
        tdsEdicion.forEach(td => {
            if (td !== btnElement) {
                td.innerHTML = esNuevoFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                td.title = esNuevoFavorito ? t('favoritos.quitarDeFavoritos') : t('favoritos.anadirAFavoritos');
                
                let filaTabla = td.closest('tr');
                if (filaTabla) {
                    filaTabla.classList.toggle('favorito', esNuevoFavorito);
                    let siguiente = filaTabla.nextElementSibling;
                    while (siguiente && !siguiente.classList.contains('fila-inicio-despegue')) {
                        siguiente.classList.toggle('favorito', esNuevoFavorito);
                        siguiente = siguiente.nextElementSibling;
                    }
                }
            }
        });

        // 4. Gestión de reconstrucción de tabla
        const enMapa = document.getElementById('vista-mapa')?.style.display === 'flex';
        
        if (enMapa) {
            if (!modoEdicionFavoritos) {
                // Solo reconstruimos si es una acción rápida en uso normal (la tabla está filtrada a pocos)
                //window.saltarScrollTop = (window.saltarScrollTop || 0) + 2;
                construir_tabla(false, true, true); 
            }  
        } else {
            // SI ESTAMOS EN LA PROPIA TABLA: Bastan los cambios visuales instantáneos que ya hicimos arriba
            const btnFiltroFav = document.getElementById('btn-filtro-favoritos-toggle');
            if (btnFiltroFav && btnFiltroFav.classList.contains('activo') && !esNuevoFavorito) {
                construir_tabla(false, false, false);
            } else {
                aplicarFiltrosVisuales(true, true); 
            }
        }
    };

    if (!esFavoritoActual) {
        ejecutarCambioDOM();
    } else {
        const despegue = window.bdGlobalDespegues.find(d => Number(d.ID) === Number(id));
        const nombre = despegue ? despegue.Despegue : '';
        const provincia = despegue ? despegue.Provincia : '';
        
        const titulo = '🤍 ' + t('favoritos.quitarDeFavoritos'); 
        const mensaje = `<span style="font-size: 1.2em;"><b>${nombre}</b><br>(${provincia})</span>`;

        window._confirmarToggleFavorito = function() {
            ejecutarCambioDOM();
        };

        mensajeModalAceptarCancelar(titulo, mensaje, '_confirmarToggleFavorito');
    }
};

// Marcar/Desmarcar favoritos masivamente mediante la columna Favoritos
let idsPendientesDeConfirmacion = [];
let estadoPendienteDeAplicar = false; // true = marcar, false = desmarcar

function gestionarClickMasivoFavoritos() {
    
    if (!modoEdicionFavoritos) {
		mensajeModalAceptar('', t('marcadorMasivo.paraMarcarFavoritos'));
        return;
    }

    const tabla = document.getElementById('tabla');
    const tbody = tabla.tBodies[0];
    if (!tbody) return;

    const filas = tbody.rows;
    let idsVisibles = [];

    let filasPorDespegue = 1;

    if (!modoEdicionFavoritos) {
        filasPorDespegue = 5; // Base: Meteo general + Precipitación + Vel + Racha + Dir
        if (chkMostrarProbPrecipitacion) filasPorDespegue++;
        if (chkMostrarBaseNube) filasPorDespegue++;
        if (chkMostrarTemperatura) filasPorDespegue++;
        if (chkMostrarVientoAlturas) filasPorDespegue += 3;
        if (chkMostrarXC) filasPorDespegue += 3;
        if (chkMostrarCizalladura) filasPorDespegue++;
        if (chkMostrarVientoEcmwf || chkMostrarVientoEcmwfDesplegable) {
            filasPorDespegue += 10; 
        }
    }

    for (let i = 0; i < filas.length; i += filasPorDespegue) {
        
        const filaPrincipal = filas[i];

        // Protección por si el cálculo falla o la tabla está incompleta
        if (!filaPrincipal) break;
        
        if (filaPrincipal.style.display !== 'none') {
            
            // OPCIÓN MÁS SEGURA: Buscar por clase si la posición varía
            let celda = filaPrincipal.querySelector('.columna-favoritos');
            
            if (celda && celda.dataset.id) {
                idsVisibles.push(Number(celda.dataset.id)); // Guardamos como número
            }
        }
    }

    if (idsVisibles.length === 0) return;

    let listaFavoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n)); 
    const todosSonFavoritos = idsVisibles.every(id => listaFavoritos.includes(id));
    const nuevoEstadoEsFavorito = !todosSonFavoritos; // true = añadir, false = quitar

    if (nuevoEstadoEsFavorito && idsVisibles.length > 100) {
        
        idsPendientesDeConfirmacion = idsVisibles;
        estadoPendienteDeAplicar = nuevoEstadoEsFavorito;

		mostrarConfirmacionMasiva(idsVisibles.length); 
		return;
    }

    aplicarCambiosMasivos(idsVisibles, nuevoEstadoEsFavorito);
}

function aplicarCambiosMasivos(idsAfectados, nuevoEstadoEsFavorito) {
    
    // 1. Usamos Set para máxima velocidad y gestión automática de duplicados
    let listaFavoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
    let setFavoritos = new Set(listaFavoritos);

    if (nuevoEstadoEsFavorito) {
        // Añadimos todos (el Set ignora duplicados automáticamente)
       idsAfectados.forEach(id => setFavoritos.add(Number(id)));
    } else {
        // Borramos todos
        idsAfectados.forEach(id => setFavoritos.delete(Number(id)));
    }

    // Convertimos de vuelta a Array
    listaFavoritos = Array.from(setFavoritos);

    localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify(listaFavoritos));
    
    // Eliminamos la asignación a la variable global 'favoritos' si decides borrarla
    // favoritos = listaFavoritos; 
    
    // --- Actualización visual (DOM) ---
    const thFavorito = document.getElementById('id-thFavorito');
    if (thFavorito) {
        thFavorito.innerHTML = nuevoEstadoEsFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
        thFavorito.title = nuevoEstadoEsFavorito 
            ? t('favoritos.desmarcarTodos') 
            : t('favoritos.marcarTodos');
    }

    // Usamos idsAfectados para buscar solo las filas necesarias, 
    // en lugar de iterar toda la tabla de nuevo si es posible, 
    // pero iterar la tabla es más seguro para asegurar sincronía visual.
    const tabla = document.getElementById('tabla');
    const tbody = tabla.tBodies[0];
    const filas = tbody.rows;
    const setAfectados = new Set(idsAfectados.map(Number)); // Búsqueda O(1)

    // CÁLCULO DINÁMICO DE FILAS POR BLOQUE 
    let filasPorDespegue = 1; 

    if (!modoEdicionFavoritos) {
        filasPorDespegue = 5; // Base: Meteo general + Precipitación + Vel + Racha + Dir
        if (chkMostrarProbPrecipitacion) filasPorDespegue++;
        if (chkMostrarBaseNube) filasPorDespegue++;
        if (chkMostrarTemperatura) filasPorDespegue++;
        if (chkMostrarVientoAlturas) filasPorDespegue += 3;
        if (chkMostrarXC) filasPorDespegue += 3;
        if (chkMostrarCizalladura) filasPorDespegue++;
        if (chkMostrarVientoEcmwf || chkMostrarVientoEcmwfDesplegable) {
            filasPorDespegue += 10; 
        }
    }

    for (let i = 0; i < filas.length; i += filasPorDespegue) {
        
        const filaPrincipal = filas[i];

        if (!filaPrincipal) break;
        
        let celda = filaPrincipal.querySelector('.columna-favoritos');
        if (!celda) celda = filaPrincipal.cells[0];

        // Verificamos si esta fila es una de las afectadas
        if (celda && celda.dataset.id && setAfectados.has(Number(celda.dataset.id))) {
            
            celda.innerHTML = nuevoEstadoEsFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
            celda.title = nuevoEstadoEsFavorito ? t('favoritos.quitarDeFavoritos') : t('favoritos.anadirAFavoritos');
            
            const action = nuevoEstadoEsFavorito ? 'add' : 'remove';
            // Aplicamos la clase "favorito" a TODAS las filas del bloque dinámicamente
            for (let j = 0; j < filasPorDespegue; j++) {
                if (filas[i + j]) filas[i + j].classList[action]("favorito");
            }
        }
    }

    actualizarContadorVisualFavoritos();
}

function confirmarSeleccionMasiva() {
    
	GestorMensajes.ocultar();
    
    setTimeout(() => {
        aplicarCambiosMasivos(idsPendientesDeConfirmacion, estadoPendienteDeAplicar);
        
        // Limpiar memoria
        idsPendientesDeConfirmacion = [];
		
		//mensajeFinalizarEdicionFavoritos();
    }, 50);
}

// Parámetro opcional 'ignorarMenu' que por defecto es false
function finalizarEdicionFavoritos(ignorarMenu = false) {
    favoritos = obtenerFavoritos();

    if (!localStorage.getItem("METEO_FAVORITOS_LISTA") || favoritos.length === 0) { 
        const configHecha = localStorage.getItem("METEO_PRIMERA_VISITA_HECHA") === "true";
        
        if (window.onboardingMapaActivo) {
            // 🗺️ MODAL ESPECIAL PARA EL MAPA CON BOTÓN DE ESCAPE
            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: `<div style="text-align: center; font-size: 1.1em;">${t('favoritos.necesarioMarcarUnoEnMapa')}</div>`,
                botones: [
                    {
                        texto: (typeof t === 'function' ? t('botones.volverAlMenuInicial', {defaultValue: 'Volver al menú inicial'}) : 'Volver al menú inicial'),
                        estilo: 'secundario',
                        onclick: function() {
                            GestorMensajes.ocultar();
                            
                            // Limpieza profunda para abortar la edición en el mapa
                            window.onboardingMapaActivo = false;
                            window.venirDeEdicionActiva = false;
                            modoEdicionFavoritos = false;
                            soloFavoritos = true; 
                            
                            // Devolver el botón meteo al mapa
                            const btnFiltros = document.getElementById('btn-filtros-mapa');
                            if (btnFiltros) btnFiltros.style.display = '';
                            
                            // Limpiar clases visuales
                            document.body.classList.remove('modo-edicion-tabla');
                            const divMenu = document.getElementById('div-menu');
                            if (divMenu) divMenu.classList.remove('mode-editing');
                            const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
                            if (divMenu2) divMenu2.classList.remove('mode-editing');
                            
                            // Volver a la tabla y restaurar todo
                            cambiarVista('tabla');
                            if (typeof limpiarBuscador === 'function') limpiarBuscador();
                            construir_tabla();
                            
                            // Mostrar de nuevo el menú inicial (Paso 1)
                            if (typeof window.mostrarPaso1General === 'function') {
                                window.mostrarPaso1General();
                            }
                        }
                    },
                    {
                        texto: (typeof t === 'function' ? t('botones.entendido', {defaultValue: 'Entendido'}) : 'Entendido'),
                        onclick: function() {
                            GestorMensajes.ocultar();
                        }
                    }
                ]
            });
        } else {
            // 📝 MODAL ESTÁNDAR PARA LA TABLA CON BOTÓN DE ESCAPE
            let botonesTabla = [];
            
            if (!configHecha) {
                // A) Si es la primera visita: Volver al menú inicial (Paso 1)
                botonesTabla.push({
                    texto: (typeof t === 'function' ? t('botones.volverAlMenuInicial', {defaultValue: 'Volver al menú inicial'}) : 'Volver al menú inicial'),
                    estilo: 'secundario',
                    onclick: function() {
                        GestorMensajes.ocultar();
                        window.venirDeEdicionActiva = false;
                        modoEdicionFavoritos = false;
                        soloFavoritos = true; 
                        
                        document.body.classList.remove('modo-edicion-tabla');
                        const divMenu = document.getElementById('div-menu');
                        if (divMenu) divMenu.classList.remove('mode-editing');
                        const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
                        if (divMenu2) divMenu2.classList.remove('mode-editing');
                        
                        cambiarVista('tabla');
                        if (typeof limpiarBuscador === 'function') limpiarBuscador();
                        construir_tabla();
                        
                        if (typeof window.mostrarPaso1General === 'function') {
                            window.mostrarPaso1General();
                        }
                    }
                });
            } else {
                // B) Si es usuaria recurrente que borró todos los favoritos: Escapar al mapa
                // (No le podemos dar una "tabla normal sin favoritos", así que el mapa es su única salida visual)
                botonesTabla.push({
                    texto: (typeof t === 'function' ? t('asistente.paso1.btnExplorarMapa', {defaultValue: 'Explorar mapa'}) : 'Explorar mapa'),
                    estilo: 'secundario',
                    onclick: function() {
                        GestorMensajes.ocultar();

                        window.venirDeEdicionActiva = false;
                        modoEdicionFavoritos = false;

                        document.body.classList.remove('modo-edicion-tabla');
                        const divMenuExplorarB = document.getElementById('div-menu');
                        if (divMenuExplorarB) divMenuExplorarB.classList.remove('mode-editing');
                        const divMenu2ExplorarB = document.getElementById('div-menu2-edicion-favoritos');
                        if (divMenu2ExplorarB) divMenu2ExplorarB.classList.remove('mode-editing');

                        if (typeof clicBotonMapa === 'function') {
                            clicBotonMapa();
                        }
                    }
                });
            }
            
            // Botón principal (Entendido)
            botonesTabla.push({
                texto: (typeof t === 'function' ? t('botones.entendido', {defaultValue: 'Entendido'}) : 'Entendido'),
                onclick: function() {
                    GestorMensajes.ocultar();
                }
            });

            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: `<div style="text-align: center; font-size: 1.1em;">${t('favoritos.necesarioMarcarUno')}</div>`,
                botones: botonesTabla
            });
        }
        return false; 
    }

    // Comprobar si falta elegir el modo Simple/Avanzado antes de salir definitivamente
    if (!localStorage.getItem("METEO_MODO_ELEGIDO")) {
        if (typeof window.mostrarPasoModo === 'function') {
            window.mostrarPasoModo(ignorarMenu);
        }
        return false; // Detenemos aquí, el modal de modos se encargará de continuar
    }

    // Si todo está OK y vamos a salir del modo edición:
    // 1. Mostramos el spinner inmediatamente
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) overlay.classList.add('loader-activo');

    // 2. Pausamos para pintar y luego hacemos el desmontaje pesado
    setTimeout(() => {
        if (typeof resetFiltroDistancia === 'function') {
            resetFiltroDistancia(false); 
        }
        
        document.body.classList.remove('modo-edicion-tabla');
        const divMenu = document.getElementById('div-menu');
        if (divMenu) divMenu.classList.remove('mode-editing');
        
        const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
        if (divMenu2) divMenu2.classList.remove('mode-editing');
        
        const panelHorario = document.querySelector('.div-filtro-horario');
        if (panelHorario) panelHorario.style.display = ''; 
        
        localStorage.setItem("METEO_PRIMERA_VISITA_HECHA", "true");
        modoEdicionFavoritos = false; 
        window.venirDeEdicionActiva = false; 
        
        window.onboardingMapaActivo = false;
        const btnFiltros = document.getElementById('btn-filtros-mapa');
        if (btnFiltros) btnFiltros.style.display = ''; 

        // Si venimos del onboarding del mapa, forzamos el cambio de pantalla a la tabla aquí dentro
        if (ignorarMenu === true) {
            cambiarVista('tabla');
            const navHome = document.getElementById('nav-home');
            if (navHome && typeof window.activarMenuInferior === 'function') {
                window.activarMenuInferior(navHome);
            }
        } else {
            // Si salimos de la edición normal (tabla), volvemos a encender la luz del botón "Tabla" de forma limpia al terminar.
            const navHome = document.getElementById('nav-home');
            if (navHome && typeof window.activarMenuInferior === 'function') {
                window.activarMenuInferior(navHome);
            }
        }

        if (typeof limpiarBuscador === 'function') limpiarBuscador(); 

        if (window.seguimientoPrevioEdicion === true) {
            if (obtenerSeguimientos().length > 0) {
                soloSeguimiento = true;
            } else {
                soloSeguimiento = false;
                const btnSegTog = document.getElementById('btn-filtro-seguimiento-toggle');
                if (btnSegTog) btnSegTog.classList.remove('activo', 'filtro-aplicado');
            }
        }
        window.seguimientoPrevioEdicion = null; 

        if (window.filtroMeteoPreEdicion !== undefined) {
            filtrosMapaAbiertos = window.filtroMeteoPreEdicion;
            window.filtroMeteoPreEdicion = undefined;
        }

        // Reseteamos el límite de paginación para la tabla inicial
        window.limitePaginacionMeteo = 10;

        construir_tabla(); 

        setTimeout(() => { sugerirGuiaPrincipal(); }, 500);

    }, 120);

    return true; 
}

// ---------------------------------------------------------------
// 🔴 GESTIÓN DE SEGUIMIENTO
// ---------------------------------------------------------------

function obtenerSeguimientos() {
    const data = localStorage.getItem("METEO_SEGUIMIENTO");
    if (!data) return [];
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch(e) {
        return [];
    }
}

function limpiarSeguimientosExpirados() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vigentes = obtenerSeguimientos().filter(s => {
        const fechaMarcado = new Date(s.fecha);
        fechaMarcado.setHours(0, 0, 0, 0);
        const diasPasados = Math.floor((hoy - fechaMarcado) / 86400000);
        return diasPasados < diasSeguimiento;
    });
    localStorage.setItem("METEO_SEGUIMIENTO", JSON.stringify(vigentes));
    return vigentes;
}

function toggleSeguimiento(id) {
    id = Number(id);
    const seguimientos = obtenerSeguimientos().map(s => ({ ...s, id: Number(s.id) }));
    const indice = seguimientos.findIndex(s => s.id === id);
    let esNuevo = false;

    if (indice === -1) {
        seguimientos.push({ id, fecha: new Date().toISOString().split('T')[0] });
        esNuevo = true;
    } else {
        seguimientos.splice(indice, 1);
    }

    localStorage.setItem("METEO_SEGUIMIENTO", JSON.stringify(seguimientos));
    return esNuevo;
}

window.toggleSeguimientoDesdeTabla = function(id, btnElement) {
    const esNuevo = toggleSeguimiento(id);

    window.vibrarDispositivo(); 

    // 1. Actualizar el botón presionado directamente
    if (btnElement) {
        actualizarVistaOjo(btnElement, esNuevo);
        btnElement.title = esNuevo ? t('seguimiento.activar_desactivar') : t('seguimiento.activar_desactivar');
    }

    // 2. Sincronizar el botón gemelo (tabla/mapa)
    const botonesOjo = document.querySelectorAll('.btn-ojo-tabla');
    botonesOjo.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes(`toggleSeguimientoDesdeTabla(${id},`) || 
            onclickAttr.includes(`toggleSeguimientoDesdeTabla('${id}',`)) {
            if (btn !== btnElement) {
                actualizarVistaOjo(btn, esNuevo);
                btn.title = esNuevo ? t('seguimiento.activar_desactivar') : t('seguimiento.activar_desactivar');
            }
        }
    });

    // 3. Lógica del filtro de seguimiento activo
    const btnFiltro = document.getElementById('btn-filtro-seguimiento-toggle');
    if (btnFiltro && btnFiltro.classList.contains('activo')) {
        const quedan = obtenerSeguimientos();
        const enMapa = document.getElementById('vista-mapa')?.style.display === 'flex';
        
        window.saltarScrollTop = (window.saltarScrollTop || 0) + 1;

        if (quedan.length === 0) {
            soloSeguimiento = false;
            btnFiltro.classList.remove('activo', 'filtro-aplicado');
            construir_tabla(false, enMapa, enMapa);
            mensajeModalAceptar('', t('seguimiento.filtroDesactivadoAuto', { ojo: _ojoVerde }));
        } else {
            construir_tabla(false, enMapa, enMapa);
        }
    } else {
        const enMapa = document.getElementById('vista-mapa')?.style.display === 'flex';
        
        if (enMapa && !modoEdicionFavoritos) {
            window.tablaRecrearAlVolver = true;
        }
    }
};

function filtroVerSoloSeguimiento() {
    const btn = document.getElementById('btn-filtro-seguimiento-toggle');
    const seguimientosActuales = obtenerSeguimientos();

    if (!btn.classList.contains('activo') && seguimientosActuales.length === 0) {
        mensajeModalAceptar('', t('seguimiento.noTienesSeguimiento', { ojo: _ojoVerde }));
        return;
    }

    btn.classList.toggle('activo');
    soloSeguimiento = btn.classList.contains('activo');
    btn.classList.toggle('filtro-aplicado', soloSeguimiento);
    construir_tabla();
}

// ---------------------------------------------------------------
// 🔴 LÓGICA HORAS DÍA/NOCHE
// ---------------------------------------------------------------

// Cálculo horario diurno estacional. Determina si una hora específica debe ocultarse en modo "Solo día". Considera las horas de luz según el mes del año y añade ±1h de margen.
// inicio: Math.floor(Amanecer_Bcn - 0.5), fin: Math.ceil(Atardecer_Pdv + 0.5). Valores extremos de Amanecer Barcelona (inicio) y Atardecer Pontevedra (fin) redondeados a la hora entera superior
const HORAS_LUZ_CON_MARGEN = [
    { inicio: 8, fin: 19 }, // 0: Enero
    { inicio: 7, fin: 20 }, // 1: Febrero
    { inicio: 7, fin: 21 }, // 2: Marzo (Optimizado para cambio de hora)
    { inicio: 7, fin: 22 }, // 3: Abril
    { inicio: 6, fin: 22 }, // 4: Mayo
    { inicio: 6, fin: 23 }, // 5: Junio
    { inicio: 6, fin: 23 }, // 6: Julio
    { inicio: 7, fin: 22 }, // 7: Agosto
    { inicio: 7, fin: 21 }, // 8: Septiembre
    { inicio: 7, fin: 20 }, // 9: Octubre (Optimizado para cambio de hora)
    { inicio: 7, fin: 19 }, // 10: Noviembre
    { inicio: 8, fin: 19 }  // 11: Diciembre
];

function esCeldaNoche(date) {
		
    const mes = date.getMonth(); // métodos del objeto getMonth(), getHours(), getMinutes(), getTimezoneOffset() .. dan datos de hora local y el offset DST. Date: 0 = Enero, 11 = Diciembre
    const hora = date.getHours(); // getHours() devuelve la hora local.

    const { inicio: inicioLuz, fin: finLuz } = HORAS_LUZ_CON_MARGEN[mes];
	
	return (hora < inicioLuz || hora >= finLuz); 
}

function alternarHorasNoche() {

	const chk = document.getElementById("chkMostrarSoloHorasDiurnas");
    const activo = chk.checked;
    // Desactivado porque bloqueaba Firefox
    //document.body.classList.toggle("solo-dia", activo);
    
    localStorage.setItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ", activo);

	sliderHorasValues = null; 
		
	// Esperamos 100ms para asegurar que el navegador terminó sus tareas de UI porque, si no, bloquea Firefox
    setTimeout(() => {
        location.reload();
    }, 500);
	
	// TRUCO: Redirección con timestamp para evitar caché y estado de formulario de Firefox. Esto obliga a una carga limpia desde cero.
    //window.location.href = window.location.pathname + "?t=" + new Date().getTime();
	
	//construir_tabla(); // Recarga la tabla con el nuevo filtro aplicado
}

function alternarMostrarVientoAlturas() {

    chkMostrarVientoAlturas = document.getElementById("chkMostrarVientoAlturas").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS", chkMostrarVientoAlturas);
	construir_tabla(); 
}

function alternarMostrarCizalladura() {
    chkMostrarCizalladura = document.getElementById("chkMostrarCizalladura").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA", chkMostrarCizalladura);
    construir_tabla(); 
}

// function alternarMostrarPrecipitacion() {
//     chkMostrarPrecipitacion = document.getElementById("chkMostrarPrecipitacion").checked;
//     localStorage.setItem("METEO_CHECKBOX_MOSTRAR_PRECIPITACION", chkMostrarPrecipitacion);
//     construir_tabla();
// }

function alternarMostrarProbPrecipitacion() {
    chkMostrarProbPrecipitacion = document.getElementById("chkMostrarProbPrecipitacion").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION", chkMostrarProbPrecipitacion);
    construir_tabla();
}

function alternarMostrarBaseNube() {
    chkMostrarBaseNube = document.getElementById("chkMostrarBaseNube").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE", chkMostrarBaseNube);
    construir_tabla();
}
window.alternarMostrarBaseNube = alternarMostrarBaseNube;

function alternarMostrarTemperatura() {
    chkMostrarTemperatura = document.getElementById("chkMostrarTemperatura").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_TEMPERATURA", chkMostrarTemperatura);
    construir_tabla();
}
window.alternarMostrarTemperatura = alternarMostrarTemperatura;

function alternarMostrarXC() {
    chkMostrarXC = document.getElementById("chkMostrarXC").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_XC", chkMostrarXC);
    construir_tabla();
}

function alternarOrdenarPorXC() {
    chkOrdenarPorXC = document.getElementById("chkOrdenarPorXC").checked;
    localStorage.setItem("METEO_CHECKBOX_ORDENAR_POR_XC", chkOrdenarPorXC);
    construir_tabla();
}

function cambiarDiasSeguimiento(delta) {
    let idx = PASOS_DIAS_SEGUIMIENTO.indexOf(diasSeguimiento);
    if (idx === -1) idx = PASOS_DIAS_SEGUIMIENTO.indexOf(3); // fallback por si el valor guardado fuera raro
    idx = Math.min(PASOS_DIAS_SEGUIMIENTO.length - 1, Math.max(0, idx + delta));
    diasSeguimiento = PASOS_DIAS_SEGUIMIENTO[idx];

    localStorage.setItem('METEO_DIAS_SEGUIMIENTO', diasSeguimiento === Infinity ? 'infinito' : String(diasSeguimiento));

    const el = document.getElementById('valor-dias-seguimiento');
    if (el) el.textContent = (diasSeguimiento === Infinity) ? '∞' : diasSeguimiento;

    // Actualizar botones −/+ para reflejar límites
    const btnMenos = document.getElementById('stepper-seguimiento-menos');
    const btnMas   = document.getElementById('stepper-seguimiento-mas');
    if (btnMenos) btnMenos.disabled = (idx <= 0);
    if (btnMas)   btnMas.disabled   = (idx >= PASOS_DIAS_SEGUIMIENTO.length - 1);
}

// ---------------------------------------------------------------
// 🔴 SLIDERS. RANGO HORARIO. Lógica para poder hacer clic en los pips de los días semanales y seleccionar así sus rango horario completo (tiene en cuenta chk día/noche) con un toque
// ---------------------------------------------------------------

function crearBotonesDia(sliderElement, pipIndices, diaSeleccionado) {
    const contenedor = document.getElementById('botones-dias-slider');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const horas = window.horasCrudasRangoHorario;
    const indices = window.indicesHorasRangoHorario;
    const diasClaves = ["dom","lun","mar","mie","jue","vie","sab"];

    pipIndices.forEach((startIdx, i) => {
        const idxReal = indices[startIdx];
        const d = new Date(horas[idxReal].endsWith('Z') ? horas[idxReal] : horas[idxReal] + 'Z');
        const label = t(`dias.${diasClaves[d.getDay()]}`) + " " + d.getDate();

        const btn = document.createElement('button');
        btn.textContent = label;
        
        // Si el modo "Ver todos los días" está activo, obligamos a que ningún día se pinte de azul
        const esActivo = (!modoVerTodosLosDias && i === diaSeleccionado);
        
        btn.className = 'pip-dia-btn' + (esActivo ? ' pip-activo' : '');
        btn.dataset.diaIndex = i;

        btn.addEventListener('click', function() {
            // 1. APAGAR el modo calendario si se pulsa un día
            modoVerTodosLosDias = false;
            const btnCal = document.getElementById('btn-ver-todos-dias');
            if (btnCal) btnCal.classList.remove('activo');
            document.getElementById('div-filtro-horario').classList.remove('ocultar-slider-por-calendario');

            // 2. Lógica normal de días
            document.querySelectorAll('.pip-dia-btn').forEach(b => b.classList.remove('pip-activo'));
            this.classList.add('pip-activo');
            clickOnDia(sliderElement, parseInt(this.dataset.diaIndex));
        });

        contenedor.appendChild(btn);
    });
}

const chkDiaNoche = document.getElementById('chkDiaNoche');

function clickOnDia(sliderElement, diaIndex) {
    window.limitePaginacionMeteo = 10;
    const mismodia = window.diaSeleccionadoSlider === diaIndex;
    
    // INICIAMOS EL SPINNER INMEDIATAMENTE AL TOCAR EL BOTÓN DEL DÍA
    ejecutarOperacionPesada(() => {
        window.diaSeleccionadoSlider = diaIndex;
        const dayRanges = sliderElement.dayRanges;
        if (!dayRanges || !dayRanges[diaIndex]) return;

        const { startPos, endPos } = dayRanges[diaIndex];
        window.indicesDiaActualSlider = window.indicesHorasRangoHorario.slice(startPos, endPos + 1);

        const newMax = window.indicesDiaActualSlider.length - 1;

        // Actualizar rango del slider
        sliderElement.noUiSlider.updateOptions({
            range: { min: 0, max: newMax }
        });

        // Aplicar preferencias horarias
        let finalStart = 0;
        let finalEnd = newMax;

        if (window.restaurarRangoDesdeCalendario) {
            const rangoRestaurar = window.ultimoRangoSlider || window.sliderHorasValues;
            if (rangoRestaurar) {
                finalStart = Math.min(rangoRestaurar[0], newMax);
                finalEnd   = Math.min(rangoRestaurar[1], newMax);
                if (finalEnd < finalStart) finalEnd = finalStart;
            }
        } else if (!mismodia && window.rangoHorarioPersonalizado && window.sliderHorasValues) {
            finalStart = Math.min(window.sliderHorasValues[0], newMax);
            finalEnd   = Math.min(window.sliderHorasValues[1], newMax);
            if (finalEnd < finalStart) finalEnd = finalStart;
        } else {
            window.rangoHorarioPersonalizado = false;
            const rawInicio = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO');
            const rawFin    = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN');

            if (rawInicio !== null && rawFin !== null) {
                let prefInicio = parseInt(rawInicio);
                let prefFin    = parseInt(rawFin);
                let encontradoInicio = false;

                const fechaPrimerDato = new Date(window.horasCrudasRangoHorario[window.indicesDiaActualSlider[0]].endsWith('Z') ? window.horasCrudasRangoHorario[window.indicesDiaActualSlider[0]] : window.horasCrudasRangoHorario[window.indicesDiaActualSlider[0]] + 'Z');
                const esHoy = new Date().getDate() === fechaPrimerDato.getDate();

                if (mismodia && esHoy) {
                    const horaActual = new Date().getHours();
                    if (horaActual >= prefInicio + 2) {
                        prefInicio = Math.max(0, horaActual - 1); 
                        if (prefFin <= prefInicio) {
                            prefFin = 23; 
                        }
                    }
                }

                window.indicesDiaActualSlider.forEach((idxReal, i) => {
                    const h = new Date(window.horasCrudasRangoHorario[idxReal].endsWith('Z')
                        ? window.horasCrudasRangoHorario[idxReal]
                        : window.horasCrudasRangoHorario[idxReal] + 'Z').getHours();

                    if (!encontradoInicio) {
                        if (prefInicio === 0 || h >= prefInicio) { finalStart = i; encontradoInicio = true; }
                    }
                    if (h <= prefFin) finalEnd = i;
                });

                if (finalStart > newMax) finalStart = newMax;
                if (finalEnd < finalStart) finalEnd = finalStart; 
                
                if (!encontradoInicio) {
                    finalStart = 0; 
                    finalEnd = newMax;
                }
            }
        }

        sliderElement.noUiSlider.set([finalStart, finalEnd]);
            window.sliderHorasValues = [finalStart, finalEnd];

            window.ultimoRangoSlider = null;
            window.restaurarRangoDesdeCalendario = false;

            const vistaMapa = document.getElementById('vista-mapa');
            const enMapa = vistaMapa && vistaMapa.style.display === 'flex';

            if (enMapa) {
                // Saltamos la reconstrucción de la tabla
                window.tablaRecrearAlVolver = true;
                if (typeof aplicarPuntuacionEnMapa === 'function') aplicarPuntuacionEnMapa();
            } else {
                construir_tabla(false, false); 
                if (typeof aplicarPuntuacionEnMapa === 'function') aplicarPuntuacionEnMapa();
            }

        }); 
    }

// Función que adjunta el evento Y AHORA TAMBIÉN FORZA LA POSICIÓN VISUAL
function adjuntarEventoPips(sliderElement) {
    if (!sliderElement || !sliderElement.noUiSlider) return;

    const pips = sliderElement.querySelectorAll('.noUi-value');
    
    // Definimos las posiciones fijas que queremos forzar visualmente
    // Ajusta estos valores si quieres que estén más al borde o más centrados
    // Para 4 días: Inicio, 1/3, 2/3, Final podría ser una opción, 
    // pero lo clásico simétrico es 0, 25, 50, 75 (o 0, 33, 66, 100 si ocupan todo).
    // Basado en tu ejemplo anterior:
    const posicionesFijas = ['0%', '25%', '50%', '75%']; 

    for (let i = 0; i < pips.length; i++) {
        pips[i].style.cursor = 'pointer'; 
        
        // --- INYECCIÓN DE POSICIÓN FORZADA ---
        if (posicionesFijas[i]) {
            // Sobrescribimos el 'left' calculado por la librería
            pips[i].style.left = posicionesFijas[i];
            
            // Forzamos que se aplique inmediatamente marcándolo como importante en el estilo inline
            pips[i].style.setProperty('left', posicionesFijas[i], 'important');
        }
        // ----------------------------------------

        const handler = (function(slider) {
            return function() {
                // 'this' es el pip clicado
                clickOnPip.call(this, slider);
            };
        })(sliderElement);

        // Clonamos para limpiar eventos previos
        // Nota: Al clonar se mantienen los estilos inline que acabamos de modificar
        const newPip = pips[i].cloneNode(true);
        pips[i].parentNode.replaceChild(newPip, pips[i]);
        
        newPip.addEventListener('click', handler);
    }
}

// ---------------------------------------------------------------
// 🔴 SLIDERS. FILTRO RANGO HORARIO. Construcción. FUNCIÓN MAESTRA: CALCULAR ÍNDICES SEGÚN CONFIGURACIÓN PREFERENCIA RANGO HORARIO
// ---------------------------------------------------------------

window.calcularIndicesPreferencia = function(diaObjetivo) {
	
    const indices = window.indicesHorasRangoHorario || [];
    const horas = window.horasCrudasRangoHorario || [];
    const maxSteps = indices.length - 1;

    // Si no hay datos, devolvemos todo 0
    if (indices.length === 0) return [0, 0];

    // 1. Detectar qué día queremos analizar
    // Si no nos pasan día, cogemos el día del primer dato disponible
    if (!diaObjetivo) {
        const fechaPrimerDato = new Date(horas[indices[0]].endsWith('Z') ? horas[indices[0]] : horas[indices[0]] + 'Z');
        diaObjetivo = fechaPrimerDato.getDate();
    }

    // 2. Encontrar los límites (índices) de ESE día en concreto
    let indiceInicioDia = -1;
    let indiceFinDia = -1;

    for (let i = 0; i < indices.length; i++) {
        const idxReal = indices[i];
        const fecha = new Date(horas[idxReal].endsWith('Z') ? horas[idxReal] : horas[idxReal] + 'Z');
        
        if (fecha.getDate() === diaObjetivo) {
            if (indiceInicioDia === -1) indiceInicioDia = i; // Primer match
            indiceFinDia = i; // Actualizamos hasta el último match
        } else if (indiceInicioDia !== -1) {
            // Si ya habíamos encontrado el día y cambia, paramos (ya tenemos el rango del día)
            break;
        }
    }

    // Si no encontramos el día solicitado, devolvemos rango completo (seguridad)
    if (indiceInicioDia === -1) return [0, maxSteps];

    const rawInicio = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO');
    const rawFin = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN');

    // Convertimos a número, pero si es null, asignamos el rango completo por defecto (0-23)
    const prefInicio = (rawInicio === null) ? 0 : parseInt(rawInicio);
    const prefFin = (rawFin === null) ? 23 : parseInt(rawFin);
    
	// Si no hay configuración guardada O si la configuración es el rango total (0-23)
    if (rawInicio === null || (prefInicio === 0 && prefFin === 23)) {
        
        const chkLuz = document.getElementById('solo-horas-luz');
        const soloHorasDeLuz = chkLuz ? chkLuz.checked : false; 

        // Si NO está activo el filtro de luz, devolvemos el día completo directamente.
        // Esto evita procesar horas y soluciona el salto de la 01:00h en modo 24h.
        if (!soloHorasDeLuz) {
            return [indiceInicioDia, indiceFinDia];
        }
    }

    let resultadoInicio = indiceInicioDia;
    let resultadoFin = indiceFinDia;

    for (let i = indiceInicioDia; i <= indiceFinDia; i++) {
        const idxReal = indices[i];
        const fecha = new Date(horas[idxReal].endsWith('Z') ? horas[idxReal] : horas[idxReal] + 'Z');
        const h = fecha.getHours();
        
        if (prefInicio === 0) {
            // Si el usuario quiere empezar a las 00h, forzamos el primer índice del día
            resultadoInicio = indiceInicioDia;
        } else if (h < prefInicio) {
            resultadoInicio = i + 1; 
        }
        
        if (h <= prefFin) {
            resultadoFin = i;
        }
    }

    // 4. Correcciones finales de seguridad
    if (resultadoInicio > indiceFinDia) resultadoInicio = indiceFinDia;
    if (resultadoFin < resultadoInicio) resultadoFin = resultadoInicio;
    
    return [resultadoInicio, resultadoFin];
};

// ---------------------------------------------------------------
// 🔴 SLIDERS. FILTRO RANGO HORARIO. Construcción
// ---------------------------------------------------------------

function gestionarSliderHoras(respuestas, soloHorasDeLuz) {

    const sliderHoras = document.getElementById('horario-slider'); 

    window.horasCrudasRangoHorario = [];
    if (respuestas && respuestas.length > 0 && respuestas[0].hourly && respuestas[0].hourly.time) {
        window.horasCrudasRangoHorario = respuestas[0].hourly.time;
    }

    // --- LÓGICA DE FILTRADO Y ZONA HORARIA (Idéntica a la original) ---
    let horasFiltradasPermanentemente = window.horasCrudasRangoHorario;
    if (horasFiltradasPermanentemente.length > 0) {
        const ultimoIndice = horasFiltradasPermanentemente.length - 1;
        const ultimaHora = horasFiltradasPermanentemente[ultimoIndice];
        
        const ultimaFechaLocal = new Date(ultimaHora.endsWith('Z') ? ultimaHora : ultimaHora + 'Z');
        const diaUltimo = ultimaFechaLocal.getDate();

        let horasEnUltimoDia = 0;
        let indiceCorte = -1;

        // Contamos cuántas horas hay en ese último día y dónde empieza
        for (let i = ultimoIndice; i >= 0; i--) {
            const h = horasFiltradasPermanentemente[i];
            const d = new Date(h.endsWith('Z') ? h : h + 'Z');
            if (d.getDate() === diaUltimo) {
                horasEnUltimoDia++;
            } else {
                indiceCorte = i + 1; // Índice donde empieza ese último día
                break;
            }
        }

        // Si el último día es solo un "derrame" por el cambio de hora (ej. tiene menos de 6 horas),
        // lo cortamos para que la tabla termine limpia al final del 4º día a las 23:00.
        if (indiceCorte !== -1 && horasEnUltimoDia < 6) {
            horasFiltradasPermanentemente = horasFiltradasPermanentemente.slice(0, indiceCorte);
        }
    }
    window.horasCrudasRangoHorario = horasFiltradasPermanentemente;
    const horasCrudasRangoHorario = window.horasCrudasRangoHorario;

    // --- DETERMINAR ÍNDICES VÁLIDOS ---
    window.indicesHorasRangoHorario = [];
    if (horasCrudasRangoHorario.length > 0) {
        horasCrudasRangoHorario.forEach((h, i) => {
            const d = new Date(h.endsWith('Z') ? h : h + 'Z');
            const esNoche = esCeldaNoche(d);
            if (soloHorasDeLuz && esNoche) return; 
            window.indicesHorasRangoHorario.push(i);
        });
    }

    if (!sliderHoras || window.indicesHorasRangoHorario.length === 0) return; 
    
    const maxSteps = window.indicesHorasRangoHorario.length - 1;

    // --- CÁLCULO DE PIPS ---
    const pipIndices = [];
    pipIndices.push(0);
    if (window.indicesHorasRangoHorario.length > 0) {
        const primerIndiceReal = window.indicesHorasRangoHorario[0];
        const primerDia = new Date(horasCrudasRangoHorario[primerIndiceReal].endsWith('Z') ? horasCrudasRangoHorario[primerIndiceReal] : horasCrudasRangoHorario[primerIndiceReal] + 'Z').getDate();
        let diaActual = primerDia;
        
        for (let i = 1; i < window.indicesHorasRangoHorario.length; i++) {
            const indiceReal = window.indicesHorasRangoHorario[i];
            const d = new Date(horasCrudasRangoHorario[indiceReal].endsWith('Z') ? horasCrudasRangoHorario[indiceReal] : horasCrudasRangoHorario[indiceReal] + 'Z');
            const diaNuevo = d.getDate();
            if (diaNuevo !== diaActual) {
                pipIndices.push(i);
                diaActual = diaNuevo;
            }
        }
    }

    // Guardar rangos por día (start/end en indicesHorasRangoHorario)
    sliderHoras.dayRanges = pipIndices.map((startPos, i) => ({
        startPos,
        endPos: pipIndices[i + 1] !== undefined ? pipIndices[i + 1] - 1 : maxSteps
    }));

    // Día inicial
    const ahora = new Date();
    const diaAutoInicial = 0; // Siempre arranca en hoy (día 0). Antes: (!autoSeleccionInicialHecha && ahora.getHours() >= 16) ? 1 : 0;
    const diaObjetivoInicial = (window.diaSeleccionadoSlider !== null) 
        ? Math.min(window.diaSeleccionadoSlider, sliderHoras.dayRanges.length - 1)
        : diaAutoInicial;

    // Guardar siempre el día seleccionado para que persista al volver del mapa
    if (window.diaSeleccionadoSlider === null) {
        window.diaSeleccionadoSlider = diaObjetivoInicial;
    }
    const rangoInicial = sliderHoras.dayRanges[Math.min(diaObjetivoInicial, sliderHoras.dayRanges.length - 1)];
    window.indicesDiaActualSlider = window.indicesHorasRangoHorario.slice(rangoInicial.startPos, rangoInicial.endPos + 1);
    
    const pipsFormatter = {
        to: function(val) {
            const horas = window.horasCrudasRangoHorario;
            // Usamos el array del día actual en lugar del array de toda la semana
            const indices = window.indicesDiaActualSlider; 
            const indiceReal = indices[Math.round(val)];
            
            if (!horas || horas.length === 0 || indiceReal === undefined) return "";
            
            const horaString = horas[indiceReal]; 
            const d = new Date(horaString.endsWith('Z') ? horaString : horaString + 'Z');

            // --- TRADUCCIÓN DE LOS DÍAS ---
            const diasClaves = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
            const diaSemanaIndex = d.getDay(); 
            const diaTraducido = t(`dias.${diasClaves[diaSemanaIndex]}`);
            
            return diaTraducido + " " + d.getDate();
        },
        from: (v) => Number(v)
    };
    
    const tooltipFormatter = {
        to: function(val) {
            const horas = window.horasCrudasRangoHorario;
            // Usamos el array del día actual en lugar del array de toda la semana
            const indices = window.indicesDiaActualSlider;
            const indiceReal = indices[Math.round(val)];
            if (!horas || horas.length === 0 || indiceReal === undefined) return "";
            const horaString = horas[indiceReal]; 
            const d = new Date(horaString.endsWith('Z') ? horaString : horaString + 'Z');
            const hora = String(d.getHours()).padStart(2, '0');
            return `${hora}`;
        }
    };

    // ---------------------------------------------------------------
    // CREACIÓN O ACTUALIZACIÓN
    // ---------------------------------------------------------------
    
    if (!sliderHoras.noUiSlider) {
        // CASO 1: CREAR
        
        sliderHoras.dayStartIndices = pipIndices;
        sliderHoras.dayStartTimestamp = window.horasCrudasRangoHorario.length > 0 
        ? new Date(window.horasCrudasRangoHorario[0].endsWith('Z') ? window.horasCrudasRangoHorario[0] : window.horasCrudasRangoHorario[0] + 'Z').getTime() 
        : 0;

        // --- CÁLCULO PREVIO DEL RANGO INICIAL DIRECTO ---
        let startIndices = [0, maxSteps]; // Por defecto todo

        if (!autoSeleccionInicialHecha) {
            //const ahora = new Date();
            //const horaActual = ahora.getHours();
            let diaObjetivo = 0; // Siempre hoy (día 0). Antes: (horaActual >= 16) ? 1 : 0;

            if (pipIndices && pipIndices.length > diaObjetivo) {
                const idxInicioDia = pipIndices[diaObjetivo];
                const idxFinDia = (pipIndices[diaObjetivo + 1]) ? pipIndices[diaObjetivo + 1] - 1 : maxSteps;

                // Aplicar las preferencias de "Horario de vuelo preferido" del usuario
                const prefInicio = parseInt(localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO')) || 0;
                const prefFin = parseInt(localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN')) || 23;

                let finalStart = idxInicioDia;
                let finalEnd = idxFinDia;

                // Buscamos dentro de los índices de ese día cuáles coinciden con las horas del usuario
                for (let i = idxInicioDia; i <= idxFinDia; i++) {
                    const idxReal = window.indicesHorasRangoHorario[i];
                    const fecha = new Date(window.horasCrudasRangoHorario[idxReal].endsWith('Z') ? window.horasCrudasRangoHorario[idxReal] : window.horasCrudasRangoHorario[idxReal] + 'Z');
                    const h = fecha.getHours();
                    
                    if (h < prefInicio) finalStart = i + 1;
                    if (h <= prefFin) finalEnd = i;
                }
                
                if (finalStart > idxFinDia) finalStart = idxFinDia;
                if (finalEnd < finalStart) finalEnd = finalStart;

                startIndices = [finalStart - rangoInicial.startPos, finalEnd - rangoInicial.startPos];
                autoSeleccionInicialHecha = true; // Bloqueamos para que no lo vuelva a hacer al actualizar
            }
        }

        // Crear el slider ya con el rango recortado
        noUiSlider.create(sliderHoras, {
            start: startIndices,
            connect: true,
            step: 1,
            range: { min: 0, max: window.indicesDiaActualSlider.length - 1 },
            tooltips: [tooltipFormatter, tooltipFormatter],
            format: { to: (v) => Math.round(v), from: (v) => Number(v) }
            // SIN pips — los botones son HTML externo
        });

        crearBotonesDia(sliderHoras, pipIndices, diaObjetivoInicial);
        
        // --- Iluminar el botón inicial en el arranque ---
        if (autoSeleccionInicialHecha) {
            //const ahora = new Date();
            //const horaActual = ahora.getHours();
            let diaObjetivo = 0; // Siempre hoy (día 0). Antes: (horaActual >= 16) ? 1 : 0;
            
            if (pipIndices && pipIndices.length > diaObjetivo) {
                const valorBuscado = pipIndices[diaObjetivo];
                const pipsVisuales = sliderHoras.querySelectorAll('.noUi-value');
                pipsVisuales.forEach(p => {
                    if (Number(p.getAttribute('data-value')) === valorBuscado) {
                        p.classList.add('pip-activo');
                    }
                });
            }
        }

        window.sliderHorasValues = startIndices;

        sliderHoras.noUiSlider.on('change', function(values) {
            const valoresNuevos = values.map(Number);
            const haCambiado = valoresNuevos.some((val, i) => val !== window.sliderHorasValues[i]);
            window.rangoHorarioPersonalizado = true;
            
            if (haCambiado) {
                window.limitePaginacionMeteo = 10; 
                ejecutarOperacionPesada(() => {
                    window.sliderHorasValues = valoresNuevos;

                    const vistaMapa = document.getElementById('vista-mapa');
                    const enMapa = vistaMapa && vistaMapa.style.display === 'flex';

                    if (enMapa) {
                        // Si estamos en el mapa, NO perdemos tiempo haciendo la tabla.
                        // Marcamos la bandera y actualizamos solo los colores del mapa.
                        window.tablaRecrearAlVolver = true;
                        if (typeof aplicarPuntuacionEnMapa === 'function') aplicarPuntuacionEnMapa();
                    } else {
                        // Si estamos viendo la tabla, sí la reconstruimos.
                        construir_tabla(false, false); 
                        if (typeof aplicarPuntuacionEnMapa === 'function') aplicarPuntuacionEnMapa();
                    }
                });
            }
        });

        sliderHoras.noUiSlider.on('slide', function () {
            // --- Quitar azul si la usuaria mueve los tiradores manuales ---
            const pips = sliderHoras.querySelectorAll('.noUi-value');
            pips.forEach(p => p.classList.remove('pip-activo'));

            window.vibrarDispositivo();
        });

    } else {
        // CASO 2: ACTUALIZAR
        
        const currentMax = sliderHoras.noUiSlider.options.range.max;
        
        // 1. Detectamos si ha cambiado el número de pasos
        const haCambiadoLongitud = currentMax !== maxSteps;

        // 2. Detectamos si ha cambiado el contenido (los días)
        // Comparamos el primer timestamp que tiene el slider guardado vs el nuevo
        const primerTimestampAntiguo = sliderHoras.dayStartTimestamp || 0;
        const primerTimestampNuevo = window.horasCrudasRangoHorario.length > 0 
            ? new Date(window.horasCrudasRangoHorario[0].endsWith('Z') ? window.horasCrudasRangoHorario[0] : window.horasCrudasRangoHorario[0] + 'Z').getTime() 
            : 0;
            
        const hanCambiadoFechas = primerTimestampAntiguo !== primerTimestampNuevo;

        // Si ha cambiado algo, actualizamos
        if (haCambiadoLongitud || hanCambiadoFechas) {

            sliderHoras.dayStartTimestamp = primerTimestampNuevo;
            sliderHoras.dayRanges = pipIndices.map((startPos, i) => ({
                startPos,
                endPos: pipIndices[i + 1] !== undefined ? pipIndices[i + 1] - 1 : maxSteps
            }));

            // Respetar día seleccionado o usar el primero
            const diaActual = (window.diaSeleccionadoSlider !== null)
                ? Math.min(window.diaSeleccionadoSlider, sliderHoras.dayRanges.length - 1)
                : 0;
            const rango = sliderHoras.dayRanges[diaActual];
            window.indicesDiaActualSlider = window.indicesHorasRangoHorario.slice(rango.startPos, rango.endPos + 1);

            const newMax = window.indicesDiaActualSlider.length - 1;

            // Mantener la selección del usuario si tiene sentido
            let newStart = [0, newMax];
            if (window.sliderHorasValues) {
                let v1 = Math.min(window.sliderHorasValues[0], newMax);
                let v2 = Math.min(window.sliderHorasValues[1], newMax);
                if (v2 < v1) v2 = v1;
                newStart = [v1, v2];
            }

            sliderHoras.noUiSlider.updateOptions({
                range: { min: 0, max: window.indicesDiaActualSlider.length - 1 },
                start: newStart
                // SIN pips
            });

            crearBotonesDia(sliderHoras, pipIndices, diaActual);
        }
    }

	// Sincronizar Slider de Configuración de rango horario preferido con el horario solar actual 
    const sliderConfig = document.getElementById('configuracion-horario-slider');
    
    if (sliderConfig && sliderConfig.noUiSlider && localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO') === null) {
        
        // Obtenemos el rango del primer día (ya sea 0-23 o solar)
        const rangoActual = window.calcularIndicesPreferencia(null);
        
        const hInicio = new Date(window.horasCrudasRangoHorario[window.indicesHorasRangoHorario[rangoActual[0]]].endsWith('Z') ? window.horasCrudasRangoHorario[window.indicesHorasRangoHorario[rangoActual[0]]] : window.horasCrudasRangoHorario[window.indicesHorasRangoHorario[rangoActual[0]]] + 'Z').getHours();
        const hFin = new Date(window.horasCrudasRangoHorario[window.indicesHorasRangoHorario[rangoActual[1]]].endsWith('Z') ? window.horasCrudasRangoHorario[window.indicesHorasRangoHorario[rangoActual[1]]] : window.horasCrudasRangoHorario[window.indicesHorasRangoHorario[rangoActual[1]]] + 'Z').getHours();
        
        // Movemos el slider de configuración al rango actual SIN disparar el guardado
        sliderConfig.noUiSlider.set([hInicio, hFin], false);
    }
	
}

// ---------------------------------------------------------------
// 🟡 SLIDERS. FILTRO RANGO HORARIO. Botón calendario 4 días
// ---------------------------------------------------------------

let modoVerTodosLosDias = false;
let ultimoDiaSeleccionado = 0; // 💾 Almacena el índice del último día que estuvo activo

window.toggleVerTodosLosDias = function() {
    window.limitePaginacionMeteo = 10;
    const btnCal = document.getElementById('btn-ver-todos-dias');
    const panelFiltro = document.getElementById('div-filtro-horario');
    
    // 1. Mostramos el spinner y el fondo sutil inmediatamente
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) {
        overlay.classList.add('loader-activo');
    }

    // 2. Pausamos 50ms para permitir que la GPU pinte el spinner en pantalla
    setTimeout(() => {
        
        if (modoVerTodosLosDias) {
            // 🔄 APAGAMOS el modo Calendario (Volvemos a vista de 1 día)
            modoVerTodosLosDias = false;
            if (btnCal) btnCal.classList.remove('activo');
            if (panelFiltro) panelFiltro.classList.remove('ocultar-slider-por-calendario');
            
            // Simulamos el clic automático en el botón del día en que estábamos.
            // (La llamada a construir_tabla() dentro del click se encargará de ocultar el loader al finalizar).
            const botones = document.querySelectorAll('.pip-dia-btn');
            if (botones.length > 0) {
                const idx = Math.min(ultimoDiaSeleccionado, botones.length - 1);
                botones[idx].click(); 
            } else {
                ocultarLoading(); // Fallback de seguridad si no se encontraran botones
            }
        } else {
            // 🔄 ACTIVAMOS el modo Calendario (Mostramos todos los días)
            ultimoDiaSeleccionado = window.diaSeleccionadoSlider !== null ? window.diaSeleccionadoSlider : 0;
            window.ultimoRangoSlider = window.sliderHorasValues ? [...window.sliderHorasValues] : null;
            window.restaurarRangoDesdeCalendario = true;

            modoVerTodosLosDias = true;
            if (btnCal) btnCal.classList.add('activo');
            if (panelFiltro) panelFiltro.classList.add('ocultar-slider-por-calendario');

            const vistaMapa = document.getElementById('vista-mapa');
            const enMapa = vistaMapa && vistaMapa.style.display === 'flex';

            if (enMapa) {
                // Actualizamos solo el mapa y marcamos bandera
                window.tablaRecrearAlVolver = true;
                if (typeof aplicarPuntuacionEnMapa === 'function') aplicarPuntuacionEnMapa();
                ocultarLoading(); // Apagamos el spinner manualmente
            } else {
                construir_tabla();
            }
        }

    }, 50);
};

// ---------------------------------------------------------------
// 🔴 FUNCIONES GLOBALES (hay otras más, pero éstas tienen que estar antes de construir la tabla)
// ---------------------------------------------------------------

// 🟡 FUNCIÓN COMÚN DE PUNTUACIÓN (Unificado para Tabla y Mapa)

function calcularPuntuacionesDespegue(despegueObj, hourlyData, hourlyEcmwf, indicesEvaluacion) {
    if (!hourlyData || !indicesEvaluacion || indicesEvaluacion.length === 0) {
        return { notaCondiciones: null, notaXC: null, horasValidas: 0, horasValidasXC: 0 };
    }

    const velArray = hourlyData.wind_speed_10m;
    const rachaArray = hourlyData.wind_gusts_10m;
    const dirArray = hourlyData.wind_direction_10m;
    
    let puntosAcumulados = 0;
    let horasValidas = 0;
    let puntosAcumuladosXC = 0;
    let horasValidasXC = 0;

    const orientaciones = despegueObj.Orientaciones_Grados
        ? despegueObj.Orientaciones_Grados.split(",").map(n => parseFloat(n.trim()))
        : [];

    indicesEvaluacion.forEach(i => {
        if (velArray[i] === undefined || velArray[i] === null) return;

        horasValidas++;

        let dirCorregida = dirArray[i];
        let velocidad = Math.round(Math.max(0, velArray[i]));
        let rachaCorregida = Math.round(Math.max(0, rachaArray[i]));

        // --- DIRECCIÓN Y LADERA CONTINUA ---
        let minimoAngulo = 180;
        if (orientaciones.length > 0) {
            minimoAngulo = Math.min(...orientaciones.map(o => diferenciaAngular(dirCorregida, o)));
            if (orientaciones.length > 1) {
                const UMBRAL_CONTIGUAS = 46;
                const oriOrdenadas = [...orientaciones].sort((a, b) => a - b);
                for (let j = 0; j < oriOrdenadas.length; j++) {
                    let o1 = oriOrdenadas[j];
                    let o2 = oriOrdenadas[(j + 1) % oriOrdenadas.length];
                    let diff = (o2 - o1 + 360) % 360;
                    if (diff > 180) { diff = 360 - diff; let temp = o1; o1 = o2; o2 = temp; }
                    if (diff <= UMBRAL_CONTIGUAS) {
                        let diffViento = (dirCorregida - o1 + 360) % 360;
                        if (diffViento <= diff) { minimoAngulo = 0; break; }
                    }
                }
            }
        }

        // --- PUNTUACIÓN DE VUELO ---
        let ptsHora = 0;
        let vetoActivado = false;

        let ptsDir = 0, ratioCorreccionPorDireccion = 1, ratioCorreccionPorRacha = 1;
        if (minimoAngulo > 120)      { ptsDir = 0; vetoActivado = true; }
        else if (minimoAngulo > 100) { ptsDir = 5;  ratioCorreccionPorDireccion = 0.2; }
        else if (minimoAngulo > 80)  { ptsDir = 10; ratioCorreccionPorDireccion = 0.3; }
        else if (minimoAngulo > 45)  { ptsDir = 15; ratioCorreccionPorDireccion = 0.4; }
        else if (minimoAngulo > 22)  { ptsDir = 35; ratioCorreccionPorDireccion = 0.6; }
        else if (minimoAngulo > 10)  { ptsDir = 45; ratioCorreccionPorDireccion = 0.9; }
        else                         { ptsDir = 50; ratioCorreccionPorDireccion = 1; }

        let ptsRacha = 0;
        if (!vetoActivado) {
            if (rachaCorregida > RachaMax * 1.5)      { ptsRacha = 0; vetoActivado = true; }
            else if (rachaCorregida > RachaMax * 1.1) { ptsRacha = 0;  ratioCorreccionPorRacha = 0.2; }
            else if (rachaCorregida > RachaMax)       { ptsRacha = 5;  ratioCorreccionPorRacha = 0.5; }
            else if (rachaCorregida > RachaMax * 0.8) { ptsRacha = 20; ratioCorreccionPorRacha = 0.8; }
            else                                      { ptsRacha = 30; }
        }

        let ptsVel = 0;
        if (!vetoActivado) {
            if      (velocidad > VelocidadMax * 2)   { ptsVel = 0; vetoActivado = true; }
            else if (velocidad > VelocidadMax * 1.5) { ptsVel = 3; }
            else if (velocidad > VelocidadMax)       { ptsVel = 5; }
            else if (velocidad > VelocidadMin)       { ptsVel = 20; }
            else                                     { ptsVel = 15; }
        }

        // 💦 Veto Supremo: Lluvia
        if (hourlyEcmwf && hourlyEcmwf.precipitation && Number(hourlyEcmwf.precipitation[i]) > 0) {
            vetoActivado = true;
        }

        if (!vetoActivado) {
            ptsHora = (ptsDir + ptsRacha + ptsVel) * ratioCorreccionPorDireccion * ratioCorreccionPorRacha;
        }
        puntosAcumulados += ptsHora;

        // --- PUNTUACIÓN DE XC ---
        if (hourlyEcmwf && typeof chkMostrarXC !== 'undefined' && chkMostrarXC) {
            let ptsXC_hora = 0;
            let lluviaXC = (hourlyEcmwf.precipitation && hourlyEcmwf.precipitation[i] != null) ? Number(hourlyEcmwf.precipitation[i]) : 0;
            let capeXC = (hourlyEcmwf.cape && hourlyEcmwf.cape[i] != null) ? Number(hourlyEcmwf.cape[i]) : 0;

            if (lluviaXC > 0 || capeXC > XCCapeLims.riesgo) {
                ptsXC_hora = 0;
            } else {
                let techoRaw = (hourlyEcmwf.boundary_layer_height && hourlyEcmwf.boundary_layer_height[i] != null) ? Number(hourlyEcmwf.boundary_layer_height[i]) : 0;
                let techoUtil = techoRaw * RATIO_TECHO_UTIL;
                let cin = (hourlyEcmwf.convective_inhibition && hourlyEcmwf.convective_inhibition[i] != null) ? Math.max(0, Number(hourlyEcmwf.convective_inhibition[i])) : 0;

                let ptsTecho = 0;
                if (techoUtil >= XCTechoLims.verde) ptsTecho = 40;
                else if (techoUtil > XCTechoLims.rojo) ptsTecho = 10 + 30 * ((techoUtil - XCTechoLims.rojo) / (XCTechoLims.verde - XCTechoLims.rojo));
                else ptsTecho = 10 * (techoUtil / XCTechoLims.rojo);

                let ptsCape = 0;
                if (capeXC >= XCCapeLims.idealMin && capeXC <= XCCapeLims.idealMax) ptsCape = 40;
                else if (capeXC > XCCapeLims.idealMax && capeXC <= XCCapeLims.riesgo) ptsCape = 40 - 40 * ((capeXC - XCCapeLims.idealMax) / (XCCapeLims.riesgo - XCCapeLims.idealMax));

                let ptsCin = 0;
                if (cin <= XCCinLims.verde) ptsCin = 20;
                else if (cin < XCCinLims.rojo) ptsCin = 20 * (1 - (cin - XCCinLims.verde) / (XCCinLims.rojo - XCCinLims.verde));

                ptsXC_hora = ptsTecho + ptsCape + ptsCin;
            }
            puntosAcumuladosXC += ptsXC_hora;
            horasValidasXC++;
        }
    });

    let notaCondiciones = null;
    if (horasValidas > 0) {
        notaCondiciones = (puntosAcumulados / (horasValidas * 100)) * 10;
    }

    let notaXC = null;
    if (horasValidasXC > 0) {
        notaXC = (puntosAcumuladosXC / (horasValidasXC * 100)) * 10;
    }

    return { notaCondiciones, notaXC, horasValidas, horasValidasXC };
}

// 🟡 Más funciones

function createOrientationSVG(orientacionesStr) {
    
    // 1. SI YA ESTÁ EN CACHÉ, LO DEVOLVEMOS AL INSTANTE
    if (cacheSVG_Tabla[orientacionesStr]) return cacheSVG_Tabla[orientacionesStr];

    const ALL_SEGMENTS = [
        'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'
    ];
    
    // 2. Colores y dimensiones
    const size = 23; 
    const radius = 8; 
    const strokeWidth = 1; 
    const colorBorde = "#666"; 
    const colorFondoInactivo = "white"; 
    const colorSegmentoActivo = "#5b5b5b"; 

    const activeOrientations = new Set(
        (orientacionesStr || '').split(',').map(s => s.trim())
    );

    let svg = `<svg width="${size}" height="${size}" viewBox="-10 -10 20 20" style="vertical-align: middle; display:inline-block; transform: rotate(-90deg);">`;
    
    svg += `<circle cx="0" cy="0" r="${radius}" fill="${colorFondoInactivo}" stroke="${colorBorde}" stroke-width="${strokeWidth}" />`;

    const AXIS_ANGLE = 360 / ALL_SEGMENTS.length; 
    const SEGMENT_WIDTH = 45; 
    const HALF_SEGMENT = SEGMENT_WIDTH / 2; 
    const toRadians = (angle) => angle * Math.PI / 180;

    ALL_SEGMENTS.forEach((segmentName, index) => {
        if (activeOrientations.has(segmentName)) {
            const centerAngle = index * AXIS_ANGLE;
            const startAngle = centerAngle - HALF_SEGMENT; 
            const endAngle = centerAngle + HALF_SEGMENT; 
            
            const x1 = radius * Math.cos(toRadians(startAngle));
            const y1 = radius * Math.sin(toRadians(startAngle));
            const x2 = radius * Math.cos(toRadians(endAngle));
            const y2 = radius * Math.sin(toRadians(endAngle));
            
            svg += `<polygon points="0,0 ${x1},${y1} ${x2},${y2}" fill="${colorSegmentoActivo}" />`;
        }
    });

    svg += `</svg>`;

    // 3. ANTES DE SALIR, LO GUARDAMOS EN LA CACHÉ PARA LA PRÓXIMA VEZ
    cacheSVG_Tabla[orientacionesStr] = svg;

    return svg;
}

// Convierte grados de dirección del viento (0-360) a su representación en texto (N, NNE, NE...)
function obtenerTextoOrientacion(grados) {
    if (grados === null || grados === undefined) return '';
    const direcciones = Object.keys(METADATA_TO_ICON_MAP);
    const index = Math.round((((grados % 360) + 360) % 360) / 22.5) % 16;
    return direcciones[index] || '';
}

// FILTRO DISTANCIA. Fórmula de Haversine
function obtenerDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}

function setModoEnfoque(activarBlur) {
    // Array con TODOS los elementos de fondo que queremos desenfocar
    const selectores = [
        ".contenedor-principal-tabla",
        ".div-filtro-horario",
        ".div-filtro-distancia"    
    ];

    selectores.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
            // Solo aplicamos o quitamos la clase visual.
            // Si el filtro estaba cerrado (max-height:0), se desenfoca pero no se ve, 
            // si estaba abierto, se ve desenfocado. Perfecto.
            if (activarBlur) {
                el.classList.add("elemento-desenfocado");
            } else {
                el.classList.remove("elemento-desenfocado");
            }
        }
    });
}

// APP
async function exportarFavoritos(contenidoTexto) {
    try {
        // Esto abrirá el selector de archivos en Android (SAF)
        const result = await Filesystem.writeFile({
            path: 'mis_favoritos_meteo.txt',
            data: contenidoTexto,
            directory: 'DOCUMENTS', // 'DOCUMENTS' usa el sistema de archivos estándar
            encoding: 'utf8',
        });
        
        console.log('Archivo guardado en:', result.uri);
        alert("¡Favoritos exportados a la carpeta Documentos!");
    } catch (e) {
        console.error('Error al guardar el archivo:', e);
        alert("No se pudo guardar el archivo. Revisa los permisos.");
    }
}

async function exportarConfiguracion() {
    const perfilUsuario = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Cogemos las de la app Y la del idioma
        if (key && (key.startsWith("METEO_") || key === "i18nextLng")) {
            perfilUsuario[key] = localStorage.getItem(key);
        }
    }

    // 2. Convertimos el objeto a un texto con formato (fácil de leer)
    const contenido = JSON.stringify(perfilUsuario, null, 2);
    
    // 3. Generamos el nombre del archivo
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    let nombreArchivo = `${fecha}_Fly_Decision_Configuration.json`;

    // 4. Lógica de guardado (Idéntica a la que usas en favoritos)
    const isApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

    if (isApp) {
        try {
            const { Filesystem, Dialog, Share } = Capacitor.Plugins; 

            // 1. Cuadro de diálogo previo para confirmación de exportación
            // const confirmResult = await Dialog.confirm({
            //     title: t('ajustes.exportar.tituloDialog'),
            //     message: t('ajustes.exportar.mensajeDialog'),
            //     okButtonTitle: t('ajustes.exportar.guardar'),
            //     cancelButtonTitle: t('ajustes.exportar.cancelar')
            // });

            // Si la usuaria cancela, detenemos el proceso aquí
            // if (!confirmResult.value) return;

            // 2. Guardamos la copia temporal en la Caché en segundo plano
            const resultCache = await Filesystem.writeFile({
                path: nombreArchivo, 
                data: contenido,
                directory: 'CACHE', 
                encoding: 'utf8',
                recursive: true
            });

            // 3. Abrimos DIRECTAMENTE el menú de compartir/guardar de Android 
            const canShare = await Share.canShare();
            if (canShare.value) {
                try {
                    await Share.share({
                        title: t('ajustes.exportar.tituloShare'),
                        text: t('ajustes.exportar.textoShare'),
                        files: [resultCache.uri], 
                        dialogTitle: t('ajustes.exportar.dialogTitle'),
                    });
                } catch (shareError) {
                    //alert("Cancelled / Cancelado.");
                }
            } else {
                alert("Your device does not support sharing files directly. / Tu dispositivo no permite compartir archivos directamente.");
            }

        } catch (error) {
            alert("Error saving on Android / Error al guardar en Android: " + error.message);
        }
    } else {
        // Modo Web PC
        const blob = new Blob([contenido], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo; 
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    }
}

function importarConfiguracion() {
    window.accionCargarPerfil = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json'; 
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const perfilImportado = JSON.parse(e.target.result);

                    // Borramos todo lo actual para que la importación sea limpia
                    localStorage.clear(); 
                    
                    let keysImportadas = 0;
                    for (const key in perfilImportado) {
                        if (key.startsWith("METEO_") || key === "i18nextLng") {
                            localStorage.setItem(key, perfilImportado[key]);
                            
                            if (key.startsWith("METEO_")) {
                                keysImportadas++;
                            }
                        }
                    }

                    // -------------------------------------------------------------
                    // 🚀 SILENT UPGRADE: Compatibilidad con perfiles antiguos
                    // Si el perfil importado NO tenía la nueva configuración de Modo,
                    // asumimos que es un usuario antiguo (Avanzado) y la parcheamos.
                    // -------------------------------------------------------------
                    if (keysImportadas > 0) {
                        if (!localStorage.getItem("METEO_MODO_ELEGIDO")) {
                            localStorage.setItem("METEO_MODO_ELEGIDO", "true");
                            localStorage.setItem("METEO_MODO_SIMPLE", "false"); // Por defecto, Avanzado
                        }

                        if (typeof mensajeAvisoRecarga === 'function') {
                            mensajeAvisoRecarga(``, `<div style="text-align: center;">
                            <p>${t('ajustes.importadoConfigOk')}</p>
                        </div>`);
                        } else {
                            alert(t('ajustes.importadoConfigOk'));
                            location.reload();
                        }
                    } else {
                        alert(t('ajustes.errorArchivoConfig'));
                    }
                } catch (error) {
                    alert('⚠️ Error al leer el archivo. Asegúrate de que es el archivo .json correcto.');
                }
                
                delete window.accionCargarPerfil; 
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const favoritosActuales = obtenerFavoritos();

    if (favoritosActuales.length === 0) {
        window.accionCargarPerfil();
    } else {
        mensajeModalAceptarCancelar(
        '', 
        t('ajustes.avisoImportarConfig'), 
        'accionCargarPerfil'
        );
    }
}

function mostrarAvisoActualizacionMeteo(modelos) {
    if (!modelos || modelos.length === 0) return;

    // Unimos los nombres de los modelos con "y" (Ej: "Météo-France" o "Météo-France y ECMWF")
    const textoModelos = modelos.join(' y ');

    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <style>.aviso-meteo-centrado, .aviso-meteo-centrado * { text-align: center !important; }</style>
            <div class="aviso-meteo-centrado">
                <p>${t('actualizacion.avisoNuevoMeteo', { modelos: textoModelos })}</p>
            </div>
        `,
        botones: [
            {
                texto: t('botones.aceptar'),
                onclick: function() {
                    GestorMensajes.ocultar();
                    construir_tabla(true, true); // forzarRecarga: pide datos frescos | silencioso: sin spinner, sin tocar filtros/vista
                }
            }
        ]
    });
}

function avisarActualizacionMinutely15() {
    if (!window.modalMinutely15Abierto) return;

    const idActual = window.modalMinutely15IdActual;
    const nombreActual = window.modalMinutely15NombreActual;

    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `<p style="text-align:center;">${t('minutely15.avisoNuevosDatos', { defaultValue: 'Hay una actualización del modelo Arome 15min' })}</p>`,
        botones: [
            {
                texto: t('minutely15.actualizarAhora', { defaultValue: 'Actualizar' }),
                onclick: () => {
                    DATOS_METEO_MINUTELY15_CACHE = null; // fuerza a pedir el JSON fresco
                    abrirModalMinutely15(idActual, nombreActual); // repinta el mismo modal
                }
            },
            {
                texto: t('botones.cancelar'),
                estilo: 'secundario',
                onclick: () => { window.modalMinutely15Abierto = false; GestorMensajes.ocultar(); }
            }
        ]
    });
}

function traducirCadenaOrientacion(stringOri) {
    if (!stringOri) return "";
    // Separamos por comas, traducimos cada código y volvemos a unir
    // Ejemplo: "O, SO" -> ["O", "SO"] -> ["W", "SW"] -> "W, SW"
    return stringOri.split(',')
        .map(s => s.trim())
        .map(code => t(`orientaciones.${code}`))
        .join(', ');
}

function estiloZona(feature) {
    const p = feature.properties;
    const tipo = (p.type || '').toUpperCase();
    const motivo = (p.reasons || '').toUpperCase();
    const proveedor = (p.provider || '').toUpperCase();

    // Zonas prohibidas (espacio aéreo militar, etc.)
    if (tipo === 'PROHIBITED') 
        return { color: '#cc0000', fillColor: '#cc0000', fillOpacity: 0.3, weight: 2 };

    // Zonas que requieren autorización (aeropuertos, CTR, TMA...)
    if (tipo === 'REQ_AUTHORISATION' || motivo === 'AIR_TRAFFIC') 
        return { color: '#cc0000', fillColor: '#cc0000', fillOpacity: 0.2, weight: 2 };

    // Zonas condicionales (ADIF, infraestructuras, espacios naturales...)
    if (tipo === 'CONDITIONAL') 
        return { color: '#ff8800', fillColor: '#ff8800', fillOpacity: 0.15, weight: 1.5, dashArray: '5,5' };

    // Sin restricción
    if (tipo === 'NO_RESTRICTION') 
        return { color: '#00aa44', fillColor: '#00aa44', fillOpacity: 0.1, weight: 1 };

    return { color: '#888', fillColor: '#888', fillOpacity: 0.1, weight: 1 };
}

function alternarColorearFlechasBalizas() {
    const chk = document.getElementById("chkColorearFlechasBalizas");
    if (chk) {
        chkColorearFlechasBalizas = chk.checked;
        localStorage.setItem("METEO_CHECKBOX_COLOREAR_FLECHAS_BALIZAS", chkColorearFlechasBalizas);
    }
    
    // Sincronizar el estado de habilitación del stepper al instante
    actualizarEstadoSliderVientoBalizas();

    if (typeof map !== 'undefined' && map) {
        Object.values(REDES_BALIZAS).forEach(red => {
            actualizarIconosBalizas(red.id);
            if (map.hasLayer(red.layerGroup)) {
                map.removeLayer(red.layerGroup);
                map.addLayer(red.layerGroup);
            }
        });
    }
}
window.alternarColorearFlechasBalizas = alternarColorearFlechasBalizas;

function alternarOcultarValoresBalizas() {
    const chk = document.getElementById("chkOcultarValoresBalizas");
    if (chk) {
        chkOcultarValoresBalizas = chk.checked;
        localStorage.setItem("METEO_CHECKBOX_OCULTAR_VALORES_BALIZAS", chkOcultarValoresBalizas);
    }
    
    // Llamamos a las variables globales 
    if (typeof window.REDES_BALIZAS !== 'undefined' && typeof window.actualizarIconosBalizas === 'function') {
        Object.values(window.REDES_BALIZAS).forEach(red => {
            window.actualizarIconosBalizas(red.id);
            
            if (typeof map !== 'undefined' && map && map.hasLayer(red.layerGroup)) {
                map.removeLayer(red.layerGroup);
                map.addLayer(red.layerGroup);
            }
        });
    }
}
window.alternarOcultarValoresBalizas = alternarOcultarValoresBalizas;

// Función de cálculo e interpolación del color (Paleta de alta visibilidad)
function obtenerColorFlechaBaliza(viento) {
    // Leemos de forma segura la variable global de Javascript
    if (!chkColorearFlechasBalizas) return '#0078d4'; // Azul clásico si está desactivado
    if (viento === null || viento === undefined || isNaN(viento)) return '#95a5a6'; // Gris si no hay datos
    
    const colores = [
        "#7f0000", // 0 (Carmesí oscuro) - >= 50 km/h
        "#b91c1c", // 1 - 45-50 km/h
        "#dc2626", // 2 - 40-45 km/h
        "#ef4444", // 3 - 35-40 km/h
        "#f97316", // 4 - 30-35 km/h
        "#f59e0b", // 5 - 25-30 km/h
        "#eab308", // 6 (Amarillo oro) - 20-25 km/h
        "#84cc16", // 7 (Verde lima) - 15-20 km/h
        "#22c55e", // 8 (Verde claro) - 10-15 km/h
        "#16a34a", // 9 (Verde medio) - 5-10 km/h
        "#15803d"  // 10 (Verde bosque profundo) - 0-5 km/h
    ];
    
    const v = Math.max(0, Number(viento));
    
    // Usamos el límite de viento rojo configurado por el usuario de forma dinámica
    if (v >= vientoMaxBalizaColor) return colores[0]; 
    
    // Mapeo dinámico inverso: La escala de 10 colores se adapta proporcionalmente al nuevo límite
    const paso = Math.min(10, Math.floor(v / (vientoMaxBalizaColor / 10))); 
    const index = 10 - paso;
    
    return colores[index] || colores[0];
}
window.obtenerColorFlechaBaliza = obtenerColorFlechaBaliza;

// Habilita o deshabilita visual y funcionalmente el slider de viento de balizas según Ajustes
function actualizarEstadoSliderVientoBalizas() {
    const slider = document.getElementById('viento-balizas-slider');
    if (!slider || !slider.noUiSlider) return;

    const tooltip = slider.querySelector('.noUi-tooltip');

    if (!chkColorearFlechasBalizas) {
        slider.setAttribute('disabled', true);
        if (tooltip) tooltip.style.opacity = '0.5';
    } else {
        slider.removeAttribute('disabled');
        if (tooltip) tooltip.style.opacity = '1';
    }
}
window.actualizarEstadoSliderVientoBalizas = actualizarEstadoSliderVientoBalizas;

// ---------------------------------------------------------------
// 🔴 BASE DE DATOS INDEXEDDB (Modo Offline sin límite de 5MB)
// ---------------------------------------------------------------

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FlyDecisionDB", 1); //Versión de la DB. Si el año que viene decides que además de la tabla meteoCache quieres crear otra que se llame mapasOffline, tendrás que cambiar ese 1 por un 2 y gestionar el evento de actualización
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("meteoCache")) {
                db.createObjectStore("meteoCache");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const guardarEnCacheIDB = async (key, data) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("meteoCache", "readwrite");
            const store = tx.objectStore("meteoCache");
            store.put(data, key); // Guarda el objeto directo (super rápido, sin stringify)
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch(e) { 
        console.error("Error guardando en BD offline", e); 
        return false;
    }
};

const leerDeCacheIDB = async (key) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("meteoCache", "readonly");
            const store = tx.objectStore("meteoCache");
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch(e) { 
        console.error("Error leyendo de BD offline", e); 
        return null; 
    }
};

//*********************************************************************
// 🟦🟦🟦🟦🟦 FUNCIÓN PRINCIPAL: CONTRUIR LA TABLA 
//*********************************************************************


async function construir_tabla(forzarRecarga = false, silencioso = false, skipMapaUpdate = false) {

    window.ultimoConstruirTablaSilencioso = silencioso;
	
    // 1. REGISTRO DE CONCURRENCIA: Asignamos un número único a esta llamada
    const miIdLlamada = ++ultimoIdLlamadaTabla;

    // 2. DETECTOR INTELIGENTE: Evaluamos si realmente necesitamos mostrar el spinner.
    // - Si requiere descargar de red (forzarRecarga o caché vacía).
    // - Si mostramos toda la base de datos de 400 despegues (soloFavoritos = false).
    // - Si tienes más de 15 favoritos (ya que renderizar más de 250 filas satura la CPU).
    // - Si el modo calendario de 4 días está activo.
    const totalFavoritos = obtenerFavoritos().length;
    const incluirNoFavsActivo = document.getElementById('btn-incluir-no-favs-distancia')?.classList.contains('activo') === true;
    const esOperacionPesada = forzarRecarga || 
                            (!DATOS_METEO_CACHE) || 
                            (!soloFavoritos) || 
                            (totalFavoritos > 15) || 
                            incluirNoFavsActivo ||
                            (typeof modoVerTodosLosDias !== 'undefined' && modoVerTodosLosDias);

    const probablePrimeraVisita = !localStorage.getItem("METEO_PRIMERA_VISITA_HECHA") &&
                               !localStorage.getItem("METEO_FAVORITOS_LISTA") &&
                               !modoEdicionFavoritos &&
                               !window.despegueTemporalParaTabla &&
                               !sessionStorage.getItem('METEO_ENTRO_POR_MAPA_YA_VISITADO');

    if (!silencioso && esOperacionPesada && !probablePrimeraVisita) {
        // Añadimos la clase visual INMEDIATAMENTE
        const overlay = document.getElementById('msgActualizando...');
        if (overlay) {
            overlay.classList.add('loader-activo');
        }

        // Obligamos al código JS a detenerse por completo durante 120ms.
        // Esto le da tiempo de sobra a la transición de CSS (100ms) a completarse
        // y mostrar el spinner en pantalla antes de que comience el cálculo masivo.
        //await new Promise(resolve => setTimeout(resolve, 120));
    }

    // 3. SEGURIDAD: Si entró otra llamada mientras esperábamos el temporizador, 
    // abortamos esta ejecución silenciosamente para evitar destellos y duplicados en el DOM.
    if (miIdLlamada !== ultimoIdLlamadaTabla) {
        return; 
    }

    // Ponemos la bandera de "Carga en proceso". Si el navegador peta durante esta función, esta bandera se quedará grabada.
    localStorage.setItem('METEO_FLAG_CRASH_DETECTADO', 'true');

	try {

        if (forzarRecarga) {
            //console.log(new Date().toLocaleString(), "♻️ Forzando recarga desde internet (Borrando caché RAM o Localstorage)...");
            DATOS_METEO_CACHE = null; 
            DATOS_METEO_ECMWF_CACHE = null; 
        }
		
		favoritos = obtenerFavoritos();

        // ---------------------------------------------------------------
        // 🔴 LÓGICA INICIAL (Configurar variables antes de pintar)
        // ---------------------------------------------------------------

        // Comprobamos si venimos de un enlace directo con coordenadas
        const paramsArranque = new URLSearchParams(window.location.search);
        const enlaceDirectoMapa = paramsArranque.has('lat') && paramsArranque.has('lon');
        
        // ---------------------------------------------------------------
        // 🔴 DEFINICIÓN DE PANTALLAS DE ASISTENTE (Siempre disponibles en memoria)
        // ---------------------------------------------------------------

        // Asistente de configuración inicial. Paso 0: Idioma
        const mostrarPaso0 = function() {
            
            // Exponemos la función a nivel global para que el HTML inyectado pueda usarla en el onclick
            window.guardarIdiomaInicial = function(idiomaCode) {
                // 1. Le decimos a i18next cuál es el idioma forzando su variable
                localStorage.setItem("i18nextLng", idiomaCode);
                
                // 2. Creamos nuestra propia bandera de control de flujo
                localStorage.setItem("METEO_IDIOMA_ELEGIDO", "true");
                
                GestorMensajes.ocultar();
                
                // 3. Recargamos la página para que i18next aplique el idioma y pase al Paso 1
                window.location.reload();
            };

            const htmlIdiomas = `
                <button class="btn-cerrar-modal" style="float: right; margin-top: -22px; margin-right: -5px;" onclick="localStorage.setItem('METEO_IDIOMA_ELEGIDO', 'true'); GestorMensajes.ocultar(); if(typeof window.mostrarPaso1General === 'function') window.mostrarPaso1General();">&times;</button>
                <p style='font-size: 1.1em; font-weight: bold; text-align:center; margin-bottom: 20px; line-height: 1.4; padding-top: 10px;'>
                    Idioma / Hizkuntza / Llengua / Language / Langue / Sprache
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 6px; align-items: center; margin-bottom: 20px;">
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('es-ES')">
                        <img src="icons/flag_es_ES.webp" alt="Español" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Español</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('eu-ES')">
                        <img src="icons/flag_eu_ES.webp" alt="Euskara" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Euskara</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('ca-ES')">
                        <img src="icons/flag_ca_ES.webp" alt="Català" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Català</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('gl-ES')">
                        <img src="icons/flag_gl_ES.webp" alt="Galego" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Galego</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('en-GB')">
                        <img src="icons/flag_en_GB.webp" alt="English" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">English</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('fr-FR')">
                        <img src="icons/flag_fr_FR.webp" alt="Français" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Français</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('de-DE')">
                        <img src="icons/flag_de_DE.webp" alt="Deutsch" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Deutsch</span>
                    </button>
                    <button class="boton-mensajes" style="width: 100%; max-width: 220px; display: flex; align-items: center; justify-content: flex-start; padding: 10px 20px; margin: 0;" onclick="window.guardarIdiomaInicial('pt-PT')">
                        <img src="icons/flag_pt_PT.webp" alt="Português" style="width: 24px; height: 18px; object-fit: cover; margin-right: 15px; border-radius: 2px;"> 
                        <span style="font-size: 1.1em; font-weight: bold;">Português</span>
                    </button>
                </div>
            `;

            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: htmlIdiomas,
                botones: [] 
            });
        };

        const mostrarAvisoResponsabilidad = function() {
            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: `
                    <div style="text-align: center; padding: 5px;">
                        <div style="font-size: 3rem; margin-bottom: 5px;">⚠️</div>
                        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.3rem;">
                            ${typeof t === 'function' ? t('avisoResponsabilidad.titulo') : 'Aviso'}
                        </h3>
                        <p style="margin-bottom: 12px; line-height: 1.5; font-size: 1.05rem;">
                            ${typeof t === 'function' ? t('avisoResponsabilidad.texto') : 'Los pronósticos y datos pueden contener errores. La decisión de volar es siempre responsabilidad de quien pilota.'}
                        </p>
                    </div>
                `,
                botones: [
                    {
                        texto: typeof t === 'function' ? t('avisoResponsabilidad.btnContinuar', {defaultValue: 'Continuar'}) : 'Continuar',
                        onclick: function() {
                            localStorage.setItem("METEO_AVISO_LEGAL_ACEPTADO", "true");
                            GestorMensajes.ocultar();
                            mostrarPaso1(); 
                        }
                    }
                ],
                anchoBotones: '100%' 
            });
        };

        // Asistente de configuración. Modo simple / avanzado (Reubicado al final del proceso)
        window.mostrarPasoModo = function(ignorarMenuParaFinalizar) {

            window.elegirModoSimple = function(esSimple) {
                // Pasamos 'true' al final para evitar recargar la tabla dos veces
                window.cambiarModoApp(esSimple, true); 
                GestorMensajes.ocultar();
                
                // Retomamos el hilo natural de cierre de edición
                if (typeof finalizarEdicionFavoritos === 'function') {
                    finalizarEdicionFavoritos(ignorarMenuParaFinalizar);
                }
            };

            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: `
                    <div style="text-align: center; padding: 5px 0 15px;">
                        <h3 style="margin-top: 0; margin-bottom: 6px; font-size: 20px;">${t('asistente.pasoModo.titulo')}</h3>
                        <p style="margin: 0; color: var(--color-text-secondary, #666);">${t('asistente.pasoModo.subtitulo')}</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Modo simple -->
                        <button id="pasoModo-btn-simple" style="
                            display: flex; align-items: flex-start; gap: 12px;
                            padding: 14px 18px; border-radius: 12px; border: none;
                            background: #378ADD; color: #fff;
                            cursor: pointer; text-align: left; width: 100%;
                        " onclick="window.elegirModoSimple(true)">
                            <span style="font-size: 22px; line-height: 1; flex-shrink: 0;">🟢</span>
                            <div>
                                <div style="font-size:20px; font-weight:bold;">${t('asistente.pasoModo.btnSimpleTitulo')}</div>
                                <div style="font-size:16px; opacity: 0.9; margin-top: 2px; color: #bababa;">${t('asistente.pasoModo.btnSimpleDesc')}</div>
                            </div>
                        </button>
                        <!-- Modo avanzado -->
                        <button id="pasoModo-btn-avanzado" style="
                            display: flex; align-items: flex-start; gap: 12px;
                            padding: 14px 18px; border-radius: 12px; border: none;
                            background: #378ADD; color: #fff;
                            cursor: pointer; text-align: left; width: 100%;
                        " onclick="window.elegirModoSimple(false)">
                            <span style="font-size: 22px; line-height: 1; flex-shrink: 0;">🟣</span>
                            <div>
                                <div style="font-size:20px; font-weight:bold;">${t('asistente.pasoModo.btnAvanzadoTitulo')}</div>
                                <div style="font-size:16px; opacity: 0.9; margin-top: 2px; color: #bababa;">${t('asistente.pasoModo.btnAvanzadoDesc')}</div>
                            </div>
                        </button>
                    </div>
                `,
                botones: [],
                anchoBotones: '100%'
            });
        };

        // Pantalla de bienvenida
        const mostrarPaso1 = function() {

            // Prevenir duplicados borrando el anterior si existe
            const existingOverlay = document.getElementById('paso1-overlay');
            if (existingOverlay) existingOverlay.remove();

            const tieneFavs = (localStorage.getItem("METEO_FAVORITOS_LISTA") ? JSON.parse(localStorage.getItem("METEO_FAVORITOS_LISTA")) : []).length > 0;
            const haVistoMapa = window.seHaExploradoMapa === true;

            // Overlay de fondo
            const overlay = document.createElement('div');
            overlay.id = 'paso1-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0.3);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                padding: 1rem;
            `;

            overlay.innerHTML = `
                <div style="
                    width: 100%; max-width: 340px;
                    background: var(--color-background-primary, #fff);
                    border-radius: 16px;
                    border: 0.5px solid var(--color-border-tertiary, #e0e0e0);
                    padding: 1.2rem 1.5rem;
                    display: flex; flex-direction: column;
                ">
                    <!-- Cabecera -->
                    <div style="text-align:center; margin-bottom: 1.75rem;">
                        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;"><icon-despegue></icon-despegue></div>
                        <div style="font-size: 35px; font-weight: 500; color: var(--color-text-primary, #111); margin-bottom: 8px;">Fly Decision</div>
                        <div style="font-size: 20px; color: var(--color-text-secondary, #666); line-height: 1.45;">${t('asistente.paso1.subtitulo')}</div><br><br>
                        <div style="font-size: 20px; color: var(--color-text-secondary, #666); line-height: 1.45;">${t('asistente.paso1.subtitulo2')}</div>
                    </div>

                    <!-- Botones principales -->
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 1rem;">

                        <!-- Seleccionar con el mapa -->
                        <button id="paso1-btn-selec-mapa" style="
                            display: flex; align-items: center; gap: 12px;
                            padding: 14px 18px; border-radius: 12px; border: none;
                            background: #378ADD; color: #fff;
                            cursor: pointer; text-align: left; width: 100%;
                        ">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                                <line x1="8" y1="2" x2="8" y2="18"></line>
                                <line x1="16" y1="6" x2="16" y2="22"></line>
                            </svg>
                            <div>
                                <div style="font-size:20px; font-weight:500;">${t('asistente.paso1.btnSelecMapa')}</div>
                            </div>
                        </button>

                        <!-- Seleccionar con la lista -->
                        <button id="paso1-btn-selec-lista" style="
                            display: flex; align-items: center; gap: 12px;
                            padding: 14px 18px; border-radius: 12px; border: none;
                            background: #378ADD; color: #fff;
                            cursor: pointer; text-align: left; width: 100%;
                        ">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <circle cx="3" cy="6" r="0.5" fill="#fff"></circle>
                                <circle cx="3" cy="12" r="0.5" fill="#fff"></circle>
                                <circle cx="3" cy="18" r="0.5" fill="#fff"></circle>
                            </svg>
                            <div>
                                <div style="font-size:20px; font-weight:500;">${t('asistente.paso1.btnSelecLista')}</div>
                            </div>
                        </button>

                        <!-- Explorar mapa (sin configurar) -->
                        <button id="paso1-btn-mapa" style="
                            display: flex; align-items: center; gap: 12px;
                            padding: 12px 18px; border-radius: 12px;
                            border: 0.5px solid var(--color-border-secondary, #ccc);
                            background: var(--color-background-secondary, #f5f5f5);
                            color: var(--color-text-primary, #111);
                            cursor: pointer; text-align: left; width: 100%;
                            margin-top: 4px;
                        ">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; opacity:0.7;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            <div>
                                <div style="font-size:20px; font-weight:500;">${t('asistente.paso1.btnExplorarMapa')}</div>
                                <div style="font-size:16px; font-weight:400; margin-top:2px; opacity: 0.75;">${t('asistente.paso1.btnSubtituloExplorarMapa')}</div>
                            </div>
                        </button>

                    </div>

                    <!-- Separador + botones secundarios -->
                    <div style="padding-top: 1rem; display: flex; flex-direction: row; gap: 8px;">

                        <button id="paso1-btn-importar" style="
                            flex: 1;
                            display: flex; align-items: center; justify-content: flex-start; gap: 8px;
                            padding: 5px 10px; border-radius: 8px;
                            border: none; background: transparent;
                            color: var(--color-text-secondary, #666);
                            font-size: 16px; cursor: pointer; text-align: left;
                        ">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; line-height: 1.2;">
                                ${t('botones.importarConfiguracion')}
                            </span>
                        </button>

                        <button id="paso1-btn-guia" style="
                            flex: 1;
                            display: flex; align-items: center; justify-content: flex-end; gap: 8px;
                            padding: 5px 10px; border-radius: 8px;
                            border: none; background: transparent;
                            color: var(--color-text-secondary, #666);
                            font-size: 16px; cursor: pointer; text-align: left;
                        ">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="8"></line>
                                <polyline points="11 12 12 12 12 16"></polyline>
                            </svg>
                            <span style="white-space: normal; line-height: 1.2; word-break: break-word;">
                                ${t('botones.verGuiaGeneral')}
                            </span>
                        </button>

                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cerrar = () => overlay.remove();

            document.getElementById('paso1-btn-selec-mapa').addEventListener('click', () => {
                cerrar();
                activarEdicionFavoritosConMapa();
            });

            document.getElementById('paso1-btn-selec-lista').addEventListener('click', () => {
                cerrar();
                activarEdicionFavoritos();
            });

            document.getElementById('paso1-btn-mapa').addEventListener('click', () => {
                // 1. Mostrar el spinner AL INSTANTE
                mostrarLoading(0); 

                cerrar();

                window.onboardingMapaActivo = false;
                window.venirDeEdicionActiva = false;
                modoEdicionFavoritos = false;

                sessionStorage.setItem('METEO_ENTRO_POR_MAPA_YA_VISITADO', 'true');

                document.body.classList.remove('modo-edicion-tabla');
                const divMenuExplorar = document.getElementById('div-menu');
                if (divMenuExplorar) divMenuExplorar.classList.remove('mode-editing');
                const divMenu2Explorar = document.getElementById('div-menu2-edicion-favoritos');
                if (divMenu2Explorar) divMenu2Explorar.classList.remove('mode-editing');

                if (!DATOS_METEO_CACHE) {
                    // 🚀 NUEVO: 1. Cambiamos las clases CSS para ir al mapa
                    clicBotonMapa();

                    // 🚀 NUEVO: 2. Damos un respiro de 50ms al navegador para que 
                    // PINTE el mapa vacío y aplique el display:none a la tabla en pantalla.
                    setTimeout(() => {
                        construir_tabla(false, true).then(() => {
                            if (window.marcadoresCSVCargados) {
                                ocultarLoading();
                            }
                        });
                    }, 50); // Este setTimeout es la clave de la fluidez
                    
                } else {
                    clicBotonMapa();
                    ocultarLoading(); 
                }
            });

            document.getElementById('paso1-btn-guia').addEventListener('click', () => {
                if (typeof abrirLinkExterno === 'function') {
                    const lng = localStorage.getItem('i18nextLng') || 'es';
                    abrirLinkExterno("https://flydecision.com/ayuda?lng=" + lng);
                }
            });

            document.getElementById('paso1-btn-importar').addEventListener('click', () => {
                //cerrar();
                importarConfiguracion();
            });
        };

        // EXPOSICIÓN GLOBAL: Así el botón azul "⚙️ Configurar la aplicación" siempre la encontrará
        window.mostrarPaso1General = mostrarPaso1;


        // 🟡 CASO A: Primera visita (Usuaria nueva)
        // (Añadido bypass: Si hay despegue temporal, nos saltamos la bienvenida)
        if (!localStorage.getItem("METEO_PRIMERA_VISITA_HECHA") && 
            !localStorage.getItem("METEO_FAVORITOS_LISTA") && 
            !modoEdicionFavoritos &&
            !window.despegueTemporalParaTabla) { 

            // Si viene por enlace directo, no mostrar asistente ni forzar edición
            if (sessionStorage.getItem('METEO_ENTRO_POR_MAPA_YA_VISITADO')) {
                soloFavoritos = false;
                modoEdicionFavoritos = false;
            } else {
                // Aunque sea enlace directo, le damos la configuración técnica base...
                localStorage.setItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ", "true");
                localStorage.setItem("METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO", "10");
                localStorage.setItem("METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN", "20");
                localStorage.setItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS", "true");
                chkMostrarVientoAlturas = true;
                if (document.getElementById("chkMostrarVientoAlturas")) document.getElementById("chkMostrarVientoAlturas").checked = true; 
                localStorage.setItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA", "false"); // Desactivado por defecto en la primera visita
                chkMostrarCizalladura = false;
                if (document.getElementById("chkMostrarCizalladura")) document.getElementById("chkMostrarCizalladura").checked = false; 
                
                soloFavoritos = false;
                modoEdicionFavoritos = true; 

                document.body.classList.add('modo-edicion-tabla'); 
                const divMenu = document.getElementById('div-menu');
                if (divMenu) divMenu.classList.add('mode-editing');

                const panelHorario = document.querySelector('.div-filtro-horario');
                if (panelHorario) panelHorario.style.display = 'none';
            } 
                
            // NUEVA LÓGICA DE EJECUCIÓN (Solo salta el pop-up si NO vienes de URL directa)
            if (!enlaceDirectoMapa && !sessionStorage.getItem('METEO_ENTRO_POR_MAPA_YA_VISITADO')) {
                if (!localStorage.getItem("METEO_IDIOMA_ELEGIDO")) {
                    mostrarPaso0();
                } else if (!localStorage.getItem("METEO_AVISO_LEGAL_ACEPTADO")) {
                    mostrarAvisoResponsabilidad();
                } else {
                    mostrarPaso1(); // Saltamos al menú principal del onboarding
                }
            }

        // 🟡 CASO B: Estamos en Modo Edición (Activado por botón o flujo anterior)
        } else if (modoEdicionFavoritos) {
            // Sale del if y pinta la tabla ya con soloFavoritos = false que venía de la función activarEdicionFavoritos; 

        // 🟡 CASO C: Usuaria recurrente pero borró todos los favoritos (Fuerza edición)
        // (Añadido bypass: Si hay despegue temporal, le dejamos ver la tabla aunque tenga 0 favoritos)
        } else if (favoritos.length === 0 && !modoEdicionFavoritos && !window.despegueTemporalParaTabla) {

            activarEdicionFavoritos();
            return;

        // 🟡 CASO D: Visita normal recurrente o VISTA PREVIA
        } else { 
            soloFavoritos = true;
            modoEdicionFavoritos = false;
        }

        // ---------------------------------------------------------------
        // 🔴 CARGA DE DATOS CARGA DE DATOS OPTIMIZADA (MEMORIA -> RED -> LOCALSTORAGE) del meteo-datos.json a "despegues" (nombre, coordenadas, orientaciones..) y "respuestas" (la meteo de cada despegue generada por la llamada a la API y código que ejecuta el generador .php)
        // ---------------------------------------------------------------

		const soloHorasDeLuz = localStorage.getItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ") === "true";

		// const response = await fetch(`https://flydecision.com/meteo-datos.json?t=${Date.now()}`, { cache: "no-store" });

		// if (!response.ok) {
		// 	throw new Error(`Error al cargar el archivo JSON: ${response.statusText}`);
		// }

		// const data = await response.json();

        // Estas serán las variables locals que usará el resto de la función
        let data; //// Esta será la variable local que usará el resto de la función
        let dataEcmwf; 

        // 1. ¿Lo tenemos ya en RAM? (Velocidad instantánea)
        if (DATOS_METEO_CACHE && DATOS_METEO_ECMWF_CACHE) {
            data = DATOS_METEO_CACHE;
            dataEcmwf = DATOS_METEO_ECMWF_CACHE;
        } 
        else {
            // 2. Si no está en RAM, intentamos buscarlo fuera
            try {
                // --- NUEVO: Cronómetro para mala conexión usando la variable global ---
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    console.warn(`⏳ Red muy lenta (${TIMEOUT_DESCARGA_DATOS_MS/1000}s). Abortando descarga...`);
                }, TIMEOUT_DESCARGA_DATOS_MS); 

                // Intentamos descargar (Petición de red real)
                const[res1, res2] = await Promise.all([
                    fetch(`https://flydecision.com/meteo-datos.json?t=${Date.now()}`, { cache: "no-store", signal: controller.signal }),
                    fetch(`https://flydecision.com/meteo-datos-ecmwf.json?t=${Date.now()}`, { cache: "no-store", signal: controller.signal })
                ]);

                if (!res1.ok || !res2.ok) {
                    throw new Error(`⚠️ Error al cargar archivos JSON`);
                }

                // Si llegamos aquí, el servidor respondió. Ahora descargamos el "peso" real del JSON.
                // Si la red 2G es muy lenta, el cronómetro (que sigue vivo) cortará esta descarga.
                data = await res1.json();
                dataEcmwf = await res2.json();
                
                // Solo apagamos el cronómetro cuando la descarga completa ha finalizado con éxito
                clearTimeout(timeoutId); 

                // 🛡️ Re-comprobamos aquí: si otra llamada más reciente arrancó mientras esperábamos esta descarga, abortamos — sus datos ya están obsoletos.
                if (miIdLlamada !== ultimoIdLlamadaTabla) return;

                DATOS_METEO_CACHE = data; 
                DATOS_METEO_ECMWF_CACHE = dataEcmwf;
                esModoOffline = false;

                // Guardamos en la Base de Datos del navegador (Sin límite de espacio de 5MB y sin bloquear la pantalla)
                guardarEnCacheIDB('METEO_DATOS_JSON_CACHE', data);
                guardarEnCacheIDB('METEO_DATOS_ECMWF_JSON_CACHE', dataEcmwf);

                // Extraemos los timestamps de los JSON recién bajados y pintamos el panel YA ---
                if(data.timestamp) lastDataGenerationTimestamp = new Date(data.timestamp).getTime();
                if(data.model_run_ref_time) jsonModelInitTimestamp = new Date(data.model_run_ref_time).getTime();
                // (Para ECMWF no guardamos ModelRunTime porque lo leemos del .txt del servidor luego)

                if (typeof refrescoPanelInfoActualizaciones === 'function') refrescoPanelInfoActualizaciones();

            } catch (error) {
                // 3. PLAN DE EMERGENCIA: Falló la red, miramos en IndexedDB
                console.warn("⚠️ Fallo de conexión. Buscando en BD offline (IndexedDB)...");

                const cachedData = await leerDeCacheIDB('METEO_DATOS_JSON_CACHE');
                const cachedDataEcmwf = await leerDeCacheIDB('METEO_DATOS_ECMWF_JSON_CACHE');

                if (cachedData && cachedDataEcmwf) {
                    // 🛡️ Misma comprobación en la ruta offline: si hay una llamada más nueva, no pintamos con datos viejos.
                    if (miIdLlamada !== ultimoIdLlamadaTabla) return;

                    data = cachedData; // En IndexedDB ya viene como objeto JS limpio, no hace falta JSON.parse
                    dataEcmwf = cachedDataEcmwf;
                    DATOS_METEO_CACHE = data; 
                    DATOS_METEO_ECMWF_CACHE = dataEcmwf;
                    esModoOffline = true;
                    
                    // Añadimos una marca para saber que estamos en "modo offline"
                    if(data.timestamp) lastDataGenerationTimestamp = new Date(data.timestamp).getTime();
                    if(data.model_run_ref_time) jsonModelInitTimestamp = new Date(data.model_run_ref_time).getTime();

                    // Pintamos el panel YA indicando que estamos offline ---
                    if (typeof refrescoPanelInfoActualizaciones === 'function') refrescoPanelInfoActualizaciones();
                } else {
                    console.error("❌ No hay conexión ni datos en la BD offline.");
                    ocultarLoading(); // Importante quitar el loading si fallamos
                    throw error; 
                }
            }
        }

        // Guardamos todos los despegues en la variable global para el buscador
		window.bdGlobalDespegues = data.despegues;

        // Si el usuario abrió el mapa súper rápido antes de que terminara la red,
        // cargamos los marcadores ahora que el JSON ya está listo en memoria.
        if (typeof window.cargarMarcadoresCSV === 'function') {
            window.cargarMarcadoresCSV();
        }

        // 🗺️ Guardar datos para puntuación en mapa
        window.respuestasGlobalMapa = data.respuestas;
        window.respuestasEcmwfGlobalMapa = dataEcmwf.respuestas;
		
		totalDespeguesDisponibles = data.despegues.length;
		
		let despegues = data.despegues;
		let respuestas = data.respuestas;
        let respuestasEcmwf = dataEcmwf.respuestas;

        // ---------------------------------------------------------------
        // 🔴 MIGRACIÓN AUTOMÁTICA DE FAVORITOS (De Nombres a ID)
        // ---------------------------------------------------------------
        let favoritosActuales = obtenerFavoritos();
        
        // Si hay favoritos guardados, y comprobamos que no son números puros...
        if (favoritosActuales.length > 0 && isNaN(Number(favoritosActuales[0]))) {
            let nuevosFavs =[];
            favoritosActuales.forEach(nombreViejo => {
                let match = despegues.find(d => d.Despegue === nombreViejo);
                if (match && match.ID) {
                    nuevosFavs.push(Number(match.ID));
                }
            });
            localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify(nuevosFavs));
            favoritosActuales = nuevosFavs;
        } else {
            // Aseguramos que siempre filtramos y devolvemos arrays de Number
            favoritosActuales = favoritosActuales.map(Number).filter(n => !isNaN(n));
        }
        favoritos = favoritosActuales; // Actualizamos la variable global principal

		if (!respuestas || respuestas.length === 0) {
			console.error("El JSON no contiene datos meteorológicos.");
            ocultarLoading(); // Asegura quitar loading
            return;
        }

        // ---------------------------------------------------------------
        // 🔴 LÓGICA DE FILTRADO O NO DE FAVORITOS
        // ---------------------------------------------------------------

        // Primero calculamos si el filtro de distancia está activo para ver si el check de favoritos debe aplicar
        const sliderDistElemParaFavs = document.getElementById('distancia-slider');
        let distanciaLimiteParaFavs = 9999;
        if (sliderDistElemParaFavs && sliderDistElemParaFavs.noUiSlider) {
            const idxDist = Math.round(parseFloat(sliderDistElemParaFavs.noUiSlider.get()));
            distanciaLimiteParaFavs = CORTES_DISTANCIA_GLOBAL[idxDist];
        }
        
        const btnIncNoFavsDistancia = document.getElementById('btn-incluir-no-favs-distancia');
        const incluirNoFavs = btnIncNoFavsDistancia ? btnIncNoFavsDistancia.classList.contains('activo') : false;
        
        // Si estamos en modo edición de favoritos, el checkbox está oculto y NO debe interferir
        const ignorarFiltroFavoritos = (!modoEdicionFavoritos && distanciaLimiteParaFavs < 9999 && incluirNoFavs);

        // Preparamos los IDs a incluir (Favoritos reales + el temporal si venimos del mapa)
        let idsAIncluir = [...favoritos];
        if (window.despegueTemporalParaTabla) {
            if (!idsAIncluir.includes(Number(window.despegueTemporalParaTabla))) {
                idsAIncluir.push(Number(window.despegueTemporalParaTabla));
            }
        }

        // Está activo filtro favoritos Y hay favoritos (o uno temporal) --> filtramos
        // (soloSeguimiento tiene prioridad: si está activo, opera sobre el array completo)
		if (soloFavoritos && !soloSeguimiento && idsAIncluir.length > 0 && !ignorarFiltroFavoritos) {
			
			// 1. Crear un mapa temporal para relacionar el ID con sus respuestas
			const respuestasMap = new Map();
            const respuestasEcmwfMap = new Map();
			data.despegues.forEach((d, index) => { 
				respuestasMap.set(Number(d.ID), data.respuestas[index]); 
                respuestasEcmwfMap.set(Number(d.ID), dataEcmwf.respuestas[index]); 
			});
			
			// 2. Filtrar el array de despegues
			despegues = despegues.filter(d => idsAIncluir.includes(Number(d.ID)));
			
			// 3. Crear el nuevo array de respuestas solo con los datos filtrados
			respuestas = despegues.map(d => respuestasMap.get(Number(d.ID))).filter(r => r !== undefined);
            respuestasEcmwf = despegues.map(d => respuestasEcmwfMap.get(Number(d.ID))).filter(r => r !== undefined);
			
		}
        // Está activo filtro favoritos pero no hay ni favoritos ni despegue temporal
        else if (soloFavoritos && !soloSeguimiento && idsAIncluir.length === 0 && !ignorarFiltroFavoritos) {
            despegues = [];
			respuestas = [];
            respuestasEcmwf = [];
		}

        // ---------------------------------------------------------------
        // 🔴 LÓGICA DE FILTRADO O NO DE DESPEGUES CON SEGUIMIENTO
        // ---------------------------------------------------------------

        if (soloSeguimiento) {
            let idsSeg = obtenerSeguimientos().map(s => Number(s.id));
            
            // Si venimos de pulsar "Ver en tabla", forzamos que este despegue 
            // aparezca en la lista de seguimiento, aunque la usuaria no lo tenga marcado con el ojo.
            if (window.despegueTemporalParaTabla) {
                if (!idsSeg.includes(Number(window.despegueTemporalParaTabla))) {
                    idsSeg.push(Number(window.despegueTemporalParaTabla));
                }
            }

            const rMap = new Map();
            const rEcmwfMap = new Map();
            despegues.forEach((d, i) => {
                rMap.set(Number(d.ID), respuestas[i]);
                rEcmwfMap.set(Number(d.ID), respuestasEcmwf[i]);
            });
            
            // Filtramos comparando con la nueva lista (que ya incluye el despegue forzado si existe)
            if (idsSeg.length > 0) {
                despegues     = despegues.filter(d => idsSeg.includes(Number(d.ID)));
                respuestas    = despegues.map(d => rMap.get(Number(d.ID))).filter(r => r !== undefined);
                respuestasEcmwf = despegues.map(d => rEcmwfMap.get(Number(d.ID))).filter(r => r !== undefined);
            } else {
                despegues = []; respuestas = []; respuestasEcmwf = [];
            }
        }

		// ---------------------------------------------------------------
		// 🔴 LECTURA DEL SLIDER RANGO HORARIO (necesario para la construcción de la tabla)
		// ---------------------------------------------------------------
		
		// Primero lo creamos o recreamos con los datos base de la construcción de la tabla mediante una función en que hemos encapsulado su creacción (que depende de esos datos, no como los otros sliders de filtros, que son más estáticos).
		gestionarSliderHoras(respuestas, soloHorasDeLuz);
		
		const sliderHoras = document.getElementById('horario-slider');

		// Declaramos las variables FUERA
        let indiceInicioRangoHorario = 0;
        let indiceFinRangoHorario = 99999;

        // 🆕 Lógica condicionada por el botón Calendario
        if (modoVerTodosLosDias) {
            // Si el botón está hundido, mostramos TODO el rango disponible (0 a 999)
            indiceInicioRangoHorario = 0;
            indiceFinRangoHorario = 99999;
        } else {
            // Lógica normal: leer del slider
            if (sliderHoras && sliderHoras.noUiSlider && window.indicesHorasRangoHorario.length > 0) {
                const vals = sliderHoras.noUiSlider.get().map(v => Math.round(Number(v)));
                indiceInicioRangoHorario = window.indicesDiaActualSlider[vals[0]];
                indiceFinRangoHorario    = window.indicesDiaActualSlider[vals[1]];
            }
        }

        // ---------------------------------------------------------------
        // 🔴 CONSTRUCCIÓN DE LA TABLA
        // ---------------------------------------------------------------

		const tabla = document.getElementById("tabla");

        // NO borramos la tabla todavía. Dejamos que el usuario vea la antigua mientras carga.
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        const tbodyFragmento = document.createDocumentFragment();

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Favorito
        // ---------------------------------------------------------------

		const thFavorito = document.createElement("th");
		thFavorito.innerHTML = '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
		thFavorito.id = "id-thFavorito";
		thFavorito.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thFavorito.style.fontSize = "18px";
		thFavorito.classList.add("columna-favoritos", "borde-grueso-abajo", "borde-grueso-arriba", "borde-grueso-izquierda");

		if (modoEdicionFavoritos) { // Si se está editando favoritos, que aparezca la mano
			thFavorito.style.cursor = "pointer";
			thFavorito.title = t('favoritos.marcardesmarcarCabecera');
		} else {
			thFavorito.style.userSelect = "none";
			thFavorito.style.cursor = "default";
			thFavorito.title = "";
		}

		thFavorito.onclick = function() { gestionarClickMasivoFavoritos(); };

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA Cabecera. País
        // ---------------------------------------------------------------

        const thPais = document.createElement("th");
        thPais.textContent = t("tabla.cabeceraPais") || "País";
        thPais.rowSpan = 2;
        thPais.style.fontSize = "18px";
        thPais.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda", "borde-grueso-arriba");
        thPais.style.width = "70px";
        thPais.style.minWidth = "70px";
        thPais.style.maxWidth = "70px";

        // ---------------------------------------------------------------		
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Región
        // ---------------------------------------------------------------

 		const thRegion = document.createElement("th");
		thRegion.textContent = t("tabla.cabeceraRegion");
		thRegion.rowSpan = 2;
		thRegion.style.fontSize = "18px";
		thRegion.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda", "borde-grueso-arriba");
		thRegion.style.minWidth = "90px";
		
        // ---------------------------------------------------------------		
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Provincia
        // ---------------------------------------------------------------

 		const thProvincia = document.createElement("th");
		thProvincia.textContent = t("tabla.cabeceraProvincia");
		thProvincia.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thProvincia.style.fontSize = "18px";
		thProvincia.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda", "borde-grueso-arriba");
		thProvincia.style.minWidth = "90px";

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Despegue
        // ---------------------------------------------------------------

		const thDespegue = document.createElement("th");
        thDespegue.rowSpan = 2;
        thDespegue.style.fontSize = "18px";
        thDespegue.classList.add("borde-grueso-izquierda", "columna-despegue", "borde-grueso-abajo", "borde-grueso-arriba");

        if (modoEdicionFavoritos) {
            thDespegue.textContent = t("tabla.cabeceraDespegue");
            thDespegue.classList.add("borde-grueso-derecha");
        } else {
            // En vista normal, creamos dos líneas: Título + Mini Contador
            thDespegue.innerHTML = `
                <div style="line-height: 1.1;">${t("tabla.cabeceraDespegue")}</div>
                <div id="header-contador-mini" title="Número de despegues favoritos (♥️) mostrados en la tabla"></div>
            `;
        }

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Meteo
        // ---------------------------------------------------------------

		const thMeteo = document.createElement("th");
		thMeteo.innerHTML = '<span style="font-size:25px;" title="Meteorología">🌦️</span>';
		thMeteo.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thMeteo.classList.add("columna-meteo", "borde-grueso-abajo", "borde-grueso-arriba", "borde-grueso-izquierda");	

        const tooltipContentMeteo = t('tabla.tooltips.tooltipMeteoCompleto');
        thMeteo.setAttribute("data-tippy-content", tooltipContentMeteo);
        thMeteo.setAttribute("tabindex", "0"); 
        thMeteo.style.cursor = "help";

		// Añadir verificación antes de acceder a respuestas[0]
		let horas = [];
		let indicesInicioDia = []; // Necesitamos la posición de inicio de día para usarla en los TD de datos. ARRAY PARA GUARDAR ÍNDICES

		if (respuestas && respuestas.length > 0 && respuestas[0].hourly && respuestas[0].hourly.time) {
			const horasApi = respuestas[0].hourly.time;
			const indiceInicio = 0; // Siempre empezamos desde la primera hora que tenga el .json
			horas = horasApi.slice(indiceInicio); // Esto mostrará TODAS las horas que tenga el .json
		}

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Fila de días de la semana (Lunes, Martes,..)
        // ---------------------------------------------------------------
		
		let diaAnterior = null;
		let diaSemanaAnterior = null; // Necesario inicializar para el cierre
        let diaSemanaAnteriorCorto = null; // Para el nombre corto de 3 letras
		let colspan = 0;
		const trDias = document.createElement("tr");

		if (modoEdicionFavoritos) {
			trDias.appendChild(thFavorito);
            trDias.appendChild(thPais);
			trDias.appendChild(thRegion);
			trDias.appendChild(thProvincia);
			trDias.appendChild(thDespegue);
			//trDias.appendChild(thMeteo);
		} else {
			trDias.appendChild(thDespegue);
			trDias.appendChild(thMeteo);
		}

        // Traducción. Mapeamos el índice del día a las claves de tu JSON
        const clavesDiasLargos = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const clavesDiasCortos = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
        const diasSemana = clavesDiasLargos.map(clave => t(`dias.${clave}`));

		// Solo iterar sobre las horas si existen
		if (horas.length > 0 && !modoEdicionFavoritos) {
			horas.forEach((h, i) => {
				
				/* 🕜 Filtro del slider de rango horario */
				if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) {
					// Si la hora está fuera del rango seleccionado en el slider, la saltamos.
					// Ojo: Para mantener la lógica de "cierre de día" correcta, si saltamos
					// una hora que era cambio de día, hay que tener cuidado.
					// Pero como 'diaAnterior' se actualiza solo cuando procesamos columna,
					// simplemente saltar 'return' funciona bien visualmente.
					
					// Ajuste sutil: Si saltamos horas, debemos asegurarnos de no dejar un "día abierto" erróneo.
					// Pero dado que 'colspan' solo suma si pasamos por aquí, está bien.
					return;
				}

				const d = new Date(h.endsWith('Z') ? h : h + 'Z');
				const dia = d.getDate();
				const diaSemana = t(`dias.${clavesDiasLargos[d.getDay()]}`);
                const diaSemanaCorto = t(`dias.${clavesDiasCortos[d.getDay()]}`);
				
				// Comprobación de visibilidad
				const esNoche = esCeldaNoche(d);
				
				// Si el filtro "Solo día" está activo Y es una hora de noche, saltamos la iteración, pero...
				if (soloHorasDeLuz && esNoche) {
					
					// Si además, al saltar esta hora, estamos en un cambio de día, debemos cerrar el <th> del día anterior
					if (dia !== diaAnterior && diaAnterior !== null) {
						const thDia = document.createElement("th");
						
						// --- Lógica de cierre por salto de día ---
						let textoDia = `${diaSemanaAnterior} ${diaAnterior}`;
						if (colspan <= 3) {
							textoDia = ''; // Omitir el nombre del día si tiene 3 o menos columnas
						} else if (colspan <= 5) {
                            textoDia = `${diaSemanaAnteriorCorto} ${diaAnterior}`; // Nombre corto (3 letras)
                        } else {
                            textoDia = `${diaSemanaAnterior} ${diaAnterior}`; // Nombre largo
                        }
						thDia.textContent = textoDia;
						// -----------------------------------------------------------
						
						thDia.colSpan = colspan;
						thDia.style.fontWeight = "bold";
						thDia.style.fontSize = "18px";
						thDia.style.minWidth = "auto";
						thDia.style.overflow = "hidden";
						thDia.style.whiteSpace = "nowrap";
						thDia.style.textOverflow = "ellipsis"; // Si no cabe pone …
						thDia.classList.add("borde-grueso-arriba", "borde-grueso-izquierda")
						trDias.appendChild(thDia);
						// Reiniciar colspan a 0, ya que las primeras horas de este nuevo día están ocultas
						colspan = 0;
					}
					// Aseguramos que las variables de día se actualizan para la siguiente hora visible
					if (dia !== diaAnterior) {
						diaAnterior = dia;
						diaSemanaAnterior = diaSemana;
                        diaSemanaAnteriorCorto = diaSemanaCorto;
					}
					return; // NO contamos esta columna (no incrementa colspan)
				}

				// Lógica normal de conteo
				if (dia !== diaAnterior) {
					if (diaAnterior !== null) {
						const thDia = document.createElement("th");
						
						// --- Lógica de cambio de día normal ---
						let textoDia = `${diaSemanaAnterior} ${diaAnterior}`;
						if (colspan <= 3) {
							textoDia = ''; // Omitir el nombre del día si tiene 3 o menos columnas
						} else if (colspan <= 5) {
                            textoDia = `${diaSemanaAnteriorCorto} ${diaAnterior}`; // Nombre corto (3 letras)
                        } else {
                            textoDia = `${diaSemanaAnterior} ${diaAnterior}`; // Nombre largo
                        }
						thDia.textContent = textoDia;
						// -------------------------------------------------------
						
						thDia.colSpan = colspan;
						/* Estilos inline para asegurar legibilidad en el header */
						thDia.style.fontWeight = "bold";
						thDia.style.fontSize = "18px";
						thDia.style.minWidth = "auto";
						thDia.style.overflow = "hidden";
						thDia.style.whiteSpace = "nowrap";
						thDia.style.textOverflow = "ellipsis"; // Si no cabe pone …
						thDia.classList.add("borde-grueso-arriba", "borde-grueso-izquierda")
						trDias.appendChild(thDia);
					}
					diaAnterior = dia;
					diaSemanaAnterior = diaSemana;
                    diaSemanaAnteriorCorto = diaSemanaCorto;
					colspan = 1; // Primer día visible
				} else {
					colspan++; // Día visible en curso
				}
				
			});
			
			// Cierre de la cabecera del último día, fuera del bucle
			// para garantizar que se ejecute incluso si las últimas horas fueron saltadas (esNoche).
			if (diaAnterior !== null && colspan > 0) {
				const thDia = document.createElement("th");
				
				// --- CAMBIO SOLICITADO: Lógica de cierre del último día ---
				let textoDia = `${diaSemanaAnterior} ${diaAnterior}`;
				if (colspan <= 3) {
					textoDia = ''; // Omitir el nombre del día si tiene 3 o menos columnas
						} else if (colspan <= 5) {
                            textoDia = `${diaSemanaAnteriorCorto} ${diaAnterior}`; // Nombre corto (3 letras)
                        } else {
                            textoDia = `${diaSemanaAnterior} ${diaAnterior}`; // Nombre largo
                        }
				// Usamos las variables que se quedaron con el último día visible contado
				thDia.textContent = textoDia;
				// -------------------------------------------------------
				
				thDia.colSpan = colspan;
				thDia.style.fontWeight = "bold";
				thDia.style.fontSize = "18px";
				thDia.style.minWidth = "auto";
				thDia.style.overflow = "hidden";
				thDia.style.whiteSpace = "nowrap";
				thDia.style.textOverflow = "ellipsis"; // Si no cabe pone …
				thDia.classList.add("borde-grueso-arriba", "borde-grueso-izquierda")
				trDias.appendChild(thDia);
			}
		}
		
        // ---------------------------------------------------------------
		// 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Condiciones
        // ---------------------------------------------------------------

		const thCondiciones = document.createElement("th");
		thCondiciones.textContent = "⭐";
		thCondiciones.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thCondiciones.style.fontSize = "18px";
		thCondiciones.classList.add("columna-condiciones", "borde-grueso-izquierda", "borde-grueso-arriba", "borde-grueso-abajo");	
		thCondiciones.style.userSelect = "none";
        const tooltipContent = t('tabla.tooltips.tooltipCondiciones');        
        thCondiciones.setAttribute("data-tippy-content", tooltipContent);
        thCondiciones.setAttribute("tabindex", "0"); 
        thCondiciones.style.cursor = "help"; // Cambia el cursor para indicar que hay info

		// Un elemento <th> no puede ser un hijo directo de <thead>. Debe ser un hijo de un <tr> (fila). Dado que thCondiciones tiene rowSpan = 2, debe colocarse al final de la primera fila (trDias) para que ocupe el espacio de esa fila y de la siguiente (trHoras), empujando los elementos posteriores. El bloque de código de thCondiciones está en esta posición para que se añada a trDias después de que se hayan construido todos los <th> de los días.
		
		if (!modoEdicionFavoritos) {
			trDias.appendChild(thCondiciones);
		}
				
		// Añado toda la primera fila completa
		thead.appendChild(trDias);

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Fila de horas
        // ---------------------------------------------------------------

		let lastDayDate = null; 
		let newDayStarted = false; // Bandera para saber si se produjo un cambio de día

		const trHoras = document.createElement("tr");
		trHoras.classList.add("fila-separador");

		// Solo iterar sobre las horas si existen
		if (horas.length > 0 && !modoEdicionFavoritos) {
			horas.forEach((h, i) => {
				
				/* 🕜 Filtro del slider de rango horario */
				if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

				const d = new Date(h.endsWith('Z') ? h : h + 'Z');

				const th = document.createElement("th");
				const hora = d.getHours();  
				const dia = d.getDate();

				// 1. Detección de cambio de día (se activa newDayStarted)
				if (dia !== lastDayDate) {
					lastDayDate = dia;
					newDayStarted = true; // Se inicia un nuevo día, ahora esperamos la primera hora visible.
				}

				th.textContent = hora;	

				const esNoche = esCeldaNoche(d); // Reutilizamos la función de chequeo de noche

				// 2. Marcar celdas de noche (para ocultar por CSS o poner fondo gris si es la segunda fila)
				if(esNoche){
					th.classList.add("celda-noche");
				}
				
				
				// 3. Aplicar el BORDE y REGISTRAR el ÍNDICE
				// Si se ha detectado un cambio de día (newDayStarted es true)
				// Y (el filtro NO está activo O la hora actual NO es de noche)
				if (newDayStarted && (!soloHorasDeLuz || !esNoche)) {
					th.classList.add("borde-grueso-izquierda");
					indicesInicioDia.push(i); // Registramos el índice de la primera hora VISIBLE
					newDayStarted = false; // Bandera de inicio de día reseteada
				} 

				trHoras.appendChild(th);
			});
		}

		thead.appendChild(trHoras);
		
        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Bucle principal despegues.forEach que recorre cada despegue para mostrar o no sus X líneas (la primera celda unida con provincia+despegue+orientacion+opcionales
        // ---------------------------------------------------------------

        // -----------------------------------------------------------
        // 📍📍📍 ️LÓGICA DE FILTRADO DE CONSTRUCCIÓN DE FILAS POR DESPEGUE POR DISTANCIA
        // -----------------------------------------------------------
        const sliderDistElem = document.getElementById('distancia-slider');
        let indiceSeleccionado = CORTES_DISTANCIA_GLOBAL.length - 1;
        let distanciaLimite = 9999;
        
        if (sliderDistElem && sliderDistElem.noUiSlider) {
            indiceSeleccionado = Math.round(parseFloat(sliderDistElem.noUiSlider.get()));
            distanciaLimite = CORTES_DISTANCIA_GLOBAL[indiceSeleccionado];
        }
		
		// Creamos el array vacío ANTES de empezar a recorrer los despegues
        let listaFilasParaOrdenar = [];

        // ⚡ OPTIMIZACIÓN: Pre-cálculo de fechas, noches y horas a evaluar
        const cacheEsNoche = [];
        const cacheFechas = [];
        const indicesEvaluacionTabla = []; // Contendrá solo los índices válidos a evaluar

        if (horas && horas.length > 0) {
            horas.forEach((h, i) => {
                const d = new Date(h.endsWith('Z') ? h : h + 'Z');
                cacheFechas.push(d);
                const noche = esCeldaNoche(d);
                cacheEsNoche.push(noche);
                
                // Si entra en el rango horario y no es noche (o el filtro de noche está apagado)
                if (i >= indiceInicioRangoHorario && i <= indiceFinRangoHorario) {
                    if (!soloHorasDeLuz || !noche) {
                        indicesEvaluacionTabla.push(i);
                    }
                }
            });
        }

        const setInicioDia = new Set(indicesInicioDia);

        // Creamos un bucle que va EXACTAMENTE desde el inicio del slider hasta el fin del slider. Le añadimos Math.min() como medida de seguridad por si el JSON tiene menos horas de las esperadas.
        const limiteFin = Math.min(indiceFinRangoHorario, horas.length - 1);

        const coloresNota = [
            "#fb796e", // 0  — Rojo (ancla)
            "#f9876d", // 1
            "#f7966c", // 2
            "#f4a46c", // 3
            "#f2b36b", // 4
            "#f0c16a", // 5  — Naranja (ancla)
            "#d5ca78", // 6
            "#bbd386", // 7
            "#a0dd93", // 8
            "#86e6a1", // 9
            "#6befaf"  // 10 — Verde (ancla)
        ];

        // ⚡ Pre-cálculo: traducciones estáticas (no dependen del despegue ni de la hora)
        const labelViento180 = t('tabla.viento_altura', { metros: 180 });
        const labelViento120 = t('tabla.viento_altura', { metros: 120 });
        const labelViento80  = t('tabla.viento_altura', { metros: 80 });
        const tituloViento180 = t('tabla.tooltips.viento180m');
        const tituloViento120 = t('tabla.tooltips.viento120m');
        const tituloViento80  = t('tabla.tooltips.viento80m');
        const labelViento10  = t('tabla.viento_altura', { metros: 10 });
        const tituloViento10 = t('tabla.tooltips.viento10m');
        const tituloRacha10 = t('tabla.tooltips.racha10m');
        const tituloDireccion10 = t('tabla.tooltips.direccion10m');
        const tituloCizalladura = t('tabla.tooltips.cizalladura');
        const labelTecho = t('tabla.labels.techo');
        const labelCape  = t('tabla.labels.cape');
        const labelCin   = t('tabla.labels.cin');
        const tituloTecho = t('tabla.tooltips.techo');
        const tituloCape  = t('tabla.tooltips.cape');
        const tituloCin   = t('tabla.tooltips.cin');
        const tituloMeteoGeneral = t('tabla.tooltips.meteoGeneral');
        const tituloPrecipitacion = t('tabla.tooltips.precipitacion');
        const tituloProbPrecipitacion = t('tabla.tooltips.probPrecipitacion');
        const tituloBaseNube = t('tabla.tooltips.baseNube');
        const tituloTemperatura = t('tabla.tooltips.temperatura');
        const tituloEcmwf3000 = t('tabla.tooltips.3000mECMWF');
        const tituloEcmwfDir3000 = t('tabla.tooltips.Direccion3000mECMWF');
        const tituloEcmwf1500 = t('tabla.tooltips.1500mECMWF');
        const tituloEcmwfDir1500 = t('tabla.tooltips.Direccion1500mECMWF');
        const tituloEcmwf1000 = t('tabla.tooltips.1000mECMWF');
        const tituloEcmwfDir1000 = t('tabla.tooltips.Direccion1000mECMWF');
        const tituloEcmwf500 = t('tabla.tooltips.500mECMWF');
        const tituloEcmwfDir500 = t('tabla.tooltips.Direccion500mECMWF');
        const tituloEcmwf200 = t('tabla.tooltips.AGL200mECMWF');
        const tituloEcmwfDir200 = t('tabla.tooltips.DireccionAGL200mECMWF');
        const tituloEcmwf100 = t('tabla.tooltips.AGL100mECMWF');
        const tituloEcmwfDir100 = t('tabla.tooltips.DireccionAGL100mECMWF');
        const tituloEcmwf10 = t('tabla.tooltips.AGL10mECMWF');
        const tituloEcmwfDir10 = t('tabla.tooltips.DireccionAGL10mECMWF');
        const tituloEcmwfRacha10 = t('tabla.tooltips.RachaAGL10mECMWF');
        const tituloEcmwfValt = t('tabla.tooltips.VelocidadAltitudRealECMWF');
        const tituloEcmwfDalt = t('tabla.tooltips.DireccionAltitudRealECMWF');
        const tituloCizalladuraBaja = t('tabla.cizalladura.baja');
        const tituloCizalladuraMotivoBajo = t('tabla.cizalladura.motivoBajo');
        const tituloCizalladuraAlta = t('tabla.cizalladura.alta');
        const tituloCizalladuraMedia = t('tabla.cizalladura.media');

        // ⚡ Plantilla SVG de flecha de viento: se crea UNA vez y se clona por cada celda,
        // evitando que el navegador parsee la cadena <svg>...</svg> como HTML miles de veces.
        const SVGNS = "http://www.w3.org/2000/svg";
        const plantillaFlechaViento = document.createElementNS(SVGNS, "svg");
        plantillaFlechaViento.setAttribute("class", "flecha-viento");
        plantillaFlechaViento.setAttribute("viewBox", "0 0 30 36");
        const polygonFlechaViento = document.createElementNS(SVGNS, "polygon");
        polygonFlechaViento.setAttribute("points", "15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20");
        polygonFlechaViento.setAttribute("fill", "black");
        plantillaFlechaViento.appendChild(polygonFlechaViento);

        // Helper: clona la plantilla y le aplica la rotación correspondiente a la dirección del viento
        const crearFlechaViento = (gradosDireccion) => {
            const nodo = plantillaFlechaViento.cloneNode(true);
            nodo.style.transform = `rotate(${gradosDireccion + 180}deg)`;
            return nodo;
        };

        // 🔃 Bucle principal que recorre cada despegue
        for (let idx = 0; idx < despegues.length; idx++) {
            const d = despegues[idx];

            const hourlyData = respuestas[idx] ? respuestas[idx].hourly : null;
            const hourlyEcmwf = respuestasEcmwf[idx] ? respuestasEcmwf[idx].hourly : null;
            const elevacionModeloECMWF = respuestasEcmwf[idx] ? Number(respuestasEcmwf[idx].elevation || 0) : 0;
            const hayDatosMeteo = hourlyData !== null;
            let orientaciones = d.Orientaciones_Grados.split(",").map(n => parseFloat(n.trim()));

            // -----------------------------------------------------------
            // 🟩🟧🟥 LÓGICA DE FILTRADO POR PUNTUACIÓN (Usando la función unificada)
            // -----------------------------------------------------------
            let notaFinal = 0;
            let horasValidas = 0;
            let notaFinalXC = 0;
            let horasValidasXC = 0;
            
            if (hayDatosMeteo) {
                try {
                    // Llamada mágica a la nueva función
                    const evaluacion = calcularPuntuacionesDespegue(d, hourlyData, hourlyEcmwf, indicesEvaluacionTabla);
                    
                    notaFinal = evaluacion.notaCondiciones !== null ? evaluacion.notaCondiciones : 0;
                    horasValidas = evaluacion.horasValidas;
                    notaFinalXC = evaluacion.notaXC !== null ? evaluacion.notaXC : 0;
                    horasValidasXC = evaluacion.horasValidasXC;

                } catch (error) {
                    console.error(`💥 ERROR CRÍTICO en despegue ${d.Despegue}:`, error);
                    return; 
                }
            }

            // -----------------------------------------------------------
            // 🟩🟧🟥 FIN LÓGICA DE FILTRADO POR Slider condiciones / Puntuación
            // -----------------------------------------------------------

			const idDespegue = Number(d.ID); // Usamos el ID numérico
            const elevacionDespegue = Number(d.elevation || 0); // No usada a 20260329 No es el parámetro "Altitud" que introduzco mediante el .csv, sino el parámetro "elevation" que da la API Open-meteo y que es la altitud promedio de la celda ECMWF de 9 km, ya que he puesto en la URL de la API el parámetro &elevation=nan is specified, downscaling will be disabled and the API uses the average grid-cell height. La clave es que los parámetros que pido al ECMWF no son dependientes de la altitud (comprobado) y no requieren downscaling con el DEM de 90 m predeterminado.
			const latitud = d.Latitud; 
			const longitud = d.Longitud;
			const esFavorito = favoritos.includes(idDespegue);

            // GRUPO 1: Meteo Base + Precipitaciones + Alturas
            const filaNubesTotal = document.createElement("tr");

            let filaPreci, filaProbPreci, filaBaseNube, filaTemperatura;
            if (chkMostrarPrecipitacion) filaPreci = document.createElement("tr");
            if (chkMostrarProbPrecipitacion) filaProbPreci = document.createElement("tr");
            if (chkMostrarBaseNube) filaBaseNube = document.createElement("tr");
            if (chkMostrarTemperatura) filaTemperatura = document.createElement("tr");

            let fila180, fila120, fila80;
            
            if (chkMostrarVientoAlturas) {
                fila180 = document.createElement("tr");
                fila120 = document.createElement("tr");
                fila80  = document.createElement("tr");
            }

			const filaVel = document.createElement("tr");	
			const filaRacha = document.createElement("tr");	
			const filaDir = document.createElement("tr");	

            let filaCizalladura; 
			if (chkMostrarCizalladura) filaCizalladura = document.createElement("tr");

            // GRUPO 2: XC
            let filaTecho, filaCape, filaCin;
            if (chkMostrarXC) {
                filaTecho = document.createElement("tr");
                filaCape = document.createElement("tr");
                filaCin = document.createElement("tr");
            }

            // GRUPO: Viento ECMWF. Evaluamos si debemos crear las filas en el DOM
            const mostrarEcmwfDOM = chkMostrarVientoEcmwf || chkMostrarVientoEcmwfDesplegable;

            let filaEcmwfVel3000, filaEcmwfDir3000, filaEcmwfVel1500, filaEcmwfDir1500, filaEcmwfVel1000, filaEcmwfDir1000, filaEcmwfVel500, filaEcmwfDir500;
            let filaEcmwfValt, filaEcmwfDalt;
            
            if (mostrarEcmwfDOM) {
                filaEcmwfVel3000  = document.createElement("tr");
                filaEcmwfDir3000  = document.createElement("tr");
                filaEcmwfVel1500  = document.createElement("tr");
                filaEcmwfDir1500  = document.createElement("tr");
                filaEcmwfVel1000  = document.createElement("tr");
                filaEcmwfDir1000  = document.createElement("tr");
                filaEcmwfVel500   = document.createElement("tr");
                filaEcmwfDir500   = document.createElement("tr");

                filaEcmwfValt      = document.createElement("tr"); 
                filaEcmwfDalt      = document.createElement("tr"); 

                [
                    filaEcmwfVel3000, filaEcmwfDir3000, filaEcmwfVel1500, filaEcmwfDir1500, 
                    filaEcmwfVel1000, filaEcmwfDir1000, filaEcmwfVel500, filaEcmwfDir500,
                    filaEcmwfValt, filaEcmwfDalt
                ].forEach(f => {
                    f.classList.add("ecmwf-neutral-row");
                    
                    // COMPROBACIÓN DE VISIBILIDAD INICIAL:
                    const estaAmpliando = window.sessionExpandedEcmwfTakeoffs.has(idDespegue);
                    const debeMostrarse = chkMostrarVientoEcmwf || (chkMostrarVientoEcmwfDesplegable && estaAmpliando);
                    
                    if (!debeMostrarse) {
                        f.classList.add('ecmwf-oculto-temp'); // Si no debe mostrarse, se oculta por CSS
                    }
                });
            }

            const rowsGroup1 =[filaNubesTotal, filaPreci, filaProbPreci, filaBaseNube, filaTemperatura, fila180, fila120, fila80, filaVel, filaRacha, filaDir, filaCizalladura].filter(Boolean);
            const rowsEcmwfWind = [
                filaEcmwfVel3000, filaEcmwfDir3000, filaEcmwfVel1500, filaEcmwfDir1500, 
                filaEcmwfVel1000, filaEcmwfDir1000, filaEcmwfVel500, filaEcmwfDir500,
                filaEcmwfValt, filaEcmwfDalt
            ].filter(Boolean);
            const rowsGroup2 = [filaTecho, filaCape, filaCin].filter(Boolean);

            const todasLasFilas = [...rowsGroup1, ...rowsEcmwfWind, ...rowsGroup2];
            const filaPrincipal = todasLasFilas[0];
            const totalFilasRowSpan = todasLasFilas.length;

            // --- CALCULAMOS EL ROWSPAN REAL INICIAL ---
            const estaAmpliando = window.sessionExpandedEcmwfTakeoffs.has(idDespegue);
            const debeMostrarse = chkMostrarVientoEcmwf || (chkMostrarVientoEcmwfDesplegable && estaAmpliando);
            
            let initialRowSpan = totalFilasRowSpan;
            if (mostrarEcmwfDOM && !debeMostrarse) {
                // Si están colapsadas, restamos las 17 filas del total
                initialRowSpan -= rowsEcmwfWind.length; 
            }

            // Guardamos las coordenadas en la fila principal para el filtro rápido
            filaPrincipal.dataset.lat = latitud;
            filaPrincipal.dataset.lon = longitud;

            // Limpieza y Control de la línea separadora inferior
            todasLasFilas.forEach(f => f.classList.remove("fila-separador"));
            
            // Si hay un Grupo 2 activo, ponemos una línea fina sutil entre el Grupo 1 y el Grupo 2
            if (rowsGroup2.length > 0 && rowsGroup1.length > 0) {
                rowsGroup1[rowsGroup1.length - 1].style.borderBottom = "1px solid #999";
            }
            
            // La ultimísima fila VISIBLE del despegue recibe la separación grande principal
            if (todasLasFilas.length > 0) {
                todasLasFilas[0].classList.add("fila-inicio-despegue");

                // --- CALCULAMOS LA ÚLTIMA FILA VISIBLE REAL ---
                let filaFin = todasLasFilas[todasLasFilas.length - 1]; // Por defecto, la última absoluta

                if (rowsGroup2.length === 0 && !debeMostrarse) {
                    // Si el XC está apagado y el viento ECMWF está colapsado, el final real es el Grupo 1
                    filaFin = rowsGroup1[rowsGroup1.length - 1];
                }

                // Le aplicamos el borde negro grueso de 2px a la última fila visible
                filaFin.classList.add("fila-separador", "fila-fin-despegue");
            }

			// Clase para el filtrado
			if (esFavorito) {
				todasLasFilas.forEach(f => f.classList.add("favorito"));
			}

			// Añadimos la clase 'fila-separador' a la última fila (Orientación)
			//filaDir.classList.add("fila-separador");

			// ---------------------------------------------------------------
			// 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Favoritos
			// ---------------------------------------------------------------
				
			if (modoEdicionFavoritos) {
                const tdFavorito = document.createElement("td");
                
                tdFavorito.rowSpan = initialRowSpan;
                tdFavorito.classList.add(`cell-span-desp-${idDespegue}`);
                tdFavorito.classList.add("columna-favoritos", "borde-grueso-abajo", "borde-grueso-izquierda");
                
                tdFavorito.dataset.id = idDespegue; // Guardamos el ID en el HTML para leerlo luego
                
                if (modoEdicionFavoritos) { // Si se está editando favoritos, que aparezca la mano
                    tdFavorito.classList.add("cursor-pointer");
                    tdFavorito.title = esFavorito ? t('favoritos.quitarDeFavoritos') : t('favoritos.anadirAFavoritos');
                } else {
                    tdFavorito.classList.add("no-cursor-pointer");
                    tdFavorito.title = t('favoritos.despegueFavorito');
                }
                
                //tdFavorito.innerHTML = esFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                tdFavorito.innerHTML = esFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                
                tdFavorito.onclick = function() {
                    
                    const nuevoEstado = toggleFavorito(idDespegue);

                    tdFavorito.innerHTML = nuevoEstado ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                    tdFavorito.title = nuevoEstado ? t('favoritos.quitarDeFavoritos') : t('favoritos.anadirAFavoritos');

                    todasLasFilas.forEach(f => f.classList.toggle("favorito", nuevoEstado));
                    
                };
			
				filaPrincipal.appendChild(tdFavorito);

                // ---------------------------------------------------------------
                // 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna País
                // ---------------------------------------------------------------

                const tdPais = document.createElement("td");

                const paisValor = d.País || d['País'] || '';
                const paisTraducido = t('paises.' + paisValor, { defaultValue: paisValor });
                tdPais.innerHTML = `<div class="texto-multilinea-2" style="max-width: 44px;" title="${paisTraducido}">${paisTraducido}</div>`;	
                tdPais.rowSpan = initialRowSpan;
                tdPais.classList.add(`cell-span-desp-${idDespegue}`);	
                tdPais.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda");
                //tdPais.style.width = "50px";
                //tdPais.style.minWidth = "50px";
                //tdPais.style.maxWidth = "50px";
                
                filaPrincipal.appendChild(tdPais);

                // ---------------------------------------------------------------
                // 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Región
                // ---------------------------------------------------------------
				
				const tdRegion = document.createElement("td");
				
				const regionTraducida = t('regiones.' + d.Región, { defaultValue: d.Región });
                tdRegion.innerHTML = `<div class="texto-multilinea-2" title="${regionTraducida}">${regionTraducida}</div>`;	
				tdRegion.rowSpan = initialRowSpan;
                tdRegion.classList.add(`cell-span-desp-${idDespegue}`);	
				tdRegion.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda");
				
				filaPrincipal.appendChild(tdRegion);	
			
                // ---------------------------------------------------------------
                // 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Provincia
                // ---------------------------------------------------------------
				
				const tdProvincia = document.createElement("td");
				
				tdProvincia.innerHTML = `<div class="texto-multilinea-2" title="${d.Provincia}">${d.Provincia}</div>`;	
				tdProvincia.rowSpan = initialRowSpan;
                tdProvincia.classList.add(`cell-span-desp-${idDespegue}`);	
				tdProvincia.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda");
				
				filaPrincipal.appendChild(tdProvincia);	
			}
	
			// ---------------------------------------------------------------
			// 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Despegue
			// ---------------------------------------------------------------
				
			const tdDespegue = document.createElement("td");
						
			const titleText = t('tabla.despegueTooltip', { 
                provincia: d.Provincia, 
                despegue: d.Despegue, 
                orientacion: traducirCadenaOrientacion(d["Orientación"]) 
            });
			
			tdDespegue.title = titleText;
			
			const gradosOrientacion = orientaciones || [];

			const svgFlechasHTML = gradosOrientacion.map(grado => {
				return `
					<svg viewBox="0 0 30 36" style="
						transform: rotate(${grado + 180}deg);
						display: inline-block;
					">
						<polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="black"/>
					</svg>
				`;
			}).join(''); // Unir todas las flechas en una sola cadena HTML
		
			const nombreParaURL = encodeURIComponent(d.Despegue);
			
            const svgOrientaciones = createOrientationSVG(d["Orientación"]);
            const svgParaTooltip = svgOrientaciones.replaceAll('"', "'");
            
            // 1. Preparamos el nombre para que sea seguro dentro de la función JS (escapa comillas simples)
            const safeDespegue = d.Despegue.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            // Generamos el micro-gráfico de actividad antes de montar el tooltip
            const iconoActividad = d.Actividad ? crearIconoActividad(d.Actividad) : '';
            const iconoActividadParaTooltip = iconoActividad.replaceAll('"', "'");

            // 2. Construimos el contenido HTML del tooltip
            const contenidoTooltip = `
                <div style="line-height: 1.4; max-width: 232px;">
                    <b><span style='font-size: 20px; padding-right: 20px; max-width: 212px; display: inline-block;'><icon-despegue></icon-despegue>${d.Despegue}</b></span><br><br>   
                    
                    ⛅ <a href='https://www.windy.com/${latitud}/${longitud}/wind?${latitud},${longitud},14' onclick='abrirLinkExterno(this.href); return false;'>Windy</a><br>

                    ⛅ <a href='https://meteo-parapente.com/#/${latitud},${longitud},13' onclick='abrirLinkExterno(this.href); return false;'>Meteo-parapente</a><br>

                    ⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${latitud}N${longitud}E' onclick='abrirLinkExterno(this.href); return false;'>Meteoblue</a><br>

                    ⛅ <a href='https://meteo-fly.com/?lat=${latitud}&lon=${longitud}&day=1&model=meteofrance_seamless&maxAlt=4000&cellSelection=nearest&view=wind&hour=0&daylight=1' onclick='abrirLinkExterno(this.href); return false;'>Meteo-fly</a><br>

                    <div class="popup-toggle-header" style="cursor: pointer; border-radius: 3px; padding-top: 8px;">
                        ${t('mapa.masInformacion')}
                    </div>
                                
                    <div class="popup-collapsible-content" style="display: none; overflow-wrap: break-word; ">

                        <br>${t('popupDespegue.region')} <b>${t('regiones.' + d.Región, { defaultValue: d.Región })}</b><br>
                        ${t('popupDespegue.provincia')} <b>${d.Provincia}</b><br>
                        
                        <div>
                            ${t('popupDespegue.orientacion')} 
                            <span style="display: inline-block; vertical-align: 2px; margin-left: 4px;">${svgParaTooltip}</span> 
                            <b style="vertical-align: 1px;">${traducirCadenaOrientacion(d["Orientación"])}</b>
                        </div>

                        ${t('mapa.labelCoordenadas')} <b>${Number(latitud).toFixed(4)}, ${Number(longitud).toFixed(4)}</b><br>
                        ${t('mapa.labelAltitud')} <b>${d.Altitud} m</b><br>
                        
                        <div>
                            ${t('popupDespegue.nivelActividad')} 
                            <span style='margin-left: 6px;'>${iconoActividadParaTooltip}</span> 
                            <b>${d.Actividad || '?'}/5</b>
                        </div>

                        ${t('mapa.labelVuelos')} <b>${d.Vuelos}</b><br>

                        <br>🗺️ <a href='https://maps.google.com/?q=${Number(latitud).toFixed(4)},${Number(longitud).toFixed(4)}' onclick='abrirLinkExterno(this.href); return false;'>Google Maps</a><br>
                        🗺️ <a href='https://brouter.de/brouter-web/#map=15/${Number(latitud).toFixed(4)}/${Number(longitud).toFixed(4)}/OpenTopoMap&pois=${Number(longitud).toFixed(4)},${Number(latitud).toFixed(4)}' onclick='abrirLinkExterno(this.href); return false;'>Brouter</a><br>
                        🗺️ <a href='https://nakarte.me/#m=15/${Number(latitud).toFixed(4)}/${Number(longitud).toFixed(4)}&l=Otm/Sa&n2=_gwm&r=${Number(latitud).toFixed(4)}/${Number(longitud).toFixed(4)}/${d.Despegue} (${d.Orientación}' onclick='abrirLinkExterno(this.href); return false;'>Nakarte</a><br>
                        🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${longitud}%20${latitud}&filter[radius]=500' onclick='abrirLinkExterno(this.href); return false;'>XContest (&plusmn; 500 m)</a><br>

                        <br><div style="margin-bottom: 5px;">${d.Más_información}</div>

                    </div>
                </div>
            `;

            // 3. Escapamos todas las comillas dobles para que no rompan el atributo data-tippy-content
            const contenidoEscapado = contenidoTooltip.replace(/"/g, '&quot;');

            const btnRowBottom = modoEdicionFavoritos ? '2px' : '34px';

            // Botón de Información ("i")
            const botonInfoHTML = `
                <button class="btn-info" 
                    style="position: absolute; bottom: ${btnRowBottom}; left: 13px;"
                    data-tippy-content="${contenidoEscapado}"
                    data-tippy-type="despegue-info" 
                    title="${t('tabla.tooltips.masInfo')}">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="7" x2="12" y2="7" stroke-width="3"></line>
                        <polyline points="10.5 11 12 11 12 17"></polyline>
                    </svg>
                </button>
            `;

            // Botón directo al Mapa (posicionado a la derecha del anterior)
            const botonMapaDirectoHTML = `
                <button class="btn-info btn-guia-mapa-directo" 
                    style="position: absolute; bottom: ${btnRowBottom}; left: 56px;"  
                    onclick="abrirMapaIntegrado(${latitud}, ${longitud}, '${safeDespegue}'); return false;"
                    title="${t('tabla.tooltips.verEnMapa')}">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" style="vertical-align: middle;">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                        <line x1="8" y1="2" x2="8" y2="18"></line>
                        <line x1="16" y1="6" x2="16" y2="22"></line>
                    </svg>
                </button>
            `;
			
            const provinciaHTML = modoEdicionFavoritos ? "" : `<span style="display:block; color: #777; margin-top: -1px; margin-bottom: 2px;">(${d.Provincia})</span>`;

            const botonFavoritoHTML = modoEdicionFavoritos ? "" : `
                <button class="btn-info btn-favorito-tabla"
                    style="position: absolute; bottom: 2px; left: 13px;"
                    onclick="toggleFavoritoDesdeTabla(${d.ID}, this); return false;"
                    title="${esFavorito  ? t('favoritos.despegueFavorito') : t('favoritos.anadirAFavoritos')}">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="${esFavorito  ? '#e00' : 'none'}" stroke="${esFavorito  ? '#e00' : '#555'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            `;

            const esSeguimiento = obtenerSeguimientos().map(s => Number(s.id)).includes(Number(d.ID));
            const botonOjoHTML = modoEdicionFavoritos ? "" : `
                <button class="btn-info btn-ojo-tabla solo-modo-avanzado"
                    style="position: absolute; bottom: 2px; left: 56px;"
                    onclick="toggleSeguimientoDesdeTabla(${d.ID}, this); return false;"
                    title="${t('seguimiento.activar_desactivar')}">
                    ${svgOjoBoton(esSeguimiento)}
                </button>
            `;

            // Generamos el micro-gráfico de actividad limpio (la función base ya no lleva el data-tippy-content)
            const iconoActividadLimpio = d.Actividad ? crearIconoActividad(d.Actividad) : '';

            // Siempre se muestra en edición, o si hay más de 7 filas en vista normal
            const mostrarRosayActividad = modoEdicionFavoritos || (initialRowSpan > 11);
            const modoCompacto = !modoEdicionFavoritos && (initialRowSpan < 10);

            // Preparamos el texto del tooltip limpiando las comillas dobles
            const textoCrudoActividad = t('tabla.tooltips.tooltipNivelDeActividad');
            const tooltipActividadSeguro = textoCrudoActividad ? textoCrudoActividad.replaceAll('"', "'") : '';

            // Preparamos el HTML de los iconos centrales según el espacio/modo
            const htmlIconosCentrales = mostrarRosayActividad ? `
                <span style="display: inline-flex; align-items: center; justify-content: center; margin-top: 2px; margin-bottom: 5px;">
                    <span class="guia-rosa-vientos" style="padding-top: 1px; margin-right: 12px;">${svgOrientaciones}</span>
                    
                    <!-- CONTENEDOR TIPPY EXCLUSIVO PARA LA TABLA -->
                    <span class="guia-nivel-actividad" 
                          data-tippy-content="${tooltipActividadSeguro}"
                          title="${t('tabla.tooltips.actividad') || 'Nivel de actividad'}: ${d.Actividad || '?'}/5"
                          style="outline: none; margin-left: -3px; cursor: help;" tabindex="0">
                        ${iconoActividadLimpio}
                    </span>
                </span>
            ` : '';

            // --- CONFIGURACIÓN DE LOS BOTONES DE EXPANSIÓN ---
            let botonToggleEcmwfHTML = '';
            let botonMinutely15HTML = '';
            let paddingExtraBoton = 0;
            let bottomValue = 0; 

            // Averiguamos qué botones hay que mostrar
            const showEcmwf = chkMostrarVientoEcmwfDesplegable && !modoEdicionFavoritos;
            const show15min = !modoEdicionFavoritos && chkMostrarBotonMinutely15;

            // Si hay que mostrar al menos uno de los dos, calculamos la altura
            if (showEcmwf || show15min) {
                
                const bottomNum = parseInt(btnRowBottom) || 2; 

                if (initialRowSpan < 10) {
                    paddingExtraBoton = 0; 
                    bottomValue = 24;
                } else {
                    paddingExtraBoton = 32;
                    bottomValue = bottomNum + 32; 
                }

                if (initialRowSpan > 12) {
                    bottomValue += 10;
                }

                // --- POSICIÓN ABSOLUTA INTELIGENTE ---
                // Por defecto, se centran exactamente en el medio
                let posEcmwf = "left: 50%; transform: translateX(-50%);";
                let pos15min = "left: 50%; transform: translateX(-50%);";

                if (showEcmwf && show15min) {
                    // Si están los dos activos, los apartamos del centro para que no se pisen.
                    // Al medir unos 30px (clase btn-info), los desplazamos un poco a izquierda y derecha.
                    pos15min = "left: 50%; transform: translateX(-104%);"; 
                    posEcmwf = "left: 50%; transform: translateX(9%);";   
                }

                // --- BOTÓN ECMWF ---
                if (showEcmwf) {
                    const estaAmpliando = window.sessionExpandedEcmwfTakeoffs.has(idDespegue);
                    const chevron = estaAmpliando ? '▲' : '▼';

                    botonToggleEcmwfHTML = `
                        <button onclick="if(event){event.stopPropagation(); event.preventDefault();} toggleEcmwfDesplegable(event, ${idDespegue}); return false;"
                            style="width: 40px; height: 30px; position:absolute; bottom: ${bottomValue}px; ${posEcmwf} cursor:pointer; background:#fff; border:1.5px solid #ccc; border-radius:8px; color:#4a6785; box-shadow:1px 1px 3px rgba(0,0,0,0.1); display: inline-flex; align-items: center;"
                            title="${t('tabla.tooltips.botonToggleEcmwfHTML', { defaultValue: 'Viento sinóptico ECMWF a varias altitudes' })}">

                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; margin-right: 1px;">
                                <!-- Flecha Vertical (Movida a la izquierda: Centro X=5) -->
                                <g stroke="#e00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="4" y1="4" x2="4" y2="20"/>
                                    <polyline points="1 7 4 4 7 7"/>
                                    <polyline points="1 17 4 20 7 17"/>
                                </g>

                                <!-- Icono Viento (Movido a la derecha: Empieza en X=11) -->
                                <g stroke="#555" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M15.59 4.59A2 2 0 1 1 17 8H11"/>
                                    <path d="M17.59 19.41A2 2 0 1 0 19 16H11"/>
                                    <path d="M13 12h9a2 2 0 1 1 0 4"/>
                                </g>
                            </svg>
                            <span style="font-size: 12px; font-weight: bold;">${chevron}</span>
                        </button>
                    `;
                }

                // --- BOTÓN 15 MIN ---
                if (show15min) {
                    botonMinutely15HTML = `
                        <button onclick="if(event){event.stopPropagation(); event.preventDefault();} abrirModalMinutely15(${idDespegue}, '${safeDespegue}'); return false;"
                            style="width: 40px; height: 30px; position:absolute; bottom: ${bottomValue}px; ${pos15min} cursor:pointer; background:#fff; border:1.5px solid #ccc; border-radius:8px; box-shadow:1px 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; padding-bottom: 1px;"
                            title="${t('tabla.tooltips.detalle15min', { defaultValue: 'Ver tabla de previsión de viento y direcciones según predicción inmediata del modelo Arome 15min' })}">
                            
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span style="color: #e00; font-size: 9px; font-weight: bold; line-height: 1; margin-top: -1px;">15 min</span>
                        </button>
                    `;
                }
            }

            tdDespegue.innerHTML = `
                ${botonInfoHTML}
                ${botonMapaDirectoHTML}
                ${botonFavoritoHTML}
                ${botonOjoHTML}
                ${botonToggleEcmwfHTML}
                ${botonMinutely15HTML}
                <div class="texto-multilinea-2" title="${d.Despegue}"><strong>${d.Despegue}</strong></div>
                ${provinciaHTML}
                ${htmlIconosCentrales}
                <span class="linea-divisora-edit" style="position: absolute; bottom: 34px; left: 8px; right: 8px; border-top: 1px solid #d1d1d1; display: none;"></span>
            `;

            tdDespegue.rowSpan = initialRowSpan;	
            tdDespegue.classList.add("columna-despegue", "borde-grueso-abajo", "borde-grueso-izquierda");
            
            if (modoEdicionFavoritos) {
                tdDespegue.classList.add("borde-grueso-derecha");
                tdDespegue.style.paddingBottom = (34) + 'px';
            } else {
                if (modoCompacto) {
                    tdDespegue.classList.add('modo-compacto');
                    tdDespegue.style.paddingBottom = (26 + paddingExtraBoton) + 'px';
                } else if (paddingExtraBoton > 0) {
                    tdDespegue.style.paddingBottom = (6 + paddingExtraBoton) + 'px';
                }
            }
			
			filaPrincipal.appendChild(tdDespegue);
				
			// ---------------------------------------------------------------
			// 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columnas Meteo (no está en edición favoritos)
			// ---------------------------------------------------------------
			if (!modoEdicionFavoritos) {

				// ---------------------------------------------------------------
				// ⚪ CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Meteo
				// ---------------------------------------------------------------
					
				// Helper para meter los iconos rápidamente
                const addIconCell = (tr, html, title) => {
                    if (!tr) return;
                    const td = document.createElement("td");
                    td.innerHTML = html;
                    td.setAttribute("title", title);
                    td.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");
                    td.style.backgroundColor = "#ffffff";
                    tr.appendChild(td);
                };

                // Iconos Grupo 1: ECMWF (Precipitación, Nubes bajas)
                addIconCell(filaNubesTotal, '<span style="font-size:16px; font-weight:bold; padding-bottom: 2px; display: inline-block; box-sizing: border-box;">🌦️</span>', tituloMeteoGeneral);
                addIconCell(filaPreci, '<span style="font-size:15px; font-weight:bold;">💦</span>', tituloPrecipitacion);
                addIconCell(filaProbPreci, '<span style="font-size:15px; font-weight:bold;">💦?</span>', tituloProbPrecipitacion);
                addIconCell(filaBaseNube, '<span style="font-size:15px; font-weight:bold;">☁️↕</span>', tituloBaseNube);
                addIconCell(filaTemperatura, '<span style="font-size:15px; font-weight:bold;">🌡️</span>', tituloTemperatura);

                // Velocidades alturas
                if (chkMostrarVientoAlturas) {
                    const alturas = [
                        { tr: fila180, label: labelViento180, title: tituloViento180, bordeTop: true },
                        { tr: fila120, label: labelViento120, title: tituloViento120 },
                        { tr: fila80,  label: labelViento80,  title: tituloViento80,  bordeBottom: true }
                    ];

                    alturas.forEach(item => {
                        const td = document.createElement("td");
                        // Estilo simple con texto negrita pequeño
                        td.innerHTML = `<span style="font-size:10px; font-weight:bold;">${item.label}</span>`;
                        td.setAttribute("title", item.title);
                        td.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");
                        if (item.bordeTop) td.style.borderTop = "1px solid #000";
                        if (item.bordeBottom) td.style.borderBottom = "1px solid #000";
                        item.tr.appendChild(td);
                    });
                }

                // Velocidad 10 m
                const tdIconoVelocidad = document.createElement("td");
                tdIconoVelocidad.innerHTML = `<span style="font-size:10px; font-weight:bold;">${labelViento10}</span>`;
                tdIconoVelocidad.setAttribute("title", tituloViento10);
                tdIconoVelocidad.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");

                filaVel.appendChild(tdIconoVelocidad);	 	 	 	

                // Racha 10 m
                const tdIconoRacha = document.createElement("td");	
                tdIconoRacha.innerHTML = '<img src="icons/icono_racha_48x42.webp" width="16" height="14">';
                tdIconoRacha.setAttribute("title", tituloRacha10);
                /* Añadir clase para asegurar la posición fija */
                tdIconoRacha.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");
				
                // Forzamos altura a 20px
                tdIconoRacha.style.height = "20px";
                tdIconoRacha.style.minHeight = "20px";
                tdIconoRacha.style.maxHeight = "20px";
                tdIconoRacha.style.lineHeight = "20px";
                tdIconoRacha.style.padding = "0px";
                tdIconoRacha.style.boxSizing = "border-box"; // Vital para que los bordes no sumen altura

				filaRacha.appendChild(tdIconoRacha);

				// Dirección 10 m
                const tdIconoDireccion = document.createElement("td");	
                tdIconoDireccion.innerHTML = '<img src="icons/icono_direccion_45.webp" width="15" height="15">';
                tdIconoDireccion.setAttribute("title", tituloDireccion10);	
                tdIconoDireccion.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");

                // Forzamos altura a 20px
                tdIconoDireccion.style.height = "20px";
                tdIconoDireccion.style.minHeight = "20px";
                tdIconoDireccion.style.maxHeight = "20px";
                tdIconoDireccion.style.lineHeight = "20px";
                tdIconoDireccion.style.padding = "0px";
                tdIconoDireccion.style.boxSizing = "border-box"; 

                filaDir.appendChild(tdIconoDireccion);

                // Cizalladura
                if (chkMostrarCizalladura) {
                    const tdIconoCiz = document.createElement("td");	
                    tdIconoCiz.innerHTML = '';
                    tdIconoCiz.style.background = "linear-gradient(to right, #6befaf 33.3%, #f0c16a 33.3%, #f0c16a 66.6%, #fb796e 66.6%)";
                    tdIconoCiz.setAttribute("title", tituloCizalladura);	
                    tdIconoCiz.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda", "celda-altura-4px");
                    tdIconoCiz.style.borderTop = "1px solid #000";
                    tdIconoCiz.style.borderBottom = "1px solid #000";

                    filaCizalladura.appendChild(tdIconoCiz);
                }

                // Iconos Grupo 2: XC
                // Nota: He creado claves para los nombres de las etiquetas (Techo, CAPE, CIN) para que cambien en inglés
                addIconCell(filaTecho, `<span style="font-size:10px; font-weight:bold;">${labelTecho}</span>`, tituloTecho);
                addIconCell(filaCape, `<span style="font-size:10px; font-weight:bold;">${labelCape}</span>`, tituloCape);
                addIconCell(filaCin, `<span style="font-size:10px; font-weight:bold;">${labelCin}</span>`, tituloCin);

                // Iconos del Grupo: Viento ECMWF (beta) con clase ecmwf-neutral
                const addIconCellEcmwf = (tr, html, title, bordeTopPx, bordeBottomPx) => {
                    if (!tr) return;
                    const td = document.createElement("td");
                    td.innerHTML = `<span style="font-size:9px;">${html}</span>`;
                    td.setAttribute("title", title);
                    td.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda", "ecmwf-neutral");
                    if (bordeTopPx) td.style.borderTop = bordeTopPx;
                    if (bordeBottomPx) td.style.borderBottom = bordeBottomPx;
                    tr.appendChild(td);
                };

                addIconCellEcmwf(filaEcmwfVel3000, "<span style='position: relative; top: -1px; display: inline-block;'>3000 m<span style='display:block; font-size:8px; line-height:8px; margin-top:-5px;'>MSL</span></span>", tituloEcmwf3000, "1px solid #000");
                addIconCellEcmwf(filaEcmwfDir3000, '<img src="icons/icono_direccion_45.webp" width="15" height="15" style="position: relative;">', tituloEcmwfDir3000, null, "1px solid #000");

                addIconCellEcmwf(filaEcmwfVel1500, "<span style='position: relative; top: -1px; display: inline-block;'>1500 m<span style='display:block; font-size:8px; line-height:8px; margin-top:-5px;'>MSL</span></span>", tituloEcmwf1500);
                addIconCellEcmwf(filaEcmwfDir1500, '<img src="icons/icono_direccion_45.webp" width="15" height="15" style="position: relative;">', tituloEcmwfDir1500, null, "1px solid #000");

                addIconCellEcmwf(filaEcmwfVel1000, "<span style='position: relative; top: -1px; display: inline-block;'>1000 m<span style='display:block; font-size:8px; line-height:8px; margin-top:-5px;'>MSL</span></span>", tituloEcmwf1000);
                addIconCellEcmwf(filaEcmwfDir1000, '<img src="icons/icono_direccion_45.webp" width="15" height="15" style="position: relative;">', tituloEcmwfDir1000, null, "1px solid #000");

                addIconCellEcmwf(filaEcmwfVel500, "<span style='position: relative; top: -1px; display: inline-block;'>500 m<span style='display:block; font-size:8px; line-height:8px; margin-top:-5px;'>MSL</span></span>", tituloEcmwf500);
                addIconCellEcmwf(filaEcmwfDir500, '<img src="icons/icono_direccion_45.webp" width="15" height="15" style="position: relative;">', tituloEcmwfDir500, null, "2px solid #000");

                addIconCellEcmwf(filaEcmwfValt, `<span style='position: relative; top: -1px; display: inline-block;'>${d.Altitud || 0} m<span style='display:block; font-size:8px; line-height:8px; margin-top:-5px;'>MSL</span></span>`, tituloEcmwfValt);
                addIconCellEcmwf(filaEcmwfDalt, '<img src="icons/icono_direccion_45.webp" width="15" height="15" style="position: relative;">', tituloEcmwfDalt, null, "2px solid #000");

				// ---------------------------------------------------------------
				// ⚪ CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columnas de datos por hora
				// ---------------------------------------------------------------
					
                // Envolver la construcción de las CELDAS DE DATOS en una verificación.
				if (hayDatosMeteo) {

                    // ⚪ Meteorología general, Precipitación, Probabilidad de precipitación y Nubes bajas *****************************
                    // Helper para renderizar los datos del nuevo JSON ECMWF rápidamente
                    const renderEcmwfData = (tr, dataArr, formatFn, fontSize, colorFn, paddingBottom = "0px", titleFn = null) => {
                        if (!tr || !dataArr) return;
                        
                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            let val = dataArr[i];
                            
                            const td = document.createElement("td");
                            let appliedColor = false;
                            
                            if (colorFn) {
                                const colorClass = colorFn(val, i);
                                if (colorClass) {
                                    td.classList.add(colorClass);
                                    appliedColor = true;
                                }
                            }

                            if (titleFn) {
                                const tooltipText = titleFn(val, i);
                                if (tooltipText) {
                                    td.setAttribute("data-tippy-content", tooltipText);
                                    td.setAttribute("tabindex", "0"); // Permite el foco táctil en móviles
                                    td.style.cursor = "help";         // Indica visualmente que es clicable
                                }
                            }
                            
                            if (cacheEsNoche[i]) {
                                td.classList.add("celda-noche");
                            } else if (!appliedColor) {
                                td.style.backgroundColor = "#ffffff"; 
                            }
                            
                            if (setInicioDia.has(i)) td.classList.add("borde-grueso-izquierda");
                            
                            if (fontSize) td.style.setProperty('font-size', fontSize, 'important');
                            if (paddingBottom) td.style.paddingBottom = paddingBottom;
                            
                            td.textContent = formatFn(val, i);
                            tr.appendChild(td);
                        }
                    };

                    // Datos ECMWF Grupo 1 (Precipitaciones, nubes bajas)
                    if (hourlyEcmwf) {

                        // Meteo General (Nubosidad y Lluvia)
                        renderEcmwfData(filaNubesTotal, hourlyEcmwf.cloud_cover, 
                            (v, i) => {
                                let preci = (hourlyEcmwf.precipitation && hourlyEcmwf.precipitation[i] != null) ? Number(hourlyEcmwf.precipitation[i]) : 0;
                                if (preci > 0 && preci <= 0.2) return "🌦️";
                                if (preci >= 0.3) return "🌧️";

                                if (v == null) return "";
                                let n = Math.round(Number(v));
                                if (n < 10) return "☀️";
                                if (n < 30) return "🌤️";
                                if (n < 60) return "⛅";
                                if (n < 90) return "🌥️";
                                return "☁️";
                            }, "16px", () => "", "2px",
                            (v, i) => {
                                let htmlLista = "";
                                
                                // 1. Añadir punto de Nubosidad Total si existe el dato
                                if (v != null) {
                                    const textoNubosidad = t('tabla.tooltips.nubosidadTotal', { 
                                        cobertura: Math.round(Number(v)), 
                                        defaultValue: 'Nubosidad total: {{cobertura}}% cobertura' 
                                    });
                                    htmlLista += `<li>${textoNubosidad}</li>`;
                                }

                                // 2. Añadir punto de Lluvia si la precipitación es mayor a 0
                                let preci = (hourlyEcmwf.precipitation && hourlyEcmwf.precipitation[i] != null) ? Number(hourlyEcmwf.precipitation[i]) : 0;
                                if (preci > 0) {
                                    const textoLluvia = t('tabla.tooltips.lluviaValor', { 
                                        mm: preci.toFixed(1), 
                                        defaultValue: 'Lluvia: {{mm}} mm (litros/m²)' 
                                    });
                                    htmlLista += `<li>${textoLluvia}</li>`;
                                }

                                if (!htmlLista) return "";

                                // Devolvemos el conjunto envuelto en la lista con su estilo unificado
                                return `<ul style="margin: 4px 0; padding-left: 16px; text-align: left;">${htmlLista}</ul>`;
                            }
                        );

                        renderEcmwfData(filaPreci, hourlyEcmwf.precipitation, 
                            v => v == null ? "" : (Number(v).toFixed(1) === "0.0" ? "" : Number(v).toFixed(1)), "12px",
                            v => v == null ? "" : (Number(v) === 0 ? "fondo-verde" : (Number(v) <= 0.2 ? "fondo-naranja" : "fondo-rojo"))
                        );
                        
                        renderEcmwfData(filaProbPreci, hourlyEcmwf.precipitation_probability, 
                            v => {
                                if (v == null) return "";
                                let decenas = Math.round(Number(v) / 10) * 10;
                                return decenas === 0 ? "" : decenas.toString();
                            }, "12px",
                            v => {
                                if (v == null) return "";
                                let decenas = Math.round(Number(v) / 10) * 10;
                                return decenas === 0 ? "fondo-verde" : (decenas <= 20 ? "fondo-naranja" : "fondo-rojo");
                            }
                        );

                        // Base de nubes estimada MSL con Downscaling Activo en la API
                        renderEcmwfData(filaBaseNube, hourlyEcmwf.temperature_2m, 
                            (temp, i) => {
                                if (temp == null || !hourlyEcmwf.dew_point_2m || hourlyEcmwf.dew_point_2m[i] == null) return "";
                                
                                let t_val = Number(temp);
                                let roc = Number(hourlyEcmwf.dew_point_2m[i]);
                                let altRealDespegue = Number(d.Altitud || 0); 
                                
                                // El espesor ya está calculado sobre la altitud del despegue debido al downscaling de la API
                                let espesorMts = Math.max(0, Math.round((t_val - roc) * 125));
                                let baseMslMts = altRealDespegue + espesorMts;
                                let baseMslKm = (baseMslMts / 1000).toFixed(1);
                                
                                return baseMslKm === "0.0" ? "0" : baseMslKm;
                            }, 
                            "12px", 
                            (temp, i) => {
                                if (temp == null || !hourlyEcmwf.dew_point_2m || hourlyEcmwf.dew_point_2m[i] == null) return "";
                                
                                let t_val = Number(temp);
                                let roc = Number(hourlyEcmwf.dew_point_2m[i]);
                                
                                // El espesor es directamente el margen libre sobre el despegue
                                let espesorMts = Math.max(0, Math.round((t_val - roc) * 125));

                                if (espesorMts < 100) return "fondo-rojo";     
                                if (espesorMts <= 300) return "fondo-naranja"; 
                                return "fondo-verde";                          
                            },
                            "0px",
                            (temp, i) => { 
                                if (temp == null || !hourlyEcmwf.dew_point_2m || hourlyEcmwf.dew_point_2m[i] == null) return "";

                                const t_val = Number(temp);
                                const roc = Number(hourlyEcmwf.dew_point_2m[i]);
                                const altRealDespegue = Number(d.Altitud || 0);
                                
                                // Cálculo del espesor aproximado AGL
                                const espesorMts = Math.max(0, Math.round((t_val - roc) * 125));
                                const baseMslMts = altRealDespegue + espesorMts;
                                
                                // Formateo del valor en kilómetros (evitando el paso intermedio "baseMslKm")
                                const valorFinal = (baseMslMts / 1000).toFixed(1);
                                const baseKm = valorFinal === "0.0" ? "0" : valorFinal;
                                
                                return t('tabla.tooltips.baseNubeValor', { 
                                    base_km: baseKm, 
                                    base_m: baseMslMts,
                                    altitud_despegue: altRealDespegue,
                                    espesor: espesorMts, 
                                    defaultValue: '<ul style="margin: 4px 0; padding-left: 16px; text-align: left;"><li>Altitud de la base estimada de la nube convectiva: {{base_km}} km ({{base_m}} m)</li><li>Altitud del despegue: {{altitud_despegue}} m</li><li>Altura libre sobre despegue: {{espesor}} m</li></ul>' 
                                });
                            }
                        );

                        // Temperatura a 2 metros
                        renderEcmwfData(filaTemperatura, hourlyEcmwf.temperature_2m, 
                            v => v == null ? "" : Math.round(Number(v)), "12px",
                            () => "", // Sin color dinámico (aplica fondo blanco/gris de noche automáticamente)
                            "0px"
                        );
                        
                    } else {
                        const emptyArr = new Array(horas.length).fill(null);
                        renderEcmwfData(filaNubesTotal, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaPreci, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaProbPreci, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaBaseNube, emptyArr, () => "", "9px", () => ""); 
                        renderEcmwfData(filaTemperatura, emptyArr, () => "", "9px", () => "");
                    }

					// ⚪ Velocidades alturas 80, 120, 180 m *****************************

                    if (chkMostrarVientoAlturas) {
                        
                        const arr180 = hourlyData.wind_speed_180m || [];
                        const arr120 = hourlyData.wind_speed_120m || [];
                        const arr80  = hourlyData.wind_speed_80m  || [];
                        const arr10  = hourlyData.wind_speed_10m  || []; // Necesario para comparar

                        // Función helper para pintar celdas de altura optimizada
                        const pintarCeldaAltura = (tr, dataArray, alturaKey, bordeTop, bordeBottom) => {
                            // Ya no hacemos dataArray.slice().forEach(...)
                            for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                                
                                let rawVal = dataArray[i]; // Leemos directamente

                                const td = document.createElement("td");
                                
                                // Optimizaciones de caché y Set
                                if (cacheEsNoche[i]) td.classList.add("celda-noche");
                                if (setInicioDia.has(i)) td.classList.add("borde-grueso-izquierda");
                                if (bordeTop) td.style.borderTop = "1px solid #000";
                                if (bordeBottom) td.style.borderBottom = "1px solid #000";

                                // 1. Datos Reales (para mostrar en texto)
                                let valAltura = Math.round(Math.max(0, rawVal));
                                let valSueloRaw = arr10[i] || 0; 

                                td.textContent = valAltura;

                                // --- CÁLCULOS ---

                                // A) Suelo Virtual para cálculo de Ratio:
                                // Asumimos un mínimo de 8 km/h para evitar divisiones locas con viento calma.
                                let valSueloParaCalculo = Math.max(8, valSueloRaw); 

                                // Calculamos ratio y porcentaje
                                let ratio = valAltura / valSueloParaCalculo;
                                let aumentoPorcentual = Math.round((ratio - 1) * 100);
                                if (aumentoPorcentual < 0) aumentoPorcentual = 0;

                                // Datos de Referencia (Límites y Factores)
                                const limites = LIMITES_CIZALLADURA[alturaKey]; 
                                const factorSeguridad = limites ? limites.naranja : 1.0; 
                                
                                // Límite Absoluto (Tu VelMax * Factor de altura)
                                const limiteAbsolutoUsuario = Math.round(VelocidadMax * factorSeguridad);
                                
                                // CONSTANTE FÍSICA: Umbral de turbulencia baja/moderada
                                const UMBRAL_TURBULENCIA_BAJA = 25; 

                                let claseColor = "fondo-verde"; 
                                let motivo = "";

                                // --- LÓGICA DE COLORES ---

                                // 1. REGLA DE USUARIO: ¿Supera TU límite de seguridad ajustado?
                                if (valAltura >= limiteAbsolutoUsuario) {
                                    claseColor = "fondo-rojo";
                                    motivo = `Supera el límite calculado para esta altura (${limiteAbsolutoUsuario} km/h)\n(Velocidad máxima configurada: ${VelocidadMax} km/h x Factor ${factorSeguridad})`;
                                }
                                // 2. REGLA FÍSICA: ¿Es viento moderado (<25 km/h)?
                                // Si no supera tu límite y es menor a 25, asumimos que no hay peligro grave de cizalladura.
                                else if (valAltura < UMBRAL_TURBULENCIA_BAJA) {
                                    claseColor = "fondo-verde";
                                    motivo = "Cizalladura débil";
                                }
                                // 3. REGLA DE GRADIENTE: (Solo si > 25 km/h Y volable)
                                // Aquí el viento ya tiene energía, así que vigilamos el cambio brusco.
                                else if (limites) {
                                    if (ratio >= limites.rojo) {
                                        claseColor = "fondo-rojo";
                                        motivo = `Cizalladura fuerte (+${aumentoPorcentual}%)`;
                                    } else if (ratio >= limites.naranja) {
                                        claseColor = "fondo-naranja";
                                        motivo = `Cizalladura moderada (+${aumentoPorcentual}%)`;
                                    }
                                }

                                td.classList.add(claseColor);
                                td.title = `${valAltura} km/h a ${alturaKey}\n\n${motivo}`;
                                tr.appendChild(td);
                            }
                        };

                        // Pasamos la clave "80m", "120m" para que busque en el objeto LIMITES_CIZALLADURA
                        // Bordes top/bottom aplicados directamente en la creación (ver parámetros), sin segunda pasada
                        pintarCeldaAltura(fila180, arr180, "180 m", true, false);
                        pintarCeldaAltura(fila120, arr120, "120 m", false, false);
                        pintarCeldaAltura(fila80,  arr80,  "80 m", false, true);
                    }

					// ⚪ Velocidad 10 m *****************************
					
					// Ponemos esta constante fuera del bucle para no calcularla 100 veces
                    const velocidadTolerableSuperior = VelocidadMax - (VelocidadMax - VelocidadIdeal) / 3;

                    for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                        
                        // Leemos el dato DIRECTAMENTE de la base de datos original (hourlyData) para esta hora 'i'
                        let velocidadModelo = hourlyData.wind_speed_10m[i];

                        // (NOTA: Si en algún momento en este bucle necesitaras los de 80 o 120m, 
                        // se leen exactamente igual, sin hacer .slice() previamente:)
                        // let v80 = hourlyData.wind_speed_80m ? hourlyData.wind_speed_80m[i] : null;

                        let velocidad = Math.round(Math.max(0, velocidadModelo)); // Redondeo a 0 decimales

                        const td = document.createElement("td");

                        // Marcar celdas de noche en datos (Usando la caché)
                        if (cacheEsNoche[i]) {
                            td.classList.add("celda-noche");
                        }
                                    
                        // ¡Veo que aquí ya has puesto lo del PASO 1 (setInicioDia)! ¡Genial!
                        if (setInicioDia.has(i)) {
                            td.classList.add("borde-grueso-izquierda");
                        }

                        if (velocidad < VelocidadMin) {
                            td.classList.add("fondo-naranja");
                        } 
                        else if (velocidad <= velocidadTolerableSuperior) {
                            td.classList.add("fondo-verde"); // Velocidad ideal
                        } 
                        else if (velocidad < VelocidadMax) {
                            td.classList.add("fondo-naranja");
                        } 
                        else { 
                            td.classList.add("fondo-rojo");
                        } 

                        td.textContent = velocidad;
                        td.title = `${velocidad} km/h`;

                        filaVel.appendChild(td);
                    }

					// ⚪ Racha *****************************

                    const rachaTolerable = RachaMax - (RachaMax - VelocidadMax) / 3;

                    for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                        
                        // Leemos directamente del JSON original
                        let rachaModelo = hourlyData.wind_gusts_10m[i];
                        let racha = Math.round(Math.max(0, rachaModelo));

                        const td = document.createElement("td");

                        // Usamos la caché de noches
                        if (cacheEsNoche[i]) {
                            td.classList.add("celda-noche");
                        }
                                    
                        // Usamos el Set del PASO 1 (ultrarrápido)
                        if (setInicioDia.has(i)) {
                            td.classList.add("borde-grueso-izquierda");
                        }

                        // Lógica de colores
                        if (racha < rachaTolerable) {
                            td.classList.add("fondo-verde");
                        } 
                        else if (racha < RachaMax) { 
                            td.classList.add("fondo-naranja");
                        } 
                        else { 
                            td.classList.add("fondo-rojo");
                        } 

                        td.textContent = racha;
                        td.title = `${racha} km/h racha máxima`;

                        filaRacha.appendChild(td);
                    }

					// ⚪ Dirección *****************************

                    for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                        
                        // Leemos directamente del JSON original
                        let dirModelo = hourlyData.wind_direction_10m[i];
                        let dir = Math.round(dirModelo);

                        const td = document.createElement("td");

                        // Usamos la caché de noches
                        if (cacheEsNoche[i]) {
                            td.classList.add("celda-noche");
                        }
                                    
                        // Usamos el Set del PASO 1 (ultrarrápido)
                        if (setInicioDia.has(i)) {
                            td.classList.add("borde-grueso-izquierda");
                        }
                        
                        // Calcular el color según el ángulo
                        let minimoAnguloDiferencia = 180;  // Valor seguro por defecto
                        if (orientaciones && orientaciones.length > 0) {
                            minimoAnguloDiferencia = Math.min(...orientaciones.map(o => diferenciaAngular(dir, o)));
                        }

                        td.classList.add(colorPorDiferencia(minimoAnguloDiferencia));

						td.appendChild(crearFlechaViento(dir));
							
                        td.title = `${dir}º`;

                        filaDir.appendChild(td);
                    }

                    // ⚪ Cizalladura / Fiabilidad *****************************
                    if (chkMostrarCizalladura) {
                        const arr180 = hourlyData.wind_speed_180m || [];
                        const arr120 = hourlyData.wind_speed_120m || [];
                        const arr80  = hourlyData.wind_speed_80m  || [];
                        const arr10  = hourlyData.wind_speed_10m  || []; 

                        // TRUCO OPTIMIZACIÓN: Sacamos los textos fijos fuera del bucle
                        const txtBaja = t('tabla.cizalladura.baja');
                        const txtMotivoBajo = t('tabla.cizalladura.motivoBajo');
                        const txtAlta = t('tabla.cizalladura.alta');
                        const txtMedia = t('tabla.cizalladura.media');

                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            
                            const td = document.createElement("td");
                            td.classList.add("celda-altura-4px");
                            td.style.borderTop = "1px solid #000";
                            td.style.borderBottom = "1px solid #000";
                            
                            if (i !== indiceFinRangoHorario) {
                                td.style.borderRight = "1px solid #000";
                            }
                            if (cacheEsNoche[i]) td.classList.add("celda-noche");
                            if (setInicioDia.has(i)) td.classList.add("borde-grueso-izquierda");

                            if (arr80[i] === undefined && arr120[i] === undefined && arr180[i] === undefined) {
                                td.textContent = "-";
                                filaCizalladura.appendChild(td);
                                continue; // Equivalente a return en un bucle for
                            }

                            const vel80 = arr80[i] !== undefined ? Math.round(Math.max(0, arr80[i])) : 0;
                            const vel120 = arr120[i] !== undefined ? Math.round(Math.max(0, arr120[i])) : 0;
                            const vel180 = arr180[i] !== undefined ? Math.round(Math.max(0, arr180[i])) : 0;
                            
                            // Leemos directo sin vel10Raw
                            const vel10 = Math.round(Math.max(0, arr10[i]));

                            const vientoMaxAltura = Math.max(vel80, vel120, vel180);
                            const delta = vientoMaxAltura - vel10;
                            const vel10Calculo = Math.max(8, vel10);
                            const ratio = vientoMaxAltura / vel10Calculo;

                            let colorCizalladura = "fondo-verde";
                            let textoResultado = txtBaja;
                            let motivoCalculo = txtMotivoBajo;

                            if (ratio > 2.0 && delta > 12) {
                                colorCizalladura = "fondo-rojo";
                                textoResultado = txtAlta;
                                motivoCalculo = t('tabla.cizalladura.motivoAlto', { ratio: ratio.toFixed(1), delta: delta });
                            } 
                            else if (ratio > 1.5 && delta > 8) {
                                colorCizalladura = "fondo-naranja";
                                textoResultado = txtMedia;
                                motivoCalculo = t('tabla.cizalladura.motivoMedio', { ratio: ratio.toFixed(1), delta: delta });
                            } 

                            td.classList.add(colorCizalladura);
                            td.title = `${textoResultado}\n${motivoCalculo}`;

                            filaCizalladura.appendChild(td);
                        }
                    }

                    // ⚪ MEGA-BUCLE: Techo + CAPE + CIN (XC) *****************************
                    if (hourlyEcmwf) {
                        let htmlTecho = "";
                        let htmlCape = "";
                        let htmlCin = "";

                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            
                            let clasesBase = "";
                            if (cacheEsNoche[i]) clasesBase += " celda-noche";
                            if (setInicioDia.has(i)) clasesBase += " borde-grueso-izquierda";

                            // === 1. TECHO (Simplificado y corregido) ===
                            let vTecho = hourlyEcmwf.boundary_layer_height[i];
                            let celdaTechoHTML = "";
                            
                            if (vTecho == null) {
                                // Caso 1: Celda vacía sin datos (con fondo blanco si es de día)
                                const bgTecho = !cacheEsNoche[i] ? 'background-color: #ffffff;' : '';
                                celdaTechoHTML = `<td class="${clasesBase}" style="padding-bottom: 0px; font-size: 12px !important; ${bgTecho}"></td>`;
                            } else {
                                // Caso 2: Celda con datos (Cálculo e inyección directa)
                                const espesorBLH = Math.round(Number(vTecho));
                                const espesorUtil = Math.round(espesorBLH * RATIO_TECHO_UTIL);
                                const altitudMSL = Math.round(espesorUtil + elevacionModeloECMWF);
                                
                                const valorTexto = (altitudMSL / 1000).toFixed(1);
                                const txtTecho = (valorTexto === "0.0") ? "0" : valorTexto;
                                
                                let colorTecho = "fondo-naranja";
                                if (espesorUtil < XCTechoLims.rojo) colorTecho = "fondo-rojo";
                                else if (espesorUtil >= XCTechoLims.verde) colorTecho = "fondo-verde";

                                const textoTooltip = t('tabla.techoTooltip', {
                                    altitudMSL: altitudMSL,
                                    espesorUtil: espesorUtil,
                                    pct: Math.round(RATIO_TECHO_UTIL * 100),
                                    blh: espesorBLH,
                                    elevacion: Math.round(elevacionModeloECMWF),
                                    defaultValue: '<ul style="margin: 4px 0; padding-left: 16px; text-align: left;"><li>Techo de vuelo estimado (MSL): {{altitudMSL}} m</li><li>Espesor útil ({{pct}}%): {{espesorUtil}} m</li><li>Capa límite original : {{blh}} m AGL</li><li>Elevación modelo de la celda: {{elevacion}} m</li></ul>'
                                });

                                celdaTechoHTML = `<td class="${clasesBase} ${colorTecho}" style="padding-bottom: 0px; font-size: 12px !important; cursor: help;" data-tippy-content="${textoTooltip.replace(/"/g, '&quot;')}" tabindex="0">${txtTecho}</td>`;
                            }
                            htmlTecho += celdaTechoHTML;

                            // === 2. CAPE ===
                            let vCape = hourlyEcmwf.cape[i];
                            let txtCape = "", colorCape = "", bgCape = "";
                            
                            if (vCape != null && vCape !== "") {
                                let n = Math.round(Number(vCape));
                                txtCape = (n >= 1000) ? (n / 1000).toFixed(1) + "k" : n;
                                
                                if (n <= XCCapeLims.idealMax) colorCape = "fondo-verde";
                                else if (n <= XCCapeLims.riesgo) colorCape = "fondo-naranja";
                                else colorCape = "fondo-rojo";
                            }
                            bgCape = (!cacheEsNoche[i] && !colorCape) ? 'background-color: #ffffff;' : '';
                            htmlCape += `<td class="${clasesBase} ${colorCape}" style="padding-bottom: 0px; font-size: 11px !important; ${bgCape}" title="CAPE: ${vCape || 0} J/kg">${txtCape}</td>`;

                            // === 3. CIN ===
                            let vCin = hourlyEcmwf.convective_inhibition[i];
                            let txtCin = "", colorCin = "", bgCin = "";
                            
                            if (vCin != null && vCin !== "") {
                                let n = Math.max(0, Math.round(Number(vCin)));
                                txtCin = (n === 0) ? "0" : n;
                                
                                if (n <= XCCinLims.verde) colorCin = "fondo-verde";
                                else if (n <= XCCinLims.rojo) colorCin = "fondo-naranja";
                                else colorCin = "fondo-rojo";
                            }
                            bgCin = (!cacheEsNoche[i] && !colorCin) ? 'background-color: #ffffff;' : '';
                            htmlCin += `<td class="${clasesBase} ${colorCin}" style="padding-bottom: 0px; font-size: 11px !important; ${bgCin}" title="CIN: ${vCin != null ? Math.max(0, Math.round(Number(vCin))) : 0} J/kg">${txtCin}</td>`;
                        }

                        // Inyección (El DOM se toca 1 sola vez por fila)
                        if (filaTecho) filaTecho.insertAdjacentHTML('beforeend', htmlTecho);
                        if (filaCape) filaCape.insertAdjacentHTML('beforeend', htmlCape);
                        if (filaCin) filaCin.insertAdjacentHTML('beforeend', htmlCin);

                    } else {
                        // Si no hay datos, metemos celdas vacías
                        let htmlVacio = "";
                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            let clase = cacheEsNoche[i] ? "celda-noche" : "";
                            if (setInicioDia.has(i)) clase += " borde-grueso-izquierda";
                            let bg = (!cacheEsNoche[i]) ? 'background-color: #ffffff;' : '';
                            htmlVacio += `<td class="${clase}" style="font-size: 9px !important; ${bg}"></td>`;
                        }
                        if (filaTecho) filaTecho.insertAdjacentHTML('beforeend', htmlVacio);
                        if (filaCape) filaCape.insertAdjacentHTML('beforeend', htmlVacio);
                        if (filaCin) filaCin.insertAdjacentHTML('beforeend', htmlVacio);
                    }

                    // Borde superior del grupo XC
                    if (!chkMostrarCizalladura && chkMostrarXC && filaTecho) {
                        Array.from(filaTecho.children).forEach(td => {
                            td.style.borderTop = "1px solid #000";
                        });
                    }

                    const renderEcmwfSpeedCell = (tr, speedArr) => {
                        if (!tr || !speedArr) return;
                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            const td = document.createElement("td");
                            td.classList.add("ecmwf-neutral");
                            if (cacheEsNoche[i]) td.classList.add("celda-noche");
                            if (setInicioDia.has(i)) td.classList.add("borde-grueso-izquierda");

                            if (!debeMostrarse) {
                                // Despegue colapsado: placeholder, sin formatear el valor real
                                td.textContent = "…";
                            } else {
                                let val = speedArr[i];
                                td.textContent = val !== null ? Math.round(Number(val)) : "—";
                                td.title = val !== null ? `${Math.round(Number(val))} km/h` : "N/A";
                            }
                            tr.appendChild(td);
                        }
                    };

                    const renderEcmwfDirCell = (tr, dirArr, bordeBottomPx) => {
                        if (!tr || !dirArr) return;
                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            const td = document.createElement("td");
                            td.classList.add("ecmwf-neutral");
                            if (cacheEsNoche[i]) td.classList.add("celda-noche");
                            if (setInicioDia.has(i)) td.classList.add("borde-grueso-izquierda");
                            if (bordeBottomPx) td.style.borderBottom = bordeBottomPx;

                            if (!debeMostrarse) {
                                td.textContent = "…";
                            } else {
                                let val = dirArr[i];
                                if (val === null) {
                                    td.textContent = "—";
                                } else {
                                    const dir = Math.round(Number(val));
                                    td.appendChild(crearFlechaViento(dir));
                                    td.title = `${dir}º`;
                                }
                            }
                            tr.appendChild(td);
                        }
                    };

                    // Función matemática de interpolación de viento vectorial mediante geopotenciales para la altitud real
                    const interpolarVientoAltitudReal = (H_target, h1000, h925, h850, h700, v1000, v925, v850, v700, d1000, d925, d850, d700) => {
                        const heights = [h1000, h925, h850, h700];
                        const speeds = [v1000, v925, v850, v700];
                        const directions = [d1000, d925, d850, d700];

                        let points = [];
                        for (let k = 0; k < 4; k++) {
                            const z = heights[k];
                            const v = speeds[k];
                            const d = directions[k];
                            if (z !== null && v !== null && d !== null) {
                                const rad = Number(d) * Math.PI / 180;
                                const u = Number(v) * Math.sin(rad);
                                const v_comp = Number(v) * Math.cos(rad);
                                points.push({ z: Number(z), u, v_comp });
                            }
                        }

                        if (points.length === 0) return null;
                        if (points.length === 1) {
                            const speed = Math.sqrt(points[0].u * points[0].u + points[0].v_comp * points[0].v_comp);
                            const dir = (Math.atan2(points[0].u, points[0].v_comp) * 180 / Math.PI + 360) % 360;
                            return { speed, dir };
                        }

                        points.sort((a, b) => a.z - b.z);

                        let u_interp = null, v_interp = null;
                        const interp = (h, p1, p2, key) => p1[key] + ((h - p1.z) / (p2.z - p1.z)) * (p2[key] - p1[key]);

                        let bracketFound = false;
                        for (let j = 0; j < points.length - 1; j++) {
                            const p1 = points[j];
                            const p2 = points[j+1];
                            if (H_target >= p1.z && H_target <= p2.z) {
                                u_interp = interp(H_target, p1, p2, 'u');
                                v_interp = interp(H_target, p1, p2, 'v_comp');
                                bracketFound = true;
                                break;
                            }
                        }

                        if (!bracketFound) {
                            if (H_target < points[0].z) {
                                u_interp = interp(H_target, points[0], points[1], 'u');
                                v_interp = interp(H_target, points[0], points[1], 'v_comp');
                            } else {
                                u_interp = interp(H_target, points[points.length - 2], points[points.length - 1], 'u');
                                v_interp = interp(H_target, points[points.length - 2], points[points.length - 1], 'v_comp');
                            }
                        }

                        const speed = Math.sqrt(u_interp * u_interp + v_interp * v_interp);
                        const dir = (Math.atan2(u_interp, v_interp) * 180 / Math.PI + 360) % 360;
                        return { speed, dir };
                    };

                    if (mostrarEcmwfDOM) {

                        // Pintar las filas especiales de interpolación vertical (Fijas + Altitud Real)
                        const altReal = Number(d.Altitud) || 0;

                        // Helper para instanciar las celdas de interpolación (Aprovecha los datos calculados)
                        const crearCeldasInterpoladas = (trVel, trDir, altObj, altInfo, indiceHora, bordeTopVel, bordeBottomDirPx) => {
                            const tdVel = document.createElement("td");
                            tdVel.classList.add("ecmwf-neutral");
                            if (cacheEsNoche[indiceHora]) tdVel.classList.add("celda-noche");
                            if (setInicioDia.has(indiceHora)) tdVel.classList.add("borde-grueso-izquierda");
                            tdVel.style.fontSize = "12px";
                            if (bordeTopVel) tdVel.style.borderTop = "1px solid #000";

                            const tdDir = document.createElement("td");
                            tdDir.classList.add("ecmwf-neutral");
                            if (cacheEsNoche[indiceHora]) tdDir.classList.add("celda-noche");
                            if (setInicioDia.has(indiceHora)) tdDir.classList.add("borde-grueso-izquierda");
                            tdDir.style.fontSize = "12px";
                            if (bordeBottomDirPx) tdDir.style.borderBottom = bordeBottomDirPx;

                            if (!debeMostrarse) {
                                // Despegue colapsado: nos ahorramos el cálculo trigonométrico (sin/cos/atan2/sqrt),
                                // solo placeholder visual. Si el usuario expande, el siguiente rebuild calculará el valor real.
                                tdVel.textContent = "…";
                                tdDir.textContent = "…";
                            } else if (!hourlyEcmwf) {
                                tdVel.textContent = "—";
                                tdDir.textContent = "—";
                            } else {
                                const interp = interpolarVientoAltitudReal(
                                    altObj,
                                    hourlyEcmwf.geopotential_height_1000hPa[indiceHora],
                                    hourlyEcmwf.geopotential_height_925hPa[indiceHora],
                                    hourlyEcmwf.geopotential_height_850hPa[indiceHora],
                                    hourlyEcmwf.geopotential_height_700hPa[indiceHora],
                                    hourlyEcmwf.wind_speed_1000hPa[indiceHora],
                                    hourlyEcmwf.wind_speed_925hPa[indiceHora],
                                    hourlyEcmwf.wind_speed_850hPa[indiceHora],
                                    hourlyEcmwf.wind_speed_700hPa[indiceHora],
                                    hourlyEcmwf.wind_direction_1000hPa[indiceHora],
                                    hourlyEcmwf.wind_direction_925hPa[indiceHora],
                                    hourlyEcmwf.wind_direction_850hPa[indiceHora],
                                    hourlyEcmwf.wind_direction_700hPa[indiceHora]
                                );

                                if (interp === null) {
                                    tdVel.textContent = "—";
                                    tdDir.textContent = "—";
                                } else {
                                    const vRound = Math.round(interp.speed);
                                    const dRound = Math.round(interp.dir);

                                    tdVel.textContent = vRound;
                                    tdVel.title = `${vRound} km/h (Velocidad interpolada verticalmente para la altura de ${altInfo} m)`;

                                    tdDir.appendChild(crearFlechaViento(dRound));
                                    tdDir.title = `${dRound}º (Dirección interpolada verticalmente para la altura de ${altInfo} m)`;
                                }
                            }
                            trVel.appendChild(tdVel);
                            trDir.appendChild(tdDir);
                        };

                        for (let i = indiceInicioRangoHorario; i <= limiteFin; i++) {
                            // Ejecutamos la interpolación para cada piso en altitud fija
                            // (bordes aplicados directamente en la creación: top solo en 3000m, bottom fino en 1500/1000m, grueso en 500m y altitud real)
                            crearCeldasInterpoladas(filaEcmwfVel3000, filaEcmwfDir3000, 3000, 3000, i, true, "1px solid #000");
                            crearCeldasInterpoladas(filaEcmwfVel1500, filaEcmwfDir1500, 1500, 1500, i, false, "1px solid #000");
                            crearCeldasInterpoladas(filaEcmwfVel1000, filaEcmwfDir1000, 1000, 1000, i, false, "1px solid #000");
                            crearCeldasInterpoladas(filaEcmwfVel500,  filaEcmwfDir500,  500,  500,  i, false, "2px solid #000");

                            // Interpolación maestra para la altitud real del despegue
                            crearCeldasInterpoladas(filaEcmwfValt, filaEcmwfDalt, altReal, altReal, i, false, "2px solid #000");
                        }
                    }
				}
			}

            // ---------------------------------------------------------------
			// 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Condiciones
			// ---------------------------------------------------------------
				
			const tdCondiciones = document.createElement("td");
			
            const valorVisual = horasValidas > 0 ? Math.round(notaFinal) : "-";
			
			tdCondiciones.textContent = valorVisual;
            
            // La Puntuación principal ocupa ÚNICAMENTE las filas del Grupo 1
            tdCondiciones.rowSpan = rowsGroup1.length; 	
            
            tdCondiciones.style.fontWeight = "bold";
			tdCondiciones.classList.add("borde-grueso-izquierda", "borde-grueso-abajo", "borde-grueso-derecha", "celda-condiciones-inicio");
            //tdCondiciones.style.cursor = "help"; 

            if (horasValidas > 0) {
                tdCondiciones.title = `Nota Condiciones despegue: ${notaFinal.toFixed(1)} puntos`;
            } else {
                tdCondiciones.title = "Sin datos suficientes para puntuar";
            }
			
            if (valorVisual !== "-") {
                // El color ahora responde a la notaFinal2 (valorVisual)
                tdCondiciones.style.backgroundColor = coloresNota[valorVisual];
            } else {
                tdCondiciones.style.backgroundColor = "#f0f0f0"; 
            }
			
			if (!modoEdicionFavoritos) {
                if (rowsGroup1.length > 0) {
				    rowsGroup1[0].appendChild(tdCondiciones);	
                }

                // NUEVO: Añadir celda hueca (puente) si el grupo ECMWF (vientos de altura) está activo
                if (debeMostrarse && rowsEcmwfWind.length > 0) {
                    const tdHueco = document.createElement("td");
                    tdHueco.rowSpan = rowsEcmwfWind.length;
                    
                    // Mantenemos bordes gruesos laterales
                    tdHueco.classList.add("borde-grueso-izquierda", "borde-grueso-derecha");
                    tdHueco.style.backgroundColor = "#ffffff";
                    
                    tdHueco.style.borderBottom = "2px solid #000";
                    
                    // Si el grupo de abajo (XC) no existe, quitamos la fina, ponemos la gruesa y redondeamos
                    if (rowsGroup2.length === 0) {
                        tdHueco.style.borderBottom = ""; // Limpiamos la línea fina
                        tdHueco.classList.add("borde-grueso-abajo", "celda-condiciones-final");
                    }
                    
                    rowsEcmwfWind[0].appendChild(tdHueco);
                }

                // Añadimos la NUEVA puntuación en la misma columna vertical, pero para el bloque del Grupo 2 (XC)
                if (rowsGroup2.length > 0) {
                    const tdCondicionesXC = document.createElement("td");
                    
                    let valorVisualXC = horasValidasXC > 0 ? Math.round(notaFinalXC) : "-";
                    
                    tdCondicionesXC.textContent = valorVisualXC;
                    tdCondicionesXC.rowSpan = rowsGroup2.length;
                    tdCondicionesXC.style.fontWeight = "bold";
                    tdCondicionesXC.style.textAlign = "center";
                    tdCondicionesXC.classList.add("borde-grueso-izquierda", "borde-grueso-abajo", "borde-grueso-derecha", "celda-condiciones-final");

                    if (valorVisualXC !== "-") {
                        tdCondicionesXC.style.backgroundColor = coloresNota[valorVisualXC];
                        tdCondicionesXC.style.color = "#000";
                        tdCondicionesXC.title = `Nota Condiciones XC: ${notaFinalXC.toFixed(1)} puntos`;
                    } else {
                        tdCondicionesXC.style.backgroundColor = "#f0f0f0";
                        tdCondicionesXC.style.color = "#888";
                        tdCondicionesXC.title = "Sin datos suficientes para puntuar XC";
                    }

                    rowsGroup2[0].appendChild(tdCondicionesXC);
                } else if (!debeMostrarse) {
                    // Si no hay Grupo 2 (XC) ni Grupo ECMWF, la celda principal se redondea por abajo
                    tdCondiciones.classList.add("celda-condiciones-final");
                }
			}

            // 2. Guardamos el grupo en la lista para ordenar
			listaFilasParaOrdenar.push({
				nota: horasValidas > 0 ? notaFinal : -1, 
				notaXC: horasValidasXC > 0 ? notaFinalXC : -1, // Guardamos también la nota XC
				elementos: todasLasFilas 
			});

		} // <--- FIN DEL BUCLE despegues.forEach
		
		// =========================================================
        // 🚀 NUEVA LÓGICA DE PAGINACIÓN Y FILTRADO PRE-DOM
        // =========================================================
        
        // 1. Extraemos el valor del Buscador. 
        // Usamos un nombre de variable distinto para no chocar con el global.
        const inputBusquedaLocal = document.getElementById('buscador-despegues-provincias');
        const filtroTexto = inputBusquedaLocal ? inputBusquedaLocal.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

        // Usamos 'distanciaLimite' que ya fue calculada mágicamente en la línea 2552 de tu código original
        const centroLatFiltro = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL')) || null;
        const centroLonFiltro = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LON_INICIAL')) || null;

        // 2. Filtramos la lista en memoria (Súper rápido) en lugar de ocultar con CSS
        let filasValidas = listaFilasParaOrdenar.filter(item => {
            const filaPrincipal = item.elementos[0];
            
            // Comprobar Texto
            let txtCelda = "";
            if (modoEdicionFavoritos) {
                txtCelda = (filaPrincipal.cells[1]?.textContent + " " + filaPrincipal.cells[2]?.textContent + " " + filaPrincipal.cells[3]?.textContent + " " + filaPrincipal.cells[4]?.textContent);
            } else {
                txtCelda = filaPrincipal.cells[0]?.textContent || "";
            }
            txtCelda = txtCelda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const pasaTexto = filtroTexto === "" || txtCelda.includes(filtroTexto);

            // Comprobar Distancia usando 'distanciaLimite'
            let pasaDistancia = true;
            if (distanciaLimite < 9999 && centroLatFiltro !== null && centroLonFiltro !== null) {
                const lat = parseFloat(filaPrincipal.dataset.lat);
                const lon = parseFloat(filaPrincipal.dataset.lon);
                if (!isNaN(lat) && !isNaN(lon)) {
                    if (obtenerDistanciaKm(centroLatFiltro, centroLonFiltro, lat, lon) > distanciaLimite) {
                        pasaDistancia = false;
                    }
                }
            }
            return pasaTexto && pasaDistancia;
        });

        // 3. Ordenamos SÓLO los que han pasado el filtro
        if (!modoEdicionFavoritos) {
            filasValidas.sort((a, b) => {
                if (chkOrdenarPorXC && chkMostrarXC) {
                    if (b.notaXC === a.notaXC) return b.nota - a.nota;
                    return b.notaXC - a.notaXC;
                } else {
                    if (b.nota === a.nota) return b.notaXC - a.notaXC;
                    return b.nota - a.nota;
                }
            });
        }

        // 4. PAGINACIÓN ("MOSTRAR TODOS")
        const LIMITE_INICIAL = 10;
        
        // Si estamos editando favoritos, NO paginamos. Mostramos la lista completa.
        const usarPaginacion = !modoEdicionFavoritos;

        const maxMostrar = usarPaginacion 
            ? Math.min(window.limitePaginacionMeteo || LIMITE_INICIAL, filasValidas.length)
            : filasValidas.length;

        // Solo metemos en el DOM el bloque permitido (o todos si la paginación está desactivada)
        for (let i = 0; i < maxMostrar; i++) {
            filasValidas[i].elementos.forEach(fila => {
                tbodyFragmento.appendChild(fila);
            });
        }

        // Si quedan despegues sin mostrar y la paginación está activa, añadimos el botón final
        if (usarPaginacion && maxMostrar < filasValidas.length) {
            const trBtn = document.createElement("tr");
            const tdBtn = document.createElement("td");
            tdBtn.colSpan = 100; // Ocupa todo el ancho de la tabla
            tdBtn.style.textAlign = "center";
            tdBtn.style.padding = "20px 10px 35px 10px"; // Mucho espacio para que respire
            tdBtn.style.backgroundColor = "transparent"; // Fondo invisible
            tdBtn.style.border = "none";

            const btn = document.createElement("button");
            
            const textoTraducido = t('botones.mostrarTodos', { 
                n: filasValidas.length, 
                defaultValue: `Mostrar todos (${filasValidas.length})` 
            });

            btn.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                </svg> 
                ${textoTraducido}
            `;
            
            // Diseño moderno e imposible de cortar
            btn.style.display = "inline-flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.gap = "8px";
            btn.style.width = "100%";
            btn.style.maxWidth = "350px";
            btn.style.padding = "16px 20px";
            btn.style.fontSize = "18px";
            btn.style.fontWeight = "bold";
            btn.style.color = "#0056b3"; // Texto azul oscuro
            btn.style.backgroundColor = "#e7f5ff"; // Fondo azul muy clarito
            btn.style.border = "2px solid #007aff"; // Borde azul brillante
            btn.style.borderRadius = "12px";
            btn.style.cursor = "pointer";
            btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";

            // Efecto click
            btn.onmousedown = function() { this.style.transform = "scale(0.97)"; };
            btn.onmouseup = function() { this.style.transform = "scale(1)"; };

            // Al hacer clic, mostramos TODOS de golpe
            btn.onclick = function(e) {
                e.preventDefault();
                window.vibrarDispositivo();
                
                mostrarLoading(0); 

                window.limitePaginacionMeteo = 99999; 
                
                setTimeout(() => {
                    construir_tabla(false, true); 
                    ocultarLoading(); 
                }, 50);
            };

            tdBtn.appendChild(btn);
            trBtn.appendChild(tdBtn);
            tbodyFragmento.appendChild(trBtn);
        }

        // 5. Inyección en el HTML
        tbody.appendChild(tbodyFragmento);
        tabla.innerHTML = "";
        tabla.appendChild(thead);
        tabla.appendChild(tbody);

        // 6. Actualizamos los contadores visuales
        if (typeof window.actualizarContadoresVisualesRapidos === 'function') {
            window.actualizarContadoresVisualesRapidos(filasValidas.length, filtroTexto, distanciaLimite);
        }

		if (soloHorasDeLuz) {
			const chk = document.getElementById("chkMostrarSoloHorasDiurnas");
			if (chk) chk.checked = true;
			document.body.classList.add("solo-dia");
		}

        // 4. Lógica de salida: con o sin animación
		if (!silencioso) {
			setTimeout(() => {

                ocultarLoading(); 

                localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO');
                localStorage.removeItem('METEO_CRASH_COUNTER');
                
                // Restauramos el scroll guardado SOLO si no estamos en vista previa (un solo despegue)
                if (!window.despegueTemporalParaTabla && window.guardarScrollY !== undefined && window.guardarScrollY !== null) {
                    const wrapper = document.querySelector('.tabla-wrapper');
                    if (wrapper) wrapper.scrollTop = window.guardarScrollY;
                    window.guardarScrollY = null; // Reseteamos
                    return; // Salimos sin hacer más scroll
                }

                // para que no haga scroll si vamos a contruir tabla desde el botón "Volver a edición de favoritos"
                if (window.saltarScrollTop > 0) {
                    window.saltarScrollTop--;
                    return;
                }

                const vistaMapa = document.getElementById('vista-mapa');

                if (vistaMapa && vistaMapa.style.display === 'flex') {
                    window.necesitaScrollTopMeteo = true;
                } else {
                    const scrollOptions = { top: 0, behavior: 'smooth' };
                    const wrapper = document.querySelector('.tabla-wrapper');
                    if (wrapper) wrapper.scrollTo(scrollOptions);
                    const principal = document.querySelector('.contenedor-principal-tabla');
                    if (principal) principal.scrollTo(scrollOptions);
                    window.scrollTo(scrollOptions);
                    window.necesitaScrollTopMeteo = false;
                }
            }, 50); 
		} else {
			// En modo silencioso no tocamos el scroll ni mostramos loader
			localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO');
			localStorage.removeItem('METEO_CRASH_COUNTER');

            // Red de seguridad: si saltarScrollTop se incrementó pensando en esta
			// reconstrucción pero resultó ser silenciosa, lo consumimos igualmente.
			// Una llamada silenciosa nunca hace scroll, así que no hay nada que
			// "saltar" aquí, pero si no lo consumimos el contador queda flotando
			// y se come por error el scroll-top de una futura acción no relacionada.
			if (window.saltarScrollTop > 0) {
				window.saltarScrollTop--;
			}
		}		

        // --- ACTUALIZAR MAPA SI ESTABA VISIBLE (Para reconexiones y recargas) ---
        if (!skipMapaUpdate) {
            const vistaMapa = document.getElementById('vista-mapa');
            if (vistaMapa && vistaMapa.style.display === 'flex' && typeof marcarOperativosEnMarkers === 'function') {
                if (typeof filtrosMapaAbiertos !== 'undefined' && filtrosMapaAbiertos) {
                    marcarOperativosEnMarkers();
                    aplicarPuntuacionEnMapa();
                } else {
                    actualizarFiltrosMapa();
                }
            }
        }

        // Forzamos la evaluación de seguridad al arrancar la app
        if (typeof evaluarEstadoNuevosUsuarios === 'function') evaluarEstadoNuevosUsuarios();

	} // cierre de: try {

	catch (error) {
		console.error("Error en la aplicación:", error);
		ocultarLoading();
        localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO');
	}
} // cierre de: async function construir_tabla() {

// ---------------------------------------------------------------
// 🟦🟦🟦🟦🟦 FUNCIONES
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 🔴 OTRAS FUNCIONES. FUNCIONES AUXILIARES
// ---------------------------------------------------------------

// Variables y Constantes
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const URL_OPEN_METEO_API_META_MODELO = "https://api.open-meteo.com/data/meteofrance_arome_france_hd/static/meta.json";

//Formatea un objeto Date para mostrar la fecha y hora en la ZONA HORARIA LOCAL del usuario.
function formatLocal(d) {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = MESES[d.getMonth()];
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');  // getHours() devuelve la hora local.
    const minutos = String(d.getMinutes()).padStart(2, '0');
    
    return `${dia}-${mes}-${anio} ${hora}:${minutos}`;
}

function formatHourUTC(d) {
    const hora = String(d.getUTCHours()).padStart(2, '0');
    return `${hora}`;  // Retorna "HH"
}

function formatTimeAgo(timestampBase, timestampActual) {
    const diffMs = timestampActual - timestampBase;
    
    if (diffMs < 0) return 'justo ahora'; 
    
    if (diffMs < 60000) return ' < 1 min'; 
    
    const totalSegundos = Math.floor(diffMs / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);

    let resultado = '';
    if (horas > 0) {
        resultado += `${horas} h `;
    }
    resultado += `${minutos} min`;

    return resultado.trim();
}

function alternardivDistancia(event) {
    const divDistancia = document.getElementById("div-filtro-distancia");
    if (!divDistancia) return;

    const activo = divDistancia.classList.contains("activo");

    // 1. Cerramos panel de configuración
    const panelConfig = document.getElementById("div-configuracion");
    if (panelConfig) panelConfig.classList.remove("activo");

    // Deshundo botón antiguo si existe (Seguridad)
    const btnConfigAntiguo = document.getElementById("btn-div-configuracion-toggle");
    if (btnConfigAntiguo) btnConfigAntiguo.classList.remove("activo");

    if (typeof setModoEnfoque === "function") { setModoEnfoque(false); }

    if (activo) {
        // Si el panel ya estaba abierto, reseteamos el filtro y lo ocultamos
        if (typeof resetFiltroDistancia === "function") {
            resetFiltroDistancia(true);
        } else {
            divDistancia.classList.remove("activo");
        }
    } else {
        // --- NUEVO: REGLA DE EXCLUSIÓN MUTUA CON EL BUSCADOR ---
        const searchContainer = document.getElementById('floating-search-container');
        const searchInput = document.getElementById('buscador-despegues-provincias');
        const isSearchOpen = searchContainer && !searchContainer.classList.contains('floating-search-hidden');
        
        // Si el buscador está abierto pero vacío, lo cerramos para no saturar la pantalla
        if (isSearchOpen && searchInput && searchInput.value.trim() === '') {
            if (typeof window.toggleBuscadorFlotante === 'function') {
                window.toggleBuscadorFlotante();
            }
        }
        // --------------------------------------------------------

        // 2. Mostramos el panel de distancia
        divDistancia.classList.add("activo");

        /* EL FIX PARA EL SLIDER BLOQUEADO */
        setTimeout(() => {
            const sliderElement = document.getElementById('distancia-slider');
            if (sliderElement && sliderElement.noUiSlider) {
                sliderElement.noUiSlider.updateOptions({}, true);
            }
        }, 50); 
    }
}

function alternardivConfiguracion(event, forzarCierreAcordeones = false) {
    const divconfiguracion = document.getElementById("div-configuracion");
    if (!divconfiguracion) return;

    const estabaActivo = divconfiguracion.classList.contains("activo");

    divconfiguracion.classList.toggle("activo", !estabaActivo);
    
    // 🚀 NUEVO: Si se está cerrando y el parámetro es true, replegamos los acordeones
    if (estabaActivo && forzarCierreAcordeones) {
        const acordeones = divconfiguracion.querySelectorAll('details.config-accordion');
        acordeones.forEach(acc => acc.removeAttribute('open'));
    }
    
    const btnConfigAntiguo = document.getElementById("btn-div-configuracion-toggle");
    if (btnConfigAntiguo) btnConfigAntiguo.classList.toggle("activo", !estabaActivo);

    if (typeof setModoEnfoque === "function") { setModoEnfoque(!estabaActivo); }

    // --- NUEVA LÓGICA: MEMORIA DEL BOTÓN PREVIO ---
    if (typeof window.activarMenuInferior === 'function') {
        if (!estabaActivo) {
            // Si vamos a ABRIR Ajustes, guardamos en la memoria qué botón estaba encendido
            window.botonPrevioAjustes = document.querySelector('.bottom-nav .nav-item.active');
            window.activarMenuInferior(document.getElementById('nav-settings'));
        } else {
            // Si vamos a CERRAR Ajustes, recuperamos la memoria
            if (window.botonPrevioAjustes && window.botonPrevioAjustes.id !== 'nav-settings') {
                window.activarMenuInferior(window.botonPrevioAjustes);
            } else {
                // Fallback de seguridad por si no había memoria
                const vistaMapa = document.getElementById('vista-mapa');
                const searchContainer = document.getElementById('floating-search-container');
                const panelDistancia = document.getElementById('div-filtro-distancia');

                if (vistaMapa && vistaMapa.style.display === 'flex') {
                    window.activarMenuInferior(document.getElementById('nav-map'));
                } else if (searchContainer && !searchContainer.classList.contains('floating-search-hidden')) {
                    window.activarMenuInferior(document.getElementById('nav-search'));
                } else if (panelDistancia && panelDistancia.classList.contains('activo')) {
                    window.activarMenuInferior(document.getElementById('nav-distance'));
                } else {
                    window.activarMenuInferior(document.getElementById('nav-home'));
                }
            }
        }
    }
}

function btnRestablecerConfiguración() {

	GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: t('ajustes.avisoResetConfigHtml'),
        botones: [            
            {
				texto: t('botones.cancelar'),
				onclick: function() {
					GestorMensajes.ocultar();
				},
				estilo: 'secundario'
			},
			{ 
                texto: t('botones.aceptar'), 
				onclick: function() {
                GestorMensajes.ocultar();
				localStorage.clear();
                location.reload();
            }
            }
		]
    });
}

function diferenciaAngular(a, b) {
	let d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

function colorPorDiferencia(d) {
	if (d <= 22) return "fondo-verde";
	if (d <= 45) return "fondo-naranja";
	return "fondo-rojo";
}

function recargarPagina() {
    location.reload();
}

let timerLoader = null; // Variable global para controlar el tiempo

const mostrarLoading = (retraso = 250) => {
    // Si ya había un temporizador, lo cancelamos
    if (timerLoader) clearTimeout(timerLoader);
    
    // Programamos la aparición del cartel tras 'X' milisegundos
    timerLoader = setTimeout(() => {
        const overlay = document.getElementById('msgActualizando...');
        if (overlay) {
            overlay.classList.add('loader-activo');
        }
    }, retraso);
};

const ocultarLoading = () => {
    // Desactivamos la bandera inmediatamente al terminar
    window.loadingActivoActualmente = false;

    if (timerLoader) {
        clearTimeout(timerLoader);
        timerLoader = null;
    }
    
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) {
        overlay.classList.remove('loader-activo');
        
        // Limpiamos la clase transparente para que el spinner vuelva a ser oscuro y bloqueante la próxima vez que se use en la app.
        overlay.classList.remove('spinner-transparente'); 
        
        void overlay.offsetWidth; // Forzar repintado instantáneo en la GPU
    }
};

/* Envuelve operaciones pesadas. Fuerza al navegador a pintar el spinner ANTES de congelarse calculando y es inteligente al ocultarlo. */
function ejecutarOperacionPesada(tareaCallback) {
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) {
        overlay.classList.add('loader-activo');
    }

    setTimeout(() => {
        const idAntes = ultimoIdLlamadaTabla;

        tareaCallback();

        // Si la tabla no se ha llamado, O si se ha llamado pero de forma silenciosa (como en el mapa),
        // apagamos el spinner inmediatamente aquí.
        if (ultimoIdLlamadaTabla === idAntes || window.ultimoConstruirTablaSilencioso) {
            ocultarLoading();
        }
    }, 50); 
}

// Genera un icono de 5 barras tipo "cobertura" según la actividad (1 a 5)
function crearIconoActividad(nivelStr) {
    const nivel = parseInt(nivelStr) || 0;
    if (nivel === 0) return ''; // Si no hay dato, no pintamos nada

    let barras = '';
    // Alturas en enteros exactos hasta llegar a 16px (suben de 3 en 3)
    const alturas = [4, 7, 10, 13, 16]; 
    
    for (let i = 0; i < 5; i++) {
        const color = (i < nivel) ? '#5b5b5b' : '#e9e9e9'; 
        // Anchura 3px (entero = grosor perfecto) y border-radius de 1.5px (mitad exacta para curva suave arriba)
        barras += `<span style="display: inline-block; width: 3px; height: ${alturas[i]}px; background-color: ${color}; border-radius: 1.5px 1.5px 0 0;"></span>`;
    }

    return `
        <span style="display: inline-flex; justify-content: space-between; align-items: flex-end; width: 20px; height: 16px; margin-left: -3px; vertical-align: -2px; outline: none;" tabindex="0">
            ${barras}
        </span>
    `;
}

window.toggleEcmwfDesplegable = function(e, idDespegue) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    const wrapper = document.querySelector('.tabla-wrapper');
    if (wrapper) {
        window.guardarScrollY = wrapper.scrollTop;
    }

    const idNum = Number(idDespegue);
    const estaExpandido = window.sessionExpandedEcmwfTakeoffs.has(idNum);

    if (estaExpandido) {
        window.sessionExpandedEcmwfTakeoffs.delete(idNum);
    } else {
        window.sessionExpandedEcmwfTakeoffs.add(idNum);
    }

    construir_tabla(false, false);

    if (typeof window.vibrarDispositivo === 'function') window.vibrarDispositivo();
};

window.cambiarModoEcmwf = function(nuevoModo) {

    if (typeof window.vibrarDispositivo === 'function') {
        window.vibrarDispositivo();
    }
    // Guardamos la preferencia en memoria de sesión
    localStorage.setItem("METEO_CONFIG_ECMWF_MODE", nuevoModo);
    
    // Sincronizamos las variables que lee el renderizador de la tabla
    chkMostrarVientoEcmwf = (nuevoModo === "permanente");
    chkMostrarVientoEcmwfDesplegable = (nuevoModo === "desplegable");
    
    // Si el usuario apaga la opción, limpiamos los despegues expandidos de esta sesión
    if (nuevoModo === "off") {
        window.sessionExpandedEcmwfTakeoffs.clear();
    }

    // Forzamos actualización de la tabla con loader sutil de 50ms
    mostrarLoading(50);
    requestAnimationFrame(() => requestAnimationFrame(() => construir_tabla()));
};

async function comprobarVersionApp() {
    // 1. Solo tiene sentido en la App Nativa (Android/iOS)
    const isNative = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
    if (!isNative) return;

    // 2. Si el usuario ya decidió "No volver a mostrar", salimos
    if (localStorage.getItem('METEO_IGNORAR_ACTUALIZACION') === 'true') return;

    // 3. Si el usuario decidió "Posponer", comprobamos si ya ha pasado el tiempo (ej: 3 días)
    const fechaPosponer = localStorage.getItem('METEO_POSPONER_ACTUALIZACION');
    if (fechaPosponer) {
        const tiempoPasado = Date.now() - parseInt(fechaPosponer, 10);
        const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
        if (tiempoPasado < tresDiasMs) return; // Aún no han pasado 3 días
    }

    try {
        // 4. Descargamos la última versión del servidor (silenciosamente)
        const response = await fetch("https://flydecision.com/version_app.txt?t=" + Date.now(), { cache: "no-store" });
        if (!response.ok) return;

        const versionServidor = (await response.text()).trim();
        const versionLocal = window.WEB_VERSION || "0.0.0";

        // Función auxiliar simple para comparar versiones (ej: "3.9.0" vs "3.8.5")
        const versionToNum = (v) => v.split('.').map(n => parseInt(n) || 0);
        const vS = versionToNum(versionServidor);
        const vL = versionToNum(versionLocal);

        let necesitaActualizar = false;
        if (vS[0] > vL[0]) necesitaActualizar = true; // Mayor (Major)
        else if (vS[0] === vL[0] && vS[1] > vL[1]) necesitaActualizar = true; // Menor (Minor)
        else if (vS[0] === vL[0] && vS[1] === vL[1] && vS[2] > vL[2]) necesitaActualizar = true; // Parche (Patch)

        if (necesitaActualizar) {
            
            // Textos traducidos o fallback
            const titulo = typeof t === 'function' ? t('actualizacionApp.titulo', {defaultValue: '🚀 Nueva versión disponible'}) : '🚀 Nueva versión disponible';
            const mensaje = typeof t === 'function' ? 
                t('actualizacionApp.mensaje', {vS: versionServidor, defaultValue: `Hay una nueva versión de Fly Decision en Google Play.`}) : 
                `Hay una nueva versión de Fly Decision en Google Play.`;
            
            const btnActualizar = typeof t === 'function' ? t('actualizacionApp.btnActualizar', {defaultValue: 'Actualizar ahora'}) : 'Actualizar ahora';
            const btnChangelog = typeof t === 'function' ? t('actualizacionApp.btnChangelog', {defaultValue: 'Ver novedades'}) : 'Ver novedades';
            const btnPosponer = typeof t === 'function' ? t('actualizacionApp.btnPosponer', {defaultValue: 'Recordármelo en 3 días'}) : 'Recordármelo en 3 días';
            const btnIgnorar = typeof t === 'function' ? t('actualizacionApp.btnIgnorar', {defaultValue: 'No volver a mostrar'}) : 'No volver a mostrar';

            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: `
                    <div style="text-align: center;">
                        <p style="font-size: 1.3em; font-weight: bold; margin-bottom: 10px;">${titulo}</p>
                        <p style="margin-bottom: 20px; line-height: 1.4;">${mensaje}</p>
                        
                        <!-- Enlace al Changelog (Se abre fuera) -->
                        <a href="#" onclick="abrirLinkExterno('https://flydecision.com/changelog/'); return false;" style="color: #0078d4; text-decoration: underline; font-weight: bold; margin-bottom: 20px; display: inline-block;">
                            ${btnChangelog}
                        </a>
                        <br>
                        
                        <!-- Botón de Actualizar (Azul Principal) -->
                        <button onclick="abrirLinkExterno('https://play.google.com/store/apps/details?id=com.flydecision'); GestorMensajes.ocultar();" style="width: 250px; background: #0078d4; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                            ${btnActualizar}
                        </button>
                    </div>
                `,
                botones: [
                    {
                        // Botón Ignorar
                        texto: btnIgnorar,
                        estilo: 'secundario',
                        onclick: function() {
                            localStorage.setItem('METEO_IGNORAR_ACTUALIZACION', 'true');
                            GestorMensajes.ocultar();
                        }
                    },
                    {
                        // Botón Posponer
                        texto: btnPosponer,
                        estilo: 'secundario',
                        onclick: function() {
                            localStorage.setItem('METEO_POSPONER_ACTUALIZACION', Date.now().toString());
                            GestorMensajes.ocultar();
                        }
                    }
                ],
                anchoBotones: 250
            });
        }
    } catch (e) {
        console.warn("No se pudo comprobar la versión de la app", e);
    }
}

// ---------------------------------------------------------------
// 🟡 Modo Simple / Avanzado
// ---------------------------------------------------------------

function aplicarModoSimpleUI() {
    const simple = localStorage.getItem("METEO_MODO_SIMPLE") === "true";
    document.body.classList.toggle('modo-simple', simple);
}
window.aplicarModoSimpleUI = aplicarModoSimpleUI;

window.cambiarModoApp = function(esSimple, evitarRecarga = false) {
    localStorage.setItem("METEO_MODO_SIMPLE", esSimple ? "true" : "false");
    localStorage.setItem("METEO_MODO_ELEGIDO", "true");
    aplicarModoSimpleUI();

    aplicarReglasModoSimpleAVariables(esSimple);

    if (esSimple) {
        resetearOpcionesAvanzadas(evitarRecarga);
    } else if (!evitarRecarga) {
        if (typeof construir_tabla === 'function') {
            construir_tabla();
        }
    }
};

function resetearOpcionesAvanzadas(evitarRecarga = false) {
    if (typeof modoVerTodosLosDias !== 'undefined' && modoVerTodosLosDias && typeof window.toggleVerTodosLosDias === 'function') {
        window.toggleVerTodosLosDias();
    }
    if (typeof resetFiltroDistancia === 'function') {
        resetFiltroDistancia(false); 
    }
    if (typeof soloSeguimiento !== 'undefined' && soloSeguimiento && typeof filtroVerSoloSeguimiento === 'function') {
        filtroVerSoloSeguimiento(); 
    }

    // Limpiamos los estados de filtros del mapa
    localStorage.removeItem('METEO_MAPA_MINIMOVUELOS');
    localStorage.removeItem('METEO_MINIMO_ANO_ULTIMO_VUELO');
    localStorage.removeItem('METEO_MAPA_FILTRO_FAV');
    localStorage.removeItem('METEO_MAPA_FILTRO_SEG');
    localStorage.removeItem('METEO_MAPA_FILTRO_ACT');

    // Sincronizamos los sliders del mapa a su origen
    const sliderVuelosFiltro = document.getElementById('sliderVuelos');
    const textoVuelosFiltro = document.getElementById('valorVuelosTexto');
    if (sliderVuelosFiltro) sliderVuelosFiltro.value = '0';
    if (textoVuelosFiltro) textoVuelosFiltro.innerText = ESCALA_VUELOS[0] || 0;

    const sliderUltimoVueloFiltro = document.getElementById('sliderUltimoVuelo');
    const textoUltimoVueloFiltro = document.getElementById('valorUltimoVueloTexto');
    if (sliderUltimoVueloFiltro) sliderUltimoVueloFiltro.value = '0';
    if (textoUltimoVueloFiltro) textoUltimoVueloFiltro.innerText = (typeof t === 'function' ? t('mapa.todos') : 'Todos');

    // Resetear las variables lógicas
    if (typeof filtroFavoritosMapa !== 'undefined') filtroFavoritosMapa = 0;
    if (typeof filtroSeguimientoMapa !== 'undefined') filtroSeguimientoMapa = 0;
    if (typeof filtroActividadMapa !== 'undefined') filtroActividadMapa = 1;
    
    if (typeof actualizarBotonFavoritosMapa === 'function') actualizarBotonFavoritosMapa();
    if (typeof actualizarBotonSeguimientoMapa === 'function') actualizarBotonSeguimientoMapa();

    const sliderAct = document.getElementById('sliderActividad');
    const txtAct = document.getElementById('valorActividadTexto');
    if (sliderAct) sliderAct.value = 1;
    if (txtAct) {
        // Truco rápido para re-pintar el 1/5 sin necesitar la función renderizarTextoActividad
        txtAct.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; vertical-align:middle; margin-left: 6px; margin-top: -3px;"><span style="display: inline-flex; justify-content: space-between; align-items: flex-end; width: 20px; height: 16px; margin-left: -3px; vertical-align: -2px; outline: none;"><span style="display: inline-block; width: 3px; height: 4px; background-color: #5b5b5b; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 7px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 10px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 13px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 16px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span></span><span>1/5</span></span>`;
    }

    const orientaciones = document.querySelectorAll('.filtro-orientacion-checkbox');
    orientaciones.forEach(c => c.checked = false);

    if (typeof mapaInicializado !== 'undefined' && mapaInicializado) {
        if (typeof window.actualizarFiltrosMapa === 'function') window.actualizarFiltrosMapa();
        if (typeof window.actualizarEstadoVisualFiltros === 'function') window.actualizarEstadoVisualFiltros();
    }

    if (!evitarRecarga && typeof construir_tabla === 'function') {
        construir_tabla();
    }
}
window.resetearOpcionesAvanzadas = resetearOpcionesAvanzadas;

// Función para resetear todos los filtros en vivo del mapa
window.resetearFiltrosMapaEnVivo = function() {
    // 1. Resetear las variables lógicas principales
    filtroFavoritosMapa = 0;
    filtroSeguimientoMapa = 0;
    filtroActividadMapa = 1;

    // Si recordar filtros está activo, vaciamos también la memoria de esta sesión
    if (localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true') {
        localStorage.setItem('METEO_MAPA_MINIMOVUELOS', '0');
        localStorage.setItem('METEO_MINIMO_ANO_ULTIMO_VUELO', '0');
        localStorage.setItem('METEO_MAPA_FILTRO_FAV', '0');
        localStorage.setItem('METEO_MAPA_FILTRO_SEG', '0');
        localStorage.setItem('METEO_MAPA_FILTRO_ACT', '1');
        localStorage.setItem('METEO_MAPA_FILTRO_ORI', '[]');
    }

    // 2. Resetear Sliders visuales del mapa
    const sliderVuelosFiltro = document.getElementById('sliderVuelos');
    const textoVuelosFiltro = document.getElementById('valorVuelosTexto');
    if (sliderVuelosFiltro) sliderVuelosFiltro.value = '0';
    if (textoVuelosFiltro) textoVuelosFiltro.innerText = '0';

    const sliderUltimoVueloFiltro = document.getElementById('sliderUltimoVuelo');
    const textoUltimoVueloFiltro = document.getElementById('valorUltimoVueloTexto');
    if (sliderUltimoVueloFiltro) sliderUltimoVueloFiltro.value = '0';
    if (textoUltimoVueloFiltro) {
        textoUltimoVueloFiltro.innerText = (typeof t === 'function' ? t('mapa.todos') : 'Todos');
    }

    const sliderAct = document.getElementById('sliderActividad');
    const txtAct = document.getElementById('valorActividadTexto');
    if (sliderAct) sliderAct.value = 1;
    if (txtAct) {
        txtAct.innerHTML = `<span style="display:inline-flex; align-items:center; gap:5px; vertical-align:middle; margin-left: 6px; margin-top: -3px;"><span style="display: inline-flex; justify-content: space-between; align-items: flex-end; width: 20px; height: 16px; margin-left: -3px; vertical-align: -2px; outline: none;"><span style="display: inline-block; width: 3px; height: 4px; background-color: #5b5b5b; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 7px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 10px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 13px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span><span style="display: inline-block; width: 3px; height: 16px; background-color: #e9e9e9; border-radius: 1.5px 1.5px 0 0;"></span></span><span>1/5</span></span>`;
    }

    // 3. Sincronizar botones de Favoritos y Seguimiento rápidos
    if (typeof actualizarBotonFavoritosMapa === 'function') actualizarBotonFavoritosMapa();
    if (typeof actualizarBotonSeguimientoMapa === 'function') actualizarBotonSeguimientoMapa();

    // 4. Limpiar los botones de la rosa de los vientos (Orientaciones)
    const orientaciones = document.querySelectorAll('.filtro-orientacion-checkbox');
    orientaciones.forEach(chk => chk.checked = false);
    if (typeof actualizarEstadoMaestro === 'function') actualizarEstadoMaestro();

    // 5. Re-calcular el mapa al instante con los filtros limpios
    if (typeof actualizarFiltrosMapa === 'function') actualizarFiltrosMapa();
    if (typeof actualizarEstadoVisualFiltros === 'function') actualizarEstadoVisualFiltros();

    // 6. Bandera para que la tabla se regenere limpia cuando el usuario decida volver a ella
    window.tablaRecrearAlVolver = true;

    // Vibración haptics de confirmación
    if (typeof window.vibrarDispositivo === 'function') window.vibrarDispositivo();
};

// ---------------------------------------------------------------
// 🔴 BUSCADOR Y FILTROS VISUALES (Texto y Distancia)
// ---------------------------------------------------------------

window.aplicarFiltrosVisuales = function(evitarScroll = false, preservarPaginacion = false) {
    // Solo reseteamos el límite a 10 si NO nos piden preservarlo
    if (!preservarPaginacion) {
        window.limitePaginacionMeteo = 10;
    }
    
    // Como ahora dibujar la tabla lleva solo milisegundos, la mandamos repintar silenciosamente.
    const promesaTabla = construir_tabla(false, true);

    // Auto-scroll hacia arriba siempre (a menos que la app pida explícitamente evitarlo)
    if (!evitarScroll && (window.guardarScrollY === null || window.guardarScrollY === undefined)) {
        
        // Damos un respiro de 10ms para que el DOM aplique la nueva altura de 10 filas antes de ordenar el scroll, si no el navegador se hace un lío.
        setTimeout(() => {
            const wrapper = document.querySelector('.tabla-wrapper');
            const principal = document.querySelector('.contenedor-principal-tabla');
            const options = { top: 0, behavior: 'smooth' }; // Instantáneo para evitar saltos raros
            
            if (wrapper) wrapper.scrollTo(options);
            if (principal) principal.scrollTo(options);
            window.scrollTo(options);
        }, 10);
    }

    return promesaTabla;
};

// Variable global para recordar el temporizador del teclado
let temporizadorBuscador = null;

window.aplicarFiltrosVisualesBuscador = function() {
    // 1. Feedback visual INSTANTÁNEO de la "X"
    const input = document.getElementById('buscador-despegues-provincias');
    const botonLimpiar = document.getElementById('limpiar-buscador');
    if (input && botonLimpiar) {
        botonLimpiar.style.display = (input.value.length > 0) ? 'block' : 'none';
        if (input.value.trim() !== '') {
            input.classList.add('filtrado');
        } else {
            input.classList.remove('filtrado', 'buscador-despegues-sin-resultados');
        }
    }

    if (temporizadorBuscador) {
        clearTimeout(temporizadorBuscador);
    }

    // 2. Temporizador de 500 ms
    temporizadorBuscador = setTimeout(() => {
        
        // Le decimos al fondo oscuro que se vuelva transparente y que permita los clics a través de él.
        const overlay = document.getElementById('msgActualizando...');
        if (overlay) overlay.classList.add('spinner-transparente');

        // Lanzamos la operación pesada (el spinner saldrá, pero sin bloquear)
        ejecutarOperacionPesada(() => {
            window.aplicarFiltrosVisuales();
        });

    }, 500); 
};

// Esta función extrae la parte visual que actualiza los Textos y Contadores 
// sin tocar los pesados nodos del DOM.
window.actualizarContadoresVisualesRapidos = function(visibles, filtroLimpio, distanciaLimite) {
    const input = document.getElementById('buscador-despegues-provincias');
    const favoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
    const totalFavoritos = favoritos.length;
    const btnIncNoFavs = document.getElementById('btn-incluir-no-favs-distancia');
    const incluirNoFavs = btnIncNoFavs ? btnIncNoFavs.classList.contains('activo') : false;

    // 1. Input en rojo si no hay resultados
    if (input) {
        if (visibles === 0 && filtroLimpio.length > 0) {
            input.classList.add('buscador-despegues-sin-resultados');
        } else {
            input.classList.remove('buscador-despegues-sin-resultados');
        }
    }

    // 2. Contadores Superiores
    const divContador = document.getElementById('contador-despegues');
    if (divContador) {
        const iconoFiltro = `<img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro">`;
        const heartRed = `<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">`;
        const heartWhite = `<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">`;
        const htmlNumeroFiltrado = `<span class="contador-badge-filtro" title="${t('mapa.capasYFiltros')}">${iconoFiltro}<b>${visibles}</b></span>`;

        if (modoEdicionFavoritos) {
            if (soloFavoritos) {
                divContador.innerHTML = `${htmlNumeroFiltrado} ${t('contador.despeguesFavoritosEdicion', { n: heartRed, total: totalDespeguesDisponibles })}`;
            } else if (visibles < totalDespeguesDisponibles) {
                divContador.innerHTML = `${htmlNumeroFiltrado} ${t('contador.despeguesDisponiblesFiltrados', { total: totalDespeguesDisponibles })}`;
            } else {
                divContador.innerHTML = t('contador.despeguesDisponibles', { n: totalDespeguesDisponibles });
            }
        } else {
            const ignorarFiltroFavoritos = (distanciaLimite < 9999 && incluirNoFavs);
            if (ignorarFiltroFavoritos) {
                divContador.innerHTML = `${htmlNumeroFiltrado} ${t('contador.despeguesDisponiblesFiltrados', { total: totalDespeguesDisponibles })} (${heartRed}+${heartWhite})`;
            } else if (totalFavoritos === 0) {
                divContador.innerHTML = t('contador.totalDisponibles', { n: totalDespeguesDisponibles });
            } else {
                if (visibles < totalFavoritos || distanciaLimite < 9999) {
                    divContador.innerHTML = `${htmlNumeroFiltrado} ${t('contador.despeguesFavoritosFiltrados', { total: totalFavoritos })} (${heartRed})`;
                } else {
                    divContador.innerHTML = `${t('contador.despeguesFavoritos', { n: visibles })} (${heartRed})`;
                }
            }
        }
    }

    // 3. Mini-contador (Cabecera Tabla)
    const miniCounter = document.getElementById('header-contador-mini');
    if (miniCounter && !modoEdicionFavoritos) {
        const hayFiltros = filtroLimpio.length > 0 || distanciaLimite < 9999;
        
        if (soloSeguimiento) {
            const totalSeg = obtenerSeguimientos().length;
            const heartVerde = `<svg viewBox="1 4 22 16" width="16" height="16" style="vertical-align:-0.19em; margin-left:3px; display:inline-block;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="#16a34a" stroke="none"/><circle cx="12" cy="12" r="4.5" fill="white" stroke="none"/><circle cx="12" cy="12" r="2.5" fill="#16a34a" stroke="none"/></svg>`;
            miniCounter.innerHTML = hayFiltros ? `${visibles} de ${totalSeg} ${heartVerde}` : `${visibles} ${heartVerde}`;
            miniCounter.title = t('contador.miniSeguimiento');
        } else if (incluirNoFavs) {
            miniCounter.innerHTML = `${visibles} de ${totalDespeguesDisponibles}`;
            miniCounter.title = t('contador.miniTodosBD');
        } else {
            miniCounter.title = t('contador.miniFavoritos');
            if (hayFiltros) {
                miniCounter.innerHTML = `${visibles} de ${totalFavoritos} <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️" style="width:13px;height:13px;">`;
            } else {
                miniCounter.innerHTML = `${totalFavoritos} <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️" style="width:13px;height:13px;">`;
            }
        }
    }

    // 4. Corazón de la cabecera (Modo edición)
    if (modoEdicionFavoritos) {
        const thFavorito = document.getElementById('id-thFavorito'); 
        if(thFavorito) thFavorito.innerHTML = '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
    }

    // 5. Sugerencias Globales (Buscador Inteligente)
    let divSugerencias = document.getElementById('sugerencias-globales');
    if (!divSugerencias) {
        divSugerencias = document.createElement('div');
        divSugerencias.id = 'sugerencias-globales'; 
        if (input && input.parentNode) {
            input.parentNode.insertBefore(divSugerencias, input.nextSibling);
        }
    }

    if (filtroLimpio.length > 2 && !modoEdicionFavoritos && visibles === 0) {
        const centroLatFiltro = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL')) || null;
        const centroLonFiltro = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LON_INICIAL')) || null;
        const normalizar = (texto) => texto.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const coincidenciasGlobales = window.bdGlobalDespegues.filter(d => {
            const nombreSolo = normalizar(d.Despegue);
            const yaEsFavorito = favoritos.includes(Number(d.ID));
            if (yaEsFavorito || !nombreSolo.includes(filtroLimpio)) return false;

            if (distanciaLimite < 9999 && centroLatFiltro !== null && centroLonFiltro !== null) {
                const latSpot = parseFloat(d.Latitud);
                const lonSpot = parseFloat(d.Longitud);
                if (!isNaN(latSpot) && !isNaN(lonSpot)) {
                    if (obtenerDistanciaKm(centroLatFiltro, centroLonFiltro, latSpot, lonSpot) > distanciaLimite) {
                        return false; 
                    }
                }
            }
            return true;
        });

        if (coincidenciasGlobales.length > 0) {
            let html = `<p class="sugerencia-aviso">${t('buscador.sugerenciaTitulo', { termino: filtroLimpio })}</p><ul class="sugerencia-lista">`;
            coincidenciasGlobales.slice(0, 3).forEach(d => {
                html += `<li class="sugerencia-item">
                        <span class="sugerencia-texto"><b>${d.Despegue}</b> <br><small style="color:#666;">(${d.Provincia})</small></span>
                        <button class="sugerencia-btn" onclick="agregarDespegueDesdeBuscador(${d.ID})">
                            ${t('buscador.anadirFavorito')} <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">
                        </button>
                    </li>`;
            });
            html += `</ul>`;
            divSugerencias.innerHTML = html;
            divSugerencias.style.display = 'flex'; 
        } else {
            divSugerencias.style.display = 'none';
        }
    } else {
        if(divSugerencias) divSugerencias.style.display = 'none';
    }
};

// Función auxiliar para el botón del buscador
function agregarDespegueDesdeBuscador(idDespegue) {
    idDespegue = Number(idDespegue); // Aseguramos que sea un número
    const misFavoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
    
    if (!misFavoritos.includes(idDespegue)) {
        misFavoritos.push(idDespegue);
        localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify(misFavoritos));
		
        // Intentar encontrar el nombre en la BD global para aislarlo en la búsqueda
        const despegueObj = window.bdGlobalDespegues.find(d => Number(d.ID) === idDespegue);
        const nombreDespegue = despegueObj ? despegueObj.Despegue : idDespegue;
        
        // 🚀 NUEVO: En lugar de limpiar, forzamos el nombre exacto en el buscador
        const input = document.getElementById('buscador-despegues-provincias');
        if (input) {
            input.value = nombreDespegue;
            input.classList.add('filtrado'); // Mantiene el borde rojo/azul visual de que hay filtro activo
        }
        
        // Aseguramos que el botón de limpiar (la X) esté visible
        const btnLimpiar = document.getElementById('limpiar-buscador');
        if (btnLimpiar) btnLimpiar.style.display = 'block';
        
        // Ocultar caja de sugerencias
        const divSugerencias = document.getElementById('sugerencias-globales');
        if (divSugerencias) divSugerencias.style.display = 'none';

        // if (typeof GestorMensajes !== 'undefined') {
        //     GestorMensajes.mostrar({
        //         tipo: 'modal',
        //         htmlContenido: `<p>${t('favoritos.anadidoOk', { nombre: nombreDespegue })}</p>`,
        //         botones: [] 
        //     });

        //     setTimeout(function() {
        //         GestorMensajes.ocultar(); 
        //         construir_tabla(); 
        //     }, 1300);

        // } else {
        //     alert(`✅ ${nombreDespegue} añadido a favoritos`);
        //     construir_tabla();
        // }
        construir_tabla();
    }
}

// Función global para limpiar el buscador, restaurar el placeholder. Antes estaba en el ...Listener ('DOMContentLoaded', function() {
let placeholderOriginal = '🔍';
let inputBuscador = null; // Se inicializará al cargar el DOM
let botonLimpiar = null;  // Se inicializará al cargar el DOM
//let badge = null;  // Se inicializará al cargar el DOM

function limpiarBuscador() {
    const divConfig = document.getElementById("div-configuracion");
    if (divConfig) divConfig.classList.remove("activo");

    if (typeof setModoEnfoque === "function") { setModoEnfoque(false); }
    
	if (!inputBuscador || !botonLimpiar) return;

    inputBuscador.value = '';
    botonLimpiar.style.display = 'none';
	
    inputBuscador.classList.remove('filtrado');
    
    if (modoEdicionFavoritos) {
        inputBuscador.placeholder = t('buscador.placeholderEdicion') || "🔍 País, Región, Provincia o Despegue";
    } else {
        inputBuscador.placeholder = '🔍';
    }
    
    // Si había un despegue temporal cargado, lo olvidamos y reconstruimos ---
    if (window.despegueTemporalParaTabla) {
        window.despegueTemporalParaTabla = null;
        construir_tabla(); // Lo forzamos a desaparecer del DOM
    } else {
        ejecutarOperacionPesada(() => { aplicarFiltrosVisuales(); });
    }
}

// ---------------------------------------------------------------
// 🟦🟦🟦🟦🟦 DOM CONTENT LOADED
// ---------------------------------------------------------------
/* Garantiza que JavaScript se ejecute solo cuando todo el HTML y el CSS (incluidas las clases que definiste) ya están cargados en el navegador.
 */
// En lugar de DOMContentLoaded, esperamos a nuestro evento personalizado
document.addEventListener('i18nReady', function() {

    aplicarModoSimpleUI();

    // --- ASIGNACIÓN DE TRADUCCIONES DIFERIDAS ---
    //placeholderOriginal = t('buscador.placeholder');
    placeholderOriginal = '🔍';
	
    // 1. Intentamos poner la versión (si falla, que no rompa lo demás)
    try {
        const spanVersion = document.getElementById('web-version-text');
        if (spanVersion && window.WEB_VERSION) {
            spanVersion.textContent = 'v' + window.WEB_VERSION;
        }
    } catch (e) {
        console.warn("No se pudo poner el texto de versión:", e);
    }

    const huboCrashPrevio = localStorage.getItem('METEO_FLAG_CRASH_DETECTADO') === 'true';

    if (huboCrashPrevio) {
        // 1. Obtenemos el contador de incidencias seguidas (si no existe, empezamos en 0)
        let contadorCrashes = parseInt(localStorage.getItem('METEO_CRASH_COUNTER') || '0');
        contadorCrashes++;

        if (contadorCrashes < 2) {
            // --- PRIMERA VEZ: SILENCIOSO ---
            // Guardamos que ya hubo un primer aviso y limpiamos la bandera de crash 
            // para que el siguiente intento de carga (construir_tabla) pueda volver a marcarla.
            localStorage.setItem('METEO_CRASH_COUNTER', contadorCrashes);
            localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO'); 
            
            console.warn("Se ha detectado un crash previo (intento 1). Reintentando carga silenciosa...");
            construir_tabla();
        } 
        else {
            // --- SEGUNDA VEZ: AVISO ALARMISTA ---
            // Limpiamos todo para que el usuario pueda trabajar desde cero
            localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO');
            localStorage.removeItem('METEO_CRASH_COUNTER'); 

            if (typeof GestorMensajes !== 'undefined') {
                GestorMensajes.mostrar({
                    tipo: 'modal',
                    htmlContenido: t('crash.errorCarga'),
                    botones: [{
                        texto: t('botones.aceptar'),
                        onclick: function() {
                            GestorMensajes.ocultar();
                            activarEdicionFavoritos();
                        }
                    }]
                });
            } else {
                alert(t('crash.alertFallback'));
                activarEdicionFavoritos();
            }
        }

    } else {
        // 1. Capturamos los parámetros de la URL
        const params = new URLSearchParams(window.location.search);
        const tieneCoords = params.has('lat') && params.has('lon');

        if (tieneCoords) {
            // --- 🚀 ARRANQUE POR COORDENADAS ---
            construir_tabla(false, true).then(() => {
                cambiarVista('mapa');
                setTimeout(() => {
                    const btnMap = document.getElementById('nav-map');
                    if (btnMap && typeof window.activarMenuInferior === 'function') window.activarMenuInferior(btnMap);
                    else if (btnMap) { document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active')); btnMap.classList.add('active'); }
                }, 150);
            });

        } else {
            // --- ARRANQUE NORMAL ---
            if (localStorage.getItem('METEO_ABRIR_MAPA_INICIO') === 'true') {
            mostrarLoading(0); 

            construir_tabla(false, true).then(() => {
                cambiarVista('mapa');
                setTimeout(() => {
                    const btnMap = document.getElementById('nav-map');
                    if (btnMap && typeof window.activarMenuInferior === 'function') {
                        window.activarMenuInferior(btnMap);
                    } else if (btnMap) {
                        document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
                        btnMap.classList.add('active');
                    }
                }, 150);
            });
        } else {
            construir_tabla();
        }
        }
    }

	// ---------------------------------------------------------------
	// 🔴 BUSCADOR. Listeners, Funciones, Lógica para limpiar búsquedas
	// ---------------------------------------------------------------
	
	// IMPORTANTE Asignar los elementos HTML a las variables globales declaradas arriba.
    inputBuscador = document.getElementById('buscador-despegues-provincias');
	//badge = document.querySelector('.buscador-despegues-provincias-badge');
    botonLimpiar = document.getElementById('limpiar-buscador');

    if (!inputBuscador || !botonLimpiar) return;
	
    function gestionarBotonLimpiar() {
		
		// Botón “X”
		botonLimpiar.style.display = (inputBuscador.value.length > 0) ? 'block' : 'none';

		// Badge de filtro activo
		if (inputBuscador.value.trim() !== '') {
			//badge.style.display = 'inline-block';
			inputBuscador.classList.add('filtrado');
		} else {
			//badge.style.display = 'none';
			inputBuscador.classList.remove('filtrado');
		}
    }
	
    // 1. Click en el botón 'X': Limpia todo y mantiene el cursor dentro
    botonLimpiar.addEventListener('click', function() {
        limpiarBuscador();
        if (window.matchMedia('(pointer: coarse)').matches) {
            inputBuscador.blur(); // táctil: cierra el teclado
        } else {
            setTimeout(() => inputBuscador.focus(), 10); // escritorio: mantiene el foco
        }
    });
	
    // 2. Keyup: Vuelve a comprobar si mostrar/ocultar la 'X' (el filtrado lo hace el onkeyup del HTML)
    inputBuscador.addEventListener('keyup', gestionarBotonLimpiar);
	
	// 3. Keydown: Capturar la tecla ESC para limpiar el buscador
    inputBuscador.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Evita cualquier acción por defecto del navegador (si la hubiera)
            e.preventDefault(); 
            // Usa la función de limpieza que ya tenías
            limpiarBuscador();
        }
    });

    // 4. Focus: Borrar placeholder al entrar
    inputBuscador.addEventListener('focus', function() {

         // Cerramos paneles de configuración por si estuviesen abiertos
        const divConfig = document.getElementById("div-configuracion");
        if (divConfig) divConfig.classList.remove("activo");

        if (typeof setModoEnfoque === "function") { setModoEnfoque(false); }

        // this.placeholder = '';
        gestionarBotonLimpiar();

        // FIX TECLADO: Evitar que Android desplace la pantalla hacia arriba
        setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.body.scrollTop = 0;
        }, 100);
        setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.body.scrollTop = 0;
        }, 300);
    });

    // 5. Blur (Pérdida de Foco)
    inputBuscador.addEventListener('blur', function() {
        // SÓLO si el campo está vacío, restauramos el placeholder correspondiente.
        if (this.value === '') {
            if (modoEdicionFavoritos) {
                this.placeholder = t('buscador.placeholderEdicion') || "🔍 País, Región, Provincia o Despegue";
            } else {
                this.placeholder = '🔍';
            }
        }
		// Ajusta visibilidad de la X y badge según el contenido
		gestionarBotonLimpiar();
    });

    // Comprobación inicial al cargar la página
    gestionarBotonLimpiar();

function comprobarAvisoCambiosPuntuacionXC() {
        // 1. Si la versión es 3.0.0 o superior, este aviso ya es "historia" y no debe salir nunca
        const versionActual = window.WEB_VERSION || "0.0.0";
        const majorVersion = parseInt(versionActual.split('.')[0]);
        if (majorVersion >= 3) return;

        // 2. Si el usuario ya lo aceptó, no se muestra más
        if (localStorage.getItem('METEO_AVISO_CAMBIOS_XC_VISTO') === 'true') return;

        // 3. Si es un usuario nuevo (que aún no ha hecho la primera visita), 
        // no le mostramos este aviso técnico todavía para no saturarle, 
        // saldrá la próxima vez que entre una vez configurada su app.
        if (!localStorage.getItem("METEO_PRIMERA_VISITA_HECHA")) return;

        // 4. Mostrar el mensaje técnico
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: `
                <div style="text-align: center;">
                    <p style="font-size: 1.2em; font-weight: bold; margin-bottom: 5px;">${t('novedadesXC.titulo')}</p>
                    ${t('novedadesXC.html')}
                </div>
            `,
            botones: [
                {
                    texto: t('botones.entendido'),
                    onclick: function() {
                        // Guardamos que ya lo ha visto para que no vuelva a salir
                        localStorage.setItem('METEO_AVISO_CAMBIOS_XC_VISTO', 'true');
                        GestorMensajes.ocultar();
                    }
                }
            ],
            anchoBotones: 160
        });
    }    
	    	
	// ---------------------------------------------------------------
	// 🔴🔴🔴 SLIDERS
	// ---------------------------------------------------------------

	// ---------------------------------------------------------------
	// 🔴 SLIDERS. DISTANCIA. Construcción
	// ---------------------------------------------------------------
    const distanciaSlider = document.getElementById('distancia-slider');

    // Índice máximo (para el slider): 0 es el primero, N es el último
    const MAX_INDEX = CORTES_DISTANCIA_GLOBAL.length - 1;
    let ultimaDistanciaConfirmada = MAX_INDEX;

    if (distanciaSlider) {
        noUiSlider.create(distanciaSlider, {
            start: MAX_INDEX,    
            direction: 'rtl',    
            step: 1,             
            connect: 'lower',    
            tooltips:[{
                to: function (index) {
                    const val = CORTES_DISTANCIA_GLOBAL[Math.round(index)];
                    if (val >= 9999) return '<span class="simbolo-infinito" style="font-size: 1.4em; line-height: 1; vertical-align: -2px; display: inline-block;">∞</span>';
                    return `${val}`; 
                }
            }],
            range: {
                'min': 0,        // Índice del primer elemento (5 km)
                'max': MAX_INDEX // Índice del último elemento (Todo)
            }
        });

		// 🟢 ACCIÓN VISUAL (Ligera): Borde rojo y botón reset
		// Se ejecuta continuamente al arrastrar. NO toca la tabla.
		distanciaSlider.noUiSlider.on('slide', function(values) {

            window.vibrarDispositivo();

			const valorNuevo = Math.round(values[0]);
			const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
			const btnToggle = document.getElementById('btn-div-filtro-distancia-toggle');
			const navDistance = document.getElementById('nav-distance'); // El nuevo botón de abajo

			if (valorNuevo < MAX_INDEX) {
				if (btnToggle) btnToggle.classList.add('filtro-aplicado'); // Solo si existe
				if (navDistance) navDistance.classList.add('filtrado'); // Ponemos rojo el de abajo
				//if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo');
			} else {
				if (btnToggle) btnToggle.classList.remove('filtro-aplicado');
				if (navDistance) navDistance.classList.remove('filtrado');
				//if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo');
			}
		});

		// 🔴 ACCIÓN PESADA (Datos): Construcción de tabla
		// Usamos el evento 'set' para burlar un bug interno de la librería
		distanciaSlider.noUiSlider.on('set', function(values) {
			const valorNuevo = Math.round(values[0]);

			if (valorNuevo !== ultimaDistanciaConfirmada) {
                
                // Si volvemos a "Todo" (distancia infinita), desactivamos el botón
                if (valorNuevo === MAX_INDEX) {
                    const btnIncNoFavs = document.getElementById('btn-incluir-no-favs-distancia');
                    if (btnIncNoFavs) {
                        btnIncNoFavs.classList.remove('activo', 'filtro-aplicado');
                    }
                }

				// A. Verificación de coordenadas (Seguridad)
				if (!localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL')) {
					
                    // Guardamos la intención del usuario antes de resetear
                    window.distanciaPendienteFiltro = valorNuevo;

                    // Actualizamos la variable ANTES de mover el slider
                    // para evitar que la librería entre en un bucle y lance el mensaje 2 veces.
					ultimaDistanciaConfirmada = MAX_INDEX;
                    distanciaSlider.noUiSlider.set(MAX_INDEX);
					
					// Limpieza visual inmediata
					const panel = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
					//if (panel) panel.classList.remove('borde-rojo-externo');

					GestorMensajes.mostrar({
						tipo: 'modal',
						htmlContenido: t('origen.avisoInicialHtml'),
						botones:[
							{ texto: t('botones.cancelar'), estilo: 'secundario', onclick: function() { 
                                GestorMensajes.ocultar(); 
                                window.distanciaPendienteFiltro = null; // Limpiamos memoria si cancela
                            } },
                            { texto: t('botones.configurarOrigen'), onclick: function() { 
                                GestorMensajes.ocultar(); 
                                const btnGeo = document.getElementById('btn-abrir-geo-menu');
                                if (btnGeo) btnGeo.click(); // Simulamos un clic en el botón 📍
                            } }
						],
                        anchoBotones: 160
					});
					return;
				}

				// B. Si todo es correcto, guardamos y actualizamos
				ultimaDistanciaConfirmada = valorNuevo;

                // Forzamos la actualización de la interfaz al mover por código
                const btnToggle = document.getElementById('btn-div-filtro-distancia-toggle');
                const navDistance = document.getElementById('nav-distance');
                // const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
                if (valorNuevo < MAX_INDEX) {
                    if (btnToggle) btnToggle.classList.add('filtro-aplicado');
                    if (navDistance) navDistance.classList.add('filtrado');
                    // if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo'); // Comentado
                } else {
                    if (btnToggle) btnToggle.classList.remove('filtro-aplicado');
                    if (navDistance) navDistance.classList.remove('filtrado');
                    // if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo'); // Comentado
                }

				ejecutarOperacionPesada(() => { aplicarFiltrosVisuales(); }); 
			}
		});
	}
	
	// ---------------------------------------------------------------
	// 🔴 SLIDERS. VELOCIDAD y RACHA. Construcción
	// ---------------------------------------------------------------
	
	const velocidadSlider = document.getElementById('velocidad-slider');
	const rachaSlider     = document.getElementById('racha-slider');

	if (!velocidadSlider || !rachaSlider) return;

	// 1. CREACIÓN VELOCIDAD
	noUiSlider.create(velocidadSlider, {
		start: [VelocidadMin, VelocidadIdeal, VelocidadMax],
		connect: [true, true, true, true],
		step: 1,
		range: { min: 0, max: 40 },
		tooltips: [true, true, true],
		format: {
			to: value => Math.round(value),
			from: value => parseInt(value)
		}
	});

	// 2. CREACIÓN RACHA
	noUiSlider.create(rachaSlider, {
		start: RachaMax,
		connect: [true, true], // Solo 2 tramos (antes y después del handle)
		step: 1,
		range: { min: 0, max: 40 },
		tooltips: [true],
		format: {
			to: value => Math.round(value),
			from: value => parseInt(value)
		}
	});

	// ===============================================================
	// 🟡 SLIDERS. VELOCIDAD y RACHA. Eventos 'update'
	// ===============================================================

	// Función compartida para el color degradado de la Racha
	function actualizarColorRacha() {
		const RachaVal = Number(rachaSlider.noUiSlider.get());
		const VelValRaw = velocidadSlider.noUiSlider.get();
		const VelMaxVal = Number(Array.isArray(VelValRaw) ? VelValRaw[2] : VelValRaw);

		if (RachaVal <= 0) {
			rachaSlider.style.setProperty('--racha-tolerable-pct', '0%');
			return;
		}

		// Lógica: 1/3 de la diferencia es naranja, el resto verde
		const rachaTolerable = RachaVal - (RachaVal - VelMaxVal) / 3;
		const percentTolerable = Math.max(0, Math.min(100, (rachaTolerable / RachaVal) * 100));

		rachaSlider.style.setProperty('--racha-tolerable-pct', percentTolerable.toFixed(1) + '%');
	}

	// --- Listener UPDATE Velocidad (Visual y Alertas) ---
	velocidadSlider.noUiSlider.on('update', (values) => {
		const VelMax_Live = Number(values[2]);
		const Racha_Live  = Number(rachaSlider.noUiSlider.get());

		// Buscamos el tooltip de la Racha para alertar allí
		const rachaTooltip = rachaSlider.querySelector('.noUi-handle-lower .noUi-tooltip') || 
							 rachaSlider.querySelector('.noUi-handle-upper .noUi-tooltip'); // Por seguridad

		if (rachaTooltip) {
			if (VelMax_Live > Racha_Live) {
				rachaTooltip.classList.add('tooltip-error-conflict');
			} else {
				rachaTooltip.classList.remove('tooltip-error-conflict');
			}
		}
		actualizarColorRacha();
	});

	// --- Listener UPDATE Racha (Visual y Alertas) ---
	rachaSlider.noUiSlider.on('update', (values) => {
		const Racha_Live  = Number(values[0]);
		const VelValRaw   = velocidadSlider.noUiSlider.get();
		const VelMax_Live = Number(Array.isArray(VelValRaw) ? VelValRaw[2] : VelValRaw);

		// Buscamos el tooltip de Velocidad Máxima (índice 2)
		const tooltipsVel = velocidadSlider.querySelectorAll('.noUi-tooltip');
		const velMaxTooltip = tooltipsVel[2]; 

		if (velMaxTooltip) {
			if (Racha_Live < VelMax_Live) {
				velMaxTooltip.classList.add('tooltip-error-conflict');
			} else {
				velMaxTooltip.classList.remove('tooltip-error-conflict');
			}
		}
		actualizarColorRacha();
	});

    rachaSlider.noUiSlider.on('slide', function () {
        window.vibrarDispositivo();
    });

	// ===============================================================
	// 🟡 SLIDERS. VELOCIDAD y RACHA. Eventos 'change'
	// ===============================================================

	// 1. Variable de estado inicial para VELOCIDAD (array de 3 valores)
	let ultimaVelocidadConfirmada = [VelocidadMin, VelocidadIdeal, VelocidadMax];

	// Al soltar, comparamos si los valores son distintos
	velocidadSlider.noUiSlider.on('change', function (values) {
		const valoresNuevos = values.map(Number);
		
		// Comprobamos si alguno de los 3 valores es diferente al guardado
		const haCambiado = valoresNuevos.some((val, i) => val !== ultimaVelocidadConfirmada[i]);

		if (haCambiado) {
            window.limitePaginacionMeteo = 10;
			ultimaVelocidadConfirmada = valoresNuevos;

			let [vMin, vIdeal, vMax] = valoresNuevos;
			const RachaActual = Number(rachaSlider.noUiSlider.get());

			// Corrección de lógica (Max no puede superar Racha)
			if (vMax > RachaActual) {
				vMax = RachaActual;
				velocidadSlider.noUiSlider.set([null, null, vMax]);
				// Actualizamos también la variable de control con el valor corregido
				ultimaVelocidadConfirmada[2] = vMax; 
			}

			VelocidadMin = vMin;
			VelocidadIdeal = vIdeal;
			VelocidadMax = vMax;
			
			localStorage.setItem("METEO_VELOCIDAD_MINIMA", VelocidadMin);
			localStorage.setItem("METEO_VELOCIDAD_IDEAL", VelocidadIdeal);
			localStorage.setItem("METEO_VELOCIDAD_MAXIMA", VelocidadMax);

			construir_tabla();
		}
	});

    velocidadSlider.noUiSlider.on('slide', function () {
        window.vibrarDispositivo();
    });

	// 2. Variable de estado inicial para RACHA
	let ultimaRachaConfirmada = RachaMax;

	rachaSlider.noUiSlider.on('change', function (values) {
		let RachaNueva = Number(values[0]);

		// Comprobamos contra la variable guardada
		if (RachaNueva !== ultimaRachaConfirmada) {
            window.limitePaginacionMeteo = 10;
			
			ultimaRachaConfirmada = RachaNueva;

			const VelRaw = velocidadSlider.noUiSlider.get();
			const VelMaxActual = Number(Array.isArray(VelRaw) ? VelRaw[2] : VelRaw);

			if (RachaNueva < VelMaxActual) {
				RachaNueva = VelMaxActual;
				rachaSlider.noUiSlider.set(RachaNueva);
				ultimaRachaConfirmada = RachaNueva; // Ajustamos control tras corrección
			}

			RachaMax = RachaNueva;
			localStorage.setItem("METEO_RACHA_MAX", RachaMax);

			construir_tabla();
		}
	});
	
	// ---------------------------------------------------------------
	// 🔴 SLIDERS. CONFIGURACIÓN RANGO HORARIO. Construcción
	// ---------------------------------------------------------------

	const configuracionhorarioSlider = document.getElementById('configuracion-horario-slider');

    if (!configuracionhorarioSlider || configuracionhorarioSlider.noUiSlider) return;

    let start = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO');
    let end   = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN');
	
	// Si es la primera vez (null), el slider de configuración mostrará 0-23 pero no guardará nada en localStorage hasta que el usuario lo mueva.
    let startVal = (start === null) ? 0 : start;
    let endVal   = (end === null) ? 23 : end;
	
	const formatoTooltipIgualAlOriginal = {
        to: function(val) {
            // Convertimos el valor numérico (ej: 9) a string con padding (ej: "09")
            return String(Math.round(val)).padStart(2, '0');
        }
    };

    noUiSlider.create(configuracionhorarioSlider, {
        start: [startVal, endVal],
        connect: true, 
        step: 1,
        range: { 'min': 0, 'max': 23 },
        tooltips: [formatoTooltipIgualAlOriginal, formatoTooltipIgualAlOriginal],
        format: {
            to: (v) => Math.round(v),
            from: (v) => Number(v)
        },
		pips: {
            mode: 'values',
            values: [0, 3, 6, 9, 12, 15, 18, 21, 23], 
            density: 4, 
            format: {
                to: function(value) {
                    const numero = String(value).padStart(2, '0');
					return `<span style="font-size: 0.85em;">${numero}<span style="margin-left: 1px;">h</span></span>`;
				}
            }
        }
    });

	// Usamos el evento 'slide' (arrastrar) y 'set' (clic en barra)
    // Pero pasamos un flag para ignorar las llamadas automáticas del sistema
    
    configuracionhorarioSlider.noUiSlider.on('set', function (values, handle, unencoded, tap, positions, noUiSlider) {
        // Si el origen del cambio NO es el sistema (es decir, viene de un clic o arrastre)
        // noUiSlider por defecto manda argumentos adicionales cuando es interacción
        if (tap || arguments[3] !== undefined) { 
             localStorage.setItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO', Math.round(values[0]));
             localStorage.setItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN', Math.round(values[1]));
        }
    });

    configuracionhorarioSlider.noUiSlider.on('slide', function () {
        window.vibrarDispositivo();
    });
	
	// ---------------------------------------------------------------
	// 🔴 PANEL INFO ACTUALIZACIONES
	// ---------------------------------------------------------------

    // ===============================================================
    // 1. VARIABLES GLOBALES Y CONFIGURACIÓN
    // ===============================================================
    
    // Configuración de Tiempos
    const TIEMPO_CONFIRMACION_OFFLINE = 5000; // 5 seg. antes 1 minuto de paciencia antes de mostrar sin conexión..
    const TIEMPO_CONFIRMACION_ONLINE  = 1000;  // 1 seg de margen al recuperar conexión
    //const HEARTBEAT_INTERVALO = 10000;         // Revisar pulso cada 10s

    // Variables de Control
    let timerCiclo = null;
    let timerOffline = null; // Para la cuenta atrás de 1 min
    let timerOnline = null;  // Para la cuenta atrás de 5 seg
    let intervaloActualizacion = 60000; 

    // Estado del Sistema
    let avisoOfflineActivo = false; // Esta es la variable MAESTRA que decide si mostramos la nube naranja
    let statusActualizaciónEnCurso = false;
    let hayErrorData = false;

    // Datos
    let lastStatusTimestamp = 0;
    let currentStatusText = t('actualizacion.cargando');
    let currentStatusTextEcmwf = t('actualizacion.cargando'); 
    let currentStatusTextMin15 = t('actualizacion.cargando'); 
    let lastDataGenerationTimestamp = 0;
    let lastDataGenerationTimestampEcmwf = 0; 
    let lastDataGenerationTimestampMin15 = 0; 
    let jsonModelInitTimestamp = 0; 
    let jsonModelInitTimestampEcmwf = 0; 
    let jsonModelInitTimestampMin15 = 0; 

    // ===============================================================
    // 2. GESTOR CENTRAL DE CONEXIÓN (El Cerebro)
    // ===============================================================
    
    function gestionarCambioConexion(estadoDetectado) {
        if (estadoDetectado === 'offline') {
            if (timerOnline) { clearTimeout(timerOnline); timerOnline = null; }

            if (!avisoOfflineActivo && !timerOffline) {
                console.log(new Date().toLocaleString(), `⏳ Detectada desconexión. Esperando ${TIEMPO_CONFIRMACION_OFFLINE/1000}s...`);
                timerOffline = setTimeout(() => {
                    console.log("❌ TIEMPO AGOTADO: Activando Modo Offline.");
                    avisoOfflineActivo = true;
                    cicloActualizacion();
                    timerOffline = null;
                }, TIEMPO_CONFIRMACION_OFFLINE);
            }
        } 
        else if (estadoDetectado === 'online') {
            if (timerOffline) { 
                clearTimeout(timerOffline); 
                timerOffline = null; 
            }

            if ((avisoOfflineActivo || esModoOffline) && !timerOnline) {
                console.log(new Date().toLocaleString(), `📶 Red detectada. Esperando ${TIEMPO_CONFIRMACION_ONLINE/1000}s de estabilidad...`);
                timerOnline = setTimeout(async () => {
                    // CAMBIO: sustituimos el chequeo de navigator.onLine (poco fiable)
                    // por una comprobación real de conectividad contra el servidor.
                    const hayConexionReal = await comprobarConectividadReal();

                    timerOnline = null; // Se resetea SIEMPRE, haya éxito o no, evitando el bloqueo

                    if (!hayConexionReal) {
                        console.log(new Date().toLocaleString(), "⚠️ Doble check falló (sin conectividad real). Reintentando más tarde.");
                        return;
                    }

                    console.log(new Date().toLocaleString(), "Conexión estable. Recargando datos...");
                    avisoOfflineActivo = false;
                    esModoOffline = false;
                    cicloActualizacion();
                    construir_tabla(true);
                }, TIEMPO_CONFIRMACION_ONLINE);
            }
        }
    }

    async function comprobarConectividadReal() {
        try {
            const res = await fetch("https://flydecision.com/meteo-status.txt?t=" + Date.now(), {
                cache: "no-store",
                signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
            });
            return res && res.ok;
        } catch (e) {
            return false;
        }
    }

    // ===============================================================
    // 3. FUNCIONES VISUALES (La Piel)
    // ===============================================================

    function formatearTextoStatus(textoOriginal) {
        // Busca una fecha en formato ISO (ej: 2026-02-02T15:30:00+00:00)
        const patronISO = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})/;
        const match = textoOriginal.match(patronISO);

        if (match) {
            try {
                const fechaObj = new Date(match[0]);
                // Formatea a hora local del usuario (ej: 17:30)
                const horaLocal = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                // Reemplaza la fecha ISO fea por la hora bonita
                return textoOriginal.replace(match[0], horaLocal);
            } catch (e) {
                return textoOriginal; // Si falla, devuelve el original
            }
        }
        return textoOriginal;
    }

    function refrescoPanelInfoActualizaciones() {
        const ahora = new Date();
        const ahoraMs = ahora.getTime();

        const mostrarErrorOffline = esModoOffline || avisoOfflineActivo;

        // Ocultamos el contenedor viejo de "Próxima Actualización" porque ahora lo inyectamos todo en el de arriba
        const proximaActualizacionContenedor = document.getElementById('proxima-actualizacion-contenedor');
        if (proximaActualizacionContenedor) proximaActualizacionContenedor.style.display = 'none';

        // --- A. PANEL CENTRAL DE DATOS UNIFICADO ---
        const dataGenElement = document.getElementById('data_generation_time');
        
        if (dataGenElement) {
            if ((!lastDataGenerationTimestamp || lastDataGenerationTimestamp === 0) && 
                typeof DATOS_METEO_CACHE !== 'undefined' && 
                DATOS_METEO_CACHE && 
                DATOS_METEO_CACHE.timestamp) {
                lastDataGenerationTimestamp = new Date(DATOS_METEO_CACHE.timestamp).getTime();
            }

            if (mostrarErrorOffline) {
                const timeAgoGen = (lastDataGenerationTimestamp > 0 && typeof formatTimeAgo === 'function') 
                                   ? formatTimeAgo(lastDataGenerationTimestamp, ahoraMs) 
                                   : 'tiempo desconocido';

                dataGenElement.innerHTML = `<span style="color: #ff8400; font-weight: bold; padding-left: 15px; display: block; margin-top: 4px;">${t('actualizacion.sinConexion', { tiempo: timeAgoGen })}</span>`;
                
            } else if (lastDataGenerationTimestamp > 0 && !hayErrorData) {
                
                // --- 1. TEXTOS DE PASADO ---
                const timeAgoMF = typeof formatTimeAgo === 'function' ? formatTimeAgo(lastDataGenerationTimestamp, ahoraMs) : '';
                const timeAgoEC = (typeof formatTimeAgo === 'function' && lastDataGenerationTimestampEcmwf > 0) ? formatTimeAgo(lastDataGenerationTimestampEcmwf, ahoraMs) : '...';
                const timeAgoMin15 = (typeof formatTimeAgo === 'function' && lastDataGenerationTimestampMin15 > 0) ? formatTimeAgo(lastDataGenerationTimestampMin15, ahoraMs) : '...';
                
                let refMF = '';
                if (jsonModelInitTimestamp > 0 && typeof formatHourUTC === 'function') {
                    const dateMF = new Date(jsonModelInitTimestamp);
                    const dayMF = String(dateMF.getUTCDate()).padStart(2, '0');
                    refMF = `${dayMF}t${formatHourUTC(dateMF)}`;
                }

                let refEC = '';
                if (jsonModelInitTimestampEcmwf > 0 && typeof formatHourUTC === 'function') {
                    const dateEC = new Date(jsonModelInitTimestampEcmwf);
                    const dayEC = String(dateEC.getUTCDate()).padStart(2, '0');
                    refEC = `${dayEC}t${formatHourUTC(dateEC)}`;
                }

                let refMin15 = '';
                if (jsonModelInitTimestampMin15 > 0 && typeof formatHourUTC === 'function') {
                    const dateMin15 = new Date(jsonModelInitTimestampMin15);
                    const dayMin15 = String(dateMin15.getUTCDate()).padStart(2, '0');
                    refMin15 = `${dayMin15}t${formatHourUTC(dateMin15)}`;
                }

                // --- 2. TEXTOS DE FUTURO O ACTUALIZANDO ---
                const MARGEN_TOLERANCIA_MS = 45 * 60 * 1000; 
                const OFFSET_MS = 1 * 60 * 1000;
                const LIMITE_ATRASO_MS = 3 * 60 * 60 * 1000; // 3 horas de margen para considerar una actualización "retrasada" e Inminente

                // Futuro Météo-France
                let textoFuturoMF = "";
                if (currentStatusText && !currentStatusText.toUpperCase().includes("OPERATIVO")) {
                    textoFuturoMF = `<span style="color:#e39300; font-weight:bold;">🔄 ${formatearTextoStatus(currentStatusText)}</span>`;
                } else {
                    let proximaFechaMF = null;
                    let esInminenteMF = false;

                    for (let h of HorariosMediosActualizacion) {
                        const [hora, min] = h.split(':').map(Number);
                        const intento = new Date(ahora);
                        intento.setUTCHours(hora, min, 0, 0);
                        
                        let distancia = lastDataGenerationTimestamp > 0 ? intento.getTime() - lastDataGenerationTimestamp : Infinity;
                        
                        // Si la hora de este ciclo ya pasó, pero NO tenemos los datos de este ciclo (distancia > margen)
                        if (ahoraMs > intento.getTime() && distancia > MARGEN_TOLERANCIA_MS && (ahoraMs - intento.getTime()) < LIMITE_ATRASO_MS) {
                            esInminenteMF = true;
                            break;
                        }
                        
                        // Si es un ciclo futuro y NO lo tenemos ya (distancia > margen)
                        if (intento.getTime() > ahoraMs && distancia > MARGEN_TOLERANCIA_MS) { 
                            proximaFechaMF = intento; 
                            break; 
                        }
                    }
                    
                    if (esInminenteMF) {
                        textoFuturoMF = t('actualizacion.esperando');
                    } else {
                        if (!proximaFechaMF) {
                            const [hora, min] = HorariosMediosActualizacion[0].split(':').map(Number);
                            proximaFechaMF = new Date(ahora);
                            proximaFechaMF.setUTCDate(proximaFechaMF.getUTCDate() + 1); 
                            proximaFechaMF.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsMF = (proximaFechaMF.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsMF <= 0) {
                            textoFuturoMF = t('actualizacion.esperando');
                        } else {
                            const diffMinsMF = Math.floor(diffMsMF / 60000) % 60;
                            const diffHorasMF = Math.floor(Math.floor(diffMsMF / 60000) / 60);
                            
                            // Formateamos el tiempo (horas + min o solo min)
                            let textoMF = diffHorasMF > 0 
                                ? t('actualizacion.horas', { h: diffHorasMF, m: diffMinsMF }) 
                                : t('actualizacion.minutos', { m: diffMinsMF });

                            // Montamos la frase final
                            textoFuturoMF = t('actualizacion.proximaEn', { tiempo: textoMF });
                        }
                    }
                }

                // Futuro ECMWF
                let textoFuturoEC = "";
                if (currentStatusTextEcmwf && !currentStatusTextEcmwf.toUpperCase().includes("OPERATIVO")) {
                    textoFuturoEC = `<span style="color:#e39300; font-weight:bold;">🔄 ${formatearTextoStatus(currentStatusTextEcmwf)}</span>`;
                } else {
                    let proximaFechaEC = null;
                    let esInminenteEC = false;

                    for (let h of HorariosMediosActualizacionEcmwf) {
                        const [hora, min] = h.split(':').map(Number);
                        const intento = new Date(ahora);
                        intento.setUTCHours(hora, min, 0, 0);
                        
                        let distancia = lastDataGenerationTimestampEcmwf > 0 ? intento.getTime() - lastDataGenerationTimestampEcmwf : Infinity;
                        
                        // Si la hora de este ciclo ya pasó, pero NO tenemos los datos de este ciclo (distancia > margen)
                        if (ahoraMs > intento.getTime() && distancia > MARGEN_TOLERANCIA_MS && (ahoraMs - intento.getTime()) < LIMITE_ATRASO_MS) {
                            esInminenteEC = true;
                            break;
                        }
                        
                        // Si es un ciclo futuro y NO lo tenemos ya (distancia > margen)
                        if (intento.getTime() > ahoraMs && distancia > MARGEN_TOLERANCIA_MS) { 
                            proximaFechaEC = intento; 
                            break; 
                        }
                    }
                    
                    if (esInminenteEC) {
                        textoFuturoEC = t('actualizacion.esperando');
                    } else {
                        if (!proximaFechaEC) {
                            const [hora, min] = HorariosMediosActualizacionEcmwf[0].split(':').map(Number);
                            proximaFechaEC = new Date(ahora);
                            proximaFechaEC.setUTCDate(proximaFechaEC.getUTCDate() + 1); 
                            proximaFechaEC.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsEC = (proximaFechaEC.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsEC <= 0) {
                            textoFuturoEC = t('actualizacion.esperando');
                        } else {
                            const diffMinsEC = Math.floor(diffMsEC / 60000) % 60;
                            const diffHorasEC = Math.floor(Math.floor(diffMsEC / 60000) / 60);
                            
                            // Formateamos el tiempo según si hay horas o solo minutos
                            let textoEC = diffHorasEC > 0 
                                ? t('actualizacion.horas', { h: diffHorasEC, m: diffMinsEC }) 
                                : t('actualizacion.minutos', { m: diffMinsEC });

                            // Montamos la frase final usando la clave "proximaEn"
                            textoFuturoEC = t('actualizacion.proximaEn', { tiempo: textoEC });
                        }
                    }
                }

                // Futuro Modelo 15 min (AROME HD)
                let textoFuturoMin15 = "";
                if (currentStatusTextMin15 && !currentStatusTextMin15.toUpperCase().includes("OPERATIVO")) {
                    textoFuturoMin15 = `<span style="color:#e39300; font-weight:bold;">🔄 ${formatearTextoStatus(currentStatusTextMin15)}</span>`;
                } else {
                    let proximaFechaMin15 = null;
                    let esInminenteMin15 = false;

                    for (let h of HorariosMediosActualizacionMin15) {
                        const [hora, min] = h.split(':').map(Number);
                        const intento = new Date(ahora);
                        intento.setUTCHours(hora, min, 0, 0);
                        
                        let distancia = lastDataGenerationTimestampMin15 > 0 ? intento.getTime() - lastDataGenerationTimestampMin15 : Infinity;
                        
                        if (ahoraMs > intento.getTime() && distancia > MARGEN_TOLERANCIA_MS && (ahoraMs - intento.getTime()) < LIMITE_ATRASO_MS) {
                            esInminenteMin15 = true;
                            break;
                        }
                        
                        if (intento.getTime() > ahoraMs && distancia > MARGEN_TOLERANCIA_MS) { 
                            proximaFechaMin15 = intento; 
                            break; 
                        }
                    }
                    
                    if (esInminenteMin15) {
                        textoFuturoMin15 = t('actualizacion.esperando');
                    } else {
                        if (!proximaFechaMin15) {
                            const [hora, min] = HorariosMediosActualizacionMin15[0].split(':').map(Number);
                            proximaFechaMin15 = new Date(ahora);
                            proximaFechaMin15.setUTCDate(proximaFechaMin15.getUTCDate() + 1); 
                            proximaFechaMin15.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsMin15 = (proximaFechaMin15.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsMin15 <= 0) {
                            textoFuturoMin15 = t('actualizacion.esperando');
                        } else {
                            const diffMinsMin15 = Math.floor(diffMsMin15 / 60000) % 60;
                            const diffHorasMin15 = Math.floor(Math.floor(diffMsMin15 / 60000) / 60);
                            
                            let textoMin15 = diffHorasMin15 > 0 
                                ? t('actualizacion.horas', { h: diffHorasMin15, m: diffMinsMin15 }) 
                                : t('actualizacion.minutos', { m: diffMinsMin15 });

                            textoFuturoMin15 = t('actualizacion.proximaEn', { tiempo: textoMin15 });
                        }
                    }
                }

                // --- 3. DIBUJAR LISTA UNIFICADA ---
                const semaforoMF    = calcularSemaforoAntiguedad(lastDataGenerationTimestamp, AROME_UMBRAL_AMARILLO_MIN, AROME_UMBRAL_ROJO_MIN, ahoraMs);
                const semaforoMin15 = calcularSemaforoAntiguedad(lastDataGenerationTimestampMin15, MIN15_UMBRAL_AMARILLO_MIN, MIN15_UMBRAL_ROJO_MIN, ahoraMs);
                const semaforoEC    = calcularSemaforoAntiguedad(lastDataGenerationTimestampEcmwf, ECMWF_UMBRAL_AMARILLO_MIN, ECMWF_UMBRAL_ROJO_MIN, ahoraMs);

                dataGenElement.innerHTML = `
                    <div style="margin: 5px 0 0 0; padding-left: 23px; padding-right: 0px; list-style-type: disc; line-height: 1.3; text-align: left;">
                        <p style="margin-bottom: -6px;">
                            <span style="font-size: 0.8rem;">${semaforoMF.emoji}</span> Arome-HD: ${t('actualizacion.hace', { tiempo: timeAgoMF })} <span style="color:#777; font-size: 0.9em; font-style:italic;">(${refMF})</span><br>
                            <span style="padding-left: 21px;">${textoFuturoMF}</span>
                        </p>
                        <p style="margin-bottom: -6px;">
                            <span style="font-size: 0.8rem;">${semaforoMin15.emoji}</span> Arome 15min: ${t('actualizacion.hace', { tiempo: timeAgoMin15 })} <span style="color:#777; font-size: 0.9em; font-style:italic;">(${refMin15})</span><br>
                            <span style="padding-left: 21px;">${textoFuturoMin15}</span>
                        </p>
                        <p style="margin-bottom: 4px;">
                            <span style="font-size: 0.8rem;">${semaforoEC.emoji}</span> ECMWF: ${t('actualizacion.hace', { tiempo: timeAgoEC })} <span style="color:#777; font-size: 0.9em; font-style:italic;">(${refEC})</span><br>
                            <span style="padding-left: 21px;">${textoFuturoEC}</span>
                        </p>
                    </div>`;
                    
            } else if (!hayErrorData) {
                dataGenElement.textContent = 'Cargando...';
            }
        }

        // --- C. ICONO FLOTANTE (NUBE) ---
        const offlineIcon = document.getElementById('offline-indicator');
        if (offlineIcon) {
            offlineIcon.style.display = mostrarErrorOffline ? 'flex' : 'none';
        }
    }

    // ===============================================================
    // 4. FUNCIONES DE DATOS (El Músculo)
    // ===============================================================

    async function PanelInfoActualizaciones_Web() {
        if (!navigator.onLine) return; 

        try {
            // Hacemos las tres peticiones a la vez (si una falla, no bloquea a las otras)
            const [resMF, resECMWF, resMin15] = await Promise.all([
                fetch("https://flydecision.com/json_timestamp_and_model_run_ref_time.txt?t=" + Date.now(), { cache: "no-store" }).catch(() => null),
                fetch("https://flydecision.com/json_timestamp_and_model_run_ref_time_ecmwf.txt?t=" + Date.now(), { cache: "no-store" }).catch(() => null),
                fetch("https://flydecision.com/json_timestamp_and_model_run_ref_time_15min.txt?t=" + Date.now(), { cache: "no-store" }).catch(() => null)
            ]);
            
            // Procesar Météo-France
            if (resMF && resMF.ok) {
                const textContent = (await resMF.text()).trim();
                if (textContent) {
                    const parts = textContent.split('|');
                    if (parts[0]) lastDataGenerationTimestamp = new Date(parts[0]).getTime();
                    if (parts[1]) jsonModelInitTimestamp = new Date(parts[1]).getTime();
                    else jsonModelInitTimestamp = lastDataGenerationTimestamp;
                    if (!isNaN(lastDataGenerationTimestamp)) hayErrorData = false; 
                }
            }

            // Procesar ECMWF
            if (resECMWF && resECMWF.ok) {
                const textContentE = (await resECMWF.text()).trim();
                if (textContentE) {
                    const partsE = textContentE.split('|');
                    if (partsE[0]) lastDataGenerationTimestampEcmwf = new Date(partsE[0]).getTime();
                    if (partsE[1]) jsonModelInitTimestampEcmwf = new Date(partsE[1]).getTime();
                    else jsonModelInitTimestampEcmwf = lastDataGenerationTimestampEcmwf;
                }
            }

            // Procesar Modelo 15 min (AROME HD)
            if (resMin15 && resMin15.ok) {
                const textContentM = (await resMin15.text()).trim();
                if (textContentM) {
                    const partsM = textContentM.split('|');
                    if (partsM[0]) lastDataGenerationTimestampMin15 = new Date(partsM[0]).getTime();
                    if (partsM[1]) jsonModelInitTimestampMin15 = new Date(partsM[1]).getTime();
                    else jsonModelInitTimestampMin15 = lastDataGenerationTimestampMin15;
                }
            }

        } catch (e) {
            console.warn("Error general timestamps:", e.message);
        }
    }

    async function PanelInfoActualizaciones_Status_auto_actualizaciones() {
        if (!navigator.onLine) return 60000;

        let nuevoIntervalo = 60000;
        let redMF = false;
        let redECMWF = false;
        let redMin15 = false;

        try {
            const [resMF, resECMWF, resMin15] = await Promise.all([
                fetch('https://flydecision.com/meteo-status.txt?t=' + Date.now()).catch(() => null),
                fetch('https://flydecision.com/meteo-status-ecmwf.txt?t=' + Date.now()).catch(() => null),
                fetch('https://flydecision.com/meteo-status-15min.txt?t=' + Date.now()).catch(() => null)
            ]);

            let currentlyUpdatingMF = false;
            let currentlyUpdatingEC = false;
            let currentlyUpdatingMin15 = false;

            // --- ESTADO MÉTÉO-FRANCE ---
            if (resMF && resMF.ok) {
                redMF = true;
                const rawTextMF = (await resMF.text()).trim();
                
                // Solo traducimos si es exactamente la frase de "en curso"
                currentStatusText = (rawTextMF === "Actualización en curso... ⏳") 
                    ? t('cron.Actualización en curso... ⏳') 
                    : rawTextMF;

                const upperText = rawTextMF.toUpperCase();
                if (upperText.includes("OPERATIVO")) {
                    currentlyUpdatingMF = false;
                } else if (!upperText.includes("ERROR") && !upperText.includes("FATAL") && !upperText.includes("FAILED")) {
                    currentlyUpdatingMF = true;
                    nuevoIntervalo = 5000;
                }
            }

            // --- ESTADO ECMWF ---
            if (resECMWF && resECMWF.ok) {
                redECMWF = true;
                const rawTextEC = (await resECMWF.text()).trim();

                // Solo traducimos si es exactamente la frase de "en curso"
                currentStatusTextEcmwf = (rawTextEC === "Actualización en curso... ⏳") 
                    ? t('cron.Actualización en curso... ⏳') 
                    : rawTextEC;

                const upperTextE = rawTextEC.toUpperCase();
                if (upperTextE.includes("OPERATIVO")) {
                    currentlyUpdatingEC = false;
                } else if (!upperTextE.includes("ERROR") && !upperTextE.includes("FATAL") && !upperTextE.includes("FAILED")) {
                    currentlyUpdatingEC = true;
                    nuevoIntervalo = 5000;
                }
            } else {
                // Texto de fallback en caso de error de red
                if (currentStatusTextEcmwf === 'Cargando...') {
                    currentStatusTextEcmwf = t('actualizacion.esperandoPrimerDato');
                }
            }

            // --- ESTADO MODELO 15 MIN (AROME HD) ---
            if (resMin15 && resMin15.ok) {
                redMin15 = true;
                const rawTextM = (await resMin15.text()).trim();

                // Solo traducimos si es exactamente la frase de "en curso"
                currentStatusTextMin15 = (rawTextM === "Actualización en curso... ⏳") 
                    ? t('cron.Actualización en curso... ⏳') 
                    : rawTextM;

                const upperTextM = rawTextM.toUpperCase();
                if (upperTextM.includes("OPERATIVO")) {
                    currentlyUpdatingMin15 = false;
                } else if (!upperTextM.includes("ERROR") && !upperTextM.includes("FATAL") && !upperTextM.includes("FAILED")) {
                    currentlyUpdatingMin15 = true;
                    nuevoIntervalo = 5000;
                }
            } else {
                // Texto de fallback en caso de error de red
                if (currentStatusTextMin15 === 'Cargando...') {
                    currentStatusTextMin15 = t('actualizacion.esperandoPrimerDato');
                }
            }

            // --- LÓGICA DE AVISO (MODAL) ---
            const mfTermino = (window.oldUpdatingMF && !currentlyUpdatingMF);
            const ecTermino = (window.oldUpdatingEC && !currentlyUpdatingEC);
            const minTermino = (window.oldUpdatingMin15 && !currentlyUpdatingMin15);

            let modelosRecientes = [];
            // Traducimos también los nombres de los modelos para el aviso modal
            if (mfTermino) modelosRecientes.push(t('actualizacion.avisoModelos.viento'));
            if (ecTermino) modelosRecientes.push(t('actualizacion.avisoModelos.general'));

            if (modelosRecientes.length > 0) {
                if (guiaActiva) {
                    actualizacionesPendientes = actualizacionesPendientes.concat(modelosRecientes);
                    actualizacionesPendientes = [...new Set(actualizacionesPendientes)];
                } else {
                    mostrarAvisoActualizacionMeteo(modelosRecientes);
                }
            }

            // El aviso de Min15 es silencioso salvo que el usuario tenga abierto justo el modal de detalle 15 min: al actualizarse cada hora, avisar siempre sería muy molesto.
            if (minTermino && window.modalMinutely15Abierto) {
                avisarActualizacionMinutely15();
            }

            // LÓGICA DE AVISO DE RETRASO INUSUAL
            // Usamos sessionStorage para que solo salga una vez mientras la pestaña/app esté abierta
            if (!sessionStorage.getItem('METEO_AVISO_RETRASO_VISTO')) {
                let modelosRetrasados = [];
                
                // Comprobamos si el texto original del servidor incluye la alerta
                if (currentStatusText && (currentStatusText.includes("Unusual delay") || currentStatusText.includes("retraso inusual") || currentStatusText.includes("⏳⏳"))) {
                    modelosRetrasados.push("Météo-France");
                }
                
                if (currentStatusTextEcmwf && (currentStatusTextEcmwf.includes("Unusual delay") || currentStatusTextEcmwf.includes("retraso inusual") || currentStatusTextEcmwf.includes("⏳⏳"))) {
                    modelosRetrasados.push("ECMWF");
                }

                if (modelosRetrasados.length > 0) {
                    // Marcamos como visto ANTES de mostrarlo para asegurar que no se duplique
                    sessionStorage.setItem('METEO_AVISO_RETRASO_VISTO', 'true');
                    
                    // Unimos los nombres (Ej: "Météo-France" o "Météo-France y ECMWF")
                    const modelosTexto = modelosRetrasados.join(" y ");
                    
                    // Llamamos a tu gestor de mensajes modal estándar
                    mensajeModalAceptar(
                        t('retrasoInusual.titulo'), 
                        t('retrasoInusual.mensaje', { modelos: modelosTexto })
                    );
                }
            }

            window.oldUpdatingMF = currentlyUpdatingMF;
            window.oldUpdatingEC = currentlyUpdatingEC;
            window.oldUpdatingMin15 = currentlyUpdatingMin15;
            statusActualizaciónEnCurso = (currentlyUpdatingMF || currentlyUpdatingEC || currentlyUpdatingMin15);

            if (!redMF && !redECMWF && !redMin15) {
                gestionarCambioConexion('offline');
            } else {
                gestionarCambioConexion('online');
            }

        } catch (e) {
            console.warn("Fallo fetch status:", e.message);
            gestionarCambioConexion('offline');
        }
        return nuevoIntervalo;
    }

    // ===============================================================
    // 5. CICLO Y DETECTORES (El Corazón)
    // ===============================================================

    async function cicloActualizacion() {
        if (timerCiclo) clearTimeout(timerCiclo);

        if (!avisoOfflineActivo) {
            const [_, intervaloSugerido] = await Promise.all([
                PanelInfoActualizaciones_Web(),
                PanelInfoActualizaciones_Status_auto_actualizaciones()
            ]);
            if (intervaloSugerido) {
                intervaloActualizacion = intervaloSugerido;
            } else {
                intervaloActualizacion = 60000;
            }
        } else {
            // AÑADIDO: aunque estemos "offline", seguimos comprobando conectividad real
            // de forma periódica, sin depender de eventos de interfaz (online/offline del
            // navegador o del plugin Network), que pueden no dispararse nunca si la interfaz
            // nunca cambia pero sí falla la conectividad real a internet.
            const recuperado = await comprobarConectividadReal();
            if (recuperado) {
                gestionarCambioConexion('online');
            }
            intervaloActualizacion = 15000; // reintento cada 15s mientras estemos offline
        }

        refrescoPanelInfoActualizaciones();
        timerCiclo = setTimeout(cicloActualizacion, intervaloActualizacion);
    }

    // --- Listeners y Heartbeat ---
    
    // 1. Eventos del Navegador
    window.addEventListener('offline', () => gestionarCambioConexion('offline'));
    window.addEventListener('online',  () => gestionarCambioConexion('online'));

    // Cierra automáticamente todos los Tippys al hacer scroll en la ventana
    window.addEventListener('scroll', () => {
        if (typeof tippy !== 'undefined' && tippy.hideAll) {
            tippy.hideAll();
        }
    }, { passive: true });

    // También al hacer scroll dentro del contenedor propio de la tabla
    const tablaWrapper = document.querySelector('.tabla-wrapper');
    if (tablaWrapper) {
        tablaWrapper.addEventListener('scroll', () => {
            if (typeof tippy !== 'undefined' && tippy.hideAll) {
                tippy.hideAll();
            }
        }, { passive: true });
    }

    // ===============================================================
    // 5.5 Monitorización red con plugin Capacitor Network
    // ===============================================================

    async function iniciarMonitorRedNativo() {
        // Solo si estamos en la App con Capacitor
        if (typeof Capacitor !== 'undefined' && Capacitor.Plugins.Network) {
            const Network = Capacitor.Plugins.Network;

            // 1. CHEQUEO INICIAL: ¿Cómo hemos despertado?
            const status = await Network.getStatus();
            
            if (status.connected) {
                console.log(new Date().toLocaleString(), "⚡ [Nativo] Red detectada al inicio. Forzando ONLINE.");
                // Forzamos la verdad: HAY RED.
                // Esto evita que el Heartbeat falle los primeros segundos y active el timerOffline.
                avisoOfflineActivo = false;
                
                // Si hubiera algún timer de "se ha ido la luz" pendiente, lo matamos.
                if (timerOffline) { clearTimeout(timerOffline); timerOffline = null; }
                
                // Opcional: Si quieres refrescar la pantalla ya, descomenta:
                // cicloActualizacion(); 
            } else {
                console.log(new Date().toLocaleString(), "⚡ [Nativo] Arrancamos SIN red.");
                gestionarCambioConexion('offline');
            }

            // 2. ESCUCHA ACTIVA: El sistema operativo nos avisa de cambios
            Network.addListener('networkStatusChange', (status) => {
                console.log(new Date().toLocaleString(), '📡 [Nativo] Cambio de red:', status.connected);
                if (status.connected) {
                    gestionarCambioConexion('online');
                } else {
                    gestionarCambioConexion('offline');
                }
            });
        }
    }

    // ===============================================================
    // 6. ARRANQUE
    // ===============================================================
    // Como ya estamos dentro del evento i18nReady, sabemos que la web está lista. Lo ejecutamos directamente sin esperar al window.onload.
    
    if (typeof iniciarMonitorRedNativo === 'function') {
        iniciarMonitorRedNativo();
    }

    // Le damos 1 segundo de respiro para que la tabla se dibuje primero, y luego lanzamos el fetch de los txt
    setTimeout(() => {
        if (typeof cicloActualizacion === 'function') {
            cicloActualizacion(); 
        }
    }, 1000);

    limpiarSeguimientosExpirados();

	// ---------------------------------------------------------------
	// 🔴 CONFIGURACIÓN GLOBAL DE TOOLTIPS (TIPPY.JS)
	// ---------------------------------------------------------------
	// Usamos 'delegate' para que funcione tanto en botones estáticos (HTML)como en los dinámicos (creados por JS en la tabla) sin reinicializar.

    if (typeof tippy === 'function' && typeof tippy.delegate === 'function') {

        tippy.delegate('body', {
            target: '[data-tippy-content]',
            trigger: 'click',
            theme: 'meteo-custom',
            allowHTML: true,
            interactive: true,
            placement: 'auto',
            appendTo: document.body,
            maxWidth: 400, // Dejamos que CSS limite el ancho real
            hideOnClick: true, // <--- 1. Cierra automáticamente al hacer clic fuera

            // CONFIGURACIÓN DE POSICIONAMIENTO MEJORADA
            popperOptions: {
                modifiers: [
                    {
                        name: 'preventOverflow',
                        options: {
                            // SOLUCIÓN: Usamos un objeto en lugar de un número único.
                            // top: 60 -> Deja 60px de "aire" arriba (suficiente para librar cualquier barra de notificaciones)
                            // left/right: 10 -> Aprovecha el ancho al máximo en los lados
                            padding: { top: 60, bottom: 90, left: 10, right: 10 }, 
                            
                            boundary: 'viewport',
                            
                            // Esto ayuda a que si es más alto que la pantalla, priorice ver el inicio
                            altAxis: true, 
                            
                            // IMPORTANTE: Aseguramos que respete el padding incluso si tiene que empujar la ventana
                            tether: false, 
                        },
                    },
                    {
                        name: 'flip',
                        options: {
                            // Aquí también podemos proteger el top si decide voltearse
                            padding: { top: 60, bottom: 90, left: 10, right: 10 }
                        }
                    }
                ],
            },

            // INYECCIÓN DE ESTRUCTURA (X FIJA + CONTENIDO CON SCROLL SELECTIVO)
            onCreate(instance) {
                const content = instance.props.content;
                
                // Comprobar si el elemento que ha disparado el popup es el botón "i" de despegue
                const esInfoDespegue = instance.reference.getAttribute('data-tippy-type') === 'despegue-info';

                // 1. Creamos un fragmento de documento para no repintar muchas veces
                const fragment = document.createDocumentFragment();

                // 2. Cabecera (Contenedor de la X)
                const header = document.createElement('div');
                header.className = 'tippy-header';
                
                const btnCerrar = document.createElement('div');
                btnCerrar.className = 'tippy-close-btn';
                btnCerrar.innerHTML = '&times;';
                
                // Evento de cerrar
                btnCerrar.onclick = (e) => {
                    e.stopPropagation();
                    instance.hide();
                };

                header.appendChild(btnCerrar);

                // 3. Área de Scroll (Contenido)
                const scrollArea = document.createElement('div');
                scrollArea.className = 'tippy-scroll-area';
                
                // Aplicar límites de altura y scroll vertical únicamente para el botón "i" del despegue
                if (esInfoDespegue) {
                    scrollArea.style.maxHeight = '330px';
                    scrollArea.style.overflowY = 'auto';
                    scrollArea.style.paddingRight = '8px';
                    scrollArea.style.boxSizing = 'border-box';
                }
                
                scrollArea.innerHTML = content;
                fragment.appendChild(header);
                fragment.appendChild(scrollArea);

                instance.setContent(fragment);
            }
        });
    }

	// ---------------------------------------------------------------
	// 🔴 INICIALIZACIÓN DE CHECKBOXES Y BOTÓN RESET
	// ---------------------------------------------------------------
	
    document.getElementById("chkMostrarVientoAlturas").checked = chkMostrarVientoAlturas;
    document.getElementById("chkMostrarCizalladura").checked = chkMostrarCizalladura;
    document.getElementById("chkActivarVibracion").checked = (localStorage.getItem("METEO_VIBRACION_ACTIVA") !== "false");

    // Modo simple / avanzado
    const modoSimpleActivo = localStorage.getItem("METEO_MODO_SIMPLE") === "true";
    const radSimple = document.getElementById('radModoSimple');
    const radAvanzado = document.getElementById('radModoAvanzado');
    if (radSimple) radSimple.checked = modoSimpleActivo;
    if (radAvanzado) radAvanzado.checked = !modoSimpleActivo;
    
    // ECMWF Checks
    //if (document.getElementById("chkMostrarPrecipitacion")) document.getElementById("chkMostrarPrecipitacion").checked = chkMostrarPrecipitacion;
    if (document.getElementById("chkMostrarProbPrecipitacion")) document.getElementById("chkMostrarProbPrecipitacion").checked = chkMostrarProbPrecipitacion;
    //if (document.getElementById("chkMostrarBaseNube")) document.getElementById("chkMostrarBaseNube").checked = chkMostrarBaseNube;
    if (document.getElementById("chkMostrarXC")) document.getElementById("chkMostrarXC").checked = chkMostrarXC;
    
    // --- 2. Sincronizar el estado visual de los botones de radio ECMWF ---
    const currentEcmwfMode = localStorage.getItem("METEO_CONFIG_ECMWF_MODE") || "off";
    if (currentEcmwfMode === "off") {
        const rad = document.getElementById("radEcmwfOff");
        if (rad) rad.checked = true;
    } else if (currentEcmwfMode === "desplegable") {
        const rad = document.getElementById("radEcmwfDesplegable");
        if (rad) rad.checked = true;
    } else if (currentEcmwfMode === "permanente") {
        const rad = document.getElementById("radEcmwfPermanente");
        if (rad) rad.checked = true;
    }

    document.getElementById("chkMostrarXC").checked = chkMostrarXC;
    if (document.getElementById("chkOrdenarPorXC")) document.getElementById("chkOrdenarPorXC").checked = chkOrdenarPorXC;

    const chkSoloLuz = document.getElementById("chkMostrarSoloHorasDiurnas");
    if (chkSoloLuz) {
        chkSoloLuz.checked = (localStorage.getItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ") !== "false");
    }

    const elDias = document.getElementById('valor-dias-seguimiento');
    if (elDias) {
        const idxDias = PASOS_DIAS_SEGUIMIENTO.indexOf(diasSeguimiento);
        elDias.textContent = (diasSeguimiento === Infinity) ? '∞' : diasSeguimiento;
        const btnMenos = document.getElementById('stepper-seguimiento-menos');
        const btnMas   = document.getElementById('stepper-seguimiento-mas');
        if (btnMenos) btnMenos.disabled = (idxDias <= 0);
        if (btnMas)   btnMas.disabled   = (idxDias >= PASOS_DIAS_SEGUIMIENTO.length - 1);
    }

	window.resetFiltroDistancia = function(reconstruir = true) { //flag para que, si le hemos llamado desde activarEdicionFavoritos(), que ya tiene construir_tabla, no se llame otra vez aquí, ya que ya se hace desde esa función (bloquearía navegador)

        // Actualizamos variable de control ANTES de mover el slider
        ultimaDistanciaConfirmada = MAX_INDEX;

        // A. Resetear valor del slider
        if (typeof distanciaSlider !== 'undefined' && distanciaSlider.noUiSlider) {
            distanciaSlider.noUiSlider.set(MAX_INDEX);
        }

        // --- NUEVO: Desmarcar botón de "incluir no favoritos" al resetear ---
        const btnIncNoFavs = document.getElementById('btn-incluir-no-favs-distancia');
        if (btnIncNoFavs) {
            btnIncNoFavs.classList.remove('activo', 'filtro-aplicado');
        }

        // C. Limpieza Visual (Quitar clases de activo y rojo)
        const divPanel = document.getElementById('div-filtro-distancia');
        const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');

        const navDistance = document.getElementById('nav-distance');
        if (navDistance) navDistance.classList.remove('filtrado');

        if (divPanel) divPanel.classList.remove("activo");          // Cerrar panel
        //if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo'); // Quitar borde panel

        // BOTÓN BUSCAR DESACTIVADO. Recalcular botón azul al resetear y cerrar el panel
        // if (typeof window.activarMenuInferior === 'function') {
        //     const searchContainer = document.getElementById('floating-search-container');
        //     const isSearchVisible = searchContainer && !searchContainer.classList.contains('floating-search-hidden');
            
        //     if (isSearchVisible) {
        //         window.activarMenuInferior(document.getElementById('nav-search'));
        //     } else {
        //         window.activarMenuInferior(document.getElementById('nav-home'));
        //     }
        // }

        // Recalcular botón azul al resetear y cerrar el panel
        // if (typeof window.activarMenuInferior === 'function') {
        //     window.activarMenuInferior(document.getElementById('nav-home'));
        // }

        if (reconstruir) { construir_tabla(); }
    }

    // ---------------------------------------------------------------
	// 🔴 LISTENER PARA CIERRA EL PANEL DE CONFIGURACIÓN ABIERTO AL TOCAR ÁREA VACÍA FUERA
	// ---------------------------------------------------------------

    document.addEventListener('click', function(event) {
        const panelConfig = document.getElementById('div-configuracion');
        const overlay = document.getElementById('msgActualizando...');

        // 1. Si el loader está activo, no hacemos nada
        if (overlay && overlay.classList.contains('loader-activo')) return;

        // 2. PROTECCIÓN FANTASMA: Si el elemento clicado ya no existe en el DOM (repintado)
        if (!document.body.contains(event.target)) return;

        // 3. LÓGICA DE CIERRE DE PANELES
        if (panelConfig && panelConfig.classList.contains('activo')) {
            
            // --- ZONA PROTEGIDA ---
            const clicEnZonaProtegida = 
                event.target.closest('#div-configuracion') || 
                event.target.closest('#btn-div-configuracion-toggle') ||
                event.target.closest('.bottom-nav') ||
                event.target.closest('.tippy-box') ||        
                event.target.closest('.mensaje-modal') ||    
                event.target.closest('.mensaje-no-modal');

            if (!clicEnZonaProtegida) {
                if (typeof alternardivConfiguracion === 'function') {
                    alternardivConfiguracion(event, true); // Forzamos el cierre de acordeones
                }
            }
        }
    });

    // ---------------------------------------------------------------
	// 🔴 ANDROID: Control botón "Atras" de Android
	// ---------------------------------------------------------------
    
    // Solo activamos esto si estamos en una App Nativa (Android)
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        
        const App = window.Capacitor.Plugins.App;

        App.addListener('backButton', ({ canGoBack }) => {

            // --- PRIORIDAD 0: Tippy.js (Globos de ayuda) ---
            const tippyAbierto = document.querySelector('[data-tippy-root]');
            if (tippyAbierto) {
                if (typeof tippy !== 'undefined' && tippy.hideAll) {
                    tippy.hideAll();
                } else {
                    document.body.click();
                }
                return; 
            }

            // --- PRIORIDAD 0.5: Guías interactivas (Driver.js) ---
            if (typeof guiaActiva !== 'undefined' && guiaActiva === true) {
                const btnCerrarGuia = document.querySelector('.driver-popover-close-btn');
                if (btnCerrarGuia) {
                    btnCerrarGuia.click();
                    return; 
                }
            }

            // --- PRIORIDAD 1: Mensajes MODALES (Bloqueantes) ---
            const modalAbierto = document.querySelector('.mensaje-modal.visible');
            if (modalAbierto) {
                
                // Si el modal abierto es el de Idioma (Paso 0) y pulsan "Atrás"
                if (!localStorage.getItem("METEO_IDIOMA_ELEGIDO")) { // El selector de idioma es el único modal que se muestra cuando la variable METEO_IDIOMA_ELEGIDO no existe
                    localStorage.setItem("METEO_IDIOMA_ELEGIDO", "true"); // Lo marcamos como elegido
                    GestorMensajes.ocultar(); // Cerramos Paso 0
                    
                    if (typeof window.mostrarPaso1General === 'function') {
                        window.mostrarPaso1General(); // Abrimos Paso 1 (Onboarding)
                    }
                    return; 
                }

                GestorMensajes.ocultar();
                return; 
            }

            // --- PRIORIDAD 1.5: Modal de Geolocalización / Mapa Origen ---
            const modalMapaSelect = document.getElementById('modal-mapa');
            if (modalMapaSelect && modalMapaSelect.style.display !== 'none') {
                modalMapaSelect.style.display = 'none';
                return;
            }

            // --- PRIORIDAD 1.8: Si el menú de bienvenida está abierto, salir de la app ---
            if (document.getElementById('paso1-overlay')) {
                confirmarSalidaApp();
                return;
            }

            // --- PRIORIDAD 1.85: Panel Configuración (Ajustes) ---
            // IMPORTANTE: Va antes que el mapa porque flota por encima de todo
            const panelConfig = document.getElementById("div-configuracion");
            if (panelConfig && panelConfig.classList.contains("activo")) {
                alternardivConfiguracion(null, true); // Forzamos el cierre de acordeones
                return;
            }

            // --- PRIORIDAD 1.9: Si hay un popup de despegue abierto en el mapa, lo cerramos primero ---
            const vistaMapaParaPopup = document.getElementById('vista-mapa');
            if (vistaMapaParaPopup && vistaMapaParaPopup.style.display === 'flex') {
                const popupAbierto = document.querySelector('.leaflet-popup');
                if (popupAbierto && typeof map !== 'undefined') {
                    map.closePopup();
                    return; 
                }
            }

            // --- PRIORIDAD 2: Modo Edición Favoritos ---
            if (window.venirDeEdicionActiva === true) {
                // Detectamos si la usuaria está físicamente viendo el mapa
                const enMapa = document.getElementById('vista-mapa')?.style.display === 'flex';
                
                // 1. PRIMERO: Si estamos en un "desvío" (modoEdicionFavoritos == false temporalmente)
                // Queremos VOLVER al modo de edición (al mapa o a la tabla según corresponda)
                if (!modoEdicionFavoritos) {
                    volverAEdicionDesdeDesvio();
                    return;
                }

                // 2. Si estamos activamente editando y pulsamos atrás, queremos SALIR o CANCELAR:
                if (window.onboardingMapaActivo) {
                    // Cancelar el onboarding del mapa
                    window.onboardingMapaActivo = false;
                    window.venirDeEdicionActiva = false;
                    modoEdicionFavoritos = false;
                    soloFavoritos = true; 
                    
                    const btnFiltros = document.getElementById('btn-filtros-mapa');
                    if (btnFiltros) btnFiltros.style.display = '';
                    
                    document.body.classList.remove('modo-edicion-tabla');
                    const divMenu = document.getElementById('div-menu');
                    if (divMenu) divMenu.classList.remove('mode-editing');
                    const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
                    if (divMenu2) divMenu2.classList.remove('mode-editing');
                    
                    cambiarVista('tabla');
                    if (typeof limpiarBuscador === 'function') limpiarBuscador();
                    construir_tabla();
                    
                    if (typeof window.mostrarPaso1General === 'function') {
                        window.mostrarPaso1General();
                    }
                } else {
                    // Caso normal: Estamos en la TABLA en modo edición y queremos cancelar
                    const esPrimeraVisita = !localStorage.getItem("METEO_PRIMERA_VISITA_HECHA");
                    const sinFavoritos = obtenerFavoritos().length === 0;
                    
                    if (esPrimeraVisita && sinFavoritos) {
                        // Cancelar onboarding de la tabla
                        modoEdicionFavoritos = false;
                        soloFavoritos = true;
                        window.venirDeEdicionActiva = false;
                        document.body.classList.remove('modo-edicion-tabla');
                        const divMenu = document.getElementById('div-menu');
                        if (divMenu) divMenu.classList.remove('mode-editing');
                        const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
                        if (divMenu2) divMenu2.classList.remove('mode-editing');
                        const panelHorario = document.querySelector('.div-filtro-horario');
                        if (panelHorario) panelHorario.style.display = '';
                        const panelDistancia = document.getElementById('div-filtro-distancia');
                        if (panelDistancia) panelDistancia.classList.remove('activo');
                        if (typeof limpiarBuscador === 'function') limpiarBuscador();
                        construir_tabla();
                        
                        if (typeof window.mostrarPaso1General === 'function') {
                            window.mostrarPaso1General();
                        }
                    } else {
                        // Si ya tiene favoritos o es recurrente, usamos tu función centralizada
                        finalizarEdicionFavoritos();
                    }
                }
                return; 
            }

            // --- PRIORIDAD 3: Otros Mensajes NO-MODALES ---
            const mensajeFlotante = document.querySelector('.mensaje-no-modal.visible');
            if (mensajeFlotante) {
                GestorMensajes.ocultar();
                return;
            }

            // --- PRIORIDAD 5: Salir de la App desde el Mapa ---
            const vistaMapa = document.getElementById('vista-mapa');
            if (vistaMapa && vistaMapa.style.display === 'flex') {

                // infoPanel (Despegues) 
                const infoPanelCerrar = document.getElementById('infoPanel');
                if (infoPanelCerrar && !infoPanelCerrar.classList.contains('retraido')) {
                    document.getElementById('buttonCerrar')?.click();
                    return;
                }
                
                // infoPanel3 (Balizas)
                const infoPanel3Cerrar = document.getElementById('infoPanel3');
                if (infoPanel3Cerrar && !infoPanel3Cerrar.classList.contains('retraido')) {
                    document.getElementById('buttonCerrar3')?.click();
                    return;
                }

                // infoPanel2 (Filtros)
                const infoPanel2Cerrar = document.getElementById('infoPanel2');
                if (infoPanel2Cerrar && !infoPanel2Cerrar.classList.contains('retraido')) {
                    document.getElementById('buttonCerrar2')?.click();
                    return;
                }

                // Selector nativo de capas Leaflet
                if (document.querySelector('.leaflet-control-layers-expanded') && window.capasLeaflet) {
                    window.capasLeaflet.collapse();
                    return;
                }

                // Si estamos en el mapa (y Ajustes no está abierto, ni hay popups), el botón Atrás ofrece salir
                if (typeof confirmarSalidaApp === 'function') {
                    confirmarSalidaApp();
                }
                return; 
            }

            // --- PRIORIDAD 6: Paneles Laterales y Buscador (Solo en Tabla) ---

            // A. Panel Filtro Distancia
            const panelDistancia = document.getElementById("div-filtro-distancia");
            if (panelDistancia && panelDistancia.classList.contains("activo")) {
                const sliderDistancia = document.getElementById('distancia-slider');
                let filtrandoCosas = false;
                
                if (sliderDistancia && sliderDistancia.noUiSlider) {
                    const maxIndex = CORTES_DISTANCIA_GLOBAL.length - 1;
                    const currentValue = Math.round(parseFloat(sliderDistancia.noUiSlider.get()));
                    if (currentValue < maxIndex) filtrandoCosas = true;
                }

                if (filtrandoCosas) {
                    if (typeof resetFiltroDistancia === 'function') resetFiltroDistancia(); 
                } else {
                    panelDistancia.classList.remove("activo");
                    
                    const searchContainer = document.getElementById('floating-search-container');
                    if (searchContainer && !searchContainer.classList.contains('floating-search-hidden')) {
                        window.activarMenuInferior(document.getElementById('nav-search'));
                    } else {
                        window.activarMenuInferior(document.getElementById('nav-home'));
                    }
                }
                return;
            }

            // B. Buscador Flotante (Permanente)
            const searchInput = document.getElementById('buscador-despegues-provincias');
            if (searchInput && searchInput.value.trim() !== '') {
                if (typeof limpiarBuscador === 'function') limpiarBuscador(); 
                searchInput.blur();
                return;
            }

            // C. Filtro Seguimiento activo
            if (soloSeguimiento) {
                soloSeguimiento = false;
                const btnFiltroSeg = document.getElementById('btn-filtro-seguimiento-toggle');
                if (btnFiltroSeg) btnFiltroSeg.classList.remove('activo', 'filtro-aplicado');
                construir_tabla();
                return;
            }

            // --- PRIORIDAD FINAL: Salir de la App (Desde la Tabla Principal) ---
            if (typeof confirmarSalidaApp === 'function') {
                confirmarSalidaApp();
            }
        });
    }

    // Función específica para preguntar antes de matar la app
    function confirmarSalidaApp() {
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: `<p>${t('salirApp.pregunta')}</p>`,
            botones: [
                {
                    texto: t('salirApp.no'),
                    onclick: function() { GestorMensajes.ocultar(); },
                    estilo: 'secundario'
                },
                {
                    texto: t('salirApp.si'),
                    estilo: 'background-color: #d32f2f; color: white;', // Rojo para indicar cierre
                    onclick: function() {
                        // Esta orden cierra la App nativa de Android
                        window.Capacitor.Plugins.App.exitApp();
                    }
                }
            ]
        });
    }    

    // ---------------------------------------------------------------
	// 🔴 ANDROID: Solución para el problema de que ocupe el área de notificaciones Android y otras soluciones
	// ---------------------------------------------------------------

    const esAndroidApp = window.Capacitor && window.Capacitor.getPlatform() === 'android';

    if (esAndroidApp) {
        // 1. Extraemos StatusBar y TextZoom y SystemBars de los plugins
        const { StatusBar, TextZoom, SystemBars } = window.Capacitor.Plugins;

        // 2. Aplicamos la clase base INMEDIATAMENTE
        document.body.classList.add('modo-android-manual');

        // Función asíncrona para asegurar el orden de ejecución
        const configurarAndroid = async () => {
            try {
                // --- A. CONFIGURACIÓN DE STATUS BAR ---
                
                // Arriba: Transparente e iconos negros
                if (StatusBar) {
                    // overlaysWebView es la clave para la transparencia arriba
                    try {
                        await StatusBar.setOverlaysWebView({ overlay: true });
                        // En Android 15 el overlay ya hace la barra transparente. 
                        // Mantenemos la línea por compatibilidad con Androids antiguos, 
                        // pero capturamos el error si el plugin se niega a ejecutarla en Android 15.
                        try {
                            await StatusBar.setBackgroundColor({ color: '#00000000' });
                        } catch (e) { /* Silenciamos el error en versiones nuevas */ }
                        
                        await StatusBar.setStyle({ style: 'DARK' }); 
                    } catch(err) {
                        console.warn('Error configurando StatusBar:', err);
                    } 
                }
                
                if (SystemBars) {
                    // style: 'LIGHT' pone botones de navegación negros en la nueva API
                    await SystemBars.setStyle({ style: 'LIGHT' }); 
                }

                // Leer la altura real
                const info = await StatusBar.getInfo();
                const altura = info.height;
                console.log(`📏 Altura detectada: ${altura}px`);

                // Inyectar en CSS
                if (altura > 0) {
                    document.documentElement.style.setProperty('--android-sb-height', `${altura}px`);
                }

                // --- B. CONFIGURACIÓN DE TAMAÑO DE TEXTO (TEXTZOOM) ---
                // Esto es lo nuevo que corrige el problema de la letra gigante
                if (TextZoom) {
                    await TextZoom.set({ value: 1 }); // Fuerza el tamaño al 100% (16px reales)
                    console.log('✅ TextZoom forzado a 1');
                }

            } catch (err) {
                console.warn('Error configurando Android (StatusBar/TextZoom/SystemBars):', err);
                
                // Fallback de seguridad por si falla la altura
                document.documentElement.style.setProperty('--android-sb-height', '35px');
            }
        };

        // Ejecutamos todo junto
        configurarAndroid();
    }

    // ---------------------------------------------------------------
	// 🔴 ANDROID: Detectar el "Despertar" de la App (Resume) para que pida datos nuevos y se actualice slider rango horario
	// ---------------------------------------------------------------

    function iniciarDetectorResume() {
            
            // Esta lógica funciona tanto para App nativa como para Web (usando visibilitychange)
            const checkResume = async () => {
            
            // Si el usuario es nuevo y está en pleno Onboarding, le prohibimos a esta función que intente actualizar o construir tablas por detrás.
            const configHecha = localStorage.getItem("METEO_PRIMERA_VISITA_HECHA");
            const entroPorMapa = sessionStorage.getItem("METEO_ENTRO_POR_MAPA_YA_VISITADO");
            if (!configHecha && !entroPorMapa) return;

            const ahora = Date.now();
            // Si lastDataGenerationTimestamp es 0 o null, forzamos antigüedad máxima
            const timestampDatosLocal = lastDataGenerationTimestamp || 0;
            const antiguedad = ahora - timestampDatosLocal; 
            
            // 2 horas
            const UMBRAL_RECARGA = 7200000; 

            if (antiguedad > UMBRAL_RECARGA) { 
                
                statusActualizaciónEnCurso = false; 

                // Comprobación puramente asíncrona contra el servidor: no hay ningún
                // cálculo pesado que proteger, así que dejamos pasar los toques
                // (mover el mapa, tocar la tabla...) mientras se resuelve en segundo plano.
                const overlayResume = document.getElementById('msgActualizando...');
                if (overlayResume) overlayResume.classList.add('spinner-transparente');
                mostrarLoading(); // Mostramos spinner por si acaso, sin bloquear
                
                try {
                    // 1. PASO CLAVE: Consultamos SOLO el archivo ligero de texto (bytes)
                    // Usamos un timeout corto (3s) para no bloquear si la red es mala
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch("https://flydecision.com/json_timestamp_and_model_run_ref_time.txt?t=" + Date.now(), { 
                        cache: "no-store",
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const textContent = (await response.text()).trim();
                        const parts = textContent.split('|');
                        const serverTimestamp = parts[0] ? new Date(parts[0]).getTime() : 0;

                        if (serverTimestamp > timestampDatosLocal) {
                            await construir_tabla(true); 
                        } else {
                            construir_tabla(false); 
                        }
                    } else {
                        throw new Error("Error al leer timestamp del servidor");
                    }

                } catch (error) {
                    console.warn("⚠️ Fallo al comprobar versión servidor (u Offline). Manteniendo caché local.", error);
                    // Si falla la comprobación (ej. túnel, offline), no borramos nada.
                    // Repintamos con caché para asegurar que la UI esté bien.
                    construir_tabla(false);
                }

                // 3. Lanzamos el ciclo de verificación de status para actualizar textos de "hace X tiempo"
                if (typeof cicloActualizacion === 'function') {
                    cicloActualizacion(); 
                }

            } else {
                //console.log("✅ Datos recientes (<2h). Solo refresco UI.");
                if (typeof refrescoPanelInfoActualizaciones === 'function') {
                    refrescoPanelInfoActualizaciones();
                }
                
                if (typeof iniciarMonitorRedNativo === 'function') {
                    iniciarMonitorRedNativo();
                }
            }
        };

        // A. DETECCIÓN NATIVA (Android/iOS)
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative) {
            const AppPlugin = window.Capacitor.Plugins ? window.Capacitor.Plugins.App : null;
            if (AppPlugin) {
                AppPlugin.addListener('resume', checkResume);
            }
        } 

        // B. DETECCIÓN WEB (PC / Móvil navegador)
        // Esto cubre el caso de cambiar de pestaña y volver horas después
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'visible') {
                checkResume();
            }
        });
    }

    // EJECUCIÓN
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarDetectorResume);
    } else {
        iniciarDetectorResume();
    }

    // Un pequeño retraso de 1 segundo para que la tabla cargue primero y no sea tan brusco
    setTimeout(comprobarAvisoCambiosPuntuacionXC, 1000);

    // ---------------------------------------------------------------
	// 🔴 ANDROID: GESTOR DE ENLACES EXTERNOS (In-App Browser)
	// ---------------------------------------------------------------

    async function abrirLinkExterno(url) {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            const Plugins = window.Capacitor.Plugins;
            const AppLauncher = Plugins.AppLauncher;
            const Browser = Plugins.Browser;
            const platform = window.Capacitor.getPlatform();

            let appId = null;

            // 1. Identificar AppId
            if (url.includes('windy.com')) {
                appId = platform === 'android' ? 'com.windyty.android' : 'windyapp://';
            } else if (url.includes('meteo-parapente.com')) {
                appId = platform === 'android' ? 'com.meteo_parapente' : 'meteoparapente://';
            } else if (url.includes('meteoblue.com')) {
                appId = platform === 'android' ? 'com.meteoblue.droid' : 'meteoblue://';
            }

            // 2. Intentar apertura nativa
            if (appId) {
                try {
                    // En Android usamos el prefijo package: para asegurar detección
                    const checkUrl = platform === 'android' ? `package:${appId}` : appId;
                    const { value: isInstalled } = await AppLauncher.canOpenUrl({ url: checkUrl });

                    if (isInstalled) {
                        await AppLauncher.openUrl({ url: url });
                        return; // Abrimos la app y salimos
                    }
                } catch (e) {
                    console.warn("Fallo al intentar abrir app nativa", e);
                }
            }

            // 3. FALLBACK: Navegador Integrado (Pestaña azul dentro de tu app)
            // Solo llegamos aquí si la app nativa no está instalada
            if (Browser) {
                try {
                    await Browser.open({ 
                        url: url, 
                        toolbarColor: '#d9ebf9',
                        presentationStyle: 'popover' 
                    });
                    return; 
                } catch (err) {
                    console.error("Error al abrir Browser interno", err);
                }
            }

            // 4. ULTIMÍSIMO RECURSO: Abrir fuera (Chrome/Safari)
            window.open(url, '_system');

        } else {
            // MODO WEB (PC)
            window.open(url, '_blank');
        }
    }

    window.abrirLinkExterno = abrirLinkExterno; // Esto hace que la función sea visible para los onclick="" de tu HTML generado

    // ---------------------------------------------------------------
    // 🔴 FUNCIÓN PARA ABRIR EL MAPA INTEGRADO DESDE LA TABLA
    // ---------------------------------------------------------------
    window.abrirMapaIntegrado = function(lat, lon, nombreDespegue) {
        // 1. Cerramos todos los globos Tippy de la tabla
        if (typeof tippy !== 'undefined' && tippy.hideAll) {
            tippy.hideAll();
        }

        // 2. Cambiamos la URL
        const newParams = new URLSearchParams();
        newParams.set('lat', lat);
        newParams.set('lon', lon);
        newParams.set('zoom', 14);
        newParams.set('q', nombreDespegue);
        const newUrl = `${window.location.pathname}?${newParams.toString()}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);

        // 3. Saltamos a la vista del mapa
        cambiarVista('mapa');
        
        const btnMap = document.getElementById('nav-map');
        if (btnMap && typeof window.activarMenuInferior === 'function') {
            window.activarMenuInferior(btnMap);
        }

        // 4. Lógica de enfoque en el mapa
        if (typeof map !== 'undefined' && map) {
            
            // LIMPIEZA: Cerramos cualquier popup que estuviera abierto de antes
            map.closePopup();

            // Esperamos a que el mapa termine de cargar sus filtros (200ms)
            setTimeout(() => {
                map.invalidateSize();
                
                if (typeof markersDespegues !== 'undefined' && markersDespegues.length > 0) {
                    
                    let target = markersDespegues.find(m => {
                        const mLat = m.getLatLng().lat;
                        const mLon = m.getLatLng().lng;
                        return Math.abs(mLat - lat) < 0.0001 && Math.abs(mLon - lon) < 0.0001;
                    });

                    if (!target && nombreDespegue) {
                        const normalizar = (t) => t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
                        const term = normalizar(nombreDespegue);
                        target = markersDespegues.find(m => normalizar(m.metadata.despegue) === term);
                        if (!target) target = markersDespegues.find(m => normalizar(m.metadata.despegue).includes(term));
                    }

                    if (target) {
                        if (typeof clustergroupDespegues !== 'undefined' && clustergroupDespegues.hasLayer(target)) {
                            clustergroupDespegues.zoomToShowLayer(target, function() {
                                // Leaflet hará el pan automático gracias al padding de 160px
                                target.openPopup();
                            });
                        } else {
                            map.setView([lat, lon], 14);
                            target.addTo(map); 
                            target.openPopup();
                            
                            target.once('popupclose', function() {
                                map.removeLayer(target);
                            });
                        }
                    } else {
                        map.setView([lat, lon], 14);
                    }
                } else {
                    map.setView([lat, lon], 14);
                }
            }, 350); // TIEMPO PARA EVITAR QUE SE BORRE EL POPUP
        }
    };

    // ---------------------------------------------------------------
    // 🔴 FUNCIÓN PARA ABRIR LA TABLA Y FILTRAR EL DESPEGUE DESDE EL POPUP DEL MAPA
    // ---------------------------------------------------------------
    window.verMeteoEnTabla = function(idDespegue) {

        window.vibrarDispositivo();
        // 1. Buscamos el despegue en la BD global usando el ID para obtener su nombre EXACTO en la tabla
        const despegueBD = window.bdGlobalDespegues.find(d => Number(d.ID) === Number(idDespegue));
        if (!despegueBD) return; // Si por algún motivo no existe, abortamos

        // Apagamos preventivamente el Modo Edición (vital si el usuario era virgen y saltó directo al mapa)
        modoEdicionFavoritos = false;
        soloFavoritos = true;
        document.body.classList.remove('modo-edicion-tabla');
        const divMenu = document.getElementById('div-menu');
        if (divMenu) divMenu.classList.remove('mode-editing');
        const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
        if (divMenu2) divMenu2.classList.remove('mode-editing');
        const panelHorario = document.querySelector('.div-filtro-horario');
        if (panelHorario) panelHorario.style.display = '';

        // Reseteamos y ocultamos el filtro de distancia durante este desvío, por si busca un despegue fuera del filtro
        if (typeof resetFiltroDistancia === 'function') {
            resetFiltroDistancia(false); // 'false' para no reconstruir la tabla todavía
        }

        // Lo guardamos en una variable temporal para forzar su aparición en la tabla pero no lo añadimos obligatoriamente a favoritos
        window.despegueTemporalParaTabla = Number(idDespegue);
        
        const nombreExactoTabla = despegueBD.Despegue;

        cambiarVista('tabla');

        // Evaluamos el entorno para devolverle el menú inferior si lo tenía oculto
        if (typeof evaluarEstadoNuevosUsuarios === 'function') evaluarEstadoNuevosUsuarios();

        // 2. Forzamos el nombre exacto en el buscador
        const input = document.getElementById('buscador-despegues-provincias');
        if (input) {
            input.value = nombreExactoTabla;
            input.classList.add('filtrado'); 
        }

        const btnLimpiar = document.getElementById('limpiar-buscador');
        if (btnLimpiar) btnLimpiar.style.display = 'block';

        // 3. Iluminar "Tabla" en lugar de "Buscar"
        if (typeof window.activarMenuInferior === 'function') {
            window.activarMenuInferior(document.getElementById('nav-home'));
        }

        construir_tabla();
    };

    // ---------------------------------------------------------------
    // 🔴 FUNCIÓN PARA VOLVER A LA EDICIÓN TRAS UN DESVÍO AL MAPA/TABLA AISLADA
    // ---------------------------------------------------------------
    window.volverAEdicionDesdeDesvio = function() {
    // 1. Mostrar spinner inmediatamente
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) overlay.classList.add('loader-activo');

    // 2. Liberar el hilo de la CPU
    setTimeout(() => {
        window.despegueTemporalParaTabla = null; 

        // Limpiamos el buscador directamente en el DOM de forma silenciosa.
        // Esto evita que limpiarBuscador() dispare una reconstrucción de tabla prematura.
        const input = document.getElementById('buscador-despegues-provincias');
        if (input) {
            input.value = '';
            input.classList.remove('filtrado', 'buscador-despegues-sin-resultados');
            input.placeholder = t('buscador.placeholderEdicion') || "🔍 País, Región, Provincia o Despegue";
        }
        const btnLimpiar = document.getElementById('limpiar-buscador');
        if (btnLimpiar) btnLimpiar.style.display = 'none';

        modoEdicionFavoritos = true;
        soloFavoritos = false; 
        soloSeguimiento = false; 
        
        const btnFavsTog = document.getElementById('btn-filtro-favoritos-toggle');
        if (btnFavsTog && btnFavsTog.classList.contains('activo')) {
            soloFavoritos = true;
        }

        document.body.classList.add('modo-edicion-tabla');
        const divMenu = document.getElementById('div-menu');
        if (divMenu) divMenu.classList.add('mode-editing');
        const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
        if (divMenu2) divMenu2.classList.add('mode-editing');
        const panelHorario = document.querySelector('.div-filtro-horario');
        if (panelHorario) panelHorario.style.display = 'none';

        const panelDistancia = document.getElementById("div-filtro-distancia");
        if (panelDistancia) panelDistancia.classList.add("activo");

        if (window.onboardingMapaActivo) {
            cambiarVista('mapa');
            const btnMap = document.getElementById('nav-map');
            if (btnMap && typeof window.activarMenuInferior === 'function') {
                window.activarMenuInferior(btnMap);
            }
        } else {
            cambiarVista('tabla');
            const btnSettings = document.getElementById('nav-settings');
            if (btnSettings && typeof window.activarMenuInferior === 'function') {
                window.activarMenuInferior(btnSettings);
            }
        }

        // 🚀 Como ahora solo llamamos a construir_tabla() una vez,
        // solo necesitamos consumir 1 salto de scroll para que se mantenga en su sitio.
        window.saltarScrollTop = (window.saltarScrollTop || 0) + 1;
        construir_tabla();
        
    }, 120);
};

    // ==========================================================================
    // 🔴 LÓGICA DEL MENÚ INFERIOR Y BUSCADOR FLOTANTE
    // ==========================================================================

    // 1. Lógica del Buscador Flotante
    let buscadorVisible = false;
    window.toggleBuscadorFlotante = function() {
        const contenedor = document.getElementById('floating-search-container');
        const input = document.getElementById('buscador-despegues-provincias');
        
        if (!contenedor || !input) return; // Seguridad
        
        buscadorVisible = !buscadorVisible;
        if (buscadorVisible) {
            // --- NUEVO: REGLA DE EXCLUSIÓN MUTUA CON DISTANCIA ---
            const panelDistancia = document.getElementById("div-filtro-distancia");
            if (panelDistancia && panelDistancia.classList.contains("activo")) {
                const sliderDistancia = document.getElementById('distancia-slider');
                let sliderModificado = false;
                
                // Comprobamos si el slider de distancia está en su posición por defecto ("Todo")
                if (sliderDistancia && sliderDistancia.noUiSlider) {
                    const maxIndex = CORTES_DISTANCIA_GLOBAL.length - 1; // Generalmente 19
                    const currentValue = Math.round(parseFloat(sliderDistancia.noUiSlider.get()));
                    if (currentValue < maxIndex) {
                        sliderModificado = true;
                    }
                }
                
                // Si el panel está abierto pero NO se ha usado (está al máximo), lo cerramos
                // Lo hacemos visualmente para no forzar una recarga inútil de toda la tabla
                if (!sliderModificado) {
                    panelDistancia.classList.remove("activo");
                }
            }
            // ------------------------------------------------------

            contenedor.classList.remove('floating-search-hidden');
            setTimeout(() => input.focus(), 100); // Abre teclado con suavidad
        } else {
            contenedor.classList.add('floating-search-hidden');
            input.blur(); // Cierra teclado
            limpiarBuscador(); // Limpia el texto y resetea la tabla automáticamente
        }
    };

    // 2. Lógica de activar el botón del menú inferior
    window.activarMenuInferior = function(botonClicado) {
        if (!botonClicado) return; // Si no hay botón, no hace nada

        // Limpiamos todos los botones
        const botones = document.querySelectorAll('.bottom-nav .nav-item');
        botones.forEach(btn => btn.classList.remove('active'));
        
        // Aplicamos el azul al botón seleccionado
        botonClicado.classList.add('active');
    };

    // 3. Fix para redibujar los sliders cuando abres los Acordeones de Configuración
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('details.config-accordion').forEach(details => {
            details.addEventListener('toggle', (e) => {
                if (details.open) {
                    const sliders = details.querySelectorAll('.noUi-target');
                    sliders.forEach(slider => {
                        if (slider.noUiSlider) {
                            // Pequeño retraso de 50ms para que el CSS termine de abrir el panel
                            setTimeout(() => slider.noUiSlider.updateOptions({}, true), 50);
                        }
                    });
                }
            });
        });
    });

    // ---------------------------------------------------------------
    // 🔴 FIX: REDIBUJAR SLIDERS AL ABRIR ACORDEONES (<details>)
    // ---------------------------------------------------------------
    document.querySelectorAll('details.config-accordion').forEach(details => {
        details.addEventListener('toggle', (e) => {
            if (details.open) {
                // Buscamos cualquier slider de noUiSlider que esté dentro
                const sliders = details.querySelectorAll('.noUi-target');
                sliders.forEach(slider => {
                    if (slider.noUiSlider) {
                        // Damos 50ms para que el navegador termine la animación de abrir
                        setTimeout(() => {
                            slider.noUiSlider.updateOptions({}, true);
                        }, 50);
                    }
                });
            }
        });
    });

    // ==========================================================================
    // 🔴 HAPTICS (VIBRACIÓN) PARA LOS 4 SLIDERS ESTÁNDAR DE RANGO
    // ==========================================================================

    const idsSlidersEstandar = [
        'sliderVuelos',
        'sliderUltimoVuelo',
        'sliderValorInicialFiltroNumeroMinimoVuelos',
        'sliderValorInicialFiltroUltimoVuelo',
        'sliderActividad'         
    ];

    idsSlidersEstandar.forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.addEventListener('input', function() {
                // Verificación de seguridad para evitar errores en navegadores web de ordenador (PC)
                window.vibrarDispositivo();
            });
        }
    });


    // ==========================================================================
    // 🔴 LÓGICA DEL MENÚ INFERIOR
    // ==========================================================================

    // Función auxiliar para cerrar Ajustes sin disparar la auto-iluminación
    function cerrarAjustesSilencioso() {
        const panelConfig = document.getElementById("div-configuracion");
        if (panelConfig && panelConfig.classList.contains("activo")) {
            panelConfig.classList.remove("activo");
            if (typeof setModoEnfoque === "function") setModoEnfoque(false);
            
            // Replegamos los acordeones
            const acordeones = panelConfig.querySelectorAll('details.config-accordion');
            acordeones.forEach(acc => acc.removeAttribute('open'));
        }
    }

    // 1️⃣ BOTÓN TABLA: Único botón que resetea y limpia todo
    window.clicBotonInicio = function() {
        const overlay = document.getElementById('msgActualizando...');
        if (overlay && overlay.classList.contains('loader-activo')) return;

        const btnInicio = document.getElementById('nav-home');
        const yaEnInicio = btnInicio && btnInicio.classList.contains('active');

        // 1. Salir del modo edición si está activo
        if ((typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos) || window.venirDeEdicionActiva) {
            if (!finalizarEdicionFavoritos(true)) return; 
        }
        
        // 2. Cerrar panel de configuración silenciosamente
        cerrarAjustesSilencioso();

        if (yaEnInicio) {
            // SI YA ESTÁBAMOS EN INICIO (SEGUNDO CLIC):
            // Limpiamos filtros y reconstruimos la tabla (esto hará scroll-top automático).
            if (typeof resetFiltroDistancia === 'function') { resetFiltroDistancia(false); }
            if (typeof limpiarBuscador === 'function') { limpiarBuscador(); }
            
            construir_tabla(); // Forzamos reconstrucción y scroll-top
        } else {
            // SI VENÍAMOS DEL MAPA (PRIMER CLIC):
            // Simplemente cambiamos la vista. La restauración del scroll la hará 'cambiarVista'.
            cambiarVista('tabla');
        }

        // 3. Iluminar siempre el botón de inicio
        window.activarMenuInferior(btnInicio);
    };

    // 2️⃣ BOTÓN BUSCAR
    window.clicBotonBuscar = function() {
        cerrarAjustesSilencioso(); 
        const searchContainer = document.getElementById('floating-search-container');
        const searchInput = document.getElementById('buscador-despegues-provincias');
        const isSearchOpen = searchContainer && !searchContainer.classList.contains('floating-search-hidden');
        const searchHasText = searchInput && searchInput.value.trim() !== '';

        const panelDistancia = document.getElementById("div-filtro-distancia");
        const isDistanceOpen = panelDistancia && panelDistancia.classList.contains("activo");
        
        // Comprobar si distancia está modificada
        let distModificada = false;
        const sliderDistancia = document.getElementById('distancia-slider');
        if (sliderDistancia && sliderDistancia.noUiSlider) {
            const maxIndex = CORTES_DISTANCIA_GLOBAL.length - 1;
            const currentValue = Math.round(parseFloat(sliderDistancia.noUiSlider.get()));
            if (currentValue < maxIndex) distModificada = true;
        }

        const vistaMapa = document.getElementById('vista-mapa');
        const estaEnMapa = vistaMapa && vistaMapa.style.display === 'flex';

        // --- 🧹 LIMPIEZA CRUZADA: Si Distancia está abierto pero NO se ha usado, lo cerramos ---
        if (isDistanceOpen && !distModificada) {
            panelDistancia.classList.remove("activo");
        }

        // Lógica propia del Buscador
        if (!estaEnMapa && isSearchOpen && !searchHasText) {
            // Estaba abierto y vacío, el usuario lo quiere cerrar
            searchContainer.classList.add('floating-search-hidden');
            if (typeof buscadorVisible !== 'undefined') buscadorVisible = false;
            if (searchInput) searchInput.blur();
            
            // Decidir qué luz dejar encendida
            if (panelDistancia && panelDistancia.classList.contains("activo")) {
                window.activarMenuInferior(document.getElementById('nav-distance'));
            } else {
                window.activarMenuInferior(document.getElementById('nav-home'));
            }
        } else {
            // Queremos ir al buscador (y abrirlo si estaba cerrado)
            cambiarVista('tabla');
                construir_tabla();
                if (!isSearchOpen) {
                window.toggleBuscadorFlotante();
            } else if (searchInput) {
                // Si ya estaba abierto, le devolvemos el foco al texto
                searchInput.focus();
            }
            window.activarMenuInferior(document.getElementById('nav-search'));
        }
    };

    // 3️⃣ BOTÓN DISTANCIA
    window.clicBotonDistancia = function() {
        cerrarAjustesSilencioso(); 
        const panelDistancia = document.getElementById("div-filtro-distancia");
        const isDistanceOpen = panelDistancia && panelDistancia.classList.contains("activo");
        
        const searchContainer = document.getElementById('floating-search-container');
        const searchInput = document.getElementById('buscador-despegues-provincias');
        const isSearchOpen = searchContainer && !searchContainer.classList.contains('floating-search-hidden');
        const searchHasText = searchInput && searchInput.value.trim() !== '';

        const sliderDistancia = document.getElementById('distancia-slider');
        let distModificada = false;
        if (sliderDistancia && sliderDistancia.noUiSlider) {
            const maxIndex = CORTES_DISTANCIA_GLOBAL.length - 1;
            const currentValue = Math.round(parseFloat(sliderDistancia.noUiSlider.get()));
            if (currentValue < maxIndex) distModificada = true;
        }

        const vistaMapa = document.getElementById('vista-mapa');
        const estaEnMapa = vistaMapa && vistaMapa.style.display === 'flex';

        // BOTÓN BUSCAR DESACTIVADO.  --- 🧹 LIMPIEZA CRUZADA: Si Buscador está abierto pero VACÍO, lo cerramos ---
        // if (isSearchOpen && !searchHasText) {
        //     searchContainer.classList.add('floating-search-hidden');
        //     if (typeof buscadorVisible !== 'undefined') buscadorVisible = false;
        //     if (searchInput) searchInput.blur();
        // }

        // if (!estaEnMapa && isDistanceOpen && !distModificada) {
        //     // Estaba abierto y sin usar, el usuario lo quiere cerrar
        //     panelDistancia.classList.remove("activo");
            
        //     if (searchContainer && !searchContainer.classList.contains('floating-search-hidden')) {
        //         window.activarMenuInferior(document.getElementById('nav-search'));
        //     } else {
        //         window.activarMenuInferior(document.getElementById('nav-home'));
        //     }

        // Lógica propia de Distancia
        if (!estaEnMapa && isDistanceOpen) {
            // Panel abierto → cerrar y resetear filtro
            resetFiltroDistancia();
        } else {
            cambiarVista('tabla');
            
            // GESTIÓN INTELIGENTE DEL SCROLL
            if (window.necesitaScrollTopMeteo) {
                const wrapper = document.querySelector('.tabla-wrapper');
                const principal = document.querySelector('.contenedor-principal-tabla');
                const scrollOptions = { top: 0, behavior: 'instant' };
                if (wrapper) wrapper.scrollTo(scrollOptions);
                if (principal) principal.scrollTo(scrollOptions);
                window.scrollTo(scrollOptions);
                window.necesitaScrollTopMeteo = false;
            }

            if (!isDistanceOpen && panelDistancia) {
                panelDistancia.classList.add("activo");
                setTimeout(() => {
                    if (sliderDistancia && sliderDistancia.noUiSlider) {
                        sliderDistancia.noUiSlider.updateOptions({}, true);
                    }
                }, 50);
            }
            //window.activarMenuInferior(document.getElementById('nav-distance'));
        }
    };

    // 4️⃣ BOTÓN MAPA: Cambia la vista, pero no toca las clases de los paneles
    window.clicBotonMapa = function() {
        cerrarAjustesSilencioso();
        cambiarVista('mapa');
        // Al ocultarse el contenedor de controles por cambiarVista, los paneles desaparecen
        // visualmente pero sus clases (.activo) se mantienen intactas.
        window.activarMenuInferior(document.getElementById('nav-map'));
    };

    // 5️⃣ BOTÓN AJUSTES: Cierra edición pero mantiene filtros de usuario
    window.clicBotonAjustes = function() {
        if ((typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos) || window.venirDeEdicionActiva) {
            if (!finalizarEdicionFavoritos(true)) {
                window.activarMenuInferior(document.getElementById('nav-home'));
                return; 
            }
        }

        const panelConfig = document.getElementById("div-configuracion");
        if (panelConfig && panelConfig.classList.contains("activo")) {
            // Si ya estaba abierto, lo cerramos y dejamos que adivine la luz
            alternardivConfiguracion();
        } else {
            // Si estaba cerrado, lo abrimos
            alternardivConfiguracion(); 
            window.activarMenuInferior(document.getElementById('nav-settings'));

            // Sincronizamos el radio de Modo Simple/Avanzado con el valor guardado, por si ha cambiado desde la última vez que se construyó el DOM (p. ej. justo después de elegirlo en el onboarding).
            const modoSimpleActivo = localStorage.getItem("METEO_MODO_SIMPLE") === "true";
            const radSimple = document.getElementById('radModoSimple');
            const radAvanzado = document.getElementById('radModoAvanzado');
            if (radSimple) radSimple.checked = modoSimpleActivo;
            if (radAvanzado) radAvanzado.checked = !modoSimpleActivo;
        }
    };

    setTimeout(() => {
        comprobarVersionApp();
    }, 3000);

}); //document . addEventListener('DOMContentLoaded', function() {

// ---------------------------------------------------------------
// 🔴 MAPA
// ---------------------------------------------------------------

// function cargarScriptDinamico(src) {
//     return new Promise((resolve, reject) => {
//         // Si el script ya está cargado, no lo añadimos otra vez
//         if (document.querySelector(`script[src="${src}"]`)) {
//             resolve();
//             return;
//         }
//         const script = document.createElement('script');
//         script.src = src;
//         script.onload = resolve;
//         script.onerror = reject;
//         document.head.appendChild(script);
//     });
// }

// 🛑 ACTUALIZAR LA URL AL MOVER O HACER ZOOM EN EL MAPA
// ___________________________________________________________________________________

function updateURL(mapInstance) {
    // Solo actualizamos la URL si el contenedor del mapa es visible
    const vistaMapa = document.getElementById('vista-mapa');
    if (!vistaMapa || vistaMapa.style.display === 'none') return;

    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();

    const lat = center.lat.toFixed(4);
    const lon = center.lng.toFixed(4);

    const newParams = new URLSearchParams();
    newParams.set('lat', lat);
    newParams.set('lon', lon);
    newParams.set('zoom', zoom);

    // Si había una búsqueda activa (?q=...), la mantenemos
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.has('q')) {
        newParams.set('q', currentParams.get('q'));
    }

    const newUrl = `${window.location.pathname}?${newParams.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
}

// 🛑 GUARDAR POSICIÓN DEL MAPA
// ___________________________________________________________________________________

window.guardarPosicionMapaManualmente = function() {
    if (typeof map !== 'undefined' && map) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        
        localStorage.setItem('METEO_MAPA_LAST_LAT', center.lat.toFixed(4));
        localStorage.setItem('METEO_MAPA_LAST_LON', center.lng.toFixed(4));
        localStorage.setItem('METEO_MAPA_LAST_ZOOM', zoom);
        
        const boton = document.getElementById('btn-guardar-vista-mapa');
        if (boton) {
            const textoOriginal = boton.innerHTML;
            boton.innerHTML = '✅';
            setTimeout(() => {
                boton.innerHTML = textoOriginal;
                boton.disabled = false;
            }, 700);
        }
    }
};


// 🛑 CAMBIOS DE VISTA
// ___________________________________________________________________________________

let mapaInicializado = false;

// Si el usuario configuró "recordar estado", leemos su última preferencia. Si no, por defecto abierto (true)
let filtrosMapaAbiertos = localStorage.getItem('METEO_RECORDAR_ESTADO_FILTRO_HORARIO') === 'true' 
    ? (localStorage.getItem('METEO_ESTADO_FILTRO_HORARIO_ABIERTO') !== 'false') 
    : true;

window.cambiarVista = function(vista) {
    const vistaTabla = document.querySelector('.contenedor-principal-tabla');
    const vistaControles = document.querySelector('.contenedor-principal-controles');
    const vistaMapa = document.getElementById('vista-mapa');
    
    // El nuevo botón flotante
    const btnVolver = document.getElementById('btn-volver-edicion-mapa');

    if (vista === 'mapa') {
        window.seHaExploradoMapa = true;
           
        // Guardamos el scroll real de la tabla ANTES de ocultarla con display: none
        const wrapper = document.querySelector('.tabla-wrapper');
        window.guardarScrollY = wrapper ? wrapper.scrollTop : 0;

        // Resetear modo calendario al ir al mapa
        modoVerTodosLosDias = false;
        const btnCal = document.getElementById('btn-ver-todos-dias');
        if (btnCal) btnCal.classList.remove('activo');
        const panelF = document.getElementById('div-filtro-horario');
        if (panelF) panelF.classList.remove('ocultar-slider-por-calendario');

        if (vistaTabla) vistaTabla.style.display = 'none';
        if (vistaControles) vistaControles.style.display = 'none';
        if (vistaMapa) vistaMapa.style.display = 'flex';

        if (!mapaInicializado) {
            inicializarMapaLeaflet();
            mapaInicializado = true;
        } 
        
        // ¿De dónde venimos? ---
        if (btnVolver) {
            // Solo mostramos el botón si venimos de una edición ACTIVA real iniciada por el usuario
            // Y OMITIMOS el botón si es la primera vez (onboarding mediante mapa)
            if (window.venirDeEdicionActiva === true && !window.onboardingMapaActivo) {
                btnVolver.style.display = 'flex';
                btnVolver.classList.remove('en-tabla');
            } else {
                btnVolver.style.display = 'none';
            }
        }
        
        setTimeout(() => { 
            if (typeof map !== 'undefined' && map) {
                map.invalidateSize(); 
                updateURL(map); 
                
                // --- Forzar al popup abierto a redibujarse y actualizar botones ---
                map.eachLayer(function(layer) {
                    if (layer instanceof L.Popup && layer.isOpen()) {
                        layer.update(); // Leaflet reconstruye el popup (soluciona el aplastamiento)
                        
                        // Hacemos que el marcador dispare su evento de apertura.
                        // Esto ejecutará la lógica que ya tienes programada para leer 
                        // obtenerFavoritos() y obtenerSeguimientos() y pintarlos bien.
                        if (layer._source) {
                            layer._source.fire('popupopen', { popup: layer });
                        }

                        // IMPORTANTE: el refresco de popups de BALIZA está enganchado a
                        // map.on('popupopen', ...), no a marker.on('popupopen', ...).
                        // Un evento disparado sobre el marcador no burbujea hasta el mapa,
                        // así que ese listener nunca se ejecutaba al volver del mapa y el
                        // popup se quedaba congelado con el placeholder "⏳..." inicial.
                        // Lo disparamos también sobre el mapa para que sí se re-ejecute.
                        map.fire('popupopen', { popup: layer });
                    }
                });
            }
        }, 300);

        const divFH = document.getElementById('div-filtro-horario');
        const vistaMapa2 = document.getElementById('vista-mapa');
        if (divFH && vistaMapa2) {
            vistaMapa2.appendChild(divFH);
            const btnFiltros = document.getElementById('btn-filtros-mapa');
            const btnCerrar  = document.getElementById('btn-cerrar-filtros-mapa');
            
            // Si estamos en modo selección de favoritos, ocultamos el botón de Filtros Meteo
            if (typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos) {
                divFH.style.display = 'none';
                divFH.classList.remove('flotando-en-mapa');
                if (btnFiltros) btnFiltros.style.display = 'none';
                if (btnCerrar)  btnCerrar.style.display  = 'none';
                document.getElementById('vista-mapa')?.classList.remove('filtros-abiertos');
                
                // Forzamos el repintado para que se aplique la capa blanca
                setTimeout(() => {
                    marcarOperativosEnMarkers();
                    aplicarPuntuacionEnMapa();
                }, 200);

            } else if (filtrosMapaAbiertos) {
                // Restaurar estado abierto
                divFH.style.display = '';
                divFH.classList.add('flotando-en-mapa');
                if (typeof puntuacionMinimaMapa !== 'undefined' && puntuacionMinimaMapa > 0) {
                    divFH.classList.add('borde-rojo-externo');
                }
                if (btnFiltros) btnFiltros.style.display = 'none';
                if (btnCerrar)  btnCerrar.style.display  = 'flex';
                document.getElementById('vista-mapa')?.classList.add('filtros-abiertos');

                const divPunt = document.getElementById('wrapper-filtro-puntuacion-mapa');
                if (divPunt) divPunt.style.display = 'flex';
                setTimeout(() => inicializarSliderPuntuacionMapa(), 150);
                setTimeout(() => {
                    marcarOperativosEnMarkers();
                    aplicarPuntuacionEnMapa();
                    // Restaurar botón de día activo
                    const diaActivo = window.diaSeleccionadoSlider || 0;
                    document.querySelectorAll('.pip-dia-btn').forEach((btn, i) => {
                        btn.classList.toggle('pip-activo', i === diaActivo);
                    });
                }, 200);
            } else {
                // Cerrado por defecto
                divFH.style.display = 'none';
                divFH.classList.remove('flotando-en-mapa');
                if (btnFiltros) btnFiltros.style.display = '';
                if (btnCerrar)  btnCerrar.style.display  = 'none';
            }
        }

    } 
    else if (vista === 'tabla') {
        sessionStorage.removeItem('METEO_ENTRO_POR_MAPA_YA_VISITADO');
        
        if (vistaMapa) vistaMapa.style.display = 'none';
        if (vistaTabla) vistaTabla.style.display = 'flex'; 
        if (vistaControles) vistaControles.style.display = 'block';

        // Pequeño retardo para dar tiempo a que la tabla sea visible antes de mover el scroll
        setTimeout(() => {
            if (window.guardarScrollY !== undefined && window.guardarScrollY !== null) {
                const wrapper = document.querySelector('.tabla-wrapper');
                if (wrapper) wrapper.scrollTop = window.guardarScrollY;
                // IMPORTANTE: Reseteamos la variable para que los siguientes clics puedan hacer scroll top
                window.guardarScrollY = null;
            }
        }, 10); // 10ms es suficiente

        // Mostrar el botón de volver si estamos en un desvío (aislando un despegue) ---
        if (btnVolver) {
            // Si la edición está activa en background PERO la hemos apagado visualmente para ver el desglose meteo (modoEdicionFavoritos == false), mostramos el botón en la tabla.
            if (window.venirDeEdicionActiva === true && !modoEdicionFavoritos) {
                btnVolver.style.display = 'flex';
                btnVolver.classList.add('en-tabla'); // <-- AÑADE LA CLASE (baja a 490px)
            } else {
                btnVolver.style.display = 'none';
            }
        }

        // --- LÓGICA INTELIGENTE DE LUCES ---
        if (typeof window.activarMenuInferior === 'function') {
            // Si volvemos y estamos en plena edición, la luz va a Ajustes
            if (typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos) {
                window.activarMenuInferior(document.getElementById('nav-settings'));
            } else {
                // Si no, por defecto a Tabla
                window.activarMenuInferior(document.getElementById('nav-home'));
            }
        }

        window.history.replaceState(null, '', window.location.pathname);

        // Devolver el slider horario al contenedor principal
        const divFH = document.getElementById('div-filtro-horario');
        const contenedorControles = document.querySelector('.contenedor-principal-controles');
        const divBuscador = document.getElementById('floating-search-container');
        if (divFH && contenedorControles) {
            // SI ESTAMOS EN MODO EDICIÓN, SE QUEDA OCULTO; SI NO, SE MUESTRA
            divFH.style.display = modoEdicionFavoritos ? 'none' : ''; 
            divFH.classList.remove('flotando-en-mapa');
            divFH.classList.remove('borde-rojo-externo');
            contenedorControles.insertBefore(divFH, divBuscador);
            const divPunt = document.getElementById('wrapper-filtro-puntuacion-mapa');
            if (divPunt) divPunt.style.display = 'none';
        }
        
        const btnCerrar = document.getElementById('btn-cerrar-filtros-mapa');
        if (btnCerrar) btnCerrar.style.display = 'none';
        const btnFiltros = document.getElementById('btn-filtros-mapa');
        if (btnFiltros) btnFiltros.style.display = '';

        document.getElementById('vista-mapa')?.classList.remove('filtros-abiertos');

        if (window.tablaRecrearAlVolver) {
            window.tablaRecrearAlVolver = false;
            construir_tabla(false, true); // Reconstruir silenciosamente con la nueva hora
        }
    }

    // Llamamos al evaluador cada vez que cambiamos de pantalla
    if (typeof evaluarEstadoNuevosUsuarios === 'function') evaluarEstadoNuevosUsuarios();
};

// 🛑 Evaluación del entorno (usuaria nueva, recurrente, URL mapa directa,...)
// ___________________________________________________________________________________

window.evaluarEstadoNuevosUsuarios = function() {
    const navMenu = document.querySelector('nav.bottom-nav'); 
    const btnConfigMapa = document.getElementById('btn-configurar-app-mapa');
    
    const configHecha = localStorage.getItem("METEO_PRIMERA_VISITA_HECHA") === "true";
    const enEdicion = window.venirDeEdicionActiva === true; 

    if (!configHecha) {
        if (enEdicion && window.onboardingMapaActivo) {
            // 🗺️ CASO 1: Está haciendo el onboarding expresamente desde el MAPA
            if (navMenu) navMenu.style.display = 'none'; 
            if (btnConfigMapa) {
                btnConfigMapa.style.display = 'flex'; 
                
                // Le cambiamos el comportamiento para que finalice la edición de forma segura
                btnConfigMapa.onclick = function() {
                    finalizarEdicionFavoritos(true);
                };
                
                // Le cambiamos el texto y forzamos la traducción si está disponible
                const spanBtn = btnConfigMapa.querySelector('span');
                if (spanBtn) {
                    spanBtn.innerHTML = (typeof t === 'function' ? t('html.finalizarEdicion') : 'Finalizar edición de despegues favoritos');
                }
            }
        } 
        else if (!enEdicion && window.despegueTemporalParaTabla) {
            // 🧭 CASO "Explorar Mapa" -> Clic en un despegue -> "Ver en tabla"
            if (navMenu) navMenu.style.display = 'none'; 
            if (btnConfigMapa) {
                btnConfigMapa.style.display = 'flex'; 
                btnConfigMapa.style.backgroundColor = '#0078d4'; // Color Azul original
                btnConfigMapa.style.borderColor = 'white';
                
                // Comportamiento: Limpiar el despegue aislado y volver al mapa
                btnConfigMapa.onclick = function(e) {
                    e.preventDefault(); // Evitamos comportamientos indeseados
                    
                    const overlay = document.getElementById('msgActualizando...');
                    if (overlay) overlay.classList.add('loader-activo');

                    setTimeout(() => {
                        window.despegueTemporalParaTabla = null;

                        // 🔴 LA CLAVE: Restauramos la memoria de que el usuario ya estaba "Explorando" 
                        // para que construir_tabla() no piense que es un reinicio y lance el onboarding.
                        sessionStorage.setItem('METEO_ENTRO_POR_MAPA_YA_VISITADO', 'true');

                        // Limpiamos el buscador de forma silenciosa
                        const input = document.getElementById('buscador-despegues-provincias');
                        if (input) {
                            input.value = '';
                            input.classList.remove('filtrado', 'buscador-despegues-sin-resultados');
                        }
                        const btnLimpiar = document.getElementById('limpiar-buscador');
                        if (btnLimpiar) btnLimpiar.style.display = 'none';

                        cambiarVista('mapa');

                        window.saltarScrollTop = (window.saltarScrollTop || 0) + 1;
                        construir_tabla(); // Reconstruye para quitar el despegue temporal y apaga el spinner
                    }, 80);
                };
                
                const spanBtn = btnConfigMapa.querySelector('span');
                if (spanBtn) {
                    spanBtn.innerHTML = (typeof t === 'function' ? t('botones.volverAMapa', {defaultValue: 'Volver al mapa'}) : 'Volver al mapa');
                }
            }
        }
        else if (!enEdicion) {
            // ⚙️ CASO 2: Acaba de abrir la app y aún no ha hecho nada
            if (navMenu) navMenu.style.display = 'none'; 
            if (btnConfigMapa) {
                btnConfigMapa.style.display = 'flex'; 
                btnConfigMapa.style.backgroundColor = '#0078d4'; // Color Azul original
                btnConfigMapa.style.borderColor = 'white';
                
                btnConfigMapa.onclick = function() {
                    if(typeof window.mostrarPaso1General === 'function') window.mostrarPaso1General();
                };
                
                const spanBtn = btnConfigMapa.querySelector('span');
                if (spanBtn) {
                    spanBtn.innerHTML = (typeof t === 'function' ? t('botones.marcarFavoritos') : 'Configurar la aplicación');
                }
            }
        } else {
            // 📝 CASO 3: Está haciendo el onboarding desde la TABLA (usará el menú flotante rojo de la tabla)
            // (Si viene de la tabla y entra al mapa, como onboardingMapaActivo es falso, cae aquí y oculta el botón)
            if (navMenu) navMenu.style.display = 'none'; 
            if (btnConfigMapa) btnConfigMapa.style.display = 'none'; 
        }
    } else {
        // ✅ CASO NORMAL: App ya configurada en el pasado
        if (navMenu) navMenu.style.display = 'flex'; 
        if (btnConfigMapa) btnConfigMapa.style.display = 'none'; 
    }
};

// ---------------------------------------------------------------
// 🗺️ BOTONES FILTRO MAPA: FAVORITOS, SEGUIMIENTO, ACTIVIDAD
// ---------------------------------------------------------------

const recordarFiltros = localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true';

filtroFavoritosMapa = recordarFiltros ? parseInt(localStorage.getItem('METEO_MAPA_FILTRO_FAV') || '0') : 0; // 0 = Todos, 1 = Solo Favoritos, 2 = Solo No Favoritos
filtroSeguimientoMapa = recordarFiltros ? parseInt(localStorage.getItem('METEO_MAPA_FILTRO_SEG') || '0') : 0; // 0 = Todos, 1 = Solo Seguimiento (2 estados: activo/desactivo)
filtroActividadMapa = recordarFiltros ? parseInt(localStorage.getItem('METEO_MAPA_FILTRO_ACT') || '1') : 1; // El valor inicial de actividad mínima es 1 (Todos)

// SVGs del Botón Favorito (Todos / Solo Favs / Excluir Favs)
const SVG_FAV_TODOS = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const SVG_FAV_SOLO = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ff0000" stroke="#ff0000" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const SVG_FAV_NO = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ff0000" stroke-width="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#ff0000" opacity="0.3"></path>
    <line x1="3" y1="3" x2="21" y2="21" stroke="#ff0000" stroke-width="3" stroke-linecap="round"></line>
</svg>`;

window.ciclarFiltroFavoritosMapa = function() {
    filtroFavoritosMapa = (filtroFavoritosMapa + 1) % 3;
    
    // Si la opción de recordar filtros está activa, guardamos el estado (0, 1 o 2)
    if (localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true') {
        localStorage.setItem('METEO_MAPA_FILTRO_FAV', filtroFavoritosMapa);
    }

    actualizarBotonFavoritosMapa();
    actualizarFiltrosMapa();
    actualizarEstadoVisualFiltros();
};

window.actualizarBotonFavoritosMapa = function() {
    const btn = document.getElementById('btn-mapa-filtro-favoritos');
    if (!btn) return;
    if (filtroFavoritosMapa === 0) {
        btn.innerHTML = SVG_FAV_TODOS;
        btn.classList.remove('borde-rojo-externo'); 
    } else {
        btn.innerHTML = (filtroFavoritosMapa === 1) ? SVG_FAV_SOLO : SVG_FAV_NO;
        btn.classList.add('borde-rojo-externo');
    }
};

window.ciclarFiltroSeguimientoMapa = function() {
    filtroSeguimientoMapa = (filtroSeguimientoMapa + 1) % 2; 

    // Si la opción de recordar filtros está activa, guardamos el estado (0 o 1)
    if (localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true') {
        localStorage.setItem('METEO_MAPA_FILTRO_SEG', filtroSeguimientoMapa);
    }

    actualizarBotonSeguimientoMapa();
    actualizarFiltrosMapa();
    actualizarEstadoVisualFiltros();
};

window.actualizarBotonSeguimientoMapa = function() {
    const btn = document.getElementById('btn-mapa-filtro-seguimiento');
    if (!btn) return;
    
    const esActivo = (filtroSeguimientoMapa === 1);
    btn.innerHTML = svgOjoBoton(esActivo);
    
    if (esActivo) {
        btn.classList.add('borde-rojo-externo');
    } else {
        btn.classList.remove('borde-rojo-externo');
    }
};

// ---------------------------------------------------------------
// 🗺️ BOTÓN FILTROS + SLIDER HORARIO EN MAPA
// ---------------------------------------------------------------

let mapaFiltrosSlider = null;
let mapaSliderIndiceInicio = 0;
let mapaSliderIndiceFin = 99999;

window.toggleFiltrosMapa = function() {
    const btnFiltros = document.getElementById('btn-filtros-mapa');
    const btnCerrar  = document.getElementById('btn-cerrar-filtros-mapa');
    const divFH      = document.getElementById('div-filtro-horario');
    if (!divFH) return;

    // Cierra inmediatamente cualquier popup abierto en el mapa (el objetivo es que al abrirlo manualmente se regeneren los datos correctos de orientación...)
    if (typeof map !== 'undefined' && map) {
        map.closePopup();
    }

    const visible = divFH.classList.contains('flotando-en-mapa');

    if (visible) { // Cerrarlo
        divFH.style.display = 'none';
        divFH.classList.remove('flotando-en-mapa');
        divFH.classList.remove('borde-rojo-externo');
        if (btnFiltros) btnFiltros.style.display = '';
        if (btnCerrar)  btnCerrar.style.display  = 'none';
        filtrosMapaAbiertos = false;
        document.getElementById('vista-mapa')?.classList.remove('filtros-abiertos');

        // Ocultar slider de puntuación y restaurar markers
        const divPunt = document.getElementById('wrapper-filtro-puntuacion-mapa');
        if (divPunt) divPunt.style.display = 'none';
        puntuacionMinimaMapa = 0;
        const sliderPunt = document.getElementById('puntuacion-mapa-slider');
        if (sliderPunt && sliderPunt.noUiSlider) sliderPunt.noUiSlider.set(0);
        filtrarMarkersPorPuntuacion();

        const divPunt2 = document.getElementById('div-filtro-puntuacion-mapa');
        //if (divPunt2) divPunt2.classList.remove('borde-rojo-externo');

        limpiarColoresMapa();

        if (localStorage.getItem('METEO_RECORDAR_ESTADO_FILTRO_HORARIO') === 'true') {
            localStorage.setItem('METEO_ESTADO_FILTRO_HORARIO_ABIERTO', filtrosMapaAbiertos);
        }

    } else { // Abrirlo

        divFH.style.display = '';
        divFH.classList.add('flotando-en-mapa');
        if (btnFiltros) btnFiltros.style.display = 'none';
        if (btnCerrar)  btnCerrar.style.display  = 'flex';
        filtrosMapaAbiertos = true;
        // Marcar operativos (siempre al abrir, los markers ya existen)
        marcarOperativosEnMarkers();
        aplicarPuntuacionEnMapa();

        // Mostrar el slider de puntuación y inicializarlo si es la primera vez
        const divPunt = document.getElementById('wrapper-filtro-puntuacion-mapa');
        if (divPunt) divPunt.style.display = 'flex';
        setTimeout(() => inicializarSliderPuntuacionMapa(), 150);

        document.getElementById('vista-mapa')?.classList.add('filtros-abiertos');

        if (localStorage.getItem('METEO_RECORDAR_ESTADO_FILTRO_HORARIO') === 'true') {
            localStorage.setItem('METEO_ESTADO_FILTRO_HORARIO_ABIERTO', filtrosMapaAbiertos);
        }
    }
};

function inicializarSliderMapaHorario() {
    const sliderEl = document.getElementById('mapa-horario-slider');
    if (!sliderEl || !window.horasCrudasRangoHorario || window.horasCrudasRangoHorario.length === 0) return;

    // Si ya existe, lo destruimos para recrear
    if (sliderEl.noUiSlider) {
        sliderEl.noUiSlider.destroy();
    }

    const horas = window.horasCrudasRangoHorario;
    const indices = window.indicesHorasRangoHorario;
    if (!indices || indices.length === 0) return;

    const maxSteps = indices.length - 1;

    // Leemos los valores actuales del slider principal
    const sliderPrincipal = document.getElementById('horario-slider');
    let startVals = [0, maxSteps];
    if (sliderPrincipal && sliderPrincipal.noUiSlider) {
        const vals = sliderPrincipal.noUiSlider.get().map(v => Math.round(Number(v)));
        startVals = [Math.min(vals[0], maxSteps), Math.min(vals[1], maxSteps)];
    }

    noUiSlider.create(sliderEl, {
        start: startVals,
        connect: true,
        step: 1,
        range: { min: 0, max: maxSteps },
        behaviour: 'drag'
    });

    // Etiqueta
    function actualizarEtiquetaMapa(vals) {
        const i0 = indices[Math.round(vals[0])];
        const i1 = indices[Math.round(vals[1])];
        const h0 = horas[i0] ? new Date(horas[i0].endsWith('Z') ? horas[i0] : horas[i0] + 'Z').getHours() : '?';
        const h1 = horas[i1] ? new Date(horas[i1].endsWith('Z') ? horas[i1] : horas[i1] + 'Z').getHours() : '?';
        const etiqueta = document.getElementById('mapa-horario-etiqueta');
        if (etiqueta) etiqueta.textContent = `${h0}:00 – ${h1}:00 h`;
        return [i0, i1];
    }

    actualizarEtiquetaMapa(startVals);

    sliderEl.noUiSlider.on('update', function(values) {
        const [i0, i1] = actualizarEtiquetaMapa(values.map(Number));
        mapaSliderIndiceInicio = i0;
        mapaSliderIndiceFin = i1;
    });

    // Calculamos con los valores iniciales
    const [i0, i1] = actualizarEtiquetaMapa(startVals);
    mapaSliderIndiceInicio = i0;
    mapaSliderIndiceFin = i1;
    aplicarPuntuacionEnMapa();
}

function marcarOperativosEnMarkers() {
    const operativos = window.bdGlobalDespegues;
    if (!operativos || markersDespegues.length === 0) return;

    // Índice por lat+lon redondeados (4 decimales)
    const porCoords = new Map();
    operativos.forEach(d => {
        const key = `${parseFloat(d.Latitud).toFixed(4)}_${parseFloat(d.Longitud).toFixed(4)}`;
        porCoords.set(key, d);
    });

    markersDespegues.forEach(marker => {
        const lat = marker.getLatLng().lat.toFixed(4);
        const lon = marker.getLatLng().lng.toFixed(4);
        const despObj = porCoords.get(`${lat}_${lon}`);
        marker._esOperativo = !!despObj;
        // Guardar referencia al objeto del JSON para scoring y nombre
        marker._despObj = despObj || null;
    });
}

function aplicarPuntuacionEnMapa(soloPuntuacion = false) {
    const horas = window.horasCrudasRangoHorario;
    const respuestas = window.respuestasGlobalMapa;
    const respuestasEcmwf = window.respuestasEcmwfGlobalMapa;
    const despegues = window.bdGlobalDespegues;
    if (!horas || !respuestas || !despegues || markersDespegues.length === 0) return;

    const _todos = [...markersDespegues, ...markersDespeguesMundo];
    const marcadorAbierto = _todos.find(m => m.isPopupOpen && m.isPopupOpen()) || null;

    let indiceInicio = 0, indiceFin = 99999;
    const sliderHoras = document.getElementById('horario-slider');
    
    // Forzar cálculo de toda la semana si el calendario está activo
    if (typeof modoVerTodosLosDias !== 'undefined' && modoVerTodosLosDias) {
        indiceInicio = 0;
        indiceFin = 99999;
    } else if (sliderHoras && sliderHoras.noUiSlider && window.indicesHorasRangoHorario.length > 0) {
        const vals = sliderHoras.noUiSlider.get().map(v => Math.round(Number(v)));
        indiceInicio = window.indicesDiaActualSlider[vals[0]];
        indiceFin    = window.indicesDiaActualSlider[vals[1]];
    }

    // Preparamos los índices para el mapa (incluyendo el check de horas de luz que le faltaba)
    const soloHorasDeLuz = localStorage.getItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ") === "true";
    const indicesEvaluacionMapa = [];
    horas.forEach((h, i) => {
        if (i < indiceInicio || i > indiceFin) return;
        const d = new Date(h.endsWith('Z') ? h : h + 'Z');
        if (soloHorasDeLuz && esCeldaNoche(d)) return;
        indicesEvaluacionMapa.push(i);
    });

    const idxPorId = new Map();
    despegues.forEach((d, i) => idxPorId.set(Number(d.ID), i));

    markersDespegues.forEach(marker => {
        const meta = marker.metadata;
        if (!meta) return;

        const despObj = marker._despObj || null;
        if (!despObj) return;

        const idx = idxPorId.get(Number(despObj.ID));
        if (idx === undefined) return;

        let nota = null;
        let color = null;

        // ESCUDO: Si no estamos editando favoritos, calculamos la meteo normal.
        // Si estamos editando, las variables se quedan en 'null' y el despegue se pinta blanco/neutro.
        if (!modoEdicionFavoritos) {
            const hourlyData  = respuestas[idx] ? respuestas[idx].hourly : null;
            const hourlyEcmwf = respuestasEcmwf && respuestasEcmwf[idx] ? respuestasEcmwf[idx].hourly : null;

            const evaluacion = calcularPuntuacionesDespegue(despObj, hourlyData, hourlyEcmwf, indicesEvaluacionMapa);
            nota = evaluacion.notaCondiciones;
            color = colorNotaMapa(nota);
        }

        marker._notaMapa = (nota !== null) ? nota : -1;
        const nombreMostrar = despObj ? despObj.Despegue : meta.despegue;

        const actividadScore = despObj ? despObj.Actividad : null;
        marker.setIcon(window.createIconDespegue(nombreMostrar, meta.actividad, meta.orientaciones, color, actividadScore));
    });

    if (typeof clustergroupDespegues !== 'undefined' && clustergroupDespegues && clustergroupDespegues._map) {
        clustergroupDespegues.refreshClusters();
    }
    if (typeof actualizarFiltrosMapa === 'function' && (puntuacionMinimaMapa > 0 || (filtrosMapaAbiertos && !soloPuntuacion))) {
        actualizarFiltrosMapa();
    }

    if (marcadorAbierto) {
        if (map.hasLayer(marcadorAbierto) || clustergroupDespegues.hasLayer(marcadorAbierto)) {
            marcadorAbierto.openPopup();
        }
    }
}

let puntuacionMinimaMapa = 0;
window.markersBloqueadosPorPuntuacion = new Set();

function inicializarSliderPuntuacionMapa() {
    const sliderEl = document.getElementById('puntuacion-mapa-slider');
    if (!sliderEl) return;
    if (sliderEl.noUiSlider) return;

    noUiSlider.create(sliderEl, {
        start: [0],
        connect: 'lower',
        step: 1,
        range: { min: 0, max: 10 },
        // 🆕 Añadimos el tooltip configurado con la estrella
        tooltips: [{
            to: function(val) {
                const num = Math.round(val);
                return num >= 0 ? `≥${num}⭐` : '⭐';
            }
        }],
        format: { to: v => Math.round(v), from: v => Number(v) }
    });

    sliderEl.noUiSlider.on('update', function(values) {
        const val = Math.round(Number(values[0]));
        puntuacionMinimaMapa = val;
        
        const divFiltroHorario = document.getElementById('div-filtro-horario');
        if (divFiltroHorario) {
            if (puntuacionMinimaMapa > 0) {
                divFiltroHorario.classList.add('borde-rojo-externo');
            } else {
                divFiltroHorario.classList.remove('borde-rojo-externo');
            }
        }

        const divPunt = document.getElementById('div-filtro-puntuacion-mapa');
        
        filtrarMarkersPorPuntuacion();
    });

    // 📳 Vibración ligera (SOLO se ejecuta cuando el usuario arrastra físicamente el slider)
    sliderEl.noUiSlider.on('slide', function() {
        window.vibrarDispositivo();
    });

    // Zonas táctiles laterales siguen funcionando igual
    const sliderRef = sliderEl;
    document.getElementById('zona-tap-izq')?.addEventListener('click', () => {
        const actual = Math.round(Number(sliderRef.noUiSlider.get()));
        sliderRef.noUiSlider.set(Math.max(0, actual - 1));
    });
    document.getElementById('zona-tap-der')?.addEventListener('click', () => {
        const actual = Math.round(Number(sliderRef.noUiSlider.get()));
        sliderRef.noUiSlider.set(Math.min(10, actual + 1));
    });
}

function filtrarMarkersPorPuntuacion() {
    if (typeof actualizarFiltrosMapa === 'function') actualizarFiltrosMapa();
}

function limpiarColoresMapa() {
    // --- ESCUDO INICIO (Síncrono) ---
    const _todos = [...markersDespegues, ...markersDespeguesMundo];
    const marcadorAbierto = _todos.find(m => m.isPopupOpen && m.isPopupOpen()) || null;

    markersDespegues.forEach(marker => {
        const meta = marker.metadata;
        if (!meta) return;
        marker._notaMapa = undefined;
        
        const actividadScore = marker._despObj ? marker._despObj.Actividad : null;
        marker.setIcon(window.createIconDespegue(meta.despegue, meta.actividad, meta.orientaciones, null, actividadScore));
    });

    if (typeof actualizarFiltrosMapa === 'function') actualizarFiltrosMapa();
    if (clustergroupDespegues && clustergroupDespegues._map) clustergroupDespegues.refreshClusters();

    // --- ESCUDO FIN (Síncrono e inmediato) ---
    if (marcadorAbierto) {
        if (map.hasLayer(marcadorAbierto) || clustergroupDespegues.hasLayer(marcadorAbierto)) {
            marcadorAbierto.openPopup();
        }
    }
}

// ---------------------------------------------------------------
// 🔴🗺️ MAPA
// ---------------------------------------------------------------

const COLORES_NOTA_MAPA = [
    "#fb796e","#f9876d","#f7966c","#f4a46c","#f2b36b",
    "#f0c16a","#d5ca78","#bbd386","#a0dd93","#86e6a1","#6befaf"
];

function colorNotaMapa(nota) {
    if (nota === null) return '#ffffff';
    return COLORES_NOTA_MAPA[Math.min(10, Math.round(nota))];
}

// 🌍 VARIABLES GLOBALES DEL MAPA
let map;
let markersDespegues = [];
let clustergroupDespegues;
let markersDespeguesMundo = []; 
let clustergroupDespeguesMundo;

const ESCALA_VUELOS = [0, 1, 5, 20, 50, 100, 300, 1000, 3000, 10000];

const ESCALA_ULTIMO_VUELO = [
    'Todos', // Índice 0: No filtra
    2006, 2007, 2008, 2009, 2010, 
    2011, 2012, 2013, 2014, 2015, 
    2016, 2017, 2018, 2019, 2020, 
    2021, 2022, 2023, 2024, 2025
];

const ESCALA_KMMEDIA = [
    // 1. Zona de Precisión (0 a 20) - 14 pasos
    // Aquí está tu promedio (12) y la gran mayoría de tus datos.
    0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20,

    // 2. Zona Media (25 a 100) - 9 pasos
    // Cubre la "cola" de la distribución hasta los valores altos frecuentes.
    25, 30, 40, 50, 60, 70, 80, 90, 100,

    // 3. Zona de Valores Extremos (120 a 250) - 5 pasos
    // Cubre tus "Top 15" (máximo 200) con un pequeño margen extra.
    120, 150, 180, 200, 250
];

function inicializarMapaLeaflet() {

    // --- BLOQUE DE SEGURIDAD ANTI-CRASH LEAFLET ---
    const mapContainer = document.getElementById('map');
    
    // Si Leaflet ya metió sus zarpas en este div, lo limpiamos a la fuerza
    if (mapContainer && mapContainer._leaflet_id) {
        mapContainer._leaflet_id = null;
    }
    
    // Si la variable global 'map' ya tenía un mapa activo, lo destruimos
    if (typeof map !== 'undefined' && map !== null) {
        map.remove();
    }
    // -------------------------------------------------

    // 🛑 Capas
    const ESRITopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 19,
        attribution: '© <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
    });
    const ESRIOrto = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 19,
        attribution: '© <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
    });
    const OpenTopoMap = crearCapaConLimiteZoom('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 17,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://opentopomap.org/" target="_blank">Style OpenTopoMap</a>'
    });
    const Tracestrack = crearCapaConLimiteZoom(`https://tile.tracestrack.com/topo_es/{z}/{x}/{y}.webp?key=${MAP_API_KEYS.tracestrack}`, {
        maxNativeZoom: 19,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://tracestrack.com/" target="_blank">Tracestrack</a>'
    });
    const IGNTopo = L.tileLayer('https://tms-mapa-raster.ign.es/1.0.0/mapa-raster/{z}/{x}/{-y}.jpeg', {
        maxNativeZoom: 17,
        attribution: '© <a href="https://www.ign.es" target="_blank">IGN</a>'
    });
    const IGNClaro = L.tileLayer('https://tms-ign-base.idee.es/1.0.0/IGNBaseTodo/{z}/{x}/{-y}.jpeg', {
        maxNativeZoom: 17,
        attribution: '© <a href="https://www.ign.es" target="_blank">IGN</a>'
    });
    const IGNOrto = L.tileLayer('https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg', {
        maxNativeZoom: 19,
        attribution: '© <a href="https://www.ign.es" target="_blank">IGN</a>'
    });
    const ICGC = L.tileLayer('https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        attribution: '<a href="https://www.icgc.cat/" target="_blank">© ICGC</a>'
    });
    const CyclOSM = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" target="_blank">CyclOSM</a>'
    });
    const Thunderforest = L.tileLayer(`https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${MAP_API_KEYS.thunderforest}`, {
        maxNativeZoom: 19,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://www.thunderforest.com/maps/" target="_blank">Style by Thunderforest</a>'
    });
    const OpenStreetMap = crearCapaConLimiteZoom('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a>'
    });
    const Hipsometrico = crearCapaConLimiteZoom('https://maps-for-free.com/layer/relief/z{z}/row{y}/{z}_{x}-{y}.jpg', {
        maxNativeZoom: 11,
        attribution: '<a href="https://maps-for-free.com" target="_blank">Maps-for-Free</a>'
    });
    const HillShade = L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 16,
        attribution: '© <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>',
    });
    // 🟡 Overlays
    const KK7_Skyways = L.tileLayer('https://flydecision.com/proxy-kk7.php?z={z}&x={x}&y={y}&layer=skyways_all', {
        pane: 'overlayPane',
        maxNativeZoom: 13,
        zIndex: 10,
        tms: true,
        attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA></a>'
    });
    const KK7_Skyways_traslucent = L.tileLayer('https://flydecision.com/proxy-kk7.php?z={z}&x={x}&y={y}&layer=skyways_all', {
        pane: 'overlayPane',
        maxNativeZoom: 13,
        opacity: 0.3,
        zIndex: 10,
        tms: true,
        attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA></a>'
    });
    const KK7_Thermals = L.tileLayer('https://flydecision.com/proxy-kk7.php?z={z}&x={x}&y={y}&layer=thermals_all', {
        pane: 'overlayPane',
        maxNativeZoom: 12,
        zIndex: 10,
        tms: true,
        attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA></a>'
    });
    const ENAIRE = L.esri.featureLayer({ // Las feature.properties del mapa se ven en https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer/2?f=json
        url: 'https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer/2',
        where: "name LIKE 'CTR%' OR name LIKE 'ATZ%' OR name LIKE 'CTA%' OR name LIKE 'TMA%'",
        style: estiloZona,
        onEachFeature: popupZona,
        attribution: '© <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
    });
    const OpenAIP = L.tileLayer(`https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${MAP_API_KEYS.OpenAIP}`, {
        maxNativeZoom: 14,
        attribution: '© <a href="https://www.openaip.net" target="_blank">OpenAIP</a>'
    });
    // Otros estilos: light_all,light_nolabels,light_only_labels,dark_all,dark_nolabels,dark_only_labels,voyager,voyager_nolabels,voyager_only_labels,voyager_labels_under
    const Carto_light = crearCapaConLimiteZoom('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxNativeZoom: 19,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://carto.com/" target="_blank">Carto</a>'
    });


    function crearCapaConLimiteZoom(url, opciones) {
        const maxNativo = opciones.maxNativeZoom ?? opciones.maxZoom ?? 19;
        const capa = L.tileLayer(url, {
            ...opciones,
            maxNativeZoom: maxNativo,  // upscale en vez de vacío si se supera
            maxZoom: Math.max(maxNativo, 19)                // nunca aparece desactivada en el control
        });
        return capa;
    }

    const baseMaps = {
        [t('mapa.capasBase.ESRITopo')]: ESRITopo,
        [t('mapa.capasBase.ESRIOrto')]: ESRIOrto,	
        [t('mapa.capasBase.OpenTopoMap')]: OpenTopoMap,
        [t('mapa.capasBase.Carto_light')]: Carto_light,
        [t('mapa.capasBase.Tracestrack')]: Tracestrack,
        [t('mapa.capasBase.IGNTopo')]: IGNTopo,
        [t('mapa.capasBase.IGNClaro')]: IGNClaro,
        [t('mapa.capasBase.IGNOrto')]: IGNOrto,
        [t('mapa.capasBase.ICGC')]: ICGC,
        [t('mapa.capasBase.Thunderforest')]: Thunderforest,
        [t('mapa.capasBase.OpenStreetMap')]: OpenStreetMap,  
        [t('mapa.capasBase.Hipsometrico')]: Hipsometrico,
        [t('mapa.capasBase.HillShade')]: HillShade
    };

    const overlayMaps = {
        [t('mapa.capasBase.KK7_Skyways')]: KK7_Skyways,
        [t('mapa.capasBase.KK7_Skyways_traslucent')]: KK7_Skyways_traslucent,
        [t('mapa.capasBase.KK7_Thermals')]: KK7_Thermals,
        [t('mapa.capasBase.ENAIRE')]: ENAIRE,
        [t('mapa.capasBase.OpenAIP')]: OpenAIP
    };

    const recordarTipo = localStorage.getItem('METEO_RECORDAR_TIPO_MAPA') === 'true';
    const ultimaCapaBase = recordarTipo ? (localStorage.getItem('METEO_MAPA_CAPABASE_ULTIMA') || t('mapa.capasBase.ESRITopo')) : t('mapa.capasBase.ESRITopo');
    const capaInicial = baseMaps[ultimaCapaBase] || ESRITopo;

    function popupZona(feature, layer) {
        const p = feature.properties;

        // Alturas
        const limInf = (p.lower <= 60 || p.lower === null) ? 'SFC' : `${p.lower} m`;
        const limSup = p.upper != null ? `${p.upper} m ${p.upperReference || 'AGL'}` : '—';
        const alturas = `${limInf} – ${limSup}`;

        // siteURL viene como HTML crudo — extraemos URL y texto con regex
        let enlaceHTML = '';
        let gestor = '—';

        if (p.siteURL) {
            const hrefMatch  = p.siteURL.match(/href=['"]([^'"]+)['"]/);
            const textoMatch = p.siteURL.match(/>([^<>]+)<\/a>/);

            if (hrefMatch) {
                const url   = hrefMatch[1];
                const texto = textoMatch ? textoMatch[1].trim() : 'Más info';
                enlaceHTML  = `<br><a href="${url}" target="_blank">${texto}</a>`;
            }

            // Gestor: texto plano antes del primer tag HTML (ej: "Ministerio de Defensa")
            const textoPlano = p.siteURL.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (textoPlano) gestor = textoPlano.split(/[,(]/)[0].trim();
        }

        layer.bindPopup(`
            <b>${p.name || p.otherReasonInfo || p.identifier || '—'}</b><br><br>
        `);
    }

    const params = new URLSearchParams(window.location.search);

    // 1º Prioridad: Obtener los valores de la URL
    const urlLat = parseFloat(params.get('lat'));
    const urlLon = parseFloat(params.get('lon'));
    const urlZoom = parseFloat(params.get('zoom'));

    // 2º Prioridad: Leer de la memoria del navegador
    const recordarPosicion = localStorage.getItem('METEO_RECORDAR_POSICION_MAPA') === 'true';
    
    let loadedLat = NaN;
    let loadedLon = NaN;
    let loadedZoom = NaN;

    if (recordarPosicion) {
        // A) Intentamos cargar la última posición de sesión activa (auto-guardada en LIVE)
        loadedLat = parseFloat(localStorage.getItem('METEO_MAPA_LIVE_LAT'));
        loadedLon = parseFloat(localStorage.getItem('METEO_MAPA_LIVE_LON'));
        loadedZoom = parseFloat(localStorage.getItem('METEO_MAPA_LIVE_ZOOM'));
    }

    // B) Si "Recordar" está apagado, o si la sesión en LIVE está vacía,
    // cargamos la posición de inicio fija guardada manualmente por el usuario (en LAST)
    if (isNaN(loadedLat)) {
        loadedLat = parseFloat(localStorage.getItem('METEO_MAPA_LAST_LAT'));
        loadedLon = parseFloat(localStorage.getItem('METEO_MAPA_LAST_LON'));
        loadedZoom = parseFloat(localStorage.getItem('METEO_MAPA_LAST_ZOOM'));
    }

    // 3º Prioridad: Valores por defecto generales
    const defaultLat = 42.7340;
    const defaultLon = 1.9902;
    const isMobile = window.innerWidth < 768;
    const defaultZoom = isMobile ? 4.5 : 6;

    const useLat = !isNaN(urlLat) ? urlLat : (!isNaN(loadedLat) ? loadedLat : defaultLat);
    const useLon = !isNaN(urlLon) ? urlLon : (!isNaN(loadedLon) ? loadedLon : defaultLon);
    const useZoom = !isNaN(urlZoom) ? urlZoom : (!isNaN(loadedZoom) ? loadedZoom : defaultZoom);

    const esVistaPredeterminada = isNaN(urlLat) && isNaN(loadedLat);

    // 3. Inicialización del mapa
    map = L.map('map', {
        preferCanvas: true,
        renderer: L.canvas(),
        // 💡 IMPORTANTE: Inicializamos el centro y zoom del mapa DIRECTAMENTE aquí
        center: [useLat, useLon],
        zoom: useZoom,
        zoomControl: false,

        scrollWheelZoom: false, // disable original zoom function
        smoothWheelZoom: true,  // enable smooth zoom 
        smoothSensitivity: 1.5,   // zoom speed. default is 1
        zoomSnap: 0,            // disable zoom snapping (for touchscreen zooming, and fitBounds(), etc.)

        zoomAnimation: true,   
        //zoomSnap: 0.25,
        //zoomDelta: 0.25,    
        //wheelPxPerZoomLevel: 150,      
        layers: [capaInicial] 
    });

    // Evita el bug del navegador que recuerda el "tick" del checkbox pero no carga los datos (CSV)
    const capasPesadasAForzarApagado = [
        'checkboxNotasPersonales',
        'checkboxMapaDeCalorPeninsulaIberica',
        'checkboxMapaDeCalorAlpes',
        'checkboxMapaDeCalorMarruecos',
        'checkboxDespeguesMundo'
    ];
    capasPesadasAForzarApagado.forEach(id => {
        const chk = document.getElementById(id);
        if (chk) {
            chk.checked = false; // Desactivamos el checkbox visualmente
        }
    });

    // 🌍 ENCUADRE DINÁMICO PREDETERMINADO (Forzado por anchura con ajuste manual)
    if (esVistaPredeterminada) {
        
        const latCentro = 42.06; 
        const lonOeste = -10.15;
        const lonEste = 13.75;
        
        // Creamos el objeto matemático del área
        const areaAnchura = L.latLngBounds([
            [latCentro, lonOeste], 
            [latCentro, lonEste]
        ]);
        
        // Le preguntamos a Leaflet qué zoom usaría para que quepa este ancho
        let zoomIdeal = map.getBoundsZoom(areaAnchura);
        
        let zoomAjustado = zoomIdeal + 0.5; 
        
        // Forzamos la vista con el centro matemático de la línea y tu zoom personalizado
        map.setView(areaAnchura.getCenter(), zoomAjustado);
    }

    // 🛑 FUNCIONES DE ACTUALIZACIÓN DE LOS FILTROS, TANTO EJECUTIVO COMO VISUAL

    window.actualizarFiltrosMapa = function actualizarFiltrosMapa() {
        // A. OBTENER ESTADOS DE LOS FILTROS
        // -------------------------------------------------------
        // 1. Obtener orientaciones
        const filtrosOrientacion = obtenerOrientacionesSeleccionadas();
        
        // 2. Obtener valor del slider de vuelos
        const slider = document.getElementById('sliderVuelos');
        const indice = slider ? parseInt(slider.value, 10) : 0;
        const minVuelos = ESCALA_VUELOS[indice] !== undefined ? ESCALA_VUELOS[indice] : 0;
        
        // --- SEGURIDAD: Actualizamos el texto solo si el elemento existe ---
        const elVuelosTexto = document.getElementById('valorVuelosTexto');
        if (elVuelosTexto) {
            elVuelosTexto.textContent = minVuelos;
        }

        // 3. Obtener valor del sliderKmMedia de KmMedia
        const sliderKmMedia = document.getElementById('sliderKmMedia');
        const indiceKmMedia = sliderKmMedia ? parseInt(sliderKmMedia.value, 10) : 0;
        const minKmMedia = ESCALA_KMMEDIA[indiceKmMedia] !== undefined ? ESCALA_KMMEDIA[indiceKmMedia] : 0;
        
        // --- SEGURIDAD: Actualizamos el texto solo si el elemento existe ---
        const elKmMediaTexto = document.getElementById('valorKmMediaTexto');
        if (elKmMediaTexto) {
            elKmMediaTexto.textContent = minKmMedia;
        }

        // 4. Filtro de Último Vuelo
        const filtroAnioVuelo = obtenerMinAnioUltimoVuelo(); 

        // B. COMPROBAR Y DEFINIR VISIBILIDAD DE CAPAS
        // -------------------------------------------------------
        
        // Filtros de criterios
        const hayFiltroOrientacion = filtrosOrientacion.length > 0;
        const hayFiltroVuelos = minVuelos > 0;
        const hayFiltroAnio = !filtroAnioVuelo.esTodos; // Si no está en 'Todos', hay filtro

        // LECTURA CHECKBOX MUNDO (DespeguesMundo)
        const chkDespeguesMundo = document.getElementById('checkboxDespeguesMundo');
        const mostrarDespeguesMundo = chkDespeguesMundo && chkDespeguesMundo.checked;

        // LECTURA CHECKBOX LOCAL 
        const chkDespegues = document.getElementById('checkboxDespegues');
        const mostrarDespegues = chkDespegues ? chkDespegues.checked : true;
        
        // C. PREPARAR PATRONES DE BÚSQUEDA (OPTIMIZACIÓN)
        // -------------------------------------------------------
        // Solo generamos los patrones si hay filtro de orientación activo
        const patronesDeBusquedaUnicos = new Set();
        if (hayFiltroOrientacion) {
            filtrosOrientacion.forEach(filtroPrincipal => {
                const rangos = MAPA_RANGO_ORIENTACION[filtroPrincipal];
                if (rangos) {
                    rangos.forEach(patron => patronesDeBusquedaUnicos.add(`${patron}_`));  
                }
            });
        }

        // -----------------------------------------------------------------------
        // -----------------------------------------------------------------------
        // FUNCIÓN AUXILIAR DE FILTRADO (Lógica central reutilizable)
        // Se extrae la lógica de filtrado para aplicarla dos veces sin repetir código.
        const pasaFiltros = (marker, esDespegueMundo = false) => {

            // Los despegues del mundo NO tienen pronóstico meteo, por lo que 
            // ignoramos los filtros de puntuación y operatividad para ellos.
            if (!esDespegueMundo) {

                // --- 0b. NUEVO FILTRO DE FAVORITOS (Corazón) ---
                const idMarcador = Number(marker.metadata.id);
                const esFav = idMarcador ? obtenerFavoritos().map(Number).includes(idMarcador) : false;
                
                if (filtroFavoritosMapa === 1 && !esFav) return false; // Solo favoritos
                if (filtroFavoritosMapa === 2 && esFav) return false;  // Solo NO favoritos

                // --- 0c. NUEVO FILTRO DE SEGUIMIENTO (Ojo - 2 Estados) ---
                const esSeg = idMarcador ? obtenerSeguimientos().map(s => Number(s.id)).includes(idMarcador) : false;
                if (filtroSeguimientoMapa === 1 && !esSeg) return false; 

                // Como el valor inicial es 1 (Todos), solo ocultamos si la actividad mínima exigida es > 1
                const examinaActividad = marker.metadata.actividad ? parseInt(marker.metadata.actividad, 10) : 0;
                if (filtroActividadMapa > 1 && (isNaN(examinaActividad) || examinaActividad < filtroActividadMapa)) return false;

                // --- 0. FILTRO DE PUNTUACIÓN MÍNIMA ---
                if (puntuacionMinimaMapa > 0) {
                    const nota = marker._notaMapa !== undefined ? marker._notaMapa : -1;
                    if (nota >= 0 && Math.round(nota) < puntuacionMinimaMapa) return false;
                }
                if (window.markersBloqueadosPorPuntuacion && window.markersBloqueadosPorPuntuacion.has(marker)) return false;

                // --- 0b. OCULTAR NO-OPERATIVOS SI EL FILTRO ESTÁ ACTIVO ---
                if (filtrosMapaAbiertos && marker._esOperativo !== true) return false;
                if (filtrosMapaAbiertos && marker._esSecundarioMeteo) return false;
                if (!filtrosMapaAbiertos && marker._esMasterMeteo) return false; // ← oculta el clon Master meteo (sí) cuando filtro OFF
            }

            // --- 1. VALIDACIÓN DE VUELOS ---
            const vuelosRaw = marker.metadata.vuelos;
            // Eliminamos puntos, comas o espacios y forzamos a entero puro
            const vuelosMarker = vuelosRaw ? parseInt(String(vuelosRaw).replace(/[^\d]/g, ''), 10) : 0;
            if (vuelosMarker < minVuelos) return false;
            
            // --- 2. VALIDACIÓN DE FECHA ---
            if (hayFiltroAnio) {
                const fechaUltimoVueloStr = marker.metadata.ultimovuelo; 
                if (!fechaUltimoVueloStr) return false;
                const anioMarker = parseInt(fechaUltimoVueloStr.substring(fechaUltimoVueloStr.length - 4), 10);
                if (anioMarker < filtroAnioVuelo.minAnio) return false; 
            }       

            // --- 3. VALIDACIÓN DE ORIENTACIÓN ---
            if (!hayFiltroOrientacion) {
                return true; // Pasa el filtro si no hay filtro de orientación
            }
            
            // Comprobación de patrones de orientación...
            const markerOrientaciones = marker.metadata.orientaciones; 
            let markerOrientacionesDelimitada = (markerOrientaciones || '');
            if (!markerOrientacionesDelimitada.endsWith('_')) {
                markerOrientacionesDelimitada += '_';
            }
            
            for (const patron of patronesDeBusquedaUnicos) {
                if (markerOrientacionesDelimitada.includes(patron)) {
                    return true; 
                }
            }
            return false; // No cumple orientación
        };
        // -----------------------------------------------------------------------

        // D. FILTRADO BUCLE PRINCIPAL (¡DOS BUCLES SEPARADOS!)
        // ----------------------------------------------------------------------
        // SE ELIMINA LA FUSIÓN DE ARRAYS
        // Se utilizan arrays de salida separados
        const markersFiltradosDespegues = []; // Resultado para la capa Despegues (Local)
        const markersFiltradosDespeguesMundo = []; // Resultado para la capa DespeguesMundo (Mundo)

        // 1. FILTRAR MARCADORES LOCALES (Despegues)
        if (mostrarDespegues) {
            markersDespegues.forEach(marker => {
                if (pasaFiltros(marker, false)) { // false = no es mundo (le afecta la meteo)
                    markersFiltradosDespegues.push(marker);
                }
            });
        }

        // 2. FILTRAR MARCADORES DEL MUNDO (DespeguesMundo)
        if (mostrarDespeguesMundo) {
            markersDespeguesMundo.forEach(marker => {
                if (pasaFiltros(marker, true)) { // true = sí es mundo (ignora filtro meteo)
                    markersFiltradosDespeguesMundo.push(marker);
                }
            });
        }


        // E. ACTUALIZAR CAPAS DE FORMA INDEPENDIENTE
        // -------------------------------------------------------
        const _todosMarkers = [...markersDespegues, ...markersDespeguesMundo];
        const marcadorAbierto = _todosMarkers.find(m => m.isPopupOpen && m.isPopupOpen()) || null;

        // --- ESCUDO ANTI-PARPADEO ---
        if (marcadorAbierto) {
            const mapCont = document.getElementById('map');
            if (mapCont) mapCont.classList.add('bloquear-transicion-popup');
        }

        // 1. Actualizar capa LOCAL (Despegues)
        clustergroupDespegues.clearLayers();
        clustergroupDespegues.addLayers(markersFiltradosDespegues);
        
        // 2. Actualizar capa MUNDO (DespeguesMundo)
        clustergroupDespeguesMundo.clearLayers();
        clustergroupDespeguesMundo.addLayers(markersFiltradosDespeguesMundo);

        // Restaurar popup de forma instantánea y totalmente invisible durante su cálculo
        if (marcadorAbierto) {
            if (markersFiltradosDespegues.includes(marcadorAbierto) || markersFiltradosDespeguesMundo.includes(marcadorAbierto)) {
                marcadorAbierto.openPopup();
            }
        }
    }

    // FUNCIÓN PARA GESTIONAR EL ESTADO VISUAL DE LOS CONTROLES
    function actualizarEstadoVisualFiltros() {

        // 1. COMPROBAR ESTADO DE LOS FILTROS EN EL MAPA

        // Leemos directamente la variable lógica de memoria (evita fallos por orden de carga de los sliders)
        const hayFiltroActividad = (filtroActividadMapa > 1); 

        // Orientación: Comprueba si hay al menos uno marcado
        const hayFiltroOrientacion = obtenerOrientacionesSeleccionadas().length > 0;
        
        // Vuelos: Comprueba si el valor es mayor que 0
        const sliderVuelos = document.getElementById('sliderVuelos');
        const indiceVuelos = sliderVuelos ? parseInt(sliderVuelos.value, 10) : 0;
        const hayFiltroVuelos = (ESCALA_VUELOS[indiceVuelos] || 0) > 0; 
        
        // Último Vuelo: Comprueba si el valor no es 'Todos' (índice 0)
        const sliderUltimoVuelo = document.getElementById('sliderUltimoVuelo');
        const indiceUltimoVuelo = sliderUltimoVuelo ? parseInt(sliderUltimoVuelo.value, 10) : 0;
        const hayFiltroAnio = indiceUltimoVuelo !== 0;

        const hayFiltroRapidos = filtroFavoritosMapa !== 0 || filtroSeguimientoMapa !== 0 || hayFiltroActividad;

        // 2. COMPROBAR CONFIGURACIÓN INICIAL (Ajustes Generales)
        const hayConfiguracionInicialFiltroVuelos = parseInt(localStorage.getItem('METEO_MAPA_MINIMOVUELOS') || '0', 10) > 0;
        const hayConfiguracionInicialFiltroUltimoVuelo = parseInt(localStorage.getItem('METEO_MINIMO_ANO_ULTIMO_VUELO') || '0', 10) > 0;

        // 3. COLORES PARA LA ROSA DE LOS VIENTOS (Mantiene el clásico azul/blanco)
        const ACTIVO_COLOR = '#0404ff30';
        const INACTIVO_COLOR = '#ffffff';

        // 4. ACTUALIZAR CONTENEDORES INDIVIDUALES DEL MAPA
        const contActividad = document.querySelector('.control-actividad-mapa-container');
        if (contActividad) {
            contActividad.style.backgroundColor = 'transparent';
            if (hayFiltroActividad) {
                contActividad.classList.add('borde-rojo-externo');
            } else {
                contActividad.classList.remove('borde-rojo-externo');
            }
        }
        
        // Contenedor Orientación (Ahora transparente + borde rojo cuando esté activo)
        const contOrientacion = document.querySelector('.control-orientacion-container');
        if (contOrientacion) {
            contOrientacion.style.backgroundColor = 'transparent';
            if (hayFiltroOrientacion) {
                contOrientacion.classList.add('borde-rojo-externo');
            } else {
                contOrientacion.classList.remove('borde-rojo-externo');
            }
        }

        // Contenedor Vuelos (Mapa - Ahora transparente + borde rojo)
        const contVuelos = document.querySelector('.control-vuelos-container');
        if (contVuelos) {
            contVuelos.style.backgroundColor = 'transparent';
            if (hayFiltroVuelos) {
                contVuelos.classList.add('borde-rojo-externo');
            } else {
                contVuelos.classList.remove('borde-rojo-externo');
            }
        }

        // Contenedor Último Vuelo (Mapa - Ahora transparente + borde rojo)
        const contUltimoVuelo = document.querySelector('.control-ultimovuelo-container');
        if (contUltimoVuelo) {
            contUltimoVuelo.style.backgroundColor = 'transparent';
            if (hayFiltroAnio) {
                contUltimoVuelo.classList.add('borde-rojo-externo');
            } else {
                contUltimoVuelo.classList.remove('borde-rojo-externo');
            }
        }

        // 5. ACTUALIZAR LOS DESLIZADORES DEL ACORDEÓN (Transparentes + borde rojo)
        const contConfigVuelos = document.querySelector('.configuracion-control-vuelos-container');
        if (contConfigVuelos) {
            contConfigVuelos.style.backgroundColor = 'transparent';
            if (hayConfiguracionInicialFiltroVuelos) {
                contConfigVuelos.classList.add('borde-rojo-externo');
            } else {
                contConfigVuelos.classList.remove('borde-rojo-externo');
            }
        }

        const contConfigUltimoVuelo = document.querySelector('.configuracion-control-ultimovuelo-container');
        if (contConfigUltimoVuelo) {
            contConfigUltimoVuelo.style.backgroundColor = 'transparent';
            if (hayConfiguracionInicialFiltroUltimoVuelo) {
                contConfigUltimoVuelo.classList.add('borde-rojo-externo');
            } else {
                contConfigUltimoVuelo.classList.remove('borde-rojo-externo');
            }
        }

        // 6. ACTUALIZAR PANEL GLOBAL (Borde rojo externo al estar retraído)
        const hayCualquierFiltro = hayFiltroOrientacion || hayFiltroVuelos || hayFiltroAnio || hayFiltroRapidos;
        const infoPanelFiltros = document.getElementById('infoPanel2'); 
        
        if (infoPanelFiltros) {
            if (hayCualquierFiltro) {
                infoPanelFiltros.classList.add('borde-rojo-externo');
            } else {
                infoPanelFiltros.classList.remove('borde-rojo-externo');
            }
        }
    }

    // Listener que asegura que se pueda cambiar el estilo del popup original que ofrece Leaflet. Esa función no reemplaza clases, añade una clase adicional a los elementos internos del popup que Leaflet genera dinámicamente (.leaflet-popup-content-wrapper y .leaflet-popup-tip). Leaflet crea esos nodos cada vez que se abre un popup, por eso no puedes modificarlos con CSS global antes: no existen hasta que el popup se muestra. El map.on('popupopen', …) intercepta ese momento y añade tu clase personalizada (por ejemplo, popup-despegues). Se puede añadir más clases. Objetivo: aplicar un estilo distinto solo a ciertos popups sin afectar al resto.
    map.on('popupopen', function (e) {
        
        const popupNode = e.popup._container;
        const clase = e.popup.options.className;

        if (['popup-despegues', 'popup-despeguesmundo', 'popup-otraclase2'].includes(clase)) {
            popupNode.querySelector('.leaflet-popup-content-wrapper')?.classList.add(clase);
            popupNode.querySelector('.leaflet-popup-tip')?.classList.add(clase);
        }
    });


    // 3. Agregar el marcador si se usaron coordenadas de la URL solo si las coordenadas vinieron de la URL, agregamos el marcador y el popup
    //if (!isNaN(urlLat) && !isNaN(urlLon)) {
    //    L.marker([useLat, useLon]).addTo(map)
            //.bindPopup(`Aquí está`)
            //.openPopup();
    //}

    // Añadir listeners al mapa (después de 'const map = L.map(...)')
    // Escuchar cuando el usuario termina de moverse/arrastrar el mapa
    map.on('moveend', function() {
        updateURL(map);
        // Si recordar posición está ON, auto-guardamos la sesión activa en LIVE
        if (localStorage.getItem('METEO_RECORDAR_POSICION_MAPA') === 'true') {
            const center = map.getCenter();
            localStorage.setItem('METEO_MAPA_LIVE_LAT', center.lat.toFixed(4));
            localStorage.setItem('METEO_MAPA_LIVE_LON', center.lng.toFixed(4));
            localStorage.setItem('METEO_MAPA_LIVE_ZOOM', map.getZoom());
        }
    });

    map.on('zoomend', function() {
        updateURL(map);

        // Recorremos todas las redes de balizas. Si su capa está visible, las repintamos para que evalúen si deben ocultar o mostrar la racha según el nuevo zoom.
        Object.values(REDES_BALIZAS).forEach(red => {
            if (map.hasLayer(red.layerGroup)) {
                actualizarIconosBalizas(red.id);
            }
        });
    });

    const mensajeCargaMapaDeCalorPeninsulaIberica = document.getElementById('mensajeCargaMapaDeCalorPeninsulaIberica');
    const mensajeCargaMapaDeCalorAlpes = document.getElementById('mensajeCargaMapaDeCalorAlpes');
    const mensajeCargaMapaDeCalorMarruecos = document.getElementById('mensajeCargaMapaDeCalorMarruecos');

    // 🛑 CONTROLES DEL MAPA
    // ___________________________________________________________________________________

    // 🟡 CONTROL Búsqueda nombres de despegues

    //Función auxiliar para normalizar texto (quitar acentos y minúsculas)
    const normalizeText = (text) => {
        if (!text) return '';
        return text
            .normalize("NFD") // Descompone caracteres acentuados
            .replace(/[\u0300-\u036f]/g, "") // Elimina los acentos (diacríticos)
            .toLowerCase(); // Convierte a minúsculas
    };		

    L.Control.textSearch = L.Control.extend({
        onAdd: function(map) {
                    
            // --- Contenedor Principal (para la búsqueda y la lista) ---
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-text-search-container');
            container.style.zIndex = '1000'; 
            container.style.height = '30px';

            // --- INYECCIÓN CSS REACTIVA (Para ocultar iconos y placeholder nativo al hacer CLIC o ESCRIBIR) ---
            if (!document.getElementById('style-buscador-mapa')) {
                const style = document.createElement('style');
                style.id = 'style-buscador-mapa';
                style.innerHTML = `
                    /* Transiciones suaves */
                    .leaflet-text-search-input {
                        transition: padding-left 0.15s ease-in-out !important;
                    }
                    .leaflet-text-search-icons-wrapper {
                        transition: opacity 0.15s ease-in-out !important;
                    }
                    
                    /* 1. OCULTAR ICONOS al hacer CLIC (focus) o al ESCRIBIR (not empty) */
                    .leaflet-text-search-input:focus ~ .leaflet-text-search-icons-wrapper,
                    .leaflet-text-search-input:not(:placeholder-shown) ~ .leaflet-text-search-icons-wrapper {
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                    
                    /* 2. MOVER CURSOR A LA IZQUIERDA al hacer CLIC (focus) o al ESCRIBIR (not empty) */
                    .leaflet-text-search-input:focus,
                    .leaflet-text-search-input:not(:placeholder-shown) {
                        padding-left: 10px !important;
                    }
                    
                    /* 3. HACER INVISIBLE EL TEXTO DEL PLACEHOLDER al hacer CLIC (focus) */
                    .leaflet-text-search-input:focus::placeholder {
                        color: transparent !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // --- Campo de Búsqueda (Input) ---
            const input = L.DomUtil.create('input', 'leaflet-text-search-input');
            input.type = 'search';
            
            input.placeholder = '';
            input.title = t('mapa.titleBuscadorDespegue');

            // Dejamos un margen de 50px a la izquierda del texto para no tapar los iconos flotantes
            input.style.paddingLeft = '5px';

            container.appendChild(input);

            // --- NUEVO: Contenedor flotante para los iconos (Lupa + Parapente SVG) ---
            const searchIconWrapper = L.DomUtil.create('div', 'leaflet-text-search-icons-wrapper', container);
            searchIconWrapper.style.cssText = `
                position: absolute;
                left: 6px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none; /* Los clics atraviesan los iconos y activan el input */
                display: flex;
                align-items: center;
                gap: 6px;
                color: #555; /* Color del trazo del parapente */
                opacity: 1;
            `;

            searchIconWrapper.innerHTML = `
                <span style="line-height: 1; user-select: none;">🔍</span>
                <icon-despegue></icon-despegue>
            `;

            // --- Lista de Autocompletado ---
            const autocompleteList = L.DomUtil.create('div', 'autocomplete-list', container);
            autocompleteList.style.position = 'absolute';
            autocompleteList.style.top = '100%'; // Colocar debajo del input
            autocompleteList.style.left = '0';
            autocompleteList.style.width = 'max-content';
            autocompleteList.style.background = 'white';
            autocompleteList.style.border = '2px solid rgba(0, 0, 0, 0.2)';
            autocompleteList.style.boxShadow = '2px 2px 3px rgba(0,0,0,0.2)';
            autocompleteList.style.display = 'none';
            autocompleteList.style.maxHeight = '300px';
            autocompleteList.style.overflowY = 'auto';
            autocompleteList.style.backgroundColor = '#eddff5';
            autocompleteList.style.padding = '6px 6px 3px 6px';
            autocompleteList.style.maxWidth = '300px';

            L.DomEvent.disableClickPropagation(container); // Evita que los clics en el control afecten al mapa
            L.DomEvent.disableScrollPropagation(container); // Evita que la rueda del ratón haga zoom en el mapa

            // Limpieza al Foco ---
            L.DomEvent.addListener(input, 'focus', function() {
                input.value = '';
                input.placeholder = '';
                // Oculta la lista al empezar a escribir/enfocar
                autocompleteList.style.display = 'none'; 
                retraerOpciones()
            });
            
            // Evento BLUR (Al perder el foco/hacer clic fuera)
            L.DomEvent.addListener(input, 'blur', function() {
                input.placeholder = originalPlaceholder;
            });

            // Autocompletado (al presionar una tecla) ---
            L.DomEvent.addListener(input, 'keyup', function() {
                // Normalizamos la consulta de búsqueda
                const q = input.value.trim();
                const normalizedQ = normalizeText(q);
                autocompleteList.innerHTML = ''; // Limpiar lista anterior

                if (q.length < 2) { // Mostrar resultados solo si hay 2 o más caracteres
                    autocompleteList.style.display = 'none';
                    return;
                }

                const matches = [];
                
                // markersDespegues tiene todos los marcadores y cada uno tiene 'm.metadata.despegue'.
                markersDespegues.forEach(m => {
                    const despegueNombre = (m.metadata && m.metadata.despegue) ? m.metadata.despegue : null;
                    // Normalizamos el nombre del despegue para la comparación
                    const normalizedDespegueNombre = normalizeText(despegueNombre);
                    
                    if (normalizedDespegueNombre && normalizedDespegueNombre.includes(normalizedQ)) {
                        // Evitar duplicados si tu array markersDespegues no es de nombres únicos
                        if (!matches.includes(despegueNombre)) {
                            matches.push(despegueNombre);
                        }
                    }
                });

                if (matches.length > 0) {
                    matches.sort((a, b) => a.localeCompare(b)); // Opcional: ordenar alfabéticamente
                    
                    matches.slice(0, 100).forEach(match => { // Limitar a los 100 primeros resultados
                        const item = L.DomUtil.create('div', 'autocomplete-item');
                        item.innerHTML = match;
                        item.style.padding = '0px';
                        item.style.cursor = 'pointer';
                        item.style.borderBottom = '1px solid #D3D3D3';
                        item.style.paddingBottom = '3px';
                        item.style.paddingTop = '3px';

                        // Al hacer clic en un elemento de la lista
                        L.DomEvent.addListener(item, 'click', function() {
                            const selectedQuery = match;
                            input.value = match; // Rellena el input con el nombre
                            autocompleteList.style.display = 'none';
                            
                            searchAndZoom(normalizeText(selectedQuery), map, clustergroupDespegues, markersDespegues);
                        });

                        autocompleteList.appendChild(item);
                    });
                    autocompleteList.style.display = 'block';
                } else {
                    autocompleteList.style.display = 'none';
                }
            });

            // Búsqueda al Presionar Enter ---
            L.DomEvent.addListener(input, 'keydown', function(e) {
                if (e.key !== 'Enter') return;
                e.preventDefault(); // Evita que se envíe un formulario o se ejecute el comportamiento por defecto

                const q = input.value.trim();
                const normalizedQ = normalizeText(q);
                
                // Intentar tomar el primer resultado de la lista de autocompletado
                const firstMatchElement = autocompleteList.querySelector('.autocomplete-item');

                if (firstMatchElement) {
                    // Hay coincidencias visibles: tomamos el texto del primer elemento
                    const selectedQuery = firstMatchElement.innerText.trim();
                    
                    // Ocultamos la lista
                    autocompleteList.style.display = 'none';
                    input.value = selectedQuery; // Opcional: Rellenar el input con la selección
                    
                    // Ejecutamos la búsqueda con la primera coincidencia
                    searchAndZoom(normalizeText(selectedQuery), map, clustergroupDespegues, markersDespegues);

                } else {
                    // No hay coincidencias o la lista no está visible: usar el texto del input
                    if (!normalizedQ) return;
                    searchAndZoom(normalizedQ, map, clustergroupDespegues, markersDespegues);
                }
            });		
            
    /*         L.DomEvent.addListener(input, 'keydown', function(e) {
                if (e.key !== 'Enter') return;
                e.preventDefault(); // Evita que se envíe un formulario o se ejecute el comportamiento por defecto
                const q = input.value.trim().toLowerCase();
                if (!q) return;

                // Oculta la lista y ejecuta la búsqueda
                autocompleteList.style.display = 'none';
                searchAndZoom(q, map, clustergroupDespegues, markersDespegues);
            });
    */        
    
            // Cerrar la lista al hacer clic fuera del control ---
            L.DomEvent.on(map, 'click', function () {
                autocompleteList.style.display = 'none';
            });

            return container;
        }
    });

    /**
     * Función auxiliar para centralizar la lógica de búsqueda y zoom.
     * Se reutiliza al presionar Enter o al hacer clic en un elemento de la lista.
     */
    function searchAndZoom(q, map, clustergroup, markers) {
        
        // 1. 🔍 INTENTAR PRIMERO LA COINCIDENCIA EXACTA
        const foundExact = markers.find(m => {
            const despegue = (m.metadata && (m.metadata.despegue || ''));
            const normalizedDespegue = normalizeText(despegue);
            
            // Compara si el nombre normalizado del despegue es EXACTAMENTE igual a la consulta normalizada (q)
            return normalizedDespegue === q;
        });

        let found = foundExact; // Inicializar con la coincidencia exacta
        
        // 2. 🔍 SI NO HAY COINCIDENCIA EXACTA, BUSCAR COINCIDENCIA PARCIAL
        if (!found) {
            // Buscar la primera coincidencia que contenga la consulta
            found = markers.find(m => {
                const despegue = (m.metadata && (m.metadata.despegue || ''));
                const normalizedDespegue = normalizeText(despegue);
                
                // Busca si el nombre normalizado del despegue INCLUYE la consulta normalizada (q)
                return normalizedDespegue.includes(q);		
            });
        }

        // Si ni la coincidencia exacta ni la parcial encontraron algo, salimos.
        if (!found) return;
        
        if (typeof clustergroupDespegues !== 'undefined') {
            if (!clustergroupDespegues.hasLayer(found)) {
                clustergroupDespegues.addLayer(found);
            }
        } 
        
        // Si existe el cluster group y tiene zoomToShowLayer, úsalo
        if (typeof clustergroup !== 'undefined' && clustergroup.zoomToShowLayer) {
            clustergroup.zoomToShowLayer(found, function() {
                // Dejamos que Leaflet haga el centrado automático con los 160px de margen que añadimos antes
                found.openPopup();
            });
        }
        // fallback si no existe clustering
        else {
            map.setView(found.getLatLng(), Math.max(map.getZoom(), 13));
            found.openPopup();
        }
    }

    map.addControl(new L.Control.textSearch({ position: 'topleft' }));

    // 🟡 CONTROL "infoPanel" (Despegues)
    const infopanelControl = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-infopanel1');
            const panelHTML = document.getElementById('infoPanel');
            if (panelHTML) container.appendChild(panelHTML);
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            return container;
        }
    });
    map.addControl(new infopanelControl({ position: 'topleft' }));

    // 🟡 CONTROL "infoPanel3" (Balizas)
    const infopanelControl3 = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-infopanel3');
            const panelHTML = document.getElementById('infoPanel3');
            if (panelHTML) container.appendChild(panelHTML);
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            return container;
        }
    });
    map.addControl(new infopanelControl3({ position: 'topleft' }));

    // 🟡 CONTROL "infoPanel2" (Filtros)
    const infopanelControl2 = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-infopanel2');
            const panelHTML = document.getElementById('infoPanel2');
            if (panelHTML) container.appendChild(panelHTML);
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            return container;
        }
    });
    map.addControl(new infopanelControl2({ position: 'topleft' }));

    // 🟡 CONTROL Escala
    L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 150
    }).addTo(map);


    // 🟡 CONTROL "Mi ubicación"
    L.Control.Locate = L.Control.extend({
    onAdd: function(map) {
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-locate');
    container.style.borderRadius = '10px';
    var link = L.DomUtil.create('a', '', container);
    link.title = t('mapa.irMiUbicacion');
    link.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="12" cy="12" r="6" stroke="#000" stroke-width="2" fill="none"/>' +
        '<circle cx="12" cy="12" r="2" fill="#000"/>' +
        '<path d="M12 0v4M12 20v4M0 12h4M20 12h4" stroke="#000" stroke-width="2"/>' +
    '</svg>';
    L.DomEvent.on(link, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        map.locate({ setView: true, maxZoom: 16 });
    });
    return container;
        }
    });
    map.addControl(new L.Control.Locate({ position: 'topright' }));
    
    // Añadir marcador al obtener ubicación
    var currentLocationMarker = null;
    map.on('locationfound', function(e) {
    if (currentLocationMarker) {
        currentLocationMarker.setLatLng(e.latlng);
        } else {
            currentLocationMarker = L.marker(e.latlng, {
            icon: L.icon({
                iconUrl: 'css/images/marker-icon-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'css/images/marker-shadow.png',
                shadowSize: [41, 41]
            })
            }).addTo(map).bindPopup(t('mapa.estaAqui'), { 
                className: 'popup-ajustado', 
                maxWidth: 'auto' 
            }).openPopup();
        }
    });

    // 🟡 CONTROL "Buscador general" (oculto inicialmente en el desplegable)
    var geocoderControl = L.Control.geocoder({
        defaultMarkGeocode: false,
        position: 'topright'
    }).on('markgeocode', function(e) {
        // Recuperar texto tal como lo escribió el usuario
        var inputValue = geocoderControl._container.querySelector('input').value.trim();

        var match = inputValue.match(/^\s*(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)\s*$/);

        if (match) {
            var lat = parseFloat(match[1]);
            var lon = parseFloat(match[2]);

            map.setView([lat, lon], 15);
            L.marker([lat, lon]).addTo(map);
        } else {
            map.fitBounds(e.geocode.bbox);
            L.marker(e.geocode.center).addTo(map);
        }
    }).addTo(map)
    ;

    // Tras añadirlo al mapa, cambio el título del plugin a uno traducido
    document.querySelector('.leaflet-control-geocoder.leaflet-bar').setAttribute('title', t('mapa.buscadorTitulo'));
    document.querySelector('.leaflet-control-geocoder-form input[type="search"]').setAttribute('placeholder', t('mapa.buscadorPlaceholder'));
    document.querySelector('.leaflet-control-geocoder-form input[type="search"]').style.fontSize = '16px';

    // 🟡 CONTROL "Capas"
    const controlCapas = L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);
    window.capasLeaflet = controlCapas; // exposición global para poder cerrarlo con Atrás Android

    map.on('baselayerchange', function(e) {
        if (localStorage.getItem('METEO_RECORDAR_TIPO_MAPA') === 'true') {
            localStorage.setItem('METEO_MAPA_CAPABASE_ULTIMA', e.name);
        }
    });

    // 2. Creamos NUESTRO propio botón físico "X"
    const btnCerrarCapas = L.DomUtil.create('div', 'cerrar-capas-btn');
    btnCerrarCapas.innerHTML = '<span>❌</span>';

    // 3. Lo metemos dentro de la caja principal del menú de mapas
    const contenedorCapas = controlCapas.getContainer();
    contenedorCapas.appendChild(btnCerrarCapas);

    // 4. Lógica de cierre para nuestra X
    L.DomEvent.on(btnCerrarCapas, 'click', function(e) {
        L.DomEvent.stopPropagation(e); // Frena el evento para que no baje al mapa
        L.DomEvent.preventDefault(e);  // Frena acciones por defecto
        controlCapas.collapse();       // Cierra el panel
    });
    
    // 5. FIX TÁCTIL: Prevenir el doble toque fantasma en móviles
    // Algunos móviles interpretan 'touchstart' y 'click' como eventos separados.
    // Esto asegura que la X responda al primer toque sin dudarlo.
    L.DomEvent.on(btnCerrarCapas, 'touchstart', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        controlCapas.collapse();
    });

    // 6. FIX TÁCTIL PARA ABRIR: Forzar apertura al primer toque
    // Buscamos el botón original (los cuadraditos)
    const btnAbrirCapas = contenedorCapas.querySelector('.leaflet-control-layers-toggle');
    if (btnAbrirCapas) {
        L.DomEvent.on(btnAbrirCapas, 'touchstart', function(e) {
            L.DomEvent.stopPropagation(e); // Frena el evento
            L.DomEvent.preventDefault(e);  // Evita que el móvil intente hacer el "hover"
            controlCapas.expand();         // Ordena abrir instantáneamente
        });
    }

    // 🚀 NUEVO: INTELIGENCIA UX PARA EL MENÚ DE CAPAS NATIVO (Smart Collapse)
    map.on('overlayadd overlayremove baselayerchange', function() {
        // Mantiene el filtro interno actualizado si tocas algo
    });

    // Al abrir el menú de capas nativo
    map.on('layeradd', function() {}); // No nos sirve, usamos los eventos del DOM
        
    //------------------------------------------------------------
    // 🔴 INICIO CAPA DESPEGUES
    //___________________________________________________________________________________


    clustergroupDespegues = L.markerClusterGroup({
        chunkedLoading: true,      	// Divide la carga en bloques
        chunkDelay: 100,            // Tiempo entre bloques (ms)
        showCoverageOnHover: false, // false mejora rendimiento. Muestra el área que ocupan los puntos
        maxClusterRadius: 40,       // Con menos de este radio en px entre los puntos, se agrupan. Menor = menos agrupación, mayor = más agrupados
        spiderfyOnMaxZoom: true,    // Con zoom máximo se expanden todos. False mejora rendimiento
        spiderfyOnEveryClick: true,
        zoomToBoundsOnClick: true, // Por defecto es true
        disableClusteringAtZoom: 11, //A zoom >= 12, los marcadores se muestran individualmente, aunque estén cerca
        
        //Redefinimos la función incorporada en el plugin Leaflet.markercluster llamada iconCreateFunction. Al crear un L.markerClusterGroup() el plugin la ejecuta automáticamente cada vez que genera un icono de clúster, pasándole como argumento el objeto cluster, que contiene todos los marcadores agrupados.
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            const clusterTitle = `Grupo de ${count} lugares de despegue`;

            // Nota máxima entre los markers del cluster
            let notaMax = -1;
            cluster.getAllChildMarkers().forEach(m => {
                if (m._notaMapa !== undefined && m._notaMapa > notaMax) {
                    notaMax = m._notaMapa;
                }
            });
            const bgColor = (notaMax >= 0) ? colorNotaMapa(notaMax) : 'white';
            const borderColor = (notaMax >= 0) ? 'transparent' : '#007aff';

            return L.divIcon({
                html: `
                    <div title="${clusterTitle}" style="
                        position: relative;
                        background-color: ${bgColor};
                        color: black;
                        border: 1.8px solid ${borderColor};
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 3px 8px rgba(0, 0, 0, 1);
                    ">
                        ${count}
                    </div>`,
                className: 'custom-cluster',
                iconSize: L.point(30, 30),
                iconAnchor: L.point(15, 15) 
            });
        }
    });	
    // escala de color por Actividad: 
    function actividadToColor(actividad) {
        if (!actividad) return '#FFFFFF'; // blanco por defecto si no hay valor

        if (actividad === 'verde') return 'green';
        if (actividad === 'naranja') return 'orange';
        if (actividad === 'amarillo') return 'yellow';
        if (actividad === 'blanco') return 'white';

        return '#FFFFFF'; // color blanco por defecto si no coincide
    }

    // crea icono compuesto (dot + etiqueta) usando L.divIcon
    window.createIconDespegue = function(despegue, actividadColor, orientacionesMetadata, bgColor, actividadScore) {
        const orientacionHTML = createOrientationSVGMapa(orientacionesMetadata);
        
        // Unificamos: Cogemos la puntuación venga del parámetro nuevo o del antiguo
        //const valorActividad = actividadScore || actividadColor || '';
        
        //let elementoActividad = '';
        
        // if (valorActividad !== '') {
        //     if (!isNaN(valorActividad) && Number(valorActividad) > 0) {
        //         elementoActividad = crearIconoActividad(valorActividad);
        //     } 
        //     else {
        //         const color = actividadToColor(valorActividad);
        //         elementoActividad = `<span class="dot" style="background:${color}"></span>`;
        //     }
        // }
        
        const bgStyle = bgColor ? ` style="background-color:${bgColor}"` : '';
        
        //const labelHTML = `<span class='label-large-despegues'${bgStyle}>${orientacionHTML}${elementoActividad}<span class="nombre-despegue-label">${escapeHtml(despegue)}</span></span>`;
        const labelHTML = `<span class='label-large-despegues'${bgStyle}>${orientacionHTML}<span class="nombre-despegue-label">${escapeHtml(despegue)}</span></span>`;

        return L.divIcon({
            html: labelHTML,
            className: 'custom-div-icon',
            iconAnchor: [0, 40] 
        });
    };

    // escape para html en popup/label. Esa función convierte caracteres especiales de HTML en sus entidades seguras, evitando que el texto insertado en el DOM se interprete como código HTML (previene inyección de HTML o XSS)
    function escapeHtml(str){
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    window.marcadoresCSVCargados = false;
    window._reintentosCargaDespeguesCSV = 0; // Cuántas veces hemos reintentado tras un fallo de red

    window.cargarMarcadoresCSV = function() {
        // Si ya los hemos cargado, o si el JSON de la meteo aún no está listo, no hacemos nada
        if (window.marcadoresCSVCargados) return;
        if (!window.bdGlobalDespegues || window.bdGlobalDespegues.length === 0) return;

        window.marcadoresCSVCargados = true;

        Papa.parse('https://flydecision.com/map/despegues.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            encoding: 'utf8',
            complete: function(results) {
                results.data.forEach(row => {
                    
                    const lat = parseFloat(row.Latitud);
                    const lon = parseFloat(row.Longitud);
                    const altitud = row.Altitud || '';	
                    const regionRaw = row.Región || ''; 
                    const provincia = row.Provincia || '';

                    // Traducir al vuelo
                    const region = t('regiones.' + regionRaw, { defaultValue: regionRaw });
                    let despegue = row.Despegue || ''; 
                    const SVGorientaciones = createOrientationSVGMapa(row.Orientaciones);
                    const orientacion = row.Orientación || '';
                    const orientaciones = row.Orientaciones || '';
                    const OrientacionesGrados = row.Orientaciones_Grados || '';
                    let actividadScore = row.Actividad || ''; 

                    const kmmax = row.Km_máx || '';
                    const vuelos = row.Vuelos || '';
                    const ultimovuelo = row.Último_vuelo || '';
                    const info = row.Más_información || '';

                    let idDespegue = row.ID || '';
                    let botonesAccionPopupHTML = '';

                    if (window.bdGlobalDespegues) {
                        const matchTabla = window.bdGlobalDespegues.find(d =>
                            parseFloat(d.Latitud).toFixed(4) === lat.toFixed(4) &&
                            parseFloat(d.Longitud).toFixed(4) === lon.toFixed(4)
                        );

                        if (matchTabla) {
                            //despegue = matchTabla.Despegue;
                            idDespegue = matchTabla.ID;
                            actividadScore = matchTabla.Actividad; // Extraemos el valor 1-5 de la tabla

                            const esFavoritoPopup  = obtenerFavoritos().map(Number).includes(Number(idDespegue));
                            const esSeguimientoPopup = obtenerSeguimientos().map(s => Number(s.id)).includes(Number(idDespegue));

                            // Agrupamos TODOS los botones en un solo contenedor Flexbox
                            botonesAccionPopupHTML = `
                            <div style="display: flex; align-items: stretch; gap: 8px; margin-top: 12px; margin-bottom: 8px;">
                                
                                <!-- Contenedor para alinear los iconos (Corazón y Ojo) a la izquierda -->
                                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                                    <!-- Botón Favorito -->
                                    <button class="btn-info btn-favorito-tabla"
                                        style="width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin: 0;"
                                        onclick="if(event){event.stopPropagation(); event.preventDefault();} toggleFavoritoDesdeTabla('${escapeHtml(idDespegue)}', this); return false;"
                                        title="${esFavoritoPopup ? t('favoritos.despegueFavorito') : t('favoritos.anadirAFavoritos')}">
                                        <svg viewBox="0 0 24 24" width="20" height="20"
                                            fill="${esFavoritoPopup ? '#e00' : 'none'}"
                                            stroke="${esFavoritoPopup ? '#e00' : '#555'}"
                                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                            style="vertical-align: middle;">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                    </button>

                                    <!-- Botón Seguimiento (Ojo) -->
                                    <button class="btn-info btn-ojo-tabla solo-modo-avanzado"
                                        style="width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin: 0;"
                                        onclick="if(event){event.stopPropagation(); event.preventDefault();} toggleSeguimientoDesdeTabla('${escapeHtml(idDespegue)}', this); return false;"
                                        title="${esSeguimientoPopup ? t('seguimiento.activar_desactivar') : t('seguimiento.activar_desactivar')}">
                                        ${svgOjoBoton(esSeguimientoPopup)}
                                    </button>
                                </div>

                                <!-- Botón "Ver en Tabla" -->
                                <button class="btn-accion" 
                                    onclick="if(event){event.stopPropagation(); event.preventDefault();} verMeteoEnTabla('${escapeHtml(idDespegue)}'); return false;" 
                                    style="flex: 1; height: auto; min-height: 34px; padding: 6px 8px; white-space: normal; word-break: break-word; line-height: 1.2; font-weight: bold; background-color: #e7f5ff; border-color: #007aff; color: #0056b3;">
                                    ${t('mapa.verEnTabla')}
                                </button>

                            </div>`;
                        }
                    }

                    // 2. Dibujamos las barritas siempre que haya número (tenga meteo o no)
                    const htmlActividadPopup = actividadScore 
                        ? crearIconoActividad(actividadScore) 
                        : ''; // Si está vacío, no pintamos nada

                    // Pasamos la 'actividadScore' a la función del mapa para que también pinte las barras en la etiqueta. 
                    // Dejamos en blanco el segundo parámetro (que era el antiguo de los colores).
                    const icon = createIconDespegue(despegue, '', orientaciones, null, actividadScore);
                    const marker = L.marker([lat, lon], { icon: icon, riseOnHover: true, title: 'Lugar de despegue' });

                    marker._esMasterMeteo = (row.Master_meteo && (row.Master_meteo.trim().toLowerCase() === 'sí' || row.Master_meteo.trim().toLowerCase() === 'si'));
                    marker._esSecundarioMeteo = (row.Master_meteo && (row.Master_meteo.trim().toLowerCase() === 'no'));

                    // 1. Traducimos el nombre largo (noroeste -> northwest)
                    const nombreLargoOriTraducido = t(`orientaciones.${row.Orientación.toLowerCase()}`);
                    const codigosOriTraducidos = traducirCadenaOrientacion(row.Orientaciones);
                            
                    const popupHtml = `
                        <div style="line-height: 1.4;">
                            <b><span style='font-size: 20px; padding-right: 20px; max-width: 212px; display: inline-block;'><icon-despegue></icon-despegue>${escapeHtml(despegue)}</b></span><br>
                            
                            ${botonesAccionPopupHTML}

                            ⛅ <a href='https://www.windy.com/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/wind?${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},14' onclick='abrirLinkExterno(this.href); return false;'>Windy</a><br>

                            ⛅ <a href='https://meteo-parapente.com/#/${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},13' onclick='abrirLinkExterno(this.href); return false;'>Meteo-parapente</a><br>

                            ⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${escapeHtml(lat.toFixed(4))}N${escapeHtml(lon.toFixed(4))}E' onclick='abrirLinkExterno(this.href); return false;'>Meteoblue</a><br>

                            ⛅ <a href='https://meteo-fly.com/?lat=${escapeHtml(lat.toFixed(4))}&lon=${escapeHtml(lon.toFixed(4))}&day=1&model=meteofrance_seamless&maxAlt=4000&cellSelection=nearest&view=wind&hour=0&daylight=1' onclick='abrirLinkExterno(this.href); return false;'>Meteo-fly</a><br>

                            <div class="popup-toggle-header" style="cursor: pointer; border-radius: 3px; padding-top: 8px; margin-bottom: 10px;">
                                ${t('mapa.masInformacion')}
                            </div>
                            
                            <div class="popup-collapsible-content" style="display: none; overflow-wrap: break-word; ">

                                <br>${t('popupDespegue.region')} <b>${t('regiones.' + escapeHtml(region), {defaultValue: escapeHtml(region)})}</b><br>
                                ${t('popupDespegue.provincia')} <b>${escapeHtml(provincia)}</b><br>

                                <div>
                                    ${t('popupDespegue.orientacion')} 
                                    <span style="display: inline-block; vertical-align: 2px; margin-left: 4px;">${SVGorientaciones}</span> 
                                    <b style="vertical-align: 1px;">${escapeHtml(traducirCadenaOrientacion(orientacion))}</b>
                                </div>

                                ${t('mapa.labelCoordenadas')} <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b><br>
                                ${t('mapa.labelAltitud')} <b>${escapeHtml(altitud)} m</b><br>

                                <div>
                                    ${t('popupDespegue.nivelActividad')} 
                                    <span style='margin-left: 6px;'>${htmlActividadPopup}</span> 
                                    <b>${actividadScore || '?'}/5</b>
                                </div>
                                
                                ${t('mapa.labelVuelos')} <b>${escapeHtml(vuelos)}</b><br>

                                <br>🗺️ <a href='https://maps.google.com/?q=${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))}' onclick='abrirLinkExterno(this.href); return false;'>Google Maps</a><br>
                                🗺️ <a href='https://brouter.de/brouter-web/#map=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/OpenTopoMap&pois=${escapeHtml(lon.toFixed(4))},${escapeHtml(lat.toFixed(4))}' onclick='abrirLinkExterno(this.href); return false;'>Brouter</a><br>
                                🗺️ <a href='https://nakarte.me/#m=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}&l=Otm/Sa&n2=_gwm&r=${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/${escapeHtml(despegue)} (${escapeHtml(orientacion)})' onclick='abrirLinkExterno(this.href); return false;'>Nakarte</a><br>
                                🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon}%20${lat}&filter[radius]=500' onclick='abrirLinkExterno(this.href); return false;'>XContest (&plusmn; 500 m)</a><br>

                                <br><div style="margin-bottom: 5px;">${escapeHtml(info)}</div>
                                
                            </div>
                        </div>
                    `;		

                    marker.bindPopup(popupHtml, { 
                        className: 'popup-despegues', 
                        maxWidth: 300,
                        maxHeight: 450,
                        autoPanPaddingTopLeft: L.point(10, 350) // el primer valor (80) es el margen a reservar por la izquierda, el segundo (170) por arriba. Con autoPanPaddingBottomRight: L.point(55, 150) // el primer valor (80) es el margen a reservar por la derecha, el segundo (150) por abajo.
                    });

                    // Regeneramos el popup por si venimos de consultarlo en la tabla o hemos cambiado estados.
                    marker.on('popupopen', function() {
                        const popupEl = this.getPopup().getElement();
                        if (!popupEl) return;
                        
                        const btn = popupEl.querySelector('.btn-accion');
                        if (btn) btn.innerHTML = `${t('mapa.verEnTabla')}`;

                        // Actualizar estado del botón Favorito dinámicamente
                        const btnFav = popupEl.querySelector('.btn-favorito-tabla');
                        if (btnFav) {
                            const esFav = obtenerFavoritos().map(Number).includes(Number(idDespegue));
                            btnFav.title = esFav ? t('favoritos.despegueFavorito') : t('favoritos.anadirAFavoritos');
                            const svgFav = btnFav.querySelector('svg');
                            if (svgFav) {
                                svgFav.setAttribute('fill', esFav ? '#e00' : 'none');
                                svgFav.setAttribute('stroke', esFav ? '#e00' : '#555');
                            }
                        }

                        // Actualizar estado del botón Seguimiento dinámicamente
                        const btnSeg = popupEl.querySelector('.btn-ojo-tabla');
                        if (btnSeg) {
                            const esSeg = obtenerSeguimientos().map(s => Number(s.id)).includes(Number(idDespegue));
                            btnSeg.title = esSeg ? t('seguimiento.activar_desactivar') : t('seguimiento.activar_desactivar');
                            actualizarVistaOjo(btnSeg, esSeg);
                        }
                    });

                    marker.metadata = { id: idDespegue, despegue: despegue, orientacion: orientacion, orientaciones: orientaciones, OrientacionesGrados: OrientacionesGrados, actividad: actividadScore, kmax: kmmax, vuelos: vuelos, ultimovuelo: ultimovuelo }; 
                    markersDespegues.push(marker); //inserta marker al grupo markersDespegues
                    clustergroupDespegues.addLayer(marker);
                });

                // Restaurar el estado de visibilidad si el check de "Recordar capas activas" está ON
                const recordarCapas = localStorage.getItem('METEO_RECORDAR_CAPAS_ACTIVAS') === 'true';
                const chkDespeguesPersist = document.getElementById('checkboxDespegues');
                const despeguesDebenVerse = recordarCapas ? (localStorage.getItem('METEO_MAPA_CAPA_DESPEGUES_VISIBLE') !== 'false') : true; // True por defecto

                if (chkDespeguesPersist) chkDespeguesPersist.checked = despeguesDebenVerse;

                // 🛠️ Añadimos SIEMPRE el grupo al mapa primero: es lo único que dispara el onAdd() de leaflet.markercluster, que inicializa internamente _topClusterLevel.
                // Si debe arrancar oculto, lo quitamos justo después (visualmente no se nota nada, pero evita que refreshClusters() reviente más adelante porque _topClusterLevel sigue undefined).
                map.addLayer(clustergroupDespegues);
                if (!despeguesDebenVerse) {
                    map.removeLayer(clustergroupDespegues);
                }
                if (typeof actualizarFiltrosMapa === 'function') actualizarFiltrosMapa();
            
                // Comprobar si hay petición de apertura externa en la URL (?q=...) (link desde Meteo)
                // --- LÓGICA DE APERTURA AUTOMÁTICA (NOMBRE -> COORDENADAS) ---
                const params = new URLSearchParams(window.location.search);
                const busquedaURL = params.get('q');
                const urlLat = parseFloat(params.get('lat'));
                const urlLon = parseFloat(params.get('lon'));

                let despegueEncontrado = null;

                // 1. PRIMER INTENTO: Buscar por NOMBRE (parámetro 'q')
                if (busquedaURL) {
                    const textoNormalizado = normalizeText(decodeURIComponent(busquedaURL));
                    
                    // Intento coincidencia exacta por nombre
                    despegueEncontrado = markersDespegues.find(m => 
                        normalizeText(m.metadata.despegue) === textoNormalizado
                    );

                    // Si no hay exacta, intento coincidencia parcial
                    if (!despegueEncontrado) {
                        despegueEncontrado = markersDespegues.find(m => 
                            normalizeText(m.metadata.despegue).includes(textoNormalizado)
                        );
                    }
                }

                // 2. SEGUNDO INTENTO: Si no hay nombre o el nombre falló, buscar por COORDENADAS
                if (!despegueEncontrado && !isNaN(urlLat) && !isNaN(urlLon)) {
                    despegueEncontrado = markersDespegues.find(m => {
                        const mLat = m.getLatLng().lat;
                        const mLon = m.getLatLng().lng;
                        // Margen de error de 0.0001 grados (aprox 10 metros)
                        return Math.abs(mLat - urlLat) < 0.0001 && Math.abs(mLon - urlLon) < 0.0001;
                    });
                }

                // 3. EJECUCIÓN: Si cualquiera de los dos métodos encontró un despegue, abrirlo
                if (despegueEncontrado) {		
                    setTimeout(() => {
                        
                        // 1. Aseguramos que la capa de despegues esté visible. 
                        // Si el usuario la tenía apagada en memoria, la encendemos forzosamente 
                        // para poder mostrarle el despegue que ha pedido por URL.
                        if (!map.hasLayer(clustergroupDespegues)) {
                            map.addLayer(clustergroupDespegues);
                            const chk = document.getElementById('checkboxDespegues');
                            if (chk) chk.checked = true;
                            localStorage.setItem('METEO_MAPA_CAPA_DESPEGUES_VISIBLE', true);
                        }

                        // 2. Intentamos usar la función del cluster
                        try {
                            clustergroupDespegues.zoomToShowLayer(despegueEncontrado, function() {
                                // Dejamos que Leaflet haga el centrado automático
                                despegueEncontrado.openPopup();
                            });
                        } catch (e) {
                            // PLAN B (Anti-crash):
                            // Si el plugin falla (porque el móvil es lento y el 'chunkedLoading' aún 
                            // no ha terminado de procesar este marcador), usamos un centrado seguro directo.
                            console.warn("Cluster aún procesando. Usando centrado de emergencia.");
                            
                            map.setView(despegueEncontrado.getLatLng(), 14);
                            
                            // Si por algún motivo el marcador no estuviera en el mapa, lo metemos a la fuerza
                            if (!map.hasLayer(despegueEncontrado)) {
                                despegueEncontrado.addTo(map);
                            }
                            despegueEncontrado.openPopup();
                        }

                    }, 800); // Subimos ligeramente de 600 a 800ms para dar más respiro al procesador
                }
            
                // APLICAR COLORES A LOS MARCADORES RECIÉN CREADOS
                if (typeof filtrosMapaAbiertos !== 'undefined' && filtrosMapaAbiertos) {
                    marcarOperativosEnMarkers();
                    aplicarPuntuacionEnMapa();
                } else {
                    actualizarFiltrosMapa();
                }

                // 🚀 NUEVO: Apagamos el spinner exactamente en el milisegundo en el 
                // que los iconos ya están colocados y coloreados en el mapa.
                if (typeof ocultarLoading === 'function') {
                    ocultarLoading();
                }

            },
            error: function(error) {
                console.error('Error cargando CSV:', error.message || error);

                // Antes de rendirnos, reintentamos un par de veces: la mayoría de estos
                // fallos son parpadeos de red momentáneos (móvil, wifi->datos, resume...),
                // no un problema real del archivo.
                const MAX_REINTENTOS = 2;
                if (window._reintentosCargaDespeguesCSV < MAX_REINTENTOS) {
                    window._reintentosCargaDespeguesCSV++;
                    const espera = 1500 * window._reintentosCargaDespeguesCSV; // backoff simple: 1.5s, 3s
                    console.warn(`Reintentando carga de despegues.csv (intento ${window._reintentosCargaDespeguesCSV}/${MAX_REINTENTOS}) en ${espera}ms...`);

                    window.marcadoresCSVCargados = false; // Permitimos que se vuelva a intentar
                    setTimeout(() => window.cargarMarcadoresCSV(), espera);
                    return; // No apagamos el spinner ni mostramos alert todavía
                }

                // Se agotaron los reintentos: registramos el fallo real, sin alert() bloqueante.
                console.error('No se pudo cargar despegues.csv tras varios reintentos.');
                if (typeof ocultarLoading === 'function') ocultarLoading();
            }
        });
    };

    // Llamamos a la función recién creada para envolver el papa.parse, por si la usuaria va nada más arrancar al mapa y no se mostrarían los 3 controles de favorito, seguimiento e ir a la tabla en los popups
    if (window.bdGlobalDespegues && window.bdGlobalDespegues.length > 0) {
            window.cargarMarcadoresCSV();
    }

    // 🔴 INICIO CAPA MAPA DE CALOR PENÍNSULA IBÉRICA (OPTIMIZADA CON SUPERCLUSTER)
    //___________________________________________________________________________________

    const layerGroupPeninsula = L.layerGroup();
    let superclusterPeninsula = null;
    let geoJsonPeninsula = [];
    const heatpointsMapaDeCalorPeninsulaIberica = [];
    let heatlayerMapaDeCalorPeninsulaIberica;
    let csvCargadoMapaDeCalorPeninsulaIberica = false;

    const iconoDespegueIndividualPeninsulaIberica = L.divIcon({
        className: 'custom-point-circle',
        html: '<div style="background:#ff0000; border-radius:50%; width:10px; height:10px;"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });

    function crearIconoClusterPeninsula(count) {
        const clusterTitle = `Grupo de ${count} despegues registrados en XContest`;
        let max = 1000; 
        let ratio = 1 - Math.min(count / max, 1); 

        function hexToRGB(hex) {
            return [parseInt(hex.substr(1,2),16), parseInt(hex.substr(3,2),16), parseInt(hex.substr(5,2),16)];
        }

        let darkRGB = hexToRGB("#a91311");   
        let lightRGB = hexToRGB("#f7bd7e");  

        let r = Math.round(darkRGB[0] + (lightRGB[0]-darkRGB[0])*ratio);
        let g = Math.round(darkRGB[1] + (lightRGB[1]-darkRGB[1])*ratio);
        let b = Math.round(darkRGB[2] + (lightRGB[2]-darkRGB[2])*ratio);
        let color = `rgb(${r},${g},${b})`;

        return new L.DivIcon({
            html: `<div title="${clusterTitle}" style="background:${color}"><span>${count}</span></div>`,
            className: 'estilobase-custom-cluster-mapadecalor',
            iconSize: new L.Point(40, 40),
            iconAnchor: L.point(20, 20)
        });
    }

    function actualizarClusterPeninsula() {
        if (!csvCargadoMapaDeCalorPeninsulaIberica || !map.hasLayer(layerGroupPeninsula)) return;

        const bounds = map.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        const zoom = map.getZoom();

        const clusters = superclusterPeninsula.getClusters(bbox, zoom);

        layerGroupPeninsula.clearLayers();

        clusters.forEach(feature => {
            const [lon, lat] = feature.geometry.coordinates;

            if (feature.properties.cluster) {
                const count = feature.properties.point_count;
                const icon = crearIconoClusterPeninsula(count);
                const marker = L.marker([lat, lon], { icon: icon });

                marker.on('click', () => {
                    const popupHtml = `<div style="line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><icon-despegue></icon-despegue><icon-despegue></icon-despegue><icon-despegue></icon-despegue><icon-despegue></icon-despegue>${t('mapa.grupoXContest', { count: count })}</div>
                        <div style="margin-bottom: 5px;">${t('mapa.coordenadasMedias')}<br><b>${lat.toFixed(4)}, ${lon.toFixed(4)}</b></div>
                        <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${lat.toFixed(4)}/${lon.toFixed(4)}/wind?${lat.toFixed(4)},${lon.toFixed(4)},14' target='_blank'>Windy</a></div>
                        <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${lat.toFixed(4)},${lon.toFixed(4)},13' target='_blank'>Meteo-parapente</a></div>
                        <div style="margin-bottom: 3px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${lat.toFixed(4)}N${lon.toFixed(4)}E' target='_blank'>Meteoblue</a></div>
                        <div style="margin-bottom: 5px;">⛅ <a href='https://meteo-fly.com/?lat=${escapeHtml(lat.toFixed(4))}&lon=${escapeHtml(lon.toFixed(4))}&day=1&model=meteofrance_seamless&maxAlt=4000&cellSelection=nearest&view=wind&hour=0&daylight=1' target='_blank'>Meteo-fly</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${lat.toFixed(4)},${lon.toFixed(4)}' target='_blank'>Google Maps</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${lat.toFixed(4)}/${lon.toFixed(4)}/OpenTopoMap&pois=${lon.toFixed(4)},${lat.toFixed(4)}' target='_blank'>Brouter</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${lat.toFixed(4)}/${lon.toFixed(4)}&l=Otm/Sa&n2=_gwm&r=${lat.toFixed(4)}/${lon.toFixed(4)}/${lat.toFixed(4)}, ${lon.toFixed(4)}' target='_blank'>Nakarte</a></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon.toFixed(4)}%20${lat.toFixed(4)}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                        </div>`;
                    L.popup({ className: 'popup-despegueindividual', maxWidth: 300, autoPanPaddingTopLeft: L.point(10, 280) }).setLatLng([lat, lon]).setContent(popupHtml).openOn(map);
                });
                layerGroupPeninsula.addLayer(marker);

            } else {
                const p = feature.properties;
                const marker = L.marker([lat, lon], { icon: iconoDespegueIndividualPeninsulaIberica, riseOnHover: true });

                marker.on('click', () => {
                    const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b><icon-despegue></icon-despegue><br>Despegue en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  
                        <div style="margin-bottom: 5px;">Fecha: <b>${escapeHtml(p.fecha)}</b></div>
                        <div style="margin-bottom: 5px;">Hora: <b>${escapeHtml(p.hora)}</b></div>
                        <div style="margin-bottom: 5px;">Distancia recorrida: <b>${escapeHtml(p.dist)} km</b></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='${escapeHtml(p.url)}' target='_blank'>Vuelo en XContest</a></div>
                        </div>`;
                    L.popup({ className: 'popup-despegueindividual', maxWidth: 300, autoPanPaddingTopLeft: L.point(10, 280) }).setLatLng([lat, lon]).setContent(popupHtml).openOn(map);
                });
                layerGroupPeninsula.addLayer(marker);
            }
        });
    }

    map.on('moveend', actualizarClusterPeninsula);

    function mostrarMensajeCargaMapaDeCalorPeninsulaIberica() {
        if (mensajeCargaMapaDeCalorPeninsulaIberica) mensajeCargaMapaDeCalorPeninsulaIberica.style.display = 'block';
    }

    function ocultarmensajeCargaMapaDeCalorPeninsulaIberica() {
        if (mensajeCargaMapaDeCalorPeninsulaIberica) {
            setTimeout(function() {mensajeCargaMapaDeCalorPeninsulaIberica.style.display = 'none'}, 1500);
        }
    }

    function cargarDatosMapaDeCalorPeninsulaIberica() {
        if (csvCargadoMapaDeCalorPeninsulaIberica) return;
        
        mostrarMensajeCargaMapaDeCalorPeninsulaIberica();

        superclusterPeninsula = new Supercluster({ radius: 80, maxZoom: 16 });

        Papa.parse('map/mapadecalorpeninsulaiberica.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            encoding: 'utf8',
            complete: function(results) {
                results.data.forEach(row => {
                    const lat = parseFloat(row.Latitud);
                    const lon = parseFloat(row.Longitud);
                    
                    geoJsonPeninsula.push({
                        type: "Feature",
                        properties: { fecha: row.Fecha || '', hora: row.Hora || '', dist: row.DistanciaRecorrida || '', url: row.URLVuelo || '' },
                        geometry: { type: "Point", coordinates: [lon, lat] }
                    });
                    
                    heatpointsMapaDeCalorPeninsulaIberica.push([lat, lon, 1]);
                });
                
                superclusterPeninsula.load(geoJsonPeninsula);
                
                heatlayerMapaDeCalorPeninsulaIberica = L.heatLayer(heatpointsMapaDeCalorPeninsulaIberica, {
                    radius: 18, blur: 22, maxZoom: 19, minOpacity: 0.3,
                    gradient: { 0.2: 'yellow', 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' }
                });

                csvCargadoMapaDeCalorPeninsulaIberica = true;
                ocultarmensajeCargaMapaDeCalorPeninsulaIberica();
                
                const checkbox = document.getElementById('checkboxMapaDeCalorPeninsulaIberica');
                if (checkbox && checkbox.checked) {
                    if (!map.hasLayer(layerGroupPeninsula)) map.addLayer(layerGroupPeninsula);
                    if (!map.hasLayer(heatlayerMapaDeCalorPeninsulaIberica)) map.addLayer(heatlayerMapaDeCalorPeninsulaIberica);
                    actualizarClusterPeninsula();
                }
            },
            error: function(error) {
                console.error('Error cargando CSV Peninsula:', error);
                alert('Error al cargar el archivo CSV de Península Ibérica.');
                ocultarmensajeCargaMapaDeCalorPeninsulaIberica();
                const checkbox = document.getElementById('checkboxMapaDeCalorPeninsulaIberica');
                if (checkbox) checkbox.checked = false;
            }
        });
    }

    const checkboxMapaDeCalorPeninsulaIberica = document.getElementById('checkboxMapaDeCalorPeninsulaIberica');
    if (checkboxMapaDeCalorPeninsulaIberica) {
        checkboxMapaDeCalorPeninsulaIberica.addEventListener('change', function () {
            if (this.checked) {
                if (!csvCargadoMapaDeCalorPeninsulaIberica) {
                    cargarDatosMapaDeCalorPeninsulaIberica();
                } else {
                    if (!map.hasLayer(layerGroupPeninsula)) {
                        map.addLayer(layerGroupPeninsula);
                        actualizarClusterPeninsula(); 
                    }
                    if (heatlayerMapaDeCalorPeninsulaIberica && !map.hasLayer(heatlayerMapaDeCalorPeninsulaIberica)) {
                        map.addLayer(heatlayerMapaDeCalorPeninsulaIberica);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupPeninsula)) map.removeLayer(layerGroupPeninsula);
                if (heatlayerMapaDeCalorPeninsulaIberica && map.hasLayer(heatlayerMapaDeCalorPeninsulaIberica)) {
                    map.removeLayer(heatlayerMapaDeCalorPeninsulaIberica);
                }
            }
        });
    }

    // 🔴 INICIO CAPA MAPA DE CALOR ALPES (OPTIMIZADA CON SUPERCLUSTER)
    //___________________________________________________________________________________

    // 1. Variables Globales de la capa
    const layerGroupAlpes = L.layerGroup(); // Contenedor ligero de Leaflet para lo visible
    let superclusterAlpes = null;           // El cerebro matemático de agrupación
    let geoJsonAlpes = [];                  // Array puro de datos (bajísimo consumo de RAM)
    const heatpointsMapaDeCalorAlpes = [];  // Array para el mapa de calor
    let heatlayerMapaDeCalorAlpes;
    let csvCargadoMapaDeCalorAlpes = false;

    const iconoDespegueIndividualAlpes = L.divIcon({
        className: 'custom-point-circle',
        html: '<div style="background:#ff0000; border-radius:50%; width:10px; height:10px;"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });

    // 2. Función para generar el icono del grupo (Mantiene tus colores exactos)
    function crearIconoClusterAlpes(count) {
        const clusterTitle = `Grupo de ${count} despegues registrados en XContest`;
        let max = 1000; 
        let ratio = 1 - Math.min(count / max, 1); 

        function hexToRGB(hex) {
            return [
                parseInt(hex.substr(1,2),16),
                parseInt(hex.substr(3,2),16),
                parseInt(hex.substr(5,2),16)
            ];
        }

        let darkRGB = hexToRGB("#a91311");   
        let lightRGB = hexToRGB("#f7bd7e");  

        let r = Math.round(darkRGB[0] + (lightRGB[0]-darkRGB[0])*ratio);
        let g = Math.round(darkRGB[1] + (lightRGB[1]-darkRGB[1])*ratio);
        let b = Math.round(darkRGB[2] + (lightRGB[2]-darkRGB[2])*ratio);
        let color = `rgb(${r},${g},${b})`;

        return new L.DivIcon({
            html: `<div title="${clusterTitle}" style="background:${color}"><span>${count}</span></div>`,
            className: 'estilobase-custom-cluster-mapadecalor',
            iconSize: new L.Point(40, 40),
            iconAnchor: L.point(20, 20)
        });
    }

    // 3. MOTOR DE DIBUJO: Solo crea los marcadores que caben en la pantalla
    function actualizarClusterAlpes() {
        if (!csvCargadoMapaDeCalorAlpes || !map.hasLayer(layerGroupAlpes)) return;

        const bounds = map.getBounds();
        // Bounding box: [Oeste, Sur, Este, Norte]
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        const zoom = map.getZoom();

        // Supercluster hace la magia aquí en milisegundos
        const clusters = superclusterAlpes.getClusters(bbox, zoom);

        // Borramos lo que se veía antes
        layerGroupAlpes.clearLayers();

        // Dibujamos solo lo necesario
        clusters.forEach(feature => {
            const [lon, lat] = feature.geometry.coordinates;

            if (feature.properties.cluster) {
                // ES UN GRUPO
                const count = feature.properties.point_count;
                const icon = crearIconoClusterAlpes(count);
                const marker = L.marker([lat, lon], { icon: icon });

                // Popup del grupo (Tu lógica original sin hacer zoom)
                marker.on('click', () => {
                    const popupHtml = `<div style="line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><icon-despegue></icon-despegue><icon-despegue></icon-despegue><icon-despegue></icon-despegue><icon-despegue></icon-despegue>${t('mapa.grupoXContest', { count: count })}</div>
                        <div style="margin-bottom: 5px;">${t('mapa.coordenadasMedias')}<br><b>${lat.toFixed(4)}, ${lon.toFixed(4)}</b></div>
                        <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${lat.toFixed(4)}/${lon.toFixed(4)}/wind?${lat.toFixed(4)},${lon.toFixed(4)},14' target='_blank'>Windy</a></div>
                        <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${lat.toFixed(4)},${lon.toFixed(4)},13' target='_blank'>Meteo-parapente</a></div>
                        <div style="margin-bottom: 3px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${lat.toFixed(4)}N${lon.toFixed(4)}E' target='_blank'>Meteoblue</a></div>
                        <div style="margin-bottom: 5px;">⛅ <a href='https://meteo-fly.com/?lat=${escapeHtml(lat.toFixed(4))}&lon=${escapeHtml(lon.toFixed(4))}&day=1&model=meteofrance_seamless&maxAlt=4000&cellSelection=nearest&view=wind&hour=0&daylight=1' target='_blank'>Meteo-fly</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${lat.toFixed(4)},${lon.toFixed(4)}' target='_blank'>Google Maps</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${lat.toFixed(4)}/${lon.toFixed(4)}/OpenTopoMap&pois=${lon.toFixed(4)},${lat.toFixed(4)}' target='_blank'>Brouter</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${lat.toFixed(4)}/${lon.toFixed(4)}&l=Otm/Sa&n2=_gwm&r=${lat.toFixed(4)}/${lon.toFixed(4)}/${lat.toFixed(4)}, ${lon.toFixed(4)}' target='_blank'>Nakarte</a></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon.toFixed(4)}%20${lat.toFixed(4)}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                        </div>`;
                    L.popup({ className: 'popup-despegueindividual', maxWidth: 300, autoPanPaddingTopLeft: L.point(10, 280) }).setLatLng([lat, lon]).setContent(popupHtml).openOn(map);
                });
                layerGroupAlpes.addLayer(marker);

            } else {
                // ES UN PUNTO INDIVIDUAL
                const p = feature.properties;
                const marker = L.marker([lat, lon], { icon: iconoDespegueIndividualAlpes, riseOnHover: true });

                marker.on('click', () => {
                    const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b><icon-despegue></icon-despegue><br>Despegue en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  
                        <div style="margin-bottom: 5px;">Fecha: <b>${escapeHtml(p.fecha)}</b></div>
                        <div style="margin-bottom: 5px;">Hora: <b>${escapeHtml(p.hora)}</b></div>
                        <div style="margin-bottom: 5px;">Distancia recorrida: <b>${escapeHtml(p.dist)} km</b></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='${escapeHtml(p.url)}' target='_blank'>Vuelo en XContest</a></div>
                        </div>`;
                    L.popup({ className: 'popup-despegueindividual', maxWidth: 300, autoPanPaddingTopLeft: L.point(10, 280) }).setLatLng([lat, lon]).setContent(popupHtml).openOn(map);
                });
                layerGroupAlpes.addLayer(marker);
            }
        });
    }

    // 4. Conectar los eventos del mapa a nuestro motor de dibujo
    map.on('moveend', actualizarClusterAlpes);

    // 5. Carga e indexación de datos
    function mostrarMensajeCargaMapaDeCalorAlpes() {
        if (mensajeCargaMapaDeCalorAlpes) mensajeCargaMapaDeCalorAlpes.style.display = 'block';
    }

    function ocultarmensajeCargaMapaDeCalorAlpes() {
        if (mensajeCargaMapaDeCalorAlpes) {
            setTimeout(function() {mensajeCargaMapaDeCalorAlpes.style.display = 'none'}, 1500);
        }
    }

    function cargarDatosMapaDeCalorAlpes() {
        if (csvCargadoMapaDeCalorAlpes) return;
        
        mostrarMensajeCargaMapaDeCalorAlpes();

        // Inicializar Supercluster
        superclusterAlpes = new Supercluster({
            radius: 80,
            maxZoom: 16 // Nivel de zoom máximo al que agrupará. Más allá mostrará puntos individuales.
        });

        Papa.parse('map/mapadecaloralpes.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            encoding: 'utf8',
            complete: function(results) {
                // Llenamos el array GeoJSON puro (sin tocar el DOM)
                results.data.forEach(row => {
                    const lat = parseFloat(row.Latitud);
                    const lon = parseFloat(row.Longitud);
                    
                    geoJsonAlpes.push({
                        type: "Feature",
                        properties: {
                            fecha: row.Fecha || '',
                            hora: row.Hora || '',
                            dist: row.DistanciaRecorrida || '',
                            url: row.URLVuelo || ''
                        },
                        geometry: {
                            type: "Point",
                            coordinates: [lon, lat] // Importante: Supercluster usa [lon, lat]
                        }
                    });
                    
                    // Para el heatmap
                    heatpointsMapaDeCalorAlpes.push([lat, lon, 1]);
                });
                
                // Cargamos todos los datos en el "cerebro" matemático de golpe
                superclusterAlpes.load(geoJsonAlpes);
                
                heatlayerMapaDeCalorAlpes = L.heatLayer(heatpointsMapaDeCalorAlpes, {
                    radius: 18, blur: 22, maxZoom: 19, minOpacity: 0.3,
                    gradient: { 0.2: 'yellow', 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' }
                });

                csvCargadoMapaDeCalorAlpes = true;
                ocultarmensajeCargaMapaDeCalorAlpes();
                
                const checkbox = document.getElementById('checkboxMapaDeCalorAlpes');
                if (checkbox && checkbox.checked) {
                    if (!map.hasLayer(layerGroupAlpes)) map.addLayer(layerGroupAlpes);
                    if (!map.hasLayer(heatlayerMapaDeCalorAlpes)) map.addLayer(heatlayerMapaDeCalorAlpes);
                    
                    // Disparamos el primer dibujo
                    actualizarClusterAlpes();
                }
            },
            error: function(error) {
                console.error('Error cargando CSV Alpes:', error);
                alert('Error al cargar el archivo CSV de Alpes.');
                ocultarmensajeCargaMapaDeCalorAlpes();
                const checkbox = document.getElementById('checkboxMapaDeCalorAlpes');
                if (checkbox) checkbox.checked = false;
            }
        });
    }

    // 6. Lógica del Checkbox
    const checkboxMapaDeCalorAlpes = document.getElementById('checkboxMapaDeCalorAlpes');
    if (checkboxMapaDeCalorAlpes) {
        checkboxMapaDeCalorAlpes.addEventListener('change', function () {
            if (this.checked) {
                if (!csvCargadoMapaDeCalorAlpes) {
                    cargarDatosMapaDeCalorAlpes();
                } else {
                    if (!map.hasLayer(layerGroupAlpes)) {
                        map.addLayer(layerGroupAlpes);
                        actualizarClusterAlpes(); // Redibujamos al activar
                    }
                    if (heatlayerMapaDeCalorAlpes && !map.hasLayer(heatlayerMapaDeCalorAlpes)) {
                        map.addLayer(heatlayerMapaDeCalorAlpes);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupAlpes)) map.removeLayer(layerGroupAlpes);
                if (heatlayerMapaDeCalorAlpes && map.hasLayer(heatlayerMapaDeCalorAlpes)) {
                    map.removeLayer(heatlayerMapaDeCalorAlpes);
                }
            }
        });
    }

    // 🔴 INICIO CAPA MAPA DE CALOR MARRUECOS (OPTIMIZADA CON SUPERCLUSTER)
    //___________________________________________________________________________________

    const layerGroupMarruecos = L.layerGroup();
    let superclusterMarruecos = null;
    let geoJsonMarruecos = [];
    const heatpointsMapaDeCalorMarruecos = [];
    let heatlayerMapaDeCalorMarruecos;
    let csvCargadoMapaDeCalorMarruecos = false;

    const iconoDespegueIndividualMarruecos = L.divIcon({
        className: 'custom-point-circle',
        html: '<div style="background:#ff0000; border-radius:50%; width:10px; height:10px;"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });

    function crearIconoClusterMarruecos(count) {
        const clusterTitle = `Grupo de ${count} despegues registrados en XContest`;
        let max = 1000; 
        let ratio = 1 - Math.min(count / max, 1); 

        function hexToRGB(hex) {
            return [parseInt(hex.substr(1,2),16), parseInt(hex.substr(3,2),16), parseInt(hex.substr(5,2),16)];
        }

        let darkRGB = hexToRGB("#a91311");   
        let lightRGB = hexToRGB("#f7bd7e");  

        let r = Math.round(darkRGB[0] + (lightRGB[0]-darkRGB[0])*ratio);
        let g = Math.round(darkRGB[1] + (lightRGB[1]-darkRGB[1])*ratio);
        let b = Math.round(darkRGB[2] + (lightRGB[2]-darkRGB[2])*ratio);
        let color = `rgb(${r},${g},${b})`;

        return new L.DivIcon({
            html: `<div title="${clusterTitle}" style="background:${color}"><span>${count}</span></div>`,
            className: 'estilobase-custom-cluster-mapadecalor',
            iconSize: new L.Point(40, 40),
            iconAnchor: L.point(20, 20)
        });
    }

    function actualizarClusterMarruecos() {
        if (!csvCargadoMapaDeCalorMarruecos || !map.hasLayer(layerGroupMarruecos)) return;

        const bounds = map.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        const zoom = map.getZoom();

        const clusters = superclusterMarruecos.getClusters(bbox, zoom);

        layerGroupMarruecos.clearLayers();

        clusters.forEach(feature => {
            const [lon, lat] = feature.geometry.coordinates;

            if (feature.properties.cluster) {
                const count = feature.properties.point_count;
                const icon = crearIconoClusterMarruecos(count);
                const marker = L.marker([lat, lon], { icon: icon });

                marker.on('click', () => {
                    const popupHtml = `<div style="line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><icon-despegue></icon-despegue><icon-despegue></icon-despegue><icon-despegue></icon-despegue><icon-despegue></icon-despegue>${t('mapa.grupoXContest', { count: count })}</div>
                        <div style="margin-bottom: 5px;">${t('mapa.coordenadasMedias')}<br><b>${lat.toFixed(4)}, ${lon.toFixed(4)}</b></div>
                        <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${lat.toFixed(4)}/${lon.toFixed(4)}/wind?${lat.toFixed(4)},${lon.toFixed(4)},14' target='_blank'>Windy</a></div>
                        <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${lat.toFixed(4)},${lon.toFixed(4)},13' target='_blank'>Meteo-parapente</a></div>
                        <div style="margin-bottom: 3px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${lat.toFixed(4)}N${lon.toFixed(4)}E' target='_blank'>Meteoblue</a></div>
                        <div style="margin-bottom: 5px;">⛅ <a href='https://meteo-fly.com/?lat=${escapeHtml(lat.toFixed(4))}&lon=${escapeHtml(lon.toFixed(4))}&day=1&model=meteofrance_seamless&maxAlt=4000&cellSelection=nearest&view=wind&hour=0&daylight=1' target='_blank'>Meteo-fly</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${lat.toFixed(4)},${lon.toFixed(4)}' target='_blank'>Google Maps</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${lat.toFixed(4)}/${lon.toFixed(4)}/OpenTopoMap&pois=${lon.toFixed(4)},${lat.toFixed(4)}' target='_blank'>Brouter</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${lat.toFixed(4)}/${lon.toFixed(4)}&l=Otm/Sa&n2=_gwm&r=${lat.toFixed(4)}/${lon.toFixed(4)}/${lat.toFixed(4)}, ${lon.toFixed(4)}' target='_blank'>Nakarte</a></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon.toFixed(4)}%20${lat.toFixed(4)}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                        </div>`;
                    L.popup({ className: 'popup-despegueindividual', maxWidth: 300, autoPanPaddingTopLeft: L.point(10, 280) }).setLatLng([lat, lon]).setContent(popupHtml).openOn(map);
                });
                layerGroupMarruecos.addLayer(marker);

            } else {
                const p = feature.properties;
                const marker = L.marker([lat, lon], { icon: iconoDespegueIndividualMarruecos, riseOnHover: true });

                marker.on('click', () => {
                    const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b><icon-despegue></icon-despegue><br>Despegue en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  
                        <div style="margin-bottom: 5px;">Fecha: <b>${escapeHtml(p.fecha)}</b></div>
                        <div style="margin-bottom: 5px;">Hora: <b>${escapeHtml(p.hora)}</b></div>
                        <div style="margin-bottom: 5px;">Distancia recorrida: <b>${escapeHtml(p.dist)} km</b></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='${escapeHtml(p.url)}' target='_blank'>Vuelo en XContest</a></div>
                        </div>`;
                    L.popup({ className: 'popup-despegueindividual', maxWidth: 300, autoPanPaddingTopLeft: L.point(10, 280) }).setLatLng([lat, lon]).setContent(popupHtml).openOn(map);
                });
                layerGroupMarruecos.addLayer(marker);
            }
        });
    }

    map.on('moveend', actualizarClusterMarruecos);

    function mostrarMensajeCargaMapaDeCalorMarruecos() {
        if (mensajeCargaMapaDeCalorMarruecos) mensajeCargaMapaDeCalorMarruecos.style.display = 'block';
    }

    function ocultarmensajeCargaMapaDeCalorMarruecos() {
        if (mensajeCargaMapaDeCalorMarruecos) {
            setTimeout(function() {mensajeCargaMapaDeCalorMarruecos.style.display = 'none'}, 1500);
        }
    }

    function cargarDatosMapaDeCalorMarruecos() {
        if (csvCargadoMapaDeCalorMarruecos) return;
        
        mostrarMensajeCargaMapaDeCalorMarruecos();

        superclusterMarruecos = new Supercluster({ radius: 80, maxZoom: 16 });

        Papa.parse('map/mapadecalormarruecos.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            encoding: 'utf8',
            complete: function(results) {
                results.data.forEach(row => {
                    const lat = parseFloat(row.Latitud);
                    const lon = parseFloat(row.Longitud);
                    
                    geoJsonMarruecos.push({
                        type: "Feature",
                        properties: { fecha: row.Fecha || '', hora: row.Hora || '', dist: row.DistanciaRecorrida || '', url: row.URLVuelo || '' },
                        geometry: { type: "Point", coordinates: [lon, lat] }
                    });
                    
                    heatpointsMapaDeCalorMarruecos.push([lat, lon, 1]);
                });
                
                superclusterMarruecos.load(geoJsonMarruecos);
                
                heatlayerMapaDeCalorMarruecos = L.heatLayer(heatpointsMapaDeCalorMarruecos, {
                    radius: 18, blur: 22, maxZoom: 19, minOpacity: 0.3,
                    gradient: { 0.2: 'yellow', 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' }
                });

                csvCargadoMapaDeCalorMarruecos = true;
                ocultarmensajeCargaMapaDeCalorMarruecos();
                
                const checkbox = document.getElementById('checkboxMapaDeCalorMarruecos');
                if (checkbox && checkbox.checked) {
                    if (!map.hasLayer(layerGroupMarruecos)) map.addLayer(layerGroupMarruecos);
                    if (!map.hasLayer(heatlayerMapaDeCalorMarruecos)) map.addLayer(heatlayerMapaDeCalorMarruecos);
                    actualizarClusterMarruecos();
                }
            },
            error: function(error) {
                console.error('Error cargando CSV Marruecos:', error);
                alert('Error al cargar el archivo CSV de Marruecos.');
                ocultarmensajeCargaMapaDeCalorMarruecos();
                const checkbox = document.getElementById('checkboxMapaDeCalorMarruecos');
                if (checkbox) checkbox.checked = false;
            }
        });
    }

    const checkboxMapaDeCalorMarruecos = document.getElementById('checkboxMapaDeCalorMarruecos');
    if (checkboxMapaDeCalorMarruecos) {
        checkboxMapaDeCalorMarruecos.addEventListener('change', function () {
            if (this.checked) {
                if (!csvCargadoMapaDeCalorMarruecos) {
                    cargarDatosMapaDeCalorMarruecos();
                } else {
                    if (!map.hasLayer(layerGroupMarruecos)) {
                        map.addLayer(layerGroupMarruecos);
                        actualizarClusterMarruecos(); 
                    }
                    if (heatlayerMapaDeCalorMarruecos && !map.hasLayer(heatlayerMapaDeCalorMarruecos)) {
                        map.addLayer(heatlayerMapaDeCalorMarruecos);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupMarruecos)) map.removeLayer(layerGroupMarruecos);
                if (heatlayerMapaDeCalorMarruecos && map.hasLayer(heatlayerMapaDeCalorMarruecos)) {
                    map.removeLayer(heatlayerMapaDeCalorMarruecos);
                }
            }
        });
    }

    // 🔴 INICIO CAPA NOTAS PERSONALES
    //___________________________________________________________________________________


    const clustergroupNotasPersonales = L.markerClusterGroup({
        chunkedLoading: true,      	// Divide la carga en bloques
        chunkDelay: 100,            // Tiempo entre bloques (ms)
        showCoverageOnHover: false, // false mejora rendimiento. Muestra el área que ocupan los puntos
        maxClusterRadius: 100,       // Con menos de este radio en px entre los puntos, se agrupan. Menor = menos agrupación, mayor = más agrupados
        spiderfyOnMaxZoom: true,    // Con zoom máximo se expanden todos. False mejora rendimiento
        zoomToBoundsOnClick: true, // Por defecto es true
        disableClusteringAtZoom: 13, //A zoom >=, los marcadores se muestran individualmente, aunque estén cerca
        
        //Redefinimos la función incorporada en el plugin Leaflet.markercluster llamada iconCreateFunction. Al crear un L.markerClusterGroup() el plugin la ejecuta automáticamente cada vez que genera un icono de clúster, pasándole como argumento el objeto cluster, que contiene todos los marcadores agrupados.
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            
            const clusterTitle = `Grupo de ${count} notas sobre despegues y aterrizajes`;
            
            return L.divIcon({
                html: `
                    <div title="${clusterTitle}" style="
                        position: relative;
                        background-color: white;
                        color: black;
                        border: 1.8px solid #007aff;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 3px 8px rgba(0, 0, 0, 1);
                    ">
                        ✏️
                    </div>`,
                className: 'custom-cluster',
                iconSize: L.point(30, 30),
                iconAnchor: L.point(15, 15)
            });
        }

    });

    const aterrizajesIcon = L.icon({
        iconUrl: 'map/aterrizajes.png',
        iconSize: [28, 28],
        iconAnchor: [16, 16]
    });
    const despeguesIcon = L.icon({
        iconUrl: 'map/despegues.png',
        iconSize: [28, 28],
        iconAnchor: [16, 16]
    });
    const despeguesainvestigarIcon = L.icon({
        iconUrl: 'map/despegues-a-investigar.png',
        iconSize: [28, 28],
        iconAnchor: [16, 16]
    });
    const customIcon = L.divIcon({ className: 'circle-icon', html: '●', iconSize:[16,16] }); //Icono estándar si no hay "tipo" (Despegues/Aterrizajes/..)

    const markersNotasPersonales = []; 

    Papa.parse('map/personal.csv', {

    download: true,
    header: true, // Usa la primera fila como nombres de columnas
    //dynamicTyping: true,       // Convierte automáticamente números y booleanos (de momento, comentado; era sugerencia IA)
    skipEmptyLines: true,
    delimiter: ';',
    encoding: 'utf8',

    complete: function(results) {
    results.data.forEach(row => { //El forEach ejecuta la función una vez por cada fila (row) del conjunto de datos results.data.
        
        const lat = parseFloat(row.Latitud);
        const lon = parseFloat(row.Longitud);
        const tipo = row.Tipo || ''; 
        const nombre = row.Nombre || '';
        const notas = row.Notas || '';
        
        if (isNaN(lat) || isNaN(lon)) return; // Filtra filas con coordenadas no válidas

        let icon;

        if (tipo === "Aterrizajes") {
        icon = aterrizajesIcon;
        } else if (tipo === "Despegues") {
        icon = despeguesIcon;
        } else if (tipo === "Despegues a investigar") {
        icon = despeguesainvestigarIcon;
        } else {
        icon = customIcon;
        }

        const marker = L.marker([lat, lon], { icon: icon, riseOnHover: true, title: 'Notas sobre despegues y aterrizajes' });

        const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
            <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>✏️ ${escapeHtml(nombre)}</b></div>
            <div style="margin-bottom: 5px;">Tipo: <b>${escapeHtml(tipo)}</b></div> 
            <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>

            <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/wind?${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},14' target='_blank'>Windy</a></div>

            <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}&l=Otm/Sa&n2=_gwm&r=${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/${escapeHtml(nombre)} (${escapeHtml(tipo)})' target='_blank'>Nakarte</a></div>
            
            <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon}%20${lat}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>

            <div style="margin-bottom: 5px;">Notas: <b>${escapeHtml(notas)}</b></div>  
            </div>`;

        marker.bindPopup(popupHtml, { 
            className: 'popup-notaspersonales', 
            maxWidth: 300,
            maxHeight: 450,
            autoPanPaddingTopLeft: L.point(10, 280) // 🚀 Reserva 280px arriba para no chocar con el menú flotante
        }); //por ahora no existe así que sale el popup estándar
        markersNotasPersonales.push(marker); //inserta marker al grupo markersNotasPersonales
        clustergroupNotasPersonales.addLayer(marker);
    });

    //map.addLayer(clustergroupNotasPersonales); //No la mostramos inicialmente
    },

    error: function(error) {
    console.error('Error cargando CSV:', error.message || error);
    alert('Error al cargar el archivo CSV Notas personales. Consulta la consola para más información.');
    }

    });


    // 🔴 INICIO CAPA DESPEGUES MUNDO
    //___________________________________________________________________________________


    clustergroupDespeguesMundo = L.markerClusterGroup({
        chunkedLoading: true,      	// Divide la carga en bloques
        chunkDelay: 100,            // Tiempo entre bloques (ms)
        showCoverageOnHover: false, // false mejora rendimiento. Muestra el área que ocupan los puntos
        maxClusterRadius: 40,       // Con menos de este radio en px entre los puntos, se agrupan. Menor = menos agrupación, mayor = más agrupados
        spiderfyOnMaxZoom: true,    // Con zoom máximo se expanden todos. False mejora rendimiento
        spiderfyOnEveryClick: true,
        zoomToBoundsOnClick: true, // Por defecto es true
        disableClusteringAtZoom: 11, //A zoom >= 12, los marcadores se muestran individualmente, aunque estén cerca
        
        //Redefinimos la función incorporada en el plugin Leaflet.markercluster llamada iconCreateFunction. Al crear un L.markerClusterGroup() el plugin la ejecuta automáticamente cada vez que genera un icono de clúster, pasándole como argumento el objeto cluster, que contiene todos los marcadores agrupados.
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            const clusterTitle = `Grupo de ${count} lugares de despegue`;
            return L.divIcon({
                html: `
                    <div title="${clusterTitle}" style="
                        position: relative;
                        background-color: white;
                        color: black;
                        border: 1.8px solid #007aff;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 3px 8px rgba(0, 0, 0, 1);
                    ">
                        ${count}
                    </div>`,
                className: 'custom-cluster',
                iconSize: L.point(30, 30),
                iconAnchor: L.point(15, 15)
            });
        }
    });	
    // escala de color por Actividad: 
    function actividadToColor(actividad) {
        if (!actividad) return '#FFFFFF'; // blanco por defecto si no hay valor

        if (actividad === 'verde') return 'green';
        if (actividad === 'naranja') return 'orange';
        if (actividad === 'amarillo') return 'yellow';
        if (actividad === 'blanco') return 'white';

        return '#FFFFFF'; // color blanco por defecto si no coincide
    }

    // crea icono compuesto (dot + etiqueta) usando L.divIcon
    function createIconDespeguesMundo(despegue, actividad, orientacionesMetadata) {
        // 1. 🧭 Generar el círculo de orientación (NUEVO)
        const orientacionHTML = createOrientationSVGMapa(orientacionesMetadata);

        // 2. Círculo de Actividad (Existente)
        const color = actividadToColor(actividad);
        const dot = `<span class="dot" style="background:${color}"></span>`;

        // 3. Combinar todo en la etiqueta
        const labelHTML = `<span class='label-large-despeguesmundo'>${orientacionHTML}${dot}${escapeHtml(despegue)}</span>`;

        return L.divIcon({
            html: labelHTML,
            className: 'custom-div-icon',
            iconAnchor: [0, 40] // ajusta según dimensiones reales
        });
    }

    // escape para html en popup/label. Esa función convierte caracteres especiales de HTML en sus entidades seguras, evitando que el texto insertado en el DOM se interprete como código HTML (previene inyección de HTML o XSS)
    function escapeHtml(str){
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Flag para controlar la carga única del CSV
    let csvCargadoDespeguesMundo = false; // Usamos un nombre específico para evitar conflictos.

    // Carga los datos del CSV y crea los marcadores. Se ejecuta solo la primera vez
    function cargarDatosDespeguesMundo() {
        if (csvCargadoDespeguesMundo) {
            return; // Detener si ya se cargó
        }

        Papa.parse('map/despeguesmundo.csv', {
        download: true,
        header: true, // Usa la primera fila como nombres de columnas
        //dynamicTyping: true,       // Convierte automáticamente números y booleanos (de momento, comentado; era sugerencia IA)
        skipEmptyLines: true,
        delimiter: ';',
        encoding: 'utf8',
        complete: function(results) {
        results.data.forEach(row => { //El forEach ejecuta la función una vez por cada fila (row) del conjunto de datos results.data.
            
            const lat = parseFloat(row.Latitud);
            const lon = parseFloat(row.Longitud);
            const region = row.Región || ''; //asigna el contenido de la columna “Nombre_clásico” si existe; si no existe, deja la variable como cadena vacía. || → operador lógico “o”: devuelve el primer valor existente y no vacío.
            const provincia = row.Provincia || '';
            const despegue = row.Despegue || '';
            const SVGorientaciones = createOrientationSVGMapa(row.Orientaciones);
            const orientacion = row.Orientación || '';
            const orientaciones = row.Orientaciones || '';
            const actividad = row.Actividad || '';
            const color = actividadToColor(row.Actividad);
            const dot = `<span class="dot" style="background:${color}"></span>`;
            const CIRCULOactividad = row.Actividad || '';
            const kmmax = row.Km_máx || '';
            const vuelos = row.Vuelos || '';
            const ultimovuelo = row.Último_vuelo || '';
            const info = row.Más_información || '';

            const icon = createIconDespeguesMundo(despegue, actividad, orientaciones);
            const marker = L.marker([lat, lon], { icon: icon, riseOnHover: true, title: 'Lugar de despegue' });
                    
            const popupHtml = `<div style="line-height: 1.2;">
            
                    <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px; max-width: 212px; display: inline-block;"><b><icon-despegue></icon-despegue>${escapeHtml(despegue)}</b></div>
                    <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">${t('mapa.labelOrientacion')} ${SVGorientaciones} <b>${escapeHtml(traducirCadenaOrientacion(orientacion))}</b></div>
                    <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/wind?${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},14' target='_blank'>Windy</a></div>
                    <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},13' target='_blank'>Meteo-parapente</a></div>
                    <div style="margin-bottom: 3px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${escapeHtml(lat.toFixed(4))}N${escapeHtml(lon.toFixed(4))}E' target='_blank'>Meteoblue</a></div>
                    <div style="margin-bottom: 5px;">⛅ <a href='https://meteo-fly.com/?lat=${escapeHtml(lat.toFixed(4))}&lon=${escapeHtml(lon.toFixed(4))}&day=1&model=meteofrance_seamless&maxAlt=4000&cellSelection=nearest&view=wind&hour=0&daylight=1' target='_blank'>Meteo-fly</a></div>
                    
                    <div class="popup-toggle-header" 
                        style="cursor: pointer; border-radius: 3px; font-weight: bold; padding-top: 3px; margin-bottom: 10px;">
                        ${t('mapa.masInformacion')}
                    </div>
                    
                    <div class="popup-collapsible-content" style="display: none; overflow-wrap: break-word; ">

                        <div style="margin-bottom: 5px;">${t('mapa.labelCoordenadas')} <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>
                        <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 5px;" title="${t('popupDespegue.nivelActividadTitle')}">${t('mapa.labelActividad')} ${dot}</div>
                        <div style="margin-bottom: 5px;">${t('mapa.labelVuelos')} <b>${escapeHtml(vuelos)}</b></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))}' target='_blank'>Google Maps</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/OpenTopoMap&pois=${escapeHtml(lon.toFixed(4))},${escapeHtml(lat.toFixed(4))}' target='_blank'>Brouter</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}&l=Otm/Sa&n2=_gwm&r=${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/${escapeHtml(despegue)} (${escapeHtml(orientacion)})' target='_blank'>Nakarte</a></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon}%20${lat}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                        <div style="margin-bottom: 5px;">${escapeHtml(info)}</div>
                        
                    </div>
                    
                    </div>`;		

            marker.bindPopup(popupHtml, { 
                className: 'popup-despeguesmundo', 
                maxWidth: 300,
                maxHeight: 450,
                autoPanPaddingTopLeft: L.point(10, 280) // 🚀 Reserva 280px arriba para no chocar con el menú flotante
            });
            marker.metadata = { despegue: despegue, orientacion: orientacion, orientaciones: orientaciones, actividad: actividad, kmax: kmmax, vuelos: vuelos, ultimovuelo: ultimovuelo }; 
            markersDespeguesMundo.push(marker); //inserta marker al grupo markersDespegues
            //clustergroupDespeguesMundo.addLayer(marker);
        });

        //map.addLayer(clustergroupDespeguesMundo); No la mostramos inicialmente
        
            // Marcar como cargado exitosamente
            csvCargadoDespeguesMundo = true;
            
            actualizarFiltrosMapa();
            
            // LLAMADA ADICIONAL: Ya que el usuario marcó el checkbox antes de que se completara la carga,
            // debemos añadirlas al mapa una vez que estén listas.
            const checkbox = document.getElementById('checkboxDespeguesMundo');
            if (checkbox && checkbox.checked) {
                if (!map.hasLayer(clustergroupDespeguesMundo)) {
                    map.addLayer(clustergroupDespeguesMundo);
                }
            }
        
        },

        error: function(error) {
        console.error('Error cargando CSV:', error.message || error);
        alert('Error al cargar el archivo CSV de Despegues Mundo. Consulta la consola para más información.');
        }

        });
        
    }	

    //___________________________________________________________________________________

    // 🔴 PANEL CAPAS Y FILTROS
    //___________________________________________________________________________________


    let isFijado = false; 
    let buttonFijar, buttonCerrar, iconoFijar, infoPanel, divOpciones, labelMostrarOpciones;

    let isFijado3 = false; 
    let buttonFijar3, buttonCerrar3, iconoFijar3, infoPanel3, divOpciones3, labelMostrarOpciones3;

    let isFijado2 = false; 
    let buttonFijar2, buttonCerrar2, iconoFijar2, infoPanel2, divOpciones2, labelMostrarOpciones2;

    //  1. Inicialización de variables locales PANEL 1 (Despegues)
    infoPanel = document.getElementById('infoPanel');
    buttonFijar = document.getElementById('buttonFijar');
    buttonCerrar = document.getElementById('buttonCerrar');
    iconoFijar = document.getElementById('iconoFijar');
    divOpciones = document.getElementById('divOpciones');
    labelMostrarOpciones = document.getElementById('labelMostrarOpciones'); 

    //  1.1 Inicialización de variables locales PANEL 3 (Balizas)
    infoPanel3 = document.getElementById('infoPanel3');
    buttonFijar3 = document.getElementById('buttonFijar3');
    buttonCerrar3 = document.getElementById('buttonCerrar3');
    iconoFijar3 = document.getElementById('iconoFijar3');
    divOpciones3 = document.getElementById('divOpciones3');
    labelMostrarOpciones3 = document.getElementById('labelMostrarOpciones3'); 
    
    //  1.2 Inicialización de variables locales PANEL 2 (Filtros)
    infoPanel2 = document.getElementById('infoPanel2');
    buttonFijar2 = document.getElementById('buttonFijar2');
    buttonCerrar2 = document.getElementById('buttonCerrar2');
    iconoFijar2 = document.getElementById('iconoFijar2');
    divOpciones2 = document.getElementById('divOpciones2');
    labelMostrarOpciones2 = document.getElementById('labelMostrarOpciones2'); 
    
    //  2. Lógica de Inicialización y Listeners DOM/LEAFLET (Panel 1)
    if (infoPanel && labelMostrarOpciones && buttonFijar && buttonCerrar && divOpciones) {
        infoPanel.style.display = 'block'; 
        retraerOpciones();
        
        L.DomEvent.on(buttonFijar, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            isFijado = !isFijado;
            
            if (isFijado) {
                buttonFijar.classList.add('activo-fijado');
                iconoFijar.textContent = '📍';
                expandirOpciones();
            } else {
                buttonFijar.classList.remove('activo-fijado');
                iconoFijar.textContent = '📌';
                retraerOpciones(); 
            }
        }); 
        
        L.DomEvent.on(buttonCerrar, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            if (isFijado) {
                isFijado = false;
                buttonFijar.classList.remove('activo-fijado');
                iconoFijar.textContent = '📌';
            }
            retraerOpciones();
        }); 
    }

    //  2.1 Lógica de Inicialización y Listeners DOM/LEAFLET (Panel 3)
    if (infoPanel3 && labelMostrarOpciones3 && buttonFijar3 && buttonCerrar3 && divOpciones3) {
        infoPanel3.style.display = 'block'; 
        retraerOpciones3();
        
        L.DomEvent.on(buttonFijar3, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            isFijado3 = !isFijado3;
            
            if (isFijado3) {
                buttonFijar3.classList.add('activo-fijado');
                iconoFijar3.textContent = '📍';
                expandirOpciones3();
            } else {
                buttonFijar3.classList.remove('activo-fijado');
                iconoFijar3.textContent = '📌';
                retraerOpciones3(); 
            }
        }); 
        
        L.DomEvent.on(buttonCerrar3, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            if (isFijado3) {
                isFijado3 = false;
                buttonFijar3.classList.remove('activo-fijado');
                iconoFijar3.textContent = '📌';
            }
            retraerOpciones3();
        }); 
    }

    //  2.2 Lógica de Inicialización y Listeners DOM/LEAFLET (Panel 2)
    if (infoPanel2 && labelMostrarOpciones2 && buttonFijar2 && buttonCerrar2 && divOpciones2) {
        infoPanel2.style.display = 'block'; 
        retraerOpciones2();
        
        L.DomEvent.on(buttonFijar2, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            isFijado2 = !isFijado2;
            
            if (isFijado2) {
                buttonFijar2.classList.add('activo-fijado');
                iconoFijar2.textContent = '📍';
                expandirOpciones2();
            } else {
                buttonFijar2.classList.remove('activo-fijado');
                iconoFijar2.textContent = '📌';
                retraerOpciones2(); 
            }
        }); 
        
        L.DomEvent.on(buttonCerrar2, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            if (isFijado2) {
                isFijado2 = false;
                buttonFijar2.classList.remove('activo-fijado');
                iconoFijar2.textContent = '📌';
            }
            retraerOpciones2();
        }); 
    }

    // --- LISTENERS GENERALES DEL MAPA ---
    map.on('click', function() {
        retraerOpciones();
        retraerOpciones3();
        retraerOpciones2();
    });
    
    map.on('moveend', function() {
        const input = document.querySelector('.leaflet-text-search-input');
        const autocompleteList = document.querySelector('.autocomplete-list');
        if (input) input.value = '';
        if (autocompleteList) autocompleteList.style.display = 'none';		
        
        retraerOpciones();
        retraerOpciones3();
        retraerOpciones2();
    });

    // --- FUNCIONES EXPANSIÓN/RETRACCIÓN PANEL 1 ---
    function expandirAlClicar(event) {
        if (infoPanel.classList.contains('retraido') && !isFijado) {
            L.DomEvent.stopPropagation(event);
            expandirOpciones();
        }
    }
    function retraerOpciones() {
        if (isFijado || !infoPanel) return;
        divOpciones.classList.add('oculto');
        infoPanel.classList.add('retraido');
        L.DomEvent.on(infoPanel, 'click', expandirAlClicar);
    }
    function expandirOpciones() {
        if (!infoPanel) return;
        divOpciones.classList.remove('oculto');
        infoPanel.classList.remove('retraido');
        L.DomEvent.off(infoPanel, 'click', expandirAlClicar);	
    }

    // --- FUNCIONES EXPANSIÓN/RETRACCIÓN PANEL 3 ---
    function expandirAlClicar3(event) {
        if (infoPanel3.classList.contains('retraido') && !isFijado3) {
            L.DomEvent.stopPropagation(event);
            expandirOpciones3();
        }
    }
    function retraerOpciones3() {
        if (isFijado3 || !infoPanel3) return;
        divOpciones3.classList.add('oculto');
        infoPanel3.classList.add('retraido');
        L.DomEvent.on(infoPanel3, 'click', expandirAlClicar3);
    }
    function expandirOpciones3() {
        if (!infoPanel3) return;
        divOpciones3.classList.remove('oculto');
        infoPanel3.classList.remove('retraido');
        L.DomEvent.off(infoPanel3, 'click', expandirAlClicar3);	
    }

    // --- FUNCIONES EXPANSIÓN/RETRACCIÓN PANEL 2 ---
    function expandirAlClicar2(event) {
        if (infoPanel2.classList.contains('retraido') && !isFijado2) {
            L.DomEvent.stopPropagation(event);
            expandirOpciones2();
        }
    }
    function retraerOpciones2() {
        if (isFijado2 || !infoPanel2) return;
        divOpciones2.classList.add('oculto');
        infoPanel2.classList.add('retraido');
        L.DomEvent.on(infoPanel2, 'click', expandirAlClicar2);
    }
    function expandirOpciones2() {
        if (!infoPanel2) return;
        divOpciones2.classList.remove('oculto');
        infoPanel2.classList.remove('retraido');
        L.DomEvent.off(infoPanel2, 'click', expandirAlClicar2);	
    }

    // --- SINCRONIZACIÓN INICIAL DEL PANEL INTERNO DEL MAPA ---
    const recordarFiltrosMapa = localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true';

    const sliderVuelosFiltro = document.getElementById('sliderVuelos');
    const textoVuelosFiltro = document.getElementById('valorVuelosTexto');
    const sliderUltimoVueloFiltro = document.getElementById('sliderUltimoVuelo');
    const textoUltimoVueloFiltro = document.getElementById('valorUltimoVueloTexto');

    const indiceVuelos = recordarFiltrosMapa ? (localStorage.getItem('METEO_MAPA_MINIMOVUELOS') || '0') : '0';
    if (sliderVuelosFiltro && textoVuelosFiltro) {
        sliderVuelosFiltro.value = indiceVuelos;
        textoVuelosFiltro.innerText = ESCALA_VUELOS[parseInt(indiceVuelos, 10)] || 0;
    }

    const indiceUltimoVuelo = recordarFiltrosMapa ? (localStorage.getItem('METEO_MINIMO_ANO_ULTIMO_VUELO') || '0') : '0';
    if (sliderUltimoVueloFiltro && textoUltimoVueloFiltro) {
        sliderUltimoVueloFiltro.value = indiceUltimoVuelo;
        let val = ESCALA_ULTIMO_VUELO[parseInt(indiceUltimoVuelo, 10)] || ESCALA_ULTIMO_VUELO[0];
        textoUltimoVueloFiltro.innerText = val === 'Todos' ? t('mapa.todos') : val;
    }

    // Ejecutamos el motor de filtros y la interfaz para aplicar los datos recién leídos
    if (typeof window.actualizarFiltrosMapa === 'function') window.actualizarFiltrosMapa();
    
    // Exponemos la función de estado visual y la ejecutamos
    window.actualizarEstadoVisualFiltros = actualizarEstadoVisualFiltros;
    actualizarEstadoVisualFiltros();
    
    // 🔴 CAPAS:
    //___________________________________________________________________________________

    
    //Checkbox para ocultar/mostrar Despegues
    document.getElementById('checkboxDespegues').addEventListener('change', function () {
        localStorage.setItem('METEO_MAPA_CAPA_DESPEGUES_VISIBLE', this.checked);
        if (this.checked) {
            map.addLayer(clustergroupDespegues);
        } else {
            map.removeLayer(clustergroupDespegues);
        }	
        //retraerOpciones()
        actualizarFiltrosMapa()
    });

    //Checkbox para ocultar/mostrar Notas personales
    document.getElementById('checkboxNotasPersonales').addEventListener('change', function () {
        if (this.checked) {
            map.addLayer(clustergroupNotasPersonales);
        } else {
            map.removeLayer(clustergroupNotasPersonales);
        }
        //retraerOpciones()
    });

    //Checkbox para ocultar/mostrar Mapa Despegues Mundo
    const checkboxDespeguesMundo = document.getElementById('checkboxDespeguesMundo');

    if (checkboxDespeguesMundo) {
        checkboxDespeguesMundo.addEventListener('change', function () {
            
            if (this.checked) {
                // 1. Si no están cargados, cargamos y luego filtramos
                if (!csvCargadoDespeguesMundo) {
                    cargarDatosDespeguesMundo(); 
                    // NOTA: Asegúrate de que cargarDatosDespeguesMundo() llame a 
                    // la función de filtrar al terminar el parseo (en el 'complete' de PapaParse).
                } 
                // 2. Si ya están cargados, simplemente relanzamos el filtro
                else {
                    actualizarFiltrosMapa(); 
                }
            } else {
                actualizarFiltrosMapa();
            }
        });
    } 

    // 🔴 FILTRO ORIENTACIONES Y Nº DE VUELOS:
    //___________________________________________________________________________________

    function obtenerMinAnioUltimoVuelo() {
        const slider = document.getElementById('sliderUltimoVuelo');
        if (!slider) return { minAnio: null, esTodos: true };

        const indice = parseInt(slider.value, 10);
        const valor = ESCALA_ULTIMO_VUELO[indice];

        if (valor === 'Todos') {
            document.getElementById('valorUltimoVueloTexto').textContent = t('mapa.todos'); // Usa la traducción
            return { minAnio: null, esTodos: true };
        }

        document.getElementById('valorUltimoVueloTexto').textContent = valor;
        return { minAnio: valor, esTodos: false };
    }

    function actualizarEstadoMaestro() { 
        // 1. Encontrar todos los checkboxes de orientación (los 8)
        const orientaciones = document.querySelectorAll('.filtro-orientacion-checkbox:not(#filtroMaestroOrientacion)');
        
        // 2. Encontrar el checkbox maestro y su elemento contenedor (<label>)
        const maestroCheckbox = document.getElementById('filtroMaestroOrientacion');
        // Usamos .parentNode para encontrar la etiqueta <label> que queremos mostrar/ocultar
        const maestroContenedor = maestroCheckbox.parentNode; 
        
        // 3. Comprobar si al menos uno está marcado
        const algunoActivo = Array.from(orientaciones).some(checkbox => checkbox.checked);

        // 4. Actualizar la visibilidad y el estado del checkbox maestro
        if (algunoActivo) {
            // Mostrar el botón maestro si hay filtros activos
            maestroContenedor.style.visibility = 'visible'; 
            // Marcar el checkbox (modo indicador)
            maestroCheckbox.checked = true;
        } else {
            // Ocultar el botón maestro si no hay filtros activos
            maestroContenedor.style.visibility = 'hidden'; 
            // Desmarcar el checkbox (aunque no se vea)
            maestroCheckbox.checked = false;
        }
    }

    function limpiarFiltrosOrientacion() {
        const maestroCheckbox = document.getElementById('filtroMaestroOrientacion');
        
        // Si el filtro maestro se acaba de marcar (es decir, el usuario hizo clic cuando estaba inactivo),
        // no hacemos nada, solo actualizamos el mapa. 
        // Si estaba inactivo, se marcará automáticamente con actualizarEstadoMaestro()
        
        // Solo actuamos si el usuario lo desmarca (limpia) o si ya estaba marcado y el usuario quiere limpiar.
        if (maestroCheckbox.checked === false) { 
            // 1. Encontrar todos los checkboxes de orientación (los 8)
            const orientaciones = document.querySelectorAll('.filtro-orientacion-checkbox:not(#filtroMaestroOrientacion)');
            
            // 2. Desmarcar todos los filtros
            orientaciones.forEach(checkbox => {
                checkbox.checked = false;
            });

            actualizarEstadoMaestro();
            actualizarFiltrosMapa();
            actualizarEstadoVisualFiltros();
        }
    }

    function adjuntarListenersFiltros() {
        // 1. Escucha los 8 botones de orientación (Volvemos al original, sin guardar en LS)
        const botonesOrientacion = document.querySelectorAll('.filtro-orientacion-checkbox:not(#filtroMaestroOrientacion)');
        botonesOrientacion.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                ejecutarOperacionPesada(() => {
                    actualizarEstadoMaestro(); 
                    actualizarFiltrosMapa();
                    actualizarEstadoVisualFiltros();			
                });			
            });
        });

        // 2. Escucha el botón central (Volvemos al original, sin guardar en LS)
        const maestroBtn = document.getElementById('filtroMaestroOrientacion');
        if(maestroBtn) { 
            maestroBtn.addEventListener('change', function() {
                limpiarFiltrosOrientacion(); 
            });
        }

        // 3. NUEVO: Escucha el Slider de Vuelos
        const sliderVuelos = document.getElementById('sliderVuelos');
        if(sliderVuelos) {
            // Usamos 'input' para que filtre en tiempo real mientras arrastras
            // Si va muy lento el mapa, cámbialo por 'change' (filtra al soltar el ratón)
            sliderVuelos.addEventListener('input', function() {
                // Guardamos la posición del slider de vuelos si recordar filtros está activo
                if (localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true') {
                    localStorage.setItem('METEO_MAPA_MINIMOVUELOS', this.value);
                }
                ejecutarOperacionPesada(() => {
                    actualizarFiltrosMapa();
                    actualizarEstadoVisualFiltros();
                });
            });
        }
        
        // 4. NUEVO: Escucha el Slider de Último Vuelo
        const sliderUltimoVuelo = document.getElementById('sliderUltimoVuelo');
        if(sliderUltimoVuelo) {
            sliderUltimoVuelo.addEventListener('input', function() {
                // Guardamos la posición del slider de último vuelo si recordar filtros está activo
                if (localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true') {
                    localStorage.setItem('METEO_MINIMO_ANO_ULTIMO_VUELO', this.value);
                }
                // Se actualiza el texto y se llama al filtro principal
                obtenerMinAnioUltimoVuelo(); 
                actualizarFiltrosMapa();
                actualizarEstadoVisualFiltros();
            });
        }	
        
        // 5. NUEVO: Escucha el Slider de sliderKmMedia
        const sliderKmMedia = document.getElementById('sliderKmMedia');
        if(sliderKmMedia) {
            // Usamos 'input' para que filtre en tiempo real mientras arrastras
            // Si va muy lento el mapa, cámbialo por 'change' (filtra al soltar el ratón)
            sliderKmMedia.addEventListener('input', function() {
                actualizarFiltrosMapa();
                actualizarEstadoVisualFiltros();
            });
        }
    }

    adjuntarListenersFiltros();
    actualizarEstadoVisualFiltros();

    // INICIALIZAR LOS BOTONES FILTRO MAPA: FAVORITOS, SEGUIMIENTO, ACTIVIDAD
    actualizarBotonFavoritosMapa();
    actualizarBotonSeguimientoMapa();

    // INICIALIZAR EL SLIDER DE ACTIVIDAD DEL MAPA
    const sliderAct = document.getElementById('sliderActividad');
    const txtAct = document.getElementById('valorActividadTexto');
    
    // Función auxiliar para que el texto y las barras se alineen perfectamente
    function renderizarTextoActividad(nivel) {
        return `<span style="display:inline-flex; align-items:center; gap:5px; vertical-align:middle; margin-left: 6px; margin-top: -3px;">
                    ${crearIconoActividad(nivel)}
                    <span>${nivel}/5</span>
                </span>`;
    }

    if (sliderAct && txtAct) {
        sliderAct.value = filtroActividadMapa;
        txtAct.innerHTML = renderizarTextoActividad(filtroActividadMapa);
        
        sliderAct.addEventListener('input', function() {
            filtroActividadMapa = parseInt(this.value, 10);

            // Si la opción de recordar filtros está activa, guardamos el nivel seleccionado (1 a 5)
            if (localStorage.getItem('METEO_RECORDAR_FILTROS_MAPA') === 'true') {
                localStorage.setItem('METEO_MAPA_FILTRO_ACT', filtroActividadMapa);
            }

            // Inyectamos el HTML de las barras + el texto
            txtAct.innerHTML = renderizarTextoActividad(filtroActividadMapa);
            
            actualizarFiltrosMapa();
            actualizarEstadoVisualFiltros();
        });
    }

    function obtenerOrientacionesSeleccionadas() {
        // 1. Encontrar todos los checkboxes de orientación (los 8)
        const checkboxes = document.querySelectorAll('.filtro-orientacion-checkbox:not(#filtroMaestroOrientacion)');
        const orientacionesActivas = [];

        // 2. Iterar sobre ellos y recoger los valores de los marcados
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                // Recogemos el valor (N, S, NE, etc.)
                orientacionesActivas.push(checkbox.value); 
            }
        });

        return orientacionesActivas; // Retorna un array, e.g., ['N', 'NE']
    }

    /**
     * Crea un icono SVG de rosa de los vientos con 16 segmentos visuales.
     * Cada segmento ocupa 45 grados y está centrado en su ángulo de orientación.
     * @param {string} orientacionesStr - El string de metadata (ej: "_N_NNE_S").
     */
    function createOrientationSVGMapa(orientacionesStr) {
        // 1. Definir los 16 segmentos en orden
        const ALL_SEGMENTS = [
            'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
            'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'
        ];
        
        // 2. Colores y dimensiones
        const size = 20;
        const radius = 7.5; // Radio (7.5 + 0.5 de borde = 8)
        const strokeWidth = 1; // Borde de 1px
        const colorBorde = "#666"; // Color del contorno
        const colorFondoInactivo = "white"; // Fondo general blanco
        const colorSegmentoActivo = "black"; // Quesitos activos negros

        // 3. Parsear metadata
        // Convierte "_N_NNE_S" en un Set: {'N', 'NNE', 'S'}
        const activeOrientations = new Set(
            (orientacionesStr || '').split('_').filter(o => o)
        );

        // 4. Iniciar el SVG (16x16, viewBox centrado)
        let svg = `<svg width="${size}" height="${size}" viewBox="-8 -8 16 16" style="vertical-align: middle; margin-right: 4px; transform: rotate(-90deg);">`;
        
        // 5. Añadir el círculo de fondo blanco con contorno
        svg += `<circle cx="0" cy="0" r="${radius}" fill="${colorFondoInactivo}" stroke="${colorBorde}" stroke-width="${strokeWidth}" />`;

        // 6. Generar los 16 segmentos (polígonos de 45°)
        
        // El ángulo de separación entre los ejes de las 16 orientaciones es de 22.5°
        const AXIS_ANGLE = 360 / ALL_SEGMENTS.length; // 22.5°
        
        // El tamaño del quesito que quieres es 45°
        const SEGMENT_WIDTH = 45; 
        
        // El offset para centrar el quesito (45/2 = 22.5°)
        const HALF_SEGMENT = SEGMENT_WIDTH / 2; // 22.5°

        const toRadians = (angle) => angle * Math.PI / 180;

        ALL_SEGMENTS.forEach((segmentName, index) => {
            
            if (activeOrientations.has(segmentName)) {
                // Ángulo central de la orientación (0, 22.5, 45, 67.5, ...)
                const centerAngle = index * AXIS_ANGLE;
                
                // Ángulo de inicio y fin (45° centrados en el eje)
                const startAngle = centerAngle - HALF_SEGMENT; // N (índice 0) va de -22.5° a 22.5°
                const endAngle = centerAngle + HALF_SEGMENT;
                
                // Calcular puntos del polígono
                const x1 = radius * Math.cos(toRadians(startAngle));
                const y1 = radius * Math.sin(toRadians(startAngle));
                const x2 = radius * Math.cos(toRadians(endAngle));
                const y2 = radius * Math.sin(toRadians(endAngle));
                
                // Dibuja el quesito (Centro, Punto1, Punto2)
                svg += `<polygon points="0,0 ${x1},${y1} ${x2},${y2}" fill="${colorSegmentoActivo}" />`;
            }
        });

        svg += `</svg>`;
        return svg;
    }

    // ==========================================================================
    // 🔴 BALIZAS (GESTIÓN MULTI-RED)
    // ==========================================================================

    // 🟡 1. OBJETO GESTOR CENTRAL (Configuración y Estado de cada red)
    //___________________________________________________________________________________

    // CONFIGURACIÓN DE LOS CLÚSTERES DE BALIZAS
    const opcionesClusterBalizas = {
    maxClusterRadius: 15, // Si dos marcadores están separados menos de X px (aprox.), se agrupan.
    disableClusteringAtZoom: 10, // A partir del zoom X, incluido, se separan siempre
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
        //const count = cluster.getChildCount(); // en el html iba el ${count} pero está quitado para no confundir con cifras de viento
        return L.divIcon({
            html: `<div style="background-color: #0078d46b; color: white; border-radius: 50%; width: 10px; height: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); text-shadow: 1px 1px 2px rgba(0,0,0,0.5); box-sizing: border-box;">
                    
                </div>`,
            className: 'cluster-balizas-personalizado',
            iconSize: L.point(10, 10),
            iconAnchor: L.point(5, 5) 
        });
    }
};

    const REDES_BALIZAS = {
        'euskalmet': {
            id: 'euskalmet',
            nombre: 'Euskalmet',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_euskalmet_cache.json',
            url6h: 'https://flydecision.com/balizas_euskalmet_6h.json',
            checkboxId: 'checkboxBalizasEuskalmet',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_EUSKALMET_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 30,
            umbralRojoMin: 45,
            urlWeb: (id) => 'https://www.euskalmet.euskadi.eus/observacion/datos-de-estaciones/#',
        },
        'meteonavarra': {
            id: 'meteonavarra',
            nombre: 'MeteoNavarra',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_meteonavarra_cache.json',
            url6h: 'https://flydecision.com/balizas_meteonavarra_6h.json',
            checkboxId: 'checkboxBalizasMeteonavarra',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_METEONAVARRA_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 90,
            umbralRojoMin: 120,
            urlWeb: (id) => {
                // 1. Limpiar el ID (quitamos todo lo que no sea un número, ej: "GN23" -> "23")
                const idLimpio = id.replace(/\D/g, '');
                
                // 2. Calcular fecha de hoy y de mañana
                const hoy = new Date();
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1); // Sumamos 1 día

                // Función auxiliar para formatear a DD/MM/YYYY
                const formateaFecha = (d) => {
                    const dia = String(d.getDate()).padStart(2, '0');
                    const mes = String(d.getMonth() + 1).padStart(2, '0');
                    const anio = d.getFullYear();
                    return `${dia}/${mes}/${anio}`;
                };

                const fechaDesde = formateaFecha(hoy);
                const fechaHasta = formateaFecha(manana);

                // 3. Montar y devolver la URL completa
                return `https://meteo.navarra.es/estaciones/estacion_datos_m.cfm?idestacion=${idLimpio}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&p_10=1&p_10=2&p_10=3&p_10=4&p_10=11&p_10=6&p_10=7`;
            },
        },
        'meteocat': {
            id: 'meteocat',
            nombre: 'MeteoCat',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_meteocat_cache.json',
            url6h: 'https://flydecision.com/balizas_meteocat_6h.json',
            checkboxId: 'checkboxBalizasMeteocat',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_METEOCAT_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 90,
            umbralRojoMin: 120,
            urlWeb: (id) => `https://www.meteo.cat/observacions/xema/dades?codi=${id}`
        },
        'meteogalicia': {
            id: 'meteogalicia',
            nombre: 'MeteoGalicia',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_meteogalicia_cache.json',
            url6h: 'https://flydecision.com/balizas_meteogalicia_6h.json',
            checkboxId: 'checkboxBalizasMeteogalicia',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_METEOGALICIA_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 30,
            umbralRojoMin: 45,
            urlWeb: (id) => `https://www.meteogalicia.gal/web/observacion/rede-meteoroloxica?idEstacion=${id}`
        },
        'aemet': {
            id: 'aemet',
            nombre: 'AEMET',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_aemet_cache.json',
            url6h: 'https://flydecision.com/balizas_aemet_6h.json',
            checkboxId: 'checkboxBalizasAemet',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_AEMET_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 90,
            umbralRojoMin: 120,
            urlWeb: (id) => `https://www.aemet.es/es/eltiempo/observacion/ultimosdatos?k=arn&l=${id}&w=0&datos=img&x=h24&f=vel_viento`
        },
        'meteoclimatic': {
            id: 'meteoclimatic',
            nombre: 'Meteoclimatic',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_meteoclimatic_cache.json',
            url6h: 'https://flydecision.com/balizas_meteoclimatic_6h.json',
            checkboxId: 'checkboxBalizasMeteoclimatic',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_METEOCLIMATIC_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 40,
            umbralRojoMin: 60,
            urlWeb: (id) => `https://www.meteoclimatic.net/perfil/${id}`
        },
        'holfuy': {
            id: 'holfuy',
            nombre: 'Holfuy',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_holfuy_cache.json',
            url6h: 'https://flydecision.com/balizas_holfuy_6h.json',
            checkboxId: 'checkboxBalizasHolfuy',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_HOLFUY_VISIBLE',
            // --- Variables de estado de esta red ---
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 30,
            umbralRojoMin: 45,
            urlWeb: (id) => {
                // Si el ID empieza por 's' o 'S', se la quitamos para la URL
                const idLimpio = id.toLowerCase().startsWith('s') ? id.substring(1) : id;
                return `https://holfuy.com/en/weather/${idLimpio}`;
            },
        },
        'meteofrance': {
            id: 'meteofrance',
            nombre: 'Météo-France',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_meteofrance_cache.json',
            url6h:    'https://flydecision.com/balizas_meteofrance_6h.json',
            checkboxId: 'checkboxBalizasMeteofrance',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_METEOFRANCE_VISIBLE',
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 30,
            umbralRojoMin: 45
        },
        'pioupiou': {
            id: 'pioupiou',
            nombre: 'OpenWindMap',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_pioupiou_cache.json',
            url6h:    'https://flydecision.com/balizas_pioupiou_6h.json',
            checkboxId: 'checkboxBalizasPioupiou',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_PIOUPIOU_VISIBLE',
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 30,
            umbralRojoMin: 45,
            urlWeb: (id) => `https://www.openwindmap.org/windbird-${id}`
        },
        'ffvl': {
            id: 'ffvl',
            nombre: 'FFVL',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_ffvl_cache.json',
            url6h:    'https://flydecision.com/balizas_ffvl_6h.json',
            checkboxId: 'checkboxBalizasFFVL',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_FFVL_VISIBLE',
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 30,
            umbralRojoMin: 45,
            urlWeb: (id) => `https://www.balisemeteo.com/balise.php?idBalise=${id}`
        },
        'metar': {
            id: 'metar',
            nombre: 'Metar',
            estaciones: [],
            urlCache: 'https://flydecision.com/balizas_metar_cache.json',
            url6h:    'https://flydecision.com/balizas_metar_6h.json',
            checkboxId: 'checkboxBalizasMetar',
            lsKey: 'METEO_MAPA_CAPA_BALIZAS_METAR_VISIBLE',
            layerGroup: L.markerClusterGroup(opcionesClusterBalizas),
            marcadores: {},
            dibujadas: false,
            datosCache: {},
            ultimoJsonRaw: null,
            datos6h: null,
            fetched6hAt: 0,
            intervalo: null,
            umbralAmarilloMin: 90,
            umbralRojoMin: 120,
            urlWeb: (id) => `https://metar-taf.com/?c=439933.86792.5&hl=${id}`
        }
    };    
    
    // 🟡 2. DIBUJAR LAS ESTACIONES ESTÁTICAS DE UNA RED
    //___________________________________________________________________________________

    async function dibujarEstacionesBalizas(redId) {
        const red = REDES_BALIZAS[redId];
        if (red.dibujadas) return;

        // --- Carga Perezosa (Lazy Load) ---
        // Si el array de estaciones está vacío, significa que el usuario acaba de activar
        // esta capa por primera vez. Así que descargamos su archivo .json correspondiente.
        if (red.estaciones.length === 0) {
            try {
                // Descargamos el JSON dinámicamente usando el id de la red (ej: balizas_aemet_arraybalizas.json)
                const resp = await fetch(`https://flydecision.com/balizas_${red.id}_arraybalizas.json?_=${Date.now()}`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                red.estaciones = await resp.json();
            } catch (err) {
                console.error(`No se pudo cargar el array de balizas de ${red.nombre}:`, err);
                return; // Si falla el archivo, salimos de esta función sin dibujar, ¡pero no se rompe la app!
            }
        }

        red.estaciones.forEach(estacion => {
            const svgFlechaGris = `
                <svg viewBox="0 0 30 36" style="width: 22px; height: 26px; display: block;">
                    <polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="#95a5a6"/>
                </svg>`;

            // Cuadrado virtual de 80x50 px (más ancho para los 16px de texto)
            const htmlCargando = `
                <div style="width: 80px; height: 50px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <div style="height: 28px; display: flex; align-items: center; justify-content: center; width: 100%;">
                        ${svgFlechaGris}
                    </div>
                    <div style="height: 22px; display: flex; align-items: center; justify-content: center; width: 100%; white-space: nowrap;">
                        <span style="font-weight: bold; font-size: 16px; color: #95a5a6;">...</span>
                    </div>
                </div>`;

            // Cambio de tamaños: 3º Coges el width total y el height total de la caja htmlBaliza, los divides entre 2, y los pones en el iconAnchor: [ancho/2, alto/2]. ¡Pura matemática para que no baile nada!
            const iconoBaliza = L.divIcon({
                html: htmlCargando,
                className: 'custom-div-icon',
                iconAnchor: [40, 23], // Centro matemático exacto de 80x50 (style en htmlBaliza)
                popupAnchor: [0, 25] // propiedad matemática nativa Leaflet diseñada exactamente para desplazar popup
            });

            const marker = L.marker([estacion.latitude, estacion.longitude], { icon: iconoBaliza });
            
            // CRUCIAL: Guardamos en el marcador a qué red pertenece para cuando se haga click
            marker.redId = red.id;
            marker.stationId = estacion.id;
            marker.stationName = estacion.name;

            // Añadimos red.id al ID del div del popup para evitar choques si 2 redes usan el mismo ID de estación
            const panelFiltro = document.getElementById('div-filtro-horario');
            const filtroFlotando = !!(panelFiltro && panelFiltro.classList.contains('flotando-en-mapa'));

            marker.bindPopup(`
                <div id="pop-${red.id}-${estacion.id}" style="min-width: 140px; line-height: 1.3;">
                    <h4 style="margin: 0 0 5px 0; color: #0078d4;"><icon-baliza></icon-baliza>${estacion.name} (${red.nombre})</h4>
                    <br><br><p style="margin:0; color:#666;">⏳...</p><br><br>
                </div>
            `, {
                className: 'popup-despegueindividual popup-baliza',
                maxWidth: 300,
                maxHeight: 450,
                autoPanPaddingTopLeft: L.point(75, 270), // valor de respaldo; se recalcula en cada apertura, ver map.on('popupopen', ...)
                autoPanPaddingBottomRight: L.point(55, 110)
            });

            red.marcadores[estacion.id] = marker;
            red.layerGroup.addLayer(marker);
        });

        red.dibujadas = true;
    }

    // 🟡 3. CARGAR EL JSON CONSOLIDADO EN VIVO PARA UNA RED
    //___________________________________________________________________________________

    async function cargarDatosBalizas(redId) {
        const red = REDES_BALIZAS[redId];
        try {
            const res = await fetch(`${red.urlCache}?_=${Date.now()}`);
            const textoCrudo = await res.text();

            // Si el contenido es idéntico, retornamos FALSE (nada nuevo)
            if (textoCrudo === red.ultimoJsonRaw) {
                return false; 
            }

            red.ultimoJsonRaw = textoCrudo;
            red.datosCache = JSON.parse(textoCrudo);
            
            // Si todo va bien, retornamos TRUE (datos nuevos disponibles en memoria)
            return true; 
        } catch (e) {
            console.error(`No se pudo cargar el caché de balizas ${red.nombre}`, e);
            return false; 
        }
    }

    // 🟡 4. CARGAR HISTÓRICO DE 4H PARA UNA RED (Lazy Load)
    //___________________________________________________________________________________

    async function cargarDatos6hBalizasSiNecesario(redId, force = false) {
    const red = REDES_BALIZAS[redId];
    const ahora = Date.now();
    
    // Si no se está forzando (force = false), respetamos la caché local de 5 minutos
    if (!force && red.datos6h && (ahora - red.fetched6hAt) < 5 * 60 * 1000) return;
    
    try {
        const res = await fetch(`${red.url6h}?_=${ahora}`);
        red.datos6h = await res.json();
        red.fetched6hAt = ahora;
    } catch (e) {
        console.error(`No se pudo cargar el histórico 6h de balizas ${red.nombre}`, e);
    }
}

    // 🟡 5. ACTUALIZAR ICONOS DEL MAPA
    //___________________________________________________________________________________

    function actualizarIconosBalizas(redId) {
        // ESCUDO DE SEGURIDAD: Si el mapa aún no existe en esta sesión, salimos silenciosamente
        if (typeof map === 'undefined' || !map) return;

        const red = REDES_BALIZAS[redId];
        if (!red || !red.marcadores) return;

        const zoomActual = map.getZoom();

        Object.values(red.marcadores).forEach(marker => {
            const d = red.datosCache[marker.stationId];
            
            // 1. COMPROBAR SI ESTÁ OBSOLETA (> 3 horas)
            let balizaConDatosObsoletos = false;

            if (!d || typeof d.ts !== 'number') {
                balizaConDatosObsoletos = true; 
            } else {
                const ahoraTs = Date.now() / 1000;
                const horasSinDatos = (ahoraTs - d.ts) / 3600;

                if (horasSinDatos > 3) { 
                    balizaConDatosObsoletos = true;
                }
            }

            // 2. COMPROBAR SI ESTÁ CONGELADA (Todo ceros en las últimas 4h)
            let balizaCongelada = false;
            if (red.datos6h && red.datos6h[marker.stationId]) {
                const lecturas = red.datos6h[marker.stationId];
                const ahoraTs = Math.floor(Date.now() / 1000);
                const desdeTs = ahoraTs - 4 * 3600; 
                
                const puntos4h = lecturas.filter(p => 
                    p.ts >= desdeTs && 
                    p.ts <= ahoraTs && 
                    typeof p.windSpeed === 'number'
                );

                if (puntos4h.length > 0) {
                    const todoCeros = puntos4h.every(p => 
                        p.windSpeed === 0 && 
                        (p.windGusts === 0 || p.windGusts === null || p.windGusts === undefined)
                    );
                    if (todoCeros) {
                        balizaCongelada = true;
                    }
                }
            }

            if (!red.layerGroup.hasLayer(marker)) {
                red.layerGroup.addLayer(marker);
            }

            // A) CASO DE ERROR O DATOS OBSOLETOS -> CÍRCULO GRIS/ROJO
            if (balizaConDatosObsoletos || balizaCongelada) {
                const tituloGris = balizaConDatosObsoletos 
                    ? "Datos obsoletos (>3h)" 
                    : "Sensor atascado (4h a cero)";

                const svgPuntoGris = `<svg viewBox="0 0 22 22" style="display: block; width: 11px; height: 11px;"><circle cx="11" cy="11" r="9" fill="#95a5a6" stroke="#7f8c8d" stroke-width="2"/></svg>`;
                
                const htmlObsoleto = `
                    <div title="${marker.stationName}: ${tituloGris}" style="width:80px;height:46px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;cursor:pointer;margin-left:-27px;margin-top:18px;">
                        ${svgPuntoGris}
                    </div>`;

                marker.setIcon(L.divIcon({ 
                    html: htmlObsoleto, 
                    className: 'custom-div-icon', 
                    iconAnchor: [40, 23], 
                    popupAnchor: [0, 25] 
                }));

                // 🚀 HACK DE REDIBUJADO DIRECTO (Para celdas inactivas)
                if (marker._icon) {
                    marker._icon.innerHTML = htmlObsoleto;
                }

                if (marker.isPopupOpen()) pintarPopupBaliza(marker);
                return; 
            }

            if (d.windSpeed === null || d.windSpeed === undefined) {
                const svgPuntoRojo = `<svg viewBox="0 0 22 22" style="display: block; width: 11px; height: 11px;"><circle cx="11" cy="11" r="9" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/></svg>`;
                
                const htmlSinDatos = `
                    <div title="${marker.stationName}: Sensor de viento sin datos" style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center;">
                        ${svgPuntoRojo}
                    </div>`;

                marker.setIcon(L.divIcon({ 
                    html: htmlSinDatos, 
                    className: 'custom-div-icon', 
                    iconAnchor: [40, 23], 
                    popupAnchor: [0, 25] 
                }));

                // 🚀 HACK DE REDIBUJADO DIRECTO (Para celdas sin datos)
                if (marker._icon) {
                    marker._icon.innerHTML = htmlSinDatos;
                }

                if (marker.isPopupOpen()) pintarPopupBaliza(marker);
                return;
            }

            // B) CASO VÁLIDO -> DIBUJAR ICONOS
            const rotacion = (d.windDirection ?? 0) + 180;
            const estadoMapa = calcularEstadoActualizacionBaliza(d, redId);
            
            const colorFlechaMapa = estadoMapa.esAntiguo 
                ? '#95a5a6' 
                : obtenerColorFlechaBaliza(d.windSpeed);
            
            const svgFlechaMapa = `
                <svg viewBox="0 0 30 36" style="transform: rotate(${rotacion}deg); transform-origin: 50% 30%; width: 40px; height: 40px; display: block;">
                    <polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="${colorFlechaMapa}"/>
                </svg>`;

            let htmlBaliza = "";

            if (chkOcultarValoresBalizas) {
                // Modo compacto (Conserva las proporciones de la caja para un anclaje idéntico del popup)
                htmlBaliza = `
                    <div style="width: 80px; height: 46px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; cursor: pointer; margin-left: -27px; margin-top: 18px">
                        <div style="height: 40px; display: flex; align-items: center; justify-content: center; width: 100%;">
                            ${svgFlechaMapa}
                        </div>
                        <div style="height: 20px; margin-top: -14px;"></div>
                    </div>`;
            } else {
                // Modo normal (con cifras de velocidad de viento)
                const colorVientoMapa = estadoMapa.esAntiguo ? '#95a5a6' : '#0078d4';
                const colorRachaMapa  = estadoMapa.esAntiguo ? '#95a5a6' : '#e74c3c';

                let cifrasHtml = `<strong style="font-size: 16px; color: ${colorVientoMapa};">${d.windSpeed}</strong>`;
                if (zoomActual >= 10 && d.windGusts !== null && d.windGusts !== undefined) {
                    cifrasHtml += `<span style="font-size: 16px; color: #7f8c8d; margin: 0 1px;">/</span><strong style="font-size: 16px; color: ${colorRachaMapa};" title="Racha máxima: ${d.windGusts} km/h">${d.windGusts}</strong>`;
                }

                htmlBaliza = `
                    <div style="width: 80px; height: 46px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; cursor: pointer; margin-left: -27px; margin-top: 18px">
                        <div style="height: 40px; display: flex; align-items: center; justify-content: center; width: 100%;">
                            ${svgFlechaMapa}
                        </div>
                        <div style="height: 20px; margin-top: -14px; display: flex; align-items: center; justify-content: center; width: 100%; white-space: nowrap; text-shadow: 1px 1px 2px rgba(255,255,255,1), -1px -1px 2px rgba(255,255,255,1), 1px -1px 2px rgba(255,255,255,1), -1px 1px 2px rgba(255,255,255,1);">
                            ${cifrasHtml}
                        </div>
                    </div>`;
            }

            // Actualizamos en memoria
            marker.setIcon(L.divIcon({ 
                html: htmlBaliza, 
                className: 'custom-div-icon', 
                iconAnchor: [40, 40], 
                popupAnchor: [0, 25] 
            }));

            // 🚀 EL HACK DE REDIBUJADO DIRECTO: Si la baliza está visible en pantalla,
            // forzamos al navegador a repintar su HTML interno de inmediato
            if (marker._icon) {
                marker._icon.innerHTML = htmlBaliza;
            }

            if (marker.isPopupOpen()) pintarPopupBaliza(marker);
        });

        if (red.layerGroup && typeof red.layerGroup.refreshClusters === 'function' && map.hasLayer(red.layerGroup)) {
            red.layerGroup.refreshClusters();
        }
    }

    // EXPOSICIÓN GLOBAL PARA PODER ACTUALIZAR MAPA INMEDIATAMENTE DESDE AJUSTES
    window.REDES_BALIZAS = REDES_BALIZAS;
    window.actualizarIconosBalizas = actualizarIconosBalizas;
    
    // 🟡 6. PINTAR EL POPUP
    //___________________________________________________________________________________

    function pintarPopupBaliza(marker) {
        const red = REDES_BALIZAS[marker.redId];
        const containerDiv = document.getElementById(`pop-${red.id}-${marker.stationId}`);
        if (!containerDiv) return;
        
        const d = red.datosCache[marker.stationId];

        // -----------------------------------------------------------
        // EVALUAR SI ESTÁ CONGELADA (Para no mostrar un gráfico plano a 0)
        // -----------------------------------------------------------
        let balizaCongelada = false;
        if (red.datos6h && red.datos6h[marker.stationId]) {
            const lecturas = red.datos6h[marker.stationId];
            const ahoraTs = Math.floor(Date.now() / 1000);
            const desdeTs = ahoraTs - 4 * 3600; 
            
            const puntos4h = lecturas.filter(p => p.ts >= desdeTs && p.ts <= ahoraTs && typeof p.windSpeed === 'number');

            if (puntos4h.length > 0) {
                balizaCongelada = puntos4h.every(p => 
                    p.windSpeed === 0 && 
                    (p.windGusts === 0 || p.windGusts === null || p.windGusts === undefined)
                );
            }
        }

        // =========================================================================
        // CONSTRUCCIÓN DEL TOOLTIP DE INFORMACIÓN DINÁMICO (Movido aquí arriba)
        // =========================================================================
        // 1. Buscamos la estación exacta en el array para leer sus nuevos campos
        const estacionObj = red.estaciones.find(e => e.id === marker.stationId);
        
        // 2. Extraemos los datos dinámicos con "red de seguridad" por si no existen
        const stName = marker.stationName || (estacionObj ? estacionObj.name : '—');
        const stProvider = red.nombre || (estacionObj ? estacionObj.provider : '—');
        const stLat = marker.getLatLng().lat.toFixed(4);
        const stLon = marker.getLatLng().lng.toFixed(4);
        
        // Si no hay altitud en el array, ponemos "—"
        const altitud = (estacionObj && estacionObj.altitude) ? `${estacionObj.altitude} m` : '—';
        
        // Lógica para obtener la URL de la web oficial de la baliza
        let webLink = '—';
        let urlFinal = null;

        // 1. Prioridad A: Usar el patrón configurado en REDES_BALIZAS
        if (typeof red.urlWeb === 'function') {
            urlFinal = red.urlWeb(marker.stationId);
        }
        // 2. Prioridad B (Fallback): Por si el JSON de estaciones ya traía una URL específica
        else if (estacionObj && estacionObj.url) {
            urlFinal = estacionObj.url;
        }

        // Si hemos conseguido una URL válida, construimos el enlace HTML
        if (urlFinal) {
            webLink = `<a href="${urlFinal}" onclick="abrirLinkExterno(this.href); return false;" style="color: #5b9be4; text-decoration: underline; font-weight: bold;">${typeof t === 'function' ? t('mapa.enlaceOficial', { defaultValue: 'Web' }) : 'Web'}</a>`;
        }

        // 3. Construimos la estructura fija del Tooltip (Siempre se verá igual)
        let tooltipHTML = `<div style="text-align: left; line-height: 1.4; padding: 2px;">`;
        
        tooltipHTML += `<b>${typeof t === 'function' ? t('mapa.balizas.baliza', { defaultValue: 'Baliza' }) : 'Baliza'}:</b> ${stName}<br>`;
        tooltipHTML += `<b>${typeof t === 'function' ? t('mapa.balizas.proveedor', { defaultValue: 'Proveedor' }) : 'Proveedor'}:</b> ${stProvider}<br>`;
        tooltipHTML += `<b>${typeof t === 'function' ? t('mapa.balizas.coordenadas', { defaultValue: 'Coordenadas' }) : 'Coordenadas'}:</b> ${stLat}, ${stLon}<br>`;
        tooltipHTML += `<b>${typeof t === 'function' ? t('mapa.balizas.altitud', { defaultValue: 'Altitud' }) : 'Altitud'}:</b> ${altitud}<br>`;
        
        // Solo mostramos la hora de actualización si hay datos válidos (d.ts)
        if (d && typeof d.ts === 'number') {
            tooltipHTML += `<b>${typeof t === 'function' ? t('mapa.balizas.balizas_actualizada', { defaultValue: 'Actualizada' }) : 'Actualizada'}:</b> ${formatearFechaHoraBaliza(d.ts)}<br>`;
        }
        
        tooltipHTML += `${webLink}`;
        tooltipHTML += `</div>`;

        // 4. Escapamos las comillas para no romper el atributo HTML del botón
        const tooltipSeguro = tooltipHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        // =========================================================================


        // 1. Datos numéricos o Aviso de error (Si falla o está congelada, pintamos error y SALIMOS)
        if (!d || d.windSpeed === null || d.windSpeed === undefined || balizaCongelada) {
            // NUEVO HTML DE ERROR: Mantiene los 347px e incluye el botón Info abajo a la derecha
            containerDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; width: 100%;">
                    <div>
                        <p style="font-size:20px; padding-right:20px; max-width:212px; display:inline-block; margin: 0 0 10px 0;">
                            <icon-baliza></icon-baliza><span style="font-weight: bold;"> ${marker.stationName}</span> <small style="color:#888;">(${red.nombre})</small>
                        </p>
                        <p style="line-height: 1.5; font-weight: bold; color: #c0392b; margin-bottom: 40px; margin-top: 50px; text-align: center;">
                            ❌📡 ${t('mapa.balizas.baliza_sin_datos', { defaultValue: 'Estación sin datos de viento.' })}
                        </p>
                    </div>

                    <!-- FOOTER DE ERROR -->
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: auto; padding-top: 7px; padding-bottom: 7px;">
                        <small style="color:#888; text-align: left;">
                            ⚪ ${t('mapa.balizas.sin_datos_recientes', { defaultValue: 'Sin datos recientes' })}
                        </small>
                        
                        <button class="btn-info btn-inline" data-tippy-content="${tooltipSeguro}" style="background: transparent; border: none; padding: 0; margin-left: 10px; cursor: pointer; display: flex; flex-shrink: 0; outline: none;">
                            <img src="icons/info.svg" alt="Más información" style="width: 20px; height: 20px; vertical-align: middle;">
                        </button>
                    </div>
                </div>
            `;
            return; // Retorno temprano. El código se detiene aquí.
        } 

        // 2. Si todo está bien, calculamos variables
        
        const codigoOrientacion = obtenerTextoOrientacion(d.windDirection); // Obtenemos el código base de la orientación (ej: "SO", "O", "NNE")
        const orientacionTexto = traducirCadenaOrientacion(codigoOrientacion); 

        const estadoPopup = calcularEstadoActualizacionBaliza(d, marker.redId);

        // viewBox="5 1 20 20" centra la flecha a la perfección. Ahora "transform-origin: center center" hace que gire como una brújula perfecta.
        const colorFlechaPopup = estadoPopup.esAntiguo 
            ? '#95a5a6' 
            : obtenerColorFlechaBaliza(d.windSpeed);

        const svgFlecha = `
            <svg viewBox="5 1 20 20" style="transform: rotate(${(d.windDirection ?? 0) + 180}deg) scale(0.7); transform-origin: center center; width: 28px; height: 28px; flex-shrink: 0;">
                <polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="${colorFlechaPopup}"/>
            </svg>`;

        // Sacamos solo la hora y los minutos directamente
        const fechaBaliza = new Date(d.ts * 1000);
        const horaStr = fechaBaliza.getHours() + ':' + String(fechaBaliza.getMinutes()).padStart(2, '0');

        // Inyectamos todo el HTML correcto
        containerDiv.innerHTML = `
            <p style="font-size:20px; padding-right:20px; max-width:212px; display:inline-block; margin: 0 0 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; vertical-align:bottom;">
                <icon-baliza></icon-baliza><span style="font-weight: bold;"> ${marker.stationName}</span> <small style="color:#888;">(${red.nombre})</small>
            </p>

            <!-- min-height: 130px; para reservar el hueco siempre -->
            <div style="display:flex; align-items:center; margin-top: 0px; min-height: 130px;">
                <div style="flex:1 1 auto; min-width:0;">
                    <!-- Fila 1: Viento -->
                    <div style="display: flex; align-items: center; height: 25px;">
                        <img src="icons/icono_viento_48x42.webp" width="16" height="16" style="margin-right:14px;"> 
                        <b style="color: #0078d4;">${d.windSpeed}</b> <span style="font-size:13px; margin-left: 4px; color: #888;">km/h</span>
                    </div>
                    <!-- Fila 2: Racha -->
                    <div style="display: flex; align-items: center; height: 25px;">
                        <img src="icons/icono_racha_48x42.webp" width="16" height="16" style="margin-right:14px;"> 
                        <span style="color: #c0392b; font-weight: bold;">${d.windGusts ?? '-'}</span> <span style="font-size:13px; margin-left: 4px; color: #888;">km/h</span>
                    </div>
                    <!-- Fila 3: Dirección -->
                    <div title="${d.windDirection ?? '-'}º" style="display: flex; align-items: center; height: 25px;">
                        <img src="icons/icono_direccion_45.webp" width="16" height="16" style="margin-right:14px;">
                        <b style="color: #0078d4;">${orientacionTexto}</b>
                        ${svgFlecha} 
                    </div>
                </div>
                
                <div id="pop-rosa-${red.id}-${marker.stationId}" style="flex:0 0 auto; width:110px; text-align:center;">
                </div>
            </div>

            <div id="pop-chart-${red.id}-${marker.stationId}" style="min-height: 90px; text-align:center; margin-top: -14px;">
                <small style="color:#aaa;">⏳ ${t('mapa.balizas.balizas_cargando_grafico', { defaultValue: 'Cargando gráfico...' })}</small>
            </div>

            <!-- FOOTER -->
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: auto; padding-top: 7px; padding-bottom: 7px;">
                
                <small class="baliza-live-time" data-red="${red.id}" data-station="${marker.stationId}" style="color:#888; text-align: left;">
                    ${estadoPopup.emoji} ${horaStr}
                    <span style="margin-left: 2px;">
                        (${typeof t === 'function' ? t('actualizacion.hace', { tiempo: formatTimeAgo(d.ts * 1000, Date.now()), defaultValue: 'hace ' + formatTimeAgo(d.ts * 1000, Date.now()) }) : 'hace ' + formatTimeAgo(d.ts * 1000, Date.now())})
                    </span>
                </small>
                
                <!-- Botón Info Dinámico con datos del array -->
                <button class="btn-info btn-inline" data-tippy-content="${tooltipSeguro}" style="background: transparent; border: none; padding: 0; margin-left: 10px; cursor: pointer; display: flex; flex-shrink: 0; outline: none;">
                    <img src="icons/info.svg" alt="Más información" style="width: 20px; height: 20px; vertical-align: middle;">
                </button>
                
            </div>
        `;

        pintarGraficaBaliza(marker);
    }

    // ----------------------------------------------------------------------------------
    // ACTUALIZADOR SILENCIOSO: Mantiene vivo el tiempo ("hace X min") de los popups abiertos
    // ----------------------------------------------------------------------------------
    setInterval(() => {
        // Busca si hay algún footer de baliza visible en la pantalla
        document.querySelectorAll('.baliza-live-time').forEach(el => {
            const redId = el.getAttribute('data-red');
            const stationId = el.getAttribute('data-station');
            const red = REDES_BALIZAS[redId];
            
            // Verificaciones de seguridad
            if (!red || !red.datosCache) return;
            const d = red.datosCache[stationId];
            if (!d || !d.ts) return;

            // Recalculamos el tiempo y el semáforo exactos en este segundo
            const estadoPopup = calcularEstadoActualizacionBaliza(d, redId);
            const fechaBaliza = new Date(d.ts * 1000);
            const horaStr = fechaBaliza.getHours() + ':' + String(fechaBaliza.getMinutes()).padStart(2, '0');
            const textoHace = typeof t === 'function' ? t('actualizacion.hace', { tiempo: formatTimeAgo(d.ts * 1000, Date.now()), defaultValue: 'hace ' + formatTimeAgo(d.ts * 1000, Date.now()) }) : 'hace ' + formatTimeAgo(d.ts * 1000, Date.now());

            // Actualizamos SOLO esa línea de texto (sin tocar la gráfica ni producir parpadeos)
            el.innerHTML = `
                ${estadoPopup.emoji} ${horaStr}
                <span style="margin-left: 2px;">
                    (${textoHace})
                </span>
            `;
        });
    }, 20000); // Se ejecuta en la sombra cada 20 segundos

    // 🟡 7. PINTAR GRÁFICA DE 4H
    //___________________________________________________________________________________

    async function pintarGraficaBaliza(marker) {
        const red = REDES_BALIZAS[marker.redId];
        await cargarDatos6hBalizasSiNecesario(red.id);

        const chartDiv = document.getElementById(`pop-chart-${red.id}-${marker.stationId}`);
        if (!chartDiv) return;

        const rosaDiv = document.getElementById(`pop-rosa-${red.id}-${marker.stationId}`);

        const lecturas = red.datos6h ? red.datos6h[marker.stationId] : null;
        const svg = generarSvgGraficaBaliza(lecturas);
        const svgRosa = generarSvgRosaVientos(lecturas);

        if (rosaDiv) {
            rosaDiv.innerHTML = svgRosa
                ? `
                    <div style="text-align:left; margin-bottom:0px;">
                        <small style="font-size:13px; color:#888;">${t('mapa.balizas.leyenda_rosa_meteorologica', { defaultValue: 'Últimas 2 h' })}</small>
                    </div>    
                    ${svgRosa}
                `
                : '';
        }

        if (!svg) {
            chartDiv.innerHTML = `<small style="margin-top:10px; color:#aaa;">${t('mapa.balizas.balizas_sin_historico', { defaultValue: 'Gráfico no disponible: no hay datos de las últimas 4 horas.' })}</small>`;
            return;
        }

        chartDiv.innerHTML = `
            <div style="text-align:left; margin-left:0px;">
                <small style="font-size:13px; color:#888;">${t('mapa.balizas.leyenda_grafico_ultimas_4h', { defaultValue: 'Últimas 4 h' })}</small>
            </div>
            ${svg}
            <div style="display:flex; justify-content:center; align-items:center; gap:14px; margin-top:2px;">
                <small style="color:#0078d4; display: inline-flex; align-items: center; margin-right: 10px;">
                    <svg width="15" height="2" style="margin-right: 5px; overflow: visible; vertical-align: middle;"><line x1="0" y1="1" x2="15" y2="1" stroke="#0078d4" stroke-width="2" /></svg>
                    ${t('mapa.balizas.balizas_viento', { defaultValue: 'Viento' })}
                </small>
                <small style="color:#c0392b; display: inline-flex; align-items: center;">
                    <svg width="15" height="2" style="margin-right: 5px; overflow: visible; vertical-align: middle;"><line x1="0" y1="1" x2="15" y2="1" stroke="#c0392b" stroke-width="2" /></svg>
                    ${t('mapa.balizas.balizas_racha', { defaultValue: 'Racha' })}
                </small>
            </div>
        `;
    }


    // 🟡 8. EVENTO AL ABRIR UN POPUP EN EL MAPA
    //___________________________________________________________________________________

    map.on('popupopen', async function (e) {
        const marker = e.popup._source;
        if (!marker || !marker.redId || !marker.stationId) return;

        // Forzamos la descarga del historial de 6h para que el gráfico esté al segundo
        await cargarDatos6hBalizasSiNecesario(marker.redId, true);

        pintarPopupBaliza(marker);

        // Recalculamos el padding SEGÚN EL ESTADO ACTUAL del panel de filtros
        // (no el que había cuando se creó el marcador) y reajustamos el mapa.
        // OJO: no llamar a e.popup.update() aquí, regenera el contenido desde
        // el HTML original de bindPopup y pisaría lo que acaba de pintar pintarPopupBaliza().
        const panelFiltro = document.getElementById('div-filtro-horario');
        const filtroFlotando = !!(panelFiltro && panelFiltro.classList.contains('flotando-en-mapa'));
        e.popup.options.autoPanPaddingTopLeft = filtroFlotando ? L.point(75, 260) : L.point(75, 170);

        if (e.popup._map) {
            e.popup._adjustPan();
        }
    });

    // 🟡 9. LÓGICA DE ACTIVACIÓN/DESACTIVACIÓN GENÉRICA POR CHECKBOXES
    //___________________________________________________________________________________

    async function activarCapaBalizas(redId) {
        const red = REDES_BALIZAS[redId];
        
        // ¡Esperamos a que descargue el JSON (si no lo tenía) y dibuje los grises!
        await dibujarEstacionesBalizas(redId); 
        
        map.addLayer(red.layerGroup);
        
        // Carga inicial forzada de ambos JSON (meteo en vivo y 6h)
        await cargarDatos6hBalizasSiNecesario(redId, true); 
        await cargarDatosBalizas(redId);
        actualizarIconosBalizas(redId); // Pintamos ahora que ambos datos están en memoria

        if (!red.intervalo) {
            red.intervalo = setInterval(async () => {
                // 1. Consultamos si ha cambiado el tiempo real
                const haCambiado = await cargarDatosBalizas(redId); 
                
                // 2. Si ha cambiado el viento
                if (haCambiado) {
                    // Primero forzamos la descarga del historial de 6h
                    await cargarDatos6hBalizasSiNecesario(redId, true); 
                    // Y una vez descargado, pintamos todo a la vez (iconos, popups y gráfico sincronizados)
                    actualizarIconosBalizas(redId);
                } else {
                    // Si el viento sigue igual, dejamos la comprobación de 5 minutos para el historial
                    const antesFetched = red.fetched6hAt;
                    await cargarDatos6hBalizasSiNecesario(redId, false);
                    
                    // Si efectivamente se ha cumplido el plazo de 5 minutos y se ha descargado un JSON nuevo de 6h, repintamos
                    if (red.fetched6hAt !== antesFetched) {
                        actualizarIconosBalizas(redId);
                    }
                }
            }, 60 * 1000); 
        }
    }

    function desactivarCapaBalizas(redId) {
        const red = REDES_BALIZAS[redId];
        map.removeLayer(red.layerGroup);
        if (red.intervalo) {
            clearInterval(red.intervalo);
            red.intervalo = null;
        }
    }

    // Inicializar todos los checkboxes dinámicamente
    Object.values(REDES_BALIZAS).forEach(red => {
        const checkboxElement = document.getElementById(red.checkboxId);
        if (checkboxElement) {
            // Escuchar cambios de usuario
            checkboxElement.addEventListener('change', function () {
                localStorage.setItem(red.lsKey, this.checked);
                if (this.checked) {
                    activarCapaBalizas(red.id);
                } else {
                    desactivarCapaBalizas(red.id);
                }
            });

            // Restaurar estado guardado en el navegador (si existe)
            const recordarCapas = localStorage.getItem('METEO_RECORDAR_CAPAS_ACTIVAS') === 'true';
            const capaVisibleGuardada = recordarCapas ? (localStorage.getItem(red.lsKey) === 'true') : false; // False por defecto
            checkboxElement.checked = capaVisibleGuardada;
            if (capaVisibleGuardada) {
                activarCapaBalizas(red.id);
            }
        }
    });

    // 🟡 FUNCIONES AUXILIARES BALIZAS
    //___________________________________________________________________________________

    function calcularEstadoActualizacionBaliza(d, redId) {
        if (!d || typeof d.ts !== 'number') {
            return { minutos: null, emoji: '⚪', esAntiguo: true };
        }

        const ahoraMs = Date.now();
        const timestampMs = d.ts * 1000;   // convertimos ts (segundos) a milisegundos

        const umbralAmarillo = REDES_BALIZAS[redId].umbralAmarilloMin || 90;
        const umbralRojo = REDES_BALIZAS[redId].umbralRojoMin || 180;

        return calcularSemaforoAntiguedad(timestampMs, umbralAmarillo, umbralRojo, ahoraMs);
    }
    
    function formatearFechaHoraBaliza(ts) {
        if (!ts) return '-';
        const fecha = new Date(ts * 1000);
        const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        const dia  = fecha.getDate();
        const mes  = meses[fecha.getMonth()];
        const anio = fecha.getFullYear();
        const hora = fecha.getHours();
        const min  = String(fecha.getMinutes()).padStart(2, '0');
        return `${dia}-${mes}-${anio} ${hora}:${min}`;
    }

    function generarSvgRosaVientos(lecturas) {
        if (!Array.isArray(lecturas) || lecturas.length === 0) return null;

        const ahora = Math.floor(Date.now() / 1000);
        const desde = ahora - 2 * 3600; // Ventana de 2 horas para la rosa de los vientos

        // Necesitamos velocidad Y dirección para poder ubicar el dato en el "quesito"
        const puntos = lecturas.filter(p =>
            typeof p.windSpeed === 'number' &&
            typeof p.windDirection === 'number' &&
            p.ts >= desde && p.ts <= ahora
        );
        if (puntos.length === 0) return null;

        const W = 160, H = 160;
        const cx = W / 2, cy = H / 2;
        const radioMax = 60; // Radio del círculo exterior en px (deja margen para etiquetas de dirección)

        // El círculo exterior representa el máximo de las últimas 2h (viento o racha),
        // pero con suelo de 20 para que el círculo de umbral de 20 km/h siempre quepa dentro.
        let maxV = Math.max(
            ...puntos.map(p => Math.max(p.windSpeed, typeof p.windGusts === 'number' ? p.windGusts : 0)),
            20
        );
        maxV = Math.ceil(maxV / 5) * 5;

        const escalaR = (v) => (v / maxV) * radioMax;

        const NUM_SECTORES = 16;
        const anguloSector = 360 / NUM_SECTORES;
        const nombresDir = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];

        const NUM_BANDAS = 5; // Bandas radiales de intensidad, repartidas uniformemente hasta maxV
        const anchoBanda = maxV / NUM_BANDAS;

        // Matriz de conteo [sector][banda] = nº de lecturas que caen en esa combinación dirección/intensidad
        const conteo = Array.from({ length: NUM_SECTORES }, () => new Array(NUM_BANDAS).fill(0));

        puntos.forEach(p => {
            const dir = ((p.windDirection % 360) + 360) % 360;
            const sector = Math.round(dir / anguloSector) % NUM_SECTORES;
            const banda = Math.min(NUM_BANDAS - 1, Math.floor(p.windSpeed / anchoBanda));
            conteo[sector][banda]++;
        });

        const maxConteo = Math.max(...conteo.flat(), 1);

        // Polar -> cartesianas. Restamos 90º para que 0º (Norte) quede arriba, sentido horario (meteorológico)
        const punto = (angGrados, r) => {
            const rad = (angGrados - 90) * Math.PI / 180;
            return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
        };

        // "Trozo de tarta" anular entre dos radios y dos ángulos
        const arcoAnular = (angIni, angFin, r0, r1) => {
            const [x1, y1] = punto(angIni, r1);
            const [x2, y2] = punto(angFin, r1);
            const [x3, y3] = punto(angFin, r0);
            const [x4, y4] = punto(angIni, r0);
            const largeArc = (angFin - angIni) > 180 ? 1 : 0;
            return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r1.toFixed(1)},${r1.toFixed(1)} 0 ${largeArc} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r0.toFixed(1)},${r0.toFixed(1)} 0 ${largeArc} 0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`;
        };

        // Líneas radiales sutiles marcando los límites de sector
        const lineasSectores = [];
        for (let s = 0; s < NUM_SECTORES; s++) {
            const ang = s * anguloSector - anguloSector / 2;
            const [x1, y1] = punto(ang, radioMax);
            lineasSectores.push(`<line x1="${cx}" y1="${cy}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#cccccc" stroke-width="1"/>`);
        }

        // Celdas coloreadas (sector x banda) según densidad de datos
        const celdas = [];
        for (let s = 0; s < NUM_SECTORES; s++) {
            const angIni = s * anguloSector - anguloSector / 2;
            const angFin = s * anguloSector + anguloSector / 2;
            for (let b = 0; b < NUM_BANDAS; b++) {
                const c = conteo[s][b];
                if (c === 0) continue;
                const r0 = escalaR(b * anchoBanda);
                const r1 = escalaR((b + 1) * anchoBanda);
                const intensidad = c / maxConteo;
                const opacidad = (0.15 + intensidad * 0.85).toFixed(2);
                celdas.push(`<path d="${arcoAnular(angIni, angFin, r0, r1)}" fill="#0078d4" fill-opacity="${opacidad}" stroke="#ffffff" stroke-width="0.4"/>`);
            }
        }

        // Círculos guía DIBUJADOS ENCIMA de las celdas para que no queden tapados por el color
        const r10 = escalaR(10);
        const r20 = escalaR(20);
        const circulosGuia = `
            <circle cx="${cx}" cy="${cy}" r="${r10.toFixed(1)}" fill="none" stroke="#a4a4a4" stroke-width="1"/>
            <circle cx="${cx}" cy="${cy}" r="${r20.toFixed(1)}" fill="none" stroke="#28a745" stroke-width="3" stroke-dasharray="5,3.5"/>
            <circle cx="${cx}" cy="${cy}" r="${radioMax}" fill="none" stroke="#888888" stroke-width="0.4"/>
        `;

        // Solo mostramos la cifra del umbral de 20 km/h (10 y máximo quedan sin etiqueta, pero sus círculos se dibujan igual). El 3 del x="${cx + 3} es una decisión estética para que el número no quedara pegado a la línea vertical imaginaria N-S y se leyera mejor,
        // const etiquetasEscala = `
        //     <text x="${cx+6}" y="${(cy - r20 - 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="#28a745" font-weight="bold">20</text>
        // `;

        // OBSOLETO: con etiqueta 10 km/h y máximo
        // const etiquetasEscala = `
        //     <text x="${cx + 3}" y="${(cy - r10 - 2).toFixed(1)}" font-size="7" fill="#000">10</text>
        //     <text x="${cx + 3}" y="${(cy - r20 - 2).toFixed(1)}" font-size="7" fill="#28a745" font-weight="bold">20</text>
        //     <text x="${cx + 3}" y="${(cy - radioMax - 2).toFixed(1)}" font-size="7" fill="#555">${maxV}</text>
        // `;

        // Etiquetas de dirección solo en las 8 principales (N, NE, E, SE, S, SO, O, NO) para no saturar. Separación del borde es: radioMax + X); y aumentar la X de y="${(yl + X)
        // Ojo, el cambio de tamaño de letra va por cálculos de svg y depende del contenedor que ahora es: <div id="pop-rosa-${red.id}-${marker.stationId}" style="flex:0 0 auto; width:110px; text-align:center;">. Escala = 110 / 160 = 0.6875 ----> font-size necesario = 12 / 0.6875 ≈ 17.45
        const etiquetasDir = [];
        for (let s = 0; s < NUM_SECTORES; s += 2) {
            const ang = s * anguloSector;
            const [xl, yl] = punto(ang, radioMax + 13);
            const textoDir = traducirCadenaOrientacion(nombresDir[s]);
            etiquetasDir.push(`<text x="${xl.toFixed(1)}" y="${(yl + 4).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="600" fill="#555">${textoDir}</text>`);
        }

        return `
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block; width:100%; height:auto; max-width:200px; margin: 0 auto; margin-top: 2px; margin-bottom: -3px;">
                ${lineasSectores.join('')}
                ${celdas.join('')}
                ${circulosGuia}
                ${etiquetasDir.join('')}
            </svg>
        `;
    }

    function generarSvgGraficaBaliza(lecturas) {
        if (!Array.isArray(lecturas) || lecturas.length === 0) return null;

        const W = 250, H = 112; // Ancho (W) y Alto (H) del lienzo en píxeles virtuales.
        const padL = 20, padR = 6, padT = 26, padB = 18; // Pad=Padding=Márgenes de separación interno: Izquierda (L), Derecha (R), Arriba (T), Abajo (B).
        const plotW = W - padL - padR; // Ancho real de la zona donde se dibujan las líneas.
        const plotH = H - padT - padB; // Alto real de la zona donde se dibujan las líneas.

        const lecturasValidas = lecturas
            .filter(p => typeof p.windSpeed === 'number')
            .sort((a, b) => a.ts - b.ts);
        if (lecturasValidas.length === 0) return null;

        const ahoraTiempoReal = Math.floor(Date.now() / 1000);
        // Redondeamos al MINUTO inferior exacto para fijar el borde derecho
        const ahora = Math.floor(ahoraTiempoReal / 60) * 60; 
        const desde = ahora - 4 * 3600; // Horas de historial mostradas: últimas X horas (hay más lugares, buscarlos con este comentario)

        const puntos = lecturasValidas.filter(p => p.ts >= desde && p.ts <= ahora);
        if (puntos.length === 0) return null;

        // Buscamos el punto de viento inmediatamente anterior para dar continuidad a la línea por el borde izquierdo
        const firstVisibleIndex = lecturasValidas.findIndex(p => p.ts >= desde);
        let puntosLinea = [...puntos];
        if (firstVisibleIndex > 0) {
            puntosLinea.unshift(lecturasValidas[firstVisibleIndex - 1]);
        }

        // Buscamos el punto de racha inmediatamente anterior para dar continuidad a la línea por el borde izquierdo
        const lecturasRachaValidas = lecturasValidas.filter(p => typeof p.windGusts === 'number');
        const puntosRacha = puntos.filter(p => typeof p.windGusts === 'number');
        let puntosRachaLinea = [...puntosRacha];
        const firstRachaVisibleIndex = lecturasRachaValidas.findIndex(p => p.ts >= desde);
        if (firstRachaVisibleIndex > 0) {
            puntosRachaLinea.unshift(lecturasRachaValidas[firstRachaVisibleIndex - 1]);
        }

        // Escala de Velocidad (Eje Y)
        const valores = [];
        puntos.forEach(p => {
            valores.push(p.windSpeed);
            if (typeof p.windGusts === 'number') valores.push(p.windGusts);
        });
        const minV = 0; // El viento mínimo siempre empieza en 0.

        // Escala vertical variable según máximo
        let maxV = Math.max(...valores, 20); // El techo mínimo ahora es 20 km/h
        maxV = Math.ceil(maxV / 5) * 5; // Redondea hacia arriba en múltiplos de 5
        
        const x = (ts) => padL + ((ts - desde) / (ahora - desde)) * plotW;
        const y = (v) => padT + plotH - ((v - minV) / (maxV - minV)) * plotH;

        const lineaViento = puntosLinea.map(p => `${x(p.ts).toFixed(1)},${y(p.windSpeed).toFixed(1)}`).join(' ');
        const lineaRacha = puntosRachaLinea.map(p => `${x(p.ts).toFixed(1)},${y(p.windGusts).toFixed(1)}`).join(' ');

        // Puntitos sobre cada dato real (mismo color que su línea)
        const puntosVientoSvg = puntos.map(p =>
            `<circle cx="${x(p.ts).toFixed(1)}" cy="${y(p.windSpeed).toFixed(1)}" r="2" fill="#0078d4"/>`
        ).join('');
        const puntosRachaSvg = puntosRacha.map(p =>
            `<circle cx="${x(p.ts).toFixed(1)}" cy="${y(p.windGusts).toFixed(1)}" r="2" fill="#c0392b"/>`
        ).join('');

        // LÓGICA DE LAS LÍNEAS HORIZONTALES (GRID). Partimos de la base de 0, 10, 20. 
        const gridYSet = new Set([0, 10, 20]);
        
        if (maxV > 20) {
            gridYSet.add(maxV);
        }

        const gridY = Array.from(gridYSet);

        // Líneas de Guía Horizontales
        const gridLines = gridY.map(v => {
            const esUmbral20 = (v === 20);
            
            const colorLinea = esUmbral20 ? "#28a745" : "#a4a4a4";
            const strokeWidth = esUmbral20 ? "1.6" : "0.5";
            const dashArray = esUmbral20 ? "4,3" : "none";   // Línea discontinua para el 20

            const colorTexto = esUmbral20 ? "#28a745" : "#000000";

            return `
                <line 
                    x1="${padL}" 
                    y1="${y(v).toFixed(1)}" 
                    x2="${W - padR}" 
                    y2="${y(v).toFixed(1)}" 
                    stroke="${colorLinea}" 
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${dashArray}"/>
                <text 
                    x="${padL - 6}" 
                    y="${(y(v) + 4).toFixed(1)}" 
                    text-anchor="end" 
                    font-size="12" 
                    fill="${colorTexto}"
                    font-weight="${esUmbral20 ? 'bold' : 'normal'}">
                    ${Math.round(v)}
                </text>`;
        }).join('');

        // Etiquetas eje X y Ejes de Guía Verticales
        const etiquetasX = [];
        const lineasVerticales = [];

        // 1. Buscamos la primera "hora en punto" local que cae dentro del gráfico (después de 'desde')
        const dLoop = new Date(desde * 1000);
        dLoop.setMinutes(0, 0, 0); // Redondeamos a la hora en punto inferior
        dLoop.setHours(dLoop.getHours() + 1); // Saltamos a la siguiente hora en punto para empezar a dibujar

        let tsHoraEnPunto = Math.floor(dLoop.getTime() / 1000);

        // Obtenemos los minutos exactos actuales para gestionar los solapamientos con el cronómetro
        const dAhora = new Date(ahora * 1000);
        const minutosActuales = dAhora.getMinutes();

        // Bucle para dibujar las líneas y textos de las "horas en punto" que van desplazándose
        while (tsHoraEnPunto <= ahora) {
            const px = x(tsHoraEnPunto).toFixed(1);
            
            // Verificamos si esta hora en punto choca con el cronómetro actual. El cronómetro está en dAhora. Si la marca de la hora en punto actual es dLoop, comprobamos la diferencia en milisegundos para saber si están demasiado cerca (< 20 mins). Poniendo diferenciaMins < 20 no aparecería la hora hasta pasados 20 min de la hora actual. De momento lo dejo en 0 porque se solapa con 10 min de diferencia pero poco.
            const diferenciaMins = (ahora - tsHoraEnPunto) / 60;
            const muyCercaDelCronometro = diferenciaMins < 0 && diferenciaMins >= 0;  

            // Formateamos la hora sin ceros a la izquierda (ej: 7, 8, 14...)
            const textoHora = String(dLoop.getHours());

            // Trazamos el eje vertical de la hora en punto SIEMPRE (la raya gris sí se pinta aunque el número no)
            lineasVerticales.push(`<line x1="${px}" y1="${padT}" x2="${px}" y2="${(padT + plotH).toFixed(1)}" stroke="#a4a4a4" stroke-width="0.5"/>`);

            // Pintamos el número SOLO si no se solapa con el cronómetro
            if (!muyCercaDelCronometro) {
                etiquetasX.push(`<text x="${px}" y="${H - 1}" text-anchor="middle" font-size="14" fill="#888">${textoHora}</text>`);
            }

            // Avanzamos 1 hora exacta
            dLoop.setHours(dLoop.getHours() + 1);
            tsHoraEnPunto = Math.floor(dLoop.getTime() / 1000);
        }

        // 2. Dibujamos el borde derecho (la hora actual exacta al minuto)
        const pxAhora = x(ahora).toFixed(1);
        
        // Si la hora actual NO es exactamente en punto, le dibujamos su propia línea vertical
        if (minutosActuales !== 0) {
            lineasVerticales.push(`<line x1="${pxAhora}" y1="${padT}" x2="${pxAhora}" y2="${(padT + plotH).toFixed(1)}" stroke="#a4a4a4" stroke-width="0.5"/>`);
        }

        // Finalmente, el cronómetro siempre anclado a la hora actual (borde derecho).
        // Elevamos su coordenada Y a (H - 3) para evitar recortes inferiores del emoji.
        etiquetasX.push(`<text x="${pxAhora}" y="${H - 2}" text-anchor="middle" font-size="14"></text>`);


        // Flechas de dirección repartidas uniformemente (cambiar la cifra de Math.min(X...), que es el máximo "aproximado".. 1 o 2 más serán por el redondeo
        const numFlechas = Math.min(8, puntos.length);
        const paso = Math.max(1, Math.floor(puntos.length / numFlechas));
        const flechas = [];
        for (let i = 0; i < puntos.length; i += paso) {
            const p = puntos[i];
            if (typeof p.windDirection !== 'number') continue;
            const px = x(p.ts).toFixed(1);
            flechas.push(`
                <g transform="translate(${px}, ${padT - 16}) rotate(${p.windDirection + 180})">
                    <polygon points="0,-6.5 3.9,5.2 0,2.6 -3.9,5.2" fill="#5a9be4"/>
                </g>
            `);
        }

        return `
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block; width:100%; height:auto; max-width:280px; margin: 0 auto;">
                <defs>
                    <!-- Máscara de recorte que limita el dibujo exactamente al ancho útil de la gráfica (entre padL y plotW) -->
                    <clipPath id="plot-clip">
                        <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" />
                    </clipPath>
                </defs>
                ${gridLines}
                ${lineasVerticales.join('')}
                ${puntosLinea.length >= 2 ? `<polyline points="${lineaViento}" fill="none" stroke="#0078d4" stroke-width="2" clip-path="url(#plot-clip)"/>` : ''}
                ${puntosRachaLinea.length >= 2 ? `<polyline points="${lineaRacha}" fill="none" stroke="#c0392b" stroke-width="2" clip-path="url(#plot-clip)"/>` : ''}
                ${puntosVientoSvg}
                ${puntosRachaSvg}
                ${flechas.join('')}
                ${etiquetasX.join('')}
            </svg>
        `;
    }
    //___________________________________________________________________________________
    // 🏁 Fin Balizas


    // ==========================================================================
    // 🚀 REACTIVAR CAPA DESPEGUES AUTOMÁTICAMENTE AL USAR FILTROS
    // ==========================================================================
    let avisoReactivacionDespeguesMostrado = false; // solo una vez por sesión

    window.reactivarCapaDespeguesSiEstaOculta = function() {
        // Si el mapa no está visible en pantalla, abortamos al instante
        const vistaMapa = document.getElementById('vista-mapa');
        if (!vistaMapa || vistaMapa.style.display !== 'flex') return;

        const chk = document.getElementById('checkboxDespegues');

        // Si existe el checkbox y está desmarcado
        if (chk && !chk.checked) {
            chk.checked = true; // Lo volvemos a marcar visualmente

            // Añadimos la capa al mapa si existe y no está ya añadida
            if (typeof map !== 'undefined' && map && typeof clustergroupDespegues !== 'undefined') {
                if (!map.hasLayer(clustergroupDespegues)) {
                    map.addLayer(clustergroupDespegues);
                }
            }

            // Repoblamos el cluster con los marcadores reales (si no, queda vacío hasta tocar un filtro)
            if (typeof actualizarFiltrosMapa === 'function') actualizarFiltrosMapa();

            // Guardamos la preferencia, para que siga visible también tras recargar la página
            localStorage.setItem('METEO_MAPA_CAPA_DESPEGUES_VISIBLE', true);

            // Aviso flotante, solo la primera vez en esta sesión
            if (!avisoReactivacionDespeguesMostrado) {
                avisoReactivacionDespeguesMostrado = true;
                GestorMensajes.mostrar({
                    tipo: 'no-modal',
                    htmlContenido: `
                        <style>.mensaje-no-modal { max-width: 340px; width: max-content; top: 23%; left: 50% !important; right: auto !important; transform: translateX(-50%) !important; border: none; padding: 10px; font-size: 20px;}</style>
                        <p style="margin:0; padding:10px;line-height:1.3;">${t('mapa.despeguesReactivados', { defaultValue: 'Capa <i><icon-despegue></icon-despegue>Despegues</i> reactivada' })}</p>
                    `,
                    botones: []
                });
                setTimeout(() => GestorMensajes.ocultar(), 2500);
            }
        }
    };

    // Escuchamos cualquier clic, toque de pantalla o arrastre de ratón a nivel global
    ['mousedown', 'touchstart', 'click'].forEach(evtType => {
        document.addEventListener(evtType, function(e) {

            // Comprobamos si el elemento tocado está DENTRO de alguno de los contenedores de filtros
            const tocandoFiltros = e.target.closest('#infoPanel2') ||                    // Panel derecho de filtros
                               e.target.closest('#div-filtro-horario') ||             // Barra inferior de horas
                               e.target.closest('#wrapper-filtro-puntuacion-mapa') || // Barra de estrellas
                               e.target.closest('.leaflet-text-search-input') ||      // Buscador de despegues
                               e.target.closest('#btn-filtros-mapa');                 // Botón de ABRIR la meteorología

            // EXCEPCIÓN: Si estamos tocando el botón de CERRAR el filtro horario/meteo (o el panel de filtros general), NO reactivamos la capa de despegues.
            const tocandoBotonCerrar = e.target.closest('#btn-cerrar-filtros-mapa') || e.target.closest('#buttonCerrar2');

            if (tocandoFiltros && !tocandoBotonCerrar) {
                window.reactivarCapaDespeguesSiEstaOculta();
            }

        }, { capture: true, passive: true }); // "capture" asegura que lo detectamos antes de que otros scripts frenen el evento
    });

    if (typeof inicializarMasterCheckboxBalizas === 'function') {
        inicializarMasterCheckboxBalizas();
    }
    
} // Fin inicializarMapaLeaflet()

// --- DELEGADO GLOBAL PARA POPUPS DEL MAPA (MÁS INFO) ---
document.addEventListener('click', function(e) {
    // Buscamos si el clic ha sido en un elemento (o dentro de un elemento) con la clase 'popup-toggle-header'
    const toggleHeader = e.target.closest('.popup-toggle-header');
    
    if (toggleHeader) {
        // Encontramos el hermano que tiene el contenido oculto
        const content = toggleHeader.nextElementSibling;
        if (content && content.classList.contains('popup-collapsible-content')) {
            // Ocultamos el título y mostramos el contenido
            toggleHeader.style.display = 'none';
            content.style.display = 'block';
            
            // Si quieres que el popup de Leaflet se reajuste a la nueva altura, 
            // simulamos una pequeña actualización en el mapa
            if (typeof map !== 'undefined' && map.panBy) {
                map.panBy([0, 1]); // Micro-movimiento para forzar redibujado de la caja
            }
        }
    }
});

// ==========================================================================
// 🎛️ CONTROLADOR MAESTRO DE CHECKBOXES (BALIZAS) — VERSIÓN DINÁMICA
// ==========================================================================
function inicializarMasterCheckboxBalizas() {
    const masterChk = document.getElementById('checkboxMasterBalizas');
    if (!masterChk) return;

    // Buscamos todos los checkboxes de redes individuales de balizas
    const checkboxesHijos = document.querySelectorAll('#infoPanel3 input[type="checkbox"]:not(#checkboxMasterBalizas)');

    if (checkboxesHijos.length === 0) return;

    // 1. Sincronizar de MAESTRO a HIJOS (Marcar/Desmarcar todas)
    masterChk.addEventListener('change', function() {
        const nuevoEstado = this.checked;
        
        checkboxesHijos.forEach(chk => {
            if (chk.checked !== nuevoEstado) {
                chk.checked = nuevoEstado;
                // Forzamos el evento 'change' para que Leaflet dibuje/borre las balizas
                chk.dispatchEvent(new Event('change'));
            }
        });
    });

    // 2. Sincronizar de HIJOS a MAESTRO (Control del estado indeterminado [-])
    checkboxesHijos.forEach(chk => {
        chk.addEventListener('change', () => {
            const totalMarcados = Array.from(checkboxesHijos).filter(c => c.checked).length;

            if (totalMarcados === 0) {
                masterChk.checked = false;
                masterChk.indeterminate = false;
            } else if (totalMarcados === checkboxesHijos.length) {
                masterChk.checked = true;
                masterChk.indeterminate = false;
            } else {
                masterChk.checked = false;
                masterChk.indeterminate = true;
            }
        });
    });

    // 3. FORZAR EL ESTADO INICIAL AL ARRANCAR (Evita el autocompletado del navegador)
    const totalMarcadosInicial = Array.from(checkboxesHijos).filter(c => c.checked).length;
    
    if (totalMarcadosInicial === 0) {
        masterChk.checked = false;
        masterChk.indeterminate = false;
    } else if (totalMarcadosInicial === checkboxesHijos.length) {
        masterChk.checked = true;
        masterChk.indeterminate = false;
    } else {
        masterChk.checked = false;
        masterChk.indeterminate = true;
    }
}