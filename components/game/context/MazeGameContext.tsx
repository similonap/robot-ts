import { CancelError, CrashError, RobotController } from "@/lib/robot-api";
import { Item, LogEntry, MazeConfig, PublicApi, RunnerState } from "@/lib/types";
import { createContext, RefObject, useContext, useRef, useState } from "react";
import ts from "typescript";

interface MazeGameContextType {
    maze: MazeConfig | null
    robotState: RunnerState | null;
    isRunning: boolean;
    onMazeLoaded: (maze: MazeConfig) => void;
    resetGame: () => void;
    runCode: () => void;
    stopExecution: () => void;
    setRobotState: (state: RunnerState) => void;
    setShowRobotLogs: (show: boolean) => void;
    showRobotLogs: boolean;
    logs: LogEntry[];
    addLog: (msg: string, type: 'robot' | 'user') => void;
    isWaitingForInput: boolean;
    files: Record<string, string>;
    handleAddFile: () => void;
    handleDeleteFile: (name: string, e: React.MouseEvent) => void;
    activeFile: string;
    setActiveFile: (file: string) => void;
    inputResolveRef: RefObject<((value: string) => void) | null>;
    inputPrompt: string;
    inputValue: string;
    setInputValue: (value: string) => void;
    setIsWaitingForInput: (value: boolean) => void;
    changeFile: (file: string, content: string) => void;
}

export const MazeGameContext = createContext<MazeGameContextType>({
    maze: null,
    robotState: null,
    isRunning: false,
    onMazeLoaded: () => { },
    resetGame: () => { },
    runCode: () => { },
    stopExecution: () => { },
    setRobotState: () => { },
    setShowRobotLogs: () => { },
    showRobotLogs: false,
    logs: [],
    addLog: () => { },
    isWaitingForInput: false,
    files: {},
    handleAddFile: () => { },
    handleDeleteFile: () => { },
    activeFile: '',
    setActiveFile: (file: string) => { },
    inputResolveRef: {} as RefObject<((value: string) => void) | null>,
    inputPrompt: '',
    inputValue: '',
    setInputValue: (value: string) => { },
    setIsWaitingForInput: (value: boolean) => { },
    changeFile: (file: string, content: string) => { }
});

interface MazeGameProviderProps {
    initialMaze: MazeConfig;
    initialFiles?: Record<string, string>;
}

// Initial code template
const INITIAL_CODE = `import { robot } from "robot-maze";

async function main() {
    // Keep running until the program is stopped or the maze is solved
    while (true) {
        // STRATEGY: RIGHT-HAND RULE
        
        // 1. Always try to turn Right first. 
        // We want to hug the right wall, so we assume the right path is the way to go.
        await robot.turnRight();

        // 2. Check if the path ahead is clear.
        // If the path is blocked (wall), turn Left to check the next direction.
        // - If we turned Right and it's blocked, turning Left faces us Forward again.
        // - If Forward is blocked, turning Left faces us Left.
        // - If Left is blocked, turning Left faces us Backward (dead end).
        while (!(await robot.canMoveForward())) {
            await robot.turnLeft();
        }

        // 3. We found an opening! Move into it.
        await robot.moveForward();
    }
}`;

export const MazeGameContextProvider = ({ initialMaze, initialFiles, children }: React.PropsWithChildren<MazeGameProviderProps>) => {
    const [maze, setMaze] = useState<MazeConfig | null>(initialMaze);
    const [robotState, setRobotState] = useState<RunnerState | null>(null);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputResolveRef = useRef<((value: string) => void) | null>(null);
    const [inputPrompt, setInputPrompt] = useState('');
    const [showRobotLogs, setShowRobotLogs] = useState(false);


    const [files, setFiles] = useState<Record<string, string>>({
        'main.ts': INITIAL_CODE,
        ...initialFiles
    });
    const [activeFile, setActiveFile] = useState(() => {
        if (!initialFiles) return 'main.ts';
        if (initialFiles['README']) return 'README';
        if (initialFiles['README.md']) return 'README.md';
        return 'main.ts';
    });


    const addLog = (msg: string, type: 'robot' | 'user' = 'user') => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            message: `[${new Date().toLocaleTimeString()}] ${msg}`,
            type
        }]);
    };

    const onMazeLoaded = (maze: MazeConfig) => {
        setMaze(maze);
        setRobotState({
            position: maze.start,
            direction: 'East',
            inventory: [],
            doorStates: {},
            revealedItemIds: [],
            collectedItemIds: [],
            speed: 500,
            health: 100,
        });
        setLogs([]);
        setIsRunning(false);
        setIsWaitingForInput(false);
        addLog("Maze imported successfully!", 'user');
    };

    const stopExecution = () => {
        if (inputResolveRef.current) {
            // If waiting for input, reject or resolve with null/empty to unblock or just abort?
            // The abort signal in runCode's question handler should take care of it, 
            // but we need to verify.
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsWaitingForInput(false);
    };

    const changeFile = (file: string, content: string) => {
        setFiles(prev => ({ ...prev, [file]: content }));
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
        if (!maze || !robotState) return;

        // Reset before running
        setLogs([]);
        setRobotState({
            position: maze.start,
            direction: 'East',
            inventory: [],
            revealedItemIds: [],
            doorStates: {},
            speed: 500,
            health: 100,
            collectedItemIds: [],
        });


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

        const startState = {
            position: maze.start,
            direction: 'East' as const,
            inventory: [],
            doorStates: {},
            revealedItemIds: [],
            collectedItemIds: [],
            speed: 500,
            health: 100,
        };

        setRobotState(startState);

        controller = new RobotController(
            startState,
            maze.walls,
            (newState, logMsg) => {
                setRobotState(newState);
                addLog(logMsg, 'robot');

                // Execute Level Logic
                if (maze.stepCode) {
                    try {
                        // We need a way to run this safely.
                        // Since we are already in an async flow, we can just run it.
                        // Ideally we pre-compiled this.
                        if (!stepLogicFnRef.current) return;

                        // Use the MAIN gameApi instance so it's consistent
                        // Pass require and exports to support module transpilation
                        const moduleExports = {};
                        stepLogicFnRef.current(newState, maze, gameApi, customRequireRef.current, moduleExports);

                    } catch (e: any) {
                        if (e instanceof CrashError) throw e; // Propagate crash
                        console.error("Level Logic Error:", e);
                        addLog(`Level Logic Error: ${e.message}`, 'user');
                    }
                }
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
                    // Deprecated / Backwards compat if we wanted, 
                    // but user asked to change logic.
                    // We'll throw error or map it? 
                    // Let's support it temporarily or just remove it per instructions "instead of".
                    // I will remove it to be strict.
                    throw new Error("Module 'robot' is deprecated. Use 'robot-maze'.");
                }
                if (path === 'readline-sync') {
                    // Since user does "import readline from 'readline-sync'", and we used "export function question..."
                    // The default export isn't defined in the module declaration I just wrote above?
                    // Wait, `import readline from ...` implies default export if esModuleInterop is true.
                    // Or `import * as readline from ...`
                    // My module decl: `export function question...`.
                    // If I want `import readline from ...` to work with `readline.question`, I should either:
                    // 1. Export default object with question.
                    // 2. Or assume user uses `import * as readline`.
                    // The user request said: 'the package is named "readline-sync"'.
                    // Usually `readline-sync` (the real npm package) is `const readline = require('readline-sync')`.
                    // So in TS `import readline = require('readline-sync')` or `import * as readline`.
                    // To make `import readline from ...` work nicely we should provide a default.
                    return {
                        default: api.readline,
                        ...api.readline
                    };
                }

                // simple resolution: remove './' and add '.ts' if missing, 
                // or just match filename
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

            // Assign to ref for circular usage in callbacks
            customRequireRef.current = customRequire;

            // Execution Main
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            // Allow top-level await only in main.ts
            const finalCode = transpiledFiles['main.ts'] + '\n\nif (typeof main === "function") { await main(); }';

            const runFn = new AsyncFunction('robot', 'readline', 'fetch', 'console', 'require', 'exports', finalCode);

            const mainExports = {};
            await runFn(api.robot, api.readline, api.fetch, api.console, customRequire, mainExports);

            addLog("Execution finished.", 'user');
        } catch (e: any) {
            // DEBUG LOGGING
            console.log('Caught error:', e);
            console.log('e.name:', e.name);
            console.log('e instanceof CancelError:', e instanceof CancelError);
            console.log('Is crash?', e instanceof CrashError);

            if (e instanceof CancelError || e.name === 'CancelError') {
                addLog(`🛑 Execution Stopped.`, 'user');
            } else if (e instanceof CrashError || e.name === 'CrashError') {
                addLog(`💥 CRASH! ${e.message}`, 'user');
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

    const handleAddFile = () => {
        const name = prompt("Enter file name (e.g. utils.ts):");
        if (name) {
            if (files[name]) {
                alert("File already exists!");
                return;
            }
            setFiles(prev => ({ ...prev, [name]: '' }));
            setActiveFile(name);
        }
    };

    const handleDeleteFile = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (name === 'main.ts' || name === 'README' || name === 'README.md') return;
        if (confirm(`Delete ${name}?`)) {
            setFiles(prev => {
                const newFiles = { ...prev };
                delete newFiles[name];
                return newFiles;
            });
            if (activeFile === name) {
                setActiveFile('main.ts');
            }
        }
    };


    const resetGame = () => {
        if (isRunning) {
            stopExecution();
        }

        // Reset to initial maze if needed? 
        // User asked to just show random maze essentially.
        // Actually, if we want "reset" to just reset position:
        if (!maze) return;

        setRobotState({
            position: maze.start,
            direction: 'East',
            revealedItemIds: [],
            inventory: [],
            doorStates: {},
            collectedItemIds: [],
            speed: 500,
            health: 100,
        });
        setLogs([]);
        setIsRunning(false);
        setIsWaitingForInput(false);
        setInputValue('');

    };

    return (
        <MazeGameContext.Provider value={{ maze, robotState, isRunning, onMazeLoaded, resetGame, runCode, stopExecution, setRobotState, setShowRobotLogs, showRobotLogs, logs, isWaitingForInput, files, handleAddFile, handleDeleteFile, activeFile, setActiveFile, addLog, inputResolveRef, inputPrompt, inputValue, setInputValue, setIsWaitingForInput, changeFile }}>
            {children}
        </MazeGameContext.Provider>
    )
}

export const useMazeGameContext = () => {
    return useContext(MazeGameContext);
}