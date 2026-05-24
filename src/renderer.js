import { Constants } from './constants.js';
import { Utils } from './utils.js';
import { drawCoinToss } from './rendererCoinToss.js';
import { drawLabel } from './rendererLabels.js';

export class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
    }

    render() {
        const game = this.game;
        if (!game.map || !game.layout) return;

        // Ver 5.2.4: 描画状態のリセットと DPR スケーリングの再適用
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 変形行列をリセットして dpr スケーリングを強制

        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.globalAlpha = 1.0;

        this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

        const sortedHexes = [...game.map.hexes].sort((a, b) => {
            const zA = a.q + a.r;
            const zB = b.q + b.r;
            if (zA !== zB) return zA - zB;
            return a.r - b.r;
        });
        sortedHexes.forEach(hex => this.drawHex(hex));

        // エフェクトの描画
        game.effects.forEach(ef => {
            this.ctx.save();
            this.ctx.globalAlpha = ef.life;
            this.ctx.fillStyle = ef.color;
            this.ctx.beginPath();
            this.ctx.arc(ef.x, ef.y, ef.size || 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // テキストエフェクトの描画
        game.effects.filter(ef => ef.type === 'floating_text').forEach(ef => {
            this.ctx.save();
            this.ctx.globalAlpha = ef.life;
            this.ctx.fillStyle = ef.color;
            this.ctx.font = 'bold 32px sans-serif';
            this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
            this.ctx.shadowBlur = 4;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ef.text, ef.x, ef.y);
            this.ctx.restore();
        });

        // 落下中の土地・マーカーの描画
        game.dropEffects.forEach(de => {
            if (de.landed || de.state === 'appearing' || de.state === 'hovering' || de.state === 'falling') {
                this.drawFallingHex(de);
            }
        });

        // 戦況 (フラッグ数) を更新
        this._updateUIBars();

        drawLabel(this, 'Player 1', 'hand-p1', Constants.PARTICLE_COLORS[1], 'left');
        drawLabel(this, 'Player 2', 'hand-p2', Constants.PARTICLE_COLORS[2], 'right');

        // 収束演出（フォーカス・エフェクト）の描画
        game.focusEffects.forEach(fe => {
            const hex = fe.targetHex;
            const unitThickness = game.layout.size * 0.12;
            const h = Math.abs(hex.visualHeight) * unitThickness;

            const verts = game.layout.getPolygonVertices(hex, fe.scale);
            this.ctx.save();
            this.ctx.globalAlpha = fe.life;
            this.ctx.strokeStyle = fe.color;
            this.ctx.lineWidth = 4 * fe.life;
            this.ctx.shadowColor = fe.color;
            this.ctx.shadowBlur = 15 * fe.life;

            this.ctx.beginPath();
            this.ctx.moveTo(verts[0].x, verts[0].y - h);
            for (let i = 1; i < 6; i++) {
                this.ctx.lineTo(verts[i].x, verts[i].y - h);
            }
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.restore();
        });

        // ラストムーブ・ハイライト (最前面に描画)
        if (game.lastMoveHex) {
            const hex = game.lastMoveHex;
            const center = game.layout.hexToPixel(hex);
            const unitThickness = game.layout.size * 0.12;
            const h = Math.abs(hex.visualHeight) * unitThickness;
            const tx = center.x, ty = center.y - h;

            this.ctx.save();
            this.ctx.translate(tx, ty);
            const ringVertices = game.layout.getPolygonVertices(hex, 1.2);
            this.ctx.beginPath();
            this.ctx.moveTo(ringVertices[0].x - center.x, ringVertices[0].y - center.y);
            for (let i = 1; i < 6; i++) {
                this.ctx.lineTo(ringVertices[i].x - center.x, ringVertices[i].y - center.y);
            }
            this.ctx.closePath();

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 2 + Math.sin(game.pulseValue * Math.PI) * 1.5;
            this.ctx.shadowColor = 'white';
            this.ctx.shadowBlur = 10;
            this.ctx.stroke();
            this.ctx.restore();
        }

        // --- コイントス演出の描画 (Ver 5.2.0) ---
        if (game.coinToss.active) {
            drawCoinToss(this);
        }
    }

    _updateUIBars() {
        const game = this.game;
        const mainHexes = game.map.hexes.filter(h => h.zone === 'main');
        const flags1 = mainHexes.filter(h => h.hasFlag && h.flagOwner === 1).length;
        const flags2 = mainHexes.filter(h => h.hasFlag && h.flagOwner === 2).length;

        const p1Bar = document.getElementById('p1-bar');
        const p2Bar = document.getElementById('p2-bar');
        const p1Score = document.getElementById('p1-score');
        const p2Score = document.getElementById('p2-score');

        if (p1Bar && p2Bar && p1Score && p2Score) {
            const total = flags1 + flags2;
            const p1Ratio = total > 0 ? (flags1 / total) * 100 : 50;
            const p2Ratio = total > 0 ? (flags2 / total) * 100 : 50;
            p1Bar.style.width = `${p1Ratio}%`;
            p2Bar.style.width = `${p2Ratio}%`;
            p1Score.innerText = flags1;
            p2Score.innerText = flags2;

            p1Bar.classList.toggle('active', game.currentPlayer === 1 && !game.gameOver);
            p2Bar.classList.toggle('active', game.currentPlayer === 2 && !game.gameOver);
        }
    }

    drawHex(hex, overrideCtx = null, overrideLayout = null) {
        const game = this.game;
        const ctx = overrideCtx || this.ctx;
        const layout = overrideLayout || game.layout;

        if (hex.isHidden) return;

        ctx.save(); // Ver 5.2.3: save/restore を追加 (テスト要件 & 安全性)
        const vertices = layout.getPolygonVertices(hex);

        if (hex.isDisabled) {
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
            ctx.closePath();
            ctx.fillStyle = '#111827';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            return;
        }

        const unitThickness = layout.size * 0.12;
        const visualAbsH = Math.abs(hex.visualHeight);
        const h = visualAbsH * unitThickness;
        const logicalAbsH = Math.abs(hex.height);

        let owner = 0;
        if (hex.height > 0) owner = 1;
        else if (hex.height < 0) owner = 2;
        else if (hex.owner !== 0) owner = hex.owner;

        const color = { ...Constants.COLORS[owner] };

        if (game.hoveredHex === hex) {
            color.top = Utils.adjustColor(color.top, 50);
        } else if (game.hoveredNeighbors.includes(hex)) {
            color.top = Utils.adjustColor(color.top, 25);
        }

        this.drawHexBase(hex, vertices, h, color, ctx);

        // 数値表示
        if (logicalAbsH > 0) {
            const center = layout.hexToPixel(hex);
            this.drawHexNumber(center.x, center.y - h, h, color, hex.height, ctx, layout);
        }

        // 共鳴中枢（コア）の描画
        if (hex.visualFlagScale > 0.01) {
            this.drawCore(hex, h, ctx, layout);
        }

        ctx.restore();
    }

    drawHexBase(hex, vertices, h, color, overrideCtx = null) {
        const ctx = overrideCtx || this.ctx;
        // 側面
        if (h > 0) {
            const ccwIndices = [0, 5, 4, 3, 2, 1];
            for (let j = 0; j < 6; j++) {
                const idxA = ccwIndices[j], idxB = ccwIndices[(j + 1) % 6];
                const vA = vertices[idxA], vB = vertices[idxB];
                if (vB.x > vA.x) {
                    ctx.beginPath();
                    ctx.moveTo(vA.x, vA.y);
                    ctx.lineTo(vB.x, vB.y);
                    ctx.lineTo(vB.x, vB.y - h);
                    ctx.lineTo(vA.x, vA.y - h);
                    ctx.closePath();
                    const grad = ctx.createLinearGradient(vA.x, vA.y - h, vA.x, vA.y);
                    grad.addColorStop(0, color.side);
                    grad.addColorStop(1, Utils.adjustColor(color.side, -20));
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.strokeStyle = color.border;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        // 上面
        const topVertices = vertices.map(v => ({ x: v.x, y: v.y - h }));
        ctx.beginPath();
        ctx.moveTo(topVertices[0].x, topVertices[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(topVertices[i].x, topVertices[i].y);
        ctx.closePath();
        ctx.fillStyle = color.top;
        ctx.fill();
        ctx.strokeStyle = color.highlight;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // ハイライト線
        ctx.beginPath();
        const edgeIndices = [0, 5, 4, 3, 2, 1];
        for (let j = 0; j < 6; j++) {
            const idxA = edgeIndices[j], idxB = edgeIndices[(j + 1) % 6];
            const vA = topVertices[idxA], vB = topVertices[idxB];
            if (vB.x > vA.x) {
                ctx.moveTo(vA.x, vA.y);
                ctx.lineTo(vB.x, vB.y);
            }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = color.border;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawHexNumber(tx, ty, h, color, value, overrideCtx = null, overrideLayout = null) {
        const ctx = overrideCtx || this.ctx;
        const layout = overrideLayout || this.game.layout;

        const dpr = this._getContextDpr(ctx);

        ctx.save();
        const { angle, tilt, scaleY } = layout.projection;
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const a = cosA, b = (sinA - cosA * tilt) * scaleY, c = -sinA, d = (cosA + sinA * tilt) * scaleY;

        // setTransform は行列を上書きするため、dpr を反映させる必要がある
        ctx.setTransform(a * dpr, b * dpr, c * dpr, d * dpr, tx * dpr, ty * dpr);
        const fontSize = layout.size * 1.5;
        ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const shadowColor = 'rgba(0,0,0,0.6)';
        const highlightColor = 'rgba(255,255,255,0.8)';
        const textColor = Utils.adjustColor(color.top, -100);

        const roundedH = Math.abs(Math.round(value));

        ctx.fillStyle = highlightColor;
        ctx.fillText(roundedH, 1, 1);
        ctx.fillStyle = shadowColor;
        ctx.fillText(roundedH, -1.5, -1.5);
        ctx.fillStyle = textColor;
        ctx.fillText(roundedH, 0, 0);

        ctx.restore();
    }

    drawCore(hex, h, overrideCtx = null, overrideLayout = null) {
        const game = this.game;
        const ctx = overrideCtx || this.ctx;
        const layout = overrideLayout || game.layout;
        const center = layout.hexToPixel(hex);
        const tx = center.x, ty = center.y - h;
        const coreSize = layout.size * 0.4 * hex.visualFlagScale;
        const playerColor = hex.flagOwner === 1 ? '#4ade80' : '#f87171';

        const floatY = Math.sin(game.pulseValue * Math.PI) * 4 * hex.visualFlagScale;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.beginPath();
        ctx.ellipse(0, 0, coreSize * 1.2, coreSize * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = playerColor;
        ctx.lineWidth = 2 * (0.5 + game.pulseValue * 0.5) * hex.visualFlagScale;
        ctx.globalAlpha = (0.3 + game.pulseValue * 0.4) * hex.visualFlagScale;
        ctx.stroke();

        ctx.translate(0, -coreSize * 2.2 + floatY);
        ctx.globalAlpha = 1.0 * hex.visualFlagScale;
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = (10 + game.pulseValue * 15) * hex.visualFlagScale;

        const drawCrystalFace = (points, fillColor, strokeColor) => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        const halfW = coreSize * 0.8, halfH = coreSize * 1.3;
        drawCrystalFace([{ x: 0, y: -halfH }, { x: -halfW, y: 0 }, { x: 0, y: halfW * 0.5 }], Utils.adjustColor(playerColor, -20), playerColor);
        drawCrystalFace([{ x: 0, y: -halfH }, { x: halfW, y: 0 }, { x: 0, y: halfW * 0.5 }], Utils.adjustColor(playerColor, 20), playerColor);
        drawCrystalFace([{ x: -halfW, y: 0 }, { x: 0, y: halfH }, { x: 0, y: halfW * 0.5 }], Utils.adjustColor(playerColor, -40), playerColor);
        drawCrystalFace([{ x: halfW, y: 0 }, { x: 0, y: halfH }, { x: 0, y: halfW * 0.5 }], Utils.adjustColor(playerColor, 0), playerColor);

        ctx.beginPath();
        ctx.moveTo(-halfW, 0);
        ctx.lineTo(halfW, 0);
        ctx.strokeStyle = 'white';
        ctx.globalAlpha = 0.5 * hex.visualFlagScale;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    drawFallingHex(de, overrideCtx = null, overrideLayout = null) {
        const game = this.game;
        const ctx = overrideCtx || this.ctx;
        const layout = overrideLayout || game.layout;
        const unitThickness = layout.size * 0.12;

        ctx.save();
        ctx.translate(de.x, de.y);
        ctx.globalAlpha = de.alpha;

        if (de.type === 'marker') {
            const hex = de.targetHex;
            const ringVertices = layout.getPolygonVertices(hex, 1.2);
            ctx.beginPath();
            const origin = layout.hexToPixel(hex);
            ctx.moveTo(ringVertices[0].x - origin.x, ringVertices[0].y - origin.y);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(ringVertices[i].x - origin.x, ringVertices[i].y - origin.y);
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
            ctx.stroke();
        } else {
            const absH = Math.abs(de.sourceHeight || 1);
            const h = absH * unitThickness;
            const color = Constants.COLORS[de.owner] || Constants.COLORS[0];

            const hex = de.targetHex;
            const baseVertices = layout.getPolygonVertices(hex);
            const origin = layout.hexToPixel(hex);
            const vertices = baseVertices.map(v => ({
                x: v.x - origin.x,
                y: v.y - origin.y
            }));

            this.drawHexBase(hex, vertices, h, color, ctx);

            if (absH > 0) {
                this.drawHexNumber(de.x, de.y - h, h, color, de.sourceHeight, ctx, layout);
            }
        }
        ctx.restore();
    }

    _getContextDpr(ctx) {
        if (typeof ctx.__burstCascadeDpr === 'number') {
            return ctx.__burstCascadeDpr;
        }
        return ctx.canvas === this.game.canvas ? (window.devicePixelRatio || 1) : 1;
    }

    renderToCanvas(targetCanvas, map, layout, renderDpr = 1) {
        const ctx = targetCanvas.getContext('2d');
        ctx.__burstCascadeDpr = renderDpr;
        ctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
        ctx.clearRect(0, 0, targetCanvas.width / renderDpr, targetCanvas.height / renderDpr);

        const sortedHexes = [...map.hexes]
            .filter(hex => hex.zone === 'main') // メインマップのみを描画 (Ver 6.0.1)
            .sort((a, b) => {
                const zA = a.q + a.r;
                const zB = b.q + b.r;
                if (zA !== zB) return zA - zB;
                return a.r - b.r;
            });

        sortedHexes.forEach(hex => {
            // 静的表示用にホバー効果などを無効化して描画
            this.drawHex(hex, ctx, layout);
        });
    }
}
