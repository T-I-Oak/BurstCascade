import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataManager } from '../../../dataManager.js';

describe('DataManager', () => {
    beforeEach(() => {
        localStorage.clear();
        // Ensure __APP_VERSION__ is always defined as per the new implementation
        global.__APP_VERSION__ = '1.0.0';
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should initialize data when no data exists', () => {
        const migrationMap = {
            init: () => ({ name: 'test', score: 0 })
        };
        const data = DataManager.getSavedData('test-key', migrationMap);
        expect(data).toEqual({ name: 'test', score: 0 });
    });

    it('should save data and attach dataVersion', () => {
        global.__APP_VERSION__ = '2.0.0';
        const data = { name: 'saved' };
        DataManager.setSavedData('save-key', data);
        
        const raw = localStorage.getItem('save-key');
        const parsed = JSON.parse(raw);
        expect(parsed.dataVersion).toBe(2);
    });

    it('should migrate data from older version', () => {
        global.__APP_VERSION__ = '3.0.0';
        
        localStorage.setItem('migrate-key', JSON.stringify({
            dataVersion: 1,
            oldField: 'oldValue'
        }));

        const migrationMap = {
            init: () => ({ newField: 'defaultValue' }),
            2: (data) => ({ midField: data.oldField }),
            3: (data) => ({ newField: data.midField })
        };

        const data = DataManager.getSavedData('migrate-key', migrationMap);
        expect(data).toEqual({ newField: 'oldValue' });
        expect(data.dataVersion).toBeUndefined();
    });

    it('should handle corrupt JSON gracefully by falling back to init', () => {
        localStorage.setItem('corrupt-key', 'NOT JSON');
        const migrationMap = {
            init: () => ({ valid: true })
        };
        const data = DataManager.getSavedData('corrupt-key', migrationMap);
        expect(data).toEqual({ valid: true });
    });
});
