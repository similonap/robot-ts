import { useRef, useState } from 'react';
import { MazeConfig } from 'circuit-crawler';

export const useMaze = (initialMaze: MazeConfig) => {
    const originalMaze = useRef<MazeConfig>(structuredClone(initialMaze));
    const [maze, setMaze] = useState<MazeConfig>(initialMaze);

    const onMazeLoaded = (newMaze: MazeConfig) => {
        originalMaze.current = structuredClone(newMaze);
        setMaze(newMaze);
    };

    const resetMaze = () => {
        setMaze(structuredClone(originalMaze.current));
    };

    return {
        maze,
        setMaze,
        onMazeLoaded,
        resetMaze
    };
};
