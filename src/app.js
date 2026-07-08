import { Game } from './main.js';
import { HowToPlayRenderer } from './howToPlay.js';
import defaultScenarios from './data/tutorial_scenarios.json';
import { calculateTutorialHighlightRect } from './tutorialHighlightRects.js';
import {
    bindAppI18nTemplate,
    expandAppLanguageResource,
    initializeI18n
} from './i18nManager.js';
import helpTemplate from './data/help_template.html?raw';
import helpText from './data/help_text.json';
import { TutorialManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/tutorialManager.js';
import { getAppSavedData, setAppSavedData } from './appDataManager.js';

const tutorialStateMigrationMap = {
    init: () => null
};

function createTutorialManager(savedTutorialState) {
    return new TutorialManager(expandAppLanguageResource(defaultScenarios), {
        initialState: savedTutorialState,
        onSaveState: (state) => {
            setAppSavedData('tutorial-index', state);
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
}

function clearTutorialOverlay() {
    const initTooltip = document.getElementById('tutorial-tooltip');
    if (initTooltip) initTooltip.classList.add('hidden');
    const initMask = document.getElementById('tutorial-mask-canvas');
    if (initMask) initMask.classList.add('hidden');
}

function bindTutorialResetControls() {
    const helpCloseBtn = document.getElementById('help-close-btn');
    const helpBackBtn = document.getElementById('help-bottom-back-btn');
    const resetCheckbox = document.getElementById('tutorial-reset-checkbox');

    const checkAndResetTutorial = () => {
        if (resetCheckbox && resetCheckbox.checked) {
            if (window.tutorialManager) {
                window.tutorialManager.resetTutorial();
            }
            resetCheckbox.checked = false;
        }
    };

    if (helpCloseBtn) {
        helpCloseBtn.onclick = checkAndResetTutorial;
    }
    if (helpBackBtn) {
        helpBackBtn.onclick = checkAndResetTutorial;
    }
}

function initializeApp() {
    // ホットリロードや残りカスによるUI表示の競合を完全に防ぐ初期化 (No.06)
    clearTutorialOverlay();

    const savedTutorialState = getAppSavedData('tutorial-index', tutorialStateMigrationMap);

    initializeI18n(() => {
        window.tutorialManager = createTutorialManager(
            getAppSavedData('tutorial-index', tutorialStateMigrationMap)
        );
        if (window.game && window.game.achievementManager) {
            window.game.achievementManager.refreshDefinitions();
            window.game.updateAchievementsUI();
        }
    });
    bindAppI18nTemplate('.help-scroll-container', helpTemplate, helpText, {
        afterRender: bindTutorialResetControls
    });

    window.game = new Game();
    window.howToPlay = new HowToPlayRenderer();
    window.tutorialManager = createTutorialManager(savedTutorialState);

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
    bindTutorialResetControls();
}

if (document.readyState === 'loading') {
    window.addEventListener('load', initializeApp);
} else {
    initializeApp();
}
