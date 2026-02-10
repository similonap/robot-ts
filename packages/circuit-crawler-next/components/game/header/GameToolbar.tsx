import { MazeConfig } from "circuit-crawler";
import { useRef } from "react";
import { useMazeGameContext } from "../context/MazeGameContext";
import JSZip from "jszip";
import { Upload, Lightbulb, RotateCcw, Play, Square } from "lucide-react";

const GameToolbar = () => {
    const { onMazeLoaded, loadProject, isRunning, stopExecution, resetGame, runCode, loadSolution, hasSolution } = useMazeGameContext();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (file.name.endsWith('.json')) {
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
            } else if (file.name.endsWith('.zip')) {
                const zip = await JSZip.loadAsync(file);

                // Find root based on maze.json
                const allPaths = Object.keys(zip.files);
                const mazePath = allPaths.find(p => p.endsWith('maze.json') && !p.startsWith('__MACOSX') && !p.includes('/.'));

                if (!mazePath) {
                    throw new Error("maze.json not found in the zip file");
                }

                // Determine root directory (if any)
                const rootDir = mazePath.substring(0, mazePath.lastIndexOf('maze.json'));

                // Read maze.json
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const mazeContent = await zip.file(mazePath)!.async("string");
                const maze = JSON.parse(mazeContent) as MazeConfig;

                // Simple validation
                if (!maze.width || !maze.height || !maze.walls) {
                    throw new Error("Invalid maze content in maze.json");
                }

                const files: Record<string, string> = {};
                const solutionFiles: Record<string, string> = {};

                await Promise.all(allPaths.map(async (path) => {
                    if (zip.files[path].dir) return;
                    if (path.startsWith('__MACOSX') || path.includes('/.')) return;
                    if (path === mazePath) return;
                    if (!path.startsWith(rootDir)) return;

                    const relativePath = path.substring(rootDir.length);
                    const content = await zip.files[path].async("string");

                    if (relativePath.startsWith('solution/')) {
                        const solName = relativePath.replace('solution/', '');
                        if (solName) solutionFiles[solName] = content;
                    } else {
                        files[relativePath] = content;
                    }
                }));

                if (isRunning) stopExecution();
                loadProject(maze, files, Object.keys(solutionFiles).length > 0 ? solutionFiles : undefined);
            } else {
                alert("Unsupported file type. Please upload a .json or .zip file.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to import file: " + (err as any).message);
        }

        // Reset input
        e.target.value = '';
    };

    return (
        <div className="flex justify-end items-center bg-slate-900/50 p-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-3">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                    accept=".json,.zip"
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRunning}
                    title="Import Maze"
                    className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/30 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Upload size={18} />
                </button>
                <button
                    onClick={() => {
                        if (confirm('This will replace your current code with the solution. Are you sure?')) {
                            loadSolution();
                        }
                    }}
                    disabled={isRunning || !hasSolution}
                    title="Load Solution"
                    className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 border border-yellow-500/30 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Lightbulb size={18} />
                </button>
                <button
                    onClick={resetGame}
                    disabled={isRunning}
                    title="Reset Game"
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 hover:border-gray-500 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <RotateCcw size={18} />
                </button>
                <button
                    onClick={isRunning ? stopExecution : runCode}
                    title={isRunning ? "Stop Execution" : "Run Code"}
                    className={`p-2 font-bold rounded shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all ${isRunning
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        }`}
                >
                    {isRunning ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
            </div>
        </div>
    )
}

export default GameToolbar;