const fs = require('fs');
const path = require('path');

// Mock localStorage
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock window and BurstCascade namespace
global.window = global;
global.BurstCascade = {};

// Load achievements.js
const code = fs.readFileSync(path.resolve(__dirname, '../../achievements.js'), 'utf8');
eval(code);

const { StatItem, RangeStatItem } = global.BurstCascade;

describe('StatItem', () => {
    let item;

    beforeEach(() => {
        item = new StatItem();
    });

    test('initial state should be zero', () => {
        expect(item.game).toBe(0);
        expect(item.life).toBe(0);
        expect(item.maxAction).toBe(0);
    });

    test('add() should update all scopes and peaks', () => {
        item.add(5);
        expect(item.action).toBe(5);
        expect(item.turn).toBe(5);
        expect(item.game).toBe(5);
        expect(item.maxAction).toBe(5);
        expect(item.maxTurn).toBe(5);

        item.add(3);
        expect(item.action).toBe(8);
        expect(item.maxAction).toBe(8);
    });

    test('newAction() should only reset action scope', () => {
        item.add(5);
        item.newAction();
        expect(item.action).toBe(0);
        expect(item.turn).toBe(5);
        expect(item.game).toBe(5);
        expect(item.maxAction).toBe(5);
    });

    test('newTurn() should reset turn scope', () => {
        item.add(5);
        item.newTurn();
        expect(item.turn).toBe(0);
        expect(item.game).toBe(5);
        expect(item.maxTurn).toBe(5);
    });

    test('newGame() should reset game scope and peaks', () => {
        item.add(5);
        item.newGame();
        expect(item.game).toBe(0);
        expect(item.maxAction).toBe(0);
        expect(item.maxTurn).toBe(0);
    });
});

describe('RangeStatItem', () => {
    let item;

    beforeEach(() => {
        item = new RangeStatItem();
        item.newGame(10);
    });

    test('initial state should capture initialValue', () => {
        expect(item.current).toBe(10);
        expect(item.min).toBe(10);
        expect(item.max).toBe(10);
    });

    test('update() should track minimum', () => {
        item.update(5);
        expect(item.current).toBe(5);
        expect(item.min).toBe(5);
        expect(item.max).toBe(10);

        item.update(8);
        expect(item.min).toBe(5);
    });

    test('update() should track maximum', () => {
        item.update(15);
        expect(item.current).toBe(15);
        expect(item.min).toBe(10);
        expect(item.max).toBe(15);
    });
});
