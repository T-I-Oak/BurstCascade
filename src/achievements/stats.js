export class StatItem {
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
export class RangeStatItem {
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
export class PlayerStats {
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
