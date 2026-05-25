import { describe, expect, test } from 'vitest';
import projectInfo from '../../public/data/project_info.json';
import updateHistory from '../../public/data/update_history.json';
import scenarios from '../../src/data/tutorial_scenarios.json';
import helpText from '../../src/data/help_text.json';
import helpTemplate from '../../src/data/help_template.html?raw';
import achievementTexts from '../../src/data/achievement_texts.json';
import { ACHIEVEMENT_DEFINITIONS } from '../../src/achievements/definitions.js';
import { expandAppLanguageResource, SUPPORTED_LANGS } from '../../src/i18nManager.js';
import { renderI18nTemplate } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/i18n.js';

function expectLangStore(value) {
    expect(value).toHaveProperty('lang-store');
    SUPPORTED_LANGS.forEach(lang => {
        expect(value['lang-store'][lang]).toBeTruthy();
    });
}

describe('i18n resources', () => {
    test('should expose portal metadata with lang-store text fields', () => {
        expectLangStore(projectInfo.title);
        expectLangStore(projectInfo.description);
        projectInfo.tags.forEach(expectLangStore);
        expectLangStore(projectInfo.badge.content);
        expectLangStore(projectInfo.button.content);
    });

    test('should expose update history content with lang-store text fields', () => {
        updateHistory.forEach(entry => {
            entry.content.forEach(item => {
                expectLangStore(item.text);
            });
        });
    });

    test('should localize tutorial scenario titles and messages through the common i18n shape', () => {
        const localized = expandAppLanguageResource(scenarios);
        const firstScenario = localized.find(scenario => scenario.trigger === 'turnStart');
        expect(typeof firstScenario.title).toBe('string');
        expect(typeof firstScenario.pages[0].message).toBe('string');
    });

    test('should render How To Play from the common i18n template API', () => {
        expectLangStore(helpText.help.objective.title);
        const html = renderI18nTemplate(helpTemplate, helpText);
        expect(html).toContain('help-core-canvas');
        expect(html).toContain('tutorial-reset-checkbox');
        expect(html).not.toContain('{help.');
    });

    test('should expose achievement titles and descriptions as language resources', () => {
        ACHIEVEMENT_DEFINITIONS.forEach(definition => {
            expect(achievementTexts[definition.id]).toBeTruthy();
            expectLangStore(achievementTexts[definition.id].title);
            expectLangStore(achievementTexts[definition.id].description);
        });

        const localized = expandAppLanguageResource(achievementTexts);
        expect(typeof localized.win.title).toBe('string');
        expect(typeof localized.win.description).toBe('string');
    });
});
