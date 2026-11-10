import type { GameAction, GameDefinition } from '../types';
import { animationLoop, canvasSurface } from './shared';
import { AdventureModel, MAX_DUNGEONS } from './adventure-model';
import { AdventureRenderer } from './adventure-renderer';

export const adventureGame: GameDefinition = {
  id: 'adventure', name: '冒险', description: 'Explore a dungeon, find its key and defeat its guardian.',
  instructions: 'WASD / arrows to move · Space / J / click to attack',
  defaultTarget: 1, maxTarget: MAX_DUNGEONS, scoreUnit: 'dungeons',
  keys: { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyJ: 'attack', Space: 'attack', Enter: 'attack', w: 'up', s: 'down', a: 'left', d: 'right', j: 'attack', ' ': 'attack' },
  controls: [
    { action: 'left', symbol: '←', label: 'Left' }, { action: 'up', symbol: '↑', label: 'Up' },
    { action: 'down', symbol: '↓', label: 'Down' }, { action: 'right', symbol: '→', label: 'Right' }, { action: 'attack', symbol: '⚔', label: 'Attack' },
  ],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface);
    canvas.className = 'pg-adventure';
    const model = new AdventureModel(), renderer = new AdventureRenderer(ctx);
    const inputs = new Set<GameAction>(), taps = new Map<GameAction, number>();
    const widget = context.surface.closest<HTMLElement>('.pg-widget');
    let active = false, destroyed = false, loadFailed = false, score = 0, label = '';
    let pointer: { id: number; x: number; y: number; dragged: boolean } | undefined;
    const render = () => {
      renderer.render(model);
      const next = context.t('adventureBoard', { room: model.roomId + 1, health: model.health, max: model.maxHealth, enemies: model.remaining, key: context.t(model.key ? 'fpsKeyYes' : 'fpsKeyNo') });
      if (next !== label) { canvas.setAttribute('aria-label', next); label = next; }
    };
    const clear = () => { inputs.clear(); taps.clear(); pointer = undefined; };
    const loop = animationLoop(delta => {
      if (!renderer.ready) return;
      const held = new Set(inputs);
      for (const [action, time] of taps) { held.add(action); if (time <= delta) taps.delete(action); else taps.set(action, time - delta); }
      if (pointer) {
        if (pointer.dragged) {
          const bounds = canvas.getBoundingClientRect();
          const x = (pointer.x - bounds.left) * canvas.width / bounds.width, y = (pointer.y - bounds.top) * canvas.height / bounds.height;
          const dx = x - (14 + model.x * 16), dy = y - (24 + model.y * 16);
          if (Math.abs(dx) > 5) held.add(dx < 0 ? 'left' : 'right');
          if (Math.abs(dy) > 5) held.add(dy < 0 ? 'up' : 'down');
        } else held.add('attack');
      }
      model.tick(delta / 1000, held); model.events.length = 0; render();
      if (model.completed !== score) { score = model.completed; context.reportScore(score); }
      if (active && !model.alive) context.fail(context.t('failed'));
    });
    void renderer.loaded.then(() => { if (!destroyed) render(); }).catch(() => { loadFailed = true; if (!destroyed && active) context.fail(context.t('assetLoadFailed')); });
    const start = () => { active = true; if (loadFailed) context.fail(context.t('assetLoadFailed')); else loop.start(); };
    const down = (event: PointerEvent) => {
      if (!active || event.button !== 0 || !renderer.ready) return;
      event.preventDefault(); widget?.focus({ preventScroll: true }); canvas.setPointerCapture?.(event.pointerId);
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false }; model.attack(); render();
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4) pointer.dragged = true;
      pointer.x = event.clientX; pointer.y = event.clientY;
    };
    const up = (event: PointerEvent) => { if (pointer?.id === event.pointerId) pointer = undefined; };
    const focusOut = (event: Event) => { const target = (event as FocusEvent).relatedTarget; if (!(target instanceof Node) || !widget?.contains(target)) clear(); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, up as EventListener);
    window.addEventListener('blur', clear); widget?.addEventListener('focusout', focusOut);
    render();
    return {
      start, pause() { active = false; clear(); loop.stop(); }, resume: start,
      setInput(action, pressed) { if (!active) return; if (pressed) inputs.add(action); else inputs.delete(action); },
      action(action) { if (active) taps.set(action, 160); },
      destroy() {
        destroyed = true; active = false; clear(); loop.stop(); window.removeEventListener('blur', clear); widget?.removeEventListener('focusout', focusOut);
        canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.removeEventListener(event, up as EventListener);
        canvas.remove();
      },
    };
  },
};
