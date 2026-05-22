const HEX_WIDTH_RATIO = Math.sqrt(3);
const UNIT_THICKNESS_RATIO = 0.12;

function getCanvasMetrics(canvas) {
    const canvasRect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width ? canvas.width / dpr : canvasRect.width;
    const logicalHeight = canvas.height ? canvas.height / dpr : canvasRect.height;

    return {
        canvasRect,
        scaleX: logicalWidth ? canvasRect.width / logicalWidth : 1,
        scaleY: logicalHeight ? canvasRect.height / logicalHeight : 1
    };
}

function toViewportRect(metrics, rect) {
    return {
        top: metrics.canvasRect.top + rect.top * metrics.scaleY,
        left: metrics.canvasRect.left + rect.left * metrics.scaleX,
        width: rect.width * metrics.scaleX,
        height: rect.height * metrics.scaleY
    };
}

function calculateHexBounds(hexes, layout, includeHeight) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const hexRadius = layout.size;
    const hexWidth = hexRadius * HEX_WIDTH_RATIO;
    const hexHeight = hexRadius * 2;
    const unitThickness = hexRadius * UNIT_THICKNESS_RATIO;

    hexes.forEach(hex => {
        const center = layout.hexToPixel(hex);
        const heightOffset = includeHeight ? Math.abs(hex.visualHeight) * unitThickness : 0;

        const left = center.x - hexWidth / 2;
        const right = center.x + hexWidth / 2;
        const top = center.y - heightOffset - hexHeight / 2;
        const bottom = center.y + hexHeight / 2;

        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
    });

    return {
        top: minY,
        left: minX,
        width: maxX - minX,
        height: maxY - minY
    };
}

function calculateSingleHexRect(hex, layout) {
    const heightOffset = Math.abs(hex.visualHeight) * layout.size * UNIT_THICKNESS_RATIO;
    const vertices = layout.getPolygonVertices(hex).map(vertex => ({
        x: vertex.x,
        y: vertex.y - heightOffset
    }));
    const xs = vertices.map(vertex => vertex.x);
    const ys = vertices.map(vertex => vertex.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        top: minY,
        left: minX,
        width: maxX - minX,
        height: maxY - minY
    };
}

function calculateP1IndicatorRect(game) {
    const center = game.map.centers['hand-p1'];
    if (!center) return null;

    const pos = game.layout.hexToPixel({ q: center.q, r: center.r });
    const size = game.layout.size;
    const fontSize = Math.max(20, size);
    const textX = pos.x + size * 2.5;
    const dotY = pos.y + fontSize * 0.9;
    const dotSpacing = 14;
    const maxDots = 7.2;

    return {
        top: dotY - 10,
        left: textX - 10,
        width: maxDots * dotSpacing + 20,
        height: 20
    };
}

export function calculateTutorialHighlightRect(highlight, game) {
    if (highlight.elementId && highlight.elementId !== 'game-canvas') {
        const el = document.getElementById(highlight.elementId);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
    }

    if (!game || !game.canvas || !game.layout || !game.map) return null;

    const metrics = getCanvasMetrics(game.canvas);
    const targetType = highlight.targetType;

    if (targetType === 'map-all') {
        const mainHexes = game.map.mainHexes;
        if (!mainHexes || mainHexes.length === 0) {
            return {
                top: metrics.canvasRect.top,
                left: metrics.canvasRect.left,
                width: metrics.canvasRect.width,
                height: metrics.canvasRect.height
            };
        }
        return toViewportRect(metrics, calculateHexBounds(mainHexes, game.layout, false));
    }

    if (targetType === 'tapped-hex-area') {
        if (!game.lastMoveHex) return null;
        return toViewportRect(metrics, calculateSingleHexRect(game.lastMoveHex, game.layout));
    }

    if (targetType === 'burst-hex') {
        const overflowedHex = game.map.mainHexes.find(hex => Math.abs(hex.height) > 9);
        if (!overflowedHex) return null;
        return toViewportRect(metrics, calculateSingleHexRect(overflowedHex, game.layout));
    }

    if (targetType === 'p1-hand') {
        const handHexes = game.map.hexes.filter(hex => hex.zone === 'hand-p1');
        if (!handHexes || handHexes.length === 0) return null;
        return toViewportRect(metrics, calculateHexBounds(handHexes, game.layout, true));
    }

    if (targetType === 'p1-indicator') {
        const rect = calculateP1IndicatorRect(game);
        return rect ? toViewportRect(metrics, rect) : null;
    }

    return null;
}
