'use client';
import { useState } from 'react';
import { MazeConfig, Position, Item } from '../lib/types';

const INITIAL_WIDTH = 15;
const INITIAL_HEIGHT = 15;

const ITEM_TYPES = [
    { name: 'Apple', emoji: '🍎', type: 'Food' },
    { name: 'Battery', emoji: '🔋', type: 'Energy' },
    { name: 'Gem', emoji: '💎', type: 'Treasure' },
    { name: 'Key', emoji: '🗝️', type: 'Tool' },
    { name: 'Potion', emoji: '🧪', type: 'Consumable' },
    { name: 'Coin', emoji: '🪙', type: 'Treasure' },
    { name: 'Map', emoji: '🗺️', type: 'Tool' },
];

type Tool = 'wall' | 'path' | 'start' | 'item';

export default function MazeDesigner() {
    const [width, setWidth] = useState(INITIAL_WIDTH);
    const [height, setHeight] = useState(INITIAL_HEIGHT);
    const [walls, setWalls] = useState<boolean[][]>(
        Array(INITIAL_HEIGHT).fill(null).map(() => Array(INITIAL_WIDTH).fill(false))
    );
    const [start, setStart] = useState<Position>({ x: 1, y: 1 });
    const [items, setItems] = useState<Item[]>([]);

    // UI State
    const [selectedTool, setSelectedTool] = useState<Tool>('wall');
    const [selectedItemTemplate, setSelectedItemTemplate] = useState(ITEM_TYPES[0]);
    const [isDragging, setIsDragging] = useState(false);

    const handleResize = (newW: number, newH: number) => {
        setWidth(newW);
        setHeight(newH);

        // Rebuild walls array respecting new dimensions
        const newWalls = Array(newH).fill(null).map((_, y) =>
            Array(newW).fill(null).map((_, x) => {
                if (y < walls.length && x < walls[0].length) {
                    return walls[y][x];
                }
                return true; // Default new area to walls
            })
        );
        setWalls(newWalls);

        // Filter items out of bounds
        setItems(prev => prev.filter(i => i.position.x < newW && i.position.y < newH));

        // Reset start if OOB
        if (start.x >= newW || start.y >= newH) {
            setStart({ x: 1, y: 1 });
        }
    };

    const handleCellClick = (x: number, y: number) => {
        if (selectedTool === 'wall') {
            const newWalls = [...walls];
            newWalls[y] = [...newWalls[y]];
            newWalls[y][x] = true;
            setWalls(newWalls);
            // Remove items at this pos
            setItems(prev => prev.filter(i => i.position.x !== x || i.position.y !== y));
        } else if (selectedTool === 'path') {
            const newWalls = [...walls];
            newWalls[y] = [...newWalls[y]];
            newWalls[y][x] = false;
            setWalls(newWalls);
        } else if (selectedTool === 'start') {
            setStart({ x, y });
            // Ensure logic allows start here (e.g. not a wall)
            const newWalls = [...walls];
            newWalls[y][x] = false;
            setWalls(newWalls);
        } else if (selectedTool === 'item') {
            // Remove existing item at pos
            const filtered = items.filter(i => i.position.x !== x || i.position.y !== y);
            const newItem: Item = {
                id: `item-${Date.now()}`,
                name: selectedItemTemplate.name,
                emoji: selectedItemTemplate.emoji,
                type: selectedItemTemplate.type,
                position: { x, y }
            };
            setItems([...filtered, newItem]);

            // Ensure path
            const newWalls = [...walls];
            newWalls[y][x] = false;
            setWalls(newWalls);
        }
    };

    const handleCellEnter = (x: number, y: number) => {
        if (isDragging && (selectedTool === 'wall' || selectedTool === 'path')) {
            handleCellClick(x, y);
        }
    };

    const exportJson = () => {
        const config: MazeConfig = {
            width,
            height,
            start,
            walls,
            items
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "maze.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            <header className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h1 className="text-2xl font-bold">🏗️ Maze Designer</h1>
                <div className="flex gap-4">
                    <button onClick={exportJson} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
                        Export JSON
                    </button>
                </div>
            </header>

            <div className="flex gap-4 flex-1 overflow-hidden">
                {/* Tools Sidebar */}
                <div className="w-64 flex flex-col gap-6 bg-gray-900 p-4 rounded border border-gray-700 overflow-y-auto">
                    <div>
                        <h3 className="font-bold mb-2 text-gray-400 uppercase text-xs">Dimensions</h3>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                value={width}
                                onChange={(e) => handleResize(parseInt(e.target.value) || 5, height)}
                                className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                            />
                            <span>x</span>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => handleResize(width, parseInt(e.target.value) || 5)}
                                className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1"
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2 text-gray-400 uppercase text-xs">Tools</h3>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setSelectedTool('wall')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'wall' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-gray-600 border border-gray-500"></div> Wall
                            </button>
                            <button
                                onClick={() => setSelectedTool('path')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'path' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-gray-800 border border-gray-700"></div> Path
                            </button>
                            <button
                                onClick={() => setSelectedTool('start')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'start' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Start
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2 text-gray-400 uppercase text-xs">Items</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {ITEM_TYPES.map(item => (
                                <button
                                    key={item.name}
                                    onClick={() => {
                                        setSelectedTool('item');
                                        setSelectedItemTemplate(item);
                                    }}
                                    title={item.name}
                                    className={`p-2 rounded text-xl hover:bg-gray-700 ${selectedTool === 'item' && selectedItemTemplate.name === item.name ? 'bg-gray-700 ring-2 ring-blue-500' : ''}`}
                                >
                                    {item.emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid Editor */}
                <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-4 overflow-auto flex justify-center items-center">
                    <div
                        className="grid gap-px bg-gray-700 select-none"
                        style={{
                            gridTemplateColumns: `repeat(${width}, 1fr)`,
                            width: 'fit-content'
                        }}
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={() => setIsDragging(false)}
                        onMouseLeave={() => setIsDragging(false)}
                    >
                        {walls.map((row, y) =>
                            row.map((isWall, x) => {
                                const isStart = start.x === x && start.y === y;
                                const item = items.find(i => i.position.x === x && i.position.y === y);

                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        onMouseDown={() => handleCellClick(x, y)}
                                        onMouseEnter={() => handleCellEnter(x, y)}
                                        className={`w-8 h-8 flex items-center justify-center cursor-pointer
                                            ${isWall ? 'bg-gray-600' : 'bg-gray-800 hover:bg-gray-750'}
                                            ${isStart ? 'ring-2 ring-inset ring-blue-500' : ''}
                                        `}
                                    >
                                        {isStart && <div className="w-4 h-4 bg-blue-500 rounded-full" />}
                                        {item && !isStart && <span className="text-xl leading-none">{item.emoji}</span>}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
