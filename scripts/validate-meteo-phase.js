#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const phase = process.argv[2] || 'phase0';

const phaseScripts = {
    phase0: [
        'meteo.js',
    ],
    phase1: [
        'js/meteo/utils/constants.js',
        'js/meteo/compat/public-api.js',
        'js/meteo/state/preferences-store.js',
        'js/meteo/state/favorites-store.js',
        'js/meteo/state/app-state.js',
        'js/meteo/domain/distance.js',
        'js/meteo/domain/orientation.js',
        'js/meteo/ui/messages/message-manager.js',
        'js/meteo/ui/messages/dialog-helpers.js',
        'js/meteo/ui/table/table-layout.js',
        'meteo.js',
    ],
    phase2: [
        'js/meteo/utils/constants.js',
        'js/meteo/compat/public-api.js',
        'js/meteo/state/preferences-store.js',
        'js/meteo/state/favorites-store.js',
        'js/meteo/state/app-state.js',
        'js/meteo/state/cache-store.js',
        'js/meteo/services/meteo-data-service.js',
        'js/meteo/domain/distance.js',
        'js/meteo/domain/orientation.js',
        'js/meteo/ui/messages/message-manager.js',
        'js/meteo/ui/messages/dialog-helpers.js',
        'js/meteo/ui/table/table-layout.js',
        'meteo.js',
    ],
    phase25: [
        'js/meteo/utils/constants.js',
        'js/meteo/compat/public-api.js',
        'js/meteo/state/preferences-store.js',
        'js/meteo/state/favorites-store.js',
        'js/meteo/state/app-state.js',
        'js/meteo/state/cache-store.js',
        'js/meteo/services/meteo-data-service.js',
        'js/meteo/domain/distance.js',
        'js/meteo/domain/orientation.js',
        'js/meteo/ui/messages/message-manager.js',
        'js/meteo/ui/messages/dialog-helpers.js',
        'js/meteo/ui/table/table-layout.js',
        'meteo.js',
    ],
    phase3: [
        'js/meteo/utils/constants.js',
        'js/meteo/compat/public-api.js',
        'js/meteo/state/preferences-store.js',
        'js/meteo/state/favorites-store.js',
        'js/meteo/state/app-state.js',
        'js/meteo/state/cache-store.js',
        'js/meteo/services/meteo-data-service.js',
        'js/meteo/domain/distance.js',
        'js/meteo/domain/orientation.js',
        'js/meteo/domain/time-range.js',
        'js/meteo/domain/scoring.js',
        'js/meteo/ui/messages/message-manager.js',
        'js/meteo/ui/messages/dialog-helpers.js',
        'js/meteo/ui/table/table-layout.js',
        'meteo.js',
    ],
    phase4: [
        'js/meteo/utils/constants.js',
        'js/meteo/compat/public-api.js',
        'js/meteo/state/preferences-store.js',
        'js/meteo/state/favorites-store.js',
        'js/meteo/state/app-state.js',
        'js/meteo/state/cache-store.js',
        'js/meteo/services/meteo-data-service.js',
        'js/meteo/services/geolocation-service.js',
        'js/meteo/services/map-service.js',
        'js/meteo/domain/distance.js',
        'js/meteo/domain/orientation.js',
        'js/meteo/domain/time-range.js',
        'js/meteo/domain/scoring.js',
        'js/meteo/features/favorites/favorites-controller.js',
        'js/meteo/features/distance-filter/distance-filter-controller.js',
        'js/meteo/ui/messages/message-manager.js',
        'js/meteo/ui/messages/dialog-helpers.js',
        'js/meteo/ui/table/table-layout.js',
        'meteo.js',
    ],
    phase5: [
        'js/meteo/utils/constants.js',
        'js/meteo/compat/public-api.js',
        'js/meteo/state/preferences-store.js',
        'js/meteo/state/favorites-store.js',
        'js/meteo/state/app-state.js',
        'js/meteo/state/cache-store.js',
        'js/meteo/services/meteo-data-service.js',
        'js/meteo/services/geolocation-service.js',
        'js/meteo/services/map-service.js',
        'js/meteo/domain/distance.js',
        'js/meteo/domain/orientation.js',
        'js/meteo/domain/time-range.js',
        'js/meteo/domain/scoring.js',
        'js/meteo/features/favorites/favorites-controller.js',
        'js/meteo/features/distance-filter/distance-filter-controller.js',
        'js/meteo/features/app-navigation/runtime-controller.js',
        'js/meteo/features/app-navigation/back-button-controller.js',
        'js/meteo/ui/messages/message-manager.js',
        'js/meteo/ui/messages/dialog-helpers.js',
        'js/meteo/ui/table/table-layout.js',
        'meteo.js',
    ],
};

const requiredRuntimeFunctions = [
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
    'calcularIndicesPreferencia',
];

const requiredBootstrapExports = [
    {
        name: 'abrirLinkExterno',
        pattern: /window\.abrirLinkExterno\s*=\s*abrirLinkExterno/,
    },
    {
        name: 'resetFiltroCondiciones',
        pattern: /window\.resetFiltroCondiciones\s*=\s*function/,
    },
    {
        name: 'resetFiltroDistancia',
        pattern: /window\.resetFiltroDistancia\s*=\s*function/,
    },
];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createStorage(initial = {}) {
    const store = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));

    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        key(index) {
            return Array.from(store.keys())[index] || null;
        },
        removeItem(key) {
            store.delete(key);
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
    };
}

function createClassList() {
    const values = new Set();

    return {
        add(...tokens) {
            tokens.forEach((token) => values.add(token));
        },
        contains(token) {
            return values.has(token);
        },
        remove(...tokens) {
            tokens.forEach((token) => values.delete(token));
        },
        toggle(token, force) {
            if (force === true) {
                values.add(token);
                return true;
            }

            if (force === false) {
                values.delete(token);
                return false;
            }

            if (values.has(token)) {
                values.delete(token);
                return false;
            }

            values.add(token);
            return true;
        },
    };
}

function createStyle() {
    const values = Object.create(null);

    return {
        getPropertyValue(name) {
            return values[name] || '';
        },
        removeProperty(name) {
            delete values[name];
        },
        setProperty(name, value) {
            values[name] = String(value);
        },
    };
}

function createElement(id = '') {
    const element = {
        id,
        children: [],
        dataset: {},
        style: createStyle(),
        classList: createClassList(),
        tBodies: [{ rows: [] }],
        rows: [],
        cells: [],
        options: [],
        value: '',
        checked: false,
        disabled: false,
        innerHTML: '',
        textContent: '',
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        onclick: null,
        addEventListener() {},
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        blur() {},
        click() {
            if (typeof this.onclick === 'function') {
                this.onclick();
            }
        },
        closest() {
            return null;
        },
        contains() {
            return false;
        },
        focus() {},
        getAttribute(name) {
            return this[name] || null;
        },
        insertAdjacentHTML() {},
        querySelector() {
            return createElement();
        },
        querySelectorAll() {
            return [];
        },
        remove() {},
        removeAttribute(name) {
            delete this[name];
        },
        removeChild(child) {
            this.children = this.children.filter((candidate) => candidate !== child);
        },
        removeEventListener() {},
        setAttribute(name, value) {
            this[name] = String(value);
        },
    };

    return element;
}

function createLeafletStub() {
    return {
        addTo() {
            return this;
        },
        bindPopup() {
            return this;
        },
        closePopup() {
            return this;
        },
        fitBounds() {
            return this;
        },
        invalidateSize() {
            return this;
        },
        off() {
            return this;
        },
        on() {
            return this;
        },
        openPopup() {
            return this;
        },
        remove() {
            return this;
        },
        setLatLng() {
            return this;
        },
        setView() {
            return this;
        },
    };
}

function createIndexedDbStub() {
    return {
        open() {
            const request = {
                onerror: null,
                onsuccess: null,
                onupgradeneeded: null,
                result: {
                    createObjectStore() {
                        return {};
                    },
                    transaction() {
                        return {
                            objectStore() {
                                return {
                                    get() {
                                        const getRequest = { onerror: null, onsuccess: null, result: null };
                                        setTimeout(() => {
                                            if (typeof getRequest.onsuccess === 'function') {
                                                getRequest.onsuccess({ target: getRequest });
                                            }
                                        }, 0);
                                        return getRequest;
                                    },
                                    put() {
                                        const putRequest = { onerror: null, onsuccess: null };
                                        setTimeout(() => {
                                            if (typeof putRequest.onsuccess === 'function') {
                                                putRequest.onsuccess({ target: putRequest });
                                            }
                                        }, 0);
                                        return putRequest;
                                    },
                                };
                            },
                        };
                    },
                },
            };

            setTimeout(() => {
                if (typeof request.onupgradeneeded === 'function') {
                    request.onupgradeneeded({ target: request });
                }
                if (typeof request.onsuccess === 'function') {
                    request.onsuccess({ target: request });
                }
            }, 0);

            return request;
        },
    };
}

function createContext() {
    const elementCache = new Map();
    const localStorage = createStorage();
    const sessionStorage = createStorage();
    const document = {
        body: createElement('body'),
        documentElement: createElement('documentElement'),
        addEventListener() {},
        createElement(tagName) {
            return createElement(tagName);
        },
        getElementById(id) {
            if (!elementCache.has(id)) {
                elementCache.set(id, createElement(id));
            }
            return elementCache.get(id);
        },
        getElementsByClassName() {
            return [];
        },
        getElementsByTagName() {
            return [];
        },
        querySelector(selector) {
            return this.getElementById(`query:${selector}`);
        },
        querySelectorAll() {
            return [];
        },
        removeEventListener() {},
    };

    document.body.appendChild = function appendChild(child) {
        this.children.push(child);
        return child;
    };

    const windowObject = {
        Blob,
        URL: {
            createObjectURL() {
                return 'blob:flydecision-test';
            },
            revokeObjectURL() {},
        },
        alert() {},
        atob,
        btoa,
        clearInterval,
        clearTimeout,
        console,
        document,
        driver: {
            js: {
                driver() {
                    return {
                        destroy() {},
                        drive() {},
                    };
                },
            },
        },
        fetch: async () => ({ json: async () => ({}), ok: true }),
        FileReader: class FakeFileReader {
            constructor() {
                this.onerror = null;
                this.onload = null;
                this.result = '';
            }

            readAsText(file) {
                this.result = typeof file === 'string' ? file : (file && file.content) || '';
                if (typeof this.onload === 'function') {
                    this.onload({ target: this });
                }
            }
        },
        history: {
            pushState() {},
            replaceState() {},
        },
        indexedDB: createIndexedDbStub(),
        innerHeight: 800,
        innerWidth: 1280,
        L: {
            divIcon() {
                return {};
            },
            icon() {
                return {};
            },
            latLng() {
                return {};
            },
            map() {
                return createLeafletStub();
            },
            marker() {
                return createLeafletStub();
            },
            popup() {
                return createLeafletStub();
            },
            tileLayer() {
                return createLeafletStub();
            },
        },
        localStorage,
        location: {
            hash: '',
            href: 'http://localhost/index.html',
            pathname: '/index.html',
            reload() {},
            search: '',
        },
        matchMedia() {
            return {
                addEventListener() {},
                matches: false,
                removeEventListener() {},
            };
        },
        navigator: {
            clipboard: {
                writeText: async () => {},
            },
            geolocation: {
                getCurrentPosition() {},
            },
            onLine: true,
            userAgent: 'node.js',
        },
        noUiSlider: {
            create(element) {
                element.noUiSlider = {
                    destroy() {},
                    get() {
                        return [0, 0];
                    },
                    off() {},
                    on() {},
                    set() {},
                    updateOptions() {},
                };
                return element.noUiSlider;
            },
        },
        open() {},
        performance: {
            now: () => Date.now(),
        },
        requestAnimationFrame(callback) {
            return setTimeout(callback, 0);
        },
        cancelAnimationFrame(id) {
            clearTimeout(id);
        },
        screen: {
            height: 800,
            width: 1280,
        },
        scrollTo() {},
        sessionStorage,
        setInterval,
        setTimeout,
    };

    windowObject.Capacitor = {
        getPlatform() {
            return 'web';
        },
        isNativePlatform() {
            return false;
        },
        Plugins: {
            App: {
                addListener() {},
                exitApp() {},
            },
            Browser: {
                open: async () => {},
            },
            Dialog: {
                alert: async () => {},
                confirm: async () => ({ value: true }),
            },
            Filesystem: {
                writeFile: async () => {},
            },
            Geolocation: {
                getCurrentPosition: async () => ({ coords: { latitude: 0, longitude: 0 } }),
            },
            Network: {
                addListener() {},
                getStatus: async () => ({ connected: true }),
            },
            Share: {
                share: async () => {},
            },
            StatusBar: {
                setBackgroundColor: async () => {},
                setOverlaysWebView: async () => {},
                setStyle: async () => {},
            },
            TextZoom: {
                set: async () => {},
            },
        },
    };

    windowObject.addEventListener = function addEventListener() {};
    windowObject.removeEventListener = function removeEventListener() {};
    windowObject.window = windowObject;
    windowObject.self = windowObject;
    windowObject.globalThis = windowObject;
    document.defaultView = windowObject;

    return vm.createContext(windowObject);
}

function runScripts(context, scripts) {
    scripts.forEach((relativePath) => {
        const absolutePath = path.join(srcRoot, relativePath);
        const code = fs.readFileSync(absolutePath, 'utf8');
        vm.runInContext(code, context, { filename: relativePath });
    });
}

function getGlobalValue(context, name) {
    if (typeof context[name] !== 'undefined') {
        return context[name];
    }

    if (context.window && typeof context.window[name] !== 'undefined') {
        return context.window[name];
    }

    try {
        return vm.runInContext(`typeof ${name} !== 'undefined' ? ${name} : undefined`, context);
    } catch (error) {
        return undefined;
    }

    return undefined;
}

function validateBaseline(context, meteoSource) {
    requiredRuntimeFunctions.forEach((name) => {
        assert(typeof getGlobalValue(context, name) === 'function', `No existe la función pública ${name}`);
    });

    requiredBootstrapExports.forEach(({ name, pattern }) => {
        assert(pattern.test(meteoSource), `No existe el contrato de bootstrap para ${name}`);
    });

    assert(typeof getGlobalValue(context, 'GestorMensajes') === 'object', 'GestorMensajes no está disponible');
    assert(typeof getGlobalValue(context, 'createOrientationSVG') === 'function', 'createOrientationSVG no está disponible');
    assert(typeof getGlobalValue(context, 'obtenerDistanciaKm') === 'function', 'obtenerDistanciaKm no está disponible');
    assert(context.localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO') === '10', 'No se aplicó el default de hora inicio');
    assert(context.localStorage.getItem('METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN') === '20', 'No se aplicó el default de hora fin');
}

function validatePhase1Modules(context) {
    const root = context.window.FlyDecisionMeteo;

    assert(root && root.compat, 'No existe el namespace FlyDecisionMeteo.compat');
    assert(typeof root.compat.publishPublicApi === 'function', 'publishPublicApi no está disponible');
    assert(root.state && root.state.preferencesStore, 'No existe preferencesStore');
    assert(root.state && root.state.favoritesStore, 'No existe favoritesStore');
    assert(root.state && root.state.appState, 'No existe appState');
    assert(root.domain && root.domain.distance, 'No existe distance module');
    assert(root.domain && root.domain.orientation, 'No existe orientation module');
    assert(root.ui && root.ui.messages && root.ui.messages.manager, 'No existe message manager');
    assert(root.ui && root.ui.tableLayout, 'No existe table layout helper');

    assert(root.domain.distance.obtenerDistanciaKm(40, -3, 40, -3) === 0, 'Haversine no conserva distancia cero');

    const svg = root.domain.orientation.createOrientationSVG('N, S');
    assert(typeof svg === 'string' && svg.includes('<svg'), 'createOrientationSVG no devuelve SVG');

    const rowsBase = root.ui.tableLayout.getRowsPerLaunch({
        chkMostrarCizalladura: false,
        chkMostrarProbPrecipitacion: false,
        chkMostrarRafagosidad: false,
        chkMostrarVientoAlturas: false,
        chkMostrarXC: false,
    });
    assert(rowsBase === 5, 'El layout base no devuelve 5 filas');

    const rowsExpanded = root.ui.tableLayout.getRowsPerLaunch({
        chkMostrarCizalladura: true,
        chkMostrarProbPrecipitacion: true,
        chkMostrarRafagosidad: true,
        chkMostrarVientoAlturas: true,
        chkMostrarXC: true,
    });
    assert(rowsExpanded === 14, 'El layout expandido no devuelve 14 filas');

    root.state.preferencesStore.setBoolean('TEST_BOOL', true);
    assert(root.state.preferencesStore.getBoolean('TEST_BOOL', false) === true, 'preferencesStore no conserva booleanos');

    root.state.favoritesStore.setFavorites([1, '2', 'x', 2]);
    const favorites = root.state.favoritesStore.getFavorites();
    assert(Array.isArray(favorites) && favorites.length === 3, 'favoritesStore no normaliza favoritos');
}

function validatePhase2Modules(context) {
    const root = context.window.FlyDecisionMeteo;

    assert(root.state && root.state.cacheStore, 'No existe cacheStore');
    assert(typeof root.state.cacheStore.initDB === 'function', 'cacheStore.initDB no está disponible');
    assert(typeof root.state.cacheStore.guardarEnCacheIDB === 'function', 'cacheStore.guardarEnCacheIDB no está disponible');
    assert(typeof root.state.cacheStore.leerDeCacheIDB === 'function', 'cacheStore.leerDeCacheIDB no está disponible');
    assert(root.services && root.services.meteoDataService, 'No existe meteoDataService');
    assert(typeof root.services.meteoDataService.getForecastData === 'function', 'getForecastData no está disponible');
    assert(typeof getGlobalValue(context, 'cargarDatosMeteoConstruccion') === 'function', 'No existe cargarDatosMeteoConstruccion');
    assert(typeof getGlobalValue(context, 'prepararDatosFavoritosConstruccion') === 'function', 'No existe prepararDatosFavoritosConstruccion');
    assert(typeof getGlobalValue(context, 'resolverRangoHorarioConstruccion') === 'function', 'No existe resolverRangoHorarioConstruccion');
}

function validatePhase3Modules(context) {
    const root = context.window.FlyDecisionMeteo;

    assert(root.domain && root.domain.timeRange, 'No existe timeRange');
    assert(typeof root.domain.timeRange.toUtcDate === 'function', 'timeRange.toUtcDate no está disponible');
    assert(typeof root.domain.timeRange.calculatePreferredRange === 'function', 'timeRange.calculatePreferredRange no está disponible');
    assert(typeof root.domain.timeRange.buildHourCache === 'function', 'timeRange.buildHourCache no está disponible');

    assert(root.domain && root.domain.scoring, 'No existe scoring');
    assert(typeof root.domain.scoring.calculateMinimumOrientationAngle === 'function', 'scoring.calculateMinimumOrientationAngle no está disponible');
    assert(typeof root.domain.scoring.calculateDespegueScoreHora === 'function', 'scoring.calculateDespegueScoreHora no está disponible');
    assert(typeof root.domain.scoring.calculateXCScoreHora === 'function', 'scoring.calculateXCScoreHora no está disponible');
    assert(typeof root.domain.scoring.calculateFinalScores === 'function', 'scoring.calculateFinalScores no está disponible');

    const rango = root.domain.timeRange.calculatePreferredRange({
        indices: [0, 1, 2, 3],
        horas: [
            '2026-03-28T08:00:00',
            '2026-03-28T10:00:00',
            '2026-03-28T12:00:00',
            '2026-03-29T09:00:00',
        ],
        diaObjetivo: 28,
        prefInicio: 9,
        prefFin: 11,
        usarDiaCompleto: false,
        soloHorasDeLuz: false,
    });
    assert(Array.isArray(rango) && rango[0] === 0 && rango[1] === 1, 'timeRange.calculatePreferredRange no devuelve el rango esperado');

    const scoring = root.domain.scoring.calculateDespegueScoreHora({
        minimoAngulo: 5,
        velocidad: 18,
        rachaCorregida: 20,
        precipitacion: 0,
        rachaMax: 25,
        velocidadMin: 0,
        velocidadMax: 20,
    });
    assert(scoring.ptsHora > 0, 'scoring.calculateDespegueScoreHora no devuelve una puntuación válida');
}

function validatePhase4Modules(context) {
    const root = context.window.FlyDecisionMeteo;

    assert(root.services && root.services.geolocationService, 'No existe geolocationService');
    assert(typeof root.services.geolocationService.getCurrentPosition === 'function', 'geolocationService.getCurrentPosition no está disponible');
    assert(root.services && root.services.mapService, 'No existe mapService');
    assert(typeof root.services.mapService.ensureMap === 'function', 'mapService.ensureMap no está disponible');
    assert(typeof root.services.mapService.putMarker === 'function', 'mapService.putMarker no está disponible');

    assert(root.features && root.features.favorites && root.features.favorites.controller, 'No existe favorites.controller');
    assert(typeof root.features.favorites.controller.init === 'function', 'favorites.controller.init no está disponible');
    assert(typeof root.features.favorites.controller.activateEditMode === 'function', 'favorites.controller.activateEditMode no está disponible');
    assert(typeof root.features.favorites.controller.toggleFavorite === 'function', 'favorites.controller.toggleFavorite no está disponible');

    assert(root.features && root.features.distanceFilter && root.features.distanceFilter.controller, 'No existe distanceFilter.controller');
    assert(typeof root.features.distanceFilter.controller.init === 'function', 'distanceFilter.controller.init no está disponible');
    assert(typeof root.features.distanceFilter.controller.togglePanel === 'function', 'distanceFilter.controller.togglePanel no está disponible');
    assert(typeof root.features.distanceFilter.controller.resetFilter === 'function', 'distanceFilter.controller.resetFilter no está disponible');
}

function validatePhase5Modules(context, meteoSource) {
    const root = context.window.FlyDecisionMeteo;

    assert(root.features && root.features.appNavigation, 'No existe features.appNavigation');
    assert(root.features.appNavigation.runtimeController, 'No existe runtimeController');
    assert(typeof root.features.appNavigation.runtimeController.init === 'function', 'runtimeController.init no está disponible');
    assert(typeof root.features.appNavigation.runtimeController.start === 'function', 'runtimeController.start no está disponible');
    assert(typeof root.features.appNavigation.runtimeController.syncOfflineBootstrapTimestamps === 'function', 'runtimeController.syncOfflineBootstrapTimestamps no está disponible');
    assert(typeof root.features.appNavigation.runtimeController.runUpdateCycle === 'function', 'runtimeController.runUpdateCycle no está disponible');

    assert(root.features.appNavigation.backButtonController, 'No existe backButtonController');
    assert(typeof root.features.appNavigation.backButtonController.init === 'function', 'backButtonController.init no está disponible');
    assert(typeof root.features.appNavigation.backButtonController.register === 'function', 'backButtonController.register no está disponible');
    assert(typeof root.features.appNavigation.backButtonController.confirmExit === 'function', 'backButtonController.confirmExit no está disponible');

    assert(/function gestionarCambioConexion\s*\(estadoDetectado\)\s*{\s*return runtimeController\.manageConnectionChange\(estadoDetectado\);\s*}/.test(meteoSource), 'No existe el puente gestionarCambioConexion');
    assert(/function refrescoPanelInfoActualizaciones\s*\(\)\s*{\s*return runtimeController\.refreshUpdatePanel\(\);\s*}/.test(meteoSource), 'No existe el puente refrescoPanelInfoActualizaciones');
    assert(/async function cicloActualizacion\s*\(\)\s*{\s*return runtimeController\.runUpdateCycle\(\);\s*}/.test(meteoSource), 'No existe el puente cicloActualizacion');
    assert(/async function iniciarMonitorRedNativo\s*\(\)\s*{\s*return runtimeController\.startNativeNetworkMonitor\(\);\s*}/.test(meteoSource), 'No existe el puente iniciarMonitorRedNativo');
    assert(/function confirmarSalidaApp\s*\(\)\s*{\s*return backButtonController\.confirmExit\(\);\s*}/.test(meteoSource), 'No existe el puente confirmarSalidaApp');
    assert(/function iniciarDetectorResume\s*\(\)\s*{\s*return runtimeController\.startResumeDetector\(\);\s*}/.test(meteoSource), 'No existe el puente iniciarDetectorResume');
}

function main() {
    const scripts = phaseScripts[phase];
    assert(Array.isArray(scripts), `Fase desconocida: ${phase}`);

    const context = createContext();
    const meteoSource = fs.readFileSync(path.join(srcRoot, 'meteo.js'), 'utf8');
    runScripts(context, scripts);
    validateBaseline(context, meteoSource);

    if (phase === 'phase1' || phase === 'phase2' || phase === 'phase25' || phase === 'phase3' || phase === 'phase4' || phase === 'phase5') {
        validatePhase1Modules(context);
    }

    if (phase === 'phase2' || phase === 'phase25' || phase === 'phase3' || phase === 'phase4' || phase === 'phase5') {
        validatePhase2Modules(context);
    }

    if (phase === 'phase3' || phase === 'phase4' || phase === 'phase5') {
        validatePhase3Modules(context);
    }

    if (phase === 'phase4' || phase === 'phase5') {
        validatePhase4Modules(context);
    }

    if (phase === 'phase5') {
        validatePhase5Modules(context, meteoSource);
    }

    console.log(`VALIDATION_OK ${phase}`);
}

main();