(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const features = root.features = root.features || {};
    const appNavigation = features.appNavigation = features.appNavigation || {};

    if (appNavigation.runtimeController) {
        return;
    }

    const TIEMPO_CONFIRMACION_OFFLINE = 5000;
    const TIEMPO_CONFIRMACION_ONLINE = 1000;

    let deps = null;
    let runtimeStarted = false;
    let resumeDetectorStarted = false;
    let nativeNetworkMonitorStarted = false;

    let timerCiclo = null;
    let timerOffline = null;
    let timerOnline = null;
    let intervaloActualizacion = 60000;

    let avisoOfflineActivo = false;
    let statusActualizacionEnCurso = false;
    let hayErrorData = false;

    let currentStatusText = 'Cargando...';
    let currentStatusTextEcmwf = 'Cargando...';
    let lastDataGenerationTimestamp = 0;
    let lastDataGenerationTimestampEcmwf = 0;
    let jsonModelInitTimestamp = 0;
    let jsonModelInitTimestampEcmwf = 0;

    function assertDeps() {
        if (!deps) {
            throw new Error('runtime-controller no inicializado');
        }
    }

    function init(nextDeps) {
        deps = nextDeps;
        return api;
    }

    function syncOfflineBootstrapTimestamps(data) {
        if (!data) {
            return;
        }

        if (data.timestamp) {
            lastDataGenerationTimestamp = new Date(data.timestamp).getTime();
        }

        if (data.model_run_ref_time) {
            jsonModelInitTimestamp = new Date(data.model_run_ref_time).getTime();
        }
    }

    function manageConnectionChange(estadoDetectado) {
        assertDeps();

        if (estadoDetectado === 'offline') {
            if (timerOnline) {
                clearTimeout(timerOnline);
                timerOnline = null;
            }

            if (!avisoOfflineActivo && !timerOffline) {
                console.log(new Date().toLocaleString(), '⏳ Detectada desconexión. Esperando ' + (TIEMPO_CONFIRMACION_OFFLINE / 1000) + 's...');
                timerOffline = setTimeout(function() {
                    console.log('❌ TIEMPO AGOTADO: Activando Modo Offline.');
                    avisoOfflineActivo = true;
                    runUpdateCycle();
                    timerOffline = null;
                }, TIEMPO_CONFIRMACION_OFFLINE);
            }

            return;
        }

        if (timerOffline) {
            clearTimeout(timerOffline);
            timerOffline = null;
        }

        if ((avisoOfflineActivo || deps.getOfflineMode()) && !timerOnline) {
            console.log(new Date().toLocaleString(), '📶 Red detectada. Esperando ' + (TIEMPO_CONFIRMACION_ONLINE / 1000) + 's de estabilidad...');
            timerOnline = setTimeout(function() {
                if (navigator.onLine === false) {
                    return;
                }

                console.log(new Date().toLocaleString(), 'Conexión estable. Recargando datos...');
                avisoOfflineActivo = false;
                deps.setOfflineMode(false);
                runUpdateCycle();
                deps.buildTable(true);
                timerOnline = null;
            }, TIEMPO_CONFIRMACION_ONLINE);
        }
    }

    function formatStatusText(textoOriginal) {
        const patronISO = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})/;
        const match = textoOriginal.match(patronISO);

        if (match) {
            try {
                const fechaObj = new Date(match[0]);
                const horaLocal = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return textoOriginal.replace(match[0], horaLocal);
            } catch (error) {
                return textoOriginal;
            }
        }

        return textoOriginal;
    }

    function refreshUpdatePanel() {
        assertDeps();

        const ahora = new Date();
        const ahoraMs = ahora.getTime();
        const mostrarErrorOffline = deps.getOfflineMode() || avisoOfflineActivo;

        const proximaActualizacionContenedor = document.getElementById('proxima-actualizacion-contenedor');
        if (proximaActualizacionContenedor) {
            proximaActualizacionContenedor.style.display = 'none';
        }

        const dataGenElement = document.getElementById('data_generation_time');
        if (dataGenElement) {
            const forecastCache = deps.getForecastCache();
            if ((!lastDataGenerationTimestamp || lastDataGenerationTimestamp === 0) && forecastCache && forecastCache.timestamp) {
                lastDataGenerationTimestamp = new Date(forecastCache.timestamp).getTime();
            }

            if (mostrarErrorOffline) {
                const timeAgoGen = (lastDataGenerationTimestamp > 0 && typeof deps.formatTimeAgo === 'function')
                    ? deps.formatTimeAgo(lastDataGenerationTimestamp, ahoraMs)
                    : 'tiempo desconocido';

                dataGenElement.innerHTML = '<span style="color: #ff8400; font-weight: bold; padding-left: 15px; display: block; margin-top: 4px;">⚠️ No hay conexión a Internet. Antigüedad datos: ' + timeAgoGen + '.</span>';
            } else if (lastDataGenerationTimestamp > 0 && !hayErrorData) {
                const timeAgoMF = typeof deps.formatTimeAgo === 'function' ? deps.formatTimeAgo(lastDataGenerationTimestamp, ahoraMs) : '';
                const timeAgoEC = (typeof deps.formatTimeAgo === 'function' && lastDataGenerationTimestampEcmwf > 0)
                    ? deps.formatTimeAgo(lastDataGenerationTimestampEcmwf, ahoraMs)
                    : '...';

                const refMF = (jsonModelInitTimestamp > 0 && typeof deps.formatHourUTC === 'function')
                    ? deps.formatHourUTC(new Date(jsonModelInitTimestamp))
                    : '';
                const refEC = (jsonModelInitTimestampEcmwf > 0 && typeof deps.formatHourUTC === 'function')
                    ? deps.formatHourUTC(new Date(jsonModelInitTimestampEcmwf))
                    : '';

                const MARGEN_TOLERANCIA_MS = 45 * 60 * 1000;
                const OFFSET_MS = 1 * 60 * 1000;

                let textoFuturoMF = '';
                if (currentStatusText && !currentStatusText.toUpperCase().includes('OPERATIVO')) {
                    textoFuturoMF = '<span style="color:#e39300; font-weight:bold;">🔄 ' + formatStatusText(currentStatusText) + '</span>';
                } else {
                    let proximaFechaMF = null;
                    for (const h of deps.getUpdateSchedules().mf) {
                        const [hora, min] = h.split(':').map(Number);
                        const intento = new Date(ahora);
                        intento.setUTCHours(hora, min, 0, 0);
                        const distancia = lastDataGenerationTimestamp > 0 ? intento.getTime() - lastDataGenerationTimestamp : Infinity;
                        if (intento > ahora && distancia > MARGEN_TOLERANCIA_MS) {
                            proximaFechaMF = intento;
                            break;
                        }
                    }

                    if (!proximaFechaMF) {
                        const [hora, min] = deps.getUpdateSchedules().mf[0].split(':').map(Number);
                        proximaFechaMF = new Date(ahora);
                        proximaFechaMF.setUTCDate(proximaFechaMF.getUTCDate() + 1);
                        proximaFechaMF.setUTCHours(hora, min, 0, 0);
                    }

                    const diffMsMF = (proximaFechaMF - ahora) + OFFSET_MS;
                    const diffMinsMF = Math.floor(diffMsMF / 60000) % 60;
                    const diffHorasMF = Math.floor(Math.floor(diffMsMF / 60000) / 60);
                    const textoMF = diffHorasMF > 0 ? '~' + diffHorasMF + ' h ' + diffMinsMF + ' min' : '~' + diffMinsMF + ' min';
                    textoFuturoMF = '🔄 Próxima: <b>' + textoMF + '</b>';
                }

                let textoFuturoEC = '';
                if (currentStatusTextEcmwf && !currentStatusTextEcmwf.toUpperCase().includes('OPERATIVO')) {
                    textoFuturoEC = '<span style="color:#e39300; font-weight:bold;">🔄 ' + formatStatusText(currentStatusTextEcmwf) + '</span>';
                } else {
                    let proximaFechaEC = null;
                    for (const h of deps.getUpdateSchedules().ecmwf) {
                        const [hora, min] = h.split(':').map(Number);
                        const intento = new Date(ahora);
                        intento.setUTCHours(hora, min, 0, 0);
                        const distancia = lastDataGenerationTimestampEcmwf > 0 ? intento.getTime() - lastDataGenerationTimestampEcmwf : Infinity;
                        if (intento > ahora && distancia > MARGEN_TOLERANCIA_MS) {
                            proximaFechaEC = intento;
                            break;
                        }
                    }

                    if (!proximaFechaEC) {
                        const [hora, min] = deps.getUpdateSchedules().ecmwf[0].split(':').map(Number);
                        proximaFechaEC = new Date(ahora);
                        proximaFechaEC.setUTCDate(proximaFechaEC.getUTCDate() + 1);
                        proximaFechaEC.setUTCHours(hora, min, 0, 0);
                    }

                    const diffMsEC = (proximaFechaEC - ahora) + OFFSET_MS;
                    const diffMinsEC = Math.floor(diffMsEC / 60000) % 60;
                    const diffHorasEC = Math.floor(Math.floor(diffMsEC / 60000) / 60);
                    const textoEC = diffHorasEC > 0 ? '~' + diffHorasEC + ' h ' + diffMinsEC + ' min' : '~' + diffMinsEC + ' min';
                    textoFuturoEC = '🔄 Próxima: <b>' + textoEC + '</b>';
                }

                dataGenElement.innerHTML = '\n                    <ul style="margin: 5px 0 0 0; padding-left: 30px; padding-right: 10px; list-style-type: disc; line-height: 1.4; text-align: left;">\n                        <li style="margin-bottom: 8px;">\n                            <b>Météo-France:</b> hace <b>' + timeAgoMF + '</b> <span style="color:#777; font-style:italic;">(ref. ' + refMF + 'Z)</span><br>\n                            <span>' + textoFuturoMF + '</span>\n                        </li>\n                        <li>\n                            <b>ECMWF:</b> hace <b>' + timeAgoEC + '</b> <span style="color:#777; font-style:italic;">(ref. ' + refEC + 'Z)</span><br>\n                            <span>' + textoFuturoEC + '</span>\n                        </li>\n                    </ul>';
            } else if (!hayErrorData) {
                dataGenElement.textContent = 'Cargando...';
            }
        }

        const offlineIcon = document.getElementById('offline-indicator');
        if (offlineIcon) {
            offlineIcon.style.display = mostrarErrorOffline ? 'flex' : 'none';
        }
    }

    async function loadTimestampPanelData() {
        if (!navigator.onLine) {
            return;
        }

        try {
            const [resMF, resECMWF] = await Promise.all([
                fetch('https://flydecision.com/json_timestamp_and_model_run_ref_time.txt?t=' + Date.now(), { cache: 'no-store' }).catch(function() { return null; }),
                fetch('https://flydecision.com/json_timestamp_and_model_run_ref_time_ecmwf.txt?t=' + Date.now(), { cache: 'no-store' }).catch(function() { return null; })
            ]);

            if (resMF && resMF.ok) {
                const textContent = (await resMF.text()).trim();
                if (textContent) {
                    const parts = textContent.split('|');
                    if (parts[0]) {
                        lastDataGenerationTimestamp = new Date(parts[0]).getTime();
                    }
                    if (parts[1]) {
                        jsonModelInitTimestamp = new Date(parts[1]).getTime();
                    } else {
                        jsonModelInitTimestamp = lastDataGenerationTimestamp;
                    }
                    if (!isNaN(lastDataGenerationTimestamp)) {
                        hayErrorData = false;
                    }
                }
            }

            if (resECMWF && resECMWF.ok) {
                const textContentE = (await resECMWF.text()).trim();
                if (textContentE) {
                    const partsE = textContentE.split('|');
                    if (partsE[0]) {
                        lastDataGenerationTimestampEcmwf = new Date(partsE[0]).getTime();
                    }
                    if (partsE[1]) {
                        jsonModelInitTimestampEcmwf = new Date(partsE[1]).getTime();
                    } else {
                        jsonModelInitTimestampEcmwf = lastDataGenerationTimestampEcmwf;
                    }
                }
            }
        } catch (error) {
            console.warn('Error general timestamps:', error.message);
        }
    }

    async function loadStatusAndAutoRefreshInterval() {
        if (!navigator.onLine) {
            return 60000;
        }

        let nuevoIntervalo = 60000;
        let redMF = false;
        let redECMWF = false;

        try {
            const [resMF, resECMWF] = await Promise.all([
                fetch('https://flydecision.com/meteo-status.txt?t=' + Date.now()).catch(function() { return null; }),
                fetch('https://flydecision.com/meteo-status-ecmwf.txt?t=' + Date.now()).catch(function() { return null; })
            ]);

            let currentlyUpdatingMF = false;
            let currentlyUpdatingEC = false;

            if (resMF && resMF.ok) {
                redMF = true;
                currentStatusText = (await resMF.text()).trim();
                const upperText = currentStatusText.toUpperCase();

                if (upperText.includes('OPERATIVO')) {
                    currentlyUpdatingMF = false;
                } else if (!upperText.includes('ERROR') && !upperText.includes('FATAL') && !upperText.includes('FAILED')) {
                    currentlyUpdatingMF = true;
                    nuevoIntervalo = 5000;
                }
            }

            if (resECMWF && resECMWF.ok) {
                redECMWF = true;
                currentStatusTextEcmwf = (await resECMWF.text()).trim();
                const upperTextE = currentStatusTextEcmwf.toUpperCase();

                if (upperTextE.includes('OPERATIVO')) {
                    currentlyUpdatingEC = false;
                } else if (!upperTextE.includes('ERROR') && !upperTextE.includes('FATAL') && !upperTextE.includes('FAILED')) {
                    currentlyUpdatingEC = true;
                    nuevoIntervalo = 5000;
                }
            } else if (currentStatusTextEcmwf === 'Cargando...') {
                currentStatusTextEcmwf = 'Esperando primer dato...';
            }

            const mfTermino = (window.oldUpdatingMF && !currentlyUpdatingMF);
            const ecTermino = (window.oldUpdatingEC && !currentlyUpdatingEC);
            if (mfTermino || ecTermino) {
                deps.showAcceptCancelModal('', '<p>ℹ️ Hay datos meteorológicos actualizados.</p><p>¿Recargar ahora?</p>', 'recargarPagina');
            }

            window.oldUpdatingMF = currentlyUpdatingMF;
            window.oldUpdatingEC = currentlyUpdatingEC;
            statusActualizacionEnCurso = (currentlyUpdatingMF || currentlyUpdatingEC);

            if (!redMF && !redECMWF) {
                manageConnectionChange('offline');
            } else {
                manageConnectionChange('online');
            }
        } catch (error) {
            console.warn('Fallo fetch status:', error.message);
            manageConnectionChange('offline');
        }

        return nuevoIntervalo;
    }

    async function runUpdateCycle() {
        if (timerCiclo) {
            clearTimeout(timerCiclo);
        }

        if (!avisoOfflineActivo) {
            const results = await Promise.all([
                loadTimestampPanelData(),
                loadStatusAndAutoRefreshInterval()
            ]);
            intervaloActualizacion = results[1] || 60000;
        }

        refreshUpdatePanel();
        timerCiclo = setTimeout(runUpdateCycle, intervaloActualizacion);
    }

    async function startNativeNetworkMonitor() {
        assertDeps();

        if (nativeNetworkMonitorStarted) {
            return;
        }

        if (!(typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Network)) {
            return;
        }

        nativeNetworkMonitorStarted = true;
        const Network = Capacitor.Plugins.Network;
        const status = await Network.getStatus();

        if (status.connected) {
            console.log(new Date().toLocaleString(), '⚡ [Nativo] Red detectada al inicio. Forzando ONLINE.');
            avisoOfflineActivo = false;
            if (timerOffline) {
                clearTimeout(timerOffline);
                timerOffline = null;
            }
        } else {
            console.log(new Date().toLocaleString(), '⚡ [Nativo] Arrancamos SIN red.');
            manageConnectionChange('offline');
        }

        Network.addListener('networkStatusChange', function(nextStatus) {
            console.log(new Date().toLocaleString(), '📡 [Nativo] Cambio de red:', nextStatus.connected);
            if (nextStatus.connected) {
                manageConnectionChange('online');
            } else {
                manageConnectionChange('offline');
            }
        });
    }

    function handleWindowLoad() {
        startNativeNetworkMonitor();
        setTimeout(function() {
            runUpdateCycle();
        }, 3000);
    }

    function configureAndroidUi() {
        const esAndroidApp = window.Capacitor && window.Capacitor.getPlatform() === 'android';
        if (!esAndroidApp) {
            return;
        }

        const plugins = window.Capacitor.Plugins || {};
        const StatusBar = plugins.StatusBar;
        const TextZoom = plugins.TextZoom;

        document.body.classList.add('modo-android-manual');

        const configurarAndroid = async function() {
            try {
                await StatusBar.setOverlaysWebView({ overlay: true });
                await StatusBar.setStyle({ style: 'LIGHT' });

                const info = await StatusBar.getInfo();
                const altura = info.height;
                console.log('📏 Altura detectada: ' + altura + 'px');

                if (altura > 0) {
                    document.documentElement.style.setProperty('--android-sb-height', altura + 'px');
                }

                if (TextZoom) {
                    await TextZoom.set({ value: 1 });
                    console.log('✅ TextZoom forzado a 1');
                }
            } catch (error) {
                console.warn('Error configurando Android (StatusBar/TextZoom):', error);
                document.documentElement.style.setProperty('--android-sb-height', '35px');
            }
        };

        configurarAndroid();
    }

    async function checkResume() {
        assertDeps();

        const ahora = Date.now();
        const timestampDatosLocal = lastDataGenerationTimestamp || 0;
        const antiguedad = ahora - timestampDatosLocal;
        const UMBRAL_RECARGA = 7200000;

        if (antiguedad > UMBRAL_RECARGA) {
            statusActualizacionEnCurso = false;
            deps.showLoading();

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(function() {
                    controller.abort();
                }, 3000);

                const response = await fetch('https://flydecision.com/json_timestamp_and_model_run_ref_time.txt?t=' + Date.now(), {
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const textContent = (await response.text()).trim();
                    const parts = textContent.split('|');
                    const serverTimestamp = parts[0] ? new Date(parts[0]).getTime() : 0;

                    if (serverTimestamp > timestampDatosLocal) {
                        await deps.buildTable(true);
                    } else {
                        deps.buildTable(false);
                    }
                } else {
                    throw new Error('Error al leer timestamp del servidor');
                }
            } catch (error) {
                console.warn('⚠️ Fallo al comprobar versión servidor (u Offline). Manteniendo caché local.', error);
                deps.buildTable(false);
            }

            runUpdateCycle();
            return;
        }

        refreshUpdatePanel();
        startNativeNetworkMonitor();
    }

    function startResumeDetector() {
        if (resumeDetectorStarted) {
            return;
        }

        resumeDetectorStarted = true;
        const checkResumeHandler = function() {
            checkResume();
        };

        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative) {
            const AppPlugin = window.Capacitor.Plugins ? window.Capacitor.Plugins.App : null;
            if (AppPlugin) {
                AppPlugin.addListener('resume', checkResumeHandler);
            }
        }

        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                checkResumeHandler();
            }
        });
    }

    function start() {
        assertDeps();

        if (runtimeStarted) {
            return api;
        }

        runtimeStarted = true;
        window.addEventListener('offline', function() {
            manageConnectionChange('offline');
        });
        window.addEventListener('online', function() {
            manageConnectionChange('online');
        });
        window.addEventListener('load', handleWindowLoad);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startResumeDetector);
        } else {
            startResumeDetector();
        }

        configureAndroidUi();
        return api;
    }

    const api = {
        init,
        start,
        syncOfflineBootstrapTimestamps,
        manageConnectionChange,
        refreshUpdatePanel,
        runUpdateCycle,
        startNativeNetworkMonitor,
        configureAndroidUi,
        checkResume,
        startResumeDetector,
        handleWindowLoad,
        formatStatusText,
    };

    appNavigation.runtimeController = api;
})(window);