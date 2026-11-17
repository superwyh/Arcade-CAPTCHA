import type { GameAction, GameDefinition } from '../types';
import { canvasSurface, listenForSwipe } from './shared';
import { SokobanModel, SOKOBAN_LEVELS, SOKOBAN_MAX_TARGET, SOKOBAN_TARGET } from './sokoban-model';
import { renderSokoban } from './sokoban-renderer';

export const sokobanGame: GameDefinition = {
  id: 'sokoban', name: '推箱子', description: 'Push every crate onto a goal.', instructions: 'Arrows / WASD / swipe: move · Z: undo',
  defaultTarget: SOKOBAN_TARGET, maxTarget: SOKOBAN_MAX_TARGET, scoreUnit: 'levels',
  keys: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', KeyZ: 'undo', w: 'up', a: 'left', s: 'down', d: 'right', z: 'undo' },
  controls: [
    { action: 'left', symbol: '←', label: 'Left' }, { action: 'up', symbol: '↑', label: 'Up' },
    { action: 'down', symbol: '↓', label: 'Down' }, { action: 'right', symbol: '→', label: 'Right' },
    { action: 'undo', symbol: '↶', label: 'Undo (Z)' },
  ],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface); canvas.className = 'pg-sokoban';
    let model = new SokobanModel(), completed = 0, active = false, destroyed = false;
    const render = () => {
      renderSokoban(ctx, model);
      canvas.setAttribute('aria-label', context.t('sokobanBoard', {
        level: Math.min(completed + 1, context.targetScore), target: context.targetScore,
        placed: model.placed, boxes: model.boxes.size, moves: model.moves, x: model.player.x + 1, y: model.player.y + 1,
      }));
    };
    const action = (action: GameAction) => {
      if (!active || destroyed || completed >= context.targetScore) return;
      if (action === 'undo') model.undo();
      else if (action === 'left' || action === 'right' || action === 'up' || action === 'down') model.move(action);
      else return;
      if (model.complete) {
        completed++;
        // Progress is awarded once per whole level; a new board has no undo history.
        if (completed < context.targetScore) model = new SokobanModel(SOKOBAN_LEVELS[completed]);
        render(); context.reportScore(completed);
      } else render();
    };
    const stopSwipe = listenForSwipe(canvas, action); render();
    const start = () => { if (!destroyed) active = true; };
    return {
      start, resume: start, action,
      pause() { active = false; },
      destroy() { destroyed = true; active = false; stopSwipe(); canvas.remove(); },
    };
  },
};
