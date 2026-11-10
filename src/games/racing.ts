import type { GameAction, GameDefinition } from '../types';
import { animationLoop, canvasSurface } from './shared';
import { RacingModel, RACE_TARGET, RACE_MAX_TARGET } from './racing-model';
import { RacingRenderer } from './racing-renderer';

export const racingGame: GameDefinition = {
  id: 'racing', name: '赛车', description: 'Retro highway racing.', instructions: 'A/D or arrows: steer · S/down: brake · W/up/Space: boost · Drag: steer',
  defaultTarget: RACE_TARGET, maxTarget: RACE_MAX_TARGET, scoreUnit: 'meters',
  keys: { KeyA: 'left', KeyD: 'right', KeyS: 'brake', KeyW: 'boost', ArrowUp: 'boost', ArrowDown: 'brake', Space: 'boost', a: 'left', d: 'right', s: 'brake', w: 'boost', ' ': 'boost' },
  controls: [{ action: 'left', symbol: '←', label: 'Left' }, { action: 'brake', symbol: '↓', label: 'Brake' }, { action: 'right', symbol: '→', label: 'Right' }, { action: 'boost', symbol: '↑', label: 'Boost' }],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface); canvas.className = 'pg-racing';
    const model = new RacingModel(context.targetScore), renderer = new RacingRenderer(ctx);
    const inputs = new Set<GameAction>(), taps = new Map<GameAction, number>(), widget = context.surface.closest<HTMLElement>('.pg-widget');
    let active = false, destroyed = false, loadFailed = false, lastScore = 0, lastLabel = '';
    let pointer: { id: number; x: number } | undefined;
    const clear = () => { inputs.clear(); taps.clear(); pointer = undefined; };
    const render = () => {
      renderer.render(model);
      const label = context.t('racingBoard', { distance: model.score, target: model.target, speed: Math.round(model.speed * 3.6), lives: model.health });
      if (label !== lastLabel) { canvas.setAttribute('aria-label', label); lastLabel = label; }
    };
    const loop = animationLoop(delta => {
      if (!renderer.ready) return;
      const held = new Set(inputs);
      for (const [action, time] of taps) { held.add(action); if (time <= delta) taps.delete(action); else taps.set(action, time - delta); }
      model.tick(delta / 1000, held, pointer?.x); render();
      if (!model.alive) { context.fail(context.t('noLives')); return; }
      if (model.score !== lastScore) { lastScore = model.score; context.reportScore(lastScore); }
    });
    void renderer.loaded.then(() => { if (!destroyed) render(); }).catch(() => { loadFailed = true; if (active && !destroyed) context.fail(context.t('assetLoadFailed')); });
    const start = () => { active = true; if (loadFailed) context.fail(context.t('assetLoadFailed')); else loop.start(); };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const rect = canvas.getBoundingClientRect(); pointer.x = Math.max(-.95, Math.min(.95, ((event.clientX - rect.left) * 268 / rect.width - 134) / 110));
    };
    const down = (event: PointerEvent) => {
      if (!active || event.button !== 0) return;
      event.preventDefault(); widget?.focus({ preventScroll: true }); canvas.setPointerCapture?.(event.pointerId);
      pointer = { id: event.pointerId, x: model.x }; move(event);
    };
    const up = (event: PointerEvent) => { if (pointer?.id === event.pointerId) pointer = undefined; };
    const focusOut = (event: Event) => { const target = (event as FocusEvent).relatedTarget; if (!(target instanceof Node) || !widget?.contains(target)) clear(); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, up as EventListener);
    window.addEventListener('blur', clear); widget?.addEventListener('focusout', focusOut); render();
    return {
      start, resume: start, pause() { active = false; clear(); loop.stop(); },
      action(action) { if (active) taps.set(action, 160); },
      setInput(action, pressed) { if (!active) return; if (pressed) inputs.add(action); else inputs.delete(action); },
      destroy() {
        destroyed = true; active = false; clear(); loop.stop(); window.removeEventListener('blur', clear); widget?.removeEventListener('focusout', focusOut);
        canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.removeEventListener(name, up as EventListener);
        canvas.remove();
      },
    };
  },
};
