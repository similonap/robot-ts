import { MazeConfig, Position, SharedWorldState } from '../types';

export interface WorldState {
    doorStates: Record<string, boolean>;
    revealedItemIds: Set<string>;
    collectedItemIds: Set<string>;
    droppedItemPositions: Map<string, Position>;
    pressurePlateStates: Record<string, boolean>;
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
            droppedItemPositions: new Map(),
            pressurePlateStates: {}
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

        const initialPlates: Record<string, boolean> = {};
        if (maze.pressurePlates) {
            maze.pressurePlates.forEach(p => {
                initialPlates[p.id] = p.isActive || false;
            });
        }

        this.state = {
            doorStates: initialDoors,
            revealedItemIds: new Set(),
            collectedItemIds: new Set(),
            droppedItemPositions: new Map(),
            pressurePlateStates: initialPlates
        };
        this.notify();
    }

    get snapshot() {
        return {
            doorStates: { ...this.state.doorStates },
            revealedItemIds: Array.from(this.state.revealedItemIds),
            collectedItemIds: Array.from(this.state.collectedItemIds),
            pressurePlateStates: { ...this.state.pressurePlateStates }
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
            isPressurePlateActive: (id: string) => !!this.state.pressurePlateStates[id],
            setPressurePlateActive: (id: string, active: boolean) => {
                if (this.state.pressurePlateStates[id] !== active) {
                    this.state.pressurePlateStates[id] = active;
                    this.notify();
                }
            }
        };
    }
}
