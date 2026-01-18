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
    const width = maze.width * cellSize;
    const height = maze.height * cellSize;

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
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-gray-900 border border-gray-700 rounded-md">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                className="max-w-full max-h-full"
            >
                {/* Background Grid (Optional) */}
                <rect x="0" y="0" width={width} height={height} fill="#111827" />

                {/* Walls */}
                {maze.walls.map((row, y) => (
                    row.map((isWall, x) => (
                        isWall && (
                            <rect
                                key={`${x}-${y}`}
                                x={x * cellSize}
                                y={y * cellSize}
                                width={cellSize + 0.5} // Slight overlap to prevent gaps
                                height={cellSize + 0.5}
                                fill="#3B82F6"
                            />
                        )
                    ))
                ))}

                {/* Items */}
                {maze.items?.map((item) => {
                    const isCollected = robotState.inventory.some(i => i.id === item.id);
                    if (isCollected) return null;

                    return (
                        <text
                            key={item.id}
                            x={item.position.x * cellSize + cellSize / 2}
                            y={item.position.y * cellSize + cellSize / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={cellSize * 0.7}
                            className="animate-pulse"
                            style={{ userSelect: 'none' }}
                        >
                            {item.icon}
                        </text>
                    );
                })}

                {/* Robot */}
                <motion.g
                    initial={false}
                    animate={{
                        x: robotState.position.x * cellSize + cellSize / 2,
                        y: robotState.position.y * cellSize + cellSize / 2,
                        rotate: rotation
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                    {/* Centered Group for Rotation */}
                    <g transform={`translate(-${cellSize / 2}, -${cellSize / 2})`}>
                        <text
                            x={cellSize / 2}
                            y={cellSize / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={cellSize}
                            style={{ userSelect: 'none' }}
                        >
                            🤖
                        </text>
                        {/* Direction Arrow Overlay */}
                        <g transform={`translate(${cellSize * 0.1}, ${cellSize * 0.1}) scale(0.8)`}>
                            <path
                                d="M15 22V8 M8 15l7-7 7 7"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                opacity="0.9"
                            />
                        </g>
                    </g>
                </motion.g>
            </svg>
        </div>
    );
}
