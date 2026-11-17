import type { GameDefinition } from '../types';
import { animationLoop, canvasSurface, listenForSwipe } from './shared';
import { PacmanModel, PACMAN_TARGET } from './pacman-model';
import { renderPacman } from './pacman-renderer';

export const pacmanGame: GameDefinition = {
  id: 'pacman', name: '吃豆人', description: 'Pixel maze chase.', instructions: 'Arrows / WASD / swipe: turn',
  defaultTarget: PACMAN_TARGET, maxTarget: PACMAN_TARGET, scoreUnit: 'pellets',
  keys: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', w: 'up', a: 'left', s: 'down', d: 'right' },
  controls: [{ action: 'left', symbol: '←', label: 'Left' }, { action: 'up', symbol: '↑', label: 'Up' }, { action: 'down', symbol: '↓', label: 'Down' }, { action: 'right', symbol: '→', label: 'Right' }],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface); canvas.className = 'pg-pacman';
    const model = new PacmanModel();
    let active = false;
    const render = () => {
      renderPacman(ctx, model);
      canvas.setAttribute('aria-label', context.t('pacmanBoard', { score: model.score, target: context.targetScore, lives: model.lives, x: model.player.x + 1, y: model.player.y + 1, power: Math.ceil(model.powered / 1000) }));
    };
    const clear = () => model.clearTurn();
    const loop = animationLoop(delta => {
      const before = model.score, lives = model.lives;
      model.update(delta); render();
      if (!model.alive) context.fail(context.t('noLives'));
      else {
        if (lives !== model.lives) context.announce(context.t('livesLeft', { n: model.lives }));
        if (model.score !== before) context.reportScore(model.score);
      }
    });
    const stopSwipe = listenForSwipe(canvas, direction => { if (active) model.turn(direction); });
    window.addEventListener('blur', clear); render();
    const start = () => { active = true; loop.start(); };
    return {
      start, resume: start,
      action(direction) { if (active) model.turn(direction); },
      pause() { active = false; clear(); loop.stop(); },
      destroy() { active = false; clear(); loop.stop(); stopSwipe(); window.removeEventListener('blur', clear); canvas.remove(); },
    };
  },
};
