import { describe, expect, test } from 'vitest';
import scenarios from '../../src/data/tutorial_scenarios.json';

describe('Tutorial scenario data', () => {
    test('should define highlight defaults in scenario data', () => {
        expect(scenarios[0]).toEqual({
            type: 'defaults',
            highlightDefaults: {
                padding: 10
            }
        });
    });

    test('should use circle highlights with larger padding for tapped and burst grid targets', () => {
        const highlights = scenarios
            .flatMap(scenario => scenario.pages || [])
            .flatMap(page => page.highlight || []);

        const tappedHex = highlights.find(hl => hl.targetType === 'tapped-hex-area');
        const burstHex = highlights.find(hl => hl.targetType === 'burst-hex');

        expect(tappedHex?.shape).toBe('circle');
        expect(tappedHex?.padding).toBe(30);
        expect(burstHex?.shape).toBe('circle');
        expect(burstHex?.padding).toBe(30);
    });
});
