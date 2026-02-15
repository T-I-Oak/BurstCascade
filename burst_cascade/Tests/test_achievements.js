(function () {
    const { Game, AchievementManager } = window.BurstCascade;

    async function runAchievementTest() {
        console.log("--- Starting Test: Achievement Unlock Check ---");
        let results = [];

        function assert(condition, message) {
            if (condition) {
                console.log(`✅ [PASS] ${message}`);
                results.push({ message, status: 'pass' });
            } else {
                console.error(`❌ [FAIL] ${message}`);
                results.push({ message, status: 'fail' });
            }
        }

        try {
            // 1. Setup Game
            if (!window.game) {
                window.game = new Game();
            }
            const g = window.game;
            const am = g.achievementManager;
            am.resetData(); // Ensure fresh start

            // ==========================================
            // TEST A: Player Segregation (Px Array)
            // ==========================================
            console.log("TEST A: Verifying Stat Segregation (P1 vs P2)...");
            g.currentPlayer = 1;
            // P1 performs an action
            am.stats[1].actions.add(1);
            assert(am.stats[1].actions.game === 1, "Player 1 action should be 1");
            assert(am.stats[2].actions.game === 0, "Player 2 action should remain 0");

            // P1 acts on P2 (Neutralization)
            am.stats[1].neutralized[2].add(1);
            assert(am.stats[1].neutralized[2].game === 1, "P1 neutralized P2 (game scope) should be 1");
            assert(am.stats[1].neutralized[1].game === 0, "P1 neutralized P1 should be 0");
            assert(am.stats[2].neutralized[1].game === 0, "P2 neutralized P1 should be 0");

            // ==========================================
            // TEST B: Scope Reset (Action/Turn)
            // ==========================================
            console.log("TEST B: Verifying Scope Reset Logic...");
            am.stats[1].neutralized[2].add(4); // Total 5 for P1 targeting P2
            am.startNewAction();
            assert(am.stats[1].neutralized[2].game === 5, "Game scope should persist after Action reset");
            assert(am.stats[1].neutralized[2].maxAction === 4, "maxAction should be captured before reset (was 4 in last act)");
            assert(am.stats[1].neutralized[2].action === 0, "Action scope should be 0 after reset");

            am.startNewTurn();
            assert(am.stats[1].neutralized[2].maxTurn === 5, "maxTurn should capture total from turn");
            assert(am.stats[1].neutralized[2].turn === 0, "Turn scope should be 0 after reset");

            // ==========================================
            // TEST C: Achievement Evaluation
            // ==========================================
            console.log("TEST C: Verifying Achievement Conditions...");

            // Mocking more complex state for achievements
            // saboteur: P1 neutralized P2 >= 5
            assert(am.stats[1].neutralized[2].game >= 5, "P1 neutralized P2 should be >= 5");

            //スピードラン (Speed Run): turnCount <= 12 && winner === 1
            g.turnCount = 10;
            g.winner = 1;

            // Unscathed: P1 lost 0 cores (neutralized self)
            am.stats[1].neutralized[1].game = 0;

            // Shutdown: Enemy Core Reward was 0
            am.stats[2].rewardCore.game = 0;

            // trigger check
            am.checkAchievements(g);

            const mapType = 'regular';
            const diff = 'easy';
            const progress = am.data.progress[mapType][diff];

            assert(progress['saboteur'] === true, " 'saboteur' (neutralized[2] >= 5) should be unlocked");
            assert(progress['speed_run'] === true, " 'speed_run' should be unlocked");
            assert(progress['unscathed'] === true, " 'unscathed' should be unlocked");
            assert(progress['shutdown'] === true, " 'shutdown' (enemy rewardCore == 0) should be unlocked");

            // Suicide Victory (Bokeana)
            console.log("Testing Suicide Victory (Bokeana)...");
            am.resetData();
            g.currentPlayer = 2; // AI turn
            g.winner = 1;        // Player wins
            am.checkAchievements(g);
            assert(am.data.progress[mapType][diff]['suicide_victory'] === true, " 'suicide_victory' should unlock if P1 wins during P2 turn");

        } catch (e) {
            console.error(`Fatal Error during achievement test: ${e.message}\n${e.stack}`);
            results.push({ message: `Fatal Error: ${e.message}`, status: 'fail' });
        }

        const failCount = results.filter(r => r.status === 'fail').length;
        if (failCount === 0) {
            console.log("🏆 ACHIEVEMENT TESTS PASSED!");
        } else {
            console.error(`🚨 ${failCount} ACHIEVEMENT TESTS FAILED!`);
        }
    }

    window.runAchievementTest = runAchievementTest;
})();
