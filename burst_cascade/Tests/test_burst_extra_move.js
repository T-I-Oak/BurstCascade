(function () {
    const { Hex, HexMap, Game } = window.BurstCascade;

    async function runTest() {
        console.log("--- Starting Test: Burst Extra Move ---");
        const game = window.game;

        // 1. セットアップ: プレイヤー1のターン。敵（P2）のマスをバースト寸前にする
        const targetHex = game.map.getHexAt(0, 0, 'main');
        targetHex.height = -9; // 敵のマス
        targetHex.updateOwner();

        console.log("Initial state: Hex(0,0) height -9 (owned by P2)");

        // P1の手札を準備 (高さ1の土地を降らせる)
        game.currentPlayer = 1;
        game.map.performHandUpdate('hand-p1', 'focus');

        // 2. ターゲットをクリックしてドロップを誘発
        console.log("P1 playing at (0,0) to trigger enemy burst...");
        game.handleClick({ clientX: 0, clientY: 0, isSimulated: true, simulatedHex: targetHex });

        // 3. 演出完了を待つ
        let timeout = 0;
        while ((game.isProcessingMove || game.dropEffects.length > 0) && timeout < 100) {
            await new Promise(r => setTimeout(r, 100));
            timeout++;
        }

        // 4. 検証: P1の手番が継続しているか（P2に交代していないか）
        const isStillP1 = (game.currentPlayer === 1);
        const hasExtraMove = !game.turnEndRequested;

        console.log(`Current Player: P${game.currentPlayer}`);
        console.log(`Turn End Requested: ${game.turnEndRequested}`);

        if (isStillP1 && hasExtraMove) {
            console.log("✅ TEST PASSED: Extra move granted after enemy burst.");
            alert("✅ TEST PASSED: Extra move granted after enemy burst.");
        } else {
            console.error("❌ TEST FAILED: Turn swapped or end requested despite burst.");
            alert("❌ TEST FAILED: Turn swapped or end requested despite burst.");
        }
    }

    // グローバルに登録（index.htmlから呼び出すため）
    window.runBurstExtraMoveTest = runTest;
})();
