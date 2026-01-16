'use client';
import { motion } from 'framer-motion';
import { MazeConfig, RunnerState } from '../lib/types';
import { useMemo, useState, useRef, useEffect } from 'react';

interface MazeDisplayProps {
    maze: MazeConfig;
    robotState: RunnerState;
}

export default function MazeDisplay({ maze, robotState }: MazeDisplayProps) {
    const cellSize = 30;

    // Calculate exact pixel dimensions
    const pixelWidth = maze.width * cellSize;
    const pixelHeight = maze.height * cellSize;

    // Maintain continuous rotation state to avoid wrapping issues (0->270 etc)
    const dirs = ['North', 'East', 'South', 'West'];
    const getDirIndex = (d: string) => dirs.indexOf(d);

    // Initialize with correct rotation for starting direction
    const [rotation, setRotation] = useState(() => getDirIndex(robotState.direction) * 90);
    const lastDirRef = useRef(robotState.direction);

    useEffect(() => {
        const currentDir = robotState.direction;
        if (currentDir === lastDirRef.current) return;

        const oldIdx = getDirIndex(lastDirRef.current);
        const newIdx = getDirIndex(currentDir);

        let diff = newIdx - oldIdx;

        // Handle wrapping for shortest path
        // 3 (West) -> 0 (North) : -3 => +1 (90 deg right)
        // 0 (North) -> 3 (West) : 3 => -1 (90 deg left)
        if (diff === -3) diff = 1;
        if (diff === 3) diff = -1;

        setRotation(prev => prev + (diff * 90));
        lastDirRef.current = currentDir;
    }, [robotState.direction]);

    return (
        <div
            className="relative bg-gray-900 border border-gray-700 rounded-md overflow-hidden"
            style={{ width: pixelWidth, height: pixelHeight }}
        >
            {/* Walls */}
            {maze.walls.map((row, y) => (
                row.map((isWall, x) => (
                    isWall && (
                        <div
                            key={`${x}-${y}`}
                            className="absolute bg-blue-500"
                            style={{
                                left: x * cellSize,
                                top: y * cellSize,
                                width: cellSize,
                                height: cellSize,
                            }}
                        />
                    )
                ))
            ))}

            {/* Goal */}
            <div
                className="absolute bg-green-500/50 border-2 border-green-500 rounded-sm"
                style={{
                    left: maze.end.x * cellSize,
                    top: maze.end.y * cellSize,
                    width: cellSize,
                    height: cellSize,
                }}
            />

            {/* Robot */}
            <motion.div
                className="absolute flex items-center justify-center text-2xl"
                initial={false}
                animate={{
                    left: robotState.position.x * cellSize,
                    top: robotState.position.y * cellSize,
                    rotate: rotation
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{
                    width: cellSize,
                    height: cellSize,
                }}
            >
                🤖
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                    <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-80 drop-shadow-md"
                    >
                        {/* Simple arrow pointing up (North) */}
                        <path d="M12 19V5" />
                        <path d="M5 12l7-7 7 7" />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
}
