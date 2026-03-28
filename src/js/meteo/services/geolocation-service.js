(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const services = root.services = root.services || {};

    if (services.geolocationService) {
        return;
    }

    async function getCurrentPosition() {
        const isApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

        if (isApp) {
            const Geolocation = Capacitor.Plugins.Geolocation;
            const check = await Geolocation.checkPermissions();
            if (check.location !== 'granted' && check.location !== 'coarse') {
                await Geolocation.requestPermissions();
            }

            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
            return {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            };
        }

        if (!navigator.geolocation) {
            throw new Error('Tu navegador no soporta GPS.');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                }),
                (err) => reject(new Error(err.message)),
                { enableHighAccuracy: false, timeout: 10000 }
            );
        });
    }

    services.geolocationService = {
        getCurrentPosition,
    };
})(window);