import { Direction, Position, RunnerState, Item, Door } from './types';

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
    private doors: Door[] = [];
    private collectedItemIds: Set<string> = new Set();

    constructor(
        initialState: RunnerState,
        walls: boolean[][],
        onUpdate: (state: RunnerState, log: string) => void,
        signal?: AbortSignal,
        items: Item[] = [],
        doors: Door[] = []
    ) {
        this.state = { ...initialState };
        this.walls = walls;
        this.onUpdate = onUpdate;
        this.signal = signal;
        this.items = items;
        this.doors = doors;

        // Initialize doorStates if not present or inconsistent
        if (!this.state.doorStates) {
            this.state.doorStates = {};
        }
        doors.forEach(d => {
            if (this.state.doorStates[d.id] === undefined) {
                this.state.doorStates[d.id] = d.isOpen;
            }
        });

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

        // Check for door logic FIRST:
        // If there is an OPEN door here, it is NOT a wall, even if walls[y][x] is true.
        const door = this.doors.find(d => d.position.x === x && d.position.y === y);
        if (door) {
            const isOpen = this.state.doorStates[door.id];
            if (isOpen) return false; // Open door = Walkable
            // If closed, it acts as a wall
            return true;
        }

        // If no door, trust the wall grid
        if (this.walls[y][x]) return true;

        return false;
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

    async echo(): Promise<number> {
        this.checkAborted();
        const { x, y } = this.state.position;
        let dx = 0;
        let dy = 0;

        switch (this.state.direction) {
            case 'North': dy = -1; break;
            case 'East': dx = 1; break;
            case 'South': dy = 1; break;
            case 'West': dx = -1; break;
        }

        let distance = 0;
        let cx = x;
        let cy = y;

        // Animate/Simulate ping delay
        this.onUpdate(this.state, `Echo ping sent...`);
        await this.wait(this.delayMs / 2);

        while (true) {
            // Move one step
            cx += dx;
            cy += dy;
            distance++;

            // Check bounds (World Wall)
            if (cy < 0 || cy >= this.walls.length || cx < 0 || cx >= this.walls[0].length) {
                // Hit world boundary
                this.onUpdate(this.state, `Echo: Wall at distance ${distance}`);
                return distance;
            }

            // Check Logic:
            // 1. Is there a Door? -> If Closed, it's an obstacle. If Open, it's explicitly NOT an obstacle (pass through).
            // 2. Is there a Wall? -> If yes (and no open door overriding it), it's an obstacle.

            const door = this.doors.find(d => d.position.x === cx && d.position.y === cy);
            if (door) {
                // If door is closed, we hit it.
                // If door is open, we pass through (ignoring wall check below because door exists there)
                if (!this.state.doorStates[door.id]) {
                    this.onUpdate(this.state, `Echo: Closed Door at distance ${distance}`);
                    return distance;
                }
                // Implicit else: Door is open, so we CONTINUE (skip wall check effectively)
            } else {
                // Only check wall if NO door exists at this tile
                if (this.walls[cy][cx]) {
                    this.onUpdate(this.state, `Echo: Wall at distance ${distance}`);
                    return distance;
                }
            }

            // Check for Item
            const item = this.items.find(i =>
                i.position.x === cx &&
                i.position.y === cy &&
                !this.collectedItemIds.has(i.id)
            );
            if (item) {
                this.onUpdate(this.state, `Echo: ${item.name} at distance ${distance}`);
                return distance;
            }

            // Limit distance infinite loop just in case
            if (distance > Math.max(this.walls.length, this.walls[0].length)) {
                return distance;
            }
        }
    }

    async scan(): Promise<Item | Door | null> {
        this.checkAborted();
        const { x, y } = this.state.position;
        let scanX = x;
        let scanY = y;

        console.log(this.state.direction);
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

        const doorAtPos = this.doors.find(d => d.position.x === scanX && d.position.y === scanY);

        await this.wait(this.delayMs / 2);

        if (doorAtPos) {
            const state = this.state.doorStates[doorAtPos.id] ? 'Open' : 'Closed';
            this.onUpdate(this.state, `Scanned ahead: Door (${state})`);
            // We return a door object but user might need to differentiate?
            // User code expects Item usually, so this is a breaking change for types if users typed scan return.
            // But JS users are fine.
            return { ...doorAtPos, isOpen: this.state.doorStates[doorAtPos.id] };
        }

        if (itemAtPos) {
            this.onUpdate(this.state, `Scanned ahead: ${itemAtPos.name} (tags: ${itemAtPos.tags.join(', ')})`);
            return itemAtPos;
        } else {
            this.onUpdate(this.state, `Scanned ahead: Nothing`);
            return null;
        }
    }

    async openDoor() {
        this.checkAborted();
        const { x, y } = this.state.position;
        let targetX = x;
        let targetY = y;

        switch (this.state.direction) {
            case 'North': targetY -= 1; break;
            case 'East': targetX += 1; break;
            case 'South': targetY += 1; break;
            case 'West': targetX -= 1; break;
        }

        const door = this.doors.find(d => d.position.x === targetX && d.position.y === targetY);
        if (door) {
            if (this.state.doorStates[door.id]) {
                this.onUpdate(this.state, "Door is already open.");
            } else {
                this.state.doorStates = { ...this.state.doorStates, [door.id]: true };
                this.onUpdate({ ...this.state }, "Opened door.");
            }
        } else {
            this.onUpdate(this.state, "No door to open.");
        }
        await this.wait(this.delayMs);
    }

    async closeDoor() {
        this.checkAborted();
        const { x, y } = this.state.position;
        let targetX = x;
        let targetY = y;

        switch (this.state.direction) {
            case 'North': targetY -= 1; break;
            case 'East': targetX += 1; break;
            case 'South': targetY += 1; break;
            case 'West': targetX -= 1; break;
        }

        const door = this.doors.find(d => d.position.x === targetX && d.position.y === targetY);
        // Can't close if we are standing on it?
        // Actually physically we typically shouldn't close a door we are IN, but let's allow it for simplicity or check?
        // If we close it while inside, isWall check will fail next time we try to move out?
        // Let's prevent closing if we are ON the door.

        // Wait, Close door is usually "ahead".
        // If we are "in front" of it.

        if (door) {
            if (door.position.x === x && door.position.y === y) {
                this.onUpdate(this.state, "Cannot close door while standing in it!");
                await this.wait(this.delayMs);
                return;
            }

            if (!this.state.doorStates[door.id]) {
                this.onUpdate(this.state, "Door is already closed.");
            } else {
                this.state.doorStates = { ...this.state.doorStates, [door.id]: false };
                this.onUpdate({ ...this.state }, "Closed door.");
            }
        } else {
            this.onUpdate(this.state, "No door to close.");
        }
        await this.wait(this.delayMs);
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

    get direction(): Direction {
        return this.state.direction;
    }

    getRemainingItems(): Item[] {
        return this.items.filter(item => !this.collectedItemIds.has(item.id));
    }

    setSpeed(delay: number) {
        this.delayMs = delay;
    }
}
