import { LogEntry, MazeConfig, RobotState, SharedWorldState } from "circuit-crawler";
import { createContext, RefObject, useContext, useEffect, useState } from "react";
import { useMaze } from "./hooks/useMaze";
import { useRobots } from "./hooks/useRobots";
import { useWorld } from "./hooks/useWorld";
import { useGameLogs } from "./hooks/useGameLogs";
import { useFileManager } from "./hooks/useFileManager";
import { useCodeRunner } from "./hooks/useCodeRunner";

interface MazeGameContextType {
    maze: MazeConfig;

    // Multi-robot support
    robots: Record<string, RobotState>;
    updateRobotState: (id: string, state: RobotState) => void;
    clearRobots: () => void;
    initializeRobots: (initialConfigs: import("circuit-crawler").InitialRobotConfig[]) => void;

    // Display Settings
    showRobotNames: boolean;
    setShowRobotNames: (show: boolean) => void;
    showRobotHealth: boolean;
    setShowRobotHealth: (show: boolean) => void;

    // Shared World State
    worldState: {
        doorStates: Record<string, boolean>;
        revealedItemIds: string[];
        collectedItemIds: string[];
    };
    worldActions: SharedWorldState;

    isRunning: boolean;
    onMazeLoaded: (maze: MazeConfig) => void;
    resetGame: () => void;
    runCode: () => void;
    stopExecution: () => void;

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
    loadSolution: () => void;
    hasSolution: boolean;
}

export const MazeGameContext = createContext<MazeGameContextType>({
    maze: {} as MazeConfig,
    robots: {},
    updateRobotState: () => { },
    clearRobots: () => { },
    initializeRobots: () => { },
    showRobotNames: true,
    setShowRobotNames: () => { },
    showRobotHealth: true,
    setShowRobotHealth: () => { },
    worldState: {
        doorStates: {},
        revealedItemIds: [],
        collectedItemIds: []
    },
    worldActions: {} as SharedWorldState,

    isRunning: false,
    onMazeLoaded: () => { },
    resetGame: () => { },
    runCode: () => { },
    stopExecution: () => { },
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
    sharedTypes: '',
    loadSolution: () => { },
    hasSolution: false
});

interface MazeGameProviderProps {
    initialMaze: MazeConfig;
    initialFiles?: Record<string, string>;
    solutionFiles?: Record<string, string>;
    sharedTypes: string;
}

// Initial code template
const INITIAL_CODE = `import { game } from "circuit-crawler";

async function main() {    
    const robot = game.getRobot("robot");
    while (game.isRunning()) {
        // STRATEGY: RIGHT-HAND RULE
        
        // 1. Commit to the strategy: Turn Right to face the "ideal" path.
        await robot.turnRight();

        // 2. Scan for an opening. 
        // Logic: Is Right blocked? If yes, Turn Left (to face Forward). 
        // Is Forward blocked? If yes, Turn Left (to face Left).
        // Is Left blocked? If yes, Turn Left (to face Back).
        while (!(await robot.canMoveForward())) {
            await robot.turnLeft();
        }

        // 3. We found an open path (either Right, Forward, Left, or Back). Move!
        await robot.moveForward();
    }
}`;

export const MazeGameContextProvider = ({ initialMaze, initialFiles, solutionFiles, sharedTypes, children }: React.PropsWithChildren<MazeGameProviderProps>) => {
    const { maze, setMaze } = useMaze(initialMaze);
    const { robots, updateRobotState, clearRobots, removeRobot, initializeRobots } = useRobots();
    const { doorStates, revealedItemIds, collectedItemIds, worldActions, resetWorld } = useWorld(initialMaze);

    const { logs, setLogs, addLog, showRobotLogs, setShowRobotLogs, clearLogs } = useGameLogs();
    const { files, setFiles, handleAddFile, handleDeleteFile, activeFile, setActiveFile, changeFile } = useFileManager({ initialFiles, initialCode: INITIAL_CODE });

    const loadSolution = () => {
        if (solutionFiles) {
            if (isRunning) stopExecution();
            setFiles(solutionFiles);
            // Optionally set active file to main.ts or first file
            if (solutionFiles['main.ts']) setActiveFile('main.ts');
        }
    };

    const [showRobotNames, setShowRobotNames] = useState(true);
    const [showRobotHealth, setShowRobotHealth] = useState(true);

    // Initialize robots on mount
    useEffect(() => {
        if (initialMaze.initialRobots) {
            initializeRobots(initialMaze.initialRobots);
        } else {
            initializeRobots([{ position: { x: 1, y: 1 }, direction: 'East', name: 'Robot 1' }]);
        }
    }, []);

    // Wire up code runner with dependencies
    const {
        isRunning,
        isWaitingForInput,
        setIsWaitingForInput,
        inputValue,
        setInputValue,
        inputPrompt,
        inputResolveRef,
        runCode: runnerRunCode,
        stopExecution
    } = useCodeRunner({
        maze,
        worldActions,
        updateRobotState,
        addLog,
        files,
        setLogs
    });

    const runCode = () => {
        resetGame();
        // Give React a tick to process the reset state updates before running?
        // Since resetGame is synchronous state updates, it should be fine, 
        // but runnerRunCode is async-ish in setup. 
        // Actually, resetGame calls stopExecution which might be async if we wait for promises?
        // But here resetGame is synchronous logic.
        // However, useCodeRunner's runCode checks state. 
        // Let's just call it.
        runnerRunCode();
    };

    const onMazeLoaded = (newMaze: MazeConfig) => {
        setMaze(newMaze);
        clearRobots();

        if (newMaze.initialRobots) {
            initializeRobots(newMaze.initialRobots);
        } else {
            initializeRobots([{ position: { x: 1, y: 1 }, direction: 'East', name: 'Robot 1' }]);
        }

        resetWorld();
        clearLogs();
        stopExecution(); // Ensure any previous run stops
        addLog("Maze imported successfully!", 'user');
    };

    const resetGame = () => {
        if (isRunning) {
            stopExecution();
        }
        if (!maze) return;

        clearRobots();
        // Re-initialize initial robots
        if (maze.initialRobots) {
            initializeRobots(maze.initialRobots);
        } else {
            // Should not happen for new mazes but safe fallback
            initializeRobots([{ position: { x: 1, y: 1 }, direction: 'East', name: 'Robot 1' }]);
        }

        resetWorld();
        clearLogs();
        setInputValue('');
    };

    return (
        <MazeGameContext.Provider value={{
            maze,
            robots,
            updateRobotState,
            clearRobots,
            initializeRobots,
            showRobotNames,
            setShowRobotNames,
            showRobotHealth,
            setShowRobotHealth,
            worldState: {
                doorStates,
                revealedItemIds,
                collectedItemIds
            },
            worldActions,

            isRunning,
            onMazeLoaded,
            resetGame,
            runCode,
            stopExecution,
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
            sharedTypes,
            loadSolution,
            hasSolution: !!solutionFiles
        }}>
            {children}
        </MazeGameContext.Provider>
    )
}

export const useMazeGameContext = () => {
    return useContext(MazeGameContext);
}