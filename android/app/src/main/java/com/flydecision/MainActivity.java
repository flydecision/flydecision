package com.flydecision;

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