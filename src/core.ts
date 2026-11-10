import type { CaptchaOptions, CaptchaSnapshot, CaptchaState, GameAction, GameDefinition, GameSession, VerificationResult } from './types';
import { createTranslator, localizeGame, resolveLocale, type LocaleOption } from './i18n';

const registry = new Map<string, GameDefinition>();
const defaultKeys: Readonly<Record<string, GameAction>> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'drop', Enter: 'reveal', f: 'flag' };
function physicalKey(code: string) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  return code === 'Space' ? ' ' : code === 'NumpadEnter' ? 'Enter' : code;
}
function editingText(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('input, textarea, select, [role="textbox"]')) return true;
  const editable = target.closest('[contenteditable]');
  return target.isContentEditable || !!editable && editable.getAttribute('contenteditable') !== 'false';
}
export function registerGame(game: GameDefinition) {
  if (!game.id || !Number.isSafeInteger(game.defaultTarget) || game.defaultTarget <= 0 || (game.maxTarget !== undefined && (!Number.isSafeInteger(game.maxTarget) || game.maxTarget < game.defaultTarget))) throw new Error('游戏 ID 和目标分数配置无效。');
  if (registry.has(game.id)) throw new Error(`游戏已注册：${game.id}`);
  registry.set(game.id, game);
}
export function getGames(locale: LocaleOption = 'auto'): readonly GameDefinition[] { return [...registry.values()].map(game => localizeGame(game, locale)); }

function resolveGame(options: CaptchaOptions) {
  const locale = resolveLocale(options.locale), t = createTranslator(locale);
  const games = options.game === 'random' ? getGames(locale) : [registry.get(options.game ?? 'tetris')];
  if (!games.length || games.some(game => !game)) throw new Error(t('unknownGame', { id: options.game ?? 'tetris' }));
  const choices = games.map(game => {
    const definition = localizeGame(game!, locale);
    const target = options.targets?.[definition.id] ?? options.targetScore ?? definition.defaultTarget;
    if (!Number.isSafeInteger(target) || target < 1 || (definition.maxTarget !== undefined && target > definition.maxTarget)) throw new RangeError(t('invalidTarget', { game: definition.name, max: definition.maxTarget ?? Number.MAX_SAFE_INTEGER }));
    return { definition, target };
  });
  return choices[Math.floor(Math.random() * choices.length)];
}

/** Entertainment-only client-side gate. VerificationResult is not a security token. */
export class GameCaptcha {
  private options: CaptchaOptions;
  private definition!: GameDefinition;
  private target = 0;
  private score = 0;
  private state: CaptchaState = 'idle';
  private session?: GameSession;
  private destroyed = false;
  private generation = 0;
  private activeSince = 0;
  private duration = 0;
  private root = document.createElement('section');
  private scoreElement!: HTMLElement;
  private progress!: HTMLElement;
  private overlay!: HTMLElement;
  private live!: HTMLElement;
  private t = createTranslator();
  private pausedByVisibility = false;
  private controls!: HTMLElement;
  private heldInputs = new Map<string, GameAction>();
  private releaseInputs = () => {
    const actions = new Set(this.heldInputs.values()); this.heldInputs.clear();
    for (const action of actions) this.session?.setInput?.(action, false);
  };
  private focusOut = (event: FocusEvent) => { if (!(event.relatedTarget instanceof Node) || !this.root.contains(event.relatedTarget)) this.releaseInputs(); };
  private pressInput(source: string, action: GameAction) { this.heldInputs.set(source, action); this.session?.setInput?.(action, true); }
  private releaseInput(source: string) {
    const action = this.heldInputs.get(source); this.heldInputs.delete(source);
    if (action && ![...this.heldInputs.values()].includes(action)) this.session?.setInput?.(action, false);
  }
  private releaseKeyboardInputs = () => {
    for (const source of [...this.heldInputs.keys()]) if (source.startsWith('key:')) this.releaseInput(source);
  };
  private keyAction(event: KeyboardEvent) {
    // IMEs can report key="Process" (229), while code still identifies the physical key.
    const physical = physicalKey(event.code);
    return this.definition.keys?.[event.code] ?? this.definition.keys?.[physical]
      ?? this.definition.keys?.[event.key] ?? this.definition.keys?.[event.key.toLowerCase()]
      ?? defaultKeys[physical] ?? defaultKeys[event.key.toLowerCase()] ?? defaultKeys[event.key];
  }
  private onCompositionStart = (event: CompositionEvent) => { if (!editingText(event.target)) this.releaseKeyboardInputs(); };
  private onKeyUp = (event: KeyboardEvent) => {
    this.releaseInput(`key:${event.code || event.key}`);
    // Some IMEs omit the released key entirely. Never leave a movement key stuck.
    if (!event.code && (event.key === 'Process' || event.key === 'Unidentified' || event.keyCode === 229)) this.releaseKeyboardInputs();
    const key = physicalKey(event.code) || event.key;
    if ((key === ' ' || key === 'Enter') && event.target instanceof HTMLButtonElement) return;
    if (this.state === 'running' && !editingText(event.target) && !event.altKey && !event.ctrlKey && !event.metaKey && this.keyAction(event)) event.preventDefault();
  };
  private visibilityHandler = () => {
    if (document.hidden && this.state === 'running') { this.pause(); this.pausedByVisibility = true; }
    else if (!document.hidden && this.pausedByVisibility) { this.pausedByVisibility = false; this.resume(); }
  };

  constructor(container: string | HTMLElement, options: CaptchaOptions = {}) {
    const host = typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container;
    if (!host) throw new Error(createTranslator(options.locale)('containerMissing', { id: String(container) }));
    resolveGame(options);
    this.options = { ...options };
    this.root.className = 'pg-widget'; this.root.tabIndex = 0;
    this.root.contentEditable = 'false'; this.root.setAttribute('inputmode', 'none');
    this.root.addEventListener('keydown', this.onKeyDown);
    this.root.addEventListener('keyup', this.onKeyUp);
    this.root.addEventListener('focusout', this.focusOut);
    this.root.addEventListener('compositionstart', this.onCompositionStart);
    window.addEventListener('blur', this.releaseInputs);
    host.append(this.root);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.mount();
  }

  getSnapshot(): CaptchaSnapshot { return { state: this.state, game: this.definition.id, score: this.score, targetScore: this.target }; }

  start() {
    this.startSession(true);
  }
  private startSession(focus: boolean) {
    if (this.destroyed || this.state !== 'idle') return;
    this.state = 'running'; this.activeSince = performance.now(); this.update();
    this.session?.start();
    if (focus || document.activeElement === document.body) this.root.focus({ preventScroll: true });
    this.emit();
  }
  pause() {
    this.pausedByVisibility = false;
    if (this.destroyed || this.state !== 'running') return;
    this.freeze(); this.state = 'paused'; this.update(); this.emit();
  }
  resume() {
    this.pausedByVisibility = false;
    if (this.destroyed || this.state !== 'paused') return;
    this.state = 'running'; this.activeSince = performance.now(); this.update();
    this.session?.resume(); this.root.focus({ preventScroll: true }); this.emit();
  }
  reset(options: Partial<CaptchaOptions> = {}) {
    if (this.destroyed) return;
    const next = { ...this.options, ...options };
    resolveGame(next);
    this.options = next; this.mount();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.generation++; this.releaseInputs(); this.session?.destroy();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.root.removeEventListener('keydown', this.onKeyDown); this.root.remove();
    this.root.removeEventListener('keyup', this.onKeyUp);
    this.root.removeEventListener('focusout', this.focusOut);
    this.root.removeEventListener('compositionstart', this.onCompositionStart);
    window.removeEventListener('blur', this.releaseInputs);
  }
  private emit() { this.options.onStateChange?.(this.getSnapshot()); }
  private freeze() { this.duration += performance.now() - this.activeSince; this.releaseInputs(); this.session?.pause(); }
  private mount() {
    this.generation++;
    const generation = this.generation;
    this.releaseInputs(); this.session?.destroy(); this.session = undefined;
    const selected = resolveGame(this.options);
    this.definition = selected.definition; this.target = selected.target;
    const locale = resolveLocale(this.options.locale);
    this.t = createTranslator(locale);
    this.root.lang = locale;
    this.root.setAttribute('aria-label', `Game CAPTCHA ${this.t('widget')} · ${this.definition.name}`);
    this.pausedByVisibility = false;
    this.state = 'idle'; this.score = 0; this.duration = 0;
    this.root.setAttribute('aria-description', this.definition.instructions);
    this.root.innerHTML = `
      <div class="pg-game-heading"><span class="pg-score"><b>0</b><span></span></span><button class="pg-restart pg-icon-button" type="button"><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path fill="currentColor" d="M3 1h5v1h2v2h1V2h1v5H7V6h3V4H8V3H3v1H2v4h1v1h5V8h2v2H8v1H3v-1H1V8H0V4h1V2h2z"/></svg></button></div>
      <div class="pg-progress pg-sr-only" role="progressbar" aria-valuemin="0"><i></i></div>
      <div class="pg-stage"><div class="pg-surface"></div><div class="pg-overlay"></div></div>
      <div class="pg-controls"></div>
      <span class="pg-status pg-sr-only" role="status" aria-live="polite"></span>`;
    this.root.querySelector('.pg-score > span')!.textContent = `/ ${this.target}`;
    const restart = this.root.querySelector<HTMLButtonElement>('.pg-restart')!;
    restart.setAttribute('aria-label', this.t('restart')); restart.title = this.t('restart');
    this.scoreElement = this.root.querySelector('.pg-score b')!;
    this.progress = this.root.querySelector('.pg-progress')!;
    this.progress.setAttribute('aria-label', this.t('progress'));
    this.progress.setAttribute('aria-valuemax', String(this.target));
    this.overlay = this.root.querySelector('.pg-overlay')!;
    this.live = this.root.querySelector('.pg-status')!;
    this.root.querySelector('.pg-restart')!.addEventListener('click', () => { this.reset(); this.root.focus({ preventScroll: true }); });
    this.controls = this.root.querySelector('.pg-controls')!;
    this.definition.controls.forEach(control => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = control.symbol;
      button.setAttribute('aria-label', control.label); button.title = control.label;
      if (control.action === 'flag') button.setAttribute('aria-pressed', 'false');
      button.addEventListener('pointerdown', event => {
        if (this.state !== 'running' || !this.session?.setInput) return;
        event.preventDefault(); button.setPointerCapture?.(event.pointerId);
        this.root.focus({ preventScroll: true }); this.pressInput(`pointer:${event.pointerId}`, control.action);
      });
      const release = (event: PointerEvent) => this.releaseInput(`pointer:${event.pointerId}`);
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
      button.addEventListener('click', event => {
        if (this.state !== 'running') return;
        if (this.session?.setInput && event.detail !== 0) return;
        this.session?.action(control.action);
        if (control.action === 'flag') button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        this.root.focus({ preventScroll: true });
      });
      this.controls.append(button);
    });
    const surface = this.root.querySelector<HTMLElement>('.pg-surface')!;
    surface.addEventListener('pointerdown', event => { if (this.state === 'running') { event.preventDefault(); this.root.focus({ preventScroll: true }); } });
    this.session = this.definition.create({
      targetScore: this.target,
      locale, t: this.t,
      surface,
      reportScore: score => { if (generation === this.generation) this.reportScore(score); },
      fail: reason => { if (generation === this.generation) this.fail(reason); },
      announce: message => { if (!this.destroyed && generation === this.generation) this.live.textContent = message; },
    });
    this.update();
    if (this.options.autoStart !== false) this.startSession(false);
    else this.emit();
  }
  private reportScore(score: number) {
    if (this.destroyed || this.state !== 'running' || !Number.isFinite(score) || score < this.score) return;
    this.score = score;
    if (score >= this.target) {
      this.freeze(); this.state = 'passed'; this.update();
      const result: VerificationResult = { game: this.definition.id, score, targetScore: this.target, durationMs: Math.round(this.duration), completedAt: new Date().toISOString() };
      this.emit(); this.options.onVerify?.(result);
    } else { this.update(); this.emit(); }
  }
  private fail(reason: string) {
    if (this.destroyed || this.state !== 'running') return;
    this.freeze(); this.state = 'failed'; this.update(reason); this.emit();
  }
  private update(reason?: string) {
    this.root.dataset.state = this.state;
    this.scoreElement.textContent = String(this.score);
    this.progress.setAttribute('aria-valuenow', String(Math.min(this.score, this.target)));
    this.progress.querySelector<HTMLElement>('i')!.style.width = `${Math.min(this.score / this.target, 1) * 100}%`;
    this.controls.querySelectorAll('button').forEach(button => { button.disabled = this.state !== 'running'; });
    this.live.textContent = this.state === 'failed' && reason ? reason : this.t(this.state);
    this.overlay.replaceChildren(); this.overlay.hidden = this.state === 'running';
    if (this.state === 'running') return;
    if (this.state === 'passed') {
      const title = document.createElement('strong'); title.textContent = `✓ ${this.t('passed')}`; this.overlay.append(title);
    }
    if (this.state !== 'passed') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'pg-primary';
      button.textContent = this.t(this.state === 'idle' ? 'start' : this.state === 'paused' ? 'resume' : 'retry');
      button.addEventListener('click', () => { if (this.state === 'failed') this.reset(); if (this.state === 'paused') this.resume(); else this.start(); });
      this.overlay.append(button);
    }
  }
  private onKeyDown = (event: KeyboardEvent) => {
    if (this.destroyed) return;
    if (this.state !== 'running' || editingText(event.target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) { this.releaseKeyboardInputs(); return; }
    const key = physicalKey(event.code) || event.key;
    if ((key === ' ' || key === 'Enter') && event.target instanceof HTMLButtonElement) return;
    const action = this.keyAction(event);
    if (action) {
      event.preventDefault();
      if (action === 'flag') this.controls.querySelector<HTMLButtonElement>('[aria-pressed]')?.click();
      else if (this.session?.setInput) this.pressInput(`key:${event.code || event.key}`, action);
      else this.session?.action(action);
    }
  };
}
export function createCaptcha(container: string | HTMLElement, options: CaptchaOptions = {}) { return new GameCaptcha(container, options); }
