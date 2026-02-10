'use client';

import { MazeConfig } from 'circuit-crawler';
import MazeDisplay from './display/MazeDisplay';
import ResizableSplit from '@/components/ResizableSplit';

import { MazeGameContextProvider, useMazeGameContext } from './context/MazeGameContext';
import GameEditor from './editor/GameEditor';
import GameTerminal from './terminal/GameTerminal';
import BadgeModal from './BadgeModal';

export default function MazeGameWrapper({ sharedTypes, initialMaze, initialFiles, solutionFiles, slug }: { sharedTypes: string; initialMaze: MazeConfig; initialFiles?: Record<string, string>; solutionFiles?: Record<string, string>; slug?: string }) {
    return (
        <MazeGameContextProvider initialMaze={initialMaze} initialFiles={initialFiles} solutionFiles={solutionFiles} sharedTypes={sharedTypes} slug={slug}>
            <MazeGame />
        </MazeGameContextProvider>
    )
}

function MazeGame() {
    const { showBadgeModal, setShowBadgeModal, newBadgeSlug } = useMazeGameContext();
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-white p-4 gap-4">
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

            <BadgeModal
                isOpen={showBadgeModal}
                onClose={() => setShowBadgeModal(false)}
                badgeSlug={newBadgeSlug || ''}
            />
        </div>
    );
}
