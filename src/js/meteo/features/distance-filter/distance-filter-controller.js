(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const features = root.features = root.features || {};
    const distanceFilterFeature = features.distanceFilter = features.distanceFilter || {};

    if (distanceFilterFeature.controller) {
        return;
    }

    let deps = null;

    function assertDeps() {
        if (!deps) {
            throw new Error('distance-filter-controller no inicializado');
        }
    }

    function init(nextDeps) {
        deps = nextDeps;
        return api;
    }

    function hasStoredOrigin() {
        return localStorage.getItem('METEO_FILTRO_DISTANCIA_LAT_INICIAL') !== null;
    }

    function closeMapModal() {
        const modal = deps.getModalMap();
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function showConfigureOriginPrompt() {
        deps.getMessageManager().mostrar({
            tipo: 'modal',
            htmlContenido: `
                            <div style="text-align: center;">
                            <p style="font-size: 2.5em; margin: 0 0 10px 0;">📍</p>
                            <p>Como es la primera vez, necesitas configurar una ubicación de origen.</p>
                            <p>Podrás cambiarla cuando quieras con el botón <span style='background-color: #f0f0f0; border: 1px solid #a0a0a0; border-radius: 4px; display: inline-block;'>📍</span></p>
                            </div>
                        `,
            botones: [
                { texto: 'Cancelar', estilo: 'secundario', onclick: function() { deps.getMessageManager().ocultar(); } },
                { texto: 'Configurar origen', onclick: function() {
                    deps.getMessageManager().ocultar();
                    const btnGeo = document.getElementById('btn-abrir-geo-menu');
                    if (btnGeo) btnGeo.click();
                } }
            ],
            anchoBotones: 160
        });
    }

    function updateStoredOrigin(lat, lon) {
        deps.setDistanceOrigin(lat, lon);
        deps.setStoredDistanceOrigin(lat, lon);
    }

    function updateOrigin(lat, lon, metodo) {
        assertDeps();

        updateStoredOrigin(lat, lon);
        deps.buildTable();
    }

    function selectLocationAndFilter(lat, lon, metodo) {
        assertDeps();

        updateStoredOrigin(lat, lon);
        deps.mapService.putMarker(lat, lon);
        deps.buildTable(false, false);
        closeMapModal();
    }

    function putMarker(lat, lon) {
        assertDeps();
        return deps.mapService.putMarker(lat, lon);
    }

    function openMapModal() {
        assertDeps();

        const modal = deps.getModalMap();
        if (modal) {
            modal.style.display = 'flex';
        }

        const origin = deps.getDistanceOrigin();
        const tieneOrigenGuardado = hasStoredOrigin();
        const latInicial = tieneOrigenGuardado ? origin.lat : 40.0;
        const lonInicial = tieneOrigenGuardado ? origin.lon : -4.0;
        const zoomInicial = tieneOrigenGuardado ? 9 : 6;

        if (!deps.mapService.hasMap()) {
            setTimeout(function() {
                deps.mapService.ensureMap({
                    containerId: 'mapa-selector',
                    lat: latInicial,
                    lon: lonInicial,
                    zoom: zoomInicial,
                    onMapClick: function(lat, lon) {
                        selectLocationAndFilter(lat, lon, 'Mapa');
                    }
                });

                if (tieneOrigenGuardado) {
                    deps.mapService.putMarker(origin.lat, origin.lon);
                }
            }, 50);
            return;
        }

        deps.mapService.focusMap({ lat: latInicial, lon: lonInicial, zoom: tieneOrigenGuardado ? 8 : 6 });

        setTimeout(function() {
            deps.mapService.invalidateSize();

            if (tieneOrigenGuardado) {
                deps.mapService.putMarker(origin.lat, origin.lon);
                return;
            }

            deps.mapService.removeMarker();
        }, 100);
    }

    function toggleIncludeNonFavorites(event) {
        assertDeps();

        if (event) {
            event.preventDefault();
        }

        const button = deps.getIncludeNonFavoritesButton();
        const estabaActivo = button.classList.contains('activo');
        const nuevoEstado = !estabaActivo;

        if (nuevoEstado && !hasStoredOrigin()) {
            showConfigureOriginPrompt();
            return;
        }

        if (nuevoEstado) {
            button.classList.add('activo', 'filtro-aplicado');
        } else {
            button.classList.remove('activo', 'filtro-aplicado');
        }

        const slider = deps.getDistanceSlider();
        if (slider && slider.noUiSlider) {
            const currentIdx = Math.round(parseFloat(slider.noUiSlider.get()));

            if (nuevoEstado && currentIdx === deps.getDistanceMaxIndex()) {
                const idx100km = deps.getDistanceCuts().indexOf(100);
                deps.setLastConfirmedDistanceIndex(idx100km);
                slider.noUiSlider.set(idx100km);

                const btnToggle = document.getElementById('btn-div-filtro-distancia-toggle');
                if (btnToggle) btnToggle.classList.add('filtro-aplicado');
                const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
                if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo');
                const btnReset = document.getElementById('btn-reset-filtro-distancia');
                if (btnReset) btnReset.style.display = 'block';

                deps.buildTable(false, false);
            } else if (currentIdx < deps.getDistanceMaxIndex()) {
                deps.buildTable(false, false);
            }
        }
    }

    async function handleGpsClick() {
        assertDeps();

        const button = deps.getGpsMapButton();
        const textoOriginal = button.innerHTML;
        button.innerHTML = '<span>⏳ Buscando...</span>';

        try {
            const position = await deps.geolocationService.getCurrentPosition();
            button.innerHTML = textoOriginal;
            selectLocationAndFilter(position.latitude, position.longitude, 'GPS');
        } catch (error) {
            console.error('Error GPS:', error.message || error);
            alert('No se pudo obtener la ubicación. ' + (error.message || error));
            button.innerHTML = textoOriginal;
        }
    }

    function handleOutsideMapClick(event) {
        const modal = deps.getModalMap();
        if (event.target === modal) {
            closeMapModal();
        }
    }

    function togglePanel(event) {
        assertDeps();

        const divDistancia = document.getElementById('div-filtro-distancia');
        const activo = divDistancia.classList.contains('activo');
        const vamosAMostrar = !activo;

        document.getElementById('div-configuracion').classList.remove('activo');
        document.getElementById('btn-div-configuracion-toggle').classList.remove('activo');
        deps.setFocusMode(false);

        divDistancia.classList.toggle('activo', vamosAMostrar);
        document.getElementById('btn-div-filtro-distancia-toggle').classList.toggle('activo', vamosAMostrar);

        if (vamosAMostrar) {
            setTimeout(function() {
                const sliderElement = deps.getDistanceSlider();
                if (sliderElement && sliderElement.noUiSlider) {
                    sliderElement.noUiSlider.updateOptions({}, true);
                    const forzarReflow = divDistancia.offsetHeight;
                }
            }, 50);
        }
    }

    function applySliderVisualState(valorNuevo) {
        const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
        const btnToggle = document.getElementById('btn-div-filtro-distancia-toggle');
        const btnReset = document.getElementById('btn-reset-filtro-distancia');
        const maxIndex = deps.getDistanceMaxIndex();

        if (valorNuevo < maxIndex) {
            btnToggle.classList.add('filtro-aplicado');
            if (panelDistancia) panelDistancia.classList.add('borde-rojo-externo');
            if (btnReset) btnReset.style.display = 'block';
            return;
        }

        btnToggle.classList.remove('filtro-aplicado');
        if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo');
        if (btnReset) btnReset.style.display = 'none';
    }

    function handleSliderSlide(values) {
        const valorNuevo = Math.round(values[0]);

        if (typeof Capacitor !== 'undefined') {
            Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
        }

        applySliderVisualState(valorNuevo);
    }

    function handleSliderSet(values) {
        const slider = deps.getDistanceSlider();
        const valorNuevo = Math.round(values[0]);
        const maxIndex = deps.getDistanceMaxIndex();

        if (valorNuevo !== deps.getLastConfirmedDistanceIndex()) {
            if (valorNuevo === maxIndex) {
                const btnIncNoFavs = deps.getIncludeNonFavoritesButton();
                if (btnIncNoFavs) {
                    btnIncNoFavs.classList.remove('activo', 'filtro-aplicado');
                }
            }

            if (!hasStoredOrigin()) {
                deps.setLastConfirmedDistanceIndex(maxIndex);
                slider.noUiSlider.set(maxIndex);
                applySliderVisualState(maxIndex);
                showConfigureOriginPrompt();
                return;
            }

            deps.setLastConfirmedDistanceIndex(valorNuevo);
            deps.buildTable(false, false);
        }
    }

    function resetFilter(reconstruir) {
        const maxIndex = deps.getDistanceMaxIndex();
        const slider = deps.getDistanceSlider();
        deps.setLastConfirmedDistanceIndex(maxIndex);

        if (slider && slider.noUiSlider) {
            slider.noUiSlider.set(maxIndex);
        }

        const btnIncNoFavs = deps.getIncludeNonFavoritesButton();
        if (btnIncNoFavs) {
            btnIncNoFavs.classList.remove('activo', 'filtro-aplicado');
        }

        const btnToggle = document.getElementById('btn-div-filtro-distancia-toggle');
        const divPanel = document.getElementById('div-filtro-distancia');
        const panelDistancia = document.querySelector('#div-filtro-distancia .div-paneles-controles-transparente');
        const btnReset = document.getElementById('btn-reset-filtro-distancia');

        if (btnToggle) {
            btnToggle.classList.remove('activo');
            btnToggle.classList.remove('filtro-aplicado');
        }
        if (divPanel) divPanel.classList.remove('activo');
        if (panelDistancia) panelDistancia.classList.remove('borde-rojo-externo');
        if (btnReset) btnReset.style.display = 'none';

        if (reconstruir) {
            deps.buildTable();
        }
    }

    const api = {
        closeMapModal,
        handleGpsClick,
        handleOutsideMapClick,
        handleSliderSet,
        handleSliderSlide,
        init,
        openMapModal,
        putMarker,
        resetFilter,
        selectLocationAndFilter,
        toggleIncludeNonFavorites,
        togglePanel,
        updateOrigin,
    };

    distanceFilterFeature.controller = api;
})(window);