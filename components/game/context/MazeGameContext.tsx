import { Item, LogEntry, MazeConfig, RunnerState } from "@/lib/types";
import { createContext, RefObject, useContext } from "react";
import { useMaze } from "./hooks/useMaze";
import { useRobot, INITIAL_ROBOT_STATE } from "./hooks/useRobot";
import { useGameLogs } from "./hooks/useGameLogs";
import { useFileManager } from "./hooks/useFileManager";
import { useCodeRunner } from "./hooks/useCodeRunner";

interface MazeGameContextType {
    maze: MazeConfig;
    robotState: RunnerState;
    isRunning: boolean;
    onMazeLoaded: (maze: MazeConfig) => void;
    resetGame: () => void;
    runCode: () => void;
    stopExecution: () => void;
    setRobotState: (state: RunnerState) => void;
    setShowRobotLogs: (show: boolean) => void;
    showRobotLogs: boolean;
    logs: LogEntry[];
    addLog: (msg: string, type: 'robot' | 'user') => void;
    isWaitingForInput: boolean;
    files: Record<string, string>;
    handleAddFile: () => void;
    handleDeleteFile: (name: string, e: React.MouseEvent) => void;
    activeFile: string;
    setActiveFile: (file: string) => void;
    inputResolveRef: RefObject<((value: string) => void) | null>;
    inputPrompt: string;
    inputValue: string;
    setInputValue: (value: string) => void;
    setIsWaitingForInput: (value: boolean) => void;
    changeFile: (file: string, content: string) => void;
    sharedTypes: string;
}

export const MazeGameContext = createContext<MazeGameContextType>({
    maze: {} as MazeConfig,
    robotState: INITIAL_ROBOT_STATE,
    isRunning: false,
    onMazeLoaded: () => { },
    resetGame: () => { },
    runCode: () => { },
    stopExecution: () => { },
    setRobotState: () => { },
    setShowRobotLogs: () => { },
    showRobotLogs: false,
    logs: [],
    addLog: () => { },
    isWaitingForInput: false,
    files: {},
    handleAddFile: () => { },
    handleDeleteFile: () => { },
    activeFile: '',
    setActiveFile: (file: string) => { },
    inputResolveRef: {} as RefObject<((value: string) => void) | null>,
    inputPrompt: '',
    inputValue: '',
    setInputValue: (value: string) => { },
    setIsWaitingForInput: (value: boolean) => { },
    changeFile: (file: string, content: string) => { },
    sharedTypes: ''
});

interface MazeGameProviderProps {
    initialMaze: MazeConfig;
    initialFiles?: Record<string, string>;
    sharedTypes: string;
}

// Initial code template
const INITIAL_CODE = `import { robot } from "robot-maze";

async function main() {
    // Keep running until the program is stopped or the maze is solved
    while (true) {
        // STRATEGY: RIGHT-HAND RULE
        
        // 1. Always try to turn Right first. 
        // We want to hug the right wall, so we assume the right path is the way to go.
        await robot.turnRight();

        // 2. Check if the path ahead is clear.
        // If the path is blocked (wall), turn Left to check the next direction.
        // - If we turned Right and it's blocked, turning Left faces us Forward again.
        // - If Forward is blocked, turning Left faces us Left.
        // - If Left is blocked, turning Left faces us Backward (dead end).
        while (!(await robot.canMoveForward())) {
            await robot.turnLeft();
        }

        // 3. We found an opening! Move into it.
        await robot.moveForward();
    }
}`;

export const MazeGameContextProvider = ({ initialMaze, initialFiles, sharedTypes, children }: React.PropsWithChildren<MazeGameProviderProps>) => {
    const { maze, setMaze } = useMaze(initialMaze);
    const { robotState, setRobotState, resetRobot } = useRobot(initialMaze.start);
    const { logs, setLogs, addLog, showRobotLogs, setShowRobotLogs, clearLogs } = useGameLogs();
    const { files, handleAddFile, handleDeleteFile, activeFile, setActiveFile, changeFile } = useFileManager({ initialFiles, initialCode: INITIAL_CODE });

    // Wire up code runner with dependencies
    const {
        isRunning,
        isWaitingForInput,
        setIsWaitingForInput,
        inputValue,
        setInputValue,
        inputPrompt,
        inputResolveRef,
        runCode,
        stopExecution
    } = useCodeRunner({
        maze,
        robotState,
        setRobotState,
        addLog,
        files,
        setLogs
    });

    const onMazeLoaded = (newMaze: MazeConfig) => {
        setMaze(newMaze);
        resetRobot(newMaze.start);
        clearLogs();
        stopExecution(); // Ensure any previous run stops
        addLog("Maze imported successfully!", 'user');
    };

    const resetGame = () => {
        if (isRunning) {
            stopExecution();
        }
        if (!maze) return;

        resetRobot(maze.start);
        clearLogs();
        setInputValue('');
    };

    return (
        <MazeGameContext.Provider value={{
            maze,
            robotState,
            isRunning,
            onMazeLoaded,
            resetGame,
            runCode,
            stopExecution,
            setRobotState,
            setShowRobotLogs,
            showRobotLogs,
            logs,
            isWaitingForInput,
            files,
            handleAddFile,
            handleDeleteFile,
            activeFile,
            setActiveFile,
            addLog,
            inputResolveRef,
            inputPrompt,
            inputValue,
            setInputValue,
            setIsWaitingForInput,
            changeFile,
            sharedTypes
        }}>
            {children}
        </MazeGameContext.Provider>
    )
}

export const useMazeGameContext = () => {
    return useContext(MazeGameContext);
}