(function () {
    describe('Renderer Module', () => {
        let game;
        let renderer;

        beforeEach(() => {
            game = new window.BurstCascade.Game();
            renderer = game.renderer;
        });

        test('Renderer should be initialized with a context', () => {
            expect(renderer.ctx).toBeDefined();
            expect(renderer.ctx).not.toBeNull();
        });

        test('drawHex should accept override context and layout', () => {
            const mockCtx = {
                save: jest.fn(),
                restore: jest.fn(),
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                closePath: jest.fn(),
                stroke: jest.fn(),
                fill: jest.fn(),
                fillText: jest.fn(),
                translate: jest.fn(),
                scale: jest.fn(),
                rotate: jest.fn(),
                setTransform: jest.fn(),
                createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
                createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() }))
            };
            const mockLayout = game.layout;
            const hex = game.map.hexes[0];
            hex.visualHeight = 1;

            // Should not throw and should use the provided context
            renderer.drawHex(hex, mockCtx, mockLayout);
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });

        test('drawHexNumber should handle text rendering', () => {
            const mockCtx = {
                fillText: jest.fn(),
                save: jest.fn(),
                restore: jest.fn(),
                beginPath: jest.fn(),
                closePath: jest.fn(),
                setTransform: jest.fn()
            };
            const color = { top: '#ff0000', side: '#aa0000', border: '#550000', highlight: '#ff5555' };

            // drawHexNumber(tx, ty, h, color, value, overrideCtx, overrideLayout)
            renderer.drawHexNumber(100, 100, 10, color, 5, mockCtx, game.layout);
            expect(mockCtx.fillText).toHaveBeenCalled();
        });

        test('drawCoinToss should not throw in any phase', () => {
            const phases = ['gathering', 'fusion', 'burst', 'stabilized'];
            game.startGame();

            phases.forEach(phase => {
                game.coinToss.phase = phase;
                game.coinToss.timer = 500;
                if (phase === 'stabilized') game.coinToss.ripple = 0.5;

                expect(() => {
                    renderer.drawCoinToss();
                }).not.toThrow();
            });
        });
    });
})();
