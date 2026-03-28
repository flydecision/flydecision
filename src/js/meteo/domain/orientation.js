(function(window) {
    const root = window.FlyDecisionMeteo = window.FlyDecisionMeteo || {};
    const domain = root.domain = root.domain || {};

    if (domain.orientation) {
        return;
    }

    function createOrientationSVG(orientacionesStr) {
        const ALL_SEGMENTS = [
            'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
            'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'
        ];

        const size = 23;
        const radius = 8;
        const strokeWidth = 1;
        const colorBorde = '#666';
        const colorFondoInactivo = 'white';
        const colorSegmentoActivo = '#19ed86';

        const activeOrientations = new Set(
            (orientacionesStr || '').split(',').map((segment) => segment.trim())
        );

        let svg = `<svg width="${size}" height="${size}" viewBox="-10 -10 20 20" style="vertical-align: middle; display:inline-block; transform: rotate(-90deg);">`;
        svg += `<circle cx="0" cy="0" r="${radius}" fill="${colorFondoInactivo}" stroke="${colorBorde}" stroke-width="${strokeWidth}" />`;

        const AXIS_ANGLE = 360 / ALL_SEGMENTS.length;
        const SEGMENT_WIDTH = 45;
        const HALF_SEGMENT = SEGMENT_WIDTH / 2;
        const toRadians = (angle) => angle * Math.PI / 180;

        ALL_SEGMENTS.forEach((segmentName, index) => {
            if (activeOrientations.has(segmentName)) {
                const centerAngle = index * AXIS_ANGLE;
                const startAngle = centerAngle - HALF_SEGMENT;
                const endAngle = centerAngle + HALF_SEGMENT;

                const x1 = radius * Math.cos(toRadians(startAngle));
                const y1 = radius * Math.sin(toRadians(startAngle));
                const x2 = radius * Math.cos(toRadians(endAngle));
                const y2 = radius * Math.sin(toRadians(endAngle));

                svg += `<polygon points="0,0 ${x1},${y1} ${x2},${y2}" fill="${colorSegmentoActivo}" />`;
            }
        });

        svg += '</svg>';
        return svg;
    }

    domain.orientation = {
        createOrientationSVG,
    };
})(window);