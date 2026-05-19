import { HexMap } from './map.js';
import { AI } from './ai.js';

/**
 * ゲームの進行状態（開始、終了、ターン管理）を担当するクラス
 */
export class GameStateManager {
    constructor(game) {
        this.game = game;
    }

    startGame() {
        const g = this.game;
        const oldNotify = document.getElementById('achievement-notification');
        if (oldNotify) oldNotify.remove();

        // ゲーム開始時にチュートリアル状態を確実に非表示リセット (No.05)
        if (window.tutorialManager) {
            window.tutorialManager.isShowing = false;
            const tooltipEl = document.getElementById('tutorial-tooltip');
            if (tooltipEl) tooltipEl.classList.add('hidden');
            const maskCanvas = document.getElementById('tutorial-mask-canvas');
            if (maskCanvas) maskCanvas.classList.add('hidden');
        }

        const modeEl = g.playerSelect ? g.playerSelect.querySelector('.selected') : null;
        const sizeEl = g.sizeSelect ? g.sizeSelect.querySelector('.selected') : null;
        const aiLevelEl = g.aiLevelSelect ? g.aiLevelSelect.querySelector('.selected') : null;

        const mode = modeEl ? modeEl.dataset.value : 'pvc';
        const size = sizeEl ? sizeEl.dataset.value : 'regular';
        const aiLevel = aiLevelEl ? aiLevelEl.dataset.value : 'normal';

        g.sound.startBgm('game');
        g.gameMode = mode;
        g.saveSettings();

        g.map = new HexMap(4, size);
        if (mode === 'pvc') {
            g.ai = new AI(2, aiLevel);
        }
        g.resize();

        g.turnCount = 1;
        g.winner = undefined;

        const initialGridCounts = {
            1: g.map.mainHexes.filter(h => h.owner === 1).length,
            2: g.map.mainHexes.filter(h => h.owner === 2).length
        };
        const initialCoreCounts = {
            1: g.map.mainHexes.filter(h => h.owner === 1 && h.hasFlag).length,
            2: g.map.mainHexes.filter(h => h.owner === 2 && h.hasFlag).length
        };
        g.achievementManager.startNewGame(initialGridCounts, initialCoreCounts);

        const totalCores = (initialCoreCounts[1] || 0) + (initialCoreCounts[2] || 0);
        g.sound.updateContextData(initialCoreCounts[1], initialCoreCounts[2], totalCores);

        g.coinToss.result = Math.random() < 0.5 ? 1 : 2;
        g.coinToss.active = true;
        g.coinToss.phase = 'gathering';
        g.coinToss.timer = 0;
        g.coinToss.pulse = 0;
        g.coinToss.ripple = 0;
        g.coinToss.ballSize = 0;
        g.coinToss.showArrow = false;

        const count = 80;
        g.coinToss.totalParticles = count;
        g.coinToss.arrivedParticlesCount = 0;
        g.coinToss.particles = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 600 + Math.random() * 400;
            g.coinToss.particles.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                speed: 0.3 + Math.random() * 0.4,
                player: Math.random() < 0.5 ? 1 : 2,
                size: 2 + Math.random() * 3,
                active: true
            });
        }

        g.currentPlayer = 0;
        g.gameOver = false;
        g.hoveredHex = null;
        g.selectedHex = null;
        g.hoveredNeighbors = [];
        g.isProcessingMove = false;
        g.pendingRewards = [];
        g.dropEffects = [];
        g.effects = [];
        g.lastMoveHex = null;
        g.coinToss.active = true;

        this.resetTurnStats();

        if (g.overlay) {
            g.overlay.classList.add('hidden');
            g.modeSelection.classList.add('hidden');
            g.gameOverContent.classList.add('hidden');
        }

        if (g.aiTimer) {
            clearTimeout(g.aiTimer);
            g.aiTimer = null;
        }
        if (g.aiOverlay) {
            g.aiOverlay.classList.add('hidden');
        }

        g.render();
    }

    resetToTitle() {
        const g = this.game;
        const oldNotify = document.getElementById('achievement-notification');
        if (oldNotify) oldNotify.remove();

        g.gameOver = false;
        g.gameMode = null;
        g.currentPlayer = 1;
        g.map = null;
        g.hoveredHex = null;
        g.selectedHex = null;
        g.hoveredNeighbors = [];
        g.effects = [];
        g.dropEffects = [];
        g.delayedBursts = [];
        g.lastMoveHex = null;
        g.coinToss.active = false;
        g.isProcessingMove = false;
        g.isAIThinking = false;
        g.turnEndRequested = false;

        // タイトルに戻る際にもチュートリアルを確実に非表示クリア
        if (window.tutorialManager) {
            window.tutorialManager.isShowing = false;
            const tooltipEl = document.getElementById('tutorial-tooltip');
            if (tooltipEl) tooltipEl.classList.add('hidden');
            const maskCanvas = document.getElementById('tutorial-mask-canvas');
            if (maskCanvas) maskCanvas.classList.add('hidden');
        }

        if (g.aiTimer) {
            clearTimeout(g.aiTimer);
            g.aiTimer = null;
        }
        if (g.aiOverlay) {
            g.aiOverlay.classList.add('hidden');
        }

        g.sound.stopBgm();
        g.ui.showModeSelection();
    }

    checkTurnTransition() {
        const g = this.game;
        if (g.effects.length > 0 || g.pendingRewards.length > 0 || g.dropEffects.length > 0 || g.isWaitingForDrop) {
            return;
        }
        this.checkGameOverStatus();
        if (g.gameOver) return;

        if (g.turnEndRequested) {
            g.turnEndRequested = false;
            this._updateRangeStats();

            g.chains[g.currentPlayer].self = 0;
            const nextPlayer = (g.currentPlayer === 1 ? 2 : 1);
            g.currentPlayer = nextPlayer;
            g.isProcessingMove = false;
            g.turnCount++;

            g.achievementManager.startNewTurn();
            this.resetTurnStats();

            g.sound.playTurnChange();

            // 【移送先①】：通常のターン交代により、Player 1のターンが開始されたその瞬間 (1回限り)
            if (g.gameMode && g.currentPlayer === 1 && window.tutorialManager) {
                window.tutorialManager.checkTrigger('turnStart', { game: g });
            }

            if (g.gameMode === 'pvc' && g.currentPlayer === 2 && !g.gameOver) {
                if (g.aiTimer) clearTimeout(g.aiTimer);
                g.aiTimer = setTimeout(() => this.handleCPUTurn(), 400);
            }
        } else if (g.isProcessingMove) {
            g.isProcessingMove = false;
            if (g.gameMode === 'pvc' && g.currentPlayer === 2 && !g.gameOver) {
                if (g.aiTimer) clearTimeout(g.aiTimer);
                g.aiTimer = setTimeout(() => this.handleCPUTurn(), 400);
            }
        }
    }

    finalizeTurn(hadBurst) {
        const g = this.game;
        const handZoneId = `hand-p${g.currentPlayer}`;
        const pattern = hadBurst ? 'diffuse' : 'focus';
        const result = g.map.calculateHandUpdate(handZoneId, pattern);

        if (result && result.success) {
            g.triggerReconstructEffect(result.giver, result.receiver, result.updates, pattern);
        }

        const shouldContinue = hadBurst && !g.turnHadSelfReward;
        if (shouldContinue) {
            // Wait for effects to clear
        } else {
            g.turnEndRequested = true;
        }
    }

    resetTurnStats() {
        const g = this.game;
        g.turnActionCount = 0;
        g.turnBurstCount = 0;
        g.turnStartCores = { ...g.map.cores };
        g.turnStartEnergy = { 1: g.map.players[1].energy, 2: g.map.players[2].energy };
    }

    triggerDropSequence(targetHex) {
        const g = this.game;
        g.hoveredHex = null;
        g.selectedHex = null;
        g.hoveredNeighbors = [];

        g.isProcessingMove = true;
        g.lastMoveHex = targetHex;
        g.isWaitingForDrop = true;
        g.turnHadBurst = false;
        g.turnHadReward = false;
        g.turnHadSelfReward = false;

        g.turnActionCount = (g.turnActionCount || 0) + 1;
        g.achievementManager.startNewAction();

        g.currentActionWaveCount = 0;
        g.turnStartOwners = new Map(g.map.mainHexes.map(h => [`${h.q},${h.r}`, h.owner]));
        g.dropEffects = [];

        const handZoneId = `hand-p${g.currentPlayer}`;
        const handHexes = g.map.hexes.filter(h => h.zone === handZoneId);
        const handOffset = g.map.offsets[handZoneId];

        handHexes.forEach((handHex, i) => {
            const dq = handHex.q - handOffset.q;
            const dr = handHex.r - handOffset.r;
            const mapHex = g.map.getHexAt(targetHex.q + dq, targetHex.r + dr, 'main');

            if (mapHex && !mapHex.isDisabled) {
                const targetPos = g.layout.hexToPixel(mapHex);
                if (handHex.height === 0) {
                    this.handleDropImpact({
                        targetHex: mapHex,
                        sourceHeight: 0,
                        owner: handHex.owner,
                        type: 'land'
                    });
                } else {
                    g.dropEffects.push({
                        q: mapHex.q,
                        r: mapHex.r,
                        targetHex: mapHex,
                        sourceHeight: handHex.height,
                        x: targetPos.x,
                        y: targetPos.y - 400,
                        targetY: targetPos.y,
                        alpha: 0,
                        state: 'appearing',
                        hoverTimer: 5 + Math.random() * 5,
                        velocity: 0,
                        landed: false,
                        type: 'land',
                        owner: handHex.owner
                    });
                }
            }
        });

        const targetPos = g.layout.hexToPixel(targetHex);
        const centerHandHex = handHexes.find(h => (h.q - handOffset.q) === 0 && (h.r - handOffset.r) === 0);
        const centerHeight = centerHandHex ? centerHandHex.height : 0;
        const unitThickness = g.layout.size * 0.12;
        const h = Math.abs(centerHeight) * unitThickness;
        const objectTargetY = targetPos.y - h;

        g.dropEffects.push({
            q: targetHex.q,
            r: targetHex.r,
            targetHex: targetHex,
            x: targetPos.x,
            y: objectTargetY - 400,
            targetY: objectTargetY,
            alpha: 0,
            state: 'appearing',
            hoverTimer: 99999,
            velocity: 0,
            landed: false,
            type: 'marker',
            owner: 0
        });

        g.sound.playPlace();
    }

    handleDropImpact(effect) {
        const g = this.game;
        if (effect.targetHex) {
            effect.targetHex.isHidden = false;
        }
        if (effect.type === 'land') {
            const hex = effect.targetHex;
            hex.height += effect.sourceHeight;
            hex.updateOwner();

            if (hex.hasFlag) {
                if (hex.owner === 0 || hex.owner !== hex.flagOwner) {
                    const flagOwner = hex.flagOwner;
                    hex.hasFlag = false;
                    const stats = g.achievementManager.stats[g.currentPlayer];
                    stats.neutralized[flagOwner].add(1);
                    stats.neutralized.both.add(1);
                }
            }

            if (effect.sourceHeight > 0) {
                const pos = g.layout.hexToPixel(hex);
                const unitThickness = g.layout.size * 0.12;
                const h = Math.abs(hex.visualHeight) * unitThickness;
                const color = effect.owner === 1 ? '#4ade80' : '#f87171';
                for (let i = 0; i < 5; i++) {
                    g.effects.push({
                        x: pos.x, y: pos.y - h,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 0.5 + Math.random() * 0.5,
                        color: color,
                        size: 2 + Math.random() * 3
                    });
                }
            }
        } else if (effect.type === 'marker') {
            g.sound.playPlace();
        }
    }

    processChainReaction(skipTutorial = false) {
        const g = this.game;

        const overflowedHexes = g.map.mainHexes.filter(h => h.height > 9 || h.height < -9);

        if (overflowedHexes.length === 0) {
            const marker = g.dropEffects.find(de => de.type === 'marker');
            if (marker) {
                marker.state = 'falling';
                marker.hoverTimer = 0;
            } else {
                this.finalizeTurn(false);
            }
            return;
        }

        // ★ 移送先：実際に爆発（バースト）が発生することが100%確定した、爆発キック直前の瞬間 (1回限り)
        if (g.currentPlayer === 1 && window.tutorialManager && !skipTutorial) {
            if (window.tutorialManager.checkTrigger('burst', { game: g })) {
                // チュートリアルが表示されたため、連鎖爆発の実行を引き止めてフリーズ
                g.pendingAction = () => {
                    this.processChainReaction(true); // 再開時は判定をバイパスして即座に爆発！
                };
                return;
            }
        }

        overflowedHexes.forEach(h => {
            const energy = Math.abs(h.height);
            const stats = g.achievementManager.stats[g.currentPlayer];
            stats.maxCellEnergy.update(energy);
        });

        overflowedHexes.forEach((hex, i) => {
            const originalOwner = hex.owner;
            const delay = i * 150;
            setTimeout(() => {
                this.triggerBurst(hex, originalOwner);
            }, delay);
        });

        g.currentActionWaveCount = (g.currentActionWaveCount || 0) + 1;

        const totalDelay = overflowedHexes.length * 150 + 600;
        setTimeout(() => {
            const nextOverflowed = g.map.mainHexes.filter(h => h.height > 9 || h.height < -9);
            if (nextOverflowed.length > 0) {
                this.processChainReaction();
            } else {
                const marker = g.dropEffects.find(de => de.type === 'marker');
                if (marker) {
                    marker.state = 'falling';
                    marker.hoverTimer = 0;
                } else {
                    this.finalizeTurn(true);
                }
            }
        }, totalDelay);
    }

    triggerBurst(hex, originalOwner) {
        const g = this.game;
        const center = g.layout.hexToPixel(hex);
        const playerColors = { 1: '#4ade80', 2: '#f87171' };
        const color = playerColors[originalOwner] || '#ffffff';
        const isEnemyOverflow = (originalOwner !== 0 && originalOwner !== g.currentPlayer);

        const targetType = isEnemyOverflow ? 'enemy' : 'self';
        const threshold = isEnemyOverflow ? 2 : 4;
        const targetIdx = g.chains[g.currentPlayer][targetType];
        const targetDotKey = `${g.currentPlayer}-${targetType}-${targetIdx}`;

        let reward = null;
        if (targetIdx === threshold - 1) {
            reward = this.queueReward(g.currentPlayer, targetType);
        }

        const hadFlag = hex.hasFlag;
        const flagOwner = hex.flagOwner;
        hex.height = 0;
        hex.updateOwner();
        if (hex.hasFlag) {
            if (hex.owner === 0 || hex.owner !== hex.flagOwner) {
                hex.hasFlag = false;
            }
        }
        g.chains[g.currentPlayer][targetType]++;

        g.turnHadBurst = true;
        g.turnBurstCount = (g.turnBurstCount || 0) + 1;

        const stats = g.achievementManager.stats[g.currentPlayer];
        if (hadFlag) {
            stats.burstCore[originalOwner].add(1);
            stats.burstCore.both.add(1);
            stats.neutralized[flagOwner].add(1);
            stats.neutralized.both.add(1);
        } else {
            stats.burstGrid[originalOwner].add(1);
            stats.burstGrid.both.add(1);
        }

        g.sound.playBurst();
        const unitThickness = g.layout.size * 0.12;
        const h = Math.abs(hex.visualHeight) * unitThickness;
        g.addParticles(center.x, center.y - h, color, isEnemyOverflow, targetDotKey, null, reward);
    }

    handleCPUTurn() {
        const g = this.game;
        if (g.gameOver || g.isAIThinking || g.currentPlayer !== 2) return;
        
        g.isAIThinking = true;
        if (g.aiOverlay) g.aiOverlay.classList.remove('hidden');

        const startTime = Date.now();
        const bestMove = g.ai.getBestMove(g.map, g.chains);

        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, 1000 - elapsed);
        
        setTimeout(() => {
            if (g.aiOverlay) g.aiOverlay.classList.add('hidden');
            g.isAIThinking = false;

            if (bestMove) {
                this.executeMoveAt(bestMove.q, bestMove.r);
            }
        }, waitTime);
    }

    executeMoveAt(q, r) {
        const g = this.game;
        const hex = g.map.getHexAt(q, r, 'main');
        if (hex) {
            g.handleClick({
                clientX: 0, clientY: 0,
                isSimulated: true,
                simulatedHex: hex
            });
        }
    }

    triggerRewardFlow(reward, dotPos) {
        const g = this.game;
        if (reward && reward.status === 'pending') {
            reward.status = 'flowing';
            if (reward.type === 'self') {
                const handZoneId = `hand-p${reward.player}`;
                const handHexes = g.map.hexes.filter(h => h.zone === handZoneId);
                const candidates = handHexes.filter(h =>
                    (reward.player === 1 && h.height < 5) || (reward.player === 2 && h.height > -5)
                );
                reward.targetHex = candidates.length > 0 ?
                    candidates[Math.floor(Math.random() * candidates.length)] :
                    handHexes[Math.floor(Math.random() * handHexes.length)];
            } else {
                const candidateHexes = g.map.hexes.filter(h =>
                    h.zone === 'main' && h.owner === reward.player && !h.hasFlag
                );

                if (candidateHexes.length > 0) {
                    reward.targetHex = candidateHexes[Math.floor(Math.random() * candidateHexes.length)];
                }
            }

            if (!reward.targetHex) {
                g.pendingRewards = g.pendingRewards.filter(r => r !== reward);
            }

            const threshold = (reward.type === 'self' ? 4 : 2);
            g.chains[reward.player][reward.type] = Math.max(0, g.chains[reward.player][reward.type] - threshold);

            g.flashAlpha = 0.3;
            g.addParticles(dotPos.x, dotPos.y, reward.color, true, null, reward.targetHex, reward);
            g.triggerChainAnim(reward.player, reward.type);
        }
    }

    applyRewardEffect(reward) {
        const g = this.game;
        if (!reward || reward.status !== 'flowing') return;
        reward.status = 'applied';

        if (reward.type === 'self') {
            reward.targetHex.height += (reward.player === 1 ? 1 : -1);
            reward.targetHex.height = Math.max(-5, Math.min(5, reward.targetHex.height));
            reward.targetHex.updateOwner();

            const bumpAmt = (reward.player === 1 ? 2.0 : -2.0);
            reward.targetHex.visualHeight += bumpAmt;

            const center = g.layout.hexToPixel(reward.targetHex);
            const unitThickness = g.layout.size * 0.12;
            const h = Math.abs(reward.targetHex.visualHeight) * unitThickness;
            g.addParticles(center.x, center.y - h, reward.color, true);
            g.flashAlpha = 0.4;
        } else {
            reward.targetHex.hasFlag = true;
            reward.targetHex.flagOwner = reward.player;
            const center = g.layout.hexToPixel(reward.targetHex);
            const unitThickness = g.layout.size * 0.12;
            const h = Math.abs(reward.targetHex.visualHeight) * unitThickness;
            g.addParticles(center.x, center.y - h, '#ffffff', true);
            g.addParticles(center.x, center.y - h, reward.color, true);
            g.flashAlpha = 0.5;
        }
        g.pendingRewards = g.pendingRewards.filter(r => r !== reward);
    }

    queueReward(player, type) {
        const g = this.game;
        g.sound.playReward();

        let color = player === 1 ? '#4ade80' : '#f87171';
        const reward = {
            player, type, targetHex: null, color, status: 'pending',
            arrivedCount: 0
        };
        g.turnHadReward = true;

        const stats = g.achievementManager.stats[g.currentPlayer];
        if (type === 'self') {
            g.turnHadSelfReward = true;
            stats.rewardEnergy.add(1);
        } else if (type === 'enemy') {
            stats.rewardCore.add(1);
        }

        g.pendingRewards.push(reward);
        return reward;
    }

    updateHistoryStats() {
        const g = this.game;
        if (!g.map) return;
        this._updateRangeStats();
        g.map.mainHexes.forEach(h => {
            const absH = Math.abs(h.height);
            g.achievementManager.stats[g.currentPlayer].maxCellEnergy.update(absH);
        });
    }

    checkGameOverStatus() {
        const g = this.game;
        if (!g.map || g.gameOver) return;
        const mainHexes = g.map.mainHexes.filter(h => !h.isDisabled);
        const cores1 = mainHexes.filter(h => h.owner === 1 && (h.isCore || h.hasFlag)).length;
        const cores2 = mainHexes.filter(h => h.owner === 2 && (h.isCore || h.hasFlag)).length;

        if (cores1 === 0 && cores2 === 0) {
            g.showGameOver(0);
            return;
        } else if (cores1 === 0) {
            g.showGameOver(2);
            return;
        } else if (cores2 === 0) {
            g.showGameOver(1);
            return;
        }

        if (g.gameMode) {
            const targetBgm = (cores1 === 1 || cores2 === 1) ? 'pinch' : 'game';
            if (g.sound.currentPattern !== targetBgm) {
                g.sound.startBgm(targetBgm);
            }
            g.sound.updateContextData(cores1, cores2);
        }
    }

    /**
     * 最小値・最大値統計を更新する (Ver 5.1.0)
     */
    _updateRangeStats() {
        const g = this.game;
        const mainHexes = g.map.mainHexes.filter(h => !h.isDisabled);

        const g1 = mainHexes.filter(h => h.owner === 1).length;
        const g2 = mainHexes.filter(h => h.owner === 2).length;
        const c1 = mainHexes.filter(h => h.owner === 1 && h.hasFlag).length;
        const c2 = mainHexes.filter(h => h.owner === 2 && h.hasFlag).length;

        const s1 = g.achievementManager.stats[1];
        const s2 = g.achievementManager.stats[2];

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
