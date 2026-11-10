import './style.css';
import { registerGame } from './core';
import { tetrisGame } from './games/tetris';
import { mergeGame } from './games/merge';
import { minesweeperGame } from './games/minesweeper';
import { breakoutGame } from './games/breakout';
import { fpsGame } from './games/fps';
import { adventureGame } from './games/adventure';
import { racingGame } from './games/racing';

registerGame(tetrisGame);
registerGame(mergeGame);
registerGame(minesweeperGame);
registerGame(breakoutGame);
registerGame(fpsGame);
registerGame(adventureGame);
registerGame(racingGame);

export { GameCaptcha, createCaptcha, getGames, registerGame } from './core';
export { createTranslator, resolveLocale, locales } from './i18n';
export type { Locale, LocaleOption, Translator } from './i18n';
export { tetrisGame, mergeGame, minesweeperGame, breakoutGame, fpsGame, adventureGame, racingGame };
export type * from './types';
