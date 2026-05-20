import { describe, it, expect, vi } from 'vitest';
import { SequenceManager } from '../../../src/sequence/SequenceManager.js';
import { RewardManager } from '../../../src/reward/RewardManager.js';

// Minimal mock game object covering properties used by SequenceManager
function createMockGame() {
  const mock = {
    hoveredHex: null,
    selectedHex: null,
    hoveredNeighbors: [],
    isProcessingMove: false,
    lastMoveHex: null,
    isWaitingForDrop: false,
    turnHadBurst: false,
    turnHadReward: false,
    turnHadSelfReward: false,
    turnActionCount: 0,
    currentActionWaveCount: 0,
    turnStartOwners: new Map(),
    dropEffects: [],
    overlay: null,
    modeSelection: null,
    gameOverContent: null,
    aiTimer: null,
    aiOverlay: null,
    sound: {
      startBgm: vi.fn(),
      updateContextData: vi.fn(),
      playPlace: vi.fn(),
      playBurst: vi.fn(),
      playTurnChange: vi.fn()
    },
    layout: {
      hexToPixel: () => ({ x: 0, y: 0 })
    },
    map: {
      mainHexes: [],
      hexes: [],
      offsets: {},
      getHexAt: () => null,
      calculateHandUpdate: () => ({ success: true, giver: null, receiver: null, updates: [] })
    },
    achievementManager: {
      startNewAction: vi.fn(),
      stats: {
        1: {
          rewardEnergy: { add: vi.fn() },
          rewardCore: { add: vi.fn() },
          burstCore: { 1: { add: vi.fn() }, both: { add: vi.fn() } },
          burstGrid: { 1: { add: vi.fn() }, both: { add: vi.fn() } },
          neutralized: { 1: { add: vi.fn() }, both: { add: vi.fn() } },
          maxCellEnergy: { update: vi.fn() }
        },
        2: {
          rewardEnergy: { add: vi.fn() },
          rewardCore: { add: vi.fn() },
          burstCore: { 2: { add: vi.fn() }, both: { add: vi.fn() } },
          burstGrid: { 2: { add: vi.fn() }, both: { add: vi.fn() } },
          neutralized: { 2: { add: vi.fn() }, both: { add: vi.fn() } },
          maxCellEnergy: { update: vi.fn() }
        }
      },
      startNewTurn: vi.fn()
    },
    chains: { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } },
    currentPlayer: 1,
    addParticles: vi.fn(),
    triggerChainAnim: vi.fn(),
    flashAlpha: 0,
    pendingRewards: []
  };
  return mock;
}

describe('SequenceManager basic flow', () => {
  it('triggerDropSequence should set expected flags without error', () => {
    const game = createMockGame();
    const reward = new RewardManager(game);
    const seq = new SequenceManager(game, reward);
    const dummyHex = { q: 0, r: 0 };
    expect(() => seq.triggerDropSequence(dummyHex)).not.toThrow();
    expect(game.isProcessingMove).toBe(true);
    expect(game.lastMoveHex).toBe(dummyHex);
  });

  it('processChainReaction with no overflow should call core finalizeTurn via core reference', () => {
    const game = createMockGame();
    const reward = new RewardManager(game);
    const seq = new SequenceManager(game, reward);
    // Mock core finalizeTurn to verify call
    seq.core = { finalizeTurn: vi.fn() };
    expect(() => seq.processChainReaction()).not.toThrow();
    expect(seq.core.finalizeTurn).toHaveBeenCalledWith(false);
  });
});
