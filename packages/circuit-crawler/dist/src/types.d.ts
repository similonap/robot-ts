export type Direction = 'North' | 'East' | 'South' | 'West';
export interface PublicApi {
    robot: Robot;
    game: Game;
    readline: {
        question: (promptText: string) => Promise<string>;
        questionInt: (promptText: string) => Promise<number>;
        questionFloat: (promptText: string) => Promise<number>;
    };
    fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    console: {
        log: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
}
export interface RobotAppearance {
    url: string;
    width?: number;
    height?: number;
}
export interface InitialRobotConfig {
    name: string;
    position: Position;
    direction: Direction;
    color?: string;
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
    damageAmount?: never;
    destroyOnContact?: never;
    imageUrl?: string;
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
export interface RobotState {
    name: string;
    color?: string;
    position: Position;
    direction: Direction;
    inventory: Item[];
    speed: number;
    health: number;
    appearance?: RobotAppearance;
    isDestroyed?: boolean;
    explosion?: {
        x: number;
        y: number;
        timestamp: number;
    };
    echoWave?: {
        x: number;
        y: number;
        direction: Direction;
        timestamp: number;
        distance: number;
    };
    echoHit?: {
        x: number;
        y: number;
        timestamp: number;
    };
}
export type RunnerState = RobotState;
export interface MazeConfig {
    width: number;
    height: number;
    walls: boolean[][];
    initialRobots?: InitialRobotConfig[];
    items: Item[];
    doors: Door[];
    globalModule?: string;
}
export interface SharedWorldState {
    flushUpdates: () => void;
    isItemCollected: (id: string) => boolean;
    collectItem: (id: string) => void;
    isDoorOpen: (id: string) => boolean;
    openDoor: (id: string) => void;
    closeDoor: (id: string) => void;
    revealItem: (id: string) => void;
    isItemRevealed: (id: string) => boolean;
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
    readonly position: Position;
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
    setAppearance(appearance: RobotAppearance): void;
    damage(amount: number): Promise<void>;
    destroy(): Promise<void>;
    addEventListener(event: 'pickup', handler: (item: Item) => void): void;
    addEventListener(event: 'move', handler: (position: Position) => void): void;
    addEventListener(event: string, handler: (payload?: any) => void): void;
}
export type RobotEvent = 'move' | 'pickup';
export interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'robot' | 'user';
}
export interface Game {
    win(message: string): void;
    fail(message: string): void;
    items: Item[];
    getRobot(name: string): Robot | undefined;
}
declare module "readline-sync" {
    function question(prompt: string): string;
    function questionInt(prompt: string): number;
    function questionFloat(prompt: string): number;
}
declare module "circuit-crawler" {
    var game: Game;
}
