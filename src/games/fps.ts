import type { GameAction, GameDefinition } from '../types';
import { animationLoop, canvasSurface } from './shared';
import { FpsModel, angleDifference, SECTOR_COUNT, type FpsEvent } from './fps-model';
import { FpsRenderer } from './fps-renderer';

/** Small, locally synthesized effects; audio is opened only after player input. */
class FpsAudio {
  private context?: AudioContext;
  private voices = new Set<AudioScheduledSourceNode>();
  unlock() {
    if (typeof AudioContext === 'undefined') return;
    try { this.context ??= new AudioContext(); if (this.context.state === 'suspended') void this.context.resume().catch(() => {}); } catch { /* Audio is optional. */ }
  }
  play(event: FpsEvent) {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const now = context.currentTime, gain = context.createGain(); gain.connect(context.destination);
    const duration = event === 'shot' ? .16 : .1;
    gain.gain.setValueAtTime(event === 'shot' ? .055 : .025, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    const voice = context.createOscillator(); voice.type = event === 'pickup' || event === 'unlock' ? 'square' : 'sawtooth';
    voice.frequency.setValueAtTime(event === 'shot' ? 130 : event === 'hurt' ? 62 : event === 'pickup' ? 620 : 180, now);
    voice.frequency.exponentialRampToValueAtTime(event === 'shot' ? 26 : event === 'pickup' ? 920 : 45, now + duration);
    voice.connect(gain); this.voices.add(voice); voice.onended = () => { this.voices.delete(voice); voice.disconnect(); gain.disconnect(); };
    voice.start(now); voice.stop(now + duration);
  }
  stop() { for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } } this.voices.clear(); }
  destroy() { this.stop(); if (this.context) void this.context.close().catch(() => {}); }
}

export const fpsGame: GameDefinition = {
  id: 'fps', name: 'FPS', description: 'Five randomized first-person combat sectors.',
  instructions: 'W/S move · A/D turn · Q/E strafe · Mouse look · Space / click to fire',
  defaultTarget: SECTOR_COUNT, maxTarget: SECTOR_COUNT, scoreUnit: 'sectors',
  keys: {
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyQ: 'strafe-left', KeyE: 'strafe-right',
    w: 'up', s: 'down', a: 'left', d: 'right', z: 'up', q: 'strafe-left', e: 'strafe-right', ' ': 'fire', Enter: 'fire',
  },
  controls: [
    { action: 'left', symbol: '←', label: 'Turn left' }, { action: 'up', symbol: '↑', label: 'Forward' },
    { action: 'down', symbol: '↓', label: 'Back' }, { action: 'right', symbol: '→', label: 'Turn right' },
    { action: 'fire', symbol: '◎', label: 'Fire' },
  ],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface);
    canvas.className = 'pg-fps';
    const model = new FpsModel(), renderer = new FpsRenderer(ctx, context.t), audio = new FpsAudio();
    const inputs = new Set<GameAction>(), taps = new Map<GameAction, number>();
    const widget = context.surface.closest<HTMLElement>('.pg-widget');
    let active = false, lastScore = 0, lastLabel = '', pointer: { id: number; x: number } | undefined;
    let mouseX: number | undefined;
    const locked = () => document.pointerLockElement === canvas;
    const unlockPointer = () => { if (locked()) document.exitPointerLock?.(); };
    const render = () => {
      renderer.render(model);
      const label = context.t('fpsBoard', { sector: Math.min(SECTOR_COUNT, model.cleared + 1), total: SECTOR_COUNT, health: model.health, ammo: model.ammo, enemies: model.remaining, key: context.t(model.key ? 'fpsKeyYes' : 'fpsKeyNo') });
      if (label !== lastLabel) { canvas.setAttribute('aria-label', label); lastLabel = label; }
    };
    const clear = () => { inputs.clear(); taps.clear(); pointer = undefined; mouseX = undefined; unlockPointer(); };
    const loop = animationLoop(delta => {
      const held = new Set(inputs);
      for (const [action, time] of taps) { held.add(action); if (time <= delta) taps.delete(action); else taps.set(action, time - delta); }
      if (pointer) held.add('fire');
      model.tick(delta / 1000, held);
      for (const event of model.events.splice(0)) {
        audio.play(event);
        if (event === 'unlock') context.announce(context.t('fpsExitOpen'));
      }
      render();
      if (model.cleared !== lastScore) { lastScore = model.cleared; context.reportScore(lastScore); }
      if (active && !model.alive) context.fail(context.t('failed'));
    });
    const down = (event: PointerEvent) => {
      if (!active || event.button !== 0) return;
      event.preventDefault(); widget?.focus({ preventScroll: true });
      canvas.setPointerCapture?.(event.pointerId); pointer = { id: event.pointerId, x: event.clientX };
      mouseX = event.clientX;
      if (event.pointerType === 'mouse' && !locked()) {
        // Embedded browsers can reject pointer lock; hover/drag turning stays available.
        try { canvas.requestPointerLock?.()?.catch(() => {}); } catch { /* Optional pointer lock. */ }
      }
      audio.unlock(); model.fire(); render();
    };
    const turn = (pixels: number) => { model.angle = angleDifference(model.angle + pixels * .008); render(); };
    const move = (event: PointerEvent) => {
      if (!active || locked()) return;
      if (pointer?.id === event.pointerId) {
        turn(event.clientX - pointer.x); pointer.x = event.clientX;
      } else if (event.pointerType === 'mouse' && widget?.contains(document.activeElement)) {
        if (mouseX !== undefined) turn(event.clientX - mouseX);
      }
      mouseX = event.clientX;
    };
    const up = (event: PointerEvent) => { if (pointer?.id === event.pointerId) pointer = undefined; };
    const enter = (event: PointerEvent) => { mouseX = event.clientX; };
    const leave = () => { mouseX = undefined; };
    const lockedMove = (event: MouseEvent) => { if (active && locked()) turn(event.movementX); };
    const lockedUp = (event: MouseEvent) => { if (event.button === 0) pointer = undefined; };
    const lockChange = () => {
      mouseX = undefined;
      if (locked() && !active) unlockPointer();
      if (!locked()) { inputs.clear(); taps.clear(); pointer = undefined; }
    };
    // Losing the window cannot leave canvas fire or held actions running.
    const blur = () => clear();
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('pointerenter', enter); canvas.addEventListener('pointerleave', leave);
    document.addEventListener('mousemove', lockedMove); document.addEventListener('mouseup', lockedUp);
    document.addEventListener('pointerlockchange', lockChange);
    window.addEventListener('blur', blur);
    const focusOut = (event: Event) => { const target = (event as FocusEvent).relatedTarget; if (!(target instanceof Node) || !widget?.contains(target)) clear(); };
    widget?.addEventListener('focusout', focusOut);
    render();
    return {
      start() { active = true; loop.start(); },
      pause() { active = false; clear(); audio.stop(); loop.stop(); },
      resume() { active = true; loop.start(); },
      setInput(action, pressed) { if (!active) return; if (pressed) { audio.unlock(); inputs.add(action); } else inputs.delete(action); },
      action(action) { if (active) { audio.unlock(); taps.set(action, action === 'fire' ? 50 : 160); } },
      destroy() {
        active = false; clear(); loop.stop(); audio.destroy();
        window.removeEventListener('blur', blur); widget?.removeEventListener('focusout', focusOut);
        canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('lostpointercapture', up);
        canvas.removeEventListener('pointerenter', enter); canvas.removeEventListener('pointerleave', leave);
        document.removeEventListener('mousemove', lockedMove); document.removeEventListener('mouseup', lockedUp);
        document.removeEventListener('pointerlockchange', lockChange);
        canvas.remove();
      },
    };
  },
};
