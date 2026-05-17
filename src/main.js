import { HexMap, Layout } from './map.js';
import { AchievementManager } from './achievements.js';
import { AI } from './ai.js';
import { Constants } from './constants.js';
import { Utils } from './utils.js';
import { SoundManager } from './sound.js';
import { Renderer } from './renderer.js';
import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';
import { setAppVersion } from 'https://t-i-oak.github.io/GameWorksOAK/lib/utils/env.js';
import { shareResult } from './share.js';
import { UIManager } from './uiManager.js';
import { InputHandler } from './inputHandler.js';
import { AnimationManager } from './animationManager.js';
import { GameStateManager } from './gameStateManager.js';

// 共通ライブラリをプロジェクトのバージョンで初期化
setAppVersion(__APP_VERSION__);

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.map = new HexMap(4);
        this.layout = null;
        this.sound = new SoundManager();
        this.renderer = new Renderer(this);
        this.achievementManager = new AchievementManager();

        // 各種マネージャーの初期化 (No.01)
        this.ui = new UIManager(this);
        this.input = new InputHandler(this);
        this.animations = new AnimationManager(this);
        this.state = new GameStateManager(this);

        // ゲーム状態
        this.currentPlayer = 1;
        this.gameMode = null; // 'pvp' or 'pvc'
        this.ai = new AI(2);
        this.isAIThinking = false;
        this.turnEndRequested = false; // 手番交代の予約フラグ
        this.isProcessingMove = false; // 現在移動・演出処理中か

        this.hoveredHex = null;
        this.selectedHex = null; // Ver 5.2.8: 確定待ち状態のマスを管理
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

        // 先行抽選演出用 (Ver 5.3.0: 「共鳴同調」演出へ刷新)
        this.coinToss = {
            active: false,
            phase: 'gathering', // gathering -> fusion -> burst -> stabilized
            timer: 0,
            result: 0,
            particles: [],
            pulse: 0,
            ripple: 0,
            ballSize: 0,
            showArrow: false // 確定時にラベルの◀を表示するフラグ
        };

        // UI初期化 (No.02)
        this.ui.init();

        this.focusEffects = [];
        this.dropEffects = [];
        this.aiTimer = null;

        // Achievement Stats (Ver 4.6.8: UI以外の初期化は常に行う)
        this.turnCount = 0;
        if (this.achievementManager) {
            this.achievementManager.startNewGame();
        }

        this.input.init();

        this.loadSettings(); // 設定の読み込み
        this.resize(); // Ver 5.2.3: Always resize to setup layout even in tests

        // アニメーションループのみテスト環境で抑制
        if (!window.IS_TESTING) {
            requestAnimationFrame((t) => this.animate(t));
        }
    }

    init() {
        this.resize();
        requestAnimationFrame((t) => this.animate(t));
    }

    showHelp() {
        this.ui.showHelp();
    }

    // Ver 4.7.7: Fundamental State Reset
    resetToTitle() {
        this.state.resetToTitle();
    }

    showModeSelection() {
        this.ui.showModeSelection();
    }

    startGame() {
        this.state.startGame();
    }

    showAchievements() {
        this.ui.showAchievements();
    }

    // --- Settings Persistence (Ver 4.5.3) ---
    applySetting(groupId, value) {
        this.ui.applySetting(groupId, value);
    }

    saveSettings() {
        const modeEl = this.playerSelect ? this.playerSelect.querySelector('.selected') : null;
        const sizeEl = this.sizeSelect ? this.sizeSelect.querySelector('.selected') : null;
        const aiLevelEl = this.aiLevelSelect ? this.aiLevelSelect.querySelector('.selected') : null;

        const settings = {
            mode: modeEl ? modeEl.dataset.value : 'pvc',
            size: sizeEl ? sizeEl.dataset.value : 'regular',
            aiLevel: aiLevelEl ? aiLevelEl.dataset.value : 'normal',
            volume: this.volumeSlider ? this.volumeSlider.value : 50
        };
        DataManager.setSavedData('burst-cascade-settings', settings);
    }

    loadSettings() {
        const migrationMap = {
            init: () => ({
                mode: 'pvc',
                size: 'regular',
                aiLevel: 'normal',
                volume: 50
            })
        };
        const settings = DataManager.getSavedData('burst-cascade-settings', migrationMap);
        
        try {
            this.applySetting('player-select', settings.mode);
            this.applySetting('size-select', settings.size);
            this.applySetting('ai-level-select', settings.aiLevel);

            if (this.volumeSlider) {
                this.volumeSlider.value = settings.volume;
                if (this.volumeValue) this.volumeValue.innerText = `${settings.volume}%`;
            }
            if (this.sound) {
                this.sound.masterVolume = settings.volume / 100;
                this.sound.updateVolume();
            }

            // AIレベルグループの表示制御
            if (this.aiLevelGroup) {
                if (settings.mode === 'pvc') {
                    this.aiLevelGroup.classList.remove('hidden');
                } else {
                    this.aiLevelGroup.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error("Failed to apply settings:", e);
        }
    }

    updateAchievementsUI() {
        this.ui.updateAchievementsUI();
    }

    getVictoryType(winner) {
        return this.ui.getVictoryType(winner);
    }

    getVictoryMessage(type, winner) {
        return this.ui.getVictoryMessage(type, winner);
    }

    showGameOver(winner) {
        this.ui.showGameOver(winner);
    }

    updateHistoryStats() {
        this.state.updateHistoryStats();
    }

    closeOverlay() {
        this.ui.closeOverlay();
    }

    checkGameOverStatus() {
        this.state.checkGameOverStatus();
    }

    animate(time) {
        if (!this.lastTime) this.lastTime = time;
        const dt = time - this.lastTime;
        this.lastTime = time;

        // Ver 4.7.9: Permanent Animation Engine
        // Always request next frame even if map is null to keep pulseValue and UI alive.
        requestAnimationFrame((t) => this.animate(t));

        this.pulseValue = (Math.sin(time / 500) + 1) / 2; // 0 to 1

        // --- コイントス演出の更新 (Ver 5.2.0) ---
        if (this.coinToss.active) {
            this.animations.updateCoinToss(dt);
            this.render();
            return;
        }

        // Guard for map-dependent logic
        if (!this.map) {
            this.render(); // Clear canvas and render UI labels if any
            return;
        }

        // アニメーション更新 (No.04)
        this.animations.update(dt);
        this.checkTurnTransition();
        this.render();
    }

    addParticles(x, y, color, isBig = false, targetDotKey = null, targetHex = null, reward = null) {
        this.animations.addParticles(x, y, color, isBig, targetDotKey, targetHex, reward);
    }

    triggerChainAnim(player, type) {
        this.animations.triggerChainAnim(player, type);
    }

    handleMouseMove(e) {
        this.input.handleMouseMove(e);
    }

    // Ver 5.3.6: 周囲のハイライト（プレビュー）を更新する共通メソッド
    updateHoveredNeighbors(hex) {
        this.input.updateHoveredNeighbors(hex);
    }

    handleClick(e) {
        this.input.handleClick(e);
    }

    // Ver 4.4.3: 落下演出の開始（ホバーフェーズ含む）
    triggerDropSequence(targetHex) {
        this.state.triggerDropSequence(targetHex);
    }

    // Ver 4.4: 着弾時の処理
    handleDropImpact(effect) {
        this.state.handleDropImpact(effect);
    }

    // Ver 4.4: 連鎖（バースト）の非同期処理
    processChainReaction() {
        this.state.processChainReaction();
    }

    triggerBurst(hex, originalOwner) {
        this.state.triggerBurst(hex, originalOwner);
    }

    finalizeTurn(hadBurst) {
        this.state.finalizeTurn(hadBurst);
    }

    // --- AI (CPU) Logic ---

    handleCPUTurn() {
        this.state.handleCPUTurn();
    }

    executeMoveAt(q, r) {
        this.state.executeMoveAt(q, r);
    }


    // Helper to track core damage/gain
    queueReward(player, type) {
        return this.state.queueReward(player, type);
    }

    /**
     * 演出がすべて完了したかチェックし、必要なら手番を交代する
     */
    checkTurnTransition() {
        this.state.checkTurnTransition();
    }

    resetTurnStats() {
        this.state.resetTurnStats();
    }

    triggerRewardFlow(reward, dotPos) {
        this.state.triggerRewardFlow(reward, dotPos);
    }

    applyRewardEffect(reward) {
        this.state.applyRewardEffect(reward);
    }

    applyChainReward(player, type) {
        // このメソッドは、handleClickではなく、applyRewardEffect経由でのデータ変更を主に担うか、
        // もしくは即時発動が必要な場合にのみ使用するようにリファクタリングする
        // 現在はhandleClickでqueueRewardを呼ぶようにしたので、ここでの直接実行は基本行わない
    }

    findHexAt(mx, my) {
        return this.input.findHexAt(mx, my);
    }


    resize() {
        this.ui.resize();
    }

    render() {
        if (this.renderer) this.renderer.render();
    }


    // Ver 4.6.0: 再構築エフェクト（黄色/水色のドットと数値ポップ）
    triggerReconstructEffect(giver, receiver, updates, pattern) {
        this.animations.triggerReconstructEffect(giver, receiver, updates, pattern);
    }

    updateCoinToss(dt) {
        this.animations.updateCoinToss(dt);
    }
}
