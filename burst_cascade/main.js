(function () {
    const { HexMap, Layout } = window.BurstCascade;

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

            // ゲーム状態
            this.currentPlayer = 1;
            this.gameMode = null; // 'pvp' or 'pvc'
            this.ai = new BurstCascade.AI(2);
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
            this.focusEffects = []; // 収束演出用のエフェクト

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

            this.helpCloseBtn = document.getElementById('help-close-btn');
            this.helpBackBtn = document.querySelector('.help-back-btn');

            // 盤面覗き見ボタン
            this.peekBoardBtn = document.getElementById('peek-board-btn');

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
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

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
            this.canvas.addEventListener('touchstart', () => { this.isTouchDevice = true; }, { passive: true });
            this.canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

            this.init();
        }

        showHelp() {
            const isGameRunning = this.gameMode !== null;
            this.overlay.classList.remove('hidden');
            this.helpContent.classList.remove('hidden');
            this.modeSelection.classList.add('hidden');
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
            this.gameOverContent.classList.add('hidden');
        }

        startGame() {
            // 設定の読み取り
            const mode = this.playerSelect.querySelector('.selected').dataset.value; // 'pvc' or 'pvp'
            const size = this.sizeSelect.querySelector('.selected').dataset.value;   // 'regular' or 'mini'
            const aiLevel = this.aiLevelSelect.querySelector('.selected').dataset.value; // 'easy', 'normal', 'hard'

            this.gameMode = mode;
            this.map = new HexMap(4, size); // マップ再生成
            if (mode === 'pvc') {
                this.ai = new BurstCascade.AI(2, aiLevel);
                console.log(`AI initialized with difficulty: ${aiLevel}`);
            }
            this.resize(); // レイアウト再計算

            this.closeOverlay();
            // ゲーム開始
            console.log(`Game started in ${mode} mode with ${size} map.`);
            this.render(); // 初回描画
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

            return rawMessage.replace(/\{W\}/g, winnerName).replace(/\{L\}/g, loserName);
        }

        showGameOver(winner) {
            this.gameOver = true;
            this.overlay.classList.remove('hidden');
            this.gameOverContent.classList.remove('hidden');
            this.modeSelection.classList.add('hidden');
            this.helpContent.classList.add('hidden');
            this.peekBoardBtn.classList.remove('hidden');
            const winnerText = document.getElementById('winner-text');
            const p = this.gameOverContent.querySelector('p');

            if (winner === 0) {
                winnerText.innerText = `DRAW - 共鳴の消失`;
                winnerText.style.background = 'linear-gradient(135deg, #cbd5e1, #94a3b8)';
                if (p) p.innerText = this.getVictoryMessage('DRAW', 0);
            } else {
                winnerText.innerText = `Player ${winner} の勝利！`;
                winnerText.style.background = winner === 1 ?
                    'linear-gradient(135deg, #4ade80, #16a34a)' :
                    'linear-gradient(135deg, #f87171, #dc2626)';

                if (p) {
                    const type = this.getVictoryType(winner);
                    p.innerText = this.getVictoryMessage(type, winner);
                    console.log(`[GameOver] Winner: P${winner}, Type: ${type}`);
                }
            }

            winnerText.style.webkitBackgroundClip = 'text';
            winnerText.style.webkitTextFillColor = 'transparent';
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
            if (this.gameOver) return;
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
                let target = null;
                if (ef.targetDotKey && this.dotTargets[ef.targetDotKey]) {
                    target = this.dotTargets[ef.targetDotKey];
                } else if (ef.targetHex) {
                    target = this.layout.hexToPixel(ef.targetHex);
                }

                let keep = true;
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
                            // 最初の1粒ではなく、ある程度（15粒ほど）届いた瞬間にメイン効果を発動
                            if (ef.reward.arrivedCount === 15) {
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
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

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
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
                hex = this.findHexAt(mouseX, mouseY);
            }

            if (hex && hex.zone === 'main') {
                // Ver 4.0: 無効マスの操作防止
                if (hex.isDisabled) return;

                // 入力ロックのチェック（演出中やAI思考中は無効）
                if (this.isAIThinking || this.isProcessingMove || this.turnEndRequested) return;

                // Ver 4.3: 2ステップ確定ロジック (タッチデバイスの誤操作防止)
                // マウスホバーがない環境（タッチ）を考慮し、1回目で選択、2回目で確定とする。
                // すでにハイライト（hoveredHex）されているマス以外をクリックした場合は、選択のみ行う。
                if (!e.isSimulated && this.hoveredHex !== hex) {
                    this.hoveredHex = hex;
                    this.hoveredNeighbors = [];
                    if (hex.owner === this.currentPlayer) {
                        const directions = [
                            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                            { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
                        ];
                        directions.forEach(dir => {
                            const neighbor = this.map.getHexAt(hex.q + dir.q, hex.r + dir.r, 'main');
                            if (neighbor) this.hoveredNeighbors.push(neighbor);
                        });
                    }
                    this.sound.playPlace(); // 選択音
                    return;
                }

                // PVCモードでCPUのターン中は、人間のクリックを無効化
                if (this.gameMode === 'pvc' && this.currentPlayer === 2 && !e.isSimulated) {
                    if (hex.owner !== 0 && hex.owner !== this.currentPlayer) return;
                    return;
                }

                this.sound.playPlace();
                this.isProcessingMove = true;
                this.lastMoveHex = hex;

                // 収束演出（フォーカス・エフェクト）のトリガー
                const center = this.layout.hexToPixel(hex);
                const color = this.currentPlayer === 1 ? '#4ade80' : '#f87171';
                this.focusEffects.push({
                    targetHex: hex,
                    life: 1.0,
                    scale: 3.0,
                    color: color
                });

                console.log(`[Turn] Player ${this.currentPlayer} moves at q:${hex.q},r:${hex.r}`);

                // 2. 手札の適用
                const handZoneId = `hand-p${this.currentPlayer}`;
                const { overflowOccurred, overflowedOwners, overflowedHexes } = this.map.applyHand(hex, handZoneId);

                // オーバーフロー演出
                const playerColors = { 1: '#4ade80', 2: '#f87171' };
                let nextSelfIdx = this.chains[this.currentPlayer].self;
                let nextEnemyIdx = this.chains[this.currentPlayer].enemy;
                let selfRewardCreated = false;
                let enemyRewardCreated = false;

                overflowedHexes.forEach((h, i) => {
                    const originalOwner = overflowedOwners[i];
                    const center = this.layout.hexToPixel(h);
                    const color = playerColors[originalOwner] || '#ffffff';
                    const isEnemyOverflow = (originalOwner !== 0 && originalOwner !== this.currentPlayer);

                    const targetType = isEnemyOverflow ? 'enemy' : 'self';
                    const currentIdx = isEnemyOverflow ? nextEnemyIdx : nextSelfIdx;
                    const threshold = isEnemyOverflow ? 2 : 4; // Chain length for enemy is 2, for self is 4
                    const targetIdx = currentIdx % threshold; // 常にスロットへ収束

                    const targetDotKey = `${this.currentPlayer}-${targetType}-${targetIdx}`;
                    let reward = null;

                    if (isEnemyOverflow) {
                        if (nextEnemyIdx % threshold === threshold - 1) { // This is the last dot for enemy chain
                            reward = this.queueReward(this.currentPlayer, 'enemy');
                            enemyRewardCreated = true;
                        }
                        this.delayedBursts.push({
                            time: Date.now() + 250,
                            x: center.x, y: center.y,
                            color: color, isBig: true,
                            targetDotKey: targetDotKey,
                            reward: reward // Pass reward to delayed burst
                        });
                        nextEnemyIdx++;
                    } else {
                        if (nextSelfIdx % threshold === threshold - 1) { // This is the last dot for self chain
                            reward = this.queueReward(this.currentPlayer, 'self');
                            selfRewardCreated = true;
                        }
                        nextSelfIdx++;
                    }
                    this.addParticles(center.x, center.y, color, isEnemyOverflow, targetDotKey, null, reward);
                });

                // Update chain counts (カウントはリセットせず、演出終了時に triggerRewardFlow で減算する)
                this.chains[this.currentPlayer].self = nextSelfIdx;
                this.chains[this.currentPlayer].enemy = nextEnemyIdx;

                // 3. 手札の更新
                const pattern = overflowOccurred ? 'diffuse' : 'focus';
                this.map.performHandUpdate(handZoneId, pattern);

                // 4. ターン交代の管理
                // 自陣の報酬が発生したか、バーストが発生していない場合に手番終了
                // (敵陣の報酬＝旗の獲得であれば、バースト中なら手番は継続する)
                if (!overflowOccurred || selfRewardCreated) {
                    this.turnEndRequested = true;
                    console.log(`[Turn] End requested for Player ${this.currentPlayer} (Reward or No Burst)`);
                } else {
                    // 連鎖継続の場合
                    console.log(`[Turn] Chain continues for Player ${this.currentPlayer}`);
                }
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


        queueReward(player, type) {
            this.sound.playReward();
            console.log(`[Reward] queueReward: player=${player}, type=${type}`);
            let color = player === 1 ? '#4ade80' : '#f87171';
            const reward = {
                player, type, targetHex: null, color, status: 'pending',
                arrivedCount: 0
            };
            this.pendingRewards.push(reward);
            return reward;
        }

        /**
         * 演出がすべて完了したかチェックし、必要なら手番を交代する
         */
        checkTurnTransition() {
            // 演出中（パーティクル飛翔中・報酬処理中）は、手番交代もロック解除も行わない
            if (this.effects.length > 0 || this.pendingRewards.length > 0) return;

            // 1. 勝利条件のチェック (修正: 常に優先確認)
            // 演出ブロックが解除されたタイミングで、盤面状態を確認する
            this.checkGameOverStatus();
            if (this.gameOver) return;

            if (this.turnEndRequested) {
                // すべての演出が完了し、手番終了がリクエストされている場合
                this.turnEndRequested = false;
                this.isProcessingMove = false;

                // 自陣の連鎖カウントのみリセットして交代
                this.chains[this.currentPlayer].self = 0;
                this.currentPlayer = (this.currentPlayer === 1 ? 2 : 1);
                this.sound.playTurnChange();
                console.log(`[Turn] Swapped to Player ${this.currentPlayer}`);

                if (this.gameMode === 'pvc' && this.currentPlayer === 2 && !this.gameOver) {
                    setTimeout(() => this.handleCPUTurn(), 300);
                }
            } else if (this.isProcessingMove) {
                // 手番は継続するが、演出（連鎖アニメーション）がすべて完了した場合
                this.isProcessingMove = false;
                console.log(`[Turn] Lock released for Player ${this.currentPlayer} (Chain continue)`);

                // CPUの継続ターンの場合、思考を再開
                if (this.gameMode === 'pvc' && this.currentPlayer === 2 && !this.gameOver) {
                    setTimeout(() => this.handleCPUTurn(), 300);
                }
            }
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
                reward.targetHex.updateOwner();

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
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
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

        drawHex(hex) {
            const vertices = this.layout.getPolygonVertices(hex);
            const ctx = this.ctx;

            // Ver 4.0: 無効マスの描画
            if (hex.isDisabled) {
                ctx.beginPath();
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < 6; i++) {
                    ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                ctx.closePath();
                ctx.fillStyle = '#111827'; // 非常に暗い背景色
                ctx.fill();
                ctx.strokeStyle = '#1e293b'; // 暗い境界線
                ctx.lineWidth = 1;
                ctx.stroke();
                return; // ここで終了
            }

            const unitThickness = this.layout.size * 0.12;
            const absH = Math.abs(hex.visualHeight);
            const h = absH * unitThickness;

            // オーナー判定 (内部状態の高さに基づく)
            let owner = 0;
            if (hex.height > 0) owner = 1;
            else if (hex.height < 0) owner = 2;
            else if (hex.owner !== 0) owner = hex.owner; // 高さ0でもオーナー情報があれば反映

            const colors = {
                0: { top: '#1e293b', side: '#0f172a', border: '#334155', highlight: '#475569' },
                1: { top: '#16a34a', side: '#166534', border: '#064e3b', highlight: '#4ade80' },
                2: { top: '#dc2626', side: '#991b1b', border: '#7f1d1d', highlight: '#f87171' }
            };
            const color = { ...colors[owner] };

            if (this.hoveredHex === hex) {
                color.top = this.adjustColor(color.top, 50);
            } else if (this.hoveredNeighbors.includes(hex)) {
                color.top = this.adjustColor(color.top, 25); // 周辺は控えめに
            }

            // 1. 側面
            if (absH > 0) {
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

            // ハイライト
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

            // 3. 数値表示
            if (absH > 0) {
                const center = this.layout.hexToPixel(hex);
                const tx = center.x, ty = center.y - h;
                ctx.save();
                const { angle, tilt, scaleY } = this.layout.projection;
                const cosA = Math.cos(angle), sinA = Math.sin(angle);
                const a = cosA, b = (sinA - cosA * tilt) * scaleY, c = -sinA, d = (cosA + sinA * tilt) * scaleY;
                ctx.setTransform(a, b, c, d, tx, ty);
                const fontSize = this.layout.size * 1.4;
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const shadowColor = this.adjustColor(color.top, -40);
                const highlightColor = this.adjustColor(color.top, 40);
                const textColor = this.adjustColor(color.top, 10);
                const roundedH = Math.abs(Math.round(hex.visualHeight));
                ctx.fillStyle = shadowColor;
                ctx.fillText(roundedH, 1, 1);
                ctx.fillStyle = highlightColor;
                ctx.fillText(roundedH, -1, -1);
                ctx.fillStyle = textColor;
                ctx.fillText(roundedH, 0, 0);
                ctx.restore();
            }

            // 4. 共鳴中枢（コア）の描画
            if (hex.visualFlagScale > 0.01) {
                const center = this.layout.hexToPixel(hex);
                const tx = center.x, ty = center.y - h;
                const coreSize = this.layout.size * 0.4 * hex.visualFlagScale;
                const playerColor = hex.flagOwner === 1 ? '#4ade80' : '#f87171';

                // フローティング・アニメーション（速度をゆっくりに）
                const floatY = Math.sin(this.pulseValue * Math.PI) * 4 * hex.visualFlagScale;

                ctx.save();
                ctx.translate(tx, ty);

                // A. ベースリング（接地面のエネルギー）
                ctx.beginPath();
                ctx.ellipse(0, 0, coreSize * 1.2, coreSize * 0.6, 0, 0, Math.PI * 2);
                ctx.strokeStyle = playerColor;
                ctx.lineWidth = 2 * (0.5 + this.pulseValue * 0.5) * hex.visualFlagScale;
                ctx.globalAlpha = (0.3 + this.pulseValue * 0.4) * hex.visualFlagScale;
                ctx.stroke();

                // B. コア本体（結晶体 - 八面体）: 数値を避けるため少し上方に移動
                ctx.translate(0, -coreSize * 2.2 + floatY);
                ctx.globalAlpha = 1.0 * hex.visualFlagScale;

                // 結晶内部の発光
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

                const halfW = coreSize * 0.8;
                const halfH = coreSize * 1.3;

                // 上半分 (前面2面)
                drawCrystalFace([{ x: 0, y: -halfH }, { x: -halfW, y: 0 }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, -20), playerColor);
                drawCrystalFace([{ x: 0, y: -halfH }, { x: halfW, y: 0 }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, 20), playerColor);

                // 下半分 (前面2面)
                drawCrystalFace([{ x: -halfW, y: 0 }, { x: 0, y: halfH }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, -40), playerColor);
                drawCrystalFace([{ x: halfW, y: 0 }, { x: 0, y: halfH }, { x: 0, y: halfW * 0.5 }], this.adjustColor(playerColor, 0), playerColor);

                // ハイライト線
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
                // ブラウザ負荷が極めて高いため shadowBlur を廃止。
                // 代わりにわずかに色を明るくして透明度で煌めきを表現。
                this.ctx.beginPath();
                this.ctx.arc(ef.x, ef.y, ef.size || 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
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
    }

    new Game();
})();
