'use client';
import { useState, useEffect, useRef } from 'react';
import { generateMaze } from '../lib/maze';
import { MazeConfig, RunnerState } from '../lib/types';
import { RobotController, CancelError, CrashError } from '../lib/robot-api';
import MazeDisplay from './MazeDisplay';
import CodeEditor from './CodeEditor';
import * as ts from 'typescript';

// Initial code template
const INITIAL_CODE = `async function main() {
    // Keep running until the program is stopped or the maze is solved
    while (true) {
        // STRATEGY: RIGHT-HAND RULE
        
        // 1. Always try to turn Right first. 
        // We want to hug the right wall, so we assume the right path is the way to go.
        robot.turnRight();

        // 2. Check if the path ahead is clear.
        // If the path is blocked (wall), turn Left to check the next direction.
        // - If we turned Right and it's blocked, turning Left faces us Forward again.
        // - If Forward is blocked, turning Left faces us Left.
        // - If Left is blocked, turning Left faces us Backward (dead end).
        while (!(await robot.canMoveForward())) {
            robot.turnLeft();
        }

        // 3. We found an opening! Move into it.
        await robot.moveForward();
    }
}`;

export default function MazeGame() {
    const [maze, setMaze] = useState<MazeConfig | null>(null);
    const [robotState, setRobotState] = useState<RunnerState | null>(null);
    const [code, setCode] = useState(INITIAL_CODE);
    interface LogEntry {
        id: string;
        timestamp: number;
        message: string;
        type: 'robot' | 'user';
    }

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showRobotLogs, setShowRobotLogs] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputPrompt, setInputPrompt] = useState('');
    const [inputValue, setInputValue] = useState('');


    const abortControllerRef = useRef<AbortController | null>(null);
    const inputResolveRef = useRef<((value: string) => void) | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Initialize maze
    useEffect(() => {
        const newMaze = generateMaze(15, 15);
        setMaze(newMaze);
        setRobotState({
            position: newMaze.start,
            direction: 'East',
            inventory: [],
        });
    }, []);

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
        if (!maze) return;
        if (isRunning) {
            stopExecution();
        }

        setRobotState({
            position: maze.start,
            direction: 'East',
            inventory: [],
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
                                expr.name.text === 'question') {

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
                compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2017 },
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
        });


        setIsRunning(true);
        addLog("Compiling...", 'user');

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const startState = {
            position: maze.start,
            direction: 'East' as const,
            inventory: [],
        };

        setRobotState(startState);

        const controller = new RobotController(
            startState,
            maze.walls,
            (newState, logMsg) => {
                setRobotState(newState);
                addLog(logMsg, 'robot');


            },
            abortController.signal,
            maze.items
        );

        try {
            const jsCode = transpileCode(code);
            addLog("Running...", 'user');

            const api = {
                robot: {
                    moveForward: () => controller.moveForward(),
                    turnLeft: () => controller.turnLeft(),
                    turnRight: () => controller.turnRight(),
                    canMoveForward: () => controller.canMoveForward(),
                    pickup: () => controller.pickup(),
                    scan: () => controller.scan(),
                },
                readline: {
                    question: (promptText: string) => {
                        return new Promise<string>((resolve, reject) => {
                            if (abortController.signal.aborted) return reject(new CancelError());

                            setInputPrompt(promptText);
                            setIsWaitingForInput(true);
                            inputResolveRef.current = resolve;

                            // Handle abort while waiting
                            abortController.signal.addEventListener('abort', () => {
                                setIsWaitingForInput(false);
                                inputResolveRef.current = null;
                                reject(new CancelError());
                            });
                        });
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

            // Use AsyncFunction to allow top-level await and proper async execution
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            // Append auto-runner for main function if it exists
            const finalCode = jsCode + '\n\nif (typeof main === "function") { await main(); }';

            const runFn = new AsyncFunction('robot', 'readline', 'fetch', 'console', finalCode);

            await runFn(api.robot, api.readline, api.fetch, api.console);

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
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">🤖 Robot Maze Runner</h1>
                <div className="space-x-4">
                    <button
                        onClick={resetGame}
                        disabled={isRunning}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                        Reset
                    </button>
                    <button
                        onClick={isRunning ? stopExecution : runCode}
                        className={`px-4 py-2 rounded font-bold ${isRunning
                            ? 'bg-red-600 hover:bg-red-500'
                            : 'bg-green-600 hover:bg-green-500'
                            }`}
                    >
                        {isRunning ? 'Stop' : 'Run Code'}
                    </button>
                </div>
            </header>

            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Editor Column */}
                <div className="flex-1 flex flex-col min-w-0">
                    <CodeEditor code={code} onChange={(val) => setCode(val || '')} />
                </div>

                {/* Game Column */}
                <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
                    <div className="flex justify-center p-4 bg-gray-800 rounded-lg relative">
                        <MazeDisplay maze={maze} robotState={robotState} />
                    </div>

                    <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 font-mono text-sm overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center text-gray-400 border-b border-gray-700 pb-1 mb-2 sticky top-0 bg-gray-900">
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
                            <form onSubmit={handleInputSubmit} className="mt-2 border-t border-gray-700 pt-2 flex gap-2">
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
                </div>
            </div>
        </div>
    );
}
