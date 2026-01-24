import { RobotController } from "../robot-api";
import { MazeConfig, RobotState } from "../types";
import { WorldManager } from "./WorldManager";
type LogType = 'user' | 'robot';
type LogCallback = (msg: string, type: LogType) => void;
type StateChangeCallback = () => void;
type RobotUpdateCallback = (name: string, state: RobotState) => void;
type CompletionCallback = (success: boolean, msg: string) => void;
interface EngineConfig {
    maze: MazeConfig;
    onLog?: LogCallback;
    onStateChange?: StateChangeCallback;
    onRobotUpdate?: RobotUpdateCallback;
    onCompletion?: CompletionCallback;
    fetchImpl?: typeof fetch;
    externalWorld?: {
        actions: import('../types').SharedWorldState;
        reset: () => void;
    };
}
export declare class CircuitCrawlerEngine {
    maze: MazeConfig;
    worldActions: import('../types').SharedWorldState;
    private worldReset;
    internalWorld?: WorldManager;
    robots: Map<string, RobotState>;
    activeControllers: Map<string, RobotController>;
    isRunning: boolean;
    isWaitingForInput: boolean;
    inputPrompt: string;
    private onLog?;
    private onStateChange?;
    private onRobotUpdate?;
    private onCompletion?;
    private fetchImpl;
    private abortController;
    private inputResolve;
    constructor(config: EngineConfig);
    private handleStateChange;
    private log;
    reset(): void;
    private registerRobot;
    stop(): void;
    resolveInput(value: string): void;
    private transpileCode;
    run(files: Record<string, string>): Promise<void>;
}
export {};
