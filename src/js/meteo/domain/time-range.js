(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const domain = root.domain = root.domain || {};

    if (domain.timeRange) {
        return;
    }

    function toUtcDate(hourString) {
        return new Date(hourString.endsWith('Z') ? hourString : hourString + 'Z');
    }

    // ---------------------------------------------------------------
    // 🔴 SLIDERS. FILTRO RANGO HORARIO. Construcción. FUNCIÓN MAESTRA: CALCULAR ÍNDICES SEGÚN CONFIGURACIÓN PREFERENCIA RANGO HORARIO
    // ---------------------------------------------------------------
    function calculatePreferredRange({ indices, horas, diaObjetivo, prefInicio, prefFin, usarDiaCompleto, soloHorasDeLuz }) {
        const maxSteps = indices.length - 1;

        // Si no hay datos, devolvemos todo 0
        if (indices.length === 0) return [0, 0];

        // 1. Detectar qué día queremos analizar
        // Si no nos pasan día, cogemos el día del primer dato disponible
        if (!diaObjetivo) {
            const fechaPrimerDato = toUtcDate(horas[indices[0]]);
            diaObjetivo = fechaPrimerDato.getDate();
        }

        // 2. Encontrar los límites (índices) de ESE día en concreto
        let indiceInicioDia = -1;
        let indiceFinDia = -1;

        for (let i = 0; i < indices.length; i++) {
            const idxReal = indices[i];
            const fecha = toUtcDate(horas[idxReal]);

            if (fecha.getDate() === diaObjetivo) {
                if (indiceInicioDia === -1) indiceInicioDia = i;
                indiceFinDia = i;
            } else if (indiceInicioDia !== -1) {
                break;
            }
        }

        // Si no encontramos el día solicitado, devolvemos rango completo (seguridad)
        if (indiceInicioDia === -1) return [0, maxSteps];

        // Si no hay configuración guardada O si la configuración es el rango total (0-23)
        if (usarDiaCompleto && !soloHorasDeLuz) {
            return [indiceInicioDia, indiceFinDia];
        }

        let resultadoInicio = indiceInicioDia;
        let resultadoFin = indiceFinDia;

        for (let i = indiceInicioDia; i <= indiceFinDia; i++) {
            const idxReal = indices[i];
            const fecha = toUtcDate(horas[idxReal]);
            const hora = fecha.getHours();

            if (prefInicio === 0) {
                resultadoInicio = indiceInicioDia;
            } else if (hora < prefInicio) {
                resultadoInicio = i + 1;
            }

            if (hora <= prefFin) {
                resultadoFin = i;
            }
        }

        // 4. Correcciones finales de seguridad
        if (resultadoInicio > indiceFinDia) resultadoInicio = indiceFinDia;
        if (resultadoFin < resultadoInicio) resultadoFin = resultadoInicio;

        return [resultadoInicio, resultadoFin];
    }

    function trimTrailingDayRolloverHours(hourStrings) {
        let horasFiltradasPermanentemente = Array.isArray(hourStrings) ? hourStrings.slice() : [];

        // --- LÓGICA DE FILTRADO Y ZONA HORARIA (Idéntica a la original) ---
        if (horasFiltradasPermanentemente.length > 0) {
            const ultimoIndice = horasFiltradasPermanentemente.length - 1;
            if (ultimoIndice > 0) {
                const ultimaFechaLocal = toUtcDate(horasFiltradasPermanentemente[ultimoIndice]);
                const penultimaFechaLocal = toUtcDate(horasFiltradasPermanentemente[ultimoIndice - 1]);

                if (ultimaFechaLocal.getDate() !== penultimaFechaLocal.getDate()) {
                    const diaCorte = penultimaFechaLocal.getDate();
                    let indiceCorte = -1;
                    for (let i = ultimoIndice; i >= 0; i--) {
                        const fecha = toUtcDate(horasFiltradasPermanentemente[i]);
                        if (fecha.getDate() === diaCorte) {
                            indiceCorte = i + 1;
                            break;
                        }
                    }
                    if (indiceCorte !== -1) horasFiltradasPermanentemente = horasFiltradasPermanentemente.slice(0, indiceCorte);
                }
            }
        }

        return horasFiltradasPermanentemente;
    }

    function buildVisibleHourIndices(hourStrings, soloHorasDeLuz, isNightFn) {
        const indices = [];

        if (!Array.isArray(hourStrings) || hourStrings.length === 0) {
            return indices;
        }

        hourStrings.forEach((hourString, index) => {
            const fecha = toUtcDate(hourString);
            const esNoche = isNightFn(fecha);
            if (soloHorasDeLuz && esNoche) return;
            indices.push(index);
        });

        return indices;
    }

    function buildDayStartPipIndices(hourStrings, visibleIndices) {
        if (!Array.isArray(visibleIndices) || visibleIndices.length === 0) {
            return [];
        }

        const pipIndices = [0];
        const primerIndiceReal = visibleIndices[0];
        let diaActual = toUtcDate(hourStrings[primerIndiceReal]).getDate();

        for (let i = 1; i < visibleIndices.length; i++) {
            const indiceReal = visibleIndices[i];
            const diaNuevo = toUtcDate(hourStrings[indiceReal]).getDate();
            if (diaNuevo !== diaActual) {
                pipIndices.push(i);
                diaActual = diaNuevo;
            }
        }

        return pipIndices;
    }

    function formatDayPipLabel(value, horas, indices) {
        const indiceReal = indices[Math.round(value)];
        if (!horas || horas.length === 0 || indiceReal === undefined) return '';

        const fecha = toUtcDate(horas[indiceReal]);
        const diasSemanaCorta = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return diasSemanaCorta[fecha.getDay()] + ' ' + fecha.getDate();
    }

    function formatHourTooltip(value, horas, indices) {
        const indiceReal = indices[Math.round(value)];
        if (!horas || horas.length === 0 || indiceReal === undefined) return '';

        const fecha = toUtcDate(horas[indiceReal]);
        return String(fecha.getHours()).padStart(2, '0');
    }

    function buildHourCache(horas, isNightFn, diasSemana) {
        const cacheEsNoche = [];
        const cacheFechas = [];
        const cacheTextosFecha = [];

        if (horas && horas.length > 0) {
            horas.forEach((hourString) => {
                const fecha = toUtcDate(hourString);
                cacheFechas.push(fecha);
                cacheEsNoche.push(isNightFn(fecha));

                const nombreDia = diasSemana[fecha.getDay()];
                const numeroDia = fecha.getDate();
                const horaTexto = String(fecha.getHours()).padStart(2, '0') + ':00 h';
                cacheTextosFecha.push(`${nombreDia} ${numeroDia}, ${horaTexto}`);
            });
        }

        return {
            cacheEsNoche,
            cacheFechas,
            cacheTextosFecha,
        };
    }

    domain.timeRange = {
        buildDayStartPipIndices,
        buildHourCache,
        buildVisibleHourIndices,
        calculatePreferredRange,
        formatDayPipLabel,
        formatHourTooltip,
        toUtcDate,
        trimTrailingDayRolloverHours,
    };
})(window);