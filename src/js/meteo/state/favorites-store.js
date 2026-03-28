(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const state = root.state = root.state || {};

    if (state.favoritesStore) {
        return;
    }

    const constants = root.utils && root.utils.constants ? root.utils.constants : null;
    const favoritesKey = constants && constants.STORAGE_KEYS ? constants.STORAGE_KEYS.FAVORITES : 'METEO_FAVORITOS_LISTA';

    function normalizeFavoriteIds(values) {
        return (Array.isArray(values) ? values : [])
            .map(Number)
            .filter((value) => !Number.isNaN(value));
    }

    function getFavorites() {
        const raw = window.localStorage.getItem(favoritesKey);

        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            return normalizeFavoriteIds(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            return [];
        }
    }

    function setFavorites(values) {
        const normalized = normalizeFavoriteIds(values);
        window.localStorage.setItem(favoritesKey, JSON.stringify(normalized));
        return normalized;
    }

    function toggleFavorite(id) {
        const favoriteId = Number(id);
        const favorites = getFavorites();
        const index = favorites.indexOf(favoriteId);
        let isFavorite = false;

        if (index === -1) {
            favorites.push(favoriteId);
            isFavorite = true;
        } else {
            favorites.splice(index, 1);
        }

        return {
            favorites: setFavorites(favorites),
            isFavorite,
        };
    }

    state.favoritesStore = {
        clearFavorites() {
            return setFavorites([]);
        },
        getFavorites,
        hasFavoritesKey() {
            return window.localStorage.getItem(favoritesKey) !== null;
        },
        key: favoritesKey,
        normalizeFavoriteIds,
        setFavorites,
        toggleFavorite,
    };
})(window);