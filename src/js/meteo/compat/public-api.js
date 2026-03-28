(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const compat = root.compat = root.compat || {};

    if (compat.publishPublicApi) {
        return;
    }

    const publicApiNames = compat.publicApiNames || new Set();

    function publishPublicApi(name, value) {
        window[name] = value;
        publicApiNames.add(name);
        return value;
    }

    function publishPublicApiMap(values) {
        Object.keys(values || {}).forEach((name) => publishPublicApi(name, values[name]));
        return values;
    }

    function resolveNamedCallback(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            return null;
        }

        const callback = window[name.trim()];
        return typeof callback === 'function' ? callback : null;
    }

    function callNamedCallbacks(names) {
        (names || []).forEach((name) => {
            const callback = resolveNamedCallback(name);

            if (callback) {
                callback();
                return;
            }

            console.error(`Error: La función global "${name}" no fue encontrada.`);
        });
    }

    compat.callNamedCallbacks = callNamedCallbacks;
    compat.publicApiNames = publicApiNames;
    compat.publishPublicApi = publishPublicApi;
    compat.publishPublicApiMap = publishPublicApiMap;
    compat.resolveNamedCallback = resolveNamedCallback;
})(window);