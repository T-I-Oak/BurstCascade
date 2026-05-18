import { Game } from './main.js';
import { HowToPlayRenderer } from './howToPlay.js';

window.addEventListener('load', () => {
    window.game = new Game();
    window.howToPlay = new HowToPlayRenderer();
});
