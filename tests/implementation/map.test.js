import { describe, test, expect, beforeEach } from 'vitest';
import { HexMap, Hex } from '../../src/map.js';

describe('Map Logic (map.js)', () => {
    describe('Title Screen Layout / DOM Basics', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="player-group"></div>
                <div id="ai-level-group"></div>
                <div id="size-group"></div>
                <div id="sound-group"></div>
            `;
        });

        test('Required setting group IDs should exist', () => {
            expect(document.getElementById('player-group')).not.toBeNull();
            expect(document.getElementById('ai-level-group')).not.toBeNull();
            expect(document.getElementById('size-group')).not.toBeNull();
            expect(document.getElementById('sound-group')).not.toBeNull();
        });
    });

    describe('HexMap Generation', () => {
        test('Regular map has valid center and outer hexes', () => {
            const map = new HexMap(4, 'regular');
            const center = map.getHexAt(0, 0, 'main');
            const outer = map.getHexAt(3, 0, 'main'); // distance 3
            
            expect(center).toBeDefined();
            expect(center.isDisabled).toBe(false);
            expect(outer).toBeDefined();
            expect(outer.isDisabled).toBe(false);
        });

        test('Mini map correctly disables outer hexes', () => {
            const map = new HexMap(4, 'mini');
            const center = map.getHexAt(0, 0, 'main');
            const outer = map.getHexAt(3, 0, 'main'); // distance 3 (should be disabled)
            const inner = map.getHexAt(2, 0, 'main'); // distance 2 (should be enabled)

            expect(center.isDisabled).toBe(false);
            expect(inner.isDisabled).toBe(false);
            expect(outer.isDisabled).toBe(true);
        });

        test('Core Placement (Mini)', () => {
            const map = new HexMap(4, 'mini');
            // In Mini map (effective size 3, radius 2), cores should be at distance 2.
            const coreHex = map.getHexAt(2, 0, 'main');
            expect(Math.abs(coreHex.height)).toBe(3);
            expect(coreHex.hasFlag).toBe(true);
        });
    });

    describe('Map Interaction', () => {
        test('applyHand should NOT affect disabled hex', () => {
            const map = new HexMap(4, 'mini');
            const handHex = new Hex(0, 0, 1, 1, 'hand-p1'); // height 1
            map.hexes.push(handHex);
            map.offsets['hand-p1'] = { q: 0, r: 0 };

            const targetHex = map.getHexAt(3, 0, 'main'); // Disabled
            expect(targetHex.height).toBe(0);

            map.applyHand(targetHex, 'hand-p1');
            expect(targetHex.height).toBe(0);
        });

        test('applyHand correctly affected valid hex', () => {
            const map = new HexMap(4, 'mini');
            const handHex = new Hex(0, 0, 1, 1, 'hand-p1'); // height 1
            map.hexes.push(handHex);
            map.offsets['hand-p1'] = { q: 0, r: 0 };

            const targetHex = map.getHexAt(0, 0, 'main');
            expect(targetHex.height).toBe(0);

            map.applyHand(targetHex, 'hand-p1');
            expect(targetHex.height).toBe(1);
        });
    });
});
