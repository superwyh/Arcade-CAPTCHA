import dungeonUrl from '../assets/runtime/adventure-dungeon.png';
import heroUrl from '../assets/runtime/adventure-hero.png';
import { AdventureModel, ROOM_HEIGHT, ROOM_WIDTH, type Direction } from './adventure-model';
import { swordFrame } from './adventure-combat';

const TILE = 16, X = 14, Y = 24, WIDTH = ROOM_WIDTH * TILE, HEIGHT = ROOM_HEIGHT * TILE;
const heroRow: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };
const enemyFrame = { slime: 4, bat: 5, skeleton: 6, guardian: 7 };

function buffer(width = 268, height = 192) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  return canvas;
}
async function loadSheet(url: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve(); image.onerror = () => reject(new Error('Adventure sprite sheet failed to load.'));
    image.src = url;
  });
  // Cache the atlas at 32 × 32 pixels per frame.
  const sheet = buffer(128, 128), ctx = sheet.getContext('2d')!;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0, 128, 128);
  return sheet;
}

export class AdventureRenderer {
  private dungeon?: HTMLCanvasElement;
  private hero?: HTMLCanvasElement;
  private previousRoom?: number;
  private transition?: { from: HTMLCanvasElement; current: HTMLCanvasElement; start: number; dx: number; dy: number };
  ready = false;
  readonly loaded: Promise<void>;
  constructor(private ctx: CanvasRenderingContext2D) {
    this.loaded = Promise.all([loadSheet(dungeonUrl), loadSheet(heroUrl)]).then(([dungeon, hero]) => {
      this.dungeon = dungeon; this.hero = hero; this.ready = true;
    });
  }
  private sprite(index: number, x: number, y: number, width: number, height = width, sheet = this.dungeon!) {
    this.ctx.drawImage(sheet, index % 4 * 32, Math.floor(index / 4) * 32, 32, 32, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }
  render(model: AdventureModel) {
    const ctx = this.ctx;
    if (this.previousRoom !== undefined && this.previousRoom !== model.roomId && model.visited.size > 1) {
      const from = buffer(); from.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
      this.transition = { from, current: buffer(), start: model.elapsed,
        dx: Math.sign(model.roomId % 3 - this.previousRoom % 3), dy: Math.sign(Math.floor(model.roomId / 3) - Math.floor(this.previousRoom / 3)) };
    }
    this.previousRoom = model.roomId;
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#080e20'; ctx.fillRect(0, 0, 268, 192);
    if (!this.ready) return;
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, WIDTH, HEIGHT); ctx.clip();
    this.room(model);
    this.entities(model);
    ctx.restore();
    this.hud(model);
    if (this.transition) {
      const { from, current, start, dx, dy } = this.transition, progress = Math.min(1, (model.elapsed - start) / .18);
      if (progress >= 1 || model.visited.size === 1) this.transition = undefined;
      else {
        const next = current.getContext('2d')!; next.clearRect(0, 0, 268, 192); next.drawImage(ctx.canvas, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.rect(X, Y, WIDTH, HEIGHT); ctx.clip();
        ctx.drawImage(from, X, Y, WIDTH, HEIGHT, X - Math.round(dx * progress * WIDTH), Y - Math.round(dy * progress * HEIGHT), WIDTH, HEIGHT);
        ctx.drawImage(current, X, Y, WIDTH, HEIGHT, X + Math.round(dx * (1 - progress) * WIDTH), Y + Math.round(dy * (1 - progress) * HEIGHT), WIDTH, HEIGHT);
        ctx.restore();
      }
    }
  }
  private room(model: AdventureModel) {
    const ctx = this.ctx;
    for (let y = 0; y < ROOM_HEIGHT; y += 2) for (let x = 0; x < ROOM_WIDTH; x += 2) this.sprite(12, X + x * TILE, Y + y * TILE, 32);
    for (let y = 0; y < ROOM_HEIGHT; y++) for (let x = 0; x < ROOM_WIDTH; x++) {
      if (x > 0 && x < ROOM_WIDTH - 1 && y > 0 && y < ROOM_HEIGHT - 1) continue;
      const gap = y === 0 && x >= 6 && x <= 8 && model.room.doors.up !== undefined
        || y === 9 && x >= 6 && x <= 8 && model.room.doors.down !== undefined
        || x === 0 && y >= 4 && y <= 5 && model.room.doors.left !== undefined
        || x === 14 && y >= 4 && y <= 5 && model.room.doors.right !== undefined;
      if (!gap) this.sprite(13, X + x * TILE, Y + y * TILE, TILE);
    }
    for (const pillar of model.room.walls) this.sprite(1, X + (pillar.x + .5) * TILE - 12, Y + (pillar.y + .5) * TILE - 16, 24);
    for (const [direction, roomId] of Object.entries(model.room.doors) as [Direction, number][]) {
      const vertical = direction === 'up' || direction === 'down';
      const px = X + (direction === 'left' ? .5 : direction === 'right' ? 14.5 : 7.5) * TILE;
      const py = Y + (direction === 'up' ? .5 : direction === 'down' ? 9.5 : 5) * TILE;
      const width = vertical ? 48 : 32;
      ctx.save(); ctx.translate(px, py);
      ctx.rotate(direction === 'down' ? Math.PI : direction === 'left' ? -Math.PI / 2 : direction === 'right' ? Math.PI / 2 : 0);
      ctx.fillStyle = '#0f244e'; ctx.fillRect(-width / 2, -8, width, 16);
      ctx.fillStyle = '#789dda'; ctx.fillRect(-width / 2, -8, 3, 16); ctx.fillRect(width / 2 - 3, -8, 3, 16);
      if (model.doorOpen(direction)) {
        ctx.fillStyle = '#8ca5c5'; ctx.fillRect(-width / 2 + 3, 4, width - 6, 3);
      } else this.sprite(14, -width / 2, -14, width, 28);
      ctx.restore();
      if (roomId === 1 && !model.bossUnlocked) this.sprite(10, px - 7, py - 7, 14);
    }
    for (const x of [2.5, 12.5]) this.sprite(0, X + x * TILE - 8, Y + 14, 16);
    if (model.roomId === 1) {
      this.sprite(15, X + 7.5 * TILE - 16, Y + 2 * TILE - 16, 32);
      if (!model.exitOpen) {
        ctx.fillStyle = '#102549'; ctx.fillRect(X + 7.5 * TILE - 12, Y + 2 * TILE - 10, 24, 20);
        ctx.fillStyle = '#a3bbdf'; for (let i = -8; i <= 8; i += 8) ctx.fillRect(X + 7.5 * TILE + i, Y + 2 * TILE - 10, 2, 20);
      }
    }
    const chest = model.room.chest;
    if (chest) {
      this.sprite(chest.opened ? 9 : 8, X + chest.x * TILE - 12, Y + chest.y * TILE - 12, 24);
      if (!chest.opened && model.remaining === 0 && Math.floor(model.elapsed * 4) % 2 === 0) this.sprite(3, X + chest.x * TILE + 5, Y + chest.y * TILE - 14, 10);
    }
    for (const heart of model.hearts) this.sprite(11, X + heart.x * TILE - 8, Y + heart.y * TILE - 8, 16);
  }
  private entities(model: AdventureModel) {
    const ctx = this.ctx;
    const entities = model.room.enemies.filter(enemy => enemy.health > 0).map(enemy => ({ y: enemy.y, enemy }));
    for (const entity of [...entities, { y: model.y, enemy: undefined }].sort((a, b) => a.y - b.y)) {
      const enemy = entity.enemy;
      if (enemy) {
        const size = enemy.kind === 'guardian' ? 40 : 26;
        ctx.globalAlpha = enemy.hit > 0 && Math.floor(enemy.hit * 30) % 2 === 0 ? .35 : 1;
        const bob = enemy.kind === 'bat' ? Math.round(Math.sin(model.elapsed * 10)) : 0;
        this.sprite(enemyFrame[enemy.kind], X + enemy.x * TILE - size / 2, Y + enemy.y * TILE - size / 2 + bob, size);
        ctx.globalAlpha = 1;
        if (enemy.kind === 'guardian') {
          ctx.fillStyle = '#101d3c'; ctx.fillRect(X + enemy.x * TILE - 17, Y + enemy.y * TILE - 25, 34, 3);
          ctx.fillStyle = enemy.timer < .5 ? '#fff4ad' : '#f3a629'; ctx.fillRect(X + enemy.x * TILE - 17, Y + enemy.y * TILE - 25, Math.round(34 * enemy.health / (14 + model.completed * 2)), 3);
        }
      } else if (model.invulnerable <= 0 || Math.floor(model.invulnerable * 12) % 2) {
        const facing = model.swing > 0 ? model.attackFacing : model.facing;
        const frame = model.swing > 0 ? swordFrame(model.swing) : model.moving ? Math.floor(model.walking) % 2 : 0;
        const row = heroRow[facing], px = Math.round(X + model.x * TILE - 16), py = Math.round(Y + model.y * TILE - 16);
        if (model.swing <= 0) {
          // Reuse the torso between walking frames to prevent sprite jitter.
          ctx.drawImage(this.hero!, 0, row * 32, 32, 24, px, py, 32, 24);
          ctx.drawImage(this.hero!, frame * 32, row * 32 + 24, 32, 8, px, py + 24, 32, 8);
        } else this.sprite(row * 4 + frame, px, py, 32, 32, this.hero!);
      }
    }
    for (const p of model.projectiles) {
      ctx.fillStyle = '#e35438'; ctx.fillRect(Math.round(X + p.x * TILE - 3), Math.round(Y + p.y * TILE - 3), 6, 6);
      ctx.fillStyle = '#fff0a4'; ctx.fillRect(Math.round(X + p.x * TILE - 1), Math.round(Y + p.y * TILE - 1), 2, 2);
    }
    for (const spark of model.sparks) this.sprite(3, X + spark.x * TILE - 9, Y + spark.y * TILE - 9, spark.life > .08 ? 18 : 12);
  }
  private hud(model: AdventureModel) {
    const ctx = this.ctx;
    for (let i = 0; i < model.maxHealth; i++) { ctx.globalAlpha = i < model.health ? 1 : .2; this.sprite(11, 11 + i * 13, 2, 16); } ctx.globalAlpha = 1;
    ctx.globalAlpha = model.key ? 1 : .25; this.sprite(10, 126, 0, 20); ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      const x = 221 + i % 3 * 11, y = 2 + Math.floor(i / 3) * 6;
      ctx.fillStyle = i === model.roomId ? '#f6cc63' : model.visited.has(i) ? '#7896c9' : '#263456'; ctx.fillRect(x, y, 8, 4);
      if (i === 1 && !model.bossUnlocked) { ctx.fillStyle = '#b58d4d'; ctx.fillRect(x + 3, y + 1, 2, 2); }
    }
    if (model.swordLevel > 1) { ctx.fillStyle = '#f4d578'; ctx.fillRect(164, 3, 2, 12); ctx.fillRect(160, 11, 10, 2); }
  }
}
