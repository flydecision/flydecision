// ---------------------------------------------------------------
// 🔴 VARIABLES O CONSTANTES GLOBALES
// ---------------------------------------------------------------

// Aquí guardaremos los JSON
let DATOS_METEO_CACHE = null;
let DATOS_METEO_ECMWF_CACHE = null;
let soloFavoritos;
//let favoritos = [];
let modoEdicionFavoritos = false;
let totalFavoritos = 0;
let totalDespeguesDisponibles = 0;

let VelocidadMin = Number(localStorage.getItem("METEO_VELOCIDAD_MINIMA")) || 0; 
let VelocidadIdeal = Number(localStorage.getItem("METEO_VELOCIDAD_IDEAL")) || 12;
let VelocidadMax = Number(localStorage.getItem("METEO_VELOCIDAD_MAXIMA")) || 20;  
let RachaMax = Number(localStorage.getItem("METEO_RACHA_MAX")) || 25;

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
let indicesHorasRangoHorario = []; // Contiene los índices válidos (ej: [5, 6, 7, 8, ...])

// Variable global para almacenar todos los despegues (sin filtrar)
let bdGlobalDespegues = [];

let chkMostrarVientoAlturas = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS") === "true"; 

let chkMostrarCizalladura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA") !== "false"; // Por defecto true para que lo vean

// ECMWF
//let chkMostrarPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PRECIPITACION") !== "false";
const chkMostrarPrecipitacion = true; // Siempre activo
let chkMostrarProbPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION") !== "false";
//let chkMostrarBaseNube = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE") !== "false";
let chkMostrarXC = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_XC") !== "false"; // true por defecto
let chkOrdenarPorXC = localStorage.getItem("METEO_CHECKBOX_ORDENAR_POR_XC") === "true"; // false por defecto

// UMBRALES DE CIZALLADURA (Factor multiplicador)
const LIMITES_CIZALLADURA = {
    "180 m": { naranja: 1.8, rojo: 2.3 }, // +80% / +130%
    "120 m": { naranja: 1.6, rojo: 2.0 }, // +60% / +100%
    "80 m":  { naranja: 1.4, rojo: 1.7 }  // +40% / +70%
}

const HorariosMediosActualizacion = ["01:32", "03:02", "06:02", "11:22", "13:32", "16:22", "19:12", "23:22"]; // en UTC-0
const HorariosMediosActualizacionEcmwf = ["00:45", "07:15", "13:05", "19:15"]; // en UTC-0
// Nota: aplico 1 min de más. Buscar: const OFFSET_MS = 1 * 60 * 1000;

let esModoOffline = false; // Nueva variable para controlar el estado de red

const CORTES_DISTANCIA_GLOBAL =[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 9999];

let guiaActiva = false;
let actualizacionesPendientes = [];

let autoSeleccionInicialHecha = false; // bandera de control para la selección o no automática de un día de la semana al arrancar

// 🔴 PROBLEMA MONTAJE BOTONES EN EL ÁREA DE NOTIFICACIONES ANDROID
// Asegúrate de que Capacitor está disponible
// if (window.Capacitor && window.Capacitor.Plugins.StatusBar) {
//   const StatusBar = window.Capacitor.Plugins.StatusBar;
//   StatusBar.setOverlaysWebView({ overlay: false });
//   StatusBar.setBackgroundColor({ color: '#d9ebf9' });
//   StatusBar.setStyle({ style: 'DARK' }); 
// }

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
    // Así evitamos que cualquier evento del slider que se dispare a continuación 
    // crea erróneamente que no hay origen configurado.
    centroLat = lat;
    centroLon = lng;
    localStorage.setItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL', lat);
    localStorage.setItem('METEO_FILTRO_DISTANCIA_LON_INICIAL', lng);

    ponerMarcador(lat, lng);
    
    aplicarFiltrosVisuales();
    
    if(modalMapa) modalMapa.style.display = 'none';
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
                const latInicial = tieneOrigenGuardado ? centroLat : 40.0;
                const lonInicial = tieneOrigenGuardado ? centroLon : -4.0;
                const zoomInicial = tieneOrigenGuardado ? 9 : 6;

                mapaLeaflet = L.map('mapa-selector').setView([latInicial, lonInicial], zoomInicial);
                
                L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://opentopomap.org/" target="_blank">Style OpenTopoMap</a>'
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
            const latInicial = tieneOrigenGuardado ? centroLat : 40.0;
            const lonInicial = tieneOrigenGuardado ? centroLon : -4.0;
            const zoomInicial = tieneOrigenGuardado ? 8 : 6;

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
						htmlContenido: `
                            <div style="text-align: center;">
                            <p style="font-size: 2.5em; margin: 0 0 10px 0; color: #0078d4;"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></p>
							<p>La primera vez se necesita configurar un punto de origen.</p>
							<p>Podrás cambiarlo cuando quieras con el botón <span style='background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block; padding: 0 2px;'><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -0.125em;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span></p>
                            </div>
						`,
						botones:[
							{ texto: 'Cancelar', estilo: 'secundario', onclick: function() { GestorMensajes.ocultar(); } },
                            { texto: 'Configurar origen', onclick: function() { 
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
                if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo');
                const btnReset = document.getElementById('btn-reset-filtro-distancia');
                if (btnReset) btnReset.style.display = 'block';

                construir_tabla(false, false);
            } 
            // Si el botón se toca y ya había un filtro de distancia aplicado (< 9999)
            else if (currentIdx < CORTES_DISTANCIA_GLOBAL.length - 1) {
                construir_tabla(false, false); 
            }
        }
    });
}

// 6. EVENTO UBICACIÓN DEL MÓVIL (GPS) EN EL MAPA
if (btnGpsMapa) {
    btnGpsMapa.addEventListener('click', async function() {
        const isApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
        const textoOriginal = btnGpsMapa.innerHTML;
        btnGpsMapa.innerHTML = "<span>⏳ Buscando...</span>";

        const onLocationFound = (lat, lon) => {
            btnGpsMapa.innerHTML = textoOriginal;
            seleccionarUbicacionYFiltrar(lat, lon, "GPS");
        };

        const onLocationError = (errMsg) => {
            console.error("Error GPS:", errMsg);
            alert("No se pudo obtener la ubicación. " + errMsg);
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
                onLocationError(err.message.includes("disabled") ? "Asegúrate de tener el GPS activado." : "Revisa los permisos.");
            }
        } else { 
            if (!navigator.geolocation) {
                onLocationError("Tu navegador no soporta GPS.");
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
    });
}
window.addEventListener('click', (e) => {
    if (e.target === modalMapa) {
        modalMapa.style.display = 'none';
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
                return { texto: 'Aceptar', accion: () => this.ocultar() };
            case 'SIGUIENTE':
                return { texto: 'Siguiente', accion: () => this.ocultar() }; // Sobrescribir acción al llamar
            case 'TERMINAR':
                return { texto: 'Finalizar', accion: () => this.ocultar() };
            case 'CANCELAR':
                return { texto: 'Cancelar', accion: () => this.ocultar(), claseExtra: 'btn-secundario' };
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
                texto: 'Aceptar',
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
                texto: 'Cancelar',
                estilo: 'secundario',
                onclick: function() {
                    GestorMensajes.ocultar();
                }
            },
            {
                texto: 'Aceptar',
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
                <p>¿Quieres marcar <span style="font-weight:bold;">${cantidad}</span> despegues como favoritos?</p>
            </div>
        `,
        botones: [
            {
				texto: 'Cancelar',
				onclick: function() {
					GestorMensajes.ocultar(); // Cierra el modal
					idsPendientesDeConfirmacion = []; // Limpia memoria
					//mensajeFinalizarEdicionFavoritos();
				},
				estilo: 'secundario'
			},
            { 
                texto: 'Sí, marcar', 
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
                texto: 'Aceptar',
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
        ? `<p style="color: #555; margin-top: 10px;">Puedes verla cuando quieras en:<br><i>⚙️ Ajustes</i> → <i>Guía</i></p>`
        : ''; 

    const botonesModal =[
        {
            texto: forzar ? 'Cancelar' : 'No', 
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
            texto: 'Ver guía',
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
                <p style="font-size: 1.1em; font-weight: bold; margin: 0;">¿Quieres ver una guía visual sobre la<br>Pantalla principal?</p>
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

    // Esto cierra buscadores, resetea filtros de distancia y vuelve a la tabla
    if (typeof clicBotonInicio === 'function') {
        clicBotonInicio();
    }

    guiaActiva = true; //para que no muestre actualización si hay

    const driverObj = window.driver.js.driver({
        
        showProgress: true, 
        progressText: '{{current}} de {{total}}',
        smoothScroll: true,
        overlayClickBehavior: () => {}, 
        overlayColor: 'rgba(0, 0, 0, 0.75)', 
        allowClose: true,      
        stageRadius: 8,   

        nextBtnText: 'Siguiente →',
        prevBtnText: '←',
        doneBtnText: 'Cerrar guía',

        steps: [
            { popover: { title: '🪂 Pantalla principal', description: 'Esta es la pantalla de uso habitual de la aplicación.<br><br>Muestra una tabla con todos los despegues que has seleccionado como favoritos y muestra su pronóstico y puntuación de condiciones (para despegar y para iniciar rutas XC).<br><br>Los despegues están siempre ordenados automáticamente por su puntuación de condiciones para despegar (de mayor a menor).' },
            },

            { element: '.div-paneles-controles-transparente', 
                popover: { title: '🗓️🕜 Selector de rango horario', description: 'Ajusta este deslizador desde ambos extremos para seleccionar el rango horario que te interese.<br><br>La tabla mostrará solo esas horas y la puntuación de condiciones se recalculará para ese intervalo de tiempo concreto.'} },

            { element: '.noUi-value.noUi-value-horizontal.noUi-value-large', 
                popover: { title: '🗓️ Días de la semana', description: 'Estos botones de día de la semana facilitan la selección del rango horario de ese día. Será el uso habitual de la aplicación: echar un vistazo rápido a los despegues "posibles" ese día.<br><br>👉🏽 Voy a seleccionar éste como ejemplo para que veas cómo funciona.'},

                onDeselected: () => {
                    const elementos = document.querySelectorAll('.noUi-value.noUi-value-horizontal.noUi-value-large');
                    if (elementos[0]) { 
                        elementos[0].click(); 
                    }
                }
            },

            {   popover: { title: '🗓️ Día seleccionado', description: 'Ahora la tabla solo muestra ese día y con el rango horario que se ha seleccionado automáticamente.<br><br>💡 Puedes mover los deslizadores a tu rango horario concreto y así la puntuación será más ajustada. Puedes personalizar ese rango horario diario "automático" en ⚙️ Ajustes.'}, },
            
            { element: '.columna-meteo.borde-grueso-abajo.borde-grueso-arriba.borde-grueso-izquierda', 
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size:25px; display: block;">🌦️</span><span>Columna de meteorología</span></div>', description: 'Muestra los datos meteorológicos.<br><br>Selecciona el icono para ver el significado de cada parámetro.'},
            },

            { element: '.columna-meteo.columna-simbolo-fija.borde-grueso-izquierda.celda-altura-4px', 
                popover: { title: '🟩🟧🟥 Fila de Cizalladura / Fiabilidad', description: 'Esta fila especial es un indicador combinado. Es un semáforo de colores que muestra simultáneamente dos datos concurrentes: la Cizalladura de Bajo Nivel y la Fiabilidad del pronóstico de viento a 10 m de altura.'} },

            { element: '.columna-condiciones.borde-grueso-izquierda.borde-grueso-arriba.borde-grueso-abajo', 
                popover: { title: '⭐ Columna de puntuación', description: 'El sistema calcula dos puntuaciones (de 0 a 10) para cada despegue y para el rango horario seleccionado: Condiciones para despegar y Condiciones para mantenerse en térmicas o iniciar Cross Country (XC).<br><br>Los despegues se reordenan automáticamente por puntuación de Condiciones para despegar.<br><br>En ⚙️ Ajustes puedes personalizar tus límites para el cálculo.' } },

            { element: '.btn-info.btn-abajo-izquierda', 
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/info.svg" width="20" height="20" style="display: block;"><span>Información del despegue</span></div>', description: 'Seleccionando esta <img src="icons/info.svg" width="20" height="20" style="vertical-align: middle; margin-bottom: 2px;"> se muestra información más completa del despegue, enlaces a pronósticos de Windy, Meteo-parapente, Meteoblue y un botón para acceder a su mapa.<br><br>💡 El mapa incluye información adicional y varias utilidades que merece la pena explorar.' } },

            { element: '#nav-home',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg><span>Inicio</span></div>', description: 'Muestra la tabla con todos los despegues favoritos. Si hay búsquedas o filtros activos, los desactiva.<br><br>💡 Si te pierdes con algunas funciones, pulsa este botón para ir a la vista "normal".'} },

            { element: '#nav-search',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>Buscar</span></div>', description: 'Muestra una casilla para buscar despegues por su nombre o por su zona administrativa (normalmente será la provincia). Puedes escribir sin tildes para mayor agilidad.'} },

            { element: '#nav-distance',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span>Distancia</span></div>', 
                    description: 'Muestra un deslizador que permite filtrar solo los despegues alrededor de un punto.<br><br>👉🏽 Voy a pulsar ahora ese botón para abrir el filtro.'}
            },

            { element: '#div-filtro-distancia-interno',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span>Distancia</span></div>', 
                    description: 'Es un filtro que te permite mostrar solo los despegues alrededor de un punto.<br><br>💡 Puede servirte para encontrar rápidamente los despegues que estén en un radio de distancia que elijas alrededor de un punto.'},
                    onHighlighted: () => {
                    const panel = document.getElementById('div-filtro-distancia');
                    if (panel && !panel.classList.contains('activo')) {
                        const btn = document.getElementById('nav-distance');
                        if (btn) btn.click();
                    }
                    setTimeout(() => { if (typeof driverObj !== 'undefined') driverObj.refresh(); }, 300);
                }
            },

            { element: '#btn-abrir-geo-menu',
                popover: { title: '<span style="background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block; padding: 0 2px;"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -0.125em;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span> Punto de origen', description: 'Aquí eliges el punto de origen del filtro de distancia.<br><br>Podrás elegir el punto con un mapa o con tu ubicación actual.'},
            },

            { element: '#btn-incluir-no-favs-distancia',
                popover: { title: '<span style="background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block; padding-left: 5px; padding-right: 5px;"><img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">+<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"></span> Incluir no favoritos', description: 'Permite incluir temporalmente en el filtro todos los despegues disponibles (favoritos y no favoritos).<br><br>💡 Sirve para buscar rápidamente condiciones de vuelo en despegues de diferentes zonas fuera de nuestra zona de favoritos.'},
            },

            { element: '#distancia-slider',
                popover: { title: 'Distancia al punto', description: 'Arrastrando este deslizador eliges los kilómetros de distancia.<br><br>La tabla mostrará solo los despegues que estén dentro de ese radio de distancia.' },
                onDeselected: () => {
                    const panel = document.getElementById('div-filtro-distancia');
                    if (panel && panel.classList.contains('activo')) {
                        const btn = document.getElementById('nav-distance');
                        if (btn) btn.click(); // Cierra el panel
                    }
                }
            },

            { element: '#nav-map',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg><span>Mapa</span></div>', description: 'Mapa de despegues de parapente con múltiple información: búsqueda de despegues, filtros por orientación, por nº de vuelos, por año del último vuelo, por distancia media, mapa de calor con más de 1,3 millones de puntos exactos de despegues registrados y mucha otra información.'} },

            { element: '#nav-settings',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg><span>Ajustes</span></div>', description: 'Aquí se puede <b>Editar favoritos</b> (para añadir o quitar tus despegues habituales), personalizar parámetros, activar opciones y ver información sobre la actualización de los datos meteorológicos.<br><br>💡 Para cada opción o dato, tienes un botón de información <img src="icons/info.svg" width="20" height="20" style="vertical-align: middle; margin-bottom: 2px;">.'} }
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
    
    if (!forzar && localStorage.getItem('METEO_GUIA_FAVORITOS_VISTA') === 'true') {
        return; 
    }

    // Eliminamos el checkbox y ajustamos el texto informativo
    const htmlAyuda = !forzar 
        ? `<p style="color: #555; margin-top: 10px;">Puedes verla cuando quieras con el botón <img src="icons/icono_ayuda_60.webp" width="18" height="18" style="vertical-align:middle;"> de esta pantalla.</p>`
        : ''; 

    const botonesModal =[
        {
            texto: forzar ? 'Cancelar' : 'No',
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
            texto: 'Ver guía',
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
                <p style="font-size: 1.1em; font-weight: bold; margin: 0;">¿Quieres ver una guía visual sobre esta pantalla?</p>
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

    const driverObj = window.driver.js.driver({
        
        showProgress: true, 
        progressText: '{{current}} de {{total}}',
        smoothScroll: true,
        overlayClickBehavior: () => {}, 
        overlayColor: 'rgba(0, 0, 0, 0.75)', 
        allowClose: true,      
        stageRadius: 8,   

        nextBtnText: 'Siguiente →',
        prevBtnText: '←',
        doneBtnText: 'Cerrar guía',

        steps: [
            {  
                popover: { title: '🪂 Pantalla de edición de despegues favoritos', description: 'En esta pantalla tienes todos los despegues disponibles actualmente. Aquí seleccionas los despegues que usas habitualmente. La pantalla de uso normal de la aplicación mostrará solo estos despegues favoritos.<br><br>Realmente podrías seleccionar todos pero, según dispositivo, ralentizará luego las búsquedas y su uso diario.<br><br>Por el momento están los despegues de España, Portugal, Pirineos y parte de Alpes. Esta aplicación es un proyecto en crecimiento.'},            
            },

            { element: '#tabla tbody tr:nth-child(1) td:first-child', 
                popover: { title: '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"> ↔ <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favoritos', description: 'Marca o desmarca aquí tus despegues favoritos.<br><br>Los cambios se guardan automáticamente.'} },

            { element: '#tabla thead tr:first-child th:first-child', 
                popover: { title: '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"> ↔ <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Cabecera favoritos', description: 'Permite marcar o desmarcar de una sola vez todos los despegues visibles actualmente en la tabla.<br><br>💡 Ejemplo: con el botón "Buscar" filtras los de "Huesca" y los marcas todos. O con el botón "Distancia" filtras los que estén a 50 km de distancia de tu casa y los marcas todos.' } },

            { element: '.btn-info.btn-abajo-izquierda', 
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/info.svg" width="20" height="20" style="display: block;"><span>Información del despegue</span></div>', description: 'Muestra información más completa del despegue y un botón para acceder a su mapa.' } },

            { element: '#buscador-wrapper',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>Buscar</span></div>', description: 'Busca despegues escribiendo su región, su provincia o su nombre. Puedes escribir sin tildes para mayor agilidad.'} },

            { element: '#div-filtro-distancia-interno',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span>Distancia</span></div>', 
                    description: 'Es un filtro que te permite mostrar solo despegues alrededor de un punto.<br><br>💡 Puede servirte para encontrar rápidamente los despegues que estén en un radio de distancia que elijas alrededor de un punto.'} },

            { element: '#btn-abrir-geo-menu',
                popover: { title: '<span style="background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block; padding: 0 2px;"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -0.125em;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span> Punto de origen', description: 'Con este botón eliges el centro del radio de búsqueda por distancia.<br><br>Podrás elegir el punto con un mapa o con tu ubicación actual.'} },

            { element: '#distancia-slider',
                popover: { title: 'Distancia al punto', description: 'Arrastrando este deslizador eliges los kilómetros de distancia máxima.'} },

            { element: '#btn-filtro-favoritos-toggle',
                popover: { 
                    title: '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"> ↔ <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Ver solo favoritos</span></div>', 
                    description: 'Alterna entre ver solo los despegues favoritos o ver todos los despegues.<br><br>💡 Si tienes ya favoritos, puede servirte para verlos juntos fácilmente y desmarcar alguno.'} 
            },

            { element: '#btn-desmarcar-favoritos',
                popover: { 
                    title: '<div style="display: flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path><line x1="5" y1="5" x2="19" y2="19" stroke="red" stroke-width="3"></line></svg><span>Desmarcar todos los favoritos</span></div>', 
                    description: 'Desmarca de una sola vez todos los favoritos actuales, para luego empezar de nuevo a marcar favoritos.'} 
            },

            { element: '#btn-abrir-favoritos',
                popover: { title: '📂 Importar favoritos', description: 'Abre un archivo de despegues favoritos.' } },

            { element: '#btn-guardar-favoritos',
                popover: { title: '💾 Exportar favoritos', description: 'Guarda un archivo con los despegues favoritos actuales.<br><br>Nota: Los favoritos realmente se guardan automáticamente cada vez que marcas uno. Este botón sirve para hacer una copia de todos en un archivo externo (como backup o para compartirlo). <br><br>💡 Si te mueves por varias zonas de vuelo distantes, puede interesarte tener los favoritos de cada zona guardados en archivos diferentes.' } },

            { element: '#btn-guia-edicion-favoritos',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/icono_ayuda_60.webp" width="20" height="20" style="display: block;"><span>Guía rápida</span></div>', description: 'Muestra esta guía sobre edición de despegues favoritos.' } },

            { element: '#btn-finalizar-edicion-favoritos',
                popover: { title: '🏁 Finalizar edición de favoritos', description: 'Sale a la pantalla de uso normal de la aplicación, que mostrará la tabla con tus favoritos, su pronóstico y puntuación.' } }
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

function activarEdicionFavoritos() {

    // 1. LIMPIAR BÚSQUEDA Y OTROS FILTROS PREVIOS
    if (typeof limpiarBuscador === 'function') {
        limpiarBuscador(); 
    }
    resetFiltroDistancia(false);

    cambiarVista('tabla'); 

    // 2. ILUMINAR BOTÓN DE AJUSTES EN EL MENÚ INFERIOR
    const btnSettings = document.getElementById('nav-settings');
    if (btnSettings && typeof window.activarMenuInferior === 'function') {
        window.activarMenuInferior(btnSettings);
    }

    // Resetear visualmente el botón de filtro de favoritos
    const btnFavsTog = document.getElementById('btn-filtro-favoritos-toggle');
    if (btnFavsTog) {
        btnFavsTog.classList.remove('filtro-aplicado', 'activo');
        const heartSvg = btnFavsTog.querySelector('.heart-icon-svg');
        if (heartSvg) {
            heartSvg.setAttribute('fill', 'none');
            heartSvg.setAttribute('stroke', 'currentColor');
        }
    }

    modoEdicionFavoritos = true;
    soloFavoritos = false;

    // 📍 1. ABRIR FILTRO DISTANCIA
    const panelDistancia = document.getElementById("div-filter-distancia") || document.getElementById("div-filtro-distancia");
    if (panelDistancia) {
        panelDistancia.classList.add("activo");
        // Forzar actualización del slider de distancia
        setTimeout(() => {
            const sliderDist = document.getElementById('distancia-slider');
            if (sliderDist && sliderDist.noUiSlider) sliderDist.noUiSlider.updateOptions({}, true);
        }, 50);
    }

    // 🔍 2. ABRIR BUSCADOR (Forzado manual para evitar que alternardivDistancia lo cierre)
    const searchContainer = document.getElementById('floating-search-container');
    if (searchContainer) {
        searchContainer.classList.remove('floating-search-hidden');
        buscadorVisible = true; // Actualizamos la variable global del buscador
    }
    if (inputBuscador) {
        inputBuscador.placeholder = "🔍 Buscar región, provincia o despegue...";
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

function filtroVerSoloFavoritos() {
    const btn = document.getElementById('btn-filtro-favoritos-toggle');
    const iconContainer = document.getElementById('icon-filter-favs');
    const heartSvg = btn.querySelector('.heart-icon-svg');
    const favoritosActuales = obtenerFavoritos();

    if (!btn.classList.contains("activo") && favoritosActuales.length === 0) {
        mensajeModalAceptar('', '<p>No tienes despegues marcados como favoritos ♥️.</p>');
        return;
    }

    btn.classList.toggle("activo");
    const estaActivo = btn.classList.contains("activo");
    
    if (estaActivo) {
        soloFavoritos = true; 
        btn.classList.add('filtro-aplicado');
        // Pintamos el corazón de rojo relleno
        heartSvg.setAttribute('fill', '#ff0000');
        heartSvg.setAttribute('stroke', '#ff0000');
    } else {
        soloFavoritos = false;
        btn.classList.remove('filtro-aplicado');
        // Corazón vacío original
        heartSvg.setAttribute('fill', 'none');
        heartSvg.setAttribute('stroke', 'currentColor');
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
                <p>¿Quieres desmarcar todos tus favoritos?</p>
            </div>
        `,
        botones:[
            {
                texto: 'Cancelar',
                estilo: 'secundario',
                onclick: function() {
                    GestorMensajes.ocultar();
                }
            },
            {
                texto: 'Sí, desmarcar',
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
                        thFavorito.title = "Marcar todos los despegues visibles como favoritos";
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
                        
                        if (typeof mensajeAvisoRecarga === 'function') {
                            mensajeAvisoRecarga('', `<div style="text-align: center;">
                            <p>✅ Se han importado ${nuevosFavoritos.length} despegues favoritos</p>
                        </div>`);
                        } else {
                            location.reload();
                        }
                    } else {
                        alert('⚠️ El archivo estaba vacío.');
                    }
                } catch (error) {
                    alert('⚠️ Error al procesar el archivo.');
                }
                
                delete window.accionCargarFavoritos; 
            };
            reader.readAsText(file);
        };
        input.click();
    };

    mensajeModalAceptarCancelar(
        '', 
        '<div style="text-align: center;"><p style="font-size: 2em; margin: 0;">📂</p><p><b>⚠️ ATENCIÓN:</b> Importar favoritos sustituirá los actuales.</b><br><br>Si los quieres conservar, cancela este mensaje y usa el botón 💾 <i>Exportar favoritos</i>.</p>', 
        'accionCargarFavoritos'
    );
}

async function guardarFavoritos() {
    // Aseguramos que guardamos un txt con puros números
    const favoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
        
    if (favoritos.length === 0) {
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: '<p style="text-align: center;">No hay despegues favoritos para exportar</p>',
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

            const { value, cancelled } = await Dialog.prompt({
                title: '💾 Exportar favoritos',
                message: '\nCambia el nombre del archivo o acepta éste:',
                inputText: nombreArchivo,
                okButtonTitle: 'Guardar',
                cancelButtonTitle: 'Cancelar'
            });

            if (cancelled) return;

            if (value && value.trim() !== '') {
                nombreArchivo = value.trim();
                if (!nombreArchivo.toLowerCase().endsWith('.txt')) {
                    nombreArchivo += '.txt';
                }
            }

            await Filesystem.writeFile({
                path: nombreArchivo, 
                data: contenido,
                directory: 'DATA', 
                encoding: 'utf8',
                recursive: true
            });

            const resultCache = await Filesystem.writeFile({
                path: nombreArchivo, 
                data: contenido,
                directory: 'CACHE', 
                encoding: 'utf8',
                recursive: true
            });

            const confirmResult = await Dialog.confirm({
                title: '✅ Favoritos guardados con éxito',
                text: 'Aquí tienes mis despegues favoritos de Fly Decision:',
                message: `\n${nombreArchivo}\n\n¿Quieres compartirlo ahora?`,
                okButtonTitle: 'Sí, compartir',
                cancelButtonTitle: 'No'
            });

            if (confirmResult.value) {
                const canShare = await Share.canShare();
                if (canShare.value) {
                    try {
                        await Share.share({
                            title: 'Mis despegues favoritos de Fly Decision',
                            text: 'Aquí tienes mis despegues favoritos:',
                            files: [resultCache.uri], 
                            dialogTitle: 'Compartir con...',
                        });
                    } catch (shareError) {
                        console.error("Error nativo al compartir:", shareError);
                        alert("No se pudo abrir el menú de compartir. Intenta usar otro método.");
                    }
                } else {
                    alert("Tu dispositivo no permite compartir archivos directamente. Asegúrate de tener Telegram instalado.");
                }
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

        if (num === 1) {
            texto = `<b>${num}</b> <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favorito`;
        } else {
            texto = `<b>${num}</b> <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favoritos`;
        }
        
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

// Marcar/Desmarcar favoritos masivamente mediante la columna Favoritos
let idsPendientesDeConfirmacion = [];
let estadoPendienteDeAplicar = false; // true = marcar, false = desmarcar

function gestionarClickMasivoFavoritos() {
    
    if (!modoEdicionFavoritos) {
		mensajeModalAceptar('','<p>Para marcar o desmarcar un grupo de favoritos, utiliza la opción:</p><p>Menú ☰ &nbsp;&nbsp;➔&nbsp;&nbsp; [<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favoritos]</p>');
        return;
    }

    const tabla = document.getElementById('tabla');
    const tbody = tabla.tBodies[0];
    if (!tbody) return;

    const filas = tbody.rows;
    let idsVisibles = [];

    // CÁLCULO DINÁMICO DE FILAS POR BLOQUE 
    let filasPorDespegue = 5; // Base: Meteo general + Precipitación + Vel + Racha + Dir
    if (chkMostrarProbPrecipitacion) filasPorDespegue++;
    //if (chkMostrarBaseNube) filasPorDespegue++;
    if (chkMostrarVientoAlturas) filasPorDespegue += 3;
    if (chkMostrarXC) filasPorDespegue += 3;
    if (chkMostrarCizalladura) filasPorDespegue++;
    //if (chkMostrarPrecipitacion) filasPorDespegue++;

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
            ? "Desmarcar todos los despegues visibles como favoritos" 
            : "Marcar todos los despegues visibles como favoritos";
    }

    // Usamos idsAfectados para buscar solo las filas necesarias, 
    // en lugar de iterar toda la tabla de nuevo si es posible, 
    // pero iterar la tabla es más seguro para asegurar sincronía visual.
    const tabla = document.getElementById('tabla');
    const tbody = tabla.tBodies[0];
    const filas = tbody.rows;
    const setAfectados = new Set(idsAfectados.map(Number)); // Búsqueda O(1)

    // CÁLCULO DINÁMICO DE FILAS POR BLOQUE 
    let filasPorDespegue = 5; // Base: Meteo general + Precipitación + Vel + Racha + Dir
    if (chkMostrarProbPrecipitacion) filasPorDespegue++;
    //if (chkMostrarBaseNube) filasPorDespegue++;
    if (chkMostrarVientoAlturas) filasPorDespegue += 3;
    if (chkMostrarXC) filasPorDespegue += 3;
    if (chkMostrarCizalladura) filasPorDespegue++;
    //if (chkMostrarPrecipitacion) filasPorDespegue++;

    for (let i = 0; i < filas.length; i += filasPorDespegue) {
        
        const filaPrincipal = filas[i];

        if (!filaPrincipal) break;
        
        let celda = filaPrincipal.querySelector('.columna-favoritos');
        if (!celda) celda = filaPrincipal.cells[0];

        // Verificamos si esta fila es una de las afectadas
        if (celda && celda.dataset.id && setAfectados.has(Number(celda.dataset.id))) {
            
            celda.innerHTML = nuevoEstadoEsFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
            celda.title = nuevoEstadoEsFavorito ? "Quitar de favoritos" : "Añadir a favoritos";
            
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
        mensajeModalAceptar('', 
            '<p>Es necesario marcar al menos un despegue favorito ♥️</p><p>Si quieres, puedes consultar la guía rápida de esta pantalla con el botón <img src="icons/icono_ayuda_60.webp" width="20" height="20" style="vertical-align:middle;" alt="Guía"></p>'
        );
        return false; 
    }

    // 📍 CERRAR FILTRO DISTANCIA
    // 1. Resetear el Filtro de Distancia (Valores y Variables)
    if (typeof resetFiltroDistancia === 'function') {
        // Pasamos 'false' para que no reconstruya la tabla todavía (lo haremos al final)
        resetFiltroDistancia(false); 
    }

    // 🔍 CERRAR BUSCADOR
    const searchContainer = document.getElementById('floating-search-container');
    if (searchContainer) {
        searchContainer.classList.add('floating-search-hidden');
        buscadorVisible = false;
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
    
    // Al limpiar el buscador aquí, ya se restaurará el placeholder normal
    limpiarBuscador(); 
    
    construir_tabla(); 

    setTimeout(() => { sugerirGuiaPrincipal(); }, 500);

    if (ignorarMenu !== true) {
        const navHome = document.getElementById('nav-home');
        if (navHome && typeof window.activarMenuInferior === 'function') {
            window.activarMenuInferior(navHome);
        }
    }

    return true; 
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

// ---------------------------------------------------------------
// 🔴 SLIDERS. RANGO HORARIO. Lógica para poder hacer clic en los pips de los días semanales y seleccionar así sus rango horario completo (tiene en cuenta chk día/noche) con un toque
// ---------------------------------------------------------------

const chkDiaNoche = document.getElementById('chkDiaNoche');

// AHORA RECIBE EL ELEMENTO DEL SLIDER COMO ARGUMENTO
function clickOnPip(sliderElement) {
    // 1. Obtener el índice de inicio (el pip clicado)
    const startSliderIndex = Number(this.getAttribute('data-value'));

    // --- Gestión de estilos visuales ---
    const pips = sliderElement.querySelectorAll('.noUi-value');
    pips.forEach(p => p.classList.remove('pip-activo')); // Limpiar todos
    this.classList.add('pip-activo'); // Marcar el actual
    
    // 2. Obtener los índices de inicio de día guardados
    const dayStartIndices = sliderElement.dayStartIndices || [];
    
    // 3. Determinar la posición del día clicado en el array de índices
    const currentDayIndexInArray = dayStartIndices.indexOf(startSliderIndex);
    
    if (currentDayIndexInArray === -1) return; 

    // --- CÁLCULO DEL RANGO COMPLETO DEL DÍA (Tu lógica original) ---
    let endSliderIndex;
    const nextDayIndexInArray = currentDayIndexInArray + 1;
    
    if (nextDayIndexInArray < dayStartIndices.length) {
        endSliderIndex = dayStartIndices[nextDayIndexInArray] - 1;
    } else {
        endSliderIndex = sliderElement.noUiSlider.options.range.max;
    }

    let finalStart = startSliderIndex;
    let finalEnd = endSliderIndex;

    const rawInicio = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO');
    const rawFin = localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN');

    // Si el usuario HA movido el slider de configuración alguna vez (no es null)
    if (rawInicio !== null && rawFin !== null) {
        const prefInicio = parseInt(rawInicio);
        const prefFin = parseInt(rawFin);
        
        const indices = window.indicesHorasRangoHorario;
        const horas = window.horasCrudasRangoHorario;

        // Recorremos los índices de este día para aplicar el recorte de horas preferidas
        for (let i = startSliderIndex; i <= endSliderIndex; i++) {
            const idxReal = indices[i];
            const fecha = new Date(horas[idxReal].endsWith('Z') ? horas[idxReal] : horas[idxReal] + 'Z');
            const h = fecha.getHours();
            
            // Si la preferencia es 0, nos quedamos en el borde izquierdo (startSliderIndex)
            if (prefInicio === 0) {
                finalStart = startSliderIndex;
            } else if (h < prefInicio) {
                finalStart = i + 1; 
            }
            
            if (h <= prefFin) {
                finalEnd = i;
            }
        }
        
        // Seguridad para no cruzar valores
        if (finalStart > endSliderIndex) finalStart = endSliderIndex;
        if (finalEnd < finalStart) finalEnd = finalStart;
    }

    // 5. Establecer los valores finales en el slider
    sliderElement.noUiSlider.set([finalStart, finalEnd]); 
    
    if (window.sliderHorasValues) {
        window.sliderHorasValues = [finalStart, finalEnd];
    }
    
    construir_tabla();
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
        
        // Obtenemos qué día es el último del array
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
    
    const pipsFormatter = {
        to: function(val) {
            const horas = window.horasCrudasRangoHorario;
            const indices = window.indicesHorasRangoHorario;
            const indiceReal = indices[Math.round(val)];
            if (!horas || horas.length === 0 || indiceReal === undefined) return "";
            const horaString = horas[indiceReal]; 
            const d = new Date(horaString.endsWith('Z') ? horaString : horaString + 'Z');
            const diasSemanaCorta = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
            return diasSemanaCorta[d.getDay()] + " " + d.getDate();
        },
        from: (v) => Number(v)
    };
    
    const tooltipFormatter = {
        to: function(val) {
            const horas = window.horasCrudasRangoHorario;
            const indices = window.indicesHorasRangoHorario;
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

        // --- 🚀 CÁLCULO PREVIO DEL RANGO INICIAL DIRECTO ---
        let startIndices = [0, maxSteps]; // Por defecto todo

        if (!autoSeleccionInicialHecha) {
            const ahora = new Date();
            const horaActual = ahora.getHours();
            let diaObjetivo = (horaActual >= 16) ? 1 : 0;

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

                startIndices = [finalStart, finalEnd];
                autoSeleccionInicialHecha = true; // Bloqueamos para que no lo vuelva a hacer al actualizar
            }
        }

        // Crear el slider ya con el rango recortado
        noUiSlider.create(sliderHoras, {
            start: startIndices, 
            connect: true,
            step: 1,
            range: { min: 0, max: maxSteps },
            tooltips: [tooltipFormatter, tooltipFormatter],
            format: { to: (v) => Math.round(v), from: (v) => Number(v) },
            pips: {
                mode: 'values',
                values: pipIndices,
                density: 100,
                format: pipsFormatter
            }
        });
        
        // --- Iluminar el botón inicial en el arranque ---
        if (autoSeleccionInicialHecha) {
            const ahora = new Date();
            const horaActual = ahora.getHours();
            let diaObjetivo = (horaActual >= 16) ? 1 : 0;
            
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

        // Sincronizar la variable global de valores inmediatamente
        window.sliderHorasValues = startIndices;

        adjuntarEventoPips(sliderHoras);

        // Listener de cambios manuales
		sliderHoras.noUiSlider.on('change', function(values) {
			const valoresNuevos = values.map(Number);
			const haCambiado = valoresNuevos.some((val, i) => val !== window.sliderHorasValues[i]);
			if (haCambiado) {
				window.sliderHorasValues = valoresNuevos;
				construir_tabla(false, false);
			}
		});

        sliderHoras.noUiSlider.on('slide', function () {
            // --- Quitar azul si la usuaria mueve los tiradores manuales ---
            const pips = sliderHoras.querySelectorAll('.noUi-value');
            pips.forEach(p => p.classList.remove('pip-activo'));

            if (typeof window.Capacitor !== 'undefined') { 
                window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); 
            }
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
            
            // Guardamos el nuevo timestamp de referencia para la próxima vez
            sliderHoras.dayStartTimestamp = primerTimestampNuevo;
            sliderHoras.dayStartIndices = pipIndices;
            
            let newStart = [0, maxSteps];
            
            // Intentamos mantener la selección del usuario si tiene sentido
            if (window.sliderHorasValues) {
                let v1 = Math.min(window.sliderHorasValues[0], maxSteps);
                let v2 = Math.min(window.sliderHorasValues[1], maxSteps);
                if (v2 < v1) v2 = v1; 
                newStart = [v1, v2];
            }

            // FORZAMOS LA ACTUALIZACIÓN DE OPCIONES
            // Al pasarle 'pips' de nuevo, redibujará las etiquetas con los datos nuevos de window.horasCrudasRangoHorario
            sliderHoras.noUiSlider.updateOptions({
                range: { min: 0, max: maxSteps },
                start: newStart,
                pips: {
                    mode: 'values',
                    values: pipIndices,
                    density: 100,
                    format: pipsFormatter // Este formatter leerá los nuevos datos globales
                }
            });
            
            // Solo si ha cambiado la longitud reseteamos posiciones, 
            // si solo han cambiado las fechas (mismo número de horas), 
            // updateOptions a veces respeta la posición, pero por seguridad:
            // sliderHoras.noUiSlider.set(newStart); // Opcional, según comportamiento deseado
            
            adjuntarEventoPips(sliderHoras);            
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
// 🔴 FUNCIONES GLOBALES (hay otras más, pero éstas tienen que estar antes de construir la tabla)
// ---------------------------------------------------------------

function createOrientationSVG(orientacionesStr) {
	
    const ALL_SEGMENTS = [
        'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'
    ];
    
    // 2. Colores y dimensiones
    const size = 23; // Lo he subido un poco para que se vea mejor en la tabla
    const radius = 8; 
    const strokeWidth = 1; 
    const colorBorde = "#666"; 
    const colorFondoInactivo = "white"; 
    const colorSegmentoActivo = "#19ed86"; 

    // Parsear metadata formato "N, NO, S". Separamos por coma y quitamos espacios en blanco
    const activeOrientations = new Set(
        (orientacionesStr || '').split(',').map(s => s.trim())
    );

    let svg = `<svg width="${size}" height="${size}" viewBox="-10 -10 20 20" style="vertical-align: middle; display:inline-block; transform: rotate(-90deg);">`;
    
    // Círculo base
    svg += `<circle cx="0" cy="0" r="${radius}" fill="${colorFondoInactivo}" stroke="${colorBorde}" stroke-width="${strokeWidth}" />`;

    // Generar segmentos
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
    return svg;
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

function gestionarMascarasScroll() { //Obsoleta en reserva
    const contenedor = document.getElementById("contenedor-paneles-scroll");
    
    if (!contenedor) return;

    // 1. Datos métricos
    const scrollTop = contenedor.scrollTop; // Cuánto hemos bajado
    const scrollHeight = contenedor.scrollHeight; // Altura total del contenido
    const clientHeight = contenedor.clientHeight; // Altura de la ventana visible
    
    // Umbral de tolerancia (pixeles) para considerar que ha tocado el borde
    const umbral = 2; 

    // 2. Lógica ARRIBA: ¿Hemos bajado más del umbral?
    // Si scrollTop > 0, hay contenido escondido arriba -> Ponemos 40px de fade
    const mascaraArriba = scrollTop > umbral ? "40px" : "0px";

    // 3. Lógica ABAJO: ¿Queda contenido abajo?
    // Si (scroll total - lo bajado) es mayor que la altura visible -> Ponemos 40px de fade
    const hayContenidoAbajo = (scrollHeight - scrollTop) > (clientHeight + umbral);
    const mascaraAbajo = hayContenidoAbajo ? "40px" : "0px";

    // 4. Aplicamos los cambios a las variables CSS del contenedor
    contenedor.style.setProperty("--mask-top", mascaraArriba);
    contenedor.style.setProperty("--mask-bottom", mascaraAbajo);
}

function setModoEnfoque(activarBlur) {
    // Array con TODOS los elementos de fondo que queremos desenfocar
    const selectores = [
        ".contenedor-principal-tabla",
        ".div-filtro-horario",
        ".div-filtro-condiciones", 
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
    // 1. Recopilamos todas las configuraciones de la app
    const perfilUsuario = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Solo cogemos las variables de la app para no mezclar con otras cosas
        if (key && key.startsWith("METEO_")) {
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
            const { value, cancelled } = await Dialog.prompt({
                title: '💾 Exportar configuración',
                message: '\nSe exportarán tus favoritos y toda tu configuración (límites de viento, opciones visuales, etc.).',
                inputText: nombreArchivo,
                okButtonTitle: 'Guardar',
                cancelButtonTitle: 'Cancelar'
            });

            if (cancelled) return;
            if (value && value.trim() !== '') nombreArchivo = value.trim();

            await Filesystem.writeFile({
                path: nombreArchivo, 
                data: contenido,
                directory: 'DATA', 
                encoding: 'utf8',
                recursive: true
            });

            const resultCache = await Filesystem.writeFile({
                path: nombreArchivo, 
                data: contenido,
                directory: 'CACHE', 
                encoding: 'utf8',
                recursive: true
            });

            const confirmResult = await Dialog.confirm({
                title: '✅ Se ha guardado la configuración',
                message: `\n${nombreArchivo}\n\n¿Quieres compartirla ahora?`,
                okButtonTitle: 'Sí, compartir',
                cancelButtonTitle: 'No'
            });

            if (confirmResult.value) {
                const canShare = await Share.canShare();
                if (canShare.value) {
                    await Share.share({
                        title: 'Configuración Fly Decision',
                        files: [resultCache.uri], 
                        dialogTitle: 'Guardar en...',
                    });
                }
            }
        } catch (error) {
            alert("Error al guardar en Android: " + error.message);
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

                    localStorage.clear(); 
                    
                    // Verificamos de forma básica que es un backup válido de la app
                    let keysImportadas = 0;
                    for (const key in perfilImportado) {
                        if (key.startsWith("METEO_")) {
                            localStorage.setItem(key, perfilImportado[key]);
                            keysImportadas++;
                        }
                    }
                    if (keysImportadas > 0) {
                        if (typeof mensajeAvisoRecarga === 'function') {
                            mensajeAvisoRecarga(``, `<div style="text-align: center;">
                            <p>✅ Se ha importado la configuración</p>
                        </div>`);
                        } else {
                            alert("✅ Se ha importado la configuración");
                            location.reload();
                        }
                    } else {
                        alert('⚠️ El archivo no parece ser una copia de seguridad válida de Fly Decision.');
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
        '<div style="text-align: center;"><p style="font-size: 2em; margin: 0;">📂</p><p><b>⚠️ ATENCIÓN:</b> Importar un archivo de configuración sustituirá toda tu configuración actual y despegues favoritos.</b></p>', 
        'accionCargarPerfil'
        );
    }
}

function mostrarAvisoActualizacionMeteo(modelos) {
    if (!modelos || modelos.length === 0) return;

    // Unimos los nombres de los modelos con "y" (Ej: "Météo-France" o "Météo-France y ECMWF")
    const textoModelos = modelos.join(' y ');

    if (typeof mensajeModalAceptarCancelar === 'function') {
        mensajeModalAceptarCancelar(
            '', 
            `<p>ℹ️ Hay nuevos datos meteorológicos de:</p><p><b>${textoModelos}</b></p><p>¿Actualizar ahora?</p>`, 
            'recargarPagina'
        );
    }
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


async function construir_tabla(forzarRecarga = false, silencioso = false) {
	
	if (!silencioso) {
        mostrarLoading();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); // Pausa técnica solo si mostramos loader
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

        // CASO A: Primera visita (Usuaria nueva)
        if (!localStorage.getItem("METEO_PRIMERA_VISITA_HECHA") && 
            !localStorage.getItem("METEO_FAVORITOS_LISTA") && 
            !modoEdicionFavoritos) { 
            
            localStorage.setItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ", "true");
            localStorage.setItem("METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO", "10");
            localStorage.setItem("METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN", "20");
            localStorage.setItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS", "true");
            chkMostrarVientoAlturas = true;
            if (document.getElementById("chkMostrarVientoAlturas")) document.getElementById("chkMostrarVientoAlturas").checked = true; //PARA FORZAR EL CHECKBOX VISUAL
            localStorage.setItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA", "true");
            chkMostrarCizalladura = true;
            if (document.getElementById("chkMostrarCizalladura")) document.getElementById("chkMostrarCizalladura").checked = true; ////PARA FORZAR EL CHECKBOX VISUAL
            
            soloFavoritos = false;
            modoEdicionFavoritos = true; 

            document.body.classList.add('modo-edicion-tabla'); 
            const divMenu = document.getElementById('div-menu');
            if (divMenu) divMenu.classList.add('mode-editing');

            const panelHorario = document.querySelector('.div-filtro-horario');
            if (panelHorario) panelHorario.style.display = 'none';

            // Mensaje modal: La tabla se generará detrás, pero el modal estará encima.
            // mostrarConfiguracionInicial();

			// Asistente de configuración inicial. Paso 5 Guía rápida
			// ==========================================================
			const mostrarPaso6 = function() {
				GestorMensajes.mostrar({
					tipo: 'modal',
					htmlContenido: `
						<p style="font-size: 1.2em; font-weight: bold; text-align:center;">👍 ¿Qué hago ahora?</p>
						<p>Tienes que marcar tus despegues favoritos.</p>
					`,
					botones: [
					{
						texto: '←',
						estilo: 'secundario',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso5(); 
						}
					},
					{
						texto: 'Marcar favoritos →',
						onclick: function() {
							GestorMensajes.ocultar();
							//modoEdicionFavoritos = true; // Pasamos a modo edición
							//construir_tabla(); // Recargamos para que entre en la lógica de estado > el "CASO B" y muestre el aviso pequeño 
							activarEdicionFavoritos();
                            return;
						}
					}]
				});
			};

			// Asistente de configuración inicial. Paso 4 Guía rápida
			// ==========================================================
			const mostrarPaso5 = function() {
				GestorMensajes.mostrar({
					tipo: 'modal',
					htmlContenido: `
						<p style="font-size: 1.2em; font-weight: bold; text-align:center;">️👉 Ten en cuenta...</p>
						<p>👉 La tabla mostrará solo los despegues favoritos. Puedes marcarlos todos si lo necesitas, pero puede ralentizar el uso según tu dispositivo.</p>
						<p>👉️ La tabla estará siempre ordenada automáticamente por la puntuación de condiciones, de mejor (10) a peor (0).</p>
						<p>👉️ Por el momento no se muestra el dato CBH (base de nube), necesario para saber si estará cubierto el despegue a esa hora (está solicitado a Open-meteo y pendiente). Antes de volar, como sabes, hay que analizar muchos más datos.</p>
						<p>👉️ Por el momento el ámbito es España, Portugal, Pirineos (incluyendo la parte francesa) y parte de Alpes franceses y suizos.</p>
					    `,
					botones: [
					{
						texto: '←',
						estilo: 'secundario',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso4(); 
						}
					},
					{
						texto: 'Siguiente →',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso6(); 
						}
					}]
				});
			};

			// Asistente de configuración inicial. Paso 3 Guía rápida
			// ==========================================================
			const mostrarPaso4 = function() {
				GestorMensajes.mostrar({
					tipo: 'modal',
					htmlContenido: `
						<p style="font-size: 1.2em; font-weight: bold; text-align:center;">🤔 ¿Es complicado?</p>
						<p>✅ <b>Uso básico</b>: selecciona tus despegues favoritos la primera vez y ya tendrás siempre la tabla con sus pronósticos y su análisis automático para cada día.</p>
						<p>✅ <b>Uso intermedio</b>: puedes seleccionar un rango de tiempo (días u horas) y ver la puntuación automática de condiciones para ese intervalo. Puedes filtrar los despegues por puntuación de condiciones y por radio de distancia a tu casa o un lugar cualquiera.</p>
						<p>✅ <b>Uso avanzado</b>: puedes personalizar en ⚙️ <i>Configuración</i> los límites predeterminados de viento medio (mínimo, ideal y máximo) y rachas máximas. Tus preferencias se usarán para el análisis, coloreado y puntuación de las condiciones.</p>
						`,
					botones: [
					{
						texto: '←',
						estilo: 'secundario',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso3(); 
						}
					},
					{
						texto: 'Siguiente →',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso5(); 
						}
					}]
				});
			};

			// Asistente de configuración inicial. Paso 2 Guía rápida
			// ==========================================================
			const mostrarPaso3 = function() {
				GestorMensajes.mostrar({
					tipo: 'modal',
					htmlContenido: `
					<p>💨️ <b>Datos meteorológicos:</b> pronóstico por horas para 4 días (96h). Se actualiza 8 veces al día con los datos oficiales que emite Météo-France de los modelos Arome-HD 1.3km (0-48h) y Arpege 7km (48-96h) y 4 veces al día con los datos del ECMWF (0-96h).</p>
					<p>🆓 <b>Coste y privacidad:</b> gratuita 100%, sin suscripciones, sin publicidad y sin rastreo (cookies, telemetría,...). Tus configuraciones se guardan en tu navegador de forma privada. Es un proyecto libre y abierto, operativo desde 2026 y en evolución.</p>
				    	`,
					botones: [
					{
						texto: '←',
						estilo: 'secundario',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso2(); 
						}
					},
					{
						texto: 'Siguiente →',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso4(); 
						}
					}]
				});
			};

			// Asistente de configuración inicial. Paso 1 Guía rápida
			// ==========================================================
			const mostrarPaso2 = function() {
				GestorMensajes.mostrar({
					tipo: 'modal',
                    htmlContenido: `
                        <p style="font-size: 1.2em; font-weight: bold; text-align:center;">🪂 Fly Decision. Análisis automático del pronóstico meteorológico para vuelo en parapente.</p>
                        <p>🙄 <b>¿Para qué sirve?:</b> para ayudarte a decidir dónde ir a volar. Muestra una tabla con tus despegues favoritos, sus pronósticos y hace un análisis automático de esas <b>condiciones meteorológicas</b>.</p>
                        <p>🧮 <b>¿Qué análisis hace?:</b> compara el pronóstico con los límites de viento medio y racha máxima configurados y con la orientación de cada despegue; también analiza el viento a alturas cercanas al despegue (80, 120 y 180 m), lo que da idea del gradiente y de la fiabilidad del pronóstico de viento medio. Muestra datos meteo de interés para XC (techo, CAPE y CIN).</p>
                        <p>Con toda la información, puntúa de 0 a 10 cada despegue y colorea 🟩&nbsp;🟨&nbsp;🟥 los datos para el rango horario o días que elijas. Puedes personalizar todos esos límites para que el análisis se adapte a tus preferencias.</p>
                            `,
					botones: [
					{
						texto: '←',
						estilo: 'secundario',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso1(); 
						}
					},
					{
						texto: 'Siguiente →',
						onclick: function() {
							GestorMensajes.ocultar();
							mostrarPaso3(); 
						}
					}]
				});
			};

			// Asistente de configuración inicial. Pantalla inicial
			// ==========================================================
			const mostrarPaso1 = function() {
                GestorMensajes.mostrar({
                    tipo: 'modal',
                    htmlContenido: `
                        <p style="font-size: 1.4em; font-weight: bold; text-align:center;">🪂 Fly Decision<br>¿Dónde ir a volar?</p>
                        <p>🌦️ Pronóstico para 4 días por horas</p>
                        <p>📊 Análisis automático de condiciones para despegar o para iniciar XC</p>
                        <p>🗺️ Mapa de despegues</p>`,
                    botones: [
                        {
                            texto: 'Marcar favoritos',
                            onclick: function() {
                                GestorMensajes.ocultar();
                                //modoEdicionFavoritos = true; 
                                activarEdicionFavoritos();
                                return;
                            }
                        },
                        {
                            texto: 'Ver la guía general',
                            estilo: 'secundario',
                            onclick: function() {
                                GestorMensajes.ocultar();
                                mostrarPaso2();
                            }
                        },
                        
                        {
                            texto: 'Importar configuración',
                            estilo: 'secundario',
                            onclick: function() {
                                GestorMensajes.ocultar();
                                importarConfiguracion();
                                return;
                            }
                        }
                    ],
                    anchoBotones: 300
                });
            };

            mostrarPaso1();

        // CASO B: Estamos en Modo Edición (Activado por botón o flujo anterior)
        } else if (modoEdicionFavoritos) {

            //Sale del if y pinta la tabla ya con soloFavoritos = false que venía de la función activarEdicionFavoritos; 

        // CASO C: Usuaria recurrente pero borró todos los favoritos (Fuerza edición)
        } else if (favoritos.length === 0 && !modoEdicionFavoritos) {

            //soloFavoritos = false;
            //modoEdicionFavoritos = true; 
            activarEdicionFavoritos();
            return;

        // CASO D: Visita normal recurrente
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
                // Intentamos descargar (Petición de red real)
                const[res1, res2] = await Promise.all([
                    fetch(`https://flydecision.com/meteo-datos.json?t=${Date.now()}`, { cache: "no-store" }),
                    fetch(`https://flydecision.com/meteo-datos-ecmwf.json?t=${Date.now()}`, { cache: "no-store" })
                ]);

                if (!res1.ok || !res2.ok) {
                    throw new Error(`⚠️ Error al cargar archivos JSON`);
                }

                // Si llegamos aquí, hay internet. Parseamos y guardamos en RAM.
                data = await res1.json();
                dataEcmwf = await res2.json();
                
                DATOS_METEO_CACHE = data; 
                DATOS_METEO_ECMWF_CACHE = dataEcmwf;
                esModoOffline = false;

                // Guardamos en la Base de Datos del navegador (Sin límite de espacio de 5MB y sin bloquear la pantalla)
                guardarEnCacheIDB('METEO_DATOS_JSON_CACHE', data);
                guardarEnCacheIDB('METEO_DATOS_ECMWF_JSON_CACHE', dataEcmwf);

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
                } else {
                    console.error("❌ No hay conexión ni datos en la BD offline.");
                    ocultarLoading(); // Importante quitar el loading si fallamos
                    throw error; 
                }
            }
        }

        // Guardamos todos los despegues en la variable global para el buscador
		window.bdGlobalDespegues = data.despegues;
		
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
            console.log("🔄 Migrando favoritos de Nombres a IDs numéricos...");
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

        // Está activo filtro favoritos Y hay favoritos --> hacemos que los array despegues y respuestas contengan solo los datos de los despegues que haya en favoritos 
		if (soloFavoritos && favoritos.length > 0 && !ignorarFiltroFavoritos) {
			
			// 1. Crear un mapa temporal para relacionar el ID con sus respuestas
			const respuestasMap = new Map();
            const respuestasEcmwfMap = new Map();
			data.despegues.forEach((d, index) => { 
				respuestasMap.set(Number(d.ID), data.respuestas[index]); 
                respuestasEcmwfMap.set(Number(d.ID), dataEcmwf.respuestas[index]); 
			});
			
			// 2. Filtrar el array de despegues
			despegues = despegues.filter(d => favoritos.includes(Number(d.ID)));
			
			// 3. Crear el nuevo array de respuestas solo con los datos filtrados
			respuestas = despegues.map(d => respuestasMap.get(Number(d.ID))).filter(r => r !== undefined);
            respuestasEcmwf = despegues.map(d => respuestasEcmwfMap.get(Number(d.ID))).filter(r => r !== undefined);
			
		}
		 // Está activo filtro favoritos pero no hay favoritos
		 else if (soloFavoritos && favoritos.length === 0 && !ignorarFiltroFavoritos) {
			respuestas = [];
            respuestasEcmwf =[];
		}
	
		// ---------------------------------------------------------------
		// 🔴 LECTURA DEL SLIDER RANGO HORARIO (necesario para la construcción de la tabla)
		// ---------------------------------------------------------------
		
		// Primero lo creamos o recreamos con los datos base de la construcción de la tabla mediante una función en que hemos encapsulado su creacción (que depende de esos datos, no como los otros sliders de filtros, que son más estáticos).
		gestionarSliderHoras(respuestas, soloHorasDeLuz);
		
		const sliderHoras = document.getElementById('horario-slider');

		// Declaramos las variables FUERA (usamos let porque su valor va a cambiar)
        let indiceInicioRangoHorario;
        let indiceFinRangoHorario;

        if (sliderHoras && sliderHoras.noUiSlider && window.indicesHorasRangoHorario.length > 0) {
            const vals = sliderHoras.noUiSlider.get().map(v => Math.round(Number(v)));
            
            // 2. Asignamos el valor (SIN poner 'let' ni 'var' aquí)
            indiceInicioRangoHorario = window.indicesHorasRangoHorario[vals[0]];
            indiceFinRangoHorario    = window.indicesHorasRangoHorario[vals[1]];
            
        } else {
            // Fallback
            indiceInicioRangoHorario = 0;
            indiceFinRangoHorario = 99999;
        }

        // ---------------------------------------------------------------
        // 🔴 CONSTRUCCIÓN DE LA TABLA
        // ---------------------------------------------------------------

		const tabla = document.getElementById("tabla");
		tabla.innerHTML = "";

		const thead = document.createElement("thead");
		const tbody = document.createElement("tbody");
		const tbodyFragmento = document.createDocumentFragment();

		tabla.appendChild(thead);
		tabla.appendChild(tbody);

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
			thFavorito.title = "Marcar o desmarcar como favoritos todos los despegues actualmente visibles en la tabla";
		} else {
			thFavorito.style.userSelect = "none";
			thFavorito.style.cursor = "default";
			thFavorito.title = "";
		}

		thFavorito.onclick = function() { gestionarClickMasivoFavoritos(); };

        // ---------------------------------------------------------------		
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Región
        // ---------------------------------------------------------------

 		const thRegion = document.createElement("th");
		thRegion.textContent = "Región";
		thRegion.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thRegion.style.fontSize = "18px";
		thRegion.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda", "borde-grueso-arriba");
		thRegion.style.minWidth = "100px";
		
        // ---------------------------------------------------------------		
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Provincia
        // ---------------------------------------------------------------

 		const thProvincia = document.createElement("th");
		thProvincia.textContent = "Provincia";
		thProvincia.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thProvincia.style.fontSize = "18px";
		thProvincia.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda", "borde-grueso-arriba");
		thProvincia.style.minWidth = "100px";

        // ---------------------------------------------------------------
        // 🟡 CONSTRUCCIÓN DE LA TABLA. Cabecera. Despegue
        // ---------------------------------------------------------------

		const thDespegue = document.createElement("th");
        thDespegue.rowSpan = 2;
        thDespegue.style.fontSize = "18px";
        thDespegue.classList.add("borde-grueso-izquierda", "columna-despegue", "borde-grueso-abajo", "borde-grueso-arriba");

        if (modoEdicionFavoritos) {
            thDespegue.textContent = "Despegue";
            thDespegue.classList.add("borde-grueso-derecha");
        } else {
            // En vista normal, creamos dos líneas: Título + Mini Contador
            thDespegue.innerHTML = `
                <div style="line-height: 1.1;">Despegue</div>
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

        const tooltipContentMeteo =
            "<b style='font-size:20px;'>🌦️ Meteorología</b><br><br>" +
            "<b>🌦️</b>: Meteo general (nubosidad y precipitación)<br>" +
            "<b>💦</b>: Precipitación en mm (litros/m²)<br>" +
            "<b>💦?</b>: Probabilidad (%) de que la precipitación supere 0.1 mm (litros/m²)<br>" +
            //"<b>☁️↕</b>: Base de nube AGL (km). Altura de la base de la nube sobre el suelo. Estimación aproximada calculada a partir de la temperatura 2m y punto de rocío 2m<br>" +

            "<hr style='border:none;border-top:1px solid #000;margin:4px 0;'>" +

            "<b>180 m</b>: Viento a 180 m del suelo (km/h)<br>" +
            "<b>120 m</b>: Viento a 120 m del suelo (km/h)<br>" +
            "<b>80 m</b>: Viento a 80 m del suelo (km/h)<br>" +

            "<hr style='border:none;border-top:1px solid #000;margin:4px 0;'>" +

            "<b>10 m</b>: Viento a 10 m del suelo (km/h)<br>" +
            "<img src='icons/icono_racha_48x42.webp' style='width:16px;height:14px;'> : Racha máxima a 10 m del suelo (km/h)<br>" +
            "<img src='icons/icono_direccion_45.webp' style='width:15px;height:15px;'> : Dirección del viento a 10 m del suelo<br>" +

            "<hr style='border:none;border-top:1px solid #000;margin:4px 0;'>" +
            "<img src='icons/icono_cizalla_fiabilidad.png' style='width:30px;height:8px;'> : Cizalladura de Bajo Nivel por velocidad / Fiabilidad del pronóstico de viento medio" +
            "<hr style='border:none;border-top:1px solid #000;margin:4px 0;'>" +

            "<b>Techo</b>: Altitud (km) sobre nivel del mar (MSL) del techo de vuelo previsto y usable en parapente (= espesor capa límite BLH x 0.85 + altitud media suelo celda ECMWF 9km)<br>" +
            "<b>CAPE</b>: Energía Potencial Convectiva Disponible (J/kg)<br>" +
            "<b>CIN</b>: Inhibición Convectiva (J/kg en valor absoluto)<br><br>" +
            "<i>Nota: No está disponible aún el dato esencial de la base de nube ☁️↓ (CBH = Cloud Base Height).</i><br>";
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
		let colspan = 0;
		const trDias = document.createElement("tr");

		if (modoEdicionFavoritos) {
			trDias.appendChild(thFavorito);
			trDias.appendChild(thRegion);
			trDias.appendChild(thProvincia);
			trDias.appendChild(thDespegue);
			//trDias.appendChild(thMeteo);
		} else {
			trDias.appendChild(thDespegue);
			trDias.appendChild(thMeteo);
		}

		const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

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

				//const d = new Date(h);
				const d = new Date(h.endsWith('Z') ? h : h + 'Z'); // Forzamos UTC. garantiza que cualquier hora sin información de zona se trate como UTC, evitando errores al convertir a Date. Si la cadena ya tiene zona horaria, se usa tal cual: h. Si no tiene zona horaria, se agrega Z al final: `${h}Z` → esto fuerza que se interprete como UTC.
				const dia = d.getDate();
				const diaSemana = diasSemana[d.getDay()];
				
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
        const tooltipContent = 
            "<b style='font-size:20px;'>⭐ Puntuaciones (0-10)</b><br><br>" +
            "El sistema calcula automáticamente dos puntuaciones para cada despegue teniendo en cuenta el rango de tiempo seleccionado. Ambas se muestran coloreadas con una gradación de rojo a verde.<br><br>" +
            
            "<b>1. Condiciones del despegue (fila superior):</b><br>" +
            "Valora la viabilidad de despegar analizando el pronóstico de cada hora frente a las preferencias indicadas en ⚙️ Configuración:" +
            "<ul style='margin-top: 4px; margin-bottom: 12px;'>" +
            "<li>Límites de viento medio (mínimo, ideal y máximo).</li>" +
            "<li>Límite de racha máxima.</li>" +
            "<li>Orientación u orientaciones del despegue.</li>" +
            "<li>Lluvia (veto automático y 0 puntos a la hora afectada).</li>" +
            "</ul>" +
            
            "<b>2. Condiciones para mantenerse en térmicas o iniciar XC (fila inferior):</b><br>" +
            "Valora la puntuación de Condiciones del despegue y el potencial térmico para vuelos de distancia (Cross Country) usando los datos del modelo ECMWF:" +
            "<ul style='margin-top: 4px; margin-bottom: 8px;'>" +
            "<li><b>Techo:</b> Premia techos altos sobre la altura media del relieve y penaliza bajos (🟩 &ge; 1500m | 🟥 &le; 800m).</li>" +
            "<li><b>CAPE:</b> Premia los días azules o de cúmulos inofensivos, y penaliza los valores extremos por riesgo de sobredesarrollo o tormenta (🟩 0-400 | 🟧 400-800 | 🟥 > 800 J/kg).</li>" +
            "<li><b>CIN:</b> Penaliza la inhibición convectiva alta (inversión) que actúa como tapón frenando la formación de térmicas (🟩 &le; 50 | 🟥 > 150 J/kg).</li>" +
            "</ul>" +
            "<i style='color: #555;'>Nota: La puntuación XC es <b>independiente</b> de la orientación o el viento del despegue. Evalúa puramente el potencial térmico de la masa de aire en esa zona. Solo se anula (0 puntos) si hay previsión de lluvia o tormenta severa.</i><br><br>" +
            
            "⚠️ <b>Aviso:</b> Faltaría el dato esencial de la base de nube (CBH = Cloud Base Height) para saber si el despegue estará cubierto por nube. Es un valor del ECMWF no disponible aún en la pasarela (solicitado en marzo-2026, pendiente y sin fecha prevista). Deberás consultarlo en otros servicios.<br><br>" +
            
            "<b>Por defecto, los despegues se reordenan automáticamente por la primera puntuación</b> (Condiciones del despegue), de mayor a menor. Puedes cambiar este comportamiento en: ⚙️ <i>Ajustes</i> > <i>Otras opciones</i> > <i>Ordenar por Condiciones XC</i>.";        
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

				//const d = new Date(h);
				const d = new Date(h.endsWith('Z') ? h : h + 'Z'); // Forzamos UTC. garantiza que cualquier hora sin información de zona se trate como UTC, evitando errores al convertir a Date. Si la cadena ya tiene zona horaria, se usa tal cual: h. Si no tiene zona horaria, se agrega Z al final: `${h}Z` → esto fuerza que se interprete como UTC.

				const th = document.createElement("th");
				const hora = d.getHours();  // getHours() devuelve la hora local.
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
		
		// Creamos el array vacío ANTES de empezar a recorrer los despegues, para luego guardarlos ahí, ordenarlos por puntuación y dibujar todo de golpe
		let listaFilasParaOrdenar = [];

        // ⚡ OPTIMIZACIÓN: Pre-cálculo de fechas y noches (Calculamos 1 vez en lugar de miles)
        // Creamos un array que ya sabe si la hora 'i' es de noche o no.
        const cacheEsNoche = [];
        const cacheFechas = [];
        const cacheTextosFecha =[];

        if (horas && horas.length > 0) {
            horas.forEach(h => {
                // Convertimos el texto a Objeto Fecha una sola vez
                const d = new Date(h.endsWith('Z') ? h : h + 'Z');
                cacheFechas.push(d);
                // Calculamos si es noche una sola vez
                cacheEsNoche.push(esCeldaNoche(d));

                // --- PRECALCULAR EL TEXTO DEL TOOLTIP ---
                const nombreDia = diasSemana[d.getDay()]; // Utiliza el array diasSemana que ya definiste arriba
                const numeroDia = d.getDate();
                const horaTexto = String(d.getHours()).padStart(2, '0') + ":00 h";
                cacheTextosFecha.push(`${nombreDia} ${numeroDia}, ${horaTexto}`);
            });
        }

		// 🔃 Bucle principal que recorre cada despegue y sus datos por hora
		despegues.forEach((d, idx) => {
					
			// Verificar si hay datos meteo para este despegue (solo aplica si hicimos filtrado de favoritos)
			const hourlyData = respuestas[idx] ? respuestas[idx].hourly : null;
			const hourlyEcmwf = respuestasEcmwf[idx] ? respuestasEcmwf[idx].hourly : null;
            const elevacionModeloECMWF = respuestasEcmwf[idx] ? Number(respuestasEcmwf[idx].elevation || 0) : 0;
			const hayDatosMeteo = hourlyData !== null;
			let orientaciones = d.Orientaciones_Grados.split(",").map(n => parseFloat(n.trim()));

            // -----------------------------------------------------------
            // 🟩🟧🟥 LÓGICA DE FILTRADO POR Slider condiciones / Puntuación
            // -----------------------------------------------------------
			
			// Variables locales (se reinician en cada vuelta con el siguiente despegue)
			let notaFinal = 0;
			let horasValidas = 0; 
            let puntosAcumulados = 0;  

            let notaFinalXC = 0;
            let horasValidasXC = 0;
            let puntosAcumuladosXC = 0;

            const MODO_DEBUG = false; // 🟢 'false' cuando no necesitemos log
            
            if (hayDatosMeteo) {
 
                try {
                    // --- 🐛 INICIO DEBUG (Cabecera del despegue) ---
                    if (MODO_DEBUG) {
                        console.groupCollapsed(`🛫 DEBUG Despegue: ${d.Despegue || 'Desconocido'}`);
                    }
                    // --- 🐛 FIN DEBUG ---

                    const velArray = hourlyData.wind_speed_10m.slice(0, horas.length);
                    const rachaArray = hourlyData.wind_gusts_10m.slice(0, horas.length);
                    const dirArray = hourlyData.wind_direction_10m.slice(0, horas.length);
                    
                    const orientaciones = d.Orientaciones_Grados ? d.Orientaciones_Grados.split(",").map(n => parseFloat(n.trim())) :[];
                    
                    // 🔃 Bucle que recorre cada hora del rango seleccionado
                    velArray.forEach((velModelo, i) => {
                        
                        // Filtros
                        if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;
                        
                        // ⚡ OPTIMIZACIÓN: Leemos de la caché en vez de calcular
                        // Si tienes activa la opción "Solo día" y en nuestra lista de chuletas dice que es noche (true), saltamos.
                        if (soloHorasDeLuz && cacheEsNoche[i]) return;

                        // Si necesitas la fecha para algo más abajo, úsala de la caché:
                        const fechaHora = cacheFechas[i]; 
                        const diaCorto = diasSemana[fechaHora.getDay()].substring(0, 3);
                        const horaStr = `${diaCorto} ${fechaHora.getDate()}, ${String(fechaHora.getHours()).padStart(2, '0')}h`;

                        // ✅ Hora válida
                        horasValidas++; 
                        
                        // --- PREPARACIÓN DE DATOS COMUNES ---

						let dirCorregida = dirArray[i];

                        let velocidad = Math.round(Math.max(0, velModelo));
                        let rachaCorregida = Math.round(Math.max(0, rachaArray[i]));                      
						
                        // 3. Ángulo mínimo (mejor orientación)
                        let minimoAngulo = 180;
                        
                        if (orientaciones.length > 0) {
                            // 🎯 A) CÁLCULO BASE: Distancia al punto fijo más cercano
                            minimoAngulo = Math.min(...orientaciones.map(o => diferenciaAngular(dirCorregida, o)));
                            
                            // ⛰️ B) LÓGICA DE LADERA CONTINUA (Abanicos)
                            // Si el despegue tiene más de una orientación, comprobamos si forman una ladera continua.
                            if (orientaciones.length > 1) {
                                
                                // ¿Qué consideramos "contiguas"? En una rosa de 8 vientos (N, NE, E...), 
                                // la separación estándar es de 45º. Ponemos 46º por si hay algún decimal suelto.
                                // 💡 NOTA: Si en tu base de datos pusieras S (180) y W (270) y quisieras que
                                // todo ese hueco de 90º fuera ladera continua, deberías subir este valor a 91.
                                const UMBRAL_CONTIGUAS = 46; 
                                
                                // 1. Ordenamos de menor a mayor (ej:[0, 45, 315] -> [0, 45, 315])
                                const oriOrdenadas = [...orientaciones].sort((a, b) => a - b);
                                
                                for (let j = 0; j < oriOrdenadas.length; j++) {
                                    let o1 = oriOrdenadas[j];
                                    let o2 = oriOrdenadas[(j + 1) % oriOrdenadas.length]; // El siguiente (y cierra el círculo al final)
                                    
                                    // Calculamos la distancia angular más corta entre estas dos orientaciones
                                    let diff = (o2 - o1 + 360) % 360;
                                    
                                    // Si la distancia es > 180, el camino más corto cruza por el Norte (ej: de 315 a 0)
                                    if (diff > 180) {
                                        diff = 360 - diff;
                                        // Intercambiamos para que o1 sea el inicio del arco en sentido horario
                                        let temp = o1;
                                        o1 = o2;
                                        o2 = temp;
                                    }
                                    
                                    // Si la separación entre ellas es menor o igual al umbral (ej: <= 46), forman ladera
                                    if (diff <= UMBRAL_CONTIGUAS) {
                                        // Calculamos qué tan lejos está el viento del punto de inicio de la ladera (o1)
                                        let diffViento = (dirCorregida - o1 + 360) % 360;
                                        
                                        // Si esa distancia es menor que la amplitud de la ladera, ¡el viento está DENTRO!
                                        if (diffViento <= diff) {
                                            minimoAngulo = 0; // Viento perfecto
                                            
                                            // Solo para que lo veas en la consola si activas el debug
                                            if (MODO_DEBUG && i === 0) { 
                                                // (Solo lo pintamos la primera vez para no ensuciar la consola)
                                            }
                                            break; // Ya encontramos que está dentro, dejamos de buscar
                                        }
                                    }
                                }
                            }
                        } else {
                            minimoAngulo = 180; // Si no hay datos, asumimos lo peor
                        }

                        // =========================================================
                        // 🟢 ALGORITMO CONDICIONES DESPEGUE
                        // =========================================================

                        let ptsHora = 0;
                        let vetoActivado = false; 
                        let motivoVeto = ""; // Variable de apoyo para el debug

                        // ⛅ --- A. DIRECCIÓN (Máx 50 pts) ---
                        let ptsDir = 0;
						let ratioCorreccionPorDireccion = 1; 
						let ratioCorreccionPorRacha = 1; 
						
                        if (minimoAngulo > 120) {
                            ptsDir = 0;
                            vetoActivado = true; // ⛔ VETO: Viento de cola o muy cruzado extremo
                            motivoVeto = "Viento de cola/cruzado extremo (> 120º)";
                        } else if (minimoAngulo > 100) { // 100-120
                            ptsDir = 5;
							ratioCorreccionPorDireccion = 0.2;
                        } else if (minimoAngulo > 80) { // 80-100
                            ptsDir = 10;
							ratioCorreccionPorDireccion = 0.3;
                        } else if (minimoAngulo > 45) { // 45-80
                            ptsDir = 15;
							ratioCorreccionPorDireccion = 0.4;
                        } else if (minimoAngulo > 22) { // 22-45
                            ptsDir = 35;
							ratioCorreccionPorDireccion = 0.6;
                        } else if (minimoAngulo > 10) { // 10-22
                            ptsDir = 45;
							ratioCorreccionPorDireccion = 0.9; 
                        } else {
                            ptsDir = 50; // < 10 grados
							ratioCorreccionPorDireccion = 1;
                        }

                        // ⛅ --- B. RACHA (Máx 30 pts) ---
                        let ptsRacha = 0;

                        if (!vetoActivado) {
                            if (rachaCorregida > RachaMax * 1.5) {
                                ptsRacha = 0;
                                vetoActivado = true; // ⛔ VETO: Racha muy peligrosa
                                motivoVeto = `Racha Peligrosa (${rachaCorregida} > ${RachaMax * 1.5})`;
                            } else if (rachaCorregida > RachaMax * 1.1) {
                                ptsRacha = 0;
								ratioCorreccionPorRacha = 0.2
                            } else if (rachaCorregida > RachaMax) {
                                ptsRacha = 5;
								ratioCorreccionPorRacha = 0.5
                            } else if (rachaCorregida > RachaMax * 0.8) { 
                                ptsRacha = 20;
								ratioCorreccionPorRacha = 0.8;
                            } else {
                                ptsRacha = 30; 
                            }
                        }

                        // ⛅ --- C. VELOCIDAD (Máx 20 pts) ---
                        let ptsVel = 0;

                        if (!vetoActivado) {
                            if (velocidad > VelocidadMax * 2) {
                                ptsVel = 0;
                                vetoActivado = true; // ⛔ VETO: Viento medio muy fuerte
                                motivoVeto = `Viento muy fuerte (${velocidad} > ${VelocidadMax * 2})`;
                            } else if (velocidad > VelocidadMax * 1.5) {
                                ptsVel = 3;
                            } else if (velocidad > VelocidadMax) {
                                ptsVel = 5;
                            } else if (velocidad > VelocidadMin) {
                                ptsVel = 20; // Zona ideal
                            } else {
                                ptsVel = 15; // Menor que la mínima (flojo)
                            }
                        }

                        // 💦 --- D. PRECIPITACIÓN (VETO SUPREMO) ---
                        let precipitacion = 0;
                        if (hourlyEcmwf && hourlyEcmwf.precipitation && hourlyEcmwf.precipitation[i] !== null) {
                            precipitacion = Number(hourlyEcmwf.precipitation[i]);
                        }
                        // Si hay más de 0mm, ignoramos cualquier otro cálculo y aplicamos veto
                        if (precipitacion > 0) {
                            vetoActivado = true;
                            motivoVeto = `Lluvia prevista (${precipitacion.toFixed(1)} mm)`;
                        }

                        if (vetoActivado) {
                            ptsHora = 0;
                        } else {
                            ptsHora = (ptsDir + ptsRacha + ptsVel) * ratioCorreccionPorDireccion * ratioCorreccionPorRacha;
                        }
                        
                        puntosAcumulados += ptsHora;

                        // ---------------------------------------------------------
                        // 🟢 ALGORITMO XC (INDEPENDIENTE DEL DESPEGUE)
                        // ---------------------------------------------------------
                        if (chkMostrarXC && hourlyEcmwf) {
                            let ptsXC_hora = 0;
                            
                            // Único veto lógico para XC: Lluvia o Tormenta severa (CAPE altísimo)
                            let lluviaXC = (hourlyEcmwf.precipitation && hourlyEcmwf.precipitation[i] != null) ? Number(hourlyEcmwf.precipitation[i]) : 0;
                            let capeXC = (hourlyEcmwf.cape && hourlyEcmwf.cape[i] != null) ? Number(hourlyEcmwf.cape[i]) : 0;

                            if (lluviaXC > 0 || capeXC > XCCapeLims.riesgo) {
                                ptsXC_hora = 0; // Si llueve o hay tormenta, no hay XC posible
                            } else {
                                // 1. Obtener el dato crudo de la capa límite (AGL)
                                let techoRaw = (hourlyEcmwf.boundary_layer_height && hourlyEcmwf.boundary_layer_height[i] != null) ? Number(hourlyEcmwf.boundary_layer_height[i]) : 0;

                                // 2. Aplicar el ratio global de realismo para parapente (0.85)
                                let techoUtil = techoRaw * RATIO_TECHO_UTIL;

                                let cin = (hourlyEcmwf.convective_inhibition && hourlyEcmwf.convective_inhibition[i] != null) ? Math.max(0, Number(hourlyEcmwf.convective_inhibition[i])) : 0;

                                // Techo Útil (0-40 pts)
                                let ptsTecho = 0;
                                if (techoUtil >= XCTechoLims.verde) ptsTecho = 40;
                                else if (techoUtil > XCTechoLims.rojo) ptsTecho = 10 + 30 * ((techoUtil - XCTechoLims.rojo) / (XCTechoLims.verde - XCTechoLims.rojo));
                                else ptsTecho = 10 * (techoUtil / XCTechoLims.rojo);

                                // CAPE (0-40 pts)
                                let ptsCape = 0;
                                if (capeXC >= XCCapeLims.idealMin && capeXC <= XCCapeLims.idealMax) {
                                    ptsCape = 40; 
                                } else if (capeXC > XCCapeLims.idealMax && capeXC <= XCCapeLims.riesgo) {
                                    ptsCape = 40 - 40 * ((capeXC - XCCapeLims.idealMax) / (XCCapeLims.riesgo - XCCapeLims.idealMax));
                                }

                                // CIN (0-20 pts)
                                let ptsCin = 0;
                                if (cin <= XCCinLims.verde) ptsCin = 20;
                                else if (cin < XCCinLims.rojo) ptsCin = 20 * (1 - (cin - XCCinLims.verde) / (XCCinLims.rojo - XCCinLims.verde));
                                else ptsCin = 0;

                                // Puntuación total Pura (sin ratios de viento/orientación del despegue)
                                ptsXC_hora = ptsTecho + ptsCape + ptsCin;
                            }
                            
                            puntosAcumuladosXC += ptsXC_hora;
                            horasValidasXC++;
                        }

                        // --- 🐛 INICIO DEBUG (Desglose por hora) ---
                        if (MODO_DEBUG) {
                            console.log(`⏱ %c${horaStr}`, 'font-weight: bold; color: #1d4ed8;');
                            console.log(`   └─ Datos Reales : Dif. Ángulo: ${minimoAngulo.toFixed(1)}º | Vel: ${velocidad} | Racha: ${rachaCorregida}`);
                            console.log(`   └─ Pts Base     : Dir: ${ptsDir}/50 | Vel: ${ptsVel}/20 | Racha: ${ptsRacha}/30`);
                            console.log(`   └─ Ratios       : xDir: ${ratioCorreccionPorDireccion} | xRacha: ${ratioCorreccionPorRacha}`);
                            
                            if (vetoActivado) {
                                console.log(`   └─ %c⛔ VETO ACTIVADO: ${motivoVeto}`, 'color: #ef4444; font-weight: bold;');
                                console.log(`   └─ %cPuntos Hora: 0`, 'color: #ef4444; font-weight: bold;');
                            } else {
                                console.log(`   └─ %c✅ Puntos Hora: (${ptsDir} + ${ptsVel} + ${ptsRacha}) * ${ratioCorreccionPorDireccion} * ${ratioCorreccionPorRacha} = ${ptsHora.toFixed(2)}`, 'color: #10b981; font-weight: bold;');
                            }
                        }
                        // --- 🐛 FIN DEBUG ---

                    }); // Fin Loop Horas

                    // --- EVALUACIÓN FINAL DEL DESPEGUE ---
                    
                    let pasaFiltro = true; 

					if (horasValidas > 0) {
                        const maximosPuntosPosibles = horasValidas * 100;
                        
                        // Cálculo nota final Condiciones despegue
                        let ratio = puntosAcumulados / maximosPuntosPosibles;
                        notaFinal = ratio * 10;
                        
                        // Cálculo nota final XC
                        if (horasValidasXC > 0) {
                            const maximosPuntosPosiblesXC = horasValidasXC * 100;
                            notaFinalXC = (puntosAcumuladosXC / maximosPuntosPosiblesXC) * 10;
                        }

                        // --- 🐛 INICIO DEBUG (Resumen Final) ---
                        if (MODO_DEBUG) {
                            console.log(`📊 %cRESUMEN FINAL '${d.Despegue}'`, 'font-weight: bold; color: #8b5cf6;');
                            console.log(`   - Horas válidas procesadas: ${horasValidas}`);
                            console.log(`   - Puntos Acumulados: ${puntosAcumulados.toFixed(2)} / ${maximosPuntosPosibles}`);
                            console.log(`   - NOTA FINAL: %c${notaFinal.toFixed(2)} / 10`, 'font-weight: bold; font-size: 1.1em;');
                            console.groupEnd(); // Cerramos el grupo de este despegue
                        }
                        // --- 🐛 FIN DEBUG ---
                        
					} else {
                        console.log(`⚠️ Despegue ${d.Despegue} sin horas válidas`);
                        if (MODO_DEBUG) console.groupEnd(); // Asegurar cierre del grupo en caso de error
                    }

					if (!pasaFiltro) return; 

                } catch (error) {
                    console.error(`💥 ERROR CRÍTICO en despegue ${d.Despegue}:`, error);
                    if (MODO_DEBUG) console.groupEnd(); // Asegurar cierre del grupo si el catch se dispara
                    return; 
                }
            } // Fin if(hayDatosMeteo)

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

            let filaPreci, filaProbPreci, filaBaseNube;
            if (chkMostrarPrecipitacion) filaPreci = document.createElement("tr");
            if (chkMostrarProbPrecipitacion) filaProbPreci = document.createElement("tr");
            //if (chkMostrarBaseNube) filaBaseNube = document.createElement("tr");

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

            const rowsGroup1 =[filaNubesTotal, filaPreci, filaProbPreci, filaBaseNube, fila180, fila120, fila80, filaVel, filaRacha, filaDir, filaCizalladura].filter(Boolean);
            const rowsGroup2 = [filaTecho, filaCape, filaCin].filter(Boolean);

            const todasLasFilas = [...rowsGroup1, ...rowsGroup2];
            const filaPrincipal = todasLasFilas[0];
            const totalFilasRowSpan = todasLasFilas.length;

            // Guardamos las coordenadas en la fila principal para el filtro rápido
            filaPrincipal.dataset.lat = latitud;
            filaPrincipal.dataset.lon = longitud;

            // Limpieza y Control de la línea separadora inferior
            todasLasFilas.forEach(f => f.classList.remove("fila-separador"));
            
            // Si hay un Grupo 2 activo, ponemos una línea fina sutil entre el Grupo 1 y el Grupo 2
            if (rowsGroup2.length > 0 && rowsGroup1.length > 0) {
                rowsGroup1[rowsGroup1.length - 1].style.borderBottom = "1px solid #999";
            }
            
            // La ultimísima fila del despegue recibe la separación grande principal
            if (todasLasFilas.length > 0) {
                todasLasFilas[0].classList.add("fila-inicio-despegue");
                todasLasFilas[todasLasFilas.length - 1].classList.add("fila-separador", "fila-fin-despegue");
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
                
                tdFavorito.rowSpan = totalFilasRowSpan;
                tdFavorito.classList.add("columna-favoritos", "borde-grueso-abajo", "borde-grueso-izquierda");
                
                tdFavorito.dataset.id = idDespegue; // Guardamos el ID en el HTML para leerlo luego
                
                if (modoEdicionFavoritos) { // Si se está editando favoritos, que aparezca la mano
                    tdFavorito.classList.add("cursor-pointer");
                    tdFavorito.title = esFavorito ? "Quitar de favoritos" : "Añadir a favoritos";
                } else {
                    tdFavorito.classList.add("no-cursor-pointer");
                    tdFavorito.title = "Despegue favorito";
                }
                
                //tdFavorito.innerHTML = esFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                tdFavorito.innerHTML = esFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                
                tdFavorito.onclick = function() {
                    
                    const nuevoEstado = toggleFavorito(idDespegue);

                    tdFavorito.innerHTML = nuevoEstado ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">': '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                    tdFavorito.title = nuevoEstado ? "Quitar de favoritos" : "Añadir a favoritos";

                    todasLasFilas.forEach(f => f.classList.toggle("favorito", nuevoEstado));
                    
                };
			
				filaPrincipal.appendChild(tdFavorito);

                // ---------------------------------------------------------------
                // 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Región
                // ---------------------------------------------------------------
				
				const tdRegion = document.createElement("td");
				
				tdRegion.innerHTML = `<div class="texto-multilinea-2" title="${d.Región}">${d.Región}</div>`;	
				tdRegion.rowSpan = totalFilasRowSpan;	
				tdRegion.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda");
				
				filaPrincipal.appendChild(tdRegion);	
			
                // ---------------------------------------------------------------
                // 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Provincia
                // ---------------------------------------------------------------
				
				const tdProvincia = document.createElement("td");
				
				tdProvincia.innerHTML = `<div class="texto-multilinea-2" title="${d.Provincia}">${d.Provincia}</div>`;	
				tdProvincia.rowSpan = totalFilasRowSpan;	
				tdProvincia.classList.add("columna-provincia-region", "borde-grueso-abajo", "borde-grueso-izquierda");
				
				filaPrincipal.appendChild(tdProvincia);	
			}
	
			// ---------------------------------------------------------------
			// 🟡 CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columna Despegue
			// ---------------------------------------------------------------
				
			const tdDespegue = document.createElement("td");
						
			const titleText = `Provincia: ${d.Provincia}\nDespegue: ${d.Despegue}\nOrientación: ${d["Orientación"]}`;
			
			tdDespegue.title = titleText;
			
			const gradosOrientacion = d["Orientaciones_Grados"]
				? d["Orientaciones_Grados"].split(',').map(g => parseInt(g.trim(), 10))
				: [];

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
			
            const URLDespegue = `https://flydecision.com/map/?lat=${latitud}&lon=${longitud}&zoom=14&q=${nombreParaURL}`;
            const svgOrientaciones = createOrientationSVG(d["Orientación"]);
            const svgParaTooltip = svgOrientaciones.replaceAll('"', "'");
            
            // 1. Preparamos el nombre para que sea seguro dentro de la función JS (escapa comillas simples)
            const safeDespegue = d.Despegue.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            // 2. Construimos el contenido HTML del tooltip
            const contenidoTooltip = `
                <b><span style='font-size: 18px; padding-right: 8px;'>🪂 ${d.Despegue}</b></span><br>
                Región: <b>${d.Región}</b><br>
                Provincia: <b>${d.Provincia}</b><br>
                Orientación: <b>${svgParaTooltip} <span style='vertical-align:middle;'>${d["Orientación"]}</span></b><br>
                ⛅ <a href='https://www.windy.com/${latitud}/${longitud}/wind?${latitud},${longitud},14' onclick='abrirLinkExterno(this.href); return false;'>Windy</a><br>
                ⛅ <a href='https://meteo-parapente.com/#/${latitud},${longitud},13' onclick='abrirLinkExterno(this.href); return false;'>Meteo-parapente</a><br>
                ⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${latitud}N${longitud}E' onclick='abrirLinkExterno(this.href); return false;'>Meteoblue</a><br>
                <div style='margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; text-align: center;'>
                    <a href='#' onclick="abrirMapaIntegrado(${latitud}, ${longitud}, '${safeDespegue}'); return false;" style='display: inline-block; background-color: #007bff; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-weight: bold;'>
                        🌍 Mapa y más información
                    </a>
                </div>
            `;

            // 3. Escapamos todas las comillas dobles para que no rompan el atributo data-tippy-content
            const contenidoEscapado = contenidoTooltip.replace(/"/g, '&quot;');

            const botonMapaHTML = `
                <button class="btn-info btn-abajo-izquierda" 
                    style="bottom: 2px; left: 2px;"
                    data-tippy-content="${contenidoEscapado}"
                    title="Más información">
                       <img src="icons/info.svg" alt="Más info" style="width: 20px; height: 20px; vertical-align: middle;">
                </button>
            `;
			
			// Si estamos en modoEdicionFavoritos, no queremos la línea de la provincia
            const provinciaHTML = modoEdicionFavoritos ? "" : `<b style="display:block;">${d.Provincia.toUpperCase()}</b>`;

            tdDespegue.innerHTML = `
                ${botonMapaHTML}
                ${provinciaHTML}
                <div class="texto-multilinea-2" title="${d.Despegue}">${d.Despegue}</div>
				${svgOrientaciones}
            `;
			// ROWSPAN DINÁMICO
            tdDespegue.rowSpan = totalFilasRowSpan;	
			tdDespegue.classList.add("columna-despegue", "borde-grueso-abajo", "borde-grueso-izquierda");
            if (modoEdicionFavoritos) {
                tdDespegue.classList.add("borde-grueso-derecha");
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
                addIconCell(filaNubesTotal, '<span style="font-size:16px; font-weight:bold; padding-bottom: 2px; display: inline-block; box-sizing: border-box;">🌦️</span>', 'Meteo general (lluvia / nubosidad total)');
                addIconCell(filaPreci, '<span style="font-size:15px; font-weight:bold;">💦</span>', 'Precipitación en mm (litros/m²)');
                addIconCell(filaProbPreci, '<span style="font-size:15px; font-weight:bold;">💦?</span>', 'Probabilidad (%) de que la precipitación supere 0.1 mm (litros/m²)');
                //addIconCell(filaBaseNube, '<span style="font-size:16px; font-weight:bold;">☁️↓</span>', 'Nubosidad baja (%): Porcentaje del cielo cubierto por nubes bajas (del suelo hasta 2000 m de altitud)');
                addIconCell(filaBaseNube, '<span style="font-size:16px; font-weight:bold;">☁️↕</span>', 'Base de nube AGL (km): Altura de la base de la nube sobre el suelo. Estimación aproximada calculada a partir de la temperatura 2m y punto de rocío 2m.');
                
                // Velocidades alturas
                if (chkMostrarVientoAlturas) {
                    const alturas = [
                        { tr: fila180, label: "180 m", title: "Viento medio a 180 m (km/h)" },
                        { tr: fila120, label: "120 m", title: "Viento medio a 120 m (km/h)" },
                        { tr: fila80,  label: "80 m",  title: "Viento medio a 80 m (km/h)" }
                    ];

                    alturas.forEach(item => {
                        const td = document.createElement("td");
                        // Estilo simple con texto negrita pequeño
                        td.innerHTML = `<span style="font-size:10px; font-weight:bold;">${item.label}</span>`;
                        td.setAttribute("title", item.title);
                        td.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");
                        item.tr.appendChild(td);
                    });
                }

                // Velocidad 10 m
				const tdIconoVelocidad = document.createElement("td");
				tdIconoVelocidad.innerHTML = '<span style="font-size:10px; font-weight:bold;">10 m</span>';
				tdIconoVelocidad.setAttribute("title", "Viento medio a 10 m (km/h)");
				tdIconoVelocidad.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");
                //tdIconoVelocidad.style.cursor = "help";
				
				filaVel.appendChild(tdIconoVelocidad);	 	 	 	
				
				// Racha 10 m
				const tdIconoRacha = document.createElement("td");	
                   tdIconoRacha.innerHTML = '<img src="icons/icono_racha_48x42.webp" width="16" height="14">';
				tdIconoRacha.setAttribute("title", "Racha máxima a 10 m (km/h)");
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
				tdIconoDireccion.setAttribute("title", "Dirección del viento a 10 m");	
				tdIconoDireccion.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");

                // Forzamos altura a 20px
                tdIconoDireccion.style.height = "20px";
                tdIconoDireccion.style.minHeight = "20px";
                tdIconoDireccion.style.maxHeight = "20px";
                tdIconoDireccion.style.lineHeight = "20px";
                tdIconoDireccion.style.padding = "0px";
                tdIconoDireccion.style.boxSizing = "border-box"; // Vital para que los bordes no sumen altura
				
				filaDir.appendChild(tdIconoDireccion);

                // Cizalladura
				if (chkMostrarCizalladura) {
				    const tdIconoCiz = document.createElement("td");	
				    //tdIconoCiz.innerHTML = '<span style="font-size:4px;">🌪️🎯</span>';
                    tdIconoCiz.innerHTML = '';
                    tdIconoCiz.style.background = "linear-gradient(to right, #6befaf 33.3%, #f0c16a 33.3%, #f0c16a 66.6%, #fb796e 66.6%)";
				    tdIconoCiz.setAttribute("title", "Cizalladura de Bajo Nivel por velocidad / Fiabilidad del pronóstico de viento medio");	
				    tdIconoCiz.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda", "celda-altura-4px");
                    tdIconoCiz.style.borderTop = "1px solid #000";
                    tdIconoCiz.style.borderBottom = "1px solid #000";
                    //tdIconoCiz.style.cursor = "help";

				    filaCizalladura.appendChild(tdIconoCiz);
				}

                // Iconos Grupo 2: XC
                addIconCell(filaTecho, '<span style="font-size:10px; font-weight:bold;">Techo</span>', 'Altitud (km) sobre nivel del mar (MSL) del techo de vuelo previsto y usable en parapente (= espesor capa límite BLH x 0.85 + altitud media suelo celda ECMWF 9km)');
                addIconCell(filaCape, '<span style="font-size:10px; font-weight:bold;">CAPE</span>', 'CAPE (J/kg): Energía Potencial Convectiva Disponible (Convective Available Potential Energy)');
                addIconCell(filaCin, '<span style="font-size:10px; font-weight:bold;">CIN</span>', 'CIN (J/kg): Inhibición Convectiva (Convective INhibition)');

				// ---------------------------------------------------------------
				// ⚪ CONSTRUCCIÓN DE LA TABLA > FILAS POR DESPEGUE > Columnas de datos por hora
				// ---------------------------------------------------------------
					
                // Envolver la construcción de las CELDAS DE DATOS en una verificación.
				if (hayDatosMeteo) {

                    // ⚪ Meteorología general, Precipitación, Probabilidad de precipitación y Nubes bajas *****************************
                    // Helper para renderizar los datos del nuevo JSON ECMWF rápidamente
                    const renderEcmwfData = (tr, dataArr, formatFn, fontSize, colorFn, paddingBottom = "0px", titleFn = null) => {
                        if (!tr || !dataArr) return;
                        dataArr.slice(0, horas.length).forEach((val, i) => {
                            if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;
                            const td = document.createElement("td");
                            
                            let appliedColor = false;
                            
                            // 1. Aplicamos el color de fondo si existe la regla
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
                            
                            // 2. Gestionamos modo Noche y fondo blanco por defecto
                            if (cacheEsNoche[i]) {
                                td.classList.add("celda-noche");
                            } else if (!appliedColor) {
                                td.style.backgroundColor = "#ffffff"; 
                            }
                            
                            if (indicesInicioDia.includes(i)) td.classList.add("borde-grueso-izquierda");
                            
                            if (fontSize) {
                                td.style.setProperty('font-size', fontSize, 'important');
                            }

                            if (paddingBottom) {
                                td.style.paddingBottom = paddingBottom;
                            }
                            
                            td.textContent = formatFn(val, i);
                            tr.appendChild(td);
                        });
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
                        
                        // renderEcmwfData(filaBaseNube, hourlyEcmwf.cloud_cover_low, 
                        //     v => v == null ? "" : (Math.round(Number(v)) === 0 ? "" : Math.round(Number(v)) + ""), "12px",
                        //     v => v == null ? "" : (Math.round(Number(v)) === 0 ? "fondo-verde" : (Math.round(Number(v)) <= 20 ? "fondo-naranja" : "fondo-rojo"))
                        // );

                        // Base de nubes estimada (Temperatura y Punto de Rocío)
                        renderEcmwfData(filaBaseNube, hourlyEcmwf.temperature_2m, 
                            (temp, i) => {
                                if (temp == null || !hourlyEcmwf.dew_point_2m || hourlyEcmwf.dew_point_2m[i] == null) return "";
                                
                                let t = Number(temp);
                                let roc = Number(hourlyEcmwf.dew_point_2m[i]);
                                
                                let baseMts = Math.max(0, Math.round((t - roc) * 125));
                                let baseKm = (baseMts / 1000).toFixed(1);
                                
                                return baseKm === "0.0" ? "0" : baseKm;
                            }, 
                            "12px", 
                            (temp, i) => {
                                if (temp == null || !hourlyEcmwf.dew_point_2m || hourlyEcmwf.dew_point_2m[i] == null) return "";
                                
                                let t = Number(temp);
                                let roc = Number(hourlyEcmwf.dew_point_2m[i]);
                                let baseMts = Math.max(0, Math.round((t - roc) * 125));

                                // Lógica de colores solicitada
                                if (baseMts < 100) return "fondo-rojo";
                                if (baseMts <= 300) return "fondo-naranja";
                                return "fondo-verde";
                            },
                            "0px",
                            (temp, i) => { // Tooltip para que el usuario sepa de qué es ese número
                                if (temp == null || !hourlyEcmwf.dew_point_2m || hourlyEcmwf.dew_point_2m[i] == null) return "";
        
                                let t = Number(temp);
                                let roc = Number(hourlyEcmwf.dew_point_2m[i]);
                                let baseMts = Math.max(0, Math.round((t - roc) * 125));
                                let baseKm = (baseMts / 1000).toFixed(1);
                                let valorFinal = (baseKm === "0.0" ? "0" : baseKm);
                                
                                return `Altura de la base de la nube: ${valorFinal} km sobre el suelo (AGL)`;
                            }
                        );

                    } else {
                        const emptyArr = new Array(horas.length).fill(null);
                        renderEcmwfData(filaNubesTotal, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaPreci, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaProbPreci, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaBaseNube, emptyArr, () => "", "9px", () => "");
                    }

					// ⚪ Velocidades alturas 80, 120, 180 m *****************************

                    if (chkMostrarVientoAlturas) {
                        
                        const arr180 = hourlyData.wind_speed_180m || [];
                        const arr120 = hourlyData.wind_speed_120m || [];
                        const arr80  = hourlyData.wind_speed_80m  || [];
                        const arr10  = hourlyData.wind_speed_10m  || []; // Necesario para comparar

                        // Función helper para pintar celdas de altura
                        const pintarCeldaAltura = (tr, dataArray, alturaKey) => {
                            dataArray.slice(0, horas.length).forEach((rawVal, i) => {
                                if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

                                const td = document.createElement("td");
                                if (cacheEsNoche[i]) td.classList.add("celda-noche");
                                if (indicesInicioDia.includes(i)) td.classList.add("borde-grueso-izquierda");

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
                            });
                        };

                        // Pasamos la clave "80m", "120m" para que busque en el objeto LIMITES_CIZALLADURA
                        pintarCeldaAltura(fila180, arr180, "180 m");
                        pintarCeldaAltura(fila120, arr120, "120 m");
                        pintarCeldaAltura(fila80,  arr80,  "80 m");

                        // Borde superior para separar visualmente de la meteo general
                        Array.from(fila180.children).forEach(td => {
                            td.style.borderTop = "1px solid #000"; 
                        });
                        
                        // Borde inferior para separar visualmente
                        Array.from(fila80.children).forEach(td => {
                            td.style.borderBottom = "1px solid #000"; 
                        });
                    }

					// ⚪ Velocidad 10 m *****************************
					
					const velocidades = hourlyData.wind_speed_10m.slice(0, horas.length);
                    // NUEVOS DATOS (Añadir esto) con protección por si el JSON es antiguo
                    const vel80 = hourlyData.wind_speed_80m ? hourlyData.wind_speed_80m.slice(0, horas.length) : [];
                    const vel120 = hourlyData.wind_speed_120m ? hourlyData.wind_speed_120m.slice(0, horas.length) : [];
                    const vel180 = hourlyData.wind_speed_180m ? hourlyData.wind_speed_180m.slice(0, horas.length) : [];

					velocidades.forEach((velocidadModelo, i) => {
						
						/* 🕜 Filtro del slider de rango horario */
						if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

                        let velocidad = velocidadModelo;

                        velocidad = Math.round(Math.max(0, velocidad)); // Redondeo a 0 decimales

						const td = document.createElement("td");

						// Marcar celdas de noche en datos (Usando la caché)
                        if (cacheEsNoche[i]) {
                            td.classList.add("celda-noche");
                        }
									
						if (indicesInicioDia.includes(i)) {
						td.classList.add("borde-grueso-izquierda");
						}
								
						const velocidadTolerableSuperior = VelocidadMax - (VelocidadMax - VelocidadIdeal) / 3;

						if (velocidad < VelocidadMin) {
							td.classList.add("fondo-naranja");
						} 
						else if (velocidad <= velocidadTolerableSuperior) {
							// Velocidad ideal: entre el mínimo y la mitad del camino al máximo
							td.classList.add("fondo-verde");
						} 
						else if (velocidad < VelocidadMax) {
							// Velocidad entre la ideal y velocidadTolerableSuperior
							td.classList.add("fondo-naranja");
						} 
						else { // velocidad >= VelocidadMax
							td.classList.add("fondo-rojo");
						} 

                        td.textContent = velocidad;
                        //td.style.cursor = "help";

                        td.title = `${velocidad} km/h`;

                        filaVel.appendChild(td);
					});

					// ⚪ Racha *****************************
					
					const rachas = hourlyData.wind_gusts_10m.slice(0, horas.length);
					rachas.forEach((rachaModelo, i) => {
						
						/* 🕜 Filtro del slider de rango horario */
						if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

						// 1. Calculamos la velocidad de referencia para esta hora (necesario para la corrección)
                        const velModeloRef = hourlyData.wind_speed_10m[i];
                        let velRef = velModeloRef;
                        velRef = Math.round(Math.max(0, velRef));

                        let racha = rachaModelo;
                        racha = Math.round(Math.max(0, racha));

						const td = document.createElement("td");

                        // Marcar celdas de noche en datos (Usando la caché)
                        if (cacheEsNoche[i]) {
                            td.classList.add("celda-noche");
                        }
									
						if (indicesInicioDia.includes(i)) {
						td.classList.add("borde-grueso-izquierda");
						}

						const rachaTolerable = RachaMax - (RachaMax - VelocidadMax) / 3;

						if (racha < rachaTolerable) {
							td.classList.add("fondo-verde");
						} 
						else if (racha < RachaMax) { // estamos entre la tolerable y la máxima
							td.classList.add("fondo-naranja");
						} 
						else { // racha >= RachaMax
							td.classList.add("fondo-rojo");
						} 

						td.textContent = racha;

                        td.title = `${racha} km/h racha máxima`;

						filaRacha.appendChild(td);
					});

					// ⚪ Dirección *****************************
					
					const direcciones = hourlyData.wind_direction_10m.slice(0, horas.length);
					direcciones.forEach((dirModelo, i) => {
						
						/* 🕜 Filtro del slider de rango horario */
						if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;
						
                        let dir = dirModelo;
                        
                        dir = Math.round(dir);

						const td = document.createElement("td");

                        // Marcar celdas de noche en datos (Usando la caché)
                        if (cacheEsNoche[i]) {
                            td.classList.add("celda-noche");
                        }
									
						if (indicesInicioDia.includes(i)) {
						td.classList.add("borde-grueso-izquierda");
						}
						
						
						// Versión segura si orientaciones está vacío, Math.min(...) devuelve Infinity
						let minimoAnguloDiferencia = 180;  // Valor seguro por defecto

						if (orientaciones && orientaciones.length > 0) {
							minimoAnguloDiferencia = Math.min(...orientaciones.map(o => diferenciaAngular(dir, o)));
						}

						td.classList.add(colorPorDiferencia(minimoAnguloDiferencia));

						td.innerHTML = `
							<svg class="flecha-viento" viewBox="0 0 30 36" style="
								transform: rotate(${dir + 180}deg);">
								<polygon points="15,2 20.5,20 16.5,16.5 13.5,16.5 9.5,20" fill="black"/>
							</svg>
							`;
							
                        td.title = `${dir}º`;

						filaDir.appendChild(td);
					});

                    // ⚪ Cizalladura / Fiabilidad *****************************

					if (chkMostrarCizalladura) {
					    const arr180 = hourlyData.wind_speed_180m ||[];
					    const arr120 = hourlyData.wind_speed_120m ||[];
					    const arr80  = hourlyData.wind_speed_80m  ||[];
					    const arr10  = hourlyData.wind_speed_10m  ||[]; 

					    arr10.slice(0, horas.length).forEach((vel10Raw, i) => {
					        if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

					        const td = document.createElement("td");
                            td.classList.add("celda-altura-4px");
                            //td.style.cursor = "help";
                            td.style.borderTop = "1px solid #000";
                            td.style.borderBottom = "1px solid #000";
                            // Solo ponemos la línea derecha si NO es la última celda visible
                            if (i !== indiceFinRangoHorario) {
                                td.style.borderRight = "1px solid #000";
                            }
					        if (cacheEsNoche[i]) td.classList.add("celda-noche");
					        if (indicesInicioDia.includes(i)) td.classList.add("borde-grueso-izquierda");

					        // Si no hay datos de altura en el JSON, mostramos un guión
					        if (arr80[i] === undefined && arr120[i] === undefined && arr180[i] === undefined) {
					            td.textContent = "-";
					            filaCizalladura.appendChild(td);
					            return;
					        }

					        const vel80 = arr80[i] !== undefined ? Math.round(Math.max(0, arr80[i])) : 0;
					        const vel120 = arr120[i] !== undefined ? Math.round(Math.max(0, arr120[i])) : 0;
					        const vel180 = arr180[i] !== undefined ? Math.round(Math.max(0, arr180[i])) : 0;
					        const vel10 = Math.round(Math.max(0, vel10Raw));

					        const vientoMaxAltura = Math.max(vel80, vel120, vel180);
					        const delta = vientoMaxAltura - vel10;
					        const vel10Calculo = Math.max(8, vel10);
					        const ratio = vientoMaxAltura / vel10Calculo;

					        let colorCizalladura = "fondo-verde";
					        let textoCelda = delta > 0 ? `+${delta}` : `${delta}`;

                            let iconoResultado = "🟩";
					        let textoResultado = "Cizalladura baja y Fiabilidad alta";
					        let motivoCalculo = "Valores inferiores a los umbrales";

					        // 🔴 ROJO (Peligro alto / Fiabilidad baja)
					        if (ratio > 2.0 && delta > 12) {
					            colorCizalladura = "fondo-rojo";
					            iconoResultado = "🟥";
					            textoResultado = "Cizalladura alta y Fiabilidad baja";
					            motivoCalculo = `Ratio (<b>${ratio.toFixed(1)}x</b>) > 2.0 &nbsp;<b>Y</b>&nbsp; Δ (<b>${delta}</b>) > 12 km/h.`;
					        } 
					        // 🟡 NARANJA (Atención / Fiabilidad media)
					        else if (ratio > 1.5 && delta > 8) {
					            colorCizalladura = "fondo-naranja";
					            iconoResultado = "🟧";
					            textoResultado = "Cizalladura media y Fiabilidad media";
					            motivoCalculo = `Ratio <b>${ratio.toFixed(1)}x</b> > 1.5 &nbsp;<b>Y</b>&nbsp; Δ <b>${delta}</b> > 8 km/h`;
					        } 

					        // PINTADO DE LA CELDA

					        td.classList.add(colorCizalladura);
					        //td.innerHTML = `<span style="font-size: 0.8em; color: #666;">${textoCelda}</span>`;

                            td.title = `${textoResultado}\n${motivoCalculo}`;

					        filaCizalladura.appendChild(td);
					    });
					}

                    // Datos ECMWF Grupo 2 (XC)
                    if (hourlyEcmwf) {
                        // Techo Útil MSL (Suma: (Espesor BLH * RATIO_TECHO_UTIL) + Elevación de la celda del modelo)
                        renderEcmwfData(filaTecho, hourlyEcmwf.boundary_layer_height, 
                            v => {
                                if (v == null) return "";
                                // Usamos la variable global
                                let espesorUtil = Number(v) * RATIO_TECHO_UTIL;
                                let altitudMSL = (espesorUtil + elevacionModeloECMWF) / 1000;
                                let valorTexto = altitudMSL.toFixed(1);
                                return valorTexto === "0.0" ? "0" : valorTexto;
                            }, 
                            "12px",
                            v => {
                                if (v == null) return "";
                                // El color se basa en el espesor corregido
                                let espesorUtil = Number(v) * RATIO_TECHO_UTIL;
                                return (espesorUtil < XCTechoLims.rojo ? "fondo-rojo" : (espesorUtil >= XCTechoLims.verde ? "fondo-verde" : "fondo-naranja"));
                            },
                            "0px",
                            v => {
                                if (v == null) return "";
                                let espesorBLH = Math.round(Number(v));
                                let espesorUtil = Math.round(espesorBLH * RATIO_TECHO_UTIL);
                                let altitudMSL = Math.round(espesorUtil + elevacionModeloECMWF);
                                
                                return `Techo usable en parapente: ${altitudMSL} m MSL\n` +
                                    `Cálculo = ${espesorUtil} m espesor útil AGL (${Math.round(RATIO_TECHO_UTIL * 100)}% de la BLH teórica de ${espesorBLH} m) + ${Math.round(elevacionModeloECMWF)} m altitud (suelo medio celda ECMWF 9km)\n`;
                            }
                        );
                        // CAPE
                        renderEcmwfData(filaCape, hourlyEcmwf.cape, 
                            v => {
                                if (v == null || v === "") return "";
                                let n = Math.round(Number(v));
                                if (n >= 1000) {
                                    return (n / 1000).toFixed(1) + "k"; // 1200 -> 1.2k
                                }
                                return n;
                            }, 
                            "11px",
                            v => {
                                if (v == null || v === "") return "";
                                let n = Number(v);
                                if (n <= XCCapeLims.idealMax) return "fondo-verde";    // 0 a 400
                                if (n <= XCCapeLims.riesgo) return "fondo-naranja";    // 400 a 800
                                return "fondo-rojo";                                   // > 800
                            },
                            "0px",
                            v => v == null ? "" : "CAPE: " + Math.round(Number(v)) + " J/kg"
                        );
                        // CIN
                        renderEcmwfData(filaCin, hourlyEcmwf.convective_inhibition, 
                            v => {
                                let n = (v === null || v === "null" || v === "") ? 0 : Number(v);
                                if (n < 0) n = 0;
                                n = Math.round(n);
                                return n === 0 ? "0" : n;
                            }, 
                            "11px",
                            v => { 
                                let n = (v === null || v === "null" || v === "") ? 0 : Number(v);
                                if (n < 0) n = 0;
                                return n <= XCCinLims.verde ? "fondo-verde" : (n <= XCCinLims.rojo ? "fondo-naranja" : "fondo-rojo");  
                            },
                            "0px",
                            v => {
                                let n = (v === null || v === "null" || v === "") ? 0 : Number(v);
                                if (n < 0) n = 0;
                                return "CIN: " + Math.round(n) + " J/kg";
                            }
                        );
                    } else {
                        const emptyArr = new Array(horas.length).fill(null);
                        renderEcmwfData(filaTecho, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaCape, emptyArr, () => "", "9px", () => "");
                        renderEcmwfData(filaCin, emptyArr, () => "", "9px", () => "");
                    }
                    if (!chkMostrarCizalladura && chkMostrarXC && filaTecho) {
                        Array.from(filaTecho.children).forEach(td => {
                            td.style.borderTop = "1px solid #000";
                        });
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
			
            // const coloresNota =[
            //     "#fb796e", // 0  (Rojo inicial)
            //     "#ffa500", // 5  (Naranja medio intermedio)
            //     "#6befaf"  // 10 (Verde final)
            // ];

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
                } else {
                    // Si no hay Grupo 2 (XC desactivado), la celda principal debe redondearse también por abajo
                    tdCondiciones.classList.add("celda-condiciones-final");
                }
			}

            // 2. Guardamos el grupo en la lista para ordenar
			listaFilasParaOrdenar.push({
				nota: horasValidas > 0 ? notaFinal : -1, 
				notaXC: horasValidasXC > 0 ? notaFinalXC : -1, // Guardamos también la nota XC
				elementos: todasLasFilas 
			});

		}); // <--- FIN DEL BUCLE despegues.forEach
		
		// Solo ordenamos por nota si NO estamos en modo edición. 
		if (!modoEdicionFavoritos) {
			// 1. Ordenamos el array de mayor a menor nota
			listaFilasParaOrdenar.sort((a, b) => {
                // Si el usuario quiere ordenar por XC y además el XC está visible
                if (chkOrdenarPorXC && chkMostrarXC) {
                    if (b.notaXC === a.notaXC) {
                        return b.nota - a.nota; // Desempate: Si el XC es igual, gana el que tenga mejor viento
                    }
                    return b.notaXC - a.notaXC; // Orden principal por XC
                } 
                // Ordenación estándar (Por Condiciones de Despegue)
                else {
                    if (b.nota === a.nota) {
                        return b.notaXC - a.notaXC; // Desempate: Si el viento es igual, gana el que tenga mejor XC
                    }
                    return b.nota - a.nota; // Orden principal por Despegue
                }
            });
		}
		
		// 2. Ahora que están ordenados, los metemos en la tabla uno a uno
		listaFilasParaOrdenar.forEach(item => {
			item.elementos.forEach(fila => {
				tbodyFragmento.appendChild(fila);
			});
		});
		
		tbody.appendChild(tbodyFragmento);

		aplicarFiltrosVisuales();

		// const chkMostrarSoloHorasDiurnas = localStorage.getItem("METEO_CHECKBOX_SOLO_HORAS_DE_LUZ") === "true";

		if (soloHorasDeLuz) {
			const chk = document.getElementById("chkMostrarSoloHorasDiurnas");
			if (chk) chk.checked = true;
			document.body.classList.add("solo-dia");
		}
		
        // 1. Lógica de salida: con o sin animación
		if (!silencioso) {
			ocultarLoading();

			setTimeout(() => {
				localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO');
				localStorage.removeItem('METEO_CRASH_COUNTER');
				
				const scrollOptions = { top: 0, behavior: 'smooth' };

				const wrapper = document.querySelector('.tabla-wrapper');
				if (wrapper) wrapper.scrollTo(scrollOptions);

				const principal = document.querySelector('.contenedor-principal-tabla');
				if (principal) principal.scrollTo(scrollOptions);

				window.scrollTo(scrollOptions);
			}, 100);
		} else {
			// En modo silencioso no tocamos el scroll ni mostramos loader
			localStorage.removeItem('METEO_FLAG_CRASH_DETECTADO');
			localStorage.removeItem('METEO_CRASH_COUNTER');
		}		

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
// 🔴 OTRAS FUNCIONES
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

function alternardivConfiguracion(event) {
	const divconfiguracion = document.getElementById("div-configuracion");
    if (!divconfiguracion) return;

	const estabaActivo = divconfiguracion.classList.contains("activo");

	divconfiguracion.classList.toggle("activo", !estabaActivo);
	
    const btnConfigAntiguo = document.getElementById("btn-div-configuracion-toggle");
	if (btnConfigAntiguo) btnConfigAntiguo.classList.toggle("activo", !estabaActivo);

    if (typeof setModoEnfoque === "function") { setModoEnfoque(!estabaActivo); }

    // --- NUEVA LÓGICA: Iluminar el botón correcto del menú inferior ---
    if (typeof window.activarMenuInferior === 'function') {
        if (!estabaActivo) {
            // Si el panel estaba cerrado y lo acabamos de ABRIR, iluminamos Ajustes
            window.activarMenuInferior(document.getElementById('nav-settings'));
        } else {
            // Si el panel estaba abierto y lo acabamos de CERRAR, 
            // miramos qué hay en pantalla para devolverle el foco azul
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

function btnRestablecerConfiguración() {

	GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2em; margin: 0;">🔄</p>
                <p><b>⚠️ ATENCIÓN:</b> Esta acción reseteará la configuración a la original y desmarcará todos los despegues favoritos.</p>
            </div>
        `,
        botones: [            
            {
				texto: 'Cancelar',
				onclick: function() {
					GestorMensajes.ocultar();
				},
				estilo: 'secundario'
			},
			{ 
                texto: 'Aceptar', 
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

const mostrarLoading = () => {
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) {
        overlay.classList.add('loader-activo');
    }
};

const ocultarLoading = () => {
    const overlay = document.getElementById('msgActualizando...');
    if (overlay) {
        overlay.classList.remove('loader-activo');
        
        // Forzamos un reflow (repintado) por si se vuelve a llamar rápido
        void overlay.offsetWidth; 
    }
};

// ---------------------------------------------------------------
// 🔴 BUSCADOR Y FILTROS VISUALES (Texto y Distancia)
// ---------------------------------------------------------------

function aplicarFiltrosVisuales() {
    // 1. Obtener valores de Búsqueda de Texto
    const input = document.getElementById('buscador-despegues-provincias');
    const filtro = input ? input.value.toLowerCase() : "";
    const normalizar = (texto) => texto.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const filtroLimpio = normalizar(filtro);

    // 2. Obtener valores de Filtro de Distancia
    const sliderDistElem = document.getElementById('distancia-slider');
    let distanciaLimite = 9999;
    if (sliderDistElem && sliderDistElem.noUiSlider) {
        const idxDist = Math.round(parseFloat(sliderDistElem.noUiSlider.get()));
        distanciaLimite = CORTES_DISTANCIA_GLOBAL[idxDist];
    }
    const centroLatFiltro = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL')) || null;
    const centroLonFiltro = parseFloat(localStorage.getItem('METEO_FILTRO_DISTANCIA_LON_INICIAL')) || null;

    // 3. Preparativos de la tabla
    const tabla = document.getElementById('tabla');
    const tbody = tabla.tBodies[0];
    if (!tbody) return;

    const filas = tbody.rows;
    let visibles = 0;
    const favoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n)); // Seguro Numérico
    const totalFavoritos = favoritos.length;

    // CÁLCULO DINÁMICO DE FILAS POR BLOQUE 
    let filasPorDespegue = 5; 
    if (chkMostrarProbPrecipitacion) filasPorDespegue++;
    if (chkMostrarVientoAlturas) filasPorDespegue += 3;
    if (chkMostrarXC) filasPorDespegue += 3;
    if (chkMostrarCizalladura) filasPorDespegue++;

    // 4. BUCLE DE FILTRADO SÚPER RÁPIDO (Solo DOM/CSS)
    for (let i = 0; i < filas.length; i += filasPorDespegue) {

        const filaPrincipal = filas[i];      
        if (!filaPrincipal) continue;
		
        // A) Comprobar Texto
		let txtBusqueda = "";
        if (modoEdicionFavoritos) {
            const txtRegion = filaPrincipal.cells[1] ? filaPrincipal.cells[1].textContent : "";
            const txtProvincia = filaPrincipal.cells[2] ? filaPrincipal.cells[2].textContent : "";
            const txtDespegue = filaPrincipal.cells[3] ? filaPrincipal.cells[3].textContent : "";
            txtBusqueda = normalizar(txtRegion + " " + txtProvincia + " " + txtDespegue);
        } else {
            const celda = filaPrincipal.cells[0];
            txtBusqueda = celda ? normalizar(celda.textContent) : "";
        }
        let pasaTexto = txtBusqueda.includes(filtroLimpio);

        // B) Comprobar Distancia
        let pasaDistancia = true;
        if (distanciaLimite < 9999 && centroLatFiltro !== null && centroLonFiltro !== null) {
            const latSpot = parseFloat(filaPrincipal.dataset.lat);
            const lonSpot = parseFloat(filaPrincipal.dataset.lon);
            
            if (!isNaN(latSpot) && !isNaN(lonSpot)) {
                const distReal = obtenerDistanciaKm(centroLatFiltro, centroLonFiltro, latSpot, lonSpot);
                if (distReal > distanciaLimite) {
                    pasaDistancia = false;
                }
            }
        }

        // C) Evaluar y Ocultar/Mostrar el bloque completo
        const coincide = (pasaTexto && pasaDistancia);
        if (coincide) visibles++;
        
        const displayStyle = coincide ? '' : 'none';

        for (let j = 0; j < filasPorDespegue; j++) {
            const fila = filas[i + j];
            if (fila) {
                fila.style.display = displayStyle;
            }
        }
    }
    
    // 5. EFECTOS VISUALES Y CONTADORES
    
    // Marcar input en rojo si no hay resultados
    if (input) {
        if (visibles === 0 && filtroLimpio.length > 0) {
            input.classList.add('buscador-despegues-sin-resultados');
        } else {
            input.classList.remove('buscador-despegues-sin-resultados');
        }
    }

    // Actualizar Contador Superior (modo Edición favoritos)
    const divContador = document.getElementById('contador-despegues');
    const btnIncNoFavs = document.getElementById('btn-incluir-no-favs-distancia');
    const incluirNoFavs = btnIncNoFavs ? btnIncNoFavs.classList.contains('activo') : false;

    if (divContador) {
        if (modoEdicionFavoritos) {
            if (soloFavoritos) {
                const htmlNumeroFiltrado = `<span class="contador-badge-filtro" title="Filtro activo"><img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro"><b>${visibles}</b></span>`;
                divContador.innerHTML = `${htmlNumeroFiltrado} despegues favoritos (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">) de <b>${totalDespeguesDisponibles}</b> disponibles`;
            } else if (visibles < totalDespeguesDisponibles) {
                const htmlNumeroFiltrado = `<span class="contador-badge-filtro" title="Filtro activo"><img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro"><b>${visibles}</b></span>`;
                divContador.innerHTML = `${htmlNumeroFiltrado} de <b>${totalDespeguesDisponibles}</b> despegues disponibles`;
            } else {
                divContador.innerHTML = `<b>${totalDespeguesDisponibles}</b> despegues disponibles`;
            }
        } else {
            let distanciaLimiteParaFavs = 9999;
            if (sliderDistElem && sliderDistElem.noUiSlider) {
                const idxDist = Math.round(parseFloat(sliderDistElem.noUiSlider.get()));
                distanciaLimiteParaFavs = CORTES_DISTANCIA_GLOBAL[idxDist];
            }
            const ignorarFiltroFavoritos = (distanciaLimiteParaFavs < 9999 && incluirNoFavs);

            if (ignorarFiltroFavoritos) {
                const htmlNumeroFiltrado = `<span class="contador-badge-filtro" title="Filtro activo"><img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro"><b>${visibles}</b></span>`;
                divContador.innerHTML = `${htmlNumeroFiltrado} de <b>${totalDespeguesDisponibles}</b> despegues disponibles (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">+<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">)`;
            } else if (totalFavoritos === 0) {
                divContador.innerHTML = `Total de despegues disponibles: ${totalDespeguesDisponibles}`;
            } else {
                if (visibles < totalFavoritos || distanciaLimite < 9999) {
                    const htmlNumeroFiltrado = `<span class="contador-badge-filtro" title="Filtro activo"><img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro"><b>${visibles}</b></span>`;
                    divContador.innerHTML = `${htmlNumeroFiltrado} de <b>${totalFavoritos}</b> despegues favoritos (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">)`;
                } else {
                    divContador.innerHTML = `<b>${visibles}</b> despegues favoritos (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">)`;
                }
            }
        }
    }

    // Actualizar Mini-Contador (modo Normal)
    const miniCounter = document.getElementById('header-contador-mini');

    if (miniCounter && !modoEdicionFavoritos) {
        const totalFavs = favoritos.length;
        
        // Detectamos si el botón de "incluir no favoritos" está activo
        const btnIncNoFavs = document.getElementById('btn-incluir-no-favs-distancia');
        const incluirNoFavsActivo = btnIncNoFavs ? btnIncNoFavs.classList.contains('activo') : false;

        // Comprobamos si hay filtros activos
        const hayFiltroTexto = filtroLimpio.length > 0;
        const hayFiltroDistancia = distanciaLimite < 9999;
        const hayFiltros = hayFiltroTexto || hayFiltroDistancia;

        if (incluirNoFavsActivo) {
            // --- MODO "BASE DE DATOS TOTAL" (Corazón oculto) ---
            // Mostramos cuántos se ven respecto al total global de despegues
            miniCounter.innerHTML = `${visibles} de ${totalDespeguesDisponibles}`;
            miniCounter.title = "Número de despegues visibles de la base de datos completa";
        } else {
            // --- MODO "FAVORITOS" (Corazón visible) ---
            miniCounter.title = "Número de despegues favoritos / filtrados";
            
            if (hayFiltros) {
                miniCounter.innerHTML = `${visibles} de ${totalFavs} <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️" style="width:13px;height:13px;">`;
            } else {
                miniCounter.innerHTML = `${totalFavs} <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️" style="width:13px;height:13px;">`;
            }
        }
    }

    if (modoEdicionFavoritos) {
        const thFavorito = document.getElementById('id-thFavorito'); 
        if(thFavorito) thFavorito.innerHTML = '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
    }

    // 6. SUGERENCIAS OTROS DESPEGUES (Solo para texto, ignora distancia)
	let divSugerencias = document.getElementById('sugerencias-globales');
	if (!divSugerencias) {
		divSugerencias = document.createElement('div');
		divSugerencias.id = 'sugerencias-globales'; 
		if (input && input.parentNode) {
			input.parentNode.insertBefore(divSugerencias, input.nextSibling);
		}
	}

    if (filtroLimpio.length > 2 && !modoEdicionFavoritos && visibles === 0) {
        const coincidenciasGlobales = window.bdGlobalDespegues.filter(d => {
            const nombreSoloDespegue = normalizar(d.Despegue);
            const yaEsFavorito = favoritos.includes(Number(d.ID));
            return !yaEsFavorito && nombreSoloDespegue.includes(filtroLimpio);
        });

		if (coincidenciasGlobales.length > 0) {
			let html = `<p class="sugerencia-aviso">💡 No tienes favoritos con * <b>${filtroLimpio}</b> *, pero tienes disponibles en la base de datos de despegues:</p><ul class="sugerencia-lista">`;
			coincidenciasGlobales.slice(0, 3).forEach(d => {
				html += `
					<li class="sugerencia-item">
						<span class="sugerencia-texto"><b>${d.Despegue}</b> <br><small style="color:#666;">(${d.Provincia})</small></span>
						<button class="sugerencia-btn" onclick="agregarDespegueDesdeBuscador(${d.ID})">+ Añadir favorito <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"></button>
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

    // 7. AUTO-SCROLL AL INICIO
    // Si estamos aplicando filtros (hay texto o distancia < Todo), subimos al inicio de la tabla
    if (filtroLimpio.length > 0 || distanciaLimite < 9999) {
        const wrapper = document.querySelector('.tabla-wrapper');
        const principal = document.querySelector('.contenedor-principal-tabla');
        
        const scrollOptions = { top: 0, behavior: 'smooth' }; // Usamos 'instant' para que sea súper ágil. La otra opción sería smooth

        if (wrapper) wrapper.scrollTo(scrollOptions);
        if (principal) principal.scrollTo(scrollOptions);
        window.scrollTo(scrollOptions);
    }
}

// Función auxiliar para el botón del buscador
function agregarDespegueDesdeBuscador(idDespegue) {
    idDespegue = Number(idDespegue); // Aseguramos que sea un número
    const misFavoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n));
    
    if (!misFavoritos.includes(idDespegue)) {
        misFavoritos.push(idDespegue);
        
        localStorage.setItem("METEO_FAVORITOS_LISTA", JSON.stringify(misFavoritos));
		
		limpiarBuscador();
        
        // Limpiamos el buscador visualmente ya
        const input = document.getElementById('buscador-despegues-provincias');
        if (input) input.value = "";
        
        const divSugerencias = document.getElementById('sugerencias-globales');
        if (divSugerencias) divSugerencias.style.display = 'none';

        // Intentar encontrar el nombre en la BD global para mostrarlo en el mensaje
        const despegueObj = window.bdGlobalDespegues.find(d => Number(d.ID) === idDespegue);
        const nombreDespegue = despegueObj ? despegueObj.Despegue : idDespegue;

        if (typeof GestorMensajes !== 'undefined') {
            GestorMensajes.mostrar({
                tipo: 'modal',
                htmlContenido: `<p>✅ <b>${nombreDespegue}</b> añadido</p>`,
                botones: [] // Sin botones, porque se cerrará solo
            });

            // Metemos la construcción de la tabla DENTRO del timeout
            // Así nos aseguramos de que el mensaje se gestiona antes de la carga pesada
            setTimeout(function() {
                // 1. Ocultamos mensaje
                GestorMensajes.ocultar(); 
                
                // 2. Construimos la tabla justo después
                construir_tabla(); 
            }, 1300); // Espera 1,3 seg para que vea el mensaje

        } else {
            // Fallback por si no existe el gestor
            alert(`✅ ${nombreDespegue} añadido a favoritos`);
            construir_tabla();
        }
    }
}

// Función global para limpiar el buscador, restaurar el placeholder. Antes estaba en el ...Listener ('DOMContentLoaded', function() {
const placeholderOriginal = '🔍 Buscar despegue o provincia...';
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
    inputBuscador.placeholder = placeholderOriginal;
    
    aplicarFiltrosVisuales();
}

// ---------------------------------------------------------------
// 🟦🟦🟦🟦🟦 DOM CONTENT LOADED
// ---------------------------------------------------------------
/* Garantiza que JavaScript se ejecute solo cuando todo el HTML y el CSS (incluidas las clases que definiste) ya están cargados en el navegador.
 */
document.addEventListener('DOMContentLoaded', function() {
	
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
                    htmlContenido: `
                        <div style="text-align: center;">
                            <p>ℹ️ Error al cargar la tabla.</p>
                            <p>Posible causa: <b>exceso de favoritos</b> para los recursos disponibles del dispositivo.</p>
                            <p>Se va a abrir ahora la <b>Pantalla de edición de despegues favoritos</b> para que puedas desmarcar algunos despegues y disminuir la carga.</p>
                            <p>Si crees que es otra causa temporal: selecciona <b><i>Finalizar edición de favoritos</i></b>, reinicia el dispositivo y vuelve a intentarlo.</p>
                        </div>
                    `,
                    botones: [{
                        texto: 'Aceptar',
                        onclick: function() {
                            GestorMensajes.ocultar();
                            activarEdicionFavoritos();
                        }
                    }]
                });
            } else {
                alert("La aplicación está teniendo problemas para cargar. Se activará la Edición de favoritos para desmarcar algunos despegues.");
                activarEdicionFavoritos();
            }
        }

    } else {
        // 1. Capturamos los parámetros de la URL
        const params = new URLSearchParams(window.location.search);
        const tieneCoords = params.has('lat') && params.has('lon');

        if (tieneCoords) {
            // --- 🚀 ARRANQUE POR COORDENADAS ---
            
            // 2. Cargamos la tabla en segundo plano (silencioso)
            // Esto es vital para ocultar el Splash Screen y que los datos existan
            construir_tabla(false, true); 

            // 3. Cambiamos a la vista de mapa
            cambiarVista('mapa');

            // 4. ILUMINAR EL BOTÓN (Con un pequeño retraso de seguridad)
            // Le damos 100ms para asegurar que el navegador ha terminado de procesar el HTML base
            setTimeout(() => {
                const btnMap = document.getElementById('nav-map');
                if (btnMap && typeof window.activarMenuInferior === 'function') {
                    window.activarMenuInferior(btnMap);
                } else if (btnMap) {
                    // Fallback manual si la función aún no estuviera definida globalmente
                    document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
                    btnMap.classList.add('active');
                }
            }, 150);

        } else {
            // --- ARRANQUE NORMAL ---
            construir_tabla();
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
        // Forzamos el foco de nuevo al input
        setTimeout(() => {
            inputBuscador.focus();
        }, 10); 
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
        // Ocultamos la 'X' inmediatamente al perder el foco
        //botonLimpiar.style.display = 'none';

        // SÓLO si el campo está vacío, restauramos el placeholder.
        if (this.value === '') {
            this.placeholder = placeholderOriginal;
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
                    <p style="font-size: 1.2em; font-weight: bold;">ℹ️ Novedades en datos XC</p>
                    <div style="text-align: left; font-size: 0.95em; line-height: 1.5; color: #333;">
                        <ul style="padding-left: 20px; margin-top: 10px;">
                            <li><b>La puntuación de Condiciones XC (condiciones térmicas para iniciar vuelo de distancia) es independiente de la puntuación de Condiciones para despegar:</b> Ahora valora solo el potencial térmico (Techo, CAPE y CIN), ignorando la orientación y el viento en el despegue. Solo puntúa 0 en caso de lluvia o riesgo extremo de tormenta.</li>
                            <li><b>El Techo es altitud (MSL):</b> el Techo ahora muestra la altura respecto al nivel del mar (altitud). Antes mostraba la altura sobre el suelo (AGL). Esto reduce errores, al usar la altitud media de la celda ECMWF y es más útil para planificar XC.</li>
                            <li><b>Cálculo de Techo más realista:</b> Se aplica una correción 0.85 (15% menos) al Techo original del modelo para compensar la tasa de caída media del parapente.</li>
                        </ul>
                    <p>💡 Puedes ver esta información, la del resto de datos meteorológicos y la de puntuación, seleccionando los iconos 🌦️ o ⭐ en la cabecera de la tabla.</p>
                    </div>
                </div>
            `,
            botones: [
                {
                    texto: 'Entendido',
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
                    if (val >= 9999) return "";
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

            // Si existe Capacitor (es la App), vibramos. Si es web, no hace nada.
            if (typeof Capacitor !== 'undefined') { Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); }

			const valorNuevo = Math.round(values[0]);
			const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
			const btnToggle = document.getElementById('btn-div-filtro-distancia-toggle');
			const navDistance = document.getElementById('nav-distance'); // El nuevo botón de abajo
			const btnReset = document.getElementById('btn-reset-filtro-distancia');

			if (valorNuevo < MAX_INDEX) {
				if (btnToggle) btnToggle.classList.add('filtro-aplicado'); // Solo si existe
				if (navDistance) navDistance.classList.add('filtro-aplicado'); // Ponemos rojo el de abajo
				if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo');
				if (btnReset) btnReset.style.display = 'block';
			} else {
				if (btnToggle) btnToggle.classList.remove('filtro-aplicado');
				if (navDistance) navDistance.classList.remove('filtro-aplicado');
				if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo');
				if (btnReset) btnReset.style.display = 'none';
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
					
                    // --- CORRECCIÓN BUG: Actualizamos la variable ANTES de mover el slider
                    // para evitar que la librería entre en un bucle y lance el mensaje 2 veces.
					ultimaDistanciaConfirmada = MAX_INDEX;
                    distanciaSlider.noUiSlider.set(MAX_INDEX);
					
					// Limpieza visual inmediata
					const panel = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
					if (panel) panel.classList.remove('borde-rojo-externo');
					document.getElementById('btn-reset-filtro-distancia').style.display = 'none';

					GestorMensajes.mostrar({
						tipo: 'modal',
						htmlContenido: `
                            <div style="text-align: center;">
                            <p style="font-size: 2.5em; margin: 0 0 10px 0; color: #0078d4;"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></p>
							<p>La primera vez se necesita configurar un punto de origen.</p>
							<p>Podrás cambiarlo cuando quieras con el botón <span style='background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block; padding: 0 2px;'><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -0.125em;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span></p>
                            </div>
						`,
						botones:[
							{ texto: 'Cancelar', estilo: 'secundario', onclick: function() { GestorMensajes.ocultar(); } },
                            { texto: 'Configurar origen', onclick: function() { 
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
				aplicarFiltrosVisuales(); 
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
        if (typeof Capacitor !== 'undefined') { Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); }
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
			// Actualizamos variable de control
			ultimaVelocidadConfirmada = valoresNuevos;

			let [vMin, vIdeal, vMax] = valoresNuevos;
			const RachaActual = Number(rachaSlider.noUiSlider.get());

			// Corrección de lógica de negocio (Max no puede superar Racha)
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
        if (typeof Capacitor !== 'undefined') { Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); }
    });

	// 2. Variable de estado inicial para RACHA
	let ultimaRachaConfirmada = RachaMax;

	rachaSlider.noUiSlider.on('change', function (values) {
		let RachaNueva = Number(values[0]);

		// Comprobamos contra la variable guardada
		if (RachaNueva !== ultimaRachaConfirmada) {
			
			// Actualizamos variable de control
			ultimaRachaConfirmada = RachaNueva;

			const VelRaw = velocidadSlider.noUiSlider.get();
			const VelMaxActual = Number(Array.isArray(VelRaw) ? VelRaw[2] : VelRaw);

			// Corrección de lógica de negocio
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
        if (typeof Capacitor !== 'undefined') { Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); }
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
    let currentStatusText = 'Cargando...'; 
    let currentStatusTextEcmwf = 'Cargando...'; 
    let lastDataGenerationTimestamp = 0;
    let lastDataGenerationTimestampEcmwf = 0; 
    let jsonModelInitTimestamp = 0; 
    let jsonModelInitTimestampEcmwf = 0; 

    // ===============================================================
    // 2. GESTOR CENTRAL DE CONEXIÓN (El Cerebro)
    // ===============================================================
    
    function gestionarCambioConexion(estadoDetectado) {
        if (estadoDetectado === 'offline') {
            // Cancelamos cualquier intento de volver a online
            if (timerOnline) { clearTimeout(timerOnline); timerOnline = null; }

            // Si ya estamos avisando de offline, no hacemos nada.
            // Si NO estamos avisando, iniciamos la cuenta atrás de 1 minuto.
            if (!avisoOfflineActivo && !timerOffline) {
                console.log(new Date().toLocaleString(), `⏳ Detectada desconexión. Esperando ${TIEMPO_CONFIRMACION_OFFLINE/1000}s...`); // 1 min
                timerOffline = setTimeout(() => {
                    console.log("❌ TIEMPO AGOTADO: Activando Modo Offline.");
                    avisoOfflineActivo = true; // ¡Aquí activamos la alerta visual!
                    cicloActualizacion();      // Refrescamos pantalla para que salga la nube
                    timerOffline = null;
                }, TIEMPO_CONFIRMACION_OFFLINE);
            }
        } 
        else if (estadoDetectado === 'online') {
            // Cancelamos cualquier cuenta atrás hacia offline (el túnel ha terminado)
            if (timerOffline) { 
                clearTimeout(timerOffline); 
                timerOffline = null; 
                //console.log(new Date().toLocaleString(), "✅ Recuperado antes de 1 min");
            }

            // Si estábamos en modo offline (aviso activo) O si arrancamos sin red (esModoOffline)
            if ((avisoOfflineActivo || esModoOffline) && !timerOnline) {
                 console.log(new Date().toLocaleString(), `📶 Red detectada. Esperando ${TIEMPO_CONFIRMACION_ONLINE/1000}s de estabilidad...`);
                 timerOnline = setTimeout(() => {
                    // *** Doble check de seguridad por si acaso ***
                    if (navigator.onLine === false) return;

                     console.log(new Date().toLocaleString(), "Conexión estable. Recargando datos...");
                     avisoOfflineActivo = false; // Quitamos la alerta
                     esModoOffline = false;      // Quitamos flag de caché inicial
                     cicloActualizacion();       // Refrescamos y pedimos datos nuevos
                     construir_tabla(true);
                     timerOnline = null;
                 }, TIEMPO_CONFIRMACION_ONLINE);
            }
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

                dataGenElement.innerHTML = `<span style="color: #ff8400; font-weight: bold; padding-left: 15px; display: block; margin-top: 4px;">⚠️ No hay conexión a Internet. Antigüedad datos: ${timeAgoGen}.</span>`;
                
            } else if (lastDataGenerationTimestamp > 0 && !hayErrorData) {
                
                // --- 1. TEXTOS DE PASADO ---
                const timeAgoMF = typeof formatTimeAgo === 'function' ? formatTimeAgo(lastDataGenerationTimestamp, ahoraMs) : '';
                const timeAgoEC = (typeof formatTimeAgo === 'function' && lastDataGenerationTimestampEcmwf > 0) ? formatTimeAgo(lastDataGenerationTimestampEcmwf, ahoraMs) : '...';
                
                const refMF = (jsonModelInitTimestamp > 0 && typeof formatHourUTC === 'function') ? formatHourUTC(new Date(jsonModelInitTimestamp)) : '';
                const refEC = (jsonModelInitTimestampEcmwf > 0 && typeof formatHourUTC === 'function') ? formatHourUTC(new Date(jsonModelInitTimestampEcmwf)) : '';

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
                        textoFuturoMF = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En cualquier momento...⌛</span>`;
                    } else {
                        if (!proximaFechaMF) {
                            const [hora, min] = HorariosMediosActualizacion[0].split(':').map(Number);
                            proximaFechaMF = new Date(ahora);
                            proximaFechaMF.setUTCDate(proximaFechaMF.getUTCDate() + 1); 
                            proximaFechaMF.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsMF = (proximaFechaMF.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsMF <= 0) {
                            textoFuturoMF = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En cualquier momento...⌛</span>`;
                        } else {
                            const diffMinsMF = Math.floor(diffMsMF / 60000) % 60;
                            const diffHorasMF = Math.floor(Math.floor(diffMsMF / 60000) / 60);
                            let textoMF = diffHorasMF > 0 ? `~${diffHorasMF} h ${diffMinsMF} min` : `~${diffMinsMF} min`;
                            textoFuturoMF = `🔄 Próxima: <b>${textoMF}</b>`;
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
                        textoFuturoEC = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En cualquier momento... ⌛</span>`;
                    } else {
                        if (!proximaFechaEC) {
                            const [hora, min] = HorariosMediosActualizacionEcmwf[0].split(':').map(Number);
                            proximaFechaEC = new Date(ahora);
                            proximaFechaEC.setUTCDate(proximaFechaEC.getUTCDate() + 1); 
                            proximaFechaEC.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsEC = (proximaFechaEC.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsEC <= 0) {
                            textoFuturoEC = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En cualquier momento... ⌛</span>`;
                        } else {
                            const diffMinsEC = Math.floor(diffMsEC / 60000) % 60;
                            const diffHorasEC = Math.floor(Math.floor(diffMsEC / 60000) / 60);
                            let textoEC = diffHorasEC > 0 ? `~${diffHorasEC} h ${diffMinsEC} min` : `~${diffMinsEC} min`;
                            textoFuturoEC = `🔄 Próxima: <b>${textoEC}</b>`;
                        }
                    }
                }

                // --- 3. DIBUJAR LISTA UNIFICADA ---
                dataGenElement.innerHTML = `
                    <ul style="margin: 5px 0 0 0; padding-left: 30px; padding-right: 10px; list-style-type: disc; line-height: 1.4; text-align: left;">
                        <li style="margin-bottom: 8px;">
                            <b>Météo-France:</b> hace <b>${timeAgoMF}</b> <span style="color:#777; font-style:italic;">(ref. ${refMF}Z)</span><br>
                            <span>${textoFuturoMF}</span>
                        </li>
                        <li>
                            <b>ECMWF:</b> hace <b>${timeAgoEC}</b> <span style="color:#777; font-style:italic;">(ref. ${refEC}Z)</span><br>
                            <span>${textoFuturoEC}</span>
                        </li>
                    </ul>`;
                    
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
            // Hacemos las dos peticiones a la vez (si una falla, no bloquea a la otra)
            const [resMF, resECMWF] = await Promise.all([
                fetch("https://flydecision.com/json_timestamp_and_model_run_ref_time.txt?t=" + Date.now(), { cache: "no-store" }).catch(() => null),
                fetch("https://flydecision.com/json_timestamp_and_model_run_ref_time_ecmwf.txt?t=" + Date.now(), { cache: "no-store" }).catch(() => null)
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

        } catch (e) {
            console.warn("Error general timestamps:", e.message);
        }
    }

    async function PanelInfoActualizaciones_Status_auto_actualizaciones() {
        if (!navigator.onLine) return 60000;

        let nuevoIntervalo = 60000;
        let redMF = false;
        let redECMWF = false;

        try {
            const[resMF, resECMWF] = await Promise.all([
                fetch('https://flydecision.com/meteo-status.txt?t=' + Date.now()).catch(() => null),
                fetch('https://flydecision.com/meteo-status-ecmwf.txt?t=' + Date.now()).catch(() => null)
            ]);

            let currentlyUpdatingMF = false;
            let currentlyUpdatingEC = false;

            // --- ESTADO MÉTÉO-FRANCE ---
            if (resMF && resMF.ok) {
                redMF = true;
                currentStatusText = (await resMF.text()).trim();
                const upperText = currentStatusText.toUpperCase();

                if (upperText.includes("OPERATIVO")) {
                    currentlyUpdatingMF = false;
                } else if (!upperText.includes("ERROR") && !upperText.includes("FATAL") && !upperText.includes("FAILED")) {
                    currentlyUpdatingMF = true;
                    nuevoIntervalo = 5000; // Aceleramos
                }
            }

            // --- ESTADO ECMWF ---
            if (resECMWF && resECMWF.ok) {
                redECMWF = true;
                currentStatusTextEcmwf = (await resECMWF.text()).trim();
                const upperTextE = currentStatusTextEcmwf.toUpperCase();

                if (upperTextE.includes("OPERATIVO")) {
                    currentlyUpdatingEC = false;
                } else if (!upperTextE.includes("ERROR") && !upperTextE.includes("FATAL") && !upperTextE.includes("FAILED")) {
                    currentlyUpdatingEC = true;
                    nuevoIntervalo = 5000; // Aceleramos
                }
            } else {
                if (currentStatusTextEcmwf === 'Cargando...') currentStatusTextEcmwf = "Esperando primer dato...";
            }

            // --- LÓGICA DE AVISO (MODAL) Y CUENTA ATRÁS ---
            
            // 1. Detectar si alguno ha terminado de actualizar (pasó de true a false)
            const mfTermino = (window.oldUpdatingMF && !currentlyUpdatingMF);
            const ecTermino = (window.oldUpdatingEC && !currentlyUpdatingEC);

            let modelosRecientes = [];
            if (mfTermino) modelosRecientes.push("Viento (Météo-France: Arome-HD y Arpege)");
            if (ecTermino) modelosRecientes.push("Meteo general y condiciones térmicas XC (ECMWF)");

            if (modelosRecientes.length > 0) {
                if (guiaActiva) {
                    // Si la guía está activa, guardamos los nombres para mostrarlos luego
                    actualizacionesPendientes = actualizacionesPendientes.concat(modelosRecientes);
                    // Quitamos duplicados por si acaso se actualizan dos veces en una guía larguísima
                    actualizacionesPendientes = [...new Set(actualizacionesPendientes)];
                } else {
                    // Si no hay guía, los mostramos directamente
                    mostrarAvisoActualizacionMeteo(modelosRecientes);
                }
            }

            // 2. Guardamos el estado en la ventana para leerlo en el siguiente segundo
            window.oldUpdatingMF = currentlyUpdatingMF;
            window.oldUpdatingEC = currentlyUpdatingEC;

            // 3. Modificamos tu variable global para que la UI (la cuenta atrás) se oculte
            //    si *CUALQUIERA* de los dos está en pleno proceso.
            statusActualizaciónEnCurso = (currentlyUpdatingMF || currentlyUpdatingEC);

            // --- RED ---
            if (!redMF && !redECMWF) {
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

        // Si el gestor dice que estamos Offline confirmado, no gastamos datos en fetch
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
        }

        refrescoPanelInfoActualizaciones(); // Pintamos la pantalla
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

    // Esperamos a que TODA la web (imágenes, estilos, scripts) esté cargada
    window.addEventListener('load', () => {

        iniciarMonitorRedNativo();
        
        setTimeout(() => {
            //iniciarHeartbeat();
            cicloActualizacion(); 
        }, 3000); 
    });

	// ---------------------------------------------------------------
	// 🔴 CONFIGURACIÓN GLOBAL DE TOOLTIPS (TIPPY.JS)
	// ---------------------------------------------------------------
	// Usamos 'delegate' para que funcione tanto en botones estáticos (HTML)como en los dinámicos (creados por JS en la tabla) sin reinicializar.

    if (typeof tippy === 'function' && typeof tippy.delegate === 'function') {

        tippy.delegate('body', {
            target: '.btn-info, [data-tippy-content]',
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

            // INYECCIÓN DE ESTRUCTURA (X FIJA + CONTENIDO CON SCROLL)
            onCreate(instance) {
                const content = instance.props.content;

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
                scrollArea.innerHTML = content;
                
                // 4. Unimos todo
                // NOTA: No creamos un wrapper extra, inyectamos los dos elementos
                // directamente en el tippy-content, que ya tiene display: flex gracias al CSS
                fragment.appendChild(header);
                fragment.appendChild(scrollArea);

                // 5. Limpiamos y asignamos
                instance.setContent(fragment);
            }
        });
    }

	// ---------------------------------------------------------------
	// 🔴 LISTENER PARA CERRAR PANELES ABIERTOS AL TOCAR ÁREA VACÍA DEL MENÚ
	// ---------------------------------------------------------------
	
	function cerrarTodosLosPaneles() { // En desuso
		
        // Deshundo botones
        document.getElementById("btn-div-filtro-condiciones-toggle").classList.remove("activo");
        document.getElementById("btn-div-filtro-distancia-toggle").classList.remove("activo");
        document.getElementById("btn-div-configuracion-toggle").classList.remove("activo");
        
        // Cierro paneles
        document.getElementById("div-filtro-condiciones").classList.remove("activo");
        document.getElementById("div-filtro-distancia").classList.remove("activo");
        document.getElementById("div-configuracion").classList.remove("activo");
	}

    document.getElementById("chkMostrarVientoAlturas").checked = chkMostrarVientoAlturas;
    document.getElementById("chkMostrarCizalladura").checked = chkMostrarCizalladura;
    
    // ECMWF Checks
    //if (document.getElementById("chkMostrarPrecipitacion")) document.getElementById("chkMostrarPrecipitacion").checked = chkMostrarPrecipitacion;
    if (document.getElementById("chkMostrarProbPrecipitacion")) document.getElementById("chkMostrarProbPrecipitacion").checked = chkMostrarProbPrecipitacion;
    //if (document.getElementById("chkMostrarBaseNube")) document.getElementById("chkMostrarBaseNube").checked = chkMostrarBaseNube;
    if (document.getElementById("chkMostrarXC")) document.getElementById("chkMostrarXC").checked = chkMostrarXC;

    document.getElementById("chkMostrarXC").checked = chkMostrarXC;
    if (document.getElementById("chkOrdenarPorXC")) document.getElementById("chkOrdenarPorXC").checked = chkOrdenarPorXC;

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
		const btnReset = document.getElementById('btn-reset-filtro-distancia');

        const navDistance = document.getElementById('nav-distance');
        if (navDistance) navDistance.classList.remove('filtro-aplicado');

        if (divPanel) divPanel.classList.remove("activo");          // Cerrar panel
        if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo'); // Quitar borde panel
		if (btnReset) btnReset.style.display = 'none'; // Ocultar botón de reset

        // Recalcular botón azul al resetear y cerrar el panel
        if (typeof window.activarMenuInferior === 'function') {
            const searchContainer = document.getElementById('floating-search-container');
            const isSearchVisible = searchContainer && !searchContainer.classList.contains('floating-search-hidden');
            
            // Si el buscador está abierto, iluminamos 'Buscar'. Si no, iluminamos 'Inicio'.
            if (isSearchVisible) {
                window.activarMenuInferior(document.getElementById('nav-search'));
            } else {
                window.activarMenuInferior(document.getElementById('nav-home'));
            }
        }

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
                event.target.closest('#nav-settings') || /* <--- ¡ESTO ES LO QUE FALTABA! */
                event.target.closest('.tippy-box') ||        
                event.target.closest('.mensaje-modal') ||    
                event.target.closest('.mensaje-no-modal');

            if (!clicEnZonaProtegida) {
                if (typeof alternardivConfiguracion === 'function') {
                    alternardivConfiguracion(event);
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
            // Si la variable global dice que hay una guía, o si vemos la caja amarilla en pantalla
            if (typeof guiaActiva !== 'undefined' && guiaActiva === true) {
                // Driver.js no tiene un "hideAll" global accesible fácilmente si no guardamos la instancia,
                // pero sí tiene un botón de cerrar. Vamos a simular un clic en él.
                const btnCerrarGuia = document.querySelector('.driver-popover-close-btn');
                if (btnCerrarGuia) {
                    btnCerrarGuia.click();
                    return; // Detenemos el botón atrás aquí
                }
            }

            // --- PRIORIDAD 1: Mensajes MODALES (Bloqueantes) ---
            const modalAbierto = document.querySelector('.mensaje-modal.visible');
            if (modalAbierto) {
                GestorMensajes.ocultar();
                return; 
            }

            // --- PRIORIDAD 1.5: Modal de Geolocalización / Mapa Origen ---
            const modalMapaSelect = document.getElementById('modal-mapa');
            if (modalMapaSelect && modalMapaSelect.style.display !== 'none') {
                modalMapaSelect.style.display = 'none';
                return;
            }

            // --- PRIORIDAD 2: Modo Edición Favoritos ---
            if (typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos === true) {
                finalizarEdicionFavoritos();
                return; 
            }

            // --- PRIORIDAD 3: Otros Mensajes NO-MODALES ---
            const mensajeFlotante = document.querySelector('.mensaje-no-modal.visible');
            if (mensajeFlotante) {
                GestorMensajes.ocultar();
                return;
            }

            // --- PRIORIDAD 4: Paneles Laterales y Buscador ---
            
            // 1. Panel Configuración
            const panelConfig = document.getElementById("div-configuracion");
            if (panelConfig && panelConfig.classList.contains("activo")) {
                alternardivConfiguracion(); // Cierra el panel visualmente (y esta función ya ilumina el botón correcto)
                return;
            }

            // 2. Panel Filtro Distancia (Sincronización de menú en ambos casos)
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
                    // Si estaba filtrando: reseteamos datos, cerramos y ponemos icono en INICIO
                    if (typeof resetFiltroDistancia === 'function') {
                        resetFiltroDistancia(); 
                    }
                } else {
                    // Si solo estaba el panel abierto: cerramos visualmente y ponemos icono en INICIO
                    panelDistancia.classList.remove("activo");
                }
                
                // Asegura que el botón azul vuelva a Inicio
                window.activarMenuInferior(document.getElementById('nav-home'));
                return;
            }

            // 3. Buscador Flotante
            const searchContainer = document.getElementById('floating-search-container');
            const searchInput = document.getElementById('buscador-despegues-provincias');
            if (searchContainer && !searchContainer.classList.contains('floating-search-hidden')) {
                let tieneTexto = searchInput && searchInput.value.trim() !== '';
                
                if (tieneTexto) {
                    // Si había búsqueda real, limpiamos todo y reconstruimos
                    if (typeof limpiarBuscador === 'function') { limpiarBuscador(); }
                }
                
                // En cualquier caso, cerramos la barra visualmente y marcamos Inicio
                searchContainer.classList.add('floating-search-hidden');
                buscadorVisible = false;
                if (searchInput) searchInput.blur();
                window.activarMenuInferior(document.getElementById('nav-home'));
                return;
            }

            // Si estamos en el mapa, volver a la tabla
            const vistaMapa = document.getElementById('vista-mapa');
            if (vistaMapa && vistaMapa.style.display === 'flex') { // En tu código usas flex para el mapa
                cambiarVista('tabla');
                window.activarMenuInferior(document.getElementById('nav-home'));
                return; 
            }

            // --- PRIORIDAD FINAL: Salir de la App ---
            confirmarSalidaApp();
        });
    }

    // Función específica para preguntar antes de matar la app
    function confirmarSalidaApp() {
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: '<p>¿Quieres salir de la aplicación?</p>',
            botones: [
                {
                    texto: 'No',
                    onclick: function() { GestorMensajes.ocultar(); },
                    estilo: 'secundario'
                },
                {
                    texto: 'Sí, salir',
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
            //console.log(new Date().toLocaleString(), "📱 [Resume/Visible] Vuelto a primer plano");

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

                        // 2. COMPARAMOS
                        if (serverTimestamp > timestampDatosLocal) {
                            //console.log("🔄 Datos nuevos en servidor. Descargando JSON completo...");
                            // AHORA SÍ: Forzamos recarga total
                            await construir_tabla(true); 
                        } else {
                            //console.log("✅ No hay datos nuevos en servidor. Manteniendo caché local.");
                            // AHORA NO: Usamos false para tirar de caché RAM/LocalStorage
                            // Esto solo repinta la tabla (muy rápido) sin descargar nada
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
        if (btnMap && typeof activarMenuInferior === 'function') {
            activarMenuInferior(btnMap);
        }

        // 4. Lógica de enfoque en el mapa
        if (typeof map !== 'undefined' && map) {
            
            // LIMPIEZA: Cerramos cualquier popup que estuviera abierto de antes
            map.closePopup();

            // Esperamos a que la pestaña esté visible (transición CSS)
            setTimeout(() => {
                map.invalidateSize();
                
                // Si ya tenemos los marcadores cargados
                if (markersDespegues && markersDespegues.length > 0) {
                    const normalizar = (t) => t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
                    const term = normalizar(nombreDespegue);
                    
                    // Buscamos el marcador por nombre exacto o parcial
                    let target = markersDespegues.find(m => normalizar(m.metadata.despegue) === term);
                    if (!target) {
                        target = markersDespegues.find(m => normalizar(m.metadata.despegue).includes(term));
                    }

                    if (target) {
                        // Si está dentro de un cluster, lo abrimos
                        if (clustergroupDespegues) {
                            clustergroupDespegues.zoomToShowLayer(target, function() {
                                target.openPopup();
                                map.panTo(target.getLatLng());
                            });
                        } else {
                            map.setView([lat, lon], 14);
                            target.openPopup();
                        }
                    } else {
                        // Si no lo encuentra en la lista (raro), al menos vamos a las coordenadas
                        map.setView([lat, lon], 14);
                    }
                } else {
                    // Si el mapa es virgen y se está cargando por primera vez, vamos a coordenadas
                    map.setView([lat, lon], 14);
                }
            }, 350);
        }
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
    // 🔴 LÓGICA DEL MENÚ INFERIOR
    // ==========================================================================

    // 1️⃣ BOTÓN INICIO: Único botón que resetea y limpia todo
    window.clicBotonInicio = function() {
        const overlay = document.getElementById('msgActualizando...');
        if (overlay && overlay.classList.contains('loader-activo')) return;

        let necesitaReconstruir = false;

        // Comprobamos si ya estábamos en la pestaña Inicio ANTES de hacer nada
        const btnInicio = document.getElementById('nav-home');
        const yaEnInicio = btnInicio && btnInicio.classList.contains('active');

        // 1. Salir de edición de favoritos si estamos en ella
        if (typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos) {
            if (!finalizarEdicionFavoritos(true)) return; 
        } else {
            // 2. Comprobar si hay filtros activos que requieran reconstrucción real
            if (typeof ultimaDistanciaConfirmada !== 'undefined' && typeof CORTES_DISTANCIA_GLOBAL !== 'undefined') {
                if (ultimaDistanciaConfirmada < (CORTES_DISTANCIA_GLOBAL.length - 1)) {
                    necesitaReconstruir = true;
                }
            }
        }

        // 3. Reset visual y de estado de los filtros
        if (typeof resetFiltroDistancia === 'function') { resetFiltroDistancia(false); }

        // 4. Limpiar buscador
        const searchInput = document.getElementById('buscador-despegues-provincias');
        if (searchInput && searchInput.value.trim() !== '') {
            if (typeof limpiarBuscador === 'function') { limpiarBuscador(); }
        }
        
        if (typeof buscadorVisible !== 'undefined' && buscadorVisible) {
            window.toggleBuscadorFlotante(); 
        }

        // 5. Cerrar panel de configuración
        const panelConfig = document.getElementById("div-configuracion");
        if (panelConfig && panelConfig.classList.contains("activo")) {
            alternardivConfiguracion(); 
        }

        // 6. Volver a la vista de tabla
        cambiarVista('tabla');

        // 7. EJECUCIÓN FINAL (Reconstruir o hacer Scroll)
        if (necesitaReconstruir) {
            construir_tabla(); 
        } else if (yaEnInicio) {
            // Si el usuario ya estaba en inicio y no hizo falta reconstruir, 
            // hacemos el comportamiento estándar de las Apps: Scroll suave arriba del todo.
            const wrapper = document.querySelector('.tabla-wrapper');
            const principal = document.querySelector('.contenedor-principal-tabla');
            const scrollOptions = { top: 0, behavior: 'smooth' };

            if (wrapper) wrapper.scrollTo(scrollOptions);
            if (principal) principal.scrollTo(scrollOptions);
            window.scrollTo(scrollOptions);
        }

        // 8. Iluminar botón inicio
        window.activarMenuInferior(btnInicio);
    };

// 2️⃣ BOTÓN BUSCAR
    window.clicBotonBuscar = function() {
        const searchContainer = document.getElementById('floating-search-container');
        const searchInput = document.getElementById('buscador-despegues-provincias');
        const isSearchOpen = searchContainer && !searchContainer.classList.contains('floating-search-hidden');

        // Miramos si estamos en el mapa actualmente
        const vistaMapa = document.getElementById('vista-mapa');
        const estaEnMapa = vistaMapa && vistaMapa.style.display === 'flex';

        // REGLA: Si NO estamos en el mapa, está abierto y vacío, lo cerramos "en silencio"
        if (!estaEnMapa && isSearchOpen && searchInput && searchInput.value.trim() === '') {
            searchContainer.classList.add('floating-search-hidden');
            buscadorVisible = false;
            searchInput.blur();
            window.activarMenuInferior(document.getElementById('nav-home'));
        } else {
            // Siempre cambiamos a la tabla
            cambiarVista('tabla');
            
            // Si el buscador estaba cerrado (incluso de forma fantasma), lo abrimos
            if (!isSearchOpen) {
                window.toggleBuscadorFlotante();
            }
            
            window.activarMenuInferior(document.getElementById('nav-search'));
        }
    };

    // 3️⃣ BOTÓN DISTANCIA (Corregido: Ahora cierra el buscador si está abierto y vacío)
    window.clicBotonDistancia = function() {
        const panelDistancia = document.getElementById("div-filtro-distancia");
        const searchContainer = document.getElementById('floating-search-container');
        const searchInput = document.getElementById('buscador-despegues-provincias');
        
        if (!panelDistancia) return;

        const isDistanceOpen = panelDistancia.classList.contains("activo");
        const isSearchOpen = searchContainer && !searchContainer.classList.contains('floating-search-hidden');
        const sliderDistancia = document.getElementById('distancia-slider');
        
        // Estado del mapa
        const vistaMapa = document.getElementById('vista-mapa');
        const estaEnMapa = vistaMapa && vistaMapa.style.display === 'flex';

        let filtrandoCosas = false;
        if (sliderDistancia && sliderDistancia.noUiSlider) {
            const maxIndex = CORTES_DISTANCIA_GLOBAL.length - 1;
            const currentValue = Math.round(parseFloat(sliderDistancia.noUiSlider.get()));
            if (currentValue < maxIndex) filtrandoCosas = true;
        }

        // --- 🚀 REGLA DE EXCLUSIÓN MUTUA (FIX DEL BUG) ---
        // Si el buscador está abierto y vacío, lo cerramos al pulsar Distancia
        if (!isDistanceOpen && isSearchOpen && searchInput && searchInput.value.trim() === '') {
            searchContainer.classList.add('floating-search-hidden');
            buscadorVisible = false; // Actualizamos la variable global
            searchInput.blur();
        }

        // CASO A: Si NO estamos en el mapa, está abierto y NO está filtrando nada, lo cerramos
        if (!estaEnMapa && isDistanceOpen && !filtrandoCosas) {
            panelDistancia.classList.remove("activo");
            window.activarMenuInferior(document.getElementById('nav-home'));
            return; 
        }

        // CASO B: Cambiar a la tabla o abrir el panel
        cambiarVista('tabla');
        
        if (!isDistanceOpen) {
            panelDistancia.classList.add("activo");
            setTimeout(() => {
                if (sliderDistancia && sliderDistancia.noUiSlider) {
                    sliderDistancia.noUiSlider.updateOptions({}, true);
                }
            }, 50);
        }
        
        window.activarMenuInferior(document.getElementById('nav-distance'));
    };

    // 4️⃣ BOTÓN MAPA: Cambia la vista, pero no toca las clases de los paneles
    window.clicBotonMapa = function() {
        cambiarVista('mapa');
        // Al ocultarse el contenedor de controles por cambiarVista, los paneles desaparecen
        // visualmente pero sus clases (.activo) se mantienen intactas.
        window.activarMenuInferior(document.getElementById('nav-map'));
    };

    // 5️⃣ BOTÓN AJUSTES: Cierra edición pero mantiene filtros de usuario
    window.clicBotonAjustes = function() {
        if (typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos) {
            if (!finalizarEdicionFavoritos(true)) {
                window.activarMenuInferior(document.getElementById('nav-home'));
                return; 
            }
        }

        //cambiarVista('tabla');
        
        const panelConfig = document.getElementById("div-configuracion");
        // Solo lo abrimos si estaba cerrado
        if (panelConfig && !panelConfig.classList.contains("activo")) {
            alternardivConfiguracion(); 
        }

        window.activarMenuInferior(document.getElementById('nav-settings'));
    };

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

let mapaInicializado = false;

window.cambiarVista = function(vista) {
    const vistaTabla = document.querySelector('.contenedor-principal-tabla');
    const vistaControles = document.querySelector('.contenedor-principal-controles');
    const vistaMapa = document.getElementById('vista-mapa');

    if (vista === 'mapa') {
        if (vistaTabla) vistaTabla.style.display = 'none';
        if (vistaControles) vistaControles.style.display = 'none';
        if (vistaMapa) vistaMapa.style.display = 'flex';

        if (!mapaInicializado) {
            inicializarMapaLeaflet();
            mapaInicializado = true;
        } 
        
        // Cuando entramos al mapa, forzamos que la URL muestre las coordenadas actuales
        setTimeout(() => { 
            if (typeof map !== 'undefined' && map) {
                map.invalidateSize(); 
                updateURL(map); // <--- Esto pone los parámetros en la barra de direcciones
            }
        }, 300);

    } 
    else if (vista === 'tabla') {
        if (vistaMapa) vistaMapa.style.display = 'none';
        if (vistaTabla) vistaTabla.style.display = 'flex'; 
        if (vistaControles) vistaControles.style.display = 'block';

        // Cuando volvemos a la tabla, LIMPIAMOS la URL
        // Esto quita el ?lat=...&lon=... y deja solo flydecision.com/
        window.history.replaceState(null, '', window.location.pathname);
    }
};

// 🌍 VARIABLES GLOBALES DEL MAPA
let map;
let markersDespegues = [];
let clustergroupDespegues;
let markersDespeguesMundo = []; 
let clustergroupDespeguesMundo;

const ESCALA_VUELOS = [
    // Parte detallada (pasos de 10 hasta 100)
    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 

    // Transición (pasos de 100 hasta 1000)
    200, 300, 400, 500, 600, 700, 800, 900, 1000, 

    // Parte rápida (pasos de 1000 hasta 10000)
    2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000
];

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

    // --- 🟢 BLOQUE DE SEGURIDAD ANTI-CRASH LEAFLET ---
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
    const OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a>'
    });
    //El original Opentopomap es https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png, pero éste funciona mejor
    const OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://opentopomap.org/" target="_blank">Style OpenTopoMap</a>'
    });
    const ThunderforestOutdoors = L.tileLayer(`https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${MAP_API_KEYS.thunderforest}`, {
        maxZoom: 20,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://www.thunderforest.com/maps/" target="_blank">Style by Thunderforest</a>'
    });
    const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 20,
        attribution: '© <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
    });
    const WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 20,
        attribution: '© <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a>'
    });
    const IGNspaintopo = L.tileLayer('https://tms-mapa-raster.ign.es/1.0.0/mapa-raster/{z}/{x}/{-y}.jpeg', {
        maxZoom: 20,
        attribution: '© <a href="https://www.ign.es" target="_blank">IGN</a>'
    });
    const IGNspainbase = L.tileLayer('https://tms-ign-base.idee.es/1.0.0/IGNBaseTodo/{z}/{x}/{-y}.jpeg', {
        maxZoom: 20,
        attribution: '© <a href="https://www.ign.es" target="_blank">IGN</a>'
    });
    const IGNPNOA = L.tileLayer('https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg', {
        maxZoom: 20,
        attribution: '© <a href="https://www.ign.es" target="_blank">IGN</a>'
    });
    const Hipsometrico = L.tileLayer('https://maps-for-free.com/layer/relief/z{z}/row{y}/{z}_{x}-{y}.jpg', {
        maxZoom: 20,
        attribution: '<a href="https://maps-for-free.com" target="_blank">Maps-for-Free</a>'
    });
    const TracesTrackTopo = L.tileLayer(`https://tile.tracestrack.com/topo_es/{z}/{x}/{y}.webp?key=${MAP_API_KEYS.tracestrack}`, {
        maxZoom: 20,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://tracestrack.com/" target="_blank">Tracestrack</a>'
    });
    const CyclOSM = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" target="_blank">CyclOSM</a>'
    });
    const ICGC = L.tileLayer('https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '<a href="https://www.icgc.cat/" target="_blank">© ICGC</a>'
    });
    const KK7SkyWays = L.tileLayer('https://thermal.kk7.ch/tiles/skyways_all/{z}/{x}/{y}.png?src=' + window.location.hostname, {
        pane: 'overlayPane',
        maxNativeZoom: 13,
        maxZoom: 20, // 👈 Aumentado a 20 para que no desaparezca de repente
        zIndex: 10,  // 👈 Fuerza a que se dibuje por encima del mapa base
        tms: true,
        attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA></a>'
    });
    const KK7Thermals = L.tileLayer('https://thermal.kk7.ch/tiles/thermals_all/{z}/{x}/{y}.png?src=' + window.location.hostname, {
        pane: 'overlayPane',
        maxNativeZoom: 12,
        maxZoom: 20, // 👈 Añadido para igualar al resto
        zIndex: 10,  // 👈 Fuerza a que se dibuje por encima del mapa base
        tms: true,
        attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA></a>'
    });

    const capaMezcladaWorldTopoMapKK7SkyWays = L.layerGroup([WorldTopoMap, KK7SkyWays]);
    const capaMezcladaWorldTopoMapKK7Thermals = L.layerGroup([WorldTopoMap, KK7Thermals]);
    const capaMezcladaWorldTopoMapKK7SkyWaysThermals = L.layerGroup([WorldTopoMap, KK7SkyWays, KK7Thermals]);

    //Calcular antes el zoom, según sea móvil u ordenador
    //const isMobile = window.innerWidth < 768;
    //const zoom = isMobile ? 8 : 10;

    // 1. Obtener y definir las coordenadas y el zoom a USAR antes de cualquier inicialización

    const params = new URLSearchParams(window.location.search);

    // 🔍 Obtener los valores de la URL
    const urlLat = parseFloat(params.get('lat'));
    const urlLon = parseFloat(params.get('lon'));
    const urlZoom = parseInt(params.get('zoom'));

    // 💡 Definir valores por defecto (si no vienen en la URL)
    const defaultLat = 40.198579;
    const defaultLon = -2.285156;
    //Calcular antes el defaultZoom, según sea móvil u ordenador
    const isMobile = window.innerWidth < 768;
    const defaultZoom = isMobile ? 5 : 7;

    // 🎯 Asignar los valores a usar
    // Se asegura de que si el valor de la URL no es un número válido (NaN), se use el por defecto.
    const useLat = !isNaN(urlLat) ? urlLat : defaultLat;
    const useLon = !isNaN(urlLon) ? urlLon : defaultLon;
    const useZoom = !isNaN(urlZoom) ? urlZoom : defaultZoom;

    // 2. Inicializar el mapa de Leaflet

    // Inicializar el mapa con las coordenadas y el zoom a USAR
    map = L.map('map', {
        preferCanvas: true,
        renderer: L.canvas(),
        // 💡 IMPORTANTE: Inicializamos el centro y zoom del mapa DIRECTAMENTE aquí
        center: [useLat, useLon],
        zoom: useZoom,
        zoomControl: false,
        zoomAnimation: true,   // permite animación de zoom
        zoomSnap: 0.5,          // opcional, suaviza pasos de zoom (lo estándar es 1)
        layers: [WorldTopoMap] 
    });

    /**
     * Función que inicializa el comportamiento de plegado/expansión.
     * Al hacer clic, el contenido se expande y el encabezado desaparece.
     */
    function initPopupToggle(popupContainer) {
        // Buscamos el encabezado y el contenido dentro de ESTE popupContainer
        const toggleHeader = popupContainer.querySelector('.popup-toggle-header');
        const content = popupContainer.querySelector('.popup-collapsible-content');
        
        if (toggleHeader && content) {
            // Aseguramos el estado inicial (para el caso de que el popup se reabra sin recargar la página)
            toggleHeader.style.display = 'block'; 
            toggleHeader.innerHTML = 'Más información ▼'; // Restauramos texto/icono
            content.style.display = 'none'; // Aseguramos que el contenido esté oculto inicialmente
            
            // Añadir el listener al encabezado UNA SOLA VEZ
            toggleHeader.addEventListener('click', function() {
                // Solo actuamos si está contraído
                if (content.style.display === 'none') {
                    
                    // LÓGICA DE EXPANSIÓN
                    content.style.display = 'block'; // Mostrar el contenido
                    
                    // Ocultar completamente la línea del encabezado (texto y borde), 
                    // eliminando la opción de colapsar
                    toggleHeader.style.display = 'none'; 
                    
                } 
                // NOTA: No hay 'else' ni lógica de colapso.
            });
        }
    }

    // 🛑 FUNCIONES DE ACTUALIZACIÓN DE LOS FILTROS, TANTO EJECUTIVO COMO VISUAL

    function actualizarFiltrosMapa() {
        // A. OBTENER ESTADOS DE LOS FILTROS
        // -------------------------------------------------------
        // 1. Obtener orientaciones (Tu función existente)
        const filtrosOrientacion = obtenerOrientacionesSeleccionadas();
        
        // 2. Obtener valor del slider de vuelos
        const slider = document.getElementById('sliderVuelos');
        
        // El slider nos da el ÍNDICE (0, 1, 2...), no el valor real.
        const indice = parseInt(slider.value, 10);
        
        // Buscamos el valor real en nuestra escala personalizada
        // Si el índice falla por algo, usamos 0 como fallback
        const minVuelos = ESCALA_VUELOS[indice] !== undefined ? ESCALA_VUELOS[indice] : 0;
        
        // Actualizamos el texto visual del slider
        document.getElementById('valorVuelosTexto').textContent = minVuelos;

        // 2. Obtener valor del sliderKmMedia de KmMedia
        const sliderKmMedia = document.getElementById('sliderKmMedia');
        
        // El sliderKmMedia nos da el ÍNDICE (0, 1, 2...), no el valor real.
        const indiceKmMedia = parseInt(sliderKmMedia.value, 10);
        
        // Buscamos el valor real en nuestra escala personalizada
        // Si el índice falla por algo, usamos 0 como fallback
        const minKmMedia = ESCALA_KMMEDIA[indiceKmMedia] !== undefined ? ESCALA_KMMEDIA[indiceKmMedia] : 0;
        
        // Actualizamos el texto visual del sliderKmMedia
        document.getElementById('valorKmMediaTexto').textContent = minKmMedia;

        // Filtro de Último Vuelo
        const filtroAnioVuelo = obtenerMinAnioUltimoVuelo(); // { minAnio: YYYY | null, esTodos: boolean }

        // B. COMPROBAR Y DEFINIR VISIBILIDAD DE CAPAS
        // -------------------------------------------------------
        
        // Filtros de criterios
        const hayFiltroOrientacion = filtrosOrientacion.length > 0;
        const hayFiltroVuelos = minVuelos > 0;
        const hayFiltroKmMedia = minKmMedia > 0;
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
        // FUNCIÓN AUXILIAR DE FILTRADO (Lógica central reutilizable)
        // Se extrae la lógica de filtrado para aplicarla dos veces sin repetir código.
        const pasaFiltros = (marker) => {
            // --- 1. VALIDACIÓN DE VUELOS ---
            const vuelosMarker = marker.metadata.vuelos || 0; 
            if (vuelosMarker < minVuelos) return false;
            
            // --- 2. VALIDACIÓN DE VUELOS ---
            const KmMediaMarker = marker.metadata.KmMedia || 0; 
            if (KmMediaMarker < minKmMedia) return false;
            
            // --- 3. VALIDACIÓN DE FECHA ---
            if (hayFiltroAnio) {
                const fechaUltimoVueloStr = marker.metadata.ultimovuelo; 
                if (!fechaUltimoVueloStr) return false;
                const anioMarker = parseInt(fechaUltimoVueloStr.substring(fechaUltimoVueloStr.length - 4), 10);
                if (anioMarker < filtroAnioVuelo.minAnio) return false; 
            }       

            // --- 4. VALIDACIÓN DE ORIENTACIÓN ---
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
        // 🚩 FLAG 5: SE ELIMINA LA FUSIÓN DE ARRAYS
        // Se utilizan arrays de salida separados
        const markersFiltradosDespegues = []; // Resultado para la capa Despegues (Local)
        const markersFiltradosDespeguesMundo = []; // Resultado para la capa DespeguesMundo (Mundo)

        // 1. FILTRAR MARCADORES LOCALES (Despegues)
        if (mostrarDespegues) {
            markersDespegues.forEach(marker => {
                if (pasaFiltros(marker)) {
                    markersFiltradosDespegues.push(marker);
                }
            });
        }

        // 2. FILTRAR MARCADORES DEL MUNDO (DespeguesMundo)
        if (mostrarDespeguesMundo) {
            markersDespeguesMundo.forEach(marker => {
                if (pasaFiltros(marker)) {
                    markersFiltradosDespeguesMundo.push(marker);
                }
            });
        }


        // E. ACTUALIZAR CAPAS DE FORMA INDEPENDIENTE
        // -------------------------------------------------------
        
        // 1. Actualizar capa LOCAL (Despegues)
        clustergroupDespegues.clearLayers();
        clustergroupDespegues.addLayers(markersFiltradosDespegues);
        
        // 2. Actualizar capa MUNDO (DespeguesMundo)
        // 🚩 FLAG 6: ACTUALIZACIÓN INDEPENDIENTE
        clustergroupDespeguesMundo.clearLayers();
        clustergroupDespeguesMundo.addLayers(markersFiltradosDespeguesMundo);
        
        // Nota: El 'if (typeof clustergroupDespeguesMundo !== 'undefined')' ya no es necesario aquí.
    }

    // FUNCIÓN PARA GESTIONAR EL ESTADO VISUAL DE LOS CONTROLES
    function actualizarEstadoVisualFiltros() {

        // 1. COMPROBAR ESTADO DE LOS 4 FILTROS
        // Orientación: Comprueba si hay al menos uno marcado
        const hayFiltroOrientacion = obtenerOrientacionesSeleccionadas().length > 0;
        
        // 1. Vuelos: Comprueba si el valor es mayor que 0
        const sliderVuelos = document.getElementById('sliderVuelos');
        const indiceVuelos = parseInt(sliderVuelos.value, 10);
        // Asume que ESCALA_VUELOS está disponible globalmente
        const hayFiltroVuelos = (ESCALA_VUELOS[indiceVuelos] || 0) > 0; 
        
        function obtenerValorReal(indice) {
            // La misma lógica de tu función actualizarFiltrosMapa
            const indiceNumerico = parseInt(indice, 10);
            return ESCALA_VUELOS[indiceNumerico] !== undefined ? ESCALA_VUELOS[indiceNumerico] : 0;
        }
        const hayConfiguracionInicialFiltroVuelos = (obtenerValorReal(localStorage.getItem('miMapa_minimoVuelos_preferido') || '0') > 0);
        const hayConfiguracionInicialFiltroUltimoVuelo = (obtenerValorReal(localStorage.getItem('miMapa_minimoUltimoVuelo_preferido') || '0') > 0);
    
        // 2. Último Vuelo: Comprueba si el valor no es 'Todos' (índice 0)
        const sliderUltimoVuelo = document.getElementById('sliderUltimoVuelo');
        const indiceUltimoVuelo = parseInt(sliderUltimoVuelo.value, 10);
        const hayFiltroAnio = indiceUltimoVuelo !== 0;

        // 3. KmMedia: Comprueba si el valor es mayor que 0
        const sliderKmMedia = document.getElementById('sliderKmMedia');
        const indiceKmMedia = parseInt(sliderKmMedia.value, 10);
        // Asume que ESCALA_VUELOS está disponible globalmente
        const hayFiltroKmMedia = (ESCALA_KMMEDIA[indiceKmMedia] || 0) > 0; 
        
        function obtenerValorReal(indice) {
            // La misma lógica de tu función actualizarFiltrosMapa
            const indiceNumerico = parseInt(indice, 10);
            return ESCALA_KMMEDIA[indiceNumerico] !== undefined ? ESCALA_KMMEDIA[indiceNumerico] : 0;
        }

        // 2. DEFINIR COLORES Y ESTILOS
        const ACTIVO_COLOR = '#0404ff30';
        const INACTIVO_COLOR = '#ffffff';

        // 3. ACTUALIZAR CONTENEDORES INDIVIDUALES
        
        // Contenedor Orientación
        const contOrientacion = document.querySelector('.control-orientacion-container');
        if (contOrientacion) {
            contOrientacion.style.backgroundColor = hayFiltroOrientacion ? ACTIVO_COLOR : INACTIVO_COLOR;
        }

        // Contenedor Vuelos
        const contVuelos = document.querySelector('.control-vuelos-container');
        if (contVuelos) {
            contVuelos.style.backgroundColor = hayFiltroVuelos ? ACTIVO_COLOR : INACTIVO_COLOR;
        }

        // Contenedor Último Vuelo
        const contUltimoVuelo = document.querySelector('.control-ultimovuelo-container');
        if (contUltimoVuelo) {
            contUltimoVuelo.style.backgroundColor = hayFiltroAnio ? ACTIVO_COLOR : INACTIVO_COLOR;
        }

        // Contenedor KmMedia
        const contKmMedia = document.querySelector('.control-KmMedia-container');
        if (contKmMedia) {
            contKmMedia.style.backgroundColor = hayFiltroKmMedia ? ACTIVO_COLOR : INACTIVO_COLOR;
        }
        
        // Contenedor Configuración Vuelos
        document.querySelector('.configuracion-control-vuelos-container').style.backgroundColor = hayConfiguracionInicialFiltroVuelos ? ACTIVO_COLOR : INACTIVO_COLOR;

        // Contenedor Configuración Vuelos
        document.querySelector('.configuracion-control-ultimovuelo-container').style.backgroundColor = hayConfiguracionInicialFiltroUltimoVuelo ? ACTIVO_COLOR : INACTIVO_COLOR;


        // 4. ACTUALIZAR PANEL GLOBAL
        const hayCualquierFiltro = hayFiltroOrientacion || hayFiltroVuelos || hayFiltroAnio || hayFiltroKmMedia;
        const etiquetaInfoPanel = document.querySelector('.labelMostrarOpciones');
        
        if (etiquetaInfoPanel) {
            etiquetaInfoPanel.style.backgroundColor = hayCualquierFiltro ? ACTIVO_COLOR : ''; // Deja el color predefinido de CSS si no hay filtros.
        }
    }


    // 🛑 Listener que asegura que se pueda cambiar el estilo del popup original que ofrece Leaflet. Esa función no reemplaza clases, añade una clase adicional a los elementos internos del popup que Leaflet genera dinámicamente (.leaflet-popup-content-wrapper y .leaflet-popup-tip). Leaflet crea esos nodos cada vez que se abre un popup, por eso no puedes modificarlos con CSS global antes: no existen hasta que el popup se muestra. El map.on('popupopen', …) intercepta ese momento y añade tu clase personalizada (por ejemplo, popup-despegues). Se puede añadir más clases. Objetivo: aplicar un estilo distinto solo a ciertos popups sin afectar al resto.
    map.on('popupopen', function (e) {
        
        const popupNode = e.popup._container;
        const clase = e.popup.options.className;

        if (['popup-despegues', 'popup-despeguesmundo', 'popup-otraclase2'].includes(clase)) {
            popupNode.querySelector('.leaflet-popup-content-wrapper')?.classList.add(clase);
            popupNode.querySelector('.leaflet-popup-tip')?.classList.add(clase);
        }
    
        // e.popup.getElement() obtiene el contenedor HTML del popup
        const popupContainer = e.popup.getElement();
        
        // Verificamos si este popup tiene los elementos plegables (para no afectar a otros popups)
        if (popupContainer && popupContainer.querySelector('.popup-toggle-header')) {
            // Inicializamos la lógica de plegado para este popup
            initPopupToggle(popupContainer);
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
    });
    // Escuchar cuando el usuario termina de hacer zoom
    map.on('zoomend', function() {
        updateURL(map);
    });

    // Variables para acceder a los mensajes de carga
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
            const originalPlaceholder = '🔍 Despegue';
            input.type = 'search';
            input.placeholder = '🔍 Despegue';
            input.title = 'Buscar despegue por su nombre';

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

            L.DomEvent.disableClickPropagation(container); // Evita que los clics en el control afecten al mapa

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
                // callback: ya está visible individualmente
                found.openPopup();
                map.panTo(found.getLatLng()); // centrar exactamente		
            });
        }
        // fallback si no existe clustering
        else {
            map.setView(found.getLatLng(), Math.max(map.getZoom(), 13));
            found.openPopup();
        }
    }

    map.addControl(new L.Control.textSearch({ position: 'topleft' }));

    // 🟡 CONTROL "infoPanel" (Capas y Filtros)

    const infopanelControl = L.Control.extend({
        onAdd: function (map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            
            // Lo buscamos directamente en el HTML en este exacto momento
            const panelHTML = document.getElementById('infoPanel');
            
            if (panelHTML) {
                container.appendChild(panelHTML);
            } else {
                console.error("⚠️ Error: No encuentro el <div id='infoPanel'> en el HTML");
            }

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            return container;
        }
    });

    map.addControl(new infopanelControl({ position: 'topleft' }));

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
    var link = L.DomUtil.create('a', '', container);
    link.title = 'Ir a mi ubicación';
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
    map.addControl(new L.Control.Locate({ position: 'topleft' }));
    
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
            }).addTo(map).bindPopup("<b style='font-size:16px;'>Estás aquí&nbsp;&nbsp;</b>", { 
                className: 'popup-ajustado', 
                maxWidth: 'auto' 
            }).openPopup();
        }
    });

    // 🟡 CONTROL "Buscador general" (oculto inicialmente en el desplegable)
    var geocoderControl = L.Control.geocoder({
        defaultMarkGeocode: false,
        position: 'topleft'
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
    document.querySelector('.leaflet-control-geocoder.leaflet-bar').setAttribute('title', 'Buscador general (poblaciones, lugares y coordenadas)');
    document.querySelector('.leaflet-control-geocoder-form input[type="search"]').setAttribute('placeholder', 'Buscar lugar o coordenadas...');
    document.querySelector('.leaflet-control-geocoder-form input[type="search"]').style.fontSize = '16px';
        
    // 🟡 CONTROL "Configuración" (Despliega #configuracionPanel)
    L.Control.ConfigToggle = L.Control.extend({

        options: { position: 'topright' },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const buttonDiv = L.DomUtil.create('div', 'leaflet-control-button', container);
            buttonDiv.style.cursor = 'pointer';
            buttonDiv.title = 'Configuración'; // Tooltip
            
            // Icono de Engranaje (Gear) SVG
            buttonDiv.innerHTML = `<svg width="30" height="30" viewBox="-3 -3 30 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>`;
                                
            buttonDiv.style.padding = '0';
            buttonDiv.style.display = 'flex';
            buttonDiv.style.justifyContent = 'center';
            buttonDiv.style.alignItems = 'center';  
            buttonDiv.style.backgroundColor = 'white';      
            buttonDiv.style.borderRadius = '4px';       
            
            // --- 3. Capturar el Panel de Configuración Existente por ID
            // Buscamos el panel de forma segura
            this._configPanel = document.getElementById('configuracionPanel');
            
            if (this._configPanel) {
                container.appendChild(this._configPanel);
                this._configPanel.style.display = 'none'; 
            } else {
                console.error("⚠️ Error: No encuentro el <div id='configuracionPanel'> en el HTML");
            }
            
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            L.DomEvent.on(buttonDiv, 'click', this._togglePanel, this);
            L.DomEvent.on(map, 'click', this._collapse, this);
            L.DomEvent.on(map, 'moveend', this._collapse, this);
            
            return container;
        },
        
        // Alternar
        _togglePanel: function(e) {
            // Prevenimos que el evento se propague si es necesario
            L.DomEvent.stopPropagation(e);
            
            if (this._configPanel.style.display === 'none') {
                this._expand();
            } else {
                this._collapse();
            }
        },
        
        // Mostrar
        _expand: function() {
            // Usamos 'block' para divs normales. Si tu panel usa flex internamente, usa 'block' aquí 
            // y deja que el CSS del panel maneje su interior, o usa 'flex' si el panel mismo es un flex container.
            this._configPanel.style.display = 'block'; 
        },
        
        // Ocultar
        _collapse: function() {
            this._configPanel.style.display = 'none';
        }
    });

    // Función de conveniencia
    L.control.configToggle = function(options) {
        return new L.Control.ConfigToggle(options);
    };

    L.control.configToggle({ 
        position: 'topright' // O donde prefieras
    }).addTo(map);


    // 🟡 CONTROL "Capas"
    const baseMaps = {
    "ESRI Mundial topográfico": WorldTopoMap,
    "ESRI Mundial ortofotos": esri,	
    "OpenStreetMap estilo OpenTopoMap": OpenTopoMap,
    "OpenStreetMap estilo CyclOSM": CyclOSM,
    "Thunderforest Outdoors": ThunderforestOutdoors,
    "IGN España topográfico": IGNspaintopo,
    "IGN España topográfico claro": IGNspainbase,
    "IGN España ortofotos": IGNPNOA,
    "OpenStreetMap estilo OpenStreetMap": OpenStreetMap,  
    "Relieve Hipsométrico": Hipsometrico,
    "Tracestrack Topo": TracesTrackTopo,
    "ICGC Catalunya": ICGC,
    "ESRI Topo + Skyways (KK7)": capaMezcladaWorldTopoMapKK7SkyWays,
    "ESRI Topo + Thermals (KK7)": capaMezcladaWorldTopoMapKK7Thermals,
    "ESRI Topo + Skyways+Thermals (KK7)": capaMezcladaWorldTopoMapKK7SkyWaysThermals
    };
    L.control.layers(baseMaps, {}, { position: 'topright' }).addTo(map);
        
    //------------------------------------------------------------

    // 🔴 INICIO CAPA DESPEGUES
    //___________________________________________________________________________________


    const clustergroupDespegues = L.markerClusterGroup({
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
                        width: 35px;
                        height: 35px;
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
    function createIconDespegue(despegue, actividad, orientacionesMetadata) {
        // 1. 🧭 Generar el círculo de orientación (NUEVO)
        const orientacionHTML = createOrientationSVG(orientacionesMetadata);

        // 2. Círculo de Actividad (Existente)
        const color = actividadToColor(actividad);
        const dot = `<span class="dot" style="background:${color}"></span>`;

        // 3. Combinar todo en la etiqueta
        const labelHTML = `<span class='label-large-despegues'>${orientacionHTML}${dot}${escapeHtml(despegue)}</span>`;

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

    Papa.parse('map/despegues.csv', {
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
        const altitud = row.Altitud || '';	
        const region = row.Región || ''; //asigna el contenido de la columna “Nombre_clásico” si existe; si no existe, deja la variable como cadena vacía. || → operador lógico “o”: devuelve el primer valor existente y no vacío.
        const provincia = row.Provincia || '';
        const despegue = row.Despegue || '';
        const SVGorientaciones = createOrientationSVG(row.Orientaciones);
        const orientacion = row.Orientación || '';
        const orientaciones = row.Orientaciones || '';
        const OrientacionesGrados = row.Orientaciones_Grados || '';
        const actividad = row.Actividad || '';
        const color = actividadToColor(row.Actividad);
        const dot = `<span class="dot" style="background:${color}"></span>`;
        const CIRCULOactividad = row.Actividad || '';

        // Guardamos el valor numérico real para el filtro (si es vacío o 0, será 0)
        const KmMediaValor = parseFloat(row.Km_media) || 0;

        // Creamos el texto que se verá en el popup
        const KmMediaDisplay = (KmMediaValor === 0) ? "-" : KmMediaValor;

        const kmmax = row.Km_máx || '';
        const vuelos = row.Vuelos || '';
        const ultimovuelo = row.Último_vuelo || '';
        const info = row.Más_información || '';

        const icon = createIconDespegue(despegue, actividad, orientaciones);
        const marker = L.marker([lat, lon], { icon: icon, riseOnHover: true, title: 'Lugar de despegue' });
                
        const popupHtml = `<div style="line-height: 1.2;">
        
                <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂 ${escapeHtml(despegue)}</b></div>
                <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">Orientación: ${SVGorientaciones} <b>${escapeHtml(orientacion)}</b></div>
                <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/wind?${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},14' target='_blank'>Windy</a></div>
                <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},13' target='_blank'>Meteo-parapente</a></div>
                <div style="margin-bottom: 5px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${escapeHtml(lat.toFixed(4))}N${escapeHtml(lon.toFixed(4))}E' target='_blank'>Meteoblue</a></div>
                
                <div class="popup-toggle-header" 
                    style="cursor: pointer; border-radius: 3px; font-weight: bold; padding-top: 3px;">
                    Más información: ▼
                </div>
                
                <div class="popup-collapsible-content" style="display: none; overflow-wrap: break-word; ">

                    <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>
                    <div style="margin-bottom: 5px;">Altitud aprox.: <b>${escapeHtml(altitud)} m</b></div>
                    <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 5px;" title="Nivel de uso del despegue según fecha del último vuelo registrado (referencia: nov-2025): Verde 0–6 meses, Naranja 6–12, Amarillo 12–24, Blanco >24 meses sin vuelos">Nivel de actividad: ${dot}</div>
                    <div style="margin-bottom: 5px;">Nº de vuelos en XContest: <b>${escapeHtml(vuelos)}</b></div>
                    <div style="margin-bottom: 5px;">Nº de km medios recorridos: <b>${escapeHtml(KmMediaDisplay)}</b></div>
                    <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))}' target='_blank'>Google Maps</a></div>
                    <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/OpenTopoMap&pois=${escapeHtml(lon.toFixed(4))},${escapeHtml(lat.toFixed(4))}' target='_blank'>Brouter</a></div>
                    <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}&l=Czt/Sa&n2=_gwm&r=${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/${escapeHtml(despegue)} (${escapeHtml(orientacion)})' target='_blank'>Nakarte</a></div>
                    <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon}%20${lat}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                    <div style="margin-bottom: 5px;">${escapeHtml(info)}</div>
                    
                </div>
                
                </div>`;		

        marker.bindPopup(popupHtml, { className: 'popup-despegues', maxWidth: 300 });
        marker.metadata = { despegue: despegue, orientacion: orientacion, orientaciones: orientaciones, OrientacionesGrados: OrientacionesGrados, actividad: actividad, KmMedia: KmMediaValor, kmax: kmmax, vuelos: vuelos, ultimovuelo: ultimovuelo }; 
        markersDespegues.push(marker); //inserta marker al grupo markersDespegues
        clustergroupDespegues.addLayer(marker);
    });

        map.addLayer(clustergroupDespegues);
    
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
                    despegueEncontrado.openPopup();
                    map.panTo(despegueEncontrado.getLatLng()); // Centrado exacto
                });
            }, 600); // Pequeña pausa para asegurar que los clusters están dibujados
        }
    
        actualizarFiltrosMapa();
    },

    error: function(error) {
    console.error('Error cargando CSV:', error.message || error);
    alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
    }

    });


    // 🔴 INICIO CAPA MAPA DE CALOR PENÍNSULA IBÉRICA
    //___________________________________________________________________________________

    const clustergroupMapaDeCalorPeninsulaIberica = L.markerClusterGroup({
        chunkedLoading: true,      	// Divide la carga en bloques
        chunkDelay: 100,            // Tiempo entre bloques (ms)
        showCoverageOnHover: false, // false mejora rendimiento. Muestra el área que ocupan los puntos
        maxClusterRadius: 80,       // Con menos de este radio en px entre los puntos, se agrupan. Menor = menos agrupación, mayor = más agrupados
        spiderfyOnMaxZoom: true,    // Con zoom máximo se expanden todos. False mejora rendimiento
        zoomToBoundsOnClick: false, // Por defecto es true
        //disableClusteringAtZoom: 15, //A zoom mayor, los marcadores se muestran individualmente, aunque estén cerca. Desactivado porque si no, con 300.000 puntos se bloquea bastante el navegador
        
        //Redefinimos la función incorporada en el plugin Leaflet.markercluster llamada iconCreateFunction. Al crear un L.markerClusterGroup() el plugin la ejecuta automáticamente cada vez que genera un icono de clúster, pasándole como argumento el objeto cluster, que contiene todos los marcadores agrupados.
        
        iconCreateFunction: function (cluster) {
            var count = cluster.getChildCount();
            
            const clusterTitle = `Grupo de ${count} despegues registrados en XContest`;

            // Escala de color según número de marcadores
            var max = 1000; 
            var ratio = 1 - Math.min(count / max, 1); //ratio = 0 → rojo intenso, ratio = 1 → rojo claro

            // Conversión hex a RGB
            function hexToRGB(hex) {
                return [
                    parseInt(hex.substr(1,2),16),
                    parseInt(hex.substr(3,2),16),
                    parseInt(hex.substr(5,2),16)
                ];
            }

            var darkRGB = hexToRGB("#a91311");   // rojo oscuro
            var lightRGB = hexToRGB("#f7bd7e");  // rojo claro

            // Interpolación lineal en RGB
            var r = Math.round(darkRGB[0] + (lightRGB[0]-darkRGB[0])*ratio);
            var g = Math.round(darkRGB[1] + (lightRGB[1]-darkRGB[1])*ratio);
            var b = Math.round(darkRGB[2] + (lightRGB[2]-darkRGB[2])*ratio);

            var color = `rgb(${r},${g},${b})`;

            return new L.DivIcon({
                html: `<div title="${clusterTitle}" style="background:${color}"><span>${count}</span></div>`,
                className: 'estilobase-custom-cluster-mapadecalor',
                iconSize: new L.Point(40, 40),
                iconAnchor: L.point(20, 20) //Centra el icono en el punto
            });
        }
            
    });

    //Popup al hacer click en un cluster: Coordenadas del centro del cluster		
    clustergroupMapaDeCalorPeninsulaIberica.on('clusterclick', function (e) {
        // 1. Obtener los datos del clúster
        const childCount = e.layer.getChildCount(); // Cuántos marcadores (despegues) hay en el clúster
        const clusterLatLng = e.layer.getLatLng(); // Coordenadas del centro del clúster

        const popupHtml = `<div style="line-height: 1.2;">

                <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂🪂🪂🪂🪂<br>${childCount} Despegues en XContest</b></div>
                <div style="margin-bottom: 5px;">Coordenadas medias:<br><b>${clusterLatLng.lat.toFixed(4)}, ${clusterLatLng.lng.toFixed(4)}</b></div>
                <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/wind?${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)},14' target='_blank'>Windy</a></div>
                <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)},13' target='_blank'>Meteo-parapente</a></div>
                <div style="margin-bottom: 5px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${clusterLatLng.lat.toFixed(4)}N${clusterLatLng.lng.toFixed(4)}E' target='_blank'>Meteoblue</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)}' target='_blank'>Google Maps</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/OpenTopoMap&pois=${clusterLatLng.lng.toFixed(4)},${clusterLatLng.lat.toFixed(4)}' target='_blank'>Brouter</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}&l=Czt/Sa&n2=_gwm&r=${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/${clusterLatLng.lat.toFixed(4)}, ${clusterLatLng.lng.toFixed(4)}' target='_blank'>Nakarte</a></div>
                <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${clusterLatLng.lng.toFixed(4)}%20${clusterLatLng.lat.toFixed(4)}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                </div>`

        // 3. Enlazar el popup al clúster y abrirlo
        // Esto crea un popup dinámicamente solo para este clic
        e.layer.bindPopup(popupHtml, { className: 'popup-despegueindividual', maxWidth: 300 })
        .openPopup();
    });	

    const heatpointsMapaDeCalorPeninsulaIberica = []; // array para puntos del heatmap //heatPointsWebGL

    let heatlayerMapaDeCalorPeninsulaIberica;

    // escape para html en popup/label. Esa función convierte caracteres especiales de HTML en sus entidades seguras, evitando que el texto insertado en el DOM se interprete como código HTML (previene inyección de HTML o XSS)
    function escapeHtml(str){
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    const iconoDespegueIndividualPeninsulaIberica = L.divIcon({
    className: 'custom-point-circle', // Una clase CSS para estilizar el círculo
    html: '<div style="background:#ff0000; border-radius:50%; width:10px; height:10px;"></div>', // El círculo dentro del div
    iconSize: [10, 10], // Tamaño del icono (igual al div de arriba)
    iconAnchor: [5, 5] // Centro del icono
    });

    // Flag para controlar la carga única del CSV
    let csvCargadoMapaDeCalorPeninsulaIberica = false; // Usamos un nombre específico para evitar conflictos.

    // Muestra el mensaje de carga en la pantalla
    function mostrarMensajeCargaMapaDeCalorPeninsulaIberica() {
        if (mensajeCargaMapaDeCalorPeninsulaIberica) {
            mensajeCargaMapaDeCalorPeninsulaIberica.style.display = 'block';
        }
    }

    //Oculta el mensaje de carga en la pantalla
    function ocultarmensajeCargaMapaDeCalorPeninsulaIberica() {
        if (mensajeCargaMapaDeCalorPeninsulaIberica) {
            setTimeout(function() {mensajeCargaMapaDeCalorPeninsulaIberica.style.display = 'none'}, 2000);
        }
    }

    // Carga los datos del CSV y crea los marcadores/capas de calor. Se ejecuta solo la primera vez
    function cargarDatosMapaDeCalorPeninsulaIberica() {
        if (csvCargadoMapaDeCalorPeninsulaIberica) {
            return; // Detener si ya se cargó
        }

        mostrarMensajeCargaMapaDeCalorPeninsulaIberica();	// Mostramos el mensaje de carga antes de la operación asíncrona

        Papa.parse('map/mapadecalorpeninsulaiberica.csv', {

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
                    const fecha = row.Fecha || '';
                    const hora = row.Hora || '';
                    const distanciarecorrida = row.DistanciaRecorrida || '';
                    const urlvuelo = row.URLVuelo || '';
                    
                    const marker = L.marker([lat, lon], { icon: iconoDespegueIndividualPeninsulaIberica, riseOnHover: true, title: 'Despegue individual registrado en XContest' });
                    
                    const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂<br>Despegue en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  
                        <div style="margin-bottom: 5px;">Fecha: <b>${escapeHtml(fecha)}</b></div>
                        <div style="margin-bottom: 5px;">Hora: <b>${escapeHtml(hora)}</b></div>
                        <div style="margin-bottom: 5px;">Distancia recorrida: <b>${escapeHtml(distanciarecorrida)} km</b></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='${escapeHtml(urlvuelo)}' target='_blank'>Vuelo en XContest</a></div>
                        </div>`;

                    marker.bindPopup(popupHtml, { className: 'popup-despegueindividual', maxWidth: 300 }); //de momento no he creado esa clase
                    clustergroupMapaDeCalorPeninsulaIberica.addLayer(marker);
                    // Añadir al array de puntos de calor
                    heatpointsMapaDeCalorPeninsulaIberica.push([lat, lon, 1]); // intensidad = 1
                });
            
            // Crear capa de calor
                heatlayerMapaDeCalorPeninsulaIberica = L.heatLayer(heatpointsMapaDeCalorPeninsulaIberica, {
                    radius: 18, blur: 22, maxZoom: 19, minOpacity: 0.3,
                    gradient: { 0.2: 'yellow', 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' }
                });//.addTo(map); //No la mostramos inicialmente

                //map.addLayer(clustergroupMapaDeCalorPeninsulaIberica); //No la mostramos inicialmente
                
                // Marcar como cargado exitosamente
                csvCargadoMapaDeCalorPeninsulaIberica = true;
                ocultarmensajeCargaMapaDeCalorPeninsulaIberica(); // Ocultamos el mensaje si la carga fue exitosa
                
                // LLAMADA ADICIONAL: Ya que el usuario marcó el checkbox antes de que se completara la carga,
                // debemos añadirlas al mapa una vez que estén listas.
                const checkbox = document.getElementById('checkboxMapaDeCalorPeninsulaIberica');
                if (checkbox && checkbox.checked) {
                    if (!map.hasLayer(clustergroupMapaDeCalorPeninsulaIberica)) {
                        map.addLayer(clustergroupMapaDeCalorPeninsulaIberica);
                    }
                    if (!map.hasLayer(heatlayerMapaDeCalorPeninsulaIberica)) {
                        map.addLayer(heatlayerMapaDeCalorPeninsulaIberica);
                    }
                }

            },

            error: function(error) {
            console.error('Error cargando CSV:', error.message || error);
            alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
            ocultarmensajeCargaMapaDeCalorPeninsulaIberica(); // Ocultamos el mensaje si hubo un error en la carga
            }

        });
    }


    // 🔴 INICIO CAPA MAPA DE CALOR ALPES
    //___________________________________________________________________________________

    const clustergroupMapaDeCalorAlpes = L.markerClusterGroup({
        chunkedLoading: true,      	// Divide la carga en bloques
        chunkDelay: 100,            // Tiempo entre bloques (ms)
        showCoverageOnHover: false, // false mejora rendimiento. Muestra el área que ocupan los puntos
        maxClusterRadius: 80,       // Con menos de este radio en px entre los puntos, se agrupan. Menor = menos agrupación, mayor = más agrupados
        spiderfyOnMaxZoom: true,    // Con zoom máximo se expanden todos. False mejora rendimiento
        zoomToBoundsOnClick: false, // Por defecto es true
        //disableClusteringAtZoom: 15, //A zoom mayor, los marcadores se muestran individualmente, aunque estén cerca. Desactivado porque si no, con 300.000 puntos se bloquea bastante el navegador
        
        //Redefinimos la función incorporada en el plugin Leaflet.markercluster llamada iconCreateFunction. Al crear un L.markerClusterGroup() el plugin la ejecuta automáticamente cada vez que genera un icono de clúster, pasándole como argumento el objeto cluster, que contiene todos los marcadores agrupados.
        
        iconCreateFunction: function (cluster) {
            var count = cluster.getChildCount();
            
            const clusterTitle = `Grupo de ${count} despegues registrados en XContest`;

            // Escala de color según número de marcadores
            var max = 1000; 
            var ratio = 1 - Math.min(count / max, 1); //ratio = 0 → rojo intenso, ratio = 1 → rojo claro

            // Conversión hex a RGB
            function hexToRGB(hex) {
                return [
                    parseInt(hex.substr(1,2),16),
                    parseInt(hex.substr(3,2),16),
                    parseInt(hex.substr(5,2),16)
                ];
            }

            var darkRGB = hexToRGB("#a91311");   // rojo oscuro
            var lightRGB = hexToRGB("#f7bd7e");  // rojo claro

            // Interpolación lineal en RGB
            var r = Math.round(darkRGB[0] + (lightRGB[0]-darkRGB[0])*ratio);
            var g = Math.round(darkRGB[1] + (lightRGB[1]-darkRGB[1])*ratio);
            var b = Math.round(darkRGB[2] + (lightRGB[2]-darkRGB[2])*ratio);

            var color = `rgb(${r},${g},${b})`;

            return new L.DivIcon({
                html: `<div title="${clusterTitle}" style="background:${color}"><span>${count}</span></div>`,
                className: 'estilobase-custom-cluster-mapadecalor',
                iconSize: new L.Point(40, 40),
                iconAnchor: L.point(20, 20) //Centra el icono en el punto
            });
        }
            
    });

    //Popup al hacer click en un cluster: Coordenadas del centro del cluster		
    clustergroupMapaDeCalorAlpes.on('clusterclick', function (e) {
        // 1. Obtener los datos del clúster
        const childCount = e.layer.getChildCount(); // Cuántos marcadores (despegues) hay en el clúster
        const clusterLatLng = e.layer.getLatLng(); // Coordenadas del centro del clúster

        const popupHtml = `<div style="line-height: 1.2;">

                <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂🪂🪂🪂🪂<br>${childCount} Despegues en XContest</b></div>
                <div style="margin-bottom: 5px;">Coordenadas medias:<br><b>${clusterLatLng.lat.toFixed(4)}, ${clusterLatLng.lng.toFixed(4)}</b></div>
                <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/wind?${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)},14' target='_blank'>Windy</a></div>
                <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)},13' target='_blank'>Meteo-parapente</a></div>
                <div style="margin-bottom: 5px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${clusterLatLng.lat.toFixed(4)}N${clusterLatLng.lng.toFixed(4)}E' target='_blank'>Meteoblue</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)}' target='_blank'>Google Maps</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/OpenTopoMap&pois=${clusterLatLng.lng.toFixed(4)},${clusterLatLng.lat.toFixed(4)}' target='_blank'>Brouter</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}&l=Czt/Sa&n2=_gwm&r=${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/${clusterLatLng.lat.toFixed(4)}, ${clusterLatLng.lng.toFixed(4)}' target='_blank'>Nakarte</a></div>
                <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${clusterLatLng.lng.toFixed(4)}%20${clusterLatLng.lat.toFixed(4)}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                </div>`

        // 3. Enlazar el popup al clúster y abrirlo
        // Esto crea un popup dinámicamente solo para este clic
        e.layer.bindPopup(popupHtml, { className: 'popup-despegueindividual', maxWidth: 300 })
        .openPopup();
    });	

    const heatpointsMapaDeCalorAlpes = []; // array para puntos del heatmap //heatPointsWebGL

    let heatlayerMapaDeCalorAlpes;

    // escape para html en popup/label. Esa función convierte caracteres especiales de HTML en sus entidades seguras, evitando que el texto insertado en el DOM se interprete como código HTML (previene inyección de HTML o XSS)
    function escapeHtml(str){
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    const iconoDespegueIndividualAlpes = L.divIcon({
    className: 'custom-point-circle', // Una clase CSS para estilizar el círculo
    html: '<div style="background:#ff0000; border-radius:50%; width:10px; height:10px;"></div>', // El círculo dentro del div
    iconSize: [10, 10], // Tamaño del icono (igual al div de arriba)
    iconAnchor: [5, 5] // Centro del icono
    });

    // Flag para controlar la carga única del CSV
    let csvCargadoMapaDeCalorAlpes = false; // Usamos un nombre específico para evitar conflictos.

    // Muestra el mensaje de carga en la pantalla
    function mostrarMensajeCargaMapaDeCalorAlpes() {
        if (mensajeCargaMapaDeCalorAlpes) {
            mensajeCargaMapaDeCalorAlpes.style.display = 'block';
        }
    }

    //Oculta el mensaje de carga en la pantalla
    function ocultarmensajeCargaMapaDeCalorAlpes() {
        if (mensajeCargaMapaDeCalorAlpes) {
            setTimeout(function() {mensajeCargaMapaDeCalorAlpes.style.display = 'none'}, 4000);
        }
    }

    // Carga los datos del CSV y crea los marcadores/capas de calor. Se ejecuta solo la primera vez

    const isMobileDevice = () => {
        return /Mobi|Android/i.test(navigator.userAgent);
    };

    function cargarDatosMapaDeCalorAlpes() {
        if (csvCargadoMapaDeCalorAlpes) {
            return; // Detener si ya se cargó
        }
        
        const message = "ℹ️ Cargar la capa 'Mapa de calor Alpes' puede fallar en muchos dispositivos móviles debido a que son casi 1 millón de puntos. \n\nSi necesitas verla en un móvil, con el navegador Firefox tendrás más posibilidades. Si no es posible, tendrás que usar un ordenador.\n\nEn cualquier caso, puedes pulsar Aceptar para probarlo, aunque tardará un rato.";
        
        let proceed = true;
        
        if (isMobileDevice()) {
            proceed = confirm(message);
        }
        
        if (proceed) {
            mostrarMensajeCargaMapaDeCalorAlpes(); // Mostramos el mensaje de carga antes de la operación asíncrona

            Papa.parse('map/mapadecaloralpes.csv', {

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
                        const fecha = row.Fecha || '';
                        const hora = row.Hora || '';
                        const distanciarecorrida = row.DistanciaRecorrida || '';
                        const urlvuelo = row.URLVuelo || '';
                        
                        const marker = L.marker([lat, lon], { icon: iconoDespegueIndividualAlpes, riseOnHover: true, title: 'Despegue individual registrado en XContest' });
                        
                        const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
                            <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂<br>Despegue en XContest</b></div>
                            <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  
                            <div style="margin-bottom: 5px;">Fecha: <b>${escapeHtml(fecha)}</b></div>
                            <div style="margin-bottom: 5px;">Hora: <b>${escapeHtml(hora)}</b></div>
                            <div style="margin-bottom: 5px;">Distancia recorrida: <b>${escapeHtml(distanciarecorrida)} km</b></div>
                            <div style="margin-bottom: 5px;">🔍 <a href='${escapeHtml(urlvuelo)}' target='_blank'>Vuelo en XContest</a></div>
                            </div>`;

                        marker.bindPopup(popupHtml, { className: 'popup-despegueindividual', maxWidth: 300 }); //de momento no he creado esa clase
                        clustergroupMapaDeCalorAlpes.addLayer(marker);
                        // Añadir al array de puntos de calor
                        heatpointsMapaDeCalorAlpes.push([lat, lon, 1]); // intensidad = 1
                    });
                
                // Crear capa de calor
                    heatlayerMapaDeCalorAlpes = L.heatLayer(heatpointsMapaDeCalorAlpes, {
                        radius: 18, blur: 22, maxZoom: 19, minOpacity: 0.3,
                        gradient: { 0.2: 'yellow', 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' }
                    });//.addTo(map); //No la mostramos inicialmente

                    //map.addLayer(clustergroupMapaDeCalorAlpes); //No la mostramos inicialmente
                    
                    // Marcar como cargado exitosamente
                    csvCargadoMapaDeCalorAlpes = true;
                    ocultarmensajeCargaMapaDeCalorAlpes(); // Ocultamos el mensaje si la carga fue exitosa
                    
                    // LLAMADA ADICIONAL: Ya que el usuario marcó el checkbox antes de que se completara la carga,
                    // debemos añadirlas al mapa una vez que estén listas.
                    const checkbox = document.getElementById('checkboxMapaDeCalorAlpes');
                    if (checkbox && checkbox.checked) {
                        if (!map.hasLayer(clustergroupMapaDeCalorAlpes)) {
                            map.addLayer(clustergroupMapaDeCalorAlpes);
                        }
                        if (!map.hasLayer(heatlayerMapaDeCalorAlpes)) {
                            map.addLayer(heatlayerMapaDeCalorAlpes);
                        }
                    }

                },

                error: function(error) {
                    console.error('Error cargando CSV:', error.message || error);
                    alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
                    ocultarmensajeCargaMapaDeCalorAlpes(); // Ocultamos el mensaje si hubo un error en la carga
                    
                    // Si falla la carga, también desmarcamos
                    if (checkboxMapaDeCalorAlpes) {
                        checkboxMapaDeCalorAlpes.checked = false;
                    }
                }

            });
            
            } else {
            // La usuaria pulsó CANCELAR
            if (checkboxMapaDeCalorAlpes) {
                checkboxMapaDeCalorAlpes.checked = false;
            }
        }		
    }


    // 🔴 INICIO CAPA MAPA DE CALOR MARRUECOS
    //___________________________________________________________________________________

    const clustergroupMapaDeCalorMarruecos = L.markerClusterGroup({
        chunkedLoading: true,      	// Divide la carga en bloques
        chunkDelay: 100,            // Tiempo entre bloques (ms)
        showCoverageOnHover: false, // false mejora rendimiento. Muestra el área que ocupan los puntos
        maxClusterRadius: 80,       // Con menos de este radio en px entre los puntos, se agrupan. Menor = menos agrupación, mayor = más agrupados
        spiderfyOnMaxZoom: true,    // Con zoom máximo se expanden todos. False mejora rendimiento
        zoomToBoundsOnClick: false, // Por defecto es true
        //disableClusteringAtZoom: 15, //A zoom mayor, los marcadores se muestran individualmente, aunque estén cerca. Desactivado porque si no, con 300.000 puntos se bloquea bastante el navegador
        
        //Redefinimos la función incorporada en el plugin Leaflet.markercluster llamada iconCreateFunction. Al crear un L.markerClusterGroup() el plugin la ejecuta automáticamente cada vez que genera un icono de clúster, pasándole como argumento el objeto cluster, que contiene todos los marcadores agrupados.
        
        iconCreateFunction: function (cluster) {
            var count = cluster.getChildCount();
            
            const clusterTitle = `Grupo de ${count} despegues registrados en XContest`;

            // Escala de color según número de marcadores
            var max = 1000; 
            var ratio = 1 - Math.min(count / max, 1); //ratio = 0 → rojo intenso, ratio = 1 → rojo claro

            // Conversión hex a RGB
            function hexToRGB(hex) {
                return [
                    parseInt(hex.substr(1,2),16),
                    parseInt(hex.substr(3,2),16),
                    parseInt(hex.substr(5,2),16)
                ];
            }

            var darkRGB = hexToRGB("#a91311");   // rojo oscuro
            var lightRGB = hexToRGB("#f7bd7e");  // rojo claro

            // Interpolación lineal en RGB
            var r = Math.round(darkRGB[0] + (lightRGB[0]-darkRGB[0])*ratio);
            var g = Math.round(darkRGB[1] + (lightRGB[1]-darkRGB[1])*ratio);
            var b = Math.round(darkRGB[2] + (lightRGB[2]-darkRGB[2])*ratio);

            var color = `rgb(${r},${g},${b})`;

            return new L.DivIcon({
                html: `<div title="${clusterTitle}" style="background:${color}"><span>${count}</span></div>`,
                className: 'estilobase-custom-cluster-mapadecalor',
                iconSize: new L.Point(40, 40),
                iconAnchor: L.point(20, 20) //Centra el icono en el punto
            });
        }
            
    });

    //Popup al hacer click en un cluster: Coordenadas del centro del cluster		
    clustergroupMapaDeCalorMarruecos.on('clusterclick', function (e) {
        // 1. Obtener los datos del clúster
        const childCount = e.layer.getChildCount(); // Cuántos marcadores (despegues) hay en el clúster
        const clusterLatLng = e.layer.getLatLng(); // Coordenadas del centro del clúster

        const popupHtml = `<div style="line-height: 1.2;">

                <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂🪂🪂🪂🪂<br>${childCount} Despegues en XContest</b></div>
                <div style="margin-bottom: 5px;">Coordenadas medias:<br><b>${clusterLatLng.lat.toFixed(4)}, ${clusterLatLng.lng.toFixed(4)}</b></div>
                <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/wind?${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)},14' target='_blank'>Windy</a></div>
                <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)},13' target='_blank'>Meteo-parapente</a></div>
                <div style="margin-bottom: 5px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${clusterLatLng.lat.toFixed(4)}N${clusterLatLng.lng.toFixed(4)}E' target='_blank'>Meteoblue</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${clusterLatLng.lat.toFixed(4)},${clusterLatLng.lng.toFixed(4)}' target='_blank'>Google Maps</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/OpenTopoMap&pois=${clusterLatLng.lng.toFixed(4)},${clusterLatLng.lat.toFixed(4)}' target='_blank'>Brouter</a></div>
                <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}&l=Czt/Sa&n2=_gwm&r=${clusterLatLng.lat.toFixed(4)}/${clusterLatLng.lng.toFixed(4)}/${clusterLatLng.lat.toFixed(4)}, ${clusterLatLng.lng.toFixed(4)}' target='_blank'>Nakarte</a></div>
                <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${clusterLatLng.lng.toFixed(4)}%20${clusterLatLng.lat.toFixed(4)}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                </div>`

        // 3. Enlazar el popup al clúster y abrirlo
        // Esto crea un popup dinámicamente solo para este clic
        e.layer.bindPopup(popupHtml, { className: 'popup-despegueindividual', maxWidth: 300 })
        .openPopup();
    });	

    const heatpointsMapaDeCalorMarruecos = []; // array para puntos del heatmap //heatPointsWebGL

    let heatlayerMapaDeCalorMarruecos;

    // escape para html en popup/label. Esa función convierte caracteres especiales de HTML en sus entidades seguras, evitando que el texto insertado en el DOM se interprete como código HTML (previene inyección de HTML o XSS)
    function escapeHtml(str){
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    const iconoDespegueIndividualMarruecos = L.divIcon({
    className: 'custom-point-circle', // Una clase CSS para estilizar el círculo
    html: '<div style="background:#ff0000; border-radius:50%; width:10px; height:10px;"></div>', // El círculo dentro del div
    iconSize: [10, 10], // Tamaño del icono (igual al div de arriba)
    iconAnchor: [5, 5] // Centro del icono
    });

    // Flag para controlar la carga única del CSV
    let csvCargadoMapaDeCalorMarruecos = false; // Usamos un nombre específico para evitar conflictos.

    // Muestra el mensaje de carga en la pantalla
    function mostrarMensajeCargaMapaDeCalorMarruecos() {
        if (mensajeCargaMapaDeCalorMarruecos) {
            mensajeCargaMapaDeCalorMarruecos.style.display = 'block';
        }
    }

    //Oculta el mensaje de carga en la pantalla
    function ocultarmensajeCargaMapaDeCalorMarruecos() {
        if (mensajeCargaMapaDeCalorMarruecos) {
            setTimeout(function() {mensajeCargaMapaDeCalorMarruecos.style.display = 'none'}, 2000);
        }
    }

    // Carga los datos del CSV y crea los marcadores/capas de calor. Se ejecuta solo la primera vez
    function cargarDatosMapaDeCalorMarruecos() {
        if (csvCargadoMapaDeCalorMarruecos) {
            return; // Detener si ya se cargó
        }

        mostrarMensajeCargaMapaDeCalorMarruecos();	// Mostramos el mensaje de carga antes de la operación asíncrona

        Papa.parse('map/mapadecalormarruecos.csv', {

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
                    const fecha = row.Fecha || '';
                    const hora = row.Hora || '';
                    const distanciarecorrida = row.DistanciaRecorrida || '';
                    const urlvuelo = row.URLVuelo || '';
                    
                    const marker = L.marker([lat, lon], { icon: iconoDespegueIndividualMarruecos, riseOnHover: true, title: 'Despegue individual registrado en XContest' });
                    
                    const popupHtml = `<div style="min-width:200px; line-height: 1.2;">
                        <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂<br>Despegue en XContest</b></div>
                        <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  
                        <div style="margin-bottom: 5px;">Fecha: <b>${escapeHtml(fecha)}</b></div>
                        <div style="margin-bottom: 5px;">Hora: <b>${escapeHtml(hora)}</b></div>
                        <div style="margin-bottom: 5px;">Distancia recorrida: <b>${escapeHtml(distanciarecorrida)} km</b></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='${escapeHtml(urlvuelo)}' target='_blank'>Vuelo en XContest</a></div>
                        </div>`;

                    marker.bindPopup(popupHtml, { className: 'popup-despegueindividual', maxWidth: 300 }); //de momento no he creado esa clase
                    clustergroupMapaDeCalorMarruecos.addLayer(marker);
                    // Añadir al array de puntos de calor
                    heatpointsMapaDeCalorMarruecos.push([lat, lon, 1]); // intensidad = 1
                });
            
            // Crear capa de calor
                heatlayerMapaDeCalorMarruecos = L.heatLayer(heatpointsMapaDeCalorMarruecos, {
                    radius: 18, blur: 22, maxZoom: 19, minOpacity: 0.3,
                    gradient: { 0.2: 'yellow', 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' }
                });//.addTo(map); //No la mostramos inicialmente

                //map.addLayer(clustergroupMapaDeCalorMarruecos); //No la mostramos inicialmente
                
                // Marcar como cargado exitosamente
                csvCargadoMapaDeCalorMarruecos = true;
                ocultarmensajeCargaMapaDeCalorMarruecos(); // Ocultamos el mensaje si la carga fue exitosa
                
                // LLAMADA ADICIONAL: Ya que el usuario marcó el checkbox antes de que se completara la carga,
                // debemos añadirlas al mapa una vez que estén listas.
                const checkbox = document.getElementById('checkboxMapaDeCalorMarruecos');
                if (checkbox && checkbox.checked) {
                    if (!map.hasLayer(clustergroupMapaDeCalorMarruecos)) {
                        map.addLayer(clustergroupMapaDeCalorMarruecos);
                    }
                    if (!map.hasLayer(heatlayerMapaDeCalorMarruecos)) {
                        map.addLayer(heatlayerMapaDeCalorMarruecos);
                    }
                }

            },

            error: function(error) {
            console.error('Error cargando CSV:', error.message || error);
            alert('Error al cargar el archivo CSV. Consulta la consola para más información.');
            ocultarmensajeCargaMapaDeCalorMarruecos(); // Ocultamos el mensaje si hubo un error en la carga
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
                        width: 35px;
                        height: 35px;
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
            <div style="font-size: 1.3em; margin-bottom: 5px;"><b>✏️ ${escapeHtml(nombre)}</b></div>
            <div style="margin-bottom: 5px;">Tipo: <b>${escapeHtml(tipo)}</b></div> 
            <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>  		
            <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/wind?${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},14' target='_blank'>Windy</a></div>
            <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},13' target='_blank'>Meteo-parapente</a></div>
            <div style="margin-bottom: 5px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${escapeHtml(lat.toFixed(4))}N${escapeHtml(lon.toFixed(4))}E' target='_blank'>Meteoblue</a></div>
            <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))}' target='_blank'>Google Maps</a></div>
            <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/OpenTopoMap&pois=${escapeHtml(lon.toFixed(4))},${escapeHtml(lat.toFixed(4))}' target='_blank'>Brouter</a></div>
            <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}&l=Czt/Sa&n2=_gwm&r=${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/${escapeHtml(nombre)} (${escapeHtml(tipo)})' target='_blank'>Nakarte</a></div>
            <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon}%20${lat}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
            <div style="margin-bottom: 5px;">Notas: <b>${escapeHtml(notas)}</b></div>  
            </div>`;

        marker.bindPopup(popupHtml, { className: 'popup-notaspersonales', maxWidth: 300 }); //por ahora no existe así que sale el popup estándar
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
                        width: 35px;
                        height: 35px;
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
        const orientacionHTML = createOrientationSVG(orientacionesMetadata);

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
            const SVGorientaciones = createOrientationSVG(row.Orientaciones);
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
            
                    <div style="font-size: 1.3em; margin-bottom: 5px;"><b>🪂 ${escapeHtml(despegue)}</b></div>
                    <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">Orientación: ${SVGorientaciones} <b>${escapeHtml(orientacion)}</b></div>
                    <div style="margin-top: 8px; margin-bottom: 3px;">⛅ <a href='https://www.windy.com/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/wind?${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},14' target='_blank'>Windy</a></div>
                    <div style="margin-bottom: 3px;">⛅ <a href='https://meteo-parapente.com/#/${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))},13' target='_blank'>Meteo-parapente</a></div>
                    <div style="margin-bottom: 5px;">⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${escapeHtml(lat.toFixed(4))}N${escapeHtml(lon.toFixed(4))}E' target='_blank'>Meteoblue</a></div>
                    
                    <div class="popup-toggle-header" 
                        style="cursor: pointer; border-radius: 3px; font-weight: bold; padding-top: 3px;">
                        Más información: ▼
                    </div>
                    
                    <div class="popup-collapsible-content" style="display: none; overflow-wrap: break-word; ">

                        <div style="margin-bottom: 5px;">Coordenadas: <b>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</b></div>
                        <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 5px;" title="Nivel de uso del despegue según fecha del último vuelo registrado (referencia: nov-2025): Verde 0–6 meses, Naranja 6–12, Amarillo 12–24, Blanco >24 meses sin vuelos">Nivel de actividad: ${dot}</div>
                        <div style="margin-bottom: 5px;">Nº de vuelos en XContest: <b>${escapeHtml(vuelos)}</b></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://maps.google.com/?q=${escapeHtml(lat.toFixed(4))},${escapeHtml(lon.toFixed(4))}' target='_blank'>Google Maps</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://brouter.de/brouter-web/#map=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/OpenTopoMap&pois=${escapeHtml(lon.toFixed(4))},${escapeHtml(lat.toFixed(4))}' target='_blank'>Brouter</a></div>
                        <div style="margin-bottom: 3px;">🗺️ <a href='https://nakarte.me/#m=15/${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}&l=Czt/Sa&n2=_gwm&r=${escapeHtml(lat.toFixed(4))}/${escapeHtml(lon.toFixed(4))}/${escapeHtml(despegue)} (${escapeHtml(orientacion)})' target='_blank'>Nakarte</a></div>
                        <div style="margin-bottom: 5px;">🔍 <a href='https://www.xcontest.org/world/en/flights-search/?list[sort]=time_start&filter[point]=${lon}%20${lat}&filter[radius]=500' target='_blank'>XContest (&plusmn; 500 m)</a></div>
                        <div style="margin-bottom: 5px;">${escapeHtml(info)}</div>
                        
                    </div>
                    
                    </div>`;		

            marker.bindPopup(popupHtml, { className: 'popup-despeguesmundo', maxWidth: 300 });
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


    let isFijado = false; // Estado inicial
    let buttonFijar;
    let buttonCerrar;
    let iconoFijar;

    //  1. Inicialización de variables locales 
    var infoPanel = document.getElementById('infoPanel');
    buttonFijar = document.getElementById('buttonFijar');
    buttonCerrar = document.getElementById('buttonCerrar');
    iconoFijar = document.getElementById('iconoFijar');
    var divOpciones = document.getElementById('divOpciones');
    var labelMostrarOpciones = document.getElementById('labelMostrarOpciones'); 
    
    // Reasignación (opcional, pero asegura el scope)
    buttonFijar = buttonFijar; 
    buttonCerrar = buttonCerrar; 
    iconoFijar = iconoFijar;
    
    //  2. Lógica de Inicialización y Listeners DOM/LEAFLET 
    if (infoPanel && labelMostrarOpciones && buttonFijar && buttonCerrar && divOpciones && typeof L !== 'undefined' && typeof map !== 'undefined') {
        
        // --- 2.1 ESTADO INICIAL ---
        infoPanel.style.display = 'block'; 
        retraerOpciones();
        //expandirOpciones(); // Inicialmente expandido
        
        // --- 2.2 LISTENERS DE CONTROLES ---
        
        // 📌 Listener del Botón FIJAR
        L.DomEvent.on(buttonFijar, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            isFijado = !isFijado;
            
            if (isFijado) {
                buttonFijar.classList.add('activo-fijado');
                iconoFijar.textContent = '📍';
                //infoPanel.removeEventListener('mouseenter', expandirOpciones);
                expandirOpciones();
            } else {
                buttonFijar.classList.remove('activo-fijado');
                iconoFijar.textContent = '📌';
                retraerOpciones(); 
            }
        }); 
        
        // ❌ Listener del Botón CERRAR
        L.DomEvent.on(buttonCerrar, 'click', function (event) {
            L.DomEvent.stopPropagation(event);
            
            // 1. Restablecer el estado "Fijado"
            if (isFijado) {
                isFijado = false; // Desactiva el modo fijado
                buttonFijar.classList.remove('activo-fijado');
                iconoFijar.textContent = '📌';
            }
            
            retraerOpciones();
        }); 
                
        // --- 2.3 LISTENERS DEL MAPA ---
        
        // Tras mover el mapa: Retraer el panel
        map.on('moveend', function() {
            // Limpieza del campo de búsqueda de despegues
            const input = document.querySelector('.leaflet-text-search-input');
            const autocompleteList = document.querySelector('.autocomplete-list');
        
            if (input) {
                input.value = '';
            }
            if (autocompleteList) {
                autocompleteList.style.display = 'none';
            }		
            
            // Retraer el panel de opciones al terminar de mover el mapa
            retraerOpciones();
        });
        
    }

    // Función auxiliar para manejar la expansión por clic
    function expandirAlClicar(event) {
        const infoPanel = document.getElementById('infoPanel');
        // Si el panel está retraído Y NO fijado, se expande
        if (infoPanel.classList.contains('retraido') && !isFijado) {
            L.DomEvent.stopPropagation(event);
            expandirOpciones();
        }
    }

    // Función para retraer infoPanel
    function retraerOpciones() {
        const infoPanel = document.getElementById('infoPanel');
        const divOpciones = document.getElementById('divOpciones');
        const labelMostrarOpciones = document.getElementById('labelMostrarOpciones');

        if (isFijado) {return;} // Si está fijado, no hacemos nada.
        
        if (!infoPanel || !divOpciones || !labelMostrarOpciones) return;

        divOpciones.classList.add('oculto');
        infoPanel.classList.add('retraido');
        //  Mostrar el texto "Opciones" 
        labelMostrarOpciones.style.display = 'block';
        //  Añadir listener de Clic/Toque 
        L.DomEvent.on(infoPanel, 'click', expandirAlClicar);
        //  Expandir en el PC al pasar el ratón 
        //infoPanel.addEventListener('mouseenter', expandirOpciones); 
    }

    // Función para expandir infoPanel
    function expandirOpciones() {
        const infoPanel = document.getElementById('infoPanel');
        const divOpciones = document.getElementById('divOpciones');
        const labelMostrarOpciones = document.getElementById('labelMostrarOpciones');
        
        if (!infoPanel || !divOpciones || !labelMostrarOpciones) return;

        divOpciones.classList.remove('oculto');
        infoPanel.classList.remove('retraido');
        labelMostrarOpciones.style.display = 'none';
        
        //  DESACTIVAR MOUSEENTER 
        // infoPanel.removeEventListener('mouseenter', expandirOpciones);
        //  DESACTIVAR CLICK/TOQUE 
        L.DomEvent.off(infoPanel, 'click', expandirAlClicar);	
    }

    // gestionar la configuración inicial
        
    // 1. Filtro Real (Vuelos)
    const sliderVuelosFiltro = document.getElementById('sliderVuelos');
    const textoVuelosFiltro = document.getElementById('valorVuelosTexto');
    
    // 2. Filtro Real (Último Vuelo)
    const sliderUltimoVueloFiltro = document.getElementById('sliderUltimoVuelo');
    const textoUltimoVueloFiltro = document.getElementById('valorUltimoVueloTexto');

    // 1. Filtro Real (KmMedia)
    const sliderKmMediaFiltro = document.getElementById('sliderKmMedia');
    const textoKmMediaFiltro = document.getElementById('valorKmMediaTexto');
    
    // 3. Configuración (Vuelos)
    const sliderVuelosConfig = document.getElementById('sliderValorInicialFiltroNumeroMinimoVuelos');
    // 🚩 IMPORTANTE: ID en el HTML para el texto del config de Vuelos
    const textoVuelosConfig = document.getElementById('valorConfigFiltroNumeroMinimoVuelosTexto'); 
    
    // 4. Configuración (Último Vuelo)
    const sliderUltimoVueloConfig = document.getElementById('sliderValorInicialFiltroUltimoVuelo');
    // 🚩 IMPORTANTE: ID en el HTML para el texto del config de Último Vuelo
    const textoUltimoVueloConfig = document.getElementById('valorConfigFiltroUltimoVueloTexto'); 
    
    // --- CLAVES DE ALMACENAMIENTO ---
    const STORAGE_KEY_VUELOS = 'miMapa_minimoVuelos_preferido';
    const STORAGE_KEY_ULTIMO_VUELO = 'miMapa_minimoUltimoVuelo_preferido';

    // Función auxiliar para obtener el valor real según la escala
    function obtenerValorReal(indice, escala) {
        const indiceNumerico = parseInt(indice, 10);
        // Si el índice no existe o la escala no está definida, devuelve el valor más bajo (0 o 'Todos')
        return escala && escala[indiceNumerico] !== undefined ? escala[indiceNumerico] : escala[0];
    }

    // --- FUNCIÓN DE INICIALIZACIÓN (Carga) ---
    function iniciarConfiguracion() {
        
        // 1. VUELOS: Lectura y Conversión
        const indiceVuelosGuardado = localStorage.getItem(STORAGE_KEY_VUELOS) || '0';
        const valorRealVuelos = obtenerValorReal(indiceVuelosGuardado, ESCALA_VUELOS);
        
        // 2. ÚLTIMO VUELO: Lectura y Conversión
        const indiceUltimoVueloGuardado = localStorage.getItem(STORAGE_KEY_ULTIMO_VUELO) || '0';
        const valorRealUltimoVuelo = obtenerValorReal(indiceUltimoVueloGuardado, ESCALA_ULTIMO_VUELO); 

        // B. Aplicar a Sliders de CONFIGURACIÓN (Visual)
        if(sliderVuelosConfig && textoVuelosConfig) {
            sliderVuelosConfig.value = indiceVuelosGuardado;
            textoVuelosConfig.innerText = valorRealVuelos;
        }
        if(sliderUltimoVueloConfig && textoUltimoVueloConfig) {
            sliderUltimoVueloConfig.value = indiceUltimoVueloGuardado;
            textoUltimoVueloConfig.innerText = valorRealUltimoVuelo;
        }

        // C. Aplicar a Sliders de FILTRO REAL (Funcional)
        if(sliderVuelosFiltro && textoVuelosFiltro) {
            sliderVuelosFiltro.value = indiceVuelosGuardado;
            textoVuelosFiltro.innerText = valorRealVuelos;
        }
        if(sliderUltimoVueloFiltro && textoUltimoVueloFiltro) {
            sliderUltimoVueloFiltro.value = indiceUltimoVueloGuardado;
            textoUltimoVueloFiltro.innerText = valorRealUltimoVuelo;
        }

        // D. Disparar el filtro del mapa.
        // Se asume que actualizarFiltrosMapa() está disponible globalmente.
        actualizarFiltrosMapa(); 
    }

    // --- LISTENERS PARA GUARDAR LA CONFIGURACIÓN ---
    
    // Listener Vuelos (Guarda y actualiza el texto de configuración)
    if (sliderVuelosConfig) {
        sliderVuelosConfig.addEventListener('input', function() {
            const indiceActual = this.value;
            const valorReal = obtenerValorReal(indiceActual, ESCALA_VUELOS);
            
            if(textoVuelosConfig) textoVuelosConfig.innerText = valorReal;
            localStorage.setItem(STORAGE_KEY_VUELOS, indiceActual);
            actualizarEstadoVisualFiltros();
        });
    }
    
    // Listener Último Vuelo (Guarda y actualiza el texto de configuración)
    if (sliderUltimoVueloConfig) {
        sliderUltimoVueloConfig.addEventListener('input', function() {
            const indiceActual = this.value;
            const valorReal = obtenerValorReal(indiceActual, ESCALA_ULTIMO_VUELO);
            
            if(textoUltimoVueloConfig) textoUltimoVueloConfig.innerText = valorReal;
            localStorage.setItem(STORAGE_KEY_ULTIMO_VUELO, indiceActual);
            actualizarEstadoVisualFiltros();
        });
    }

    // Ejecutar la carga inicial
    iniciarConfiguracion();
    actualizarEstadoVisualFiltros();
    
    // 🔴 CAPAS:
    //___________________________________________________________________________________

    
    //Checkbox para ocultar/mostrar Despegues
    document.getElementById('checkboxDespegues').addEventListener('change', function () {
        if (this.checked) {
            map.addLayer(clustergroupDespegues);
        } else {
            map.removeLayer(clustergroupDespegues);
        }	
        //retraerOpciones()
        actualizarFiltrosMapa()
    });

    //Checkbox para ocultar/mostrar Mapa de calor Península Ibérica
    const checkboxMapaDeCalorPeninsulaIberica = document.getElementById('checkboxMapaDeCalorPeninsulaIberica');

    if (checkboxMapaDeCalorPeninsulaIberica) {
        checkboxMapaDeCalorPeninsulaIberica.addEventListener('change', function () {
            if (this.checked) {
                // 1. Si los datos no están cargados, iniciar la carga (la carga los añade al mapa al finalizar)
                if (!csvCargadoMapaDeCalorPeninsulaIberica) {
                    cargarDatosMapaDeCalorPeninsulaIberica();
                } 
                // 2. Si ya están cargados, simplemente añadir las capas (instantáneamente)
                else {
                    if (!map.hasLayer(clustergroupMapaDeCalorPeninsulaIberica)) {
                        map.addLayer(clustergroupMapaDeCalorPeninsulaIberica);
                    }
                    if (heatlayerMapaDeCalorPeninsulaIberica && !map.hasLayer(heatlayerMapaDeCalorPeninsulaIberica)) {
                        map.addLayer(heatlayerMapaDeCalorPeninsulaIberica);
                    }
                }
            } else {
                // Ocultar las capas al desmarcar (solo si existen)
                if (map.hasLayer(clustergroupMapaDeCalorPeninsulaIberica)) {
                    map.removeLayer(clustergroupMapaDeCalorPeninsulaIberica);
                }
                if (heatlayerMapaDeCalorPeninsulaIberica && map.hasLayer(heatlayerMapaDeCalorPeninsulaIberica)) {
                    map.removeLayer(heatlayerMapaDeCalorPeninsulaIberica);
                }
            }
            //retraerOpciones() 
        });
    } 

    //Checkbox para ocultar/mostrar Mapa de calor Alpes
    const checkboxMapaDeCalorAlpes = document.getElementById('checkboxMapaDeCalorAlpes');

    if (checkboxMapaDeCalorAlpes) {
        checkboxMapaDeCalorAlpes.addEventListener('change', function () {
            if (this.checked) {
                // 1. Si los datos no están cargados, iniciar la carga (la carga los añade al mapa al finalizar)
                if (!csvCargadoMapaDeCalorAlpes) {
                    cargarDatosMapaDeCalorAlpes();
                } 
                // 2. Si ya están cargados, simplemente añadir las capas (instantáneamente)
                else {
                    if (!map.hasLayer(clustergroupMapaDeCalorAlpes)) {
                        map.addLayer(clustergroupMapaDeCalorAlpes);
                    }
                    if (heatlayerMapaDeCalorAlpes && !map.hasLayer(heatlayerMapaDeCalorAlpes)) {
                        map.addLayer(heatlayerMapaDeCalorAlpes);
                    }
                }
            } else {
                // Ocultar las capas al desmarcar (solo si existen)
                if (map.hasLayer(clustergroupMapaDeCalorAlpes)) {
                    map.removeLayer(clustergroupMapaDeCalorAlpes);
                }
                if (heatlayerMapaDeCalorAlpes && map.hasLayer(heatlayerMapaDeCalorAlpes)) {
                    map.removeLayer(heatlayerMapaDeCalorAlpes);
                }
            }
            //retraerOpciones() // Tu llamada opcional
        });
    } 

    //Checkbox para ocultar/mostrar Mapa de calor Marruecos
    const checkboxMapaDeCalorMarruecos = document.getElementById('checkboxMapaDeCalorMarruecos');

    if (checkboxMapaDeCalorMarruecos) {
        checkboxMapaDeCalorMarruecos.addEventListener('change', function () {
            if (this.checked) {
                // 1. Si los datos no están cargados, iniciar la carga (la carga los añade al mapa al finalizar)
                if (!csvCargadoMapaDeCalorMarruecos) {
                    cargarDatosMapaDeCalorMarruecos();
                } 
                // 2. Si ya están cargados, simplemente añadir las capas (instantáneamente)
                else {
                    if (!map.hasLayer(clustergroupMapaDeCalorMarruecos)) {
                        map.addLayer(clustergroupMapaDeCalorMarruecos);
                    }
                    if (heatlayerMapaDeCalorMarruecos && !map.hasLayer(heatlayerMapaDeCalorMarruecos)) {
                        map.addLayer(heatlayerMapaDeCalorMarruecos);
                    }
                }
            } else {
                // Ocultar las capas al desmarcar (solo si existen)
                if (map.hasLayer(clustergroupMapaDeCalorMarruecos)) {
                    map.removeLayer(clustergroupMapaDeCalorMarruecos);
                }
                if (heatlayerMapaDeCalorMarruecos && map.hasLayer(heatlayerMapaDeCalorMarruecos)) {
                    map.removeLayer(heatlayerMapaDeCalorMarruecos);
                }
            }
            //retraerOpciones() // Tu llamada opcional
        });
    } 

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

        // Si el valor es 'Todos' (índice 0), retornamos un estado de "no filtro"
        if (valor === 'Todos') {
            document.getElementById('valorUltimoVueloTexto').textContent = 'Todos';
            return { minAnio: null, esTodos: true };
        }

        // Si es un año, lo usamos como filtro.
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
        // 1. Escucha los 8 botones de orientación (Igual que antes)
        const botonesOrientacion = document.querySelectorAll('.filtro-orientacion-checkbox:not(#filtroMaestroOrientacion)');
        botonesOrientacion.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                actualizarEstadoMaestro(); 
                actualizarFiltrosMapa();
                actualizarEstadoVisualFiltros();			
            });
        });

        // 2. Escucha el botón central (Igual que antes)
        const maestroBtn = document.getElementById('filtroMaestroOrientacion');
        if(maestroBtn) { // Pequeña seguridad por si acaso
            maestroBtn.addEventListener('change', function() {
                limpiarFiltrosOrientacion(); 
                // Nota: limpiarFiltrosOrientacion ya llama a actualizarFiltrosMapa() al final
            });
        }

        // 3. NUEVO: Escucha el Slider de Vuelos
        const sliderVuelos = document.getElementById('sliderVuelos');
        if(sliderVuelos) {
            // Usamos 'input' para que filtre en tiempo real mientras arrastras
            // Si va muy lento el mapa, cámbialo por 'change' (filtra al soltar el ratón)
            sliderVuelos.addEventListener('input', function() {
                actualizarFiltrosMapa();
                actualizarEstadoVisualFiltros();
            });
        }
        
        // 4. NUEVO: Escucha el Slider de Último Vuelo
        const sliderUltimoVuelo = document.getElementById('sliderUltimoVuelo');
        if(sliderUltimoVuelo) {
            sliderUltimoVuelo.addEventListener('input', function() {
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
     * Asigna las 16 orientaciones de la metadata (ej. 'NNE') 
     * a los 8 segmentos del icono (ej. 'N' y 'NE').
     */
    const METADATA_TO_ICON_MAP = {
        'N':   ['N'],
        'NNE': ['N', 'NE'], // NNE está entre N y NE
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
        'NNO': ['N', 'NO']  // NNO está entre N y NO
    };


    /**
     * Crea un icono SVG de rosa de los vientos con 16 segmentos visuales.
     * Cada segmento ocupa 45 grados y está centrado en su ángulo de orientación.
     * @param {string} orientacionesStr - El string de metadata (ej: "_N_NNE_S").
     */
    function createOrientationSVG(orientacionesStr) {
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

    //___________________________________________________________________________________
    // FIN filtro orientaciones
    //___________________________________________________________________________________

}
