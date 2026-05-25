import { Layout } from '../map.js';
import { getLocalizedUiText } from '../i18nManager.js';

export class GameResultUI {
    constructor(game, uiManager) {
        this.game = game;
        this.uiManager = uiManager;
    }

    getVictoryType(winner) {
        const g = this.game;
        if (winner === 0) return 'DRAW';
        // 自滅判定：勝者が手番プレイヤーでない場合（自分が操作して相手が勝った＝自滅）
        if (winner !== g.currentPlayer) {
            return 'SUICIDE';
        }

        // 支配状況の判定
        const mainHexes = g.map.mainHexes.filter(h => !h.isDisabled);
        const totalOwned = mainHexes.filter(h => h.owner !== 0).length;
        const winnerOwned = mainHexes.filter(h => h.owner === winner).length;
        const loserOwned = mainHexes.filter(h => h.owner !== 0 && h.owner !== winner).length;

        if (loserOwned === 0) return 'ANNIHILATION'; // 全滅
        if (totalOwned > 0 && (winnerOwned / totalOwned) >= 0.7) return 'DOMINANCE'; // 圧倒(70%以上)
        // Ver 4.2.1: 接戦条件を緩和(50%未満、つまり土地数で負けているがコアを取って勝った場合)
        if (totalOwned > 0 && (winnerOwned / totalOwned) < 0.5) return 'CLOSE';

        return 'NORMAL';
    }

    getVictoryMessage(type, winner) {
        const texts = getLocalizedUiText();
        const p1Name = texts.result.player1Name;
        const p2Name = texts.result.player2Name;
        const winnerName = winner === 1 ? p1Name : p2Name;
        const loserName = winner === 1 ? p2Name : p1Name;

        const messages = texts.result.messages;

        const candidates = messages[type] || messages['NORMAL'];
        const rawMessage = candidates[Math.floor(Math.random() * candidates.length)];

        return {
            title: winner === 0 ? texts.result.drawTitle : texts.result.victoryTitle.replace('{N}', winner),
            subtitle: rawMessage.replace(/\{W\}/g, winnerName).replace(/\{L\}/g, loserName)
        };
    }

    showGameOver(winner) {
        const g = this.game;
        g.winner = winner; // Ver 4.7.1: 実績判定用に勝者を記録
        g.updateHistoryStats(); // ゲーム終了直前の状態を統計に反映
        g.gameOver = true;
        g.overlay.classList.remove('hidden');
        g.gameOverContent.classList.remove('hidden');
        g.modeSelection.classList.add('hidden');
        g.helpContent.classList.add('hidden');

        const winnerText = document.getElementById('winner-text');
        const victoryMsg = document.getElementById('victory-message');

        const victoryType = this.getVictoryType(winner);
        const message = this.getVictoryMessage(victoryType, winner);
        g.lastVictoryMessage = message; // シェア用に保存 (Ver 6.6.6)

        winnerText.textContent = message.title;
        if (victoryMsg) victoryMsg.innerHTML = message.subtitle;

        // 勝利タイトルのスタイルをシェア画像と統一 (Ver 6.6.7)
        if (winner === 0) {
            winnerText.style.background = 'linear-gradient(180deg, #fff, #94a3b8)';
        } else if (winner === 1) {
            winnerText.style.background = 'linear-gradient(180deg, #fff, #4ade80)';
        } else {
            winnerText.style.background = 'linear-gradient(180deg, #fff, #f87171)';
        }
        winnerText.style.webkitBackgroundClip = 'text';
        winnerText.style.webkitTextFillColor = 'transparent';
        winnerText.style.backgroundClip = 'text';
        winnerText.style.textFillColor = 'transparent';
        winnerText.style.fontWeight = '900';
        winnerText.style.textShadow = '0 0 20px rgba(0,0,0,0.5)';

        // --- 設定ラベルの反映 (Ver 6.6.1: 表記の完全統一) ---
        const mapSizeLabel = document.getElementById('res-map-size');
        const aiLevelLabel = document.getElementById('res-ai-level');
        if (mapSizeLabel) {
            const text = (g.map.mapType || 'REGULAR').toUpperCase();
            mapSizeLabel.innerText = text;
            g.lastMapSize = text; // シェア用に保存
        }
        if (aiLevelLabel) {
            if (g.gameMode === 'pvc') {
                const text = (g.ai.difficulty || 'NORMAL').toUpperCase();
                aiLevelLabel.innerText = text;
                g.lastAILevel = text; // シェア用に保存
                aiLevelLabel.classList.remove('hidden');
            } else {
                aiLevelLabel.classList.add('hidden');
                g.lastAILevel = 'LOCAL PvP';
            }
        }

        // --- 最終盤面の描画 (Ver 6.0.1) ---
        const resultCanvas = document.getElementById('result-board-canvas');
        if (resultCanvas) {
            requestAnimationFrame(() => {
                const container = document.getElementById('final-board-container');
                const size = container.clientWidth || 400;
                const dpr = window.devicePixelRatio || 1;
                resultCanvas.width = size * dpr;
                resultCanvas.height = size * dpr;

                const canvasSize = size;
                    const padding = 30; // 余裕を持たせるためのパディング
                    const availableSize = canvasSize - padding * 2;
                    
                    // 1. 仮のレイアウト（サイズ1, 原点0）で全ヘックスのバウンディングボックスを計算
                    const tempLayout = new Layout(1, { x: 0, y: 0 });
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    
                    const mainHexes = g.map.hexes.filter(h => h.zone === 'main');
                    mainHexes.forEach(hex => {
                        // 高さによるY方向の突き出し量 (renderer.js の unitThickness ロジックに準拠)
                        const h = Math.abs(hex.height) * 0.12; 
                        const vertices = tempLayout.getPolygonVertices(hex);
                        vertices.forEach(v => {
                            // 底面
                            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
                            // 天面（高さによるY座標の減少）
                            minY = Math.min(minY, v.y - h);
                        });
                    });

                    const contentWidth = maxX - minX;
                    const contentHeight = maxY - minY;
                    
                    // 2. 最適なスケール（hexSize）を決定
                    const scale = Math.min(availableSize / contentWidth, availableSize / contentHeight);
                    const finalHexSize = scale;
                    
                    // 3. コンテンツの幾何学的な中心をキャンバスの中央に配置するための原点（origin）を算出
                    const contentCenterX = (minX + maxX) / 2 * scale;
                    const contentCenterY = (minY + maxY) / 2 * scale;
                    const origin = {
                        x: canvasSize / 2 - contentCenterX,
                        y: canvasSize / 2 - contentCenterY
                    };

                    const resultLayout = new Layout(finalHexSize, origin);
                    g.renderer.renderToCanvas(resultCanvas, g.map, resultLayout, dpr);
            });
        }

        this.updateResultAchievements();

        // BGM 制御
        if (g.gameMode === 'pvp') {
            g.sound.startBgm('victory');
        } else if (winner === 1) {
            g.sound.startBgm('victory');
        } else {
            g.sound.startBgm('defeat');
        }
    }

    updateResultAchievements() {
        const g = this.game;
        const resultBody = document.getElementById('result-body');
        const achContainer = document.getElementById('result-achievements');
        const achList = document.querySelector('#achievements-list .result-achievements-list-content')
            || document.getElementById('achievements-list');

        if (achList) achList.innerHTML = '';
        g.lastAchievements = [];

        if (g.gameMode !== 'pvc') {
            if (resultBody) resultBody.classList.add('result-body-no-achievements');
            if (achContainer) achContainer.classList.add('hidden');
            return;
        }

        if (resultBody) resultBody.classList.remove('result-body-no-achievements');
        const aiLevel = g.aiLevelSelect.querySelector('.selected').dataset.value;
        const mapType = g.sizeSelect.querySelector('.selected').dataset.value;
        const newUnlocks = g.achievementManager.checkAchievements(g, mapType, aiLevel);
        const sessionAchs = g.achievementManager.getSessionAchievements(g, mapType, aiLevel, newUnlocks);
        g.lastAchievements = sessionAchs;

        if (!achList || sessionAchs.length === 0) {
            if (achContainer) achContainer.classList.add('hidden');
            return;
        }

        if (achContainer) achContainer.classList.remove('hidden');
        sessionAchs.forEach(ach => {
            const item = document.createElement('div');
            item.className = 'achievement-item' + (ach.isNew ? ' new-unlock' : '');
            item.innerHTML = `
                <span class="ach-item-title">${ach.title}</span>
                <span class="ach-item-desc">${ach.description}</span>
                ${ach.isNew ? `<span class="new-badge">${getLocalizedUiText().newBadge}</span>` : ''}
            `;
            achList.appendChild(item);
        });
    }
}
