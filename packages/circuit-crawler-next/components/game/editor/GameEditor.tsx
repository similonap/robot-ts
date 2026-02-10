import CodeEditor from "@/components/CodeEditor";
import { useMazeGameContext } from "../context/MazeGameContext";
import { useExternalTypes } from "./hooks/useExternalTypes";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { useRef } from "react";
import JSZip from "jszip";
import { Upload, Lightbulb, RotateCcw, Play, Square } from "lucide-react";
import { MazeConfig } from "circuit-crawler";

const GameEditor = () => {

    const { files, activeFile, setActiveFile, handleAddFile, handleDeleteFile, changeFile, sharedTypes, maze,
        onMazeLoaded, loadProject, isRunning, stopExecution, resetGame, runCode, loadSolution, hasSolution
    } = useMazeGameContext();

    const externalModules = useExternalTypes(files);
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
        <div className="w-full h-full flex flex-col min-w-0 border border-gray-700 overflow-hidden bg-gray-900">
            {/* Tabs & Toolbar */}
            <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto flex-shrink-0 justify-between">
                <div className="flex">
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
                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 text-lg leading-none border-r border-gray-700"
                        title="Add File"
                    >
                        +
                    </button>
                </div>

                <div className="flex items-center px-2 gap-1">
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
                        className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Upload size={16} />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('This will replace your current code with the solution. Are you sure?')) {
                                loadSolution();
                            }
                        }}
                        disabled={isRunning || !hasSolution}
                        title="Load Solution"
                        className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Lightbulb size={16} />
                    </button>
                    <button
                        onClick={resetGame}
                        disabled={isRunning}
                        title="Reset Game"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>
                    <button
                        onClick={isRunning ? stopExecution : runCode}
                        title={isRunning ? "Stop Execution" : "Run Code"}
                        className={`p-1.5 font-bold rounded shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all ${isRunning
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                            }`}
                    >
                        {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                </div>
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
                                        <code className="bg-gray-800  px-1.5 py-0.5 text-sm font-mono text-pink-400" {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block bg-gray-800 p-4 mb-4 text-sm font-mono overflow-x-auto whitespace-pre" {...props}>
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
                        onChange={(val) => changeFile(activeFile, val)}
                        sharedTypes={sharedTypes}
                        modules={{
                            'circuit-crawler': maze.globalModule || '',
                            ...externalModules
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default GameEditor;