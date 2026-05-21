export class AchievementUI {
    constructor(game, uiManager) {
        this.game = game;
        this.uiManager = uiManager;
    }

    showAchievements() {
        const g = this.game;
        g.overlay.classList.remove('hidden');
        g.achievementsContent.classList.remove('hidden');
        g.modeSelection.classList.add('hidden');
        g.helpContent.classList.add('hidden');
        g.gameOverContent.classList.add('hidden');

        this.updateAchievementsUI();
    }

    updateAchievementsUI() {
        const g = this.game;
        const grid = document.getElementById('achievements-grid');
        if (!grid) return;

        const miniData = g.achievementManager.getDisplayData('mini');
        const regularData = g.achievementManager.getDisplayData('regular');
        const baseList = g.achievementManager.getRevealedList('regular');

        g.isDevMode = localStorage.getItem('burst-cascade-dev-mode') === 'true';
        if (g.achievementResetBtn) {
            g.achievementResetBtn.style.display = g.isDevMode ? 'block' : 'none';
        }

        grid.innerHTML = '';
        let totalEarned = 0;
        let totalCount = 0;

        baseList.forEach((item, idx) => {
            const mini = miniData[idx];
            const regular = regularData[idx];
            
            const earnedCount = 
                (mini.earned.easy ? 1 : 0) + (mini.earned.normal ? 1 : 0) + (mini.earned.hard ? 1 : 0) +
                (regular.earned.easy ? 1 : 0) + (regular.earned.normal ? 1 : 0) + (regular.earned.hard ? 1 : 0);
            
            totalEarned += earnedCount;
            totalCount += 6;

            const isMastered = earnedCount === 6;
            const isUnlockedAny = earnedCount > 0;

            const card = document.createElement('div');
            card.className = 'AchievementCard';
            if (isMastered) {
                card.classList.add('state-mastered', 'texture-gold');
            } else if (isUnlockedAny) {
                card.classList.add('state-unlocked-any', 'texture-bronze-gold');
            }

            let displayTitle = '???';
            let displayDesc = '???';
            let cardStateClass = 'state-locked-all';

            if (item.isRevealed) {
                displayTitle = item.title;
                displayDesc = item.isHint ? '？？？' : item.description;
                cardStateClass = item.isHint ? 'state-hint' : '';
            }
            if (cardStateClass) card.classList.add(cardStateClass);

            const getMedalSVG = (type, mapType) => {
                const initial = type[0].toUpperCase();
                const ribbonStripe = mapType === 'regular'
                    ? '<rect x="11" y="2" width="2" height="9.5" fill="#38bdf8" />'
                    : '';
                return `
                    <svg viewBox="0 0 24 24" class="medal-svg ${type} ${mapType}">
                        <path d="M7 2 L17 2 L17 15 L12 11 L7 15 Z" class="medal-ribbon"/>
                        ${ribbonStripe}
                        <circle cx="12" cy="14" r="8.5" class="medal-base"/>
                        <circle cx="12" cy="14" r="6.5" class="medal-inner-rim" fill="none" stroke-width="0.8"/>
                        <text x="12" y="17.5" text-anchor="middle" class="medal-text">${initial}</text>
                    </svg>
                `;
            };

            const createMedalSlot = (earned, type, bestVal, mapType) => {
                const labels = { easy: 'EASY', normal: 'NORM', hard: 'HARD' };
                const visual = earned ? getMedalSVG(type, mapType) : `<span class="medal-label">${labels[type]}</span>`;
                const statusClass = earned ? 'state-earned' : 'state-locked';
                const miniClass = mapType === 'mini' ? 'mini' : '';
                
                let html = `<div class="MedalSlot ${statusClass} ${type} ${miniClass}">
                    ${visual}</div>`;
                
                if (g.isDevMode && bestVal !== undefined) {
                    html = html.replace('</div>', `<div class="dev-best">${bestVal}</div></div>`);
                }
                return html;
            };

            card.innerHTML = `
                <div class="AchievementCardLeft">
                    <span class="ach-name">${displayTitle}</span>
                    <span class="ach-desc">${displayDesc}</span>
                </div>
                <div class="AchievementCardRight">
                    <div class="MatrixRow">
                        <span class="map-label">MINI</span>
                        <div class="MedalSlots">
                            ${createMedalSlot(mini.earned.easy, 'easy', mini.best.easy, 'mini')}
                            ${createMedalSlot(mini.earned.normal, 'normal', mini.best.normal, 'mini')}
                            ${createMedalSlot(mini.earned.hard, 'hard', mini.best.hard, 'mini')}
                        </div>
                    </div>
                    <div class="MatrixRow">
                        <span class="map-label">REGULAR</span>
                        <div class="MedalSlots">
                            ${createMedalSlot(regular.earned.easy, 'easy', regular.best.easy, 'regular')}
                            ${createMedalSlot(regular.earned.normal, 'normal', regular.best.normal, 'regular')}
                            ${createMedalSlot(regular.earned.hard, 'hard', regular.best.hard, 'regular')}
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        const percent = Math.floor((totalEarned / totalCount) * 100);
        if (g.achievementPercent) {
            g.achievementPercent.textContent = `${percent}%`;
        }
    }
}
