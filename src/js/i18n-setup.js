// js/i18n-setup.js

// 1. Configuración inicial del motor i18next
document.addEventListener("DOMContentLoaded", () => {
    
    i18next
        .use(i18nextHttpBackend)           // Permite cargar archivos .json externos
        .use(i18nextBrowserLanguageDetector) // Detecta el idioma del navegador o el guardado en memoria
        .init({
            fallbackLng: 'es',             // Si no encuentra el idioma del usuario, usa español
            debug: false,                  // Cambia a true para ver errores de carga en la consola
            backend: {
                // Ruta a tus archivos de idiomas. {{lng}} se sustituye por 'es' o 'en'
                loadPath: 'locales/{{lng}}.json' 
            },
             interpolation: { escapeValue: false }, // Permite HTML en los archivos de traducción y los interpreta como tales. No escapar caracteres HTML
            detection: {
                // Prioridad de detección: 1º lo que eligió el usuario, 2º el navegador
                order: ['localStorage', 'navigator'],
                lookupLocalStorage: 'METEO_I18NEXTLNG', // <--- Nombre personalizado
                caches: ['localStorage'] // Guarda la elección del usuario en localStorage
            }
        })
        .then(() => {
            // Creamos función de traducción global 't' para que sea cómodo de usar en meteo.js (es un atajo de i18next.t)
            window.t = i18next.t;
            
            // Traducimos los elementos estáticos del HTML
            traducirHTML();

            // MARCAR EL RADIO BUTTON DEL IDIOMA ACTUAL
            const langActual = i18next.language.split('-')[0]; // Coge 'es' de 'es-ES'
            const radio = document.querySelector(`input[name="selector-idioma"][value="${langActual}"]`);
            if (radio) radio.checked = true;

            // 🔥 LANZAMOS EL EVENTO PARA ARRANCAR METEO.JS
            // Esto garantiza que meteo.js no pinte la tabla hasta que los idiomas estén listos
            document.dispatchEvent(new Event('i18nReady'));
        })
        .catch((err) => {
            console.error("Error cargando el motor de idiomas:", err);
        });
});

/**
 * Recorre el DOM buscando etiquetas con el atributo [data-i18n]
 * Ejemplo: <span data-i18n="menu.inicio"></span> -> <span>Inicio</span>
 */
function traducirHTML() {
    const elementos = document.querySelectorAll('[data-i18n]');
    elementos.forEach(el => {
        const data = el.getAttribute('data-i18n');
        
        // Soporte para múltiples traducciones (separadas por ;) y atributos (usando [])
        // Ejemplo: data-i18n="[title]ayuda;texto_boton"
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
 * @param {string} lng - El código del idioma: 'es' o 'en'
 */
window.cambiarIdioma = function(lng) {
    i18next.changeLanguage(lng).then(() => {
        // Guardamos la preferencia manualmente con la clave que usa el detector
        localStorage.setItem('METEO_I18NEXTLNG', lng);
        
        // Lo más fiable en aplicaciones Vanilla JS es recargar la página.
        // Esto limpia memorias y reinicia meteo.js con los nuevos textos.
        location.reload(); 
    });
};