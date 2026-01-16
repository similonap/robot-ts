import { Direction, Position, RunnerState } from './types';

export class RobotController {
    private state: RunnerState;
    private walls: boolean[][];
    private onUpdate: (state: RunnerState, log: string) => void;
    private delayMs: number = 500;

    constructor(
        initialState: RunnerState,
        walls: boolean[][],
        onUpdate: (state: RunnerState, log: string) => void
    ) {
        this.state = { ...initialState };
        this.walls = walls;
        this.onUpdate = onUpdate;
    }

    private async wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private isWall(x: number, y: number): boolean {
        if (y < 0 || y >= this.walls.length || x < 0 || x >= this.walls[0].length) return true;
        return this.walls[y][x];
    }

    async moveForward() {
        const { x, y } = this.state.position;
        let newX = x;
        let newY = y;

        switch (this.state.direction) {
            case 'North': newY -= 1; break;
            case 'East': newX += 1; break;
            case 'South': newY += 1; break;
            case 'West': newX -= 1; break;
        }

        if (this.isWall(newX, newY)) {
            this.onUpdate(this.state, `Bump! Wall at ${newX}, ${newY}`);
            await this.wait(this.delayMs);
            return false;
        }

        this.state.position = { x: newX, y: newY };
        this.onUpdate({ ...this.state }, `Moved to ${newX}, ${newY}`);
        await this.wait(this.delayMs);
        return true;
    }

    async turnLeft() {
        const dirs: Direction[] = ['North', 'West', 'South', 'East']; // Counter-clockwise
        const idx = dirs.indexOf(this.state.direction);
        this.state.direction = dirs[(idx + 1) % 4];
        this.onUpdate({ ...this.state }, `Turned Left to ${this.state.direction}`);
        await this.wait(this.delayMs);
    }

    async turnRight() {
        const dirs: Direction[] = ['North', 'East', 'South', 'West']; // Clockwise
        const idx = dirs.indexOf(this.state.direction);
        this.state.direction = dirs[(idx + 1) % 4];
        this.onUpdate({ ...this.state }, `Turned Right to ${this.state.direction}`);
        await this.wait(this.delayMs);
    }
}
