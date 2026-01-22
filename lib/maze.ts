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

  // Generate items
  const possibleItems = [
    { name: 'Apple', icon: '🍎', tags: ['Food'] },
    { name: 'Battery', icon: '🔋', tags: ['Energy'] },
    { name: 'Gem', icon: '💎', tags: ['Treasure'] },
    { name: 'Key', icon: '🗝️', tags: ['Tool'] },
    { name: 'Potion', icon: '🧪', tags: ['Consumable'] },
    { name: 'Coin', icon: '🪙', tags: ['Treasure'] },
    { name: 'Map', icon: '🗺️', tags: ['Tool'] },
  ];

  const items: any[] = [];
  const itemCount = 8; // Increased count for testing grouping

  for (let i = 0; i < itemCount; i++) {
    let placed = false;
    while (!placed) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);

      // Must be a path, not start, and not already occupied
      if (!walls[y][x] && !(x === startX && y === startY) && !items.some(item => item.position.x === x && item.position.y === y)) {
        const template = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        items.push({
          id: `item-${i}`,
          name: template.name,
          icon: template.icon,
          type: 'item',
          tags: template.tags,
          position: { x, y }
        });
        placed = true;
      }
    }
  }

  return {
    width,
    height,
    doors: [],
    initialRobots: [{
      position: { x: startX, y: startY },
      direction: 'East',
      color: '#38bdf8',
      name: 'robot'
    }],
    walls,
    items,
    globalModule: `const robot = game.getRobot(\"robot\");\n\nexport { robot }`
  };
}
