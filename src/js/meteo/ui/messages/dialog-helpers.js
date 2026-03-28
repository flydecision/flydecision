(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const compat = root.compat || {};
    const ui = root.ui = root.ui || {};
    const messages = ui.messages = ui.messages || {};

    if (messages.dialogHelpers) {
        return;
    }

    const GestorMensajes = messages.manager;

    function parseNamedCallbacks(accionesAceptar) {
        return String(accionesAceptar || '')
            .split(',')
            .map((nombre) => nombre.trim())
            .filter((nombre) => nombre.length > 0);
    }

    function ejecutarCallbacksNombrados(accionesAceptar) {
        const listaFunciones = parseNamedCallbacks(accionesAceptar);

        if (compat.callNamedCallbacks) {
            compat.callNamedCallbacks(listaFunciones);
            return;
        }

        listaFunciones.forEach((nombreFuncion) => {
            const func = window[nombreFuncion];

            if (typeof func === 'function') {
                func();
            } else {
                console.error(`Error: La función global "${nombreFuncion}" no fue encontrada.`);
            }
        });
    }

    function mensajeModalAceptar(titulo = '', contenido = '', accionesAceptar = '') {
        const htmlTitulo = (titulo && titulo.trim() !== '')
            ? `<p style="font-size: 1.4em; font-weight: bold; text-align:center;">${titulo}</p>`
            : '';

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
                        ejecutarCallbacksNombrados(accionesAceptar);
                    }
                },
            ]
        });
    }

    function mensajeModalAceptarCancelar(titulo = '', contenido = '', accionesAceptar = '') {
        const htmlTitulo = (titulo && titulo.trim() !== '')
            ? `<p style="font-size: 1.4em; font-weight: bold; text-align:center;">${titulo}</p>`
            : '';

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
                        ejecutarCallbacksNombrados(accionesAceptar);
                    }
                }
            ]
        });
    }

    function mensajeAvisoRecarga(titulo = '', contenido = '') {
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

    messages.dialogHelpers = {
        mensajeAvisoRecarga,
        mensajeModalAceptar,
        mensajeModalAceptarCancelar,
    };
})(window);