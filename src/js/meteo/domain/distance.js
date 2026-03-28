(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const domain = root.domain = root.domain || {};

    if (domain.distance) {
        return;
    }

    function obtenerDistanciaKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    domain.distance = {
        obtenerDistanciaKm,
    };
})(window);