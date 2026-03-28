(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const state = root.state = root.state || {};

    if (state.preferencesStore) {
        return;
    }

    function cloneDefaultValue(value) {
        if (Array.isArray(value)) {
            return value.slice();
        }

        if (value && typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }

        return value;
    }

    function getRaw(key) {
        return window.localStorage.getItem(key);
    }

    function setRaw(key, value) {
        window.localStorage.setItem(key, String(value));
        return value;
    }

    const store = {
        ensureDefault(key, value) {
            if (getRaw(key) === null) {
                setRaw(key, value);
            }

            return getRaw(key);
        },
        getBoolean(key, defaultValue) {
            const raw = getRaw(key);
            if (raw === null) {
                return defaultValue;
            }

            return raw === 'true';
        },
        getInvertedBoolean(key, defaultValue) {
            const raw = getRaw(key);
            if (raw === null) {
                return defaultValue;
            }

            return raw !== 'false';
        },
        getJSON(key, defaultValue) {
            const raw = getRaw(key);
            if (!raw) {
                return cloneDefaultValue(defaultValue);
            }

            try {
                const parsed = JSON.parse(raw);
                return parsed == null ? cloneDefaultValue(defaultValue) : parsed;
            } catch (error) {
                return cloneDefaultValue(defaultValue);
            }
        },
        getNumber(key, defaultValue) {
            const raw = getRaw(key);
            if (raw === null || raw === '') {
                return defaultValue;
            }

            const parsed = Number(raw);
            return Number.isNaN(parsed) ? defaultValue : parsed;
        },
        getRaw,
        getString(key, defaultValue) {
            const raw = getRaw(key);
            return raw === null ? defaultValue : raw;
        },
        remove(key) {
            window.localStorage.removeItem(key);
        },
        setBoolean(key, value) {
            return setRaw(key, Boolean(value));
        },
        setJSON(key, value) {
            return setRaw(key, JSON.stringify(value));
        },
        setNumber(key, value) {
            return setRaw(key, Number(value));
        },
        setRaw,
        setString(key, value) {
            return setRaw(key, value);
        },
    };

    state.preferencesStore = store;
})(window);