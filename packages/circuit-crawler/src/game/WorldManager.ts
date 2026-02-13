import { MazeConfig, Position, SharedWorldState } from '../types';

export interface WorldState {
    doorStates: Record<string, boolean>;
    revealedItemIds: Set<string>;
    collectedItemIds: Set<string>;
    droppedItemPositions: Map<string, Position>;
}

export class WorldManager {
    private state: WorldState;
    private onUpdate: () => void;
    private pendingUpdate: boolean = false;

    constructor(initialMaze: MazeConfig, onUpdate: () => void) {
        this.onUpdate = onUpdate;
        this.state = {
            doorStates: {},
            revealedItemIds: new Set(),
            collectedItemIds: new Set(),
            droppedItemPositions: new Map()
        };
        this.reset(initialMaze);
    }

    reset(maze: MazeConfig) {
        const initialDoors: Record<string, boolean> = {};
        if (maze.doors) {
            maze.doors.forEach(d => {
                initialDoors[d.id] = d.isOpen;
            });
        }
        this.state = {
            doorStates: initialDoors,
            revealedItemIds: new Set(),
            collectedItemIds: new Set(),
            droppedItemPositions: new Map()
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

    private notify() {
        // Debounce updates slightly or just notify immediately?
        // useWorld had a flushUpdates method.
        // We can just call onUpdate and let the consumer handle batching if needed.
        this.onUpdate();
    }

    get actions(): SharedWorldState {
        return {
            flushUpdates: () => this.notify(),
            isItemCollected: (id: string) => this.state.collectedItemIds.has(id),
            collectItem: (id: string) => {
                this.state.collectedItemIds.add(id);
                this.notify();
            },
            uncollectItem: (id: string) => {
                this.state.collectedItemIds.delete(id);
                this.notify();
            },
            dropItem: (id: string, position: Position) => {
                this.state.droppedItemPositions.set(id, { ...position });
                this.notify();
            },
            isDoorOpen: (id: string) => !!this.state.doorStates[id],
            openDoor: (id: string) => {
                this.state.doorStates[id] = true;
                this.notify();
            },
            closeDoor: (id: string) => {
                this.state.doorStates[id] = false;
                this.notify();
            },
            revealItem: (id: string) => {
                this.state.revealedItemIds.add(id);
                this.notify();
            },
            isItemRevealed: (id: string) => this.state.revealedItemIds.has(id),
        };
    }
}
