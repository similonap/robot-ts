import { Direction, Position, RunnerState, Item, Door, OpenResult, SharedWorldState, RobotAppearance, RobotState, RobotCommand } from './types';

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

export class HealthDepletedError extends Error {
    constructor(message: string = 'Robot health depleted') {
        super(message);
        this.name = 'HealthDepletedError';
    }
}

// RobotState imported from types.ts

export class RobotController {
    // We keep a local state for the robot specific properties
    private robotState: RobotState;
    private world: SharedWorldState;
    private walls: boolean[][];
    private onUpdate: (state: RobotState, log: string) => void;
    private delayMs: number = 500;
    private signal?: AbortSignal;

    // We still need reference to static definitions
    private items: Item[] = [];
    private doors: Door[] = [];
    private listeners: Record<string, ((payload?: any) => void)[]> = {};
    private checkGameOver: () => boolean;

    constructor(
        initialState: RobotState,
        walls: boolean[][],
        world: SharedWorldState,
        onUpdate: (state: RobotState, log: string) => void,
        signal?: AbortSignal,
        items: Item[] = [],
        doors: Door[] = [],
        checkGameOver: () => boolean = () => true
    ) {
        this.robotState = { ...initialState };
        this.walls = walls;
        this.world = world;
        this.onUpdate = onUpdate;
        this.signal = signal;
        this.items = items;
        this.doors = doors;
        this.checkGameOver = checkGameOver;

        // Ensure speed is set
        if (this.robotState.speed === undefined) {
            this.robotState.speed = this.delayMs;
        } else {
            this.delayMs = this.robotState.speed;
        }

        // Ensure health is set
        if (this.robotState.health === undefined) {
            this.robotState.health = 100;
        }

        // Initialize trail
        if (!this.robotState.trail) {
            this.robotState.trail = [];
        }
    }

    private checkAborted() {
        if (this.signal?.aborted) {
            throw new CancelError();
        }
    }

    private async wait(ms: number) {
        this.checkAborted();
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
        const door = this.doors.find(d => d.position.x === x && d.position.y === y);
        if (door) {
            const isOpen = this.world.isDoorOpen(door.id);
            if (isOpen) return false; // Open door = Walkable
            return true;
        }

        // If no door, trust the wall grid
        if (this.walls[y][x]) return true;

        return false;
    }

    private emit(event: string, payload?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(handler => handler(payload));
        }
    }

    addEventListener(event: string, handler: (payload?: any) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(handler);
    }

    get position(): Position {
        return { ...this.robotState.position };
    }

    get health(): number {
        return this.robotState.health;
    }

    get direction(): Direction {
        return this.robotState.direction;
    }

    get color(): string {
        return this.robotState.color || '#38bdf8';
    }

    get isDestroyed(): boolean {
        return !!this.robotState.isDestroyed;
    }

    get inventory(): Item[] {
        return [...this.robotState.inventory];
    }

    // Helper to get inventory IDs for checking against locks
    private get inventoryIds(): Set<string> {
        return new Set(this.robotState.inventory.map(i => i.id));
    }

    getRemainingItems(): Item[] {
        // This is world global remaining items
        return this.items.filter(item => !this.world.isItemCollected(item.id));
    }

    async canMoveForward(): Promise<boolean> {
        this.checkAborted();
        const { x, y } = this.robotState.position;
        let newX = x;
        let newY = y;

        switch (this.robotState.direction) {
            case 'North': newY -= 1; break;
            case 'East': newX += 1; break;
            case 'South': newY += 1; break;
            case 'West': newX -= 1; break;
        }

        await this.wait(this.delayMs / 2);
        return !this.isWall(newX, newY);
    }

    async moveForward() {
        this.checkAborted();

        const { x, y } = this.robotState.position;
        let newX = x;
        let newY = y;

        switch (this.robotState.direction) {
            case 'North': newY -= 1; break;
            case 'East': newX += 1; break;
            case 'South': newY += 1; break;
            case 'West': newX -= 1; break;
        }

        if (this.isWall(newX, newY)) {
            this.onUpdate(this.robotState, `Bump! Wall at ${newX}, ${newY}`);
            throw new CrashError(`Crashed at ${newX}, ${newY}`);
        }

        this.robotState.position = { x: newX, y: newY };

        // Check for hidden items at new position to reveal them
        const hiddenItemsHere = this.items.filter(item =>
            item.position.x === newX &&
            item.position.y === newY &&
            item.isRevealed === false &&
            !this.world.isItemRevealed(item.id)
        );

        if (this.robotState.pen) {
            this.robotState.trail = [
                ...(this.robotState.trail || []),
                {
                    x1: x,
                    y1: y,
                    x2: newX,
                    y2: newY,
                    color: this.robotState.pen.color,
                    size: this.robotState.pen.size,
                    opacity: this.robotState.pen.opacity
                }
            ];
        }

        if (hiddenItemsHere.length > 0) {
            hiddenItemsHere.forEach(item => this.world.revealItem(item.id));
            this.world.flushUpdates(); // Ensure UI knows about reveal
            this.onUpdate({ ...this.robotState }, `Moved to ${newX}, ${newY}. Revealed ${hiddenItemsHere.map(i => i.name).join(', ')}!`);
        } else {
            this.onUpdate({ ...this.robotState }, `Moved to ${newX}, ${newY}`);
        }

        if (this.robotState.health <= 0) {
            throw new HealthDepletedError();
        }

        this.emit('move', { x: newX, y: newY });
        await this.wait(this.delayMs);
        return true;
    }

    async pickup(): Promise<Item | null> {
        this.checkAborted();
        const { x, y } = this.robotState.position;

        // Check for items
        const itemAtPos = this.items.find(item =>
            item.position.x === x &&
            item.position.y === y &&
            !this.world.isItemCollected(item.id)
        );

        if (itemAtPos) {
            this.world.collectItem(itemAtPos.id);
            // Add to local inventory
            this.robotState.inventory = [...this.robotState.inventory, itemAtPos];

            this.world.flushUpdates();
            this.onUpdate({ ...this.robotState }, `Collected ${itemAtPos.icon} ${itemAtPos.name}!`);
            this.emit('pickup', itemAtPos);
            await this.wait(this.delayMs);
            return itemAtPos;
        } else {
            this.onUpdate({ ...this.robotState }, `Nothing to pick up here.`);
            await this.wait(this.delayMs / 2);
            return null;
        }
    }

    async echo(): Promise<number> {
        this.checkAborted();
        const { x, y } = this.robotState.position;
        let dx = 0;
        let dy = 0;

        switch (this.robotState.direction) {
            case 'North': dy = -1; break;
            case 'East': dx = 1; break;
            case 'South': dy = 1; break;
            case 'West': dx = -1; break;
        }

        let distance = 0;
        let cx = x;
        let cy = y;

        // PRE-CALCULATE Distance
        while (true) {
            cx += dx;
            cy += dy;
            distance++;

            // Check bounds (World Wall)
            if (cy < 0 || cy >= this.walls.length || cx < 0 || cx >= this.walls[0].length) {
                break;
            }

            const door = this.doors.find(d => d.position.x === cx && d.position.y === cy);
            if (door) {
                if (!this.world.isDoorOpen(door.id)) {
                    break;
                }
            } else {
                if (this.walls[cy][cx]) {
                    break;
                }
            }

            const item = this.items.find(i =>
                i.position.x === cx &&
                i.position.y === cy &&
                !this.world.isItemCollected(i.id)
            );
            if (item) {
                break;
            }

            if (distance > Math.max(this.walls.length, this.walls[0].length)) {
                break;
            }
        }

        // Trigger Echo Wave Animation
        this.robotState.echoWave = {
            x: x,
            y: y,
            direction: this.robotState.direction,
            distance: distance,
            timestamp: Date.now()
        };
        this.onUpdate({ ...this.robotState }, `Echo ping sent...`);

        await this.wait(this.delayMs);

        // Log result & Trigger Hit Animation
        let hitType = "Nothing";
        let hitSomething = false;

        if (cy < 0 || cy >= this.walls.length || cx < 0 || cx >= this.walls[0].length) {
            hitType = "World Boundary";
            hitSomething = true;
        } else {
            const door = this.doors.find(d => d.position.x === cx && d.position.y === cy);
            const item = this.items.find(i => i.position.x === cx && i.position.y === cy && !this.world.isItemCollected(i.id));

            if (door && !this.world.isDoorOpen(door.id)) {
                hitType = "Closed Door";
                hitSomething = true;
            } else if (item) {
                hitType = item.name;
                hitSomething = true;
            } else if (this.walls[cy][cx]) {
                hitType = "Wall";
                hitSomething = true;
            }
        }

        if (hitSomething) {
            this.robotState.echoHit = {
                x: cx,
                y: cy,
                timestamp: Date.now()
            };
        }

        this.onUpdate({ ...this.robotState }, `Echo: ${hitType} at distance ${distance}`);

        // Clean up animation state after a short delay (optional, but good for state cleanliness)
        // We do this asynchronously so we don't block the return
        setTimeout(() => {
            // Only clear if timestamp matches to avoid clearing a generic new echo?
            // Actually, for React state updates, it's safer to just leave it until next update or clear it.
            // But we don't have a mechanism to push a background update effectively without causing re-renders.
            // The timestamp key in MazeDisplay handles the re-triggering.
            // We can leave it, or clear it. Clearing it might trigger a re-render.
            // Let's leave it for now.
        }, 1000);

        return distance;
    }

    async scan(): Promise<Item | Door | null> {
        this.checkAborted();
        const { x, y } = this.robotState.position;
        let scanX = x;
        let scanY = y;

        switch (this.robotState.direction) {
            case 'North': scanY -= 1; break;
            case 'East': scanX += 1; break;
            case 'South': scanY += 1; break;
            case 'West': scanX -= 1; break;
        }

        const itemAtPos = this.items.find(item =>
            item.position.x === scanX &&
            item.position.y === scanY &&
            !this.world.isItemCollected(item.id)
        );

        const doorAtPos = this.doors.find(d => d.position.x === scanX && d.position.y === scanY);

        await this.wait(this.delayMs / 2);

        if (doorAtPos) {
            const isOpen = this.world.isDoorOpen(doorAtPos.id);
            const state = isOpen ? 'Open' : 'Closed';
            this.onUpdate(this.robotState, `Scanned ahead: Door (${state})`);
            return { ...doorAtPos, isOpen };
        }

        if (itemAtPos) {
            if (itemAtPos.isRevealed === false && !this.world.isItemRevealed(itemAtPos.id)) {
                this.world.revealItem(itemAtPos.id);
                this.world.flushUpdates();
                this.onUpdate(this.robotState, `Scanned ahead: ${itemAtPos.name} (Revealed!)`);
            } else {
                this.onUpdate(this.robotState, `Scanned ahead: ${itemAtPos.name}`);
            }
            return itemAtPos;
        } else {
            this.onUpdate(this.robotState, `Scanned ahead: Nothing`);
            return null;
        }
    }

    async openDoor(key?: string | Item | Item[]): Promise<OpenResult> {
        this.checkAborted();
        const { x, y } = this.robotState.position;
        let targetX = x;
        let targetY = y;

        switch (this.robotState.direction) {
            case 'North': targetY -= 1; break;
            case 'East': targetX += 1; break;
            case 'South': targetY += 1; break;
            case 'West': targetX -= 1; break;
        }

        const door = this.doors.find(d => d.position.x === targetX && d.position.y === targetY);
        if (door) {
            if (this.world.isDoorOpen(door.id)) {
                const msg = "Door is already open.";
                this.onUpdate(this.robotState, msg);
                await this.wait(this.delayMs);
                return { success: true, message: msg };
            }

            // Check Lock
            if (door.lock) {
                if (door.lock.type === 'password') {
                    if (typeof key !== 'string') {
                        const msg = `Door is locked (password required).`;
                        this.onUpdate(this.robotState, msg);
                        await this.wait(this.delayMs);
                        return { success: false, message: msg, requiredAuth: 'PASSWORD' };
                    }
                    if (key !== door.lock.value) {
                        const msg = `Incorrect password for door.`;
                        this.onUpdate(this.robotState, msg);
                        await this.wait(this.delayMs);
                        return { success: false, message: msg, requiredAuth: 'PASSWORD' };
                    }
                } else if (door.lock.type === 'item') {
                    const requiredItemIds = door.lock.itemIds;
                    const providedItems = Array.isArray(key) ? key : (key ? [key] : []);
                    const providedItemObjects = providedItems.filter(i => typeof i === 'object' && 'id' in i);
                    const providedIds = new Set(providedItemObjects.map(i => i.id));

                    const missingRequiredIds = requiredItemIds.filter(id => !providedIds.has(id));

                    if (missingRequiredIds.length > 0) {
                        const missingNames = missingRequiredIds.map(id => {
                            const item = this.items.find(i => i.id === id);
                            return item ? item.name : 'Unknown Item';
                        });

                        const msg = `You did not provide the correct items. Missing: ${missingNames.join(', ')}`;
                        this.onUpdate(this.robotState, msg);
                        await this.wait(this.delayMs);
                        return {
                            success: false,
                            message: msg,
                            requiredAuth: 'ITEMS',
                            missingItems: missingRequiredIds
                        };
                    }

                    // Check if Provided Items are in Inventory
                    const inventoryIds = this.inventoryIds;
                    const missingFromInventory = providedItemObjects.filter(i => !inventoryIds.has(i.id));

                    if (missingFromInventory.length > 0) {
                        const msg = `You don't have these items in your inventory: ${missingFromInventory.map(i => i.name).join(', ')}`;
                        this.onUpdate(this.robotState, msg);
                        await this.wait(this.delayMs);
                        return { success: false, message: msg, requiredAuth: 'ITEMS' };
                    }
                }
            }

            this.world.openDoor(door.id);
            this.world.flushUpdates();
            this.onUpdate({ ...this.robotState }, "Opened door.");
            await this.wait(this.delayMs);
            return { success: true, message: "Opened door." };
        } else {
            const msg = "No door to open.";
            this.onUpdate(this.robotState, msg);
            await this.wait(this.delayMs);
            return { success: false, message: msg };
        }
    }

    async closeDoor() {
        this.checkAborted();
        const { x, y } = this.robotState.position;
        let targetX = x;
        let targetY = y;

        switch (this.robotState.direction) {
            case 'North': targetY -= 1; break;
            case 'East': targetX += 1; break;
            case 'South': targetY += 1; break;
            case 'West': targetX -= 1; break;
        }

        const door = this.doors.find(d => d.position.x === targetX && d.position.y === targetY);

        if (door) {
            if (door.position.x === x && door.position.y === y) {
                this.onUpdate(this.robotState, "Cannot close door while standing in it!");
                await this.wait(this.delayMs);
                return;
            }

            if (!this.world.isDoorOpen(door.id)) {
                this.onUpdate(this.robotState, "Door is already closed.");
            } else {
                this.world.closeDoor(door.id);
                this.world.flushUpdates();
                this.onUpdate({ ...this.robotState }, "Closed door.");
            }
        } else {
            this.onUpdate(this.robotState, "No door to close.");
        }
        await this.wait(this.delayMs);
    }

    async turnLeft() {
        this.checkAborted();
        const dirs: Direction[] = ['North', 'West', 'South', 'East'];
        const idx = dirs.indexOf(this.robotState.direction);
        this.robotState.direction = dirs[(idx + 1) % 4];
        this.onUpdate({ ...this.robotState }, `Turned Left to ${this.robotState.direction}`);
        await this.wait(this.delayMs);
    }

    async turnRight() {
        this.checkAborted();
        const dirs: Direction[] = ['North', 'East', 'South', 'West'];
        const idx = dirs.indexOf(this.robotState.direction);
        this.robotState.direction = dirs[(idx + 1) % 4];
        this.onUpdate({ ...this.robotState }, `Turned Right to ${this.robotState.direction}`);
        await this.wait(this.delayMs);
    }

    setSpeed(delay: number) {
        this.delayMs = delay;
        this.robotState.speed = delay;
        this.onUpdate({ ...this.robotState }, `Speed set to ${delay}ms`);
    }

    setAppearance(appearance: { url: string; width?: number; height?: number }) {
        this.robotState.appearance = appearance;
        this.onUpdate({ ...this.robotState }, `Appearance updated`);
    }

    setPen(pen: { color?: string; size?: number; opacity?: number } | null) {
        if (pen === null) {
            this.robotState.pen = null;
            this.onUpdate({ ...this.robotState }, `Pen lifted`);
        } else {
            const currentPen = this.robotState.pen || { color: 'red', size: 1, opacity: 1 };
            this.robotState.pen = {
                color: pen.color ?? currentPen.color,
                size: pen.size ?? currentPen.size,
                opacity: pen.opacity ?? currentPen.opacity
            };
            this.onUpdate({ ...this.robotState }, `Pen set to ${this.robotState.pen.color} (size: ${this.robotState.pen.size}, opacity: ${this.robotState.pen.opacity})`);
        }
    }

    async damage(amount: number) {
        this.checkAborted();
        if (amount <= 0) return;
        this.robotState.health = Math.max(0, this.robotState.health - amount);
        this.onUpdate({ ...this.robotState }, `Took ${amount} damage. Health: ${this.robotState.health}`);

        await this.wait(this.delayMs);

        if (this.robotState.health <= 0) {
            await this.destroy();
        }
    }

    async destroy() {
        this.checkAborted();
        this.robotState.health = 0;
        this.robotState.isDestroyed = true;
        this.robotState.explosion = {
            x: this.position.x,
            y: this.position.y,
            timestamp: Date.now()
        };

        this.onUpdate({ ...this.robotState }, "💥 ROBOT DESTROYED!");

        await this.wait(1000);

        this.onUpdate({ ...this.robotState }, "💥 ROBOT DESTROYED!");

        // Check if game should end (all robots dead)
        // If this returns true, it means it handled the Game Over (logged, alerted, stopped)
        // So we just need to exit this thread.
        if (this.checkGameOver()) {
            await this.wait(1000); // Give a moment for effect, or until abort kills us
            throw new CancelError();
        } else {
            // Logic to freeze this robot without stopping the game
            // We return a promise that never resolves (unless aborted)
            await new Promise<void>((_, reject) => {
                if (this.signal?.aborted) return reject(new CancelError());
                this.signal?.addEventListener('abort', () => reject(new CancelError()));
            });
        }
    }

    async executePath(path: (RobotCommand | string)[]) {
        this.checkAborted();
        for (const command of path) {
            if (command === 'FORWARD') {
                await this.moveForward();
            } else if (command === 'LEFT') {
                await this.turnLeft();
            } else if (command === 'RIGHT') {
                await this.turnRight();
            } else {
                throw new Error(`Invalid command: ${command}`);
            }
        }
    }
}
