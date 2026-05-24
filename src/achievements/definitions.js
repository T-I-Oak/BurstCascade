// アチーブメントの定義定義データ (Ver 6.1.0)
//
// 判定用の各関数（condition, metric, metricCondition）は以下のシグネチャを持ちます：
// - condition(game, stats, context)
// - metric(game, stats, context)
// - metricCondition(game, stats, context)

export const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'win',
        title: '勝利',
        description: 'AIに勝利する',
        condition: (game) => true,
        metric: (game, stats, context) => context.totalWins,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'learner',
        title: '学習者',
        description: 'AIに敗北する',
        condition: (game) => true,
        metric: (game, stats, context) => context.totalLosses,
        metricType: 'max',
        metricCondition: (game) => game.winner === 2
    },
    {
        id: 'draw_game',
        title: '共鳴の消失',
        description: '引き分けで終了する',
        condition: (game) => true,
        metric: (game, stats, context) => context.totalDraws,
        metricType: 'max',
        metricCondition: (game) => game.winner === 0
    },
    {
        id: 'suicide_victory',
        title: '墓穴',
        description: '相手の自滅により勝利する',
        condition: (game) => game.currentPlayer === 2,
        metric: (game, stats, context) => context.totalSuicideWins,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'unscathed',
        title: '無傷',
        description: 'コアを一度も失わずに勝利する',
        condition: (game, stats) => (stats[1].neutralized[1].game + stats[2].neutralized[1].game) === 0,
        metric: (game, stats) => (stats[1].neutralized[1].game + stats[2].neutralized[1].game),
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'minimalist',
        title: '省エネ勝利',
        description: '供給エネルギー強化を一度も発生させずに勝利する',
        condition: (game, stats) => stats[1].rewardEnergy.game === 0,
        metric: (game, stats) => stats[1].rewardEnergy.game,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_frugal',
        title: '第一形態維持',
        description: '自分のコアを一度も追加せずに勝利する',
        condition: (game, stats) => stats[1].rewardCore.game === 0,
        metric: (game, stats) => stats[1].rewardCore.game,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'efficient_resonance',
        title: '効率的共鳴',
        description: '累積連鎖回数を10回以下に抑えて勝利する',
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
        title: '背水の陣',
        description: '自分のコアが残り1個の状態で勝利する',
        condition: (game, stats) => stats[1].coreCount.current === 1,
        metric: (game, stats) => stats[1].coreCount.current,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_collector',
        title: 'コア収集家',
        description: '自分のコアを5個以上所持して勝利する',
        condition: (game, stats) => stats[1].coreCount.current >= 5,
        metric: (game, stats) => stats[1].coreCount.current,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'close_game',
        title: '接戦',
        description: 'グリッド数差が3以内で勝利する',
        condition: (game, stats) => Math.abs(stats[1].gridDiff.current) <= 3,
        metric: (game, stats) => Math.abs(stats[1].gridDiff.current),
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'comeback',
        title: '逆転劇',
        description: '相手よりグリッドが少ない状態で勝利する',
        condition: (game, stats) => stats[1].gridDiff.current < 0,
        metric: (game, stats) => stats[1].gridDiff.current,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'domination',
        title: '完全制圧',
        description: '相手のグリッドを0にして勝利する',
        condition: (game, stats) => stats[2].gridCount.current === 0,
        metric: (game, stats) => stats[2].gridCount.current,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'speed_run',
        title: 'スピード決着',
        description: '30ターン以内に勝利する',
        condition: (game) => game.turnCount <= 30,
        metric: (game) => game.turnCount,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_shutdown',
        title: 'コア封殺',
        description: '相手に一度もコアを増幅させずに勝利する',
        condition: (game, stats) => stats[2].rewardCore.game === 0,
        metric: (game, stats) => stats[2].rewardCore.game,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'high_voltage',
        title: '高電圧',
        description: '最大エネルギー12以上を記録して勝利する',
        condition: (game, stats) => stats[1].maxCellEnergy.max >= 12,
        metric: (game, stats) => stats[1].maxCellEnergy.max,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'chain_master',
        title: '連鎖の達人',
        description: '1ターンに6連鎖以上発生させて勝利する',
        condition: (game, stats) => stats[1].actions.maxTurn >= 6,
        metric: (game, stats) => stats[1].actions.maxTurn,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'energy_collector',
        title: 'エネルギー・コレクター',
        description: '供給エネルギー強化を15回以上発生させて勝利',
        condition: (game, stats) => stats[1].rewardEnergy.game >= 15,
        metric: (game, stats) => stats[1].rewardEnergy.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'action_pro',
        title: 'アクションプロ',
        description: '1試合で80回以上注入し勝利する',
        condition: (game, stats) => stats[1].actions.game >= 80,
        metric: (game, stats) => stats[1].actions.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_master',
        title: 'コア・マスター',
        description: '1試合中に10回以上コアを獲得して勝利',
        condition: (game, stats) => stats[1].rewardCore.game >= 10,
        metric: (game, stats) => stats[1].rewardCore.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'saboteur',
        title: '破壊工作員',
        description: '相手のコアを5個以上無力化して勝利する',
        condition: (game, stats) => stats[1].neutralized[2].game >= 5,
        metric: (game, stats) => stats[1].neutralized[2].game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'war_veteran',
        title: '歴戦の勇士',
        description: '自身のコアを5個以上無力化されつつ勝利する',
        condition: (game, stats) => stats[2].neutralized[1].game >= 5,
        metric: (game, stats) => stats[2].neutralized[1].game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'desperate_victory',
        title: '絶望からの逆転',
        description: 'コア数差-3以上の劣勢を経験して勝利する',
        condition: (game, stats) => stats[1].coreDiff.min <= -3,
        metric: (game, stats) => stats[1].coreDiff.min,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'deathline',
        title: '死線',
        description: 'グリッド数が2以下まで追い詰められつつ勝利する',
        condition: (game, stats) => stats[1].gridCount.min <= 2,
        metric: (game, stats) => stats[1].gridCount.min,
        metricType: 'min',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_sniper',
        title: 'コアスナイパー',
        description: '1アクションで2個以上の敵コアを爆発させて勝利',
        condition: (game, stats) => stats[1].burstCore[2].maxAction >= 2,
        metric: (game, stats) => stats[1].burstCore[2].maxAction,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'core_hunter',
        title: 'コアハンター',
        description: '1ターンに3個以上の敵コアを爆発させて勝利',
        condition: (game, stats) => stats[1].burstCore[2].maxTurn >= 3,
        metric: (game, stats) => stats[1].burstCore[2].maxTurn,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'grid_blaster',
        title: '地形粉砕',
        description: '1アクションで4箇所以上のグリッドを爆発させて勝利',
        condition: (game, stats) => stats[1].burstGrid.both.maxAction >= 4,
        metric: (game, stats) => stats[1].burstGrid.both.maxAction,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'burst_addict',
        title: '爆発ジャンキー',
        description: '1試合で20回以上グリッドを爆発させて勝利する',
        condition: (game, stats) => stats[1].burstGrid.both.game >= 20,
        metric: (game, stats) => stats[1].burstGrid.both.game,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'win_streak_5',
        title: '五連覇',
        description: 'AIに5連勝する',
        condition: (game, stats, context) => context.winStreak >= 5,
        metric: (game, stats, context) => context.winStreak,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'endurance_win',
        title: '長期戦',
        description: '60ターン以上かけて勝利する',
        condition: (game) => game.winner === 1 && game.turnCount >= 60,
        metric: (game) => game.turnCount,
        metricType: 'max',
        metricCondition: (game) => game.winner === 1
    },
    {
        id: 'honorable_defeat',
        title: '力戦奮闘',
        description: '60ターン以上かけて敗北する',
        condition: (game) => game.winner === 2 && game.turnCount >= 60,
        metric: (game) => game.turnCount,
        metricType: 'max',
        metricCondition: (game) => game.winner === 2
    },
    {
        id: 'total_wins_20',
        title: '常勝軍団',
        description: 'AIに通算20勝する',
        condition: (game, stats, context) => (context && context.totalWins >= 20),
        metric: (game, stats, context) => context.totalWins,
        metricType: 'max'
    }
];
