import CodeEditor from "@/components/CodeEditor";
import { useMazeGameContext } from "../context/MazeGameContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

const GameEditor = () => {

    const { files, activeFile, setActiveFile, handleAddFile, handleDeleteFile, changeFile, sharedTypes } = useMazeGameContext();

    return (
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
    )
}

export default GameEditor;