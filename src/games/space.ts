import type { GameAction, GameDefinition } from '../types';
import { animationLoop, canvasSurface } from './shared';
import { SpaceModel, SPACE_TARGET, SPACE_MAX_TARGET } from './space-model';
import { SpaceRenderer } from './space-renderer';

export const spaceGame: GameDefinition = {
  id: 'space', name: '太空射击', description: 'Pixel space shooter.', instructions: 'Arrows / WASD / drag: move. Automatic fire.',
  defaultTarget: SPACE_TARGET, maxTarget: SPACE_MAX_TARGET, scoreUnit: 'stages',
  keys: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', w: 'up', a: 'left', s: 'down', d: 'right' },
  controls: [{ action: 'left', symbol: '←', label: 'Left' }, { action: 'up', symbol: '↑', label: 'Up' }, { action: 'down', symbol: '↓', label: 'Down' }, { action: 'right', symbol: '→', label: 'Right' }],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface); canvas.className = 'pg-space';
    const model = new SpaceModel(context.targetScore), renderer = new SpaceRenderer(ctx);
    const inputs = new Set<GameAction>(), taps = new Map<GameAction, number>(), widget = context.surface.closest<HTMLElement>('.pg-widget');
    let active = false, destroyed = false, loadFailed = false, lastScore = 0, lastLabel = '';
    let pointer: { id: number; lastX: number; lastY: number; x: number; y: number } | undefined;
    const clear = () => { inputs.clear(); taps.clear(); pointer = undefined; };
    const render = () => {
      renderer.render(model);
      const label = context.t('spaceBoard', { stage: Math.min(model.target, model.score + 1), target: model.target, enemies: model.enemies.length, lives: model.health });
      if (label !== lastLabel) { canvas.setAttribute('aria-label', label); lastLabel = label; }
    };
    const loop = animationLoop(delta => {
      if (!renderer.ready) return;
      const held = new Set(inputs);
      for (const [action, time] of taps) { held.add(action); if (time <= delta) taps.delete(action); else taps.set(action, time - delta); }
      model.tick(delta / 1000, held, pointer); render();
      if (!model.alive) { context.fail(context.t('noLives')); return; }
      if (model.score !== lastScore) { lastScore = model.score; context.reportScore(lastScore); }
    });
    void renderer.loaded.then(() => { if (!destroyed) render(); }).catch(() => { loadFailed = true; if (active && !destroyed) context.fail(context.t('assetLoadFailed')); });
    const start = () => { active = true; if (loadFailed) context.fail(context.t('assetLoadFailed')); else loop.start(); };
    const down = (event: PointerEvent) => {
      if (!active || event.button !== 0 || pointer) return;
      event.preventDefault(); widget?.focus({ preventScroll: true }); canvas.setPointerCapture?.(event.pointerId);
      pointer = { id: event.pointerId, lastX: event.clientX, lastY: event.clientY, x: model.x, y: model.y };
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      pointer.x = Math.max(12, Math.min(256, pointer.x + (event.clientX - pointer.lastX) * 268 / rect.width));
      pointer.y = Math.max(108, Math.min(178, pointer.y + (event.clientY - pointer.lastY) * 192 / rect.height));
      pointer.lastX = event.clientX; pointer.lastY = event.clientY;
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
