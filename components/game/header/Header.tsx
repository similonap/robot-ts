import { MazeConfig } from "@/lib/types";
import { useRef } from "react";
import { useMazeGameContext } from "../context/MazeGameContext";

interface HeaderProps {

}

const Header = () => {
    const { onMazeLoaded, isRunning, stopExecution, resetGame, runCode, loadSolution, hasSolution } = useMazeGameContext();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json) as MazeConfig;

                // Simple validation
                if (!parsed.width || !parsed.height || !parsed.walls) {
                    throw new Error("Invalid maze content");
                }

                if (isRunning) stopExecution();

                onMazeLoaded(parsed);

            } catch (err) {
                alert("Failed to import maze: " + (err as any).message);
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    return (
        <header className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-3 border-b border-cyan-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)] sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <h1 className="text-xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
                        Circuit Crawler
                    </h1>
                </div>


            </div>
            <div className="flex items-center gap-3">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                    accept=".json"
                />

                <div className="h-8 w-px bg-gray-800 mx-1"></div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRunning}
                    className="px-4 py-1.5 text-sm font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/30 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    IMPORT_MAZE
                </button>
                <button
                    onClick={() => {
                        if (confirm('This will replace your current code with the solution. Are you sure?')) {
                            loadSolution();
                        }
                    }}
                    disabled={isRunning || !hasSolution}
                    className="px-4 py-1.5 text-sm font-mono text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 border border-yellow-500/30 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    SOLUTION
                </button>
                <button
                    onClick={resetGame}
                    disabled={isRunning}
                    className="px-4 py-1.5 text-sm font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 hover:border-gray-500 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    RESET
                </button>
                <button
                    onClick={isRunning ? stopExecution : runCode}
                    className={`px-6 py-1.5 text-sm font-mono font-bold rounded shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all ${isRunning
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        }`}
                >
                    {isRunning ? '[ STOP_EXECUTION ]' : '[ RUN_CODE ]'}
                </button>
            </div>
        </header>
    )
}

export default Header;