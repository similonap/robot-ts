'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { MazeConfig, RunnerState } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { useMazeGameContext } from '../context/MazeGameContext';
import MazeItemDisplay from './MazeItemDisplay';

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
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black/50 border-2 border-cyan-900/50 backdrop-blur-sm shadow-[0_0_15px_rgba(14,165,233,0.1)]">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                className="max-w-full max-h-full"
            >
                {/* Background Grid */}
                <defs>
                    <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
                        <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="#1e293b" strokeWidth="1" />
                    </pattern>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect x="0" y="0" width={width} height={height} fill="#020617" />
                <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />

                {/* Walls */}
                {maze.walls.map((row, y) => (
                    row.map((isWall, x) => (
                        isWall && (
                            <rect
                                key={`${x}-${y}`}
                                x={x * cellSize + 2}
                                y={y * cellSize + 2}
                                width={cellSize - 4}
                                height={cellSize - 4}
                                rx={4}
                                fill="#0ea5e9"
                                fillOpacity="0.2"
                                stroke="#0ea5e9"
                                strokeWidth="2"
                                filter="url(#neon-glow)"
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
                                    x={4} y={4} width={cellSize - 8} height={cellSize - 8}
                                    fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 4"
                                    rx={2}
                                />
                            ) : (
                                <rect
                                    x={2} y={2} width={cellSize - 4} height={cellSize - 4}
                                    fill="#451a03" stroke="#f59e0b" strokeWidth="2"
                                    rx={2}
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
                            <MazeItemDisplay
                                key={item.id}
                                item={item}
                                cellSize={cellSize}
                            />
                        );
                    })}
                </AnimatePresence>

                {/* Echo Wave - Radar Style */}
                {robotState.echoWave && (
                    <motion.g
                        key={`wave-${robotState.echoWave.timestamp}`}
                        initial={{
                            opacity: 1,
                            // Start from slightly in front of center
                            x: (robotState.echoWave.x * cellSize) + (cellSize / 2) + Math.sign(getDirIndex(robotState.echoWave.direction) === 1 ? 1 : getDirIndex(robotState.echoWave.direction) === 3 ? -1 : 0) * (cellSize / 2),
                            y: (robotState.echoWave.y * cellSize) + (cellSize / 2) + Math.sign(getDirIndex(robotState.echoWave.direction) === 2 ? 1 : getDirIndex(robotState.echoWave.direction) === 0 ? -1 : 0) * (cellSize / 2),
                            rotate: getDirIndex(robotState.echoWave.direction) * 90,
                            scale: 0.2 // Start small
                        }}
                        // We want to animate the POSITION of the wave traveling forward
                        animate={{
                            opacity: [1, 1, 0], // Fade out at the very end
                            // Calculate endpoint based on distance
                            // x + distance * dx
                            x: (robotState.echoWave.x * cellSize) + (cellSize / 2) +
                                (getDirIndex(robotState.echoWave.direction) === 1 ? 1 : getDirIndex(robotState.echoWave.direction) === 3 ? -1 : 0) * (robotState.echoWave.distance * cellSize),
                            y: (robotState.echoWave.y * cellSize) + (cellSize / 2) +
                                (getDirIndex(robotState.echoWave.direction) === 2 ? 1 : getDirIndex(robotState.echoWave.direction) === 0 ? -1 : 0) * (robotState.echoWave.distance * cellSize),
                            scale: 1 // Grow to full cell size but no larger
                        }}
                        // Use linear ease for consistent travel speed, duration based on distance? 
                        // Or fixed duration matching robot delay? 
                        // Robot delay is usually 500ms. We can match that or be slightly faster.
                        transition={{ duration: 0.5, ease: "linear" }}
                    >
                        {/* Radar Arc */}
                        {/* Draw a curved line (arc) representing the sound front */}
                        <path
                            d={`M -${cellSize / 2} 0 Q 0 ${cellSize / 2} ${cellSize / 2} 0`}
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="3"
                            strokeLinecap="round"
                            filter="url(#neon-glow)"
                            transform="rotate(180)" // Rotate so the convex side faces forward (up for 0 deg rotation)
                        />

                        {/* Inner echo lines for effect */}
                        <path
                            d={`M -${cellSize / 3} 0 Q 0 ${cellSize / 3} ${cellSize / 3} 0`}
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="1.5"
                            strokeOpacity="0.6"
                            strokeLinecap="round"
                            transform="rotate(180)"
                        />
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
                            stroke="#ef4444"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                            filter="url(#neon-glow)"
                        />
                        <circle
                            cx={0} cy={0} r={cellSize / 2}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                            vectorEffect="non-scaling-stroke"
                        />
                    </motion.g>
                )}

                {/* Explosion */}
                {robotState.explosion && (
                    <motion.g
                        key={`expl-${robotState.explosion.timestamp}`}
                        initial={{
                            opacity: 1,
                            scale: 0.5,
                            x: robotState.explosion.x * cellSize + cellSize / 2,
                            y: robotState.explosion.y * cellSize + cellSize / 2
                        }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <circle cx="0" cy="0" r={cellSize} fill="#ef4444" fillOpacity="0.5" />
                        <circle cx="0" cy="0" r={cellSize * 0.7} fill="#f97316" fillOpacity="0.7" />
                        <circle cx="0" cy="0" r={cellSize * 0.4} fill="#facc15" />
                    </motion.g>
                )}

                {/* Robot */}
                {!robotState.isDestroyed && (
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
                            {robotState.appearance ? (
                                // Custom Appearance
                                <image
                                    href={robotState.appearance.url}
                                    x={robotState.appearance.width ? (cellSize - robotState.appearance.width) / 2 : 0}
                                    y={robotState.appearance.height ? (cellSize - robotState.appearance.height) / 2 : 0}
                                    width={robotState.appearance.width || cellSize}
                                    height={robotState.appearance.height || cellSize}
                                    preserveAspectRatio={robotState.appearance.width ? "none" : "xMidYMid meet"}
                                />
                            ) : (
                                // Default Drone Body
                                <>
                                    <circle
                                        cx={cellSize / 2} cy={cellSize / 2} r={cellSize * 0.35}
                                        fill="#0f172a" stroke="#38bdf8" strokeWidth="2"
                                    />
                                    {/* Center Eye/Core */}
                                    <circle
                                        cx={cellSize / 2} cy={cellSize / 2} r={cellSize * 0.15}
                                        fill="#38bdf8"
                                        filter="url(#neon-glow)"
                                    />
                                    {/* Direction Indicator (Front Tick) */}
                                    <path
                                        d={`M ${cellSize / 2} ${cellSize * 0.15} L ${cellSize / 2} ${cellSize * 0.05}`}
                                        stroke="#38bdf8"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                    {/* Rear Detail */}
                                    <path
                                        d={`M ${cellSize * 0.3} ${cellSize * 0.8} L ${cellSize * 0.7} ${cellSize * 0.8}`}
                                        stroke="#38bdf8"
                                        strokeWidth="2"
                                    />
                                </>
                            )}
                        </g>

                    </motion.g>
                )}
            </svg>
        </div>
    );
}
