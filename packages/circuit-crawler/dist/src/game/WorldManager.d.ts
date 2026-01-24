import { MazeConfig, SharedWorldState } from '../types';
export interface WorldState {
    doorStates: Record<string, boolean>;
    revealedItemIds: Set<string>;
    collectedItemIds: Set<string>;
}
export declare class WorldManager {
    private state;
    private onUpdate;
    private pendingUpdate;
    constructor(initialMaze: MazeConfig, onUpdate: () => void);
    reset(maze: MazeConfig): void;
    get snapshot(): {
        doorStates: {
            [x: string]: boolean;
        };
        revealedItemIds: string[];
        collectedItemIds: string[];
    };
    private notify;
    get actions(): SharedWorldState;
}
