(function () {
    describe('Game Initialization and Reset Tests', () => {
        let game;

        beforeEach(() => {
            // jest-setup.js will initialize window.BurstCascade and load main.js
            game = new window.BurstCascade.Game();
        });

        test('startGame should reset cursor and hover states', () => {
            // 状態を汚染
            game.hoveredHex = { id: 'test-hex' };
            game.selectedHex = { id: 'test-hex' };
            game.hoveredNeighbors = [{ id: 'neighbor-hex' }];

            // ゲーム開始
            game.startGame();

            // リセットされていることを確認
            expect(game.hoveredHex).toBeNull();
            expect(game.selectedHex).toBeNull();
            expect(game.hoveredNeighbors).toEqual([]);
        });

        test('resetToTitle should reset cursor and hover states', () => {
            // 状態を汚染
            game.hoveredHex = { id: 'test-hex' };
            game.selectedHex = { id: 'test-hex' };

            // タイトルへ戻る
            game.resetToTitle();

            // リセットされていることを確認
            expect(game.hoveredHex).toBeNull();
            expect(game.selectedHex).toBeNull();
        });
    });
})();
