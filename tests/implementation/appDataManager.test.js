import { describe, expect, test, beforeEach } from 'vitest';
import {
    GAME_DATA_ID,
    appDataManager,
    getAppSavedData,
    setAppSavedData
} from '../../src/appDataManager.js';

describe('appDataManager', () => {
    beforeEach(() => {
        localStorage.clear();
        appDataManager.cache = {};
    });

    test('should save data under the game namespace', () => {
        const migrationMap = {
            init: () => ({ mode: 'pvc' })
        };

        setAppSavedData('settings', { mode: 'pvp' });

        expect(getAppSavedData('settings', migrationMap)).toEqual({ mode: 'pvp' });
        expect(JSON.parse(localStorage.getItem(GAME_DATA_ID)).settings.d).toEqual({ mode: 'pvp' });
    });

});
