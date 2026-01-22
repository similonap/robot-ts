import { useState, useRef, useCallback } from 'react';
import { RobotState, Position, SharedWorldState, RobotAppearance } from '@/lib/types';
import { RobotController } from '@/lib/robot-api';

export const useRobots = () => {
    // UI State
    const [robots, setRobots] = useState<Record<string, RobotState>>({});

    // Ref for logic access if needed? RobotController maintains its own state, 
    // but `onUpdate` needs to update the UI map.

    // We need to support creating a robot.
    // The `RobotController` is created inside `useCodeRunner` or wherever the user code executes.
    // `useRobots` just needs to provide a way to REGISTER a robot state update.

    // How do we handle IDs?
    // When `new Robot()` is called, we generate an ID.

    const updateRobotState = useCallback((name: string, state: RobotState) => {
        setRobots(prev => ({
            ...prev,
            [name]: state
        }));
    }, []);

    const removeRobot = useCallback((name: string) => {
        setRobots(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const clearRobots = useCallback(() => {
        setRobots({});
    }, []);

    const initializeRobots = useCallback((initialConfigs: import('@/lib/types').InitialRobotConfig[]) => {
        const initialMap: Record<string, RobotState> = {};
        initialConfigs.forEach(config => {
            if (!config.name) return; // Should have name
            initialMap[config.name] = {
                name: config.name,
                color: config.color || '#38bdf8',
                position: config.position,
                direction: config.direction,
                inventory: [],
                speed: 1,
                health: 100,
                appearance: { url: '' } // Def appearance
            };
        });
        setRobots(initialMap);
    }, []);

    return {
        robots,
        updateRobotState,
        removeRobot,
        clearRobots,
        initializeRobots
    };
};
