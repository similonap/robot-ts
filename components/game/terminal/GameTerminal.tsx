import { useEffect, useRef } from "react";
import { useMazeGameContext } from "../context/MazeGameContext";

const GameTerminal = () => {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const { logs, showRobotLogs, setShowRobotLogs, isWaitingForInput, inputPrompt, inputValue, setInputValue, addLog, inputResolveRef, setIsWaitingForInput } = useMazeGameContext();

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

    return (
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
    )
}

export default GameTerminal;