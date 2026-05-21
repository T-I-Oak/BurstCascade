import { Utils } from './utils.js';

/**
 * マウス、タッチ、キーボード等の入力を担当するクラス
 */
export class InputHandler {
    constructor(game) {
        this.game = game;
    }

    init() {
        const g = this.game;
        const canvas = g.canvas;

        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('pointerup', (e) => this.handleClick(e));

        // タッチ操作対応
        g.isTouchDevice = false;
        g.isTouchMoved = false;

        canvas.addEventListener('touchstart', (e) => {
            g.isTouchDevice = true;
            g.isTouchMoved = false;
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

        this.initGestureHandler();
    }

    handleMouseMove(e) {
        const g = this.game;
        if (g.isTouchDevice && e.pointerType !== 'mouse') return;

        const rect = g.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const nextHovered = this.findHexAt(mouseX, mouseY);
        if (g.hoveredHex !== nextHovered) {
            g.hoveredHex = nextHovered;
            g.hoveredNeighbors = [];

            if (g.hoveredHex && g.hoveredHex.zone === 'main' && g.hoveredHex.owner === g.currentPlayer) {
                this.updateHoveredNeighbors(g.hoveredHex);
            }
        }
    }

    handleTouchMove(e) {
        const g = this.game;
        g.isTouchDevice = true;
        g.isTouchMoved = true;
        if (e.cancelable) e.preventDefault();

        const rect = g.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const nextHovered = this.findHexAt(x, y);
        if (g.hoveredHex !== nextHovered) {
            g.hoveredHex = nextHovered;
            g.hoveredNeighbors = [];

            if (g.hoveredHex && g.hoveredHex.zone === 'main' && g.hoveredHex.owner === g.currentPlayer) {
                this.updateHoveredNeighbors(g.hoveredHex);
            }
        }
    }

    handleClick(e) {
        const g = this.game;
        if (g.gameOver || g.isProcessingMove || g.isAIThinking || g.coinToss.active || g.currentPlayer === 0) return;
        if (window.tutorialManager && window.tutorialManager.isShowing) return;

        const rect = g.canvas.getBoundingClientRect();
        const mouseX = (e.isSimulated ? e.clientX : (e.clientX || (e.touches && e.touches[0].clientX))) - rect.left;
        const mouseY = (e.isSimulated ? e.clientY : (e.clientY || (e.touches && e.touches[0].clientY))) - rect.top;

        const hex = e.isSimulated ? e.simulatedHex : this.findHexAt(mouseX, mouseY);

        if (hex && hex.zone === 'main') {
            if (hex.isDisabled) return;
            if (hex.owner !== g.currentPlayer) return;

            const isTouch = (e.pointerType === 'touch' || g.isTouchDevice) && e.pointerType !== 'mouse';

            if (!e.isSimulated && isTouch) {
                if (g.isTouchMoved) {
                    g.isTouchMoved = false;
                    g.selectedHex = hex;
                    g.hoveredHex = hex;
                    this.updateHoveredNeighbors(hex);
                    g.sound.playPlace();
                    return;
                }

                if (g.selectedHex !== hex) {
                    g.selectedHex = hex;
                    g.hoveredHex = hex;
                    this.updateHoveredNeighbors(hex);
                    g.sound.playPlace();
                    return;
                }
            }

            g.sound.playPlace();
            g.selectedHex = null;
            g.achievementManager.stats[g.currentPlayer].actions.add(1);
            g.triggerDropSequence(hex);
        }
    }

    updateHoveredNeighbors(hex) {
        const g = this.game;
        g.hoveredNeighbors = [];
        if (hex && hex.zone === 'main' && hex.owner === g.currentPlayer) {
            const directions = [
                { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
            ];
            directions.forEach(dir => {
                const neighbor = g.map.getHexAt(hex.q + dir.q, hex.r + dir.r, 'main');
                if (neighbor) g.hoveredNeighbors.push(neighbor);
            });
        }
    }

    findHexAt(mx, my) {
        const g = this.game;
        const sortedHexes = [...g.map.hexes].sort((a, b) => {
            const zA = a.q + a.r;
            const zB = b.q + b.r;
            if (zA !== zB) return zB - zA;
            return b.r - a.r;
        });

        for (const hex of sortedHexes) {
            const unitThickness = g.layout.size * 0.12;
            const h = Math.abs(hex.height) * unitThickness;
            const vertices = g.layout.getPolygonVertices(hex);
            const topVertices = vertices.map(v => ({ x: v.x, y: v.y - h }));

            if (Utils.isPointInPolygon(mx, my, topVertices)) {
                if (hex.isDisabled) return null;
                return hex;
            }
        }
        return null;
    }

    initGestureHandler() {
        const g = this.game;
        const primeEvents = ['touchstart', 'pointerdown'];
        const resumeEvents = ['touchend', 'pointerup', 'mousedown', 'keydown', 'click'];
        const gestureEvents = [...new Set([...primeEvents, ...resumeEvents])];
        const listenerOptions = { capture: true };

        const removeGestureListeners = () => {
            gestureEvents.forEach(evt => {
                document.removeEventListener(evt, handleFirstGesture, listenerOptions);
            });
        };

        const handleFirstGesture = (e) => {
            if (!g.sound) return;
            if (g.sound.ctx && g.sound.ctx.state === 'running') {
                removeGestureListeners();
                g.audioActivated = true;
                return;
            }

            if (primeEvents.includes(e.type) && !g.sound.ctx) {
                g.sound.primeFromUserGesture();
            }

            g.sound.activateFromUserGesture().then(() => {
                if (!g.sound.ctx || g.sound.ctx.state !== 'running') return;
                removeGestureListeners();
                g.audioActivated = true;
                if (g.sound.isPlaying && g.sound.currentPattern) {
                    g.sound.startBgm(g.sound.currentPattern);
                } else if (!g.gameMode && !window.IS_TESTING) {
                    g.sound.startBgm('title');
                }
            });
        };

        gestureEvents.forEach(evt => {
            document.addEventListener(evt, handleFirstGesture, listenerOptions);
        });
    }
}
