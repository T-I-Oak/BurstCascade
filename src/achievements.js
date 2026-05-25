import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';
import { PlayerStats } from './achievements/stats.js';
import { ACHIEVEMENT_DEFINITIONS } from './achievements/definitions.js';
import achievementTexts from './data/achievement_texts.json';
import { expandAppLanguageResource } from './i18nManager.js';

export class AchievementManager {
    constructor() {
        this.STORAGE_KEY = 'burst_cascade_achievements';

        // Initialize Atomic Stats (Player Array Index 1=P1, 2=P2)
        this.stats = [
            null,
            new PlayerStats(),
            new PlayerStats()
        ];

        // 外部の定義データに関数引数 stats を自動バインドすることで、既存のシグネチャ (game, context) を維持
        this.refreshDefinitions();

        this.data = this.loadData();
    }

    refreshDefinitions() {
        const localizedTexts = expandAppLanguageResource(achievementTexts);
        this.achievements = ACHIEVEMENT_DEFINITIONS.map(ach => {
            const text = localizedTexts[ach.id];
            return {
                ...ach,
                title: text?.title || ach.id,
                description: text?.description || '',
                condition: (game, context) => ach.condition(game, this.stats, context),
                metric: ach.metric ? (game, context) => ach.metric(game, this.stats, context) : undefined,
                metricCondition: ach.metricCondition ? (game, context) => ach.metricCondition(game, this.stats, context) : undefined
            };
        });
    }

    // データ読み込み
    loadData() {
        const defaults = {
            progress: {
                regular: { easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 } },
                mini: { easy: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, normal: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }, hard: { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 } }
            }
        };

        const migrationMap = {
            init: () => JSON.parse(JSON.stringify(defaults))
        };

        try {
            const data = DataManager.getSavedData(this.STORAGE_KEY, migrationMap);
            return data;
        } catch (e) {
            console.error('Achievement load error:', e);
            return defaults;
        }
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
            this.data.progress[mapType][diffKey] = { achievements: {}, best: {}, winStreak: 0, lossStreak: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, totalSuicideWins: 0 };
        }

        const context = this.data.progress[mapType][diffKey];

        // 統計の更新
        if (game.winner === 1) {
            context.winStreak = (context.winStreak || 0) + 1;
            context.totalWins = (context.totalWins || 0) + 1;
            context.lossStreak = 0;
            if (game.currentPlayer === 2) { // Player 1 wins because Player 2 made a move that ended the game
                context.totalSuicideWins = (context.totalSuicideWins || 0) + 1;
            }
        } else if (game.winner === 2) {
            context.lossStreak = (context.lossStreak || 0) + 1;
            context.totalLosses = (context.totalLosses || 0) + 1;
            context.winStreak = 0;
        } else if (game.winner === 0) {
            context.totalDraws = (context.totalDraws || 0) + 1;
            context.winStreak = 0;
            context.lossStreak = 0;
        }

        this.achievements.forEach(ach => {
            // 前提条件 (勝利時のみ等) のチェック
            const isConditionMet = !ach.metricCondition || ach.metricCondition(game, context);

            // Best 記録を更新（前提条件を満たす場合、達成後も更新し続ける）
            if (ach.metric && isConditionMet) {
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

            // 解除判定 (前提条件 ＋ 固有条件)
            if (isConditionMet && ach.condition(game, context)) {
                context.achievements[ach.id] = true;
                newUnlocks.push(ach);
            }
        });

        this.saveData();
        return newUnlocks;
    }

    // 今回のゲームで条件を満たしたすべてのアチーブメントを取得 (Ver 6.0.0)
    getSessionAchievements(game, mapType, diff, newUnlocks) {
        const diffKey = diff.toLowerCase();
        const context = this.data.progress[mapType] ? this.data.progress[mapType][diffKey] : null;
        if (!context) return [];

        return this.achievements.filter(ach => {
            const isConditionMet = !ach.metricCondition || ach.metricCondition(game, context);
            return isConditionMet && ach.condition(game, context);
        }).map(ach => {
            return {
                id: ach.id,
                title: ach.title,
                description: ach.description,
                isNew: newUnlocks.some(n => n.id === ach.id)
            };
        });
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
        DataManager.setSavedData(this.STORAGE_KEY, saveData);
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
                    hard: { achievements: {}, best: {}, winStreak: 0, x: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }
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
