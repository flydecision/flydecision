(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const domain = root.domain = root.domain || {};

    if (domain.scoring) {
        return;
    }

    function calculateMinimumOrientationAngle({ orientaciones, dirCorregida, diferenciaAngular, umbralContiguas = 46 }) {
        let minimoAngulo = 180;

        if (orientaciones.length > 0) {
            // 🎯 A) CÁLCULO BASE: Distancia al punto fijo más cercano
            minimoAngulo = Math.min(...orientaciones.map((orientacion) => diferenciaAngular(dirCorregida, orientacion)));

            // ⛰️ B) LÓGICA DE LADERA CONTINUA (Abanicos)
            // Si el despegue tiene más de una orientación, comprobamos si forman una ladera continua.
            if (orientaciones.length > 1) {
                // ¿Qué consideramos "contiguas"? En una rosa de 8 vientos (N, NE, E...),
                // la separación estándar es de 45º. Ponemos 46º por si hay algún decimal suelto.
                // 💡 NOTA: Si en tu base de datos pusieras S (180) y W (270) y quisieras que
                // todo ese hueco de 90º fuera ladera continua, deberías subir este valor a 91.
                const oriOrdenadas = [...orientaciones].sort((left, right) => left - right);

                for (let j = 0; j < oriOrdenadas.length; j++) {
                    let inicioArco = oriOrdenadas[j];
                    let finArco = oriOrdenadas[(j + 1) % oriOrdenadas.length];
                    let amplitud = (finArco - inicioArco + 360) % 360;

                    if (amplitud > 180) {
                        amplitud = 360 - amplitud;
                        const temporal = inicioArco;
                        inicioArco = finArco;
                        finArco = temporal;
                    }

                    if (amplitud <= umbralContiguas) {
                        const diffViento = (dirCorregida - inicioArco + 360) % 360;
                        if (diffViento <= amplitud) {
                            minimoAngulo = 0;
                            break;
                        }
                    }
                }
            }
        }

        return minimoAngulo;
    }

    // =========================================================
    // 🟢 ALGORITMO CONDICIONES DESPEGUE
    // =========================================================
    function calculateDespegueScoreHora({ minimoAngulo, velocidad, rachaCorregida, precipitacion, rachaMax, velocidadMin, velocidadMax }) {
        let ptsHora = 0;
        let vetoActivado = false;
        let motivoVeto = '';

        // ⛅ --- A. DIRECCIÓN (Máx 50 pts) ---
        let ptsDir = 0;
        let ratioCorreccionPorDireccion = 1;
        let ratioCorreccionPorRacha = 1;

        if (minimoAngulo > 120) {
            ptsDir = 0;
            vetoActivado = true;
            motivoVeto = 'Viento de cola/cruzado extremo (> 120º)';
        } else if (minimoAngulo > 100) {
            ptsDir = 5;
            ratioCorreccionPorDireccion = 0.2;
        } else if (minimoAngulo > 80) {
            ptsDir = 10;
            ratioCorreccionPorDireccion = 0.3;
        } else if (minimoAngulo > 45) {
            ptsDir = 15;
            ratioCorreccionPorDireccion = 0.4;
        } else if (minimoAngulo > 22) {
            ptsDir = 35;
            ratioCorreccionPorDireccion = 0.6;
        } else if (minimoAngulo > 10) {
            ptsDir = 45;
            ratioCorreccionPorDireccion = 0.9;
        } else {
            ptsDir = 50;
            ratioCorreccionPorDireccion = 1;
        }

        // ⛅ --- B. RACHA (Máx 30 pts) ---
        let ptsRacha = 0;

        if (!vetoActivado) {
            if (rachaCorregida > rachaMax * 1.5) {
                ptsRacha = 0;
                vetoActivado = true;
                motivoVeto = `Racha Peligrosa (${rachaCorregida} > ${rachaMax * 1.5})`;
            } else if (rachaCorregida > rachaMax * 1.1) {
                ptsRacha = 0;
                ratioCorreccionPorRacha = 0.2;
            } else if (rachaCorregida > rachaMax) {
                ptsRacha = 5;
                ratioCorreccionPorRacha = 0.5;
            } else if (rachaCorregida > rachaMax * 0.8) {
                ptsRacha = 20;
                ratioCorreccionPorRacha = 0.8;
            } else {
                ptsRacha = 30;
            }
        }

        // ⛅ --- C. VELOCIDAD (Máx 20 pts) ---
        let ptsVel = 0;

        if (!vetoActivado) {
            if (velocidad > velocidadMax * 2) {
                ptsVel = 0;
                vetoActivado = true;
                motivoVeto = `Viento muy fuerte (${velocidad} > ${velocidadMax * 2})`;
            } else if (velocidad > velocidadMax * 1.5) {
                ptsVel = 3;
            } else if (velocidad > velocidadMax) {
                ptsVel = 5;
            } else if (velocidad > velocidadMin) {
                ptsVel = 20;
            } else {
                ptsVel = 15;
            }
        }

        // 💦 --- D. PRECIPITACIÓN (VETO SUPREMO) ---
        if (precipitacion > 0) {
            vetoActivado = true;
            motivoVeto = `Lluvia prevista (${precipitacion.toFixed(1)} mm)`;
        }

        if (vetoActivado) {
            ptsHora = 0;
        } else {
            ptsHora = (ptsDir + ptsRacha + ptsVel) * ratioCorreccionPorDireccion * ratioCorreccionPorRacha;
        }

        return {
            motivoVeto,
            ptsDir,
            ptsHora,
            ptsRacha,
            ptsVel,
            ratioCorreccionPorDireccion,
            ratioCorreccionPorRacha,
            vetoActivado,
        };
    }

    // ---------------------------------------------------------
    // 🟢 ALGORITMO XC
    // ---------------------------------------------------------
    function calculateXCScoreHora({ vetoActivado, hourlyEcmwf, index, ratioCorreccionPorDireccion, ratioCorreccionPorRacha, ratioTechoUtil, xcTechoLims, xcCapeLims, xcCinLims }) {
        let ptsXC_hora = 0;

        // Si el viento base está vetado (lluvia, viento extremo), el XC es 0.
        if (!vetoActivado) {
            // 1. Obtener el dato crudo de la capa límite (AGL)
            const techoRaw = (hourlyEcmwf.boundary_layer_height && hourlyEcmwf.boundary_layer_height[index] != null) ? Number(hourlyEcmwf.boundary_layer_height[index]) : 0;

            // 2. Aplicar el ratio global de realismo para parapente (0.85)
            const techoUtil = techoRaw * ratioTechoUtil;

            const cape = (hourlyEcmwf.cape && hourlyEcmwf.cape[index] != null) ? Number(hourlyEcmwf.cape[index]) : 0;
            const cin = (hourlyEcmwf.convective_inhibition && hourlyEcmwf.convective_inhibition[index] != null) ? Math.max(0, Number(hourlyEcmwf.convective_inhibition[index])) : 0;

            // Techo Útil (0-40 pts) - Calculado sobre el valor corregido con el ratio
            let ptsTecho = 0;
            if (techoUtil >= xcTechoLims.verde) ptsTecho = 40;
            else if (techoUtil > xcTechoLims.rojo) ptsTecho = 10 + 30 * ((techoUtil - xcTechoLims.rojo) / (xcTechoLims.verde - xcTechoLims.rojo));
            else ptsTecho = 10 * (techoUtil / xcTechoLims.rojo);

            // CAPE (0-40 pts) - ¡Corregido para no penalizar días azules!
            let ptsCape = 0;
            if (cape >= xcCapeLims.idealMin && cape <= xcCapeLims.idealMax) {
                ptsCape = 40;
            } else if (cape > xcCapeLims.idealMax && cape <= xcCapeLims.riesgo) {
                ptsCape = 40 - 40 * ((cape - xcCapeLims.idealMax) / (xcCapeLims.riesgo - xcCapeLims.idealMax));
            } else {
                ptsCape = 0;
            }

            // CIN (0-20 pts)
            let ptsCin = 0;
            if (cin <= xcCinLims.verde) ptsCin = 20;
            else if (cin < xcCinLims.rojo) ptsCin = 20 * (1 - (cin - xcCinLims.verde) / (xcCinLims.rojo - xcCinLims.verde));
            else ptsCin = 0;

            // Puntuación total de la hora (penalizada si el viento/racha general no es ideal)
            ptsXC_hora = (ptsTecho + ptsCape + ptsCin) * ratioCorreccionPorDireccion * ratioCorreccionPorRacha;
        }

        return ptsXC_hora;
    }

    function calculateFinalScores({ horasValidas, puntosAcumulados, horasValidasXC, puntosAcumuladosXC }) {
        const maximosPuntosPosibles = horasValidas * 100;
        const notaFinal = maximosPuntosPosibles > 0 ? (puntosAcumulados / maximosPuntosPosibles) * 10 : 0;
        const maximosPuntosPosiblesXC = horasValidasXC * 100;
        const notaFinalXC = maximosPuntosPosiblesXC > 0 ? (puntosAcumuladosXC / maximosPuntosPosiblesXC) * 10 : 0;

        return {
            maximosPuntosPosibles,
            maximosPuntosPosiblesXC,
            notaFinal,
            notaFinalXC,
        };
    }

    domain.scoring = {
        calculateDespegueScoreHora,
        calculateFinalScores,
        calculateMinimumOrientationAngle,
        calculateXCScoreHora,
    };
})(window);