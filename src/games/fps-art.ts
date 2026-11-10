import type { EnemyKind } from './fps-model';

// Scan-converted shapes keep every edge on the pixel grid, including diagonals.
function sprite(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const poly = (color: string, points: number[][]) => {
    const top = Math.min(...points.map(p => p[1])), bottom = Math.max(...points.map(p => p[1]));
    for (let y = top; y < bottom; y++) {
      const intersections: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], scan = y + .5;
        if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan)) intersections.push(a[0] + (scan - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) rect(color, Math.round(intersections[i]), y, Math.round(intersections[i + 1]) - Math.round(intersections[i]), 1);
    }
  };
  return { canvas, rect, poly };
}

export function monster(kind: EnemyKind, step: number, hurt = false) {
  const { canvas, rect, poly } = sprite(40, 56);
  const guard = kind === 'guard', brute = kind === 'brute';
  const outline = '#171618', shadow = guard ? '#38392d' : brute ? '#4c2027' : '#412720';
  const skin = hurt ? '#df936e' : guard ? '#b48f66' : brute ? '#a84940' : '#a0704a';
  const mid = guard ? '#747652' : brute ? '#c15b46' : '#b48351';
  const light = guard ? '#a4a077' : brute ? '#dc8960' : '#d0a36c';
  const leg = guard ? '#565b41' : shadow, stride = step ? 2 : 0;
  // Feet, knees and pelvis have separate volumes, rather than a rectangular body.
  poly('#121313', [[5, 52], [13, 50], [29, 50], [35, 53], [30, 55], [7, 55]]);
  poly(outline, [[11, 32], [21, 33], [19, 45 - stride], [16, 53 - stride], [7, 53 - stride], [10, 44]]);
  poly(leg, [[12, 34], [19, 34], [16, 43], [14, 49 - stride], [10, 49 - stride], [12, 41]]);
  rect(mid, 12, 37, 4, 6); rect(shadow, 10, 44 - stride, 7, 3);
  poly(outline, [[21, 33], [30, 32], [30, 44], [33, 53], [23, 53], [21, 44]]);
  poly(leg, [[23, 35], [28, 34], [28, 43 + stride], [30, 50], [25, 50], [23, 42]]);
  rect(mid, 24, 36, 3, 7); rect(shadow, 24, 45, 6, 3);
  rect('#292525', 7, 50 - stride, 9, 3); rect('#716755', 8, 50 - stride, 5, 1);
  rect('#292525', 23, 51, 10, 3); rect('#716755', 25, 51, 5, 1);
  poly(outline, [[11, 15], [16, 13], [25, 13], [31, 16], [31, 26], [28, 36], [20, 38], [11, 35], [9, 25]]);
  poly(shadow, [[12, 17], [20, 15], [28, 17], [29, 25], [26, 35], [14, 35], [11, 26]]);
  poly(guard ? '#747853' : skin, [[12, 17], [19, 16], [20, 23], [17, 27], [12, 25]]);
  poly(mid, [[21, 16], [27, 17], [28, 24], [22, 26], [20, 23]]);
  rect(light, 13, 18, 5, 2); rect(light, 23, 18, 4, 2);
  poly(skin, [[16, 26], [20, 25], [24, 27], [24, 32], [17, 33]]);
  rect(shadow, 19, 27, 2, 6); rect(light, 17, 27, 2, 2); rect(mid, 22, 29, 2, 2);
  // Bent arms and hands; the guard holds a weapon across its chest.
  poly(outline, [[10, 16], [14, 19], [11, 26], [9, 34], [4, 34], [2, 29], [5, 20]]);
  poly(skin, [[8, 18], [12, 20], [9, 26], [8, 31], [4, 30], [5, 24]]);
  rect(light, 6, 21, 3, 4); rect(shadow, 4, 29, 4, 2); rect(mid, 4, 32, 5, 3);
  poly(outline, [[29, 15], [35, 19], [38, 29], [36, 35], [30, 34], [29, 26]]);
  poly(skin, [[30, 18], [34, 21], [36, 29], [34, 32], [31, 30], [32, 26]]);
  rect(light, 31, 20, 3, 4); rect(mid, 31, 32, 5, 3);
  // Jaw, cheek planes, brow and small bright eyes keep the face readable at distance.
  poly(outline, [[15, 4], [24, 3], [28, 7], [27, 13], [23, 17], [17, 16], [13, 11], [13, 7]]);
  poly(skin, [[16, 5], [23, 4], [26, 7], [25, 12], [22, 15], [17, 13], [15, 9]]);
  rect(light, 17, 6, 5, 2); rect(shadow, 15, 9, 4, 2); rect(shadow, 22, 8, 4, 3);
  rect(guard ? '#e0bf92' : '#ffe279', 16, 9, 2, 1); rect('#ffe279', 23, 9, 2, 1);
  rect(light, 20, 9, 2, 3); rect('#382024', 18, 13, 6, 2);
  rect('#e3c8a0', 19, 13, 4, 1);
  if (guard) {
    poly('#303b30', [[13, 6], [15, 2], [25, 2], [28, 6], [27, 8], [13, 8]]);
    rect('#8e9570', 16, 3, 8, 1); rect('#566548', 14, 5, 12, 2);
    rect('#2e3327', 12, 33, 16, 3); rect('#c0ae78', 19, 33, 3, 3);
    poly('#202426', [[8, 23], [31, 21], [34, 23], [34, 26], [22, 27], [20, 31], [16, 30], [15, 27], [8, 27]]);
    rect('#8d9893', 19, 22, 14, 1); rect('#444e4c', 23, 24, 11, 1);
    rect('#c29b70', 10, 25, 6, 4); rect('#d1ac7b', 25, 25, 5, 3);
  } else {
    poly('#7d6d56', [[14, 8], [9, 5], [9, 0], [13, 4], [16, 5]]);
    poly('#dfc9a0', [[14, 6], [11, 4], [10, 0], [13, 4], [16, 5]]);
    poly('#7d6d56', [[25, 5], [29, 3], [31, 0], [31, 6], [26, 9]]);
    poly('#e9d4ac', [[26, 5], [29, 3], [31, 0], [29, 6], [26, 7]]);
    for (const x of [4, 7, 32, 35]) rect('#dbc89c', x, 34, 1, 3);
    if (brute) {
      poly('#672e32', [[3, 17], [6, 13], [12, 14], [14, 21], [8, 23], [2, 21]]);
      poly('#672e32', [[27, 14], [33, 13], [38, 19], [36, 23], [29, 22]]);
      poly('#d1ba8e', [[4, 15], [4, 10], [8, 15], [11, 13], [10, 18]]);
      poly('#d1ba8e', [[29, 15], [32, 11], [33, 16], [37, 15], [35, 19]]);
    }
  }
  return canvas;
}

export function weapon() {
  const { canvas, rect, poly } = sprite(72, 40);
  // View from behind: narrow muzzle near the horizon, broad receiver near the eye.
  // Both barrel edges converge toward (36, 9); there is no front-facing bore.
  poly('#17191a', [[31, 9], [40, 9], [48, 31], [45, 40], [25, 40], [24, 31]]);
  poly('#3a4244', [[32, 10], [39, 10], [45, 28], [27, 28]]);
  poly('#697777', [[33, 10], [36, 10], [36, 28], [29, 28]]);
  poly('#9caaa3', [[33, 10], [34, 10], [33, 26], [31, 28]]);
  poly('#414e51', [[35, 10], [36, 10], [38, 27], [34, 27]]);
  poly('#252e32', [[37, 10], [39, 11], [45, 28], [39, 28]]);
  rect('#b4b9a6', 33, 9, 6, 1);
  rect('#11191b', 35, 7, 2, 3); rect('#a4aa94', 35, 7, 1, 1);
  // Steel bands and wood pump follow the same perspective as the barrel.
  poly('#171e20', [[29, 21], [42, 21], [43, 24], [28, 24]]);
  poly('#7e8e89', [[30, 21], [42, 21], [42, 22], [30, 22]]);
  poly('#30241e', [[27, 25], [44, 25], [48, 33], [24, 33]]);
  poly('#9c7046', [[28, 25], [42, 25], [45, 31], [25, 31]]);
  poly('#c1995d', [[29, 25], [33, 25], [31, 31], [26, 31]]);
  for (let y = 26; y <= 30; y += 2) rect('#4c3629', 28 - Math.floor((y - 26) / 2), y, 15 + (y - 26), 1);
  // Receiver: bevels, ejection slot, rear sight and shaded sides.
  poly('#171d20', [[27, 29], [43, 29], [48, 38], [47, 40], [24, 40], [23, 37]]);
  poly('#59686a', [[28, 30], [41, 30], [45, 38], [26, 38]]);
  poly('#92a19b', [[28, 30], [31, 30], [29, 38], [26, 38]]);
  poly('#303d42', [[40, 30], [43, 30], [47, 38], [44, 38]]);
  rect('#182328', 35, 32, 7, 2); rect('#a3ae9f', 35, 34, 7, 1);
  rect('#171e21', 30, 29, 3, 2); rect('#171e21', 38, 29, 3, 2);
  // Supporting hand curls under the pump; the rear hand grips from the right.
  poly('#3e302a', [[22, 27], [28, 28], [31, 33], [27, 37], [21, 40], [10, 40], [13, 34]]);
  poly('#ae7f54', [[22, 28], [27, 29], [29, 33], [24, 36], [18, 39], [13, 39], [16, 34]]);
  poly('#d2a576', [[22, 28], [26, 29], [27, 32], [23, 34], [19, 34]]);
  rect('#765039', 24, 30, 3, 1); rect('#765039', 23, 32, 4, 1);
  poly('#3f3026', [[45, 33], [51, 32], [57, 36], [61, 40], [45, 40], [42, 37]]);
  poly('#bc8a5a', [[47, 33], [51, 33], [56, 37], [58, 40], [47, 40], [44, 36]]);
  rect('#deb183', 47, 34, 5, 2); rect('#82583b', 47, 38, 8, 1);
  poly('#303c30', [[11, 37], [18, 39], [19, 40], [8, 40]]);
  poly('#303c30', [[56, 38], [61, 38], [64, 40], [57, 40]]);
  // A right-shoulder hold: the rear receiver is offset, while the muzzle stays
  // at the aiming axis. Shortening the barrel and this convergence avoid an upright silhouette.
  const held = document.createElement('canvas'); held.width = 88; held.height = 40;
  const ctx = held.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < 40; y++) ctx.drawImage(canvas, 0, y, 72, 1, Math.max(0, Math.round((y - 9) * .45)), y, 72, 1);
  return held;
}
