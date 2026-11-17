export type BuiltinGameId = 'tetris' | '2048' | 'minesweeper' | 'breakout' | 'fps' | 'adventure' | 'racing' | 'snake' | 'space' | 'pacman' | 'sokoban' | 'bubbles';
export type CaptchaState = 'idle' | 'running' | 'paused' | 'passed' | 'failed';
export type GameAction = 'left' | 'right' | 'down' | 'up' | 'rotate' | 'drop' | 'flag' | 'reveal' | 'fire' | 'strafe-left' | 'strafe-right' | 'attack' | 'brake' | 'boost' | 'undo';
export interface GameControl { action: GameAction; label: string; symbol: string }
export interface GameContext {
  /** Resolved target for this session, including per-game overrides. */
  targetScore: number;
  locale: Locale;
  t: Translator;
  surface: HTMLElement;
  reportScore: (score: number) => void;
  fail: (reason: string) => void;
  announce: (message: string) => void;
}
export interface GameSession {
  start(): void;
  pause(): void;
  resume(): void;
  action(action: GameAction): void;
  /** Optional held input for real-time games. Released on blur, pause and reset. */
  setInput?(action: GameAction, pressed: boolean): void;
  destroy(): void;
}
export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  defaultTarget: number;
  maxTarget?: number;
  scoreUnit: string;
  controls: readonly GameControl[];
  /** Physical codes or key values; these override the framework's arrow/space defaults. */
  keys?: Readonly<Record<string, GameAction>>;
  create(context: GameContext): GameSession;
}
export interface VerificationResult {
  game: string;
  score: number;
  targetScore: number;
  durationMs: number;
  completedAt: string;
}
export interface CaptchaSnapshot {
  state: CaptchaState;
  game: string;
  score: number;
  targetScore: number;
}
export interface CaptchaOptions {
  /** Browser language by default; regional tags such as fr-CA are accepted. */
  locale?: LocaleOption;
  game?: string | 'random';
  /** Start immediately on mount/reset. Defaults to true. */
  autoStart?: boolean;
  targetScore?: number;
  /** Per-game targets; these take precedence over targetScore. */
  targets?: Record<string, number>;
  onVerify?: (result: VerificationResult) => void;
  onStateChange?: (snapshot: CaptchaSnapshot) => void;
}
import type { Locale, LocaleOption, Translator } from './i18n';
