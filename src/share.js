import { Layout } from './map.js';
import { Constants } from './constants.js';
import { getLocalizedUiText } from './i18nManager.js';

/**
 * ゲーム結果のシェア用画像を生成する (動的高さ対応 Ver 6.6.12)
 */
export async function generateShareImage(game) {
    const texts = getLocalizedUiText();
    const achievements = game.lastAchievements || [];
    const hasAchievements = achievements.length > 0;
    
    const cardW = 300;
    const cardH = 75;
    const gap = 12;
    const achRows = Math.ceil(achievements.length / 2);
    
    const headerHeight = 250;
    const boardAreaHeight = 400;
    const achAreaHeight = hasAchievements ? (achRows * (cardH + gap) + 60) : 0;
    const footerHeight = 60;
    
    const contentHeight = Math.max(boardAreaHeight, achAreaHeight);
    const totalHeight = Math.max(630, headerHeight + contentHeight + footerHeight);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = totalHeight;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
        const logo = new Image();
        logo.src = 'burst_cascade/logo.svg';
        await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 2000);
            logo.onload = () => { clearTimeout(timeout); resolve(); };
            logo.onerror = () => { clearTimeout(timeout); resolve(); };
        });
        const logoH = 50;
        const logoW = (logo.width / logo.height) * logoH;
        ctx.drawImage(logo, 600 - logoW / 2, 40, logoW, logoH);
    } catch (e) {}

    const message = game.lastVictoryMessage || { title: 'GAME OVER', subtitle: '' };
    ctx.textAlign = 'center';
    ctx.font = 'bold 100px Outfit, sans-serif';
    
    const titleGrad = ctx.createLinearGradient(0, 120, 0, 180);
    if (game.winner === 0) {
        titleGrad.addColorStop(0, '#fff'); titleGrad.addColorStop(1, '#94a3b8');
    } else if (game.winner === 1) {
        titleGrad.addColorStop(0, '#fff'); titleGrad.addColorStop(1, '#4ade80');
    } else {
        titleGrad.addColorStop(0, '#fff'); titleGrad.addColorStop(1, '#f87171');
    }
    
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 25;
    ctx.fillStyle = titleGrad;
    ctx.fillText(message.title.toUpperCase(), 600, 180);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

    ctx.font = '500 26px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    const subtitleText = message.subtitle.replace(/<[^>]*>/g, '');
    ctx.fillText(subtitleText, 600, 235);

    const boardSize = 380;
    const boardX = hasAchievements ? 80 : 600 - boardSize / 2;
    const startY = 280;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.roundRect(boardX - 15, startY - 15, boardSize + 30, boardSize + 30, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.stroke();

    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 800; boardCanvas.height = 800;
    const tempLayout = new Layout(1, { x: 0, y: 0 });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    game.map.hexes.filter(h => h.zone === 'main').forEach(hex => {
        const h = Math.abs(hex.height) * 0.12; const vertices = tempLayout.getPolygonVertices(hex);
        vertices.forEach(v => { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); minY = Math.min(minY, v.y - h); });
    });
    const scale = Math.min(760 / (maxX - minX), 760 / (maxY - minY));
    const resultLayout = new Layout(scale, { x: 400 - (minX + maxX) / 2 * scale, y: 400 - (minY + maxY) / 2 * scale });
    game.renderer.renderToCanvas(boardCanvas, game.map, resultLayout);
    ctx.drawImage(boardCanvas, boardX, startY, boardSize, boardSize);

    if (hasAchievements) {
        const achX = 520;
        const achAreaW = 600;
        ctx.fillStyle = 'rgba(30, 58, 138, 0.1)';
        ctx.beginPath(); ctx.roundRect(achX - 20, startY - 20, achAreaW, achAreaHeight, 15); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = '900 24px Inter, sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.letterSpacing = '0.15rem';
        ctx.fillText(texts.achievements, achX, startY + 15);
        ctx.letterSpacing = '0px';

        const mapSizeText = game.lastMapSize || 'REGULAR';
        const aiLevelText = game.lastAILevel || 'NORMAL';
        const drawBadge = (text, x) => {
            ctx.font = '700 14px Inter, sans-serif';
            const tw = ctx.measureText(text).width;
            const bw = tw + 40; const bh = 32;
            const bx = x - bw; const by = startY - 12;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(56, 189, 248, 0.5)'; ctx.shadowBlur = 10;
            ctx.fillText(text, bx + bw / 2, by + 21);
            ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.textAlign = 'left';
            return bw;
        };
        const b2W = (game.gameMode === 'pvc') ? drawBadge(aiLevelText, achX + achAreaW - 40) : 0;
        drawBadge(mapSizeText, achX + achAreaW - 40 - (b2W ? b2W + 4 : 0));

        achievements.forEach((ach, i) => {
            const col = i % 2; const row = Math.floor(i / 2);
            const x = achX + col * (cardW + gap); const y = startY + 50 + row * (cardH + gap);
            const achGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
            achGrad.addColorStop(0, '#ebed58'); achGrad.addColorStop(1, '#8a691e');
            ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 6);
            ctx.fillStyle = achGrad; ctx.fill();
            ctx.fillStyle = '#1c0d0d'; ctx.font = '800 15px Inter, sans-serif';
            ctx.fillText(ach.title, x + 15, y + 32);
            ctx.fillStyle = 'rgba(28, 13, 13, 0.8)'; ctx.font = '600 10px Inter, sans-serif';
            const desc = ach.description.length > 30 ? ach.description.slice(0, 30) + '...' : ach.description;
            ctx.fillText(desc, x + 15, y + 52);
            if (ach.isNew) {
                const badgeText = texts.newBadge;
                ctx.font = '900 8px Inter, sans-serif';
                const btw = ctx.measureText(badgeText).width;
                const bw = btw + 8; const bh = 14;
                const bx = x + cardW - bw - 10; const by = y + 10;
                ctx.fillStyle = '#1c0d0d';
                ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2); ctx.fill();
                ctx.fillStyle = '#ebed58';
                ctx.textAlign = 'center';
                ctx.fillText(badgeText, bx + bw / 2, by + 10);
                ctx.textAlign = 'left';
            }
        });
    }

    const { HOLDER, YEAR, PORTAL } = Constants.COPYRIGHT;
    ctx.textAlign = 'center'; ctx.font = '14px Inter, sans-serif'; ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText(`© ${HOLDER} ${YEAR} | ${PORTAL}`, 600, totalHeight - 25);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * 結果を共有する (レイアウト調整 Ver 6.6.15)
 */
export async function shareResult(game) {
    const gameUrl = 'https://t-i-oak.github.io/BurstCascade/';
    // ハッシュタグとURLの間に改行を入れるため、一つのテキストとして構成
    const shareText = `【BURST CASCADE】\n${gameUrl}\n#BurstCascade #GameWorksOAK`;

    const isDesktop = /Windows|Macintosh|Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent);
    const isMobile = !isDesktop;
    
    const canShareFiles = navigator.canShare && navigator.canShare({ 
        files: [new File([], 'test.png', { type: 'image/png' })] 
    });

    if (isDesktop || !canShareFiles) {
        try {
            const blob = await generateShareImage(game);
            if (navigator.clipboard && navigator.clipboard.write) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
            }

            const overlay = document.getElementById('share-confirm-overlay');
            const xBtn = document.getElementById('share-confirm-x-btn');
            const closeBtn = document.getElementById('share-confirm-close-btn');

            if (overlay && xBtn && closeBtn) {
                overlay.classList.remove('hidden');
                const newXBtn = xBtn.cloneNode(true);
                const newCloseBtn = closeBtn.cloneNode(true);
                xBtn.parentNode.replaceChild(newXBtn, xBtn);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

                newXBtn.addEventListener('click', () => {
                    // 全てをtextパラメータに含めることで改行を維持
                    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                    window.open(intentUrl, '_blank');
                    overlay.classList.add('hidden');
                });

                newCloseBtn.addEventListener('click', () => {
                    overlay.classList.add('hidden');
                });
            } else {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
            }
        } catch (e) {
            console.error('PC share flow failed:', e);
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
        }
        return;
    }

    try {
        const blob = await generateShareImage(game);
        const file = new File([blob], 'result.png', { type: 'image/png' });
        await navigator.share({
            files: [file],
            title: 'BURST CASCADE Result',
            text: shareText
        });
    } catch (e) {
        console.error('Mobile share failed:', e);
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    }
}
