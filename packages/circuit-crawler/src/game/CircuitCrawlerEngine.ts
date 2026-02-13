import { CancelError, CrashError, HealthDepletedError, RobotController } from "../robot-api";
import { MazeConfig, RobotState, RobotAppearance, Item, RobotConfig } from "../types";
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
    private initialMaze: MazeConfig;

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

    private listeners: Record<string, ((payload?: any) => void)[]> = {};

    private emit(event: string, payload?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(handler => handler(payload));
        }
    }

    public addEventListener(event: string, handler: (payload?: any) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(handler);
    }

    private abortController: AbortController | null = null;
    private inputResolve: ((value: string) => void) | null = null;

    constructor(config: EngineConfig) {
        this.initialMaze = structuredClone(config.maze);
        this.maze = structuredClone(config.maze);
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
        this.listeners = {};
        this.robots.clear();
        this.activeControllers.clear();

        // Restore maze to original deep copy so item positions are reset
        this.maze = structuredClone(this.initialMaze);

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

    private formatLogArg(arg: any): string {
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return '[Circular Object]';
            }
        }
        return String(arg);
    }

    private transpileCode(source: string) {
        try {
            const autoAwaitTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
                return (sourceFile) => {
                    const asyncNodes = new Set<ts.Node>();
                    const functionNameMap = new Map<string, ts.Node>();
                    const callGraph = new Map<ts.Node, Set<string>>();

                    // Helpers
                    const isReadlineCall = (node: ts.CallExpression): boolean => {
                        const expr = node.expression;
                        return (ts.isPropertyAccessExpression(expr) &&
                            ts.isIdentifier(expr.expression) &&
                            expr.expression.text === 'readline' &&
                            ts.isIdentifier(expr.name) &&
                            (expr.name.text === 'question' ||
                                expr.name.text === 'questionInt' ||
                                expr.name.text === 'questionFloat'));
                    };

                    const getFunctionName = (node: ts.Node): string | undefined => {
                        if (ts.isFunctionDeclaration(node)) {
                            return node.name?.text;
                        }
                        if (ts.isMethodDeclaration(node)) {
                            if (ts.isIdentifier(node.name)) return node.name.text;
                        }
                        if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
                            // Variable declaration: const foo = ...
                            if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
                                return node.parent.name.text;
                            }
                            // Assignment: foo = ...
                            if (ts.isBinaryExpression(node.parent) &&
                                node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                                ts.isIdentifier(node.parent.left)) {
                                return node.parent.left.text;
                            }
                        }
                        return undefined;
                    };

                    const isFunctionLike = (node: ts.Node): boolean => {
                        return ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node);
                    }

                    // Analysis Pass
                    const visitAnalysis = (node: ts.Node, currentFn: ts.Node | null) => {
                        let nextFn = currentFn;

                        if (isFunctionLike(node)) {
                            nextFn = node;
                            const name = getFunctionName(node);
                            if (name) functionNameMap.set(name, node);
                        }

                        if (ts.isCallExpression(node)) {
                            if (isReadlineCall(node)) {
                                if (nextFn) asyncNodes.add(nextFn);
                            } else if (ts.isIdentifier(node.expression)) {
                                const callee = node.expression.text;
                                if (nextFn) {
                                    if (!callGraph.has(nextFn)) callGraph.set(nextFn, new Set());
                                    callGraph.get(nextFn)!.add(callee);
                                }
                            }
                        }

                        ts.forEachChild(node, child => visitAnalysis(child, nextFn));
                    }

                    visitAnalysis(sourceFile, null);

                    // Propagation
                    let changed = true;
                    while (changed) {
                        changed = false;
                        for (const [callerNode, callees] of callGraph) {
                            if (asyncNodes.has(callerNode)) continue;

                            for (const calleeName of callees) {
                                const calleeNode = functionNameMap.get(calleeName);
                                // If callee is known and async -> caller becomes async
                                if (calleeNode && asyncNodes.has(calleeNode)) {
                                    asyncNodes.add(callerNode);
                                    changed = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Transformation Pass
                    const visitor: ts.Visitor = (node) => {
                        // 1. Mark Async
                        if (isFunctionLike(node)) {
                            if (asyncNodes.has(node)) {
                                // Clone modifiers
                                // @ts-ignore
                                const modifiers = (ts.getModifiers ? ts.getModifiers(node) : node.modifiers) || [];
                                const hasAsync = modifiers.some((m: any) => m.kind === ts.SyntaxKind.AsyncKeyword);

                                if (!hasAsync) {
                                    const newModifiers = [...modifiers, context.factory.createModifier(ts.SyntaxKind.AsyncKeyword)];

                                    if (ts.isFunctionDeclaration(node)) {
                                        return context.factory.updateFunctionDeclaration(
                                            node, newModifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type,
                                            ts.visitEachChild(node.body, visitor, context)
                                        );
                                    }
                                    if (ts.isArrowFunction(node)) {
                                        return context.factory.updateArrowFunction(
                                            node, newModifiers, node.typeParameters, node.parameters, node.type, node.equalsGreaterThanToken,
                                            ts.visitEachChild(node.body, visitor, context)
                                        );
                                    }
                                    if (ts.isMethodDeclaration(node)) {
                                        return context.factory.updateMethodDeclaration(
                                            node, newModifiers, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type,
                                            ts.visitEachChild(node.body, visitor, context)
                                        );
                                    }
                                    if (ts.isFunctionExpression(node)) {
                                        return context.factory.updateFunctionExpression(
                                            node, newModifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type,
                                            ts.visitEachChild(node.body, visitor, context)
                                        );
                                    }
                                }
                            }
                        }

                        // 2. Add Await
                        if (ts.isCallExpression(node)) {
                            let needsAwait = false;
                            if (isReadlineCall(node)) needsAwait = true;
                            else if (ts.isIdentifier(node.expression)) {
                                const calleeName = node.expression.text;
                                const calleeNode = functionNameMap.get(calleeName);
                                if (calleeNode && asyncNodes.has(calleeNode)) {
                                    needsAwait = true;
                                }
                            }

                            if (needsAwait) {
                                if (!ts.isAwaitExpression(node.parent)) {
                                    const visitedCall = ts.visitEachChild(node, visitor, context) as ts.CallExpression;
                                    return context.factory.createAwaitExpression(visitedCall);
                                }
                            }
                        }

                        return ts.visitEachChild(node, visitor, context);
                    };
                    return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
                };
            };

            const result = ts.transpileModule(source, {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2017,
                    resolveJsonModule: true,
                    esModuleInterop: true
                },
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

            constructor(config: RobotConfig) {
                if (config.x < 0 || config.y < 0 || config.x >= engine.maze.width || config.y >= engine.maze.height) {
                    throw new Error(`Cannot create robot at (${config.x}, ${config.y}) - outside of bounds [${engine.maze.width}x${engine.maze.height}]`);
                }

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
                        i.position?.x === lastPos.x &&
                        i.position?.y === lastPos.y &&
                        !engine.worldActions.isItemCollected(i.id)
                    );

                    itemsAtLastPos.forEach(item => {
                        if (itemListeners[item.id] && itemListeners[item.id]['leave']) {
                            itemListeners[item.id]['leave'].forEach(h => h(lastPos));
                        }
                    });

                    // Handle 'move' (enter) events for items at new position
                    const itemsAtPos = engine.maze.items.filter(i =>
                        i.position?.x === pos.x &&
                        i.position?.y === pos.y &&
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

                this.controller.addEventListener('drop', (item: Item) => {
                    if (itemListeners[item.id] && itemListeners[item.id]['drop']) {
                        itemListeners[item.id]['drop'].forEach(h => h(item));
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

                    // RETHROW other errors so user code can catch them
                    throw e;
                }
            }

            get direction() { return this.controller.direction; }
            get inventory() { return this.controller.inventory; }
            get health() { return this.controller.health; }
            get position() { return this.controller.position; }
            get isDestroyed() { return this.controller.isDestroyed; }
            get color() { return this.controller.color; }

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
            setPen(pen: { color?: string; size?: number; opacity?: number } | null) { return this.controller.setPen(pen); }
            addEventListener(event: string, handler: any) { return this.controller.addEventListener(event, handler); }
            damage(amount: number) { return this.safeExec(() => this.controller.damage(amount)); }
            destroy() { return this.safeExec(() => this.controller.destroy()); }
            executePath(path: any[]) { return this.safeExec(() => this.controller.executePath(path)); }
            drop(item: any) { return this.safeExec(() => this.controller.drop(item)); }

            toJSON() {
                return {
                    name: this.name,
                    position: this.position,
                    direction: this.direction,
                    health: this.health,
                    inventory: this.inventory,
                    isDestroyed: this.isDestroyed
                };
            }
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
                    addEventListener: (event: 'pickup' | 'move' | 'leave' | 'drop', handler: (payload?: any) => void) => {
                        if (!itemListeners[id]) itemListeners[id] = {};
                        if (!itemListeners[id][event]) itemListeners[id][event] = [];
                        itemListeners[id][event].push(handler);
                    },
                    on: (event: 'pickup' | 'move' | 'leave' | 'drop', handler: (payload?: any) => void) => {
                        if (!itemListeners[id]) itemListeners[id] = {};
                        if (!itemListeners[id][event]) itemListeners[id][event] = [];
                        itemListeners[id][event].push(handler);
                    }
                };
            },
            getItemOnPosition: (x: number, y: number) => {
                const item = engine.maze.items?.find(i => i.position?.x === x && i.position?.y === y && !engine.worldActions.isItemCollected(i.id));
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
                    addEventListener: (event: 'pickup' | 'move' | 'leave' | 'drop', handler: (payload?: any) => void) => {
                        if (!itemListeners[item.id]) itemListeners[item.id] = {};
                        if (!itemListeners[item.id][event]) itemListeners[item.id][event] = [];
                        itemListeners[item.id][event].push(handler);
                    },
                    on: (event: 'pickup' | 'move' | 'leave' | 'drop', handler: (payload?: any) => void) => {
                        if (!itemListeners[item.id]) itemListeners[item.id] = {};
                        if (!itemListeners[item.id][event]) itemListeners[item.id][event] = [];
                        itemListeners[item.id][event].push(handler);
                    }
                };
            },
            isRunning: () => this.isRunning,
            createRobot: (config: RobotConfig) => {
                // @ts-ignore
                const robot = new RobotProxy(config);
                return robot;
            },
            get robots() {
                return Array.from(wrapperRobots.values());
            },
            addEventListener: (event: string, handler: (payload?: any) => void) => {
                this.addEventListener(event, handler);
            }
        };

        const RobotProxy = new Proxy(Robot, {
            construct(target, args: any[]) {
                const instance = new target(args[0]);
                wrapperRobots.set(instance.name, instance);
                engine.emit('robot_created', instance);
                return instance;
            }
        });

        const consoleApi = {
            log: (...args: any[]) => this.log(`LOG: ${args.map(a => this.formatLogArg(a)).join(' ')}`, 'user'),
            error: (...args: any[]) => this.log(`ERR: ${args.map(a => this.formatLogArg(a)).join(' ')}`, 'user'),
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
                if (filename.endsWith('.json')) {
                    transpiledFiles[filename] = `module.exports = ${content.trim() || '{}'};`;
                } else {
                    transpiledFiles[filename] = this.transpileCode(content);
                }
            }

            // Global Module
            const globalExports = {};

            // Preload external dependencies
            const externalModules = await this.preloadDependencies(files);

            // We need `customRequire` defined before global module if global module uses it.
            // But customRequire needs to access `transpiledFiles` which we just made.

            const customRequire = (path: string) => {
                if (path === 'circuit-crawler') return { default: gameApi, game: gameApi };
                if (path === 'readline-sync') return { default: readlineApi, ...readlineApi };

                // check if it is an external module
                if (externalModules[path]) {
                    return externalModules[path];
                }

                let filename = path.replace(/^\.\//, '');

                // Try to find the file
                if (!transpiledFiles[filename]) {
                    if (transpiledFiles[`${filename}.ts`]) {
                        filename += '.ts';
                    } else if (transpiledFiles[`${filename}.json`]) {
                        filename += '.json';
                    } else if (!filename.endsWith('.ts') && !filename.endsWith('.json')) {
                        // default to .ts if no extension
                        filename += '.ts';
                    }
                }

                if (modules[filename]) return modules[filename];
                if (!transpiledFiles[filename]) throw new Error(`Module not found: ${path}`);

                const moduleExports = {};
                modules[filename] = moduleExports;

                const module = { exports: moduleExports };

                const modFn = new Function('module', 'exports', 'require', 'Robot', 'readline', 'fetch', 'console', 'FORWARD', 'LEFT', 'RIGHT', transpiledFiles[filename]);
                modFn(module, moduleExports, customRequire, RobotProxy, readlineApi, this.fetchImpl, consoleApi, 'FORWARD', 'LEFT', 'RIGHT');

                // Update exports if module.exports was reassigned
                modules[filename] = module.exports;
                return module.exports;
            };

            // Now run Global Module
            if (this.maze.globalModule && this.maze.globalModule.trim()) {
                const transpiledGlobal = this.transpileCode(this.maze.globalModule);
                const globalFn = new Function('exports', 'require', 'Robot', 'game', 'console', 'fetch', 'FORWARD', 'LEFT', 'RIGHT', transpiledGlobal);
                globalFn(globalExports, customRequire, RobotProxy, gameApi, consoleApi, this.fetchImpl, 'FORWARD', 'LEFT', 'RIGHT');
            }

            this.log("Running...", 'user');

            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const finalCode = transpiledFiles['main.ts'] + '\n\nif (typeof main === "function") { await main(); }';
            const runFn = new AsyncFunction('game', 'Robot', 'readline', 'fetch', 'console', 'require', 'exports', 'FORWARD', 'LEFT', 'RIGHT', finalCode);

            const stopPromise = new Promise((_, reject) => {
                if (signal.aborted) return reject(new CancelError());
                signal.addEventListener('abort', () => reject(new CancelError()));
            });

            await Promise.race([
                runFn(gameApi, RobotProxy, readlineApi, this.fetchImpl, consoleApi, customRequire, {}, 'FORWARD', 'LEFT', 'RIGHT'),
                stopPromise
            ]);

            await stopPromise;

        } catch (e: any) {
            if (e instanceof CancelError || e.name === 'CancelError') {
                this.log(`🛑 Execution Stopped.`, 'user');
            } else if (e instanceof CrashError || e.name === 'CrashError') {
                this.log(`💥 CRASH! ${e.message}`, 'user');
                this.log(`🛑 Execution Stopped.`, 'user');
                if (this.onCompletion) this.onCompletion(false, e.message);
            } else if (e instanceof HealthDepletedError || e.name === 'HealthDepletedError') {
                // Handled by Robot controller mostly, but if it bubbles up
                this.log(`💀 FAIL: ${e.message}`, 'user');
                this.log(`🛑 Execution Stopped.`, 'user');
                if (this.onCompletion) this.onCompletion(false, e.message);
            } else {
                this.log(`Runtime Error: ${e.message}`, 'user');
                this.log(`🛑 Execution Stopped.`, 'user');
                console.error(e);
                if (this.onCompletion) this.onCompletion(false, e.message);
            }
        } finally {
            this.stop();
        }
    }

    private async preloadDependencies(files: Record<string, string>): Promise<Record<string, any>> {
        const imports = new Set<string>();
        // Scan all files for imports
        for (const content of Object.values(files)) {
            try {
                const info = ts.preProcessFile(content);
                info.importedFiles.forEach(imp => {
                    const lib = imp.fileName;
                    // Filter out local relative imports and known internal modules
                    if (lib.startsWith('.')) return;
                    if (lib === 'circuit-crawler') return;
                    if (lib === 'readline-sync') return;

                    imports.add(lib);
                });
            } catch (e) {
                // Ignore parse errors here, execution will catch them later
            }
        }

        const modules: Record<string, any> = {};
        const libs = Array.from(imports);

        if (libs.length > 0) {
            this.log(`Installing libraries: ${libs.join(', ')}...`, 'user');
        }

        // Use new Function to bypass webpack/ts transformations of import()
        const dynamicImport = new Function('url', 'return import(url)');

        await Promise.all(libs.map(async (lib) => {
            try {
                // Use esm.sh for easy access. 
                // We default to @latest if not specified.
                // ESM.sh returns ES modules, which works with import()
                const url = `https://esm.sh/${lib}`;
                const mod = await dynamicImport(url);
                modules[lib] = mod;
            } catch (e: any) {
                this.log(`Failed to install ${lib}: ${e.message}`, 'user');
            }
        }));

        return modules;
    }
}
