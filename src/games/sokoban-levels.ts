// SPDX-License-Identifier: Apache-2.0
// Adapted from Boxoban hard/000.txt, Arthur Guez et al. (2018).
// Changes: remove solid-wall margins; transpose source puzzles 6 and 47.
// Playable cells, boxes, goals and connectivity are preserved.
// Source records, attribution and license: third-party/boxoban/.
export const SOKOBAN_LEVELS: readonly (readonly string[])[] = [
  // Source puzzle 6 (zero-based): minimum 27 pushes.
  [
    '#########',
    '#   ##  #',
    '# $$ .$ #',
    '#  #  . #',
    '# . ##$ #',
    '# @ ## .#',
    '# ##### #',
    '#########',
  ],
  // Source puzzle 47: minimum 20 pushes.
  [
    '##########',
    '# $   .###',
    '#@$  . .##',
    '### .$$  #',
    '####  #  #',
    '######## #',
    '##########',
  ],
  // Source puzzle 7: minimum 21 pushes.
  [
    '##########',
    '# @.     #',
    '#  $ # $.#',
    '# $####$ #',
    '#. ####  #',
    '# ######.#',
    '# ########',
    '##########',
  ],
  // Source puzzle 27: minimum 20 pushes.
  [
    '##########',
    '####### ##',
    '####.@ $ #',
    '#### $$ .#',
    '#####$ #.#',
    '#.       #',
    '##########',
  ],
  // Source puzzle 17: minimum 19 pushes.
  [
    '##########',
    '# .  .   #',
    '#$$ $  $.#',
    '#.#####  #',
    '# ######@#',
    '##########',
  ],
];
