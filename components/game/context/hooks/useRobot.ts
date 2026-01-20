import { useState } from 'react';
import { RunnerState } from '@/lib/types';

export const INITIAL_ROBOT_STATE: RunnerState = {
    position: { x: 0, y: 0 },
    direction: 'East',
    inventory: [],
    doorStates: {},
    revealedItemIds: [],
    collectedItemIds: [],
    speed: 500,
    health: 100,
};

export const useRobot = (initialPosition?: { x: number, y: number }) => {
    const [robotState, setRobotState] = useState<RunnerState>({
        ...INITIAL_ROBOT_STATE,
        position: initialPosition || { x: 0, y: 0 }
    });

    const resetRobot = (position: { x: number, y: number }) => {
        setRobotState({
            ...INITIAL_ROBOT_STATE,
            position
        });
    };

    return {
        robotState,
        setRobotState,
        resetRobot
    };
};
