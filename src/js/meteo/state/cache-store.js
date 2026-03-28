(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const state = root.state = root.state || {};

    if (state.cacheStore) {
        return;
    }

    //*********************************************************************
    // 💽 BASE DE DATOS INDEXEDDB (Modo Offline sin límite de 5MB)
    //*********************************************************************
    const initDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FlyDecisionDB', 1); //Versión de la DB. Si el año que viene decides que además de la tabla meteoCache quieres crear otra que se llame mapasOffline, tendrás que cambiar ese 1 por un 2 y gestionar el evento de actualización
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('meteoCache')) {
                    db.createObjectStore('meteoCache');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    };

    const guardarEnCacheIDB = async (key, data) => {
        try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('meteoCache', 'readwrite');
                const store = tx.objectStore('meteoCache');
                store.put(data, key); // Guarda el objeto directo (super rápido, sin stringify)
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.error('Error guardando en BD offline', e);
            return false;
        }
    };

    const leerDeCacheIDB = async (key) => {
        try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('meteoCache', 'readonly');
                const store = tx.objectStore('meteoCache');
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Error leyendo de BD offline', e);
            return null;
        }
    };

    state.cacheStore = {
        guardarEnCacheIDB,
        initDB,
        leerDeCacheIDB,
    };
})(window);