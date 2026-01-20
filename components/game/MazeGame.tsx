'use client';
import { useState, useEffect, useRef } from 'react';

import { MazeConfig, PublicApi, RunnerState, Item, LogEntry } from '../../lib/types';
import { RobotController, CancelError, CrashError } from '../../lib/robot-api';
import MazeDisplay from '../MazeDisplay';
import CodeEditor from '../CodeEditor';
import ResizableSplit from '../ResizableSplit';
import * as ts from 'typescript';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from './header/Header';

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

export default function MazeGame({ sharedTypes, initialMaze, initialFiles }: { sharedTypes: string; initialMaze: MazeConfig; initialFiles?: Record<string, string> }) {
    const [maze, setMaze] = useState<MazeConfig | null>(initialMaze);
    const [robotState, setRobotState] = useState<RunnerState | null>(null);
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

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showRobotLogs, setShowRobotLogs] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [inputValue, setInputValue] = useState('');


    const abortControllerRef = useRef<AbortController | null>(null);
    const inputResolveRef = useRef<((value: string) => void) | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);


    // Initialize robot state
    useEffect(() => {
        if (maze) {
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
        }
    }, [maze]);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs, isWaitingForInput, showRobotLogs]);

    const addLog = (msg: string, type: 'robot' | 'user' = 'user') => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            message: `[${new Date().toLocaleTimeString()}] ${msg}`,
            type
        }]);
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

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json) as MazeConfig;

                // Simple validation
                if (!parsed.width || !parsed.height || !parsed.start || !parsed.walls) {
                    throw new Error("Invalid maze content");
                }

                if (isRunning) stopExecution();

                setMaze(parsed);
                setRobotState({
                    position: parsed.start,
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

            } catch (err) {
                alert("Failed to import maze: " + (err as any).message);
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputResolveRef.current) {
            addLog(`${inputPrompt}${inputValue}`, 'user');
            inputResolveRef.current(inputValue);
            inputResolveRef.current = null;
            setIsWaitingForInput(false);
            setInputValue('');
        }
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

    if (!maze || !robotState) return <div className="p-10">Loading Maze...</div>;

    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            <Header
                robotState={robotState}
                isRunning={isRunning}
                handleFileImport={handleFileImport}
                resetGame={resetGame}
                runCode={runCode}
                stopExecution={stopExecution}
            />

            <div className="flex-1 overflow-hidden relative">
                <ResizableSplit
                    id="main-split"
                    initialSplit={50}
                    minSplit={20}
                    maxSplit={80}
                    first={
                        <div className="w-full h-full flex flex-col min-w-0 border border-gray-700 rounded-md overflow-hidden bg-gray-900">
                            {/* Tabs */}
                            <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto flex-shrink-0">
                                {Object.keys(files).sort((a, b) => {
                                    if (a === 'README' || a === 'README.md') return -1;
                                    if (b === 'README' || b === 'README.md') return 1;
                                    if (a === 'main.ts') return -1;
                                    if (b === 'main.ts') return 1;
                                    return a.localeCompare(b);
                                }).map(filename => (
                                    <div
                                        key={filename}
                                        onClick={() => setActiveFile(filename)}
                                        className={`group px-3 py-2 text-sm cursor-pointer flex items-center gap-2 border-r border-gray-700 select-none ${activeFile === filename ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        <span>{filename}</span>
                                        {filename !== 'main.ts' && filename !== 'README' && (
                                            <button
                                                onClick={(e) => handleDeleteFile(filename, e)}
                                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddFile}
                                    className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 text-lg leading-none"
                                    title="Add File"
                                >
                                    +
                                </button>
                            </div>

                            <div className="flex-1 relative overflow-hidden">
                                {activeFile === 'README' || activeFile.endsWith('.md') ? (
                                    <div className="w-full h-full p-6 overflow-auto bg-gray-900 text-gray-200">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 text-white pb-2 border-b border-gray-700" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-white" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2 text-white" {...props} />,
                                                h4: ({ node, ...props }) => <h4 className="text-lg font-bold mt-3 mb-2 text-white" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 pl-2 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 pl-2 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-600 pl-4 italic my-4 text-gray-400" {...props} />,
                                                code: ({ node, className, children, ...props }) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const isInline = !match && !String(children).includes('\n');
                                                    return isInline ? (
                                                        <code className="bg-gray-800 rounded px-1.5 py-0.5 text-sm font-mono text-pink-400" {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <code className="block bg-gray-800 rounded p-4 mb-4 text-sm font-mono overflow-x-auto whitespace-pre" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {files[activeFile]}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <CodeEditor
                                        files={files}
                                        activeFile={activeFile}
                                        onChange={(val) => setFiles(prev => ({ ...prev, [activeFile]: val || '' }))}
                                        sharedTypes={sharedTypes}
                                    />
                                )}
                            </div>
                        </div>
                    }
                    second={
                        <ResizableSplit
                            id="game-split"
                            isVertical
                            initialSplit={60}
                            minSplit={20}
                            maxSplit={80}
                            first={
                                <div className="w-full h-full bg-gray-800 rounded-lg overflow-hidden relative flex items-center justify-center p-2">
                                    <MazeDisplay maze={maze} robotState={robotState} />
                                </div>
                            }
                            second={
                                <div className="w-full h-full bg-gray-900 border border-gray-700 rounded p-2 font-mono text-sm overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center text-gray-400 border-b border-gray-700 pb-1 mb-2 bg-gray-900 flex-shrink-0">
                                        <span>Terminal</span>
                                        <label className="text-xs flex items-center gap-1 cursor-pointer hover:text-white">
                                            <input
                                                type="checkbox"
                                                checked={showRobotLogs}
                                                onChange={(e) => setShowRobotLogs(e.target.checked)}
                                                className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-offset-gray-900 focus:ring-green-500"
                                            />
                                            Show Robot Logs
                                        </label>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {logs
                                            .filter(log => log.type === 'user' || showRobotLogs)
                                            .map((log) => (
                                                <div key={log.id} className={`mb-1 break-words ${log.type === 'robot' ? 'text-gray-500' : 'text-gray-200'}`}>
                                                    {log.message}
                                                </div>
                                            ))}
                                        <div ref={logsEndRef} />
                                    </div>

                                    {isWaitingForInput && (
                                        <form onSubmit={handleInputSubmit} className="mt-2 border-t border-gray-700 pt-2 flex gap-2 flex-shrink-0">
                                            <span className="text-green-500">{inputPrompt}</span>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0"
                                                placeholder="..."
                                            />
                                        </form>
                                    )}
                                </div>
                            }
                        />
                    }
                />
            </div>
        </div>
    );
}
