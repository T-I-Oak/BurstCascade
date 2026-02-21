(function () {
    const BC = (typeof window !== 'undefined' ? window : global).BurstCascade || {};
    const { HexMap } = BC;

    describe('Injection Validation', () => {
        let game;

        beforeEach(() => {
            // Mocking a minimal Game-like structure
            game = {
                currentPlayer: 1,
                isProcessingMove: false,
                isAIThinking: false,
                turnEndRequested: false,
                gameOver: false,
                triggerDropSequence: jest.fn(),
                findHexAt: jest.fn(),
                sound: { init: jest.fn(), playPlace: jest.fn() },
                achievementManager: { stats: [null, { actions: { add: jest.fn() } }, { actions: { add: jest.fn() } }] }
            };

            // Re-apply logic from main.js to our mock for testing
            game.handleClick = function (e) {
                this.sound.init();
                if (this.gameOver || this.isAIThinking) return;

                // For testing simplicity, just use context from hex
                const hex = e.simulatedHex;

                if (hex && hex.zone === 'main') {
                    if (hex.isDisabled) return;
                    if (this.isAIThinking || this.isProcessingMove || this.turnEndRequested) return;

                    // Validate owner (Only allow player 1 to inject into their own hexes)
                    if (hex.owner !== this.currentPlayer) return;

                    this.sound.playPlace();
                    this.achievementManager.stats[this.currentPlayer].actions.add(1);
                    this.triggerDropSequence(hex);
                }
            };
        });

        test('Should NOT allow injection into enemy grid', () => {
            const enemyHex = { zone: 'main', owner: 2, isDisabled: false };
            game.handleClick({ isSimulated: true, simulatedHex: enemyHex });

            expect(game.triggerDropSequence).not.toHaveBeenCalled();
        });

        test('Should NOT allow injection into neutral grid', () => {
            const neutralHex = { zone: 'main', owner: 0, isDisabled: false };
            game.handleClick({ isSimulated: true, simulatedHex: neutralHex });

            expect(game.triggerDropSequence).not.toHaveBeenCalled();
        });

        test('Should allow injection into player grid', () => {
            const playerHex = { zone: 'main', owner: 1, isDisabled: false };
            game.handleClick({ isSimulated: true, simulatedHex: playerHex });

            expect(game.triggerDropSequence).toHaveBeenCalledWith(playerHex);
        });
    });
})();
