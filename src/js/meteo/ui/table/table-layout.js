(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const ui = root.ui = root.ui || {};

    if (ui.tableLayout) {
        return;
    }

    const constants = root.utils && root.utils.constants ? root.utils.constants : null;
    const baseRows = constants && constants.DEFAULTS ? constants.DEFAULTS.tableBaseRows : 5;

    function getRowsPerLaunch(flags) {
        const currentFlags = flags || {};
        let rows = baseRows;

        if (currentFlags.chkMostrarProbPrecipitacion) {
            rows++;
        }
        if (currentFlags.chkMostrarVientoAlturas) {
            rows += 3;
        }
        if (currentFlags.chkMostrarXC) {
            rows += 3;
        }
        if (currentFlags.chkMostrarCizalladura) {
            rows++;
        }
        if (currentFlags.chkMostrarRafagosidad) {
            rows++;
        }

        return rows;
    }

    ui.tableLayout = {
        getRowsPerCurrentSettings(currentFlags) {
            return getRowsPerLaunch(currentFlags);
        },
        getRowsPerLaunch,
    };
})(window);