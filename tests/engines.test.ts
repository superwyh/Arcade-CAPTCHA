import { describe, expect, it } from 'vitest';
import { canMove, moveBoard, slideLine } from '../src/games/merge';
import { clearLines, collides, rotatePiece, TETROMINOES } from '../src/games/tetris';
import { MineBoard, minesweeperGame } from '../src/games/minesweeper';
import { BreakoutModel, breakoutGame } from '../src/games/breakout';

describe('2048 rules', () => {
  it('merges each tile only once per turn', () => {
    expect(slideLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], score: 8 });
    expect(slideLine([2, 2, 4, 0])).toEqual({ line: [4, 4, 0, 0], score: 4 });
  });
  it('compresses gaps before merging', () => expect(slideLine([2, 0, 2, 4])).toEqual({ line: [4, 4, 0, 0], score: 4 }));
  it('moves down and right without changing the source board', () => {
    const board = [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const down = moveBoard(board, 'down');
    expect(down.board[12]).toBe(4); expect(down.score).toBe(4); expect(board[0]).toBe(2);
    expect(moveBoard(board, 'right').board[3]).toBe(2);
  });
  it('distinguishes a full playable board from game over', () => {
    const blocked = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(canMove(blocked)).toBe(false);
    expect(canMove([2, 2, ...blocked.slice(2)])).toBe(true);
  });
  it('does not count an unchanged move as a turn', () => {
    const board = [2, 0, 0, 0, ...Array(12).fill(0)];
    expect(moveBoard(board, 'left').changed).toBe(false);
  });
});

describe('Tetris rules', () => {
  it('rotates every piece back to its original shape', () => {
    for (const piece of TETROMINOES) expect(rotatePiece(rotatePiece(rotatePiece(rotatePiece(piece))))).toEqual(piece);
  });
  it('removes full rows and preserves the board height', () => {
    const board = [Array(10).fill(0), Array(10).fill(1), Array(10).fill(1)];
    const result = clearLines(board);
    expect(result.cleared).toBe(2); expect(result.score).toBe(300); expect(result.board.length).toBe(3);
    expect(result.board.flat().every(value => value === 0)).toBe(true);
  });
  it('blocks movement through walls, floor and occupied cells', () => {
    const board = Array.from({ length: 16 }, () => Array(10).fill(0)); board[15][4] = 1;
    expect(collides(board, [[1, 1]], 9, 0)).toBeTruthy();
    expect(collides(board, [[1]], -1, 0)).toBeTruthy();
    expect(collides(board, [[1]], 4, 16)).toBeTruthy();
    expect(collides(board, [[1]], 4, 15)).toBeTruthy();
    expect(collides(board, [[1]], 3, 15)).toBeFalsy();
  });
});

describe('Minesweeper rules', () => {
  it('never completes the default challenge on the opening, including constant random sources', () => {
    for (const random of [() => 0, () => .37, () => .999999, Math.random]) {
      for (let first = 0; first < 48; first++) {
        const board = new MineBoard(random);
        expect(board.reveal(first)).toBe(true);
        expect(board.revealed.size).toBeLessThan(minesweeperGame.defaultTarget);
        expect(board.revealed.size).toBeGreaterThan(1);
        expect(board.mines.size).toBe(8);
        expect([first, ...board.neighbors(first)].some(index => board.mines.has(index))).toBe(false);
        for (let i = 0; i < 48; i++) if (!board.mines.has(i)) board.reveal(i);
        expect(board.revealed.size).toBe(40);
      }
    }
  });
  it('keeps every possible first click and its neighbors safe', () => {
    for (let first = 0; first < 48; first++) {
      const board = new MineBoard(() => .37);
      expect(board.reveal(first)).toBe(true);
      expect(board.mines.size).toBe(8);
      expect([first, ...board.neighbors(first)].some(index => board.mines.has(index))).toBe(false);
      expect([...board.revealed].some(index => board.mines.has(index))).toBe(false);
    }
  });
  it('does not reveal flags, count cells twice, or allow more than 8 flags', () => {
    const board = new MineBoard(() => .5);
    for (let i = 0; i < 10; i++) board.toggleFlag(i);
    expect(board.flags.size).toBe(8);
    board.reveal(0); expect(board.initialized).toBe(false);
    board.toggleFlag(0); board.reveal(0);
    const score = board.revealed.size; board.reveal(0); expect(board.revealed.size).toBe(score);
  });
  it('ends on a mine and can reveal all 40 safe cells', () => {
    const board = new MineBoard(() => .25); board.reveal(0);
    expect(board.reveal([...board.mines][0])).toBe(false);
    for (let i = 0; i < 48; i++) if (!board.mines.has(i)) board.reveal(i);
    expect(board.revealed.size).toBe(40);
    expect(minesweeperGame.defaultTarget).toBe(board.width * board.height - board.mineCount);
  });
  it('does not wrap neighbors across row boundaries', () => expect(new MineBoard().neighbors(7)).toEqual([6, 14, 15]));
});

describe('Breakout physics', () => {
  it('does not complete the default challenge without moving the paddle', () => {
    for (const fps of [25, 60, 144]) {
      const model = new BreakoutModel();
      for (let frame = 0; frame < fps * 30 && model.lives > 0; frame++) model.tick(1 / fps);
      expect(model.score).toBeLessThan(breakoutGame.defaultTarget);
      expect(model.lives).toBe(0);
      model.tick(1); expect(model.lives).toBe(0);
    }
  });
  it('can reach the default target with paddle control', () => {
    const model = new BreakoutModel();
    for (let frame = 0; frame < 60 * 120 && model.score < breakoutGame.defaultTarget; frame++) {
      model.movePaddle(model.x - Math.sin(frame / 300) * 22);
      model.tick(1 / 60);
    }
    expect(model.score).toBeGreaterThanOrEqual(breakoutGame.defaultTarget);
    expect(model.bricks.every(brick => !brick.active)).toBe(true);
    expect(model.lives).toBe(3);
  });
  it('scores a brick once and reflects the ball', () => {
    const model = new BreakoutModel(); model.x = 24; model.y = 63; model.vx = 0; model.vy = -100;
    model.tick(.02); expect(model.score).toBe(10); expect(model.vy).toBe(100);
    model.tick(.02); expect(model.score).toBe(10);
  });
  it('bounces off the paddle upward and respects paddle bounds', () => {
    const model = new BreakoutModel(); model.x = model.paddle; model.y = 164; model.vy = 100;
    model.tick(.02); expect(model.vy).toBeLessThan(0);
    model.movePaddle(-100); expect(model.paddle).toBe(27);
    model.movePaddle(900); expect(model.paddle).toBe(241);
  });
  it('consumes a life on a miss and resets the ball', () => {
    const model = new BreakoutModel(); model.y = 195; model.vy = 100;
    model.tick(.02); expect(model.lives).toBe(2); expect(model.y).toBe(151); expect(model.vy).toBeLessThan(0);
  });
});
