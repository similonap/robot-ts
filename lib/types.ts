export type Direction = 'North' | 'East' | 'South' | 'West';

export interface PublicApi {
    robot: Robot;
    game: Game;
    readline: {
        question: (promptText: string) => Promise<string>;
        questionInt: (promptText: string) => Promise<number>;
        questionFloat: (promptText: string) => Promise<number>;
    }
    fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    console: {
        log: (...args: any[]) => void;
        error: (...args: any[]) => void;
    }
}


export interface Position {
    x: number;
    y: number;
}

export interface Item {
    id: string;
    type: 'item';
    name: string;
    icon: string;
    tags: string[];
    position: Position;
    isRevealed?: boolean;
    damageAmount?: number;
    destroyOnContact?: boolean;
}

export interface Door {
    id: string;
    position: Position;
    type: 'door';
    isOpen: boolean;
    lock?: {
        type: 'password';
        value: string;
    } | {
        type: 'item';
        itemIds: string[];
    };
}

export interface RunnerState {
    position: Position;
    direction: Direction;
    inventory: Item[];
    doorStates: Record<string, boolean>; // id -> isOpen
    revealedItemIds: string[];
    echoWave?: { x: number; y: number; direction: Direction; timestamp: number };
    echoHit?: { x: number; y: number; timestamp: number };
    speed: number;
    health: number;
    collectedItemIds: string[];
}

export interface MazeConfig {
    width: number;
    height: number;
    start: Position;
    walls: boolean[][]; // true = wall, false = path
    items: Item[];
    doors: Door[];
    stepCode?: string;
}


export interface Wall {
    type: 'wall';
    position: Position;
}

export interface OpenResult {
    success: boolean;
    message?: string;
    requiredAuth?: 'PASSWORD' | 'ITEMS';
    missingItems?: string[];
}

export interface Robot {
    readonly direction: Direction;
    readonly inventory: Item[];
    readonly health: number;
    moveForward(): Promise<boolean>;
    canMoveForward(): Promise<boolean>;
    turnLeft(): Promise<void>;
    turnRight(): Promise<void>;
    pickup(): Promise<Item | null>;
    scan(): Promise<Item | Door | null>;
    echo(): Promise<number>;
    openDoor(key?: string | Item | Item[]): Promise<OpenResult>;
    closeDoor(): Promise<void>;
    setSpeed(delay: number): void;
}

export interface Game {
    win(message: string): void;
    fail(message: string): void;
    items: Item[];
}

//@ts-ignore
declare module "robot-maze" {
    export const robot: Robot;
    export const game: Game;
}

declare var robot: Robot;
declare var game: Game;
declare var maze: MazeConfig;

//@ts-ignore
declare module "readline-sync" {
    export function question(prompt: string): string;
    export function questionInt(prompt: string): number;
    export function questionFloat(prompt: string): number;
}
