#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const configExamplePath = path.join(repoRoot, 'config.example.js');
const port = 4173;

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
        case '.css':
            return 'text/css; charset=utf-8';
        case '.html':
            return 'text/html; charset=utf-8';
        case '.js':
            return 'application/javascript; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.png':
            return 'image/png';
        case '.svg':
            return 'image/svg+xml';
        case '.webp':
            return 'image/webp';
        default:
            return 'application/octet-stream';
    }
}

function createStaticServer() {
    return http.createServer((request, response) => {
        const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
        let pathname = decodeURIComponent(requestUrl.pathname);

        if (pathname === '/') {
            pathname = '/index.html';
        }

        if (pathname === '/config.js') {
            const configContent = fs.readFileSync(configExamplePath, 'utf8');
            response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            response.end(configContent);
            return;
        }

        const safeRelativePath = pathname.replace(/^\/+/, '');
        const resolvedPath = path.resolve(srcRoot, safeRelativePath);

        if (!resolvedPath.startsWith(srcRoot)) {
            response.writeHead(403);
            response.end('Forbidden');
            return;
        }

        fs.readFile(resolvedPath, (error, buffer) => {
            if (error) {
                response.writeHead(404);
                response.end('Not found');
                return;
            }

            response.writeHead(200, { 'Content-Type': getContentType(resolvedPath) });
            response.end(buffer);
        });
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    const server = createStaticServer();
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];

    page.on('console', (message) => {
        if (message.type() === 'error') {
            consoleErrors.push(message.text());
        }
    });

    page.on('pageerror', (error) => {
        pageErrors.push(error.message || String(error));
    });

    page.on('requestfailed', (request) => {
        requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure() ? request.failure().errorText : 'requestfailed'}`);
    });

    try {
        await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });

        await page.waitForFunction(() => typeof window.construir_tabla === 'function', { timeout: 120000 });

        await page.waitForFunction(() => {
            const body = document.body;
            const tabla = document.getElementById('tabla');
            const hayFilas = tabla && tabla.querySelector('tbody tr');
            return Boolean(hayFilas || (body && body.classList.contains('modo-edicion-tabla')) || (window.bdGlobalDespegues && window.bdGlobalDespegues.length > 0));
        }, { timeout: 120000 });

        const baseline = await page.evaluate(async () => {
            const runtimeFunctions = [
                'alternardivDistancia',
                'filtroVerSoloFavoritos',
                'desmarcarFavoritos',
                'abrirFavoritos',
                'guardarFavoritos',
                'activarEdicionFavoritos',
                'sugerirGuiaFavoritos',
                'alternardivConfiguracion',
                'finalizarEdicionFavoritos',
                'alternarMostrarProbPrecipitacion',
                'alternarMostrarVientoAlturas',
                'alternarMostrarXC',
                'alternarHorasNoche',
                'alternarMostrarCizalladura',
                'alternarMostrarRafagosidad',
                'alternarAplicarCalibracion',
                'importarConfiguracion',
                'exportarConfiguracion',
                'btnRestablecerConfiguración',
                'sugerirGuiaPrincipal',
                'construir_tabla'
            ].map((name) => [name, typeof window[name]]);

            const exports = [
                'calcularIndicesPreferencia',
                'resetFiltroCondiciones',
                'resetFiltroDistancia',
                'abrirLinkExterno'
            ].map((name) => [name, typeof window[name]]);

            let calcularIndices = null;
            if (typeof window.calcularIndicesPreferencia === 'function') {
                calcularIndices = window.calcularIndicesPreferencia(null);
            }

            if (typeof window.resetFiltroCondiciones === 'function') {
                window.resetFiltroCondiciones(false);
            }

            if (typeof window.resetFiltroDistancia === 'function') {
                window.resetFiltroDistancia(false);
            }

            if (typeof window.construir_tabla === 'function') {
                await window.construir_tabla(false, true);
            }

            const tabla = document.getElementById('tabla');
            const rowCount = tabla && tabla.tBodies[0] ? tabla.tBodies[0].rows.length : 0;

            return {
                calcularIndices,
                exports,
                rowCount,
                runtimeFunctions,
            };
        });

        assert(baseline.runtimeFunctions.every(([, type]) => type === 'function'), 'Faltan funciones públicas en la app ejecutada');
        assert(baseline.exports.every(([, type]) => type === 'function'), 'Faltan exports públicos en window dentro de la app ejecutada');
        assert(Array.isArray(baseline.calcularIndices), 'calcularIndicesPreferencia(null) no devolvió un array válido');
        assert(baseline.rowCount >= 0, 'La tabla no devolvió un estado interpretable tras reconstrucción');
        assert(consoleErrors.length === 0, `Errores de consola detectados: ${consoleErrors.join(' | ')}`);
        assert(pageErrors.length === 0, `Errores de página detectados: ${pageErrors.join(' | ')}`);
        assert(requestFailures.length === 0, `Fallos de red detectados: ${requestFailures.join(' | ')}`);

        console.log('BROWSER_VALIDATION_OK');
    } finally {
        await page.close();
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
}

main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
});