import { PressurePlate } from 'circuit-crawler';
import { motion } from 'framer-motion';

interface MazePressurePlateDisplayProps {
    plate: PressurePlate;
    isActive: boolean;
    cellSize: number;
}

export default function MazePressurePlateDisplay({ plate, isActive, cellSize }: MazePressurePlateDisplayProps) {
    return (
        <g transform={`translate(${plate.position.x * cellSize + cellSize / 2}, ${plate.position.y * cellSize + cellSize / 2})`}>
            {/* Housing: The base on the floor */}
            <rect
                x={-cellSize * 0.45}
                y={-cellSize * 0.45}
                width={cellSize * 0.9}
                height={cellSize * 0.9}
                rx={6}
                fill="#1e293b" // slate-800
                stroke="#334155" // slate-700
                strokeWidth={1}
            />

            {/* The actual plate button */}
            <motion.rect
                animate={{
                    scale: isActive ? 0.92 : 1, // Slight scaling to simulate being pressed
                    fill: isActive ? '#0e7490' : '#475569', // cyan-700 (active) vs slate-600 (inactive)
                    stroke: isActive ? '#22d3ee' : '#cbd5e1', // cyan-400 vs slate-300
                    strokeWidth: isActive ? 2 : 1,
                    fillOpacity: isActive ? 0.8 : 1
                }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
                x={-cellSize * 0.35}
                y={-cellSize * 0.35}
                width={cellSize * 0.7}
                height={cellSize * 0.7}
                rx={4}
            />

            {/* Inner Indicator Light */}
            <motion.circle
                animate={{
                    fill: isActive ? '#a5f3fc' : '#0f172a', // cyan-200 vs slate-900
                    r: isActive ? cellSize * 0.1 : cellSize * 0.08,
                    opacity: isActive ? 1 : 0.5
                }}
                cx={0}
                cy={0}
            />

            {/* Active Glow Ring */}
            {isActive && (
                <motion.rect
                    x={-cellSize * 0.45}
                    y={-cellSize * 0.45}
                    width={cellSize * 0.9}
                    height={cellSize * 0.9}
                    rx={6}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.15 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                />
            )}
        </g>
    );
}
