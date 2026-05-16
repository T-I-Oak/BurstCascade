import { Game } from './main.js';
import { TutorialRenderer } from './tutorial.js';

window.addEventListener('load', () => {
    window.game = new Game();
    window.tutorial = new TutorialRenderer();
});
