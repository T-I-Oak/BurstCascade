import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TutorialManager } from '../../src/tutorialManager.js';

// テスト用のシンプルなシナリオモックデータ
const mockScenarios = [
  {
    "trigger": "turnStart",
    "title": "Welcome to Burst Cascade",
    "pages": [
      {
        "message": "Page 1 Message",
        "highlight": [
          { "targetType": "map-all", "shape": "rect" }
        ]
      },
      {
        "message": "Page 2 Message",
        "highlight": [
          { "targetType": "p1-initial-hex", "shape": "circle" }
        ]
      }
    ]
  },
  {
    "trigger": "afterInject",
    "title": "Energy Injected!",
    "pages": [
      {
        "message": "Tap Action Page Message",
        "highlight": [
          { "targetType": "tapped-hex-area", "shape": "circle" }
        ]
      }
    ]
  }
];

describe('TutorialManager Module (Portable Generic Engine)', () => {
    let tutorialManager;
    let mockOptions;
    let mockCtx;

    beforeEach(() => {
        // requestAnimationFrame を同期的に実行するモックを設定
        vi.stubGlobal('requestAnimationFrame', (callback) => callback());

        // Canvasの2Dコンテキストのモック設定
        mockCtx = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            arc: vi.fn(),
            ellipse: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            createRadialGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            shadowColor: '',
            shadowBlur: 0,
            globalCompositeOperation: '',
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0
        };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);

        // DOMのモック設定
        document.body.innerHTML = `
            <canvas id="tutorial-mask-canvas" class="hidden"></canvas>
            <div id="tutorial-tooltip" class="hidden">
                <div class="tooltip-arrow"></div>
                <div class="tooltip-content">
                    <h3 id="tutorial-title"></h3>
                    <p id="tutorial-message"></p>
                    <div class="tooltip-actions">
                        <button id="tutorial-next-btn">OK</button>
                    </div>
                </div>
            </div>
        `;

        // 汎用委譲ハンドラのモック設定
        mockOptions = {
            onTriggerCondition: vi.fn((triggerName, context) => {
                // テスト用のシンプルな条件判定
                if (triggerName === 'turnStart') {
                    return context && context.game && context.game.currentPlayer === 1;
                }
                if (triggerName === 'afterInject') {
                    return context && context.game && context.game.currentPlayer === 1;
                }
                return false;
            }),
            onCalculateRect: vi.fn((hl) => {
                // ダミーの矩形座標を返す
                if (hl.targetType === 'map-all') {
                    return { top: 10, left: 20, width: 300, height: 200 };
                }
                return { top: 50, left: 60, width: 80, height: 80 };
            }),
            onActionResume: vi.fn(),
            onSaveIndex: vi.fn()
        };
        
        tutorialManager = new TutorialManager(mockScenarios, mockOptions);
    });

    test('Initial states should be correct', () => {
        expect(tutorialManager.currentScenarioIndex).toBe(0);
        expect(tutorialManager.currentPageIndex).toBe(0);
        expect(tutorialManager.isShowing).toBe(false);
        expect(tutorialManager.scenarios.length).toBe(2);
        expect(tutorialManager.defaultPadding).toBe(0);
    });

    test('checkTrigger should delegate condition check to onTriggerCondition handler', () => {
        const mockGameContext = { game: { currentPlayer: 2 } };

        // Player 2 のターン時は、ハンドラが false を返してトリガーしない
        const p2Triggered = tutorialManager.checkTrigger('turnStart', mockGameContext);
        expect(mockOptions.onTriggerCondition).toHaveBeenCalledWith('turnStart', mockGameContext);
        expect(p2Triggered).toBe(false);
        expect(tutorialManager.isShowing).toBe(false);

        // Player 1 のターン時は、ハンドラが true を返してトリガー起動
        const p1GameContext = { game: { currentPlayer: 1 } };
        const p1Triggered = tutorialManager.checkTrigger('turnStart', p1GameContext);
        expect(mockOptions.onTriggerCondition).toHaveBeenCalledWith('turnStart', p1GameContext);
        expect(p1Triggered).toBe(true);
        expect(tutorialManager.isShowing).toBe(true);
        
        // 吹き出しのタイトル・メッセージが正しく反映されていること
        const titleEl = document.getElementById('tutorial-title');
        const msgEl = document.getElementById('tutorial-message');
        expect(titleEl.textContent).toBe('Welcome to Burst Cascade');
        expect(msgEl.textContent).toBe('Page 1 Message');

        // ハイライトの座標計算ハンドラが呼ばれていること
        expect(mockOptions.onCalculateRect).toHaveBeenCalled();
    });

    test('advanceScenario should flip page and delegate coordinate calculation', () => {
        const p1GameContext = { game: { currentPlayer: 1 } };
        tutorialManager.checkTrigger('turnStart', p1GameContext);

        expect(tutorialManager.currentPageIndex).toBe(0);
        expect(tutorialManager.isShowing).toBe(true);

        // ページめくり実行 (Page 1 ➔ Page 2)
        tutorialManager.advanceScenario();
        expect(tutorialManager.currentPageIndex).toBe(1);
        expect(tutorialManager.currentScenarioIndex).toBe(0);
        expect(tutorialManager.isShowing).toBe(true);

        const msgEl = document.getElementById('tutorial-message');
        expect(msgEl.textContent).toBe('Page 2 Message');

        // 2ページ目のハイライト座標計算が呼ばれていること
        expect(mockOptions.onCalculateRect).toHaveBeenLastCalledWith({ "targetType": "p1-initial-hex", "shape": "circle" });
    });

    test('advanceScenario should complete scenario and fire onActionResume callback', () => {
        const p1GameContext = { game: { currentPlayer: 1 } };
        tutorialManager.checkTrigger('turnStart', p1GameContext);

        // Page 1 ➔ Page 2
        tutorialManager.advanceScenario();
        
        // Page 2 ➔ 終了 (次のシナリオへ進み、非表示化、かつ再開ハンドラが呼ばれること)
        tutorialManager.advanceScenario();
        expect(tutorialManager.currentPageIndex).toBe(0);
        expect(tutorialManager.currentScenarioIndex).toBe(1);
        expect(tutorialManager.isShowing).toBe(false);

        expect(mockOptions.onActionResume).toHaveBeenCalledTimes(1);

        const tooltipEl = document.getElementById('tutorial-tooltip');
        expect(tooltipEl.classList.contains('hidden')).toBe(true);

        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        expect(maskCanvas.classList.contains('hidden')).toBe(true);
    });

    test('resetTutorial should restore state back to zero and hide elements', () => {
        tutorialManager.currentScenarioIndex = 1;
        tutorialManager.currentPageIndex = 1;
        tutorialManager.isShowing = true;

        tutorialManager.resetTutorial();

        expect(tutorialManager.currentScenarioIndex).toBe(0);
        expect(tutorialManager.currentPageIndex).toBe(0);
        expect(tutorialManager.isShowing).toBe(false);

        const tooltipEl = document.getElementById('tutorial-tooltip');
        expect(tooltipEl.classList.contains('hidden')).toBe(true);

        const maskCanvas = document.getElementById('tutorial-mask-canvas');
        expect(maskCanvas.classList.contains('hidden')).toBe(true);
    });

    test('should initialize with initialScenarioIndex and trigger save on progress/reset', () => {
        const customOptions = {
            ...mockOptions,
            initialScenarioIndex: 1
        };
        const customManager = new TutorialManager(mockScenarios, customOptions);
        
        // 指定されたインデックスから初期化されること
        expect(customManager.currentScenarioIndex).toBe(1);

        const p1GameContext = { game: { currentPlayer: 1 } };
        
        // 1番目のシナリオ (afterInject) をトリガー
        customManager.checkTrigger('afterInject', p1GameContext);
        expect(customManager.isShowing).toBe(true);

        // シナリオを完了してインデックスを進める
        customManager.advanceScenario();
        
        // 進捗がインクリメントされ、onSaveIndexが呼び出されること
        expect(customManager.currentScenarioIndex).toBe(2);
        expect(customOptions.onSaveIndex).toHaveBeenCalledWith(2);

        // リセット時に0が保存されること
        customManager.resetTutorial();
        expect(customManager.currentScenarioIndex).toBe(0);
        expect(customOptions.onSaveIndex).toHaveBeenLastCalledWith(0);
    });

    test('updateMask should draw highlights without throwing any errors (both rect and circle shapes)', () => {
        const p1GameContext = { game: { currentPlayer: 1 } };
        
        // 最初のトリガーを起動して表示状態にする
        tutorialManager.checkTrigger('turnStart', p1GameContext);
        expect(tutorialManager.isShowing).toBe(true);

        // 1ページ目は "shape": "rect"
        expect(() => tutorialManager.updateMask()).not.toThrow();
        expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();

        // ページを進めて2ページ目は "shape": "circle"
        tutorialManager.advanceScenario();
        expect(tutorialManager.currentPageIndex).toBe(1);
        expect(() => tutorialManager.updateMask()).not.toThrow();
        expect(mockCtx.ellipse).toHaveBeenCalled();
    });

    test('should support defaultPadding option', () => {
        const customOptions = {
            ...mockOptions,
            defaultPadding: 15
        };
        const customManager = new TutorialManager(mockScenarios, customOptions);
        expect(customManager.defaultPadding).toBe(15);
    });
});
