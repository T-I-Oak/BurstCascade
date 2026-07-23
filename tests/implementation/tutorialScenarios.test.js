import { describe, expect, test } from 'vitest';
import scenarios from '../../src/data/tutorial_scenarios.json';
import { TutorialManager } from '../../../GameWorksOAK/src/lib/core/tutorialManager.js';

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

    test('should assign unique ids to every display scenario', () => {
        const displayScenarios = scenarios.filter(scenario => scenario.type !== 'defaults');
        const ids = displayScenarios.map(scenario => scenario.id);

        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('should let old primitive tutorial data restart from the first scenario', () => {
        const manager = new TutorialManager(scenarios, {
            initialState: 3,
            onTriggerCondition: () => true
        });

        expect(manager.willTrigger('turnStart', {})).toBe(true);
    });

    test('should unlock the next scenario from completed ids', () => {
        const manager = new TutorialManager(scenarios, {
            initialState: { completed: ['welcome'] },
            onTriggerCondition: () => true
        });

        expect(manager.willTrigger('turnStart', {})).toBe(false);
        expect(manager.willTrigger('afterInject', {})).toBe(true);
    });

    test('should save an empty completed list when reset', () => {
        let savedState = null;
        const manager = new TutorialManager(scenarios, {
            initialState: { completed: ['welcome'] },
            onSaveState: (state) => {
                savedState = state;
            }
        });

        manager.resetTutorial();

        expect(savedState).toEqual({ completed: [] });
    });

    test('should let TutorialManager own next button progression in managed mode', async () => {
        document.body.innerHTML = `
            <canvas id="tutorial-mask-canvas" class="hidden"></canvas>
            <div id="tutorial-tooltip" class="hidden">
                <h3 id="tutorial-title"></h3>
                <p id="tutorial-message"></p>
                <button id="tutorial-next-btn"></button>
            </div>
        `;

        let savedState = null;
        const manager = new TutorialManager([
            {
                id: 'managed-intro',
                trigger: 'start',
                title: 'Managed Intro',
                pages: [{ message: 'Managed message' }]
            }
        ], {
            nextButtonSelector: '#tutorial-next-btn',
            onSaveState: (state) => {
                savedState = state;
            }
        });

        expect(manager.checkTrigger('start', {})).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 0));
        document.getElementById('tutorial-next-btn').click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(savedState).toEqual({ completed: ['managed-intro'] });
        expect(manager.isShowing).toBe(false);
    });
});
