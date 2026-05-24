import { SUPPLY_ENERGY_LIMIT } from '../map.js';

/**
 * Handles reward-related logic: queuing, flow, and applying effects.
 */
export class RewardManager {
    constructor(game) {
        this.game = game;
    }

    /** Queue a reward and play sound */
    queueReward(player, type) {
        const g = this.game;
        g.sound.playReward();
        let color = player === 1 ? '#4ade80' : '#f87171';
        const reward = {
            player,
            type,
            targetHex: null,
            color,
            status: 'pending',
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

    /** Flow a pending reward toward a target hex */
    triggerRewardFlow(reward, dotPos) {
        const g = this.game;
        if (reward && reward.status === 'pending') {
            reward.status = 'flowing';
            if (reward.type === 'self') {
                const handZoneId = `hand-p${reward.player}`;
                const handHexes = g.map.hexes.filter(h => h.zone === handZoneId);
                const candidates = handHexes.filter(h =>
                    (reward.player === 1 && h.height < SUPPLY_ENERGY_LIMIT) ||
                    (reward.player === 2 && h.height > -SUPPLY_ENERGY_LIMIT)
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
                return;
            }

            const threshold = reward.type === 'self' ? 4 : 2;
            g.chains[reward.player][reward.type] = Math.max(0, g.chains[reward.player][reward.type] - threshold);

            g.flashAlpha = 0.3;
            g.addParticles(dotPos.x, dotPos.y, reward.color, true, null, reward.targetHex, reward);
            g.triggerChainAnim(reward.player, reward.type);
        }
    }

    /** Apply the effect of a flowing reward */
    applyRewardEffect(reward) {
        const g = this.game;
        if (!reward || reward.status !== 'flowing') return;
        reward.status = 'applied';

        if (reward.type === 'self') {
            reward.targetHex.height += (reward.player === 1 ? 1 : -1);
            reward.targetHex.height = Math.max(
                -SUPPLY_ENERGY_LIMIT,
                Math.min(SUPPLY_ENERGY_LIMIT, reward.targetHex.height)
            );
            reward.targetHex.updateOwner();
            const bumpAmt = reward.player === 1 ? 2.0 : -2.0;
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
}
