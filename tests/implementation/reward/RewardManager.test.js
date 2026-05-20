import { describe, it, expect, vi } from 'vitest';
import { RewardManager } from '../../../src/reward/RewardManager.js';

function createMockGame() {
  const mock = {
    sound: { playReward: vi.fn() },
    achievementManager: {
      stats: {
        1: { rewardEnergy: { add: vi.fn() }, rewardCore: { add: vi.fn() } },
        2: { rewardEnergy: { add: vi.fn() }, rewardCore: { add: vi.fn() } }
      }
    },
    pendingRewards: [],
    chains: { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } },
    turnHadReward: false,
    turnHadSelfReward: false,
    currentPlayer: 1,
    addParticles: vi.fn(),
    triggerChainAnim: vi.fn()
  };
  return mock;
}

describe('RewardManager functionality', () => {
  it('queueReward creates a reward and updates stats', () => {
    const game = createMockGame();
    const rm = new RewardManager(game);
    const reward = rm.queueReward(1, 'self');
    expect(game.sound.playReward).toHaveBeenCalled();
    expect(reward.player).toBe(1);
    expect(reward.type).toBe('self');
    expect(game.turnHadReward).toBe(true);
    expect(game.turnHadSelfReward).toBe(true);
    expect(game.achievementManager.stats[1].rewardEnergy.add).toHaveBeenCalledWith(1);
    expect(game.pendingRewards).toContain(reward);
  });

  it('triggerRewardFlow sets targetHex and updates chain counters', () => {
    const game = createMockGame();
    game.map = {
      hexes: [
        { zone: 'hand-p1', height: 0, owner: 1 },
        { zone: 'hand-p1', height: 3, owner: 1 },
        { zone: 'main', owner: 1, hasFlag: false }
      ]
    };
    const rm = new RewardManager(game);
    const reward = rm.queueReward(1, 'self');
    const dotPos = { x: 10, y: 20 };
    rm.triggerRewardFlow(reward, dotPos);
    expect(reward.status).toBe('flowing');
    expect(reward.targetHex).toBeDefined();
    expect(game.chains[1].self).toBe(0); // threshold reduces count
    expect(game.flashAlpha).toBe(0.3);
    expect(game.addParticles).toHaveBeenCalled();
    expect(game.triggerChainAnim).toHaveBeenCalledWith(1, 'self');
  });
});
