import { GameStateCore } from './gameState/GameStateCore.js';
import { SequenceManager } from './sequence/SequenceManager.js';
import { RewardManager } from './reward/RewardManager.js';

/**
 * Wrapper preserving original GameStateManager API.
 * Delegates lifecycle to GameStateCore, turn logic to SequenceManager,
 * and reward handling to RewardManager.
 */
export class GameStateManager {
    constructor(game) {
        this.game = game;
        // Core handles overall game lifecycle (start, reset, checks)
        this.core = new GameStateCore(game);
        // Reward manager handles reward queueing and flow
        this.reward = new RewardManager(game);
        // Sequence manager handles drop sequence, chain reactions, bursts, AI turn etc.
        this.seq = new SequenceManager(game, this.reward);
    }

    // ----- Core lifecycle -----
    startGame() {
        this.core.startGame();
    }

    resetToTitle() {
        this.core.resetToTitle();
    }

    checkTurnTransition() {
        this.core.checkTurnTransition();
    }

    finalizeTurn(hadBurst) {
        this.core.finalizeTurn(hadBurst);
    }

    resetTurnStats() {
        this.core.resetTurnStats();
    }

    updateHistoryStats() {
        this.core.updateHistoryStats();
    }

    checkGameOverStatus() {
        this.core.checkGameOverStatus();
    }

    // ----- Sequence related -----
    triggerDropSequence(targetHex) {
        this.seq.triggerDropSequence(targetHex);
    }

    handleDropImpact(effect) {
        this.seq.handleDropImpact(effect);
    }

    processChainReaction(skipTutorial = false) {
        this.seq.processChainReaction(skipTutorial);
    }

    triggerBurst(hex, originalOwner) {
        this.seq.triggerBurst(hex, originalOwner);
    }

    handleCPUTurn() {
        this.seq.handleCPUTurn();
    }

    executeMoveAt(q, r) {
        this.seq.executeMoveAt(q, r);
    }

    // ----- Reward related -----
    queueReward(player, type) {
        return this.reward.queueReward(player, type);
    }

    triggerRewardFlow(reward, dotPos) {
        this.reward.triggerRewardFlow(reward, dotPos);
    }

    applyRewardEffect(reward) {
        this.reward.applyRewardEffect(reward);
    }
}
