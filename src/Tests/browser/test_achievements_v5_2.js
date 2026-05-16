(function () {
    let AchievementManager;

    if (typeof require !== 'undefined' && typeof process !== 'undefined' && typeof window === 'undefined') {
        // Node.js Standalone Mode
        const fs = require('fs');
        const path = require('path');
        const vm = require('vm');

        const sandbox = {
            window: {
                BurstCascade: {
                    HexMap: class { constructor() { } },
                    Layout: class { constructor() { } }
                }
            },
            console: console,
            localStorage: {
                getItem: function () { return this.data || null; },
                setItem: function (key, val) { this.data = val; },
                removeItem: function () { this.data = null; }
            },
            confirm: () => true
        };
        sandbox.window.self = sandbox.window;
        vm.createContext(sandbox);

        const code = fs.readFileSync(path.join(__dirname, '..', 'achievements.js'), 'utf8');
        vm.runInContext(code, sandbox);
        AchievementManager = sandbox.window.BurstCascade.AchievementManager;
    } else {
        // Browser or Jest Mode
        AchievementManager = (window.BurstCascade || {}).AchievementManager;
    }

    function assert(condition, message, extra = "") {
        if (condition) {
            console.log(`✅ [PASS] ${message} ${extra}`);
        } else {
            console.error(`❌ [FAIL] ${message} ${extra}`);
            if (typeof process !== 'undefined' && process.exit) process.exit(1);
        }
    }

    console.log("--- Starting Behavioral Verification: Achievement Overhaul v5.2 ---");

    try {
        const am = new AchievementManager();

        // Test helper game object
        const game = {
            winner: 1,
            currentPlayer: 1,
            turnCount: 10,
            map: {
                mainHexes: []
            }
        };

        // ==========================================
        // TEST 1: Suicide Victory (墓穴)
        // ==========================================
        console.log("\nTEST 1: Suicide Victory (winner=1, current=2)");
        game.winner = 1;
        game.currentPlayer = 2; // AI turn self-destruct
        const suicideAch = am.achievements.find(a => a.id === 'suicide_victory');
        assert(suicideAch.condition(game), "Suicide victory detected");

        // ==========================================
        // TEST 2: War Veteran (歴戦の勇士 - Lost 5 cores win)
        // ==========================================
        console.log("\nTEST 2: War Veteran (Defensive Resilience)");
        am.stats[2].neutralized[1].game = 5; // AI neutralized 5 of P1's cores
        game.winner = 1;
        game.currentPlayer = 1;
        const veteranAch = am.achievements.find(a => a.id === 'war_veteran');
        assert(veteranAch.condition(game), "War Veteran (P1 lost 5 cores but won) detected");

        // ==========================================
        // TEST 3: Saboteur (破壊工作員 - Destroyed 5 enemy cores)
        // ==========================================
        console.log("\nTEST 3: Saboteur (Offensive Destruction)");
        am.stats[1].neutralized[2].game = 5; // P1 neutralized 5 of AI's cores
        const saboteurAch = am.achievements.find(a => a.id === 'saboteur');
        assert(saboteurAch.condition(game), "Saboteur (P1 destroyed 5 enemy cores) detected");

        // ==========================================
        // TEST 4: Grid Blaster (1 Action 4 Bursts)
        // ==========================================
        console.log("\nTEST 4: Grid Blaster (Action peak)");
        am.stats[1].burstGrid.both.maxAction = 4;
        const gridBlasterAch = am.achievements.find(a => a.id === 'grid_blaster');
        assert(gridBlasterAch.condition(game), "Grid Blaster (4 grid bursts in action) detected");

        // ==========================================
        // TEST 5: Burst Addict (20 total bursts)
        // ==========================================
        console.log("\nTEST 5: Burst Addict (Game volume)");
        am.stats[1].burstGrid.both.game = 20;
        const addictAch = am.achievements.find(a => a.id === 'burst_addict');
        assert(addictAch.condition(game), "Burst Addict (20 game bursts) detected");

        // ==========================================
        // TEST 6: Persistent Data (Streaks & TotalWins)
        // ==========================================
        console.log("\nTEST 6: Persistent Data (Streaks & TotalWins)");
        // Simulate game end 1st win
        const context = am.data.progress.regular.normal;
        context.winStreak = 0;
        context.totalWins = 0;
        game.winner = 1;
        am.checkAchievements(game, 'regular', 'normal');
        assert(context.winStreak === 1, "Win Streak incremented to 1");
        assert(context.totalWins === 1, "Total Wins incremented to 1");

        const totalWinsAch = am.achievements.find(a => a.id === 'total_wins_20');
        context.totalWins = 20;
        assert(totalWinsAch.condition(game, context), "Total wins 20 detected");

        const winStreakAch = am.achievements.find(a => a.id === 'win_streak_5');
        context.winStreak = 5;
        assert(winStreakAch.condition(game, context), "Win streak 5 detected");

        console.log("\nALL v5.2 OVERHAUL TESTS PASSED! 🏆");

    } catch (e) {
        console.error("Fatal test error:");
        console.error(e);
        if (typeof process !== 'undefined' && process.exit) process.exit(1);
    }
})();
