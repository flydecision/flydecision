# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# =========================================================
# REGLAS DEFINITIVAS DE PROGUARD PARA CAPACITOR Y R8
# =========================================================

# 1. Proteger el núcleo de Capacitor y evitar advertencias
-keep class com.getcapacitor.** { *; }
-keep class capacitor.** { *; }
-dontwarn com.getcapacitor.**
-dontwarn capacitor.**

# 2. Mantener absolutamente TODOS los plugins de Capacitor
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.PluginHandle { *; }

# 3. MANTENER ANOTACIONES (Crucial para el puente JS -> Java)
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepattributes Signature
-keepattributes Exceptions

# 4. Evitar que R8 renombre métodos invocados desde JavaScript
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 5. Evitar que R8/shrinkResources borre iconos o recursos buscados por texto
-keepclassmembers class **.R$* {
    public static <fields>;
}