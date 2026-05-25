import uiText from './data/ui_text.json';
import {
    expandLanguageResource,
    bindI18nTemplate,
    setupLanguageSelector
} from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/i18n.js';

export const SUPPORTED_LANGS = ['ja', 'en'];

function getTextValue(texts, key) {
    return key.split('.').reduce((value, part) => {
        if (value && Object.prototype.hasOwnProperty.call(value, part)) {
            return value[part];
        }
        return undefined;
    }, texts);
}

export function applyLocalizedText() {
    const texts = expandLanguageResource(uiText);
    document.documentElement.lang = texts.documentLang || 'ja';
    document.title = texts.documentTitle || 'BURST CASCADE';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const value = getTextValue(texts, el.dataset.i18n);
        if (value !== undefined) {
            el.textContent = value;
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const value = getTextValue(texts, el.dataset.i18nHtml);
        if (value !== undefined) {
            el.innerHTML = value;
        }
    });

    return texts;
}

export function initializeI18n(onChange) {
    setupLanguageSelector('#language-select', SUPPORTED_LANGS, () => {
        applyLocalizedText();
        if (typeof onChange === 'function') onChange();
    });
    return applyLocalizedText();
}

export function expandAppLanguageResource(resource) {
    return expandLanguageResource(resource);
}

export function getLocalizedUiText() {
    return expandLanguageResource(uiText);
}

export function bindAppI18nTemplate(containerOrSelector, template, resource, options) {
    return bindI18nTemplate(containerOrSelector, template, resource, options);
}
