import { useRef, useState, useEffect, useCallback } from 'react';
import { CircuitCrawlerEngine } from "circuit-crawler";
import { MazeConfig, RobotState, SharedWorldState } from "circuit-crawler";

interface UseCodeRunnerProps {
    maze: MazeConfig;
    setMaze: (maze: MazeConfig) => void;
    worldActions: SharedWorldState;
    updateRobotState: (name: string, state: RobotState) => void;
    addLog: (msg: string, type: 'robot' | 'user') => void;
    files: Record<string, string>;
    setLogs: (logs: any[]) => void;
    onCompletion: (success: boolean, msg: string) => void;
}

export const useCodeRunner = ({ maze, setMaze, worldActions, updateRobotState, addLog, files, setLogs, onCompletion }: UseCodeRunnerProps) => {
    const engineRef = useRef<CircuitCrawlerEngine | null>(null);

    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputPrompt, setInputPrompt] = useState('');
    const inputResolveRef = useRef<((value: string) => void) | null>(null);

    // Refs for stable callbacks
    const callbacksRef = useRef({ addLog, updateRobotState, setLogs, worldActions, onCompletion, setMaze });
    useEffect(() => {
        callbacksRef.current = { addLog, updateRobotState, setLogs, worldActions, onCompletion, setMaze };
    }, [addLog, updateRobotState, setLogs, worldActions, onCompletion, setMaze]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (engineRef.current) engineRef.current.stop();
        };
    }, []);

    const stopExecution = useCallback(() => {
        if (engineRef.current) engineRef.current.stop();
        setIsRunning(false);
        setIsWaitingForInput(false);
        inputResolveRef.current = null;
    }, []);

    const runCode = useCallback(async () => {
        // Create Engine if needed. We use the ref to hold the instance.
        // Note: We create it once. If worldActions or maze changes significantly enough to require NEW engine, 
        // we might need to recreate, but usually maze update is handled by property set.
        if (!engineRef.current) {
            engineRef.current = new CircuitCrawlerEngine({
                maze,
                externalWorld: {
                    actions: callbacksRef.current.worldActions,
                    // We don't want the engine to reset the world logic, because MazeGameContext handles that.
                    reset: () => { }
                },
                onLog: (msg, type) => callbacksRef.current.addLog(msg, type),
                onRobotUpdate: (name, state) => {
                    callbacksRef.current.updateRobotState(name, state);
                    // Sync engine's maze items back to context so MazeDisplay renders updated positions
                    const eng = engineRef.current;
                    if (eng) {
                        callbacksRef.current.setMaze({ ...eng.maze });
                    }
                },
                onStateChange: () => {
                    const eng = engineRef.current;
                    if (!eng) return;
                    // Sync state is dangerous if it triggers re-renders too fast?
                    // But these are boolean flags, should be okay.
                    // We only update if changed?
                    setIsRunning(eng.isRunning);
                    setIsWaitingForInput(eng.isWaitingForInput);
                    setInputPrompt(eng.inputPrompt);

                    if (eng.isWaitingForInput) {
                        inputResolveRef.current = (val) => eng.resolveInput(val);
                    } else {
                        inputResolveRef.current = null;
                    }
                },
                onCompletion: (success, msg) => callbacksRef.current.onCompletion(success, msg)
            });
        }

        const engine = engineRef.current;

        // Update maze reference
        engine.maze = maze;
        // Update worldActions reference in case it changed (though usually we trust the proxy)
        // Since CircuitCrawlerEngine uses `this.worldActions` getter/property, we should update it if externalWorld was passed?
        // But we passed `actions` to constructor. If `callbacksRef.current.worldActions` is different object, 
        // we might need to update engine's reference.
        if (engine.worldActions !== worldActions) {
            engine.worldActions = worldActions;
        }

        // Reset Logs
        setLogs([]);

        try {
            // Engine handles "reset" internally called by run(), but we also need to know React side is ready?
            // MazeGameContext calls resetGame() before runCode().

            await engine.run(files);
        } catch (e) {
            console.error("Runner Error:", e);
        } finally {
            setIsRunning(false);
            setIsWaitingForInput(false);
        }
    }, [maze, worldActions, files, setLogs, onCompletion]);

    return {
        isRunning,
        setIsRunning,
        isWaitingForInput,
        setIsWaitingForInput,
        inputValue,
        setInputValue,
        inputPrompt,
        inputResolveRef,
        runCode,
        stopExecution
    };
};
