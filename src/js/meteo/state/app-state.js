(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const state = root.state = root.state || {};

    if (state.appState) {
        return;
    }

    const values = Object.create(null);

    state.appState = {
        assign(nextValues) {
            Object.keys(nextValues || {}).forEach((key) => {
                values[key] = nextValues[key];
            });

            return this.snapshot();
        },
        get(key, defaultValue) {
            return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue;
        },
        has(key) {
            return Object.prototype.hasOwnProperty.call(values, key);
        },
        set(key, value) {
            values[key] = value;
            return value;
        },
        snapshot() {
            return Object.assign({}, values);
        },
    };
})(window);