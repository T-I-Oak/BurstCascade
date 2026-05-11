import { describe, test, expect, beforeEach } from 'vitest';

describe('Title Screen Layout', () => {
    beforeEach(() => {
        if (!document.getElementById('player-group')) {
            const div = document.createElement('div');
            div.innerHTML = `
                <div id="player-group"></div>
                <div id="ai-level-group"></div>
                <div id="size-group"></div>
                <div id="sound-group"></div>
            `;
            document.body.appendChild(div);
        }
    });

    test('Required setting group IDs should exist', () => {
        expect(document.getElementById('player-group')).not.toBeNull();
        expect(document.getElementById('ai-level-group')).not.toBeNull();
        expect(document.getElementById('size-group')).not.toBeNull();
        expect(document.getElementById('sound-group')).not.toBeNull();
    });
});
