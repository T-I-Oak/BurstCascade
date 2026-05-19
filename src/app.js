import { Game } from './main.js';
import { HowToPlayRenderer } from './howToPlay.js';
import { TutorialManager } from './tutorialManager.js';
import defaultScenarios from './data/tutorial_scenarios.json';
import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';

window.addEventListener('load', () => {
    // ホットリロードや残りカスによるUI表示の競合を完全に防ぐ初期化 (No.06)
    const initTooltip = document.getElementById('tutorial-tooltip');
    if (initTooltip) initTooltip.classList.add('hidden');
    const initMask = document.getElementById('tutorial-mask-canvas');
    if (initMask) initMask.classList.add('hidden');

    window.game = new Game();
    window.howToPlay = new HowToPlayRenderer();

    const migrationMap = {
        init: () => 0
    };
    const savedIndex = DataManager.getSavedData('burst-cascade-tutorial-index', migrationMap);
    window.tutorialManager = new TutorialManager(defaultScenarios, {
        initialScenarioIndex: savedIndex,
        defaultPadding: 10,
        onSaveIndex: (index) => {
            DataManager.setSavedData('burst-cascade-tutorial-index', index);
        },
        onTriggerCondition: (triggerName, context) => {
            const g = context && context.game;
            if (!g || !g.gameMode) return false;
            if (triggerName === 'turnStart' || triggerName === 'afterInject' || triggerName === 'burst') {
                return g.currentPlayer === 1;
            }
            return false;
        },
        onCalculateRect: (hl) => {
            // game-canvas以外の任意のDOM要素が指定された場合は、その位置・サイズを直接返す
            if (hl.elementId && hl.elementId !== 'game-canvas') {
                const el = document.getElementById(hl.elementId);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    return {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    };
                }
            }

            const g = window.game;
            if (!g || !g.canvas) return null;
            const canvasRect = g.canvas.getBoundingClientRect();

            if (hl.targetType === 'map-all') {
                const mainHexes = g.map && g.map.mainHexes;
                if (!mainHexes || mainHexes.length === 0) {
                    return {
                        top: canvasRect.top,
                        left: canvasRect.left,
                        width: canvasRect.width,
                        height: canvasRect.height
                    };
                }

                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;

                mainHexes.forEach(hex => {
                    const center = g.layout.hexToPixel(hex);
                    const hexRadius = g.layout.size;
                    const hexWidth = hexRadius * Math.sqrt(3);
                    const hexHeight = hexRadius * 2;

                    const left = center.x - hexWidth / 2;
                    const right = center.x + hexWidth / 2;
                    const top = center.y - hexHeight / 2;
                    const bottom = center.y + hexHeight / 2;

                    if (left < minX) minX = left;
                    if (right > maxX) maxX = right;
                    if (top < minY) minY = top;
                    if (bottom > maxY) maxY = bottom;
                });

                const scaleX = canvasRect.width / g.canvas.width;
                const scaleY = canvasRect.height / g.canvas.height;

                return {
                    top: canvasRect.top + minY * scaleY,
                    left: canvasRect.left + minX * scaleX,
                    width: (maxX - minX) * scaleX,
                    height: (maxY - minY) * scaleY
                };
            }
            if (hl.targetType === 'tapped-hex-area') {
                const targetHex = g.lastMoveHex;
                if (!targetHex) return null;
                const pixel = g.layout.hexToPixel(targetHex);
                const unitThickness = g.layout.size * 0.12;
                const h = Math.abs(targetHex.visualHeight) * unitThickness;
                const size = g.layout.size;
                return {
                    top: canvasRect.top + pixel.y - h - size,
                    left: canvasRect.left + pixel.x - size,
                    width: size * 2,
                    height: size * 2 + h // 隆起によって縦方向に伸びたヘックス全体を正確にバウンディングボックスに含める
                };
            }
            if (hl.targetType === 'burst-hex') {
                const overflowedHex = g.map && g.map.mainHexes.find(h => Math.abs(h.height) > 9);
                if (!overflowedHex) return null;

                const pixel = g.layout.hexToPixel(overflowedHex);
                const hexRadius = g.layout.size;
                const unitThickness = hexRadius * 0.12;
                const h = Math.abs(overflowedHex.visualHeight) * unitThickness;
                const size = g.layout.size;

                const scaleX = canvasRect.width / g.canvas.width;
                const scaleY = canvasRect.height / g.canvas.height;

                return {
                    top: canvasRect.top + (pixel.y - h - size) * scaleY,
                    left: canvasRect.left + (pixel.x - size) * scaleX,
                    width: size * 2 * scaleX,
                    height: (size * 2 + h) * scaleY
                };
            }
            if (hl.targetType === 'p1-hand') {
                const handZoneId = 'hand-p1';
                const handHexes = g.map && g.map.hexes.filter(h => h.zone === handZoneId);
                if (!handHexes || handHexes.length === 0) return null;

                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;

                const hexRadius = g.layout.size;
                const hexWidth = hexRadius * Math.sqrt(3);
                const hexHeight = hexRadius * 2;
                const unitThickness = hexRadius * 0.12;

                handHexes.forEach(hex => {
                    const center = g.layout.hexToPixel(hex);
                    const h = Math.abs(hex.visualHeight) * unitThickness;

                    const left = center.x - hexWidth / 2;
                    const right = center.x + hexWidth / 2;
                    const top = center.y - h - hexHeight / 2;
                    const bottom = center.y + hexHeight / 2;

                    if (left < minX) minX = left;
                    if (right > maxX) maxX = right;
                    if (top < minY) minY = top;
                    if (bottom > maxY) maxY = bottom;
                });

                const scaleX = canvasRect.width / g.canvas.width;
                const scaleY = canvasRect.height / g.canvas.height;

                return {
                    top: canvasRect.top + minY * scaleY,
                    left: canvasRect.left + minX * scaleX,
                    width: (maxX - minX) * scaleX,
                    height: (maxY - minY) * scaleY
                };
            }
            if (hl.targetType === 'p1-indicator') {
                const handZoneId = 'hand-p1';
                const center = g.map.centers[handZoneId];
                if (!center) return null;
                const pos = g.layout.hexToPixel({ q: center.q, r: center.r });
                const size = g.layout.size;

                const fontSize = Math.max(20, size * 1.0);
                const marginX = size * 2.5;
                const textX = pos.x + marginX; // align === 'left'

                // インジケータードットの座標 (renderer.js _drawChainDots と完全一致)
                const dotY = pos.y + fontSize * 0.9;
                const dotSpacing = 14;
                const maxDots = 7.2; // ドット全体の範囲を包含
                const indicatorWidth = maxDots * dotSpacing;

                // 上部のテキストを除外して、インジケータードットの並び（ライン部分）のみをハイライト
                const left = textX - 10;
                const top = dotY - 10;
                const width = indicatorWidth + 20;
                const height = 20;

                const scaleX = canvasRect.width / g.canvas.width;
                const scaleY = canvasRect.height / g.canvas.height;

                return {
                    top: canvasRect.top + top * scaleY,
                    left: canvasRect.left + left * scaleX,
                    width: width * scaleX,
                    height: height * scaleY
                };
            }
            return null;
        },
        onActionResume: () => {
            const g = window.game;
            if (g && g.pendingAction) {
                const action = g.pendingAction;
                g.pendingAction = null;
                action();
            }
        }
    });

    // チュートリアルの「OK」ボタンクリックイベントのバインド
    const nextBtn = document.getElementById('tutorial-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (window.tutorialManager) {
                window.tutorialManager.advanceScenario();
            }
        });
    }

    // チュートリアル「チェックボックス」に基づくリセット制御のイベントバインド
    const helpCloseBtn = document.getElementById('help-close-btn');
    const helpBackBtn = document.getElementById('help-bottom-back-btn');
    const resetCheckbox = document.getElementById('tutorial-reset-checkbox');

    const checkAndResetTutorial = () => {
        if (resetCheckbox && resetCheckbox.checked) {
            if (window.tutorialManager) {
                window.tutorialManager.resetTutorial();
            }
            resetCheckbox.checked = false; // オフに戻す
        }
    };

    if (helpCloseBtn) {
        helpCloseBtn.addEventListener('click', checkAndResetTutorial);
    }
    if (helpBackBtn) {
        helpBackBtn.addEventListener('click', checkAndResetTutorial);
    }
});
