import type { GameDefinition } from '../types';
import { animationLoop, canvasSurface, listenForSwipe } from './shared';
import { SnakeModel, SNAKE_TARGET, SNAKE_MAX_TARGET } from './snake-model';
import { renderSnake } from './snake-renderer';

export const snakeGame: GameDefinition = {
  id: 'snake', name: '贪吃蛇', description: 'Classic pixel snake.', instructions: 'Arrows / WASD / swipe: turn',
  defaultTarget: SNAKE_TARGET, maxTarget: SNAKE_MAX_TARGET, scoreUnit: 'food',
  keys: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', w: 'up', a: 'left', s: 'down', d: 'right' },
  controls: [{ action: 'left', symbol: '←', label: 'Left' }, { action: 'up', symbol: '↑', label: 'Up' }, { action: 'down', symbol: '↓', label: 'Down' }, { action: 'right', symbol: '→', label: 'Right' }],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface); canvas.className = 'pg-snake';
    const model = new SnakeModel();
    let active = false, elapsed = 0;
    const clear = () => { elapsed = 0; model.clearTurns(); };
    const render = () => {
      renderSnake(ctx, model);
      canvas.setAttribute('aria-label', context.t('snakeBoard', { score: model.score, target: context.targetScore, length: model.body.length, x: model.body[0].x + 1, y: model.body[0].y + 1 }));
    };
    const loop = animationLoop(delta => {
      elapsed += delta;
      if (elapsed < model.stepMs) return;
      elapsed -= model.stepMs;
      const before = model.score; model.step(); render();
      if (!model.alive) context.fail(context.t('snakeCollision'));
      else if (model.score !== before) context.reportScore(model.score);
    });
    const swipeCleanup = listenForSwipe(canvas, direction => { if (active) model.turn(direction); });
    window.addEventListener('blur', clear); render();
    const start = () => { active = true; loop.start(); };
    return {
      start, resume: start,
      action(direction) { if (active) model.turn(direction); },
      pause() { active = false; clear(); loop.stop(); },
      destroy() { active = false; clear(); loop.stop(); swipeCleanup(); window.removeEventListener('blur', clear); canvas.remove(); },
    };
  },
};
