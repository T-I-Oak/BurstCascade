const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const vm = require('vm');

// 1. Setup JSDOM environment with ALL IDs used in main.js
const html = `
<!DOCTYPE html>
<html>
<body>
    <canvas id="game-canvas"></canvas>
    <div id="player-select"><div class="toggle-btn selected" data-value="pvc"></div></div>
    <div id="size-select"><div class="toggle-btn selected" data-value="regular"></div></div>
    <div id="ai-level-select"><div class="toggle-btn selected" data-value="easy"></div><div id="ai-level-group"></div></div>
    <button id="help-btn"></button>
    <button id="start-help-btn"></button>
    <button id="game-start-btn"></button>
    <button id="restart-btn"></button>
    <button id="help-close-btn"></button>
    <button class="help-back-btn"></button>
    <button id="achievements-btn"></button>
    <button id="ach-close-btn"></button>
    <button id="achievements-back-btn"></button>
    <button id="achievement-reset-btn"></button>
    <button id="ach-back-btn"></button>
    <button id="title-btn"></button>
    <button id="back-btn"></button>
    <button id="peek-board-btn"></button>
    <div id="help-modal"></div>
    <div id="achievements-content"></div>
    <div id="achievement-modal"></div>
    <div id="achievement-list"></div>
    <div id="overlay-container"></div>
    <div id="victory-overlay"></div>
    <div id="victory-title"></div>
    <div id="victory-message"></div>
    <div id="victory-stats"></div>
    <div id="achievement-notification"></div>
    <div id="turn-display"></div>
    <div id="p1-energy"></div>
    <div id="p2-energy"></div>
    <div id="p1-cores"></div>
    <div id="p2-cores"></div>
    <div id="achievement-percent"></div>
    <table id="achievements-table"><tbody></tbody></table>
    <div id="overlay"></div>
    <div id="help-content"></div>
    <div id="mode-selection-content"></div>
    <div id="game-over-content"></div>
    <div id="ai-thinking-overlay"></div>
</body>
</html>`;

const dom = new JSDOM(html, {
    url: "http://localhost",
    runScripts: "dangerously",
    resources: "usable"
});

// 2. Mock missing browser APIs more thoroughly
dom.window.AudioContext = class { createGain() { return { connect: () => { }, gain: { value: 0 } }; } };
dom.window.localStorage = {
    getItem: () => null,
    setItem: () => null,
    removeItem: () => null
};
dom.window.confirm = () => true;

// Mock Canvas getContext
dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return {
        fillRect: () => { },
        clearRect: () => { },
        getImageData: (x, y, w, h) => ({ data: new Array(w * h * 4).fill(0) }),
        putImageData: () => { },
        createImageData: () => [],
        setTransform: () => { },
        drawImage: () => { },
        save: () => { },
        restore: () => { },
        beginPath: () => { },
        moveTo: () => { },
        lineTo: () => { },
        closePath: () => { },
        stroke: () => { },
        fill: () => { },
        translate: () => { },
        scale: () => { },
        rotate: () => { },
        arc: () => { },
        createLinearGradient: () => ({ addColorStop: () => { } }),
        fillText: () => { },
        strokeText: () => { },
        clip: () => { },
        measureText: () => ({ width: 0 }),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        globalAlpha: 1.0
    };
};

// 3. Sequential script execution into the SAME context
const context = vm.createContext(dom.window);
const scripts = ['map.js', 'achievements.js', 'ai.js', 'main.js', 'Tests/test_achievements.js'];
scripts.forEach(s => {
    const code = fs.readFileSync(path.join(__dirname, '..', s), 'utf8');
    vm.runInContext(code, context);
});

// 4. Run tests
console.log("Running Achievement Tests in Node.js...");
if (typeof dom.window.runAchievementTest === 'function') {
    dom.window.runAchievementTest().then(() => {
        console.log("Test execution finished.");
    }).catch(e => {
        console.error("Test execution failed:", e);
        process.exit(1);
    });
} else {
    console.error("Error: runAchievementTest is not defined on dom.window");
    process.exit(1);
}
