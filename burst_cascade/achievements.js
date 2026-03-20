class StatItem {
    constructor() {
        this.action = 0;   // Count in current action
        this.turn = 0;     // Sum in current turn
        this.game = 0;     // Sum in current game
        this.life = 0;     // Sum in lifetime (from storage)

        // Max records
        this.maxAction = 0; // Max count in single action per game
        this.maxTurn = 0;   // Max count in single turn per game
    }

    add(value) {
        this.action += value;
        this.turn += value;
        this.game += value;
        this.life += value;

        if (this.action > this.maxAction) this.maxAction = this.action;
        if (this.turn > this.maxTurn) this.maxTurn = this.turn;
    }

    newAction() {
        this.action = 0;
    }

    newTurn() {
        this.turn = 0;
        // maxAction is kept for the game scope record
    }

    newGame() {
        this.game = 0;
        this.maxAction = 0;
        this.maxTurn = 0;
        // life is persistent
    }

    load(lifeValue) {
        this.life = lifeValue || 0;
    }
}

// 最小値・最大値を追跡するクラス (Ver 5.1.0)
class RangeStatItem {
    constructor() {
        this.current = 0;
        this.min = 0;
        this.max = 0;
    }

    update(value) {
        this.current = value;
        if (this.current < this.min) this.min = this.current;
        if (this.current > this.max) this.max = this.current;
    }

    newGame(initialValue) {
        this.current = initialValue;
        this.min = initialValue;
        this.max = initialValue;
    }
}

// プレイヤーごとの統計セット
class PlayerStats {
    constructor() {
        this.actions = new StatItem();        // 注入回数
        this.neutralized = {
            1: new StatItem(),
            2: new StatItem(),
            both: new StatItem()
        };
        this.burstGrid = {
            1: new StatItem(),
            2: new StatItem(),
            both: new StatItem()
        };
        this.burstCore = {
            1: new StatItem(),
            2: new StatItem(),
            both: new StatItem()
        };
        this.rewardEnergy = new StatItem();
        this.rewardCore = new StatItem();

        // 最小値・最大値統計 (Ver 5.1.0)
        this.gridCount = new RangeStatItem();  // グリッド数
        this.gridDiff = new RangeStatItem();   // グリッド数差分 (自分 - 相手)
        this.coreCount = new RangeStatItem();  // コア数
        this.coreDiff = new RangeStatItem();   // コア数差分 (自分 - 相手)
        this.maxCellEnergy = new RangeStatItem(); // 瞬間最大セルエネルギー
    }

    // すべての StatItem を取得 (一括リセット用)
    getAllItems() {
        return [
            this.actions,
            this.rewardEnergy,
            this.rewardCore,
            ...Object.values(this.neutralized),
            ...Object.values(this.burstGrid),
            ...Object.values(this.burstCore)
        ];
    }

    // すべての RangeStatItem を取得
    getAllRangeItems() {
        return [
            this.gridCount,
            this.gridDiff,
            this.coreCount,
            this.coreDiff,
            this.maxCellEnergy
        ];
    }
}

class AchievementManager {
    constructor() {
        this.STORAGE_KEY = 'burst_cascade_achievements';

        // Initialize Atomic Stats (Player Array Index 1=P1, 2=P2)
        this.stats = [
            null,
            new PlayerStats(),
            new PlayerStats()
        ];

        this.achievements = this.defineAchievements();
        this.data = this.loadData();
    }

    // アチーブメント定義 (Ver 5.3.0)
    defineAchievements() {
        return [
            {
                id: 'win',
                title: '勝利',
                description: 'AIに勝利する',
                condition: (game) => game.winner === 1,
                metric: (game, context) => context.totalWins,
                metricType: 'max'
            },
            {
                id: 'learner',
                title: '学習者',
                description: '敗北する',
                condition: (game) => game.winner === 2,
                metric: (game, context) => context.totalLosses,
                metricType: 'max'
            },
            {
                id: 'draw_game',
                title: '共鳴の消失',
                description: '引き分けで終了する',
                condition: (game) => game.winner === 0,
                metric: (game, context) => context.totalDraws,
                metricType: 'max'
            },
            {
                id: 'suicide_victory',
                title: '墓穴',
                description: '相手の自滅により勝利する',
                condition: (game) => game.winner === 1 && game.currentPlayer === 2,
                metric: (game) => 1,
                metricType: 'max'
            },
            {
                id: 'unscathed',
                title: '無傷',
                description: 'コアを一度も無力化されずに勝利する',
                condition: (game) => game.winner === 1 && this.stats[2].neutralized[1].game === 0,
                metric: (game) => this.stats[2].neutralized[1].game,
                metricType: 'min'
            },
            {
                id: 'minimalist',
                title: '省エネ勝利',
                description: '供給エネルギーを一度も増やさずに勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].rewardEnergy.game === 0,
                metric: (game) => this.stats[1].rewardEnergy.game,
                metricType: 'min'
            },
            {
                id: 'core_frugal',
                title: '第一形態維持',
                description: '自分のコアを一度も増幅させずに勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].rewardCore.game === 0,
                metric: (game) => this.stats[1].rewardCore.game,
                metricType: 'min'
            },
            {
                id: 'last_stand',
                title: '背水の陣',
                description: '自分のコアが残り1個の状態で勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].coreCount.current === 1,
                metric: (game) => 1,
                metricType: 'max'
            },
            {
                id: 'core_collector',
                title: 'コア収集家',
                description: '自分のコアを5個以上所持して勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].coreCount.current >= 5,
                metric: (game) => this.stats[1].coreCount.max,
                metricType: 'max'
            },
            {
                id: 'close_game',
                title: '接戦',
                description: 'グリッド数差が3以内で勝利する',
                condition: (game) => game.winner === 1 && Math.abs(this.stats[1].gridDiff.current) <= 3,
                metric: (game) => Math.abs(this.stats[1].gridDiff.current),
                metricType: 'min'
            },
            {
                id: 'comeback',
                title: '逆転劇',
                description: '相手よりグリッドが少ない状態で勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].gridDiff.current < 0,
                metric: (game) => this.stats[1].gridDiff.min,
                metricType: 'min'
            },
            {
                id: 'domination',
                title: '完全制圧',
                description: '相手のグリッドを0にして勝利する',
                condition: (game) => game.winner === 1 && this.stats[2].gridCount.current === 0,
                metric: (game) => this.stats[2].gridCount.min,
                metricType: 'min'
            },
            {
                id: 'speed_run',
                title: 'スピード決着',
                description: '12ターン以内に勝利する',
                condition: (game) => game.winner === 1 && game.turnCount <= 12,
                metric: (game) => game.turnCount,
                metricType: 'min'
            },
            {
                id: 'core_shutdown',
                title: 'コア封殺',
                description: '相手に一度もコアを増幅させずに勝利する',
                condition: (game) => game.winner === 1 && this.stats[2].rewardCore.game === 0,
                metric: (game) => this.stats[2].rewardCore.game,
                metricType: 'min'
            },
            {
                id: 'high_voltage',
                title: '高電圧',
                description: '最大エネルギー15以上を記録して勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].maxCellEnergy.max >= 15,
                metric: (game) => this.stats[1].maxCellEnergy.max,
                metricType: 'max'
            },
            {
                id: 'chain_master',
                title: '連鎖の達人',
                description: '1ターンに6連鎖以上発生させて勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].actions.maxTurn >= 6,
                metric: (game) => this.stats[1].actions.maxTurn,
                metricType: 'max'
            },
            {
                id: 'energy_collector',
                title: 'エネルギー・コレクター',
                description: '供給エネルギー強化を15回以上発生させて勝利',
                condition: (game) => game.winner === 1 && this.stats[1].rewardEnergy.game >= 15,
                metric: (game) => this.stats[1].rewardEnergy.game,
                metricType: 'max'
            },
            {
                id: 'action_pro',
                title: 'アクションプロ',
                description: '1試合で80回以上注入し勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].actions.game >= 80,
                metric: (game) => this.stats[1].actions.game,
                metricType: 'max'
            },
            {
                id: 'core_master',
                title: 'コア・マスター',
                description: '1試合中に10回以上コアを獲得して勝利',
                condition: (game) => game.winner === 1 && this.stats[1].rewardCore.game >= 10,
                metric: (game) => this.stats[1].rewardCore.game,
                metricType: 'max'
            },
            {
                id: 'saboteur',
                title: '破壊工作員',
                description: '相手のコアを5個以上無力化して勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].neutralized[2].game >= 5,
                metric: (game) => this.stats[1].neutralized[2].game,
                metricType: 'max'
            },
            {
                id: 'war_veteran',
                title: '歴戦の勇士',
                description: '自身のコアを5個以上無力化されつつ勝利する',
                condition: (game) => game.winner === 1 && this.stats[2].neutralized[1].game >= 5,
                metric: (game) => this.stats[2].neutralized[1].game,
                metricType: 'max'
            },
            {
                id: 'desperate_victory',
                title: '絶望からの逆転',
                description: 'コア数差-3以上の劣勢を経験して勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].coreDiff.min <= -3,
                metric: (game) => this.stats[1].coreDiff.min,
                metricType: 'min'
            },
            {
                id: 'deathline',
                title: '死線',
                description: 'グリッド数が2以下まで追い詰められつつ勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].gridCount.min <= 2,
                metric: (game) => this.stats[1].gridCount.min,
                metricType: 'min'
            },
            {
                id: 'core_sniper',
                title: 'コアスナイパー',
                description: '1アクションで2個以上の敵コアを爆発させて勝利',
                condition: (game) => game.winner === 1 && this.stats[1].burstCore[2].maxAction >= 2,
                metric: (game) => this.stats[1].burstCore[2].maxAction,
                metricType: 'max'
            },
            {
                id: 'core_hunter',
                title: 'コアハンター',
                description: '1ターンに3個以上の敵コアを爆発させて勝利',
                condition: (game) => game.winner === 1 && this.stats[1].burstCore[2].maxTurn >= 3,
                metric: (game) => this.stats[1].burstCore[2].maxTurn,
                metricType: 'max'
            },
            {
                id: 'grid_blaster',
                title: '地形粉砕',
                description: '1アクションで4箇所以上のグリッドを爆発させて勝利',
                condition: (game) => game.winner === 1 && this.stats[1].burstGrid.both.maxAction >= 4,
                metric: (game) => this.stats[1].burstGrid.both.maxAction,
                metricType: 'max'
            },
            {
                id: 'burst_addict',
                title: '爆発ジャンキー',
                description: '1試合で20回以上グリッドを爆発させて勝利する',
                condition: (game) => game.winner === 1 && this.stats[1].burstGrid.both.game >= 20,
                metric: (game) => this.stats[1].burstGrid.both.game,
                metricType: 'max'
            },
            {
                id: 'win_streak_5',
                title: '五連覇',
                description: 'AIに5連勝する',
                condition: (game, context) => (context && context.winStreak >= 5),
                metric: (game, context) => context.winStreak,
                metricType: 'max'
            },
            {
                id: 'endurance_win',
                title: '長期戦',
                description: '60ターン以上かけて勝利する',
                condition: (game) => game.winner === 1 && game.turnCount >= 60,
                metric: (game) => game.turnCount,
                metricType: 'max'
            },
            {
                id: 'honorable_defeat',
                title: '力戦奮闘',
                description: '60ターン以上かけて敗北する',
                condition: (game) => game.winner === 2 && game.turnCount >= 60,
                metric: (game) => game.turnCount,
                metricType: 'max'
            },
            {
                id: 'total_wins_20',
                title: '常勝軍団',
                description: '通算20勝を達成する',
                condition: (game, context) => (context && context.totalWins >= 20),
                metric: (game, context) => context.totalWins,
                metricType: 'max'
            }
        ];
    }

    // データ読み込み
    loadData() {
        const json = localStorage.getItem(this.STORAGE_KEY);
        const defaults = {
            progress: {
                // [mapType]: { [diff]: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 } }
                regular: { easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 } },
                mini: { easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 } }
            }
        };

        if (json) {
            try {
                const data = JSON.parse(json);
                const mergedProgress = JSON.parse(JSON.stringify(defaults.progress));
                if (data.progress) {
                    for (const map in data.progress) {
                        for (const diff in data.progress[map]) {
                            if (mergedProgress[map] && mergedProgress[map][diff]) {
                                const oldData = data.progress[map][diff];
                                // 旧データからの移行を考慮
                                mergedProgress[map][diff] = { ...mergedProgress[map][diff], ...oldData };
                                if (!mergedProgress[map][diff].best) mergedProgress[map][diff].best = {};
                                if (mergedProgress[map][diff].totalLosses === undefined) mergedProgress[map][diff].totalLosses = 0;
                                if (mergedProgress[map][diff].totalDraws === undefined) mergedProgress[map][diff].totalDraws = 0;
                            }
                        }
                    }
                }
                return { progress: mergedProgress };
            } catch (e) {
                console.error('Achievement load error:', e);
                return defaults;
            }
        }
        return defaults;
    }

    // ゲーム終了時のチェック
    checkAchievements(game, mapType, diff) {
        let newUnlocks = [];
        const diffKey = diff.toLowerCase(); // 'easy', 'normal', 'hard'

        // データ構造の初期化保証
        if (!this.data.progress[mapType]) {
            this.data.progress[mapType] = {
                easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 },
                normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 },
                hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }
            };
        }
        if (!this.data.progress[mapType][diffKey]) {
            this.data.progress[mapType][diffKey] = { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 };
        }

        const context = this.data.progress[mapType][diffKey];

        // 統計の更新
        if (game.winner === 2) {
            context.lossStreak = (context.lossStreak || 0) + 1;
            context.totalLosses = (context.totalLosses || 0) + 1;
            context.winStreak = 0;
        } else if (game.winner === 1) {
            context.winStreak = (context.winStreak || 0) + 1;
            context.totalWins = (context.totalWins || 0) + 1;
            context.lossStreak = 0;
        } else if (game.winner === 0) {
            context.totalDraws = (context.totalDraws || 0) + 1;
            context.winStreak = 0;
            context.lossStreak = 0;
        }

        this.achievements.forEach(ach => {
            // アチーブメント条件に関わらず Best 記録を更新（達成後も更新し続ける）
            if (ach.metric) {
                const currentVal = (typeof ach.metric === 'function') ? ach.metric(game, context) : 0;
                const prevBest = context.best[ach.id];

                if (prevBest === undefined) {
                    context.best[ach.id] = currentVal;
                } else {
                    if (ach.metricType === 'min') {
                        if (currentVal < prevBest) context.best[ach.id] = currentVal;
                    } else {
                        if (currentVal > prevBest) context.best[ach.id] = currentVal;
                    }
                }
            }

            // 既に取得済みなら解除判定はスキップ
            if (context.achievements[ach.id]) return;

            if (ach.condition(game, context)) {
                context.achievements[ach.id] = true;
                newUnlocks.push(ach);
            }
        });

        this.saveData();
        return newUnlocks;
    }


    // UI表示用のデータ取得
    getDisplayData(mapType) {
        // mapType: 'regular', 'mini'
        return this.achievements.map(ach => {
            const p = this.data.progress[mapType] || {};
            const earned = {
                easy: (p.easy && p.easy.achievements) ? !!p.easy.achievements[ach.id] : false,
                normal: (p.normal && p.normal.achievements) ? !!p.normal.achievements[ach.id] : false,
                hard: (p.hard && p.hard.achievements) ? !!p.hard.achievements[ach.id] : false
            };
            const best = {
                easy: (p.easy && p.easy.best) ? p.easy.best[ach.id] : undefined,
                normal: (p.normal && p.normal.best) ? p.normal.best[ach.id] : undefined,
                hard: (p.hard && p.hard.best) ? p.hard.best[ach.id] : undefined
            };

            // 何らかの難易度・マップで一度でも達成していれば「公開」
            const isRevealed = this.isRevealedAnywhere(ach.id);

            return {
                ...ach,
                earned,
                best,
                isRevealed
            };
        });
    }

    isRevealedAnywhere(achId) {
        const types = ['regular', 'mini'];
        const diffs = ['easy', 'normal', 'hard'];
        for (const t of types) {
            if (!this.data.progress[t]) continue;
            for (const d of diffs) {
                const context = this.data.progress[t][d];
                if (context && context.achievements && context.achievements[achId]) {
                    return true;
                }
            }
        }
        return false;
    }

    // 未取得の上位3件を取得するためのヘルパー
    getRevealedList(mapType) {
        const list = this.getDisplayData(mapType);
        let hiddenCount = 0;

        return list.map(item => {
            const isEarnedCurrent = item.earned.easy || item.earned.normal || item.earned.hard;

            // 既にグローバルで公開済みならそのまま
            if (item.isRevealed) return item;

            // 未公開の場合、上位2件までは「公開扱い」にする
            if (!isEarnedCurrent) {
                hiddenCount++;
                if (hiddenCount <= 2) {
                    return { ...item, isRevealed: true, isHint: true }; // isHint: 薄く表示するフラグ
                }
            }
            return item;
        });
    }

    // セーブ
    saveData() {
        const saveData = {
            ...this.data,
            lifeStats: {} // For now, we might skip detailed StatItem.life persistence if not critical for current achievements
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
    }

    // リセット
    resetData() {
        this.data = {
            progress: {
                regular: {
                    easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 },
                    normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 },
                    hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }
                },
                mini: {
                    easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 },
                    normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 },
                    hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }
                }
            }
        };
        this.saveData();
    }

    // ヘルパー: 指定プレイヤーの土地数をカウント
    countHexes(game, owner) {
        return game.map.mainHexes.filter(h => h.owner === owner).length;
    }
    // スコープ制御
    startNewAction() {
        this.stats[1].getAllItems().forEach(s => s.newAction());
        this.stats[2].getAllItems().forEach(s => s.newAction());
    }
    startNewTurn() {
        this.stats[1].getAllItems().forEach(s => s.newTurn());
        this.stats[2].getAllItems().forEach(s => s.newTurn());
    }
    startNewGame(initialGridCounts, initialCoreCounts) {
        this.stats[1].getAllItems().forEach(s => s.newGame());
        this.stats[2].getAllItems().forEach(s => s.newGame());

        // Range Stats の初期化 (Ver 5.1.0)
        if (initialGridCounts && initialCoreCounts) {
            const g1 = initialGridCounts[1];
            const g2 = initialGridCounts[2];
            const c1 = initialCoreCounts[1];
            const c2 = initialCoreCounts[2];

            this.stats[1].gridCount.newGame(g1);
            this.stats[1].gridDiff.newGame(g1 - g2);
            this.stats[1].coreCount.newGame(c1);
            this.stats[1].coreDiff.newGame(c1 - c2);
            this.stats[1].maxCellEnergy.newGame(0);

            this.stats[2].gridCount.newGame(g2);
            this.stats[2].gridDiff.newGame(g2 - g1);
            this.stats[2].coreCount.newGame(c2);
            this.stats[2].coreDiff.newGame(c2 - c1);
            this.stats[2].maxCellEnergy.newGame(0);
        } else {
            this.stats[1].getAllRangeItems().forEach(s => s.newGame(0));
            this.stats[2].getAllRangeItems().forEach(s => s.newGame(0));
        }
    }
}

window.BurstCascade = window.BurstCascade || {};
window.BurstCascade.AchievementManager = AchievementManager;
window.BurstCascade.StatItem = StatItem;
window.BurstCascade.RangeStatItem = RangeStatItem;
window.BurstCascade.PlayerStats = PlayerStats;
