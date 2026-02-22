(function () {
    const { Game } = window.BurstCascade;

    describe('Game Starter Decision (Resonance Sync)', () => {
        let game;

        beforeEach(() => {
            if (!document.getElementById('game-canvas')) {
                document.body.innerHTML = `
                    <canvas id="game-canvas"></canvas>
                    <div id="overlay"></div>
                    <div id="mode-selection-content"></div>
                    <div id="game-over-content"></div>
                    <div id="ai-thinking-overlay"></div>
                    <div id="peek-board-btn"></div>
                    <div id="player-select"><button class="toggle-btn selected" data-value="pvp"></button></div>
                    <div id="size-select"><button class="toggle-btn selected" data-value="regular"></button></div>
                    <div id="ai-level-select"><button class="toggle-btn selected" data-value="easy"></button></div>
                `;
            }
            game = new Game();
        });

        test('startGame should trigger resonance sync and result in either player 1 or 2', () => {
            game.startGame();
            expect(game.coinToss.active).toBe(true);
            expect(game.coinToss.phase).toBe('gathering');
            expect([1, 2]).toContain(game.coinToss.result);
        });

        test('Starter decision should be reasonably random (100 trials)', () => {
            let p1Count = 0;
            let p2Count = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                game.startGame();
                if (game.coinToss.result === 1) p1Count++;
                else p2Count++;
            }

            expect(p1Count).toBeGreaterThan(20);
            expect(p2Count).toBeGreaterThan(20);
        });

        test('updateCoinToss should transition through phases (gathering -> fusion -> burst -> stabilized)', () => {
            game.gameMode = 'pvc';
            game.startGame();
            const result = game.coinToss.result;

            const cpuTurnSpy = jest.spyOn(game, 'handleCPUTurn').mockImplementation(() => { });

            // gathering phase (1200ms timeout)
            game.updateCoinToss(1250);
            expect(game.coinToss.phase).toBe('fusion');

            // fusion phase (200ms)
            game.updateCoinToss(250);
            expect(game.coinToss.phase).toBe('burst');

            // burst phase (到着まで)
            game.coinToss.particles = []; // 到着をシミュレート
            game.updateCoinToss(500);
            expect(game.coinToss.phase).toBe('stabilized');

            // stabilized phase (1000ms)
            game.updateCoinToss(1050);
            expect(game.coinToss.active).toBe(false);
            expect(game.currentPlayer).toBe(result);

            if (result === 2) {
                expect(cpuTurnSpy).toHaveBeenCalled();
            } else {
                expect(cpuTurnSpy).not.toHaveBeenCalled();
            }

            cpuTurnSpy.mockRestore();
        });
    });
})();
