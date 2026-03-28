(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const features = root.features = root.features || {};
    const favoritesFeature = features.favorites = features.favorites || {};

    if (favoritesFeature.controller) {
        return;
    }

    let deps = null;
    let idsPendientesDeConfirmacion = [];
    let estadoPendienteDeAplicar = false;

    function assertDeps() {
        if (!deps) {
            throw new Error('favorites-controller no inicializado');
        }
    }

    function init(nextDeps) {
        deps = nextDeps;
        idsPendientesDeConfirmacion = deps.getPendingFavoriteIds();
        estadoPendienteDeAplicar = deps.getPendingFavoriteState();
        return api;
    }

    function updatePendingState(ids, state) {
        idsPendientesDeConfirmacion = deps.setPendingFavoriteIds(ids);
        estadoPendienteDeAplicar = deps.setPendingFavoriteState(state);
    }

    function activateEditMode() {
        assertDeps();

        deps.resetConditionsFilter(false);
        deps.resetDistanceFilter(false);

        document.getElementById('btn-filtro-favoritos-toggle').classList.remove('filtro-aplicado');

        deps.setEditingMode(true);
        deps.setOnlyFavorites(false);

        document.body.classList.add('modo-edicion-tabla');
        document.getElementById('div-menu').classList.add('mode-editing');
        document.getElementById('div-menu2-edicion-favoritos').classList.add('mode-editing');

        document.getElementById('btn-div-configuracion-toggle').classList.remove('activo');
        document.getElementById('btn-filtro-favoritos-toggle').classList.remove('activo');

        document.querySelector('.div-filtro-horario').style.display = 'none';
        document.getElementById('div-configuracion').classList.remove('activo');

        deps.setFocusMode(false);

        deps.buildTable();
        updateFavoritesCounter();

        setTimeout(function() {
            deps.suggestFavoritesGuide();
        }, 500);
    }

    function toggleOnlyFavoritesFilter() {
        assertDeps();

        const favorites = deps.getFavorites();
        const btn = document.getElementById('btn-filtro-favoritos-toggle');

        if (!btn.classList.contains('activo') && favorites.length === 0) {
            deps.showCenteredAcceptModal(
                '',
                '<p>No funciona el filtro <i>Ver solo favoritos</i> porque es necesario marcar al menos un despegue favorito ♥️.</p><p>Si quieres, puedes consultar la guía rápida de esta pantalla con el botón <img src="icons/icono_ayuda_60.webp" width="20" height="20" style="vertical-align:middle;" alt="Guía"></p>'
            );
            return;
        }

        btn.classList.toggle('activo');
        const estaHundido = btn.classList.contains('activo');

        if (estaHundido) {
            deps.setOnlyFavorites(true);
            btn.classList.add('filtro-aplicado');
        } else {
            deps.setOnlyFavorites(false);
            btn.classList.remove('filtro-aplicado');
        }

        deps.buildTable();
    }

    function clearFavorites() {
        assertDeps();

        const favorites = deps.getFavorites();

        if (favorites.length === 0) {
            deps.getMessageManager().mostrar({
                tipo: 'modal',
                htmlContenido: '<p style="text-align: center;">No hay despegues favoritos para desmarcar</p>',
                botones: ['ACEPTAR']
            });
            return;
        }

        deps.getMessageManager().mostrar({
            tipo: 'modal',
            htmlContenido: `
            <div style="text-align: center;">
                <p style="font-size: 2em; margin: 0;"><img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍"></p>
                <p>¿Quieres desmarcar todos tus favoritos?</p>
            </div>
        `,
            botones: [
                {
                    texto: 'Cancelar',
                    estilo: 'secundario',
                    onclick: function() {
                        deps.getMessageManager().ocultar();
                    }
                },
                {
                    texto: 'Sí, desmarcar',
                    onclick: function() {
                        deps.setFavorites([]);
                        deps.setOnlyFavorites(false);

                        const btn = document.getElementById('btn-filtro-favoritos-toggle');
                        if (btn) {
                            btn.classList.remove('activo', 'filtro-aplicado');
                        }

                        updateFavoritesCounter();

                        const thFavorito = document.getElementById('id-thFavorito');
                        if (thFavorito) {
                            thFavorito.innerHTML = '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                            thFavorito.title = 'Marcar todos los despegues visibles como favoritos';
                        }

                        deps.buildTable();
                        deps.getMessageManager().ocultar();
                    }
                }
            ]
        });
    }

    function openFavorites() {
        assertDeps();

        window.accionCargarFavoritos = function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt';

            input.onchange = function(event) {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(loadEvent) {
                    try {
                        let nuevosFavoritos = loadEvent.target.result
                            .split('\n')
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0);

                        if (nuevosFavoritos.length > 0 && isNaN(Number(nuevosFavoritos[0]))) {
                            const bd = deps.getGlobalLaunches();
                            const favsMigrados = [];
                            nuevosFavoritos.forEach((nombre) => {
                                const match = bd.find((launch) => launch.Despegue === nombre);
                                if (match && match.ID) {
                                    favsMigrados.push(Number(match.ID));
                                }
                            });
                            nuevosFavoritos = favsMigrados;
                        } else {
                            nuevosFavoritos = nuevosFavoritos.map(Number).filter((value) => !isNaN(value));
                        }

                        if (nuevosFavoritos.length > 0) {
                            deps.setFavorites(nuevosFavoritos);
                            localStorage.setItem('METEO_GUIA_PRINCIPAL_VISTA', 'true');

                            if (typeof deps.showReloadMessage === 'function') {
                                deps.showReloadMessage('', `<div style="text-align: center;">
                            <p>✅ Se han importado ${nuevosFavoritos.length} despegues favoritos.</p>
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

        deps.showAcceptCancelModal(
            '',
            '<div style="text-align: center;"><p style="font-size: 2em; margin: 0;">📂</p><p><b>⚠️ ATENCIÓN:</b> Importar favoritos sustituirá los actuales.</b><br><br>Si los quieres conservar, cancela este mensaje y usa el botón 💾 <i>Exportar favoritos</i>.</p>',
            'accionCargarFavoritos'
        );
    }

    async function saveFavorites() {
        assertDeps();

        const favorites = deps.getFavorites().map(Number).filter((value) => !isNaN(value));

        if (favorites.length === 0) {
            deps.getMessageManager().mostrar({
                tipo: 'modal',
                htmlContenido: '<p style="text-align: center;">No hay despegues favoritos para exportar</p>',
                botones: ['ACEPTAR']
            });
            return;
        }

        const ahora = new Date();
        const fecha = ahora.toISOString().split('T')[0];
        let nombreArchivo = `${fecha}_Fly_Decision_Favorites.txt`;
        const contenido = favorites.join('\n');
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
                    title: '✅ Favoritos guardados con éxito.',
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
                            console.error('Error nativo al compartir:', shareError);
                            alert('No se pudo abrir el menú de compartir. Intenta usar otro método.');
                        }
                    } else {
                        alert('Tu dispositivo no permite compartir archivos directamente. Asegúrate de tener Telegram instalado.');
                    }
                }
            } catch (error) {
                console.error('Error al guardar en Android:', error);
                alert('Vaya, algo ha fallado: ' + error.message);
            }
            return;
        }

        const blob = new Blob([contenido], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = nombreArchivo;
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(function() {
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);
        }, 100);
    }

    function updateFavoritesCounter() {
        assertDeps();

        const element = document.getElementById('contador-favoritos-texto');
        if (!element) {
            return;
        }

        const num = deps.getFavorites().length;
        if (num === 1) {
            element.innerHTML = `<b>${num}</b> <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favorito`;
            return;
        }

        element.innerHTML = `<b>${num}</b> <img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favoritos`;
    }

    function toggleFavorite(id) {
        assertDeps();

        const result = deps.toggleFavorite(id);
        updateFavoritesCounter();
        return result.isFavorite;
    }

    function handleMassFavoriteHeaderClick() {
        assertDeps();

        if (!deps.getEditingMode()) {
            deps.showCenteredAcceptModal('', '<p>Para marcar o desmarcar un grupo de favoritos, utiliza la opción:</p><p>Menú ☰ &nbsp;&nbsp;➔&nbsp;&nbsp; [<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️"> Favoritos]</p>');
            return;
        }

        const tabla = document.getElementById('tabla');
        const tbody = tabla.tBodies[0];
        if (!tbody) return;

        const filas = tbody.rows;
        const idsVisibles = [];
        const filasPorDespegue = deps.getRowsPerLaunch();

        for (let i = 0; i < filas.length; i += filasPorDespegue) {
            const filaPrincipal = filas[i];
            if (!filaPrincipal) break;

            if (filaPrincipal.style.display !== 'none') {
                const celda = filaPrincipal.querySelector('.columna-favoritos');
                if (celda && celda.dataset.id) {
                    idsVisibles.push(Number(celda.dataset.id));
                }
            }
        }

        if (idsVisibles.length === 0) return;

        const listaFavoritos = deps.getFavorites().map(Number).filter((value) => !isNaN(value));
        const todosSonFavoritos = idsVisibles.every((id) => listaFavoritos.includes(id));
        const nuevoEstadoEsFavorito = !todosSonFavoritos;

        if (nuevoEstadoEsFavorito && idsVisibles.length > 100) {
            updatePendingState(idsVisibles, nuevoEstadoEsFavorito);
            showMassSelectionConfirmation(idsVisibles.length);
            return;
        }

        applyMassFavoriteChanges(idsVisibles, nuevoEstadoEsFavorito);
    }

    function applyMassFavoriteChanges(idsAfectados, nuevoEstadoEsFavorito) {
        assertDeps();

        let listaFavoritos = deps.getFavorites().map(Number).filter((value) => !isNaN(value));
        const setFavoritos = new Set(listaFavoritos);

        if (nuevoEstadoEsFavorito) {
            idsAfectados.forEach((id) => setFavoritos.add(Number(id)));
        } else {
            idsAfectados.forEach((id) => setFavoritos.delete(Number(id)));
        }

        listaFavoritos = Array.from(setFavoritos);
        deps.setFavorites(listaFavoritos);

        const thFavorito = document.getElementById('id-thFavorito');
        if (thFavorito) {
            thFavorito.innerHTML = nuevoEstadoEsFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">' : '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
            thFavorito.title = nuevoEstadoEsFavorito ? 'Desmarcar todos los despegues visibles como favoritos' : 'Marcar todos los despegues visibles como favoritos';
        }

        const tabla = document.getElementById('tabla');
        const tbody = tabla.tBodies[0];
        const filas = tbody.rows;
        const setAfectados = new Set(idsAfectados.map(Number));
        const filasPorDespegue = deps.getRowsPerLaunch();

        for (let i = 0; i < filas.length; i += filasPorDespegue) {
            const filaPrincipal = filas[i];
            if (!filaPrincipal) break;

            let celda = filaPrincipal.querySelector('.columna-favoritos');
            if (!celda) celda = filaPrincipal.cells[0];

            if (celda && celda.dataset.id && setAfectados.has(Number(celda.dataset.id))) {
                celda.innerHTML = nuevoEstadoEsFavorito ? '<img src="icons/red_heart_48.webp" class="icono-emoji" alt="❤️">' : '<img src="icons/white_heart_48.webp" class="icono-emoji" alt="🤍">';
                celda.title = nuevoEstadoEsFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos';

                const action = nuevoEstadoEsFavorito ? 'add' : 'remove';
                for (let j = 0; j < filasPorDespegue; j++) {
                    if (filas[i + j]) filas[i + j].classList[action]('favorito');
                }
            }
        }

        updateFavoritesCounter();
    }

    function confirmMassSelection() {
        assertDeps();

        deps.getMessageManager().ocultar();
        setTimeout(function() {
            applyMassFavoriteChanges(idsPendientesDeConfirmacion, estadoPendienteDeAplicar);
            updatePendingState([], false);
        }, 50);
    }

    function showMassSelectionConfirmation(cantidad) {
        deps.getMessageManager().mostrar({
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
                        deps.getMessageManager().ocultar();
                        updatePendingState([], false);
                    },
                    estilo: 'secundario'
                },
                {
                    texto: 'Sí, marcar',
                    onclick: confirmMassSelection
                }
            ]
        });
    }

    function finishEditMode() {
        assertDeps();

        deps.resetConditionsFilter(false);
        deps.resetDistanceFilter(false);

        const favorites = deps.getFavorites();

        if (!deps.hasFavoritesKey() || favorites.length === 0) {
            deps.showCenteredAcceptModal(
                '',
                '<p>Es necesario marcar al menos un despegue favorito ♥️</p><p>Si quieres, puedes consultar la guía rápida de esta pantalla con el botón <img src="icons/icono_ayuda_60.webp" width="20" height="20" style="vertical-align:middle;" alt="Guía"></p>'
            );
            return false;
        }

        document.body.classList.remove('modo-edicion-tabla');
        document.getElementById('div-menu').classList.remove('mode-editing');
        document.getElementById('div-menu2-edicion-favoritos').classList.remove('mode-editing');
        document.getElementById('btn-filtro-favoritos-toggle').classList.remove('filtro-aplicado');
        document.querySelector('.div-filtro-horario').style.display = '';

        localStorage.setItem('METEO_PRIMERA_VISITA_HECHA', 'true');
        deps.setEditingMode(false);
        deps.cleanSearch();
        deps.buildTable();

        setTimeout(function() {
            deps.suggestMainGuide();
        }, 500);

        return true;
    }

    function addLaunchFromSearch(idDespegue) {
        assertDeps();

        idDespegue = Number(idDespegue);
        const favorites = deps.getFavorites().map(Number).filter((value) => !isNaN(value));

        if (!favorites.includes(idDespegue)) {
            favorites.push(idDespegue);
            deps.setFavorites(favorites);
            deps.cleanSearch();

            const input = document.getElementById('buscador-despegues-provincias');
            if (input) input.value = '';

            const divSugerencias = document.getElementById('sugerencias-globales');
            if (divSugerencias) divSugerencias.style.display = 'none';

            const despegueObj = deps.getGlobalLaunches().find((launch) => Number(launch.ID) === idDespegue);
            const nombreDespegue = despegueObj ? despegueObj.Despegue : idDespegue;

            if (typeof deps.getMessageManager() !== 'undefined') {
                deps.getMessageManager().mostrar({
                    tipo: 'modal',
                    htmlContenido: `<p>✅ <b>${nombreDespegue}</b> añadido</p>`,
                    botones: []
                });

                setTimeout(function() {
                    deps.getMessageManager().ocultar();
                    deps.buildTable();
                }, 1300);
                return;
            }

            alert(`✅ ${nombreDespegue} añadido a favoritos`);
            deps.buildTable();
        }
    }

    const api = {
        activateEditMode,
        addLaunchFromSearch,
        applyMassFavoriteChanges,
        clearFavorites,
        confirmMassSelection,
        finishEditMode,
        handleMassFavoriteHeaderClick,
        init,
        openFavorites,
        saveFavorites,
        toggleFavorite,
        toggleOnlyFavoritesFilter,
        updateFavoritesCounter,
    };

    favoritesFeature.controller = api;
})(window);