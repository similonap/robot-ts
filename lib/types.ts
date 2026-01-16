export type Direction = 'North' | 'East' | 'South' | 'West';

export interface Position {
    x: number;
    y: number;
}

export interface Item {
    id: string;
    name: string;
    emoji: string;
    type: string;
    position: Position;
}

export interface RunnerState {
    position: Position;
    direction: Direction;
    inventory: Item[];
}

export interface MazeConfig {
    width: number;
    height: number;
    start: Position;
    walls: boolean[][]; // true = wall, false = path
    items: Item[];
}
