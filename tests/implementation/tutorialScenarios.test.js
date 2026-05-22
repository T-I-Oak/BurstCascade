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

    test('should use circle highlights for tapped and burst grid targets', () => {
        const highlights = scenarios
            .flatMap(scenario => scenario.pages || [])
            .flatMap(page => page.highlight || []);

        expect(highlights.find(hl => hl.targetType === 'tapped-hex-area')?.shape).toBe('circle');
        expect(highlights.find(hl => hl.targetType === 'burst-hex')?.shape).toBe('circle');
    });
});
