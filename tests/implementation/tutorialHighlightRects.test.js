import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { HexMap, Layout } from '../../src/map.js';
import { calculateTutorialHighlightRect } from '../../src/tutorialHighlightRects.js';

function setDevicePixelRatio(value) {
    Object.defineProperty(window, 'devicePixelRatio', {
        value,
        configurable: true
    });
}

function createGame() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getBoundingClientRect = () => ({
        top: 10,
        left: 20,
        width: 400,
        height: 300,
        right: 420,
        bottom: 310
    });

    const map = new HexMap(3, 'mini');
    const layout = new Layout(12, { x: 200, y: 150 });

    return { canvas, map, layout, lastMoveHex: map.mainHexes[0] };
}

function expectViewportRectMatchesLogicalRect(rect, logicalRect) {
    expect(rect.top).toBeCloseTo(10 + logicalRect.top);
    expect(rect.left).toBeCloseTo(20 + logicalRect.left);
    expect(rect.width).toBeCloseTo(logicalRect.width);
    expect(rect.height).toBeCloseTo(logicalRect.height);
}

function calculateProjectedTopFaceBounds(hex, layout) {
    const heightOffset = Math.abs(hex.visualHeight) * layout.size * 0.12;
    const vertices = layout.getPolygonVertices(hex).map(vertex => ({
        x: vertex.x,
        y: vertex.y - heightOffset
    }));
    const xs = vertices.map(vertex => vertex.x);
    const ys = vertices.map(vertex => vertex.y);

    return {
        top: Math.min(...ys),
        left: Math.min(...xs),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
    };
}

describe('Tutorial highlight rect calculation', () => {
    beforeEach(() => {
        setDevicePixelRatio(2);
        document.body.innerHTML = '<button id="help-btn">HELP</button>';
    });

    afterEach(() => {
        setDevicePixelRatio(1);
    });

    test('map-all uses CSS pixel coordinates under high DPR', () => {
        const game = createGame();
        const rect = calculateTutorialHighlightRect({ targetType: 'map-all' }, game);

        const xs = [];
        const ys = [];
        game.map.mainHexes.forEach(hex => {
            const center = game.layout.hexToPixel(hex);
            const halfWidth = game.layout.size * Math.sqrt(3) / 2;
            xs.push(center.x - halfWidth, center.x + halfWidth);
            ys.push(center.y - game.layout.size, center.y + game.layout.size);
        });

        expectViewportRectMatchesLogicalRect(rect, {
            top: Math.min(...ys),
            left: Math.min(...xs),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
        });
    });

    test('canvas target types share the same CSS pixel conversion', () => {
        const game = createGame();
        const overflowedHex = game.map.mainHexes.find(hex => !hex.isDisabled);
        overflowedHex.height = 10;
        overflowedHex.visualHeight = 10;

        const targets = ['tapped-hex-area', 'burst-hex', 'p1-hand', 'p1-indicator'];
        targets.forEach(targetType => {
            const rect = calculateTutorialHighlightRect({ targetType }, game);
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
            expect(Number.isFinite(rect.left)).toBe(true);
            expect(Number.isFinite(rect.top)).toBe(true);
        });
    });

    test('single grid highlights use projected top face bounds without column sides', () => {
        const game = createGame();
        const hex = game.map.mainHexes.find(hex => !hex.isDisabled);
        game.lastMoveHex = hex;
        hex.height = 12;
        hex.visualHeight = 12;

        const rect = calculateTutorialHighlightRect({ targetType: 'tapped-hex-area' }, game);

        expectViewportRectMatchesLogicalRect(rect, calculateProjectedTopFaceBounds(hex, game.layout));
    });

    test('dom-element target bypasses canvas DPR conversion', () => {
        const game = createGame();
        const helpButton = document.getElementById('help-btn');
        helpButton.getBoundingClientRect = () => ({
            top: 7,
            left: 11,
            width: 44,
            height: 22
        });

        expect(calculateTutorialHighlightRect({
            elementId: 'help-btn',
            targetType: 'dom-element'
        }, game)).toEqual({
            top: 7,
            left: 11,
            width: 44,
            height: 22
        });
    });
});
