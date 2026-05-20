import { RewardManager } from '../reward/RewardManager.js';
/**
 * Handles turn‑level actions: drop sequences, chain reactions, bursts,
 * AI turn handling and move execution.
 * Delegates reward creation to the provided RewardManager instance.
 */
export class SequenceManager {
    constructor(game, rewardManager) {
        this.game = game;
        this.reward = rewardManager;
    }

    /** Trigger the drop sequence when a player places a piece */
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

    /** Process the result of a drop (land or marker) */
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
                        x: pos.x,
                        y: pos.y - h,
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

    /** Process chain reactions (burst) */
    processChainReaction(skipTutorial = false) {
        const g = this.game;
        const overflowedHexes = g.map.mainHexes.filter(h => h.height > 9 || h.height < -9);
        if (overflowedHexes.length === 0) {
            const marker = g.dropEffects.find(de => de.type === 'marker');
            if (marker) {
                marker.state = 'falling';
                marker.hoverTimer = 0;
            } else {
                this.core && this.core.finalizeTurn(false);
            }
            return;
        }
        if (g.currentPlayer === 1 && window.tutorialManager && !skipTutorial) {
            if (window.tutorialManager.checkTrigger('burst', { game: g })) {
                g.pendingAction = () => { this.processChainReaction(true); };
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
            setTimeout(() => { this.triggerBurst(hex, originalOwner); }, delay);
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
                    this.core && this.core.finalizeTurn(true);
                }
            }
        }, totalDelay);
    }

    /** Trigger a single burst and possibly create a reward */
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
            reward = this.reward.queueReward(g.currentPlayer, targetType);
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

    /** Handle AI turn */
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

    /** Execute a move at coordinates */
    executeMoveAt(q, r) {
        const g = this.game;
        const hex = g.map.getHexAt(q, r, 'main');
        if (hex) {
            g.handleClick({
                clientX: 0,
                clientY: 0,
                isSimulated: true,
                simulatedHex: hex
            });
        }
    }
}
