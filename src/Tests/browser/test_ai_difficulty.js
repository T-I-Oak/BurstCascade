(function () {
    const { HexMap, AI } = window.BurstCascade;

    // Test function
    function testDifficulty(level, expectedDepth, expectedParams) {
        console.log(`Testing AI difficulty: ${level}`);
        const ai = new AI(2, level);

        let passed = true;
        if (ai.searchDepth !== expectedDepth) {
            console.error(`ERROR: Expected depth ${expectedDepth}, got ${ai.searchDepth}`);
            passed = false;
        }

        // Check key parameters
        for (const [key, val] of Object.entries(expectedParams)) {
            if (ai.params[key] !== val) {
                console.error(`ERROR: Expected params.${key} to be ${val}, got ${ai.params[key]}`);
                passed = false;
            }
        }

        if (passed) console.log(`SUCCESS: AI difficulty ${level} passed static checks.`);
        return passed;
    }

    // Test Run
    let allPassed = true;

    // Hard
    allPassed &= testDifficulty('hard', 5, { W_PRESSURE: 60, W_CHAIN: 45 });

    // Normal
    allPassed &= testDifficulty('normal', 3, { W_PRESSURE: 30, W_CHAIN: 20 });

    // Easy
    allPassed &= testDifficulty('easy', 1, { W_PRESSURE: 0, W_CHAIN: 0 });

    // Test getBestMove (Smoke Test)
    console.log("\nTesting getBestMove execution...");
    const map = new HexMap(4, 'mini'); // Use mini map for speed
    // Add some pieces
    map.getHexAt(0, 1, 'main').owner = 2; // AI piece
    map.getHexAt(0, 1, 'main').height = 3;
    map.getHexAt(1, 1, 'main').owner = 1; // P1 piece
    map.getHexAt(1, 1, 'main').hasFlag = true;
    map.getHexAt(1, 1, 'main').flagOwner = 1;

    const chains = { 1: { self: 0, enemy: 0 }, 2: { self: 0, enemy: 0 } };

    // Hard AI
    const aiHard = new AI(2, 'hard');
    try {
        const move = aiHard.getBestMove(map, chains);
        console.log(`Hard AI move: q:${move?.q}, r:${move?.r}`);
    } catch (e) {
        console.error("Hard AI getBestMove failed:", e);
        allPassed = false;
    }

    // Easy AI
    const aiEasy = new AI(2, 'easy');
    try {
        const move = aiEasy.getBestMove(map, chains);
        console.log(`Easy AI move: q:${move?.q}, r:${move?.r}`);
    } catch (e) {
        console.error("Easy AI getBestMove failed:", e);
        allPassed = false;
    }

    if (allPassed) {
        console.log("\nALL TESTS PASSED");
    } else {
        console.error("\nSOME TESTS FAILED");
    }
})();
