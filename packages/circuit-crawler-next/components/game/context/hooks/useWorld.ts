import { useState, useRef, useCallback, useEffect } from 'react';
import { SharedWorldState, MazeConfig } from 'circuit-crawler';

export const useWorld = (initialMaze: MazeConfig) => {
    // UI State
    const [doorStates, setDoorStates] = useState<Record<string, boolean>>({});
    const [revealedItemIds, setRevealedItemIds] = useState<string[]>([]);
    const [collectedItemIds, setCollectedItemIds] = useState<string[]>([]);

    // Logic State (Refs for synchronous access in game loop)
    const doorStatesRef = useRef<Record<string, boolean>>({});
    const revealedItemIdsRef = useRef<Set<string>>(new Set());
    const collectedItemIdsRef = useRef<Set<string>>(new Set());

    // Tracking updates to flush to UI
    const pendingUpdates = useRef(false);

    // Initialize
    useEffect(() => {
        const initialDoors: Record<string, boolean> = {};
        initialMaze.doors.forEach(d => {
            initialDoors[d.id] = d.isOpen;
        });
        doorStatesRef.current = initialDoors;
        revealedItemIdsRef.current = new Set();
        collectedItemIdsRef.current = new Set();

        flushUpdates();
    }, [initialMaze]);

    const flushUpdates = useCallback(() => {
        setDoorStates({ ...doorStatesRef.current });
        setRevealedItemIds(Array.from(revealedItemIdsRef.current));
        setCollectedItemIds(Array.from(collectedItemIdsRef.current));
        pendingUpdates.current = false;
    }, []);

    const resetWorld = useCallback(() => {
        const initialDoors: Record<string, boolean> = {};
        initialMaze.doors.forEach(d => {
            initialDoors[d.id] = d.isOpen;
        });
        doorStatesRef.current = initialDoors;
        revealedItemIdsRef.current = new Set();
        collectedItemIdsRef.current = new Set();
        flushUpdates();
    }, [initialMaze, flushUpdates]);

    // SharedWorldState Implementation
    const worldActions: SharedWorldState = {
        flushUpdates, // Actually we might trigger this automatically? Or let robot trigger it?
        isItemCollected: (id: string) => collectedItemIdsRef.current.has(id),
        collectItem: (id: string) => {
            collectedItemIdsRef.current.add(id);
            pendingUpdates.current = true;
        },
        isDoorOpen: (id: string) => !!doorStatesRef.current[id],
        openDoor: (id: string) => {
            doorStatesRef.current[id] = true;
            pendingUpdates.current = true;
        },
        closeDoor: (id: string) => {
            doorStatesRef.current[id] = false;
            pendingUpdates.current = true;
        },
        revealItem: (id: string) => {
            revealedItemIdsRef.current.add(id);
            pendingUpdates.current = true;
        },
        isItemRevealed: (id: string) => revealedItemIdsRef.current.has(id),
    };

    return {
        doorStates,
        revealedItemIds,
        collectedItemIds,
        worldActions,
        resetWorld,
        flushUpdates
    };
};
