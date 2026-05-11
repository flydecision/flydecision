// js/i18n-setup.js

// 1. Configuración inicial del motor i18next
document.addEventListener("DOMContentLoaded", () => {
    
    i18next
        .use(i18nextHttpBackend)           // Permite cargar archivos .json externos
        .use(i18nextBrowserLanguageDetector) // Detecta el idioma del navegador o el guardado en memoria
        .init({
            fallbackLng: 'es',
            load: 'languageOnly',       // ← 'en' o 'en-US' mapea a 'en-GB'
            debug: false,                  
            backend: { 
                loadPath: 'locales/{{lng}}.json' // Buscará literalmente 'es-ES.json' o 'en-GB.json'
            }, 
            interpolation: { 
                escapeValue: false         // Permite HTML en los archivos de traducción
            }, 
            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage'] 
            }
        })
        .then(() => {
            // Creamos función de traducción global 't' 
            window.t = i18next.t;
            
            // Traducimos los elementos estáticos del HTML
            traducirHTML();

            // MARCAR EL RADIO BUTTON DEL IDIOMA ACTUAL
            // Ahora la variable guarda 'es-ES' o 'en-GB' completos
            const langActual = i18next.language; 
            const radio = document.querySelector(`input[name="selector-idioma"][value="${langActual}"]`);
            if (radio) radio.checked = true;

            // 🔥 LANZAMOS EL EVENTO PARA ARRANCAR METEO.JS
            document.dispatchEvent(new Event('i18nReady'));
        })
        .catch((err) => {
            console.error("Error cargando el motor de idiomas (probablemente offline):", err);
            // Salva la app: aunque falle el idioma, dile a meteo.js que arranque ya
            document.dispatchEvent(new Event('i18nReady'));
        });
});

/**
 * Recorre el DOM buscando etiquetas con el atributo [data-i18n]
 */
function traducirHTML() {
    const elementos = document.querySelectorAll('[data-i18n]');
    elementos.forEach(el => {
        const data = el.getAttribute('data-i18n');
        
        // Soporte para múltiples traducciones (separadas por ;) y atributos (usando [])
        const partes = data.split(';');
        
        partes.forEach(parte => {
            const attrMatch = parte.match(/^\[(.+)\](.*)$/);
            if (attrMatch) {
                // Es un atributo: [title]clave
                const attr = attrMatch[1];
                const clave = attrMatch[2];
                el.setAttribute(attr, i18next.t(clave));
            } else {
                // Es contenido normal
                el.innerHTML = i18next.t(parte);
            }
        });
    });

    // Soporte extra para Tippy (si usas atributos personalizados)
    const tippyElems = document.querySelectorAll('[data-tippy-content-i18n]');
    tippyElems.forEach(el => {
        const clave = el.getAttribute('data-tippy-content-i18n');
        el.setAttribute('data-tippy-content', i18next.t(clave));
    });
}

/**
 * Función global para cambiar el idioma manualmente
 * @param {string} lng - El código del idioma: 'es-ES' o 'en-GB'
 */
window.cambiarIdioma = function(lng) {
    i18next.changeLanguage(lng).then(() => {
        // Guardamos la preferencia manualmente
        localStorage.setItem('i18nextLng', lng);
        
        // Recargamos para aplicar el idioma a toda la app
        location.reload(); 
    });
};