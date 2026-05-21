import { Game } from './main.js';
import { HowToPlayRenderer } from './howToPlay.js';
import defaultScenarios from './data/tutorial_scenarios.json';
import { calculateTutorialHighlightRect } from './tutorialHighlightRects.js';
import { TutorialManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/tutorialManager.js';
import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';

function initializeApp() {
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
        onCalculateRect: (hl) => calculateTutorialHighlightRect(hl, window.game),
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
}

if (document.readyState === 'loading') {
    window.addEventListener('load', initializeApp);
} else {
    initializeApp();
}
