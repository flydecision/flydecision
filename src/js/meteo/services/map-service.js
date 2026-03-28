(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const services = root.services = root.services || {};

    if (services.mapService) {
        return;
    }

    let mapaLeaflet = null;
    let marcadorActual = null;

    function hasMap() {
        return Boolean(mapaLeaflet);
    }

    function createRedMarkerIcon() {
        return L.icon({
            iconUrl: 'icons/marker-icon-2x-red.png',
            shadowUrl: 'icons/marker-shadow.png',
            iconSize: [35, 55],
            iconAnchor: [17, 55],
            popupAnchor: [1, -34],
            shadowSize: [55, 55]
        });
    }

    function removeMarker() {
        if (marcadorActual && mapaLeaflet) {
            mapaLeaflet.removeLayer(marcadorActual);
            marcadorActual = null;
        }
    }

    function putMarker(lat, lng) {
        if (!mapaLeaflet) {
            return null;
        }

        removeMarker();
        marcadorActual = L.marker([lat, lng], { icon: createRedMarkerIcon() }).addTo(mapaLeaflet).openPopup();
        return marcadorActual;
    }

    function ensureMap({ containerId, lat, lon, zoom, onMapClick }) {
        if (!mapaLeaflet) {
            mapaLeaflet = L.map(containerId).setView([lat, lon], zoom);

            L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '<a href="https://openstreetmap.org/copyright" target="_blank">© OSM</a> | <a href="https://opentopomap.org/" target="_blank">Style OpenTopoMap</a>'
            }).addTo(mapaLeaflet);

            mapaLeaflet.on('click', function(event) {
                if (typeof onMapClick === 'function') {
                    onMapClick(event.latlng.lat, event.latlng.lng);
                }
            });
        } else {
            mapaLeaflet.setView([lat, lon], zoom);
        }

        return mapaLeaflet;
    }

    function focusMap({ lat, lon, zoom }) {
        if (!mapaLeaflet) {
            return null;
        }

        mapaLeaflet.setView([lat, lon], zoom);
        return mapaLeaflet;
    }

    function invalidateSize() {
        if (mapaLeaflet) {
            mapaLeaflet.invalidateSize();
        }
    }

    services.mapService = {
        ensureMap,
        focusMap,
        hasMap,
        invalidateSize,
        putMarker,
        removeMarker,
    };
})(window);