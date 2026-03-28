(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const ui = root.ui = root.ui || {};
    const messages = ui.messages = ui.messages || {};

    if (messages.manager) {
        return;
    }

    messages.manager = {
        elementoActual: null,
        mostrar({ tipo = 'modal', posicion = 'centro', htmlContenido = '', botones = [], anchoBotones = null }) {
            this.ocultar();

            const div = document.createElement('div');
            let contenedorContenido;

            if (tipo === 'modal') {
                div.className = 'mensaje-modal visible';
                contenedorContenido = document.createElement('div');
                contenedorContenido.className = 'mensaje-modal-contenido';
                div.appendChild(contenedorContenido);
            } else {
                div.className = 'mensaje-no-modal visible';

                if (posicion === 'derecha') {
                    div.classList.add('posicion-derecha');
                }

                contenedorContenido = div;
            }

            const divTexto = document.createElement('div');
            divTexto.innerHTML = htmlContenido;
            contenedorContenido.appendChild(divTexto);

            if (botones.length > 0) {
                const wrapperBotones = document.createElement('div');
                wrapperBotones.className = 'boton-mensajes-wrapper';

                botones.forEach((btnConfig) => {
                    const btn = document.createElement('button');
                    btn.className = 'boton-mensajes';

                    if (typeof btnConfig === 'string') {
                        const estandar = this._obtenerBotonEstandar(btnConfig);
                        btn.textContent = estandar.texto;
                        btn.onclick = estandar.accion;
                        if (estandar.claseExtra) {
                            btn.classList.add(estandar.claseExtra);
                        }
                    } else {
                        btn.textContent = btnConfig.texto;
                        btn.onclick = btnConfig.onclick || (() => this.ocultar());
                        if (btnConfig.estilo === 'secundario') {
                            btn.classList.add('btn-secundario');
                        }
                    }

                    if (anchoBotones) {
                        btn.style.width = typeof anchoBotones === 'number' ? `${anchoBotones}px` : anchoBotones;
                    }

                    btn.style.marginLeft = '10px';
                    wrapperBotones.appendChild(btn);
                });

                contenedorContenido.appendChild(wrapperBotones);
            }

            document.body.appendChild(div);
            this.elementoActual = div;
        },
        ocultar() {
            if (this.elementoActual) {
                this.elementoActual.remove();
                this.elementoActual = null;
            }
        },
        _obtenerBotonEstandar(clave) {
            switch (clave.toUpperCase()) {
                case 'ACEPTAR':
                    return { texto: 'Aceptar', accion: () => this.ocultar() };
                case 'SIGUIENTE':
                    return { texto: 'Siguiente', accion: () => this.ocultar() };
                case 'TERMINAR':
                    return { texto: 'Finalizar', accion: () => this.ocultar() };
                case 'CANCELAR':
                    return { texto: 'Cancelar', accion: () => this.ocultar(), claseExtra: 'btn-secundario' };
                default:
                    return { texto: clave, accion: () => this.ocultar() };
            }
        },
    };
})(window);