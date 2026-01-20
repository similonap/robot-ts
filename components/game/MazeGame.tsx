'use client';

import { MazeConfig } from '@/lib/types';
import MazeDisplay from './display/MazeDisplay';
import ResizableSplit from '@/components/ResizableSplit';

import Header from './header/Header';
import { MazeGameContextProvider, useMazeGameContext } from './context/MazeGameContext';
import GameEditor from './editor/GameEditor';
import GameTerminal from './terminal/GameTerminal';

export default function MazeGameWrapper({ sharedTypes, initialMaze, initialFiles }: { sharedTypes: string; initialMaze: MazeConfig; initialFiles?: Record<string, string> }) {
    return (
        <MazeGameContextProvider initialMaze={initialMaze} initialFiles={initialFiles} sharedTypes={sharedTypes}>
            <MazeGame />
        </MazeGameContextProvider>
    )
}

function MazeGame() {
    const { maze, robotState } = useMazeGameContext();

    if (!maze || !robotState) return <div className="p-10">Loading Maze...</div>;

    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            <Header />

            <div className="flex-1 overflow-hidden relative">
                <ResizableSplit
                    id="main-split"
                    initialSplit={50}
                    minSplit={20}
                    maxSplit={80}
                    first={
                        <GameEditor />
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
                                <GameTerminal />
                            }
                        />
                    }
                />
            </div>
        </div>
    );
}
