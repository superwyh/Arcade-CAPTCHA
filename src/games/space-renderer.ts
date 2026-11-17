import atlasUrl from '../assets/runtime/space-atlas.png';
import type { SpaceModel } from './space-model';

export class SpaceRenderer {
  private sheet = document.createElement('canvas');
  ready = false;
  readonly loaded: Promise<void>;
  constructor(private ctx: CanvasRenderingContext2D) {
    this.sheet.width = 192; this.sheet.height = 96;
    const image = new Image();
    this.loaded = new Promise((resolve, reject) => {
      image.onload = () => {
        const ctx = this.sheet.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0, 192, 96);
        this.ready = true; resolve();
      };
      image.onerror = () => reject(new Error('Space sprite atlas failed to load.'));
    });
    image.src = atlasUrl;
  }
  private sprite(index: number, x: number, y: number, size: number) {
    this.ctx.drawImage(this.sheet, index % 4 * 48, Math.floor(index / 4) * 48, 48, 48, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  }
  render(model: SpaceModel) {
    const ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1024'; ctx.fillRect(0, 0, 268, 192);
    for (let i = 0; i < 46; i++) {
      const x = (i * 73 + 19) % 268, y = Math.floor((i * 47 + model.elapsed * (8 + i % 3 * 7)) % 192);
      ctx.fillStyle = ['#354260', '#8490a7', '#e0d8ae'][i % 3]; ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
    }
    if (this.ready) {
      for (const enemy of model.enemies) {
        this.sprite(enemy.type === 'boss' ? 5 : enemy.type === 'fighter' ? 4 : 3, enemy.x, enemy.y, enemy.type === 'boss' ? 68 : 32);
        if (enemy.fireIn < .35 && enemy.y > 20) { ctx.fillStyle = '#fff2a6'; ctx.fillRect(Math.round(enemy.x) - 1, Math.round(enemy.y) + 8, 3, 3); }
      }
      ctx.globalAlpha = model.invulnerable > 0 && Math.floor(model.invulnerable * 10) % 2 ? .4 : 1;
      this.sprite(model.steering < 0 ? 1 : model.steering > 0 ? 2 : 0, model.x, model.y, 36); ctx.globalAlpha = 1;
    }
    for (const shot of model.shots) { ctx.fillStyle = '#65e3ff'; ctx.fillRect(Math.round(shot.x) - 1, Math.round(shot.y) - 4, 2, 7); ctx.fillStyle = '#e9ffff'; ctx.fillRect(Math.round(shot.x), Math.round(shot.y) - 4, 1, 3); }
    for (const shot of model.enemyShots) {
      const x = Math.round(shot.x), y = Math.round(shot.y);
      ctx.fillStyle = '#f4734f'; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
      ctx.fillStyle = '#ffea9c'; ctx.fillRect(x - 1, y - 1, 3, 3);
    }
    if (this.ready) for (const explosion of model.explosions) {
      ctx.globalAlpha = Math.min(1, (.4 - explosion.age) * 5);
      this.sprite(explosion.age < .13 ? 6 : 7, explosion.x, explosion.y, explosion.size); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#0b1024'; ctx.fillRect(0, 0, 268, 17);
    for (let i = 0; i < 3; i++) {
      const x = 8 + i * 12; ctx.fillStyle = i < model.health ? '#f37285' : '#39435d';
      ctx.fillRect(x, 5, 4, 4); ctx.fillRect(x + 5, 5, 4, 4); ctx.fillRect(x + 1, 8, 7, 3); ctx.fillRect(x + 3, 11, 3, 2);
    }
    if (model.boss) {
      ctx.fillStyle = '#3d254e'; ctx.fillRect(57, 7, 138, 3);
      ctx.fillStyle = '#e77bcb'; ctx.fillRect(57, 7, Math.ceil(138 * model.boss.hp / model.boss.maxHp), 3);
    }
  }
}
