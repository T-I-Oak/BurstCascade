import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';

export const GAME_DATA_ID = 'burst-cascade';

export const appDataManager = new DataManager(GAME_DATA_ID);

export function getAppSavedData(key, migrationMap) {
    return appDataManager.getSavedData(key, migrationMap);
}

export function setAppSavedData(key, data) {
    appDataManager.setSavedData(key, data);
}
