'use client';
import React, { useState, useEffect, useRef } from 'react';

interface ResizableSplitProps {
    id: string; // Key for local storage persistence
    isVertical?: boolean;
    initialSplit?: number; // Percentage (0-100)
    minSplit?: number;
    maxSplit?: number;
    first: React.ReactNode;
    second: React.ReactNode;
    className?: string;
}

export default function ResizableSplit({
    id,
    isVertical = false,
    initialSplit = 50,
    minSplit = 10,
    maxSplit = 90,
    first,
    second,
    className = ''
}: ResizableSplitProps) {
    const [split, setSplit] = useState(initialSplit);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    useEffect(() => {
        const stored = localStorage.getItem(`split-${id}`);
        if (stored) {
            setSplit(parseFloat(stored));
        }
    }, [id]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            let newSplit;

            if (isVertical) {
                const dy = e.clientY - rect.top;
                newSplit = (dy / rect.height) * 100;
            } else {
                const dx = e.clientX - rect.left;
                newSplit = (dx / rect.width) * 100;
            }

            newSplit = Math.max(minSplit, Math.min(maxSplit, newSplit));
            setSplit(newSplit);
        };

        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                localStorage.setItem(`split-${id}`, split.toString());
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isVertical, minSplit, maxSplit, id, split]);

    const startDrag = () => {
        isDragging.current = true;
        document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';
    };

    return (
        <div
            ref={containerRef}
            className={`flex w-full h-full ${isVertical ? 'flex-col' : 'flex-row'} ${className}`}
            style={{ overflow: 'hidden' }}
        >
            <div style={{ flex: `0 0 ${split}%`, overflow: 'hidden', display: 'flex' }}>
                {first}
            </div>

            <div
                onMouseDown={startDrag}
                className={`z-10 bg-gray-700 hover:bg-blue-500 transition-colors flex-shrink-0
                    ${isVertical ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'}
                `}
            />

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                {second}
            </div>
        </div>
    );
}
