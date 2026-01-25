import { CancelError, CrashError, HealthDepletedError, RobotController } from "../robot-api";
import { MazeConfig, RobotState, RobotAppearance, Item } from "../types";
import { WorldManager } from "./WorldManager";
import * as ts from "typescript";

// Event types
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

export class CircuitCrawlerEngine {
    public maze: MazeConfig;

    // World State Management
    public worldActions: import('../types').SharedWorldState;
    private worldReset: () => void;
    public internalWorld?: WorldManager;

    public robots: Map<string, RobotState> = new Map();
    public activeControllers: Map<string, RobotController> = new Map(); // Keep controllers to access direct logic if needed
    public isRunning: boolean = false;
    public isWaitingForInput: boolean = false;
    public inputPrompt: string = '';

    private onLog?: LogCallback;
    private onStateChange?: StateChangeCallback;
    private onRobotUpdate?: RobotUpdateCallback;
    private onCompletion?: CompletionCallback;
    private fetchImpl: typeof fetch;

    private abortController: AbortController | null = null;
    private inputResolve: ((value: string) => void) | null = null;

    constructor(config: EngineConfig) {
        this.maze = config.maze;
        this.onLog = config.onLog;
        this.onStateChange = config.onStateChange;
        this.onRobotUpdate = config.onRobotUpdate;
        this.onCompletion = config.onCompletion;
        this.fetchImpl = config.fetchImpl || globalThis.fetch;

        if (config.externalWorld) {
            this.worldActions = config.externalWorld.actions;
            this.worldReset = config.externalWorld.reset;
        } else {
            // Initialize Internal World
            this.internalWorld = new WorldManager(this.maze, () => this.handleStateChange());
            this.worldActions = this.internalWorld.actions;
            this.worldReset = () => this.internalWorld?.reset(this.maze);
        }

        // Initialize Robots
        this.reset();
    }

    private handleStateChange() {
        if (this.onStateChange) this.onStateChange();
    }

    private log(msg: string, type: LogType) {
        if (this.onLog) this.onLog(msg, type);
    }

    public reset() {
        this.stop();
        this.robots.clear();
        this.activeControllers.clear();
        this.worldReset();

        if (this.maze.initialRobots) {
            this.maze.initialRobots.forEach(config => {
                this.registerRobot({
                    name: config.name || `Robot ${this.robots.size + 1}`,
                    color: config.color || '#38bdf8',
                    position: config.position,
                    direction: config.direction || 'East',
                    inventory: [],
                    speed: 500,
                    health: 100
                });
            });
        }

        this.handleStateChange();
    }

    private registerRobot(state: RobotState) {
        this.robots.set(state.name, state);
        if (this.onRobotUpdate) this.onRobotUpdate(state.name, state);
    }

    public stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isRunning = false;
        this.isWaitingForInput = false;
        this.inputResolve = null;
        this.handleStateChange();
    }

    public resolveInput(value: string) {
        if (this.inputResolve) {
            this.inputResolve(value);
            this.inputResolve = null;
            this.isWaitingForInput = false;
            this.handleStateChange();
        }
    }

    // --- Execution Logic ---

    private transpileCode(source: string) {
        try {
            const autoAwaitTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
                return (sourceFile) => {
                    const visitor: ts.Visitor = (node) => {
                        if (ts.isCallExpression(node)) {
                            const expr = node.expression;
                            if (ts.isPropertyAccessExpression(expr) &&
                                ts.isIdentifier(expr.expression) &&
                                expr.expression.text === 'readline' &&
                                ts.isIdentifier(expr.name) &&
                                (expr.name.text === 'question' ||
                                    expr.name.text === 'questionInt' ||
                                    expr.name.text === 'questionFloat')) {
                                return context.factory.createAwaitExpression(node);
                            }
                        }
                        return ts.visitEachChild(node, visitor, context);
                    };
                    return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
                };
            };

            const result = ts.transpileModule(source, {
                compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
                transformers: { before: [autoAwaitTransformer] }
            });
            return result.outputText;
        } catch (e: any) {
            this.log(`Compilation Error: ${e.message}`, 'user');
            throw e;
        }
    }

    public async run(files: Record<string, string>) {
        if (!this.maze) return;
        this.reset();
        this.isRunning = true;
        this.handleStateChange(); // Notify run start

        // Reset item listeners on run
        const itemListeners: Record<string, Record<string, ((payload?: any) => void)[]>> = {};

        this.log("Compiling...", 'user');

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Logic adapted from useCodeRunner

        // Robot Class factory linked to this instance
        const engine = this;
        const wrapperRobots = new Map<string, Robot>();

        class Robot {
            private controller: RobotController;
            public name: string;

            constructor(config: { x: number, y: number, name?: string, color?: string, direction?: import('../types').Direction }) {
                this.name = config.name || `Robot ${engine.activeControllers.size + 1}`;

                const startState: RobotState = {
                    name: this.name,
                    color: config.color,
                    position: { x: config.x, y: config.y },
                    direction: config.direction || 'East',
                    inventory: [],
                    speed: 500,
                    health: 100,
                };

                engine.registerRobot(startState);
                engine.handleStateChange();

                this.controller = new RobotController(
                    startState,
                    engine.maze.walls,
                    engine.worldActions, // UPDATED to use external/internal actions via getter/prop
                    (newState, logMsg) => {
                        engine.robots.set(this.name, newState);

                        if (engine.onRobotUpdate) engine.onRobotUpdate(this.name, newState);

                        engine.handleStateChange();
                        if (logMsg) engine.log(logMsg, 'robot');
                    },
                    signal,
                    engine.maze.items,
                    engine.maze.doors || [],
                    () => {
                        // Check Game Over
                        let aliveCount = 0;
                        for (const r of engine.activeControllers.values()) {
                            if (!r.isDestroyed) aliveCount++;
                        }
                        if (aliveCount === 0) {
                            engine.log(`💀 FAIL: All robots destroyed!`, 'user');
                            engine.stop();
                            if (engine.onCompletion) engine.onCompletion(false, "All robots destroyed");
                            return true;
                        }
                        return false;
                    }
                );

                // Attach listeners for Item Events
                let lastPos = { ...startState.position };

                this.controller.addEventListener('move', (pos: { x: number, y: number }) => {
                    // Handle 'leave' events for items at previous position
                    const itemsAtLastPos = engine.maze.items.filter(i =>
                        i.position.x === lastPos.x &&
                        i.position.y === lastPos.y &&
                        !engine.worldActions.isItemCollected(i.id)
                    );

                    itemsAtLastPos.forEach(item => {
                        if (itemListeners[item.id] && itemListeners[item.id]['leave']) {
                            itemListeners[item.id]['leave'].forEach(h => h(lastPos));
                        }
                    });

                    // Handle 'move' (enter) events for items at new position
                    const itemsAtPos = engine.maze.items.filter(i =>
                        i.position.x === pos.x &&
                        i.position.y === pos.y &&
                        !engine.worldActions.isItemCollected(i.id)
                    );

                    itemsAtPos.forEach(item => {
                        if (itemListeners[item.id] && itemListeners[item.id]['move']) {
                            itemListeners[item.id]['move'].forEach(h => h(pos));
                        }
                    });

                    // Update last position
                    lastPos = { ...pos };
                });

                this.controller.addEventListener('pickup', (item: Item) => {
                    if (itemListeners[item.id] && itemListeners[item.id]['pickup']) {
                        itemListeners[item.id]['pickup'].forEach(h => h(item));
                    }
                });

                engine.activeControllers.set(this.name, this.controller);
                wrapperRobots.set(this.name, this);
            }

            // Helper to safely execute async controller methods
            private async safeExec<T>(fn: () => Promise<T>): Promise<T> {
                try {
                    return await fn();
                } catch (e: any) {
                    if (e instanceof CancelError || (e && e.name === 'CancelError')) {
                        return new Promise(() => { }); // Dead promise
                    }
                    const msg = e instanceof Error ? e.message : String(e);
                    if (e instanceof HealthDepletedError || (e && e.name === 'HealthDepletedError')) {
                        engine.log(`💀 FAIL: ${msg}`, 'user');
                    } else {
                        engine.log(`Runtime Error: ${msg}`, 'user');
                    }
                    engine.stop();
                    if (engine.onCompletion) engine.onCompletion(false, msg);
                    return new Promise(() => { });
                }
            }

            get direction() { return this.controller.direction; }
            get inventory() { return this.controller.inventory; }
            get health() { return this.controller.health; }
            get position() { return this.controller.position; }
            get isDestroyed() { return this.controller.isDestroyed; }

            moveForward() { return this.safeExec(() => this.controller.moveForward()); }
            turnLeft() { return this.safeExec(() => this.controller.turnLeft()); }
            turnRight() { return this.safeExec(() => this.controller.turnRight()); }
            canMoveForward() { return this.safeExec(() => this.controller.canMoveForward()); }
            pickup() { return this.safeExec(() => this.controller.pickup()); }
            scan() { return this.safeExec(() => this.controller.scan()); }
            echo() { return this.safeExec(() => this.controller.echo()); }
            openDoor(key?: any) { return this.safeExec(() => this.controller.openDoor(key)); }
            closeDoor() { return this.safeExec(() => this.controller.closeDoor()); }
            setSpeed(delay: number) { return this.controller.setSpeed(delay); }
            setAppearance(appearance: RobotAppearance) { return this.controller.setAppearance(appearance); }
            addEventListener(event: string, handler: any) { return this.controller.addEventListener(event, handler); }
            damage(amount: number) { return this.safeExec(() => this.controller.damage(amount)); }
            destroy() { return this.safeExec(() => this.controller.destroy()); }
        }

        // Initialize from existing logic (if any pre-registered robots need controllers? 
        // No, in reset() we just registered state. The User Code is responsible for instantiating Robot() usually,
        // OR we can instantiated them if the Maze defines them and we want them auto-created for the user?
        // In the current `useCodeRunner`, it iterates `maze.initialRobots` and does `new Robot(...)`.

        if (this.maze.initialRobots) {
            for (const initial of this.maze.initialRobots) {
                new Robot({
                    x: initial.position.x,
                    y: initial.position.y,
                    name: initial.name,
                    color: initial.color,
                    direction: initial.direction
                });
            }
        }

        const gameApi = {
            win: (msg: string) => {
                this.log(`🏆 WIN: ${msg}`, 'user');
                this.stop();
                if (this.onCompletion) this.onCompletion(true, msg);
            },
            fail: (msg: string) => {
                this.log(`💀 FAIL: ${msg}`, 'user');
                this.stop();
                if (this.onCompletion) this.onCompletion(false, msg);
            },
            getRobot: (name: string) => {
                // Return the wrapper Robot instance, not the controller.
                // Wait, activeControllers has controllers.
                // `activeRobots` map in useCodeRunner held the Robot class instances.
                // I need that map here too if I want getRobot to work.
                // But I can't easily access the `Robot` instances created inside `new Robot` unless I store them.
                // Let's modify the Robot constructor to store itself in a map.
                return wrapperRobots.get(name);
            },
            get items() {
                return engine.maze.items.filter(item => !engine.worldActions.isItemCollected(item.id));
            },
            getDoor: (id: string) => {
                const door = engine.maze.doors?.find(d => d.id === id);
                if (!door) return undefined;

                return {
                    open: () => {
                        if (!engine.worldActions.isDoorOpen(id)) {
                            engine.worldActions.openDoor(id);
                            engine.worldActions.flushUpdates();
                            engine.log(`Door ${id} opened via script`, 'user');
                        }
                    },
                    close: () => {
                        if (engine.worldActions.isDoorOpen(id)) {
                            engine.worldActions.closeDoor(id);
                            engine.worldActions.flushUpdates();
                            engine.log(`Door ${id} closed via script`, 'user');
                        }
                    },
                    get isOpen() {
                        return engine.worldActions.isDoorOpen(id);
                    }
                };
            },
            getItem: (id: string) => {
                const item = engine.maze.items?.find(i => i.id === id);
                if (!item) return undefined;

                return {
                    collect: () => {
                        if (!engine.worldActions.isItemCollected(id)) {
                            engine.worldActions.collectItem(id);
                            engine.worldActions.flushUpdates();
                            engine.log(`Item ${id} collected via script`, 'user');
                        }
                    },
                    reveal: () => {
                        if (item.isRevealed === false && !engine.worldActions.isItemRevealed(id)) {
                            engine.worldActions.revealItem(id);
                            engine.worldActions.flushUpdates();
                            engine.log(`Item ${id} revealed via script`, 'user');
                        }
                    },
                    get isCollected() {
                        return engine.worldActions.isItemCollected(id);
                    },
                    get isRevealed() {
                        return item.isRevealed !== false || engine.worldActions.isItemRevealed(id);
                    },
                    addEventListener: (event: 'pickup' | 'move' | 'leave', handler: (payload?: any) => void) => {
                        if (!itemListeners[id]) itemListeners[id] = {};
                        if (!itemListeners[id][event]) itemListeners[id][event] = [];
                        itemListeners[id][event].push(handler);
                    }
                };
            },
            getItemOnPosition: (x: number, y: number) => {
                const item = engine.maze.items?.find(i => i.position.x === x && i.position.y === y && !engine.worldActions.isItemCollected(i.id));
                if (!item) return undefined;

                return {
                    collect: () => {
                        if (!engine.worldActions.isItemCollected(item.id)) {
                            engine.worldActions.collectItem(item.id);
                            engine.worldActions.flushUpdates();
                            engine.log(`Item ${item.id} (at ${x},${y}) collected via script`, 'user');
                        }
                    },
                    reveal: () => {
                        if (item.isRevealed === false && !engine.worldActions.isItemRevealed(item.id)) {
                            engine.worldActions.revealItem(item.id);
                            engine.worldActions.flushUpdates();
                            engine.log(`Item ${item.id} (at ${x},${y}) revealed via script`, 'user');
                        }
                    },
                    get isCollected() {
                        return engine.worldActions.isItemCollected(item.id);
                    },
                    get isRevealed() {
                        return item.isRevealed !== false || engine.worldActions.isItemRevealed(item.id);
                    },
                    addEventListener: (event: 'pickup' | 'move' | 'leave', handler: (payload?: any) => void) => {
                        if (!itemListeners[item.id]) itemListeners[item.id] = {};
                        if (!itemListeners[item.id][event]) itemListeners[item.id][event] = [];
                        itemListeners[item.id][event].push(handler);
                    }
                };
            }
        };

        const RobotProxy = new Proxy(Robot, {
            construct(target, args: any[]) {
                const instance = new target(args[0]);
                wrapperRobots.set(instance.name, instance);
                return instance;
            }
        });

        const consoleApi = {
            log: (...args: any[]) => this.log(`LOG: ${args.join(' ')}`, 'user'),
            error: (...args: any[]) => this.log(`ERR: ${args.join(' ')}`, 'user'),
        };

        const readlineApi = {
            question: (promptText: string) => {
                return new Promise<string>((resolve, reject) => {
                    if (signal.aborted) return reject(new CancelError());
                    this.inputPrompt = promptText;
                    this.isWaitingForInput = true;
                    this.inputResolve = resolve;
                    this.handleStateChange();

                    signal.addEventListener('abort', () => {
                        this.isWaitingForInput = false;
                        this.inputResolve = null;
                        this.handleStateChange();
                        reject(new CancelError());
                    });
                });
            },
            questionInt: async (promptText: string) => {
                // Simplified implementation reusing question
                while (true) { // Loop until valid
                    const val = await readlineApi.question(promptText);
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) return num;
                    consoleApi.error("Please enter a valid integer.");
                }
            },
            questionFloat: async (promptText: string) => {
                while (true) {
                    const val = await readlineApi.question(promptText);
                    const num = parseFloat(val);
                    if (!isNaN(num)) return num;
                    consoleApi.error("Please enter a valid number.");
                }
            }
        };

        // Compilation & Execution
        try {
            const modules: Record<string, any> = {};
            const transpiledFiles: Record<string, string> = {};

            for (const [filename, content] of Object.entries(files)) {
                transpiledFiles[filename] = this.transpileCode(content);
            }

            // Global Module
            const globalExports = {};
            if (this.maze.globalModule && this.maze.globalModule.trim()) {
                const transpiledGlobal = this.transpileCode(this.maze.globalModule);
                const globalFn = new Function('exports', 'require', 'Robot', 'game', 'console', 'fetch', transpiledGlobal);
                // We need a dummy require or the real one? 
                // useCodeRunner passes `customRequireRef.current` which is null at start?
                // No, it creats customRequire later.
                // let's create customRequire first.
            }

            // We need `customRequire` defined before global module if global module uses it.
            // But customRequire needs to access `transpiledFiles` which we just made.

            const customRequire = (path: string) => {
                if (path === 'circuit-crawler') return { default: gameApi, game: gameApi };
                if (path === 'readline-sync') return { default: readlineApi, ...readlineApi };

                let filename = path.replace(/^\.\//, '');
                if (!filename.endsWith('.ts')) filename += '.ts';

                if (modules[filename]) return modules[filename];
                if (!transpiledFiles[filename]) throw new Error(`Module not found: ${path}`);

                const moduleExports = {};
                modules[filename] = moduleExports;

                const modFn = new Function('exports', 'require', 'Robot', 'readline', 'fetch', 'console', transpiledFiles[filename]);
                modFn(moduleExports, customRequire, RobotProxy, readlineApi, this.fetchImpl, consoleApi);
                return moduleExports;
            };

            // Now run Global Module
            if (this.maze.globalModule && this.maze.globalModule.trim()) {
                const transpiledGlobal = this.transpileCode(this.maze.globalModule);
                const globalFn = new Function('exports', 'require', 'Robot', 'game', 'console', 'fetch', transpiledGlobal);
                globalFn(globalExports, customRequire, RobotProxy, gameApi, consoleApi, this.fetchImpl);
            }

            this.log("Running...", 'user');

            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const finalCode = transpiledFiles['main.ts'] + '\n\nif (typeof main === "function") { await main(); }';
            const runFn = new AsyncFunction('game', 'Robot', 'readline', 'fetch', 'console', 'require', 'exports', finalCode);

            const stopPromise = new Promise((_, reject) => {
                if (signal.aborted) return reject(new CancelError());
                signal.addEventListener('abort', () => reject(new CancelError()));
            });

            await Promise.race([
                runFn(gameApi, RobotProxy, readlineApi, this.fetchImpl, consoleApi, customRequire, {}),
                stopPromise
            ]);

            await stopPromise;

        } catch (e: any) {
            if (e instanceof CancelError || e.name === 'CancelError') {
                this.log(`🛑 Execution Stopped.`, 'user');
            } else if (e instanceof CrashError || e.name === 'CrashError') {
                this.log(`💥 CRASH! ${e.message}`, 'user');
                if (this.onCompletion) this.onCompletion(false, e.message);
            } else if (e instanceof HealthDepletedError || e.name === 'HealthDepletedError') {
                // Handled by Robot controller mostly, but if it bubbles up
                this.log(`💀 FAIL: ${e.message}`, 'user');
                if (this.onCompletion) this.onCompletion(false, e.message);
            } else {
                this.log(`Runtime Error: ${e.message}`, 'user');
                console.error(e);
                if (this.onCompletion) this.onCompletion(false, e.message);
            }
        } finally {
            this.stop();
        }
    }
}
