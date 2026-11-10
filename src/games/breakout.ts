import type { GameDefinition } from '../types';
import { animationLoop, canvasSurface, pixelBlock } from './shared';

export interface Brick { x: number; y: number; active: boolean }
export class BreakoutModel {
  x = 134; y = 151; vx = 65; vy = -105; paddle = 134; lives = 3; score = 0;
  bricks: Brick[] = Array.from({ length: 24 }, (_, i) => ({ x: 11 + (i % 8) * 31, y: 19 + Math.floor(i / 8) * 14, active: true }));
  movePaddle(x: number) { this.paddle = Math.max(27, Math.min(241, x)); }
  resetBall() { this.x = this.paddle; this.y = 151; this.vx = 65; this.vy = -105; }
  tick(seconds: number) {
    if (this.lives <= 0) return;
    const previousX = this.x, previousY = this.y;
    this.x += this.vx * seconds; this.y += this.vy * seconds;
    if (this.x < 4) { this.x = 4; this.vx = Math.abs(this.vx); }
    if (this.x > 264) { this.x = 264; this.vx = -Math.abs(this.vx); }
    if (this.y < 4) { this.y = 4; this.vy = Math.abs(this.vy); }
    if (this.vy > 0 && this.y >= 165 && this.y <= 176 && Math.abs(this.x - this.paddle) < 31) {
      this.y = 165;
      const angle = ((this.x - this.paddle) / 31) * 1.05;
      this.vx = Math.sin(angle) * 135; this.vy = -Math.cos(angle) * 135;
    }
    for (const brick of this.bricks) {
      if (brick.active && this.x + 4 >= brick.x && this.x - 4 <= brick.x + 27 && this.y + 4 >= brick.y && this.y - 4 <= brick.y + 10) {
        brick.active = false; this.score += 10;
        // Place the ball outside the struck face so adjacent bricks cannot trap it.
        if (previousY - 4 >= brick.y + 10) { this.y = brick.y + 14; this.vy = Math.abs(this.vy); }
        else if (previousY + 4 <= brick.y) { this.y = brick.y - 4; this.vy = -Math.abs(this.vy); }
        else if (previousX + 4 <= brick.x) { this.x = brick.x - 4; this.vx = -Math.abs(this.vx); }
        else { this.x = brick.x + 31; this.vx = Math.abs(this.vx); }
        break;
      }
    }
    if (this.y > 196) { this.lives--; this.resetBall(); }
  }
}

export const breakoutGame: GameDefinition = {
  id: 'breakout', name: '打砖块', description: '接住小球，把阻碍打散。',
  instructions: '鼠标 / 拖动挡板 · ← → 移动',
  defaultTarget: 240, maxTarget: 240, scoreUnit: '分',
  controls: [{ action: 'left', symbol: '←', label: '挡板左移' }, { action: 'right', symbol: '→', label: '挡板右移' }],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface);
    const model = new BreakoutModel();
    let active = false, lastScore = 0, lastLives = 3;
    const render = () => {
      ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 268, 192);
      model.bricks.forEach((brick, i) => { if (brick.active) pixelBlock(ctx, brick.x, brick.y, 27, 10, ['#e95353', '#ed963e', '#edcf4d'][Math.floor(i / 8)]); });
      pixelBlock(ctx, model.paddle - 27, 170, 54, 6, '#dddddd');
      const bx = Math.round(model.x), by = Math.round(model.y);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, by - 4, 4, 8); ctx.fillRect(bx - 4, by - 2, 8, 4);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < model.lives ? '#bbbbbb' : '#444444'; ctx.fillRect(12 + i * 8, 184, 4, 4); }
      canvas.setAttribute('aria-label', context.t('boardBreakout', { lives: model.lives, bricks: model.bricks.filter(brick => brick.active).length }));
    };
    const loop = animationLoop(delta => {
      model.tick(delta / 1000); render();
      if (model.score !== lastScore) { lastScore = model.score; context.reportScore(model.score); }
      if (model.lives !== lastLives) { lastLives = model.lives; context.announce(context.t('livesLeft', { n: model.lives })); }
      if (active && model.lives <= 0) context.fail(context.t('noLives'));
    });
    const move = (event: PointerEvent) => {
      if (!active) return;
      const rect = canvas.getBoundingClientRect();
      model.movePaddle((event.clientX - rect.left) / rect.width * 268); render();
    };
    const down = (event: PointerEvent) => { canvas.setPointerCapture?.(event.pointerId); move(event); };
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', down);
    render();
    return {
      start() { active = true; loop.start(); }, pause() { active = false; loop.stop(); }, resume() { active = true; loop.start(); },
      action(action) { if (active) { if (action === 'left') model.movePaddle(model.paddle - 18); if (action === 'right') model.movePaddle(model.paddle + 18); render(); } },
      destroy() { active = false; loop.stop(); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down); canvas.remove(); },
    };
  },
};
