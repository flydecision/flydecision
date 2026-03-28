(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const utils = root.utils = root.utils || {};

    if (utils.constants) {
        return;
    }

    utils.constants = {
        DEFAULTS: {
            initialLatitude: 40.4168,
            initialLongitude: -3.7038,
            preferredRangeEnd: '20',
            preferredRangeStart: '10',
            showApplyCalibration: false,
            showCizalladura: true,
            showProbPrecipitacion: true,
            showRafagosidad: false,
            showVientoAlturas: false,
            showXC: true,
            tableBaseRows: 5,
            xcCapeLims: { idealMin: 0, idealMax: 400, riesgo: 800 },
            xcCinLims: { verde: 50, rojo: 150 },
            xcTechoLims: { rojo: 800, verde: 1500 },
        },
        STORAGE_KEYS: {
            APPLY_CALIBRATION: 'METEO_CHECKBOX_APLICAR_CALIBRACION',
            DISTANCE_LATITUDE: 'METEO_FILTRO_DISTANCIA_LAT_INICIAL',
            DISTANCE_LONGITUDE: 'METEO_FILTRO_DISTANCIA_LON_INICIAL',
            FAVORITES: 'METEO_FAVORITOS_LISTA',
            PREFERRED_RANGE_END: 'METEO_CONFIGURACION_RANGO_HORARIO_HORA_FIN',
            PREFERRED_RANGE_START: 'METEO_CONFIGURACION_RANGO_HORARIO_HORA_INICIO',
            RACHA_MAX: 'METEO_RACHA_MAX',
            SHOW_CIZALLADURA: 'METEO_CHECKBOX_MOSTRAR_CIZALLADURA',
            SHOW_PROB_PRECIPITATION: 'METEO_CHECKBOX_MOSTRAR_PROB_PRECIPITACION',
            SHOW_RAFAGOSIDAD: 'METEO_CHECKBOX_MOSTRAR_RAFAGOSIDAD',
            SHOW_VIENTO_ALTURAS: 'METEO_CHECKBOX_MOSTRAR_VIENTO_ALTURAS',
            SHOW_XC: 'METEO_CHECKBOX_MOSTRAR_XC',
            VELOCIDAD_IDEAL: 'METEO_VELOCIDAD_IDEAL',
            VELOCIDAD_MAXIMA: 'METEO_VELOCIDAD_MAXIMA',
            VELOCIDAD_MINIMA: 'METEO_VELOCIDAD_MINIMA',
            XC_CAPE_LIMITS: 'METEO_XC_CAPE_LIMS',
            XC_CIN_LIMITS: 'METEO_XC_CIN_LIMS',
            XC_TECHO_LIMITS: 'METEO_XC_TECHO_LIMS',
        },
    };
})(window);