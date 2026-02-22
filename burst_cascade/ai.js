(function () {
    const { HexMap } = window.BurstCascade;

    class AI {
        constructor(playerNum, difficulty = 'hard') {
            this.player = playerNum;
            this.opponent = playerNum === 1 ? 2 : 1;
            this.difficulty = difficulty;

            // 難易度別パラメータ設定
            // Hard: 既存の最強設定
            // Normal: 探索を浅くし、圧力と連鎖への執着を下げる
            // Easy: 直近の報酬のみを見る、戦略性排除
            const settings = {
                'hard': {
                    depth: 5,
                    params: {
                        W_CORE: 200000,
                        W_TERRITORY: 15,
                        W_PRESSURE: 60,
                        W_ENERGY: 12,
                        W_CHAIN: 45
                    }
                },
                'normal': {
                    depth: 3,
                    params: {
                        W_CORE: 200000,
                        W_TERRITORY: 15,
                        W_PRESSURE: 30, // 圧力を半減
                        W_ENERGY: 10,
                        W_CHAIN: 20     // 連鎖への執着を弱める
                    }
                },
                'easy': {
                    depth: 1,
                    params: {
                        W_CORE: 200000,
                        W_TERRITORY: 10,
                        W_PRESSURE: 0,  // 敵への圧力を無視
                        W_ENERGY: 5,
                        W_CHAIN: 0      // 連鎖を考慮しない
                    }
                }
            };

            const config = settings[difficulty] || settings['hard'];
            this.searchDepth = config.depth;
            this.params = config.params;
        }

        /**
         * 盤面の状態をスコア化する
         */
        evaluate(map, chains) {
            let score = 0;
            const myPlayer = this.player;
            const oppPlayer = this.opponent;
            const mainHexes = map.mainHexes;

            for (let i = 0; i < mainHexes.length; i++) {
                const h = mainHexes[i];
                if (h.isDisabled) continue; // Ver 4.0: 無効マスはスキップ
                // zone === 'main' は pre-filtered なのでチェック不要

                // 1. コアの評価
                if (h.hasFlag) {
                    if (h.flagOwner === myPlayer) score += this.params.W_CORE;
                    else score -= this.params.W_CORE;
                }

                // 2. 支配権とエネルギー
                if (h.owner === myPlayer) {
                    score += this.params.W_TERRITORY;
                    score += Math.abs(h.height) * this.params.W_ENERGY;
                } else if (h.owner === oppPlayer) {
                    score -= this.params.W_TERRITORY;
                    score -= Math.abs(h.height) * this.params.W_ENERGY;
                }

                // 3. 敵コアへのプレッシャー
                if (h.hasFlag && h.flagOwner === oppPlayer) {
                    const neighbors = [{ q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }];
                    for (const d of neighbors) {
                        const n = map.getHexAt(h.q + d.q, h.r + d.r, 'main');
                        if (n && !n.isDisabled && n.owner === myPlayer) {
                            score += Math.abs(n.height) * this.params.W_PRESSURE;
                        }
                    }
                }
            }

            // 4. 連鎖報酬の進捗
            score += chains[myPlayer].self * this.params.W_CHAIN;
            score += chains[myPlayer].enemy * this.params.W_CHAIN * 3;
            score -= chains[oppPlayer].self * this.params.W_CHAIN;
            score -= chains[oppPlayer].enemy * this.params.W_CHAIN * 3;

            return score;
        }

        /**
         * 手札パターンの抽出 (dq, dr, dh)
         */
        getHandPattern(map, player) {
            const zoneId = 'hand-p' + player;
            const offset = map.offsets[zoneId];
            if (!offset) return [];
            return map.hexes
                .filter(h => h.zone === zoneId)
                .map(h => ({ dq: h.q - offset.q, dr: h.r - offset.r, dh: h.height }));
        }

        /**
         * Minimax 法（Alpha-Beta 枝刈り込み）
         */
        minimax(map, chains, depth, alpha, beta, isMaximizing) {
            const mainHexes = map.mainHexes;
            let p1Flags = 0, p2Flags = 0;
            for (let i = 0; i < mainHexes.length; i++) {
                if (mainHexes[i].hasFlag && !mainHexes[i].isDisabled) {
                    if (mainHexes[i].flagOwner === 1) p1Flags++; else p2Flags++;
                }
            }

            if (p1Flags === 0 || p2Flags === 0) {
                const winner = (p1Flags === 0 && p2Flags === 0) ? 0 : (p1Flags > 0 ? 1 : 2);
                const winValue = 10000000;
                if (winner === this.player) return winValue + depth;
                if (winner === 0) return 0;
                return -winValue - depth;
            }

            if (depth <= 0) return this.evaluate(map, chains);

            const currentActor = isMaximizing ? this.player : this.opponent;
            const candidates = mainHexes.filter(h => h.owner === currentActor && !h.isDisabled);
            if (candidates.length === 0) return isMaximizing ? -5000000 : 5000000;

            const handPattern = this.getHandPattern(map, currentActor);

            if (isMaximizing) {
                let maxEval = -Infinity;
                for (const hex of candidates) {
                    const nextMap = map.clone();
                    const nextChains = {
                        1: { self: chains[1].self, enemy: chains[1].enemy },
                        2: { self: chains[2].self, enemy: chains[2].enemy }
                    };
                    const result = this.simulateApplyHand(nextMap, nextChains, hex, currentActor, handPattern);

                    if (!result.chainContinues) nextChains[currentActor].self = 0;

                    const nextDepth = result.chainContinues ? depth - 0.5 : depth - 1;
                    const evalVal = this.minimax(nextMap, nextChains, nextDepth, alpha, beta, result.chainContinues);
                    if (evalVal > maxEval) maxEval = evalVal;
                    alpha = Math.max(alpha, evalVal);
                    if (beta <= alpha) break;
                }
                return maxEval;
            } else {
                let minEval = Infinity;
                for (const hex of candidates) {
                    const nextMap = map.clone();
                    const nextChains = {
                        1: { self: chains[1].self, enemy: chains[1].enemy },
                        2: { self: chains[2].self, enemy: chains[2].enemy }
                    };
                    const result = this.simulateApplyHand(nextMap, nextChains, hex, currentActor, handPattern);

                    if (!result.chainContinues) nextChains[currentActor].self = 0;

                    const nextDepth = result.chainContinues ? depth - 0.5 : depth - 1;
                    const evalVal = this.minimax(nextMap, nextChains, nextDepth, alpha, beta, !result.chainContinues);
                    if (evalVal < minEval) minEval = evalVal;
                    beta = Math.min(beta, evalVal);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        /**
         * シミュレーション用の手札適用
         */
        simulateApplyHand(map, chains, targetHex, player, handPattern) {
            if (!handPattern || handPattern.length === 0 || targetHex.isDisabled) return { chainContinues: false };

            let overflowOccurred = false;
            let selfRewardTriggered = false;
            let enemyRewardTriggered = false;

            for (const p of handPattern) {
                const h = map.getHexAt(targetHex.q + p.dq, targetHex.r + p.dr, 'main');
                if (h && !h.isDisabled) {
                    const originalOwner = h.owner;
                    h.height += p.dh;
                    if (Math.abs(h.height) > 9) {
                        h.height = 0;
                        overflowOccurred = true;
                        const isEnemy = (originalOwner !== 0 && originalOwner !== player);
                        const type = isEnemy ? 'enemy' : 'self';
                        chains[player][type]++;
                        const threshold = isEnemy ? 2 : 4;
                        if (chains[player][type] >= threshold) {
                            chains[player][type] = 0;
                            if (type === 'self') selfRewardTriggered = true;
                            else enemyRewardTriggered = true;

                            // 報酬の仮想適用 (簡易)
                            if (type === 'self') {
                                // 最も低い手札タイルを強化
                                const handHexes = map.handHexes['hand-p' + player];
                                let bestTarget = null;
                                let minAbs = Infinity;
                                for (let i = 0; i < handHexes.length; i++) {
                                    const hx = handHexes[i];
                                    const absH = Math.abs(hx.height);
                                    if (absH < minAbs) { minAbs = absH; bestTarget = hx; }
                                }
                                if (bestTarget) bestTarget.height += (player === 1 ? 1 : -1);
                            } else {
                                // 空いている自陣に旗を立てる
                                const target = map.mainHexes.find(hx => hx.owner === player && !hx.hasFlag && !hx.isDisabled);
                                if (target) { target.hasFlag = true; target.flagOwner = player; }
                            }
                        }
                    }
                    h.updateOwner();
                    if (h.hasFlag && (h.owner === 0 || h.owner !== h.flagOwner)) h.hasFlag = false;
                }
            }

            // 終了判定: 敵の旗が全滅している場合、連鎖中であっても即座に終了とみなす
            const opponent = player === 1 ? 2 : 1;
            const enemyFlags = map.hexes.filter(h => h.zone === 'main' && h.hasFlag && h.flagOwner === opponent && !h.isDisabled).length;
            if (enemyFlags === 0) {
                return { chainContinues: false };
            }

            // Ver 4.4.17: 自陣報酬が発生した場合は手番終了
            return { chainContinues: (overflowOccurred && !selfRewardTriggered) };
        }

        /**
         * 最善手を選択する
         */
        getBestMove(map, chains) {
            const candidates = map.mainHexes.filter(h => h.owner === this.player && !h.isDisabled);
            if (candidates.length === 0) return null;

            const moves = [];
            const depth = this.searchDepth;

            const handPattern = this.getHandPattern(map, this.player);


            candidates.forEach(hex => {
                const nextMap = map.clone();
                const nextChains = {
                    1: { self: chains[1].self, enemy: chains[1].enemy },
                    2: { self: chains[2].self, enemy: chains[2].enemy }
                };
                const result = this.simulateApplyHand(nextMap, nextChains, hex, this.player, handPattern);

                if (!result.chainContinues) nextChains[this.player].self = 0;

                // 評価値の計算
                const val = this.minimax(nextMap, nextChains, depth - (result.chainContinues ? 0.5 : 1), -Infinity, Infinity, result.chainContinues);

                moves.push({ q: hex.q, r: hex.r, val: val });
            });

            // 評価値の高い順にソート
            moves.sort((a, b) => b.val - a.val);

            // 難易度による選択
            let selectedMove = moves[0];

            if (this.difficulty === 'hard') {
                selectedMove = moves[0];
            } else if (this.difficulty === 'normal') {
                // Top 3 から確率選択 (Best: 60%, 2nd: 30%, 3rd: 10%)
                const r = Math.random();
                if (r < 0.6 || moves.length < 2) selectedMove = moves[0];
                else if (r < 0.9 || moves.length < 3) selectedMove = moves[1];
                else selectedMove = moves[2];
            } else if (this.difficulty === 'easy') {
                // Top 5 からランダム
                const range = Math.min(moves.length, 5);
                const idx = Math.floor(Math.random() * range);
                selectedMove = moves[idx];
            }


            return selectedMove;
        }
    }

    window.BurstCascade = window.BurstCascade || {};
    window.BurstCascade.AI = AI;

})();
