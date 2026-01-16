'use client';
import { useState, useEffect, useRef } from 'react';
import { generateMaze } from '../lib/maze';
import { MazeConfig, RunnerState } from '../lib/types';
import { RobotController } from '../lib/robot-api';
import MazeDisplay from './MazeDisplay';
import CodeEditor from './CodeEditor';
import * as ts from 'typescript';

// Initial code template
const INITIAL_CODE = `
// Available globals:
// robot: { moveForward(), turnLeft(), turnRight() } (all async)
// readline: { question(prompt) }
// fetch: standard fetch API

async function run() {
  console.log("Starting maze...");
  
  // Example: simple right-hand rule or just move
  await robot.moveForward();
  await robot.moveForward();
  await robot.turnRight();
  await robot.moveForward();
}

// Don't forget to call run!
run();
`;

export default function MazeGame() {
    const [maze, setMaze] = useState<MazeConfig | null>(null);
    const [robotState, setRobotState] = useState<RunnerState | null>(null);
    const [code, setCode] = useState(INITIAL_CODE);
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    // Initialize maze
    useEffect(() => {
        const newMaze = generateMaze(15, 15);
        setMaze(newMaze);
        setRobotState({
            position: newMaze.start,
            direction: 'East',
        });
    }, []);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const resetGame = () => {
        if (!maze) return;
        setRobotState({
            position: maze.start,
            direction: 'East',
        });
        setLogs([]);
        setIsRunning(false);
    };

    const transpileCode = (source: string) => {
        try {
            const result = ts.transpileModule(source, {
                compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 }
            });
            return result.outputText;
        } catch (e: any) {
            addLog(`Compilation Error: ${e.message}`);
            throw e;
        }
    };

    const runCode = async () => {
        if (!maze || !robotState) return;

        // Reset before running
        resetGame();
        setIsRunning(true);
        addLog("Compiling...");

        // Create a NEW robot controller linked to the UI state
        // We need a way to 'update' the UI state from the async execution
        // BUT 'resetGame' sets the state async. 
        // We should wait for reset, or just use a fresh initial state ref.
        // Ideally we lock the "Run" button.

        // Let's create a "live" robot controller that updates react state
        // We start from the INITIAL position (maze start)
        const startState = {
            position: maze.start,
            direction: 'East' as const,
        };

        // Immediate update to show reset
        setRobotState(startState);

        const controller = new RobotController(
            startState,
            maze.walls,
            (newState, logMsg) => {
                setRobotState(newState);
                addLog(logMsg);
            }
        );

        try {
            const jsCode = transpileCode(code);
            addLog("Running...");

            // Sandbox / API injection
            const api = {
                robot: {
                    moveForward: () => controller.moveForward(),
                    turnLeft: () => controller.turnLeft(),
                    turnRight: () => controller.turnRight(),
                },
                readline: {
                    question: (promptText: string) => {
                        const ans = window.prompt(promptText);
                        addLog(`Input: ${ans}`);
                        return ans;
                    }
                },
                fetch: window.fetch.bind(window),
                console: {
                    log: (...args: any[]) => addLog(`LOG: ${args.join(' ')}`),
                    error: (...args: any[]) => addLog(`ERR: ${args.join(' ')}`),
                }
            };

            // Wrap in async function to allow top-level awaits if needed (though we wrapped in 'run' function in template)
            // But user might change it.
            // We will create a Function with arguments.

            const runFn = new Function('robot', 'readline', 'fetch', 'console', jsCode);

            await runFn(api.robot, api.readline, api.fetch, api.console);

            addLog("Execution finished.");
        } catch (e: any) {
            addLog(`Runtime Error: ${e.message}`);
            console.error(e);
        } finally {
            setIsRunning(false);
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
                        onClick={runCode}
                        disabled={isRunning}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50 font-bold"
                    >
                        {isRunning ? 'Running...' : 'Run Code'}
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
                    <div className="flex justify-center p-4 bg-gray-800 rounded-lg">
                        <MazeDisplay maze={maze} robotState={robotState} />
                    </div>

                    <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 font-mono text-sm overflow-y-auto">
                        <div className="text-gray-400 border-b border-gray-700 pb-1 mb-2">Logs</div>
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1">{log}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
