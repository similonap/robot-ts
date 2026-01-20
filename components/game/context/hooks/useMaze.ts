import { useState } from 'react';
import { MazeConfig } from '@/lib/types';

export const useMaze = (initialMaze: MazeConfig) => {
    const [maze, setMaze] = useState<MazeConfig>(initialMaze);

    const onMazeLoaded = (newMaze: MazeConfig) => {
        setMaze(newMaze);
    };

    return {
        maze,
        setMaze,
        onMazeLoaded
    };
};
