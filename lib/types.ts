export type Direction = 'North' | 'East' | 'South' | 'West';

export interface Position {
    x: number;
    y: number;
}

export interface RunnerState {
    position: Position;
    direction: Direction;
}

export interface MazeConfig {
    width: number;
    height: number;
    start: Position;
    end: Position;
    walls: boolean[][]; // true = wall, false = path
}
