'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { MazeConfig, RobotState } from 'circuit-crawler';
import { useState, useRef, useEffect } from 'react';
import { useMazeGameContext } from '../context/MazeGameContext';
import MazeItemDisplay from './MazeItemDisplay';

export default function MazeDisplay() {
    const { maze, robots, worldState, showRobotHealth, setShowRobotHealth } = useMazeGameContext();

    const cellSize = 30;
    const width = maze.width * cellSize;
    const height = maze.height * cellSize;
    const [hoveredRobotId, setHoveredRobotId] = useState<string | null>(null);

    // Maintain continuous rotation state for ALL robots to avoid wrapping issues
    const [visualRotations, setVisualRotations] = useState<Record<string, number>>({});
    const lastRobotDirections = useRef<Record<string, string>>({});

    const dirs = ['North', 'East', 'South', 'West'];
    const getDirIndex = (d: string) => dirs.indexOf(d);

    useEffect(() => {
        const newRotations = { ...visualRotations };
        let changed = false;

        Object.entries(robots).forEach(([id, robot]) => {
            const currentDir = robot.direction;
            const lastDir = lastRobotDirections.current[id];

            if (!lastDir) {
                // First time seeing this robot, initialize rotation based on direction
                // We default to 0 for East, 90 for South etc if we assume East start
                // But actually we just want to match the current direction index * 90 typically
                // UNLESS we want to start at 0 and rotate to it?
                // Let's initialize it to the absolute direction to start correct
                lastRobotDirections.current[id] = currentDir;
                // If we don't have a record yet, set it
                if (newRotations[id] === undefined) {
                    newRotations[id] = getDirIndex(currentDir) * 90;
                    changed = true;
                }
                return;
            }

            if (currentDir === lastDir) return;

            const oldIdx = getDirIndex(lastDir);
            const newIdx = getDirIndex(currentDir);
            let diff = newIdx - oldIdx;

            // Handle wrapping for shortest path
            if (diff === -3) diff = 1; // West -> North (3 -> 0) should be +1 (90deg)
            if (diff === 3) diff = -1; // North -> West (0 -> 3) should be -1 (-90deg)

            const currentRotation = newRotations[id] ?? (oldIdx * 90);
            newRotations[id] = currentRotation + (diff * 90);
            lastRobotDirections.current[id] = currentDir;
            changed = true;
        });

        if (changed) {
            setVisualRotations(newRotations);
        }
    }, [robots]);

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
                    // Use shared world state for door status
                    const isOpen = (worldState.doorStates && door.id in worldState.doorStates) ? worldState.doorStates[door.id] : door.isOpen;
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

                {/* Robot Trails */}
                {Object.values(robots).map((robot) => (
                    robot.trail && robot.trail.map((segment, i) => (
                        <motion.line
                            key={`trail-${robot.name}-${i}`}
                            initial={{
                                x2: segment.x1 * cellSize + cellSize / 2,
                                y2: segment.y1 * cellSize + cellSize / 2
                            }}
                            animate={{
                                x2: segment.x2 * cellSize + cellSize / 2,
                                y2: segment.y2 * cellSize + cellSize / 2
                            }}
                            transition={{
                                type: robot.speed < 200 ? "tween" : "spring",
                                duration: robot.speed < 200 ? robot.speed / 1000 : undefined,
                                stiffness: robot.speed < 200 ? undefined : 200,
                                damping: robot.speed < 200 ? undefined : 20,
                            }}
                            x1={segment.x1 * cellSize + cellSize / 2}
                            y1={segment.y1 * cellSize + cellSize / 2}
                            stroke={segment.color}
                            strokeWidth={segment.size}
                            strokeLinecap="round"
                            opacity={segment.opacity ?? 0.6}
                        />
                    ))
                ))}

                {/* Items */}
                <AnimatePresence>
                    {maze.items?.map((item) => {
                        // Filter logic using shared world state
                        const isCollected = worldState.collectedItemIds?.includes(item.id);
                        if (isCollected) return null;

                        const isRevealed = item.isRevealed !== false || (worldState.revealedItemIds && worldState.revealedItemIds.includes(item.id));
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

                {/* Render ALL Robots */}
                {Object.entries(robots).map(([robotId, robot]) => (
                    <g
                        key={robotId}
                        onMouseEnter={() => setHoveredRobotId(robotId)}
                        onMouseLeave={() => setHoveredRobotId(null)}
                        style={{ cursor: 'pointer' }}
                    >
                        {/* Echo Wave */}
                        {robot.echoWave && (
                            <motion.g
                                key={`wave-${robot.echoWave.timestamp}`}
                                initial={{
                                    opacity: 1,
                                    x: (robot.echoWave.x * cellSize) + (cellSize / 2) + Math.sign(getDirIndex(robot.echoWave.direction) === 1 ? 1 : getDirIndex(robot.echoWave.direction) === 3 ? -1 : 0) * (cellSize / 2),
                                    y: (robot.echoWave.y * cellSize) + (cellSize / 2) + Math.sign(getDirIndex(robot.echoWave.direction) === 2 ? 1 : getDirIndex(robot.echoWave.direction) === 0 ? -1 : 0) * (cellSize / 2),
                                    rotate: getDirIndex(robot.echoWave.direction) * 90,
                                    scale: 0.2
                                }}
                                animate={{
                                    opacity: [1, 1, 0],
                                    x: (robot.echoWave.x * cellSize) + (cellSize / 2) +
                                        (getDirIndex(robot.echoWave.direction) === 1 ? 1 : getDirIndex(robot.echoWave.direction) === 3 ? -1 : 0) * (robot.echoWave.distance * cellSize),
                                    y: (robot.echoWave.y * cellSize) + (cellSize / 2) +
                                        (getDirIndex(robot.echoWave.direction) === 2 ? 1 : getDirIndex(robot.echoWave.direction) === 0 ? -1 : 0) * (robot.echoWave.distance * cellSize),
                                    scale: 1
                                }}
                                transition={{ duration: 0.5, ease: "linear" }}
                            >
                                <path
                                    d={`M -${cellSize / 2} 0 Q 0 ${cellSize / 2} ${cellSize / 2} 0`}
                                    fill="none"
                                    stroke="#0ea5e9"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    filter="url(#neon-glow)"
                                    transform="rotate(180)"
                                />
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

                        {/* Echo Hit */}
                        {robot.echoHit && (
                            <motion.g
                                key={`hit-${robot.echoHit.timestamp}`}
                                initial={{
                                    scale: 0,
                                    opacity: 1,
                                    x: robot.echoHit.x * cellSize + cellSize / 2,
                                    y: robot.echoHit.y * cellSize + cellSize / 2
                                }}
                                style={{ transformOrigin: "0px 0px" }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                <circle
                                    cx={0} cy={0} r={cellSize / 3}
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    vectorEffect="non-scaling-stroke"
                                    filter="url(#neon-glow)"
                                />
                            </motion.g>
                        )}

                        {/* Explosion */}
                        {robot.explosion && (
                            <motion.g
                                key={`expl-${robot.explosion.timestamp}`}
                                initial={{
                                    opacity: 1,
                                    scale: 0.5,
                                    x: robot.explosion.x * cellSize + cellSize / 2,
                                    y: robot.explosion.y * cellSize + cellSize / 2
                                }}
                                animate={{ opacity: 0, scale: 2 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            >
                                <circle cx="0" cy="0" r={cellSize} fill="#ef4444" fillOpacity="0.5" />
                                <circle cx="0" cy="0" r={cellSize * 0.7} fill="#f97316" fillOpacity="0.7" />
                            </motion.g>
                        )}

                        {/* Robot Body */}
                        {!robot.isDestroyed && (
                            <motion.g
                                initial={false}
                                animate={{
                                    x: robot.position.x * cellSize + cellSize / 2,
                                    y: robot.position.y * cellSize + cellSize / 2,
                                    // Use the cumulative visual rotation if available, otherwise fallback to absolute
                                    rotate: visualRotations[robotId] ?? (getDirIndex(robot.direction) * 90)
                                }}
                                transition={{
                                    type: robot.speed < 200 ? "tween" : "spring",
                                    duration: robot.speed < 200 ? robot.speed / 1000 : undefined,
                                    stiffness: robot.speed < 200 ? undefined : 200,
                                    damping: robot.speed < 200 ? undefined : 20,
                                }}
                            >
                                <g transform={`translate(-${cellSize / 2}, -${cellSize / 2})`}>
                                    {robot.appearance && robot.appearance.url ? (
                                        <image
                                            href={robot.appearance.url}
                                            x={robot.appearance.width ? (cellSize - robot.appearance.width) / 2 : 0}
                                            y={robot.appearance.height ? (cellSize - robot.appearance.height) / 2 : 0}
                                            width={robot.appearance.width || cellSize}
                                            height={robot.appearance.height || cellSize}
                                            preserveAspectRatio={robot.appearance.width ? "none" : "xMidYMid meet"}
                                        />
                                    ) : (
                                        <>
                                            <circle
                                                cx={cellSize / 2} cy={cellSize / 2} r={cellSize * 0.35}
                                                fill="#0f172a" stroke={robot.color || "#38bdf8"} strokeWidth="2"
                                            />
                                            <circle
                                                cx={cellSize / 2} cy={cellSize / 2} r={cellSize * 0.15}
                                                fill={robot.color || "#38bdf8"}
                                                filter="url(#neon-glow)"
                                            />
                                            <path
                                                d={`M ${cellSize / 2} ${cellSize * 0.15} L ${cellSize / 2} ${cellSize * 0.05}`}
                                                stroke={robot.color || "#38bdf8"}
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                            />
                                        </>
                                    )}
                                </g>
                            </motion.g>
                        )}

                        {/* Robot Name (Hover only) */}
                        {!robot.isDestroyed && hoveredRobotId === robotId && (
                            <motion.g
                                key={`name-${robot.name}`}
                                animate={{
                                    x: robot.position.x * cellSize + cellSize / 2,
                                    y: robot.position.y * cellSize + cellSize / 2
                                }}
                                transition={{
                                    type: robot.speed < 200 ? "tween" : "spring",
                                    duration: robot.speed < 200 ? robot.speed / 1000 : undefined,
                                    stiffness: robot.speed < 200 ? undefined : 200,
                                    damping: robot.speed < 200 ? undefined : 20,
                                }}
                            >
                                <text
                                    y={-cellSize}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize={cellSize / 2.5}
                                    fontWeight="bold"
                                    stroke="black"
                                    strokeWidth="3"
                                    paintOrder="stroke"
                                    style={{
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                        pointerEvents: 'none',
                                        userSelect: 'none'
                                    }}
                                >
                                    {robot.name}
                                </text>
                            </motion.g>
                        )}
                    </g>
                ))}

                {/* Robot Health Bars Layer */}
                {showRobotHealth && Object.values(robots).map((robot) => (
                    !robot.isDestroyed && (
                        <motion.g
                            key={`health-${robot.name}`}
                            initial={false}
                            animate={{
                                x: robot.position.x * cellSize + cellSize / 2,
                                y: robot.position.y * cellSize + cellSize / 2,
                            }}
                            transition={{
                                type: robot.speed < 200 ? "tween" : "spring",
                                duration: robot.speed < 200 ? robot.speed / 1000 : undefined,
                                stiffness: robot.speed < 200 ? undefined : 200,
                                damping: robot.speed < 200 ? undefined : 20,
                            }}
                        >
                            {/* Background Bar */}
                            <rect
                                x={-cellSize / 2}
                                y={-cellSize / 2 - 8}
                                width={cellSize}
                                height={4}
                                rx={2}
                                fill="#1f2937"
                                stroke="#374151"
                                strokeWidth={0.5}
                            />
                            {/* Health Fill */}
                            <rect
                                x={-cellSize / 2}
                                y={-cellSize / 2 - 8}
                                width={(Math.max(0, Math.min(100, robot.health)) / 100) * cellSize}
                                height={4}
                                rx={2}
                                fill={robot.health > 50 ? '#10b981' : robot.health > 20 ? '#fbbf24' : '#ef4444'}
                            />
                            {/* Border */}
                            <rect
                                x={-cellSize / 2}
                                y={-cellSize / 2 - 8}
                                width={cellSize}
                                height={4}
                                rx={2}
                                fill="none"
                                stroke="#000000"
                                strokeWidth={1}
                                strokeOpacity={0.8}
                            />
                        </motion.g>
                    )
                ))}
            </svg>

            {/* Controls Overlay */}
            <div className="absolute top-2 right-2 flex gap-2">
                <label className="flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-1 rounded border border-gray-700 text-xs text-gray-300 cursor-pointer hover:bg-black/80 hover:text-white transition-colors">
                    <input
                        type="checkbox"
                        checked={showRobotHealth}
                        onChange={(e) => setShowRobotHealth(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-3 h-3"
                    />
                    Health
                </label>
            </div>
        </div>
    );
}
