import { MazeConfig, Position } from './types';

export function generateMaze(width: number, height: number): MazeConfig {
  // Simple Recursive Backtracker for maze generation
  const walls: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(true));

  function carve(x: number, y: number) {
    walls[y][x] = false;

    const directions = [
      [0, -2], // North
      [2, 0],  // East
      [0, 2],  // South
      [-2, 0]  // West
    ].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && walls[ny][nx]) {
        walls[y + dy / 2][x + dx / 2] = false; // Carve wall between
        carve(nx, ny);
      }
    }
  }

  // Ensure odd dimensions for walls
  const startX = 1;
  const startY = 1;
  carve(startX, startY);

  return {
    width,
    height,
    start: { x: startX, y: startY },
    end: { x: width - 2, y: height - 2 },
    walls
  };
}
