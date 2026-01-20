import { RunnerState } from "@/lib/types";
import { useRef } from "react";

interface HeaderProps {
    robotState: RunnerState | null;
    isRunning: boolean;
    handleFileImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    resetGame: () => void;
    runCode: () => void;
    stopExecution: () => void;
}

const Header = ({ robotState, isRunning, handleFileImport, resetGame, runCode, stopExecution }: HeaderProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <header className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">🤖 Robot Maze Runner</h1>
                {robotState && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Health:</span>
                        <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                            <div
                                className={`h-full transition-all duration-300 ${robotState.health > 50 ? 'bg-green-500' : robotState.health > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${robotState.health}%` }}
                            />
                        </div>
                        <span className={`font-mono font-bold ${robotState.health > 50 ? 'text-green-500' : robotState.health > 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {robotState.health}/100
                        </span>
                    </div>
                )}
            </div>
            <div className="space-x-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                    accept=".json"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRunning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50"
                >
                    Import Maze
                </button>
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
    )
}

export default Header;