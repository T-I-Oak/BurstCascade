const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = global;
global.BurstCascade = {};
global.document = {
    getElementById: jest.fn(),
    createElement: jest.fn(() => ({})),
};
global.console = console;

// Load source files in order
const files = ['map.js', 'ai.js'];
files.forEach(f => {
    const code = fs.readFileSync(path.resolve(__dirname, '../../', f), 'utf8');
    eval(code);
});

const { HexMap, AI } = global.BurstCascade;

describe('Game Rules (AI Simulation)', () => {
    let ai;
    let map;
    let chains;

    beforeEach(() => {
        ai = new AI(1);
        map = new HexMap(3);
        chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
    });

    test('Normal move without chain should end turn', () => {
        const target = map.mainHexes.find(h => h.owner === 1);
        // Force hand to height 1
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

    test('Self reward + Burst should end turn (Rule 4.4.17)', () => {
        const target = map.mainHexes.find(h => h.owner === 1);
        target.height = 9;
        chains[1].self = 3; // Next burst will trigger reward
        map.handHexes['hand-p1'].forEach(h => h.height = 1);

        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        expect(result.chainContinues).toBe(false);
    });

    test('Enemy reward + Burst should keep turn', () => {
        const target = map.mainHexes.find(h => h.owner === 2);
        target.height = -9;
        chains[1].enemy = 1; // Next enemy burst will trigger reward
        map.handHexes['hand-p1'].forEach(h => h.height = -1);

        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        expect(result.chainContinues).toBe(true);
    });
});
