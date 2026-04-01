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

let chkAplicarCalibracion = localStorage.getItem("METEO_CHECKBOX_APLICAR_CALIBRACION") === "true";

const calibracionVelocidad = 1.36; // Factor de calibración por defecto
const calibracionRacha = 1.07; // Factor de calibración por defecto
const calibracionDireccion = 7; // Factor de calibración por defecto (Grados a añadir a la dirección)

let chkMostrarRafagosidad = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_RAFAGOSIDAD") === "true";
// Límites rafagosidad: Verde (< 1.3): Viento laminar. La racha no supera en un 30% a la media. Aire estable. Naranja (1.3 a 1.6): Viento racheado. Rojo (> 1.6): Viento turbulento. La racha es más de un 60% superior a la media
const rafagosidadUmbralNaranja = 1.5;
const rafagosidadUmbralRojo = 2.1;

let chkMostrarVientoAlturas = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS") === "true"; 

let chkMostrarCizalladura = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_CIZALLADURA") !== "false"; // Por defecto true para que lo vean

// ECMWF
//let chkMostrarPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PRECIPITACION") !== "false";
const chkMostrarPrecipitacion = true; // Siempre activo
let chkMostrarProbPrecipitacion = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION") !== "false";
//let chkMostrarBaseNube = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_BASE_NUBE") !== "false";
let chkMostrarXC = localStorage.getItem("METEO_CHECKBOX_MOSTRAR_XC") !== "false"; // true por defecto

// UMBRALES DE CIZALLADURA (Factor multiplicador)
const LIMITES_CIZALLADURA = {
    "180 m": { naranja: 1.8, rojo: 2.3 }, // +80% / +130%
    "120 m": { naranja: 1.6, rojo: 2.0 }, // +60% / +100%
    "80 m":  { naranja: 1.4, rojo: 1.7 }  // +40% / +70%
}

//const HorariosMediosActualizacion = ["01:27", "03:07", "06:00", "11:21", "13:31", "16:10", "19:08", "23:18"]; // en UTC-0
//const HorariosMediosActualizacion = ["01:31", "03:08", "06:02", "11:21", "13:31", "16:12", "19:11", "23:21"]; // en UTC-0
const HorariosMediosActualizacion = ["01:32", "03:02", "05:59", "11:22", "13:32", "16:17", "19:12", "23:22"]; // en UTC-0
const HorariosMediosActualizacionEcmwf =["00:24", "07:00", "12:32", "18:54"]; // en UTC-0
// Nota: aplico 1 min de más. Buscar: const OFFSET_MS = 1 * 60 * 1000;

let esModoOffline = false; // Nueva variable para controlar el estado de red

const CORTES_DISTANCIA_GLOBAL =[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 9999];

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
    
    construir_tabla(false, false);
    
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
        iconUrl: 'icons/marker-icon-2x-red.png',
        shadowUrl: 'icons/marker-shadow.png',
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
                            <p style="font-size: 2.5em; margin: 0 0 10px 0;">📍</p>
							<p>Como es la primera vez, necesitas configurar una ubicación de origen.</p>
							<p>Podrás cambiarla cuando quieras con el botón <span style='background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block;'>📍</span></p>
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

    const htmlAyuda = !forzar 
        ? `<p style="color: #555; margin-top: 10px;">Siempre podrás verla en:<br><i>⚙️ Configuración</i> > <i>Guía visual</i></p>
           <label style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; color: #555; cursor: pointer;">
               <input type="checkbox" id="chkNoVolverGuiaPrinc" style="transform: scale(1.2);"> No volver a mostrar esta sugerencia
           </label>`
        : ''; 

    const botonesModal =[
        {
            texto: forzar ? 'Cancelar' : 'No', 
            estilo: 'secundario',
            onclick: function() {
                // Comprobamos si el usuario marcó la casilla antes de darle a "Ahora no"
                const chk = document.getElementById('chkNoVolverGuiaPrinc');
                if (chk && chk.checked) {
                    localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true');
                }
                GestorMensajes.ocultar();
            }
        },
        {
            texto: 'Ver guía',
            onclick: function() {
                GestorMensajes.ocultar();
                localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true'); // Si la ve, ya no la sugerimos más
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

    const driverObj = window.driver.js.driver({
        
        showProgress: true, 
        progressText: '{{current}} de {{total}}',
        smoothScroll: true,
        overlayClickBehavior: () => {}, //() => {}, // Al ser una función vacía, no hace nada // What to do when the overlay backdrop is clicked. Possible options are 'close', 'nextStep', or a custom function. default: 'close')
        overlayColor: 'rgba(0, 0, 0, 0.75)', // Un fondo oscuro que haga resaltar tu azul
        allowClose: true,      // ¿Permitir cerrar pulsando la X?
        //popoverOffset: number, // Distance between the popover and the highlighted element. (default: 10)
        // Opcional: Personalizar el espacio alrededor del elemento destacado
        //stagePadding: 10,       // Margen en píxeles entre el elemento y el brillo (default: 10)
        stageRadius: 8,   // Redondea las esquinas del brillo para que no sea un cuadrado seco (default: 5)

        nextBtnText: 'Siguiente →',
        prevBtnText: '←',
        doneBtnText: 'Cerrar guía',
        //closeBtnText: '×',

        steps: [
            { element: '#tabla', //'#tabla thead' apuntaría a la cabecera, '#tabla tbody tr:nth-child(7)' a la fila 3
                popover: { title: '🪂 Tabla de despegues favoritos', description: 'Muestra el pronóstico y sus puntuaciones de condiciones (despegue y XC).<br><br>Los despegues se ordenan automáticamente por la puntuación de despegue.', side: 'top', align: 'center'} },

            { element: '.div-paneles-controles-transparente', 
                popover: { title: 'Selector de rango horario', description: 'Ajusta este deslizador desde ambos extremos para seleccionar el rango horario que te interese.<br><br>La tabla mostrará solo esas horas y la puntuación de condiciones se recalculará para ese intervalo de tiempo concreto.' , side: 'bottom', align: 'center'} },

            { element: '.noUi-value.noUi-value-horizontal.noUi-value-large', 
                popover: { title: 'Días de la semana', description: 'Estos botones de día de la semana facilitan la selección del rango horario de ese día. Será el uso habitual de la aplicación: echar un vistazo rápido a los despegues "posibles" ese día.<br><br>👉🏽 Voy a seleccionar éste como ejemplo para que veas cómo funciona.', side: 'bottom', align: 'start'},

                onDeselected: () => {
                    // querySelectorAll devuelve una lista (array) de todos los elementos
                    const elementos = document.querySelectorAll('.noUi-value.noUi-value-horizontal.noUi-value-large');
                    
                    // [0] es el primero, [1] el segundo, etc.
                    if (elementos[0]) { 
                        elementos[0].click(); // Clic en el segundo elemento
                    }
                }
            },

            { element: '#tabla', //'#tabla thead' apuntaría a la cabecera, '#tabla tbody tr:nth-child(7)' a la fila 3
                popover: { title: '🗓️ Día seleccionado', description: 'Ahora la tabla solo muestra ese día y con el rango horario que se ha seleccionado automáticamente.<br><br>👉🏽  Puedes mover los deslizadores hora a hora para elegir tu rango horario concreto y también puedes personalizar ese rango horario diario "automático" en ⚙️ Configuración.', side: 'bottom', align: 'center'} },
            
            { element: '.columna-meteo.borde-grueso-abajo.borde-grueso-arriba.borde-grueso-izquierda', 
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size:25px; display: block;">🌦️</span><span>Columna de meteorología</span></div>', description: 'Muestra los datos meteorológicos.<br><br>Si seleccionas el icono muestra información sobre cada parámetro meteorológico.', side: 'bottom', align: 'start'},
            },

            { element: '.columna-meteo.columna-simbolo-fija.borde-grueso-izquierda.celda-altura-4px', 
                popover: { title: '🟩🟧🟥 Fila de Cizalladura / Fiabilidad', description: 'Esta fila especial muestra mediante un semáforo de colores el nivel de Cizalladura de Bajo Nivel (LLWS - Low-Level Wind Shear) y también el grado de Fiabilidad del pronóstico de viento medio a 10 m de altura.' , side: 'bottom', align: 'center' } },

            { element: '.columna-condiciones.borde-grueso-izquierda.borde-grueso-arriba.borde-grueso-abajo', 
                popover: { title: '⭐ Columna de puntuación', description: 'El sistema calcula automáticamente dos puntuaciones (de 0 a 10) para cada despegue y para el rango horario seleccionado: Condiciones para despegar y Condiciones para mantenerse o iniciar Cross Country (XC).<br><br>Los despegues siempre se reordenan automáticamente por puntuación de Condiciones para despegar (de mayor a menor).<br><br>En la pantalla de ⚙️ Configuración puedes personalizar los límites que se tienen en cuenta en el cálculo y dispones de información adicional.' } },

            { element: '.btn-info.btn-abajo-izquierda', 
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/info.svg" width="20" height="20" style="display: block;"><span>Información del despegue</span></div>', description: 'Seleccionando esta <img src="icons/info.svg" width="20" height="20" style="vertical-align: middle; margin-bottom: 2px;"> se muestra información más completa del despegue y un botón para acceder a su mapa.<br><br>👉🏽  El mapa incluye información adicional y varias utilidades que merece la pena explorar.' } },

            { element: '#buscador-wrapper',
                popover: { title: '🔍 Buscador', description: 'Busca despegues escribiendo su nombre, su región o su provincia.<br><br>👉🏽 Puedes escribir sin tildes.' } },

            { element: '#btn-div-filtro-distancia-toggle',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/icono_filtro_60.webp" width="20" height="20" style="display: block;"><span>Filtro de distancia</span></div>', 
                    description: 'Muestra solo los despegues alrededor de un punto.<br><br>👉🏽 Voy a pulsar ahora ese botón para que lo veas.'}, },

            { element: '#btn-abrir-geo-menu',
                popover: { title: '<span style="background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block;">📍</span> Punto de origen', description: 'Aquí eliges el punto de origen del filtro de distancia.<br><br>Te ofrecerá usar un mapa o la propia localización del dispositivo.' , side: 'bottom', align: 'end'},
                
                onHighlighted: (element) => {
                    // 1. Forzamos el clic en el botón que despliega el menú
                    const toggleBtn = document.getElementById('btn-div-filtro-distancia-toggle');
                    
                    if (toggleBtn) {
                        // Ejecutamos el clic
                        toggleBtn.click();
                        
                        // 2. IMPORTANTE: Usamos un pequeño retraso para que el DOM se asiente
                        // y luego forzamos a Driver.js a recalcular la posición del elemento resaltado
                        setTimeout(() => {
                            if (typeof driverObj !== 'undefined') {
                                driverObj.refresh();
                            } else {
                                // Si driverObj no es global, intenta usar la instancia interna si la tienes
                                console.warn("Instancia driverObj no encontrada. Asegúrate de que sea accesible.");
                            }
                        }, 300); // Aumentado a 300ms para dar tiempo a posibles animaciones CSS
                    }
                },
            },

            { element: '#btn-incluir-no-favs-distancia',
                popover: { title: '<span style="background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block; padding-left: 5px; padding-right: 5px;"><img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">+<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"></span> Incluir despegues no favoritos en el filtro', description: 'Permite incluir temporalmente en el filtro todos los despegues disponibles (favoritos y no favoritos).<br><br>Esto es útil cuando viajamos y buscamos las mejores condiciones fuera de nuestra zona de favoritos.' , side: 'bottom', align: 'end'},
            },

            { element: '#distancia-slider',
                popover: { title: 'Distancia al punto', description: 'Arrastrando este deslizador eliges los kilómetros.<br><br>La tabla mostrará solo los despegues que estén dentro de ese radio de distancia.' },
                onDeselected: (element) => {
                    const toggleBtn = document.getElementById('btn-div-filtro-distancia-toggle');
                    if (toggleBtn) {
                        toggleBtn.click(); // Cerramos el menú
                    }
                }
            },

            { element: '#btn-mapa-despegues',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/icono_tierra_60.webp" width="20" height="20" style="display: block;"><span>Mapa de despegues</span></div>', description: 'Mapa de despegues de parapente con múltiple información: búsqueda de despegues, filtros por orientación, por nº de vuelos, por año del último vuelo, por distancia media, mapa de calor con más de 1 millón de puntos exactos de despegues y mucha otra información.<br><br>La información más completa es de España, Portugal y Pirineos (incluyendo la parte francesa), pero hay información de todo el mundo.' , side: 'bottom', align: 'center' } },

            { element: '#btn-activar-edicion-favoritos',
                popover: { title: '♥️/<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"> Edición de favoritos', description: 'Abre la <i>Pantalla de edición de favoritos</i>.<br><br>En esa pantalla tienes todos los despegues disponibles y es donde se marcan o desmarcan los favoritos que se mostrarán en esta <i>Pantalla principal</i>.' } },

            { element: '#btn-div-configuracion-toggle',
                popover: { title: '⚙️ Configuración', description: 'Te lleva al panel de configuración, donde podrás personalizar parámetros, activar opciones interesantes y ver información de los datos meteorológicos.<br><br>👉🏽 Para cada opción o dato, tienes un botón de información <img src="icons/info.svg" width="20" height="20" style="vertical-align: middle; margin-bottom: 2px;">.' } }
        ],
        
        onDestroyStarted: () => {
                localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true');
                driverObj.destroy();
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

    const htmlAyuda = !forzar 
        ? `<p style="color: #555; margin-top: 10px;">Siempre podrás verla con el botón <img src="icons/icono_ayuda_60.webp" width="18" height="18" style="vertical-align:middle;" alt="Guía"></p>
           <label style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; color: #555; cursor: pointer;">
               <input type="checkbox" id="chkNoVolverGuiaFavs" style="transform: scale(1.2);"> No volver a mostrar esta sugerencia
           </label>`
        : ''; 

    const botonesModal =[
        {
            texto: forzar ? 'Cancelar' : 'No',
            estilo: 'secundario',
            onclick: function() {
                const chk = document.getElementById('chkNoVolverGuiaFavs');
                if (chk && chk.checked) {
                    localStorage.setItem('METEO_GUIA_FAVORITOS_VISTA', 'true');
                }
                GestorMensajes.ocultar();
            }
        },
        {
            texto: 'Ver guía',
            onclick: function() {
                GestorMensajes.ocultar();
                localStorage.setItem('METEO_GUIA_FAVORITOS_VISTA', 'true');
                setTimeout(() => iniciarGuiaFavoritos(true), 300);
            }
        }
    ];

    GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2.5em; margin: 0 0 10px 0;">💡</p>
                <p style="font-size: 1.1em; font-weight: bold; margin: 0;">¿Quieres ver una guía visual sobre esta<br>Pantalla de edición de despegues favoritos ❤️?</p>
                ${htmlAyuda}
            </div>
        `,
        botones: botonesModal,
        anchoBotones: '130px'
    });
}

function iniciarGuiaFavoritos(forzar = false) {

    if (!forzar && localStorage.getItem('METEO_GUIA_FAVORITOS_VISTA') === 'true') {
        return; 
    }

    const driverObj = window.driver.js.driver({
        
        showProgress: true, 
        progressText: '{{current}} de {{total}}',
        smoothScroll: true,
        overlayClickBehavior: () => {}, //() => {}, // Al ser una función vacía, no hace nada // What to do when the overlay backdrop is clicked. Possible options are 'close', 'nextStep', or a custom function. default: 'close')
        overlayColor: 'rgba(0, 0, 0, 0.75)', // Un fondo oscuro que haga resaltar tu azul
        allowClose: true,      // ¿Permitir cerrar pulsando la X?
        //popoverOffset: number, // Distance between the popover and the highlighted element. (default: 10)
        // Opcional: Personalizar el espacio alrededor del elemento destacado
        //stagePadding: 10,       // Margen en píxeles entre el elemento y el brillo (default: 10)
        stageRadius: 8,   // Redondea las esquinas del brillo para que no sea un cuadrado seco (default: 5)

        nextBtnText: 'Siguiente →',
        prevBtnText: '←',
        doneBtnText: 'Cerrar guía',
        //closeBtnText: '×',

        steps: [
            { element: '#tabla', //'#tabla thead' apuntaría a la cabecera, '#tabla tbody tr:nth-child(7)' a la fila 3
                popover: { title: '🪂 Tabla de todos los despegues', description: 'Esta pantalla de edición de favoritos sirve para seleccionar los despegues que usas habitualmente. La pantalla normal de la aplicación mostrará solo los despegues favoritos.<br><br>En esta tabla tienes todos disponibles.<br><br>Por el momento solo hay despegues de España, Portugal, Pirineos (incluyendo la parte francesa) y parte de Alpes franceses y suizos. Esta aplicación es un proyecto en desarrollo.', side: 'right', align: 'start'} },

            { element: '#tabla tbody tr:nth-child(1) td:first-child', 
                popover: { title: '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favoritos', description: 'Marca (o desmarca) aquí tus despegues favoritos.<br><br>Se van guardando automáticamente.', side: 'bottom', align: 'end'} },

            { element: '#tabla thead tr:first-child th:first-child', 
                popover: { title: '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"> Cabecera favoritos', description: 'Permite marcar (o desmarcar) de una sola vez todos los despegues visibles actualmente en la tabla.<br><br>Ejemplo: buscas todos los de "Huesca" y los marcas todos.' } },

            { element: '.btn-info.btn-abajo-izquierda', 
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/info.svg" width="20" height="20" style="display: block;"><span>Información del despegue</span></div>', description: 'Seleccionando esta <img src="icons/info.svg" width="20" height="20" style="vertical-align: middle; margin-bottom: 2px;"> se muestra información más completa del despegue y un botón para acceder a su mapa.<br><br>👉🏽  El mapa incluye información adicional y varias utilidades que merece la pena explorar.' } },

            { element: '#buscador-wrapper',
                popover: { title: '🔍 Buscador', description: 'Encuentra tus despegues favoritos escribiendo su nombre, la región o la provincia.<br><br>👉🏽  Puedes escribir sin tildes.' } },

            { element: '#btn-div-filtro-distancia-toggle',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/icono_filtro_60.webp" width="20" height="20" style="display: block;"><span>Filtro de distancia</span></div>', 
                    description: 'Muestra solo los despegues alrededor de un punto.<br><br>Ejemplo: te puede servir para seleccionar rápidamente como favoritos (y ver así su pronóstico en la pantalla principal) los despegues que estén en un radio de 50 km alrededor de un punto.<br><br>Voy a pulsar ese botón para que lo veas.' } },

            { element: '#btn-abrir-geo-menu',
                popover: { title: '<span style="background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block;">📍</span> Punto de origen', description: 'Aquí eliges el punto de origen.<br><br>Te ofrecerá usar un mapa o la propia localización del dispositivo.' },
                
                onHighlighted: (element) => {
                    // 1. Forzamos el clic en el botón que despliega el menú
                    const toggleBtn = document.getElementById('btn-div-filtro-distancia-toggle');
                    
                    if (toggleBtn) {
                        // Ejecutamos el clic
                        toggleBtn.click();
                        
                        // 2. IMPORTANTE: Usamos un pequeño retraso para que el DOM se asiente
                        // y luego forzamos a Driver.js a recalcular la posición del elemento resaltado
                        setTimeout(() => {
                            if (typeof driverObj !== 'undefined') {
                                driverObj.refresh();
                            } else {
                                // Si driverObj no es global, intenta usar la instancia interna si la tienes
                                console.warn("Instancia driverObj no encontrada. Asegúrate de que sea accesible.");
                            }
                        }, 300); // Aumentado a 300ms para dar tiempo a posibles animaciones CSS
                    }
                },
            },

            { element: '#distancia-slider',
                popover: { title: 'Distancia al punto', description: 'Arrastrando este deslizador eliges los kilómetros.<br><br>La tabla mostrará solo los despegues que estén dentro de ese radio de distancia.' },
                onDeselected: (element) => {
                    const toggleBtn = document.getElementById('btn-div-filtro-distancia-toggle');
                    if (toggleBtn) {
                        toggleBtn.click(); // Cerramos el menú
                    }
                }
            },

            { element: '#btn-filtro-favoritos-toggle',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/icono_filtro_60.webp" width="20" height="20" style="display: block;"><span>Ver solo favoritos</span></div>', description: 'Alterna entre ver solo los despegues favoritos o ver todos los despegues.<br><br>Si tenías ya favoritos, puede servirte para verlos juntos fácilmente y desmarcar alguno o también para desmarcar todos a la vez.' } },

            { element: '#btn-desmarcar-favoritos',
                popover: { title: '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"> Desmarcar todos los favoritos', description: 'Desmarca todos los favoritos actuales.' } },

            { element: '#btn-abrir-favoritos',
                popover: { title: '📂 Importar favoritos', description: 'Abre un archivo con una lista de despegues favoritos guardados previamente.' } },

            { element: '#btn-guardar-favoritos',
                popover: { title: '💾 Exportar favoritos', description: 'Guarda un archivo con los despegues favoritos actuales.<br><br>Tras exportarlo, te ofrece compartirlo.<br><br>Los favoritos ya se van guardando automáticamente en la aplicación cuando los marcas; este botón solo sirve para hacer una copia en otro lugar.<br><br>👉🏽  Si te mueves por varias zonas diferentes de vuelo, puedes tener varios archivos de favoritos exportados e importarlos cuando te interese.' } },

            { element: '#btn-guia-edicion-favoritos',
                popover: { title: '<div style="display: flex; align-items: center; gap: 8px;"><img src="icons/icono_ayuda_60.webp" width="20" height="20" style="display: block;"><span>Guía rápida</span></div>', description: 'Muestra esta guía.' } },

            { element: '#btn-finalizar-edicion-favoritos',
                popover: { title: '🏁 Finalizar edición de favoritos', description: 'Sale a la pantalla normal de la aplicación, con tus favoritos y su pronóstico.<br><br>👉🏽 También puedes volver a esta pantalla cuando quieras ver información <img src="icons/info.svg" style="vertical-align: middle; margin: 0 4px;" width="20" height="20"> de un despegue poco habitual que no te interese tener como favorito permanente.' } }
        ],
        
        onDestroyStarted: () => {
                localStorage.setItem('METEO_GUIA_FAVORITOS_VISTA', 'true');
                driverObj.destroy();
        }
    });

    driverObj.drive();
}

// ---------------------------------------------------------------
// 🔴 GESTIÓN DE FAVORITOS
// ---------------------------------------------------------------

function activarEdicionFavoritos() {
    resetFiltroCondiciones(false); 
    resetFiltroDistancia(false);

    const btnFavsTog = document.getElementById('btn-filtro-favoritos-toggle');
    if (btnFavsTog) btnFavsTog.classList.remove('filtro-aplicado', 'activo');

	modoEdicionFavoritos = true;
    soloFavoritos = false;

    document.body.classList.add('modo-edicion-tabla');
    
    const divMenu = document.getElementById('div-menu');
    if (divMenu) divMenu.classList.add('mode-editing');
    
    const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
    if (divMenu2) divMenu2.classList.add('mode-editing');
	
	// Cierro paneles de forma segura
    const panelHorario = document.querySelector('.div-filtro-horario');
    if (panelHorario) panelHorario.style.display = 'none';
	
    const divConfig = document.getElementById("div-configuracion");
    if (divConfig) divConfig.classList.remove("activo");

    if (typeof setModoEnfoque === "function") { setModoEnfoque(false); }

	construir_tabla();
    actualizarContadorVisualFavoritos(); 

    setTimeout(() => { sugerirGuiaFavoritos(); }, 500);

    // Activar visualmente el botón de Favoritos en el menú inferior
    const navFavs = document.getElementById('nav-favs');
    if (navFavs && typeof window.activarMenuInferior === 'function') {
        window.activarMenuInferior(navFavs);
    }
}

function filtroVerSoloFavoritos() {
    
    const favoritosActuales = obtenerFavoritos();
    const btn = document.getElementById('btn-filtro-favoritos-toggle');

    // --- NUEVO: Comprobar si se va a activar el filtro pero NO hay favoritos ---
    if (!btn.classList.contains("activo") && favoritosActuales.length === 0) {
        mensajeModalAceptar('', 
            '<p>No funciona el filtro <i>Ver solo favoritos</i> porque es necesario marcar al menos un despegue favorito ♥️.</p><p>Si quieres, puedes consultar la guía rápida de esta pantalla con el botón <img src="icons/icono_ayuda_60.webp" width="20" height="20" style="vertical-align:middle;" alt="Guía"></p>'
        );
        return; // Salimos de la función sin aplicar el filtro ni recargar la tabla
    }

    // Lógica normal de alternar el botón
    btn.classList.toggle("activo"); 
    const estaHundido = btn.classList.contains("activo");
    
    if (estaHundido) {
        soloFavoritos = true; 
        btn.classList.add('filtro-aplicado');
    } else {
        soloFavoritos = false;
        btn.classList.remove('filtro-aplicado');
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
                <p style="font-size: 2em; margin: 0;"><img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"></p>
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
    if (chkMostrarRafagosidad) filasPorDespegue++;
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
    if (chkMostrarRafagosidad) filasPorDespegue++;
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

function finalizarEdicionFavoritos() {
    resetFiltroCondiciones(false); 
    resetFiltroDistancia(false);

	favoritos = obtenerFavoritos();

	if (!localStorage.getItem("METEO_FAVORITOS_LISTA") || favoritos.length === 0) { 
        mensajeModalAceptar('', 
            '<p>Es necesario marcar al menos un despegue favorito ♥️</p><p>Si quieres, puedes consultar la guía rápida de esta pantalla con el botón <img src="icons/icono_ayuda_60.webp" width="20" height="20" style="vertical-align:middle;" alt="Guía"></p>'
        );
		return false; 
	}

    document.body.classList.remove('modo-edicion-tabla');
    
    const divMenu = document.getElementById('div-menu');
    if (divMenu) divMenu.classList.remove('mode-editing');
    
    const divMenu2 = document.getElementById('div-menu2-edicion-favoritos');
    if (divMenu2) divMenu2.classList.remove('mode-editing');
    
    const btnToggleFav = document.getElementById('btn-filtro-favoritos-toggle');
    if (btnToggleFav) btnToggleFav.classList.remove('filtro-aplicado');

    const panelHorario = document.querySelector('.div-filtro-horario');
    if (panelHorario) panelHorario.style.display = ''; 
	
	localStorage.setItem("METEO_PRIMERA_VISITA_HECHA", "true");
	modoEdicionFavoritos = false; 
	limpiarBuscador();
    
    construir_tabla(); 

    setTimeout(() => { sugerirGuiaPrincipal(); }, 500);

    // Activar visualmente el botón Tabla en el menú inferior
    const navHome = document.getElementById('nav-home');
    if (navHome && typeof window.activarMenuInferior === 'function') {
        window.activarMenuInferior(navHome);
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

function alternarMostrarRafagosidad() {

    chkMostrarRafagosidad = document.getElementById("chkMostrarRafagosidad").checked;
    localStorage.setItem("METEO_CHECKBOX_MOSTRAR_RAFAGOSIDAD", chkMostrarRafagosidad);
	construir_tabla(); 
}

function alternarAplicarCalibracion() {

    chkAplicarCalibracion = document.getElementById("chkAplicarCalibracion").checked;
    localStorage.setItem("METEO_CHECKBOX_APLICAR_CALIBRACION", chkAplicarCalibracion);
	sliderHorasValues = null; 
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

// ---------------------------------------------------------------
// 🔴 SLIDERS. RANGO HORARIO. Lógica para poder hacer clic en los pips de los días semanales y seleccionar así sus rango horario completo (tiene en cuenta chk día/noche) con un toque
// ---------------------------------------------------------------

const chkDiaNoche = document.getElementById('chkDiaNoche');

// AHORA RECIBE EL ELEMENTO DEL SLIDER COMO ARGUMENTO
function clickOnPip(sliderElement) {
    // 1. Obtener el índice de inicio (el pip clicado)
    const startSliderIndex = Number(this.getAttribute('data-value'));
    
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
        
        // guardar la referencia del timestamp, para que la comparación funcione la próxima ve
        sliderHoras.dayStartTimestamp = window.horasCrudasRangoHorario.length > 0 
        ? new Date(window.horasCrudasRangoHorario[0].endsWith('Z') ? window.horasCrudasRangoHorario[0] : window.horasCrudasRangoHorario[0] + 'Z').getTime() 
        : 0;
        
        noUiSlider.create(sliderHoras, {
            start: [0, maxSteps], // Rango completo por defecto
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
        
        // Inicializar variable global
        // Inicializar variable global (Esta actúa como nuestra "Variable de control externa")
		window.sliderHorasValues = sliderHoras.noUiSlider.get().map(Number);
        
        // (Eliminamos 'valoresHorasAntes' y el evento 'start')

		// Al soltar o hacer clic, comparamos directamente contra la variable global
		sliderHoras.noUiSlider.on('change', function(values) {
			const valoresNuevos = values.map(Number);

			// Comparamos contra lo que teníamos guardado en window.sliderHorasValues
			const haCambiado = valoresNuevos.some((val, i) => val !== window.sliderHorasValues[i]);

			if (haCambiado) {
                // Actualizamos la variable global YA
				window.sliderHorasValues = valoresNuevos;
				construir_tabla(false, false);
			}
		});

        sliderHoras.noUiSlider.on('slide', function () {
            if (typeof Capacitor !== 'undefined') { Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); }
        });

        adjuntarEventoPips(sliderHoras);

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

//*********************************************************************
// 💽 BASE DE DATOS INDEXEDDB (Modo Offline sin límite de 5MB)
//*********************************************************************
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
        await new Promise(r => setTimeout(r, 50)); // Pausa técnica solo si mostramos loader
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
            localStorage.setItem("METEO_CHECKBOX_MOSTRAR_RAFAGOSIDAD", "false");
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
                        <p style="font-size: 1.2em; font-weight: bold; text-align:center;">🪂 Fly Decision. ¿Dónde ir a volar?</p>
                        <p>Pronóstico y análisis automático de meteorología para despegues de parapente + Mapa de despegues.</p>`,
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
		thDespegue.textContent = "Despegue";
		thDespegue.rowSpan = 2; // Ocupa las dos filas de la cabecera
		thDespegue.style.fontSize = "18px";
		thDespegue.classList.add("borde-grueso-izquierda", "columna-despegue", "borde-grueso-abajo", "borde-grueso-arriba");
        if (modoEdicionFavoritos) {
            thDespegue.classList.add("borde-grueso-derecha");
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
            
            "<b>2. Condiciones para mantenerse o iniciar XC (fila inferior):</b><br>" +
            "Valora la puntuación de Condiciones del despegue y el potencial térmico para vuelos de distancia (Cross Country) usando los datos del modelo ECMWF:" +
            "<ul style='margin-top: 4px; margin-bottom: 8px;'>" +
            "<li><b>Techo:</b> Premia techos altos sobre la altura media del relieve y penaliza bajos (🟩 &ge; 1500m | 🟥 &le; 800m).</li>" +
            "<li><b>CAPE:</b> Premia los días azules o de cúmulos inofensivos, y penaliza los valores extremos por riesgo de sobredesarrollo o tormenta (🟩 0-400 | 🟧 400-800 | 🟥 > 800 J/kg).</li>" +
            "<li><b>CIN:</b> Penaliza la inhibición convectiva alta (inversión) que actúa como tapón frenando la formación de térmicas (🟩 &le; 50 | 🟥 > 150 J/kg).</li>" +
            "</ul>" +
            "<i style='color: #555;'>Nota: La puntuación XC se reduce progresivamente o se anula de forma automática si las condiciones base del despegue (viento cruzado, racha excesiva o lluvia) son malas.</i><br><br>" +
            
            "⚠️ <b>Aviso:</b> Faltaría el dato esencial de la base de nube (CBH = Cloud Base Height) para saber si el despegue estará metido en nube. Es un valor del ECMWF no disponible aún en la pasarela (solicitado en marzo-2026, pendiente y sin fecha prevista). Deberás consultarlo en otros servicios.<br><br>" +
            
            "<b>Los despegues de la tabla se reordenan siempre automáticamente por la primera puntuación</b> (Condiciones del despegue), de mayor a menor.";        
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
		
		const sliderCondiciones = document.getElementById('condiciones-slider');
		let nivelFiltro = 0; 
		if (sliderCondiciones && sliderCondiciones.noUiSlider) {
			nivelFiltro = parseFloat(sliderCondiciones.noUiSlider.get());
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
            // 📍📍📍 ️LÓGICA DE FILTRADO DE CONSTRUCCIÓN DE FILAS POR DESPEGUE POR DISTANCIA
            // -----------------------------------------------------------
            // Solo filtramos si la distancia limite es menor que 9999 ("Todo")
            if (distanciaLimite < 9999) {

                let destLat = 0;
                let destLon = 0;

                try {
                    if (d.Coordenadas) { 
                        const partes = d.Coordenadas.split(',');
                        destLat = parseFloat(partes[0]);
                        destLon = parseFloat(partes[1]);
                    } else if (d.Latitud && d.Longitud) {
                        destLat = parseFloat(d.Latitud);
                        destLon = parseFloat(d.Longitud);
                    }
                } catch (e) { }

                if (destLat !== 0 && destLon !== 0) {
					const distanciaReal = obtenerDistanciaKm(centroLat, centroLon, destLat, destLon);

					// Si la distancia real es mayor que el límite seleccionado, fuera.
					if (distanciaReal > distanciaLimite) {
						return; // ⛔ Ocultar fila
					}
                }
            }

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

						if (chkAplicarCalibracion) {
							dirCorregida = dirCorregida + calibracionDireccion; 
							dirCorregida = (dirCorregida % 360 + 360) % 360;    // Normalización 0-360
						}

						// CÁLCULO PREVIO DE VELOCIDAD Y RACHA PARA COMPARARLAS. 
                        
                        // 1. Velocidad
                        let velocidad = chkAplicarCalibracion ? (velModelo * calibracionVelocidad) : velModelo;
                        velocidad = Math.round(Math.max(0, velocidad));

                        // 2. Racha
                        let rachaCorregida = chkAplicarCalibracion ? (rachaArray[i] * calibracionRacha) : rachaArray[i];
                        rachaCorregida = Math.round(Math.max(0, rachaCorregida));

                        // CORRECCIÓN DE CONSISTENCIA: Racha nunca puede ser menor que Velocidad
                        if (chkAplicarCalibracion && rachaCorregida < velocidad) {
                            rachaCorregida = velocidad; // Clamp: Igualamos racha a velocidad
                        }                        
						
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
                        // 🟢 ALGORITMO XC
                        // ---------------------------------------------------------
                        if (chkMostrarXC && hourlyEcmwf) {
                            let ptsXC_hora = 0;
                            // Si el viento base está vetado (lluvia, viento extremo), el XC es 0.
                            if (!vetoActivado) {
                                // 1. Obtener el dato crudo de la capa límite (AGL)
                                let techoRaw = (hourlyEcmwf.boundary_layer_height && hourlyEcmwf.boundary_layer_height[i] != null) ? Number(hourlyEcmwf.boundary_layer_height[i]) : 0;

                                // 2. Aplicar el ratio global de realismo para parapente (0.85)
                                let techoUtil = techoRaw * RATIO_TECHO_UTIL;

                                let cape = (hourlyEcmwf.cape && hourlyEcmwf.cape[i] != null) ? Number(hourlyEcmwf.cape[i]) : 0;
                                let cin = (hourlyEcmwf.convective_inhibition && hourlyEcmwf.convective_inhibition[i] != null) ? Math.max(0, Number(hourlyEcmwf.convective_inhibition[i])) : 0;

                                // Techo Útil (0-40 pts) - Calculado sobre el valor corregido con el ratio
                                let ptsTecho = 0;
                                if (techoUtil >= XCTechoLims.verde) ptsTecho = 40;
                                else if (techoUtil > XCTechoLims.rojo) ptsTecho = 10 + 30 * ((techoUtil - XCTechoLims.rojo) / (XCTechoLims.verde - XCTechoLims.rojo));
                                else ptsTecho = 10 * (techoUtil / XCTechoLims.rojo);

                                // CAPE (0-40 pts) - ¡Corregido para no penalizar días azules!
                                let ptsCape = 0;
                                if (cape >= XCCapeLims.idealMin && cape <= XCCapeLims.idealMax) {
                                    ptsCape = 40; // Día azul o con cúmulos inofensivos (Perfecto)
                                } else if (cape > XCCapeLims.idealMax && cape <= XCCapeLims.riesgo) {
                                    // Penaliza progresivamente por riesgo de sobredesarrollo
                                    ptsCape = 40 - 40 * ((cape - XCCapeLims.idealMax) / (XCCapeLims.riesgo - XCCapeLims.idealMax));
                                } else {
                                    ptsCape = 0; // Tormentas garantizadas
                                }

                                // CIN (0-20 pts)
                                let ptsCin = 0;
                                if (cin <= XCCinLims.verde) ptsCin = 20;
                                else if (cin < XCCinLims.rojo) ptsCin = 20 * (1 - (cin - XCCinLims.verde) / (XCCinLims.rojo - XCCinLims.verde));
                                else ptsCin = 0;

                                // Puntuación total de la hora (penalizada si el viento/racha general no es ideal)
                                ptsXC_hora = (ptsTecho + ptsCape + ptsCin) * ratioCorreccionPorDireccion * ratioCorreccionPorRacha;
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

						if (nivelFiltro > 0) {
							// El filtro actúa sobre la nota ORIGINAL para no cambiar el comportamiento esperado
							pasaFiltro = Math.round(notaFinal) >= nivelFiltro;
						}

                        // --- 🐛 INICIO DEBUG (Resumen Final) ---
                        if (MODO_DEBUG) {
                            console.log(`📊 %cRESUMEN FINAL '${d.Despegue}'`, 'font-weight: bold; color: #8b5cf6;');
                            console.log(`   - Horas válidas procesadas: ${horasValidas}`);
                            console.log(`   - Puntos Acumulados: ${puntosAcumulados.toFixed(2)} / ${maximosPuntosPosibles}`);
                            console.log(`   - NOTA FINAL: %c${notaFinal.toFixed(2)} / 10`, 'font-weight: bold; font-size: 1.1em;');
                            console.log(`   - Filtro Nivel ${nivelFiltro}: ${pasaFiltro ? '✅ PASA' : '❌ NO PASA'}`);
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
			let filaRafagosidad; 
			if (chkMostrarRafagosidad) filaRafagosidad = document.createElement("tr");
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

            const rowsGroup1 =[filaNubesTotal, filaPreci, filaProbPreci, filaBaseNube, fila180, fila120, fila80, filaVel, filaRafagosidad, filaRacha, filaDir, filaCizalladura].filter(Boolean);
            const rowsGroup2 = [filaTecho, filaCape, filaCin].filter(Boolean);

            const todasLasFilas = [...rowsGroup1, ...rowsGroup2];
            const filaPrincipal = todasLasFilas[0];
            const totalFilasRowSpan = todasLasFilas.length;

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

            // Construimos el tooltip
            const contenidoTooltip = `
                <b><span style='font-size: 18px; padding-right: 8px;'>🪂 ${d.Despegue}</b></span><br>
                Región: <b>${d.Región}</b><br>
                Provincia: <b>${d.Provincia}</b><br>
                Orientación: <b>${svgParaTooltip} <span style='vertical-align:middle;'>${d["Orientación"]}</span></b><br>

                ⛅ <a href='https://www.windy.com/${latitud}/${longitud}/wind?${latitud},${longitud},14' onclick='abrirLinkExterno(this.href); return false;'>Windy</a><br>
                
                ⛅ <a href='https://meteo-parapente.com/#/${latitud},${longitud},13' onclick='abrirLinkExterno(this.href); return false;'>Meteo-parapente</a><br>
                
                ⛅ <a href='https://www.meteoblue.com/es/tiempo/pronostico/multimodel/${latitud}N${longitud}E' onclick='abrirLinkExterno(this.href); return false;'>Meteoblue</a><br>
                
                <div style='margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; text-align: center;'>
                    
                    <a href='${URLDespegue}' onclick='abrirLinkExterno(this.href); return false;' style='display: inline-block; background-color: #007bff; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-weight: bold;'>
                        🌍 Mapa y más información
                    </a>

                </div>
            `;

			const botonMapaHTML = `
				<button class="btn-info btn-abajo-izquierda" 
					style="bottom: 2px; left: 2px;"
					data-tippy-content="${contenidoTooltip}"
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

				if (chkMostrarRafagosidad) {
					const tdIconoRafagosidad = document.createElement("td");
					// Como no tienes imagen .webp, pongo texto o puedes añadir tu propia imagen
					tdIconoRafagosidad.innerHTML = ''; 
					// 🔧 FORZADO DE ALTURA EXTREMO
					tdIconoRafagosidad.style.height = "4px";      // Altura física
					tdIconoRafagosidad.style.lineHeight = "0px";  // IMPORTANTE: Elimina altura de línea de texto
					tdIconoRafagosidad.style.fontSize = "0px";    // Elimina tamaño de fuente fantasma
					tdIconoRafagosidad.style.padding = "0px";     // Asegura sin relleno

					tdIconoRafagosidad.setAttribute("title", "Rafagosidad (Factor de Racha: Ráfaga / Velocidad)");
					tdIconoRafagosidad.classList.add("columna-meteo", "columna-simbolo-fija", "borde-grueso-izquierda");
					
					// Asegúrate de que 'filaRafagosidad' existe (es el <tr>)
					filaRafagosidad.appendChild(tdIconoRafagosidad);
				}
				
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

						// Calibración: Si está calibrado, multiplicamos por X, si no, se queda igual
                        let velocidad = chkAplicarCalibracion ? (velocidadModelo * calibracionVelocidad) : velocidadModelo;

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

                        if (chkAplicarCalibracion) {
                            td.title = `${velocidad} km/h (calibrada)\nOriginal: ${Math.round(velocidadModelo)} km/h`;
                        } else {
                            td.title = `${velocidad} km/h`;
                        }
                        filaVel.appendChild(td);
					});

					// ⚪ Rafagosidad *****************************

					if (chkMostrarRafagosidad) {
						// Reutilizamos los arrays ya definidos arriba (velocidades y rachas)
						// Nota: Iteramos sobre 'velocidades' pero usamos el índice 'i' para sacar la racha correspondiente
						velocidades.forEach((velocidadModelo, i) => {
							
							if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

							// 1. Recalcular valores locales para asegurar consistencia (Speed)
							let vel = chkAplicarCalibracion ? (velocidadModelo * calibracionVelocidad) : velocidadModelo;
							vel = Math.round(Math.max(0, vel));

							// 2. Recalcular valores locales (Gust)
							let rac = hourlyData.wind_gusts_10m[i]; // Sacamos el dato crudo del array original
							rac = chkAplicarCalibracion ? (rac * calibracionRacha) : rac;
							rac = Math.round(Math.max(0, rac));

							// CORRECCIÓN DE CONSISTENCIA EN VISUALIZACIÓN
                            if (chkAplicarCalibracion && rac < vel) {
                                rac = vel;
                            }

							const td = document.createElement("td");

                            // Marcar celdas de noche en datos (Usando la caché)
                            if (cacheEsNoche[i]) {
                                td.classList.add("celda-noche");
                            }

							if (indicesInicioDia.includes(i)) td.classList.add("borde-grueso-izquierda");

							// Cálculo de Rafagosidad
							// Evitar división por cero
							let factor = 0;
							//let textoMostrar = "-"; // Por defecto guión si vel es 0

							// Filtro para viento flojísimo (no tiene sentido poner fondo rojo en fila rafagosidad para no alertar visualmente si la racha es solo de 10 km/h)
							if (rac < 10) {
								td.classList.add("fondo-verde");
								factor = vel > 0 ? rac / vel : 1.0;
							} 
							else if (vel > 0) {
                                factor = rac / vel;
                                //textoMostrar = factor.toFixed(1);

                                if (factor < rafagosidadUmbralNaranja) {
                                    td.classList.add("fondo-verde");
                                } else if (factor < rafagosidadUmbralRojo) {
                                    td.classList.add("fondo-naranja");
                                } else {
                                    td.classList.add("fondo-rojo");
                                }
                            } 
                            // CASO 2: Velocidad 0 pero hay Racha (Térmica pura o turbulencia en calma)
                            else if (rac > 0) {
                                //textoMostrar = "∞"; 
                                td.classList.add("fondo-rojo"); // Infinitamente racheado
                            }
                            // CASO 3: Calma total (0/0)
                            else {
                                //textoMostrar = "-";
                                td.classList.add("fondo-verde"); 
                            }

                            // Texto y estilos finales
                            //td.textContent = textoMostrar;
                            //td.style.fontSize = "0.9em";
                            //td.style.color = "#333"; // Color texto un poco más oscuro para que se lea sobre fondos de color

							td.innerHTML = ""; 
							// 2. Forzamos la altura para que sea una línea delgada
							td.style.height = "4px";       // Grosor de la línea
							td.style.padding = "0";        // Sin relleno para que el color ocupe todo
							td.style.lineHeight = "0";     // Evita que el navegador intente reservar espacio para texto

							td.title = `Factor de Rafagosidad ${factor.toFixed(1)}`;
							
							filaRafagosidad.appendChild(td);
						});
					}

					// ⚪ Racha *****************************
					
					const rachas = hourlyData.wind_gusts_10m.slice(0, horas.length);
					rachas.forEach((rachaModelo, i) => {
						
						/* 🕜 Filtro del slider de rango horario */
						if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

						// 1. Calculamos la velocidad de referencia para esta hora (necesario para la corrección)
                        const velModeloRef = hourlyData.wind_speed_10m[i];
                        let velRef = chkAplicarCalibracion ? (velModeloRef * calibracionVelocidad) : velModeloRef;
                        velRef = Math.round(Math.max(0, velRef));

						// Aplicamos calibración y redondeo (igual que en velocidad)
                        let racha = chkAplicarCalibracion ? (rachaModelo * calibracionRacha) : rachaModelo;
                        racha = Math.round(Math.max(0, racha));

						// CORRECCIÓN DE CONSISTENCIA EN VISUALIZACIÓN
                        if (chkAplicarCalibracion && racha < velRef) {
                            racha = velRef; 
                        }

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

						if (chkAplicarCalibracion) {
                            td.title = `${racha} km/h Racha máxima a 10 m (calibrada)\n${Math.round(rachaModelo)} km/h Racha máxima a 10 m (original)`;
                        } else {
                            td.title = `${racha} km/h racha máxima`;
                        }

						filaRacha.appendChild(td);
					});

					// ⚪ Dirección *****************************
					
					const direcciones = hourlyData.wind_direction_10m.slice(0, horas.length);
					direcciones.forEach((dirModelo, i) => {
						
						/* 🕜 Filtro del slider de rango horario */
						if (i < indiceInicioRangoHorario || i > indiceFinRangoHorario) return;

						
                        // calibración circular (0-360º)
                        let dir = dirModelo;
                        
                        if (chkAplicarCalibracion) {
                            dir = dirModelo + calibracionDireccion;
                            dir = ((dir % 360) + 360) % 360;
                        }

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
							
						if (chkAplicarCalibracion) {
                            td.title = `${dir}º (calibrada)\n${Math.round(dirModelo)}º (original)`;
                        } else {
                            td.title = `${dir}º`;
                        }

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
                            v => (v == null || v === "") ? "" : Math.round(Number(v)), "11px",
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
                        tdCondicionesXC.title = `Nota XC: ${notaFinalXC.toFixed(1)} puntos`;
                    } else {
                        tdCondicionesXC.style.backgroundColor = "#f0f0f0";
                        tdCondicionesXC.style.color = "#888";
                        tdCondicionesXC.title = "Sin datos suficientes para puntuar XC";
                    }

                    rowsGroup2[0].appendChild(tdCondicionesXC);
                }
			}

            // 2. Guardamos el grupo en la lista para ordenar
			listaFilasParaOrdenar.push({
				nota: horasValidas > 0 ? notaFinal : -1, 
				elementos: todasLasFilas 
			});

		}); // <--- FIN DEL BUCLE despegues.forEach
		
		// Solo ordenamos por nota si NO estamos en modo edición. Si estamos en modo edición, saltamos este paso y se quedan en el orden original de inserción (orden del JSON)
		if (!modoEdicionFavoritos) {
			// 1. Ordenamos el array de mayor a menor nota
			listaFilasParaOrdenar.sort((a, b) => b.nota - a.nota);
		}
		
		// 2. Ahora que están ordenados, los metemos en la tabla uno a uno
		listaFilasParaOrdenar.forEach(item => {
			item.elementos.forEach(fila => {
				tbodyFragmento.appendChild(fila);
			});
		});
		
		tbody.appendChild(tbodyFragmento);

		filtrarDespeguesProvincias();

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

function alternarPantallaCompleta() { //obsoleta
    const doc = window.document;
    const docEl = doc.documentElement;

    // Detectar si es iOS (iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const requestMethod = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
    const exitMethod = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
    
    const isFullScreen = doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;

    if (!isFullScreen) {
        if (requestMethod && !isIOS) { 
            // Si hay método y NO es iOS, procedemos normal (Android/PC)
            requestMethod.call(docEl).catch(err => {
                console.error(`Error: ${err.message}`);
            });
        } else {
            // Si es iOS o navegador antiguo sin soporte
            if (isIOS) {
                alert("En iPhone, para ver la pantalla completa debes pulsar el botón 'Compartir' y elegir 'Añadir a pantalla de inicio'.");
            } else {
                alert("Tu navegador no soporta el modo pantalla completa.");
            }
        }
    } else {
        if (exitMethod) {
            exitMethod.call(doc);
        }
    }
}

function alternardivDistancia(event) {
    const divDistancia = document.getElementById("div-filtro-distancia");
    if (!divDistancia) return;

    const activo = divDistancia.classList.contains("activo");
    const vamosAMostrar = !activo; 

    // 1. Cerramos panel de configuración
    const panelConfig = document.getElementById("div-configuracion");
    if (panelConfig) panelConfig.classList.remove("activo");

    // Deshundo botón antiguo si existe (Seguridad)
    const btnConfigAntiguo = document.getElementById("btn-div-configuracion-toggle");
    if (btnConfigAntiguo) btnConfigAntiguo.classList.remove("activo");

    if (typeof setModoEnfoque === "function") { setModoEnfoque(false); }
    
    // 2. Mostramos/Ocultamos el panel de distancia
    divDistancia.classList.toggle("activo", vamosAMostrar);
        
    /* EL FIX PARA EL SLIDER BLOQUEADO */
    if (vamosAMostrar) {
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

	const activo = divconfiguracion.classList.contains("activo");

	divconfiguracion.classList.toggle("activo", !activo);
	
    // Deshundo/Hundo el botón antiguo si existe (Seguridad)
    const btnConfigAntiguo = document.getElementById("btn-div-configuracion-toggle");
	if (btnConfigAntiguo) btnConfigAntiguo.classList.toggle("activo", !activo);

    if (typeof setModoEnfoque === "function") { setModoEnfoque(!activo); }
}

function btnRestablecerConfiguración() {

	GestorMensajes.mostrar({
        tipo: 'modal',
        htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2em; margin: 0;">🔄</p>
                <p><b>⚠️ ATENCIÓN:</b> Esta acción eliminará la configuración y desmarcará todos los despegues favoritos.</p><p>Si quieres conservar tus favoritos, cancela este mensaje y guárdalos con 💾<i>Exportar favoritos</i>.</p>
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
// 🔴 BUSCADOR DESPEGUES / PROVINCIAS
// ---------------------------------------------------------------


function filtrarDespeguesProvincias() {

    // 1. Obtener inputs y configuración básica
    const input = document.getElementById('buscador-despegues-provincias');
    const filtro = input ? input.value.toLowerCase() : "";

    const tabla = document.getElementById('tabla');
    const tbody = tabla.tBodies[0];
    if (!tbody) return;

    const filas = tbody.rows;
    let visibles = 0;
    const favoritos = obtenerFavoritos().map(Number).filter(n => !isNaN(n)); // Seguro Numérico
    const totalFavoritos = favoritos.length;

    // Normalización
    const normalizar = (texto) => texto.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const filtroLimpio = normalizar(filtro);

    // CÁLCULO DINÁMICO DE FILAS POR BLOQUE 
    let filasPorDespegue = 5; // Base: Meteo general + Precipitación + Vel + Racha + Dir
    if (chkMostrarProbPrecipitacion) filasPorDespegue++;
    //if (chkMostrarBaseNube) filasPorDespegue++;
    if (chkMostrarVientoAlturas) filasPorDespegue += 3;
    if (chkMostrarXC) filasPorDespegue += 3;
    if (chkMostrarCizalladura) filasPorDespegue++;
    if (chkMostrarRafagosidad) filasPorDespegue++;
    //if (chkMostrarPrecipitacion) filasPorDespegue++;

    // 2. FILTRADO VISUAL
    for (let i = 0; i < filas.length; i += filasPorDespegue) {

		// La fila principal siempre es la primera del bloque (sea cual sea)
        const filaPrincipal = filas[i];      

        // Protección por si la tabla no tuviera un múltiplo exacto
        if (!filaPrincipal) continue;
		
		let txtBusqueda = "";

        if (modoEdicionFavoritos) {
            // En modo EDICIÓN, la info está separada en columnas: 1 (Región), 2 (Provincia), 3 (Despegue)
            // Concatenamos todo para buscar en cualquier campo
            const txtRegion = filaPrincipal.cells[1] ? filaPrincipal.cells[1].textContent : "";
            const txtProvincia = filaPrincipal.cells[2] ? filaPrincipal.cells[2].textContent : "";
            const txtDespegue = filaPrincipal.cells[3] ? filaPrincipal.cells[3].textContent : "";
            
            txtBusqueda = normalizar(txtRegion + " " + txtProvincia + " " + txtDespegue);
        } else {
            // En modo NORMAL, toda la info suele estar agrupada en la celda 0
            const celda = filaPrincipal.cells[0];
            txtBusqueda = celda ? normalizar(celda.textContent) : "";
        }

        let coincide = false;
        if (txtBusqueda.includes(filtroLimpio)) {
            coincide = true;
            visibles++;
        }

        const displayStyle = coincide ? '' : 'none';

        // --- APLICAR VISIBILIDAD A TODO EL BLOQUE DE FILAS ---
        // Iteramos desde i hasta i + filasPorDespegue para ocultar/mostrar todas
        for (let j = 0; j < filasPorDespegue; j++) {
            const fila = filas[i + j];
            if (fila) {
                fila.style.display = displayStyle;
            }
        }
    }
    
    if (input) {
        // Si no hay filas visibles (visibles === 0) y hay texto escrito...
        if (visibles === 0 && filtroLimpio.length > 0) {
            input.classList.add('buscador-despegues-sin-resultados'); // Texto rojo y negrita
        } else {
            input.classList.remove('buscador-despegues-sin-resultados'); // Texto normal
        }
    }

    // 3. ACTUALIZAR CONTADOR
    const divContador = document.getElementById('contador-despegues');

    const btnIncNoFavs = document.getElementById('btn-incluir-no-favs-distancia');
    // Verificamos si el botón existe y si tiene la clase 'activo'
    const incluirNoFavs = btnIncNoFavs ? btnIncNoFavs.classList.contains('activo') : false;

    if (divContador) {
        if (modoEdicionFavoritos) {

            if (soloFavoritos) {
                // CASO A: Filtro "ver solo favoritos" activo (y posiblemente otros como buscador/distancia)
                const htmlNumeroFiltrado = `
                    <span class="contador-badge-filtro" title="Filtro activo">
                        <img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro">
                        <b>${visibles}</b>
                    </span>`;
                divContador.innerHTML = `${htmlNumeroFiltrado} despegues favoritos (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">) de <b>${totalDespeguesDisponibles}</b> disponibles`;
                
            } else if (visibles < totalDespeguesDisponibles) {
                // CASO B: Otros filtros activos (distancia, buscador), pero NO "solo favoritos"
                const htmlNumeroFiltrado = `
                    <span class="contador-badge-filtro" title="Filtro activo">
                        <img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro">
                        <b>${visibles}</b>
                    </span>`;
                divContador.innerHTML = `${htmlNumeroFiltrado} de <b>${totalDespeguesDisponibles}</b> despegues disponibles`;
                
            } else {
                // CASO C: Ningún filtro activo (Se ven todos)
                divContador.innerHTML = `<b>${totalDespeguesDisponibles}</b> despegues disponibles`;
            }

        } else {
            const sliderDistElemParaTabla = document.getElementById('distancia-slider');
            let distanciaLimiteParaFavs = 9999;
            if (sliderDistElemParaTabla && sliderDistElemParaTabla.noUiSlider) {
                const idxDist = Math.round(parseFloat(sliderDistElemParaTabla.noUiSlider.get()));
                distanciaLimiteParaFavs = CORTES_DISTANCIA_GLOBAL[idxDist];
            }
            const ignorarFiltroFavoritos = (distanciaLimiteParaFavs < 9999 && incluirNoFavs);

            if (ignorarFiltroFavoritos) {
                // Modo Normal + Checkbox "Incluir no favoritos" ACTIVO
                const htmlNumeroFiltrado = `
                    <span class="contador-badge-filtro" title="Filtro activo">
                        <img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro">
                        <b>${visibles}</b>
                    </span>`;
                divContador.innerHTML = `${htmlNumeroFiltrado} de <b>${totalDespeguesDisponibles}</b> despegues disponibles (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">+<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">)`;
                
            } else if (totalFavoritos === 0) {
                // Modo Normal pero sin favoritos añadidos aún
                divContador.innerHTML = `Total de despegues disponibles: ${totalDespeguesDisponibles}`;

            } else {
                // Modo Normal mostrando favoritos (con Checkbox "Incluir no favoritos" DESACTIVADO)
                if (visibles < totalFavoritos) {
                    const htmlNumeroFiltrado = `
                        <span class="contador-badge-filtro" title="Filtro activo">
                            <img src="icons/icono_filtro_39.webp" width="13" height="13" alt="Filtro">
                            <b>${visibles}</b>
                        </span>`;
                    
                    divContador.innerHTML = `${htmlNumeroFiltrado} de <b>${totalFavoritos}</b> despegues favoritos (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">)`;
                } else {
                    // Modo Normal sin ningún filtro extra aplicado (ej: buscador o distancia vacíos)
                    divContador.innerHTML = `<b>${visibles}</b> despegues favoritos (<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">)`;
                }
            }
        }
    }

    if (modoEdicionFavoritos) {
        const thFavorito = document.getElementById('id-thFavorito'); 
        if(thFavorito) thFavorito.innerHTML = '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
    }

    // =========================================================
    // 4. SUGERENCIAS OTROS DESPEGUES SI NO SE ENCUENTRA NADA
    // =========================================================
    
	let divSugerencias = document.getElementById('sugerencias-globales');

	if (!divSugerencias) {
		divSugerencias = document.createElement('div');
		divSugerencias.id = 'sugerencias-globales'; 

		// Insertarlo después del buscador
		if (input && input.parentNode) {
			input.parentNode.insertBefore(divSugerencias, input.nextSibling);
		}
	}

    // Lógica: Si hay texto (>2 letras) Y NO estamos en modo edición (porque ahí ya se ven todos)
    if (filtroLimpio.length > 2 && !modoEdicionFavoritos && visibles === 0) {
        
        // Buscamos en la variable GLOBAL que llenamos en construir_tabla
        const coincidenciasGlobales = window.bdGlobalDespegues.filter(d => {
            // Unimos nombre y provincia para buscar
            const nombreSoloDespegue = normalizar(d.Despegue);
            
            const yaEsFavorito = favoritos.includes(Number(d.ID)); // d.ID
            
            // Queremos los que coincidan con el texto Y NO sean favoritos
            return !yaEsFavorito && nombreSoloDespegue.includes(filtroLimpio);
        });

        // Si encontramos algo que no está en la tabla
		if (coincidenciasGlobales.length > 0) {
			let html = `
				<p class="sugerencia-aviso">
					💡 No tienes favoritos con * <b>${filtroLimpio}</b> *, pero tienes disponibles en la base de datos de despegues:
				</p>
				<ul class="sugerencia-lista">`;

			coincidenciasGlobales.slice(0, 3).forEach(d => {
				// AQUÍ ES DONDE PASAMOS EL d.ID directamente en el onclick
				html += `
					<li class="sugerencia-item">
						<span class="sugerencia-texto">
							<b>${d.Despegue}</b> <br>
							<small style="color:#666;">(${d.Provincia})</small>
						</span>

						<button class="sugerencia-btn" 
								onclick="agregarDespegueDesdeBuscador(${d.ID})">
						+ Añadir favorito <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">
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
const placeholderOriginal = '🔍';
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
    
    filtrarDespeguesProvincias();
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
        // 3. Si no hubo crash, iniciamos normalmente
        construir_tabla();
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
	
    // 1. Click en el botón 'X': Limpia todo
    botonLimpiar.addEventListener('click', limpiarBuscador);
	
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

        this.placeholder = '';
        gestionarBotonLimpiar();
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

    function comprobarAvisoCambioTecho() {
        // 1. Si la versión es 3.0.0 o superior, este aviso ya es "historia" y no debe salir nunca
        const versionActual = window.WEB_VERSION || "0.0.0";
        const majorVersion = parseInt(versionActual.split('.')[0]);
        if (majorVersion >= 3) return;

        // 2. Si el usuario ya lo aceptó, no se muestra más
        if (localStorage.getItem('METEO_AVISO_TECHO_MSL_VISTO') === 'true') return;

        // 3. Si es un usuario nuevo (que aún no ha hecho la primera visita), 
        // no le mostramos este aviso técnico todavía para no saturarle, 
        // saldrá la próxima vez que entre una vez configurada su app.
        if (!localStorage.getItem("METEO_PRIMERA_VISITA_HECHA")) return;

        // 4. Mostrar el mensaje técnico
        GestorMensajes.mostrar({
            tipo: 'modal',
            htmlContenido: `
                <div style="text-align: center;">
                    <p style="font-size: 2.5em; margin: 0 0 10px 0;">ℹ️</p>
                    <p style="font-size: 1.2em; font-weight: bold;">Cambio de referencia en "Techo"</p>
                    <div style="text-align: left; font-size: 0.95em; line-height: 1.5; color: #333;">
                        <p>A partir de esta versión, el valor de <b>Techo</b> ha sido optimizado:</p>
                        <ul style="padding-left: 20px; margin-top: 10px;">
                            <li><b>Altitud MSL:</b> Ahora se muestra la altura respecto al <b>nivel del mar</b> (MSL), es decir, la altitud. Antes se mostraba la altura respecto al suelo del despegue (AGL). Esto reduce errores, al usar la altitud media de la celda del modelo y es más útil para planificar rutas XC.</li>
                            <li><b>Cálculo más realista:</b> Se ha aplicado un <b>factor de 0.85</b> (un 15% menos) al dato original del modelo para compensar la tasa de caída media del parapente, ofreciendo un techo más realista.</li>
                        </ul>
                    <p>💡Seleccionando el icono"🌦️" en la cabecera de la tabla se muestra la información de cada dato.</p>
                    </div>
                </div>
            `,
            botones: [
                {
                    texto: 'Entendido',
                    onclick: function() {
                        // Guardamos que ya lo ha visto para que no vuelva a salir
                        localStorage.setItem('METEO_AVISO_TECHO_MSL_VISTO', 'true');
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
	// 🔴 SLIDERS. CONDICIONES. Construcción
	// ---------------------------------------------------------------
    const condicionesSlider = document.getElementById('condiciones-slider');

    let ultimaCondicionConfirmada = 0; // sacada fuera para que sea accesible también al botón reset

    if (condicionesSlider) {
        noUiSlider.create(condicionesSlider, {
            start: 0, // 0 = Mostrar todo
            step: 1,  // Pasos enteros del 0 al 10
            connect: 'upper',
			tooltips: [{ // Sintaxis de array para un solo handle
                to: function (value) {
					const score = parseInt(value);
					if (score === 0) { return ""; }
                    return `${score}⭐`; 
                }
            }],			
            range: {
                'min': 0,
                'max': 10
            },
            pips: {
                mode: 'values',
                values: [0,1,2,3,4,5,6,7,8,9,10],
                density: 10,
                format: {
                    to: function(val) {
						if (val === 0) {
                            return ``;
                        }
						if (val === 10) {
                            //return `10⭐`;
                        }
						// Lo dejo por si lo necesito en futuro
						if (val === 11) {
                               return `<img src="icons/icono_parapente.png" style="width:20px;height:20px; vertical-align: middle;">`;
						}
						return ""; 
					}
                }
            }
        });

		// 🟢 1. ACCIÓN RÁPIDA (Solo visual)
		// Se ejecuta mientras arrastras. Es ultra-ligero porque NO toca la tabla.
		condicionesSlider.noUiSlider.on('slide', function(values) {

            // Si existe Capacitor (es la App), vibramos. Si es web, no hace nada.
            if (typeof Capacitor !== 'undefined') { Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); }

			const valorNuevo = parseFloat(values[0]);
			const panel = document.querySelector('#div-filtro-condiciones .div-paneles-controles-transparente');
			const btnToggle = document.getElementById('btn-div-filtro-condiciones-toggle');
			const btnReset = document.getElementById('btn-reset-filtro-condiciones');

			if (valorNuevo > 0) {
				if (btnToggle) btnToggle.classList.add('filtro-aplicado'); // Solo si existe
				if (panel) panel.classList.add('borde-rojo-externo');
				if (btnReset) btnReset.style.display = 'block';
			} else {
				if (btnToggle) btnToggle.classList.remove('filtro-aplicado');
				if (panel) panel.classList.remove('borde-rojo-externo');
				if (btnReset) btnReset.style.display = 'none';
			}
		});

		// 🔴 2. ACCIÓN PESADA (Datos)
		// Solo se ejecuta UNA VEZ cuando el usuario suelta el slider.
		condicionesSlider.noUiSlider.on('change', function(values) {
			const valorNuevo = parseFloat(values[0]);
			if (valorNuevo !== ultimaCondicionConfirmada) {
				ultimaCondicionConfirmada = valorNuevo;
				construir_tabla(false, true); // <--- Los "enormes cálculos" solo ocurren aquí
			}
		});

    }

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
                            <p style="font-size: 2.5em; margin: 0 0 10px 0;">📍</p>
							<p>Como es la primera vez, necesitas configurar una ubicación de origen.</p>
							<p>Podrás cambiarla cuando quieras con el botón <span style='background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block;'>📍</span></p>
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
				construir_tabla(false, false); 
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
                        textoFuturoMF = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En breve...⌛</span>`;
                    } else {
                        if (!proximaFechaMF) {
                            const [hora, min] = HorariosMediosActualizacion[0].split(':').map(Number);
                            proximaFechaMF = new Date(ahora);
                            proximaFechaMF.setUTCDate(proximaFechaMF.getUTCDate() + 1); 
                            proximaFechaMF.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsMF = (proximaFechaMF.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsMF <= 0) {
                            textoFuturoMF = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En breve...⌛</span>`;
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
                        textoFuturoEC = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En breve... ⌛</span>`;
                    } else {
                        if (!proximaFechaEC) {
                            const [hora, min] = HorariosMediosActualizacionEcmwf[0].split(':').map(Number);
                            proximaFechaEC = new Date(ahora);
                            proximaFechaEC.setUTCDate(proximaFechaEC.getUTCDate() + 1); 
                            proximaFechaEC.setUTCHours(hora, min, 0, 0);
                        }
                        const diffMsEC = (proximaFechaEC.getTime() - ahoraMs) + OFFSET_MS;
                        
                        if (diffMsEC <= 0) {
                            textoFuturoEC = `🔄 Próxima: <span style="color:#e39300; font-weight:bold;">En breve... ⌛</span>`;
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

            if (mfTermino || ecTermino) {
                if (typeof mensajeModalAceptarCancelar === 'function') {
                    mensajeModalAceptarCancelar('', '<p>ℹ️ Hay datos meteorológicos actualizados.</p><p>¿Recargar ahora?</p>', 'recargarPagina');
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
                            padding: { top: 60, bottom: 20, left: 10, right: 10 }, 
                            
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
                            padding: { top: 60, bottom: 20, left: 10, right: 10 }
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
	document.getElementById("chkMostrarRafagosidad").checked = chkMostrarRafagosidad;
	document.getElementById("chkAplicarCalibracion").checked = chkAplicarCalibracion;
    document.getElementById("chkMostrarCizalladura").checked = chkMostrarCizalladura;
    
    // ECMWF Checks
    //if (document.getElementById("chkMostrarPrecipitacion")) document.getElementById("chkMostrarPrecipitacion").checked = chkMostrarPrecipitacion;
    if (document.getElementById("chkMostrarProbPrecipitacion")) document.getElementById("chkMostrarProbPrecipitacion").checked = chkMostrarProbPrecipitacion;
    //if (document.getElementById("chkMostrarBaseNube")) document.getElementById("chkMostrarBaseNube").checked = chkMostrarBaseNube;
    if (document.getElementById("chkMostrarXC")) document.getElementById("chkMostrarXC").checked = chkMostrarXC;

	window.resetFiltroCondiciones = function(reconstruir = true) { //flag para que, si le hemos llamado desde activarEdicionFavoritos(), que ya tiene construir_tabla, no se llame otra vez aquí, ya que ya se hace desde esa función (bloquearía navegador)

        // A. Resetear valor del slider (asegúrate de que condicionesSlider es accesible aquí)
        if (typeof condicionesSlider !== 'undefined' && condicionesSlider.noUiSlider) {
            condicionesSlider.noUiSlider.set(0);
        }

        // B. Actualizar variable de control
        ultimaCondicionConfirmada = 0;

        // C. Limpieza Visual (Quitar clases de activo y rojo)
        const btnToggle = document.getElementById('btn-div-filtro-condiciones-toggle');
        const divPanel = document.getElementById('div-filtro-condiciones');
        const panelCondiciones = document.querySelector('#div-filtro-condiciones .div-paneles-controles-transparente');
		const btnReset = document.getElementById('btn-reset-filtro-condiciones');

        if (btnToggle) {
            btnToggle.classList.remove("activo");         // Deshundir botón
            btnToggle.classList.remove('filtro-aplicado'); // Quitar borde rojo botón
        }
        if (divPanel) divPanel.classList.remove("activo");          // Cerrar panel
        if (panelCondiciones) panelCondiciones.classList.remove('borde-rojo-externo'); // Quitar borde panel
		if (btnReset) btnReset.style.display = 'none'; // Ocultar botón de reset

        if (reconstruir) { construir_tabla(); }
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
		const btnReset = document.getElementById('btn-reset-filtro-distancia');

        const navDistance = document.getElementById('nav-distance');
        if (navDistance) navDistance.classList.remove('filtro-aplicado');

        if (divPanel) divPanel.classList.remove("activo");          // Cerrar panel
        if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo'); // Quitar borde panel
		if (btnReset) btnReset.style.display = 'none'; // Ocultar botón de reset

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
    // (En iOS no existe botón atrás físico, así que no afecta)
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

            // --- PRIORIDAD 1: Mensajes MODALES (Bloqueantes) ---
            // SOLO cerramos los modales puros (ej: Alerta de "No has seleccionado favoritos")
            // Si cerramos esto, seguimos en la pantalla de edición, que es lo correcto.
            const modalAbierto = document.querySelector('.mensaje-modal.visible');
            if (modalAbierto) {
                GestorMensajes.ocultar();
                return; 
            }

            // --- PRIORIDAD 1.5: Modal de Geolocalización (Código especial) ---
            const modalGeo = document.getElementById("modal-geo-menu");
            // Comprobamos si existe y si NO está oculto (display no es 'none')
            if (modalGeo && modalGeo.style.display !== 'none') {
                
                // Opción Recomendada: Simular clic en la "X" de cerrar.
                // Así, si tienes lógica extra al cerrar (limpiar mapas, variables, etc.), se ejecutará.
                const btnCerrar = document.getElementById("btn-cerrar-menu");
                if (btnCerrar) {
                    btnCerrar.click();
                } else {
                    // Fallback: Si no encuentra el botón, lo ocultamos a la fuerza
                    modalGeo.style.display = 'none';
                }
                return; // ¡Importante parar aquí!
            }

            // --- PRIORIDAD 2: Modo Edición Favoritos (El cambio clave) ---
            // Si estamos editando, el botón atrás actúa como el botón "Finalizar".
            // Esto cerrará automáticamente el mensaje no-modal, restaurará el horario, etc.
            if (typeof modoEdicionFavoritos !== 'undefined' && modoEdicionFavoritos === true) {
                
                // Intentamos cerrar llamando a la función y evaluando su resultado (true o false = no hay favoritos marcados)
                finalizarEdicionFavoritos();
                // Si NO se pudo cerrar (porque devolvió false, ej: lista vacía),
                // tu función 'cerrar...' ya habrá mostrado un MODAL de error.
                // La próxima vez que pulses atrás, saltará la PRIORIDAD 1 y cerrará ese error.
                return; 
            }

            // --- PRIORIDAD 3: Otros Mensajes NO-MODALES ---
            // Si hay algún otro mensaje flotante que NO sea el de favoritos (porque ya pasó el check anterior)
            const mensajeFlotante = document.querySelector('.mensaje-no-modal.visible');
            if (mensajeFlotante) {
                GestorMensajes.ocultar();
                return;
            }

            // --- PRIORIDAD 4: Paneles Laterales ---
            
            // Panel Configuración
            const panelConfig = document.getElementById("div-configuracion");
            if (panelConfig && panelConfig.classList.contains("activo")) {
                alternardivConfiguracion(); 
                return;
            }

            // Panel Filtro Distancia
            const panelDistancia = document.getElementById("div-filtro-distancia");
            if (panelDistancia && panelDistancia.classList.contains("activo")) {
                alternardivDistancia(); 
                return;
            }

            // Panel Filtro Condiciones
            const panelCondiciones = document.getElementById("div-filtro-condiciones");
            if (panelCondiciones && panelCondiciones.classList.contains("activo")) {
                // Cierre manual o con función toggle si tienes
                panelCondiciones.classList.remove("activo");
                const btnCond = document.getElementById("btn-div-filtro-condiciones-toggle");
                if (btnCond) btnCond.classList.remove("activo");
                if (typeof setModoEnfoque === "function") setModoEnfoque(false);
                return;
            }
            
            // Panel Horario (si aplica)
            const panelHorario = document.querySelector('.div-filtro-horario');
            if (panelHorario && panelHorario.style.display !== 'none' && panelHorario.classList.contains('activo')) {
                // Tu lógica si el horario se expande/contrae
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
        // 1. Extraemos StatusBar y TextZoom de los plugins
        const { StatusBar, TextZoom } = window.Capacitor.Plugins;

        // 2. Aplicamos la clase base INMEDIATAMENTE
        document.body.classList.add('modo-android-manual');

        // Función asíncrona para asegurar el orden de ejecución
        const configurarAndroid = async () => {
            try {
                // --- A. CONFIGURACIÓN DE STATUS BAR ---
                
                // Forzar modo "Edge-to-Edge" (Overlay TRUE)
                await StatusBar.setOverlaysWebView({ overlay: true });

                // Poner estilo y color transparente
                await StatusBar.setStyle({ style: 'LIGHT' });
                // await StatusBar.setBackgroundColor({ color: '#00000000' }); 

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
                console.warn('Error configurando Android (StatusBar/TextZoom):', err);
                
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
    setTimeout(comprobarAvisoCambioTecho, 1000);

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
            contenedor.classList.remove('floating-search-hidden');
            setTimeout(() => input.focus(), 100); // Abre teclado con suavidad
        } else {
            contenedor.classList.add('floating-search-hidden');
            input.blur(); // Cierra teclado
        }
    };

    // 2. Lógica de activar el botón del menú inferior
    window.activarMenuInferior = function(botonClicado) {
        const botones = document.querySelectorAll('.bottom-nav .nav-item');
        botones.forEach(btn => btn.classList.remove('active'));
        
        if (botonClicado) {
            botonClicado.classList.add('active');
        }
        
        // Esconder buscador si se pulsa cualquier otra cosa que no sea el botón Buscar
        if(botonClicado && botonClicado.id !== 'nav-search' && buscadorVisible) {
            window.toggleBuscadorFlotante();
        }
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

}); //document . addEventListener('DOMContentLoaded', function() {
