'use client';
import { motion } from 'framer-motion';
import { MazeConfig, RunnerState } from '../lib/types';
import { useMemo } from 'react';

interface MazeDisplayProps {
    maze: MazeConfig;
    robotState: RunnerState;
}

export default function MazeDisplay({ maze, robotState }: MazeDisplayProps) {
    const cellSize = 30;

    // Calculate exact pixel dimensions
    const pixelWidth = maze.width * cellSize;
    const pixelHeight = maze.height * cellSize;

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
                    rotate: robotState.direction === 'North' ? 0
                        : robotState.direction === 'East' ? 90
                            : robotState.direction === 'South' ? 180
                                : 270
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
