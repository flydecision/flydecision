package com.flydecision;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge; // Requiere dependencia en build.gradle
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Activar Edge-to-Edge ANTES de super.onCreate para que Android lo registre
        // Esto hace que la app se dibuje detrás de las barras de estado y navegación.
        EdgeToEdge.enable(this);

        super.onCreate(savedInstanceState);

        // 2. Forzar explícitamente la barra de navegación (y de estado) a transparente.
        // EdgeToEdge.enable() no siempre sobreescribe el color definido en el theme
        // (styles.xml / themes.xml), así que lo fijamos aquí a mano.
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);

        // 3. Evitar que el sistema añada su propia capa semitransparente de contraste
        // encima de la barra de navegación (y de estado). Sin esto, cada fabricante
        // decide su propio nivel de opacidad y por eso se ve distinto según el móvil.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10+
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        // Configuración del Zoom del WebView
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();

            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false); // Ocultar botones +/-
            settings.setSupportZoom(true);
        }
    }
}