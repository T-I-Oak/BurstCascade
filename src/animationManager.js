/**
 * アニメーションループ、演出、パーティクル管理を担当するクラス
 */
export class AnimationManager {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        const g = this.game;

        // 1. エフェクト（パーティクル・テキスト等）の更新
        this.updateEffects(dt);

        // 2. 落下エフェクトの更新
        this.updateDropEffects(dt);

        // 3. 遅延爆発のチェック
        const now = Date.now();
        g.delayedBursts = g.delayedBursts.filter(b => {
            if (now >= b.time) {
                g.addParticles(b.x, b.y, b.color, b.isBig, b.targetDotKey, b.targetHex, b.reward);
                return false;
            }
            return true;
        });

        // 4. フラッシュの減衰
        g.flashAlpha *= 0.9;

        // 5. マップ要素のビジュアル更新
        if (g.map) {
            g.map.hexes.forEach(hex => {
                // 高さの補間 (イージング)
                const heightDiff = hex.height - hex.visualHeight;
                if (Math.abs(heightDiff) > 0.01) {
                    hex.visualHeight += heightDiff * 0.15;
                } else {
                    hex.visualHeight = hex.height;
                }

                // フラッグのスケール補間
                const targetScale = hex.hasFlag ? 1.0 : 0.0;
                const scaleDiff = targetScale - hex.visualFlagScale;
                if (Math.abs(scaleDiff) > 0.01) {
                    hex.visualFlagScale += scaleDiff * 0.15;
                } else {
                    hex.visualFlagScale = targetScale;
                }
            });
        }

        // 6. チェーンアニメーションの減衰
        [1, 2].forEach(p => {
            ['self', 'enemy'].forEach(type => {
                g.chainAnims[p][type] *= 0.9;
            });
        });

        // 7. 収束演出の更新
        g.focusEffects = g.focusEffects.filter(fe => {
            fe.life -= 0.04;
            fe.scale -= 0.05;
            return fe.life > 0;
        });
    }

    updateDropEffects(dt) {
        const g = this.game;
        if (g.dropEffects.length > 0) {
            g.dropEffects.forEach(de => {
                if (de.landed) return;

                if (de.state === 'appearing') {
                    de.alpha += 0.1; // 高速化
                    // ほわっと浮いている微振動
                    de.y += Math.sin(Date.now() * 0.01) * 0.2;
                    if (de.alpha >= 1) {
                        de.alpha = 1;
                        de.state = 'hovering';
                    }
                    return;
                }

                if (de.state === 'hovering') {
                    de.hoverTimer--;
                    de.y += Math.sin(Date.now() * 0.01) * 0.2;
                    if (de.hoverTimer <= 0) {
                        de.state = 'falling';
                    }
                    return;
                }

                // 落下（簡易的な物理）
                de.y += de.velocity;
                de.velocity += 1.2; // 重力加速 (0.8 -> 1.2 高速化)

                // 着弾判定
                if (de.y >= de.targetY) {
                    de.y = de.targetY;
                    de.landed = true;
                    g.handleDropImpact(de);
                }
            });

            // Ver 4.4.4: 演出状況の精密なチェック
            const lands = g.dropEffects.filter(de => de.type === 'land');
            const marker = g.dropEffects.find(de => de.type === 'marker');

            // 1. 土地の着弾待ち（すべて着弾した場合）
            if (g.isWaitingForDrop && lands.every(de => de.landed)) {
                // 土地をエフェクトから除去（連鎖計算に影響を与えないため）
                g.dropEffects = g.dropEffects.filter(de => de.type !== 'land');
                g.isWaitingForDrop = false; // 土地待ちフェーズ終了

                g.processChainReaction();
            }

            // 2. マーカーの着弾待ち（マーカーが存在し、落下指示後に着弾した場合）
            if (marker && marker.landed) {
                g.lastMoveHex = marker.targetHex;
                g.dropEffects = []; // エフェクトクリア
                g.finalizeTurn(g.turnHadBurst);
            }
        }
    }

    updateEffects(dt) {
        const g = this.game;
        const survivors = [];
        const originalCount = g.effects.length;

        for (let i = 0; i < originalCount; i++) {
            const ef = g.effects[i];
            let keep = true;

            if (ef.type === 'reconstruct_dot') {
                const now = Date.now();
                const el = now - ef.startTime;
                if (el >= ef.duration) {
                    keep = false;
                    if (ef.updates) {
                        g.map.applyHandUpdate(ef.updates);
                    }
                    const isP1 = (g.currentPlayer === 1);
                    g.effects.push({
                        x: ef.startX, y: ef.startY - 40,
                        vx: 0, vy: -0.5,
                        life: 1.0,
                        text: "-1",
                        color: isP1 ? '#ef4444' : '#4ade80',
                        type: 'floating_text'
                    });
                    g.effects.push({
                        x: ef.endX, y: ef.endY - 40,
                        vx: 0, vy: -0.5,
                        life: 1.0,
                        text: "+1",
                        color: isP1 ? '#4ade80' : '#ef4444',
                        type: 'floating_text'
                    });
                    g.addParticles(ef.endX, ef.endY, ef.color, false);
                } else {
                    const p = el / ef.duration;
                    ef.x = ef.startX + (ef.endX - ef.startX) * p;
                    ef.y = ef.startY + (ef.endY - ef.startY) * p - Math.sin(p * Math.PI) * 50;
                    if (ef.startSize !== undefined && ef.endSize !== undefined) {
                        ef.size = ef.startSize + (ef.endSize - ef.startSize) * p;
                        if (ef.startRGB && ef.endRGB) {
                            const r = Math.round(ef.startRGB.r + (ef.endRGB.r - ef.startRGB.r) * p);
                            const g = Math.round(ef.startRGB.g + (ef.endRGB.g - ef.startRGB.g) * p);
                            const b = Math.round(ef.startRGB.b + (ef.endRGB.b - ef.startRGB.b) * p);
                            ef.color = `rgb(${r},${g},${b})`;
                        }
                    }
                    survivors.push(ef);
                }
            } else if (ef.type === 'floating_text') {
                ef.x += ef.vx;
                ef.y += ef.vy;
                ef.life -= 0.02;
                if (ef.life > 0) survivors.push(ef);
            } else {
                let target = null;
                if (ef.targetDotKey && g.dotTargets[ef.targetDotKey]) {
                    target = g.dotTargets[ef.targetDotKey];
                } else if (ef.targetHex) {
                    const targetPos = g.layout.hexToPixel(ef.targetHex);
                    const unitThickness = g.layout.size * 0.12;
                    const h = Math.abs(ef.targetHex.visualHeight) * unitThickness;
                    target = { x: targetPos.x, y: targetPos.y - h };
                }

                if (target) {
                    const isReFlight = !!ef.targetHex;
                    const startHomingLife = isReFlight ? 0.88 : 0.8;
                    const strength = Math.max(0, (startHomingLife - ef.life) * (isReFlight ? 20.0 : 3.0));
                    const dx = target.x - ef.x;
                    const dy = target.y - ef.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 25) {
                        if (ef.targetDotKey) {
                            const [pId, type, idx] = ef.targetDotKey.split('-');
                            const intIdx = parseInt(idx);
                            const threshold = (type === 'self' ? 3 : 1);
                            if (intIdx === threshold && ef.reward && ef.reward.status === 'pending') {
                                g.triggerRewardFlow(ef.reward, target);
                            } else {
                                g.triggerChainAnim(parseInt(pId), type);
                            }
                        } else if (ef.targetHex && ef.reward) {
                            ef.reward.arrivedCount = (ef.reward.arrivedCount || 0) + 1;
                            if (ef.reward.arrivedCount === 5) {
                                g.applyRewardEffect(ef.reward);
                            }
                        }
                        keep = false;
                    } else {
                        if (dist > 2) {
                            ef.vx += (dx / dist) * strength;
                            ef.vy += (dy / dist) * strength;
                        }
                        const damping = (isReFlight && ef.life < startHomingLife) ? 0.88 : 0.94;
                        ef.vx *= damping;
                        ef.vy *= damping;
                    }
                } else {
                    ef.vy += 0.15;
                }

                if (keep) {
                    ef.x += ef.vx;
                    ef.y += ef.vy;
                    ef.life -= (ef.targetHex ? 0.005 : 0.012);
                    if (ef.life > 0) survivors.push(ef);
                }
            }
        }
        const newlyAdded = g.effects.slice(originalCount);
        g.effects = survivors.concat(newlyAdded);
    }

    addParticles(x, y, color, isBig = false, targetDotKey = null, targetHex = null, reward = null) {
        const g = this.game;
        if (isBig) {
            g.sound.playBurst();
            g.flashAlpha = 0.5;
        }
        const count = isBig ? (targetHex ? 40 : 20) : 10;
        const speed = isBig ? (targetHex ? 18 : 15) : 10;
        const isReFlight = !!targetHex;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.5 + Math.random() * 0.5) * speed;
            g.effects.push({
                x: x, y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - (isReFlight ? 0 : (isBig ? 6 : 4)),
                life: 1.0,
                size: (2 + Math.random() * 3) * (isBig ? 1.5 : 1),
                color: color,
                targetDotKey: targetDotKey,
                targetHex: targetHex,
                reward: reward
            });
        }
    }

    triggerChainAnim(player, type) {
        this.game.chainAnims[player][type] = 1.0;
    }

    updateCoinToss(dt) {
        const g = this.game;
        if (!g.coinToss.active) return;
        g.coinToss.timer += dt;

        // 音響効果の再生
        g.sound.playResonanceSync(g.coinToss.phase, g.coinToss.timer);

        if (g.coinToss.phase === 'gathering') {
            // 中心へ向かって粒子が収束
            g.coinToss.particles.forEach(p => {
                if (!p.active) return;
                const dist = Math.sqrt(p.x * p.x + p.y * p.y);
                if (dist > 5) {
                    const speed = p.speed * 2.5;
                    p.x -= (p.x / dist) * speed * dt;
                    p.y -= (p.y / dist) * speed * dt;
                } else {
                    p.active = false;
                    g.coinToss.arrivedParticlesCount++;
                }
            });

            // 到達数に基づくボールの成長 (ベースサイズ 0 -> 80)
            const targetBaseSize = (g.coinToss.arrivedParticlesCount / g.coinToss.totalParticles) * 80;
            g.coinToss.ballSize = Math.min(80, Math.max(g.coinToss.ballSize, targetBaseSize));

            // 遷移条件：9割以上が到達したか、一定時間(1.2s)が経過したら即座に次へ
            if (g.coinToss.arrivedParticlesCount >= g.coinToss.totalParticles * 0.9 || g.coinToss.timer > 1200) {
                g.coinToss.phase = 'fusion';
                g.coinToss.timer = 0;
            }
        } else if (g.coinToss.phase === 'fusion') {
            // 短い「溜め」フェーズ
            const t = g.coinToss.timer / 200;
            g.coinToss.ballSize = 80 + t * 40;
            g.coinToss.pulse = 1.0 + Math.sin(g.coinToss.timer * 0.05) * 0.4;

            if (g.coinToss.timer > 200) {
                g.coinToss.phase = 'burst';
                g.coinToss.timer = 0;
                g.sound.playBurst();

                // 爆発粒子の生成
                g.coinToss.particles = [];
                const speed = 18;
                for (let i = 0; i < 50; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = (0.5 + Math.random() * 0.5) * speed;
                    g.coinToss.particles.push({
                        x: 0, y: 0,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd - 6,
                        player: g.coinToss.result,
                        life: 1.0,
                        active: true,
                        size: (2 + Math.random() * 3) * 1.5
                    });
                }
            }
        } else if (g.coinToss.phase === 'burst') {
            const targetZone = `hand-p${g.coinToss.result}`;
            const center = g.map.centers[targetZone];
            const targetPos = g.layout.hexToPixel(center);

            const marginX = g.layout.size * 2.5;
            const align = (g.coinToss.result === 1 ? 'left' : 'right');
            const textX = targetPos.x + (align === 'left' ? marginX : -marginX);
            const textY = targetPos.y;

            const displayWidth = g.canvas.clientWidth;
            const displayHeight = g.canvas.clientHeight;
            const relTargetX = textX - displayWidth / 2;
            const relTargetY = textY - displayHeight / 2;

            const speedFactor = dt / 16.6;
            let allArrived = true;

            g.coinToss.particles.forEach(p => {
                if (p.life <= 0) return;

                const startHomingLife = 0.8;
                const strength = Math.max(0, (startHomingLife - p.life) * 3.0);
                const dx = relTargetX - p.x;
                const dy = relTargetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 25) {
                    p.life = 0;
                } else {
                    if (p.life < startHomingLife) {
                        p.vx += (dx / dist) * strength * speedFactor;
                        p.vy += (dy / dist) * strength * speedFactor;
                        p.vx *= Math.pow(0.94, speedFactor);
                        p.vy *= Math.pow(0.94, speedFactor);
                    } else {
                        p.vy += 0.15 * speedFactor;
                        p.vx *= Math.pow(0.94, speedFactor);
                        p.vy *= Math.pow(0.94, speedFactor);
                    }

                    p.x += p.vx * speedFactor;
                    p.y += p.vy * speedFactor;
                    p.life -= 0.012 * speedFactor;
                    allArrived = false;
                }
            });

            if (allArrived || g.coinToss.timer > 3000) {
                g.coinToss.phase = 'stabilized';
                g.coinToss.timer = 0;
                g.coinToss.showArrow = true;
                g.sound.playTurnChange();
            }
        } else if (g.coinToss.phase === 'stabilized') {
            g.coinToss.ripple = Math.min(1, g.coinToss.timer / 600);
            if (g.coinToss.timer > 1000) {
                g.coinToss.active = false;
                g.currentPlayer = g.coinToss.result;
                g.closeOverlay();
                if (g.gameMode === 'pvc' && g.currentPlayer === 2) {
                    g.handleCPUTurn();
                }
            }
        }
    }

    triggerReconstructEffect(giver, receiver, updates, pattern) {
        const g = this.game;
        let startHex = giver;
        let endHex = receiver;

        if (g.currentPlayer === 2) {
            startHex = receiver;
            endHex = giver;
        }

        const start = g.layout.hexToPixel(startHex);
        const end = g.layout.hexToPixel(endHex);

        const unitThickness = g.layout.size * 0.12;
        const startH = Math.abs(startHex.height) * unitThickness;
        const endH = Math.abs(endHex.height) * unitThickness;

        start.y -= startH;
        end.y -= endH;

        const isFocus = (pattern === 'focus');

        const magenta = { r: 217, g: 70, b: 239 };
        const yellow = { r: 251, g: 191, b: 36 };

        g.effects.push({
            x: start.x, y: start.y,
            vx: 0, vy: 0,
            life: 1.0,
            color: isFocus ? '#d946ef' : '#fbbf24',
            startRGB: isFocus ? magenta : yellow,
            endRGB: isFocus ? yellow : magenta,
            size: isFocus ? 14 : 2,
            startSize: isFocus ? 14 : 2,
            endSize: isFocus ? 2 : 14,
            type: 'reconstruct_dot',
            startX: start.x, startY: start.y,
            endX: end.x, endY: end.y,
            startTime: Date.now(),
            duration: 500,
            giver: giver, receiver: receiver,
            updates: updates
        });
    }
}
