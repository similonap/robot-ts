"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldManager = void 0;
class WorldManager {
    constructor(initialMaze, onUpdate) {
        this.pendingUpdate = false;
        this.onUpdate = onUpdate;
        this.state = {
            doorStates: {},
            revealedItemIds: new Set(),
            collectedItemIds: new Set()
        };
        this.reset(initialMaze);
    }
    reset(maze) {
        const initialDoors = {};
        if (maze.doors) {
            maze.doors.forEach(d => {
                initialDoors[d.id] = d.isOpen;
            });
        }
        this.state = {
            doorStates: initialDoors,
            revealedItemIds: new Set(),
            collectedItemIds: new Set()
        };
        this.notify();
    }
    get snapshot() {
        return {
            doorStates: { ...this.state.doorStates },
            revealedItemIds: Array.from(this.state.revealedItemIds),
            collectedItemIds: Array.from(this.state.collectedItemIds)
        };
    }
    notify() {
        // Debounce updates slightly or just notify immediately?
        // useWorld had a flushUpdates method.
        // We can just call onUpdate and let the consumer handle batching if needed.
        this.onUpdate();
    }
    get actions() {
        return {
            flushUpdates: () => this.notify(),
            isItemCollected: (id) => this.state.collectedItemIds.has(id),
            collectItem: (id) => {
                this.state.collectedItemIds.add(id);
                this.notify();
            },
            isDoorOpen: (id) => !!this.state.doorStates[id],
            openDoor: (id) => {
                this.state.doorStates[id] = true;
                this.notify();
            },
            closeDoor: (id) => {
                this.state.doorStates[id] = false;
                this.notify();
            },
            revealItem: (id) => {
                this.state.revealedItemIds.add(id);
                this.notify();
            },
            isItemRevealed: (id) => this.state.revealedItemIds.has(id),
        };
    }
}
exports.WorldManager = WorldManager;
