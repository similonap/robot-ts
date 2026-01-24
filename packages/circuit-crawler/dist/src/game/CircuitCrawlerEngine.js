"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitCrawlerEngine = void 0;
const robot_api_1 = require("../robot-api");
const WorldManager_1 = require("./WorldManager");
const ts = __importStar(require("typescript"));
class CircuitCrawlerEngine {
    constructor(config) {
        this.robots = new Map();
        this.activeControllers = new Map(); // Keep controllers to access direct logic if needed
        this.isRunning = false;
        this.isWaitingForInput = false;
        this.inputPrompt = '';
        this.abortController = null;
        this.inputResolve = null;
        this.maze = config.maze;
        this.onLog = config.onLog;
        this.onStateChange = config.onStateChange;
        this.onRobotUpdate = config.onRobotUpdate;
        this.onCompletion = config.onCompletion;
        this.fetchImpl = config.fetchImpl || globalThis.fetch;
        if (config.externalWorld) {
            this.worldActions = config.externalWorld.actions;
            this.worldReset = config.externalWorld.reset;
        }
        else {
            // Initialize Internal World
            this.internalWorld = new WorldManager_1.WorldManager(this.maze, () => this.handleStateChange());
            this.worldActions = this.internalWorld.actions;
            this.worldReset = () => this.internalWorld?.reset(this.maze);
        }
        // Initialize Robots
        this.reset();
    }
    handleStateChange() {
        if (this.onStateChange)
            this.onStateChange();
    }
    log(msg, type) {
        if (this.onLog)
            this.onLog(msg, type);
    }
    reset() {
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
    registerRobot(state) {
        this.robots.set(state.name, state);
        if (this.onRobotUpdate)
            this.onRobotUpdate(state.name, state);
    }
    stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isRunning = false;
        this.isWaitingForInput = false;
        this.inputResolve = null;
        this.handleStateChange();
    }
    resolveInput(value) {
        if (this.inputResolve) {
            this.inputResolve(value);
            this.inputResolve = null;
            this.isWaitingForInput = false;
            this.handleStateChange();
        }
    }
    // --- Execution Logic ---
    transpileCode(source) {
        try {
            const autoAwaitTransformer = (context) => {
                return (sourceFile) => {
                    const visitor = (node) => {
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
                    return ts.visitNode(sourceFile, visitor);
                };
            };
            const result = ts.transpileModule(source, {
                compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
                transformers: { before: [autoAwaitTransformer] }
            });
            return result.outputText;
        }
        catch (e) {
            this.log(`Compilation Error: ${e.message}`, 'user');
            throw e;
        }
    }
    async run(files) {
        if (!this.maze)
            return;
        this.reset();
        this.isRunning = true;
        this.handleStateChange(); // Notify run start
        this.log("Compiling...", 'user');
        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        // Logic adapted from useCodeRunner
        // Robot Class factory linked to this instance
        const engine = this;
        const wrapperRobots = new Map();
        class Robot {
            constructor(config) {
                this.name = config.name || `Robot ${engine.activeControllers.size + 1}`;
                const startState = {
                    name: this.name,
                    color: config.color,
                    position: { x: config.x, y: config.y },
                    direction: 'East',
                    inventory: [],
                    speed: 500,
                    health: 100,
                };
                engine.registerRobot(startState);
                engine.handleStateChange();
                this.controller = new robot_api_1.RobotController(startState, engine.maze.walls, engine.worldActions, // UPDATED to use external/internal actions via getter/prop
                (newState, logMsg) => {
                    engine.robots.set(this.name, newState);
                    if (engine.onRobotUpdate)
                        engine.onRobotUpdate(this.name, newState);
                    engine.handleStateChange();
                    if (logMsg)
                        engine.log(logMsg, 'robot');
                }, signal, engine.maze.items, engine.maze.doors || [], () => {
                    // Check Game Over
                    let aliveCount = 0;
                    for (const r of engine.activeControllers.values()) {
                        if (!r.isDestroyed)
                            aliveCount++;
                    }
                    if (aliveCount === 0) {
                        engine.log(`💀 FAIL: All robots destroyed!`, 'user');
                        engine.stop();
                        if (engine.onCompletion)
                            engine.onCompletion(false, "All robots destroyed");
                        return true;
                    }
                    return false;
                });
                engine.activeControllers.set(this.name, this.controller);
                wrapperRobots.set(this.name, this);
            }
            // Helper to safely execute async controller methods
            async safeExec(fn) {
                try {
                    return await fn();
                }
                catch (e) {
                    if (e instanceof robot_api_1.CancelError || (e && e.name === 'CancelError')) {
                        return new Promise(() => { }); // Dead promise
                    }
                    const msg = e instanceof Error ? e.message : String(e);
                    if (e instanceof robot_api_1.HealthDepletedError || (e && e.name === 'HealthDepletedError')) {
                        engine.log(`💀 FAIL: ${msg}`, 'user');
                    }
                    else {
                        engine.log(`Runtime Error: ${msg}`, 'user');
                    }
                    engine.stop();
                    if (engine.onCompletion)
                        engine.onCompletion(false, msg);
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
            openDoor(key) { return this.safeExec(() => this.controller.openDoor(key)); }
            closeDoor() { return this.safeExec(() => this.controller.closeDoor()); }
            setSpeed(delay) { return this.controller.setSpeed(delay); }
            setAppearance(appearance) { return this.controller.setAppearance(appearance); }
            addEventListener(event, handler) { return this.controller.addEventListener(event, handler); }
            damage(amount) { return this.safeExec(() => this.controller.damage(amount)); }
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
                    color: initial.color
                });
            }
        }
        const gameApi = {
            win: (msg) => {
                this.log(`🏆 WIN: ${msg}`, 'user');
                this.stop();
                if (this.onCompletion)
                    this.onCompletion(true, msg);
            },
            fail: (msg) => {
                this.log(`💀 FAIL: ${msg}`, 'user');
                this.stop();
                if (this.onCompletion)
                    this.onCompletion(false, msg);
            },
            getRobot: (name) => {
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
            }
        };
        const RobotProxy = new Proxy(Robot, {
            construct(target, args) {
                const instance = new target(args[0]);
                wrapperRobots.set(instance.name, instance);
                return instance;
            }
        });
        const consoleApi = {
            log: (...args) => this.log(`LOG: ${args.join(' ')}`, 'user'),
            error: (...args) => this.log(`ERR: ${args.join(' ')}`, 'user'),
        };
        const readlineApi = {
            question: (promptText) => {
                return new Promise((resolve, reject) => {
                    if (signal.aborted)
                        return reject(new robot_api_1.CancelError());
                    this.inputPrompt = promptText;
                    this.isWaitingForInput = true;
                    this.inputResolve = resolve;
                    this.handleStateChange();
                    signal.addEventListener('abort', () => {
                        this.isWaitingForInput = false;
                        this.inputResolve = null;
                        this.handleStateChange();
                        reject(new robot_api_1.CancelError());
                    });
                });
            },
            questionInt: async (promptText) => {
                // Simplified implementation reusing question
                while (true) { // Loop until valid
                    const val = await readlineApi.question(promptText);
                    const num = parseInt(val, 10);
                    if (!isNaN(num))
                        return num;
                    consoleApi.error("Please enter a valid integer.");
                }
            },
            questionFloat: async (promptText) => {
                while (true) {
                    const val = await readlineApi.question(promptText);
                    const num = parseFloat(val);
                    if (!isNaN(num))
                        return num;
                    consoleApi.error("Please enter a valid number.");
                }
            }
        };
        // Compilation & Execution
        try {
            const modules = {};
            const transpiledFiles = {};
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
            const customRequire = (path) => {
                if (path === 'circuit-crawler')
                    return { default: gameApi, game: gameApi };
                if (path === 'readline-sync')
                    return { default: readlineApi, ...readlineApi };
                let filename = path.replace(/^\.\//, '');
                if (!filename.endsWith('.ts'))
                    filename += '.ts';
                if (modules[filename])
                    return modules[filename];
                if (!transpiledFiles[filename])
                    throw new Error(`Module not found: ${path}`);
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
                if (signal.aborted)
                    return reject(new robot_api_1.CancelError());
                signal.addEventListener('abort', () => reject(new robot_api_1.CancelError()));
            });
            await Promise.race([
                runFn(gameApi, RobotProxy, readlineApi, this.fetchImpl, consoleApi, customRequire, {}),
                stopPromise
            ]);
            await stopPromise;
        }
        catch (e) {
            if (e instanceof robot_api_1.CancelError || e.name === 'CancelError') {
                this.log(`🛑 Execution Stopped.`, 'user');
            }
            else if (e instanceof robot_api_1.CrashError || e.name === 'CrashError') {
                this.log(`💥 CRASH! ${e.message}`, 'user');
                if (this.onCompletion)
                    this.onCompletion(false, e.message);
            }
            else if (e instanceof robot_api_1.HealthDepletedError || e.name === 'HealthDepletedError') {
                // Handled by Robot controller mostly, but if it bubbles up
                this.log(`💀 FAIL: ${e.message}`, 'user');
                if (this.onCompletion)
                    this.onCompletion(false, e.message);
            }
            else {
                this.log(`Runtime Error: ${e.message}`, 'user');
                console.error(e);
                if (this.onCompletion)
                    this.onCompletion(false, e.message);
            }
        }
        finally {
            this.stop();
        }
    }
}
exports.CircuitCrawlerEngine = CircuitCrawlerEngine;
