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

export interface DoorControl {
    open(): void;
    close(): void;
    readonly isOpen: boolean;
}

export interface ItemControl {
    collect(): void;
    reveal(): void;
    readonly isCollected: boolean;
    readonly isRevealed: boolean;
    addEventListener(event: 'pickup' | 'move' | 'leave', handler: (payload?: any) => void): void;
    [key: string]: any;
}

export interface RobotAppearance {
    url: string;
    width?: number;
    height?: number;
}

export interface InitialRobotConfig {
    name: string; // Unique identifier
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
    kind: 'item';
    name: string;
    icon: string;
    type: string;
    position?: Position;
    isRevealed?: boolean;
    damageAmount?: never; // Removed
    destroyOnContact?: never; // Removed
    imageUrl?: string;
    [key: string]: any;
}

export interface Door {
    id: string;
    position: Position;
    kind: 'door';
    isOpen: boolean;
    name?: string;
    lock?: {
        type: 'password';
        value: string;
    } | {
        type: 'item';
        itemIds: string[];
    };
}

export interface RobotState {
    name: string; // Unique identifier
    color?: string;
    position: Position;
    direction: Direction;
    inventory: Item[];
    speed: number;
    health: number;
    appearance?: RobotAppearance;
    isDestroyed?: boolean;
    explosion?: { x: number; y: number; timestamp: number };
    echoWave?: { x: number; y: number; direction: Direction; timestamp: number; distance: number };
    echoHit?: { x: number; y: number; timestamp: number };
    pen?: { color: string; size: number; opacity: number } | null;
    trail?: Array<{ x1: number, y1: number, x2: number, y2: number, color: string, size: number, opacity: number }>;
}

// Deprecated: Alias for backward compatibility if needed, or remove.
// For now, let's keep it but mapped to RobotState + some world props if we want to risk it?
// Or just replace usages.
// Let's replace RunnerState with RobotState in most places, but Context needs to track World too.
export type RunnerState = RobotState;


export interface Wall {
    kind: 'wall';
    position: Position;
}

export interface PressurePlate {
    id: string;
    position: Position;
    kind: 'pressure_plate';
    isActive?: boolean; // Runtime state (optional in config)
}

export interface PressurePlateControl {
    readonly isActive: boolean;
    addEventListener(event: 'activate' | 'deactivate', handler: (payload?: any) => void): void;
    on(event: 'activate' | 'deactivate', handler: (payload?: any) => void): void; // Alias for convenience
}

export interface OpenResult {
    success: boolean;
    message?: string;
    requiredAuth?: 'PASSWORD' | 'ITEMS';
    missingItems?: string[];
}

export interface MazeConfig {
    width: number;
    height: number;
    walls: boolean[][]; // true = wall, false = path
    // Replaces start: Position
    initialRobots?: InitialRobotConfig[];
    // Legacy support? No, let's break it cleanly or mapped.
    // If we want legacy support we keep start? 
    // Plan says replace.
    // start: Position; // REMOVED
    items: Item[];
    doors: Door[];
    pressurePlates?: PressurePlate[];
    globalModule?: string;
}

export interface SharedWorldState {
    flushUpdates: () => void;
    isItemCollected: (id: string) => boolean;
    collectItem: (id: string) => void;
    uncollectItem: (id: string) => void;
    dropItem: (id: string, position: Position) => void;
    isDoorOpen: (id: string) => boolean;
    openDoor: (id: string) => void;
    closeDoor: (id: string) => void;
    revealItem: (id: string) => void;
    isItemRevealed: (id: string) => boolean;
    isPressurePlateActive: (id: string) => boolean;
    setPressurePlateActive: (id: string, active: boolean) => void;
}

export type RobotCommand = 'FORWARD' | 'LEFT' | 'RIGHT';

export interface Robot {
    readonly direction: Direction;
    readonly inventory: Item[];
    readonly health: number;
    readonly position: Position;
    readonly name: string;
    readonly color: string;
    moveForward(): Promise<boolean>;
    canMoveForward(): Promise<boolean>;
    turnLeft(): Promise<void>;
    turnRight(): Promise<void>;
    pickup(): Promise<Item | null>;
    drop(item: Item): Promise<Item | null>;
    scan(): Promise<Item | Door | null>;
    echo(): Promise<number>;
    openDoor(key?: string | Item | Item[]): Promise<OpenResult>;
    closeDoor(): Promise<void>;
    setSpeed(delay: number): void;
    setAppearance(appearance: RobotAppearance): void;
    setPen(pen: { color?: string; size?: number; opacity?: number } | null): void;
    damage(amount: number): Promise<void>;
    destroy(): Promise<void>;
    executePath(path: (RobotCommand | string)[]): Promise<void>;
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

export interface RobotConfig {
    x: number;
    y: number;
    name?: string;
    color?: string;
    direction?: Direction;
}

export interface Game {
    win(message: string): void;
    fail(message: string): void;
    items: Item[];
    getRobot(name: string): Robot | undefined;
    getDoor(id: string): DoorControl | undefined;
    getItem(id: string): ItemControl | undefined;
    getDoor(id: string): DoorControl | undefined;
    getPressurePlate(id: string): PressurePlateControl | undefined;
    getItemOnPosition(x: number, y: number): ItemControl | undefined;
    isRunning(): boolean;
    createRobot(config: RobotConfig): Robot;
    readonly robots: Robot[];
    addEventListener(event: 'robot_created', handler: (robot: Robot) => void): void;
    addEventListener(event: string, handler: (payload?: any) => void): void;
}



// declare var robot: Robot;
declare var game: Game;
declare var maze: MazeConfig;
declare var FORWARD: RobotCommand;
declare var LEFT: RobotCommand;
declare var RIGHT: RobotCommand;

//@ts-ignore
declare module "readline-sync" {
    export function question(prompt: string): string;
    export function questionInt(prompt: string): number;
    export function questionFloat(prompt: string): number;
}

//@ts-ignore
declare module "circuit-crawler" {
    export var game: Game;
}