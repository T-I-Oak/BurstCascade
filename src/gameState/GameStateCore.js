import { HexMap } from '../map.js';
import { AI } from '../ai.js';

/**
 * Core game state logic (previously GameStateManager). Handles lifecycle and high‑level state.
 */
export class GameStateCore {
    constructor(game) {
        this.game = game;
    }

    startGame() {
        const g = this.game;
        const oldNotify = document.getElementById('achievement-notification');
        if (oldNotify) oldNotify.remove();

        // Reset tutorial visibility
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
        if (g.ui) g.ui.setHeaderTitleMode(false);

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

        // Ensure tutorial UI cleared
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
            if (g.gameMode && g.currentPlayer === 1 && window.tutorialManager) {
                window.tutorialManager.checkTrigger('turnStart', { game: g });
            }
            if (g.gameMode === 'pvc' && g.currentPlayer === 2 && !g.gameOver) {
                if (g.aiTimer) clearTimeout(g.aiTimer);
                g.aiTimer = setTimeout(() => g.state.handleCPUTurn(), 400);
            }
        } else if (g.isProcessingMove) {
            g.isProcessingMove = false;
            if (g.gameMode === 'pvc' && g.currentPlayer === 2 && !g.gameOver) {
                if (g.aiTimer) clearTimeout(g.aiTimer);
                g.aiTimer = setTimeout(() => g.state.handleCPUTurn(), 400);
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
            // wait for effects to clear (no action needed)
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
        if (cores1 === 0 && cores2 === 0) { g.showGameOver(0); return; }
        if (cores1 === 0) { g.showGameOver(2); return; }
        if (cores2 === 0) { g.showGameOver(1); return; }
        if (g.gameMode) {
            const targetBgm = (cores1 === 1 || cores2 === 1) ? 'pinch' : 'game';
            if (g.sound.currentPattern !== targetBgm) {
                g.sound.startBgm(targetBgm);
            }
            g.sound.updateContextData(cores1, cores2);
        }
    }

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
        const mainEnergyHexes = mainHexes.filter(h => h.energy !== undefined);
        const maxEnergy = mainEnergyHexes.length > 0 ? Math.max(...mainEnergyHexes.map(h => h.energy)) : 0;
        s1.maxCellEnergy.update(maxEnergy);
        s2.maxCellEnergy.update(maxEnergy);
    }
}
