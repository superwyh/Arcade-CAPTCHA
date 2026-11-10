import atlasUrl from '../assets/racing-atlas.png';
import { RacingModel } from './racing-model';

export class RacingRenderer {
  private sheet = document.createElement('canvas');
  ready = false;
  readonly loaded: Promise<void>;
  constructor(private ctx: CanvasRenderingContext2D) {
    const image = new Image(); this.sheet.width = 192; this.sheet.height = 96;
    this.loaded = new Promise((resolve, reject) => {
      image.onload = () => {
        const ctx = this.sheet.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0, 192, 96);
        this.ready = true; resolve();
      };
      image.onerror = () => reject(new Error('Racing atlas failed to load.'));
    });
    image.src = atlasUrl;
  }
  private projection(model: RacingModel, ahead: number) {
    const scale = 32 / (32 + Math.max(-3, ahead));
    return { scale, y: 55 + 121 * scale, half: 110 * scale,
      x: 134 + model.curveAt(model.distance + Math.max(0, ahead)) * 74 * (1 - Math.min(1, scale)) ** 2 };
  }
  private sprite(index: number, x: number, baseline: number, size: number) {
    this.ctx.drawImage(this.sheet, index % 4 * 48, Math.floor(index / 4) * 48, 48, 48,
      Math.round(x - size / 2), Math.round(baseline - size * .875), Math.round(size), Math.round(size));
  }
  render(model: RacingModel) {
    const ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#83d1dc'; ctx.fillRect(0, 0, 268, 192);
    ctx.fillStyle = '#ffe3a0'; ctx.fillRect(207, 24, 20, 16); ctx.fillRect(211, 20, 12, 24);
    for (let x = 0; x < 268; x += 4) {
      const ridge = 45 - Math.max(0, 20 - Math.abs(x - 62) * .35, 13 - Math.abs(x - 138) * .28, 14 - Math.abs(x - 244) * .4);
      ctx.fillStyle = '#629ca2'; ctx.fillRect(x, Math.round(ridge / 2) * 2, 4, 60 - ridge);
    }
    for (let y = 55; y < 192; y += 2) {
      const scale = Math.max(.02, (y - 55) / 121), ahead = 32 / scale - 32;
      const { x, half } = this.projection(model, ahead), stripe = Math.floor((model.distance + ahead) / 9) % 2;
      ctx.fillStyle = stripe ? '#43974b' : '#4da44f'; ctx.fillRect(0, y, 268, 2);
      ctx.fillStyle = stripe ? '#f5e9ca' : '#dd5a4f'; ctx.fillRect(Math.round(x - half - 7 * scale), y, Math.round(2 * half + 14 * scale), 2);
      ctx.fillStyle = '#414550'; ctx.fillRect(Math.round(x - half), y, Math.round(half * 2), 2);
      if (Math.floor((model.distance + ahead) / 7) % 3 === 0) {
        ctx.fillStyle = '#e2e1cb';
        for (const lane of [-.5, 0, .5]) ctx.fillRect(Math.round(x + half * lane), y, Math.max(1, Math.round(2 * scale)), 2);
      }
    }
    const finish = model.target - model.distance;
    if (finish < 220) {
      const p = this.projection(model, finish);
      for (let row = 0; row < 2; row++) for (let col = 0; col < 16; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#111a28' : '#fff8dc';
        ctx.fillRect(Math.round(p.x - p.half + col * p.half / 8), Math.round(p.y + row * 4 * p.scale), Math.ceil(p.half / 8), Math.max(1, Math.ceil(4 * p.scale)));
      }
    }
    if (!this.ready) return;
    const decorations: { ahead: number; side: number }[] = [];
    const start = Math.floor(model.distance / 32);
    for (let i = start; i <= start + 12; i++) decorations.push({ ahead: i * 32 + 20 - model.distance, side: i % 2 ? -1 : 1 });
    for (const tree of decorations.reverse()) {
      const p = this.projection(model, tree.ahead);
      if (tree.ahead > 0) this.sprite(7, p.x + tree.side * (p.half + 24 * p.scale), p.y, 70 * p.scale);
    }
    for (const car of [...model.cars].sort((a, b) => b.distance - a.distance)) {
      const ahead = car.distance - model.distance;
      if (ahead < -3 || ahead > 350) continue;
      const p = this.projection(model, ahead);
      ctx.fillStyle = '#202732'; ctx.fillRect(Math.round(p.x + car.x * p.half - 21 * p.scale), Math.round(p.y - 3 * p.scale), Math.round(42 * p.scale), Math.max(1, Math.round(4 * p.scale)));
      this.sprite(car.sprite, p.x + car.x * p.half, p.y, 64 * p.scale);
    }
    const px = Math.round(134 + model.x * 110);
    ctx.fillStyle = '#202732'; ctx.fillRect(px - 23, 175, 46, 5);
    ctx.globalAlpha = model.invulnerable > 0 && Math.floor(model.invulnerable * 12) % 2 ? .45 : 1;
    this.sprite(model.boosting ? 3 : model.steering < 0 ? 1 : model.steering > 0 ? 2 : 0, px, 179, 64); ctx.globalAlpha = 1;
    ctx.fillStyle = '#111b2b'; ctx.fillRect(0, 0, 268, 18);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < model.health ? '#fa5b59' : '#4a5261'; const x = 8 + i * 12;
      ctx.fillRect(x, 5, 4, 4); ctx.fillRect(x + 5, 5, 4, 4); ctx.fillRect(x + 1, 8, 7, 3); ctx.fillRect(x + 3, 11, 3, 2);
    }
    ctx.font = '12px "Fusion Pixel", monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#fff4d0';
    ctx.fillText(String(Math.round(model.speed * 3.6)).padStart(3, '0') + ' km/h', 260, 13);
  }
}
