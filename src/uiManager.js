import { shareResult } from './share.js';
import { Constants } from './constants.js';
import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';
import { Layout } from './map.js';
import { AchievementUI } from './ui/achievementUI.js';
import { GameResultUI } from './ui/gameResultUI.js';

export class UIManager {
    constructor(game) {
        this.game = game;
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
        const g = this.game;
        g.overlay.classList.remove('hidden');
        g.achievementsContent.classList.remove('hidden');
        g.modeSelection.classList.add('hidden');
        g.helpContent.classList.add('hidden');
        g.gameOverContent.classList.add('hidden');

        this.updateAchievementsUI();
    }

    updateAchievementsUI() {
        const g = this.game;
        const grid = document.getElementById('achievements-grid');
        if (!grid) return;

        const miniData = g.achievementManager.getDisplayData('mini');
        const regularData = g.achievementManager.getDisplayData('regular');
        const baseList = g.achievementManager.getRevealedList('regular');

        g.isDevMode = localStorage.getItem('burst-cascade-dev-mode') === 'true';
        if (g.achievementResetBtn) {
            g.achievementResetBtn.style.display = g.isDevMode ? 'block' : 'none';
        }

        grid.innerHTML = '';
        let totalEarned = 0;
        let totalCount = 0;

        baseList.forEach((item, idx) => {
            const mini = miniData[idx];
            const regular = regularData[idx];
            
            const earnedCount = 
                (mini.earned.easy ? 1 : 0) + (mini.earned.normal ? 1 : 0) + (mini.earned.hard ? 1 : 0) +
                (regular.earned.easy ? 1 : 0) + (regular.earned.normal ? 1 : 0) + (regular.earned.hard ? 1 : 0);
            
            totalEarned += earnedCount;
            totalCount += 6;

            const isMastered = earnedCount === 6;
            const isUnlockedAny = earnedCount > 0;

            const card = document.createElement('div');
            card.className = 'AchievementCard';
            if (isMastered) {
                card.classList.add('state-mastered', 'texture-gold');
            } else if (isUnlockedAny) {
                card.classList.add('state-unlocked-any', 'texture-bronze-gold');
            }

            let displayTitle = '???';
            let displayDesc = '???';
            let cardStateClass = 'state-locked-all';

            if (item.isRevealed) {
                displayTitle = item.title;
                displayDesc = item.isHint ? '？？？' : item.description;
                cardStateClass = item.isHint ? 'state-hint' : '';
            }
            if (cardStateClass) card.classList.add(cardStateClass);

            const getMedalSVG = (type, mapType) => {
                const initial = type[0].toUpperCase();
                const ribbonStripe = mapType === 'regular'
                    ? '<rect x="11" y="2" width="2" height="9.5" fill="#38bdf8" />'
                    : '';
                return `
                    <svg viewBox="0 0 24 24" class="medal-svg ${type} ${mapType}">
                        <path d="M7 2 L17 2 L17 15 L12 11 L7 15 Z" class="medal-ribbon"/>
                        ${ribbonStripe}
                        <circle cx="12" cy="14" r="8.5" class="medal-base"/>
                        <circle cx="12" cy="14" r="6.5" class="medal-inner-rim" fill="none" stroke-width="0.8"/>
                        <text x="12" y="17.5" text-anchor="middle" class="medal-text">${initial}</text>
                    </svg>
                `;
            };

            const createMedalSlot = (earned, type, bestVal, mapType) => {
                const labels = { easy: 'EASY', normal: 'NORM', hard: 'HARD' };
                const visual = earned ? getMedalSVG(type, mapType) : `<span class="medal-label">${labels[type]}</span>`;
                const statusClass = earned ? 'state-earned' : 'state-locked';
                const miniClass = mapType === 'mini' ? 'mini' : '';
                
                let html = `<div class="MedalSlot ${statusClass} ${type} ${miniClass}">
                    ${visual}`;
                
                if (g.isDevMode && bestVal !== undefined) {
                    html += `<div class="dev-best">${bestVal}</div>`;
                }
                html += `</div>`;
                return html;
            };

            card.innerHTML = `
                <div class="AchievementCardLeft">
                    <span class="ach-name">${displayTitle}</span>
                    <span class="ach-desc">${displayDesc}</span>
                </div>
                <div class="AchievementCardRight">
                    <div class="MatrixRow">
                        <span class="map-label">MINI</span>
                        <div class="MedalSlots">
                            ${createMedalSlot(mini.earned.easy, 'easy', mini.best.easy, 'mini')}
                            ${createMedalSlot(mini.earned.normal, 'normal', mini.best.normal, 'mini')}
                            ${createMedalSlot(mini.earned.hard, 'hard', mini.best.hard, 'mini')}
                        </div>
                    </div>
                    <div class="MatrixRow">
                        <span class="map-label">REGULAR</span>
                        <div class="MedalSlots">
                            ${createMedalSlot(regular.earned.easy, 'easy', regular.best.easy, 'regular')}
                            ${createMedalSlot(regular.earned.normal, 'normal', regular.best.normal, 'regular')}
                            ${createMedalSlot(regular.earned.hard, 'hard', regular.best.hard, 'regular')}
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        const percent = Math.floor((totalEarned / totalCount) * 100);
        if (g.achievementPercent) {
            g.achievementPercent.textContent = `${percent}%`;
        }
    }

    getVictoryType(winner) {
        const g = this.game;
        if (winner === 0) return 'DRAW';
        // 自滅判定：勝者が手番プレイヤーでない場合（自分が操作して相手が勝った＝自滅）
        if (winner !== g.currentPlayer) {
            return 'SUICIDE';
        }

        // 支配状況の判定
        const mainHexes = g.map.mainHexes.filter(h => !h.isDisabled);
        const totalOwned = mainHexes.filter(h => h.owner !== 0).length;
        const winnerOwned = mainHexes.filter(h => h.owner === winner).length;
        const loserOwned = mainHexes.filter(h => h.owner !== 0 && h.owner !== winner).length;

        if (loserOwned === 0) return 'ANNIHILATION'; // 全滅
        if (totalOwned > 0 && (winnerOwned / totalOwned) >= 0.7) return 'DOMINANCE'; // 圧倒(70%以上)
        // Ver 4.2.1: 接戦条件を緩和(50%未満、つまり土地数で負けているがコアを取って勝った場合)
        if (totalOwned > 0 && (winnerOwned / totalOwned) < 0.5) return 'CLOSE';

        return 'NORMAL';
    }

    getVictoryMessage(type, winner) {
        const p1Name = "緑の勢力";
        const p2Name = "赤の軍勢";
        const winnerName = winner === 1 ? p1Name : p2Name;
        const loserName = winner === 1 ? p2Name : p1Name;

        const messages = {
            'SUICIDE': [
                "{L} は自らの力が制御できず、自壊しました...",
                "{L} の過剰なエネルギーが、仇となりました。",
                "暴走した {L} の連鎖が、自陣を焼き尽くしました。",
                "予期せぬフィードバック。これぞバーストの代償。",
                "{L} の野望は、自らの手で潰えました。",
                "コントロールを失った {L}。自滅という結末です。",
                "過信した {L} は、自らの炎に焼かれました。",
                "{L} の計算ミスが、致命的な連鎖を招きました。"
            ],
            'ANNIHILATION': [
                "{W} の慈悲なき光が、すべてを塗り替えました。",
                "完全なる静寂。{L} の痕跡はありません。",
                "圧倒的な破壊。{W} は塵一つ残しません。",
                "この領域の全ては、今や {W} のものです。",
                "{L} は完全に消滅しました。{W} の完全勝利です。",
                "歴史から {L} の名が消え去りました。",
                "根こそぎ奪い尽くす。それが {W} のやり方です。",
                "完璧な掃除が完了しました。勝者は {W} です。"
            ],
            'DOMINANCE': [
                "{W} が圧倒的な力の差を見せつけました。",
                "戦場は {W} の色に染まっています。",
                "これぞ王者の風格。{W} の完勝です。",
                "{L} を寄せ付けない、{W} の盤石の布陣でした。",
                "世界の大部分は {W} の手に落ちました。",
                "{W} の支配は絶対的です。{L} に為す術はありません。",
                "圧倒적多数で {W} が戦場を制圧しました。",
                "{L} は隅に追いやられました。{W} の圧勝です。"
            ],
            'CLOSE': [
                "{W} が接戦を制しました。",
                "激闘の末、{W} がわずかな差で運命を掴みました。",
                "{L} も健闘しましたが...勝利の女神は {W} に微笑みました。",
                "ギリギリの攻防。{W} が最後の一押しを決めました。",
                "紙一重の決着。{W} の執念が勝りました。",
                "息詰まる熱戦の果てに、{W} が立ち上がりました。",
                "どちらが勝ってもおかしくない勝負でした。勝者は {W} です。",
                "歴史に残る名勝負。{W} が {L} を僅差で退けました。"
            ],
            'NORMAL': [
                "{W} が世界を制しました。",
                "{W} の共鳴が、新たな秩序をもたらしました。",
                "見事な勝利です。{W} が栄光を掴みました。",
                "戦略的な一手一手が、{W} への道を開きました。",
                "共鳴の連鎖を制した {W} が、世界を制します。",
                "{W} の戦術が {L} を上回りました。",
                "静かなる勝利。{W} が着実に陣地を広げました。",
                "戦いの果てに、{W} が勝利宣言を行います。"
            ],
            'DRAW': [
                "すべてのエネルギーが霧散し、境界は失われました。",
                "相打ち...虚無だけが残りました。",
                "互いの力が拮抗し、決着はつきませんでした。",
                "共振限界に到達。システムは沈黙しました。",
                "勝者なき戦い。残されたのは静寂のみ。",
                "エネルギー飽和により、世界はリセットされました。",
                "両勢力ともに譲らず。痛み分けとなりました。",
                "過剰な干渉が、互いの存在を打ち消しました。"
            ]
        };

        const candidates = messages[type] || messages['NORMAL'];
        const rawMessage = candidates[Math.floor(Math.random() * candidates.length)];

        return {
            title: winner === 0 ? `DRAW - RESONANCE VOID` : `PLAYER ${winner} VICTORY!`,
            subtitle: rawMessage.replace(/\{W\}/g, winnerName).replace(/\{L\}/g, loserName)
        };
    }

    showGameOver(winner) {
        const g = this.game;
        g.winner = winner; // Ver 4.7.1: 実績判定用に勝者を記録
        g.updateHistoryStats(); // ゲーム終了直前の状態を統計に反映
        g.gameOver = true;
        g.overlay.classList.remove('hidden');
        g.gameOverContent.classList.remove('hidden');
        g.modeSelection.classList.add('hidden');
        g.helpContent.classList.add('hidden');

        const winnerText = document.getElementById('winner-text');
        const victoryMsg = document.getElementById('victory-message');

        const victoryType = g.getVictoryType(winner);
        const message = this.getVictoryMessage(victoryType, winner);
        g.lastVictoryMessage = message; // シェア用に保存 (Ver 6.6.6)

        winnerText.textContent = message.title;
        if (victoryMsg) victoryMsg.innerHTML = message.subtitle;

        // 勝利タイトルのスタイルをシェア画像と統一 (Ver 6.6.7)
        if (winner === 0) {
            winnerText.style.background = 'linear-gradient(180deg, #fff, #94a3b8)';
        } else if (winner === 1) {
            winnerText.style.background = 'linear-gradient(180deg, #fff, #4ade80)';
        } else {
            winnerText.style.background = 'linear-gradient(180deg, #fff, #f87171)';
        }
        winnerText.style.webkitBackgroundClip = 'text';
        winnerText.style.webkitTextFillColor = 'transparent';
        winnerText.style.backgroundClip = 'text';
        winnerText.style.textFillColor = 'transparent';
        winnerText.style.fontWeight = '900';
        winnerText.style.textShadow = '0 0 20px rgba(0,0,0,0.5)';

        // --- 設定ラベルの反映 (Ver 6.6.1: 表記の完全統一) ---
        const mapSizeLabel = document.getElementById('res-map-size');
        const aiLevelLabel = document.getElementById('res-ai-level');
        if (mapSizeLabel) {
            const text = (g.map.mapType || 'REGULAR').toUpperCase();
            mapSizeLabel.innerText = text;
            g.lastMapSize = text; // シェア用に保存
        }
        if (aiLevelLabel) {
            if (g.gameMode === 'pvc') {
                const text = (g.ai.difficulty || 'NORMAL').toUpperCase();
                aiLevelLabel.innerText = text;
                g.lastAILevel = text; // シェア用に保存
                aiLevelLabel.classList.remove('hidden');
            } else {
                aiLevelLabel.classList.add('hidden');
                g.lastAILevel = 'LOCAL PvP';
            }
        }

        // --- 最終盤面の描画 (Ver 6.0.1) ---
        const resultCanvas = document.getElementById('result-board-canvas');
        if (resultCanvas) {
            requestAnimationFrame(() => {
                const container = document.getElementById('final-board-container');
                const size = container.clientWidth || 400;
                const dpr = window.devicePixelRatio || 1;
                resultCanvas.width = size * dpr;
                resultCanvas.height = size * dpr;

                import('./map.js').then(({ Layout }) => {
                    const canvasSize = size;
                    const padding = 30; // 余裕を持たせるためのパディング
                    const availableSize = canvasSize - padding * 2;
                    
                    // 1. 仮のレイアウト（サイズ1, 原点0）で全ヘックスのバウンディングボックスを計算
                    const tempLayout = new Layout(1, { x: 0, y: 0 });
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    
                    const mainHexes = g.map.hexes.filter(h => h.zone === 'main');
                    mainHexes.forEach(hex => {
                        // 高さによるY方向の突き出し量 (renderer.js の unitThickness ロジックに準拠)
                        const h = Math.abs(hex.height) * 0.12; 
                        const vertices = tempLayout.getPolygonVertices(hex);
                        vertices.forEach(v => {
                            // 底面
                            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
                            // 天面（高さによるY座標の減少）
                            minY = Math.min(minY, v.y - h);
                        });
                    });

                    const contentWidth = maxX - minX;
                    const contentHeight = maxY - minY;
                    
                    // 2. 最適なスケール（hexSize）を決定
                    const scale = Math.min(availableSize / contentWidth, availableSize / contentHeight);
                    const finalHexSize = scale;
                    
                    // 3. コンテンツの幾何学的な中心をキャンバスの中央に配置するための原点（origin）を算出
                    const contentCenterX = (minX + maxX) / 2 * scale;
                    const contentCenterY = (minY + maxY) / 2 * scale;
                    const origin = {
                        x: canvasSize / 2 - contentCenterX,
                        y: canvasSize / 2 - contentCenterY
                    };

                    const resultLayout = new Layout(finalHexSize, origin);
                    g.renderer.renderToCanvas(resultCanvas, g.map, resultLayout);
                });
            });
        }

        // --- アチーブメント情報の表示 (Ver 6.0.0) ---
        const achContainer = document.getElementById('result-achievements');
        const achList = document.getElementById('achievements-list');
        if (achList) achList.innerHTML = '';
        g.lastAchievements = []; // シェア用に初期化 (Ver 6.6.6)
        
        if (g.gameMode === 'pvc') {
            const aiLevel = g.aiLevelSelect.querySelector('.selected').dataset.value;
            const mapType = g.sizeSelect.querySelector('.selected').dataset.value;

            const newUnlocks = g.achievementManager.checkAchievements(g, mapType, aiLevel);
            const sessionAchs = g.achievementManager.getSessionAchievements(g, mapType, aiLevel, newUnlocks);
            g.lastAchievements = sessionAchs; // シェア用に保存

            if (sessionAchs.length > 0) {
                if (achContainer) achContainer.classList.remove('hidden');
                sessionAchs.forEach(ach => {
                    const item = document.createElement('div');
                    item.className = 'achievement-item' + (ach.isNew ? ' new-unlock' : '');
                    item.innerHTML = `
                        <span class="ach-item-title">${ach.title}</span>
                        <span class="ach-item-desc">${ach.description}</span>
                        ${ach.isNew ? '<span class="new-badge">NEW!</span>' : ''}
                    `;
                    achList.appendChild(item);
                });
            } else {
                if (achContainer) achContainer.classList.add('hidden');
            }
        } else {
            if (achContainer) achContainer.classList.add('hidden');
        }

        // BGM 制御
        if (g.gameMode === 'pvp') {
            g.sound.startBgm('victory');
        } else if (winner === 1) {
            g.sound.startBgm('victory');
        } else {
            g.sound.startBgm('defeat');
        }
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
