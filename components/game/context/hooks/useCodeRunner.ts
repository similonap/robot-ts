import { useRef, useState, useEffect } from 'react';
import { CancelError, CrashError, HealthDepletedError, RobotController } from "@/lib/robot-api";
import { Item, MazeConfig, PublicApi, RobotAppearance, SharedWorldState, RobotState } from "@/lib/types";
import ts from "typescript";

interface UseCodeRunnerProps {
    maze: MazeConfig;
    worldActions: SharedWorldState;
    updateRobotState: (name: string, state: RobotState) => void;
    addLog: (msg: string, type: 'robot' | 'user') => void;
    files: Record<string, string>;
    setLogs: (logs: any[]) => void;
}

export const useCodeRunner = ({ maze, worldActions, updateRobotState, addLog, files, setLogs }: UseCodeRunnerProps) => {
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputPrompt, setInputPrompt] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputResolveRef = useRef<((value: string) => void) | null>(null);

    const stopExecution = () => {
        if (inputResolveRef.current) {
            // Logic to handle pending input if necessary
            // The abort signal in runCode's question handler handles rejection
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsWaitingForInput(false);
    };

    // Suppress unhandled CancelErrors from detached promises (fire-and-forget robot moves)
    // Also handle Game Over errors from detached robots
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            if (reason instanceof CancelError || (reason && reason.name === 'CancelError')) {
                event.preventDefault();
                return;
            }
            if (reason instanceof HealthDepletedError || (reason && reason.name === 'HealthDepletedError')) {
                event.preventDefault();
                addLog(`💀 FAIL: ${reason.message}`, 'user');
                stopExecution();
                return;
            }

            // Handle generic errors (e.g. "Cannot read properties of null")
            // This catches errors in unawaited async functions
            event.preventDefault();
            const msg = reason instanceof Error ? reason.message : String(reason);
            addLog(`Runtime Error (Async): ${msg}`, 'user');
            // Depending on preference, we might not want to stop execution for ALL background errors,
            // but usually for a game like this, an error means something broke.
            // Let's stop it to be safe and visible.
            stopExecution();
        };

        window.addEventListener('unhandledrejection', handler);
        return () => {
            window.removeEventListener('unhandledrejection', handler);
        };
    }, [addLog]); // Ensure we have fresh addLog if it changes



    const transpileCode = (source: string) => {
        try {
            // Custom transformer to auto-await readline.question
            const autoAwaitTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
                return (sourceFile) => {
                    const visitor: ts.Visitor = (node) => {
                        if (ts.isCallExpression(node)) {
                            const expr = node.expression;
                            // Check for readline.question(...)
                            if (ts.isPropertyAccessExpression(expr) &&
                                ts.isIdentifier(expr.expression) &&
                                expr.expression.text === 'readline' &&
                                ts.isIdentifier(expr.name) &&
                                (expr.name.text === 'question' ||
                                    expr.name.text === 'questionInt' ||
                                    expr.name.text === 'questionFloat')) {

                                // Wrap in await
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
            addLog(`Compilation Error: ${e.message}`, 'user');
            throw e;
        }
    };

    const runCode = async () => {
        if (!maze) return;

        // Reset before running
        setLogs([]);
        setIsRunning(true);
        addLog("Compiling...", 'user');

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Ref to hold require function which is created later
        const customRequireRef = { current: null as ((path: string) => any) | null };

        // We collect all controllers to stop them or managing them if needed?
        // Actually we just let them run. Cancellation handles stopping them.

        // Registry for active robots
        const activeRobots = new Map<string, Robot>();

        // Robot Constructor
        class Robot {
            private controller: RobotController;
            public name: string;

            constructor(config: { x: number, y: number, name?: string, color?: string }) {
                // Use provided name or generate default
                this.name = config.name || `Robot ${activeRobots.size + 1}`;

                // Ensure unique name if conflict? 
                // For now allow overwrite or user handles it.
                // Assuming unique names from config for now.

                const startState: RobotState = {
                    name: this.name,
                    color: config.color,
                    position: { x: config.x, y: config.y },
                    direction: 'East',
                    inventory: [],
                    speed: 500,
                    health: 100,
                };

                // Register initial state immediately
                updateRobotState(this.name, startState);

                this.controller = new RobotController(
                    startState,
                    maze.walls,
                    worldActions,
                    (newState, logMsg) => {
                        updateRobotState(this.name, newState);
                        if (logMsg) addLog(logMsg, 'robot');
                    },
                    abortController.signal,
                    maze.items,
                    maze.doors || [],
                    () => {
                        // Check if ALL active robots are destroyed
                        let aliveCount = 0;
                        for (const r of activeRobots.values()) {
                            if (!r.isDestroyed) aliveCount++;
                        }

                        if (aliveCount === 0) {
                            addLog(`💀 FAIL: All robots destroyed!`, 'user');
                            stopExecution();
                            return true;
                        }

                        return aliveCount === 0;
                    }
                );

                activeRobots.set(this.name, this);
            }

            // Helper to safely execute async controller methods
            private async safeExec<T>(fn: () => Promise<T>): Promise<T> {
                try {
                    return await fn();
                } catch (e: any) {
                    if (e instanceof CancelError || (e && e.name === 'CancelError')) {
                        // Freeze execution on cancel
                        return new Promise(() => { });
                    }

                    // Handle other runtime errors (crash, logic error, etc)
                    // We catch them here to prevent unhandled rejections in floating promises
                    const msg = e instanceof Error ? e.message : String(e);

                    if (e instanceof HealthDepletedError || (e && e.name === 'HealthDepletedError')) {
                        addLog(`💀 FAIL: ${msg}`, 'user');
                    } else {
                        addLog(`Runtime Error: ${msg}`, 'user');
                        console.error(e); // Keep looking at console for debugging details if needed
                    }

                    stopExecution();
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

        // Initialize robots from config
        if (maze.initialRobots) {
            for (const initial of maze.initialRobots) {
                new Robot({
                    x: initial.position.x,
                    y: initial.position.y,
                    name: initial.name,
                    color: initial.color
                });
            }
        }

        const gameApi = {
            win: (msg: string) => {
                addLog(`🏆 WIN: ${msg}`, 'user');
                stopExecution();
            },
            fail: (msg: string) => {
                addLog(`💀 FAIL: ${msg}`, 'user');
                stopExecution();
            },
            getRobot: (name: string) => {
                return activeRobots.get(name);
            },
            // items getter needs to access world state? or just static list filtered by world state
            get items() {
                return maze.items.filter(item => !worldActions.isItemCollected(item.id));
            }
        };

        const consoleApi = {
            log: (...args: any[]) => addLog(`LOG: ${args.join(' ')}`, 'user'),
            error: (...args: any[]) => addLog(`ERR: ${args.join(' ')}`, 'user'),
        };

        const readlineApi = {
            question: (promptText: string) => {
                return new Promise<string>((resolve, reject) => {
                    if (abortController.signal.aborted) return reject(new CancelError());
                    setInputPrompt(promptText);
                    setIsWaitingForInput(true);
                    inputResolveRef.current = resolve;
                    abortController.signal.addEventListener('abort', () => {
                        setIsWaitingForInput(false);
                        inputResolveRef.current = null;
                        reject(new CancelError());
                    });
                });
            },
            questionInt: async (promptText: string) => {
                while (true) {
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

        try {
            // Transpile all files
            const modules: Record<string, any> = {};
            const transpiledFiles: Record<string, string> = {};

            for (const [filename, content] of Object.entries(files)) {
                transpiledFiles[filename] = transpileCode(content);
            }

            // Prepare Global Module
            const globalExports = {};
            if (maze.globalModule && maze.globalModule.trim()) {
                try {
                    const transpiledGlobalCode = transpileCode(maze.globalModule);
                    console.log("[DEBUG] Transpiled Global Module:", transpiledGlobalCode);

                    // global module expects (exports, require, Robot, game, console, fetch)
                    // We need to pass: exports, customRequire, Robot, gameApi, consoleApi, fetch

                    const globalFn = new Function('exports', 'require', 'Robot', 'game', 'console', 'fetch', transpiledGlobalCode);
                    globalFn(globalExports, customRequireRef.current, Robot, gameApi, consoleApi, window.fetch);

                } catch (e: any) {
                    addLog(`Global Module Compilation/Execution Error: ${e.message}`, 'user');
                }
            }

            addLog("Running...", 'user');

            // Custom require implementation
            const customRequire = (path: string) => {
                if (path === 'circuit-crawler') {
                    // Support both default import `import game from ...`
                    // AND named import `import { game } from ...` (legacy/user confusion compat)
                    return {
                        default: gameApi,
                        game: gameApi
                    };
                }
                if (path === 'readline-sync') {
                    return {
                        default: readlineApi,
                        ...readlineApi
                    };
                }

                let filename = path.replace(/^\.\//, '');
                if (!filename.endsWith('.ts')) filename += '.ts';

                if (modules[filename]) return modules[filename];

                if (!transpiledFiles[filename]) {
                    throw new Error(`Module not found: ${path}`);
                }

                const moduleExports = {};
                modules[filename] = moduleExports;

                // Execute module
                const modFn = new Function('exports', 'require', 'Robot', 'readline', 'fetch', 'console', transpiledFiles[filename]);
                modFn(moduleExports, customRequire, Robot, readlineApi, window.fetch, consoleApi);

                return moduleExports;
            };

            customRequireRef.current = customRequire;



            // Execution Main
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            // Allow top-level await only in main.ts
            // Allow top-level await only in main.ts
            const finalCode = transpiledFiles['main.ts'] + '\n\nif (typeof main === "function") { await main(); }';

            const runFn = new AsyncFunction('game', 'Robot', 'readline', 'fetch', 'console', 'require', 'exports', finalCode);

            const mainExports = {};
            // Race between execution and cancellation
            const stopPromise = new Promise((_, reject) => {
                if (abortController.signal.aborted) return reject(new CancelError());
                abortController.signal.addEventListener('abort', () => reject(new CancelError()));
            });

            await Promise.race([
                runFn(gameApi, Robot, readlineApi, window.fetch, consoleApi, customRequire, mainExports),
                stopPromise
            ]);

            // Keep running until explicitly stopped (win/fail/stop button)
            await stopPromise;

        } catch (e: any) {
            if (e instanceof CancelError || e.name === 'CancelError') {
                addLog(`🛑 Execution Stopped.`, 'user');
            } else if (e instanceof CrashError || e.name === 'CrashError') {
                addLog(`💥 CRASH! ${e.message}`, 'user');
            } else if (e instanceof HealthDepletedError || e.name === 'HealthDepletedError') {
                addLog(`💀 FAIL: ${e.message}`, 'user');
            } else {
                addLog(`Runtime Error: ${e.message}`, 'user');
                console.error(e);
            }
        } finally {
            // Abort any pending operations (like unawaited robot moves)
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            setIsRunning(false);
            setIsWaitingForInput(false);
            abortControllerRef.current = null;
            inputResolveRef.current = null;
        }
    };

    return {
        isRunning,
        setIsRunning,
        isWaitingForInput,
        setIsWaitingForInput,
        inputValue,
        setInputValue,
        inputPrompt,
        inputResolveRef,
        runCode,
        stopExecution
    };
};
