import { Constants } from './constants.js';
import { Utils } from './utils.js';

export function drawLabel(renderer, text, zoneId, color, align) {
    const game = renderer.game;
    const ctx = renderer.ctx;
    const center = game.map.centers[zoneId];
    if (!center) return;
    const pos = game.layout.hexToPixel({ q: center.q, r: center.r });

    ctx.save();
    const fontSize = Math.max(20, game.layout.size * 1.0);
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const playerNum = (zoneId === 'hand-p1' ? 1 : 2);
    const isActive = (game.currentPlayer === playerNum);

    const marginX = game.layout.size * 2.5;
    const textX = pos.x + (align === 'left' ? marginX : -marginX);

    const isTossing = game.coinToss.active;
    const isWinnerLabel = (isTossing && game.coinToss.phase === 'stabilized' && game.coinToss.result === playerNum);

    const showArrow = isTossing ? game.coinToss.showArrow : true;

    if (isActive && !isTossing && !game.gameOver) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15 + Math.sin(game.pulseValue * Math.PI) * 5;
    }

    if (isWinnerLabel) {
        const energyColorHex = '#fbbf24';
        const pColorHex = Constants.PARTICLE_COLORS[playerNum];

        const t = Math.min(1, game.coinToss.timer / 1000);
        let colorFactor = 0;
        if (t < 0.2) {
            colorFactor = t / 0.2;
        } else {
            colorFactor = Math.max(0, 1 - (t - 0.2) / 0.8);
        }

        const rgbP = Utils.hexToRgb(pColorHex);
        const rgbE = Utils.hexToRgb(energyColorHex);

        const r = Math.round(rgbP.r + (rgbE.r - rgbP.r) * colorFactor);
        const g = Math.round(rgbP.g + (rgbE.g - rgbP.g) * colorFactor);
        const b = Math.round(rgbP.b + (rgbE.b - rgbP.b) * colorFactor);

        const interpolatedColor = `rgb(${r},${g},${b})`;
        ctx.shadowColor = interpolatedColor;
        ctx.fillStyle = interpolatedColor;
        ctx.shadowBlur = 40 + colorFactor * 30;
        ctx.globalAlpha = 1.0;
    }

    ctx.fillText(text, textX, pos.y);

    if (isActive && showArrow) {
        drawActivePlayerMarker(renderer, playerNum, text, textX, pos.y, fontSize, align);
    }

    drawChainDots(renderer, playerNum, textX, pos.y, fontSize, align);

    ctx.restore();
}

function drawActivePlayerMarker(renderer, playerNum, text, textX, y, fontSize, align) {
    const ctx = renderer.ctx;
    const textWidth = ctx.measureText(text).width;
    const gap = fontSize * 0.45;
    const size = fontSize * 0.42;
    const x = align === 'left' ? textX + textWidth + gap : textX - textWidth - gap;
    const direction = playerNum === 1 ? -1 : 1;

    ctx.beginPath();
    ctx.moveTo(x + direction * size * 0.55, y);
    ctx.lineTo(x - direction * size * 0.45, y - size * 0.55);
    ctx.lineTo(x - direction * size * 0.45, y + size * 0.55);
    ctx.closePath();
    ctx.fill();
}

function drawChainDots(renderer, playerNum, textX, y, fontSize, align) {
    const game = renderer.game;
    const ctx = renderer.ctx;
    const playerChains = game.chains[playerNum];
    const dotY = y + (playerNum === 1 ? fontSize * 0.9 : -fontSize * 0.9);
    const dotRadius = 4;
    const dotSpacing = 14;
    const selfColor = playerNum === 1 ? '#4ade80' : '#f87171';
    const enemyColor = playerNum === 1 ? '#f87171' : '#4ade80';

    const drawDots = (count, color, offsetIdx, maxCount, animVal, type) => {
        const isFlowing = game.pendingRewards.some(r => r.player === playerNum && r.type === type && (r.status === 'flowing' || r.status === 'pending'));
        const filledCount = isFlowing ? maxCount : Math.min(count, maxCount);
        for (let i = 0; i < maxCount; i++) {
            ctx.beginPath();
            const dx = (i + offsetIdx) * dotSpacing;
            const x = textX + (align === 'left' ? dx : -dx);

            game.dotTargets[`${playerNum}-${type}-${i}`] = { x: x, y: dotY };

            const isLastDot = (i === filledCount - 1);
            const sCurve = Math.sin(animVal * Math.PI);
            const scale = isLastDot ? 1.0 + sCurve * 3.0 : 1.0;
            const brightness = isLastDot ? sCurve * 150 : 0;

            ctx.arc(x, dotY, dotRadius * scale, 0, Math.PI * 2);
            if (i < filledCount) {
                ctx.fillStyle = Utils.adjustColor(color, brightness);
                ctx.shadowColor = color;
                ctx.shadowBlur = 4 + sCurve * 40;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
        }
    };

    const playerAnims = game.chainAnims[playerNum];
    drawDots(playerChains.self, selfColor, 0, 4, playerAnims.self, 'self');
    drawDots(playerChains.enemy, enemyColor, 5.2, 2, playerAnims.enemy, 'enemy');
}
