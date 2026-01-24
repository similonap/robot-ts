import { Direction, Position, Item, Door, OpenResult, SharedWorldState, RobotState } from './types';
export declare class CancelError extends Error {
    constructor(message?: string);
}
export declare class CrashError extends Error {
    constructor(message?: string);
}
export declare class HealthDepletedError extends Error {
    constructor(message?: string);
}
export declare class RobotController {
    private robotState;
    private world;
    private walls;
    private onUpdate;
    private delayMs;
    private signal?;
    private items;
    private doors;
    private listeners;
    private checkGameOver;
    constructor(initialState: RobotState, walls: boolean[][], world: SharedWorldState, onUpdate: (state: RobotState, log: string) => void, signal?: AbortSignal, items?: Item[], doors?: Door[], checkGameOver?: () => boolean);
    private checkAborted;
    private wait;
    private isWall;
    private emit;
    addEventListener(event: string, handler: (payload?: any) => void): void;
    get position(): Position;
    get health(): number;
    get direction(): Direction;
    get isDestroyed(): boolean;
    get inventory(): Item[];
    private get inventoryIds();
    getRemainingItems(): Item[];
    canMoveForward(): Promise<boolean>;
    moveForward(): Promise<boolean>;
    pickup(): Promise<Item | null>;
    echo(): Promise<number>;
    scan(): Promise<Item | Door | null>;
    openDoor(key?: string | Item | Item[]): Promise<OpenResult>;
    closeDoor(): Promise<void>;
    turnLeft(): Promise<void>;
    turnRight(): Promise<void>;
    setSpeed(delay: number): void;
    setAppearance(appearance: {
        url: string;
        width?: number;
        height?: number;
    }): void;
    damage(amount: number): Promise<void>;
    destroy(): Promise<void>;
}
