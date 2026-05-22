import { shareResult } from './share.js';
import { Constants } from './constants.js';
import { Layout } from './map.js';
import { AchievementUI } from './ui/achievementUI.js';
import { GameResultUI } from './ui/gameResultUI.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.achievementUI = new AchievementUI(game, this);
        this.gameResultUI = new GameResultUI(game, this);
    }

    init() {
        const getEl = (id) => document.getElementById(id);
        const g = this.game;

        g.overlay = getEl('overlay');
        g.helpBtn = getEl('help-btn');
        g.startHelpBtn = getEl('start-help-btn');
        g.helpContent = getEl('help-content');
        g.modeSelection = getEl('mode-selection-content');
        g.gameOverContent = getEl('game-over-content');
        g.aiOverlay = getEl('ai-thinking-overlay');
        g.versionDisplay = getEl('version-display');
        
        if (g.versionDisplay && typeof __APP_VERSION__ !== 'undefined') {
            g.versionDisplay.textContent = `Ver ${__APP_VERSION__}`;
        }

        g.playerSelect = getEl('player-select');
        g.sizeSelect = getEl('size-select');
        g.aiLevelSelect = getEl('ai-level-select');
        g.aiLevelGroup = getEl('ai-level-group');
        g.volumeSlider = getEl('volume-slider');
        g.volumeValue = getEl('volume-value');

        g.gameStartBtn = getEl('game-start-btn');
        g.restartBtn = getEl('restart-btn');
        g.helpCloseBtn = getEl('help-close-btn');
        g.helpBackBtn = getEl('help-bottom-back-btn');

        g.achievementsBtn = getEl('achievements-btn');
        g.achievementsContent = getEl('achievements-content');
        g.achievementsBackBtn = getEl('achievements-back-btn');
        g.achievementResetBtn = getEl('achievement-reset-btn');
        g.achievementsTableBody = document.querySelector('#achievements-table tbody');
        g.achievementPercent = getEl('achievement-percent');
        g.achievementTabs = document.querySelectorAll('.TabButton');

        // --- 開発者モードの初期化 ---
        g.isDevMode = localStorage.getItem('burst-cascade-dev-mode') === 'true';
        if (g.achievementResetBtn) {
            g.achievementResetBtn.style.display = g.isDevMode ? 'block' : 'none';
        }

        // --- UI初期化 (DOMが存在する場合のみ実行) ---
        if (g.overlay) {
            // リスナー
            if (g.helpBtn) g.helpBtn.addEventListener('click', () => this.showHelp());
            if (g.startHelpBtn) g.startHelpBtn.addEventListener('click', () => this.showHelp());

            // 設定トグルボタンの制御
            const setupToggleGroup = (group) => {
                if (!group) return;
                const btns = group.querySelectorAll('.toggle-btn');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btns.forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        g.sound.playPlace(); // クリック音
                        g.saveSettings(); // Ver 4.7.34: Always save on change
                    });
                });
            };
            setupToggleGroup(g.playerSelect);
            setupToggleGroup(g.sizeSelect);
            setupToggleGroup(g.aiLevelSelect);

            if (g.volumeSlider) {
                g.volumeSlider.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (g.volumeValue) g.volumeValue.innerText = `${val}%`;
                    g.sound.masterVolume = val / 100;
                    g.sound.updateVolume();
                });
                g.volumeSlider.addEventListener('change', () => {
                    g.saveSettings();
                });
            }

            if (g.playerSelect) {
                g.playerSelect.querySelectorAll('.toggle-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const mode = btn.dataset.value;
                        if (mode === 'pvc' && g.aiLevelGroup) g.aiLevelGroup.classList.remove('hidden');
                        else if (g.aiLevelGroup) g.aiLevelGroup.classList.add('hidden');
                    });
                });
            }

            if (g.gameStartBtn) g.gameStartBtn.addEventListener('click', () => g.startGame());
            if (g.restartBtn) g.restartBtn.addEventListener('click', () => {
                g.resetToTitle();
            });
            if (g.helpCloseBtn) g.helpCloseBtn.addEventListener('click', () => {
                this.closeOverlay();
                if (!g.gameMode) g.sound.startBgm('title');
            });
            if (g.helpBackBtn) g.helpBackBtn.addEventListener('click', () => {
                g.resetToTitle();
            });

            if (g.achievementsBtn) g.achievementsBtn.addEventListener('click', () => this.showAchievements());
            if (g.achievementsBackBtn) g.achievementsBackBtn.addEventListener('click', () => this.showModeSelection());

            const shareBtn = getEl('share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => {
                    shareResult(g);
                });
            }

            if (g.achievementResetBtn) {
                g.achievementResetBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to reset all achievements?')) {
                        g.achievementManager.resetData();
                        this.updateAchievementsUI();
                    }
                });
            }

            if (g.achievementTabs) {
                g.achievementTabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        g.achievementTabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        this.updateAchievementsUI();
                        g.sound.playPlace();
                    });
                });
            }

            // --- コピーライトの動的生成 (Ver 6.6.10) ---
            const copyrightContainer = document.getElementById('copyright-container');
            if (copyrightContainer) {
                const { HOLDER, YEAR, PORTAL, PORTAL_URL } = Constants.COPYRIGHT;
                copyrightContainer.innerHTML = `
                    <span class="copyright-text">© ${HOLDER} ${YEAR}</span>
                    <span class="copyright-divider"> | </span>
                    <a href="${PORTAL_URL}" target="_blank" rel="noopener noreferrer" class="copyright-link">${PORTAL}</a>
                `;
            }
        }

        window.addEventListener('resize', () => this.resize());
    }

    showHelp() {
        const g = this.game;
        const isGameRunning = g.gameMode !== null;
        if (!isGameRunning) g.sound.startBgm('title');
        g.overlay.classList.remove('hidden');
        g.helpContent.classList.remove('hidden');
        g.modeSelection.classList.add('hidden');
        g.achievementsContent.classList.add('hidden');
        g.gameOverContent.classList.add('hidden');

        if (isGameRunning) {
            g.helpCloseBtn.classList.remove('hidden');
            g.helpBackBtn.classList.add('hidden');
        } else {
            g.helpCloseBtn.classList.add('hidden');
            g.helpBackBtn.classList.remove('hidden');
        }
    }

    showModeSelection() {
        const g = this.game;
        if (g.sound) g.sound.startBgm('title');
        if (g.overlay) g.overlay.classList.remove('hidden');
        if (g.modeSelection) g.modeSelection.classList.remove('hidden');
        if (g.helpContent) g.helpContent.classList.add('hidden');
        if (g.achievementsContent) g.achievementsContent.classList.add('hidden');
        if (g.gameOverContent) g.gameOverContent.classList.add('hidden');
    }

    showAchievements() {
        this.achievementUI.showAchievements();
    }

    updateAchievementsUI() {
        this.achievementUI.updateAchievementsUI();
    }

    getVictoryType(winner) {
        return this.gameResultUI.getVictoryType(winner);
    }

    getVictoryMessage(type, winner) {
        return this.gameResultUI.getVictoryMessage(type, winner);
    }

    showGameOver(winner) {
        this.gameResultUI.showGameOver(winner);
    }

    closeOverlay() {
        const g = this.game;
        if (g.helpContent) g.helpContent.classList.add('hidden');

        if (g.gameOver) {
            // ゲーム終了時は結果表示画面を表示したままにする
            if (g.overlay) g.overlay.classList.remove('hidden');
            if (g.gameOverContent) g.gameOverContent.classList.remove('hidden');
        } else {
            // ゲーム中でなければオーバーレイごと隠す
            if (g.overlay) g.overlay.classList.add('hidden');
            if (g.gameOverContent) g.gameOverContent.classList.add('hidden');
        }
        if (g.modeSelection) g.modeSelection.classList.add('hidden');
        if (g.achievementsContent) g.achievementsContent.classList.add('hidden');
    }

    applySetting(groupId, value) {
        const group = document.getElementById(groupId);
        if (!group) return;
        const btns = group.querySelectorAll('.toggle-btn');
        btns.forEach(btn => {
            if (btn.dataset.value === value) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    resize() {
        const g = this.game;
        const parent = g.canvas.parentElement;
        if (!parent) return;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = parent.clientWidth;
        const displayHeight = parent.clientHeight;

        g.canvas.width = Math.floor(displayWidth * dpr);
        g.canvas.height = Math.floor(displayHeight * dpr);
        g.canvas.style.width = `${displayWidth}px`;
        g.canvas.style.height = `${displayHeight}px`;

        g.ctx.setTransform(1, 0, 0, 1, 0, 0);
        g.ctx.scale(dpr, dpr);

        if (!g.map) {
            g.render();
            return;
        }
        const origin = { x: displayWidth / 2, y: displayHeight / 2 };

        const tempLayout = new Layout(1, { x: 0, y: 0 });
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        g.map.hexes.forEach(hex => {
            const verts = tempLayout.getPolygonVertices(hex);
            verts.forEach(v => {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            });
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 1.3;

        const tileSizeW = displayWidth / (contentWidth * padding);
        const tileSizeH = displayHeight / (contentHeight * padding);
        const tileSize = Math.min(tileSizeW, tileSizeH);

        g.layout = new Layout(tileSize, origin);
        g.render();
    }
}
