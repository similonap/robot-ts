'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { MazeConfig, RunnerState } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { useMazeGameContext } from '../context/MazeGameContext';

interface MazeDisplayProps {

}

export default function MazeDisplay() {
    const { maze, robotState } = useMazeGameContext();

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

                {/* Doors */}
                {maze.doors?.map((door) => {
                    const isOpen = (robotState.doorStates && door.id in robotState.doorStates) ? robotState.doorStates[door.id] : door.isOpen;
                    return (
                        <g key={door.id} transform={`translate(${door.position.x * cellSize}, ${door.position.y * cellSize})`}>
                            {isOpen ? (
                                <rect
                                    x={2} y={2} width={cellSize - 4} height={cellSize - 4}
                                    fill="none" stroke="#EAB308" strokeWidth="2" strokeDasharray="4"
                                />
                            ) : (
                                <rect
                                    x={0} y={0} width={cellSize} height={cellSize}
                                    fill="#713F12" stroke="#EAB308" strokeWidth="2"
                                />
                            )}
                        </g>
                    );
                })}

                {/* Items */}
                <AnimatePresence>
                    {maze.items?.map((item) => {
                        // Filter logic:
                        // Show item if it is NOT collected/destroyed (in collectedItemIds)
                        // AND it IS revealed.

                        const isCollected = robotState.collectedItemIds?.includes(item.id);
                        if (isCollected) return null; // AnimatePresence handles exit

                        const isRevealed = item.isRevealed !== false || (robotState.revealedItemIds && robotState.revealedItemIds.includes(item.id));
                        if (!isRevealed) return null;

                        return (
                            <motion.text
                                key={item.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                    duration: Math.min(0.5, robotState.speed / 1000),
                                    ease: "backOut"
                                }}
                                x={item.position.x * cellSize + cellSize / 2}
                                y={item.position.y * cellSize + cellSize / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={cellSize * 0.7}
                                style={{ userSelect: 'none' }}
                            >
                                {item.icon}
                            </motion.text>
                        );
                    })}
                </AnimatePresence>

                {/* Echo Wave - Radar Style */}
                {robotState.echoWave && (
                    <motion.g
                        key={`wave-${robotState.echoWave.timestamp}`}
                        initial={{
                            opacity: 0.8,
                            scale: 0.1,
                            x: robotState.echoWave.x * cellSize + cellSize / 2,
                            y: robotState.echoWave.y * cellSize + cellSize / 2,
                            rotate: getDirIndex(robotState.echoWave.direction) * 90
                        }}
                        style={{ transformOrigin: "0px 0px" }}
                        animate={{ opacity: 0, scale: 4 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                        {/* 3 Concentric Signal Arcs */}
                        {[1, 0.7, 0.4].map((r, i) => {
                            const radius = cellSize * r;
                            // Coords for +/- 30 degrees arc facing UP (-Y) inside the group
                            // -30 deg: x = -sin(30)*radius = -0.5*radius, y = -cos(30)*radius = -0.866*radius
                            // +30 deg: x = 0.5*radius, y = -0.866*radius

                            // We need to construct the path string.
                            // Start point (Left): M x1 y1
                            // Arc to (Right): A rx ry x-axis-rotation large-arc-flag sweep-flag x2 y2

                            const x1 = -0.5 * radius;
                            const y1 = -0.866 * radius;
                            const x2 = 0.5 * radius;
                            const y2 = -0.866 * radius;

                            return (
                                <path
                                    key={i}
                                    d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                                    fill="none"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                    opacity={1 - (i * 0.2)}
                                />
                            );
                        })}
                    </motion.g>
                )}

                {/* Echo Hit - Radar Blip */}
                {robotState.echoHit && (
                    <motion.g
                        key={`hit-${robotState.echoHit.timestamp}`}
                        initial={{
                            scale: 0,
                            opacity: 1,
                            x: robotState.echoHit.x * cellSize + cellSize / 2,
                            y: robotState.echoHit.y * cellSize + cellSize / 2
                        }}
                        style={{ transformOrigin: "0px 0px" }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        {/* Expanding rings */}
                        <circle
                            cx={0} cy={0} r={cellSize / 3}
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={0} cy={0} r={cellSize / 2}
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                            vectorEffect="non-scaling-stroke"
                        />
                    </motion.g>
                )}

                {/* Robot */}
                <motion.g
                    initial={false}
                    animate={{
                        x: robotState.position.x * cellSize + cellSize / 2,
                        y: robotState.position.y * cellSize + cellSize / 2,
                        rotate: rotation
                    }}
                    transition={{
                        type: robotState.speed < 200 ? "tween" : "spring",
                        duration: robotState.speed < 200 ? robotState.speed / 1000 : undefined,
                        stiffness: robotState.speed < 200 ? undefined : 200,
                        damping: robotState.speed < 200 ? undefined : 20,
                    }}
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
