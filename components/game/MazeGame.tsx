'use client';
import { useEffect, useRef } from 'react';

import { MazeConfig } from '../../lib/types';
import MazeDisplay from '../MazeDisplay';
import CodeEditor from '../CodeEditor';
import ResizableSplit from '../ResizableSplit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from './header/Header';
import { MazeGameContextProvider, useMazeGameContext } from './context/MazeGameContext';

export default function MazeGameWrapper({ sharedTypes, initialMaze, initialFiles }: { sharedTypes: string; initialMaze: MazeConfig; initialFiles?: Record<string, string> }) {
    return (
        <MazeGameContextProvider initialMaze={initialMaze} initialFiles={initialFiles}>
            <MazeGame sharedTypes={sharedTypes} initialMaze={initialMaze} initialFiles={initialFiles} />
        </MazeGameContextProvider>
    )
}

function MazeGame({ sharedTypes, initialMaze, initialFiles }: { sharedTypes: string; initialMaze: MazeConfig; initialFiles?: Record<string, string> }) {
    const { maze, robotState, isRunning, onMazeLoaded, resetGame, runCode, stopExecution, setRobotState, setShowRobotLogs, showRobotLogs, logs, isWaitingForInput, files, handleAddFile, handleDeleteFile, inputResolveRef, addLog, setActiveFile, inputPrompt, inputValue, setInputValue, setIsWaitingForInput, activeFile, changeFile } = useMazeGameContext();


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




    if (!maze || !robotState) return <div className="p-10">Loading Maze...</div>;

    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            <Header
                robotState={robotState}
                isRunning={isRunning}
                onMazeLoaded={onMazeLoaded}
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
                                        onChange={(val) => changeFile(activeFile, val)}
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
