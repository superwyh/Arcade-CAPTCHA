import type { Translator } from '../i18n';
import { FpsModel, type PickupKind } from './fps-model';
import { monster, weapon } from './fps-art';

const WIDTH = 134, HEIGHT = 78, HORIZON = HEIGHT / 2, PROJECTION = 100;
const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

function surface(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function item(kind: PickupKind | 'portal' | 'fireball') {
  const { canvas, ctx } = surface(16, 20);
  const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  if (kind === 'ammo') {
    rect('#292b23', 1, 6, 14, 12); rect('#65704b', 2, 7, 12, 10); rect('#a2a17b', 2, 7, 12, 2);
    for (let x = 4; x < 13; x += 3) { rect('#c4a15e', x, 10, 2, 5); rect('#ddd19b', x, 10, 2, 1); }
  } else if (kind === 'health') {
    rect('#50504b', 1, 5, 14, 14); rect('#b4b3a6', 2, 6, 12, 12); rect('#dedbca', 3, 6, 10, 2);
    rect('#8d1f22', 6, 9, 4, 7); rect('#8d1f22', 4, 11, 8, 3);
  } else if (kind === 'armor') {
    rect('#243121', 2, 3, 12, 14); rect('#6a8952', 3, 4, 10, 12); rect('#161e15', 6, 3, 4, 3);
    rect('#9bb37c', 3, 5, 2, 7); rect('#3f5635', 7, 7, 6, 7);
  } else if (kind === 'key') {
    rect('#3b1716', 2, 5, 12, 10); rect('#ce3c31', 3, 6, 10, 8); rect('#f78856', 4, 7, 8, 2);
    rect('#e4d3a8', 4, 11, 4, 2); rect('#6b231e', 10, 10, 2, 3);
  } else if (kind === 'fireball') {
    rect('#85301f', 3, 4, 10, 12); rect('#f37723', 4, 5, 8, 10); rect('#ffd56b', 5, 7, 6, 6); rect('#fff4ce', 7, 8, 3, 3);
  } else {
    rect('#353b30', 0, 0, 16, 20); rect('#86aa53', 1, 1, 14, 18); rect('#152318', 3, 3, 10, 17);
    rect('#e1edaa', 6, 6, 4, 2); rect('#e1edaa', 8, 5, 2, 4);
    rect('#7c9c42', 0, 0, 16, 2);
  }
  return canvas;
}

function face(hurt: boolean) {
  const { canvas, ctx } = surface(14, 16);
  const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  rect('#25221d', 1, 0, 12, 16); rect('#614a30', 2, 0, 10, 5); rect('#99815d', 3, 1, 8, 2);
  rect('#ac7a52', 2, 5, 10, 8); rect('#daa472', 4, 4, 6, 10); rect('#745037', 1, 6, 2, 5); rect('#745037', 11, 6, 2, 5);
  rect('#3f3328', 3, 5, 3, 2); rect('#3f3328', 8, 5, 3, 2); rect('#d5d0b5', 3, 7, 3, 1); rect('#d5d0b5', 8, 7, 3, 1);
  rect('#1a2725', 4, 7, 1, 1); rect('#1a2725', 9, 7, 1, 1); rect('#916342', 6, 7, 2, 4);
  rect('#5f3928', 4, 12, 6, 2); rect('#d6be96', 5, 12, 4, 1);
  if (hurt) { rect('#912e28', 2, 8, 2, 5); rect('#ac3328', 8, 11, 3, 4); }
  return canvas;
}

export class FpsRenderer {
  private view = surface(WIDTH, HEIGHT);
  private image = this.view.ctx.createImageData(WIDTH, HEIGHT);
  private depth = new Float32Array(WIDTH);
  private textures = new Map<string, Uint8Array>();
  private monsters = new Map<string, HTMLCanvasElement>();
  private items = new Map<string, HTMLCanvasElement>();
  private gun = weapon();
  private faces = [face(false), face(true)];

  constructor(private ctx: CanvasRenderingContext2D, private t: Translator) {
    for (const kind of ['guard', 'imp', 'brute'] as const) {
      this.monsters.set(`${kind}0`, monster(kind, 0)); this.monsters.set(`${kind}1`, monster(kind, 1)); this.monsters.set(`${kind}hurt`, monster(kind, 0, true));
    }
    for (const kind of ['ammo', 'health', 'armor', 'key', 'portal', 'fireball'] as const) this.items.set(kind, item(kind));
    for (const type of ['1', '2', '3', 'E']) {
      const data = new Uint8Array(32 * 32 * 3);
      const base = rgb(type === '1' ? '#737d76' : type === '2' ? '#8d8070' : type === '3' ? '#865e50' : '#586467');
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const noise = ((x * 13 + y * 7 + (x ^ y) * 17) % 7) - 3;
        let shade = noise;
        if (type === '1') {
          if (x < 3 || x > 28) shade -= 28;
          if (x === 3 || y === 3) shade += 30;
          if (x === 28 || y === 28) shade -= 42;
          if (y < 3 || y > 28) shade -= 24;
          if (x > 6 && x < 25 && y > 8 && y < 23) shade -= 18;
          if (x > 8 && x < 23 && y > 14 && y < 22) shade -= y % 3 === 0 ? 45 : 8;
          if ((x === 5 || x === 26) && (y === 5 || y === 26)) shade += 45;
        } else if (type === 'E') {
          shade += x < 4 || x > 27 ? 24 : x % 8 === 0 ? -48 : -10;
          if (y > 24 && x > 4 && x < 28) shade += (x + y) % 8 < 4 ? 26 : -40;
        } else {
          const brickX = (x + (Math.floor(y / 8) % 2) * 8) % 16;
          if (y % 8 === 0 || brickX === 0) shade -= 44;
          else if (y % 8 === 1 || brickX === 1) shade += 19;
          else if (y % 8 === 7 || brickX === 15) shade -= 16;
          if (type === '2' && (x < 3 || x > 29)) shade -= 22;
        }
        const offset = (y * 32 + x) * 3;
        for (let c = 0; c < 3; c++) data[offset + c] = Math.max(0, Math.min(255, base[c] + shade));
        if (type === '1' && y === 10 && x >= 10 && x < 14) { data[offset] = 208; data[offset + 1] = 132; data[offset + 2] = 65; }
        if (type === '1' && y === 10 && x >= 16 && x < 21) { data[offset] = 90; data[offset + 1] = 139; data[offset + 2] = 113; }
        if (type === 'E' && y > 5 && y < 10 && x > 9 && x < 23) { data[offset] = 162; data[offset + 1] = 27; data[offset + 2] = 22; }
      }
      this.textures.set(type, data);
    }
  }

  render(model: FpsModel) {
    const pixels = this.image.data, cos = Math.cos(model.angle), sin = Math.sin(model.angle);
    const plane = WIDTH / (2 * PROJECTION), planeX = -sin * plane, planeY = cos * plane;
    for (let y = 0; y < HEIGHT; y++) {
      const floor = y >= HORIZON, distance = PROJECTION * .5 / Math.max(.5, Math.abs(y - HORIZON));
      const shade = Math.max(.2, 1 / (1 + distance * .11));
      for (let x = 0; x < WIDTH; x++) {
        const camera = 2 * x / WIDTH - 1;
        const wx = model.x + distance * (cos + planeX * camera), wy = model.y + distance * (sin + planeY * camera);
        const tx = Math.floor(wx * 16), ty = Math.floor(wy * 16);
        const grout = tx % 16 === 0 || ty % 16 === 0;
        const grain = ((tx * 7 ^ ty * 13) & 3) - 2;
        const edge = tx % 16 === 1 || ty % 16 === 1;
        const level = (floor ? 68 : 43) + grain - (grout ? 18 : 0) + (edge ? 6 : 0), p = (y * WIDTH + x) * 4;
        pixels[p] = (level + (model.cleared === 2 ? 12 : 3)) * shade;
        pixels[p + 1] = level * shade;
        pixels[p + 2] = (level - 8) * shade;
        // Recessed ceiling strips give the corridors a legible sense of depth.
        if (!floor && Math.floor(wx) % 3 === 1 && (tx & 15) >= 3 && (tx & 15) <= 12 && (ty & 15) >= 6 && (ty & 15) <= 8) {
          pixels[p] = 174 * shade; pixels[p + 1] = 186 * shade; pixels[p + 2] = 165 * shade;
        }
        pixels[p + 3] = 255;
      }
    }
    for (let x = 0; x < WIDTH; x++) {
      const camera = 2 * x / WIDTH - 1, ray = model.castRay(model.x, model.y, cos + planeX * camera, sin + planeY * camera);
      this.depth[x] = ray.distance;
      const height = PROJECTION / ray.distance, top = HORIZON - height / 2;
      const texture = this.textures.get(ray.tile) ?? this.textures.get('1')!;
      const tx = Math.min(31, Math.floor(ray.u * 32));
      const shade = Math.max(.24, (ray.side ? .72 : 1) / (1 + ray.distance * .075));
      for (let y = Math.max(0, Math.floor(top)); y < Math.min(HEIGHT, Math.ceil(top + height)); y++) {
        const ty = Math.max(0, Math.min(31, Math.floor((y - top) / height * 32)));
        const source = (ty * 32 + tx) * 3, p = (y * WIDTH + x) * 4;
        pixels[p] = texture[source] * shade; pixels[p + 1] = texture[source + 1] * shade; pixels[p + 2] = texture[source + 2] * shade;
      }
    }
    this.view.ctx.putImageData(this.image, 0, 0);
    const sprites: { x: number; y: number; image: HTMLCanvasElement; height: number; float?: number }[] = [];
    for (const enemy of model.sector.enemies) sprites.push({ x: enemy.x, y: enemy.y, image: this.monsters.get(`${enemy.kind}${enemy.hit > 0 ? 'hurt' : Math.floor(model.elapsed * 5) % 2}`)!, height: enemy.health > 0 ? enemy.kind === 'brute' ? .95 : .82 : .14 });
    for (const pickup of model.sector.pickups) if (!pickup.taken) sprites.push({ ...pickup, image: this.items.get(pickup.kind)!, height: .32 });
    for (const projectile of model.projectiles) sprites.push({ ...projectile, image: this.items.get('fireball')!, height: .18, float: .35 });
    if (model.doorOpen) sprites.push({ ...model.sector.exit, image: this.items.get('portal')!, height: 1 });
    sprites.sort((a, b) => Math.hypot(b.x - model.x, b.y - model.y) - Math.hypot(a.x - model.x, a.y - model.y));
    for (const sprite of sprites) {
      const dx = sprite.x - model.x, dy = sprite.y - model.y, forward = dx * cos + dy * sin;
      if (forward < .12) continue;
      const center = WIDTH / 2 + (-dx * sin + dy * cos) / forward * PROJECTION;
      const height = PROJECTION * sprite.height / forward, width = height * sprite.image.width / sprite.image.height;
      const top = HORIZON + PROJECTION * (.5 - sprite.height - (sprite.float ?? 0)) / forward;
      for (let x = Math.max(0, Math.floor(center - width / 2)); x < Math.min(WIDTH, center + width / 2); x++) {
        if (forward >= this.depth[x]) continue;
        const sourceX = Math.min(sprite.image.width - 1, Math.max(0, Math.floor((x - center + width / 2) / width * sprite.image.width)));
        this.view.ctx.drawImage(sprite.image, sourceX, 0, 1, sprite.image.height, x, Math.round(top), 1, Math.round(height));
      }
    }
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(this.view.canvas, 0, 0, 268, 156);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 268, 156); ctx.clip();
    const kick = Math.round(Math.sin(model.recoil / .26 * Math.PI) * 3) * 2;
    const bob = Math.round(Math.sin(model.walking)) * 2;
    ctx.drawImage(this.gun, 62 + bob, 80 + kick, this.gun.width * 2, this.gun.height * 2);
    if (model.muzzleFlash > 0) {
      const mx = 134 + bob, my = 98 + kick;
      ctx.fillStyle = '#d85d24'; ctx.fillRect(mx - 10, my - 8, 20, 8); ctx.fillRect(mx - 4, my - 16, 8, 20);
      ctx.fillStyle = '#ffd36b'; ctx.fillRect(mx - 6, my - 8, 12, 8); ctx.fillRect(mx - 2, my - 12, 4, 14);
      ctx.fillStyle = '#fff3c9'; ctx.fillRect(mx - 2, my - 6, 4, 6);
    }
    ctx.fillStyle = '#d5d8bc'; ctx.fillRect(128, 78, 2, 2); ctx.fillRect(138, 78, 2, 2); ctx.fillRect(134, 74, 2, 2);
    if (model.damageFlash > 0) { ctx.fillStyle = `rgba(160,16,8,${model.damageFlash * .7})`; ctx.fillRect(0, 0, 268, 156); }
    if (model.pickupFlash > 0) { ctx.fillStyle = `rgba(216,180,80,${model.pickupFlash * .7})`; ctx.fillRect(0, 0, 268, 156); }
    ctx.restore();
    this.hud(model);
  }

  private hud(model: FpsModel) {
    const ctx = this.ctx;
    ctx.fillStyle = '#6b6a60'; ctx.fillRect(0, 156, 268, 36);
    for (let y = 157; y < 192; y += 2) for (let x = 0; x < 268; x += 2) {
      ctx.fillStyle = (x * 7 + y * 3) % 11 < 5 ? '#747368' : '#66655d'; ctx.fillRect(x, y, 2, 2);
    }
    for (const [x, width] of [[0, 43], [43, 58], [101, 34], [135, 59], [194, 40], [234, 34]]) {
      ctx.fillStyle = '#aaa596'; ctx.fillRect(x, 156, width, 2); ctx.fillRect(x, 156, 1, 36);
      ctx.fillStyle = '#34352e'; ctx.fillRect(x + width - 2, 157, 2, 35); ctx.fillRect(x, 190, width, 2);
    }
    const value = (text: string, x: number) => { ctx.font = '24px "Fusion Pixel", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#351713'; ctx.fillText(text, x + 1, 178); ctx.fillStyle = '#e54730'; ctx.fillText(text, x, 177); };
    const label = (text: string, x: number) => { ctx.font = '12px "Fusion Pixel", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#e1dac6'; ctx.fillText(text, x, 189); };
    value(String(model.ammo), 22); label(this.t('fpsAmmo'), 22);
    value(`${model.health}%`, 72); label(this.t('fpsHealth'), 72);
    ctx.drawImage(this.faces[model.health < 40 || model.damageFlash > 0 ? 1 : 0], 104, 158, 28, 32);
    value(`${model.armor}%`, 164); label(this.t('fpsArmor'), 164);
    value(String(model.remaining), 214); label(this.t('fpsEnemies'), 214);
    ctx.globalAlpha = model.key ? 1 : .25; ctx.drawImage(this.items.get('key')!, 239, 162, 24, 24); ctx.globalAlpha = 1;
  }
}
