import { Direction, Position, RunnerState, Item } from './types';

export class CancelError extends Error {
    constructor(message: string = 'Execution cancelled') {
        super(message);
        this.name = 'CancelError';
    }
}

export class CrashError extends Error {
    constructor(message: string = 'Robot crashed') {
        super(message);
        this.name = 'CrashError';
    }
}

export class RobotController {
    private state: RunnerState;
    private walls: boolean[][];
    private onUpdate: (state: RunnerState, log: string) => void;
    private delayMs: number = 500;
    private signal?: AbortSignal;

    private items: Item[] = [];
    private collectedItemIds: Set<string> = new Set();

    constructor(
        initialState: RunnerState,
        walls: boolean[][],
        onUpdate: (state: RunnerState, log: string) => void,
        signal?: AbortSignal,
        items: Item[] = []
    ) {
        this.state = { ...initialState };
        this.walls = walls;
        this.onUpdate = onUpdate;
        this.signal = signal;
        this.items = items;
        // Initialize collected based on initial state if needed
        this.state.inventory.forEach(item => this.collectedItemIds.add(item.id));
    }

    private checkAborted() {
        if (this.signal?.aborted) {
            throw new CancelError();
        }
    }

    private async wait(ms: number) {
        this.checkAborted();
        // We can support immediate abort logic during the wait
        // using Promise.race if we really want to be responsive,
        // but checking before/after is usually okay for small delays.
        // Better: use a promise that rejects on abort.

        return new Promise<void>((resolve, reject) => {
            if (this.signal?.aborted) return reject(new CancelError());

            const timer = setTimeout(() => {
                resolve();
            }, ms);

            this.signal?.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new CancelError());
            });
        });
    }

    private isWall(x: number, y: number): boolean {
        if (y < 0 || y >= this.walls.length || x < 0 || x >= this.walls[0].length) return true;
        return this.walls[y][x];
    }

    async canMoveForward(): Promise<boolean> {
        this.checkAborted();
        const { x, y } = this.state.position;
        let newX = x;
        let newY = y;

        switch (this.state.direction) {
            case 'North': newY -= 1; break;
            case 'East': newX += 1; break;
            case 'South': newY += 1; break;
            case 'West': newX -= 1; break;
        }

        // Simulate a small delay for "sensing"
        await this.wait(this.delayMs / 2);

        return !this.isWall(newX, newY);
    }

    async moveForward() {
        this.checkAborted();

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
            // Crash!
            throw new CrashError(`Crashed at ${newX}, ${newY}`);
        }

        this.state.position = { x: newX, y: newY };
        this.onUpdate({ ...this.state }, `Moved to ${newX}, ${newY}`);
        await this.wait(this.delayMs);
        return true;
    }

    async pickup(): Promise<Item | null> {
        this.checkAborted();
        const { x, y } = this.state.position;

        // Check for items
        const itemAtPos = this.items.find(item =>
            item.position.x === x &&
            item.position.y === y &&
            !this.collectedItemIds.has(item.id)
        );

        if (itemAtPos) {
            this.collectedItemIds.add(itemAtPos.id);
            this.state.inventory = [...this.state.inventory, itemAtPos];
            this.onUpdate({ ...this.state }, `Collected ${itemAtPos.icon} ${itemAtPos.name}!`);
            await this.wait(this.delayMs);
            return itemAtPos;
        } else {
            this.onUpdate({ ...this.state }, `Nothing to pick up here.`);
            await this.wait(this.delayMs / 2);
            return null;
        }
    }

    async scan(): Promise<Item | null> {
        this.checkAborted();
        const { x, y } = this.state.position;
        let scanX = x;
        let scanY = y;

        switch (this.state.direction) {
            case 'North': scanY -= 1; break;
            case 'East': scanX += 1; break;
            case 'South': scanY += 1; break;
            case 'West': scanX -= 1; break;
        }

        const itemAtPos = this.items.find(item =>
            item.position.x === scanX &&
            item.position.y === scanY &&
            !this.collectedItemIds.has(item.id)
        );

        await this.wait(this.delayMs / 2);

        if (itemAtPos) {
            this.onUpdate(this.state, `Scanned ahead: ${itemAtPos.name} (${itemAtPos.type})`);
            return itemAtPos;
        } else {
            this.onUpdate(this.state, `Scanned ahead: Nothing`);
            return null;
        }
    }

    async turnLeft() {
        this.checkAborted();
        const dirs: Direction[] = ['North', 'West', 'South', 'East']; // Counter-clockwise
        const idx = dirs.indexOf(this.state.direction);
        this.state.direction = dirs[(idx + 1) % 4];
        this.onUpdate({ ...this.state }, `Turned Left to ${this.state.direction}`);
        await this.wait(this.delayMs);
    }

    async turnRight() {
        this.checkAborted();
        const dirs: Direction[] = ['North', 'East', 'South', 'West']; // Clockwise
        const idx = dirs.indexOf(this.state.direction);
        this.state.direction = dirs[(idx + 1) % 4];
        this.onUpdate({ ...this.state }, `Turned Right to ${this.state.direction}`);
        await this.wait(this.delayMs);
    }

    getRemainingItems(): Item[] {
        return this.items.filter(item => !this.collectedItemIds.has(item.id));
    }
}
