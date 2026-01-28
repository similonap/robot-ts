'use client';

import { MazeConfig } from 'circuit-crawler';
import MazeDisplay from './display/MazeDisplay';
import ResizableSplit from '@/components/ResizableSplit';

import Header from './header/Header';
import { MazeGameContextProvider, useMazeGameContext } from './context/MazeGameContext';
import GameEditor from './editor/GameEditor';
import GameTerminal from './terminal/GameTerminal';

export default function MazeGameWrapper({ sharedTypes, initialMaze, initialFiles, solutionFiles, headerAction }: { sharedTypes: string; initialMaze: MazeConfig; initialFiles?: Record<string, string>; solutionFiles?: Record<string, string>; headerAction?: React.ReactNode }) {
    return (
        <MazeGameContextProvider initialMaze={initialMaze} initialFiles={initialFiles} solutionFiles={solutionFiles} sharedTypes={sharedTypes}>
            <MazeGame headerAction={headerAction} />
        </MazeGameContextProvider>
    )
}

function MazeGame({ headerAction }: { headerAction?: React.ReactNode }) {
    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            <Header headerAction={headerAction} />

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
                                <MazeDisplay />
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
