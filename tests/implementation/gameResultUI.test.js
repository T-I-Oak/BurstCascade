import { describe, expect, test, vi, beforeEach } from 'vitest';
import { GameResultUI } from '../../src/ui/gameResultUI.js';

describe('GameResultUI', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="result-achievements">
                <div id="achievements-list">
                    <div class="result-achievements-list-content">
                        <div class="achievement-item">previous</div>
                    </div>
                </div>
            </div>
        `;
    });

    test('should hide and skip achievements in local PvP results', () => {
        const game = {
            gameMode: 'pvp',
            lastAchievements: [{ id: 'previous' }],
            achievementManager: {
                checkAchievements: vi.fn(),
                getSessionAchievements: vi.fn()
            }
        };

        new GameResultUI(game, null).updateResultAchievements();

        expect(document.getElementById('result-achievements').classList.contains('hidden')).toBe(true);
        expect(document.querySelector('.result-achievements-list-content').children.length).toBe(0);
        expect(game.lastAchievements).toEqual([]);
        expect(game.achievementManager.checkAchievements).not.toHaveBeenCalled();
    });
});
