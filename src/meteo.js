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

let chkMostrarCizalladura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA") !== "false"; // Por defecto true para que lo vean

// ECMWF
//let chkMostrarPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PRECIPITACION") !== "false";
const chkMostrarPrecipitacion = true; // Siempre activo
let chkMostrarProbPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION") !== "false";
//let chkMostrarBaseNube = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE") !== "false";
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
        chkMostrarXC = false;
        chkMostrarVientoEcmwf = false;
        chkMostrarVientoEcmwfDesplegable = false;
        chkMostrarBotonMinutely15 = false;
    } else {
        // En modo avanzado: Recuperamos la preferencia real del usuario desde la memoria
        chkMostrarVientoAlturas = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS") !== "false";
        chkMostrarCizalladura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA") !== "false";
        chkMostrarProbPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION") !== "false";
        chkMostrarXC = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_XC") !== "false";
        
        const modoEcmwfGuardado = localStorage.getItem("METEO_CONFIG_ECMWF_MODE") || "off";
        chkMostrarVientoEcmwf = (modoEcmwfGuardado === "permanente");
        chkMostrarVientoEcmwfDesplegable = (modoEcmwfGuardado === "desplegable");
        chkMostrarBotonMinutely15 = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_MINUTELY15") === "true";
    }

    // Sincronizar los checkboxes ocultos del menú Ajustes
    if (document.getElementById("chkMostrarVientoAlturas")) document.getElementById("chkMostrarVientoAlturas").checked = chkMostrarVientoAlturas;
    if (document.getElementById("chkMostrarCizalladura")) document.getElementById("chkMostrarCizalladura").checked = chkMostrarCizalladura;
    if (document.getElementById("chkMostrarProbPrecipitacion")) document.getElementById("chkMostrarProbPrecipitacion").checked = chkMostrarProbPrecipitacion;
    if (document.getElementById("chkMostrarXC")) document.getElementById("chkMostrarXC").checked = chkMostrarXC;
    if (document.getElementById("chkMostrarBotonMinutely15")) document.getElementById("chkMostrarBotonMinutely15").checked = chkMostrarBotonMinutely15;

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

// ---------------------------------------------------------------
// 🔴 MINUTELY_15 (AROME HD) — Detalle de viento cada 15 min
// ---------------------------------------------------------------
let DATOS_METEO_MINUTELY15_CACHE = null;

async function obtenerDatosMinutely15() {
    if (DATOS_METEO_MINUTELY15_CACHE) return DATOS_METEO_MINUTELY15_CACHE;
    const res = await fetch(`https://flydecision.com/meteo-datos-15min.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const datos = await res.json();
    DATOS_METEO_MINUTELY15_CACHE = datos;
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
                <p style="font-size: 1.2em; font-weight: bold; text-align:center; margin-bottom: 10px;">🪂 ${nombreDespegue}</p>
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
function actualizarContenidoPopupGuardado(id, esFavorito, esSeguimiento) {
    if (typeof markersDespegues === 'undefined' || markersDespegues.length === 0) return;

    // Buscamos el marcador del despegue correspondiente
    const marker = markersDespegues.find(m => m.metadata && Number(m.metadata.id) === Number(id));
    if (!marker) return;

    const popup = marker.getPopup();
    if (!popup) return;

    const content = popup.getContent();
    if (!content) return;

    // Creamos un div temporal para manipular el HTML estático de Leaflet
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = typeof content === 'string' ? content : content.innerHTML;

    // 1. Sincronizar Favorito en la plantilla estática
    if (esFavorito !== undefined) {
        const btnFav = tempDiv.querySelector('.btn-favorito-tabla');
        if (btnFav) {
            btnFav.title = esFavorito ? t('favoritos.despegueFavorito') : t('favoritos.anadirAFavoritos');
            const svgFav = btnFav.querySelector('svg');
            if (svgFav) {
                svgFav.setAttribute('fill', esFavorito ? '#e00' : 'none');
                svgFav.setAttribute('stroke', esFavorito ? '#e00' : '#555');
            }
        }
    }

    // 2. Sincronizar Seguimiento en la plantilla estática
    if (esSeguimiento !== undefined) {
        const btnSeg = tempDiv.querySelector('.btn-ojo-tabla');
        if (btnSeg) {
            btnSeg.title = esSeguimiento ? t('seguimiento.activar_desactivar') : t('seguimiento.activar_desactivar');
            actualizarVistaOjo(btnSeg, esSeguimiento);
        }
    }

    // Volvemos a guardar la plantilla limpia dentro de Leaflet
    popup.setContent(tempDiv.innerHTML);
}

window.toggleFavoritoDesdeTabla = function(id, btnElement) {
    const esFavoritoActual = obtenerFavoritos().map(Number).includes(Number(id));

    const ejecutarCambioDOM = () => {
        const esNuevoFavorito = toggleFavorito(id); 

        window.vibrarDispositivo();
        
        // Sincronizar la plantilla estática interna de Leaflet inmediatamente
        actualizarContenidoPopupGuardado(id, esNuevoFavorito, undefined);

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

    // Sincronizar la plantilla estática interna de Leaflet inmediatamente
    actualizarContenidoPopupGuardado(id, undefined, esNuevo);

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

// function alternarMostrarBaseNube() {
//     chkMostrarBaseNube = document.getElementById("chkMostrarBaseNube").checked;
//     localStorage.setItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE", chkMostrarBaseNube);
//     construir_tabla();
// }

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
                        // MODIFICACIÓN: Ahora permitimos también i18nextLng
                        if (key.startsWith("METEO_") || key === "i18nextLng") {
                            localStorage.setItem(key, perfilImportado[key]);
                            
                            // Solo contamos las de la app para la verificación de éxito
                            if (key.startsWith("METEO_")) {
                                keysImportadas++;
                            }
                        }
                    }

                    if (keysImportadas > 0) {
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
                        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🪂</div>
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
                localStorage.setItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA", "true");
                chkMostrarCizalladura = true;
                if (document.getElementById("chkMostrarCizalladura")) document.getElementById("chkMostrarCizalladura").checked = true; 
                
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

            let filaPreci, filaProbPreci;
            if (chkMostrarPrecipitacion) filaPreci = document.createElement("tr");
            if (chkMostrarProbPrecipitacion) filaProbPreci = document.createElement("tr");

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

            const rowsGroup1 =[filaNubesTotal, filaPreci, filaProbPreci, fila180, fila120, fila80, filaVel, filaRacha, filaDir, filaCizalladura].filter(Boolean);
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
                    <b><span style='font-size: 20px; padding-right: 20px; max-width: 212px; display: inline-block;'>🪂 ${d.Despegue}</b></span><br><br>   
                    
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
                                td.title = titleFn(val, i);
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
                                let title = "";
                                if (v != null) title += "Nubosidad total: " + Math.round(Number(v)) + "% cobertura";
                                let preci = (hourlyEcmwf.precipitation && hourlyEcmwf.precipitation[i] != null) ? Number(hourlyEcmwf.precipitation[i]) : 0;
                                if (preci > 0) title += (title ? "\n" : "") + "Lluvia: " + preci.toFixed(1) + " mm (litros/m²)";
                                return title;
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
                        
                    } else {
                        const emptyArr = new Array(horas.length).fill(null);
                        renderEcmwfData(filaNubesTotal, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaPreci, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaProbPreci, emptyArr, () => "", "9px", () => "");
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

                            // === 1. TECHO ===
                            let vTecho = hourlyEcmwf.boundary_layer_height[i];
                            let txtTecho = "", colorTecho = "", bgTecho = "", titleTecho = "";
                            
                            if (vTecho != null) {
                                let espesorBLH = Math.round(Number(vTecho));
                                let espesorUtil = Math.round(espesorBLH * RATIO_TECHO_UTIL);
                                let altitudMSL = Math.round(espesorUtil + elevacionModeloECMWF);
                                
                                let valorTexto = (altitudMSL / 1000).toFixed(1);
                                txtTecho = (valorTexto === "0.0") ? "0" : valorTexto;
                                
                                if (espesorUtil < XCTechoLims.rojo) colorTecho = "fondo-rojo";
                                else if (espesorUtil >= XCTechoLims.verde) colorTecho = "fondo-verde";
                                else colorTecho = "fondo-naranja";

                                const textoTooltipOriginal = t('tabla.techoTooltip', {
                                    altitudMSL: altitudMSL,
                                    espesorUtil: espesorUtil,
                                    pct: Math.round(RATIO_TECHO_UTIL * 100),
                                    blh: espesorBLH,
                                    elevacion: Math.round(elevacionModeloECMWF)
                                });

                                // Protegemos el texto por si tiene comillas que puedan romper el atributo HTML
                                titleTecho = `title="${textoTooltipOriginal.replace(/"/g, '&quot;')}"`;
                            }
                            bgTecho = (!cacheEsNoche[i] && !colorTecho) ? 'background-color: #ffffff;' : '';
                            htmlTecho += `<td class="${clasesBase} ${colorTecho}" style="padding-bottom: 0px; font-size: 12px !important; ${bgTecho}" ${titleTecho}>${txtTecho}</td>`;

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

                        // Inyección ultra-rápida (El DOM se toca 1 sola vez por fila)
                        if (filaTecho) filaTecho.insertAdjacentHTML('beforeend', htmlTecho);
                        if (filaCape) filaCape.insertAdjacentHTML('beforeend', htmlCape);
                        if (filaCin) filaCin.insertAdjacentHTML('beforeend', htmlCin);

                    } else {
                        // Si no hay datos, metemos celdas vacías como texto (mucho más rápido que antes)
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

                // infoPanel (Capas) 
                const infoPanelCerrar = document.getElementById('infoPanel');
                if (infoPanelCerrar && !infoPanelCerrar.classList.contains('retraido')) {
                    document.getElementById('buttonCerrar')?.click();
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
                //console.log("⏳ Datos locales antiguos (>2h). Comprobando servidor...");
                
                statusActualizaciónEnCurso = false; 
                mostrarLoading(); // Mostramos spinner por si acaso
                
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
    // FUNCIÓN PARA GESTIONAR EL ESTADO VISUAL DE LOS CONTROLES
    function actualizarEstadoVisualFiltros() {

        // 1. COMPROBAR ESTADO DE LOS FILTROS EN EL MAPA

        // 🔴 CORRECCIÓN: Leemos directamente la variable lógica de memoria (evita fallos por orden de carga de los sliders)
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
    /*         container.style.background = 'white';
            container.style.padding = '0px';
            container.style.minWidth = '107px';
            container.style.position = 'relative'; // Necesario para posicionar la lista
            height: '30px';
    */
            container.style.zIndex = '1000'; // Asegura que la lista esté por encima del mapa
            container.style.height = '30px';

            // --- Campo de Búsqueda (Input) ---
            const input = L.DomUtil.create('input', 'leaflet-text-search-input', container);
            const originalPlaceholder = t('mapa.buscadorDespegue');
            input.type = 'search';
            input.placeholder = t('mapa.buscadorDespegue');
            input.title = t('mapa.titleBuscadorDespegue');

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

    // 🟡 CONTROL "infoPanel" (Capas)
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
                iconSize: L.point(40, 40)
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
                            <b><span style='font-size: 20px; padding-right: 20px; max-width: 212px; display: inline-block;'>🪂 ${escapeHtml(despegue)}</b></span><br>
                            
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
                        // Usamos zoomToShowLayer por si el despegue está dentro de un grupo (cluster)
                        clustergroupDespegues.zoomToShowLayer(despegueEncontrado, function() {
                            // Dejamos que Leaflet haga el centrado automático con los 160px de margen que añadimos al popup
                            despegueEncontrado.openPopup();
                        });
                    }, 600); // Pequeña pausa para asegurar que los clusters están dibujados
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
                alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
                // 🚀 NUEVO: Si la red falla y no carga el CSV, también apagamos el spinner
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
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>🪂🪂🪂🪂🪂<br>${count} Despegues en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas medias:<br><b>${lat.toFixed(4)}, ${lon.toFixed(4)}</b></div>
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
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>🪂<br>Despegue en XContest</b></div>
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
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>🪂🪂🪂🪂🪂<br>${count} Despegues en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas medias:<br><b>${lat.toFixed(4)}, ${lon.toFixed(4)}</b></div>
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
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>🪂<br>Despegue en XContest</b></div>
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
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>🪂🪂🪂🪂🪂<br>${count} Despegues en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas medias:<br><b>${lat.toFixed(4)}, ${lon.toFixed(4)}</b></div>
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
                        <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px;"><b>🪂<br>Despegue en XContest</b></div>
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
                iconSize: L.point(40, 40)
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
    alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
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
                iconSize: L.point(40, 40)
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
            
                    <div style="font-size: 1.3em; margin-bottom: 5px; padding-right: 20px; max-width: 212px; display: inline-block;"><b>🪂 ${escapeHtml(despegue)}</b></div>
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
        alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
        }

        });
        
    }	

    //___________________________________________________________________________________

    // 🔴 PANEL CAPAS Y FILTROS
    //___________________________________________________________________________________


    let isFijado = false; 
    let buttonFijar, buttonCerrar, iconoFijar, infoPanel, divOpciones, labelMostrarOpciones;

    let isFijado2 = false; 
    let buttonFijar2, buttonCerrar2, iconoFijar2, infoPanel2, divOpciones2, labelMostrarOpciones2;

    //  1. Inicialización de variables locales PANEL 1 (Capas)
    infoPanel = document.getElementById('infoPanel');
    buttonFijar = document.getElementById('buttonFijar');
    buttonCerrar = document.getElementById('buttonCerrar');
    iconoFijar = document.getElementById('iconoFijar');
    divOpciones = document.getElementById('divOpciones');
    labelMostrarOpciones = document.getElementById('labelMostrarOpciones'); 

    //  1.1 Inicialización de variables locales PANEL 2 (Filtros)
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

    //  2.1 Lógica de Inicialización y Listeners DOM/LEAFLET (Panel 2)
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
        retraerOpciones2();
    });
    
    map.on('moveend', function() {
        const input = document.querySelector('.leaflet-text-search-input');
        const autocompleteList = document.querySelector('.autocomplete-list');
        if (input) input.value = '';
        if (autocompleteList) autocompleteList.style.display = 'none';		
        
        retraerOpciones();
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
        //labelMostrarOpciones.style.display = 'block';
        L.DomEvent.on(infoPanel, 'click', expandirAlClicar);
    }
    function expandirOpciones() {
        if (!infoPanel) return;
        divOpciones.classList.remove('oculto');
        infoPanel.classList.remove('retraido');
        //labelMostrarOpciones.style.display = 'none';
        L.DomEvent.off(infoPanel, 'click', expandirAlClicar);	
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
        //labelMostrarOpciones2.style.display = 'block';
        L.DomEvent.on(infoPanel2, 'click', expandirAlClicar2);
    }
    function expandirOpciones2() {
        if (!infoPanel2) return;
        divOpciones2.classList.remove('oculto');
        infoPanel2.classList.remove('retraido');
        //labelMostrarOpciones2.style.display = 'none';
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

    // 🟡 1. BASES DE DATOS DE ESTACIONES
    //___________________________________________________________________________________

    const ESTACIONES_EUSKALMET = 
    [
        {"id":"B090","name":"Puerto de Bilbao","provider":"Euskalmet","latitude":43.3774903,"longitude":-3.08474},
        {"id":"B096","name":"Puerto de Pasaia","provider":"Euskalmet","latitude":43.3370283,"longitude":-1.92752},
        {"id":"C002","name":"Arteaga","provider":"Euskalmet","latitude":43.347,"longitude":-2.65714},
        {"id":"C007","name":"Santa Clara","provider":"Euskalmet","latitude":43.3218,"longitude":-1.99834},
        {"id":"C00A","name":"Kanpezu","provider":"Euskalmet","latitude":42.6754,"longitude":-2.34148},
        {"id":"C00B","name":"Tobillas","provider":"Euskalmet","latitude":42.8992,"longitude":-3.1828},
        {"id":"C00C","name":"Goiain","provider":"Euskalmet","latitude":42.944472,"longitude":-2.6415097},
        {"id":"C016","name":"Arkauti","provider":"Euskalmet","latitude":42.854275,"longitude":-2.621833},
        {"id":"C017","name":"Miramon","provider":"Euskalmet","latitude":43.2868,"longitude":-1.97121},
        {"id":"C018","name":"Higer","provider":"Euskalmet","latitude":43.3913,"longitude":-1.79615},
        {"id":"C019","name":"Matxitxako","provider":"Euskalmet","latitude":43.4375,"longitude":-2.7636},
        {"id":"C020","name":"Trebiño","provider":"Euskalmet","latitude":42.7180163,"longitude":-2.70141},
        {"id":"C021","name":"Roitegi","provider":"Euskalmet","latitude":42.7817,"longitude":-2.371},
        {"id":"C022","name":"Urkiola","provider":"Euskalmet","latitude":43.1,"longitude":-2.64658},
        {"id":"C023","name":"Arrasate","provider":"Euskalmet","latitude":43.0695849,"longitude":-2.49308},
        {"id":"C024","name":"Iturrieta","provider":"Euskalmet","latitude":42.7935945,"longitude":-2.34575},
        {"id":"C025","name":"Beluntza","provider":"Euskalmet","latitude":42.9615782,"longitude":-2.89361},
        {"id":"C026","name":"Berastegi","provider":"Euskalmet","latitude":43.1248,"longitude":-1.98168},
        {"id":"C028","name":"Zegama","provider":"Euskalmet","latitude":42.9588,"longitude":-2.29852},
        {"id":"C029","name":"Zizurkil","provider":"Euskalmet","latitude":43.1901,"longitude":-2.06181},
        {"id":"C030","name":"Salvatierra","provider":"Euskalmet","latitude":42.8582,"longitude":-2.39538},
        {"id":"C031","name":"Moreda","provider":"Euskalmet","latitude":42.5303,"longitude":-2.41023},
        {"id":"C032","name":"Areta","provider":"Euskalmet","latitude":43.1394,"longitude":-2.93531},
        {"id":"C033","name":"Igorre","provider":"Euskalmet","latitude":43.1686,"longitude":-2.7842},
        {"id":"C034","name":"Espejo","provider":"Euskalmet","latitude":42.8078,"longitude":-3.04103},
        {"id":"C035","name":"Altube","provider":"Euskalmet","latitude":42.9661,"longitude":-2.86795},
        {"id":"C036","name":"Iurreta","provider":"Euskalmet","latitude":43.1769,"longitude":-2.622},
        {"id":"C037","name":"Venta Alta","provider":"Euskalmet","latitude":43.2145,"longitude":-2.89976},
        {"id":"C038","name":"Galindo","provider":"Euskalmet","latitude":43.3042,"longitude":-2.99878},
        {"id":"C03A","name":"Zorrotza","provider":"Euskalmet","latitude":43.28498,"longitude":-2.968458},
        {"id":"C040","name":"Gasteiz","provider":"Euskalmet","latitude":42.8604,"longitude":-2.68899},
        {"id":"C041","name":"Navarrete","provider":"Euskalmet","latitude":42.638,"longitude":-2.52321},
        {"id":"C042","name":"Punta Galea","provider":"Euskalmet","latitude":43.37326,"longitude":-3.03604},
        {"id":"C043","name":"Ordizia","provider":"Euskalmet","latitude":43.0484,"longitude":-2.17755},
        {"id":"C045","name":"La Garbea","provider":"Euskalmet","latitude":43.217,"longitude":-3.19368},
        {"id":"C046","name":"Oiz","provider":"Euskalmet","latitude":43.2304,"longitude":-2.5954},
        {"id":"C047","name":"Kapildui","provider":"Euskalmet","latitude":42.768,"longitude":-2.53785},
        {"id":"C048","name":"Herrera","provider":"Euskalmet","latitude":42.5978,"longitude":-2.67616},
        {"id":"C049","name":"Subijana","provider":"Euskalmet","latitude":42.8196,"longitude":-2.89328},
        {"id":"C050","name":"Zambrana","provider":"Euskalmet","latitude":42.6751,"longitude":-2.8869},
        {"id":"C051","name":"Saratxo","provider":"Euskalmet","latitude":43.0342,"longitude":-3.00398},
        {"id":"C054","name":"Otxandio","provider":"Euskalmet","latitude":43.0423,"longitude":-2.65763},
        {"id":"C056","name":"Alegría","provider":"Euskalmet","latitude":42.8447,"longitude":-2.52402},
        {"id":"C057","name":"Mungia","provider":"Euskalmet","latitude":43.363,"longitude":-2.84702},
        {"id":"C058","name":"Bidania","provider":"Euskalmet","latitude":43.146,"longitude":-2.15502},
        {"id":"C059","name":"Ordunte","provider":"Euskalmet","latitude":43.1623,"longitude":-3.28404},
        {"id":"C060","name":"Páganos","provider":"Euskalmet","latitude":42.5605,"longitude":-2.60055},
        {"id":"C061","name":"Arboleda","provider":"Euskalmet","latitude":43.2967,"longitude":-3.06747},
        {"id":"C064","name":"Zarautz","provider":"Euskalmet","latitude":43.28974,"longitude":-2.14399},
        {"id":"C065","name":"Cerroja","provider":"Euskalmet","latitude":43.2112,"longitude":-3.40713},
        {"id":"C066","name":"Untzueta","provider":"Euskalmet","latitude":43.1372,"longitude":-2.9071},
        {"id":"C067","name":"Gardea","provider":"Euskalmet","latitude":43.1272,"longitude":-2.98025},
        {"id":"C068","name":"Ilarduia","provider":"Euskalmet","latitude":42.87395,"longitude":-2.28623},
        {"id":"C069","name":"Almike (Bermeo)","provider":"Euskalmet","latitude":43.4137,"longitude":-2.73229},
        {"id":"C070","name":"Zaldiaran","provider":"Euskalmet","latitude":42.79476,"longitude":-2.73620},  
        {"id":"C071","name":"Jaizkibel","provider":"Euskalmet","latitude":43.3446,"longitude":-1.85972},
        {"id":"C072","name":"Orduña","provider":"Euskalmet","latitude":42.9837,"longitude":-3.03726},
        {"id":"C073","name":"Mallabia","provider":"Euskalmet","latitude":43.1926263,"longitude":-2.5295246},
        {"id":"C0AA","name":"Etura","provider":"Euskalmet","latitude":42.8878,"longitude":-2.50361},
        {"id":"C0AB","name":"Nanclares","provider":"Euskalmet","latitude":42.7934862,"longitude":-2.8239093},
        {"id":"C0B4","name":"Orozko","provider":"Euskalmet","latitude":43.0864,"longitude":-2.91543},
        {"id":"C0C3","name":"Sodupe-Cadagua","provider":"Euskalmet","latitude":43.2025,"longitude":-3.0493},
        {"id":"C0EC","name":"Lasarte","provider":"Euskalmet","latitude":43.2527,"longitude":-2.02109},
        {"id":"C0F0","name":"Ereñozu","provider":"Euskalmet","latitude":43.242,"longitude":-1.93922}
    ];

    const ESTACIONES_AEMET = 
    [
        {"id":"B013X","name":"Escorca, Lluc","provider":"Aemet","latitude":39.823333,"longitude":2.885833},
        {"id":"B051A","name":"Sóller, Puerto","provider":"Aemet","latitude":39.795556,"longitude":2.691389},
        {"id":"B087X","name":"Banyalbufar","provider":"Aemet","latitude":39.689167,"longitude":2.512778},
        {"id":"B103B","name":"Andratx - Sant Elm","provider":"Aemet","latitude":39.579444,"longitude":2.368889},
        {"id":"B158X","name":"Calvià, Es Capdellà","provider":"Aemet","latitude":39.551389,"longitude":2.466389},
        {"id":"B228","name":"Palma, Puerto","provider":"Aemet","latitude":39.554167,"longitude":2.625278},
        {"id":"B236C","name":"Palma, Universitat","provider":"Aemet","latitude":39.642222,"longitude":2.643889},
        {"id":"B275E","name":"Son Bonet, Aeropuerto","provider":"Aemet","latitude":39.605833,"longitude":2.706667},
        {"id":"B278","name":"Palma De Mallorca, Aeropuerto","provider":"Aemet","latitude":39.560833,"longitude":2.736667},
        {"id":"B301","name":"Llucmajor, Cap Blanc","provider":"Aemet","latitude":39.379722,"longitude":2.785},
        {"id":"B341X","name":"Porreres","provider":"Aemet","latitude":39.506111,"longitude":3.005556},
        {"id":"B362X","name":"Campos, Can Sion","provider":"Aemet","latitude":39.405833,"longitude":3.064167},
        {"id":"B373X","name":"Campos, Salines Llevant","provider":"Aemet","latitude":39.351111,"longitude":3.011944},
        {"id":"B398A","name":"Cabrera, Parque Nacional De Cabrera","provider":"Aemet","latitude":39.135556,"longitude":2.936667},
        {"id":"B410B","name":"Santanyí","provider":"Aemet","latitude":39.34,"longitude":3.145833},
        {"id":"B434X","name":"Portocolom","provider":"Aemet","latitude":39.414444,"longitude":3.271667},
        {"id":"B496X","name":"Son Servera","provider":"Aemet","latitude":39.630278,"longitude":3.383611},
        {"id":"B569X","name":"Capdepera","provider":"Aemet","latitude":39.716667,"longitude":3.478056},
        {"id":"B605X","name":"Muro, S'Albufera","provider":"Aemet","latitude":39.796667,"longitude":3.104722},
        {"id":"B614E","name":"Manacor","provider":"Aemet","latitude":39.556944,"longitude":3.217778},
        {"id":"B640X","name":"Petra","provider":"Aemet","latitude":39.616389,"longitude":3.121111},
        {"id":"B644B","name":"Sineu","provider":"Aemet","latitude":39.643333,"longitude":3.002222},
        {"id":"B656A","name":"Santa María Del Camí","provider":"Aemet","latitude":39.6525,"longitude":2.800278},
        {"id":"B662X","name":"Binissalem","provider":"Aemet","latitude":39.678056,"longitude":2.873889},
        {"id":"B691Y","name":"Sa Pobla","provider":"Aemet","latitude":39.749167,"longitude":3.016667},
        {"id":"B760X","name":"Pollença","provider":"Aemet","latitude":39.876944,"longitude":3.024167},
        {"id":"B780X","name":"Port De Pollença","provider":"Aemet","latitude":39.909444,"longitude":3.100278},
        {"id":"B800X","name":"La Mola, Maó","provider":"Aemet","latitude":39.876111,"longitude":4.323889},
        {"id":"B825B","name":"Es Mercadal","provider":"Aemet","latitude":39.990556,"longitude":4.086389},
        {"id":"B870C","name":"Ciutadella, Cala Galdana","provider":"Aemet","latitude":39.944722,"longitude":3.956667},
        {"id":"B893","name":"Menorca, Aeropuerto","provider":"Aemet","latitude":39.854722,"longitude":4.215556},
        {"id":"B925","name":"Sant Antoni De Portmany","provider":"Aemet","latitude":38.963056,"longitude":1.321389},
        {"id":"B954","name":"Ibiza, Aeropuerto","provider":"Aemet","latitude":38.876389,"longitude":1.384444},
        {"id":"B957","name":"Eivissa","provider":"Aemet","latitude":38.9225,"longitude":1.441389},
        {"id":"B986","name":"Formentera","provider":"Aemet","latitude":38.693611,"longitude":1.463611},
        {"id":"C018J","name":"Tías","provider":"Aemet","latitude":28.969722,"longitude":-13.690278},
        {"id":"C019V","name":"Yaiza Playa Blanca","provider":"Aemet","latitude":28.858889,"longitude":-13.835},
        {"id":"C029O","name":"Lanzarote Aeropuerto","provider":"Aemet","latitude":28.951944,"longitude":-13.600278},
        {"id":"C038N","name":"Haría","provider":"Aemet","latitude":29.143611,"longitude":-13.489167},
        {"id":"C048W","name":"Tinajo","provider":"Aemet","latitude":29.0425,"longitude":-13.680833},
        {"id":"C101A","name":"Roque De Los Muchachos","provider":"Aemet","latitude":28.755833,"longitude":-17.895278},
        {"id":"C117A","name":"Puntagorda","provider":"Aemet","latitude":28.760556,"longitude":-17.985556},
        {"id":"C117Z","name":"Tijarafe","provider":"Aemet","latitude":28.674722,"longitude":-17.936667},
        {"id":"C129V","name":"Fuencaliente","provider":"Aemet","latitude":28.455,"longitude":-17.841111},
        {"id":"C139E","name":"La Palma Aeropuerto","provider":"Aemet","latitude":28.633056,"longitude":-17.755},
        {"id":"C148F","name":"San Andrés Y Sauces","provider":"Aemet","latitude":28.804722,"longitude":-17.782222},
        {"id":"C229J","name":"Pájara","provider":"Aemet","latitude":28.049167,"longitude":-14.358056},
        {"id":"C239N","name":"Tuineje, Puerto Gran Tarajal","provider":"Aemet","latitude":28.208611,"longitude":-14.023056},
        {"id":"C249I","name":"Fuerteventura Aeropuerto","provider":"Aemet","latitude":28.444722,"longitude":-13.863056},
        {"id":"C258K","name":"La Oliva","provider":"Aemet","latitude":28.6125,"longitude":-13.931667},
        {"id":"C314Z","name":"Vallehermoso, Alto Igualero","provider":"Aemet","latitude":28.106944,"longitude":-17.249167},
        {"id":"C316I","name":"Arure","provider":"Aemet","latitude":28.128333,"longitude":-17.315},
        {"id":"C317B","name":"Agulo","provider":"Aemet","latitude":28.178889,"longitude":-17.213056},
        {"id":"C319W","name":"Vallehermoso, Dama","provider":"Aemet","latitude":28.054167,"longitude":-17.306389},
        {"id":"C328W","name":"Hermigua","provider":"Aemet","latitude":28.163611,"longitude":-17.194167},
        {"id":"C329Z","name":"San Sebastián De La Gomera","provider":"Aemet","latitude":28.089722,"longitude":-17.111389},
        {"id":"C406G","name":"La Orotava, Cañadas Teide","provider":"Aemet","latitude":28.224167,"longitude":-16.626111},
        {"id":"C419L","name":"Lomo Del Balo","provider":"Aemet","latitude":28.206944,"longitude":-16.791944},
        {"id":"C428T","name":"Arico","provider":"Aemet","latitude":28.180833,"longitude":-16.483333},
        {"id":"C429I","name":"Tenerife Sur Aeropuerto","provider":"Aemet","latitude":28.046944,"longitude":-16.561111},
        {"id":"C430E","name":"Izaña","provider":"Aemet","latitude":28.308333,"longitude":-16.499722},
        {"id":"C438N","name":"Candelaria","provider":"Aemet","latitude":28.359167,"longitude":-16.401667},
        {"id":"C439J","name":"Güímar","provider":"Aemet","latitude":28.318333,"longitude":-16.382222},
        {"id":"C446G","name":"San Cristóbal De La Laguna, Llano De Los Loros","provider":"Aemet","latitude":28.526389,"longitude":-16.280278},
        {"id":"C447A","name":"Tenerife Norte Aeropuerto","provider":"Aemet","latitude":28.4775,"longitude":-16.329444},
        {"id":"C449C","name":"Sta.cruz De Tenerife","provider":"Aemet","latitude":28.463333,"longitude":-16.255278},
        {"id":"C449F","name":"Anaga","provider":"Aemet","latitude":28.508056,"longitude":-16.195556},
        {"id":"C457I","name":"La Victoria De Acentejo","provider":"Aemet","latitude":28.434444,"longitude":-16.454444},
        {"id":"C458A","name":"Tacoronte","provider":"Aemet","latitude":28.496389,"longitude":-16.42},
        {"id":"C468X","name":"San Juan De La Rambla","provider":"Aemet","latitude":28.373056,"longitude":-16.625833},
        {"id":"C612F","name":"Tejeda, Cruz De Tejeda","provider":"Aemet","latitude":28.006944,"longitude":-15.598889},
        {"id":"C614H","name":"Tejeda","provider":"Aemet","latitude":27.995,"longitude":-15.615833},
        {"id":"C619X","name":"Agaete","provider":"Aemet","latitude":28.101111,"longitude":-15.712778},
        {"id":"C619Y","name":"La Aldea De San Nicolás","provider":"Aemet","latitude":28.001111,"longitude":-15.8075},
        {"id":"C623I","name":"San Bartolome Tirajana, Cuevas Del Pinar","provider":"Aemet","latitude":27.926667,"longitude":-15.599722},
        {"id":"C625O","name":"San Bartolome Tirajana, Lomo Pedro Alfonso","provider":"Aemet","latitude":27.856944,"longitude":-15.645},
        {"id":"C628B","name":"La Aldea De San Nicolás, Tasarte","provider":"Aemet","latitude":27.908889,"longitude":-15.77},
        {"id":"C629Q","name":"Mogán, Puerto Rico","provider":"Aemet","latitude":27.78,"longitude":-15.711111},
        {"id":"C629X","name":"Mogán, Puerto","provider":"Aemet","latitude":27.816389,"longitude":-15.764167},
        {"id":"C635B","name":"San Bartolome Tirajana, Las Tirajanas","provider":"Aemet","latitude":27.92,"longitude":-15.574167},
        {"id":"C639M","name":"Maspalomas, C. Insular Turismo","provider":"Aemet","latitude":27.758056,"longitude":-15.575556},
        {"id":"C639U","name":"San Bartolome Tirajana, El Matorral","provider":"Aemet","latitude":27.8125,"longitude":-15.453056},
        {"id":"C648C","name":"Agüimes","provider":"Aemet","latitude":27.9025,"longitude":-15.453889},
        {"id":"C648N","name":"Telde, Centro Forestal Doramas","provider":"Aemet","latitude":27.9875,"longitude":-15.457778},
        {"id":"C649I","name":"Gran Canaria Aeropuerto","provider":"Aemet","latitude":27.917778,"longitude":-15.395278},
        {"id":"C649R","name":"Telde, Melenara","provider":"Aemet","latitude":27.986667,"longitude":-15.377778},
        {"id":"C656V","name":"Teror","provider":"Aemet","latitude":28.075278,"longitude":-15.547222},
        {"id":"C658X","name":"Las Palmas De Gran Canaria, Tafira","provider":"Aemet","latitude":28.078056,"longitude":-15.453333},
        {"id":"C659M","name":"Las Palmas De Gran Canaria, Pl. De La Feria","provider":"Aemet","latitude":28.113056,"longitude":-15.421389},
        {"id":"C665T","name":"Valleseco","provider":"Aemet","latitude":28.065556,"longitude":-15.565556},
        {"id":"C668V","name":"Agaete - Suerte Alta","provider":"Aemet","latitude":28.094444,"longitude":-15.675},
        {"id":"C669B","name":"Arucas","provider":"Aemet","latitude":28.141667,"longitude":-15.506667},
        {"id":"C689E","name":"Maspalomas","provider":"Aemet","latitude":27.735833,"longitude":-15.595833},
        {"id":"C839X","name":"La Graciosa","provider":"Aemet","latitude":29.229722,"longitude":-13.510278},
        {"id":"C916Q","name":"El Pinar, Depósito","provider":"Aemet","latitude":27.718889,"longitude":-17.978056},
        {"id":"C917E","name":"El Pinar, La Dehesa","provider":"Aemet","latitude":27.725278,"longitude":-18.115},
        {"id":"C919K","name":"Tacoron-lapillas-tortuga","provider":"Aemet","latitude":27.665278,"longitude":-18.018611},
        {"id":"C925F","name":"San Andrés, Valverde","provider":"Aemet","latitude":27.768889,"longitude":-17.960278},
        {"id":"C928I","name":"Valverde","provider":"Aemet","latitude":27.810833,"longitude":-17.919444},
        {"id":"C929I","name":"Hierro Aeropuerto","provider":"Aemet","latitude":27.818889,"longitude":-17.888889},
        {"id":"C939T","name":"Frontera, Sabinosa","provider":"Aemet","latitude":27.756389,"longitude":-18.1075},
        {"id":"0002I","name":"Vandellòs","provider":"Aemet","latitude":40.958056,"longitude":0.871389},
        {"id":"0009X","name":"Alforja","provider":"Aemet","latitude":41.213889,"longitude":0.963333},
        {"id":"0016A","name":"Reus Aeropuerto","provider":"Aemet","latitude":41.145,"longitude":1.163611},
        {"id":"0042Y","name":"Tarragona","provider":"Aemet","latitude":41.123889,"longitude":1.249167},
        {"id":"0061X","name":"Pontons","provider":"Aemet","latitude":41.416944,"longitude":1.519167},
        {"id":"0066X","name":"Vilafranca Del Penedès","provider":"Aemet","latitude":41.330278,"longitude":1.676944},
        {"id":"0073X","name":"Sitges","provider":"Aemet","latitude":41.243889,"longitude":1.8525},
        {"id":"0076","name":"Barcelona Aeropuerto","provider":"Aemet","latitude":41.292778,"longitude":2.07},
        {"id":"0092X","name":"Berga","provider":"Aemet","latitude":42.101389,"longitude":1.8575},
        {"id":"0106X","name":"Balsareny","provider":"Aemet","latitude":41.866389,"longitude":1.8725},
        {"id":"0114X","name":"Prats De Lluçanès","provider":"Aemet","latitude":42.006944,"longitude":2.026667},
        {"id":"0120X","name":"Moià","provider":"Aemet","latitude":41.813333,"longitude":2.095278},
        {"id":"0149X","name":"Manresa","provider":"Aemet","latitude":41.72,"longitude":1.840278},
        {"id":"0201X","name":"Barcelona, Drassanes","provider":"Aemet","latitude":41.375,"longitude":2.173889},
        {"id":"0222X","name":"Caldes De Montbui","provider":"Aemet","latitude":41.612778,"longitude":2.168333},
        {"id":"0244X","name":"Vilassar De Dalt","provider":"Aemet","latitude":41.505,"longitude":2.3625},
        {"id":"0284X","name":"Castell D'aro","provider":"Aemet","latitude":41.807778,"longitude":3.030833},
        {"id":"0312X","name":"Sant Pau De Segúries","provider":"Aemet","latitude":42.258333,"longitude":2.364444},
        {"id":"0320I","name":"Planoles","provider":"Aemet","latitude":42.316944,"longitude":2.102778},
        {"id":"0360X","name":"Les Planes D'hostoles","provider":"Aemet","latitude":42.052778,"longitude":2.551111},
        {"id":"0363X","name":"Sant Hilari","provider":"Aemet","latitude":41.880833,"longitude":2.513333},
        {"id":"0367","name":"Girona Aeropuerto","provider":"Aemet","latitude":41.911389,"longitude":2.763056},
        {"id":"0370E","name":"Girona","provider":"Aemet","latitude":41.972222,"longitude":2.819444},
        {"id":"0372C","name":"Porqueres","provider":"Aemet","latitude":42.104444,"longitude":2.763611},
        {"id":"0385X","name":"L'estartit","provider":"Aemet","latitude":42.053889,"longitude":3.201389},
        {"id":"0394X","name":"La Vall De Bianya","provider":"Aemet","latitude":42.210556,"longitude":2.471944},
        {"id":"0411X","name":"Castelló D'empúries","provider":"Aemet","latitude":42.224722,"longitude":3.093056},
        {"id":"0413A","name":"Maçanet De Cabrenys","provider":"Aemet","latitude":42.386944,"longitude":2.755556},
        {"id":"0421X","name":"Espolla","provider":"Aemet","latitude":42.39,"longitude":3.006111},
        {"id":"0429X","name":"Figueres","provider":"Aemet","latitude":42.259167,"longitude":2.960278},
        {"id":"0433D","name":"Cabo De Creus","provider":"Aemet","latitude":42.319167,"longitude":3.315556},
        {"id":"1002Y","name":"Baztan, Irurita","provider":"Aemet","latitude":43.135833,"longitude":-1.543056},
        {"id":"1010X","name":"Bera","provider":"Aemet","latitude":43.278611,"longitude":-1.675833},
        {"id":"1012P","name":"Irun","provider":"Aemet","latitude":43.326389,"longitude":-1.796667},
        {"id":"1014A","name":"Donostia / San Sebastián Aeropuerto","provider":"Aemet","latitude":43.356944,"longitude":-1.792222},
        {"id":"1021X","name":"Errenteria, Añarbe","provider":"Aemet","latitude":43.213889,"longitude":-1.878889},
        {"id":"1025A","name":"Segura","provider":"Aemet","latitude":43.015556,"longitude":-2.256667},
        {"id":"1025X","name":"Beasain, Arriaran","provider":"Aemet","latitude":43.054722,"longitude":-2.231944},
        {"id":"1033X","name":"Areso","provider":"Aemet","latitude":43.085,"longitude":-1.950833},
        {"id":"1037Y","name":"Zumarraga","provider":"Aemet","latitude":43.08,"longitude":-2.3175},
        {"id":"1038X","name":"Azpeitia","provider":"Aemet","latitude":43.1725,"longitude":-2.267222},
        {"id":"1041A","name":"Zumaia","provider":"Aemet","latitude":43.302222,"longitude":-2.251111},
        {"id":"1049N","name":"Elgeta","provider":"Aemet","latitude":43.138333,"longitude":-2.495833},
        {"id":"1050J","name":"Elgoibar","provider":"Aemet","latitude":43.209167,"longitude":-2.413333},
        {"id":"1052A","name":"Mutriku","provider":"Aemet","latitude":43.317222,"longitude":-2.397222},
        {"id":"1056K","name":"Forua","provider":"Aemet","latitude":43.3425,"longitude":-2.671111},
        {"id":"1057B","name":"Matxitxako","provider":"Aemet","latitude":43.453889,"longitude":-2.752778},
        {"id":"1059X","name":"Punta Galea","provider":"Aemet","latitude":43.375,"longitude":-3.021667},
        {"id":"1060X","name":"Amurrio","provider":"Aemet","latitude":43.050278,"longitude":-3.005556},
        {"id":"1064L","name":"Orozko, Ibarra","provider":"Aemet","latitude":43.096389,"longitude":-2.860278},
        {"id":"1074C","name":"Amorebieta-etxano","provider":"Aemet","latitude":43.202778,"longitude":-2.706111},
        {"id":"1082","name":"Bilbao Aeropuerto","provider":"Aemet","latitude":43.298056,"longitude":-2.906389},
        {"id":"1083B","name":"Sopuerta","provider":"Aemet","latitude":43.279722,"longitude":-3.168611},
        {"id":"1083L","name":"Castro Urdiales","provider":"Aemet","latitude":43.394722,"longitude":-3.233889},
        {"id":"1089U","name":"Ramales De La Victoria","provider":"Aemet","latitude":43.255833,"longitude":-3.470833},
        {"id":"1096X","name":"Barcena De Cicero, Treto","provider":"Aemet","latitude":43.396667,"longitude":-3.469722},
        {"id":"1103X","name":"San Roque De Riomiera","provider":"Aemet","latitude":43.2275,"longitude":-3.721111},
        {"id":"1109X","name":"Santander Aeropuerto","provider":"Aemet","latitude":43.428611,"longitude":-3.831389},
        {"id":"1111X","name":"Santander","provider":"Aemet","latitude":43.491111,"longitude":-3.800556},
        {"id":"1124E","name":"Villacarriedo","provider":"Aemet","latitude":43.245556,"longitude":-3.849444},
        {"id":"1135C","name":"Los Tojos, Bárcena Mayor","provider":"Aemet","latitude":43.146944,"longitude":-4.214167},
        {"id":"1152C","name":"San Felices De Buelna","provider":"Aemet","latitude":43.271944,"longitude":-4.048611},
        {"id":"1154H","name":"Torrelavega, Sierrapando","provider":"Aemet","latitude":43.358611,"longitude":-4.0275},
        {"id":"1159","name":"San Vicente De La Barquera","provider":"Aemet","latitude":43.393333,"longitude":-4.392222},
        {"id":"1167B","name":"Camaleño, Fuente De","provider":"Aemet","latitude":43.143889,"longitude":-4.812778},
        {"id":"1167G","name":"Mirador Del Cable, Parque Nacional Picos De Europa","provider":"Aemet","latitude":43.155,"longitude":-4.803056},
        {"id":"1167J","name":"Coriscao, Parque Nacional Picos De Europa","provider":"Aemet","latitude":43.089167,"longitude":-4.773889},
        {"id":"1174I","name":"Cillorigo De Liébana, Tama","provider":"Aemet","latitude":43.182778,"longitude":-4.601667},
        {"id":"1176A","name":"Tresviso","provider":"Aemet","latitude":43.255833,"longitude":-4.668333},
        {"id":"1178R","name":"Sotres, Parque Nacional Picos De Europa","provider":"Aemet","latitude":43.2375,"longitude":-4.736667},
        {"id":"1179B","name":"Cabrales","provider":"Aemet","latitude":43.311111,"longitude":-4.852778},
        {"id":"1183X","name":"Llanes","provider":"Aemet","latitude":43.420278,"longitude":-4.748056},
        {"id":"1186P","name":"Amieva, Panizales","provider":"Aemet","latitude":43.266667,"longitude":-5.119167},
        {"id":"1199X","name":"Piloña, Bargaéu","provider":"Aemet","latitude":43.377778,"longitude":-5.396667},
        {"id":"1207U","name":"Gijón, Campus","provider":"Aemet","latitude":43.523056,"longitude":-5.621111},
        {"id":"1208H","name":"Gijón, Puerto","provider":"Aemet","latitude":43.559722,"longitude":-5.700833},
        {"id":"1212E","name":"Asturias Aeropuerto","provider":"Aemet","latitude":43.566944,"longitude":-6.044167},
        {"id":"1221D","name":"Pajares-valgrande","provider":"Aemet","latitude":42.978611,"longitude":-5.776389},
        {"id":"1223P","name":"Lena, Ronzón","provider":"Aemet","latitude":43.132778,"longitude":-5.822778},
        {"id":"1226X","name":"Aller, Felechosa","provider":"Aemet","latitude":43.095278,"longitude":-5.476944},
        {"id":"1234P","name":"Mieres, Baiña","provider":"Aemet","latitude":43.275,"longitude":-5.819167},
        {"id":"1249X","name":"Oviedo","provider":"Aemet","latitude":43.353333,"longitude":-5.873889},
        {"id":"1272B","name":"Tineo, Soutu","provider":"Aemet","latitude":43.290278,"longitude":-6.386667},
        {"id":"1276F","name":"Pola De Somiedo","provider":"Aemet","latitude":43.1,"longitude":-6.256944},
        {"id":"1279X","name":"Salas, Camuño","provider":"Aemet","latitude":43.425,"longitude":-6.230833},
        {"id":"1283U","name":"Cabo Busto","provider":"Aemet","latitude":43.569167,"longitude":-6.47},
        {"id":"1297E","name":"Cervantes","provider":"Aemet","latitude":42.768611,"longitude":-7.0175},
        {"id":"1302F","name":"Degaña","provider":"Aemet","latitude":42.955278,"longitude":-6.4725},
        {"id":"1309C","name":"Ibias, San Antolin","provider":"Aemet","latitude":43.0275,"longitude":-6.885},
        {"id":"1327A","name":"Villayón, Oneta","provider":"Aemet","latitude":43.465556,"longitude":-6.673333},
        {"id":"1331A","name":"Castropol","provider":"Aemet","latitude":43.524722,"longitude":-7.031389},
        {"id":"1341B","name":"Taramundi, Ouria","provider":"Aemet","latitude":43.415556,"longitude":-7.061111},
        {"id":"1342X","name":"Ribadeo","provider":"Aemet","latitude":43.540556,"longitude":-7.083056},
        {"id":"1344X","name":"Mondoñedo","provider":"Aemet","latitude":43.431389,"longitude":-7.361667},
        {"id":"1351","name":"Estaca De Bares","provider":"Aemet","latitude":43.786111,"longitude":-7.685},
        {"id":"1387","name":"A Coruña","provider":"Aemet","latitude":43.365833,"longitude":-8.421389},
        {"id":"1387D","name":"A Coruña Bens","provider":"Aemet","latitude":43.363333,"longitude":-8.441944},
        {"id":"1387E","name":"A Coruña Aeropuerto","provider":"Aemet","latitude":43.306944,"longitude":-8.371944},
        {"id":"1393","name":"Cabo Vilán","provider":"Aemet","latitude":43.160556,"longitude":-9.210833},
        {"id":"1400","name":"Fisterra","provider":"Aemet","latitude":42.924722,"longitude":-9.291389},
        {"id":"1428","name":"Santiago De Compostela Aeropuerto","provider":"Aemet","latitude":42.888056,"longitude":-8.410556},
        {"id":"1435C","name":"Noia","provider":"Aemet","latitude":42.800278,"longitude":-8.876111},
        {"id":"1466A","name":"Silleda","provider":"Aemet","latitude":42.700833,"longitude":-8.257778},
        {"id":"1473A","name":"Padrón","provider":"Aemet","latitude":42.738333,"longitude":-8.627222},
        {"id":"1475X","name":"Santiago De Compostela","provider":"Aemet","latitude":42.876111,"longitude":-8.555833},
        {"id":"1477V","name":"Vilagarcía De Arousa","provider":"Aemet","latitude":42.584722,"longitude":-8.774722},
        {"id":"1484C","name":"Pontevedra","provider":"Aemet","latitude":42.438333,"longitude":-8.615833},
        {"id":"1486E","name":"Escuela Naval De Marín","provider":"Aemet","latitude":42.394722,"longitude":-8.706667},
        {"id":"1489A","name":"A Lama","provider":"Aemet","latitude":42.406944,"longitude":-8.451111},
        {"id":"1495","name":"Vigo Aeropuerto","provider":"Aemet","latitude":42.238611,"longitude":-8.623889},
        {"id":"1496X","name":"Vigo","provider":"Aemet","latitude":42.230556,"longitude":-8.724167},
        {"id":"1505","name":"Lugo Aeropuerto","provider":"Aemet","latitude":43.111111,"longitude":-7.4575},
        {"id":"1518A","name":"Lugo","provider":"Aemet","latitude":42.998333,"longitude":-7.5525},
        {"id":"1521X","name":"Becerreá","provider":"Aemet","latitude":42.863889,"longitude":-7.185278},
        {"id":"1541B","name":"Villablino","provider":"Aemet","latitude":42.928889,"longitude":-6.333889},
        {"id":"1542","name":"Puerto De Leitariegos","provider":"Aemet","latitude":42.994167,"longitude":-6.414167},
        {"id":"1549","name":"Ponferrada","provider":"Aemet","latitude":42.563889,"longitude":-6.6},
        {"id":"1631E","name":"A Pobra De Trives","provider":"Aemet","latitude":42.339444,"longitude":-7.2825},
        {"id":"1639X","name":"Chandrexa De Queixa","provider":"Aemet","latitude":42.260278,"longitude":-7.383611},
        {"id":"1679A","name":"Monforte De Lemos","provider":"Aemet","latitude":42.531667,"longitude":-7.510833},
        {"id":"1690A","name":"Ourense","provider":"Aemet","latitude":42.325278,"longitude":-7.859722},
        {"id":"1700X","name":"O Carballiño","provider":"Aemet","latitude":42.421389,"longitude":-8.0925},
        {"id":"1701X","name":"Ribadavia","provider":"Aemet","latitude":42.3,"longitude":-8.129167},
        {"id":"1735X","name":"Xinzo De Limia","provider":"Aemet","latitude":42.079167,"longitude":-7.733611},
        {"id":"1740","name":"Santillana Del Mar, Altamira","provider":"Aemet","latitude":43.377222,"longitude":-4.124444},
        {"id":"2030","name":"Soria","provider":"Aemet","latitude":41.775,"longitude":-2.483056},
        {"id":"2044B","name":"Lubia","provider":"Aemet","latitude":41.600556,"longitude":-2.5075},
        {"id":"2059B","name":"La Riba De Escalote","provider":"Aemet","latitude":41.349722,"longitude":-2.783333},
        {"id":"2092","name":"Burgo De Osma","provider":"Aemet","latitude":41.589444,"longitude":-3.086944},
        {"id":"2096B","name":"Liceras","provider":"Aemet","latitude":41.373611,"longitude":-3.251389},
        {"id":"2106B","name":"Coruña Del Conde","provider":"Aemet","latitude":41.745833,"longitude":-3.381944},
        {"id":"2117D","name":"Aranda De Duero","provider":"Aemet","latitude":41.665833,"longitude":-3.742778},
        {"id":"2135A","name":"Fresno De Cantespino","provider":"Aemet","latitude":41.372778,"longitude":-3.507222},
        {"id":"2140A","name":"Aldeanueva De Serrezuela","provider":"Aemet","latitude":41.464444,"longitude":-3.785833},
        {"id":"2172Y","name":"Sardón De Duero","provider":"Aemet","latitude":41.611944,"longitude":-4.405556},
        {"id":"2182C","name":"Pedraza","provider":"Aemet","latitude":41.133889,"longitude":-3.790278},
        {"id":"2192C","name":"Cuéllar","provider":"Aemet","latitude":41.383611,"longitude":-4.265556},
        {"id":"2235U","name":"Cervera De Pisuerga","provider":"Aemet","latitude":42.870556,"longitude":-4.52},
        {"id":"2243A","name":"Aguilar De Campoo","provider":"Aemet","latitude":42.798056,"longitude":-4.277222},
        {"id":"2276B","name":"Villaeles De Valdavia","provider":"Aemet","latitude":42.568889,"longitude":-4.575},
        {"id":"2285B","name":"Villadiego","provider":"Aemet","latitude":42.523889,"longitude":-4.001111},
        {"id":"2290Y","name":"Pedrosa Del Príncipe","provider":"Aemet","latitude":42.251111,"longitude":-4.198889},
        {"id":"2296A","name":"Ólvega","provider":"Aemet","latitude":41.775556,"longitude":-1.976667},
        {"id":"2298","name":"Palacios De La Sierra","provider":"Aemet","latitude":41.959722,"longitude":-3.131667},
        {"id":"2302N","name":"Monterrubio De La Demanda","provider":"Aemet","latitude":42.146389,"longitude":-3.109722},
        {"id":"2311Y","name":"Villamayor De Los Montes","provider":"Aemet","latitude":42.105278,"longitude":-3.767778},
        {"id":"2331","name":"Burgos Aeropuerto","provider":"Aemet","latitude":42.356944,"longitude":-3.620278},
        {"id":"2362C","name":"Velilla Del Río Carrión, Camporredondo De Alba","provider":"Aemet","latitude":42.893889,"longitude":-4.713611},
        {"id":"2374X","name":"Carrión De Los Condes","provider":"Aemet","latitude":42.350833,"longitude":-4.617222},
        {"id":"2400E","name":"Autilla Del Pino","provider":"Aemet","latitude":41.995556,"longitude":-4.602778},
        {"id":"2401X","name":"Palencia","provider":"Aemet","latitude":42.009444,"longitude":-4.560556},
        {"id":"2422","name":"Valladolid","provider":"Aemet","latitude":41.640556,"longitude":-4.754167},
        {"id":"2430Y","name":"Muñotello","provider":"Aemet","latitude":40.543333,"longitude":-5.044167},
        {"id":"2444","name":"Ávila","provider":"Aemet","latitude":40.659167,"longitude":-4.679722},
        {"id":"2453E","name":"Gotarrendura","provider":"Aemet","latitude":40.828889,"longitude":-4.741944},
        {"id":"2456B","name":"Arevalo","provider":"Aemet","latitude":41.071389,"longitude":-4.73},
        {"id":"2462","name":"Puerto De Navacerrada","provider":"Aemet","latitude":40.793333,"longitude":-4.010833},
        {"id":"2465","name":"Segovia","provider":"Aemet","latitude":40.945278,"longitude":-4.126389},
        {"id":"2482B","name":"Miguelañez","provider":"Aemet","latitude":41.126389,"longitude":-4.375833},
        {"id":"2491C","name":"La Covatilla, Estación De Esquí","provider":"Aemet","latitude":40.355,"longitude":-5.69},
        {"id":"2503B","name":"Olmedo, Depósito De Agua","provider":"Aemet","latitude":41.28,"longitude":-4.691944},
        {"id":"2507Y","name":"Rueda","provider":"Aemet","latitude":41.419444,"longitude":-4.963611},
        {"id":"2512Y","name":"Rivilla De Barajas","provider":"Aemet","latitude":40.882222,"longitude":-5.018611},
        {"id":"2517A","name":"Fuente El Sol","provider":"Aemet","latitude":41.172778,"longitude":-4.939722},
        {"id":"2536D","name":"Morales Del Toro","provider":"Aemet","latitude":41.548333,"longitude":-5.271389},
        {"id":"2555B","name":"Fuentesauco","provider":"Aemet","latitude":41.236667,"longitude":-5.481389},
        {"id":"2565","name":"Coreses","provider":"Aemet","latitude":41.555278,"longitude":-5.630556},
        {"id":"2568D","name":"Santervás De La Vega, Villapún","provider":"Aemet","latitude":42.523611,"longitude":-4.851111},
        {"id":"2593D","name":"Villalón De Campos","provider":"Aemet","latitude":42.094167,"longitude":-5.041111},
        {"id":"2611D","name":"Villafáfila","provider":"Aemet","latitude":41.856389,"longitude":-5.5925},
        {"id":"2614","name":"Zamora","provider":"Aemet","latitude":41.515556,"longitude":-5.735278},
        {"id":"2624C","name":"Riaño","provider":"Aemet","latitude":42.958333,"longitude":-5.0075},
        {"id":"2626Y","name":"Cubillas De Rueda","provider":"Aemet","latitude":42.62,"longitude":-5.193333},
        {"id":"2661","name":"León, Virgen Del Camino","provider":"Aemet","latitude":42.588333,"longitude":-5.651111},
        {"id":"2664B","name":"Valencia De Don Juan","provider":"Aemet","latitude":42.295833,"longitude":-5.504722},
        {"id":"2701D","name":"Barrios De Luna, Miñera","provider":"Aemet","latitude":42.885556,"longitude":-5.870833},
        {"id":"2728B","name":"Quintana Del Castillo, Villameca","provider":"Aemet","latitude":42.648333,"longitude":-6.070833},
        {"id":"2734D","name":"Astorga","provider":"Aemet","latitude":42.476667,"longitude":-6.074444},
        {"id":"2737E","name":"Lagunas De Somoza","provider":"Aemet","latitude":42.3775,"longitude":-6.196667},
        {"id":"2742R","name":"Bustillo Del Páramo","provider":"Aemet","latitude":42.466389,"longitude":-5.779722},
        {"id":"2755X","name":"Benavente","provider":"Aemet","latitude":42.010833,"longitude":-5.666667},
        {"id":"2766E","name":"Sanabria, Robleda-cervantes","provider":"Aemet","latitude":42.0825,"longitude":-6.639722},
        {"id":"2775X","name":"Villardeciervos","provider":"Aemet","latitude":41.941389,"longitude":-6.279722},
        {"id":"2777K","name":"Santibañez De Vidriales","provider":"Aemet","latitude":42.078056,"longitude":-6.007222},
        {"id":"2789H","name":"Pozuelo De Tabara","provider":"Aemet","latitude":41.785556,"longitude":-5.908889},
        {"id":"2804F","name":"Villadepera","provider":"Aemet","latitude":41.533889,"longitude":-6.141944},
        {"id":"2828Y","name":"Barco De Avila","provider":"Aemet","latitude":40.355278,"longitude":-5.519167},
        {"id":"2847X","name":"Pedrosillo De Los Aires","provider":"Aemet","latitude":40.675556,"longitude":-5.643333},
        {"id":"2863C","name":"Pedraza De Alba","provider":"Aemet","latitude":40.732222,"longitude":-5.366111},
        {"id":"2867","name":"Salamanca Aeropuerto","provider":"Aemet","latitude":40.959444,"longitude":-5.498333},
        {"id":"2873X","name":"Barbadillo","provider":"Aemet","latitude":40.903611,"longitude":-5.779722},
        {"id":"2882D","name":"Peñausende","provider":"Aemet","latitude":41.238889,"longitude":-5.8975},
        {"id":"2885K","name":"Fresno De Sayago","provider":"Aemet","latitude":41.304444,"longitude":-6.022222},
        {"id":"2891A","name":"Villarino De Los Aires","provider":"Aemet","latitude":41.262778,"longitude":-6.462222},
        {"id":"2914C","name":"Boadilla Fuente San Esteban","provider":"Aemet","latitude":40.786111,"longitude":-6.202778},
        {"id":"2916A","name":"Vitigudino","provider":"Aemet","latitude":41.011389,"longitude":-6.437778},
        {"id":"2918Y","name":"El Maíllo","provider":"Aemet","latitude":40.569444,"longitude":-6.223611},
        {"id":"2926B","name":"Bañobárez","provider":"Aemet","latitude":40.851389,"longitude":-6.608889},
        {"id":"2930Y","name":"Navasfrías","provider":"Aemet","latitude":40.296667,"longitude":-6.812778},
        {"id":"2945A","name":"El Bodón Base Aérea","provider":"Aemet","latitude":40.485,"longitude":-6.576944},
        {"id":"2946X","name":"Saelices El Chico","provider":"Aemet","latitude":40.635,"longitude":-6.6},
        {"id":"3013","name":"Molina De Aragón","provider":"Aemet","latitude":40.841667,"longitude":-1.878889},
        {"id":"3094B","name":"Tarancón","provider":"Aemet","latitude":40.011944,"longitude":-3.021389},
        {"id":"3099Y","name":"Ocaña","provider":"Aemet","latitude":39.935278,"longitude":-3.496111},
        {"id":"3100B","name":"Aranjuez","provider":"Aemet","latitude":40.067222,"longitude":-3.546111},
        {"id":"3103","name":"Pantano El Vado","provider":"Aemet","latitude":41.003611,"longitude":-3.301944},
        {"id":"3104Y","name":"Rascafría","provider":"Aemet","latitude":40.889722,"longitude":-3.888333},
        {"id":"3110C","name":"Buitrago Del Lozoya","provider":"Aemet","latitude":41.006944,"longitude":-3.613889},
        {"id":"3126Y","name":"Madrid, El Goloso","provider":"Aemet","latitude":40.561389,"longitude":-3.711944},
        {"id":"3129","name":"Madrid Aeropuerto","provider":"Aemet","latitude":40.466667,"longitude":-3.555556},
        {"id":"3130C","name":"Sigüenza","provider":"Aemet","latitude":41.086389,"longitude":-2.618056},
        {"id":"3168D","name":"Guadalajara","provider":"Aemet","latitude":40.630278,"longitude":-3.150278},
        {"id":"3170Y","name":"Alcala De Henares","provider":"Aemet","latitude":40.528333,"longitude":-3.289722},
        {"id":"3182Y","name":"Arganda Del Rey","provider":"Aemet","latitude":40.311667,"longitude":-3.497778},
        {"id":"3191E","name":"Colmenar Viejo","provider":"Aemet","latitude":40.696111,"longitude":-3.765},
        {"id":"3194U","name":"Madrid, Ciudad Universitaria","provider":"Aemet","latitude":40.451667,"longitude":-3.724167},
        {"id":"3195","name":"Madrid, Retiro","provider":"Aemet","latitude":40.411389,"longitude":-3.677778},
        {"id":"3254Y","name":"Mora","provider":"Aemet","latitude":39.686944,"longitude":-3.780556},
        {"id":"3260B","name":"Toledo","provider":"Aemet","latitude":39.884722,"longitude":-4.045278},
        {"id":"3268C","name":"Alpedrete","provider":"Aemet","latitude":40.659722,"longitude":-4.0175},
        {"id":"3319D","name":"Puerto Del Pico","provider":"Aemet","latitude":40.339722,"longitude":-5.012778},
        {"id":"3337U","name":"Cebreros","provider":"Aemet","latitude":40.4675,"longitude":-4.455833},
        {"id":"3343Y","name":"Valdemorillo","provider":"Aemet","latitude":40.496667,"longitude":-4.061111},
        {"id":"3365A","name":"Talavera De La Reina","provider":"Aemet","latitude":39.958611,"longitude":-4.863611},
        {"id":"3386A","name":"Navalvillar De Ibor","provider":"Aemet","latitude":39.591667,"longitude":-5.391667},
        {"id":"3422D","name":"Candeleda","provider":"Aemet","latitude":40.139167,"longitude":-5.311389},
        {"id":"3423I","name":"Madrigal De La Vera","provider":"Aemet","latitude":40.153889,"longitude":-5.373333},
        {"id":"3434X","name":"Navalmoral De La Mata","provider":"Aemet","latitude":39.945833,"longitude":-5.5825},
        {"id":"3436D","name":"Garganta La Olla","provider":"Aemet","latitude":40.111111,"longitude":-5.784722},
        {"id":"3448X","name":"Serradilla","provider":"Aemet","latitude":39.820833,"longitude":-6.1275},
        {"id":"3455X","name":"Jaraicejo","provider":"Aemet","latitude":39.67,"longitude":-5.808333},
        {"id":"3463Y","name":"Trujillo","provider":"Aemet","latitude":39.464167,"longitude":-5.874167},
        {"id":"3469A","name":"Cáceres","provider":"Aemet","latitude":39.471389,"longitude":-6.338889},
        {"id":"3475X","name":"Cañaveral","provider":"Aemet","latitude":39.790556,"longitude":-6.376389},
        {"id":"3494U","name":"Nuñomoral","provider":"Aemet","latitude":40.408056,"longitude":-6.239722},
        {"id":"3503","name":"Guijo De Granadilla","provider":"Aemet","latitude":40.189444,"longitude":-6.1675},
        {"id":"3504X","name":"Hervás","provider":"Aemet","latitude":40.265,"longitude":-5.861111},
        {"id":"3514B","name":"Tornavacas","provider":"Aemet","latitude":40.258611,"longitude":-5.678333},
        {"id":"3516X","name":"Piornal","provider":"Aemet","latitude":40.120833,"longitude":-5.8325},
        {"id":"3526X","name":"Coria","provider":"Aemet","latitude":40.003611,"longitude":-6.5575},
        {"id":"3531X","name":"Torrecilla De Los Angeles","provider":"Aemet","latitude":40.255,"longitude":-6.411667},
        {"id":"3536X","name":"Hoyos","provider":"Aemet","latitude":40.174722,"longitude":-6.724444},
        {"id":"3540X","name":"Zarza La Mayor","provider":"Aemet","latitude":39.871389,"longitude":-6.86},
        {"id":"3547X","name":"Valverde Del Fresno","provider":"Aemet","latitude":40.207222,"longitude":-6.896111},
        {"id":"3562X","name":"Aliseda","provider":"Aemet","latitude":39.4275,"longitude":-6.736389},
        {"id":"3565X","name":"Brozas","provider":"Aemet","latitude":39.618056,"longitude":-6.745},
        {"id":"4007Y","name":"Ossa De Montiel","provider":"Aemet","latitude":38.965833,"longitude":-2.745},
        {"id":"4051Y","name":"Alcázar Del Rey","provider":"Aemet","latitude":40.061111,"longitude":-2.806944},
        {"id":"4061X","name":"Quintanar De La Orden","provider":"Aemet","latitude":39.597222,"longitude":-3.048333},
        {"id":"4064Y","name":"Alcazar De San Juan","provider":"Aemet","latitude":39.390833,"longitude":-3.215833},
        {"id":"4067","name":"Madridejos","provider":"Aemet","latitude":39.491944,"longitude":-3.528333},
        {"id":"4070Y","name":"Abia De Obispalia","provider":"Aemet","latitude":40.018889,"longitude":-2.395278},
        {"id":"4089A","name":"Alberca De Zancara","provider":"Aemet","latitude":39.516944,"longitude":-2.495833},
        {"id":"4090Y","name":"San Clemente","provider":"Aemet","latitude":39.416667,"longitude":-2.420556},
        {"id":"4091Y","name":"Villarrobledo","provider":"Aemet","latitude":39.261944,"longitude":-2.5925},
        {"id":"4093Y","name":"Osa De La Vega","provider":"Aemet","latitude":39.656111,"longitude":-2.76},
        {"id":"4095Y","name":"Belmonte","provider":"Aemet","latitude":39.555278,"longitude":-2.705556},
        {"id":"4096Y","name":"Munera","provider":"Aemet","latitude":39.016667,"longitude":-2.488889},
        {"id":"4103X","name":"Tomelloso","provider":"Aemet","latitude":39.169167,"longitude":-3.0075},
        {"id":"4121","name":"Ciudad Real","provider":"Aemet","latitude":38.989167,"longitude":-3.920278},
        {"id":"4138Y","name":"Villanueva De Los Infantes","provider":"Aemet","latitude":38.7375,"longitude":-3.004444},
        {"id":"4147X","name":"Valdepeñas","provider":"Aemet","latitude":38.750556,"longitude":-3.391389},
        {"id":"4148","name":"Viso Del Marqués","provider":"Aemet","latitude":38.518056,"longitude":-3.566667},
        {"id":"4195E","name":"Alcornoquera, Parque Nacional Cabañeros","provider":"Aemet","latitude":39.320833,"longitude":-4.395},
        {"id":"4210Y","name":"Abenójar","provider":"Aemet","latitude":38.898056,"longitude":-4.291944},
        {"id":"4220X","name":"Puebla De Don Rodrigo","provider":"Aemet","latitude":39.083611,"longitude":-4.621944},
        {"id":"4236Y","name":"Puerto Rey","provider":"Aemet","latitude":39.450556,"longitude":-5.026389},
        {"id":"4244X","name":"Herrera Del Duque","provider":"Aemet","latitude":39.169444,"longitude":-5.062222},
        {"id":"4245X","name":"Guadalupe","provider":"Aemet","latitude":39.455278,"longitude":-5.333333},
        {"id":"4260","name":"Peraleda Del Zaucejo","provider":"Aemet","latitude":38.479722,"longitude":-5.5775},
        {"id":"4267X","name":"Hinojosa Del Duque","provider":"Aemet","latitude":38.498333,"longitude":-5.121389},
        {"id":"4300Y","name":"Almadén","provider":"Aemet","latitude":38.775278,"longitude":-4.845278},
        {"id":"4325Y","name":"Castuera","provider":"Aemet","latitude":38.741944,"longitude":-5.529167},
        {"id":"4339X","name":"Cañamero","provider":"Aemet","latitude":39.314167,"longitude":-5.368889},
        {"id":"4340","name":"Navalvillar De Pela","provider":"Aemet","latitude":39.103333,"longitude":-5.461389},
        {"id":"4347X","name":"Zorita","provider":"Aemet","latitude":39.282778,"longitude":-5.710278},
        {"id":"4358X","name":"Don Benito","provider":"Aemet","latitude":38.955556,"longitude":-5.880556},
        {"id":"4362X","name":"Retamal De Llerena","provider":"Aemet","latitude":38.576389,"longitude":-5.845833},
        {"id":"4386B","name":"Llerena","provider":"Aemet","latitude":38.231667,"longitude":-6.016944},
        {"id":"4395X","name":"Villafranca De Los Barros","provider":"Aemet","latitude":38.551667,"longitude":-6.306667},
        {"id":"4410X","name":"Mérida","provider":"Aemet","latitude":38.915833,"longitude":-6.385556},
        {"id":"4411C","name":"Alcuescar","provider":"Aemet","latitude":39.1975,"longitude":-6.231111},
        {"id":"4427X","name":"Zafra","provider":"Aemet","latitude":38.425833,"longitude":-6.436667},
        {"id":"4436Y","name":"Almendralejo","provider":"Aemet","latitude":38.688889,"longitude":-6.361111},
        {"id":"4452","name":"Badajoz Aeropuerto","provider":"Aemet","latitude":38.883333,"longitude":-6.813889},
        {"id":"4464X","name":"Alburquerque","provider":"Aemet","latitude":39.181944,"longitude":-6.995278},
        {"id":"4468X","name":"Puebla De Obando","provider":"Aemet","latitude":39.176667,"longitude":-6.600833},
        {"id":"4478X","name":"Badajoz","provider":"Aemet","latitude":38.886111,"longitude":-7.009444},
        {"id":"4486X","name":"Olivenza","provider":"Aemet","latitude":38.6975,"longitude":-7.084444},
        {"id":"4489X","name":"Alconchel","provider":"Aemet","latitude":38.484722,"longitude":-7.281944},
        {"id":"4492F","name":"Barcarrota","provider":"Aemet","latitude":38.472778,"longitude":-6.923333},
        {"id":"4497X","name":"Villanueva Del Fresno","provider":"Aemet","latitude":38.372222,"longitude":-7.158056},
        {"id":"4499X","name":"Monesterio","provider":"Aemet","latitude":38.081389,"longitude":-6.271944},
        {"id":"4501X","name":"Fuente De Cantos","provider":"Aemet","latitude":38.208611,"longitude":-6.311389},
        {"id":"4511C","name":"Jerez De Los Caballeros","provider":"Aemet","latitude":38.298611,"longitude":-6.765},
        {"id":"4520X","name":"Fregenal De La Sierra","provider":"Aemet","latitude":38.178333,"longitude":-6.661667},
        {"id":"4527X","name":"Aroche","provider":"Aemet","latitude":37.980278,"longitude":-6.975833},
        {"id":"4549Y","name":"Ayamonte","provider":"Aemet","latitude":37.194722,"longitude":-7.395},
        {"id":"4554X","name":"Cartaya","provider":"Aemet","latitude":37.218333,"longitude":-7.083611},
        {"id":"4575X","name":"Valverde Del Camino","provider":"Aemet","latitude":37.575278,"longitude":-6.767778},
        {"id":"4589X","name":"Alosno, Tharsis","provider":"Aemet","latitude":37.597778,"longitude":-7.119444},
        {"id":"4608X","name":"El Campillo","provider":"Aemet","latitude":37.677222,"longitude":-6.63},
        {"id":"4622X","name":"Villarrasa","provider":"Aemet","latitude":37.450833,"longitude":-6.636667},
        {"id":"4642E","name":"Huelva, Ronda Este","provider":"Aemet","latitude":37.278333,"longitude":-6.911667},
        {"id":"5047E","name":"Baza","provider":"Aemet","latitude":37.505833,"longitude":-2.735},
        {"id":"5051X","name":"Huéscar","provider":"Aemet","latitude":37.861389,"longitude":-2.652778},
        {"id":"5103E","name":"Camarate 2, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":37.158333,"longitude":-3.256944},
        {"id":"5103F","name":"Camarate, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":37.191111,"longitude":-3.253889},
        {"id":"5107D","name":"Dólar","provider":"Aemet","latitude":37.18,"longitude":-2.986389},
        {"id":"5164B","name":"Baeza","provider":"Aemet","latitude":37.996667,"longitude":-3.461944},
        {"id":"5192","name":"Villarrodrigo","provider":"Aemet","latitude":38.489167,"longitude":-2.6375},
        {"id":"5210X","name":"Villanueva Del Arzobispo","provider":"Aemet","latitude":38.175,"longitude":-2.998056},
        {"id":"5270B","name":"Jaén","provider":"Aemet","latitude":37.7775,"longitude":-3.809167},
        {"id":"5279X","name":"Linares","provider":"Aemet","latitude":38.151111,"longitude":-3.629444},
        {"id":"5281X","name":"Bailén","provider":"Aemet","latitude":38.093056,"longitude":-3.7825},
        {"id":"5298X","name":"Andújar","provider":"Aemet","latitude":38.023056,"longitude":-4.063333},
        {"id":"5304Y","name":"Puertollano","provider":"Aemet","latitude":38.668889,"longitude":-4.059167},
        {"id":"5341C","name":"Fuencaliente","provider":"Aemet","latitude":38.428889,"longitude":-4.301667},
        {"id":"5361X","name":"Montoro","provider":"Aemet","latitude":38.013333,"longitude":-4.330278},
        {"id":"5390Y","name":"Villanueva De Córdoba","provider":"Aemet","latitude":38.333056,"longitude":-4.608889},
        {"id":"5394X","name":"Córdoba, Embalse De Guadanuño","provider":"Aemet","latitude":38.020833,"longitude":-4.796667},
        {"id":"5402","name":"Córdoba Aeropuerto","provider":"Aemet","latitude":37.848889,"longitude":-4.846667},
        {"id":"5406X","name":"Alcalá La Real","provider":"Aemet","latitude":37.4975,"longitude":-3.908056},
        {"id":"5412X","name":"Priego De Córdoba","provider":"Aemet","latitude":37.484722,"longitude":-4.207778},
        {"id":"5427X","name":"Doña Mencía","provider":"Aemet","latitude":37.556111,"longitude":-4.353889},
        {"id":"5429X","name":"Córdoba, Prágdena","provider":"Aemet","latitude":37.810278,"longitude":-4.462222},
        {"id":"5459X","name":"Espiel","provider":"Aemet","latitude":38.111111,"longitude":-4.928611},
        {"id":"5470","name":"Fuente Palmera","provider":"Aemet","latitude":37.753056,"longitude":-5.100556},
        {"id":"5473X","name":"Azuaga","provider":"Aemet","latitude":38.267778,"longitude":-5.686111},
        {"id":"5514Z","name":"Granada Base Aérea","provider":"Aemet","latitude":37.136111,"longitude":-3.633333},
        {"id":"5515D","name":"Víznar","provider":"Aemet","latitude":37.236944,"longitude":-3.550556},
        {"id":"5515X","name":"Granada-cartuja","provider":"Aemet","latitude":37.189722,"longitude":-3.595556},
        {"id":"5516D","name":"Sierra Nevada 'radiotelescopio'","provider":"Aemet","latitude":37.063056,"longitude":-3.386944},
        {"id":"5530E","name":"Granada Aeropuerto","provider":"Aemet","latitude":37.190278,"longitude":-3.789722},
        {"id":"5582A","name":"Loja","provider":"Aemet","latitude":37.161111,"longitude":-4.152778},
        {"id":"5598X","name":"Benamejí","provider":"Aemet","latitude":37.230833,"longitude":-4.547778},
        {"id":"5612B","name":"La Roda De Andalucía","provider":"Aemet","latitude":37.194444,"longitude":-4.77},
        {"id":"5624X","name":"Aguilar De La Frontera","provider":"Aemet","latitude":37.481944,"longitude":-4.685833},
        {"id":"5625X","name":"La Rambla","provider":"Aemet","latitude":37.638611,"longitude":-4.763889},
        {"id":"5641X","name":"Écija","provider":"Aemet","latitude":37.516111,"longitude":-5.085},
        {"id":"5654X","name":"La Puebla De Los Infantes","provider":"Aemet","latitude":37.786667,"longitude":-5.371111},
        {"id":"5656","name":"Fuentes De Andalucía","provider":"Aemet","latitude":37.497222,"longitude":-5.433056},
        {"id":"5702X","name":"Carmona","provider":"Aemet","latitude":37.565556,"longitude":-5.740556},
        {"id":"5704B","name":"Cazalla De La Sierra","provider":"Aemet","latitude":37.926389,"longitude":-5.769722},
        {"id":"5726X","name":"Guadalcanal","provider":"Aemet","latitude":38.099444,"longitude":-5.819167},
        {"id":"5733X","name":"Almadén De La Plata","provider":"Aemet","latitude":37.791111,"longitude":-6.075},
        {"id":"5769X","name":"Cala","provider":"Aemet","latitude":37.973611,"longitude":-6.322222},
        {"id":"5783","name":"Sevilla Aeropuerto","provider":"Aemet","latitude":37.416667,"longitude":-5.879167},
        {"id":"5788X","name":"Tomares, Zaudín","provider":"Aemet","latitude":37.361667,"longitude":-6.059722},
        {"id":"5790Y","name":"Sevilla, Tablada","provider":"Aemet","latitude":37.364167,"longitude":-6.005833},
        {"id":"5796","name":"Morón De La Frontera","provider":"Aemet","latitude":37.164444,"longitude":-5.611389},
        {"id":"5835X","name":"Carrión De Los Céspedes","provider":"Aemet","latitude":37.36,"longitude":-6.334167},
        {"id":"5858X","name":"Almonte","provider":"Aemet","latitude":36.988611,"longitude":-6.443056},
        {"id":"5860E","name":"Moguer, El Arenosillo","provider":"Aemet","latitude":37.098056,"longitude":-6.738056},
        {"id":"5891X","name":"Las Cabezas De San Juan","provider":"Aemet","latitude":36.953333,"longitude":-5.846667},
        {"id":"5906X","name":"Chipiona","provider":"Aemet","latitude":36.75,"longitude":-6.400556},
        {"id":"5911A","name":"Grazalema","provider":"Aemet","latitude":36.760556,"longitude":-5.374167},
        {"id":"5919X","name":"Olvera","provider":"Aemet","latitude":36.931667,"longitude":-5.259444},
        {"id":"5941X","name":"El Bosque","provider":"Aemet","latitude":36.729444,"longitude":-5.512222},
        {"id":"5950X","name":"San José Del Valle","provider":"Aemet","latitude":36.663889,"longitude":-5.783333},
        {"id":"5960","name":"Jerez De La Frontera Aeropuerto","provider":"Aemet","latitude":36.750556,"longitude":-6.055833},
        {"id":"5972X","name":"San Fernando","provider":"Aemet","latitude":36.465556,"longitude":-6.205556},
        {"id":"5973","name":"Cádiz","provider":"Aemet","latitude":36.499722,"longitude":-6.257778},
        {"id":"5983X","name":"Medina Sidonia","provider":"Aemet","latitude":36.406111,"longitude":-5.920278},
        {"id":"5995B","name":"Vejer De La Frontera","provider":"Aemet","latitude":36.245556,"longitude":-5.965},
        {"id":"5996B","name":"Barbate","provider":"Aemet","latitude":36.184722,"longitude":-5.909444},
        {"id":"5998X","name":"Osuna","provider":"Aemet","latitude":37.243333,"longitude":-5.1125},
        {"id":"6000A","name":"Melilla","provider":"Aemet","latitude":35.276389,"longitude":-2.956389},
        {"id":"6001","name":"Tarifa","provider":"Aemet","latitude":36.013889,"longitude":-5.598889},
        {"id":"6032X","name":"Ronda Instituto","provider":"Aemet","latitude":36.75,"longitude":-5.168611},
        {"id":"6040X","name":"Cortes De La Frontera","provider":"Aemet","latitude":36.544444,"longitude":-5.386389},
        {"id":"6042I","name":"Jimena De La Frontera","provider":"Aemet","latitude":36.435556,"longitude":-5.395},
        {"id":"6045X","name":"Alpandeire","provider":"Aemet","latitude":36.6325,"longitude":-5.203056},
        {"id":"6050X","name":"Gaucín","provider":"Aemet","latitude":36.518611,"longitude":-5.318611},
        {"id":"6056X","name":"San Roque","provider":"Aemet","latitude":36.273056,"longitude":-5.284444},
        {"id":"6057X","name":"Manilva","provider":"Aemet","latitude":36.378333,"longitude":-5.26},
        {"id":"6058I","name":"Estepona","provider":"Aemet","latitude":36.416944,"longitude":-5.155},
        {"id":"6069X","name":"Benahavís","provider":"Aemet","latitude":36.543611,"longitude":-5.024722},
        {"id":"6076X","name":"Marbella, Puerto","provider":"Aemet","latitude":36.484444,"longitude":-4.953056},
        {"id":"6083X","name":"Marbella","provider":"Aemet","latitude":36.483333,"longitude":-4.740278},
        {"id":"6088X","name":"Torremolinos","provider":"Aemet","latitude":36.620556,"longitude":-4.515},
        {"id":"6127X","name":"Álora","provider":"Aemet","latitude":36.854722,"longitude":-4.696667},
        {"id":"6155A","name":"Málaga Aeropuerto","provider":"Aemet","latitude":36.666111,"longitude":-4.482222},
        {"id":"6156X","name":"Málaga, Centro Meteorológico","provider":"Aemet","latitude":36.717778,"longitude":-4.481667},
        {"id":"6199X","name":"Vélez-málaga","provider":"Aemet","latitude":36.768611,"longitude":-4.093611},
        {"id":"6213X","name":"Nerja","provider":"Aemet","latitude":36.762778,"longitude":-3.845278},
        {"id":"6248D","name":"Cañar, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":36.952222,"longitude":-3.430278},
        {"id":"6267X","name":"Salobreña","provider":"Aemet","latitude":36.748333,"longitude":-3.578611},
        {"id":"6268Y","name":"Motril, Puerto","provider":"Aemet","latitude":36.723889,"longitude":-3.529167},
        {"id":"6272X","name":"Castell De Ferro","provider":"Aemet","latitude":36.734167,"longitude":-3.38},
        {"id":"6293X","name":"Roquetas De Mar","provider":"Aemet","latitude":36.686944,"longitude":-2.701667},
        {"id":"6299I","name":"Laguna Seca, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":37.095833,"longitude":-2.964444},
        {"id":"6307C","name":"Laújar, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":37.053056,"longitude":-2.897222},
        {"id":"6307X","name":"Láujar De Andarax","provider":"Aemet","latitude":37.033333,"longitude":-2.9125},
        {"id":"6312E","name":"Rágol, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":37.020833,"longitude":-2.677222},
        {"id":"6325O","name":"Almería Aeropuerto","provider":"Aemet","latitude":36.846389,"longitude":-2.356944},
        {"id":"6329X","name":"Cabo De Gata","provider":"Aemet","latitude":36.721944,"longitude":-2.193056},
        {"id":"6332Y","name":"Carboneras","provider":"Aemet","latitude":36.942222,"longitude":-1.906944},
        {"id":"6335O","name":"Nacimiento, Parque Nacional Sierra Nevada","provider":"Aemet","latitude":37.11,"longitude":-2.699167},
        {"id":"6340X","name":"Garrucha","provider":"Aemet","latitude":37.169167,"longitude":-1.828611},
        {"id":"6364X","name":"Albox","provider":"Aemet","latitude":37.406667,"longitude":-2.151389},
        {"id":"6375X","name":"Fuente De Piedra","provider":"Aemet","latitude":37.132222,"longitude":-4.741944},
        {"id":"7002Y","name":"Águilas","provider":"Aemet","latitude":37.417222,"longitude":-1.586944},
        {"id":"7007Y","name":"Mazarrón","provider":"Aemet","latitude":37.588056,"longitude":-1.230556},
        {"id":"7012D","name":"Cartagena","provider":"Aemet","latitude":37.604444,"longitude":-1.023333},
        {"id":"7019X","name":"Cartagena/salinas Cabo Palos","provider":"Aemet","latitude":37.635833,"longitude":-0.715556},
        {"id":"7026X","name":"Torre-pacheco","provider":"Aemet","latitude":37.738889,"longitude":-0.9675},
        {"id":"7031X","name":"San Javier Aeropuerto","provider":"Aemet","latitude":37.778333,"longitude":-0.805833},
        {"id":"7096B","name":"Hellín","provider":"Aemet","latitude":38.541944,"longitude":-1.703056},
        {"id":"7119B","name":"Caravaca De La Cruz","provider":"Aemet","latitude":38.103056,"longitude":-1.877222},
        {"id":"7121A","name":"Calasparra","provider":"Aemet","latitude":38.234167,"longitude":-1.702222},
        {"id":"7138B","name":"Jumilla","provider":"Aemet","latitude":38.458889,"longitude":-1.335278},
        {"id":"7178I","name":"Murcia","provider":"Aemet","latitude":38.001944,"longitude":-1.170833},
        {"id":"7203A","name":"Lorca, Zarcilla De Ramos","provider":"Aemet","latitude":37.844722,"longitude":-1.869722},
        {"id":"7209","name":"Lorca","provider":"Aemet","latitude":37.656389,"longitude":-1.687222},
        {"id":"7218Y","name":"Totana","provider":"Aemet","latitude":37.758611,"longitude":-1.512778},
        {"id":"7227X","name":"Alhama De Murcia","provider":"Aemet","latitude":37.861667,"longitude":-1.334722},
        {"id":"7237E","name":"Molina De Segura","provider":"Aemet","latitude":38.138889,"longitude":-1.158611},
        {"id":"7244X","name":"Orihuela","provider":"Aemet","latitude":38.067778,"longitude":-0.981389},
        {"id":"7247X","name":"El Pinós/pinoso","provider":"Aemet","latitude":38.399722,"longitude":-1.038056},
        {"id":"7261X","name":"Rojales","provider":"Aemet","latitude":38.088056,"longitude":-0.715278},
        {"id":"7275C","name":"Yecla","provider":"Aemet","latitude":38.601667,"longitude":-1.159722},
        {"id":"8008Y","name":"Villena","provider":"Aemet","latitude":38.576944,"longitude":-0.865556},
        {"id":"8019","name":"Alicante-elche Aeropuerto","provider":"Aemet","latitude":38.282778,"longitude":-0.570833},
        {"id":"8025","name":"Alacant/alicante","provider":"Aemet","latitude":38.3725,"longitude":-0.494167},
        {"id":"8036Y","name":"Benidorm","provider":"Aemet","latitude":38.543611,"longitude":-0.137778},
        {"id":"8050X","name":"Jávea/ Xàbia","provider":"Aemet","latitude":38.784167,"longitude":0.166667},
        {"id":"8057C","name":"Pego","provider":"Aemet","latitude":38.846667,"longitude":-0.118333},
        {"id":"8058X","name":"Oliva","provider":"Aemet","latitude":38.904167,"longitude":-0.065},
        {"id":"8058Y","name":"Miramar","provider":"Aemet","latitude":38.950278,"longitude":-0.137778},
        {"id":"8059C","name":"Alcoi/alcoy","provider":"Aemet","latitude":38.710833,"longitude":-0.46},
        {"id":"8072Y","name":"Barx","provider":"Aemet","latitude":39.016944,"longitude":-0.304722},
        {"id":"8096","name":"Cuenca","provider":"Aemet","latitude":40.067222,"longitude":-2.131944},
        {"id":"8155Y","name":"Motilla Del Palancar","provider":"Aemet","latitude":39.555278,"longitude":-1.915278},
        {"id":"8175","name":"Albacete Base Aérea","provider":"Aemet","latitude":38.954167,"longitude":-1.856389},
        {"id":"8177A","name":"Chinchilla","provider":"Aemet","latitude":38.9375,"longitude":-1.658889},
        {"id":"8178D","name":"Albacete","provider":"Aemet","latitude":39.005556,"longitude":-1.862222},
        {"id":"8193E","name":"Jalance","provider":"Aemet","latitude":39.208333,"longitude":-1.094444},
        {"id":"8198Y","name":"Almansa","provider":"Aemet","latitude":38.850556,"longitude":-1.063056},
        {"id":"8203O","name":"Zarra","provider":"Aemet","latitude":39.083056,"longitude":-1.101111},
        {"id":"8210Y","name":"Salvacañete","provider":"Aemet","latitude":40.103056,"longitude":-1.503611},
        {"id":"8270X","name":"Bicorp","provider":"Aemet","latitude":39.133611,"longitude":-0.79},
        {"id":"8283X","name":"Ontinyent","provider":"Aemet","latitude":38.829444,"longitude":-0.607778},
        {"id":"8293X","name":"Xàtiva","provider":"Aemet","latitude":39.001667,"longitude":-0.523056},
        {"id":"8300X","name":"Carcaixent","provider":"Aemet","latitude":39.113333,"longitude":-0.445833},
        {"id":"8309X","name":"Utiel","provider":"Aemet","latitude":39.575556,"longitude":-1.244722},
        {"id":"8325X","name":"Polinyà De Xúquer","provider":"Aemet","latitude":39.183889,"longitude":-0.371389},
        {"id":"8354X","name":"Albarracín","provider":"Aemet","latitude":40.419722,"longitude":-1.441389},
        {"id":"8368U","name":"Teruel","provider":"Aemet","latitude":40.350833,"longitude":-1.124167},
        {"id":"8376","name":"Jabaloyas","provider":"Aemet","latitude":40.236111,"longitude":-1.411667},
        {"id":"8395X","name":"Chelva","provider":"Aemet","latitude":39.753333,"longitude":-0.993611},
        {"id":"8409X","name":"Llíria","provider":"Aemet","latitude":39.663889,"longitude":-0.653889},
        {"id":"8414A","name":"Valencia Aeropuerto","provider":"Aemet","latitude":39.485,"longitude":-0.474722},
        {"id":"8416","name":"València","provider":"Aemet","latitude":39.480556,"longitude":-0.366389},
        {"id":"8439X","name":"Segorbe","provider":"Aemet","latitude":39.795556,"longitude":-0.485278},
        {"id":"8458X","name":"Cedrillas","provider":"Aemet","latitude":40.430556,"longitude":-0.849444},
        {"id":"8472A","name":"Montanejos","provider":"Aemet","latitude":40.087778,"longitude":-0.546944},
        {"id":"8486X","name":"Mosqueruela","provider":"Aemet","latitude":40.3625,"longitude":-0.454444},
        {"id":"8489X","name":"Villafranca Del Cid/vilafranca","provider":"Aemet","latitude":40.433333,"longitude":-0.255556},
        {"id":"8492X","name":"Atzeneta Del Maestrat","provider":"Aemet","latitude":40.227222,"longitude":-0.169722},
        {"id":"8500A","name":"Castelló - Almassora","provider":"Aemet","latitude":39.957222,"longitude":-0.071944},
        {"id":"8503Y","name":"Torreblanca","provider":"Aemet","latitude":40.211389,"longitude":0.183611},
        {"id":"8520X","name":"La Pobla De Benifassà-fredes","provider":"Aemet","latitude":40.693611,"longitude":0.165278},
        {"id":"9001D","name":"Reinosa","provider":"Aemet","latitude":42.991944,"longitude":-4.160556},
        {"id":"9001S","name":"Alto Campoo","provider":"Aemet","latitude":43.036667,"longitude":-4.374444},
        {"id":"9016X","name":"Valderredible, Cubillo De Ebro","provider":"Aemet","latitude":42.809722,"longitude":-4.032222},
        {"id":"9031C","name":"Briviesca","provider":"Aemet","latitude":42.559444,"longitude":-3.308889},
        {"id":"9051","name":"Medina De Pomar","provider":"Aemet","latitude":42.92,"longitude":-3.482778},
        {"id":"9060X","name":"Lalastra","provider":"Aemet","latitude":42.875278,"longitude":-3.231667},
        {"id":"9069C","name":"Miranda De Ebro","provider":"Aemet","latitude":42.687222,"longitude":-2.960556},
        {"id":"9073X","name":"Agurain/salvatierra, Opakua","provider":"Aemet","latitude":42.829722,"longitude":-2.359722},
        {"id":"9091R","name":"Vitoria-gasteiz Aeropuerto","provider":"Aemet","latitude":42.871944,"longitude":-2.732778},
        {"id":"9111","name":"Belorado","provider":"Aemet","latitude":42.421111,"longitude":-3.170278},
        {"id":"9115X","name":"Valdezcaray","provider":"Aemet","latitude":42.255,"longitude":-2.968056},
        {"id":"9122I","name":"Labastida","provider":"Aemet","latitude":42.603889,"longitude":-2.776667},
        {"id":"9141V","name":"Nájera","provider":"Aemet","latitude":42.414167,"longitude":-2.726667},
        {"id":"9145Y","name":"Cenicero","provider":"Aemet","latitude":42.482778,"longitude":-2.639444},
        {"id":"9170","name":"Logroño, Aeropuerto","provider":"Aemet","latitude":42.452222,"longitude":-2.331111},
        {"id":"9171K","name":"Los Arcos","provider":"Aemet","latitude":42.570278,"longitude":-2.183889},
        {"id":"9188","name":"Enciso","provider":"Aemet","latitude":42.149444,"longitude":-2.273333},
        {"id":"9195C","name":"Astún- La Raca","provider":"Aemet","latitude":42.793056,"longitude":-0.505278},
        {"id":"9198X","name":"Canfranc","provider":"Aemet","latitude":42.749444,"longitude":-0.516111},
        {"id":"9201X","name":"Jaca","provider":"Aemet","latitude":42.579722,"longitude":-0.545},
        {"id":"9207","name":"Valle De Hecho, Hecho","provider":"Aemet","latitude":42.740556,"longitude":-0.750556},
        {"id":"9208E","name":"Aragüés Del Puerto","provider":"Aemet","latitude":42.708611,"longitude":-0.672778},
        {"id":"9211F","name":"Bailo, Puyalto","provider":"Aemet","latitude":42.514167,"longitude":-0.817222},
        {"id":"9218A","name":"Isaba/izaba","provider":"Aemet","latitude":42.8625,"longitude":-0.924722},
        {"id":"9228J","name":"Oroz-betelu/orotz-betelu","provider":"Aemet","latitude":42.896111,"longitude":-1.300278},
        {"id":"9228T","name":"Roncesvalles/orreaga","provider":"Aemet","latitude":43.007778,"longitude":-1.325556},
        {"id":"9244X","name":"Sos Del Rey Católico","provider":"Aemet","latitude":42.490833,"longitude":-1.213333},
        {"id":"9245X","name":"Cáseda","provider":"Aemet","latitude":42.521389,"longitude":-1.366389},
        {"id":"9252X","name":"Olite/erriberri","provider":"Aemet","latitude":42.489167,"longitude":-1.655556},
        {"id":"9262P","name":"Monreal/elo","provider":"Aemet","latitude":42.701111,"longitude":-1.495556},
        {"id":"9263D","name":"Pamplona, Aeropuerto","provider":"Aemet","latitude":42.776944,"longitude":-1.65},
        {"id":"9263X","name":"Aranguren, Ilundain","provider":"Aemet","latitude":42.776111,"longitude":-1.5325},
        {"id":"9274X","name":"Irurtzun","provider":"Aemet","latitude":42.918889,"longitude":-1.835},
        {"id":"9280B","name":"Larraga","provider":"Aemet","latitude":42.549444,"longitude":-1.8575},
        {"id":"9287A","name":"San Pedro Manrique","provider":"Aemet","latitude":42.026389,"longitude":-2.230833},
        {"id":"9293X","name":"Alfaro, La Plana","provider":"Aemet","latitude":42.176111,"longitude":-1.743889},
        {"id":"9294E","name":"Bardenas Reales, Base Aérea","provider":"Aemet","latitude":42.198611,"longitude":-1.475278},
        {"id":"9299X","name":"Tarazona","provider":"Aemet","latitude":41.915,"longitude":-1.723333},
        {"id":"9302Y","name":"Tudela","provider":"Aemet","latitude":42.055556,"longitude":-1.609444},
        {"id":"9336D","name":"Castejon De Valdejasa","provider":"Aemet","latitude":41.984167,"longitude":-0.995833},
        {"id":"9344C","name":"Arcos De Jalón","provider":"Aemet","latitude":41.216389,"longitude":-2.293056},
        {"id":"9352A","name":"Almazul","provider":"Aemet","latitude":41.574722,"longitude":-2.140278},
        {"id":"9374X","name":"Santa Eulalia Del Campo","provider":"Aemet","latitude":40.566667,"longitude":-1.320833},
        {"id":"9377Y","name":"El Pedregal","provider":"Aemet","latitude":40.778611,"longitude":-1.568333},
        {"id":"9381I","name":"Calamocha","provider":"Aemet","latitude":40.926111,"longitude":-1.293333},
        {"id":"9390","name":"Daroca","provider":"Aemet","latitude":41.114444,"longitude":-1.41},
        {"id":"9394X","name":"Calatayud","provider":"Aemet","latitude":41.331111,"longitude":-1.645278},
        {"id":"9427X","name":"La Almunia De Doña Godina","provider":"Aemet","latitude":41.481111,"longitude":-1.380833},
        {"id":"9434","name":"Zaragoza, Aeropuerto","provider":"Aemet","latitude":41.660556,"longitude":-1.004167},
        {"id":"9434P","name":"Zaragoza, Valdespartera","provider":"Aemet","latitude":41.621111,"longitude":-0.934722},
        {"id":"9436X","name":"Fonfría","provider":"Aemet","latitude":40.995278,"longitude":-1.0875},
        {"id":"9445L","name":"Formigal, Sarrios","provider":"Aemet","latitude":42.7625,"longitude":-0.392778},
        {"id":"9451F","name":"Panticosa, Petrosos","provider":"Aemet","latitude":42.704444,"longitude":-0.275278},
        {"id":"9453X","name":"Biescas, Embalse De Búbal","provider":"Aemet","latitude":42.699167,"longitude":-0.318889},
        {"id":"9460X","name":"Sabiñánigo","provider":"Aemet","latitude":42.512778,"longitude":-0.355556},
        {"id":"9491X","name":"Almudévar","provider":"Aemet","latitude":42.029444,"longitude":-0.585833},
        {"id":"9495Y","name":"Leciñena","provider":"Aemet","latitude":41.796667,"longitude":-0.617222},
        {"id":"9501X","name":"Valmadrid","provider":"Aemet","latitude":41.443056,"longitude":-0.885833},
        {"id":"9510X","name":"Quinto","provider":"Aemet","latitude":41.429167,"longitude":-0.503889},
        {"id":"9513X","name":"Muniesa","provider":"Aemet","latitude":41.031111,"longitude":-0.805556},
        {"id":"9531Y","name":"Montalbán","provider":"Aemet","latitude":40.828611,"longitude":-0.792778},
        {"id":"9546B","name":"Hijar","provider":"Aemet","latitude":41.171944,"longitude":-0.441944},
        {"id":"9550C","name":"Andorra, Horcallana","provider":"Aemet","latitude":40.974444,"longitude":-0.407778},
        {"id":"9561X","name":"Castellote","provider":"Aemet","latitude":40.798333,"longitude":-0.315278},
        {"id":"9562X","name":"Morella","provider":"Aemet","latitude":40.621667,"longitude":-0.101944},
        {"id":"9563X","name":"Castellfort","provider":"Aemet","latitude":40.498611,"longitude":-0.186667},
        {"id":"9569A","name":"Calanda","provider":"Aemet","latitude":40.946667,"longitude":-0.237778},
        {"id":"9573X","name":"Alcañiz","provider":"Aemet","latitude":41.058056,"longitude":-0.141667},
        {"id":"9574B","name":"Caspe, Plana Del Pilón","provider":"Aemet","latitude":41.2425,"longitude":-0.068611},
        {"id":"9585","name":"La Molina","provider":"Aemet","latitude":42.3325,"longitude":1.939444},
        {"id":"9590","name":"Martinet","provider":"Aemet","latitude":42.362222,"longitude":1.693333},
        {"id":"9590D","name":"Cap De Rec","provider":"Aemet","latitude":42.430278,"longitude":1.6675},
        {"id":"9638D","name":"Coll De Nargó","provider":"Aemet","latitude":42.154444,"longitude":1.311944},
        {"id":"9657X","name":"Esterri D'àneu","provider":"Aemet","latitude":42.625,"longitude":1.126111},
        {"id":"9677","name":"Port Ainé","provider":"Aemet","latitude":42.41,"longitude":1.214722},
        {"id":"9707","name":"Llimiana","provider":"Aemet","latitude":42.066944,"longitude":0.907222},
        {"id":"9718X","name":"Tordera - Granyanella","provider":"Aemet","latitude":41.681111,"longitude":1.223056},
        {"id":"9724X","name":"Os De Balaguer","provider":"Aemet","latitude":41.873333,"longitude":0.756111},
        {"id":"9726E","name":"Llorac","provider":"Aemet","latitude":41.557222,"longitude":1.309444},
        {"id":"9729X","name":"Mollerussa","provider":"Aemet","latitude":41.616944,"longitude":0.866667},
        {"id":"9744B","name":"Vall De Boí","provider":"Aemet","latitude":42.503333,"longitude":0.798889},
        {"id":"9751","name":"Sopeira","provider":"Aemet","latitude":42.318611,"longitude":0.746944},
        {"id":"9756X","name":"Benabarre","provider":"Aemet","latitude":42.1125,"longitude":0.48},
        {"id":"9771C","name":"Lleida","provider":"Aemet","latitude":41.626111,"longitude":0.598056},
        {"id":"9808X","name":"Aínsa-sobrarbe, La Serreta","provider":"Aemet","latitude":42.421667,"longitude":0.138056},
        {"id":"9812M","name":"Parador De Ordesa, Parque Nacional Ordesa Y Monteperdido","provider":"Aemet","latitude":42.655278,"longitude":-0.099167},
        {"id":"9814I","name":"Torla-ordesa, El Cebollar","provider":"Aemet","latitude":42.656111,"longitude":-0.124444},
        {"id":"9814X","name":"Torla - Ordesa","provider":"Aemet","latitude":42.6375,"longitude":-0.111944},
        {"id":"9838B","name":"Benasque","provider":"Aemet","latitude":42.599444,"longitude":0.520556},
        {"id":"9839V","name":"Cerler, Cogulla","provider":"Aemet","latitude":42.555,"longitude":0.543056},
        {"id":"9843A","name":"Seira","provider":"Aemet","latitude":42.476944,"longitude":0.434167},
        {"id":"9855E","name":"Capella, Laguarres","provider":"Aemet","latitude":42.201389,"longitude":0.466111},
        {"id":"9866C","name":"Barbastro","provider":"Aemet","latitude":42.021389,"longitude":0.140556},
        {"id":"9894Y","name":"Sariñena","provider":"Aemet","latitude":41.799167,"longitude":-0.160833},
        {"id":"9898","name":"Huesca, Aeropuerto","provider":"Aemet","latitude":42.084444,"longitude":-0.325556},
        {"id":"9908X","name":"Lanaja","provider":"Aemet","latitude":41.773889,"longitude":-0.333056},
        {"id":"9911X","name":"Ballobar","provider":"Aemet","latitude":41.619444,"longitude":0.187778},
        {"id":"9918Y","name":"Tamarite De Litera, La Melusa","provider":"Aemet","latitude":41.780833,"longitude":0.376944},
        {"id":"9924X","name":"Fraga","provider":"Aemet","latitude":41.524722,"longitude":0.355556},
        {"id":"9935X","name":"Valderrobres","provider":"Aemet","latitude":40.873333,"longitude":0.146389},
        {"id":"9947X","name":"La Pobla De Massaluca","provider":"Aemet","latitude":41.177222,"longitude":0.353333},
        {"id":"9961X","name":"Cabacés","provider":"Aemet","latitude":41.249444,"longitude":0.735278},
        {"id":"9975X","name":"Rasquera","provider":"Aemet","latitude":41.005,"longitude":0.613611},
        {"id":"9981A","name":"Estación De Tortosa (roquetes)","provider":"Aemet","latitude":40.820278,"longitude":0.493333},
        {"id":"9990X","name":"Naut Aran, Arties","provider":"Aemet","latitude":42.700278,"longitude":0.876944},
        {"id":"9994X","name":"Bossòst","provider":"Aemet","latitude":42.776111,"longitude":0.689722},
        {"id":"9995Y","name":"Valcarlos/luzaide","provider":"Aemet","latitude":43.091111,"longitude":-1.300833},
        {"id":"9998X","name":"Bello","provider":"Aemet","latitude":40.921389,"longitude":-1.494444}
    ];

    const ESTACIONES_HOLFUY = 
    [
        {"id":"s869","name":"Braunwald Gumen","provider":"Holfuy","latitude":46.95624,"longitude":8.98506},
        {"id":"s1625","name":"Blaser Swisslube AG","provider":"Holfuy","latitude":47.01941,"longitude":7.65471},
        {"id":"s511","name":"Buchenberg Buching","provider":"Holfuy","latitude":47.60642,"longitude":10.81141},
        {"id":"s1027","name":"La Nava (ACAMET)","provider":"Holfuy","latitude":36.66601,"longitude":-5.05317},
        {"id":"s1936","name":"Rosnoën","provider":"Holfuy","latitude":48.26311,"longitude":-4.21388},
        {"id":"s960","name":"Zugerberg","provider":"Holfuy","latitude":47.148,"longitude":8.53599},
        {"id":"s1292","name":"Chalet du Chef","provider":"Holfuy","latitude":46.60039,"longitude":6.25965},
        {"id":"s1291","name":"Bürchen Mällig","provider":"Holfuy","latitude":46.24645,"longitude":7.80201},
        {"id":"s223","name":"Vuelo Libre León 1","provider":"Holfuy","latitude":42.874116,"longitude":-5.373977},
        {"id":"s235","name":"Laubberg","provider":"Holfuy","latitude":47.54285,"longitude":8.149191},
        {"id":"s236","name":"Grünberg FlyingSwans","provider":"Holfuy","latitude":47.898658,"longitude":13.818388},
        {"id":"s245","name":"Kistleralp/Stofel","provider":"Holfuy","latitude":47.16114,"longitude":8.96138},
        {"id":"s276","name":"Lorea Startplz","provider":"Holfuy","latitude":47.34653,"longitude":10.79092},
        {"id":"s1322","name":"Ochsenberg","provider":"Holfuy","latitude":47.50688,"longitude":10.3995},
        {"id":"s281","name":"Flugschule Jura Thal","provider":"Holfuy","latitude":47.298456,"longitude":7.568319},
        {"id":"s289","name":"Brento Exit","provider":"Holfuy","latitude":45.997417,"longitude":10.905077},
        {"id":"s292","name":"Ca del Monte Sud","provider":"Holfuy","latitude":44.81621,"longitude":9.07351},
        {"id":"s1516","name":"Garl. Brauneck LGGF","provider":"Holfuy","latitude":47.66338,"longitude":11.52648},
        {"id":"s310","name":"Aloña (Oñati) s310","provider":"Holfuy","latitude":43.004572,"longitude":-2.422076},
        {"id":"s1343","name":"Berg Brauneck LGGF","provider":"Holfuy","latitude":47.66365,"longitude":11.52303},
        {"id":"s324","name":"Ob Lucken","provider":"Holfuy","latitude":47.76292,"longitude":8.5559},
        {"id":"s342","name":"Fürstenberg Süd","provider":"Holfuy","latitude":47.88948,"longitude":8.56284},
        {"id":"s343","name":"Monte Carza","provider":"Holfuy","latitude":46.04221,"longitude":8.6736},
        {"id":"s346","name":"Venetflieger LPZ","provider":"Holfuy","latitude":47.154376,"longitude":10.581614},
        {"id":"s347","name":"Grubig West","provider":"Holfuy","latitude":47.385944,"longitude":10.847304},
        {"id":"s348","name":"Grubig Zirbe","provider":"Holfuy","latitude":47.38758,"longitude":10.85389},
        {"id":"s349","name":"Moos LP","provider":"Holfuy","latitude":47.39806,"longitude":10.89596},
        {"id":"s356","name":"Borgo Priolo","provider":"Holfuy","latitude":44.96359,"longitude":9.12549},
        {"id":"s367","name":"ElFerre","provider":"Holfuy","latitude":43.47317,"longitude":-5.75633},
        {"id":"s368","name":"Grubig Landeplatz","provider":"Holfuy","latitude":47.400397,"longitude":10.880574},
        {"id":"s376","name":"Gotschnagrat","provider":"Holfuy","latitude":46.858744,"longitude":9.845667},
        {"id":"s423","name":"Kandel Süd DGFC","provider":"Holfuy","latitude":48.05863,"longitude":8.01588},
        {"id":"s388","name":"Rofan - Startplatz ","provider":"Holfuy","latitude":47.444086,"longitude":11.763815},
        {"id":"s392","name":"SCA Stoderzinken","provider":"Holfuy","latitude":47.459413,"longitude":13.828295},
        {"id":"s396","name":"Fetzenflieger LPZ","provider":"Holfuy","latitude":47.30498,"longitude":10.85258},
        {"id":"s413","name":"9erköpfle Landeplatz","provider":"Holfuy","latitude":47.4999,"longitude":10.52524},
        {"id":"s424","name":"UnternbergRuhpolding","provider":"Holfuy","latitude":47.72844,"longitude":12.638374},
        {"id":"s1591","name":"ChaletInter","provider":"Holfuy","latitude":45.4126,"longitude":6.6221},
        {"id":"s1396","name":"Hochoetz","provider":"Holfuy","latitude":47.208301,"longitude":10.934734},
        {"id":"s452","name":"Arlberg (Kapall)","provider":"Holfuy","latitude":47.14817,"longitude":10.24844},
        {"id":"s454","name":"Gabersee","provider":"Holfuy","latitude":48.06182,"longitude":12.20318},
        {"id":"s459","name":"Brento LZ","provider":"Holfuy","latitude":45.992821,"longitude":10.926321},
        {"id":"s1812","name":"Rigi Scheidegg Arche","provider":"Holfuy","latitude":47.02748,"longitude":8.52025},
        {"id":"s465","name":"Arlberg (Rendl)","provider":"Holfuy","latitude":47.11262,"longitude":10.27615},
        {"id":"s1235","name":"1235 Fréterette","provider":"Holfuy","latitude":46.45487,"longitude":6.17989},
        {"id":"s477","name":"Pobbio (basso)","provider":"Holfuy","latitude":44.69125,"longitude":9.11461},
        {"id":"s1792","name":"ZFC: Schwarzsee ","provider":"Holfuy","latitude":45.99088,"longitude":7.71113},
        {"id":"s482","name":"Micheldorf HW-Stein","provider":"Holfuy","latitude":47.88623,"longitude":14.16399},
        {"id":"s484","name":"Metschstand","provider":"Holfuy","latitude":46.44435,"longitude":7.49567},
        {"id":"s487","name":"ZFS-Bruggerstube","provider":"Holfuy","latitude":47.181185,"longitude":11.870915},
        {"id":"s489","name":"Kandel West DGFC","provider":"Holfuy","latitude":48.06529,"longitude":8.01542},
        {"id":"s493","name":"Bayrischzell Landepl","provider":"Holfuy","latitude":47.67021,"longitude":12.01704},
        {"id":"s496","name":"Alp Scheidegg Top","provider":"Holfuy","latitude":47.30525,"longitude":8.94376},
        {"id":"s507","name":"Schwengimatt DC-Falk","provider":"Holfuy","latitude":47.2888337,"longitude":7.674342},
        {"id":"s516","name":"Spaichingen 3-er","provider":"Holfuy","latitude":48.08395,"longitude":8.76036},
        {"id":"s517","name":"Schauinsland","provider":"Holfuy","latitude":47.90954,"longitude":7.88928},
        {"id":"s533","name":"Wolfratshauserhütte ","provider":"Holfuy","latitude":47.39093,"longitude":10.84848},
        {"id":"s536","name":"ZFS-Melchboden","provider":"Holfuy","latitude":47.21901,"longitude":11.82452},
        {"id":"s538","name":"Culla L´Arcu","provider":"Holfuy","latitude":43.23374,"longitude":-5.46566},
        {"id":"s549","name":"Charmey Vounetz","provider":"Holfuy","latitude":46.62605,"longitude":7.20775},
        {"id":"s571","name":"Prodkamm","provider":"Holfuy","latitude":47.07321,"longitude":9.26763},
        {"id":"s575","name":"Wank","provider":"Holfuy","latitude":47.50676,"longitude":11.14764},
        {"id":"s578","name":"ENDOIA s578","provider":"Holfuy","latitude":43.24613,"longitude":-2.26877},
        {"id":"s603","name":"AVLE NOEMÍ PEDRO B","provider":"Holfuy","latitude":40.25383,"longitude":-4.90154},
        {"id":"s604","name":"Hochfelln Süd","provider":"Holfuy","latitude":47.76106,"longitude":12.55959},
        {"id":"s610","name":"Opfertshofen","provider":"Holfuy","latitude":47.77429,"longitude":8.65656},
        {"id":"s615","name":"Seegeier Kulm","provider":"Holfuy","latitude":47.22851,"longitude":15.76179},
        {"id":"s1547","name":"Arosa Weisshorn","provider":"Holfuy","latitude":46.78927,"longitude":9.63907},
        {"id":"s619","name":"Zeltenbach","provider":"Holfuy","latitude":47.78892,"longitude":9.49506},
        {"id":"s623","name":"Alp Scheidegg Start","provider":"Holfuy","latitude":47.30376,"longitude":8.94319},
        {"id":"s626","name":"Club RC De l´Ebre","provider":"Holfuy","latitude":40.75638,"longitude":0.436406},
        {"id":"s627","name":"Münsingen PWA","provider":"Holfuy","latitude":48.41462,"longitude":9.52143},
        {"id":"s644","name":"s644","provider":"Holfuy","latitude":46.73161,"longitude":2.79297},
        {"id":"s645","name":"Marienberg","provider":"Holfuy","latitude":47.349266,"longitude":10.899699},
        {"id":"s754","name":"Hintereck","provider":"Holfuy","latitude":48.04919,"longitude":8.12421},
        {"id":"s665","name":"Schöneben SP","provider":"Holfuy","latitude":47.22779,"longitude":14.16074},
        {"id":"s676","name":"Breitenberg Pfronten","provider":"Holfuy","latitude":47.54662,"longitude":10.56447},
        {"id":"s656","name":"Base ULM Fréjus","provider":"Holfuy","latitude":43.42334,"longitude":6.69751},
        {"id":"s666","name":"Spielberg","provider":"Holfuy","latitude":47.21544,"longitude":14.84706},
        {"id":"s669","name":"Ca del Monte Ovest","provider":"Holfuy","latitude":44.81826,"longitude":9.07078},
        {"id":"s672","name":"Vogelsang","provider":"Holfuy","latitude":47.66511,"longitude":12.03565},
        {"id":"s683","name":"Huendle Landeplatz","provider":"Holfuy","latitude":47.55181,"longitude":10.05315},
        {"id":"s690","name":"Sonchaux","provider":"Holfuy","latitude":46.41856,"longitude":6.95072},
        {"id":"s692","name":"Cascajera/UGR-ACAMET","provider":"Holfuy","latitude":36.63849,"longitude":-5.08251},
        {"id":"s695","name":"Sender Kleinerberg","provider":"Holfuy","latitude":47.73362,"longitude":14.36657},
        {"id":"s708","name":"Schwanden","provider":"Holfuy","latitude":47.58911,"longitude":10.02877},
        {"id":"s718","name":"VLS Deltaland","provider":"Holfuy","latitude":45.59739,"longitude":10.81862},
        {"id":"s721","name":"FlugschuleArlberg SP","provider":"Holfuy","latitude":47.22856,"longitude":9.73894},
        {"id":"s722","name":"Arlberg (Rüfikopf)","provider":"Holfuy","latitude":47.20225,"longitude":10.16728},
        {"id":"s723","name":"Arlberg (Galzig)","provider":"Holfuy","latitude":47.13519,"longitude":10.22104},
        {"id":"s738","name":"Hahnenkamm Grat","provider":"Holfuy","latitude":47.47236,"longitude":10.643},
        {"id":"s741","name":"Jochdohlen  LP","provider":"Holfuy","latitude":47.14852,"longitude":11.34474},
        {"id":"s742","name":"Jochdohlen SP","provider":"Holfuy","latitude":47.1459,"longitude":11.3072},
        {"id":"s712","name":"Schnaithalde","provider":"Holfuy","latitude":48.29648,"longitude":9.05742},
        {"id":"s751","name":"Haimburgerberg","provider":"Holfuy","latitude":46.71838,"longitude":14.67268},
        {"id":"s753","name":"Fürstenberg Nord","provider":"Holfuy","latitude":47.8914,"longitude":8.56519},
        {"id":"s755","name":"Villaceid (León)","provider":"Holfuy","latitude":42.77058,"longitude":-5.90388},
        {"id":"s770","name":"SP Thurnhamberg","provider":"Holfuy","latitude":47.87268,"longitude":14.09257},
        {"id":"s771","name":"Osterfelder","provider":"Holfuy","latitude":47.43917,"longitude":11.0502},
        {"id":"s772","name":"LP Osterfelder","provider":"Holfuy","latitude":47.474436,"longitude":11.060652},
        {"id":"s779","name":"Heue Bergalingen","provider":"Holfuy","latitude":47.6196,"longitude":7.93939},
        {"id":"s776","name":"Muottas Muragl","provider":"Holfuy","latitude":46.52128,"longitude":9.90135},
        {"id":"s788","name":"Hochfirst","provider":"Holfuy","latitude":47.90159,"longitude":8.18317},
        {"id":"s789","name":"Navacillo/UGR-ACAMET","provider":"Holfuy","latitude":36.66626,"longitude":-5.10831},
        {"id":"s803","name":"Ratholz","provider":"Holfuy","latitude":47.56947,"longitude":10.13435},
        {"id":"s804","name":"Finkennest","provider":"Holfuy","latitude":47.58286,"longitude":10.01514},
        {"id":"s816","name":"AKFM-Costa de Lavos","provider":"Holfuy","latitude":40.09059,"longitude":-8.87594},
        {"id":"s824","name":"Ortenberg/Offenburg","provider":"Holfuy","latitude":48.43739,"longitude":7.97046},
        {"id":"s828","name":"VLS M. Belpo Devid","provider":"Holfuy","latitude":45.61646,"longitude":10.76156},
        {"id":"s937","name":"LA MOUETTE SINAGOTE","provider":"Holfuy","latitude":47.59972,"longitude":-2.73431},
        {"id":"s1655","name":" Croix de Boutières ","provider":"Holfuy","latitude":44.89804,"longitude":4.18582},
        {"id":"s839","name":"Eugendorf 1","provider":"Holfuy","latitude":47.86674,"longitude":13.12183},
        {"id":"s813","name":"Bodenlos Neubiberg","provider":"Holfuy","latitude":48.05969,"longitude":11.62484},
        {"id":"s855","name":"Piloti Bergeggi ","provider":"Holfuy","latitude":44.25133,"longitude":8.43983},
        {"id":"s857","name":"Spieser Hindelang","provider":"Holfuy","latitude":47.52737,"longitude":10.3897},
        {"id":"s871","name":"Pöllau (#871)","provider":"Holfuy","latitude":47.30218,"longitude":15.82989},
        {"id":"s874","name":"Devoluy Altisurface","provider":"Holfuy","latitude":44.6672,"longitude":5.90407},
        {"id":"s877","name":"Pöllauberg (#877)","provider":"Holfuy","latitude":47.31693,"longitude":15.85832},
        {"id":"s882","name":"loge des gardes ","provider":"Holfuy","latitude":46.00461,"longitude":3.79423},
        {"id":"s883","name":"Plaine Morte, CVLCMA","provider":"Holfuy","latitude":46.37107,"longitude":7.49259},
        {"id":"s881","name":"Eugendorf 2","provider":"Holfuy","latitude":47.84053,"longitude":13.14157},
        {"id":"s914","name":"MONT MINISTRE","provider":"Holfuy","latitude":45.469,"longitude":4.69359},
        {"id":"s913","name":"SALVARIS","provider":"Holfuy","latitude":45.41644,"longitude":4.48313},
        {"id":"s899","name":"Terra Botanica","provider":"Holfuy","latitude":47.50101,"longitude":-0.5687},
        {"id":"s901","name":"AMCCO Messigny","provider":"Holfuy","latitude":47.39894,"longitude":4.99425},
        {"id":"s905","name":"Tegelberg Startplatz","provider":"Holfuy","latitude":47.55974,"longitude":10.77982},
        {"id":"s906","name":"Nebelhorn 1930m","provider":"Holfuy","latitude":47.41328,"longitude":10.3471},
        {"id":"s1485","name":"Spieljoch","provider":"Holfuy","latitude":47.33237,"longitude":11.79462},
        {"id":"s915","name":"Mont Semiol 42","provider":"Holfuy","latitude":45.63538,"longitude":3.96676},
        {"id":"s917","name":"G2 Bouquetin","provider":"Holfuy","latitude":45.33889,"longitude":6.57319},
        {"id":"s918","name":"G2 Cote Brune","provider":"Holfuy","latitude":45.3193,"longitude":6.57999},
        {"id":"s919","name":"Lac Ariondaz","provider":"Holfuy","latitude":45.38573,"longitude":6.65558},
        {"id":"s921","name":"G2 Roc de Tougne","provider":"Holfuy","latitude":45.35402,"longitude":6.56722},
        {"id":"s922","name":"G4 Pas du Lac","provider":"Holfuy","latitude":45.38121,"longitude":6.60936},
        {"id":"s925","name":"MG Huttwil ","provider":"Holfuy","latitude":47.11862,"longitude":7.8582},
        {"id":"s927","name":"Crêt du Midi","provider":"Holfuy","latitude":46.22917,"longitude":7.52874},
        {"id":"s928","name":"Grimer","provider":"Holfuy","latitude":46.55538,"longitude":7.68645},
        {"id":"s929","name":"GMR Avenches","provider":"Holfuy","latitude":46.89662,"longitude":7.02349},
        {"id":"s930","name":"Kite Club MarsalaRRD","provider":"Holfuy","latitude":37.8443,"longitude":12.46476},
        {"id":"s931","name":"VLS Decollo Colonei","provider":"Holfuy","latitude":45.65295,"longitude":10.81001},
        {"id":"s932","name":"môle Port-Vendres","provider":"Holfuy","latitude":42.5229,"longitude":3.11758},
        {"id":"s942","name":"Acpm83","provider":"Holfuy","latitude":43.18503,"longitude":6.10647},
        {"id":"s946","name":"Sinswang","provider":"Holfuy","latitude":47.56716,"longitude":9.99596},
        {"id":"s957","name":"Auf der Wanne","provider":"Holfuy","latitude":48.44616,"longitude":9.22736},
        {"id":"s947","name":"Planplatten","provider":"Holfuy","latitude":46.73623,"longitude":8.25459},
        {"id":"s952","name":"Evolène La Vieille","provider":"Holfuy","latitude":46.11886,"longitude":7.52599},
        {"id":"s961","name":"Ramenegg","provider":"Holfuy","latitude":47.10212,"longitude":8.61423},
        {"id":"s1086","name":"Chalais","provider":"Holfuy","latitude":46.27358,"longitude":7.51213},
        {"id":"s969","name":"Alpe Foppa","provider":"Holfuy","latitude":46.11701,"longitude":8.8935},
        {"id":"s972","name":"Rofan Steilhang","provider":"Holfuy","latitude":47.44189,"longitude":11.75835},
        {"id":"s973","name":"Hollersbach ","provider":"Holfuy","latitude":47.28024,"longitude":12.40873},
        {"id":"s1000","name":"Decollo Malcesine","provider":"Holfuy","latitude":45.76923,"longitude":10.86437},
        {"id":"s1019","name":"LFGB Mulhouse","provider":"Holfuy","latitude":47.7446,"longitude":7.43163},
        {"id":"s1020","name":"CVN - Nid-du-Crô","provider":"Holfuy","latitude":46.99534,"longitude":6.95099},
        {"id":"s1024","name":"Wetterkreuz GTO","provider":"Holfuy","latitude":47.20935,"longitude":14.25769},
        {"id":"s1028","name":"Hörnerbahn Mitte","provider":"Holfuy","latitude":47.46165,"longitude":10.21457},
        {"id":"s1029","name":"Grüner Weg","provider":"Holfuy","latitude":47.45425,"longitude":10.2551},
        {"id":"s1036","name":"Garda Paragliding","provider":"Holfuy","latitude":45.63786,"longitude":10.61985},
        {"id":"s1039","name":"Anglet","provider":"Holfuy","latitude":43.52406,"longitude":-1.5248},
        {"id":"s1045","name":"AKFM-Cova-Gala","provider":"Holfuy","latitude":40.12548,"longitude":-8.86382},
        {"id":"s1047","name":"Babia, Prado Veneiro","provider":"Holfuy","latitude":42.95908,"longitude":-6.03287},
        {"id":"s1059","name":"Mülkerblatte","provider":"Holfuy","latitude":46.43485,"longitude":7.4135},
        {"id":"s1061","name":"Predigtstuhl ","provider":"Holfuy","latitude":47.69155,"longitude":12.88368},
        {"id":"s1062","name":"Pilotage BREST","provider":"Holfuy","latitude":48.36927,"longitude":-4.4868},
        {"id":"s1053","name":"Ile de Ré (PSL LOIX)","provider":"Holfuy","latitude":46.22857,"longitude":-1.43007},
        {"id":"s1063","name":"Spiesshorn ","provider":"Holfuy","latitude":47.82717,"longitude":8.03332},
        {"id":"s1064","name":"Flugplatz Agathazell","provider":"Holfuy","latitude":47.55383,"longitude":10.27406},
        {"id":"s1068","name":"Sanc'air Parapente","provider":"Holfuy","latitude":47.32208,"longitude":2.79646},
        {"id":"s1071","name":"Haag","provider":"Holfuy","latitude":47.4568,"longitude":12.43474},
        {"id":"s1085","name":"Huendle West","provider":"Holfuy","latitude":47.53687,"longitude":10.04916},
        {"id":"s1411","name":"KITE BEACH MONTEROS ","provider":"Holfuy","latitude":36.50114,"longitude":-4.83844},
        {"id":"s1100","name":"Terrain du CAMS","provider":"Holfuy","latitude":45.83031,"longitude":4.5778},
        {"id":"s1102","name":"Nebelhorn Gipfel ","provider":"Holfuy","latitude":47.42134,"longitude":10.34241},
        {"id":"s1976","name":"Tarrenz, Brenjursee","provider":"Holfuy","latitude":47.25456,"longitude":10.75846},
        {"id":"s1104","name":"Monteagudo-Portero","provider":"Holfuy","latitude":40.41519,"longitude":-0.75647},
        {"id":"s1108","name":"Port-Vendres Port","provider":"Holfuy","latitude":42.51786,"longitude":3.10919},
        {"id":"s1119","name":"Saint Desirat","provider":"Holfuy","latitude":45.24857,"longitude":4.79409},
        {"id":"s1125","name":"Schwyberg","provider":"Holfuy","latitude":46.67731,"longitude":7.26095},
        {"id":"s1126","name":"Baiza Santa Marina","provider":"Holfuy","latitude":42.87108,"longitude":-2.11447},
        {"id":"s1226","name":"Corgémont","provider":"Holfuy","latitude":47.17319,"longitude":7.13816},
        {"id":"s1135","name":"GRUISSAN-VieilleNouv","provider":"Holfuy","latitude":43.08612,"longitude":3.0915},
        {"id":"s1158","name":"Prabé","provider":"Holfuy","latitude":46.28328,"longitude":7.34929},
        {"id":"s1138","name":"Oreganal /UGR-ACAMET","provider":"Holfuy","latitude":36.67023,"longitude":-5.17246},
        {"id":"s1146","name":"Tréfuntec","provider":"Holfuy","latitude":48.12763,"longitude":-4.28072},
        {"id":"s1147","name":"Bellalui CVLCMA","provider":"Holfuy","latitude":46.3441,"longitude":7.48619},
        {"id":"s1152","name":"Dreibündenstein","provider":"Holfuy","latitude":46.80436,"longitude":9.49516},
        {"id":"s1156","name":"MFV Alpin - Grins","provider":"Holfuy","latitude":47.14238,"longitude":10.53094},
        {"id":"s1160","name":"Hubertushütte","provider":"Holfuy","latitude":47.9437,"longitude":8.6328},
        {"id":"s1162","name":"Dome des Rousse","provider":"Holfuy","latitude":45.12846,"longitude":6.10481},
        {"id":"s1163","name":"TMX clos giraud g2","provider":"Holfuy","latitude":45.13971,"longitude":6.09299},
        {"id":"s1164","name":"ZFC: Landing ","provider":"Holfuy","latitude":46.02643,"longitude":7.74961},
        {"id":"s1168","name":"décollage du puet","provider":"Holfuy","latitude":43.71,"longitude":6.82841},
        {"id":"s1169","name":"Mijoux (Décollage)","provider":"Holfuy","latitude":46.366677,"longitude":6.010971},
        {"id":"s1170","name":"Hauchenberg","provider":"Holfuy","latitude":47.62052,"longitude":10.1574},
        {"id":"s1879","name":"Monte Toro Sur","provider":"Holfuy","latitude":39.98431,"longitude":4.11326},
        {"id":"s1177","name":"DCC Altenberg","provider":"Holfuy","latitude":48.29538,"longitude":7.31279},
        {"id":"s1172","name":"VIGNE DEL REY","provider":"Holfuy","latitude":42.635,"longitude":2.7858},
        {"id":"s1176","name":"YCMC","provider":"Holfuy","latitude":43.54156,"longitude":3.97395},
        {"id":"s1179","name":"St-Sandoux (Dpt 63)","provider":"Holfuy","latitude":45.6305,"longitude":3.11672},
        {"id":"s1181","name":"Grotzenbüel","provider":"Holfuy","latitude":46.94912,"longitude":8.99429},
        {"id":"s1185","name":"Flugplatz Vogtareuth","provider":"Holfuy","latitude":47.94626,"longitude":12.20312},
        {"id":"s1186","name":"FS Wildschönau","provider":"Holfuy","latitude":47.43173,"longitude":12.09459},
        {"id":"s1187","name":"La Gaillarderie","provider":"Holfuy","latitude":47.47985,"longitude":3.3551},
        {"id":"s1191","name":"Marines de Cogolin","provider":"Holfuy","latitude":43.26531,"longitude":6.58811},
        {"id":"s1192","name":"COLINA DEL CUERVO","provider":"Holfuy","latitude":43.55486,"longitude":-5.6128},
        {"id":"s1196","name":"Creux-de-Genthod","provider":"Holfuy","latitude":46.26233,"longitude":6.16624},
        {"id":"s1202","name":"Tal Brauneck LGGF","provider":"Holfuy","latitude":47.67826,"longitude":11.56183},
        {"id":"s1204","name":"Selberdingerheim","provider":"Holfuy","latitude":47.90605,"longitude":12.59609},
        {"id":"s1220","name":"WSCÜ","provider":"Holfuy","latitude":47.75013,"longitude":9.19349},
        {"id":"s1221","name":"Stockberg","provider":"Holfuy","latitude":47.22443,"longitude":9.23846},
        {"id":"s1228","name":"Im Langacher","provider":"Holfuy","latitude":47.20677,"longitude":8.69449},
        {"id":"s1326","name":"Bélué","provider":"Holfuy","latitude":47.92253,"longitude":6.6861},
        {"id":"s1325","name":"Tête de Roselette","provider":"Holfuy","latitude":45.77782,"longitude":6.68264},
        {"id":"s1236","name":"1236 Meilleret new","provider":"Holfuy","latitude":46.33336,"longitude":7.12125},
        {"id":"s1262","name":"Stettelberg","provider":"Holfuy","latitude":47.81343,"longitude":9.0759},
        {"id":"s1248","name":"Schneiderberg","provider":"Holfuy","latitude":47.51361,"longitude":12.43212},
        {"id":"s1263","name":"SPEED  FLY","provider":"Holfuy","latitude":43.94726,"longitude":4.58896},
        {"id":"s1266","name":"Wildkogel Bramberg ","provider":"Holfuy","latitude":47.281708,"longitude":12.291483},
        {"id":"s1271","name":"Loser/Hochanger","provider":"Holfuy","latitude":47.66459,"longitude":13.78027},
        {"id":"s1335","name":"Alpe Giumello","provider":"Holfuy","latitude":46.04896,"longitude":9.36183},
        {"id":"s1352","name":"AMS PR","provider":"Holfuy","latitude":43.2595,"longitude":5.8076},
        {"id":"s1279","name":"Tête-de-Ran","provider":"Holfuy","latitude":47.05408,"longitude":6.8533},
        {"id":"s1285","name":"Anzère, Chamossaire","provider":"Holfuy","latitude":46.317673,"longitude":7.384004},
        {"id":"s1287","name":"ZFC: Kl. Matterhorn","provider":"Holfuy","latitude":45.93336,"longitude":7.7316},
        {"id":"s1293","name":"Mauborget","provider":"Holfuy","latitude":46.85442,"longitude":6.61218},
        {"id":"s1294","name":"Don Pablo station","provider":"Holfuy","latitude":40.95206,"longitude":14.00059},
        {"id":"s1297","name":"1297 Marnex New","provider":"Holfuy","latitude":46.36815,"longitude":7.15426},
        {"id":"s1298","name":"Moléson,Plan-Francey","provider":"Holfuy","latitude":46.55661,"longitude":7.02453},
        {"id":"s1306","name":"Venet","provider":"Holfuy","latitude":47.14567,"longitude":10.62618},
        {"id":"s1307","name":"Les Ruinettes","provider":"Holfuy","latitude":46.09049,"longitude":7.25181},
        {"id":"s1309","name":"Cime Caron","provider":"Holfuy","latitude":45.26271,"longitude":6.56},
        {"id":"s1311","name":"Corent (Dpt 63)","provider":"Holfuy","latitude":45.65918,"longitude":3.17944},
        {"id":"s1320","name":"Moléson,Gros-Plané","provider":"Holfuy","latitude":46.55434,"longitude":7.00483},
        {"id":"s1316","name":"Sommet TK Lanchettes","provider":"Holfuy","latitude":45.81014,"longitude":6.62809},
        {"id":"s1330","name":"1330 Dirisolar","provider":"Holfuy","latitude":44.82258,"longitude":0.5095},
        {"id":"s1340","name":"Tschenten","provider":"Holfuy","latitude":46.49783,"longitude":7.54069},
        {"id":"s1353","name":"Picu el Sol","provider":"Holfuy","latitude":43.47149,"longitude":-5.6595},
        {"id":"s1368","name":"Röti - DCW","provider":"Holfuy","latitude":47.25797,"longitude":7.5274},
        {"id":"s1378","name":"Passadiços do Paiva","provider":"Holfuy","latitude":40.967092,"longitude":-8.175526},
        {"id":"s1383","name":"Arcachon","provider":"Holfuy","latitude":44.64617,"longitude":-1.19999},
        {"id":"s1385","name":"FNDA_Higa de Monreal","provider":"Holfuy","latitude":42.69657,"longitude":-1.53137},
        {"id":"s1389","name":"Schnifis Ried","provider":"Holfuy","latitude":47.2097126,"longitude":9.725665},
        {"id":"s1393","name":"Buñol","provider":"Holfuy","latitude":39.418804,"longitude":-0.754678},
        {"id":"s1402","name":"1402 Vieux Chateau N","provider":"Holfuy","latitude":46.4427,"longitude":6.15906},
        {"id":"s1412","name":"OKO-NW","provider":"Holfuy","latitude":37.64958,"longitude":7.49859},
        {"id":"s1419","name":"Speiereck Peterbauer","provider":"Holfuy","latitude":47.12052,"longitude":13.6419},
        {"id":"s1430","name":"Birnberg","provider":"Holfuy","latitude":47.62,"longitude":8.42044},
        {"id":"s1442","name":"Vigo de Sanabria","provider":"Holfuy","latitude":42.14207,"longitude":-6.69919},
        {"id":"s1447","name":"Palmitera/UGR-ACAMET","provider":"Holfuy","latitude":36.57518,"longitude":-5.04647},
        {"id":"s1446","name":"Talwind Lähn-Bichlba","provider":"Holfuy","latitude":47.42133,"longitude":10.83248},
        {"id":"s1448","name":"Fanas - Höreli","provider":"Holfuy","latitude":47.00022,"longitude":9.68466},
        {"id":"s1455","name":"1455","provider":"Holfuy","latitude":44.81877,"longitude":13.9753},
        {"id":"s1465","name":"Herndleck","provider":"Holfuy","latitude":47.92808,"longitude":14.32749},
        {"id":"s1695","name":"Estey","provider":"Holfuy","latitude":44.48318,"longitude":-1.10148},
        {"id":"s1472","name":"La Llambria 1753 m ","provider":"Holfuy","latitude":43.21256,"longitude":-5.25055},
        {"id":"s1467","name":"1467TEST","provider":"Holfuy","latitude":45.34911,"longitude":12.52471},
        {"id":"s1470","name":"Evolène","provider":"Holfuy","latitude":46.1067,"longitude":7.50154},
        {"id":"s1471","name":"Puy de la Tâche (63)","provider":"Holfuy","latitude":45.59211,"longitude":2.84507},
        {"id":"s1473","name":"Penken Kombibahn","provider":"Holfuy","latitude":47.17592,"longitude":11.81631},
        {"id":"s1484","name":"VL 58","provider":"Holfuy","latitude":47.31526,"longitude":3.55122},
        {"id":"s1600","name":"Seignosse","provider":"Holfuy","latitude":43.68699,"longitude":-1.44009},
        {"id":"s1490","name":"Buttenhausen","provider":"Holfuy","latitude":48.36016,"longitude":9.48375},
        {"id":"s1491","name":"La Hume","provider":"Holfuy","latitude":44.64542,"longitude":-1.11327},
        {"id":"s1494","name":"OLERON CHAR A VOILE","provider":"Holfuy","latitude":45.8544,"longitude":-1.24762},
        {"id":"s1495","name":"DCI HIHO 1495","provider":"Holfuy","latitude":47.33323,"longitude":11.5653},
        {"id":"s1520","name":" CHASSENOUD","provider":"Holfuy","latitude":45.48946,"longitude":4.70595},
        {"id":"s1540","name":"Wankdorf","provider":"Holfuy","latitude":46.963,"longitude":7.46346},
        {"id":"s1545","name":"Hörnerbahn Gipfel","provider":"Holfuy","latitude":47.46523,"longitude":10.20116},
        {"id":"s1551","name":"Urnäsch","provider":"Holfuy","latitude":47.31861,"longitude":9.28007},
        {"id":"s1557","name":"T-1 Lokev","provider":"Holfuy","latitude":45.66201,"longitude":13.94499},
        {"id":"s1558","name":"T-2 Črnotiče","provider":"Holfuy","latitude":45.56208,"longitude":13.8793},
        {"id":"s1568","name":"Vercorin","provider":"Holfuy","latitude":46.25958,"longitude":7.52882},
        {"id":"s1571","name":"Parpaner Rothorn","provider":"Holfuy","latitude":46.74282,"longitude":9.60307},
        {"id":"s1572","name":"Brämabüel","provider":"Holfuy","latitude":46.7806,"longitude":9.84931},
        {"id":"s1586","name":"Arrivee","provider":"Holfuy","latitude":45.415,"longitude":6.6287},
        {"id":"s1588","name":"Eclipse","provider":"Holfuy","latitude":45.4109,"longitude":6.61442},
        {"id":"s1593","name":"Zuflucht-Rossbühl SW","provider":"Holfuy","latitude":48.48696,"longitude":8.23964},
        {"id":"s1594","name":"Oppenau Ost","provider":"Holfuy","latitude":48.43571,"longitude":8.15205},
        {"id":"s1627","name":"Jägerwirt Landeplatz","provider":"Holfuy","latitude":47.12619,"longitude":15.01714},
        {"id":"s1603","name":"Calonico","provider":"Holfuy","latitude":46.45103,"longitude":8.84072},
        {"id":"s1604","name":"Cry d'Err CVLCMA","provider":"Holfuy","latitude":46.33628,"longitude":7.47846},
        {"id":"s1867","name":"MedrigFlyzoneSEE/PAZ","provider":"Holfuy","latitude":47.06904,"longitude":10.49321},
        {"id":"s1610","name":"Hintere Niedere ","provider":"Holfuy","latitude":47.39915,"longitude":9.94535},
        {"id":"s1611","name":"Soltmannhuette","provider":"Holfuy","latitude":46.79486,"longitude":12.77937},
        {"id":"s1614","name":"chariez","provider":"Holfuy","latitude":47.62181,"longitude":6.09004},
        {"id":"s1616","name":"Schraba","provider":"Holfuy","latitude":47.84879,"longitude":10.29698},
        {"id":"s1617","name":"Weissenstein - DCW","provider":"Holfuy","latitude":47.25241,"longitude":7.51048},
        {"id":"s1619","name":"SPIRIT021","provider":"Holfuy","latitude":46.27002,"longitude":15.07623},
        {"id":"s1621","name":"Monte Lema - CVLT","provider":"Holfuy","latitude":46.04015,"longitude":8.83098},
        {"id":"s1638","name":"ZFC: Riffelberg","provider":"Holfuy","latitude":45.99124,"longitude":7.74715},
        {"id":"s1639","name":"ZFC: Rothorn South","provider":"Holfuy","latitude":46.02067,"longitude":7.79973},
        {"id":"s1642","name":"Duc d 'Albe - rade de","provider":"Holfuy","latitude":48.32221,"longitude":-4.45462},
        {"id":"s1750","name":"Rota (UCA)","provider":"Holfuy","latitude":36.62726,"longitude":-6.38372},
        {"id":"s1809","name":"Crap Sogn Gion","provider":"Holfuy","latitude":46.8335,"longitude":9.21457},
        {"id":"s1745","name":"1745","provider":"Holfuy","latitude":41.762838,"longitude":-0.85055},
        {"id":"s1811","name":"Hütte Brauneck LGGF ","provider":"Holfuy","latitude":47.67722,"longitude":11.55288},
        {"id":"s1810","name":"Blomberg LGGF","provider":"Holfuy","latitude":47.73443,"longitude":11.50679},
        {"id":"s1658","name":"COMADO CPFerrol","provider":"Holfuy","latitude":43.52738,"longitude":-7.17066},
        {"id":"s1821","name":"Concorde Aventures","provider":"Holfuy","latitude":47.79323,"longitude":-3.85542},
        {"id":"s1665","name":"Hohe Kugel","provider":"Holfuy","latitude":47.33513,"longitude":9.71573},
        {"id":"s1668","name":"Madrisa Schaffürggli","provider":"Holfuy","latitude":46.9177,"longitude":9.87006},
        {"id":"s1670","name":"Laber","provider":"Holfuy","latitude":47.5861,"longitude":11.10375},
        {"id":"s1671","name":"Kammeregg SP","provider":"Holfuy","latitude":47.56586,"longitude":10.3085},
        {"id":"s1674","name":"Callejo de Ordás","provider":"Holfuy","latitude":42.73065,"longitude":-5.83979},
        {"id":"s1675","name":"Berghaupten ODGFe.V.","provider":"Holfuy","latitude":48.41362,"longitude":7.96626},
        {"id":"s1676","name":"1676","provider":"Holfuy","latitude":43.07886,"longitude":5.89303},
        {"id":"s1678","name":"Studnerberg","provider":"Holfuy","latitude":47.1661,"longitude":9.42391},
        {"id":"s1679","name":"Hinhang","provider":"Holfuy","latitude":47.47073,"longitude":10.30275},
        {"id":"s1681","name":"Brunni","provider":"Holfuy","latitude":46.84248,"longitude":8.41005},
        {"id":"s1682","name":"GSV","provider":"Holfuy","latitude":46.98207,"longitude":14.37401},
        {"id":"s1684","name":"Frauenalpe Gipfel","provider":"Holfuy","latitude":47.06581,"longitude":14.13932},
        {"id":"s1686","name":"SCA Michaelerberg","provider":"Holfuy","latitude":47.41131,"longitude":13.89338},
        {"id":"s1687","name":"SCA Stoder Rosegger","provider":"Holfuy","latitude":47.45728,"longitude":13.81913},
        {"id":"s1689","name":"Startplatz Hochimst","provider":"Holfuy","latitude":47.255888,"longitude":10.677035},
        {"id":"s1808","name":"Amisbühl","provider":"Holfuy","latitude":46.70258,"longitude":7.82217},
        {"id":"s1690","name":"Pfunds Startpl Kobl","provider":"Holfuy","latitude":46.97166,"longitude":10.49355},
        {"id":"s1694","name":"ImbergerHorn Hindela","provider":"Holfuy","latitude":47.49212,"longitude":10.37085},
        {"id":"s1698","name":"Grabs Landeplatz","provider":"Holfuy","latitude":47.17655,"longitude":9.45543},
        {"id":"s1700","name":"Bargella","provider":"Holfuy","latitude":47.141226,"longitude":9.549284},
        {"id":"s1701","name":"Alpe Quaggione","provider":"Holfuy","latitude":45.91378,"longitude":8.38147},
        {"id":"s1705","name":"1705","provider":"Holfuy","latitude":47.40109,"longitude":-2.03553},
        {"id":"s1769","name":"Lommiswil","provider":"Holfuy","latitude":47.22327,"longitude":7.46697},
        {"id":"s1804","name":"Höhematte","provider":"Holfuy","latitude":46.68572,"longitude":7.85703},
        {"id":"s1723","name":"Son Bou Menorca","provider":"Holfuy","latitude":39.89879,"longitude":4.07431},
        {"id":"s1730","name":"TENA","provider":"Holfuy","latitude":37.252318,"longitude":-5.830279},
        {"id":"s1733","name":"NIJARMAR","provider":"Holfuy","latitude":37.0065434159,"longitude":-2.12487724668},
        {"id":"s1734","name":"ES MERCADAL","provider":"Holfuy","latitude":40.00177,"longitude":4.14792},
        {"id":"s1738","name":"Montelabbate","provider":"Holfuy","latitude":43.86233,"longitude":12.80514},
        {"id":"s1739","name":"ARA DE LOS OLMOS","provider":"Holfuy","latitude":39.9462305,"longitude":-1.13198888},
        {"id":"s1742","name":"Montenero","provider":"Holfuy","latitude":42.044401,"longitude":14.765557},
        {"id":"s1743","name":"AMOROS","provider":"Holfuy","latitude":38.22049,"longitude":-0.83963},
        {"id":"s1748","name":"Cala Tirant Menorca","provider":"Holfuy","latitude":40.0464,"longitude":4.10215},
        {"id":"s1749","name":"Punta Prima Menorca","provider":"Holfuy","latitude":39.81174,"longitude":4.2805},
        {"id":"s1754","name":"Jenner","provider":"Holfuy","latitude":47.5791,"longitude":13.02509},
        {"id":"s1759","name":"ALDEIA","provider":"Holfuy","latitude":38.808316,"longitude":-7.873077},
        {"id":"s1761","name":"Madroño","provider":"Holfuy","latitude":39.933897,"longitude":-4.860555},
        {"id":"s1764","name":"Tabernas III","provider":"Holfuy","latitude":37.092134,"longitude":-2.347897},
        {"id":"s1766","name":"HORCAJO","provider":"Holfuy","latitude":39.542706,"longitude":-1.131891},
        {"id":"s1771","name":"Stierenberg DC-Falk","provider":"Holfuy","latitude":47.33171,"longitude":7.64538},
        {"id":"s1793","name":"La Jara (UCA)","provider":"Holfuy","latitude":36.76168,"longitude":-6.39737},
        {"id":"s1795","name":"Club Nàutic Fornells","provider":"Holfuy","latitude":40.0402,"longitude":4.12575},
        {"id":"s1796","name":"9erköpfle West","provider":"Holfuy","latitude":47.48258,"longitude":10.54225},
        {"id":"s1797","name":"Herlisberg","provider":"Holfuy","latitude":47.19819,"longitude":8.23307},
        {"id":"s1802","name":"Club nautique CNCP","provider":"Holfuy","latitude":42.7038,"longitude":3.0387},
        {"id":"s1805","name":"BRWD1","provider":"Holfuy","latitude":46.94021,"longitude":8.99868},
        {"id":"s1823","name":"Fulseck","provider":"Holfuy","latitude":47.23488,"longitude":13.14756},
        {"id":"s1827","name":"ZFC: GGB North","provider":"Holfuy","latitude":45.98363,"longitude":7.78011},
        {"id":"s1832","name":"Gaisberg SP Ost","provider":"Holfuy","latitude":47.804829,"longitude":13.114223},
        {"id":"s1833","name":"Gaisberg LP Guggen. ","provider":"Holfuy","latitude":47.819069,"longitude":13.104982},
        {"id":"s1836","name":"Almeirin","provider":"Holfuy","latitude":39.149685,"longitude":-0.8608628},
        {"id":"s1837","name":"Castel Volturno","provider":"Holfuy","latitude":41.07909,"longitude":13.96943},
        {"id":"s1838","name":"Broni","provider":"Holfuy","latitude":45.077925,"longitude":9.255201},
        {"id":"s1850","name":"Lehn","provider":"Holfuy","latitude":46.68084,"longitude":7.82554},
        {"id":"s1862","name":"Bischling Startplatz","provider":"Holfuy","latitude":47.46394,"longitude":13.29872},
        {"id":"s1863","name":"Bischling Landeplatz","provider":"Holfuy","latitude":47.45869,"longitude":13.27086},
        {"id":"s1866","name":"PONZOS CPFerrol","provider":"Holfuy","latitude":43.5516,"longitude":-8.25423},
        {"id":"s1870","name":"Nagens","provider":"Holfuy","latitude":46.86674,"longitude":9.2314},
        {"id":"s1871","name":"Piz Scalottas","provider":"Holfuy","latitude":46.7214,"longitude":9.51158},
        {"id":"s1872","name":"Parpan","provider":"Holfuy","latitude":46.76261,"longitude":9.5617},
        {"id":"s1873","name":"Valbella","provider":"Holfuy","latitude":46.74418,"longitude":9.55185},
        {"id":"s1970","name":"Saumur Air Club","provider":"Holfuy","latitude":47.25863,"longitude":-0.11548},
        {"id":"s1875","name":"Arlberg (Stanton LP)","provider":"Holfuy","latitude":47.13307,"longitude":10.27004},
        {"id":"s1880","name":"Paramotorclub RW","provider":"Holfuy","latitude":48.26683,"longitude":8.51446},
        {"id":"s1881","name":"DCC_Fille Morte","provider":"Holfuy","latitude":48.21869,"longitude":7.1934},
        {"id":"s1885","name":"Rigi Kulm Bahndepot","provider":"Holfuy","latitude":47.05505,"longitude":8.48605},
        {"id":"s1886","name":"Rigi Rotstock","provider":"Holfuy","latitude":47.04826,"longitude":8.46835},
        {"id":"s1887","name":"BRESTPORT","provider":"Holfuy","latitude":48.38207,"longitude":-4.45412},
        {"id":"s1894","name":"1894 Crans","provider":"Holfuy","latitude":46.35647,"longitude":6.20697},
        {"id":"s1895","name":"1895 CVLD Bosse","provider":"Holfuy","latitude":46.44456,"longitude":6.17598},
        {"id":"s1926","name":"Sombernon","provider":"Holfuy","latitude":47.3226,"longitude":4.706496},
        {"id":"s1897","name":"Aznalcollar","provider":"Holfuy","latitude":37.424483,"longitude":-6.246199},
        {"id":"s1898","name":"Villanueva de Galleg","provider":"Holfuy","latitude":41.7715975,"longitude":-0.8274002},
        {"id":"s1899","name":"La Banditella","provider":"Holfuy","latitude":42.501163,"longitude":11.721609},
        {"id":"s1900","name":"Crato","provider":"Holfuy","latitude":39.418205,"longitude":-7.67897},
        {"id":"s1903","name":"Trevoes I","provider":"Holfuy","latitude":41.109035,"longitude":-7.434083},
        {"id":"s1904","name":"Baruffino","provider":"Holfuy","latitude":44.694123,"longitude":11.877916},
        {"id":"s1905","name":"Pozzolo","provider":"Holfuy","latitude":44.825214,"longitude":8.746064},
        {"id":"s1907","name":"BIG FISH NORTE BF28","provider":"Holfuy","latitude":37.453193,"longitude":14.947614},
        {"id":"s1908","name":"SARDELLA","provider":"Holfuy","latitude":37.42628,"longitude":14.90554},
        {"id":"s1910","name":"BIG FISH SUR 07","provider":"Holfuy","latitude":37.399236,"longitude":15.004496},
        {"id":"s1948","name":"Slano Blato","provider":"Holfuy","latitude":45.91306,"longitude":13.86478},
        {"id":"s1986","name":"LSZM south","provider":"Holfuy","latitude":47.07738,"longitude":9.06272},
        {"id":"s1931","name":"Villamañan","provider":"Holfuy","latitude":42.316722,"longitude":-5.589972},
        {"id":"s1932","name":"Outarville","provider":"Holfuy","latitude":48.201639,"longitude":2.015872},
        {"id":"s1933","name":"Latera","provider":"Holfuy","latitude":42.488247,"longitude":11.699835},
        {"id":"s1935","name":"Fachina","provider":"Holfuy","latitude":41.504948,"longitude":-0.655171},
        {"id":"s1952","name":"Salinas Doñana (UCA)","provider":"Holfuy","latitude":36.87797,"longitude":-6.31827},
        {"id":"s1943","name":"Som la Proz","provider":"Holfuy","latitude":46.02082,"longitude":7.13642},
        {"id":"s1949","name":"Macesnik","provider":"Holfuy","latitude":46.43391,"longitude":14.6885},
        {"id":"s1953","name":"TSF Pointe O amont","provider":"Holfuy","latitude":46.19935,"longitude":6.84101},
        {"id":"s1955","name":"TSD GP intermédiaire","provider":"Holfuy","latitude":46.16633,"longitude":6.84632},
        {"id":"s1969","name":"Evolène Servacresse","provider":"Holfuy","latitude":46.12217,"longitude":7.44416},
        {"id":"s1968","name":"CMV Barcelona","provider":"Holfuy","latitude":41.38736,"longitude":2.20298},
        {"id":"s1971","name":"Obere Wengi","provider":"Holfuy","latitude":47.32593,"longitude":7.62696},
        {"id":"s1975","name":"Hochzeiger Jerzens","provider":"Holfuy","latitude":47.1614,"longitude":10.78745},
        {"id":"s1367","name":"El Hierro,M Colorada","provider":"Holfuy","latitude":27.73984,"longitude":-18.03089},
        {"id":"s1569","name":"ElVallito, Tenerife","provider":"Holfuy","latitude":28.10354,"longitude":-16.50994},
        {"id":"s1816","name":"Ladera Guimar","provider":"Holfuy","latitude":28.29167,"longitude":-16.42279},
        {"id":"s1817","name":"Puerto. Aptos.Bahía.","provider":"Holfuy","latitude":28.41109,"longitude":-16.55811},
        {"id":"s1818","name":"Puertito Güímar","provider":"Holfuy","latitude":28.28843,"longitude":-16.37892},
        {"id":"s1819","name":"La Corona. Despegue","provider":"Holfuy","latitude":28.37844,"longitude":-16.60086},
        {"id":"s1891","name":"El Tanque_Despegue","provider":"Holfuy","latitude":28.35976,"longitude":-16.7858},
        {"id":"s1906","name":"Taucho_Parapente","provider":"Holfuy","latitude":28.14578,"longitude":-16.7365},
        {"id":"s1046","name":"1046 Gava mar","provider":"Holfuy","latitude":41.26549,"longitude":2.01265},
        {"id":"s1659","name":"MONDOÑEDO CPFerrol","provider":"Holfuy","latitude":43.43529,"longitude":-7.33206},
        {"id":"s2014","name":"Espadan","provider":"Holfuy","latitude":39.83431,"longitude":-0.40495},
        {"id":"s2015","name":"Tabernas 1 Campa","provider":"Holfuy","latitude":37.07652,"longitude":-2.20996}
    ];

    const ESTACIONES_METEOFRANCE = 
    [
        {"id":"01014002","name":"Arbent","provider":"Meteofrance","latitude":46.278167,"longitude":5.669},
        {"id":"01034004","name":"Belley","provider":"Meteofrance","latitude":45.769333,"longitude":5.688},
        {"id":"01071001","name":"Cessy","provider":"Meteofrance","latitude":46.310333,"longitude":6.080333},
        {"id":"01089001","name":"Amberieu","provider":"Meteofrance","latitude":45.9765,"longitude":5.329333},
        {"id":"01414001","name":"Sutrieu","provider":"Meteofrance","latitude":45.916167,"longitude":5.624667},
        {"id":"02037002","name":"Aulnois-ss-laon","provider":"Meteofrance","latitude":49.595667,"longitude":3.610333},
        {"id":"02094001","name":"Blesmes","provider":"Meteofrance","latitude":49.009667,"longitude":3.462667},
        {"id":"02110002","name":"Braine","provider":"Meteofrance","latitude":49.351333,"longitude":3.527},
        {"id":"02173002","name":"Chauny","provider":"Meteofrance","latitude":49.633833,"longitude":3.197833},
        {"id":"02320001","name":"St quentin","provider":"Meteofrance","latitude":49.818333,"longitude":3.206},
        {"id":"02321002","name":"Fontaine-les-vv","provider":"Meteofrance","latitude":49.837333,"longitude":3.877833},
        {"id":"02705001","name":"Nizy-le-comte","provider":"Meteofrance","latitude":49.566,"longitude":4.0365},
        {"id":"03060001","name":"Vichy-charmeil","provider":"Meteofrance","latitude":46.166667,"longitude":3.398667},
        {"id":"03155003","name":"Lurcy-levis sa","provider":"Meteofrance","latitude":46.718333,"longitude":2.947667},
        {"id":"03180001","name":"Montbeugny","provider":"Meteofrance","latitude":46.536333,"longitude":3.423167},
        {"id":"03185007","name":"Montlucon","provider":"Meteofrance","latitude":46.355167,"longitude":2.574667},
        {"id":"03248001","name":"St-nicolas","provider":"Meteofrance","latitude":46.0515,"longitude":3.805167},
        {"id":"04019001","name":"Barcelonnette","provider":"Meteofrance","latitude":44.391167,"longitude":6.670167},
        {"id":"04049001","name":"St auban","provider":"Meteofrance","latitude":44.062167,"longitude":5.989667},
        {"id":"04068001","name":"Dauphin","provider":"Meteofrance","latitude":43.909833,"longitude":5.767167},
        {"id":"04070009","name":"Digne les bains","provider":"Meteofrance","latitude":44.07,"longitude":6.186667},
        {"id":"04136001","name":"La mure-argens","provider":"Meteofrance","latitude":43.977,"longitude":6.520167},
        {"id":"04230001","name":"Valensole","provider":"Meteofrance","latitude":43.8395,"longitude":6.000833},
        {"id":"05007003","name":"Arvieux","provider":"Meteofrance","latitude":44.796,"longitude":6.728},
        {"id":"05046001","name":"Embrun","provider":"Meteofrance","latitude":44.571167,"longitude":6.508667},
        {"id":"05061009","name":"Gap","provider":"Meteofrance","latitude":44.577667,"longitude":6.079833},
        {"id":"05070003","name":"Laragne monteglin","provider":"Meteofrance","latitude":44.319167,"longitude":5.7945},
        {"id":"05120002","name":"Ristolas","provider":"Meteofrance","latitude":44.765667,"longitude":6.9845},
        {"id":"05136002","name":"St crepin","provider":"Meteofrance","latitude":44.7045,"longitude":6.6},
        {"id":"05145002","name":"St jean-st-nicolas","provider":"Meteofrance","latitude":44.670833,"longitude":6.209833},
        {"id":"05170001","name":"Tallard","provider":"Meteofrance","latitude":44.452167,"longitude":6.033333},
        {"id":"05181002","name":"Villar d'arene","provider":"Meteofrance","latitude":45.030833,"longitude":6.361667},
        {"id":"05183001","name":"Villar st pancrace","provider":"Meteofrance","latitude":44.880333,"longitude":6.640333},
        {"id":"06005001","name":"Ascros","provider":"Meteofrance","latitude":43.922,"longitude":7.013667},
        {"id":"06029001","name":"Cannes","provider":"Meteofrance","latitude":43.5565,"longitude":6.9505},
        {"id":"06077006","name":"Peira cava","provider":"Meteofrance","latitude":43.929167,"longitude":7.363333},
        {"id":"06081001","name":"Le mas","provider":"Meteofrance","latitude":43.813667,"longitude":6.809333},
        {"id":"06088001","name":"Nice","provider":"Meteofrance","latitude":43.648833,"longitude":7.209},
        {"id":"06091003","name":"Peille","provider":"Meteofrance","latitude":43.775167,"longitude":7.428333},
        {"id":"06094002","name":"Peone","provider":"Meteofrance","latitude":44.099667,"longitude":6.930833},
        {"id":"06118002","name":"St cezaire sur siagne","provider":"Meteofrance","latitude":43.678667,"longitude":6.809},
        {"id":"06136005","name":"Sospel","provider":"Meteofrance","latitude":43.862833,"longitude":7.433667},
        {"id":"07025001","name":"Barnas rad","provider":"Meteofrance","latitude":44.666,"longitude":4.159833},
        {"id":"07032002","name":"Berzeme rad","provider":"Meteofrance","latitude":44.628333,"longitude":4.566333},
        {"id":"07068001","name":"Colombier jeune rad","provider":"Meteofrance","latitude":45.0155,"longitude":4.671167},
        {"id":"07096001","name":"Gluiras rad","provider":"Meteofrance","latitude":44.839333,"longitude":4.524},
        {"id":"07131001","name":"Lanas syn","provider":"Meteofrance","latitude":44.537167,"longitude":4.368167},
        {"id":"07154005","name":"Mazan abbaye rad","provider":"Meteofrance","latitude":44.733833,"longitude":4.083833},
        {"id":"07172002","name":"Peaugres rad","provider":"Meteofrance","latitude":45.286167,"longitude":4.705833},
        {"id":"07187001","name":"Croix millet","provider":"Meteofrance","latitude":44.606333,"longitude":4.241333},
        {"id":"07204008","name":"St-agreve rad","provider":"Meteofrance","latitude":44.997833,"longitude":4.368},
        {"id":"08105005","name":"Charleville-mez","provider":"Meteofrance","latitude":49.782833,"longitude":4.643167},
        {"id":"08145001","name":"Douzy","provider":"Meteofrance","latitude":49.658,"longitude":5.039833},
        {"id":"08353001","name":"Rancennes","provider":"Meteofrance","latitude":50.118833,"longitude":4.813167},
        {"id":"08367002","name":"Rocroi","provider":"Meteofrance","latitude":49.918667,"longitude":4.53},
        {"id":"08401001","name":"Saulces-champenoises","provider":"Meteofrance","latitude":49.423833,"longitude":4.4925},
        {"id":"09024004","name":"Aston","provider":"Meteofrance","latitude":42.724167,"longitude":1.691},
        {"id":"09099001","name":"Cos","provider":"Meteofrance","latitude":42.970167,"longitude":1.5645},
        {"id":"09161003","name":"Leran","provider":"Meteofrance","latitude":42.990333,"longitude":1.919167},
        {"id":"09199002","name":"Montaut","provider":"Meteofrance","latitude":43.192167,"longitude":1.6435},
        {"id":"09289001","name":"St girons","provider":"Meteofrance","latitude":43.005333,"longitude":1.106833},
        {"id":"10030001","name":"Troyes-barberey","provider":"Meteofrance","latitude":48.324667,"longitude":4.02},
        {"id":"10057001","name":"Bouy-sur-orvin","provider":"Meteofrance","latitude":48.439833,"longitude":3.504833},
        {"id":"10070001","name":"Celles-sur-ource","provider":"Meteofrance","latitude":48.0675,"longitude":4.411333},
        {"id":"10228002","name":"Mathaux-etape","provider":"Meteofrance","latitude":48.353167,"longitude":4.472333},
        {"id":"10350001","name":"St-mards","provider":"Meteofrance","latitude":48.169833,"longitude":3.789},
        {"id":"11069001","name":"Carcassonne","provider":"Meteofrance","latitude":43.215333,"longitude":2.2955},
        {"id":"11168001","name":"Granes","provider":"Meteofrance","latitude":42.909167,"longitude":2.2505},
        {"id":"11202001","name":"Leucate","provider":"Meteofrance","latitude":42.917333,"longitude":3.059667},
        {"id":"11203004","name":"Lezignan-corbieres","provider":"Meteofrance","latitude":43.173,"longitude":2.728833},
        {"id":"11221004","name":"Les martys","provider":"Meteofrance","latitude":43.4085,"longitude":2.292333},
        {"id":"11260002","name":"Mouthoumet","provider":"Meteofrance","latitude":42.9595,"longitude":2.529},
        {"id":"11262005","name":"Narbonne","provider":"Meteofrance","latitude":43.150333,"longitude":2.955833},
        {"id":"12005001","name":"Alpuech","provider":"Meteofrance","latitude":44.756,"longitude":2.868167},
        {"id":"12077002","name":"Cornus","provider":"Meteofrance","latitude":43.922333,"longitude":3.192167},
        {"id":"12145001","name":"Millau","provider":"Meteofrance","latitude":44.1185,"longitude":3.0195},
        {"id":"12154003","name":"Montlaur","provider":"Meteofrance","latitude":43.891667,"longitude":2.836333},
        {"id":"12216001","name":"St-come-d'olt","provider":"Meteofrance","latitude":44.514667,"longitude":2.827833},
        {"id":"12254001","name":"Rodez-aveyron","provider":"Meteofrance","latitude":44.410333,"longitude":2.4825},
        {"id":"12266002","name":"Segur","provider":"Meteofrance","latitude":44.2895,"longitude":2.820333},
        {"id":"12300004","name":"Villefranche-de-rouergue","provider":"Meteofrance","latitude":44.371833,"longitude":2.023667},
        {"id":"13001009","name":"Aix en provence","provider":"Meteofrance","latitude":43.5295,"longitude":5.4245},
        {"id":"13004003","name":"Arles","provider":"Meteofrance","latitude":43.51,"longitude":4.693833},
        {"id":"13022003","name":"Cassis","provider":"Meteofrance","latitude":43.222167,"longitude":5.503167},
        {"id":"13047001","name":"Istres","provider":"Meteofrance","latitude":43.522667,"longitude":4.9275},
        {"id":"13054001","name":"Marignane","provider":"Meteofrance","latitude":43.437,"longitude":5.2115},
        {"id":"13055029","name":"Marseille","provider":"Meteofrance","latitude":43.310667,"longitude":5.479167},
        {"id":"13074003","name":"Peyrolles en provence","provider":"Meteofrance","latitude":43.656667,"longitude":5.607},
        {"id":"13103001","name":"Salon de provence","provider":"Meteofrance","latitude":43.612833,"longitude":5.108},
        {"id":"14137001","name":"Caen-carpiquet","provider":"Meteofrance","latitude":49.18,"longitude":-0.456167},
        {"id":"14216001","name":"Damblainville","provider":"Meteofrance","latitude":48.928,"longitude":-0.148667},
        {"id":"14372001","name":"Livry","provider":"Meteofrance","latitude":49.099167,"longitude":-0.7665},
        {"id":"14578001","name":"St gatien des b","provider":"Meteofrance","latitude":49.3645,"longitude":0.167},
        {"id":"14762004","name":"Vire hippodrome","provider":"Meteofrance","latitude":48.850833,"longitude":-0.899},
        {"id":"15014004","name":"Aurillac","provider":"Meteofrance","latitude":44.8915,"longitude":2.419167},
        {"id":"15025001","name":"Prat de bouc","provider":"Meteofrance","latitude":45.0525,"longitude":2.792},
        {"id":"15053001","name":"Coltines","provider":"Meteofrance","latitude":45.074667,"longitude":2.990667},
        {"id":"15060002","name":"Deux-verges","provider":"Meteofrance","latitude":44.8015,"longitude":3.012667},
        {"id":"15120005","name":"Mauriac","provider":"Meteofrance","latitude":45.222167,"longitude":2.293167},
        {"id":"15122002","name":"Maurs","provider":"Meteofrance","latitude":44.734167,"longitude":2.166},
        {"id":"16089001","name":"Cognac","provider":"Meteofrance","latitude":45.665,"longitude":-0.315833},
        {"id":"16113001","name":"La couronne","provider":"Meteofrance","latitude":45.627833,"longitude":0.099833},
        {"id":"16225001","name":"Montemboeuf","provider":"Meteofrance","latitude":45.787167,"longitude":0.543},
        {"id":"16279001","name":"Rioux martin","provider":"Meteofrance","latitude":45.262,"longitude":0.003333},
        {"id":"16390001","name":"Tusson","provider":"Meteofrance","latitude":45.949,"longitude":0.062167},
        {"id":"17268002","name":"Nuaille sur boutonne","provider":"Meteofrance","latitude":46.019833,"longitude":-0.406667},
        {"id":"17300009","name":"La rochelle-ile de re","provider":"Meteofrance","latitude":46.178,"longitude":-1.193167},
        {"id":"17306004","name":"Royan-medis","provider":"Meteofrance","latitude":45.633,"longitude":-0.974667},
        {"id":"17323001","name":"Chassiron","provider":"Meteofrance","latitude":46.046833,"longitude":-1.411667},
        {"id":"17339002","name":"St germain de lusignan","provider":"Meteofrance","latitude":45.458333,"longitude":-0.409667},
        {"id":"17415003","name":"Saintes","provider":"Meteofrance","latitude":45.761167,"longitude":-0.652},
        {"id":"18015003","name":"Aubigny-sur-nere","provider":"Meteofrance","latitude":47.4995,"longitude":2.427333},
        {"id":"18033001","name":"Bourges","provider":"Meteofrance","latitude":47.059167,"longitude":2.359833},
        {"id":"18092001","name":"Avord","provider":"Meteofrance","latitude":47.052167,"longitude":2.642167},
        {"id":"18125004","name":"Lere","provider":"Meteofrance","latitude":47.457833,"longitude":2.893167},
        {"id":"18172003","name":"Orval rad","provider":"Meteofrance","latitude":46.731,"longitude":2.467333},
        {"id":"18175003","name":"Ourouer","provider":"Meteofrance","latitude":46.925333,"longitude":2.803333},
        {"id":"18187004","name":"Preveranges","provider":"Meteofrance","latitude":46.425333,"longitude":2.2365},
        {"id":"19010001","name":"Argentat","provider":"Meteofrance","latitude":45.101333,"longitude":1.9375},
        {"id":"19031008","name":"Brive","provider":"Meteofrance","latitude":45.146667,"longitude":1.473333},
        {"id":"19073006","name":"Egletons","provider":"Meteofrance","latitude":45.398833,"longitude":2.059167},
        {"id":"19147001","name":"Brive-souillac","provider":"Meteofrance","latitude":45.036333,"longitude":1.491667},
        {"id":"19164001","name":"Peyrelevade","provider":"Meteofrance","latitude":45.701,"longitude":2.058667},
        {"id":"19201001","name":"Ussel-thalamy","provider":"Meteofrance","latitude":45.537333,"longitude":2.42},
        {"id":"19276006","name":"Uzerche","provider":"Meteofrance","latitude":45.396333,"longitude":1.568167},
        {"id":"20004002","name":"Ajaccio","provider":"Meteofrance","latitude":41.918,"longitude":8.792667},
        {"id":"20050001","name":"Calvi","provider":"Meteofrance","latitude":42.5295,"longitude":8.7915},
        {"id":"20093002","name":"Ile rousse","provider":"Meteofrance","latitude":42.633333,"longitude":8.9225},
        {"id":"20096008","name":"Corte","provider":"Meteofrance","latitude":42.2885,"longitude":9.193167},
        {"id":"20107001","name":"Cap corse","provider":"Meteofrance","latitude":43.003833,"longitude":9.3595},
        {"id":"20114002","name":"Figari","provider":"Meteofrance","latitude":41.505167,"longitude":9.103667},
        {"id":"20148001","name":"Bastia","provider":"Meteofrance","latitude":42.540667,"longitude":9.485167},
        {"id":"20160001","name":"Moca-croce","provider":"Meteofrance","latitude":41.761667,"longitude":9.0165},
        {"id":"20185003","name":"Oletta","provider":"Meteofrance","latitude":42.632333,"longitude":9.3205},
        {"id":"20258001","name":"Renno","provider":"Meteofrance","latitude":42.190167,"longitude":8.807167},
        {"id":"20268001","name":"Sampolo","provider":"Meteofrance","latitude":41.943,"longitude":9.123},
        {"id":"20303002","name":"Alistro","provider":"Meteofrance","latitude":42.259667,"longitude":9.5415},
        {"id":"20314006","name":"Santo pietro di tenda","provider":"Meteofrance","latitude":42.635833,"longitude":9.200667},
        {"id":"20342001","name":"Solenzara","provider":"Meteofrance","latitude":41.921833,"longitude":9.400833},
        {"id":"21065001","name":"Bessey","provider":"Meteofrance","latitude":47.086,"longitude":4.743167},
        {"id":"21131001","name":"Pagny-le-chateau","provider":"Meteofrance","latitude":47.043167,"longitude":5.190667},
        {"id":"21154001","name":"Chatillon\/seine","provider":"Meteofrance","latitude":47.849333,"longitude":4.581333},
        {"id":"21473001","name":"Dijon-longvic","provider":"Meteofrance","latitude":47.267833,"longitude":5.088333},
        {"id":"21561003","name":"St-martin-du-m","provider":"Meteofrance","latitude":47.4005,"longitude":4.781167},
        {"id":"21584001","name":"Saulieu","provider":"Meteofrance","latitude":47.264167,"longitude":4.215},
        {"id":"22005003","name":"Belle-isle-en-terre","provider":"Meteofrance","latitude":48.55,"longitude":-3.3875},
        {"id":"22113006","name":"Lannion_aero","provider":"Meteofrance","latitude":48.755333,"longitude":-3.468667},
        {"id":"22168001","name":"Ploumanac'h","provider":"Meteofrance","latitude":48.825833,"longitude":-3.473167},
        {"id":"22219003","name":"Plouguenast","provider":"Meteofrance","latitude":48.265833,"longitude":-2.748333},
        {"id":"22247002","name":"Pommerit-jaudy","provider":"Meteofrance","latitude":48.742,"longitude":-3.251},
        {"id":"22261002","name":"Quintenic","provider":"Meteofrance","latitude":48.519167,"longitude":-2.42},
        {"id":"22266001","name":"Rostrenen","provider":"Meteofrance","latitude":48.226667,"longitude":-3.295333},
        {"id":"22282001","name":"Saint-cast-le-g","provider":"Meteofrance","latitude":48.6445,"longitude":-2.247},
        {"id":"22372001","name":"St brieuc","provider":"Meteofrance","latitude":48.5365,"longitude":-2.853167},
        {"id":"23030004","name":"Bourganeuf","provider":"Meteofrance","latitude":45.942333,"longitude":1.725833},
        {"id":"23067001","name":"La courtine","provider":"Meteofrance","latitude":45.702667,"longitude":2.263667},
        {"id":"23089001","name":"Genouillac","provider":"Meteofrance","latitude":46.352333,"longitude":1.985},
        {"id":"23176001","name":"La souterraine","provider":"Meteofrance","latitude":46.2425,"longitude":1.451833},
        {"id":"23206002","name":"Gueret-st laurent","provider":"Meteofrance","latitude":46.1755,"longitude":1.950333},
        {"id":"24035003","name":"Belves","provider":"Meteofrance","latitude":44.782667,"longitude":0.956},
        {"id":"24037005","name":"Bergerac","provider":"Meteofrance","latitude":44.822833,"longitude":0.524167},
        {"id":"24138004","name":"Coulounieix","provider":"Meteofrance","latitude":45.1595,"longitude":0.676667},
        {"id":"24452001","name":"St martial viveyrols","provider":"Meteofrance","latitude":45.357833,"longitude":0.319333},
        {"id":"24453001","name":"St martin  de fressengeas","provider":"Meteofrance","latitude":45.4755,"longitude":0.848333},
        {"id":"24516002","name":"Salignac-eyvigues","provider":"Meteofrance","latitude":44.936667,"longitude":1.364667},
        {"id":"24550003","name":"Thenon","provider":"Meteofrance","latitude":45.112667,"longitude":1.0385},
        {"id":"25056001","name":"Besancon","provider":"Meteofrance","latitude":47.249,"longitude":5.988833},
        {"id":"25219002","name":"Epenoy","provider":"Meteofrance","latitude":47.127167,"longitude":6.366333},
        {"id":"25223002","name":"Coulans","provider":"Meteofrance","latitude":47.023333,"longitude":6.0205},
        {"id":"25356003","name":"Maiche","provider":"Meteofrance","latitude":47.243,"longitude":6.791},
        {"id":"25462001","name":"Pontarlier","provider":"Meteofrance","latitude":46.927,"longitude":6.32},
        {"id":"25494001","name":"La boissaude rochejean","provider":"Meteofrance","latitude":46.729,"longitude":6.322833},
        {"id":"25529002","name":"Sancey-le-grand","provider":"Meteofrance","latitude":47.3015,"longitude":6.581667},
        {"id":"26002003","name":"Albon","provider":"Meteofrance","latitude":45.252333,"longitude":4.822333},
        {"id":"26064001","name":"Valence-chabeui","provider":"Meteofrance","latitude":44.914833,"longitude":4.971833},
        {"id":"26124001","name":"Etoile","provider":"Meteofrance","latitude":44.819,"longitude":4.8895},
        {"id":"26168001","name":"Lus l croix hte","provider":"Meteofrance","latitude":44.672833,"longitude":5.710833},
        {"id":"26198001","name":"Montelimar","provider":"Meteofrance","latitude":44.581167,"longitude":4.733},
        {"id":"26292002","name":"St-auban-sur-ouveze","provider":"Meteofrance","latitude":44.294833,"longitude":5.409833},
        {"id":"26327001","name":"St roman-diois","provider":"Meteofrance","latitude":44.693833,"longitude":5.428333},
        {"id":"27056003","name":"Bernay","provider":"Meteofrance","latitude":49.101333,"longitude":0.559833},
        {"id":"27100001","name":"Boulleville","provider":"Meteofrance","latitude":49.361,"longitude":0.392833},
        {"id":"27347001","name":"Evreux-huest","provider":"Meteofrance","latitude":49.025,"longitude":1.221667},
        {"id":"27422001","name":"Muids","provider":"Meteofrance","latitude":49.224167,"longitude":1.2805},
        {"id":"28070001","name":"Chartres","provider":"Meteofrance","latitude":48.4605,"longitude":1.501167},
        {"id":"28198001","name":"Chateaudun","provider":"Meteofrance","latitude":48.061333,"longitude":1.376333},
        {"id":"28206001","name":"Laons","provider":"Meteofrance","latitude":48.706833,"longitude":1.173167},
        {"id":"28407001","name":"Vicheres","provider":"Meteofrance","latitude":48.257833,"longitude":0.910167},
        {"id":"29075001","name":"Brest-guipavas","provider":"Meteofrance","latitude":48.453833,"longitude":-4.391167},
        {"id":"29120001","name":"Lanveoc","provider":"Meteofrance","latitude":48.279333,"longitude":-4.439333},
        {"id":"29155005","name":"Ouessant-stiff","provider":"Meteofrance","latitude":48.473333,"longitude":-5.057},
        {"id":"29163003","name":"Pleyber-christ sa","provider":"Meteofrance","latitude":48.5,"longitude":-3.8535},
        {"id":"29178001","name":"Ploudalmezeau","provider":"Meteofrance","latitude":48.548,"longitude":-4.664167},
        {"id":"29214001","name":"Plovan","provider":"Meteofrance","latitude":47.915833,"longitude":-4.3775},
        {"id":"29216001","name":"Quimper","provider":"Meteofrance","latitude":47.973,"longitude":-4.160667},
        {"id":"29249002","name":"Saint-goazec","provider":"Meteofrance","latitude":48.144667,"longitude":-3.730833},
        {"id":"29263002","name":"St-segal s a","provider":"Meteofrance","latitude":48.225833,"longitude":-4.09},
        {"id":"29264001","name":"Landivisiau","provider":"Meteofrance","latitude":48.532,"longitude":-4.151833},
        {"id":"29276001","name":"Sibiril s a","provider":"Meteofrance","latitude":48.660833,"longitude":-4.079167},
        {"id":"29293001","name":"Tregunc","provider":"Meteofrance","latitude":47.841333,"longitude":-3.868833},
        {"id":"30003001","name":"Aigues-mortes","provider":"Meteofrance","latitude":43.537167,"longitude":4.207},
        {"id":"30032007","name":"Tarascon","provider":"Meteofrance","latitude":43.829833,"longitude":4.640167},
        {"id":"30132004","name":"La grand combe","provider":"Meteofrance","latitude":44.243,"longitude":4.010167},
        {"id":"30164001","name":"Mejannes-le-clap","provider":"Meteofrance","latitude":44.216333,"longitude":4.331},
        {"id":"30176002","name":"Montdardier","provider":"Meteofrance","latitude":43.947,"longitude":3.58},
        {"id":"30189001","name":"Nimes-courbessac","provider":"Meteofrance","latitude":43.856833,"longitude":4.406333},
        {"id":"30209002","name":"Pujaut","provider":"Meteofrance","latitude":43.9985,"longitude":4.759667},
        {"id":"30258001","name":"Nimes-garons","provider":"Meteofrance","latitude":43.772833,"longitude":4.412833},
        {"id":"30297001","name":"St sauveur camprieu","provider":"Meteofrance","latitude":44.119333,"longitude":3.4745},
        {"id":"30339001","name":"Mont aigoual","provider":"Meteofrance","latitude":44.121333,"longitude":3.5815},
        {"id":"30352002","name":"Villevieille","provider":"Meteofrance","latitude":43.795167,"longitude":4.090833},
        {"id":"31042012","name":"Luchon","provider":"Meteofrance","latitude":42.8015,"longitude":0.600167},
        {"id":"31069001","name":"Toulouse-blagnac","provider":"Meteofrance","latitude":43.621,"longitude":1.378833},
        {"id":"31147001","name":"Clarac","provider":"Meteofrance","latitude":43.106,"longitude":0.617333},
        {"id":"31299001","name":"Muret-lherm","provider":"Meteofrance","latitude":43.4515,"longitude":1.262},
        {"id":"31406002","name":"Palaminy","provider":"Meteofrance","latitude":43.2,"longitude":1.05},
        {"id":"31478001","name":"St-felix-lauragais","provider":"Meteofrance","latitude":43.441667,"longitude":1.881167},
        {"id":"32013005","name":"Auch","provider":"Meteofrance","latitude":43.689,"longitude":0.601167},
        {"id":"32107006","name":"Condom","provider":"Meteofrance","latitude":43.974333,"longitude":0.336},
        {"id":"32182001","name":"Lahas","provider":"Meteofrance","latitude":43.5475,"longitude":0.887833},
        {"id":"32248001","name":"Mauroux","provider":"Meteofrance","latitude":43.906833,"longitude":0.824833},
        {"id":"32315001","name":"Peyrusse-grande","provider":"Meteofrance","latitude":43.616667,"longitude":0.222},
        {"id":"33042005","name":"Belin beliet","provider":"Meteofrance","latitude":44.448,"longitude":-0.882},
        {"id":"33116001","name":"Cazats","provider":"Meteofrance","latitude":44.463167,"longitude":-0.186167},
        {"id":"33281001","name":"Bordeaux-merignac","provider":"Meteofrance","latitude":44.830667,"longitude":-0.691333},
        {"id":"33314005","name":"Pauillac","provider":"Meteofrance","latitude":45.214333,"longitude":-0.782833},
        {"id":"33394002","name":"St emilion","provider":"Meteofrance","latitude":44.917667,"longitude":-0.188},
        {"id":"33415001","name":"St gervais","provider":"Meteofrance","latitude":45.027167,"longitude":-0.472667},
        {"id":"33482001","name":"St sulpice de pommiers","provider":"Meteofrance","latitude":44.683833,"longitude":-0.12},
        {"id":"33529001","name":"Cazaux","provider":"Meteofrance","latitude":44.534667,"longitude":-1.132},
        {"id":"33540001","name":"Vendays-montalive","provider":"Meteofrance","latitude":45.378667,"longitude":-1.119167},
        {"id":"34107006","name":"Murat sur vebre","provider":"Meteofrance","latitude":43.633333,"longitude":2.8255},
        {"id":"34154001","name":"Montpellier-aeroport","provider":"Meteofrance","latitude":43.576167,"longitude":3.964667},
        {"id":"34178001","name":"Murviel les beziers","provider":"Meteofrance","latitude":43.476,"longitude":3.146},
        {"id":"34205001","name":"Les plans","provider":"Meteofrance","latitude":43.786,"longitude":3.246167},
        {"id":"34209002","name":"Beziers-vias","provider":"Meteofrance","latitude":43.322,"longitude":3.352667},
        {"id":"34217001","name":"Prades le lez","provider":"Meteofrance","latitude":43.718333,"longitude":3.866667},
        {"id":"34239002","name":"St andre de sangonis","provider":"Meteofrance","latitude":43.664167,"longitude":3.507833},
        {"id":"34274001","name":"St martin de londres","provider":"Meteofrance","latitude":43.7795,"longitude":3.729333},
        {"id":"34301002","name":"Sete","provider":"Meteofrance","latitude":43.397333,"longitude":3.692167},
        {"id":"34311001","name":"Pezenas-tourbes","provider":"Meteofrance","latitude":43.437667,"longitude":3.400333},
        {"id":"35005001","name":"Arbrissel","provider":"Meteofrance","latitude":47.927333,"longitude":-1.297333},
        {"id":"35057003","name":"La-chapelle-bouexic","provider":"Meteofrance","latitude":47.9215,"longitude":-1.940833},
        {"id":"35110003","name":"Feins  sa","provider":"Meteofrance","latitude":48.326833,"longitude":-1.596833},
        {"id":"35162003","name":"Louvigne-du-desert","provider":"Meteofrance","latitude":48.479333,"longitude":-1.129833},
        {"id":"35202001","name":"La-noe-blanche","provider":"Meteofrance","latitude":47.780167,"longitude":-1.765},
        {"id":"35228001","name":"Dinard","provider":"Meteofrance","latitude":48.584833,"longitude":-2.076333},
        {"id":"35281001","name":"Rennes-st jacques","provider":"Meteofrance","latitude":48.068833,"longitude":-1.734},
        {"id":"36063001","name":"Chateauroux  deols","provider":"Meteofrance","latitude":46.869833,"longitude":1.741},
        {"id":"36127002","name":"Montgivray","provider":"Meteofrance","latitude":46.610167,"longitude":1.974},
        {"id":"36173002","name":"Rosnay","provider":"Meteofrance","latitude":46.703,"longitude":1.249833},
        {"id":"37107001","name":"Ferriere-larcon","provider":"Meteofrance","latitude":46.9875,"longitude":0.875},
        {"id":"37179001","name":"Tours","provider":"Meteofrance","latitude":47.4445,"longitude":0.727333},
        {"id":"37192001","name":"Reignac","provider":"Meteofrance","latitude":47.219333,"longitude":0.899},
        {"id":"37213003","name":"St-christophe-sur-nais","provider":"Meteofrance","latitude":47.6155,"longitude":0.464333},
        {"id":"37240001","name":"Saunay","provider":"Meteofrance","latitude":47.590333,"longitude":0.931333},
        {"id":"37242002","name":"Savigny - veron","provider":"Meteofrance","latitude":47.227,"longitude":0.149333},
        {"id":"38053003","name":"Bourgoin","provider":"Meteofrance","latitude":45.608,"longitude":5.309333},
        {"id":"38133001","name":"Coublevie","provider":"Meteofrance","latitude":45.355333,"longitude":5.596333},
        {"id":"38185012","name":"Grenoble-cea-radome","provider":"Meteofrance","latitude":45.2115,"longitude":5.682833},
        {"id":"38191002","name":"Alpe-d'huez","provider":"Meteofrance","latitude":45.087833,"longitude":6.085667},
        {"id":"38269004","name":"La mure- radome","provider":"Meteofrance","latitude":44.935,"longitude":5.786167},
        {"id":"38336001","name":"Reventin","provider":"Meteofrance","latitude":45.478667,"longitude":4.810667},
        {"id":"38384001","name":"Grenoble-st geoirs","provider":"Meteofrance","latitude":45.364,"longitude":5.313333},
        {"id":"38442008","name":"St-pierre-les egaux","provider":"Meteofrance","latitude":45.317333,"longitude":5.803833},
        {"id":"38548001","name":"Villard-de-lans","provider":"Meteofrance","latitude":45.0785,"longitude":5.561},
        {"id":"38567002","name":"Chamrousse","provider":"Meteofrance","latitude":45.128,"longitude":5.878333},
        {"id":"39097003","name":"Champagnole","provider":"Meteofrance","latitude":46.756833,"longitude":5.886},
        {"id":"39362001","name":"Lons le saunier","provider":"Meteofrance","latitude":46.692833,"longitude":5.517667},
        {"id":"39413001","name":"La pesse","provider":"Meteofrance","latitude":46.302833,"longitude":5.843},
        {"id":"39485002","name":"St julien - sa","provider":"Meteofrance","latitude":46.385167,"longitude":5.448},
        {"id":"39526003","name":"Tavaux sa","provider":"Meteofrance","latitude":47.043833,"longitude":5.427333},
        {"id":"40046001","name":"Biscarrosse","provider":"Meteofrance","latitude":44.431667,"longitude":-1.2475},
        {"id":"40065002","name":"Capbreton","provider":"Meteofrance","latitude":43.627333,"longitude":-1.453333},
        {"id":"40087001","name":"Creon d'armagnac","provider":"Meteofrance","latitude":43.9935,"longitude":-0.045},
        {"id":"40088001","name":"Dax","provider":"Meteofrance","latitude":43.689833,"longitude":-1.07},
        {"id":"40164004","name":"Captieux-retjons","provider":"Meteofrance","latitude":44.185,"longitude":-0.286167},
        {"id":"40192001","name":"Mont-de-marsan","provider":"Meteofrance","latitude":43.909833,"longitude":-0.500167},
        {"id":"40243001","name":"Rion-des-landes","provider":"Meteofrance","latitude":43.916333,"longitude":-0.950833},
        {"id":"40246003","name":"Sabres","provider":"Meteofrance","latitude":44.153667,"longitude":-0.859},
        {"id":"40321002","name":"Urgons","provider":"Meteofrance","latitude":43.639667,"longitude":-0.435167},
        {"id":"41053001","name":"Choue","provider":"Meteofrance","latitude":47.969167,"longitude":0.912833},
        {"id":"41097001","name":"Romorantin","provider":"Meteofrance","latitude":47.319667,"longitude":1.6875},
        {"id":"41152001","name":"Montrieux","provider":"Meteofrance","latitude":47.535833,"longitude":1.7305},
        {"id":"41173003","name":"Ouzouer","provider":"Meteofrance","latitude":47.904,"longitude":1.521667},
        {"id":"41281001","name":"Blois","provider":"Meteofrance","latitude":47.6785,"longitude":1.212333},
        {"id":"42005001","name":"St etienne-boutheon","provider":"Meteofrance","latitude":45.545667,"longitude":4.293833},
        {"id":"42039003","name":"Chalmazel_ra","provider":"Meteofrance","latitude":45.699,"longitude":3.844},
        {"id":"42101001","name":"Pilat graix","provider":"Meteofrance","latitude":45.361167,"longitude":4.559833},
        {"id":"42207005","name":"St-chamond-p","provider":"Meteofrance","latitude":45.491,"longitude":4.534167},
        {"id":"42218011","name":"Saint-etienne","provider":"Meteofrance","latitude":45.435333,"longitude":4.368167},
        {"id":"42253001","name":"Roanne-riorges_aero","provider":"Meteofrance","latitude":46.055,"longitude":4.0045},
        {"id":"43046001","name":"Le puy-chadrac","provider":"Meteofrance","latitude":45.054667,"longitude":3.8945},
        {"id":"43062001","name":"Le puy-loudes","provider":"Meteofrance","latitude":45.0745,"longitude":3.764},
        {"id":"43095001","name":"Fix-st-geneys","provider":"Meteofrance","latitude":45.145833,"longitude":3.665},
        {"id":"43096001","name":"Fontannes","provider":"Meteofrance","latitude":45.300333,"longitude":3.419667},
        {"id":"43111002","name":"Landos-charbon","provider":"Meteofrance","latitude":44.858,"longitude":3.843667},
        {"id":"43130002","name":"Mazet-volamont","provider":"Meteofrance","latitude":45.025,"longitude":4.239833},
        {"id":"43137003","name":"Monistrol-sur-loire","provider":"Meteofrance","latitude":45.314,"longitude":4.231167},
        {"id":"43234005","name":"Saugues-sa","provider":"Meteofrance","latitude":44.966167,"longitude":3.539833},
        {"id":"44020001","name":"Nantes-bouguenais","provider":"Meteofrance","latitude":47.15,"longitude":-1.608833},
        {"id":"44103001","name":"St nazaire-montoir","provider":"Meteofrance","latitude":47.313833,"longitude":-2.1545},
        {"id":"44110002","name":"Nort-sur-erdre","provider":"Meteofrance","latitude":47.425167,"longitude":-1.513667},
        {"id":"44181001","name":"St-meme-le-tenu","provider":"Meteofrance","latitude":47.005667,"longitude":-1.7825},
        {"id":"45004001","name":"Amilly","provider":"Meteofrance","latitude":47.962167,"longitude":2.728},
        {"id":"45055001","name":"Orleans","provider":"Meteofrance","latitude":47.990667,"longitude":1.778167},
        {"id":"45340002","name":"Villemurlin","provider":"Meteofrance","latitude":47.6935,"longitude":2.366167},
        {"id":"46071001","name":"Comiac","provider":"Meteofrance","latitude":44.965333,"longitude":2},
        {"id":"46100001","name":"Faycelles","provider":"Meteofrance","latitude":44.575333,"longitude":2.004667},
        {"id":"46127001","name":"Gourdon","provider":"Meteofrance","latitude":44.745,"longitude":1.396667},
        {"id":"46181001","name":"Lunegarde","provider":"Meteofrance","latitude":44.6785,"longitude":1.6895},
        {"id":"46197002","name":"Le montat","provider":"Meteofrance","latitude":44.373667,"longitude":1.435},
        {"id":"47091001","name":"Agen-la garenne","provider":"Meteofrance","latitude":44.172167,"longitude":0.594667},
        {"id":"47093002","name":"Fargues-sur-ourbise","provider":"Meteofrance","latitude":44.235833,"longitude":0.186333},
        {"id":"47123002","name":"Lacapelle-biron","provider":"Meteofrance","latitude":44.585667,"longitude":0.900333},
        {"id":"47163001","name":"Mauvezin-sur-gupie","provider":"Meteofrance","latitude":44.5615,"longitude":0.160333},
        {"id":"47323004","name":"Villeneuve-sur-lot","provider":"Meteofrance","latitude":44.3975,"longitude":0.764},
        {"id":"48020003","name":"Bassurels","provider":"Meteofrance","latitude":44.1965,"longitude":3.630667},
        {"id":"48032003","name":"Le buisson","provider":"Meteofrance","latitude":44.633333,"longitude":3.238167},
        {"id":"48095005","name":"Mende","provider":"Meteofrance","latitude":44.533667,"longitude":3.4545},
        {"id":"48176002","name":"St pierre-des-tripiers","provider":"Meteofrance","latitude":44.2465,"longitude":3.3035},
        {"id":"49008001","name":"Angrie","provider":"Meteofrance","latitude":47.561667,"longitude":-0.970333},
        {"id":"49020001","name":"Beaucouze","provider":"Meteofrance","latitude":47.479,"longitude":-0.614333},
        {"id":"49099003","name":"Cholet","provider":"Meteofrance","latitude":47.0795,"longitude":-0.8805},
        {"id":"49138001","name":"Fontaine-guerin","provider":"Meteofrance","latitude":47.493167,"longitude":-0.167833},
        {"id":"49188001","name":"Marce","provider":"Meteofrance","latitude":47.561833,"longitude":-0.317},
        {"id":"49191001","name":"Martigne-briand","provider":"Meteofrance","latitude":47.2525,"longitude":-0.435833},
        {"id":"50020001","name":"Pte de la hague","provider":"Meteofrance","latitude":49.725167,"longitude":-1.939833},
        {"id":"50111001","name":"Cerisy la salle","provider":"Meteofrance","latitude":49.036333,"longitude":-1.298167},
        {"id":"50209001","name":"Gonneville","provider":"Meteofrance","latitude":49.652667,"longitude":-1.4635},
        {"id":"50215002","name":"Gouville","provider":"Meteofrance","latitude":49.1075,"longitude":-1.606833},
        {"id":"50410003","name":"Pontorson","provider":"Meteofrance","latitude":48.585667,"longitude":-1.505167},
        {"id":"50509002","name":"Ste marie du mo","provider":"Meteofrance","latitude":49.4045,"longitude":-1.168333},
        {"id":"51015001","name":"Argers","provider":"Meteofrance","latitude":49.064333,"longitude":4.849833},
        {"id":"51153001","name":"Chouilly","provider":"Meteofrance","latitude":49.017833,"longitude":3.981667},
        {"id":"51237002","name":"Esternay","provider":"Meteofrance","latitude":48.742,"longitude":3.579667},
        {"id":"51262001","name":"Frignicourt","provider":"Meteofrance","latitude":48.701167,"longitude":4.618},
        {"id":"51388003","name":"Mourmelon-grand","provider":"Meteofrance","latitude":49.1075,"longitude":4.3585},
        {"id":"51449002","name":"Reims-prunay","provider":"Meteofrance","latitude":49.209833,"longitude":4.155333},
        {"id":"51595002","name":"Vatry-aero","provider":"Meteofrance","latitude":48.777167,"longitude":4.164667},
        {"id":"52055001","name":"Blecourt","provider":"Meteofrance","latitude":48.384167,"longitude":5.067},
        {"id":"52248002","name":"Is-en-bassigny","provider":"Meteofrance","latitude":48.022167,"longitude":5.455333},
        {"id":"52269001","name":"Langres","provider":"Meteofrance","latitude":47.843667,"longitude":5.3375},
        {"id":"52448001","name":"St-dizier","provider":"Meteofrance","latitude":48.631333,"longitude":4.903667},
        {"id":"52469001","name":"Chaumont-semoutiers","provider":"Meteofrance","latitude":48.092167,"longitude":5.046},
        {"id":"53096004","name":"Ernee","provider":"Meteofrance","latitude":48.295667,"longitude":-0.9625},
        {"id":"53110002","name":"Grez-en-bouere","provider":"Meteofrance","latitude":47.891,"longitude":-0.542333},
        {"id":"53116003","name":"Le horps","provider":"Meteofrance","latitude":48.405667,"longitude":-0.440833},
        {"id":"53130008","name":"Laval-etronnier","provider":"Meteofrance","latitude":48.030667,"longitude":-0.7465},
        {"id":"54171001","name":"Doncourt-les-conflans","provider":"Meteofrance","latitude":49.1535,"longitude":5.929333},
        {"id":"54405001","name":"Nancy-ochey","provider":"Meteofrance","latitude":48.581,"longitude":5.959833},
        {"id":"54481001","name":"St maurice","provider":"Meteofrance","latitude":48.514833,"longitude":6.845667},
        {"id":"54526001","name":"Nancy-essey","provider":"Meteofrance","latitude":48.687833,"longitude":6.2215},
        {"id":"54582001","name":"Villette","provider":"Meteofrance","latitude":49.482167,"longitude":5.578167},
        {"id":"55129001","name":"Courouvre","provider":"Meteofrance","latitude":48.936833,"longitude":5.358333},
        {"id":"55248001","name":"Houdelaincourt","provider":"Meteofrance","latitude":48.563,"longitude":5.5055},
        {"id":"55364001","name":"Mouzay","provider":"Meteofrance","latitude":49.460167,"longitude":5.209167},
        {"id":"55386002","name":"Nonsard","provider":"Meteofrance","latitude":48.934167,"longitude":5.763833},
        {"id":"55443001","name":"Rouvres-en-woevre","provider":"Meteofrance","latitude":49.224667,"longitude":5.6875},
        {"id":"55484001","name":"Septsarges","provider":"Meteofrance","latitude":49.276333,"longitude":5.155},
        {"id":"55531001","name":"Vassincourt","provider":"Meteofrance","latitude":48.808667,"longitude":5.033167},
        {"id":"56009003","name":"Belle-ile_aero","provider":"Meteofrance","latitude":47.325667,"longitude":-3.196833},
        {"id":"56017003","name":"Bignan","provider":"Meteofrance","latitude":47.884333,"longitude":-2.728833},
        {"id":"56069001","name":"Ile de groix","provider":"Meteofrance","latitude":47.652333,"longitude":-3.502333},
        {"id":"56151001","name":"Pontivy aerodrome","provider":"Meteofrance","latitude":48.055667,"longitude":-2.916667},
        {"id":"56159001","name":"Pleucadeuc","provider":"Meteofrance","latitude":47.7655,"longitude":-2.387167},
        {"id":"56165003","name":"Ploermel","provider":"Meteofrance","latitude":47.950833,"longitude":-2.3975},
        {"id":"56185001","name":"Lorient-lann bihoue","provider":"Meteofrance","latitude":47.762833,"longitude":-3.435667},
        {"id":"56186003","name":"Quiberon-aerodrome","provider":"Meteofrance","latitude":47.479833,"longitude":-3.099},
        {"id":"56243001","name":"Vannes-sene","provider":"Meteofrance","latitude":47.6045,"longitude":-2.714167},
        {"id":"57039001","name":"Metz-frescaty","provider":"Meteofrance","latitude":49.0695,"longitude":6.125333},
        {"id":"57119001","name":"Buhl-lorraine","provider":"Meteofrance","latitude":48.7195,"longitude":7.079833},
        {"id":"57587003","name":"Rodalbe","provider":"Meteofrance","latitude":48.909833,"longitude":6.693167},
        {"id":"57644001","name":"Seingbouse","provider":"Meteofrance","latitude":49.127667,"longitude":6.831},
        {"id":"57689001","name":"Valmestroff","provider":"Meteofrance","latitude":49.356833,"longitude":6.262},
        {"id":"58019001","name":"Avree","provider":"Meteofrance","latitude":46.820667,"longitude":3.905},
        {"id":"58062001","name":"Chateau chinon","provider":"Meteofrance","latitude":47.070333,"longitude":3.934333},
        {"id":"58079004","name":"Clamecy","provider":"Meteofrance","latitude":47.441,"longitude":3.509},
        {"id":"58160001","name":"Nevers-marzy","provider":"Meteofrance","latitude":46.999333,"longitude":3.1145},
        {"id":"58218006","name":"Premery","provider":"Meteofrance","latitude":47.170333,"longitude":3.3695},
        {"id":"59183001","name":"Dunkerque","provider":"Meteofrance","latitude":51.055833,"longitude":2.3395},
        {"id":"59343001","name":"Lille-lesquin","provider":"Meteofrance","latitude":50.57,"longitude":3.0975},
        {"id":"59534001","name":"St-hilaire-sur-helpe","provider":"Meteofrance","latitude":50.1455,"longitude":3.925167},
        {"id":"59580003","name":"Steenvoorde","provider":"Meteofrance","latitude":50.829833,"longitude":2.568833},
        {"id":"59606004","name":"Valenciennes","provider":"Meteofrance","latitude":50.328333,"longitude":3.461},
        {"id":"60040001","name":"Bailleul-le-soc","provider":"Meteofrance","latitude":49.423667,"longitude":2.579667},
        {"id":"60322001","name":"Jamericourt","provider":"Meteofrance","latitude":49.3065,"longitude":1.8795},
        {"id":"60382001","name":"Margny-les-compiegne","provider":"Meteofrance","latitude":49.4315,"longitude":2.803667},
        {"id":"60500004","name":"Plessis-belleville","provider":"Meteofrance","latitude":49.106,"longitude":2.737167},
        {"id":"60555002","name":"Rouvroy-les-merles","provider":"Meteofrance","latitude":49.650333,"longitude":2.370833},
        {"id":"60639001","name":"Beauvais-tille","provider":"Meteofrance","latitude":49.4465,"longitude":2.127167},
        {"id":"61001001","name":"Alencon","provider":"Meteofrance","latitude":48.4455,"longitude":0.110167},
        {"id":"61006005","name":"Argentan","provider":"Meteofrance","latitude":48.718167,"longitude":0.0115},
        {"id":"61169003","name":"Flers","provider":"Meteofrance","latitude":48.75,"longitude":-0.5895},
        {"id":"61214002","name":"L aigle","provider":"Meteofrance","latitude":48.7585,"longitude":0.662333},
        {"id":"61404001","name":"St-hilaire","provider":"Meteofrance","latitude":48.555833,"longitude":0.5295},
        {"id":"62054001","name":"Cap-gris-nez","provider":"Meteofrance","latitude":50.869667,"longitude":1.582833},
        {"id":"62160001","name":"Boulogne-sem","provider":"Meteofrance","latitude":50.7325,"longitude":1.599667},
        {"id":"62298001","name":"Cambrai-epinoy","provider":"Meteofrance","latitude":50.2255,"longitude":3.163833},
        {"id":"62516002","name":"Lillers","provider":"Meteofrance","latitude":50.5795,"longitude":2.4965},
        {"id":"62548002","name":"Calais-marck","provider":"Meteofrance","latitude":50.959833,"longitude":1.956167},
        {"id":"62685001","name":"Radinghem","provider":"Meteofrance","latitude":50.549167,"longitude":2.113667},
        {"id":"62784001","name":"Saulty","provider":"Meteofrance","latitude":50.222167,"longitude":2.522167},
        {"id":"62826001","name":"Le-touquet","provider":"Meteofrance","latitude":50.5145,"longitude":1.622833},
        {"id":"62873001","name":"Arras","provider":"Meteofrance","latitude":50.255833,"longitude":2.87},
        {"id":"63003004","name":"Ambert","provider":"Meteofrance","latitude":45.516833,"longitude":3.742667},
        {"id":"63038002","name":"Superbesse","provider":"Meteofrance","latitude":45.501667,"longitude":2.865833},
        {"id":"63098001","name":"Chastreix","provider":"Meteofrance","latitude":45.533,"longitude":2.7745},
        {"id":"63113001","name":"Clermont-fd","provider":"Meteofrance","latitude":45.786833,"longitude":3.149333},
        {"id":"63125002","name":"Courpiere","provider":"Meteofrance","latitude":45.754,"longitude":3.572333},
        {"id":"63178001","name":"Issoire","provider":"Meteofrance","latitude":45.535333,"longitude":3.262333},
        {"id":"63319002","name":"St-antheme","provider":"Meteofrance","latitude":45.575833,"longitude":3.886167},
        {"id":"63353003","name":"St-germain-l he","provider":"Meteofrance","latitude":45.461,"longitude":3.532667},
        {"id":"63354004","name":"St-gervais-d au","provider":"Meteofrance","latitude":46.032667,"longitude":2.803833},
        {"id":"63399002","name":"St-sulpice","provider":"Meteofrance","latitude":45.6465,"longitude":2.598333},
        {"id":"63451001","name":"Vernines","provider":"Meteofrance","latitude":45.669,"longitude":2.888333},
        {"id":"64010002","name":"Aicirits","provider":"Meteofrance","latitude":43.335,"longitude":-1.0205},
        {"id":"64024001","name":"Biarritz-pays-basque","provider":"Meteofrance","latitude":43.469333,"longitude":-1.534333},
        {"id":"64155001","name":"Bustince - st jean","provider":"Meteofrance","latitude":43.1715,"longitude":-1.2095},
        {"id":"64189001","name":"Socoa","provider":"Meteofrance","latitude":43.3945,"longitude":-1.6865},
        {"id":"64238001","name":"Ger","provider":"Meteofrance","latitude":43.238333,"longitude":-0.083833},
        {"id":"64316003","name":"Iraty orgambide","provider":"Meteofrance","latitude":43.0335,"longitude":-1.033833},
        {"id":"64422007","name":"Oloron","provider":"Meteofrance","latitude":43.1595,"longitude":-0.5795},
        {"id":"64430003","name":"Orthez","provider":"Meteofrance","latitude":43.501333,"longitude":-0.755},
        {"id":"64549001","name":"Pau-uzein","provider":"Meteofrance","latitude":43.385,"longitude":-0.416333},
        {"id":"65001001","name":"Adast","provider":"Meteofrance","latitude":42.972833,"longitude":-0.072167},
        {"id":"65125001","name":"Campistrous","provider":"Meteofrance","latitude":43.127167,"longitude":0.3665},
        {"id":"65129003","name":"Castelnau magnoac","provider":"Meteofrance","latitude":43.277833,"longitude":0.5175},
        {"id":"65283001","name":"Loudervielle","provider":"Meteofrance","latitude":42.7965,"longitude":0.439667},
        {"id":"65344001","name":"Tarbes-lourdes-pyrenees","provider":"Meteofrance","latitude":43.188,"longitude":0},
        {"id":"65460002","name":"Vic en bigorre","provider":"Meteofrance","latitude":43.3755,"longitude":0.045833},
        {"id":"66082004","name":"Formigueres","provider":"Meteofrance","latitude":42.616,"longitude":2.111333},
        {"id":"66088003","name":"Ille-sur-tet","provider":"Meteofrance","latitude":42.659833,"longitude":2.614167},
        {"id":"66136001","name":"Perpignan","provider":"Meteofrance","latitude":42.737167,"longitude":2.872833},
        {"id":"66187006","name":"St paul de fenouillet","provider":"Meteofrance","latitude":42.8205,"longitude":2.485333},
        {"id":"66194002","name":"Serralongue","provider":"Meteofrance","latitude":42.399833,"longitude":2.557667},
        {"id":"66202001","name":"Targasonne","provider":"Meteofrance","latitude":42.504,"longitude":1.973333},
        {"id":"66212001","name":"Torreilles","provider":"Meteofrance","latitude":42.755,"longitude":2.978333},
        {"id":"66233001","name":"Vives","provider":"Meteofrance","latitude":42.5365,"longitude":2.760833},
        {"id":"67027001","name":"Belmont","provider":"Meteofrance","latitude":48.406333,"longitude":7.267167},
        {"id":"67029001","name":"Berg","provider":"Meteofrance","latitude":48.884333,"longitude":7.151667},
        {"id":"67124001","name":"Strasbourg-entzheim","provider":"Meteofrance","latitude":48.5495,"longitude":7.640333},
        {"id":"67443001","name":"Scheibenhard","provider":"Meteofrance","latitude":48.964167,"longitude":8.1455},
        {"id":"67462004","name":"Selestat sa","provider":"Meteofrance","latitude":48.272833,"longitude":7.478333},
        {"id":"67516001","name":"Waltenheim-sur-zorn","provider":"Meteofrance","latitude":48.7435,"longitude":7.61},
        {"id":"68205001","name":"Colmar-meyenheim","provider":"Meteofrance","latitude":47.928667,"longitude":7.407667},
        {"id":"68224006","name":"Mulhouse","provider":"Meteofrance","latitude":47.75,"longitude":7.288833},
        {"id":"68247003","name":"Markstein crete","provider":"Meteofrance","latitude":47.923,"longitude":7.031667},
        {"id":"68297001","name":"Bale-mulhouse","provider":"Meteofrance","latitude":47.614333,"longitude":7.51},
        {"id":"69028001","name":"Brindas","provider":"Meteofrance","latitude":45.713333,"longitude":4.693167},
        {"id":"69029001","name":"Lyon-bron","provider":"Meteofrance","latitude":45.721333,"longitude":4.949167},
        {"id":"69174002","name":"Les sauvages","provider":"Meteofrance","latitude":45.935333,"longitude":4.384167},
        {"id":"69206001","name":"St-georges-ren","provider":"Meteofrance","latitude":46.058167,"longitude":4.710833},
        {"id":"69258001","name":"Vauxrenard","provider":"Meteofrance","latitude":46.217,"longitude":4.6285},
        {"id":"69299001","name":"Lyon-st exupery","provider":"Meteofrance","latitude":45.7265,"longitude":5.077833},
        {"id":"70132001","name":"Chargey-les-gray","provider":"Meteofrance","latitude":47.507,"longitude":5.5955},
        {"id":"70283006","name":"Ballon de servance","provider":"Meteofrance","latitude":47.830833,"longitude":6.791333},
        {"id":"70447002","name":"Rioz","provider":"Meteofrance","latitude":47.438167,"longitude":6.062},
        {"id":"70473001","name":"Luxeuil","provider":"Meteofrance","latitude":47.787,"longitude":6.363833},
        {"id":"70545001","name":"Venisey","provider":"Meteofrance","latitude":47.836,"longitude":5.990167},
        {"id":"70561002","name":"Villersexel sa","provider":"Meteofrance","latitude":47.543667,"longitude":6.433},
        {"id":"71014004","name":"Autun","provider":"Meteofrance","latitude":46.972,"longitude":4.263167},
        {"id":"71081001","name":"Chalon-champfo","provider":"Meteofrance","latitude":46.827,"longitude":4.825667},
        {"id":"71105001","name":"Macon","provider":"Meteofrance","latitude":46.2945,"longitude":4.794333},
        {"id":"71320001","name":"Mt-st-vincent","provider":"Meteofrance","latitude":46.627667,"longitude":4.477},
        {"id":"71491001","name":"St yan","provider":"Meteofrance","latitude":46.408333,"longitude":4.0165},
        {"id":"71558001","name":"Varennes-st-sa","provider":"Meteofrance","latitude":46.529333,"longitude":5.255333},
        {"id":"72172003","name":"Le luart","provider":"Meteofrance","latitude":48.076333,"longitude":0.591},
        {"id":"72175002","name":"Luche-pringe","provider":"Meteofrance","latitude":47.713,"longitude":0.088167},
        {"id":"72181001","name":"Le mans","provider":"Meteofrance","latitude":47.945833,"longitude":0.194167},
        {"id":"72255001","name":"Rouesse-vasse","provider":"Meteofrance","latitude":48.139333,"longitude":-0.225667},
        {"id":"73051001","name":"Mont du chat","provider":"Meteofrance","latitude":45.6605,"longitude":5.8215},
        {"id":"73054001","name":"Bourg st maurice","provider":"Meteofrance","latitude":45.612667,"longitude":6.763333},
        {"id":"73132003","name":"Col-des-saisies","provider":"Meteofrance","latitude":45.755,"longitude":6.535333},
        {"id":"73144001","name":"Mont cenis","provider":"Meteofrance","latitude":45.269333,"longitude":6.899167},
        {"id":"73171002","name":"Montmelian","provider":"Meteofrance","latitude":45.493833,"longitude":6.049167},
        {"id":"73255003","name":"Ste marie cuines","provider":"Meteofrance","latitude":45.3435,"longitude":6.307167},
        {"id":"73257003","name":"La masse","provider":"Meteofrance","latitude":45.297333,"longitude":6.508333},
        {"id":"73297003","name":"Albertville","provider":"Meteofrance","latitude":45.627833,"longitude":6.327667},
        {"id":"73304005","name":"Val d'isere jos","provider":"Meteofrance","latitude":45.444833,"longitude":6.978167},
        {"id":"73329001","name":"Chambery-aix","provider":"Meteofrance","latitude":45.641333,"longitude":5.878},
        {"id":"74042003","name":"Bonneville","provider":"Meteofrance","latitude":46.0685,"longitude":6.399833},
        {"id":"74056001","name":"Chamonix","provider":"Meteofrance","latitude":45.9295,"longitude":6.8775},
        {"id":"74056005","name":"Le tour","provider":"Meteofrance","latitude":46.003833,"longitude":6.9485},
        {"id":"74119003","name":"Evian sa","provider":"Meteofrance","latitude":46.382333,"longitude":6.5825},
        {"id":"74136005","name":"Le grand-bornand","provider":"Meteofrance","latitude":45.973333,"longitude":6.471833},
        {"id":"74182001","name":"Meythet","provider":"Meteofrance","latitude":45.928167,"longitude":6.094},
        {"id":"74191003","name":"Le pleney","provider":"Meteofrance","latitude":46.168333,"longitude":6.692833},
        {"id":"74236002","name":"Mont arbois","provider":"Meteofrance","latitude":45.855333,"longitude":6.669},
        {"id":"74285002","name":"Usinens sa","provider":"Meteofrance","latitude":46.013,"longitude":5.8445},
        {"id":"75114001","name":"Paris-montsouris","provider":"Meteofrance","latitude":48.821667,"longitude":2.337833},
        {"id":"75116008","name":"Longchamp","provider":"Meteofrance","latitude":48.854833,"longitude":2.233667},
        {"id":"76116001","name":"Rouen-boos","provider":"Meteofrance","latitude":49.3895,"longitude":1.178333},
        {"id":"76130001","name":"Bouelles","provider":"Meteofrance","latitude":49.733167,"longitude":1.5025},
        {"id":"76217001","name":"Dieppe","provider":"Meteofrance","latitude":49.932833,"longitude":1.09},
        {"id":"76228001","name":"Ectot les baons","provider":"Meteofrance","latitude":49.646667,"longitude":0.816667},
        {"id":"76473001","name":"Notre-dame de bliquetuit","provider":"Meteofrance","latitude":49.494,"longitude":0.770667},
        {"id":"76481001","name":"Octeville","provider":"Meteofrance","latitude":49.533,"longitude":0.091667},
        {"id":"76746001","name":"Vinnemerville","provider":"Meteofrance","latitude":49.8145,"longitude":0.567667},
        {"id":"77054001","name":"La brosse-mx","provider":"Meteofrance","latitude":48.351667,"longitude":3.023333},
        {"id":"77084001","name":"Changis","provider":"Meteofrance","latitude":48.964667,"longitude":3.011833},
        {"id":"77113002","name":"Chevru","provider":"Meteofrance","latitude":48.726833,"longitude":3.203333},
        {"id":"77211001","name":"Nangis","provider":"Meteofrance","latitude":48.595333,"longitude":3.007667},
        {"id":"77306001","name":"Melun","provider":"Meteofrance","latitude":48.610333,"longitude":2.6795},
        {"id":"77333003","name":"Nemours","provider":"Meteofrance","latitude":48.27,"longitude":2.715},
        {"id":"77468001","name":"Torcy","provider":"Meteofrance","latitude":48.8635,"longitude":2.651},
        {"id":"78005002","name":"Acheres","provider":"Meteofrance","latitude":48.983167,"longitude":2.126},
        {"id":"78354001","name":"Magnanville","provider":"Meteofrance","latitude":48.963667,"longitude":1.674167},
        {"id":"78620001","name":"Toussus le noble","provider":"Meteofrance","latitude":48.750667,"longitude":2.1135},
        {"id":"78621001","name":"Trappes","provider":"Meteofrance","latitude":48.774333,"longitude":2.009833},
        {"id":"78640001","name":"Villacoublay","provider":"Meteofrance","latitude":48.7725,"longitude":2.204},
        {"id":"79049004","name":"Bressuire","provider":"Meteofrance","latitude":46.839833,"longitude":-0.515833},
        {"id":"79174002","name":"Melle","provider":"Meteofrance","latitude":46.235,"longitude":-0.151333},
        {"id":"79191005","name":"Niort","provider":"Meteofrance","latitude":46.315833,"longitude":-0.400167},
        {"id":"79326004","name":"Thenezay stna","provider":"Meteofrance","latitude":46.725333,"longitude":-0.020333},
        {"id":"80001001","name":"Abbeville","provider":"Meteofrance","latitude":50.136,"longitude":1.834},
        {"id":"80086002","name":"Bernaville","provider":"Meteofrance","latitude":50.139333,"longitude":2.1805},
        {"id":"80182003","name":"Cayeux-sur-mer","provider":"Meteofrance","latitude":50.187167,"longitude":1.521167},
        {"id":"80379002","name":"Amiens-glisy","provider":"Meteofrance","latitude":49.872,"longitude":2.3825},
        {"id":"80523001","name":"Meaulte","provider":"Meteofrance","latitude":49.971833,"longitude":2.703833},
        {"id":"80682001","name":"Rouvroy-en-santerre","provider":"Meteofrance","latitude":49.765167,"longitude":2.698333},
        {"id":"81115002","name":"Labastide-rouairoux","provider":"Meteofrance","latitude":43.478333,"longitude":2.657833},
        {"id":"81140002","name":"Lavaur","provider":"Meteofrance","latitude":43.693667,"longitude":1.866167},
        {"id":"81182004","name":"Montredon-labessonnie","provider":"Meteofrance","latitude":43.725,"longitude":2.3555},
        {"id":"81217002","name":"Puycelsi","provider":"Meteofrance","latitude":43.981,"longitude":1.680667},
        {"id":"81284001","name":"Albi","provider":"Meteofrance","latitude":43.914667,"longitude":2.116333},
        {"id":"81292001","name":"Tanus","provider":"Meteofrance","latitude":44.107167,"longitude":2.279667},
        {"id":"82033005","name":"Castelsarrasin","provider":"Meteofrance","latitude":44.086833,"longitude":1.129},
        {"id":"82038006","name":"Caylus","provider":"Meteofrance","latitude":44.220167,"longitude":1.704167},
        {"id":"82094004","name":"Lauzerte","provider":"Meteofrance","latitude":44.271,"longitude":1.1155},
        {"id":"82121002","name":"Montauban","provider":"Meteofrance","latitude":44.028,"longitude":1.376667},
        {"id":"82178002","name":"Savenes","provider":"Meteofrance","latitude":43.824167,"longitude":1.175},
        {"id":"83019002","name":"Bormes les mimosas","provider":"Meteofrance","latitude":43.195167,"longitude":6.379333},
        {"id":"83031001","name":"Le luc","provider":"Meteofrance","latitude":43.383167,"longitude":6.386167},
        {"id":"83035001","name":"Le castellet-aero","provider":"Meteofrance","latitude":43.252167,"longitude":5.784667},
        {"id":"83044003","name":"Comps-sur-artuby","provider":"Meteofrance","latitude":43.658833,"longitude":6.471333},
        {"id":"83049005","name":"Cuers","provider":"Meteofrance","latitude":43.247667,"longitude":6.131333},
        {"id":"83051001","name":"Entrecasteaux","provider":"Meteofrance","latitude":43.521333,"longitude":6.252167},
        {"id":"83061001","name":"Frejus","provider":"Meteofrance","latitude":43.4235,"longitude":6.738},
        {"id":"83069001","name":"Hyeres","provider":"Meteofrance","latitude":43.1005,"longitude":6.147},
        {"id":"83069003","name":"Ile du levant","provider":"Meteofrance","latitude":43.0325,"longitude":6.469333},
        {"id":"83124002","name":"Seillans","provider":"Meteofrance","latitude":43.580167,"longitude":6.622167},
        {"id":"83137001","name":"Toulon","provider":"Meteofrance","latitude":43.114,"longitude":5.9005},
        {"id":"83150002","name":"Vinon sur verdon","provider":"Meteofrance","latitude":43.734,"longitude":5.782667},
        {"id":"84007005","name":"Avignon","provider":"Meteofrance","latitude":43.911333,"longitude":4.9025},
        {"id":"84009002","name":"La bastide des jourdans","provider":"Meteofrance","latitude":43.787333,"longitude":5.615},
        {"id":"84025001","name":"Cabrieres d'avignon","provider":"Meteofrance","latitude":43.883667,"longitude":5.164833},
        {"id":"84031001","name":"Carpentras","provider":"Meteofrance","latitude":44.083667,"longitude":5.058333},
        {"id":"84087001","name":"Orange","provider":"Meteofrance","latitude":44.1445,"longitude":4.861},
        {"id":"84094001","name":"Puymeras","provider":"Meteofrance","latitude":44.2895,"longitude":5.131333},
        {"id":"84107002","name":"St christol","provider":"Meteofrance","latitude":44.040667,"longitude":5.492833},
        {"id":"84150001","name":"Visan","provider":"Meteofrance","latitude":44.336667,"longitude":4.9055},
        {"id":"85060002","name":"Chateau-d'olonne","provider":"Meteofrance","latitude":46.477167,"longitude":-1.725833},
        {"id":"85092004","name":"Fontenay","provider":"Meteofrance","latitude":46.448167,"longitude":-0.779833},
        {"id":"85104001","name":"Grues","provider":"Meteofrance","latitude":46.350167,"longitude":-1.334833},
        {"id":"85113004","name":"L'ile d'yeu aero","provider":"Meteofrance","latitude":46.718167,"longitude":-2.388667},
        {"id":"85163001","name":"Noirmoutier en","provider":"Meteofrance","latitude":47.004667,"longitude":-2.257167},
        {"id":"85172001","name":"Le perrier","provider":"Meteofrance","latitude":46.8265,"longitude":-1.999833},
        {"id":"85182004","name":"Pouzauges sa","provider":"Meteofrance","latitude":46.766,"longitude":-0.830833},
        {"id":"85191003","name":"La roche sur yon","provider":"Meteofrance","latitude":46.705,"longitude":-1.381833},
        {"id":"86009001","name":"Archigny","provider":"Meteofrance","latitude":46.685333,"longitude":0.678833},
        {"id":"86027001","name":"Poitiers-biard","provider":"Meteofrance","latitude":46.593833,"longitude":0.314333},
        {"id":"86078002","name":"Civray","provider":"Meteofrance","latitude":46.160333,"longitude":0.298667},
        {"id":"86137003","name":"Loudun","provider":"Meteofrance","latitude":47.034833,"longitude":0.097667},
        {"id":"86165005","name":"Montmorillon","provider":"Meteofrance","latitude":46.411833,"longitude":0.841167},
        {"id":"87064005","name":"Eymoutiers","provider":"Meteofrance","latitude":45.733833,"longitude":1.701167},
        {"id":"87085006","name":"Limoges-bellegarde","provider":"Meteofrance","latitude":45.861167,"longitude":1.175},
        {"id":"87089003","name":"Magnac-laval","provider":"Meteofrance","latitude":46.209667,"longitude":1.187},
        {"id":"87154003","name":"St junien","provider":"Meteofrance","latitude":45.900833,"longitude":0.917},
        {"id":"87187003","name":"St yrieix la pe","provider":"Meteofrance","latitude":45.513667,"longitude":1.243833},
        {"id":"88033002","name":"Ban-de-sapt","provider":"Meteofrance","latitude":48.345833,"longitude":6.991833},
        {"id":"88081004","name":"Bussang","provider":"Meteofrance","latitude":47.892167,"longitude":6.868},
        {"id":"88136001","name":"Epinal","provider":"Meteofrance","latitude":48.210833,"longitude":6.451667},
        {"id":"88271001","name":"Ligneville","provider":"Meteofrance","latitude":48.160833,"longitude":5.961167},
        {"id":"88393003","name":"Rollainville","provider":"Meteofrance","latitude":48.359167,"longitude":5.716667},
        {"id":"88402002","name":"Roville","provider":"Meteofrance","latitude":48.383,"longitude":6.608167},
        {"id":"88486003","name":"Vagney","provider":"Meteofrance","latitude":48.042333,"longitude":6.750333},
        {"id":"88487003","name":"Le val-d'ajol","provider":"Meteofrance","latitude":47.955167,"longitude":6.462667},
        {"id":"89295001","name":"Auxerre-perrigny","provider":"Meteofrance","latitude":47.824667,"longitude":3.549667},
        {"id":"89333001","name":"St andre","provider":"Meteofrance","latitude":47.488333,"longitude":4.058667},
        {"id":"89365001","name":"Saint prive","provider":"Meteofrance","latitude":47.658,"longitude":2.985333},
        {"id":"89380001","name":"Savigny\/clairis","provider":"Meteofrance","latitude":48.0865,"longitude":3.104},
        {"id":"89387002","name":"Sens","provider":"Meteofrance","latitude":48.167667,"longitude":3.288667},
        {"id":"89418007","name":"Tonnerre joudre","provider":"Meteofrance","latitude":47.868167,"longitude":3.995},
        {"id":"90035001","name":"Dorans","provider":"Meteofrance","latitude":47.591667,"longitude":6.837},
        {"id":"91027002","name":"Orly","provider":"Meteofrance","latitude":48.718,"longitude":2.397},
        {"id":"91184001","name":"Courdimanche","provider":"Meteofrance","latitude":48.421833,"longitude":2.374333},
        {"id":"95078001","name":"Pontoise - aero","provider":"Meteofrance","latitude":49.0905,"longitude":2.027667},
        {"id":"95088001","name":"Le bourget","provider":"Meteofrance","latitude":48.967333,"longitude":2.427667},
        {"id":"95527001","name":"Roissy","provider":"Meteofrance","latitude":49.015167,"longitude":2.534333},
        {"id":"97101015","name":"Le raizet aero","provider":"Meteofrance","latitude":16.264,"longitude":-61.516333},
        {"id":"97102005","name":"Anse-bertrand la joyeuse","provider":"Meteofrance","latitude":16.474333,"longitude":-61.487667},
        {"id":"97104005","name":"Baillif aero","provider":"Meteofrance","latitude":16.012167,"longitude":-61.740167},
        {"id":"97109003","name":"Gourbeyre gros-morne dole","provider":"Meteofrance","latitude":16.003167,"longitude":-61.6725},
        {"id":"97110002","name":"La desirade meteo","provider":"Meteofrance","latitude":16.335,"longitude":-61.004},
        {"id":"97112003","name":"Grand-bourg les basses aero","provider":"Meteofrance","latitude":15.8695,"longitude":-61.272167},
        {"id":"97114008","name":"Goyave christophe","provider":"Meteofrance","latitude":16.109833,"longitude":-61.586167},
        {"id":"97116002","name":"Morne-a-l'eau blanchet","provider":"Meteofrance","latitude":16.3235,"longitude":-61.42},
        {"id":"97117013","name":"Le moule laureal","provider":"Meteofrance","latitude":16.314167,"longitude":-61.349},
        {"id":"97121002","name":"Pointe-noire col des mamelles","provider":"Meteofrance","latitude":16.1795,"longitude":-61.724667},
        {"id":"97121005","name":"Pointe-noire bellevue","provider":"Meteofrance","latitude":16.232167,"longitude":-61.776333},
        {"id":"97123001","name":"St-barthelemy meteo","provider":"Meteofrance","latitude":17.9015,"longitude":-62.852167},
        {"id":"97124009","name":"St-claude citerne","provider":"Meteofrance","latitude":16.032667,"longitude":-61.656},
        {"id":"97125011","name":"Saint francois aerodrome","provider":"Meteofrance","latitude":16.257167,"longitude":-61.2565},
        {"id":"97127004","name":"St-martin grand-case","provider":"Meteofrance","latitude":18.100667,"longitude":-63.048},
        {"id":"97129015","name":"Ste-rose viard","provider":"Meteofrance","latitude":16.314167,"longitude":-61.681},
        {"id":"97208001","name":"Fond-denis-cadet","provider":"Meteofrance","latitude":14.735333,"longitude":-61.145},
        {"id":"97209004","name":"Fort-de-france desaix","provider":"Meteofrance","latitude":14.617667,"longitude":-61.063833},
        {"id":"97209007","name":"Fort-d-france-pte negres","provider":"Meteofrance","latitude":14.599333,"longitude":-61.090333},
        {"id":"97210001","name":"Francois-chopot","provider":"Meteofrance","latitude":14.630333,"longitude":-60.919667},
        {"id":"97213004","name":"Lamentin-aero","provider":"Meteofrance","latitude":14.595333,"longitude":-60.995667},
        {"id":"97214001","name":"Lorrain vallon","provider":"Meteofrance","latitude":14.829167,"longitude":-61.049333},
        {"id":"97222002","name":"Robert-pte fort","provider":"Meteofrance","latitude":14.679667,"longitude":-60.9255},
        {"id":"97224004","name":"St-joseph lezard","provider":"Meteofrance","latitude":14.6585,"longitude":-60.9985},
        {"id":"97230001","name":"Trinite-caravel","provider":"Meteofrance","latitude":14.7745,"longitude":-60.875333},
        {"id":"97232003","name":"Vauclin","provider":"Meteofrance","latitude":14.551833,"longitude":-60.836667},
        {"id":"97302005","name":"Cayenne suzini","provider":"Meteofrance","latitude":4.929667,"longitude":-52.290167},
        {"id":"97306007","name":"Mana aerodrome","provider":"Meteofrance","latitude":5.6635,"longitude":-53.761667},
        {"id":"97307001","name":"Cayenne-matoury","provider":"Meteofrance","latitude":4.822333,"longitude":-52.365333},
        {"id":"97308001","name":"Saint georges","provider":"Meteofrance","latitude":3.890667,"longitude":-51.804667},
        {"id":"97310009","name":"Montagne-de-kaw","provider":"Meteofrance","latitude":4.549333,"longitude":-52.172833},
        {"id":"97311001","name":"Saint laurent","provider":"Meteofrance","latitude":5.4855,"longitude":-54.031667},
        {"id":"97353001","name":"Maripasoula","provider":"Meteofrance","latitude":3.640167,"longitude":-54.028333},
        {"id":"97402240","name":"Bellevue bras-panon","provider":"Meteofrance","latitude":-21.005,"longitude":55.622667},
        {"id":"97404540","name":"Pont-mathurin","provider":"Meteofrance","latitude":-21.265,"longitude":55.38},
        {"id":"97406220","name":"Plaine des palmistes","provider":"Meteofrance","latitude":-21.136167,"longitude":55.627167},
        {"id":"97407520","name":"Le port","provider":"Meteofrance","latitude":-20.946167,"longitude":55.282},
        {"id":"97410238","name":"Saint-benoit","provider":"Meteofrance","latitude":-21.058833,"longitude":55.719333},
        {"id":"97413520","name":"Colimacons","provider":"Meteofrance","latitude":-21.130333,"longitude":55.304667},
        {"id":"97415536","name":"Petite-france","provider":"Meteofrance","latitude":-21.045,"longitude":55.342},
        {"id":"97415566","name":"Piton-maido","provider":"Meteofrance","latitude":-21.076667,"longitude":55.381167},
        {"id":"97415590","name":"Pointe des trois-bassins","provider":"Meteofrance","latitude":-21.105167,"longitude":55.247667},
        {"id":"97416463","name":"Pierrefonds-aeroport","provider":"Meteofrance","latitude":-21.32,"longitude":55.4255},
        {"id":"97417360","name":"Le baril","provider":"Meteofrance","latitude":-21.359,"longitude":55.732167},
        {"id":"97418110","name":"Gillot-aeroport","provider":"Meteofrance","latitude":-20.892167,"longitude":55.528667},
        {"id":"97419350","name":"Gros piton sainte-rose","provider":"Meteofrance","latitude":-21.1795,"longitude":55.828833},
        {"id":"97419380","name":"Bellecombe-jacob","provider":"Meteofrance","latitude":-21.217833,"longitude":55.687},
        {"id":"97422440","name":"Plaine des cafres","provider":"Meteofrance","latitude":-21.209167,"longitude":55.572833},
        {"id":"97424410","name":"Cilaos","provider":"Meteofrance","latitude":-21.134167,"longitude":55.471667},
        {"id":"97502001","name":"St-pierre","provider":"Meteofrance","latitude":46.766333,"longitude":-56.179167},
        {"id":"98403001","name":"Glorieuses","provider":"Meteofrance","latitude":-11.582667,"longitude":47.289667},
        {"id":"98403002","name":"Juan de nova","provider":"Meteofrance","latitude":-17.054667,"longitude":42.712},
        {"id":"98403003","name":"Europa","provider":"Meteofrance","latitude":-22.344167,"longitude":40.340667},
        {"id":"98403004","name":"Tromelin","provider":"Meteofrance","latitude":-15.887667,"longitude":54.520667},
        {"id":"98404001","name":"Kerguelen","provider":"Meteofrance","latitude":-49.352333,"longitude":70.243333},
        {"id":"98404002","name":"Nouvelle amsterdam","provider":"Meteofrance","latitude":-37.795167,"longitude":77.569167},
        {"id":"98404003","name":"Dumont d'urville","provider":"Meteofrance","latitude":-66.663167,"longitude":140.001},
        {"id":"98404004","name":"Crozet","provider":"Meteofrance","latitude":-46.4325,"longitude":51.856667},
        {"id":"98508001","name":"Pamandzi","provider":"Meteofrance","latitude":-12.8055,"longitude":45.282833},
        {"id":"98510002","name":"Trevani","provider":"Meteofrance","latitude":-12.7295,"longitude":45.1925},
        {"id":"98514001","name":"Coconi ouangani","provider":"Meteofrance","latitude":-12.831,"longitude":45.132667},
        {"id":"98611001","name":"Maopoopo","provider":"Meteofrance","latitude":-14.307833,"longitude":-178.121},
        {"id":"98613001","name":"Hihifo","provider":"Meteofrance","latitude":-13.239833,"longitude":-176.194167},
        {"id":"98711002","name":"Anaa1","provider":"Meteofrance","latitude":-17.357,"longitude":-145.508333},
        {"id":"98712001","name":"Tetiaroa 1","provider":"Meteofrance","latitude":-17.014333,"longitude":-149.5855},
        {"id":"98714002","name":"Bora-bora-motu-aero","provider":"Meteofrance","latitude":-16.445167,"longitude":-151.752},
        {"id":"98715002","name":"Faaa","provider":"Meteofrance","latitude":-17.555167,"longitude":-149.614333},
        {"id":"98719005","name":"Mangareva","provider":"Meteofrance","latitude":-23.130167,"longitude":-134.965333},
        {"id":"98720002","name":"Hao aero","provider":"Meteofrance","latitude":-18.063,"longitude":-140.961167},
        {"id":"98722026","name":"Hitiaa 5","provider":"Meteofrance","latitude":-17.601333,"longitude":-149.301833},
        {"id":"98723001","name":"Hiva-oa","provider":"Meteofrance","latitude":-9.806,"longitude":-139.035667},
        {"id":"98725008","name":"Mahina 8","provider":"Meteofrance","latitude":-17.506167,"longitude":-149.483333},
        {"id":"98729015","name":"Haapiti5","provider":"Meteofrance","latitude":-17.533,"longitude":-149.900167},
        {"id":"98734007","name":"Papara 7","provider":"Meteofrance","latitude":-17.774833,"longitude":-149.460833},
        {"id":"98734009","name":"Papara 8","provider":"Meteofrance","latitude":-17.7485,"longitude":-149.5625},
        {"id":"98741001","name":"Rapa","provider":"Meteofrance","latitude":-27.618333,"longitude":-144.334833},
        {"id":"98743003","name":"Moorere","provider":"Meteofrance","latitude":-22.638,"longitude":-152.8045},
        {"id":"98747011","name":"Taiarapu-est","provider":"Meteofrance","latitude":-17.745667,"longitude":-149.158833},
        {"id":"98747016","name":"Afaahiti 7","provider":"Meteofrance","latitude":-17.749,"longitude":-149.292},
        {"id":"98748001","name":"Vairao 1","provider":"Meteofrance","latitude":-17.8055,"longitude":-149.293167},
        {"id":"98748012","name":"Teahupoo","provider":"Meteofrance","latitude":-17.859333,"longitude":-149.246667},
        {"id":"98749001","name":"Takaroa","provider":"Meteofrance","latitude":-14.456833,"longitude":-145.025167},
        {"id":"98755002","name":"Moruroa","provider":"Meteofrance","latitude":-21.8105,"longitude":-138.822833},
        {"id":"98812001","name":"Koumac","provider":"Meteofrance","latitude":-20.558667,"longitude":164.284167},
        {"id":"98814001","name":"Ouanaham","provider":"Meteofrance","latitude":-20.777667,"longitude":167.241167},
        {"id":"98818001","name":"Noumea","provider":"Meteofrance","latitude":-22.276,"longitude":166.452833},
        {"id":"98818201","name":"Surprise","provider":"Meteofrance","latitude":-18.48,"longitude":163.086333},
        {"id":"98818202","name":"Chesterfield","provider":"Meteofrance","latitude":-19.968333,"longitude":158.4755},
        {"id":"98821001","name":"La tontouta","provider":"Meteofrance","latitude":-22.017333,"longitude":166.222333}
    ];

const ESTACIONES_PIOUPIOU = 
    [
        {"id":"41","name":"Sauveterre","provider":"Pioupiou","latitude":43.456835,"longitude":0.846405},
        {"id":"70","name":"Déco Téléphérique Salève 1086m","provider":"Pioupiou","latitude":46.152982,"longitude":6.19053},
        {"id":"72","name":"Ausseing","provider":"Pioupiou","latitude":43.160785,"longitude":1.025306},
        {"id":"74","name":"Aérodrome de Bagnères-de-Luchon","provider":"Pioupiou","latitude":42.799538,"longitude":0.599368},
        {"id":"84","name":"PP84 JokAir Parapente","provider":"Pioupiou","latitude":43.980543,"longitude":5.562144},
        {"id":"89","name":"Les Plaines du POËT-LAVAL","provider":"Pioupiou","latitude":44.557737,"longitude":5.021946},
        {"id":"97","name":"Pioupiou YCR","provider":"Pioupiou","latitude":45.884836,"longitude":4.812041},
        {"id":"104","name":"Attéro Club CVLG Troinex","provider":"Pioupiou","latitude":46.160731,"longitude":6.156397},
        {"id":"106","name":"AGProcess","provider":"Pioupiou","latitude":45.36859,"longitude":5.969899},
        {"id":"107","name":"Charézier Sud Sud-Ouest","provider":"Pioupiou","latitude":46.619472,"longitude":5.731587},
        {"id":"111","name":"Aterro Voreppe","provider":"Pioupiou","latitude":45.273489,"longitude":5.640788},
        {"id":"115","name":"Balise du Collet 779m","provider":"Pioupiou","latitude":43.849713,"longitude":5.711428},
        {"id":"123","name":"Pioupiou 123","provider":"Pioupiou","latitude":43.5197,"longitude":5.570878},
        {"id":"124","name":"Balise","provider":"Pioupiou","latitude":45.120845,"longitude":5.592345},
        {"id":"127","name":"Pente Ecole de Châteaudouble","provider":"Pioupiou","latitude":44.887351,"longitude":5.067701},
        {"id":"131","name":"Ginoles","provider":"Pioupiou","latitude":42.87599,"longitude":2.151922},
        {"id":"134","name":"Site de Port","provider":"Pioupiou","latitude":46.159058,"longitude":5.574124},
        {"id":"135","name":"Le Petit Aréa / Granon","provider":"Pioupiou","latitude":44.963963,"longitude":6.576204},
        {"id":"139","name":"Atterrissage CAMPAN (65)","provider":"Pioupiou","latitude":43.021649,"longitude":0.172492},
        {"id":"143","name":"Balise Neuvic sur Isle","provider":"Pioupiou","latitude":45.091215,"longitude":0.480175},
        {"id":"151","name":"Monte Cecu Antennes","provider":"Pioupiou","latitude":42.328088,"longitude":9.157632},
        {"id":"157","name":"Grou de Bane","provider":"Pioupiou","latitude":44.050524,"longitude":5.635458},
        {"id":"158","name":"Pioupiou des Embruscalles","provider":"Pioupiou","latitude":43.875382,"longitude":3.88568},
        {"id":"159","name":"Déco Montendry 1282 m","provider":"Pioupiou","latitude":45.529446,"longitude":6.253049},
        {"id":"163","name":"Plate-forme Ballon privée","provider":"Pioupiou","latitude":44.536416,"longitude":6.356235},
        {"id":"165","name":"Pannessieres (Ouest Sud-Ouest) 508m","provider":"Pioupiou","latitude":46.70546,"longitude":5.603166},
        {"id":"168","name":"SOLAURE 1240m","provider":"Pioupiou","latitude":44.691471,"longitude":5.354142},
        {"id":"170","name":"Allevard 1550m","provider":"Pioupiou","latitude":45.39231,"longitude":6.115008},
        {"id":"172","name":"Déco Poizat-Lalleyriat 1163m","provider":"Pioupiou","latitude":46.142311,"longitude":5.705249},
        {"id":"175","name":"Col de la Core","provider":"Pioupiou","latitude":42.973408,"longitude":1.152468},
        {"id":"192","name":"Aérodrome Issoire 378m","provider":"Pioupiou","latitude":45.51419,"longitude":3.268143},
        {"id":"195","name":"Décollage SO de Planoise","provider":"Pioupiou","latitude":47.204704,"longitude":5.977825},
        {"id":"199","name":"Pioupiou 199","provider":"Pioupiou","latitude":47.25007,"longitude":6.743459},
        {"id":"213","name":"Atterrissage de Lepigny","provider":"Pioupiou","latitude":45.919017,"longitude":6.647937},
        {"id":"220","name":"ADVENTURE COTE BASQUE PARAMOTEUR","provider":"Pioupiou","latitude":43.339576,"longitude":-1.531739},
        {"id":"225","name":"Site de \"la Vierge\" à Varanges","provider":"Pioupiou","latitude":46.460185,"longitude":4.717221},
        {"id":"235","name":"Déco de Parves 593m","provider":"Pioupiou","latitude":45.739159,"longitude":5.727979},
        {"id":"245","name":"Balise HS","provider":"Pioupiou","latitude":44.53364,"longitude":2.249549},
        {"id":"249","name":"Guzet","provider":"Pioupiou","latitude":42.810615,"longitude":1.391555},
        {"id":"251","name":"Pioupiou 251","provider":"Pioupiou","latitude":43.081402,"longitude":5.909488},
        {"id":"253","name":"Chaudefonds sur Layon","provider":"Pioupiou","latitude":47.322682,"longitude":-0.717336},
        {"id":"260","name":"Décollage de Couraduque","provider":"Pioupiou","latitude":42.990715,"longitude":-0.196248},
        {"id":"262","name":"Petit Cabaliros","provider":"Pioupiou","latitude":42.96708,"longitude":-0.118994},
        {"id":"280","name":"Pioupiou 280","provider":"Pioupiou","latitude":47.543612,"longitude":5.211506},
        {"id":"295","name":"Pioupiou 295","provider":"Pioupiou","latitude":48.332054,"longitude":-1.687379},
        {"id":"307","name":"Pioupiou 307","provider":"Pioupiou","latitude":46.45071,"longitude":-1.5819},
        {"id":"309","name":"Décollage des Crêts","provider":"Pioupiou","latitude":46.129875,"longitude":6.171282},
        {"id":"313","name":"Cornudère (Arbas)","provider":"Pioupiou","latitude":42.957914,"longitude":0.890442},
        {"id":"320","name":"Décollage du Kiosque","provider":"Pioupiou","latitude":48.27039,"longitude":6.928862},
        {"id":"324","name":"Cabane de l'Escalette","provider":"Pioupiou","latitude":42.924178,"longitude":0.749825},
        {"id":"325","name":"Pouy de Géry.","provider":"Pioupiou","latitude":42.919877,"longitude":0.667544},
        {"id":"326","name":"Pioupiou 326","provider":"Pioupiou","latitude":45.750163,"longitude":6.32093},
        {"id":"327","name":"Port de Lers - Kymaya parapente","provider":"Pioupiou","latitude":42.812304,"longitude":1.393097},
        {"id":"332","name":"Létra","provider":"Pioupiou","latitude":45.956245,"longitude":4.490492},
        {"id":"348","name":"Métabief deco Ouest - Pioupiou 348","provider":"Pioupiou","latitude":46.750202,"longitude":6.344047},
        {"id":"353","name":"Courchevel Col de la Loze 2300m","provider":"Pioupiou","latitude":45.407589,"longitude":6.602},
        {"id":"360","name":"ACUM Meyrargues (Pioupiou 360)","provider":"Pioupiou","latitude":43.66069,"longitude":5.6868},
        {"id":"364","name":"Pioupiou 364","provider":"Pioupiou","latitude":45.070716,"longitude":4.95972},
        {"id":"365","name":"Salève Grotte du Diable","provider":"Pioupiou","latitude":46.088502,"longitude":6.134495},
        {"id":"366","name":"MONTAUDON","provider":"Pioupiou","latitude":46.44534,"longitude":4.62921},
        {"id":"367","name":"La Croix de Gueret (Site d'Arbas)","provider":"Pioupiou","latitude":42.961111,"longitude":0.914499},
        {"id":"369","name":"Lans en Vercors Les Françons","provider":"Pioupiou","latitude":45.106719,"longitude":5.576781},
        {"id":"371","name":"Tour Matagrin, 42 Violay","provider":"Pioupiou","latitude":45.850448,"longitude":4.37552},
        {"id":"372","name":"Balise du Kemberg","provider":"Pioupiou","latitude":48.256381,"longitude":6.93185},
        {"id":"373","name":"Déco Courchon 910m","provider":"Pioupiou","latitude":43.845438,"longitude":6.229165},
        {"id":"374","name":"BOURGOGNE-MONTGOLFIERE GIVRY","provider":"Pioupiou","latitude":46.760583,"longitude":4.718731},
        {"id":"375","name":"Puget Ville #375","provider":"Pioupiou","latitude":43.291958,"longitude":6.12804},
        {"id":"384","name":"Décollage Sud CUGES LES PINS","provider":"Pioupiou","latitude":43.271881,"longitude":5.668239},
        {"id":"385","name":"Deco Cessenon-sur-Orb","provider":"Pioupiou","latitude":43.446369,"longitude":3.038423},
        {"id":"391","name":"Aéromodélisme SAUMUR","provider":"Pioupiou","latitude":47.260973,"longitude":-0.113735},
        {"id":"395","name":"Chabanet","provider":"Pioupiou","latitude":44.738167,"longitude":4.566302},
        {"id":"410","name":"PIAM Pioupiou 410","provider":"Pioupiou","latitude":47.360597,"longitude":-2.48633},
        {"id":"424","name":"Aérodrome de Romans St-Paul LFHE (424)","provider":"Pioupiou","latitude":45.062365,"longitude":5.098899},
        {"id":"449","name":"Lévanchy 1423m","provider":"Pioupiou","latitude":46.544211,"longitude":7.113106},
        {"id":"459","name":"Groupe Aéromodelisme Geneve","provider":"Pioupiou","latitude":46.156281,"longitude":6.018673},
        {"id":"463","name":"Modèle Air Club de l'Hérault","provider":"Pioupiou","latitude":43.538076,"longitude":3.885862},
        {"id":"465","name":"Pioupiou Bellegardais","provider":"Pioupiou","latitude":43.73428,"longitude":4.531776},
        {"id":"488","name":"Le Piardel Plaisance Est","provider":"Pioupiou","latitude":44.04574,"longitude":2.144793},
        {"id":"497","name":"Pioupiou 497","provider":"Pioupiou","latitude":44.549288,"longitude":4.3224},
        {"id":"503","name":"Aérodrome de Vinon LFNF","provider":"Pioupiou","latitude":43.736672,"longitude":5.786854},
        {"id":"521","name":"Prarion 1865m","provider":"Pioupiou","latitude":45.884473,"longitude":6.748247},
        {"id":"524","name":"Pioupiou 524","provider":"Pioupiou","latitude":45.391872,"longitude":5.289135},
        {"id":"525","name":"Vic sur Cere 525","provider":"Pioupiou","latitude":44.980624,"longitude":2.659182},
        {"id":"532","name":"Aérodrome de Bellegarde-Vouvray","provider":"Pioupiou","latitude":46.12358,"longitude":5.805649},
        {"id":"540","name":"Déco St Sorlin en Bugey","provider":"Pioupiou","latitude":45.880072,"longitude":5.398645},
        {"id":"544","name":"MCPB Aéromodélisme","provider":"Pioupiou","latitude":46.110948,"longitude":5.854388},
        {"id":"546","name":"Balise mobile Bel-Air","provider":"Pioupiou","latitude":47.05329,"longitude":4.732107},
        {"id":"549","name":"BAC Castries 120/300","provider":"Pioupiou","latitude":43.682448,"longitude":4.009658},
        {"id":"554","name":"Décollage de la batie neuve","provider":"Pioupiou","latitude":44.58334,"longitude":6.235335},
        {"id":"563","name":"Montcusel","provider":"Pioupiou","latitude":46.339297,"longitude":5.658982},
        {"id":"574","name":"St Laurent la Roche (N-NO) 470m","provider":"Pioupiou","latitude":46.589709,"longitude":5.509502},
        {"id":"575","name":"Décollage POLIGNY Nord/Nord-Ouest","provider":"Pioupiou","latitude":46.827215,"longitude":5.705215},
        {"id":"582","name":"Bande 825m","provider":"Pioupiou","latitude":45.470024,"longitude":5.771283},
        {"id":"591","name":"Besançon NE","provider":"Pioupiou","latitude":47.208322,"longitude":5.984104},
        {"id":"593","name":"LFMX","provider":"Pioupiou","latitude":44.061204,"longitude":5.995183},
        {"id":"597","name":"UNCA club nautique","provider":"Pioupiou","latitude":45.904135,"longitude":6.150885},
        {"id":"600","name":"Lac de Maine","provider":"Pioupiou","latitude":47.459011,"longitude":-0.59228},
        {"id":"601","name":"Rustrel Grand Montagne 930m","provider":"Pioupiou","latitude":43.945964,"longitude":5.479037},
        {"id":"603","name":"Bilbao – Artxanda (Santo Domingo)","provider":"Pioupiou","latitude":43.274,"longitude":-2.912},
        {"id":"633","name":"Déco du Mollaret 1425m","provider":"Pioupiou","latitude":45.395316,"longitude":6.311903},
        {"id":"634","name":"Sommet Télésiège Tète de Bellard 2225m","provider":"Pioupiou","latitude":45.256218,"longitude":6.23135},
        {"id":"635","name":"Base ULM Lavours LF0125 (Next Model RC)","provider":"Pioupiou","latitude":45.795367,"longitude":5.772848},
        {"id":"636","name":"Terrain d'Aéromodélisme Vol-Libre","provider":"Pioupiou","latitude":45.387292,"longitude":5.975314},
        {"id":"641","name":"Peyrieu","provider":"Pioupiou","latitude":45.668127,"longitude":5.684687},
        {"id":"805","name":"Balise Nord-Ouest","provider":"Pioupiou","latitude":46.969167,"longitude":5.875833},
        {"id":"808","name":"KENNEDY","provider":"Pioupiou","latitude":43.704071,"longitude":6.980954},
        {"id":"810","name":"La Vesancière","provider":"Pioupiou","latitude":46.368145,"longitude":6.080156},
        {"id":"811","name":"Déco de Salvi","provider":"Pioupiou","latitude":42.55297,"longitude":8.86441},
        {"id":"813","name":"Décollage TETON","provider":"Pioupiou","latitude":45.370829,"longitude":6.48133},
        {"id":"814","name":"CLUB AÉROMODÉLISME M.A.C.B","provider":"Pioupiou","latitude":45.949713,"longitude":4.603913},
        {"id":"815","name":"Le Graveyron","provider":"Pioupiou","latitude":44.132484,"longitude":5.075991},
        {"id":"816","name":"Mont Mourex","provider":"Pioupiou","latitude":46.340997,"longitude":6.105345},
        {"id":"817","name":"Refuge du col de Balme","provider":"Pioupiou","latitude":46.02669,"longitude":6.97005},
        {"id":"818","name":"Déco de Soult","provider":"Pioupiou","latitude":44.89749,"longitude":1.65708},
        {"id":"819","name":"Chambran 1720 m","provider":"Pioupiou","latitude":44.903591,"longitude":6.492975},
        {"id":"820","name":"Décollage Boismint (plan de l'eau)","provider":"Pioupiou","latitude":45.293294,"longitude":6.550168},
        {"id":"822","name":"Tanargue Col de Meyrand Valgorge","provider":"Pioupiou","latitude":44.619713,"longitude":4.079893},
        {"id":"824","name":"Lac Sarget","provider":"Pioupiou","latitude":46.527698,"longitude":0.17162},
        {"id":"826","name":"Point de Vue - 1610m","provider":"Pioupiou","latitude":44.401798,"longitude":6.66707},
        {"id":"827","name":"Soleille Boeuf - 2214m","provider":"Pioupiou","latitude":44.419501,"longitude":6.651127},
        {"id":"828","name":"Côte de Jor 222m","provider":"Pioupiou","latitude":45.017214,"longitude":1.070796},
        {"id":"829","name":"ACO Cernay","provider":"Pioupiou","latitude":47.8112,"longitude":7.201219},
        {"id":"830","name":"La Normandelière","provider":"Pioupiou","latitude":46.613685,"longitude":-1.861318},
        {"id":"831","name":"Col de Tende","provider":"Pioupiou","latitude":44.151276,"longitude":7.570627},
        {"id":"832","name":"Décollage de Baulme-la-Roche","provider":"Pioupiou","latitude":47.35015,"longitude":4.800172},
        {"id":"834","name":"Décollage de Varan 1630m","provider":"Pioupiou","latitude":45.94472,"longitude":6.68227},
        {"id":"835","name":"Atterro Aussois 1506m","provider":"Pioupiou","latitude":45.234566,"longitude":6.742849},
        {"id":"836","name":"LESCHES EN DIOIS / Montagne du Puy","provider":"Pioupiou","latitude":44.609147,"longitude":5.542828},
        {"id":"839","name":"MeteoWind 839","provider":"Pioupiou","latitude":46.259055,"longitude":6.022933},
        {"id":"840","name":"Balise de la Roche de Minuit","provider":"Pioupiou","latitude":47.987917,"longitude":6.857449},
        {"id":"841","name":"PULSS Pouancay ULM","provider":"Pioupiou","latitude":47.096935,"longitude":-0.074815},
        {"id":"843","name":"Club aéromodélisme MACB de Reyrieux","provider":"Pioupiou","latitude":45.931604,"longitude":4.844522},
        {"id":"844","name":"Aérodrome de Pierrelatte LFHD","provider":"Pioupiou","latitude":44.39527,"longitude":4.719463},
        {"id":"901","name":"Le Menil-Tête des Renards 875m","provider":"Pioupiou","latitude":47.902736,"longitude":6.80457},
        {"id":"903","name":"Cachette","provider":"Pioupiou","latitude":45.58256,"longitude":6.80524},
        {"id":"922","name":"Col du Pt St Bernard","provider":"Pioupiou","latitude":45.6715,"longitude":6.87545},
        {"id":"924","name":"AERO MODEL CLUB CEVENOL","provider":"Pioupiou","latitude":43.977968,"longitude":4.067024},
        {"id":"925","name":"Le Grizzly","provider":"Pioupiou","latitude":45.547967,"longitude":6.792031},
        {"id":"926","name":"Balise de Test","provider":"Pioupiou","latitude":43.066349,"longitude":0.897572},
        {"id":"927","name":"Site de Rachas","provider":"Pioupiou","latitude":44.502498,"longitude":5.008523},
        {"id":"928","name":"Dourgne St Stapin","provider":"Pioupiou","latitude":43.475653,"longitude":2.142996},
        {"id":"931","name":"Le Cheynet","provider":"Pioupiou","latitude":44.6908,"longitude":4.61028},
        {"id":"935","name":"Atterrissage d'Argeliers 50m Aude","provider":"Pioupiou","latitude":43.313294,"longitude":2.892609},
        {"id":"939","name":"Camurac déco La Serre de Montcamp","provider":"Pioupiou","latitude":42.7835,"longitude":1.94475},
        {"id":"940","name":"Pic de Pénédis 1808m","provider":"Pioupiou","latitude":42.770203,"longitude":1.913362},
        {"id":"942","name":"Base Ulm TREIGNY ","provider":"Pioupiou","latitude":47.55083,"longitude":3.19635},
        {"id":"946","name":"PEGASE","provider":"Pioupiou","latitude":43.677507,"longitude":3.894083},
        {"id":"950","name":"Arduino 950","provider":"Pioupiou","latitude":44.073549,"longitude":6.425237},
        {"id":"952","name":"Piste d'Aéromodélisme Chapareillan","provider":"Pioupiou","latitude":45.46437,"longitude":5.999878},
        {"id":"953","name":"Villars-Fontaine","provider":"Pioupiou","latitude":47.149706,"longitude":4.898069},
        {"id":"957","name":"Eolis","provider":"Pioupiou","latitude":37.1368,"longitude":-7.58359},
        {"id":"962","name":"Mont Dardon à Uxeau 488m","provider":"Pioupiou","latitude":46.67712,"longitude":4.03675},
        {"id":"968","name":"Le Cottier","provider":"Pioupiou","latitude":45.63364,"longitude":6.79583},
        {"id":"969","name":"L'Arpette Les Arcs 2500m","provider":"Pioupiou","latitude":45.57212,"longitude":6.81138},
        {"id":"970","name":"COTE ROUGE","provider":"Pioupiou","latitude":47.669422,"longitude":6.251308},
        {"id":"975","name":"Cirque du Bout du Monde 680m","provider":"Pioupiou","latitude":43.787778,"longitude":3.373889},
        {"id":"981","name":"Decollo Nord-Est (Scafa Pe)","provider":"Pioupiou","latitude":42.236404,"longitude":14.001361},
        {"id":"982","name":"Azur Flying Club 06","provider":"Pioupiou","latitude":43.823176,"longitude":7.182426},
        {"id":"984","name":"Charvet","provider":"Pioupiou","latitude":44.050219,"longitude":6.458405},
        {"id":"985","name":"Schneckenkopf","provider":"Pioupiou","latitude":47.770453,"longitude":7.909158},
        {"id":"986","name":"CAAP64","provider":"Pioupiou","latitude":43.23315,"longitude":-0.10456},
        {"id":"987","name":"Pic des Rives Belcaire","provider":"Pioupiou","latitude":42.816427,"longitude":1.924289},
        {"id":"991","name":"Parking du Meix Musy","provider":"Pioupiou","latitude":47.039137,"longitude":6.668816},
        {"id":"999","name":"Lautrec. Club Rev'aile","provider":"Pioupiou","latitude":43.711241,"longitude":2.141455},
        {"id":"1006","name":"Pioupiou 1006","provider":"Pioupiou","latitude":44.390413,"longitude":0.823},
        {"id":"1007","name":"Plaine d'Autrans","provider":"Pioupiou","latitude":45.17321,"longitude":5.533406},
        {"id":"1012","name":"Pioupiou 1012","provider":"Pioupiou","latitude":44.514908,"longitude":3.463418},
        {"id":"1029","name":"Schnepfenried","provider":"Pioupiou","latitude":47.978547,"longitude":7.043154},
        {"id":"1202","name":"San Bastianu 670m","provider":"Pioupiou","latitude":42.0211,"longitude":8.755},
        {"id":"1207","name":"Atterrissage des prés gelés 545m","provider":"Pioupiou","latitude":46.13993,"longitude":5.82444},
        {"id":"1209","name":"Décollage NO de Montfaucon","provider":"Pioupiou","latitude":47.248158,"longitude":6.087281},
        {"id":"1211","name":"Campé - Breil-sur Roya","provider":"Pioupiou","latitude":43.947778,"longitude":7.501389},
        {"id":"1212","name":"Cagnourine - Tende 06430","provider":"Pioupiou","latitude":44.097008,"longitude":7.59647},
        {"id":"1213","name":"Cier","provider":"Pioupiou","latitude":43.058283,"longitude":0.613793},
        {"id":"1214","name":"Lannemezan","provider":"Pioupiou","latitude":43.146363,"longitude":0.376867},
        {"id":"1215","name":"Déco de Catray 1072m","provider":"Pioupiou","latitude":46.110588,"longitude":5.75667},
        {"id":"1216","name":"Déco Apremont 1030m","provider":"Pioupiou","latitude":46.1997,"longitude":5.6668},
        {"id":"1217","name":"AAM","provider":"Pioupiou","latitude":43.521759,"longitude":6.897507},
        {"id":"1218","name":"MAC Cannes","provider":"Pioupiou","latitude":43.751606,"longitude":6.927499},
        {"id":"1220","name":"Déco de Champfromier 1200m","provider":"Pioupiou","latitude":46.21469,"longitude":5.81464},
        {"id":"1221","name":"Sorgia Déco de la Charmante 1300m","provider":"Pioupiou","latitude":46.1382,"longitude":5.85555},
        {"id":"1222","name":"Atterrissage de Villes 576m","provider":"Pioupiou","latitude":46.0906,"longitude":5.77881},
        {"id":"1223","name":"Déco le Bouant 1030m","provider":"Pioupiou","latitude":46.16134,"longitude":5.8384},
        {"id":"1225","name":"PUIVERT LFNW","provider":"Pioupiou","latitude":42.912225,"longitude":2.053321},
        {"id":"1230","name":"Ju's Palace","provider":"Pioupiou","latitude":46.611266,"longitude":7.095923},
        {"id":"1231","name":"Balise custom 1231","provider":"Pioupiou","latitude":45.1043,"longitude":1.5181},
        {"id":"1232","name":"Balise custom 1232","provider":"Pioupiou","latitude":43.35614,"longitude":1.62392},
        {"id":"1237","name":"La Mauricette","provider":"Pioupiou","latitude":47.226867,"longitude":6.023075},
        {"id":"1238","name":"Balise AIRMES 1238","provider":"Pioupiou","latitude":46.181595,"longitude":5.685393},
        {"id":"1240","name":"Balise de Test plage des Aresquiers - Etang d'Ingr…","provider":"Pioupiou","latitude":43.44023,"longitude":3.7936},
        {"id":"1301","name":"Finistère Bretagne","provider":"Pioupiou","latitude":47.973519,"longitude":-4.406202},
        {"id":"1304","name":"Startplatz Kreuzjoch 1890 m","provider":"Pioupiou","latitude":47.452462,"longitude":11.079692},
        {"id":"1307","name":"AVC Coulet","provider":"Pioupiou","latitude":46.468856,"longitude":6.448071},
        {"id":"1308","name":"Cucugnan Château de QUERIBUS 575m","provider":"Pioupiou","latitude":42.84653,"longitude":2.624054},
        {"id":"1311","name":"Soncourt sur Marne","provider":"Pioupiou","latitude":48.25564,"longitude":5.101554},
        {"id":"1312","name":"Pian Munè 1890m","provider":"Pioupiou","latitude":44.639215,"longitude":7.230763},
        {"id":"1314","name":"Zumholz","provider":"Pioupiou","latitude":46.754822,"longitude":7.288728},
        {"id":"1316","name":"Ballon d'Alsace 1150m","provider":"Pioupiou","latitude":47.816413,"longitude":6.842924},
        {"id":"1319","name":"Decollo GAS","provider":"Pioupiou","latitude":47.57411,"longitude":10.637184},
        {"id":"1321","name":"Decollo GAS","provider":"Pioupiou","latitude":45.612159,"longitude":10.747557},
        {"id":"1322","name":"Decollo Santa Maria in Calanca 1218m","provider":"Pioupiou","latitude":46.26732,"longitude":9.137532},
        {"id":"1323","name":"Windbird 1323","provider":"Pioupiou","latitude":46.615154,"longitude":5.902481},
        {"id":"1325","name":"Landeplatz Oetz","provider":"Pioupiou","latitude":47.204005,"longitude":10.89077},
        {"id":"1327","name":"Decollo Macchialunga - Colfiorito","provider":"Pioupiou","latitude":43.045668,"longitude":12.946686},
        {"id":"1328","name":"Décollage Nord de Vieilley","provider":"Pioupiou","latitude":47.325272,"longitude":6.090385},
        {"id":"1330","name":"Windbird 1330","provider":"Pioupiou","latitude":45.787784,"longitude":11.635641},
        {"id":"1332","name":"Windbird 1332","provider":"Pioupiou","latitude":42.969416,"longitude":-0.002884},
        {"id":"1335","name":"L' Ormont Icare Club","provider":"Pioupiou","latitude":48.304251,"longitude":6.996026},
        {"id":"1337","name":"Aérodrome de Cessieu-La Tour du Pin","provider":"Pioupiou","latitude":45.558165,"longitude":5.386123},
        {"id":"1338","name":"Décollage de Balvay 600m","provider":"Pioupiou","latitude":46.182634,"longitude":5.464885},
        {"id":"1339","name":"Startplatz Rebberg","provider":"Pioupiou","latitude":47.76917,"longitude":8.968152},
        {"id":"1342","name":"La Chia (Pâquier)","provider":"Pioupiou","latitude":46.585821,"longitude":7.019196},
        {"id":"1343","name":"Nendaz, Tracouet","provider":"Pioupiou","latitude":46.161666,"longitude":7.28343},
        {"id":"1344","name":"Nendaz Verrey","provider":"Pioupiou","latitude":46.187414,"longitude":7.346363},
        {"id":"1345","name":"Poupet La Côte NNE 2","provider":"Pioupiou","latitude":46.94253,"longitude":5.844324},
        {"id":"1346","name":"Mont Bouquet Face Sud","provider":"Pioupiou","latitude":44.122047,"longitude":4.278814},
        {"id":"1347","name":"Bourg St Maurice ","provider":"Pioupiou","latitude":45.614856,"longitude":6.788261},
        {"id":"1349","name":"Port Bourgenay","provider":"Pioupiou","latitude":46.438951,"longitude":-1.679272},
        {"id":"1350","name":"Balise","provider":"Pioupiou","latitude":44.229966,"longitude":5.320627},
        {"id":"1351","name":"Decollo Rialto Ovest","provider":"Pioupiou","latitude":45.651091,"longitude":11.236953},
        {"id":"1352","name":"Oô - décollage du 600","provider":"Pioupiou","latitude":42.799894,"longitude":0.490578},
        {"id":"1353","name":"Déco de Fontblanche 1505m","provider":"Pioupiou","latitude":44.104404,"longitude":6.541943},
        {"id":"1354","name":"La Labière Camurac","provider":"Pioupiou","latitude":42.777684,"longitude":1.932835},
        {"id":"1355","name":"Pusteblume","provider":"Pioupiou","latitude":47.892016,"longitude":6.970231},
        {"id":"1356","name":"Stephane","provider":"Pioupiou","latitude":43.618852,"longitude":4.211936},
        {"id":"1357","name":"Roc de la Grenouille Belesta","provider":"Pioupiou","latitude":42.900318,"longitude":1.963814},
        {"id":"1359","name":"Decollo Felci","provider":"Pioupiou","latitude":45.506903,"longitude":7.809811},
        {"id":"1360","name":"Decollo Nord-Est Tocco da Casauria","provider":"Pioupiou","latitude":42.192627,"longitude":13.908188},
        {"id":"1361","name":"Windbird 1361","provider":"Pioupiou","latitude":46.292927,"longitude":6.499526},
        {"id":"1363","name":"Decollo TRUCETTI 980m","provider":"Pioupiou","latitude":45.076274,"longitude":7.347159},
        {"id":"1364","name":"Déco Ouest d'Échevannes","provider":"Pioupiou","latitude":47.067406,"longitude":6.23461},
        {"id":"1365","name":"Deco Gr Rochette La Plagne 2500m","provider":"Pioupiou","latitude":45.491252,"longitude":6.684186},
        {"id":"1366","name":"Mont Poupet Nord","provider":"Pioupiou","latitude":46.971935,"longitude":5.878009},
        {"id":"1371","name":"LES AILES VOLANTES BESSAN","provider":"Pioupiou","latitude":43.341304,"longitude":3.408269},
        {"id":"1372","name":"Deco Saint-Guiraud 257m","provider":"Pioupiou","latitude":43.684499,"longitude":3.448733},
        {"id":"1374","name":"Le Relais","provider":"Pioupiou","latitude":42.961105,"longitude":0.914546},
        {"id":"1375","name":"Les Pétis 1502m","provider":"Pioupiou","latitude":46.193963,"longitude":6.869589},
        {"id":"1376","name":"St Lary - Pla d'Adet 1600m","provider":"Pioupiou","latitude":42.813679,"longitude":0.301114},
        {"id":"1377","name":"Windbird 1377","provider":"Pioupiou","latitude":45.505157,"longitude":6.989158},
        {"id":"1378","name":"Col de la Merquiere","provider":"Pioupiou","latitude":43.649625,"longitude":3.229257},
        {"id":"1380","name":"Nendaz Plan-du-Fou","provider":"Pioupiou","latitude":46.142306,"longitude":7.295577},
        {"id":"1385","name":"Décollage SUD-OUEST CUGES LES PINS","provider":"Pioupiou","latitude":43.284602,"longitude":5.690504},
        {"id":"1386","name":"Aviosuperficie Vall'Ornara","provider":"Pioupiou","latitude":42.040612,"longitude":12.537915},
        {"id":"1387","name":"Windbird 1387","provider":"Pioupiou","latitude":43.309622,"longitude":-3.033508},
        {"id":"1388","name":"Décollage Serre Michèle","provider":"Pioupiou","latitude":44.581641,"longitude":6.280619},
        {"id":"1389","name":"Mairie de Bastia","provider":"Pioupiou","latitude":42.702339,"longitude":9.451866},
        {"id":"1391","name":"Kiental","provider":"Pioupiou","latitude":46.58106,"longitude":7.724701},
        {"id":"1393","name":"Otivar 900m","provider":"Pioupiou","latitude":36.83388,"longitude":-3.701555},
        {"id":"1394","name":"Oberrieden","provider":"Pioupiou","latitude":47.267381,"longitude":8.574758},
        {"id":"1396","name":"Moarbichl","provider":"Pioupiou","latitude":47.749932,"longitude":12.506421},
        {"id":"1398","name":"Föhn-Messstation St. Katrinabrunna","provider":"Pioupiou","latitude":47.058967,"longitude":9.51169},
        {"id":"1399","name":"Passage du Croc Sire 1405m","provider":"Pioupiou","latitude":45.636486,"longitude":5.962974},
        {"id":"1401","name":"Decollo Monte Rosato 1250m","provider":"Pioupiou","latitude":42.514701,"longitude":12.883048},
        {"id":"1403","name":"Monte Carpegna Decollo Sud","provider":"Pioupiou","latitude":43.800387,"longitude":12.333028},
        {"id":"1404","name":"Le Bété","provider":"Pioupiou","latitude":46.548422,"longitude":7.05828},
        {"id":"1406","name":"WindBird 1406","provider":"Pioupiou","latitude":44.003013,"longitude":2.143637},
        {"id":"1407","name":"Décollo Liretta Paradeltaclub Cuneo","provider":"Pioupiou","latitude":44.49916,"longitude":7.38197},
        {"id":"1411","name":"Balise piou piou d'Aubas","provider":"Pioupiou","latitude":45.088483,"longitude":1.215161},
        {"id":"1412","name":"Windbird 1412","provider":"Pioupiou","latitude":43.491501,"longitude":5.581915},
        {"id":"1413","name":"GlissEvolution - Port de Pornichet / La Baule","provider":"Pioupiou","latitude":47.255681,"longitude":-2.349868},
        {"id":"1414","name":"Les Ailes d'Alairac","provider":"Pioupiou","latitude":43.200827,"longitude":2.246488},
        {"id":"1416","name":"DECOLLO NORMA","provider":"Pioupiou","latitude":41.591948,"longitude":12.957706},
        {"id":"1417","name":"Soubeyrand WB","provider":"Pioupiou","latitude":44.377424,"longitude":5.335587},
        {"id":"1418","name":"Windbird 1418","provider":"Pioupiou","latitude":47.313082,"longitude":7.278543},
        {"id":"1419","name":"DECO NOVIS CDVL12","provider":"Pioupiou","latitude":44.257737,"longitude":3.117723},
        {"id":"1421","name":"San Gallo 345m","provider":"Pioupiou","latitude":45.917226,"longitude":12.149161},
        {"id":"1424","name":"G2 Sommet Lauzière","provider":"Pioupiou","latitude":45.444741,"longitude":6.363559},
        {"id":"1427","name":"Décollage Le Pré Bozel","provider":"Pioupiou","latitude":45.455993,"longitude":6.657357},
        {"id":"1428","name":"MALANOTTE 1740m","provider":"Pioupiou","latitude":44.259544,"longitude":7.79353},
        {"id":"1430","name":"Décollage NEY Nord/Nord-Est","provider":"Pioupiou","latitude":46.73226,"longitude":5.893564},
        {"id":"1432","name":"Kolbingen","provider":"Pioupiou","latitude":48.044082,"longitude":8.89385},
        {"id":"1433","name":"Takeoff Kanzelhöhe","provider":"Pioupiou","latitude":46.673881,"longitude":13.896225},
        {"id":"1435","name":"Les Carroz Dessus JBT","provider":"Pioupiou","latitude":45.69009,"longitude":6.558453},
        {"id":"1436","name":"Montclar - Plateau de La Chau","provider":"Pioupiou","latitude":44.40309,"longitude":6.371509},
        {"id":"1437","name":"LE RIOLS","provider":"Pioupiou","latitude":44.125751,"longitude":1.903189},
        {"id":"1439","name":"Urenkopf","provider":"Pioupiou","latitude":48.272334,"longitude":8.112195},
        {"id":"1441","name":"La Pierre Levée","provider":"Pioupiou","latitude":46.540682,"longitude":4.783316},
        {"id":"1443","name":"SUIN","provider":"Pioupiou","latitude":46.433852,"longitude":4.476179},
        {"id":"1444","name":"Terrain d'Aéromodélisme Maisons Pop de Chenôve","provider":"Pioupiou","latitude":47.299582,"longitude":4.974229},
        {"id":"1445","name":"LP Unterwasser","provider":"Pioupiou","latitude":47.194632,"longitude":9.306802},
        {"id":"1446","name":"Déco SAPENAY 901m","provider":"Pioupiou","latitude":45.822171,"longitude":5.866301},
        {"id":"1447","name":"Pélican","provider":"Pioupiou","latitude":43.398228,"longitude":3.033189},
        {"id":"1450","name":"Windbird 1450","provider":"Pioupiou","latitude":42.672592,"longitude":9.375838},
        {"id":"1452","name":"La rose des vents","provider":"Pioupiou","latitude":48.168708,"longitude":2.59695},
        {"id":"1453","name":"Aviano, Antenne 1088m","provider":"Pioupiou","latitude":46.087496,"longitude":12.530323},
        {"id":"1457","name":"Decollo San Simeone 1150m","provider":"Pioupiou","latitude":46.328668,"longitude":13.10352},
        {"id":"1458","name":"Mont Péjus","provider":"Pioupiou","latitude":46.595641,"longitude":4.639473},
        {"id":"1459","name":"LF2468","provider":"Pioupiou","latitude":45.001844,"longitude":0.908534},
        {"id":"1460","name":"Bergiès Séderon 1364m","provider":"Pioupiou","latitude":44.193737,"longitude":5.515513},
        {"id":"1461","name":"Burst","provider":"Pioupiou","latitude":47.209045,"longitude":9.3015},
        {"id":"1463","name":"Le Rissas/Beaumont du Ventoux","provider":"Pioupiou","latitude":44.19634,"longitude":5.159595},
        {"id":"1467","name":"Bruno's Airfield 8344","provider":"Pioupiou","latitude":47.328045,"longitude":8.865103},
        {"id":"1468","name":"Plomb du Cantal","provider":"Pioupiou","latitude":45.062489,"longitude":2.760683},
        {"id":"1469","name":"STARTPLATZ GREBER","provider":"Pioupiou","latitude":47.399243,"longitude":9.925831},
        {"id":"1470","name":"Crêt du Loup, La Clusaz","provider":"Pioupiou","latitude":45.89093,"longitude":6.451799},
        {"id":"1473","name":"Croix de Coeur","provider":"Pioupiou","latitude":46.121116,"longitude":7.234978},
        {"id":"1476","name":"Veyrier Club Nautique","provider":"Pioupiou","latitude":45.887713,"longitude":6.171992},
        {"id":"1477","name":"Loja - MCP Cerro Quemado","provider":"Pioupiou","latitude":37.132886,"longitude":-4.182785},
        {"id":"1478","name":"Windbird 1478","provider":"Pioupiou","latitude":43.28646,"longitude":3.451947},
        {"id":"1479","name":"Pointe de Pelluaz 1908m","provider":"Pioupiou","latitude":46.338522,"longitude":6.716846},
        {"id":"1481","name":"Peña Escrita 1250m","provider":"Pioupiou","latitude":36.817646,"longitude":-3.770115},
        {"id":"1482","name":"Cordon - Tête du Planet 1838m","provider":"Pioupiou","latitude":45.91286,"longitude":6.570772},
        {"id":"1483","name":"Décollage de Torcieu","provider":"Pioupiou","latitude":45.910893,"longitude":5.397408},
        {"id":"1484","name":"Mont Ventoux crête","provider":"Pioupiou","latitude":44.174077,"longitude":5.263667},
        {"id":"1488","name":"Windbird 1488","provider":"Pioupiou","latitude":44.502536,"longitude":3.41837},
        {"id":"1489","name":"Windbird 1489","provider":"Pioupiou","latitude":44.468194,"longitude":3.269212},
        {"id":"1490","name":"Club Aéromodélisme Cestas","provider":"Pioupiou","latitude":44.714284,"longitude":-0.716767},
        {"id":"1491","name":"Pénestin “La mine d'or","provider":"Pioupiou","latitude":47.482982,"longitude":-2.495511},
        {"id":"1494","name":"CMPG - Segny","provider":"Pioupiou","latitude":46.304596,"longitude":6.081476},
        {"id":"1495","name":"Déco Belvédère de Lans en Vercors","provider":"Pioupiou","latitude":45.089367,"longitude":5.593635},
        {"id":"1496","name":"Carretera A8 en el km 116 (EDBI)","provider":"Pioupiou","latitude":43.247384,"longitude":-2.936086},
        {"id":"1498","name":"Montagne de Croc 1303m","provider":"Pioupiou","latitude":44.257107,"longitude":5.466813},
        {"id":"1500","name":"Chur 80m AGL","provider":"Pioupiou","latitude":46.860846,"longitude":9.528152},
        {"id":"1503","name":"ParaAir Augsburg e.V.","provider":"Pioupiou","latitude":48.39668,"longitude":10.673268},
        {"id":"1505","name":"Roche de Vergisson","provider":"Pioupiou","latitude":46.313889,"longitude":4.716546},
        {"id":"1506","name":"Lac de Monteynard","provider":"Pioupiou","latitude":44.897221,"longitude":5.674833},
        {"id":"1507","name":"Embec","provider":"Pioupiou","latitude":45.161252,"longitude":2.771748},
        {"id":"1509","name":"Startplatz Foppa","provider":"Pioupiou","latitude":47.137319,"longitude":9.542684},
        {"id":"1510","name":"Hüttstett","provider":"Pioupiou","latitude":46.787958,"longitude":8.194713},
        {"id":"1511","name":"Saint Amand","provider":"Pioupiou","latitude":44.186823,"longitude":5.06943},
        {"id":"1512","name":"Métabief - Décollage Nord","provider":"Pioupiou","latitude":46.760618,"longitude":6.356869},
        {"id":"1514","name":"Kampenwand Hirschenstein 1453 m","provider":"Pioupiou","latitude":47.756137,"longitude":12.352744},
        {"id":"1515","name":"Windbird 1515","provider":"Pioupiou","latitude":43.304122,"longitude":-3.023464},
        {"id":"1517","name":"DECOLLO FORCA DI PRESTA 1587m","provider":"Pioupiou","latitude":42.78806,"longitude":13.25282},
        {"id":"1520","name":"Windbird 1520","provider":"Pioupiou","latitude":46.380133,"longitude":2.633669},
        {"id":"1521","name":"Windbird 1521","provider":"Pioupiou","latitude":43.178349,"longitude":-2.641181},
        {"id":"1525","name":"Sulit","provider":"Pioupiou","latitude":44.687047,"longitude":6.239927},
        {"id":"1526","name":"Garlaban 566m","provider":"Pioupiou","latitude":43.330951,"longitude":5.555333},
        {"id":"1527","name":"Chadenas Embrun","provider":"Pioupiou","latitude":44.545591,"longitude":6.458361},
        {"id":"1531","name":"Windbird 1531","provider":"Pioupiou","latitude":43.313242,"longitude":2.892451},
        {"id":"1532","name":"CLUB RAPP","provider":"Pioupiou","latitude":45.439526,"longitude":4.85159},
        {"id":"1533","name":"Wangs Landeplatz 486m","provider":"Pioupiou","latitude":47.038348,"longitude":9.430935},
        {"id":"1535","name":"Bälmeten Backup","provider":"Pioupiou","latitude":46.83102,"longitude":8.680603},
        {"id":"1536","name":"Atterro La Chambre Maurienne 466m","provider":"Pioupiou","latitude":45.365067,"longitude":6.29455},
        {"id":"1537","name":"Monte Pisciavino 596m","provider":"Pioupiou","latitude":44.027996,"longitude":8.162891},
        {"id":"1538","name":"Aéromodélisme Leucatois","provider":"Pioupiou","latitude":42.936385,"longitude":3.009321},
        {"id":"1540","name":"Bligny","provider":"Pioupiou","latitude":47.11459,"longitude":4.675596},
        {"id":"1542","name":"Déco Tournemire Gréponac 750m","provider":"Pioupiou","latitude":43.966431,"longitude":3.029074},
        {"id":"1543","name":"Décollage de Ens 1350m","provider":"Pioupiou","latitude":42.805345,"longitude":0.332221},
        {"id":"1544","name":"Puy-Saint-Pierre 1519m","provider":"Pioupiou","latitude":44.893439,"longitude":6.620048},
        {"id":"1545","name":"Vigiljoch startplatz 1400m","provider":"Pioupiou","latitude":46.624173,"longitude":11.118448},
        {"id":"1548","name":"WindBird 1548","provider":"Pioupiou","latitude":47.296102,"longitude":-3.087766},
        {"id":"1549","name":"Decollo Panettone","provider":"Pioupiou","latitude":42.311166,"longitude":13.71884},
        {"id":"1551","name":"Décollage les Monts","provider":"Pioupiou","latitude":45.457815,"longitude":6.640931},
        {"id":"1552","name":"Saint Jean -La Peine","provider":"Pioupiou","latitude":44.041462,"longitude":5.403121},
        {"id":"1553","name":"Mauvezin","provider":"Pioupiou","latitude":46.098698,"longitude":5.849814},
        {"id":"1554","name":"Savoie Parachutisme","provider":"Pioupiou","latitude":45.630277,"longitude":5.87691},
        {"id":"1555","name":"Windbird 1555","provider":"Pioupiou","latitude":43.309688,"longitude":-3.033801},
        {"id":"1556","name":"Windbird 1556","provider":"Pioupiou","latitude":43.313768,"longitude":-2.97197},
        {"id":"1557","name":"Déco de Romaniere","provider":"Pioupiou","latitude":43.702504,"longitude":4.985245},
        {"id":"1558","name":"Baouroux 1600m ","provider":"Pioupiou","latitude":43.781187,"longitude":6.718238},
        {"id":"1562","name":"Signal de Soi 2050m","provider":"Pioupiou","latitude":46.186497,"longitude":6.916807},
        {"id":"1564","name":"LF8123 - Base ULM St Affrique les Montagnes","provider":"Pioupiou","latitude":43.545405,"longitude":2.209772},
        {"id":"1565","name":"ULM Neuville LF3560","provider":"Pioupiou","latitude":48.310897,"longitude":-1.580281},
        {"id":"1567","name":"Windbird 1567","provider":"Pioupiou","latitude":46.310842,"longitude":6.825311},
        {"id":"1568","name":"Décollage de Montlambert 899m","provider":"Pioupiou","latitude":45.553011,"longitude":6.104683},
        {"id":"1569","name":"Atterrissage Crozet 560m","provider":"Pioupiou","latitude":46.278303,"longitude":6.016659},
        {"id":"1570","name":"Dormillouse - Blanche Ascendance","provider":"Pioupiou","latitude":44.406785,"longitude":6.38491},
        {"id":"1572","name":"Windbird 1572","provider":"Pioupiou","latitude":43.030014,"longitude":-2.201251},
        {"id":"1573","name":"Decollo Fontanile alto 1830m","provider":"Pioupiou","latitude":42.813399,"longitude":13.176122},
        {"id":"1578","name":"Klewenalp change-gravity.ch","provider":"Pioupiou","latitude":46.940415,"longitude":8.475725},
        {"id":"1580","name":"Piani di Montioli 1316m","provider":"Pioupiou","latitude":43.038467,"longitude":13.221878},
        {"id":"1581","name":"Windbird 1581","provider":"Pioupiou","latitude":43.867126,"longitude":1.417752},
        {"id":"1583","name":"Aero-loisirs du 45 ème","provider":"Pioupiou","latitude":45.017791,"longitude":4.902498},
        {"id":"1586","name":"Wetzisreute Oberschwaben","provider":"Pioupiou","latitude":47.779167,"longitude":9.695631},
        {"id":"1587","name":"Windbird 1587","provider":"Pioupiou","latitude":43.142454,"longitude":-1.999112},
        {"id":"1588","name":"Col de la Core","provider":"Pioupiou","latitude":42.859763,"longitude":1.105023},
        {"id":"1589","name":"Turó de Puigsagordi","provider":"Pioupiou","latitude":41.810056,"longitude":2.203418},
        {"id":"1590","name":"La Roche de Vaux en pré","provider":"Pioupiou","latitude":46.629562,"longitude":4.586517},
        {"id":"1592","name":"Val Pelouse 1879 m","provider":"Pioupiou","latitude":45.421093,"longitude":6.174336},
        {"id":"1593","name":"Windbird 1593","provider":"Pioupiou","latitude":44.502396,"longitude":3.308},
        {"id":"1594","name":"Brise de Vallée Champs Claudon à La Bresse","provider":"Pioupiou","latitude":47.99696,"longitude":6.850239},
        {"id":"1595","name":"Petit Mont-Rond 1 535m","provider":"Pioupiou","latitude":46.358915,"longitude":6.006325},
        {"id":"1597","name":"Somosierra 1623","provider":"Pioupiou","latitude":41.149028,"longitude":-3.613834},
        {"id":"1600","name":"Paramotoristi Campolargo","provider":"Pioupiou","latitude":43.215763,"longitude":13.42572},
        {"id":"1601","name":"Chabottes 1070m","provider":"Pioupiou","latitude":44.641897,"longitude":6.171892},
        {"id":"1604","name":"Mas Rimbault Frontignan 220m","provider":"Pioupiou","latitude":43.47494,"longitude":3.736516},
        {"id":"1607","name":"LP Plenzengreith 968m","provider":"Pioupiou","latitude":47.213934,"longitude":15.480172},
        {"id":"1609","name":"Site de Vol Libre du Mt Myon 630m","provider":"Pioupiou","latitude":46.330263,"longitude":5.398217},
        {"id":"1610","name":"La Muela 960m","provider":"Pioupiou","latitude":40.836506,"longitude":-3.10731},
        {"id":"1611","name":"Déco Nord Chaudeyrolles 1380m","provider":"Pioupiou","latitude":44.935848,"longitude":4.191948},
        {"id":"1613","name":"Brezons","provider":"Pioupiou","latitude":45.006691,"longitude":2.814448},
        {"id":"1617","name":"Chiemsee Feldwieser Bucht","provider":"Pioupiou","latitude":47.842803,"longitude":12.472433},
        {"id":"1618","name":"Déco Pas de Saint Martin","provider":"Pioupiou","latitude":45.022872,"longitude":5.464568},
        {"id":"1622","name":"Sanetsch/Sénin 2050m","provider":"Pioupiou","latitude":46.364947,"longitude":7.298866},
        {"id":"1623","name":"Chamonix Ensa","provider":"Pioupiou","latitude":45.925735,"longitude":6.872849},
        {"id":"1626","name":"Polopos 1160m","provider":"Pioupiou","latitude":36.806296,"longitude":-3.305346},
        {"id":"1628","name":"Aérodrome de VALRÉAS-VISAN","provider":"Pioupiou","latitude":44.336627,"longitude":4.905468},
        {"id":"1630","name":"Base ULM 3531 le haut bois","provider":"Pioupiou","latitude":48.001457,"longitude":-1.352004},
        {"id":"1633","name":"Decollo Ripetitori - Caccamo","provider":"Pioupiou","latitude":43.125369,"longitude":13.194422},
        {"id":"1634","name":"Chabraire 1520m","provider":"Pioupiou","latitude":45.157371,"longitude":2.733522},
        {"id":"1635","name":"Windbird 1635","provider":"Pioupiou","latitude":47.991181,"longitude":7.95593},
        {"id":"1636","name":"Le Morclan 1970m","provider":"Pioupiou","latitude":46.274703,"longitude":6.861582},
        {"id":"1638","name":"Los Majojos","provider":"Pioupiou","latitude":37.141948,"longitude":-3.51653},
        {"id":"1639","name":"Atero KmVertifly","provider":"Pioupiou","latitude":46.158219,"longitude":7.150921},
        {"id":"1640","name":"\"The Beach\" Coursegoules","provider":"Pioupiou","latitude":43.801481,"longitude":7.045133},
        {"id":"1642","name":"Hirzer Startplatz 2100m","provider":"Pioupiou","latitude":46.734919,"longitude":11.252067},
        {"id":"1644","name":"Windbird 1644","provider":"Pioupiou","latitude":48.360459,"longitude":2.956517},
        {"id":"1645","name":"Aéro 2000 Le Verger","provider":"Pioupiou","latitude":48.055763,"longitude":-1.936408},
        {"id":"1648","name":"Windbird 1648","provider":"Pioupiou","latitude":46.206255,"longitude":-1.367463},
        {"id":"1650","name":"Rifugio G. Chierego 1911m","provider":"Pioupiou","latitude":45.692047,"longitude":10.825032},
        {"id":"1652","name":"Windbird 1652","provider":"Pioupiou","latitude":46.539425,"longitude":6.652642},
        {"id":"1653","name":"Marnaves","provider":"Pioupiou","latitude":44.1068,"longitude":1.886285},
        {"id":"1655","name":"Vigie du Contras","provider":"Pioupiou","latitude":44.116605,"longitude":5.723844},
        {"id":"1656","name":"Fürmannalm/ Irlberg","provider":"Pioupiou","latitude":47.793294,"longitude":12.838607},
        {"id":"1657","name":"Le Seigneur - Mont du Moustier","provider":"Pioupiou","latitude":44.087352,"longitude":5.36284},
        {"id":"1659","name":"Decollo alto S.Elisabetta 1565m","provider":"Pioupiou","latitude":45.440785,"longitude":7.643045},
        {"id":"1660","name":"Frutigen Helgisberg","provider":"Pioupiou","latitude":46.58666,"longitude":7.629529},
        {"id":"1661","name":"LFMG","provider":"Pioupiou","latitude":43.407012,"longitude":1.990377},
        {"id":"1662","name":"Décollage de Montblond","provider":"Pioupiou","latitude":44.509117,"longitude":1.893299},
        {"id":"1667","name":"SIONES","provider":"Pioupiou","latitude":43.324838,"longitude":-5.959324},
        {"id":"1668","name":"Windbird 1668","provider":"Pioupiou","latitude":47.295505,"longitude":-2.155627},
        {"id":"1670","name":"Mont de Vannes","provider":"Pioupiou","latitude":47.757334,"longitude":6.622902},
        {"id":"1671","name":"Club ULM - Héric","provider":"Pioupiou","latitude":47.386513,"longitude":-1.635998},
        {"id":"1672","name":"Windbird 1672","provider":"Pioupiou","latitude":46.789219,"longitude":9.069825},
        {"id":"1674","name":"Windbird 1674","provider":"Pioupiou","latitude":38.443181,"longitude":-9.092589},
        {"id":"1678","name":"PIC DE BRAU","provider":"Pioupiou","latitude":43.010632,"longitude":2.234332},
        {"id":"1679","name":"Windbird 1679","provider":"Pioupiou","latitude":43.657082,"longitude":3.953487},
        {"id":"1680","name":"Modèle Club Haut Beaujolais","provider":"Pioupiou","latitude":45.915438,"longitude":4.374128},
        {"id":"1681","name":"Ehrsberg","provider":"Pioupiou","latitude":47.750533,"longitude":7.906364},
        {"id":"1684","name":"WindBird 1684","provider":"Pioupiou","latitude":46.905931,"longitude":7.595645},
        {"id":"1685","name":"Obere Bogmen 1375m","provider":"Pioupiou","latitude":47.189919,"longitude":9.092642},
        {"id":"1686","name":"Gampilalm 2100m","provider":"Pioupiou","latitude":46.915865,"longitude":11.705063},
        {"id":"1688","name":"Schöckl Süd SP 1418m","provider":"Pioupiou","latitude":47.201362,"longitude":15.475878},
        {"id":"1689","name":"Linceuil","provider":"Pioupiou","latitude":44.313789,"longitude":5.240631},
        {"id":"1690","name":"Carchuna 120m","provider":"Pioupiou","latitude":36.697356,"longitude":-3.465343},
        {"id":"1691","name":"TSD BIOLLENE -Domaine Skiable Valmorel","provider":"Pioupiou","latitude":45.443921,"longitude":6.414772},
        {"id":"1693","name":"Atterro Des Brocolis 275m","provider":"Pioupiou","latitude":45.618299,"longitude":5.928115},
        {"id":"1695","name":"La Chainade Marennes","provider":"Pioupiou","latitude":45.834021,"longitude":-1.124575},
        {"id":"1698","name":"Gréolières 300 - Le dahu","provider":"Pioupiou","latitude":43.800464,"longitude":6.954656},
        {"id":"1700","name":"Balise de Chèvre Roche","provider":"Pioupiou","latitude":48.039057,"longitude":6.708087},
        {"id":"1701","name":"TUNIBERG","provider":"Pioupiou","latitude":47.970894,"longitude":7.678692},
        {"id":"1702","name":"Tête de Balme","provider":"Pioupiou","latitude":46.030062,"longitude":6.961819},
        {"id":"1704","name":"Windbird 1704","provider":"Pioupiou","latitude":44.722426,"longitude":4.486893},
        {"id":"1706","name":"Landgut Riegerbauer","provider":"Pioupiou","latitude":47.213727,"longitude":15.816163},
        {"id":"1707","name":"Frêtes","provider":"Pioupiou","latitude":45.855904,"longitude":6.247207},
        {"id":"1708","name":"Déco Anglettaz 1570m","provider":"Pioupiou","latitude":45.960293,"longitude":6.241011},
        {"id":"1709","name":"Startplatz Eggberge (Nord/Nordwest)","provider":"Pioupiou","latitude":46.903004,"longitude":8.652119},
        {"id":"1710","name":"Passy Plaine Batistock","provider":"Pioupiou","latitude":45.914844,"longitude":6.706056},
        {"id":"1715","name":"Windbird 1715","provider":"Pioupiou","latitude":43.309188,"longitude":-1.634508},
        {"id":"1716","name":"Engolneuf 1450m","provider":"Pioupiou","latitude":45.132393,"longitude":2.789692},
        {"id":"1717","name":"Mison","provider":"Pioupiou","latitude":44.277828,"longitude":5.83713},
        {"id":"1719","name":"Decollo CFP Monte Bernadia 730m","provider":"Pioupiou","latitude":46.225512,"longitude":13.262827},
        {"id":"1720","name":"Atterrissage de Doussard","provider":"Pioupiou","latitude":45.722537,"longitude":6.307209},
        {"id":"1722","name":"Déco Aiguebelette 1121m","provider":"Pioupiou","latitude":45.599509,"longitude":5.810054},
        {"id":"1723","name":"Thun Hafeneinfahrt","provider":"Pioupiou","latitude":46.740161,"longitude":7.636086},
        {"id":"1724","name":"Déco Planpraz Chamonix 1958m","provider":"Pioupiou","latitude":45.933884,"longitude":6.847538},
        {"id":"1725","name":"Schöckl Nord SP 1434m","provider":"Pioupiou","latitude":47.198485,"longitude":15.459758},
        {"id":"1726","name":"LF2B25-Padulone","provider":"Pioupiou","latitude":42.108097,"longitude":9.540597},
        {"id":"1727","name":"Arcones 1832m","provider":"Pioupiou","latitude":41.077581,"longitude":-3.70546},
        {"id":"1728","name":"Lespignan ZELD HERAULT","provider":"Pioupiou","latitude":43.268613,"longitude":3.181718},
        {"id":"1729","name":"Alpo Startplatz","provider":"Pioupiou","latitude":45.809464,"longitude":10.577474},
        {"id":"1730","name":"Décollage Sud de Léoncel","provider":"Pioupiou","latitude":44.907065,"longitude":5.205185},
        {"id":"1731","name":"Monte Foce - Gubbio","provider":"Pioupiou","latitude":43.36476,"longitude":12.574026},
        {"id":"1732","name":"Föhn-Messstation Churerstrasse","provider":"Pioupiou","latitude":47.062948,"longitude":9.509065},
        {"id":"1733","name":"Gschasi","provider":"Pioupiou","latitude":48.186575,"longitude":8.128735},
        {"id":"1735","name":"Septmoncel","provider":"Pioupiou","latitude":46.371778,"longitude":5.899984},
        {"id":"1736","name":"CONIL (1736)","provider":"Pioupiou","latitude":44.965541,"longitude":3.704935},
        {"id":"1737","name":"Hündle","provider":"Pioupiou","latitude":47.543182,"longitude":10.0555},
        {"id":"1738","name":"Le Péguieou 2400m","provider":"Pioupiou","latitude":44.355449,"longitude":6.595116},
        {"id":"1739","name":"Mirabel","provider":"Pioupiou","latitude":44.606775,"longitude":4.500282},
        {"id":"1740","name":"Déco Sire-Sud 1505m","provider":"Pioupiou","latitude":45.630751,"longitude":5.966551},
        {"id":"1746","name":"Aéro-Club Icaria LFYS","provider":"Pioupiou","latitude":42.44752,"longitude":2.006189},
        {"id":"1749","name":"Les Carroz 1850m","provider":"Pioupiou","latitude":46.030279,"longitude":6.66978},
        {"id":"1751","name":"Windbird 1751","provider":"Pioupiou","latitude":47.978501,"longitude":8.62916},
        {"id":"1754","name":"Windbird 1754","provider":"Pioupiou","latitude":43.3237,"longitude":-2.667269},
        {"id":"1755","name":"Windbird","provider":"Pioupiou","latitude":46.945286,"longitude":8.506509},
        {"id":"1756","name":"Rabnitz 535m","provider":"Pioupiou","latitude":47.155397,"longitude":15.519865},
        {"id":"1758","name":"TSD MADELEINE -Domaine Skiable de Valmorel","provider":"Pioupiou","latitude":45.431503,"longitude":6.395309},
        {"id":"1760","name":"Ryser Groupe SA","provider":"Pioupiou","latitude":47.058166,"longitude":6.750767},
        {"id":"1763","name":"Val d'Isère Solaise 2558m","provider":"Pioupiou","latitude":45.431689,"longitude":6.993032},
        {"id":"1764","name":"Beauvoisin - Col de Milmandre","provider":"Pioupiou","latitude":44.302886,"longitude":5.236265},
        {"id":"1765","name":"LFNE Salon-Eyguières","provider":"Pioupiou","latitude":43.660249,"longitude":5.015662},
        {"id":"1766","name":"Bourg-d'Oisans","provider":"Pioupiou","latitude":45.062872,"longitude":6.024881},
        {"id":"1767","name":"Aeriance","provider":"Pioupiou","latitude":48.350802,"longitude":2.349344},
        {"id":"1769","name":"Windbird 1769","provider":"Pioupiou","latitude":45.230823,"longitude":-0.821412},
        {"id":"1770","name":"Petit Som en Chartreuse 1721m","provider":"Pioupiou","latitude":45.377703,"longitude":5.8066},
        {"id":"1775","name":"Zundelberg Schneise","provider":"Pioupiou","latitude":48.065022,"longitude":8.756235},
        {"id":"1776","name":"Cuchon d'Ancelle et St Léger","provider":"Pioupiou","latitude":44.635881,"longitude":6.22353},
        {"id":"1777","name":"Windbird 1777","provider":"Pioupiou","latitude":43.255022,"longitude":6.576834},
        {"id":"1779","name":"LP Talstation 736m","provider":"Pioupiou","latitude":47.185224,"longitude":15.479504},
        {"id":"1781","name":"Simssee Ecking","provider":"Pioupiou","latitude":47.858041,"longitude":12.226503},
        {"id":"1783","name":"Vounetz Charmey","provider":"Pioupiou","latitude":46.625895,"longitude":7.206457},
        {"id":"1784","name":"Windbird 1784","provider":"Pioupiou","latitude":43.294778,"longitude":-1.288623},
        {"id":"1785","name":"Base ULM Chansèves","provider":"Pioupiou","latitude":45.090534,"longitude":1.856337},
        {"id":"2001","name":"Décollage Mont Chouvé 1450m","provider":"Pioupiou","latitude":45.630902,"longitude":3.781346},
        {"id":"2002","name":"ALAS DE F - Petrés","provider":"Pioupiou","latitude":39.687043,"longitude":-0.299701},
        {"id":"2003","name":"ALA DE F - Figueroles","provider":"Pioupiou","latitude":40.138095,"longitude":-0.224458},
        {"id":"2004","name":"ALAS DE F - Villar","provider":"Pioupiou","latitude":39.728559,"longitude":-0.846652},
        {"id":"2005","name":"Déco Prat d'Albis 1205m","provider":"Pioupiou","latitude":42.921725,"longitude":1.580975},
        {"id":"2006","name":"DAMPIERRE ET FLEE 810ft","provider":"Pioupiou","latitude":47.475792,"longitude":5.357496},
        {"id":"2007","name":"Cinquétral S","provider":"Pioupiou","latitude":46.424502,"longitude":5.872745},
        {"id":"2008","name":"Les Frenelots","provider":"Pioupiou","latitude":47.060273,"longitude":6.638508},
        {"id":"2009","name":"Décollage le Courouaou Col de la Courade","provider":"Pioupiou","latitude":42.997866,"longitude":0.168038},
        {"id":"2011","name":"VERNET VICHYPARAPENTE","provider":"Pioupiou","latitude":46.102392,"longitude":3.45541},
        {"id":"2013","name":"Déco de Velars sur Ouche, la Madone.","provider":"Pioupiou","latitude":47.301679,"longitude":4.90038},
        {"id":"2014","name":"Windbird 2014","provider":"Pioupiou","latitude":47.918168,"longitude":7.953955},
        {"id":"2016","name":"La PLANE / MELVE","provider":"Pioupiou","latitude":44.37064,"longitude":5.986111},
        {"id":"2017","name":"Chalvet 2577m","provider":"Pioupiou","latitude":44.949544,"longitude":6.707474},
        {"id":"2019","name":"Vältinschollensee SSCM e.V.","provider":"Pioupiou","latitude":48.4247,"longitude":7.766031},
        {"id":"2020","name":"Windbird 2020","provider":"Pioupiou","latitude":45.455726,"longitude":6.919768},
        {"id":"2023","name":"XAGO","provider":"Pioupiou","latitude":46.098743,"longitude":5.849853},
        {"id":"2024","name":"Windstation 1.DGFC","provider":"Pioupiou","latitude":46.829647,"longitude":13.41193},
        {"id":"2025","name":"Site de Bordas","provider":"Pioupiou","latitude":45.04792,"longitude":0.66744},
        {"id":"2026","name":"Croix d'Agy 1280m","provider":"Pioupiou","latitude":46.080075,"longitude":6.619235},
        {"id":"2027","name":"LP Walenstadt","provider":"Pioupiou","latitude":47.122908,"longitude":9.307873},
        {"id":"2029","name":"Tschingel ob Gunten","provider":"Pioupiou","latitude":46.724791,"longitude":7.710267},
        {"id":"2031","name":"Windbird 2031","provider":"Pioupiou","latitude":44.113603,"longitude":6.215218},
        {"id":"2034","name":"Méréville Plate forme de Boigny","provider":"Pioupiou","latitude":48.328598,"longitude":2.089756},
        {"id":"2035","name":"AIR FLEURY CLUB","provider":"Pioupiou","latitude":47.854497,"longitude":3.434618},
        {"id":"2036","name":"Les Plagnes Domaine Skiable Valmorel","provider":"Pioupiou","latitude":45.440202,"longitude":6.451516},
        {"id":"2038","name":"Pic d'Ysson","provider":"Pioupiou","latitude":45.517968,"longitude":3.157022},
        {"id":"2039","name":"Cornillon JOB 1130m","provider":"Pioupiou","latitude":45.637668,"longitude":3.753382},
        {"id":"2041","name":"Pointe des Brasses 1503m","provider":"Pioupiou","latitude":46.167307,"longitude":6.444704},
        {"id":"2042","name":"TK GELAZ -Domaine Skiable Valmorel","provider":"Pioupiou","latitude":45.461169,"longitude":6.424679},
        {"id":"2046","name":"Calmongoutte","provider":"Pioupiou","latitude":47.96414,"longitude":6.816215},
        {"id":"2047","name":"Déco Brunas 730m","provider":"Pioupiou","latitude":44.071563,"longitude":3.064645},
        {"id":"2052","name":"G2 Marquis","provider":"Pioupiou","latitude":45.40515,"longitude":6.371419},
        {"id":"2053","name":"G2 Soleil Rouge","provider":"Pioupiou","latitude":45.41583,"longitude":6.383208},
        {"id":"2055","name":"Savigny sous Malain","provider":"Pioupiou","latitude":47.338044,"longitude":4.751496},
        {"id":"2056","name":"CORPPO","provider":"Pioupiou","latitude":43.603441,"longitude":1.418057},
        {"id":"2057","name":"Windbird 2057","provider":"Pioupiou","latitude":42.974558,"longitude":0.411143},
        {"id":"2058","name":"Ernio","provider":"Pioupiou","latitude":43.166872,"longitude":-2.146053},
        {"id":"2059","name":"MACC","provider":"Pioupiou","latitude":43.266378,"longitude":5.684432},
        {"id":"2060","name":"windbird 2060","provider":"Pioupiou","latitude":46.09875,"longitude":5.849799},
        {"id":"2062","name":"CARMA","provider":"Pioupiou","latitude":47.93187,"longitude":7.263853},
        {"id":"2064","name":"AVLE – Coll de Rates","provider":"Pioupiou","latitude":38.723174,"longitude":-0.081778},
        {"id":"2065","name":"AVLE Islares","provider":"Pioupiou","latitude":43.397892,"longitude":-3.308416},
        {"id":"2066","name":"UCA-INMAR","provider":"Pioupiou","latitude":36.528759,"longitude":-6.213778},
        {"id":"2067","name":"Windbird 2067","provider":"Pioupiou","latitude":47.536769,"longitude":10.216171},
        {"id":"2071","name":"MAC17","provider":"Pioupiou","latitude":45.752784,"longitude":-1.1136},
        {"id":"2073","name":"Decollo Castiverio Corno d'Aquilio","provider":"Pioupiou","latitude":45.652775,"longitude":10.939223},
        {"id":"2074","name":"Següencu","provider":"Pioupiou","latitude":43.321667,"longitude":-5.11818},
        {"id":"2075","name":"Windbird 2075","provider":"Pioupiou","latitude":46.098803,"longitude":5.849865},
        {"id":"2076","name":"OMAT - Club modélisme Planeur, Avion et Hélico","provider":"Pioupiou","latitude":43.564582,"longitude":3.744348},
        {"id":"2077","name":"Osterfelder Nord -Startplatz","provider":"Pioupiou","latitude":47.439456,"longitude":11.052025},
        {"id":"2078","name":"El Salt de l'Equip.","provider":"Pioupiou","latitude":41.562424,"longitude":1.896444},
        {"id":"2079","name":" Resquilones","provider":"Pioupiou","latitude":43.394793,"longitude":-4.82712},
        {"id":"2081","name":"Décollage 2700m","provider":"Pioupiou","latitude":45.11955,"longitude":6.102574},
        {"id":"2084","name":"Windbird 2084","provider":"Pioupiou","latitude":44.668166,"longitude":6.628396},
        {"id":"2087","name":"Windbird 2087","provider":"Pioupiou","latitude":47.996895,"longitude":7.815323},
        {"id":"2089","name":"Accous Déco Nord","provider":"Pioupiou","latitude":42.981637,"longitude":-0.57111},
        {"id":"2090","name":"Gaschney","provider":"Pioupiou","latitude":48.034733,"longitude":7.034508},
        {"id":"2091","name":"Naussac - CNNL - by MKF","provider":"Pioupiou","latitude":44.735506,"longitude":3.834091},
        {"id":"2092","name":"TCO PELEVES - DOMAINE SKIABLE DE VALMOREL","provider":"Pioupiou","latitude":45.429432,"longitude":6.429485},
        {"id":"2094","name":"Windbird 2094","provider":"Pioupiou","latitude":48.27047,"longitude":0.105923},
        {"id":"2097","name":"Windbird 2097","provider":"Pioupiou","latitude":43.33972,"longitude":-2.478858},
        {"id":"2098","name":"Windbird 2098","provider":"Pioupiou","latitude":43.231736,"longitude":-2.871139},
        {"id":"2099","name":"Déco Angle de Bellecôte","provider":"Pioupiou","latitude":45.254453,"longitude":6.735794},
        {"id":"2103","name":"Windbird 2103","provider":"Pioupiou","latitude":43.004401,"longitude":-0.089615},
        {"id":"2104","name":"Windbird 2104","provider":"Pioupiou","latitude":42.522668,"longitude":-7.304698},
        {"id":"2105","name":"Windbird 2105","provider":"Pioupiou","latitude":45.002454,"longitude":5.317543},
        {"id":"2107","name":"Plateforme Paramoteur LF 0755","provider":"Pioupiou","latitude":44.940335,"longitude":4.761408},
        {"id":"2108","name":"LE MONSARD","provider":"Pioupiou","latitude":46.343569,"longitude":4.708445},
        {"id":"2109","name":"Windbird 2109","provider":"Pioupiou","latitude":44.487438,"longitude":1.892299},
        {"id":"2112","name":"CLUB AEROMODELISME GUYNEMER VIZILLE","provider":"Pioupiou","latitude":45.082435,"longitude":5.784298},
        {"id":"2113","name":"Les Autannes","provider":"Pioupiou","latitude":46.020894,"longitude":6.97082},
        {"id":"2114","name":"Déco d'Aiguines le Puits 1095m","provider":"Pioupiou","latitude":43.769639,"longitude":6.253711},
        {"id":"2115","name":"Décollage du Bellegarde 1650m","provider":"Pioupiou","latitude":42.798755,"longitude":0.382424},
        {"id":"2116","name":"NARANCO","provider":"Pioupiou","latitude":43.384437,"longitude":-5.864338},
        {"id":"2118","name":"CVL Cañete la Real","provider":"Pioupiou","latitude":36.958887,"longitude":-5.010872},
        {"id":"2119","name":"Windbird 2119","provider":"Pioupiou","latitude":43.334431,"longitude":-5.958441},
        {"id":"2120","name":"Un ballon en Vaunage","provider":"Pioupiou","latitude":43.821096,"longitude":4.194779},
        {"id":"2121","name":"Monte Cristo- Monte Ianni Bianchi 1653m","provider":"Pioupiou","latitude":42.397559,"longitude":13.566103},
        {"id":"2125","name":"Ceret Nord. Ailes du Vallespir","provider":"Pioupiou","latitude":42.45874,"longitude":2.767418},
        {"id":"2129","name":"Decollo Cuarnan 1180m","provider":"Pioupiou","latitude":46.274538,"longitude":13.175882},
        {"id":"2130","name":"Windbird 2130","provider":"Pioupiou","latitude":46.310195,"longitude":13.112794},
        {"id":"2132","name":"Cermis Paion – Decollo A.S.D. Volavisio","provider":"Pioupiou","latitude":46.243127,"longitude":11.503265},
        {"id":"2133","name":"CAPT'ain NAUTIC - Bateau école de la Capte","provider":"Pioupiou","latitude":43.065108,"longitude":6.149613},
        {"id":"2134","name":"V.Pajare1","provider":"Pioupiou","latitude":42.967932,"longitude":-5.7887},
        {"id":"2135","name":"BonVol Milagrosa","provider":"Pioupiou","latitude":39.640541,"longitude":-0.319027},
        {"id":"2136","name":"Windbird 2136","provider":"Pioupiou","latitude":46.080822,"longitude":6.714944},
        {"id":"2137","name":"Les 3 Croix","provider":"Pioupiou","latitude":46.917664,"longitude":4.671523},
        {"id":"2138","name":"Etang de Mateille","provider":"Pioupiou","latitude":43.118285,"longitude":3.120096},
        {"id":"2139","name":"Windbird 2139","provider":"Pioupiou","latitude":42.572323,"longitude":2.055477},
        {"id":"2142","name":"Bärghus","provider":"Pioupiou","latitude":46.594876,"longitude":7.283315},
        {"id":"2143","name":"Les Vanils","provider":"Pioupiou","latitude":46.540054,"longitude":7.112736},
        {"id":"2144","name":"Bäderhorn","provider":"Pioupiou","latitude":46.617948,"longitude":7.321288},
        {"id":"2146","name":"Windbird 2146","provider":"Pioupiou","latitude":46.231107,"longitude":12.805975},
        {"id":"2147","name":"Windbird 2147","provider":"Pioupiou","latitude":46.379771,"longitude":6.723484},
        {"id":"2148","name":"Naussac - Mont Milan - by MKF","provider":"Pioupiou","latitude":44.747243,"longitude":3.828079},
        {"id":"2150","name":"Coburgerhütte 1920m","provider":"Pioupiou","latitude":47.360116,"longitude":10.933654},
        {"id":"2152","name":"Windbird 2152","provider":"Pioupiou","latitude":45.239167,"longitude":6.17286},
        {"id":"2155","name":"Windbird 2155","provider":"Pioupiou","latitude":44.17408,"longitude":5.263583},
        {"id":"2156","name":"Windbird 2156","provider":"Pioupiou","latitude":43.926495,"longitude":2.520655},
        {"id":"2158","name":"CNM Morges","provider":"Pioupiou","latitude":46.505476,"longitude":6.497344},
        {"id":"2162","name":"Faltschen","provider":"Pioupiou","latitude":46.630041,"longitude":7.6997},
        {"id":"2163","name":"Leiterspitz 2320m","provider":"Pioupiou","latitude":46.707008,"longitude":11.383325},
        {"id":"2168","name":"Le Grand Moiré","provider":"Pioupiou","latitude":46.866247,"longitude":-0.185885},
        {"id":"2170","name":"Les Manensses","provider":"Pioupiou","latitude":43.686433,"longitude":1.641882},
        {"id":"2171","name":"Windbird 2171","provider":"Pioupiou","latitude":42.745653,"longitude":1.518645},
        {"id":"2172","name":"Schiberenegg","provider":"Pioupiou","latitude":46.959206,"longitude":8.614245},
        {"id":"2175","name":"Piccolo Matro, Decollo Nord 1200m","provider":"Pioupiou","latitude":46.136641,"longitude":8.980298},
        {"id":"2176","name":"KCB - Kite et Wing - Lac du Bourget","provider":"Pioupiou","latitude":45.701835,"longitude":5.883557},
        {"id":"2177","name":"PUECH DE KAYMARD","provider":"Pioupiou","latitude":44.549288,"longitude":2.482635},
        {"id":"2178","name":"Windbird 2178","provider":"Pioupiou","latitude":45.387122,"longitude":4.595864},
        {"id":"2179","name":"Almkopf 1805m","provider":"Pioupiou","latitude":47.415588,"longitude":10.764795},
        {"id":"2182","name":"Ibio","provider":"Pioupiou","latitude":43.290409,"longitude":-4.144039},
        {"id":"2184","name":"Serre de Barre Le Mognard","provider":"Pioupiou","latitude":44.420712,"longitude":4.073488},
        {"id":"2185","name":"Crêtes de Thyon","provider":"Pioupiou","latitude":46.169302,"longitude":7.368457},
        {"id":"2186","name":"Windbird 2186","provider":"Pioupiou","latitude":45.794367,"longitude":5.82064},
        {"id":"2187","name":"KCB - Kite et Wing - Plage du Lido","provider":"Pioupiou","latitude":45.669193,"longitude":5.893405},
        {"id":"2188","name":"Windbird 2188","provider":"Pioupiou","latitude":47.776432,"longitude":7.700917},
        {"id":"2189","name":"Windbird 2189","provider":"Pioupiou","latitude":46.245255,"longitude":6.180605},
        {"id":"2190","name":"C.N.L.D","provider":"Pioupiou","latitude":45.82735,"longitude":6.198008},
        {"id":"2194","name":"Surfclub Königswinkel SCK-1","provider":"Pioupiou","latitude":47.60799,"longitude":10.673347},
        {"id":"2336","name":"Meloisey Sud-Est","provider":"Pioupiou","latitude":47.038133,"longitude":4.722599},
        {"id":"2338","name":"Windbird 2338","provider":"Pioupiou","latitude":45.2397,"longitude":6.2146},
        {"id":"2339","name":"MONTE SUBASIO - ASSISI","provider":"Pioupiou","latitude":43.053417,"longitude":12.6762},
        {"id":"2340","name":"Decollo Monte Valinis Meduno 980 m","provider":"Pioupiou","latitude":46.231221,"longitude":12.805942},
        {"id":"2384","name":"Grubigstein Gamsbödele Süd-Ost-Nord 2040m","provider":"Pioupiou","latitude":47.381859,"longitude":10.846539},
        {"id":"2385","name":"Windbird 2385","provider":"Pioupiou","latitude":47.537256,"longitude":10.21832}
    ];

    const ESTACIONES_FFVL = 
    [
        {"id":"41","name":"Sauveterre","provider":"Pioupiou","latitude":43.456835,"longitude":0.846405},
        {"id":"70","name":"Déco Téléphérique Salève 1086m","provider":"Pioupiou","latitude":46.152982,"longitude":6.19053},
    ];

    // 🟡 2. OBJETO GESTOR CENTRAL (Configuración y Estado de cada red)
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
                html: `<div style="background-color: #0078d463; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                        
                    </div>`,
                className: 'cluster-balizas-personalizado',
                iconSize: L.point(36, 36)
            });
        }
    };

    const REDES_BALIZAS = {
        'euskalmet': {
            id: 'euskalmet',
            nombre: 'Euskalmet',
            estaciones: ESTACIONES_EUSKALMET,
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
            umbralRojoMin: 45 
        },
        'aemet': {
            id: 'aemet',
            nombre: 'AEMET',
            estaciones: ESTACIONES_AEMET,
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
            umbralRojoMin: 120
        },
        'holfuy': {
            id: 'holfuy',
            nombre: 'Holfuy',
            estaciones: ESTACIONES_HOLFUY,
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
            umbralRojoMin: 45 
        },
        'meteofrance': {
            id: 'meteofrance',
            nombre: 'Météo-France',
            estaciones: ESTACIONES_METEOFRANCE,
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
            nombre: 'OpenWind',
            estaciones: ESTACIONES_PIOUPIOU,
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
            umbralRojoMin: 45
        },
        'ffvl': {
            id: 'ffvl',
            nombre: 'FFVL',
            estaciones: ESTACIONES_FFVL,
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
            umbralRojoMin: 45
        }
    };    
    
    // 🟡 3. DIBUJAR LAS ESTACIONES ESTÁTICAS DE UNA RED
    //___________________________________________________________________________________

    function dibujarEstacionesBalizas(redId) {
        const red = REDES_BALIZAS[redId];
        if (red.dibujadas) return;

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
            marker.bindPopup(`
                <div id="pop-${red.id}-${estacion.id}" style="min-width: 140px; line-height: 1.3;">
                    <h4 style="margin: 0 0 5px 0; color: #0078d4;">🚩 ${estacion.name} (${red.nombre})</h4>
                    <br><br><p style="margin:0; color:#666;">⏳...</p><br><br>
                </div>
            `, {
                className: 'popup-despegueindividual popup-baliza',
                maxWidth: 300,
                maxHeight: 450,
                autoPanPaddingTopLeft: L.point(50, 450), // el primer valor () es el margen a reservar por la izquierda, el segundo () por arriba.
                autoPanPaddingBottomRight: L.point(55, 150)  // el primer valor () es el margen a reservar por la derecha, el segundo () por abajo.
            });

            red.marcadores[estacion.id] = marker;
            red.layerGroup.addLayer(marker);
        });

        red.dibujadas = true;
    }

    // 🟡 4. CARGAR EL JSON CONSOLIDADO EN VIVO PARA UNA RED
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

    // 🟡 4b. CARGAR HISTÓRICO DE 4H PARA UNA RED (Lazy Load)
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
        const red = REDES_BALIZAS[redId];
        const zoomActual = map.getZoom();

        Object.values(red.marcadores).forEach(marker => {
            const d = red.datosCache[marker.stationId];
            
            // -----------------------------------------------------------
            // A) COMPROBAR SI ESTÁ OBSOLETA (> 3 horas)
            // -----------------------------------------------------------
            let balizaConDatosObsoletos = false;

            if (!d || typeof d.ts !== 'number') {
                balizaConDatosObsoletos = true; // No tiene datos o no tiene ts
            } else {
                const ahoraTs = Date.now() / 1000;
                const horasSinDatos = (ahoraTs - d.ts) / 3600;

                if (horasSinDatos > 3) { // <---- X Horas límite desde última actualización antes de ocultar baliza
                    balizaConDatosObsoletos = true;
                }
            }

            // -----------------------------------------------------------
            // A.2) COMPROBAR SI ESTÁ CONGELADA (Todo ceros en las últimas 4h)
            // -----------------------------------------------------------
            let balizaCongelada = false;
            if (red.datos6h && red.datos6h[marker.stationId]) {
                const lecturas = red.datos6h[marker.stationId];
                const ahoraTs = Math.floor(Date.now() / 1000);
                const desdeTs = ahoraTs - 4 * 3600; // Últimas 4 horas
                
                const puntos4h = lecturas.filter(p => 
                    p.ts >= desdeTs && 
                    p.ts <= ahoraTs && 
                    typeof p.windSpeed === 'number'
                );

                // Si hay datos en estas 4h, y ABSOLUTAMENTE TODOS son cero
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

            // Nos aseguramos de que la baliza esté en el mapa
            if (!red.layerGroup.hasLayer(marker)) {
                red.layerGroup.addLayer(marker);
            }

            // 1. SI ESTÁ OBSOLETA (>3h) O CONGELADA A CERO: CÍRCULO GRIS
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

                if (marker.isPopupOpen()) pintarPopupBaliza(marker);
                return; // Terminamos aquí, no pintamos flechas ni números
            }

            // 2. SI HA MANDADO SEÑAL RECIENTE, PERO EL SENSOR ESTÁ ROTO (null)
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

                if (marker.isPopupOpen()) pintarPopupBaliza(marker);
                return;
            }

            // -----------------------------------------------------------
            // B) DATOS RECIENTES Y VÁLIDOS → PINTAMOS FLECHA Y NÚMEROS
            // -----------------------------------------------------------
            const rotacion = (d.windDirection ?? 0) + 180;
            const estadoMapa = calcularEstadoActualizacionBaliza(d, redId);
            const colorFlechaMapa = estadoMapa.esAntiguo ? '#95a5a6' : '#0078d4';
            
            const svgFlechaMapa = `
                <svg viewBox="0 0 30 36" style="transform: rotate(${rotacion}deg); transform-origin: 50% 30%; width: 40px; height: 40px; display: block;">
                    <polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="${colorFlechaMapa}"/>
                </svg>`;

            const colorVientoMapa = estadoMapa.esAntiguo ? '#95a5a6' : '#0078d4';
            const colorRachaMapa  = estadoMapa.esAntiguo ? '#95a5a6' : '#e74c3c';

            let cifrasHtml = `<strong style="font-size: 16px; color: ${colorVientoMapa};">${d.windSpeed}</strong>`;
            if (zoomActual >= 10 && d.windGusts !== null && d.windGusts !== undefined) {
                cifrasHtml += `<span style="font-size: 16px; color: #7f8c8d; margin: 0 1px;">/</span><strong style="font-size: 16px; color: ${colorRachaMapa};" title="Racha máxima: ${d.windGusts} km/h">${d.windGusts}</strong>`;
            }

            // Cambio de tamaños: 2º Sumas el height del div de arriba (donde va la flecha) y el height del div de abajo (donde van las letras). Eso te da el height total del contenedor principal. Nota: margin-left: -26px; es para desplazarlo a la izquierda y saltar el .leaflet-marker-icon.custom-div-icon {
            const htmlBaliza = `
                <div style="width: 80px; height: 46px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; cursor: pointer; margin-left: -27px; margin-top: 18px">
                    <div style="height: 40px; display: flex; align-items: center; justify-content: center; width: 100%;">
                        ${svgFlechaMapa}
                    </div>
                    <div style="height: 20px; margin-top: -14px; display: flex; align-items: center; justify-content: center; width: 100%; white-space: nowrap; text-shadow: 1px 1px 2px rgba(255,255,255,1), -1px -1px 2px rgba(255,255,255,1), 1px -1px 2px rgba(255,255,255,1), -1px 1px 2px rgba(255,255,255,1);">
                        ${cifrasHtml}
                    </div>
                </div>`;

            marker.setIcon(L.divIcon({ 
                html: htmlBaliza, 
                className: 'custom-div-icon', 
                iconAnchor: [40, 40], 
                popupAnchor: [0, 25] 
            }));

            if (marker.isPopupOpen()) pintarPopupBaliza(marker);
        });
    }
    
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

        // 1. Datos numéricos o Aviso de error (Si falla o está congelada, pintamos error y SALIMOS)
        if (!d || d.windSpeed === null || d.windSpeed === undefined || balizaCongelada) {
            containerDiv.innerHTML = `
                <p style="font-size:20px; padding-right:20px; max-width:212px; display:inline-block; margin: 0 0 10px 0;">
                🚩 <span style="font-weight: bold;"> ${marker.stationName}</span> <small style="color:#888;">(${red.nombre})</small>
                </p>
                <p style="line-height: 1.5; font-weight: bold; color: #c0392b; margin-bottom: 40px; margin-top: 20px; text-align: center;">❌📡 ${t('mapa.balizas.baliza_sin_datos', { defaultValue: 'Estación sin datos de viento.' })}</p>
            `;
            return; // Retorno temprano. El código se detiene aquí.
        } 

        // 2. Si todo está bien, calculamos variables
        
        const codigoOrientacion = obtenerTextoOrientacion(d.windDirection); // Obtenemos el código base de la orientación (ej: "SO", "O", "NNE")
        const orientacionTexto = traducirCadenaOrientacion(codigoOrientacion); 

        const estadoPopup = calcularEstadoActualizacionBaliza(d, marker.redId);

        // viewBox="5 1 20 20" centra la flecha a la perfección. Ahora "transform-origin: center center" hace que gire como una brújula perfecta.
        const svgFlecha = `
            <svg viewBox="5 1 20 20" style="transform: rotate(${(d.windDirection ?? 0) + 180}deg) scale(0.7); transform-origin: center center; width: 28px; height: 28px; flex-shrink: 0;">
                <polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="#0078d4"/>
            </svg>`;

        // Inyectamos todo el HTML correcto
        containerDiv.innerHTML = `
            <p style="font-size:20px; padding-right:20px; max-width:212px; display:inline-block; margin: 0 0 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; vertical-align:bottom;">
                🚩 <span style="font-weight: bold;"> ${marker.stationName}</span> <small style="color:#888;">(${red.nombre})</small>
            </p>

            <div style="display:flex; align-items:center; margin-top: 0px;">
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
                    <div style="display: flex; align-items: center; height: 25px;">
                        <img src="icons/icono_direccion_45.webp" width="16" height="16" style="margin-right:14px;">
                        <b style="color: #0078d4;">${orientacionTexto}</b>
                        ${svgFlecha} 
                        <span style="font-size:13px; color: #888;">(${d.windDirection ?? '-'}º)</span>
                    </div>
                </div>
                <div id="pop-rosa-${red.id}-${marker.stationId}" style="flex:0 0 auto; width:110px; text-align:center;">
                </div>
            </div>

            <div id="pop-chart-${red.id}-${marker.stationId}" style="min-height: 90px; text-align:center; margin-top: -14px;">
                <small style="color:#aaa;">⏳ ${t('mapa.balizas.balizas_cargando_grafico', { defaultValue: 'Cargando gráfico...' })}</small>
            </div>

            <span style="display: block; margin-top: 7px; margin-bottom:7px;">
                <small style="color:#888;">
                    ${estadoPopup.emoji} ${t('mapa.balizas.balizas_actualizada', { defaultValue: 'Actualizada' })}: ${formatearFechaHoraBaliza(d.ts)}
                </small>
            </span>
        `;

        pintarGraficaBaliza(marker);
    }

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

    map.on('popupopen', async function (e) { // <-- Añadido "async" aquí
        const marker = e.popup._source;
        if (!marker || !marker.redId || !marker.stationId) return; // Filtrar si no es un marcador de baliza
        
        // Forzamos la descarga del historial de 6h para que el gráfico esté al segundo
        await cargarDatos6hBalizasSiNecesario(marker.redId, true);
        
        pintarPopupBaliza(marker);
    });

    // 🟡 9. LÓGICA DE ACTIVACIÓN/DESACTIVACIÓN GENÉRICA POR CHECKBOXES
    //___________________________________________________________________________________

    async function activarCapaBalizas(redId) {
        const red = REDES_BALIZAS[redId];
        dibujarEstacionesBalizas(redId);
        map.addLayer(red.layerGroup);
        
        // Carga inicial forzada de ambos JSON antes de pintar por primera vez
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
                        <p style="margin:0; padding:10px;line-height:1.3;">${t('mapa.despeguesReactivados', { defaultValue: 'Capa <i>🪂 Despegues</i> reactivada' })}</p>
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