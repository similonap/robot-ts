import { useRef, useState } from 'react';
import { CancelError, CrashError, HealthDepletedError, RobotController } from "@/lib/robot-api";
import { Item, MazeConfig, PublicApi, RobotAppearance, RunnerState } from "@/lib/types";
import ts from "typescript";

interface UseCodeRunnerProps {
    maze: MazeConfig;
    robotState: RunnerState;
    setRobotState: (state: RunnerState) => void;
    addLog: (msg: string, type: 'robot' | 'user') => void;
    files: Record<string, string>;
    setLogs: (logs: any[]) => void; // Using any[] for now or properly typed
}

export const useCodeRunner = ({ maze, robotState, setRobotState, addLog, files, setLogs }: UseCodeRunnerProps) => {
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

        // We need to reset robot state here. 
        // Note: The caller might have passed a reset function, or we construct it here.
        // But since we have setRobotState, we can construct the initial state.
        // Ideally we use a passed 'reset' function or 'initialState' but hardcoding logic here is fine for now
        // to match original behavior which did:
        const startState: RunnerState = {
            position: maze.start,
            direction: 'East',
            inventory: [],
            doorStates: {},
            revealedItemIds: [],
            collectedItemIds: [],
            speed: 500,
            health: 100,
        };
        setRobotState(startState);


        setIsRunning(true);
        addLog("Compiling...", 'user');

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Ref to hold require function which is created later
        const customRequireRef = { current: null as ((path: string) => any) | null };
        const stepLogicFnRef = { current: null as Function | null };

        let controller: RobotController;

        const gameApi = {
            win: (msg: string) => {
                addLog(`🏆 WIN: ${msg}`, 'user');
                alert(`🏆 WIN: ${msg}`);
                stopExecution();
            },
            fail: (msg: string) => {
                addLog(`💀 FAIL: ${msg}`, 'user');
                stopExecution();
            },
            get items() {
                return controller?.getRemainingItems() || [];
            }
        };

        // Initialize controller
        controller = new RobotController(
            startState,
            maze.walls,
            (newState, logMsg) => {
                setRobotState(newState);
                addLog(logMsg, 'robot');
            },
            abortController.signal,
            maze.items,
            maze.doors || []
        );

        if (maze.stepCode) {
            try {
                const js = transpileCode(maze.stepCode);
                // Function(robot, maze, game, require, exports)
                stepLogicFnRef.current = new Function('robot', 'maze', 'game', 'require', 'exports', js);
            } catch (e) {
                addLog(`Level Logic Compilation Failed: ${e}`, 'user');
            }
        }

        try {
            // Transpile all files
            const modules: Record<string, any> = {};
            const transpiledFiles: Record<string, string> = {};

            for (const [filename, content] of Object.entries(files)) {
                transpiledFiles[filename] = transpileCode(content);
            }

            addLog("Running...", 'user');

            const api: PublicApi = {
                robot: {
                    get direction() { return controller.direction; },
                    get inventory() { return controller.inventory; },
                    get health() { return controller.health; },
                    get position() { return controller.position; },
                    moveForward: () => controller.moveForward(),
                    turnLeft: () => controller.turnLeft(),
                    turnRight: () => controller.turnRight(),
                    canMoveForward: () => controller.canMoveForward(),
                    pickup: () => controller.pickup(),
                    scan: () => controller.scan(),
                    echo: () => controller.echo(),
                    openDoor: (key?: string | Item | Item[]) => controller.openDoor(key),
                    closeDoor: () => controller.closeDoor(),
                    setSpeed: (delay: number) => controller.setSpeed(delay),
                    setAppearance: (appearance: RobotAppearance) => controller.setAppearance(appearance),
                    addEventListener: (event: string, handler: (payload?: any) => void) => controller.addEventListener(event, handler),
                },
                game: gameApi,
                readline: {
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
                            const val = await api.readline.question(promptText);
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) return num;
                            api.console.error("Please enter a valid integer.");
                        }
                    },
                    questionFloat: async (promptText: string) => {
                        while (true) {
                            const val = await api.readline.question(promptText);
                            const num = parseFloat(val);
                            if (!isNaN(num)) return num;
                            api.console.error("Please enter a valid number.");
                        }
                    }
                },
                fetch: async (input: RequestInfo, init?: RequestInit) => {
                    if (abortController.signal.aborted) throw new CancelError();
                    return window.fetch(input, init);
                },
                console: {
                    log: (...args: any[]) => addLog(`LOG: ${args.join(' ')}`, 'user'),
                    error: (...args: any[]) => addLog(`ERR: ${args.join(' ')}`, 'user'),
                }
            };

            // Custom require implementation
            const customRequire = (path: string) => {
                if (path === 'robot-maze') {
                    return { robot: api.robot, game: api.game };
                }
                if (path === 'robot') {
                    throw new Error("Module 'robot' is deprecated. Use 'robot-maze'.");
                }
                if (path === 'readline-sync') {
                    return {
                        default: api.readline,
                        ...api.readline
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
                const modFn = new Function('exports', 'require', 'robot', 'readline', 'fetch', 'console', transpiledFiles[filename]);
                modFn(moduleExports, customRequire, api.robot, api.readline, api.fetch, api.console);

                return moduleExports;
            };

            customRequireRef.current = customRequire;

            // Initialize Level Logic ONCE provided we have the API
            if (stepLogicFnRef.current) {
                try {
                    const moduleExports = {};
                    // Pass the robot API object, not the state!
                    stepLogicFnRef.current(api.robot, maze, gameApi, customRequireRef.current, moduleExports);
                } catch (e: any) {
                    addLog(`Level Logic Init Error: ${e.message}`, 'user');
                }
            }

            // Execution Main
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            // Allow top-level await only in main.ts
            const finalCode = transpiledFiles['main.ts'] + '\n\nif (typeof main === "function") { await main(); }';

            const runFn = new AsyncFunction('robot', 'readline', 'fetch', 'console', 'require', 'exports', finalCode);

            const mainExports = {};
            await runFn(api.robot, api.readline, api.fetch, api.console, customRequire, mainExports);

            addLog("Execution finished.", 'user');
        } catch (e: any) {
            if (e instanceof CancelError || e.name === 'CancelError') {
                addLog(`🛑 Execution Stopped.`, 'user');
            } else if (e instanceof CrashError || e.name === 'CrashError') {
                addLog(`💥 CRASH! ${e.message}`, 'user');
            } else if (e instanceof HealthDepletedError || e.name === 'HealthDepletedError') {
                addLog(`💀 GAME OVER! ${e.message}`, 'user');
            } else {
                addLog(`Runtime Error: ${e.message}`, 'user');
                console.error(e);
            }
        } finally {
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
