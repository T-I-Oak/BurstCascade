(function () {
    const { HexMap, AI } = window.BurstCascade;

    const resultsContainer = document.getElementById('test-results');
    const summaryContainer = document.getElementById('results-summary');
    let passCount = 0;
    let failCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passCount++;
        } else {
            console.error(`[FAIL] ${message}`);
            failCount++;
        }

        // 互換性のため、要素が存在する場合のみ描画
        if (resultsContainer) {
            const div = document.createElement('div');
            div.className = 'test-case ' + (condition ? 'pass' : 'fail');
            div.innerHTML = `<div>${message}</div>`;
            if (!condition) div.innerHTML += `<div class="error">FAILED</div>`;
            resultsContainer.appendChild(div);
        }
    }

    function test(name, fn) {
        try {
            fn();
        } catch (e) {
            assert(false, name + ": Exception - " + e.message);
        }
    }

    console.log("Starting Tests...");

    // --- テストケース 1: 通常の移動（連鎖なし） ---
    test("通常の移動（連鎖なし） -> 手番終了", () => {
        const map = new HexMap(3);
        const chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        // P1が自分の持ち駒（高度3）に手札を適用するがオーバーフローさせない
        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 1);
        // 手札を強制的に調整 (高度 1)
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = 1);

        // 修正後のシミュレーションロジックで確認
        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        assert(result.chainContinues === false, "連鎖なしの場合継続しないこと");
    });

    // --- テストケース 2: バースト発生（報酬なし） ---
    test("バースト発生（報酬なし） -> 手番継続", () => {
        const map = new HexMap(3);
        const chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 1);
        target.height = 9; // 次で爆発する状態
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = 1);

        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        assert(result.chainContinues === true, "バースト発生時は手番が継続すること");
    });

    // --- テストケース 3: 報酬獲得＋バースト発生（今回のデグレード修正箇所） ---
    test("報酬獲得＋バースト発生 -> 手番継続 (Ver 3.5)", () => {
        const map = new HexMap(3);
        // 既に3連鎖たまっており、次で4連鎖（報酬）になる状態
        const chains = { 1: { self: 3, enemy: 0 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 1);
        target.height = 9; // 爆発
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = 1);

        const handPattern = ai.getHandPattern(map, 1);
        const nextChains = JSON.parse(JSON.stringify(chains));
        const result = ai.simulateApplyHand(map.clone(), nextChains, target, 1, handPattern);

        assert(result.chainContinues === false, "自陣報酬が発生した場合は、バースト中でも手番が終了すること (Ver 3.5.2)");
    });

    // --- テストケース 4: 敵コア破壊報酬＋バースト発生 ---
    test("敵コア破壊報酬獲得＋バースト発生 -> 手番継続", () => {
        const map = new HexMap(3);
        // 敵連鎖が1たまっており、次で2連鎖（敵報酬＝旗）になる状態
        const chains = { 1: { self: 0, enemy: 1 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        // 敵(P2)の持ち駒を爆発させる
        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 2);
        target.height = -9;
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = -1); // P1の手札 (-1 を足して爆発させる)

        const handPattern = ai.getHandPattern(map, 1);
        const nextChains = JSON.parse(JSON.stringify(chains));
        const result = ai.simulateApplyHand(map.clone(), nextChains, target, 1, handPattern);

        assert(result.chainContinues === true, "敵コア報酬（旗）を獲得してもバーストしていれば手番が継続すること");
    });

    // --- テストケース 5: 敵の最後の旗を破壊＋バースト発生 ---
    test("敵の最後の旗を破壊＋バースト発生 -> 手番終了 (Ver 3.7.3)", () => {
        const map = new HexMap(3);
        const chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        // P2の旗を1つだけ残す
        map.hexes.forEach(h => {
            if (h.zone === 'main') {
                h.hasFlag = false;
                h.flagOwner = 0;
            }
        });
        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 2);
        target.hasFlag = true;
        target.flagOwner = 2;
        target.height = -9; // 爆発寸前

        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = -1); // P1の手札 (-1 を足して爆発させる)

        const handPattern = ai.getHandPattern(map, 1);
        const nextChains = JSON.parse(JSON.stringify(chains));
        const result = ai.simulateApplyHand(map.clone(), nextChains, target, 1, handPattern);

        assert(result.chainContinues === false, "敵の最後の旗を破壊した場合は、バースト中でも即座に手番（ゲーム）が終了すること");
    });

    const summary = `全 ${passCount + failCount} 件中 ${passCount} 件パス、${failCount} 件失敗`;
    console.log(`--- Test Summary: ${summary} ---`);

    if (summaryContainer) {
        summaryContainer.innerHTML = summary;
        if (failCount > 0) {
            summaryContainer.style.color = "#f87171";
        } else {
            summaryContainer.style.color = "#4ade80";
        }
    }
})();
