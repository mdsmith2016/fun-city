import { Game } from './game/game';

const game = new Game();
game.start();

if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}
