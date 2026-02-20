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
            {/* Plate Base */}
            <motion.rect
                animate={{
                    fill: isActive ? '#22c55e' : '#334155',
                    fillOpacity: isActive ? 0.6 : 0.3,
                    stroke: isActive ? '#4ade80' : '#475569',
                    strokeWidth: isActive ? 2 : 1,
                    scale: isActive ? 0.9 : 0.8
                }}
                x={-cellSize * 0.4}
                y={-cellSize * 0.4}
                width={cellSize * 0.8}
                height={cellSize * 0.8}
                rx={4}
                transition={{ duration: 0.2 }}
            />

            {/* Active Glow/Indicator */}
            {isActive && (
                <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    x={-cellSize * 0.3}
                    y={-cellSize * 0.3}
                    width={cellSize * 0.6}
                    height={cellSize * 0.6}
                    rx={3}
                    fill="#4ade80"
                    fillOpacity="0.4"
                />
            )}
        </g>
    );
}
