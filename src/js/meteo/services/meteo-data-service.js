(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const services = root.services = root.services || {};

    if (services.meteoDataService) {
        return;
    }

    const state = root.state || {};
    const appState = state.appState;
    const cacheStore = state.cacheStore;

    function setStateValue(key, value) {
        if (appState) {
            appState.set(key, value);
        }

        return value;
    }

    // ---------------------------------------------------------------
    // 🔴 CARGA DE DATOS CARGA DE DATOS OPTIMIZADA (MEMORIA -> RED -> LOCALSTORAGE) del meteo-datos.json a "despegues" (nombre, coordenadas, orientaciones..) y "respuestas" (la meteo de cada despegue generada por la llamada a la API y código que ejecuta el generador .php)
    // ---------------------------------------------------------------
    async function getForecastData({ forceReload = false } = {}) {
        if (forceReload) {
            setStateValue('DATOS_METEO_CACHE', null);
            setStateValue('DATOS_METEO_ECMWF_CACHE', null);
        }

        // Estas serán las variables locals que usará el resto de la función
        let data; //// Esta será la variable local que usará el resto de la función
        let dataEcmwf;
        let source = 'memory';
        let isOffline = false;

        const cacheMemoria = appState ? appState.get('DATOS_METEO_CACHE', null) : null;
        const cacheMemoriaEcmwf = appState ? appState.get('DATOS_METEO_ECMWF_CACHE', null) : null;

        // 1. ¿Lo tenemos ya en RAM? (Velocidad instantánea)
        if (cacheMemoria && cacheMemoriaEcmwf) {
            data = cacheMemoria;
            dataEcmwf = cacheMemoriaEcmwf;
        }
        else {
            // 2. Si no está en RAM, intentamos buscarlo fuera
            try {
                // Intentamos descargar (Petición de red real)
                const [res1, res2] = await Promise.all([
                    fetch(`https://flydecision.com/meteo-datos.json?t=${Date.now()}`, { cache: 'no-store' }),
                    fetch(`https://flydecision.com/meteo-datos-ecmwf.json?t=${Date.now()}`, { cache: 'no-store' })
                ]);

                if (!res1.ok || !res2.ok) {
                    throw new Error('⚠️ Error al cargar archivos JSON');
                }

                // Si llegamos aquí, hay internet. Parseamos y guardamos en RAM.
                data = await res1.json();
                dataEcmwf = await res2.json();

                setStateValue('DATOS_METEO_CACHE', data);
                setStateValue('DATOS_METEO_ECMWF_CACHE', dataEcmwf);
                setStateValue('esModoOffline', false);

                // Guardamos en la Base de Datos del navegador (Sin límite de espacio de 5MB y sin bloquear la pantalla)
                await cacheStore.guardarEnCacheIDB('METEO_DATOS_JSON_CACHE', data);
                await cacheStore.guardarEnCacheIDB('METEO_DATOS_ECMWF_JSON_CACHE', dataEcmwf);
                source = 'network';

            } catch (error) {
                // 3. PLAN DE EMERGENCIA: Falló la red, miramos en IndexedDB
                console.warn('⚠️ Fallo de conexión. Buscando en BD offline (IndexedDB)...');

                const cachedData = await cacheStore.leerDeCacheIDB('METEO_DATOS_JSON_CACHE');
                const cachedDataEcmwf = await cacheStore.leerDeCacheIDB('METEO_DATOS_ECMWF_JSON_CACHE');

                if (cachedData && cachedDataEcmwf) {
                    data = cachedData; // En IndexedDB ya viene como objeto JS limpio, no hace falta JSON.parse
                    dataEcmwf = cachedDataEcmwf;
                    setStateValue('DATOS_METEO_CACHE', data);
                    setStateValue('DATOS_METEO_ECMWF_CACHE', dataEcmwf);
                    setStateValue('esModoOffline', true);
                    source = 'indexeddb';
                    isOffline = true;
                } else {
                    throw error;
                }
            }
        }

        return {
            data,
            dataEcmwf,
            isOffline,
            source,
        };
    }

    services.meteoDataService = {
        getForecastData,
    };
})(window);