import { isMobileDevice } from './core/platform';
import { AttractMode } from './game/attract';
import { Game } from './game/game';
import { getVariant } from './variants';

document.title = getVariant().documentTitle;

if (isMobileDevice()) {
  new AttractMode().start();
} else {
  const game = new Game();
  game.start();

  if (import.meta.env.DEV) {
    (window as unknown as { __game: Game }).__game = game;
  }
}
