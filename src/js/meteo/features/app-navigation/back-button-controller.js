(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const features = root.features = root.features || {};
    const appNavigation = features.appNavigation = features.appNavigation || {};

    if (appNavigation.backButtonController) {
        return;
    }

    let deps = null;
    let backButtonRegistered = false;

    function assertDeps() {
        if (!deps) {
            throw new Error('back-button-controller no inicializado');
        }
    }

    function init(nextDeps) {
        deps = nextDeps;
        return api;
    }

    function confirmExit() {
        assertDeps();

        deps.getMessageManager().mostrar({
            tipo: 'modal',
            htmlContenido: '<p>¿Quieres salir de la aplicación?</p>',
            botones: [
                {
                    texto: 'No',
                    onclick: function() {
                        deps.getMessageManager().ocultar();
                    },
                    estilo: 'secundario'
                },
                {
                    texto: 'Sí, salir',
                    estilo: 'background-color: #d32f2f; color: white;',
                    onclick: function() {
                        window.Capacitor.Plugins.App.exitApp();
                    }
                }
            ]
        });
    }

    function handleBackButton() {
        assertDeps();

        const tippyAbierto = document.querySelector('[data-tippy-root]');
        if (tippyAbierto) {
            if (typeof tippy !== 'undefined' && tippy.hideAll) {
                tippy.hideAll();
            } else {
                document.body.click();
            }
            return;
        }

        const modalAbierto = document.querySelector('.mensaje-modal.visible');
        if (modalAbierto) {
            deps.getMessageManager().ocultar();
            return;
        }

        const modalGeo = document.getElementById('modal-geo-menu');
        if (modalGeo && modalGeo.style.display !== 'none') {
            const btnCerrar = document.getElementById('btn-cerrar-menu');
            if (btnCerrar) {
                btnCerrar.click();
            } else {
                modalGeo.style.display = 'none';
            }
            return;
        }

        if (deps.getEditingMode() === true) {
            deps.finishFavoriteEditMode();
            return;
        }

        const mensajeFlotante = document.querySelector('.mensaje-no-modal.visible');
        if (mensajeFlotante) {
            deps.getMessageManager().ocultar();
            return;
        }

        const panelConfig = document.getElementById('div-configuracion');
        if (panelConfig && panelConfig.classList.contains('activo')) {
            deps.toggleConfigPanel();
            return;
        }

        const panelDistancia = document.getElementById('div-filtro-distancia');
        if (panelDistancia && panelDistancia.classList.contains('activo')) {
            deps.toggleDistancePanel();
            return;
        }

        const panelCondiciones = document.getElementById('div-filtro-condiciones');
        if (panelCondiciones && panelCondiciones.classList.contains('activo')) {
            panelCondiciones.classList.remove('activo');
            const btnCond = document.getElementById('btn-div-filtro-condiciones-toggle');
            if (btnCond) {
                btnCond.classList.remove('activo');
            }
            deps.setFocusMode(false);
            return;
        }

        const panelHorario = document.querySelector('.div-filtro-horario');
        if (panelHorario && panelHorario.style.display !== 'none' && panelHorario.classList.contains('activo')) {
            return;
        }

        confirmExit();
    }

    function register() {
        assertDeps();

        if (backButtonRegistered) {
            return api;
        }

        if (!(window.Capacitor && window.Capacitor.isNativePlatform())) {
            return api;
        }

        const App = window.Capacitor.Plugins.App;
        if (!App || typeof App.addListener !== 'function') {
            return api;
        }

        backButtonRegistered = true;
        App.addListener('backButton', function() {
            handleBackButton();
        });

        return api;
    }

    const api = {
        init,
        register,
        confirmExit,
        handleBackButton,
    };

    appNavigation.backButtonController = api;
})(window);