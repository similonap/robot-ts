import { Direction, Position, RunnerState, Item, Door, OpenResult } from './types';

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

export class RobotController {
    private state: RunnerState;
    private walls: boolean[][];
    private onUpdate: (state: RunnerState, log: string) => void;
    private delayMs: number = 500;
    private signal?: AbortSignal;

    private items: Item[] = [];
    private doors: Door[] = [];
    private collectedItemIds: Set<string> = new Set();
    private listeners: Record<string, ((payload?: any) => void)[]> = {};

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

        // Initialize revealedItemIds if not present
        if (!this.state.revealedItemIds) {
            this.state.revealedItemIds = [];
        }

        // Initialize collected based on initial state if needed
        this.state.inventory.forEach(item => this.collectedItemIds.add(item.id));

        // Initialize health if not present
        if (this.state.health === undefined) {
            this.state.health = 100;
        }

        // Ensure collectedItemIds is set
        if (!this.state.collectedItemIds) {
            this.state.collectedItemIds = [];
        }

        // Sync initial collected items
        this.collectedItemIds.forEach(id => {
            if (!this.state.collectedItemIds.includes(id)) {
                this.state.collectedItemIds.push(id);
            }
        });

        // Ensure speed is set in state if not already
        if (this.state.speed === undefined) {
            this.state.speed = this.delayMs;
        } else {
            this.delayMs = this.state.speed;
        }
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
        return { ...this.state.position };
    }

    get health(): number {
        return this.state.health;
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

        // Check for hidden items at new position to reveal them
        const hiddenItemsHere = this.items.filter(item =>
            item.position.x === newX &&
            item.position.y === newY &&
            item.isRevealed === false &&
            !this.state.revealedItemIds.includes(item.id)
        );

        if (hiddenItemsHere.length > 0) {
            hiddenItemsHere.forEach(item => this.state.revealedItemIds.push(item.id));
            this.onUpdate({ ...this.state }, `Moved to ${newX}, ${newY}. Revealed ${hiddenItemsHere.map(i => i.name).join(', ')}!`);
        } else {
            this.onUpdate({ ...this.state }, `Moved to ${newX}, ${newY}`);
        }

        // Check for DAMAGE items
        const damageItems = this.items.filter(item =>
            item.position.x === newX &&
            item.position.y === newY &&
            item.damageAmount && item.damageAmount > 0
        );

        if (damageItems.length > 0) {
            let totalDamage = 0;
            damageItems.forEach(item => totalDamage += (item.damageAmount || 0));

            this.state.health = Math.max(0, this.state.health - totalDamage);
            this.onUpdate({ ...this.state }, `Ouch! Took ${totalDamage} damage from ${damageItems.map(i => i.name).join(', ')}. Health: ${this.state.health}`);
        }

        // Check for DESTROY items
        const destroyItems = this.items.filter(item =>
            item.position.x === newX &&
            item.position.y === newY &&
            item.destroyOnContact === true &&
            !this.collectedItemIds.has(item.id)
        );

        if (destroyItems.length > 0) {
            destroyItems.forEach(item => {
                this.collectedItemIds.add(item.id);
                if (!this.state.collectedItemIds.includes(item.id)) {
                    this.state.collectedItemIds.push(item.id);
                }
                // We add to collected so it's removed from board, but NOT to inventory unless picked up?
                // Usually pickup() is separate. If it's "destroy on contact", it just disappears.
                // We won't add to this.state.inventory.
            });
            this.onUpdate({ ...this.state }, `Destroyed ${destroyItems.map(i => i.name).join(', ')}!`);
        }

        await this.wait(this.delayMs);

        if (this.state.health <= 0) {
            throw new HealthDepletedError(`Did not survive damage from ${damageItems.map(i => i.name).join(', ')}`);
        }

        this.emit('move', { x: newX, y: newY });
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

        // Only allow picking up if it is revealed? Usually yes, if you are ON it, you revealed it just now.
        // Since moveForward reveals it, it should be visible now.

        if (itemAtPos) {
            this.collectedItemIds.add(itemAtPos.id);
            if (!this.state.collectedItemIds.includes(itemAtPos.id)) {
                this.state.collectedItemIds.push(itemAtPos.id);
            }
            this.state.inventory = [...this.state.inventory, itemAtPos];
            this.onUpdate({ ...this.state }, `Collected ${itemAtPos.icon} ${itemAtPos.name}!`);
            this.emit('pickup', itemAtPos);
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

        // PRE-CALCULATE Distance
        while (true) {
            // Move one step
            cx += dx;
            cy += dy;
            distance++;

            // Check bounds (World Wall)
            if (cy < 0 || cy >= this.walls.length || cx < 0 || cx >= this.walls[0].length) {
                // Hit world boundary
                break;
            }

            const door = this.doors.find(d => d.position.x === cx && d.position.y === cy);
            if (door) {
                if (!this.state.doorStates[door.id]) {
                    // Closed door = Hit
                    break;
                }
            } else {
                if (this.walls[cy][cx]) {
                    // Wall = Hit
                    break;
                }
            }

            const item = this.items.find(i =>
                i.position.x === cx &&
                i.position.y === cy &&
                !this.collectedItemIds.has(i.id)
            );
            if (item) {
                // Item = Hit
                break;
            }

            // Limit distance infinite loop just in case
            if (distance > Math.max(this.walls.length, this.walls[0].length)) {
                break;
            }
        }

        // Animate Wave
        this.state.echoWave = {
            x,
            y,
            direction: this.state.direction,
            timestamp: Date.now(),
            distance: distance // Pass pre-calculated distance
        };
        this.state.echoHit = undefined;

        this.onUpdate({ ...this.state }, `Echo ping sent...`);

        // Wait for wave traversal (roughly proportional to distance, but capped?)
        // Or fixed delay? Original was delay/2 then loop. 
        // Let's use standard delay to let animation play out.
        await this.wait(this.delayMs);

        // Show Hit
        this.state.echoHit = { x: cx, y: cy, timestamp: Date.now() };

        // Log result
        let hitType = "Nothing";
        if (cy < 0 || cy >= this.walls.length || cx < 0 || cx >= this.walls[0].length) hitType = "World Boundary";
        else {
            const door = this.doors.find(d => d.position.x === cx && d.position.y === cy);
            const item = this.items.find(i => i.position.x === cx && i.position.y === cy && !this.collectedItemIds.has(i.id));

            if (door && !this.state.doorStates[door.id]) hitType = "Closed Door";
            else if (item) hitType = item.name;
            else if (this.walls[cy][cx]) hitType = "Wall";
        }

        this.onUpdate({ ...this.state }, `Echo: ${hitType} at distance ${distance}`);
        return distance;
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
            return { ...doorAtPos, isOpen: this.state.doorStates[doorAtPos.id] };
        }

        if (itemAtPos) {
            // Check if hidden
            if (itemAtPos.isRevealed === false && !this.state.revealedItemIds.includes(itemAtPos.id)) {
                // REVEAL IT!
                this.state.revealedItemIds.push(itemAtPos.id);
                this.onUpdate(this.state, `Scanned ahead: ${itemAtPos.name} (Revealed!)`);
            } else {
                this.onUpdate(this.state, `Scanned ahead: ${itemAtPos.name} (tags: ${itemAtPos.tags.join(', ')})`);
            }
            return itemAtPos;
        } else {
            this.onUpdate(this.state, `Scanned ahead: Nothing`);
            return null;
        }
    }

    async openDoor(key?: string | Item | Item[]): Promise<OpenResult> {
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
                const msg = "Door is already open.";
                this.onUpdate(this.state, msg);
                await this.wait(this.delayMs);
                return { success: true, message: msg };
            }

            // Check Lock
            if (door.lock) {
                if (door.lock.type === 'password') {
                    if (typeof key !== 'string') {
                        const msg = `Door is locked (password required).`;
                        this.onUpdate(this.state, msg);
                        await this.wait(this.delayMs);
                        return { success: false, message: msg, requiredAuth: 'PASSWORD' };
                    }
                    if (key !== door.lock.value) {
                        const msg = `Incorrect password for door.`;
                        this.onUpdate(this.state, msg);
                        await this.wait(this.delayMs);
                        return { success: false, message: msg, requiredAuth: 'PASSWORD' };
                    }
                } else if (door.lock.type === 'item') {
                    const requiredItemIds = door.lock.itemIds;
                    const providedItems = Array.isArray(key) ? key : (key ? [key] : []);

                    // Filter provided items that are actually Items (not strings)
                    const providedItemObjects = providedItems.filter(i => typeof i === 'object' && 'id' in i);
                    const providedIds = new Set(providedItemObjects.map(i => i.id));

                    // Identify Missing Items
                    const missingRequiredIds = requiredItemIds.filter(id => !providedIds.has(id));

                    if (missingRequiredIds.length > 0) {
                        // Find names of missing items
                        const missingNames = missingRequiredIds.map(id => {
                            const item = this.items.find(i => i.id === id);
                            return item ? item.name : 'Unknown Item';
                        });

                        const msg = `You did not provide the correct items. Missing: ${missingNames.join(', ')}`;
                        this.onUpdate(this.state, msg);
                        await this.wait(this.delayMs);
                        return {
                            success: false,
                            message: msg,
                            requiredAuth: 'ITEMS',
                            missingItems: missingRequiredIds
                        };
                    }

                    // Check if Provided Items are in Inventory
                    const inventoryIds = new Set(this.state.inventory.map(i => i.id));
                    const missingFromInventory = providedItemObjects.filter(i => !inventoryIds.has(i.id));

                    if (missingFromInventory.length > 0) {
                        const msg = `You don't have these items in your inventory: ${missingFromInventory.map(i => i.name).join(', ')}`;
                        this.onUpdate(this.state, msg);
                        await this.wait(this.delayMs);
                        return { success: false, message: msg, requiredAuth: 'ITEMS' };
                    }
                }
            }

            this.state.doorStates = { ...this.state.doorStates, [door.id]: true };
            this.onUpdate({ ...this.state }, "Opened door.");
            await this.wait(this.delayMs);
            return { success: true, message: "Opened door." };
        } else {
            const msg = "No door to open.";
            this.onUpdate(this.state, msg);
            await this.wait(this.delayMs);
            return { success: false, message: msg };
        }
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

    get inventory(): Item[] {
        return [...this.state.inventory]; // Return copy to be safe
    }

    getRemainingItems(): Item[] {
        return this.items.filter(item => !this.collectedItemIds.has(item.id));
    }

    setSpeed(delay: number) {
        this.delayMs = delay;
        // Update state so UI knows about the speed change
        this.state.speed = delay;
        // We don't necessarily need to trigger a full update just for speed change 
        // unless we want immediate visual feedback of "speed changed" (unlikely to be visible until move).
        // But doing so ensures the UI has the latest speed value for the NEXT move's animation.
        this.onUpdate({ ...this.state }, `Speed set to ${delay}ms`);
    }

    setAppearance(appearance: { url: string; width?: number; height?: number }) {
        this.state.appearance = appearance;
        this.onUpdate({ ...this.state }, `Appearance updated`);
    }
}
