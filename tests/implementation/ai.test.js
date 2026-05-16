import { describe, test, expect, beforeEach } from 'vitest';
import { HexMap } from '../../src/map.js';
import { AI } from '../../src/ai.js';

describe('AI and Game Rules (ai.js)', () => {
    let ai;
    let map;
    let chains;

    beforeEach(() => {
        ai = new AI(2, 'normal');
        map = new HexMap(3);
        chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
    });

    describe('Game Rules Simulation', () => {
        test('Normal move without chain should end turn', () => {
            const target = map.mainHexes.find(h => h.owner === 1);
            map.handHexes['hand-p1'].forEach(h => h.height = 1);

            const handPattern = ai.getHandPattern(map, 1);
            const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

            expect(result.chainContinues).toBe(false);
        });

        test('Burst without reward should keep turn', () => {
            const target = map.mainHexes.find(h => h.owner === 1);
            target.height = 9; // Will burst on 1+ height
            map.handHexes['hand-p1'].forEach(h => h.height = 1);

            const handPattern = ai.getHandPattern(map, 1);
            const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

            expect(result.chainContinues).toBe(true);
        });

        test('Self reward + Burst should end turn', () => {
            const target = map.mainHexes.find(h => h.owner === 1);
            target.height = 9;
            chains[1].self = 3; 
            map.handHexes['hand-p1'].forEach(h => h.height = 1);

            const handPattern = ai.getHandPattern(map, 1);
            const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

            expect(result.chainContinues).toBe(false);
        });
    });

    describe('AI Difficulty', () => {
        test('AI should have different search depths based on difficulty', () => {
            const easyAI = new AI(2, 'easy');
            const normalAI = new AI(2, 'normal');
            const hardAI = new AI(2, 'hard');

            expect(easyAI.searchDepth).toBeLessThan(normalAI.searchDepth);
            expect(normalAI.searchDepth).toBeLessThan(hardAI.searchDepth);
        });
    });
});
