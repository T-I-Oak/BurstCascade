(function () {
    const { HexMap, Layout, AchievementManager, AI } = window.BurstCascade;

    class SoundManager {
        constructor() {
            this.ctx = null;
        }

        init() {
            if (this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            console.log("AudioContext initialized.");
        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        playPlace() {
            if (!this.ctx) return;
            this.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }

        playBurst() {
            if (!this.ctx) return;
            this.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        }

        playReward() {
            if (!this.ctx) return;
            this.resume();
            const now = this.ctx.currentTime;
            [1320, 1760, 2640].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.05, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.2);
            });
        }

        playTurnChange() {
            if (!this.ctx) return;
            this.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        }
    }

    class Game {
        constructor() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.map = new HexMap(4);
            this.layout = null;
            this.sound = new SoundManager();
            this.achievementManager = new AchievementManager();

            // ゲーム状態
            this.currentPlayer = 1;
            this.gameMode = null; // 'pvp' or 'pvc'
            this.ai = new AI(2);
            this.isAIThinking = false;
            this.turnEndRequested = false; // 手番交代の予約フラグ
            this.isProcessingMove = false; // 現在移動・演出処理中か

            this.hoveredHex = null;
            this.hoveredNeighbors = [];

            this.pulseValue = 0;
            this.gameOver = false;
            this.effects = [];
            this.delayedBursts = [];
            this.chainAnims = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
            this.pendingRewards = [];
            this.flashAlpha = 0;
            this.dotTargets = {};
            this.chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
            this.lastMoveHex = null; // 最後にプレイしたマス
            this.isWaitingForDrop = false; // 落下演出の完了待ちフラグ
            this.turnHadBurst = false;    // ターン中にバーストが起きたか
            this.turnHadReward = false;   // ターン中に何らかの報酬が発生したか
            this.turnHadSelfReward = false; // ターン中に「自陣報酬」が発生したか (Ver 4.4.17)

            // UI要素
            this.overlay = document.getElementById('overlay');
            this.helpBtn = document.getElementById('help-btn');
            this.startHelpBtn = document.getElementById('start-help-btn');
            this.helpContent = document.getElementById('help-content');
            this.modeSelection = document.getElementById('mode-selection-content');
            this.gameOverContent = document.getElementById('game-over-content');
            this.aiOverlay = document.getElementById('ai-thinking-overlay');

            this.playerSelect = document.getElementById('player-select');
            this.sizeSelect = document.getElementById('size-select');
            this.aiLevelSelect = document.getElementById('ai-level-select');
            this.aiLevelGroup = document.getElementById('ai-level-group');

            this.gameStartBtn = document.getElementById('game-start-btn');
            this.restartBtn = document.getElementById('restart-btn');
            this.helpCloseBtn = document.getElementById('help-close-btn');
            this.helpBackBtn = document.querySelector('.help-back-btn');

            this.peekBoardBtn = document.getElementById('peek-board-btn');

            // Achievement UI elements
            this.achievementsBtn = document.getElementById('achievements-btn');
            this.achievementsContent = document.getElementById('achievements-content');
            this.achievementsBackBtn = document.getElementById('achievements-back-btn');
            this.achievementResetBtn = document.getElementById('achievement-reset-btn');
            this.achievementsTableBody = document.querySelector('#achievements-table tbody');
            this.achievementPercent = document.getElementById('achievement-percent');
            this.achievementTabs = document.querySelectorAll('.tab-btn');

            this.focusEffects = []; // Ver 4.4.8: 初期化漏れを復旧
            this.dropEffects = []; // Ver 4.4.7: 初期化漏れを復旧

            // Achievement Stats
            this.turnCount = 0; // Achievement: Speed Run / Endurance
            this.turnCount = 0; // Achievement: Speed Run / Endurance
            // Initialize Stats
            this.achievementManager.startNewGame();


            // リスナー
            this.helpBtn.addEventListener('click', () => this.showHelp());
            this.startHelpBtn.addEventListener('click', () => this.showHelp());

            // 設定トグルボタンの制御
            const setupToggleGroup = (group) => {
                const btns = group.querySelectorAll('.toggle-btn');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btns.forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        this.sound.playPlace(); // クリック音
                    });
                });
            };
            setupToggleGroup(this.playerSelect);
            setupToggleGroup(this.sizeSelect);
            setupToggleGroup(this.aiLevelSelect);

            // プレイヤー人数変更時のAI設定表示制御
            this.playerSelect.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.value;
                    if (mode === 'pvc') this.aiLevelGroup.classList.remove('hidden');
                    else this.aiLevelGroup.classList.add('hidden');
                });
            });

            this.gameStartBtn.addEventListener('click', () => this.startGame());
            this.restartBtn.addEventListener('click', () => location.reload());
            this.helpCloseBtn.addEventListener('click', () => this.closeOverlay());
            this.helpBackBtn.addEventListener('click', () => this.showModeSelection());

            // Achievement Event Listeners
            this.achievementsBtn.addEventListener('click', () => this.showAchievements());
            this.achievementsBackBtn.addEventListener('click', () => this.showModeSelection());
            this.achievementResetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all achievements?')) {
                    this.achievementManager.resetData();
                    this.updateAchievementsUI();
                }
            });

            this.achievementTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.achievementTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.updateAchievementsUI(tab.dataset.map);
                    this.sound.playPlace();
                });
            });

            // 盤面覗き見機能 (Hold to View)
            const startPeek = (e) => {
                e.preventDefault(); // タッチ時のスクロール等防止
                this.overlay.classList.add('hidden');
            };
            const endPeek = (e) => {
                e.preventDefault();
                if (this.gameOver) {
                    this.overlay.classList.remove('hidden');
                }
            };

            this.peekBoardBtn.addEventListener('mousedown', startPeek);
            this.peekBoardBtn.addEventListener('touchstart', startPeek, { passive: false });

            this.peekBoardBtn.addEventListener('mouseup', endPeek);
            this.peekBoardBtn.addEventListener('mouseleave', endPeek);
            this.peekBoardBtn.addEventListener('touchend', endPeek);

            window.addEventListener('resize', () => this.resize());
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('click', (e) => this.handleClick(e));

            // タッチ操作対応
            this.isTouchDevice = false;
            const handleTouchMove = (e) => {
                this.isTouchDevice = true;
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];

                // 表示サイズと内部解像度の比率を考慮
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const x = (touch.clientX - rect.left) * scaleX;
                const y = (touch.clientY - rect.top) * scaleY;

                // mousemove相当の処理（ハイライト更新）
                const nextHovered = this.findHexAt(x, y);
                if (this.hoveredHex !== nextHovered) {
                    this.hoveredHex = nextHovered;
                    this.hoveredNeighbors = [];

                    if (this.hoveredHex && this.hoveredHex.zone === 'main' && this.hoveredHex.owner === this.currentPlayer) {
                        const directions = [
                            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                            { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
                        ];
                        directions.forEach(dir => {
                            const neighbor = this.map.getHexAt(this.hoveredHex.q + dir.q, this.hoveredHex.r + dir.r, 'main');
                            if (neighbor) this.hoveredNeighbors.push(neighbor);
                        });
                    }
                }
            };
            this.canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

            this.loadSettings(); // 設定の読み込み
            this.init(); // Add: Start animation loop
        }

        showHelp() {
            const isGameRunning = this.gameMode !== null;
            this.overlay.classList.remove('hidden');
            this.helpContent.classList.remove('hidden');
            this.modeSelection.classList.add('hidden');
            this.achievementsContent.classList.add('hidden');
            this.gameOverContent.classList.add('hidden');
            this.peekBoardBtn.classList.add('hidden');

            // ゲーム中かタイトルかで見せるボタンを変える
            if (isGameRunning) {
                this.helpCloseBtn.classList.remove('hidden');
                this.helpBackBtn.classList.add('hidden');
            } else {
                this.helpCloseBtn.classList.add('hidden');
                this.helpBackBtn.classList.remove('hidden');
            }
        }

        showModeSelection() {
            this.overlay.classList.remove('hidden');
            this.modeSelection.classList.remove('hidden');
            this.helpContent.classList.add('hidden');
            this.achievementsContent.classList.add('hidden');
            this.gameOverContent.classList.add('hidden');
        }

        startGame() {
            // 設定の読み取り
            const mode = this.playerSelect.querySelector('.selected').dataset.value; // 'pvc' or 'pvp'
            const size = this.sizeSelect.querySelector('.selected').dataset.value;   // 'regular' or 'mini'
            const aiLevel = this.aiLevelSelect.querySelector('.selected').dataset.value; // 'easy', 'normal', 'hard'

            this.gameMode = mode;
            this.saveSettings(); // 設定の保存 (Ver 4.5.3)

            this.map = new HexMap(4, size); // マップ再生成
            if (mode === 'pvc') {
                this.ai = new BurstCascade.AI(2, aiLevel);
                console.log(`AI initialized with difficulty: ${aiLevel}`);
            }
            this.resize(); // レイアウト再計算

            // Reset Achievement Stats
            this.turnCount = 1; // Start at Turn 1
            this.winner = undefined;

            // Initialize Range Stats with initial map state (Ver 5.1.0)
            const initialGridCounts = {
                1: this.map.mainHexes.filter(h => h.owner === 1).length,
                2: this.map.mainHexes.filter(h => h.owner === 2).length
            };
            const initialCoreCounts = {
                1: this.map.mainHexes.filter(h => h.owner === 1 && h.hasFlag).length,
                2: this.map.mainHexes.filter(h => h.owner === 2 && h.hasFlag).length
            };
            this.achievementManager.startNewGame(initialGridCounts, initialCoreCounts);


            this.currentPlayer = 1;
            this.gameOver = false;
            this.isProcessingMove = false;
            this.pendingRewards = [];
            this.dropEffects = [];
            this.effects = [];

            this.resetTurnStats(); // ターン開始時の統計リセット
            this.dropEffects = [];
            this.effects = [];

            this.closeOverlay();
            // ゲーム開始
            console.log(`Game started in ${mode} mode with ${size} map.`);
            this.render(); // 初回描画
        }

        showAchievements() {
            this.overlay.classList.remove('hidden');
            this.achievementsContent.classList.remove('hidden');
            this.modeSelection.classList.add('hidden');
            this.helpContent.classList.add('hidden');
            this.gameOverContent.classList.add('hidden');

            // 現在の設定（マップサイズ）をデフォルトとして表示
            const currentSize = this.sizeSelect.querySelector('.selected').dataset.value;

            // タブのactive状態を更新
            this.achievementTabs.forEach(tab => {
                if (tab.dataset.map === currentSize) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            this.updateAchievementsUI(currentSize);
        }

        // --- Settings Persistence (Ver 4.5.3) ---
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

        saveSettings() {
            const settings = {
                mode: this.playerSelect.querySelector('.selected').dataset.value,
                size: this.sizeSelect.querySelector('.selected').dataset.value,
                aiLevel: this.aiLevelSelect.querySelector('.selected').dataset.value
            };
            localStorage.setItem('burst-cascade-settings', JSON.stringify(settings));
        }

        loadSettings() {
            const saved = localStorage.getItem('burst-cascade-settings');
            if (saved) {
                try {
                    const settings = JSON.parse(saved);
                    if (settings.mode) this.applySetting('player-select', settings.mode);
                    if (settings.size) this.applySetting('size-select', settings.size);
                    if (settings.aiLevel) this.applySetting('ai-level-select', settings.aiLevel);

                    // AIレベルグループの表示制御
                    if (settings.mode === 'pvc') {
                        this.aiLevelGroup.classList.remove('hidden');
                    } else {
                        this.aiLevelGroup.classList.add('hidden');
                    }
                } catch (e) {
                    console.error("Failed to load settings:", e);
                }
            }
        }

        updateAchievementsUI(mapType = 'regular') {
            // Get active tab if mapType is not specified (e.g. initial open)
            if (!mapType) {
                const activeTab = document.querySelector('.tab-btn.active');
                mapType = activeTab ? activeTab.dataset.map : 'regular';
            }

            const data = this.achievementManager.getRevealedList(mapType);
            this.achievementsTableBody.innerHTML = '';

            let totalEarned = 0;
            let totalCount = 0;

            const createMedal = (earned) => {
                return earned ? '<span class="medal-earned">🏅</span>' : '<span class="medal-locked">●</span>';
            };

            data.forEach(item => {
                const tr = document.createElement('tr');

                // Achievement Title Cell
                const tdTitle = document.createElement('td');
                tdTitle.className = 'ach-title-cell';

                if (item.isRevealed) {
                    const description = item.isHint ? '？？？' : item.description;
                    tdTitle.innerHTML = `<span class="ach-name">${item.title}</span><span class="ach-desc">${description}</span>`;
                    if (item.isHint) {
                        tdTitle.classList.add('ach-hint');
                    }
                } else {
                    tdTitle.innerHTML = `<span class="ach-name">???</span><span class="ach-desc">???</span>`;
                    tdTitle.classList.add('ach-locked');
                }
                tr.appendChild(tdTitle);

                // Easy
                const tdEasy = document.createElement('td');
                tdEasy.className = 'medal-cell';
                tdEasy.innerHTML = createMedal(item.earned.easy);
                tr.appendChild(tdEasy);

                // Normal
                const tdNormal = document.createElement('td');
                tdNormal.className = 'medal-cell';
                tdNormal.innerHTML = createMedal(item.earned.normal);
                tr.appendChild(tdNormal);

                // Hard
                const tdHard = document.createElement('td');
                tdHard.className = 'medal-cell';
                tdHard.innerHTML = createMedal(item.earned.hard);
                tr.appendChild(tdHard);

                this.achievementsTableBody.appendChild(tr);

                // Calculate progress for current map type (all diffs combined)
                // Actually user requested "Difficulty x Map", so we track all.
                // Let's just count total checkboxes for this map.
                if (item.earned.easy) totalEarned++;
                if (item.earned.normal) totalEarned++;
                if (item.earned.hard) totalEarned++;
                totalCount += 3;
            });

            const percent = Math.floor((totalEarned / totalCount) * 100);
            this.achievementPercent.textContent = `${percent}%`;
        }

        getVictoryType(winner) {
            // 自滅判定: 勝者が手番プレイヤーでない場合（自分が操作して相手が勝った＝自滅）
            if (winner !== this.currentPlayer) {
                return 'SUICIDE';
            }

            // 支配状況の分析
            const mainHexes = this.map.mainHexes.filter(h => !h.isDisabled);
            const totalOwned = mainHexes.filter(h => h.owner !== 0).length;
            const winnerOwned = mainHexes.filter(h => h.owner === winner).length;
            const loserOwned = mainHexes.filter(h => h.owner !== 0 && h.owner !== winner).length;

            if (loserOwned === 0) return 'ANNIHILATION'; // 全滅
            if (totalOwned > 0 && (winnerOwned / totalOwned) >= 0.7) return 'DOMINANCE'; // 圧勝 (70%以上)
            // Ver 4.2.1: 接戦条件を緩和 (50%未満、つまり土地数で負けているがコアを取って勝った場合)
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
                    "圧倒的多数で {W} が戦場を制圧しました。",
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
            console.log(`[Game Over] Game finished in ${this.turnCount} turns. Winner: Player ${winner}`);
            this.winner = winner; // Ver 4.7.1: 実績判定用に勝者を記録
            this.updateHistoryStats(); // ゲーム終了直前の状態を統計に反映
            this.gameOver = true;
            this.overlay.classList.remove('hidden');
            this.gameOverContent.classList.remove('hidden');
            this.modeSelection.classList.add('hidden');
            this.helpContent.classList.add('hidden');
            this.peekBoardBtn.classList.remove('hidden');
            const winnerText = document.getElementById('winner-text');
            const p = this.gameOverContent.querySelector('p');

            const victoryType = this.getVictoryType(winner);
            const message = this.getVictoryMessage(victoryType, winner);

            winnerText.textContent = message.title;
            if (p) p.innerHTML = message.subtitle;

            // Set background based on winner
            if (winner === 0) {
                winnerText.style.background = 'linear-gradient(135deg, #cbd5e1, #94a3b8)';
            } else {
                winnerText.style.background = winner === 1 ?
                    'linear-gradient(135deg, #4ade80, #16a34a)' :
                    'linear-gradient(135deg, #f87171, #dc2626)';
            }

            // Check Achievements
            if (this.gameMode === 'pvc') {
                const aiLevel = this.aiLevelSelect.querySelector('.selected').dataset.value;
                const mapType = this.sizeSelect.querySelector('.selected').dataset.value;

                const unlocked = this.achievementManager.checkAchievements(this, mapType, aiLevel);
                if (unlocked.length > 0) {
                    // Show notification (simple alert or toast for now, or append to game over msg)
                    // Let's add simple visual cue in game over screen?
                    const p = document.createElement('p');
                    p.style.color = '#fbbf24';
                    p.style.fontWeight = 'bold';
                    p.innerHTML = `🏆 ACHIEVEMENT UNLOCKED!<br><span style="font-size:0.8em">${unlocked.map(u => u.title).join(', ')}</span>`;
                    document.querySelector('#game-over-content').appendChild(p);
                }
            }

            winnerText.style.webkitBackgroundClip = 'text';
            winnerText.style.webkitTextFillColor = 'transparent';
        }

        updateHistoryStats() {
            if (!this.map) return;
            // Most stats are now updated in real-time via Atomic Stats (StatItem.add).

            // Update range-based stats one last time
            this._updateRangeStats();

            // Check Max Cell Energy (High Voltage)
            this.map.mainHexes.forEach(h => {
                const absH = Math.abs(h.height);
                this.achievementManager.stats[this.currentPlayer].maxCellEnergy.update(absH);
            });
        }




        closeOverlay() {
            this.helpContent.classList.add('hidden');

            if (this.gameOver) {
                // ゲーム終了時は結果表示画面を表示したままにする
                this.overlay.classList.remove('hidden');
                this.gameOverContent.classList.remove('hidden');
                this.peekBoardBtn.classList.remove('hidden');
            } else {
                // ゲーム中でなければオーバーレイごと隠す
                this.overlay.classList.add('hidden');
                this.gameOverContent.classList.add('hidden');
                this.peekBoardBtn.classList.add('hidden');
            }
            this.modeSelection.classList.add('hidden');
        }


        init() {
            this.resize();
            this.animate();
        }

        checkGameOverStatus() {
            if (!this.map || this.gameOver) return;
            const mainHexes = this.map.hexes.filter(h => h.zone === 'main');
            const flags1 = mainHexes.filter(h => h.hasFlag && h.flagOwner === 1).length;
            const flags2 = mainHexes.filter(h => h.hasFlag && h.flagOwner === 2).length;

            if (flags1 === 0 || flags2 === 0) {
                let winner = 0;
                if (flags1 === 0 && flags2 === 0) winner = 0; // Draw
                else winner = flags1 > 0 ? 1 : 2;
                this.showGameOver(winner);
            }
        }

        animate(time) {
            this.pulseValue = (Math.sin(time / 500) + 1) / 2; // 0 to 1

            // Ver 4.4: 落下エフェクトの更新
            if (this.dropEffects.length > 0) {
                this.dropEffects.forEach(de => {
                    if (de.landed) return;

                    if (de.state === 'appearing') {
                        de.alpha += 0.1; // 高速化
                        // ほわっと浮いている微振動
                        de.y += Math.sin(Date.now() * 0.01) * 0.2;
                        if (de.alpha >= 1) {
                            de.alpha = 1;
                            de.state = 'hovering';
                        }
                        return;
                    }

                    if (de.state === 'hovering') {
                        de.hoverTimer--;
                        de.y += Math.sin(Date.now() * 0.01) * 0.2;
                        if (de.hoverTimer <= 0) {
                            de.state = 'falling';
                        }
                        return;
                    }

                    // 落下（簡易的な物理）
                    de.y += de.velocity;
                    de.velocity += 1.2; // 重力加速 (0.8 -> 1.2 高速化)

                    // 着弾判定
                    if (de.y >= de.targetY) {
                        de.y = de.targetY;
                        de.landed = true;
                        this.handleDropImpact(de);
                    }
                });

                // Ver 4.4.4: 演出状況の精密なチェック
                const lands = this.dropEffects.filter(de => de.type === 'land');
                const marker = this.dropEffects.find(de => de.type === 'marker');

                // 1. 土地の着弾待ち（すべて着弾した場合）
                if (this.isWaitingForDrop && lands.every(de => de.landed)) {
                    // 土地をエフェクトから除去（連鎖計算に影響を与えないため）
                    this.dropEffects = this.dropEffects.filter(de => de.type !== 'land');
                    this.isWaitingForDrop = false; // 土地待ちフェーズ終了
                    console.log("[Sequence] All lands landed. Starting chain reaction.");
                    this.processChainReaction();
                }

                // 2. マーカーの着弾待ち（マーカーが存在し、落下指示後に着弾した場合）
                if (marker && marker.landed) {
                    console.log(`[Sequence] Marker landed. Finalizing turn (burst: ${this.turnHadBurst}).`);
                    this.lastMoveHex = marker.targetHex;
                    this.dropEffects = []; // エフェクトクリア
                    this.finalizeTurn(this.turnHadBurst);
                }
            }

            // 遅延爆発のチェック
            const now = Date.now();
            this.delayedBursts = this.delayedBursts.filter(b => {
                if (now >= b.time) {
                    this.addParticles(b.x, b.y, b.color, b.isBig, b.targetDotKey, b.targetHex, b.reward);
                    return false;
                }
                return true;
            });

            // フラッシュの減衰
            this.flashAlpha *= 0.9;
            this.map.hexes.forEach(hex => {
                // 高さの補間 (イージング)
                const heightDiff = hex.height - hex.visualHeight;
                if (Math.abs(heightDiff) > 0.01) {
                    hex.visualHeight += heightDiff * 0.15;
                } else {
                    hex.visualHeight = hex.height;
                }

                // フラッグのスケール補間
                const targetScale = hex.hasFlag ? 1.0 : 0.0;
                const scaleDiff = targetScale - hex.visualFlagScale;
                if (Math.abs(scaleDiff) > 0.01) {
                    hex.visualFlagScale += scaleDiff * 0.15;
                } else {
                    hex.visualFlagScale = targetScale;
                }
            });

            // チェーンアニメーションの減衰
            [1, 2].forEach(p => {
                ['self', 'enemy'].forEach(type => {
                    this.chainAnims[p][type] *= 0.9;
                });
            });

            // エフェクトの更新
            // エフェクトの更新（途中追加に対応するため filter は使わない）
            const survivors = [];
            const originalCount = this.effects.length;
            for (let i = 0; i < originalCount; i++) {
                const ef = this.effects[i];

                let keep = true;

                if (ef.type === 'reconstruct_dot') {
                    // Ver 4.6.0: 再構築ドット（放物線移動）
                    const now = Date.now();
                    const el = now - ef.startTime;
                    if (el >= ef.duration) {
                        // 到達！
                        keep = false;

                        // Ver 4.6.1: 遅延させていた手札更新をここで適用
                        if (ef.updates) {
                            this.map.applyHandUpdate(ef.updates);
                        }

                        // ポップアップテキスト表示 (Ver 4.6.1: サイズ2倍, P2対応)
                        // P1: Red(-1) -> Green(+1). P2: Green(+1) -> Red(-1) [Visual]
                        const isP1 = (this.currentPlayer === 1);

                        // Start Side (Weaker Side)
                        this.effects.push({
                            x: ef.startX, y: ef.startY - 40,
                            vx: 0, vy: -0.5,
                            life: 1.0,
                            text: "-1",
                            color: isP1 ? '#ef4444' : '#4ade80',
                            type: 'floating_text'
                        });

                        // End Side (Stronger Side)
                        this.effects.push({
                            x: ef.endX, y: ef.endY - 40,
                            vx: 0, vy: -0.5,
                            life: 1.0,
                            text: "+1",
                            color: isP1 ? '#4ade80' : '#ef4444',
                            type: 'floating_text'
                        });

                        // 到達時のエフェクト
                        this.addParticles(ef.endX, ef.endY, ef.color, false);
                    } else {
                        // 移動計算 (Parabolic)
                        const p = el / ef.duration;
                        ef.x = ef.startX + (ef.endX - ef.startX) * p;
                        ef.y = ef.startY + (ef.endY - ef.startY) * p - Math.sin(p * Math.PI) * 50; // 高さ50の放物線

                        // Ver 4.6.2: サイズと色の動的変化 (Graduation)
                        if (ef.startSize !== undefined && ef.endSize !== undefined) {
                            ef.size = ef.startSize + (ef.endSize - ef.startSize) * p;

                            // 色の補間 (RGB)
                            if (ef.startRGB && ef.endRGB) {
                                const r = Math.round(ef.startRGB.r + (ef.endRGB.r - ef.startRGB.r) * p);
                                const g = Math.round(ef.startRGB.g + (ef.endRGB.g - ef.startRGB.g) * p);
                                const b = Math.round(ef.startRGB.b + (ef.endRGB.b - ef.startRGB.b) * p);
                                ef.color = `rgb(${r},${g},${b})`;
                            }
                        }

                        survivors.push(ef);
                    }
                } else if (ef.type === 'floating_text') {
                    // フローティングテキスト
                    ef.x += ef.vx;
                    ef.y += ef.vy;
                    ef.life -= 0.02;
                    if (ef.life > 0) survivors.push(ef);
                } else {
                    // 既存のパーティクルロジック
                    let target = null;
                    if (ef.targetDotKey && this.dotTargets[ef.targetDotKey]) {
                        target = this.dotTargets[ef.targetDotKey];
                    } else if (ef.targetHex) {
                        target = this.layout.hexToPixel(ef.targetHex);
                    }

                    // let keep = true; (Removed: declared at loop start)
                    if (target) {
                        const isReFlight = !!ef.targetHex;
                        const startHomingLife = isReFlight ? 0.88 : 0.8;
                        const strength = Math.max(0, (startHomingLife - ef.life) * (isReFlight ? 20.0 : 3.0));
                        const dx = target.x - ef.x;
                        const dy = target.y - ef.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 25) { // 判定を絞って精密にする
                            if (ef.targetDotKey) {
                                const [pId, type, idx] = ef.targetDotKey.split('-');
                                const intIdx = parseInt(idx);
                                const threshold = (type === 'self' ? 3 : 1);
                                if (intIdx === threshold && ef.reward && ef.reward.status === 'pending') {
                                    this.triggerRewardFlow(ef.reward, target);
                                } else {
                                    this.triggerChainAnim(parseInt(pId), type);
                                }
                            } else if (ef.targetHex && ef.reward) {
                                // 報酬パーティクルの場合、一定数届くまでカウント
                                ef.reward.arrivedCount = (ef.reward.arrivedCount || 0) + 1;
                                // Ver 4.4.10: 閾値を 15 から 5 に引き下げ
                                if (ef.reward.arrivedCount === 5) {
                                    console.log(`[Reward Log] Threshold reached (5). Applying effect for P${ef.reward.player}`);
                                    this.applyRewardEffect(ef.reward);
                                }
                            }
                            keep = false;
                        } else {
                            if (dist > 2) {
                                ef.vx += (dx / dist) * strength;
                                ef.vy += (dy / dist) * strength;
                            }
                            const damping = (isReFlight && ef.life < startHomingLife) ? 0.88 : 0.94;
                            ef.vx *= damping;
                            ef.vy *= damping;
                        }
                    } else {
                        ef.vy += 0.15;
                    }

                    if (keep) {
                        ef.x += ef.vx;
                        ef.y += ef.vy;
                        ef.life -= (ef.targetHex ? 0.005 : 0.012);
                        if (ef.life > 0) survivors.push(ef);
                    }
                }
            }
            // ループ中（triggerRewardFlow等）に追加された新しいエフェクトを結合
            const newlyAdded = this.effects.slice(originalCount);
            this.effects = survivors.concat(newlyAdded);

            this.checkTurnTransition();
            // 収束演出の更新
            this.focusEffects = this.focusEffects.filter(fe => {
                fe.life -= 0.04;
                fe.scale -= 0.05;
                return fe.life > 0;
            });

            this.render();
            requestAnimationFrame((t) => this.animate(t));
        }

        addParticles(x, y, color, isBig = false, targetDotKey = null, targetHex = null, reward = null) {
            if (isBig) {
                this.sound.playBurst();
                this.flashAlpha = 0.5;
            }
            // パフォーマンス向上のため、パーティクル生成数を大幅に削減
            const count = isBig ? (targetHex ? 40 : 20) : 10;
            const speed = isBig ? (targetHex ? 18 : 15) : 10;
            const isReFlight = !!targetHex;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = (0.5 + Math.random() * 0.5) * speed;
                this.effects.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - (isReFlight ? 0 : (isBig ? 6 : 4)),
                    life: 1.0,
                    size: (2 + Math.random() * 3) * (isBig ? 1.5 : 1),
                    color: color,
                    targetDotKey: targetDotKey,
                    targetHex: targetHex,
                    reward: reward
                });
            }
        }

        triggerChainAnim(player, type) {
            // 到着に合わせてアニメーションを開始
            this.chainAnims[player][type] = 1.0;
        }

        handleMouseMove(e) {
            // タッチデバイスでの指移動は touchmove で処理するため、mousemove は無視する
            // (iOS Safari 等でのシミュレートされたイベントによる誤作動防止)
            if (this.isTouchDevice && e.pointerType !== 'mouse') return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            const nextHovered = this.findHexAt(mouseX, mouseY);
            if (this.hoveredHex !== nextHovered) {
                this.hoveredHex = nextHovered;
                this.hoveredNeighbors = [];

                // メインマップかつ自分のマスの時のみ、周囲のプレビューを表示
                if (this.hoveredHex && this.hoveredHex.zone === 'main' && this.hoveredHex.owner === this.currentPlayer) {
                    const directions = [
                        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                        { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
                    ];
                    directions.forEach(dir => {
                        const neighbor = this.map.getHexAt(this.hoveredHex.q + dir.q, this.hoveredHex.r + dir.r, 'main');
                        if (neighbor) this.hoveredNeighbors.push(neighbor);
                    });
                }
            }
        }

        handleClick(e) {
            this.sound.init(); // 最初のクリックでオーディオ開始
            if (this.gameOver || this.isAIThinking) return;
            const rect = this.canvas.getBoundingClientRect();
            let mouseX, mouseY, hex;

            if (e.isSimulated) {
                hex = e.simulatedHex;
            } else {
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                mouseX = (e.clientX - rect.left) * scaleX;
                mouseY = (e.clientY - rect.top) * scaleY;
                hex = this.findHexAt(mouseX, mouseY);
            }

            if (hex && hex.zone === 'main') {
                // Ver 4.0: 無効マスの操作防止
                if (hex.isDisabled) return;

                // 入力ロックのチェック（演出中やAI思考中は無効）
                if (this.isAIThinking || this.isProcessingMove || this.turnEndRequested) return;

                // 【修正】自勢力のグリッドではない場所へのエネルギー注入を禁止
                if (hex.owner !== this.currentPlayer) {
                    console.log(`[Validation] Invalid target. Owner: ${hex.owner}, Current: ${this.currentPlayer}`);
                    return;
                }

                // Ver 4.3: 2ステップ確定ロジック (タッチデバイスの誤操作防止)
                // マウスホバーがない環境（タッチ）を考慮し、1回目で選択、2回目で確定とする。
                // すでにハイライト（hoveredHex）されているマス以外をクリックした場合は、選択のみ行う。
                if (!e.isSimulated && this.hoveredHex !== hex) {
                    this.hoveredHex = hex;
                    this.hoveredNeighbors = [];
                    // owner check is already done above, but keeping logic consistent
                    const directions = [
                        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                        { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
                    ];
                    directions.forEach(dir => {
                        const neighbor = this.map.getHexAt(hex.q + dir.q, hex.r + dir.r, 'main');
                        if (neighbor) this.hoveredNeighbors.push(neighbor);
                    });
                    this.sound.playPlace(); // 選択音
                    return;
                }

                this.sound.playPlace();
                console.log(`[Turn] Player ${this.currentPlayer} triggers drop sequence at q:${hex.q},r:${hex.r}`);

                // Atomic Stats: Action Count
                this.achievementManager.stats[this.currentPlayer].actions.add(1);

                this.triggerDropSequence(hex);
            }
        }

        // Ver 4.4.3: 落下演出の開始（ホバーフェーズ含む）
        triggerDropSequence(targetHex) {
            console.log(`[Turn Log] --- Player ${this.currentPlayer} Move Start ---`);

            // Ver 4.4.19: 確定操作時にハイライトを消去 (iPadでのハイライト残留バグ修正)
            this.hoveredHex = null;
            this.hoveredNeighbors = [];

            this.isProcessingMove = true;
            this.lastMoveHex = null;
            this.isWaitingForDrop = true;
            // ターン開始時のリセット（アクション単位のリセット）
            this.turnHadBurst = false;
            this.turnHadReward = false;
            this.turnHadSelfReward = false; // Ver 4.4.17

            // Update Turn Action Count
            this.turnActionCount = (this.turnActionCount || 0) + 1;

            // Atomic Stats: Start New Action Scope
            this.achievementManager.startNewAction();

            this.currentActionWaveCount = 0; // 旧 turnChainCount (Wave数)
            this.turnStartOwners = new Map(this.map.mainHexes.map(h => [`${h.q},${h.r}`, h.owner])); // NEW: 注入前の所有者記録
            this.dropEffects = [];

            const handZoneId = `hand-p${this.currentPlayer}`;
            const handHexes = this.map.hexes.filter(h => h.zone === handZoneId);
            const handOffset = this.map.offsets[handZoneId];

            // 1. 7つの土地を上空（ホバー位置）に生成
            handHexes.forEach((handHex, i) => {
                const dq = handHex.q - handOffset.q;
                const dr = handHex.r - handOffset.r;
                const mapHex = this.map.getHexAt(targetHex.q + dq, targetHex.r + dr, 'main');

                if (mapHex && !mapHex.isDisabled) {
                    const targetPos = this.layout.hexToPixel(mapHex);
                    // Ver 4.4.13: 高さ0の土地は演出をスキップ（即座に着弾処理）
                    if (handHex.height === 0) {
                        this.handleDropImpact({
                            targetHex: mapHex,
                            sourceHeight: 0,
                            owner: handHex.owner,
                            type: 'land'
                        });
                    } else {
                        this.dropEffects.push({
                            q: mapHex.q,
                            r: mapHex.r,
                            targetHex: mapHex,
                            sourceHeight: handHex.height,
                            x: targetPos.x,
                            y: targetPos.y - 400, // ホバー高度
                            targetY: targetPos.y,
                            alpha: 0,
                            state: 'appearing', // 出現中
                            hoverTimer: 5 + Math.random() * 5, // 高速化 (40+rand -> 10+rand -> 5+rand)
                            velocity: 0,
                            landed: false,
                            type: 'land',
                            owner: handHex.owner
                        });
                    }
                }
            });

            // 2. インジケータも上空に生成
            const targetPos = this.layout.hexToPixel(targetHex);

            // Ver 4.6.0: 中心ヘクスの高さを取得し、マーカー位置を補正
            // targetHex はメインマップのマス（まだ更新前なので高さは古いかも？ いや、クリック時点の高さはある）
            // しかし手札の「中心」となるマス（offset 0,0）が重なるので、その高さに合わせるべき。
            // targetHex はクリックしたマス（着地先）。その上に「手札センター」が来る。
            // 手札センターは handHexes の中で offset 0,0 のもの。
            // handHexes iteration order logic above:
            // handHexes.forEach... mapHex ... 
            // We need to find the height of the hand hex at offset 0,0.
            const centerHandHex = handHexes.find(h => (h.q - handOffset.q) === 0 && (h.r - handOffset.r) === 0);
            const centerHeight = centerHandHex ? centerHandHex.height : 0;
            const unitThickness = this.layout.size * 0.12;
            const h = Math.abs(centerHeight) * unitThickness;
            // ターゲットY座標（着地後の高さ）: Ground (targetPos.y) - Height (h)
            const objectTargetY = targetPos.y - h;

            this.turnHadBurst = false; // フラグリセット
            this.turnHadReward = false; // フラグリセット
            this.dropEffects.push({
                q: targetHex.q,
                r: targetHex.r,
                targetHex: targetHex,
                x: targetPos.x,
                y: objectTargetY - 400, // ホバー高度 (天面基準)
                targetY: objectTargetY, // 土地の天面で停止 (targetPos.y - height)
                alpha: 0,
                state: 'appearing',
                hoverTimer: 99999, // チェーンが終わるまで待機
                velocity: 0,
                landed: false,
                type: 'marker',
                owner: 0
            });
        }

        // Ver 4.4: 最終マーカーを降らせる
        // triggerMarkerDrop(targetHex) {
        //     this.isWaitingForDrop = true;
        //     targetHex.isHidden = true; // 着弾まで盤面から隠す
        //     this.dropEffects.push({
        //         q: targetHex.q,
        //         r: targetHex.r,
        //         targetHex: targetHex,
        //         sourceHeight: (this.currentPlayer === 1 ? 1 : -1), // マーカーに厚みを持たせる
        //         x: this.layout.hexToPixel(targetHex).x,
        //         y: this.layout.hexToPixel(targetHex).y - 800,
        //         z: 1.0,
        //         velocity: 15,
        //         delay: 0,
        //         landed: false,
        //         type: 'marker',
        //         owner: 0
        //     });
        // }

        // Ver 4.4: 着弾時の処理
        handleDropImpact(effect) {
            if (effect.targetHex) {
                effect.targetHex.isHidden = false; // 盤面に再表示
            }
            if (effect.type === 'land') {
                const hex = effect.targetHex;
                const originalOwner = hex.owner;
                hex.height += effect.sourceHeight;
                hex.updateOwner();

                // フラッグ消失チェック
                if (hex.hasFlag) {
                    if (hex.owner === 0 || hex.owner !== hex.flagOwner) {
                        const flagOwner = hex.flagOwner;
                        hex.hasFlag = false;

                        // Atomic Stats: Neutralize via injection (Ver 5.2.1)
                        const stats = this.achievementManager.stats[this.currentPlayer];
                        stats.neutralized[flagOwner].add(1);
                        stats.neutralized.both.add(1);
                    }
                }

                // 着弾時の小規模なパーティクル
                const pos = this.layout.hexToPixel(hex);
                const color = effect.owner === 1 ? '#4ade80' : '#f87171';
                for (let i = 0; i < 5; i++) {
                    this.effects.push({
                        x: pos.x, y: pos.y,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 0.5 + Math.random() * 0.5,
                        color: color,
                        size: 2 + Math.random() * 3
                    });
                }
            } else if (effect.type === 'marker') {
                this.sound.playPlace(); // 着地音
            }
        }

        // Ver 4.4: 連鎖（バースト）の非同期処理
        processChainReaction() {
            // オーバーフローしているマスを抽出
            const overflowedHexes = this.map.mainHexes.filter(h => h.height > 9 || h.height < -9);

            if (overflowedHexes.length === 0) {
                // 連鎖がない場合も、上空のマーカーを落下させて終了させる
                const marker = this.dropEffects.find(de => de.type === 'marker');
                if (marker) {
                    marker.state = 'falling';
                    marker.hoverTimer = 0;
                    console.log("[Sequence] No chain. Triggering marker fall.");
                } else {
                    this.finalizeTurn(false);
                }
                return;
            }

            // 非同期にバーストを発生させる
            console.log(`[Turn Log] Burst(s) detected. Count: ${overflowedHexes.length}`);

            // High Voltage Check & Burst Tracking
            overflowedHexes.forEach(h => {
                const energy = Math.abs(h.height);
                const stats = this.achievementManager.stats[this.currentPlayer];
                stats.maxCellEnergy.update(energy);

                // Tracking bursts in stats
                stats.burstGrid.both.add(1);

                // Atomic Stats: Neutralize & BurstCore (Core only)
                if (h.hasFlag) {
                    stats.neutralized[h.flagOwner].add(1);
                    stats.neutralized.both.add(1);
                    stats.burstCore.both.add(1);
                }
            });

            overflowedHexes.forEach((hex, i) => {
                const originalOwner = hex.owner;
                const delay = i * 150; // 少しずつずらす

                setTimeout(() => {
                    this.triggerBurst(hex, originalOwner);
                }, delay);
            });

            this.currentActionWaveCount = (this.currentActionWaveCount || 0) + 1; // 連鎖数（Wave）を加算

            // 全バーストの終了を待つための大まかなタイマー（またはエフェクト監視）
            const totalDelay = overflowedHexes.length * 150 + 600;
            setTimeout(() => {
                // すべてのバースト処理が終わった後、再度連鎖が発生していないかチェック
                const nextOverflowed = this.map.mainHexes.filter(h => h.height > 9 || h.height < -9);
                if (nextOverflowed.length > 0) {
                    this.processChainReaction(); // 連鎖継続
                } else {
                    // 全連鎖終了。上空のマーカーを落下させる（デッドロック回避のため必ず呼ぶ）
                    const marker = this.dropEffects.find(de => de.type === 'marker');
                    if (marker) {
                        marker.state = 'falling';
                        marker.hoverTimer = 0;
                        console.log("[Sequence] Chain finished. Triggering marker fall.");
                    } else {
                        this.finalizeTurn(true);
                    }
                }
            }, totalDelay);
        }

        triggerBurst(hex, originalOwner) {
            const center = this.layout.hexToPixel(hex);
            const playerColors = { 1: '#4ade80', 2: '#f87171' };
            const color = playerColors[originalOwner] || '#ffffff';
            const isEnemyOverflow = (originalOwner !== 0 && originalOwner !== this.currentPlayer);

            const targetType = isEnemyOverflow ? 'enemy' : 'self';
            const threshold = isEnemyOverflow ? 2 : 4;
            const targetIdx = this.chains[this.currentPlayer][targetType];
            const targetDotKey = `${this.currentPlayer}-${targetType}-${targetIdx}`;

            let reward = null;
            if (targetIdx === threshold - 1) {
                reward = this.queueReward(this.currentPlayer, targetType);
            }

            // 内部データの更新
            hex.height = 0;
            hex.updateOwner();
            // フラッグ消失チェック (Ver 4.4.14)
            if (hex.hasFlag) {
                if (hex.owner === 0 || hex.owner !== hex.flagOwner) {
                    hex.hasFlag = false;
                }
            }
            this.chains[this.currentPlayer][targetType]++;

            // 視覚演出のトリガー
            this.turnHadBurst = true; // バースト発生を記録
            this.turnBurstCount = (this.turnBurstCount || 0) + 1; // Achievement: Burst Lover

            // Atomic Stats: Burst Count (v5 Px Array)
            const stats = this.achievementManager.stats[this.currentPlayer];
            if (hex.hasFlag) {
                stats.burstCore[originalOwner].add(1);
                stats.burstCore.both.add(1);
            } else {
                stats.burstGrid[originalOwner].add(1);
                stats.burstGrid.both.add(1);
            }

            this.sound.playBurst();
            this.addParticles(center.x, center.y, color, isEnemyOverflow, targetDotKey, null, reward);
        }

        finalizeTurn(overflowOccurred) {
            console.log(`[Turn Log] finalizeTurn called. burst:${overflowOccurred}, reward:${this.turnHadReward}`);
            const handZoneId = `hand-p${this.currentPlayer}`;
            const pattern = overflowOccurred ? 'diffuse' : 'focus';

            // Ver 4.6.1: 計算のみ行い、適用は遅延させる
            const result = this.map.calculateHandUpdate(handZoneId, pattern);

            if (result && result.success) {
                this.triggerReconstructEffect(result.giver, result.receiver, result.updates, pattern);
            }

            const stillBursting = this.map.mainHexes.some(h => h.height > 9 || h.height < -9);

            // Ver 4.4.17: 手番継続ルールの詳細調整
            // 継続条件: バーストが発生 (overflowOccurred) し、かつ 自陣報酬 (turnHadSelfReward) を獲得していないこと
            // 敵陣報酬 (turnHadReward && !turnHadSelfReward) のみの場合は継続する
            const shouldContinue = overflowOccurred && !this.turnHadSelfReward;

            if (shouldContinue) {
                if (stillBursting) {
                    console.log(`[Turn Log] Still bursting... waiting.`);
                } else {
                    console.log(`[Turn Log] Continue Turn for P${this.currentPlayer} (Burst:${overflowOccurred}, NoSelfReward)`);
                    // isProcessingMove はここでは解放しない。checkTurnTransition が解放する。
                }
            } else {
                this.turnEndRequested = true;
                const reason = this.turnHadSelfReward ? 'SelfReward' : (overflowOccurred ? 'BurstButEnd?' : 'Normal');
                console.log(`[Turn Log] Turn End Requested for P${this.currentPlayer} (Reason: ${reason})`);
            }
        }

        // --- AI (CPU) Logic ---

        async handleCPUTurn() {
            if (this.gameOver) return;
            this.isAIThinking = true;
            this.aiOverlay.classList.remove('hidden');

            const startTime = Date.now();
            const bestMove = this.ai.getBestMove(this.map, this.chains);

            // 人間らしい「考えてる感」を出すための最小待機時間
            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(0, 1000 - elapsed);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            this.aiOverlay.classList.add('hidden');
            this.isAIThinking = false;

            if (bestMove) {
                this.executeMoveAt(bestMove.q, bestMove.r);
            }
        }

        executeMoveAt(q, r) {
            const hex = this.map.getHexAt(q, r, 'main');
            if (hex) {
                // Clicks are handled via this helper to simulate AI "clicking"
                this.handleClick({
                    clientX: 0, clientY: 0,
                    isSimulated: true,
                    simulatedHex: hex
                });
            }
        }


        // Helper to track core damage/gain
        queueReward(player, type) { // Method restored
            this.sound.playReward();
            console.log(`[Reward] queueReward: player=${player}, type=${type}`);
            let color = player === 1 ? '#4ade80' : '#f87171';
            const reward = {
                player, type, targetHex: null, color, status: 'pending',
                arrivedCount: 0
            };
            this.turnHadReward = true; // 成果があったことを記録

            // Atomic Stats: Reward (v5 Px Array)
            const stats = this.achievementManager.stats[this.currentPlayer];
            if (type === 'self') {
                this.turnHadSelfReward = true; // 自陣報酬フラグ (Ver 4.4.17)
                stats.rewardEnergy.add(1);
            } else if (type === 'enemy') {
                stats.rewardCore.add(1);
            }

            this.pendingRewards.push(reward);
            return reward;
        }

        /**
         * 演出がすべて完了したかチェックし、必要なら手番を交代する
         */
        checkTurnTransition() {
            // 演出中（パーティクル、報酬、落下演出、着弾待ち）は、手番交代もロック解除も行わない
            if (this.effects.length > 0 || this.pendingRewards.length > 0 || this.dropEffects.length > 0 || this.isWaitingForDrop) {
                // 内部状態を1秒ごとにログ出力 (デバッグ用)
                if (Date.now() % 1000 < 20) {
                    console.log(`[Turn Log] Busy... Effects:${this.effects.length}, Rewards:${this.pendingRewards.length}, Drops:${this.dropEffects.length}, WaitingDrop:${this.isWaitingForDrop}`);
                }
                return;
            }
            this.checkGameOverStatus();
            if (this.gameOver) return;

            if (this.turnEndRequested) {
                console.log(`[Turn Log] --- Executing Swap: P${this.currentPlayer} -> P${this.currentPlayer === 1 ? 2 : 1} ---`);
                this.turnEndRequested = false;

                // Range Stats 更新 (Ver 5.1.0)
                this._updateRangeStats();

                this.chains[this.currentPlayer].self = 0;
                // 手番プレイヤーの切り替え
                const nextPlayer = (this.currentPlayer === 1 ? 2 : 1);
                this.currentPlayer = nextPlayer;
                this.isProcessingMove = false;
                this.turnCount++;

                // Atomic Stats: Start New Turn Scope
                this.achievementManager.startNewTurn();

                // 次のプレイヤーのターン統計をリセット
                this.resetTurnStats();

                // CPUの手番ならAIを実行
                this.sound.playTurnChange();

                if (this.gameMode === 'pvc' && this.currentPlayer === 2 && !this.gameOver) {
                    setTimeout(() => this.handleCPUTurn(), 400); // 余裕を持って開始
                }
            } else if (this.isProcessingMove) {
                console.log(`[Turn Log] --- Executing Unlock (Continue Turn) for P${this.currentPlayer} ---`);
                this.isProcessingMove = false;

                if (this.gameMode === 'pvc' && this.currentPlayer === 2 && !this.gameOver) {
                    setTimeout(() => this.handleCPUTurn(), 400); // 継続手番でもAIを叩く
                }
            }
        }

        resetTurnStats() {
            this.turnActionCount = 0; // アクション回数
            this.turnBurstCount = 0; // ターン合計バースト数
            this.turnStartCores = { ...this.map.cores }; // Achievement: One Shot / Unscathed / Status Quo
            this.turnStartEnergy = { 1: this.map.players[1].energy, 2: this.map.players[2].energy }; // Achievement: Minimalist
        }

        triggerRewardFlow(reward, dotPos) {
            console.log(`[Reward] triggerRewardFlow START: type=${reward.type}, status=${reward.status}`);
            if (reward && reward.status === 'pending') {
                reward.status = 'flowing';
                if (reward.type === 'self') {
                    const handZoneId = `hand-p${reward.player}`;
                    const handHexes = this.map.hexes.filter(h => h.zone === handZoneId);
                    const candidates = handHexes.filter(h =>
                        (reward.player === 1 && h.height < 5) || (reward.player === 2 && h.height > -5)
                    );
                    reward.targetHex = candidates.length > 0 ?
                        candidates[Math.floor(Math.random() * candidates.length)] :
                        handHexes[Math.floor(Math.random() * handHexes.length)];
                } else {
                    const candidateHexes = this.map.hexes.filter(h =>
                        h.zone === 'main' && h.owner === reward.player && !h.hasFlag
                    );
                    console.log(`[Reward] flag candidates count: ${candidateHexes.length}`);
                    if (candidateHexes.length > 0) {
                        reward.targetHex = candidateHexes[Math.floor(Math.random() * candidateHexes.length)];
                        const pixel = this.layout.hexToPixel(reward.targetHex);
                        console.log(`[Reward] target pixel: x:${Math.floor(pixel.x)}, y:${Math.floor(pixel.y)}`);
                    }
                }

                console.log(`[Reward] target selected: ${reward.targetHex ? 'FOUND' : 'NOT FOUND'}`);

                if (!reward.targetHex) {
                    this.pendingRewards = this.pendingRewards.filter(r => r !== reward);
                }

                // ゲージの減算をこのタイミング（飛翔開始）で行う
                const threshold = (reward.type === 'self' ? 4 : 2);
                this.chains[reward.player][reward.type] = Math.max(0, this.chains[reward.player][reward.type] - threshold);

                this.flashAlpha = 0.3;
                this.addParticles(dotPos.x, dotPos.y, reward.color, true, null, reward.targetHex, reward);
                this.triggerChainAnim(reward.player, reward.type);
            }
        }

        applyRewardEffect(reward) {
            console.log(`[Reward] applyRewardEffect: type=${reward.type}, status=${reward.status}`);
            if (!reward || reward.status !== 'flowing') return;
            reward.status = 'applied';

            if (reward.type === 'self') {
                console.log(`[Reward] applying self reward (height update)`);
                reward.targetHex.height += (reward.player === 1 ? 1 : -1);
                reward.targetHex.height = Math.max(-5, Math.min(5, reward.targetHex.height));
                reward.targetHex.updateOwner(); // オーナー更新

                // バンプ（跳ね上げ）演出: 現在の視覚的な高さに勢いをつける
                const bumpAmt = (reward.player === 1 ? 2.0 : -2.0);
                reward.targetHex.visualHeight += bumpAmt;

                const center = this.layout.hexToPixel(reward.targetHex);
                // 派手な演出（自陣でも旗と同等に）
                this.addParticles(center.x, center.y, reward.color, true);
                this.flashAlpha = 0.4;
            } else {
                console.log(`[Reward] applying enemy reward (flag creation) at q:${reward.targetHex.q}, r:${reward.targetHex.r}`);
                reward.targetHex.hasFlag = true;
                reward.targetHex.flagOwner = reward.player;
                const center = this.layout.hexToPixel(reward.targetHex);
                this.addParticles(center.x, center.y, '#ffffff', true);
                this.addParticles(center.x, center.y, reward.color, true);
                this.flashAlpha = 0.5;
            }
            this.pendingRewards = this.pendingRewards.filter(r => r !== reward);
        }

        applyChainReward(player, type) {
            // このメソッドは、handleClickではなく、applyRewardEffect経由でのデータ変更を主に担うか、
            // もしくは即時発動が必要な場合にのみ使用するようにリファクタリングする
            // 現在はhandleClickでqueueRewardを呼ぶようにしたので、ここでの直接実行は基本行わない
        }

        // ポイントがポリゴン内に含まれるか判定 (Ray-casting algorithm)
        isPointInPolygon(px, py, vertices) {
            let inside = false;
            for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
                const xi = vertices[i].x, yi = vertices[i].y;
                const xj = vertices[j].x, yj = vertices[j].y;
                const intersect = ((yi > py) !== (yj > py)) &&
                    (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        findHexAt(mx, my) {
            // Zオーダーの逆順（手前から奥）で判定する
            const sortedHexes = [...this.map.hexes].sort((a, b) => {
                const zA = a.q + a.r;
                const zB = b.q + b.r;
                if (zA !== zB) return zB - zA; // 逆順 (手前が先)
                return b.r - a.r;
            });

            for (const hex of sortedHexes) {
                // 上面の座標で判定
                const unitThickness = this.layout.size * 0.12;
                const h = Math.abs(hex.height) * unitThickness;
                const vertices = this.layout.getPolygonVertices(hex);
                const topVertices = vertices.map(v => ({ x: v.x, y: v.y - h }));

                if (this.isPointInPolygon(mx, my, topVertices)) {
                    // Disabledなマスは選択もホバーもできないようにする
                    if (hex.isDisabled) return null;
                    return hex;
                }
            }
            return null;
        }

        resize() {
            if (!this.map) return;
            // 親要素（main）のサイズに合わせる
            const parent = this.canvas.parentElement;
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
            const origin = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

            const tempLayout = new Layout(1, { x: 0, y: 0 });
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            this.map.hexes.forEach(hex => {
                // Disabledなマスもレイアウト計算には含める（配置を崩さないため）
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
            const padding = 1.3; // ラベルのために少し広げる

            const tileSizeW = this.canvas.width / (contentWidth * padding);
            const tileSizeH = this.canvas.height / (contentHeight * padding);
            const tileSize = Math.min(tileSizeW, tileSizeH);

            this.layout = new Layout(tileSize, origin);
            this.render();
        }

        // Ver 4.4.14: 描画ロジックの共通化 (形状とスタイリング)
        drawHexBase(ctx, hex, vertices, h, color) {
            // 1. 側面
            if (h > 0) {
                const ccwIndices = [0, 5, 4, 3, 2, 1];
                for (let j = 0; j < 6; j++) {
                    const idxA = ccwIndices[j], idxB = ccwIndices[(j + 1) % 6];
                    const vA = vertices[idxA], vB = vertices[idxB];
                    if (vB.x > vA.x) {
                        ctx.beginPath();
                        ctx.moveTo(vA.x, vA.y);
                        ctx.lineTo(vB.x, vB.y);
                        ctx.lineTo(vB.x, vB.y - h);
                        ctx.lineTo(vA.x, vA.y - h);
                        ctx.closePath();
                        const grad = ctx.createLinearGradient(vA.x, vA.y - h, vA.x, vA.y);
                        grad.addColorStop(0, color.side);
                        grad.addColorStop(1, this.adjustColor(color.side, -20));
                        ctx.fillStyle = grad;
                        ctx.fill();
                        ctx.strokeStyle = color.border;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // 2. 上面
            const topVertices = vertices.map(v => ({ x: v.x, y: v.y - h }));
            ctx.beginPath();
            ctx.moveTo(topVertices[0].x, topVertices[0].y);
            for (let i = 1; i < 6; i++) ctx.lineTo(topVertices[i].x, topVertices[i].y);
            ctx.closePath();
            ctx.fillStyle = color.top;
            ctx.fill();
            ctx.strokeStyle = color.highlight;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // ハイライト線
            ctx.beginPath();
            const edgeIndices = [0, 5, 4, 3, 2, 1];
            for (let j = 0; j < 6; j++) {
                const idxA = edgeIndices[j], idxB = edgeIndices[(j + 1) % 6];
                const vA = topVertices[idxA], vB = topVertices[idxB];
                if (vB.x > vA.x) {
                    ctx.moveTo(vA.x, vA.y);
                    ctx.lineTo(vB.x, vB.y);
                }
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.strokeStyle = color.border;
            ctx.lineWidth = 1;
            ctx.stroke();

            return topVertices;
        }

        // Ver 4.4.14: 描画ロジックの共通化 (数値エンボス)
        drawHexNumber(ctx, tx, ty, h, color, value, layout = this.layout) {
            ctx.save();
            const { angle, tilt, scaleY } = layout.projection;
            const cosA = Math.cos(angle), sinA = Math.sin(angle);
            const a = cosA, b = (sinA - cosA * tilt) * scaleY, c = -sinA, d = (cosA + sinA * tilt) * scaleY;
            ctx.setTransform(a, b, c, d, tx, ty);
            const fontSize = layout.size * 1.5; // 少し大きく
            ctx.font = `bold ${fontSize}px Outfit, sans-serif`; // Outfit に変更
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const shadowColor = 'rgba(0,0,0,0.6)';
            const highlightColor = 'rgba(255,255,255,0.8)';
            const textColor = this.adjustColor(color.top, -100); // コントラスト確保

            const roundedH = Math.abs(Math.round(value));

            ctx.fillStyle = highlightColor;
            ctx.fillText(roundedH, 1, 1);
            ctx.fillStyle = shadowColor;
            ctx.fillText(roundedH, -1.5, -1.5);
            ctx.fillStyle = textColor;
            ctx.fillText(roundedH, 0, 0);

            // layout.size を使用するために引数渡しが必要だったが、
            // フォントサイズは layout.size * 1.5 で計算済みなのでここでは不要かもだが
            // ctx.font 設定時に this.layout を参照しているので、
            // 呼び出し元で ctx.font を設定するか、ここでも layout を使う必要がある。
            // 上記コードでは this.layout.size を参照している箇所があるため修正が必要。

            ctx.restore();
        }

        drawHex(hex, ctx = this.ctx, layout = this.layout) {
            if (hex.isHidden) return;

            const vertices = layout.getPolygonVertices(hex);
            // ctx is now provided via argument or defaults to this.ctx

            if (hex.isDisabled) {
                ctx.beginPath();
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < 6; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
                ctx.closePath();
                ctx.fillStyle = '#111827';
                ctx.fill();
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                ctx.stroke();
                return;
            }

            const unitThickness = layout.size * 0.12;
            const absH = Math.abs(hex.visualHeight);
            const h = absH * unitThickness;

            let owner = 0;
            if (hex.height > 0) owner = 1;
            else if (hex.height < 0) owner = 2;
            else if (hex.owner !== 0) owner = hex.owner;

            const colors = {
                0: { top: '#1e293b', side: '#0f172a', border: '#334155', highlight: '#475569' },
                1: { top: '#16a34a', side: '#166534', border: '#064e3b', highlight: '#4ade80' },
                2: { top: '#dc2626', side: '#991b1b', border: '#7f1d1d', highlight: '#f87171' }
            };
            const color = { ...colors[owner] };

            if (this.hoveredHex === hex) {
                color.top = this.adjustColor(color.top, 50);
            } else if (this.hoveredNeighbors.includes(hex)) {
                color.top = this.adjustColor(color.top, 25);
            }

            const topVertices = this.drawHexBase(ctx, hex, vertices, h, color);

            // 3. 数値表示
            if (absH > 0) {
                const center = layout.hexToPixel(hex);
                this.drawHexNumber(ctx, center.x, center.y - h, h, color, hex.visualHeight, layout);
            }

            // 4. 共鳴中枢（コア）の描画
            if (hex.visualFlagScale > 0.01) {
                const center = layout.hexToPixel(hex);
                const tx = center.x, ty = center.y - h;
                const coreSize = layout.size * 0.4 * hex.visualFlagScale;
                const playerColor = hex.flagOwner === 1 ? '#4ade80' : '#f87171';
                const floatY = Math.sin(this.pulseValue * Math.PI) * 4 * hex.visualFlagScale;

                ctx.save();
                ctx.translate(tx, ty);
                ctx.beginPath();
                ctx.ellipse(0, 0, coreSize * 1.2, coreSize * 0.6, 0, 0, Math.PI * 2);
                ctx.strokeStyle = playerColor;
                ctx.lineWidth = 2 * (0.5 + this.pulseValue * 0.5) * hex.visualFlagScale;
                ctx.globalAlpha = (0.3 + this.pulseValue * 0.4) * hex.visualFlagScale;
                ctx.stroke();

                ctx.translate(0, -coreSize * 2.2 + floatY);
                ctx.globalAlpha = 1.0 * hex.visualFlagScale;
                ctx.shadowColor = playerColor;
                ctx.shadowBlur = (10 + this.pulseValue * 15) * hex.visualFlagScale;

                const drawCrystalFace = (points, fillColor, strokeColor) => {
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                    ctx.closePath();
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                };

                const halfW = coreSize * 0.8, halfH = coreSize * 1.3;
                drawCrystalFace([{ x: 0, y: -halfH }, { x: -halfW, y: 0 }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, -20), playerColor);
                drawCrystalFace([{ x: 0, y: -halfH }, { x: halfW, y: 0 }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, 20), playerColor);
                drawCrystalFace([{ x: -halfW, y: 0 }, { x: 0, y: halfH }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, -40), playerColor);
                drawCrystalFace([{ x: halfW, y: 0 }, { x: 0, y: halfH }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, 0), playerColor);

                ctx.beginPath();
                ctx.moveTo(-halfW, 0);
                ctx.lineTo(halfW, 0);
                ctx.strokeStyle = 'white';
                ctx.globalAlpha = 0.5 * hex.visualFlagScale;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }

        adjustColor(hex, amt) {
            let col = hex.replace('#', '');
            let r = parseInt(col.substring(0, 2), 16) + amt;
            let g = parseInt(col.substring(2, 4), 16) + amt;
            let b = parseInt(col.substring(4, 6), 16) + amt;
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
        }


        drawLabel(text, zoneId, color, align) {
            const center = this.map.centers[zoneId];
            if (!center) return;
            const pos = this.layout.hexToPixel({ q: center.q, r: center.r });
            const ctx = this.ctx;
            ctx.save();
            const fontSize = Math.max(20, this.layout.size * 1.0);
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = align;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = color;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

            const playerNum = (zoneId === 'hand-p1' ? 1 : 2);
            const isActive = (this.currentPlayer === playerNum);

            // プレイヤー名を表示 (位置固定)
            const marginX = this.layout.size * 2.5;
            const textX = pos.x + (align === 'left' ? marginX : -marginX);

            // 光彩エフェクト
            if (isActive && !this.gameOver) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 10 + this.pulseValue * 10;
            }

            // テキスト描画 (P1は右側に◀、P2は左側に▶)
            let finalText = text;
            if (playerNum === 1) {
                finalText = text + (isActive ? ' ◀' : ' 　');
            } else {
                finalText = (isActive ? '▶ ' : '　 ') + text;
            }
            ctx.fillText(finalText, textX, pos.y);

            // チェーン（連鎖）のドット表示
            const playerChains = this.chains[playerNum];
            const dotY = pos.y + (playerNum === 1 ? fontSize * 0.9 : -fontSize * 0.9);
            const dotRadius = 4;
            const dotSpacing = 14;
            const selfColor = playerNum === 1 ? '#4ade80' : '#f87171';
            const enemyColor = playerNum === 1 ? '#f87171' : '#4ade80';

            const drawDots = (count, color, offsetIdx, maxCount, animVal, type) => {
                // 現在飛翔中の報酬があるか、またはこの演出のために維持すべき状態かをチェック
                const isFlowing = this.pendingRewards.some(r => r.player === playerNum && r.type === type && (r.status === 'flowing' || r.status === 'pending'));
                const filledCount = isFlowing ? maxCount : Math.min(count, maxCount);
                for (let i = 0; i < maxCount; i++) {
                    ctx.beginPath();
                    const x = textX + (align === 'left' ? (i + offsetIdx) * dotSpacing : -(i + offsetIdx) * dotSpacing);

                    // 個別のドット座標を保存 (パーティクル収束先)
                    this.dotTargets[`${playerNum}-${type}-${i}`] = { x: x, y: dotY };

                    // アニメーション中（最後に増えたドット）の強調
                    const isLastDot = (i === filledCount - 1);
                    // 丸が大きくなって小さくなるアニメーション (animValは1.0から0へ減衰)
                    const sCurve = Math.sin(animVal * Math.PI); // 0 -> 1 -> 0
                    const scale = isLastDot ? 1.0 + sCurve * 3.0 : 1.0;
                    const brightness = isLastDot ? sCurve * 150 : 0;

                    ctx.arc(x, dotY, dotRadius * scale, 0, Math.PI * 2);
                    if (i < filledCount) {
                        ctx.fillStyle = this.adjustColor(color, brightness);
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 4 + sCurve * 40;
                    } else {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.shadowBlur = 0;
                    }
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.stroke();
                }
            };

            const playerAnims = this.chainAnims[playerNum];

            // 自陣連鎖（最大4ドット / 4で報酬・終了）
            drawDots(playerChains.self, selfColor, 0, 4, playerAnims.self, 'self');
            // 敵陣連鎖（最大2ドット / 2で報酬、少し隙間を空ける）
            drawDots(playerChains.enemy, enemyColor, 5.2, 2, playerAnims.enemy, 'enemy');

            ctx.restore();
        }

        render() {
            if (!this.map || !this.layout) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            const sortedHexes = [...this.map.hexes].sort((a, b) => {
                const zA = a.q + a.r;
                const zB = b.q + b.r;
                if (zA !== zB) return zA - zB;
                return a.r - b.r;
            });
            sortedHexes.forEach(hex => this.drawHex(hex));

            // エフェクトの描画
            this.effects.forEach(ef => {
                this.ctx.save();
                this.ctx.globalAlpha = ef.life;
                this.ctx.fillStyle = ef.color;
                this.ctx.beginPath();
                this.ctx.arc(ef.x, ef.y, ef.size || 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });

            // Ver 4.6.0: テキストエフェクトの描画
            this.effects.filter(ef => ef.type === 'floating_text').forEach(ef => {
                this.ctx.save();
                this.ctx.globalAlpha = ef.life;
                this.ctx.fillStyle = ef.color;
                this.ctx.font = 'bold 32px sans-serif'; // Ver 4.6.1: サイズ倍増 (16px -> 32px)
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                this.ctx.shadowBlur = 4;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(ef.text, ef.x, ef.y);
                this.ctx.restore();
            });

            // Ver 4.4: 落下中の土地・マーカーの描画
            this.dropEffects.forEach(de => {
                if (de.landed || de.state === 'appearing' || de.state === 'hovering' || de.state === 'falling') {
                    this.drawFallingHex(de);
                }
            });

            // 戦況 (フラッグ数) を更新
            const mainHexes = this.map.hexes.filter(h => h.zone === 'main');
            const flags1 = mainHexes.filter(h => h.hasFlag && h.flagOwner === 1).length;
            const flags2 = mainHexes.filter(h => h.hasFlag && h.flagOwner === 2).length;

            const p1Bar = document.getElementById('p1-bar');
            const p2Bar = document.getElementById('p2-bar');
            const p1Score = document.getElementById('p1-score');
            const p2Score = document.getElementById('p2-score');

            if (p1Bar && p2Bar && p1Score && p2Score) {
                // 片方が0本になった時もバーをゼロに近づけるため、1本以上の時の比率を計算
                const total = flags1 + flags2;
                const p1Ratio = total > 0 ? (flags1 / total) * 100 : 50;
                const p2Ratio = total > 0 ? (flags2 / total) * 100 : 50;
                p1Bar.style.width = `${p1Ratio}%`;
                p2Bar.style.width = `${p2Ratio}%`;
                p1Score.innerText = flags1;
                p2Score.innerText = flags2;

                // アクティブプレイヤーの強調（明滅）
                p1Bar.classList.toggle('active', this.currentPlayer === 1 && !this.gameOver);
                p2Bar.classList.toggle('active', this.currentPlayer === 2 && !this.gameOver);
            }

            this.drawLabel('Player 1', 'hand-p1', '#4ade80', 'left');
            this.drawLabel('Player 2', 'hand-p2', '#f87171', 'right');

            // 勝利判定は checkTurnTransition 等のロジック層で行うように統合

            // 収束演出（フォーカス・エフェクト）の描画
            this.focusEffects.forEach(fe => {
                const hex = fe.targetHex;
                const unitThickness = this.layout.size * 0.12;
                const h = Math.abs(hex.visualHeight) * unitThickness;

                const verts = this.layout.getPolygonVertices(hex, fe.scale);
                this.ctx.save();
                this.ctx.globalAlpha = fe.life;
                this.ctx.strokeStyle = fe.color;
                this.ctx.lineWidth = 4 * fe.life;
                this.ctx.shadowColor = fe.color;
                this.ctx.shadowBlur = 15 * fe.life;

                this.ctx.beginPath();
                // 全頂点を土地の高さ(h)だけ上にずらす
                this.ctx.moveTo(verts[0].x, verts[0].y - h);
                for (let i = 1; i < 6; i++) {
                    this.ctx.lineTo(verts[i].x, verts[i].y - h);
                }
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.restore();
            });

            // ラストムーブ・ハイライト (最前面に描画)
            if (this.lastMoveHex) {
                const hex = this.lastMoveHex;
                const center = this.layout.hexToPixel(hex);
                const unitThickness = this.layout.size * 0.12;
                const h = Math.abs(hex.visualHeight) * unitThickness;
                const tx = center.x, ty = center.y - h;

                this.ctx.save();
                this.ctx.translate(tx, ty);
                const ringVertices = this.layout.getPolygonVertices(hex, 1.2);
                this.ctx.beginPath();
                this.ctx.moveTo(ringVertices[0].x - center.x, ringVertices[0].y - center.y);
                for (let i = 1; i < 6; i++) {
                    this.ctx.lineTo(ringVertices[i].x - center.x, ringVertices[i].y - center.y);
                }
                this.ctx.closePath();

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 2 + Math.sin(this.pulseValue * Math.PI) * 1.5;
                this.ctx.shadowColor = 'white';
                this.ctx.shadowBlur = 10;
                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        // Ver 4.4.3: 落下物の描画
        drawFallingHex(de, ctx = this.ctx, layout = this.layout) {
            const size = layout.size * 1.0;
            const unitThickness = layout.size * 0.12;
            ctx.save();
            ctx.translate(de.x, de.y);
            ctx.globalAlpha = de.alpha;

            if (de.type === 'marker') {
                // インジケータ（白いリング）
                const hex = de.targetHex;
                const ringVertices = layout.getPolygonVertices(hex, 1.2);
                ctx.beginPath();
                // 中心 (0,0) 相対で描画
                const origin = layout.hexToPixel(hex);
                ctx.moveTo(ringVertices[0].x - origin.x, ringVertices[0].y - origin.y);
                for (let i = 1; i < 6; i++) {
                    ctx.lineTo(ringVertices[i].x - origin.x, ringVertices[i].y - origin.y);
                }
                ctx.closePath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 10;
                ctx.stroke();
            } else {
                // 土地（3Dモデル）
                const absH = Math.abs(de.sourceHeight || 1);
                const h = absH * unitThickness;
                const colors = {
                    0: { top: '#1e293b', side: '#0f172a', border: '#334155', highlight: '#475569' },
                    1: { top: '#16a34a', side: '#166534', border: '#064e3b', highlight: '#4ade80' },
                    2: { top: '#dc2626', side: '#991b1b', border: '#7f1d1d', highlight: '#f87171' }
                };
                const color = colors[de.owner] || colors[0];

                const hex = de.targetHex;
                const baseVertices = layout.getPolygonVertices(hex);
                const origin = layout.hexToPixel(hex);
                const vertices = baseVertices.map(v => ({
                    x: v.x - origin.x,
                    y: v.y - origin.y
                }));

                // 共通描画ロジックの使用 (Ver 4.4.14)
                this.drawHexBase(ctx, hex, vertices, h, color);

                // 数値表示の追加 (Ver 4.4.15: 絶対座標 de.x, de.y を考慮)
                if (absH > 0) {
                    // drawHexNumber は絶対座標 (de.x, de.y) に描画するが、
                    // ここでは translate(de.x, de.y) されているので、(0, -h) に描画すべき？
                    // drawHexNumber の実装を見ると setTransform しているので translate の影響を受けない（絶対配置）。
                    // なので、(de.x, de.y - h) を渡せばよい。
                    this.drawHexNumber(ctx, de.x, de.y - h, h, color, de.sourceHeight, layout);
                }
            }

            ctx.restore();
        }

        // Ver 4.6.0: 再構築エフェクト（黄色/水色のドットと数値ポップ）
        triggerReconstructEffect(giver, receiver, updates, pattern) {
            let startHex = giver;
            let endHex = receiver;

            // Ver 4.6.1: P2の場合は逆転させる (Power Flow: Gained Power -> Lost Power? No.)
            // P1 (Positive): -1 (Giver) -> +1 (Receiver). Dot: Giver -> Receiver.
            // P2 (Negative): -1 (Giver, absolute increase) -> +1 (Receiver, absolute decrease).
            // Logic Change (Ver 4.6.2):
            //   Giver (Abs Increase, More Red) -> +1 (Red)
            //   Receiver (Abs Decrease, More Green) -> -1 (Green)
            //   Dot flies from "Weaker" (-1) to "Stronger" (+1).
            //   P1: Giver (-1) -> Receiver (+1). Start=Giver, End=Receiver.
            //   P2: Receiver (-1) -> Giver (+1). Start=Receiver, End=Giver.

            if (this.currentPlayer === 2) {
                startHex = receiver; // The one becoming "weaker" (closer to 0)
                endHex = giver;     // The one becoming "stronger" (further from 0)
            }

            const start = this.layout.hexToPixel(startHex);
            const end = this.layout.hexToPixel(endHex);

            // Ver 4.6.2: ドットの高さを土地の天面に合わせる
            const unitThickness = this.layout.size * 0.12;
            const startH = Math.abs(startHex.height) * unitThickness;
            const endH = Math.abs(endHex.height) * unitThickness;

            // Y座標を補正 (-h, Canvas座標系で上へ)
            start.y -= startH;
            end.y -= endH;

            // 放物線移動ドット (Ver 4.6.2: Color Graduation)
            const isFocus = (pattern === 'focus');

            // RGB Definitions: Magenta(217, 70, 239), Yellow(251, 191, 36)
            const magenta = { r: 217, g: 70, b: 239 };
            const yellow = { r: 251, g: 191, b: 36 };

            this.effects.push({
                x: start.x, y: start.y,
                vx: 0, vy: 0,
                life: 1.0,
                color: isFocus ? '#d946ef' : '#fbbf24', // Start color
                startRGB: isFocus ? magenta : yellow,
                endRGB: isFocus ? yellow : magenta,
                size: isFocus ? 14 : 2,
                startSize: isFocus ? 14 : 2,
                endSize: isFocus ? 2 : 14,
                type: 'reconstruct_dot',
                startX: start.x, startY: start.y,
                endX: end.x, endY: end.y,
                startTime: Date.now(),
                duration: 500,
                giver: giver, receiver: receiver,
                updates: updates
            });
        }

        /**
         * 最小値・最大値統計を更新する (Ver 5.1.0)
         */
        _updateRangeStats() {
            const mainHexes = this.map.mainHexes.filter(h => !h.isDisabled);

            const g1 = mainHexes.filter(h => h.owner === 1).length;
            const g2 = mainHexes.filter(h => h.owner === 2).length;
            const c1 = mainHexes.filter(h => h.owner === 1 && h.isCore).length;
            const c2 = mainHexes.filter(h => h.owner === 2 && h.isCore).length;

            const s1 = this.achievementManager.stats[1];
            const s2 = this.achievementManager.stats[2];

            s1.gridCount.update(g1);
            s1.gridDiff.update(g1 - g2);
            s1.coreCount.update(c1);
            s1.coreDiff.update(c1 - c2);

            s2.gridCount.update(g2);
            s2.gridDiff.update(g2 - g1);
            s2.coreCount.update(c2);
            s2.coreDiff.update(c2 - c1);

            // maxCellEnergy の更新
            const mainEnergyHexes = mainHexes.filter(h => h.energy !== undefined);
            const maxEnergy = mainEnergyHexes.length > 0 ? Math.max(...mainEnergyHexes.map(h => h.energy)) : 0;
            s1.maxCellEnergy.update(maxEnergy);
            s2.maxCellEnergy.update(maxEnergy);
        }
    }

    window.BurstCascade.Game = Game;
    window.game = new Game();
})();
