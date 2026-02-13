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

    // --- テストケース 3: 自陣報酬獲得＋バースト発生 (Ver 4.4.17 Rule) ---
    test("自陣報酬獲得＋バースト発生 -> 手番終了", () => {
        const map = new HexMap(3);
        // 自陣連鎖が3、敵陣連鎖が0
        const chains = { 1: { self: 3, enemy: 0 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 1);
        target.height = 9; // 爆発
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = 1);

        // シミュレーション
        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        // Ver 4.4.17: 自陣報酬 (turnHadSelfReward) がある場合は終了
        assert(result.chainContinues === false, "自陣報酬が発生した場合は、バースト中でも手番が終了すること (Ver 4.4.17)");
    });

    // --- テストケース 4: 敵コア破壊報酬＋バースト発生 (自陣報酬なし) ---
    test("敵コア破壊報酬獲得＋バースト発生 -> 手番継続", () => {
        const map = new HexMap(3);
        // 敵陣連鎖が1 (次で報酬)
        const chains = { 1: { self: 0, enemy: 1 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 2);
        target.height = -9;
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = -1);

        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        // 敵報酬のみなら継続
        assert(result.chainContinues === true, "敵コア報酬（旗）のみを獲得しバーストしていれば、手番が継続すること");
    });

    // --- テストケース 5: 敵の最後の旗を破壊＋バースト発生 ---
    test("敵の最後の旗を破壊 -> ゲーム終了 (手番終了)", () => {
        const map = new HexMap(3);
        const chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        map.hexes.forEach(h => {
            if (h.zone === 'main') {
                h.hasFlag = false;
                h.flagOwner = 0;
            }
        });
        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 2);
        target.hasFlag = true;
        target.flagOwner = 2;
        target.height = -9;

        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = -1);

        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        // ゲームセット条件を満たす場合は当然終了
        assert(result.chainContinues === false, "敵の最後の旗を破壊した場合は、即座に終了すること");
    });

    // --- テストケース 6: 自陣・敵陣同時報酬＋バースト発生 (新規) ---
    test("自陣・敵陣同時報酬＋バースト発生 -> 手番終了 (優先度チェック)", () => {
        const map = new HexMap(3);
        // 両方とも次で報酬
        const chains = { 1: { self: 3, enemy: 1 }, 2: { self: 0, enemy: 0 } };
        const ai = new AI(1);

        // 自陣・敵陣両方を巻き込んでバーストさせる配置を作るのはシミュレーションでは難しいが、
        // AI.simulateApplyHand のロジック上で両方のカウンタが回る状況を想定。
        // ここでは簡易的に、ターゲットは自陣マスとし、simulateApplyHand 内部ロジックが chains をどう評価するかを確認する。
        // ※厳密には連鎖が同時に起きるわけではないが、結果としてターン内に両方発生した場合のフラグ挙動をテストしたい。
        // AIシミュレータがそこまで厳密にターン内全イベントを模倣しているか怪しいが、
        // 少なくとも "chainContinues" の判定ロジックは確認できるはず。

        // ターゲットを自陣爆発に設定 -> 自陣報酬発生
        const target = map.hexes.find(h => h.zone === 'main' && h.owner === 1);
        target.height = 9;
        map.hexes.filter(h => h.zone === 'hand-p1').forEach(h => h.height = 1);

        // **このテストは AI.js の simulateApplyHand も修正されていることを前提とする**
        // main.js の修正だけでなく、ai.js 側も「自陣報酬なら終了」という判定ロジックを持っている必要がある。
        // 現状 ai.js をまだ修正していないので、このテストは fail する可能性がある。
        // そのため、まずは期待値を false に設定し、fail したら ai.js を修正するフローとする。

        const handPattern = ai.getHandPattern(map, 1);
        const result = ai.simulateApplyHand(map.clone(), JSON.parse(JSON.stringify(chains)), target, 1, handPattern);

        assert(result.chainContinues === false, "自陣報酬が含まれる場合は、敵陣報酬があっても手番終了すること");
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
