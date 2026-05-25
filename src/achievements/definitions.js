// アチーブメントの定義定義データ (Ver 6.1.0)
//
// 判定用の各関数（condition, metric, metricCondition）は以下のシグネチャを持ちます：
// - condition(game, stats, context)
// - metric(game, stats, context)
// - metricCondition(game, stats, context)

export const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'win',
        condition: (game) => true,
        metric: (game, stats, context) => context.totalWins,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'learner',
        condition: (game) => true,
        metric: (game, stats, context) => context.totalLosses,
        metricType: 'max',
        metricCondition: (game) => game.winner === 2
    },
    {
        id: 'draw_game',
        condition: (game) => true,
        metric: (game, stats, context) => context.totalDraws,
        metricType: 'max',
        metricCondition: (game) => game.winner === 0
    },
    {
        id: 'suicide_victory',
        condition: (game) => game.currentPlayer === 2,
        metric: (game, stats, context) => context.totalSuicideWins,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'unscathed',
        condition: (game, stats) => (stats[1].neutralized[1].game + stats[2].neutralized[1].game) === 0,
        metric: (game, stats) => (stats[1].neutralized[1].game + stats[2].neutralized[1].game),
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'minimalist',
        condition: (game, stats) => stats[1].rewardEnergy.game === 0,
        metric: (game, stats) => stats[1].rewardEnergy.game,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_frugal',
        condition: (game, stats) => stats[1].rewardCore.game === 0,
        metric: (game, stats) => stats[1].rewardCore.game,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'efficient_resonance',
        condition: (game, stats) => {
            const p1Starts = game.coinToss?.result !== 2;
            const adjustedTurns = game.turnCount + (p1Starts ? 1 : 0);
            const p1Turns = Math.floor(adjustedTurns / 2);
            const cascades = stats[1].actions.game - p1Turns;
            return cascades <= 10;
        },
        metric: (game, stats) => {
            const p1Starts = game.coinToss?.result !== 2;
            const adjustedTurns = game.turnCount + (p1Starts ? 1 : 0);
            const p1Turns = Math.floor(adjustedTurns / 2);
            return Math.max(0, stats[1].actions.game - p1Turns);
        },
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'last_stand',
        condition: (game, stats) => stats[1].coreCount.current === 1,
        metric: (game, stats) => stats[1].coreCount.current,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_collector',
        condition: (game, stats) => stats[1].coreCount.current >= 5,
        metric: (game, stats) => stats[1].coreCount.current,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'close_game',
        condition: (game, stats) => Math.abs(stats[1].gridDiff.current) <= 3,
        metric: (game, stats) => Math.abs(stats[1].gridDiff.current),
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'comeback',
        condition: (game, stats) => stats[1].gridDiff.current < 0,
        metric: (game, stats) => stats[1].gridDiff.current,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'domination',
        condition: (game, stats) => stats[2].gridCount.current === 0,
        metric: (game, stats) => stats[2].gridCount.current,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'speed_run',
        condition: (game) => game.turnCount <= 30,
        metric: (game) => game.turnCount,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_shutdown',
        condition: (game, stats) => stats[2].rewardCore.game === 0,
        metric: (game, stats) => stats[2].rewardCore.game,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'high_voltage',
        condition: (game, stats) => stats[1].maxCellEnergy.max >= 12,
        metric: (game, stats) => stats[1].maxCellEnergy.max,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'chain_master',
        condition: (game, stats) => stats[1].actions.maxTurn >= 6,
        metric: (game, stats) => stats[1].actions.maxTurn,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'energy_collector',
        condition: (game, stats) => stats[1].rewardEnergy.game >= 15,
        metric: (game, stats) => stats[1].rewardEnergy.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'action_pro',
        condition: (game, stats) => stats[1].actions.game >= 80,
        metric: (game, stats) => stats[1].actions.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_master',
        condition: (game, stats) => stats[1].rewardCore.game >= 10,
        metric: (game, stats) => stats[1].rewardCore.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'saboteur',
        condition: (game, stats) => stats[1].neutralized[2].game >= 5,
        metric: (game, stats) => stats[1].neutralized[2].game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'war_veteran',
        condition: (game, stats) => stats[2].neutralized[1].game >= 5,
        metric: (game, stats) => stats[2].neutralized[1].game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'desperate_victory',
        condition: (game, stats) => stats[1].coreDiff.min <= -3,
        metric: (game, stats) => stats[1].coreDiff.min,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'deathline',
        condition: (game, stats) => stats[1].gridCount.min <= 2,
        metric: (game, stats) => stats[1].gridCount.min,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_sniper',
        condition: (game, stats) => stats[1].burstCore[2].maxAction >= 2,
        metric: (game, stats) => stats[1].burstCore[2].maxAction,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_hunter',
        condition: (game, stats) => stats[1].burstCore[2].maxTurn >= 3,
        metric: (game, stats) => stats[1].burstCore[2].maxTurn,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'grid_blaster',
        condition: (game, stats) => stats[1].burstGrid.both.maxAction >= 4,
        metric: (game, stats) => stats[1].burstGrid.both.maxAction,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'burst_addict',
        condition: (game, stats) => stats[1].burstGrid.both.game >= 20,
        metric: (game, stats) => stats[1].burstGrid.both.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'win_streak_5',
        condition: (game, stats, context) => context.winStreak >= 5,
        metric: (game, stats, context) => context.winStreak,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'endurance_win',
        condition: (game) => game.winner === 1 && game.turnCount >= 60,
        metric: (game) => game.turnCount,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'honorable_defeat',
        condition: (game) => game.winner === 2 && game.turnCount >= 60,
        metric: (game) => game.turnCount,
        metricType: 'max',
        metricCondition: (game) => game.winner === 2
    },
    {
        id: 'total_wins_20',
        condition: (game, stats, context) => (context && context.totalWins >= 20),
        metric: (game, stats, context) => context.totalWins,
        metricType: 'max'
    }
];
