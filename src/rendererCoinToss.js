import { Constants } from './constants.js';

export function drawCoinToss(renderer) {
    const game = renderer.game;
    const ctx = renderer.ctx;
    const dpr = window.devicePixelRatio || 1;
    const centerX = (renderer.canvas.width / dpr) / 2;
    const centerY = (renderer.canvas.height / dpr) / 2;
    const ct = game.coinToss;

    ctx.save();

    ct.particles.forEach(p => {
        if (p.life <= 0) return;
        const color = Constants.PARTICLE_COLORS[p.player];
        ctx.fillStyle = color;
        ctx.globalAlpha = p.active === false ? 0 : (p.life || 0.8);
        ctx.beginPath();
        ctx.arc(centerX + p.x, centerY + p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    if (ct.phase === 'gathering' || ct.phase === 'fusion' || (ct.phase === 'burst' && ct.timer < 150)) {
        const size = ct.ballSize * (ct.pulse || 1);
        if (size > 2) {
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.2, '#fef3c7');
            gradient.addColorStop(0.5, '#fbbf24');
            gradient.addColorStop(1, 'transparent');

            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.4 * (ct.pulse || 1);
            ctx.beginPath();
            ctx.arc(centerX, centerY, size * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    if (ct.phase === 'burst' && ct.timer < 250) {
        const flashAlpha = 1.0 - (ct.timer / 250);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.6})`;
        ctx.fillRect(0, 0, renderer.canvas.width / dpr, renderer.canvas.height / dpr);
    }

    ctx.restore();
}
