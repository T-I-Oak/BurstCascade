(function () {
    describe('SoundManager Module', () => {
        let sound;

        beforeEach(() => {
            sound = new window.BurstCascade.SoundManager();
        });

        test('SoundManager should initialize with default volume', () => {
            // Ver 4.8.0 default is 0.4
            expect(sound.masterVolume).toBe(0.4);
            expect(sound.isMuted).toBe(false);
        });

        test('setVolume should update masterVolume', () => {
            sound.setVolume(0.8);
            expect(sound.masterVolume).toBe(0.8);
        });

        test('toggleMute should flip isMuted state', () => {
            const initialState = sound.isMuted;
            sound.toggleMute();
            expect(sound.isMuted).toBe(!initialState);
            sound.toggleMute();
            expect(sound.isMuted).toBe(initialState);
        });

        test('playPlace should not throw even if AudioContext is mocked', () => {
            expect(() => sound.playPlace()).not.toThrow();
        });
    });
})();
