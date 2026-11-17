import type { GameAction, GameDefinition } from '../types';
import { animationLoop, canvasSurface } from './shared';
import { BubblesModel, BUBBLES_TARGET, BUBBLES_MAX_TARGET } from './bubbles-model';
import { renderBubbles } from './bubbles-renderer';

export const bubblesGame: GameDefinition = {
  id: 'bubbles', name: '泡泡龙', description: 'Clear the bubble board.', instructions: 'Aim with mouse / touch / arrows · Click / Space: shoot',
  defaultTarget: BUBBLES_TARGET, maxTarget: BUBBLES_MAX_TARGET, scoreUnit: 'levels',
  keys: { KeyA: 'left', KeyD: 'right', a: 'left', d: 'right', Space: 'fire', ' ': 'fire', Enter: 'fire' },
  controls: [{ action: 'left', symbol: '←', label: 'Aim left' }, { action: 'fire', symbol: '●', label: 'Shoot' }, { action: 'right', symbol: '→', label: 'Aim right' }],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface); canvas.className = 'pg-bubbles';
    const model = new BubblesModel(context.targetScore), inputs = new Set<GameAction>();
    const widget = context.surface.closest<HTMLElement>('.pg-widget');
    let active = false, destroyed = false, pointer: number | undefined, lastScore = 0, lastLabel = '';
    const clear = () => { inputs.clear(); pointer = undefined; };
    const render = () => {
      renderBubbles(ctx, model);
      const label = context.t('bubblesBoard', { level: Math.min(model.score + 1, model.target), target: model.target, bubbles: model.bubbles.size, shots: 5 - model.misses });
      if (label !== lastLabel) { canvas.setAttribute('aria-label', label); lastLabel = label; }
    };
    const loop = animationLoop(delta => {
      model.aim(model.angle + ((inputs.has('right') ? 1 : 0) - (inputs.has('left') ? 1 : 0)) * delta * .0011);
      model.update(delta); render();
      if (!model.alive) context.fail(context.t('bubblesOverflow'));
      else if (model.score !== lastScore) { lastScore = model.score; context.reportScore(model.score); }
    });
    const aim = (event: PointerEvent) => {
      if (!active || (pointer !== undefined && event.pointerId !== pointer)) return;
      if (event.pointerType === 'touch' && pointer !== event.pointerId) return;
      const bounds = canvas.getBoundingClientRect(); if (!bounds.width || !bounds.height) return;
      model.aimAt((event.clientX - bounds.left) * 268 / bounds.width, (event.clientY - bounds.top) * 192 / bounds.height); render();
    };
    const down = (event: PointerEvent) => {
      if (!active || event.button !== 0 || pointer !== undefined) return;
      event.preventDefault(); pointer = event.pointerId; canvas.setPointerCapture?.(event.pointerId); widget?.focus({ preventScroll: true }); aim(event);
    };
    const up = (event: PointerEvent) => {
      if (!active || pointer !== event.pointerId) return;
      aim(event); pointer = undefined; model.shoot(); render();
    };
    const cancel = (event: PointerEvent) => { if (pointer === event.pointerId) pointer = undefined; };
    const focusOut = (event: FocusEvent) => { if (!(event.relatedTarget instanceof Node) || !widget?.contains(event.relatedTarget)) clear(); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', aim); canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', cancel);
    window.addEventListener('blur', clear); widget?.addEventListener('focusout', focusOut); render();
    const start = () => { if (!destroyed) { active = true; loop.start(); } };
    return {
      start, resume: start, pause() { active = false; clear(); loop.stop(); },
      action(action) { if (!active) return; if (action === 'fire') model.shoot(); else if (action === 'left' || action === 'right') model.aim(model.angle + (action === 'left' ? -.075 : .075)); render(); },
      setInput(action, pressed) {
        if (!active) return;
        if (pressed) { if (action === 'fire' && !inputs.has(action)) model.shoot(); inputs.add(action); }
        else inputs.delete(action);
      },
      destroy() {
        destroyed = true; active = false; clear(); loop.stop(); window.removeEventListener('blur', clear); widget?.removeEventListener('focusout', focusOut);
        canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', aim); canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', cancel); canvas.remove();
      },
    };
  },
};
