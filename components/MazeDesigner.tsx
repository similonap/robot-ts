"use client"

import { useState } from 'react';
import { MazeConfig, Position, Item } from '../lib/types';
import CodeEditor from './CodeEditor';

const INITIAL_WIDTH = 15;
const INITIAL_HEIGHT = 15;
const DEFAULT_STEP_CODE = `// Check conditions every step
// Available: robot (state), maze, game
/*
if (robot.position.x === 10 && robot.position.y === 10) {
    game.win("You reached the goal!");
}
*/
`;

const ITEM_TYPES = [
    { name: 'Apple', icon: '🍎', type: 'Food' },
    { name: 'Battery', icon: '🔋', type: 'Energy' },
    { name: 'Gem', icon: '💎', type: 'Treasure' },
    { name: 'Key', icon: '🗝️', type: 'Tool' },
    { name: 'Potion', icon: '🧪', type: 'Consumable' },
    { name: 'Coin', icon: '🪙', type: 'Treasure' },
    { name: 'Map', icon: '🗺️', type: 'Tool' },
];

type Tool = 'wall' | 'path' | 'start' | 'item' | null;

export default function MazeDesigner() {
    const [width, setWidth] = useState(INITIAL_WIDTH);
    const [height, setHeight] = useState(INITIAL_HEIGHT);
    const [walls, setWalls] = useState<boolean[][]>(
        Array(INITIAL_HEIGHT).fill(null).map(() => Array(INITIAL_WIDTH).fill(false))
    );
    const [start, setStart] = useState<Position>({ x: 1, y: 1 });
    const [items, setItems] = useState<Item[]>([]);
    const [stepCode, setStepCode] = useState(DEFAULT_STEP_CODE);
    const [zoom, setZoom] = useState(1);

    // UI State
    const [selectedTool, setSelectedTool] = useState<Tool>('wall');
    const [selectedItemTemplate, setSelectedItemTemplate] = useState({ name: 'Apple', icon: '🍎', type: 'Food' });
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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

    const handleZoom = (delta: number) => {
        setZoom(prev => Math.min(Math.max(0.2, prev + delta), 3));
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
        }
    };

    const handleCellClick = (x: number, y: number) => {
        // Priority: If item exists at this position, select it regardless of tool (unless we add specific override later)
        const existingItem = items.find(i => i.position.x === x && i.position.y === y);

        if (existingItem) {
            // Implicit Selection Logic
            setSelectedItemId(existingItem.id);
            // Do not paint
            return;
        }

        // If no item, use selected tool
        if (!selectedTool) {
            // If just pointer/null and clicked empty space, deselect item
            setSelectedItemId(null);
            return;
        }

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
                icon: selectedItemTemplate.icon,
                type: selectedItemTemplate.type,
                position: { x, y }
            };
            setItems([...filtered, newItem]);
            // Auto-select new item
            setSelectedItemId(newItem.id);

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
            items,
            stepCode
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
                        <h3 className="font-bold mb-2 text-gray-400 uppercase text-xs">View</h3>
                        <div className="flex gap-2 items-center bg-gray-800 p-2 rounded">
                            <button
                                onClick={() => handleZoom(-0.1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-xl"
                            >
                                -
                            </button>
                            <span className="flex-1 text-center">{Math.round(zoom * 100)}%</span>
                            <button
                                onClick={() => handleZoom(0.1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-xl"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2 text-gray-400 uppercase text-xs">Tools</h3>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setSelectedTool(prev => prev === 'wall' ? null : 'wall')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'wall' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-gray-600 border border-gray-500"></div> Wall
                            </button>
                            <button
                                onClick={() => setSelectedTool(prev => prev === 'path' ? null : 'path')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'path' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-gray-800 border border-gray-700"></div> Path
                            </button>
                            <button
                                onClick={() => setSelectedTool(prev => prev === 'start' ? null : 'start')}
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
                                        if (selectedTool === 'item' && selectedItemTemplate.name === item.name) {
                                            setSelectedTool(null);
                                        } else {
                                            setSelectedTool('item');
                                            setSelectedItemTemplate(item);
                                        }
                                        setSelectedItemId(null);
                                    }}
                                    title={item.name}
                                    className={`p-2 rounded text-xl hover:bg-gray-700 ${selectedTool === 'item' && selectedItemTemplate.name === item.name ? 'bg-gray-700 ring-2 ring-blue-500' : ''}`}
                                >
                                    {item.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid Editor */}
                <div className="flex-1 flex flex-col gap-4">
                    <div
                        className="flex-1 bg-gray-900 border border-gray-700 rounded overflow-auto flex justify-center items-start pt-12 relative"
                        onWheel={handleWheel}
                    >
                        <div
                            className="bg-gray-700 select-none grid gap-px origin-top transition-transform duration-100 ease-out"
                            style={{
                                transform: `scale(${zoom})`,
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
                                    const isSelected = item && selectedItemId === item.id;

                                    return (
                                        <div
                                            key={`${x}-${y}`}
                                            onMouseDown={() => handleCellClick(x, y)}
                                            onMouseEnter={() => handleCellEnter(x, y)}
                                            className={`w-8 h-8 flex items-center justify-center cursor-pointer
                                                ${isWall ? 'bg-gray-600' : 'bg-gray-800 hover:bg-gray-750'}
                                                ${isStart ? 'ring-2 ring-inset ring-blue-500' : ''}
                                                ${isSelected ? 'ring-2 ring-yellow-400 bg-gray-700' : ''}
                                                ${!selectedTool && !isSelected ? 'hover:ring-1 hover:ring-gray-400' : ''}
                                            `}
                                        >
                                            {isStart && <div className="w-4 h-4 bg-blue-500 rounded-full" />}
                                            {item && !isStart && <span className="text-xl leading-none">{item.icon}</span>}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Level Logic Editor */}
                    <div className="h-48 bg-gray-900 border border-gray-700 rounded p-2 flex flex-col">
                        <h3 className="text-sm font-bold text-gray-400 mb-2">Level Logic (Runs every step)</h3>
                        <div className="flex-1 border border-gray-700">
                            <CodeEditor
                                files={{ 'logic.ts': stepCode }}
                                activeFile="logic.ts"
                                onChange={(val) => setStepCode(val || '')}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Properties */}
                <div className="w-64 bg-gray-900 p-4 rounded border border-gray-700 overflow-y-auto">
                    <h3 className="font-bold mb-4 text-gray-400 uppercase text-xs">Properties</h3>

                    {selectedItemId && items.find(i => i.id === selectedItemId) ? (
                        <div className="flex flex-col gap-4">
                            {(() => {
                                const item = items.find(i => i.id === selectedItemId)!;
                                return (
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <label className="text-xs text-gray-400">ID</label>
                                            <input
                                                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-500 font-mono"
                                                value={item.id}
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400">Name</label>
                                            <input
                                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                                                value={item.name}
                                                onChange={e => {
                                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i));
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-16">
                                                <label className="text-xs text-gray-400">Icon</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-center"
                                                    value={item.icon}
                                                    onChange={e => {
                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, icon: e.target.value } : i));
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-400">Type</label>
                                                <select
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                                                    value={item.type}
                                                    onChange={e => {
                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, type: e.target.value } : i));
                                                    }}
                                                >
                                                    {['Food', 'Energy', 'Treasure', 'Tool', 'Consumable'].map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setItems(prev => prev.filter(i => i.id !== item.id));
                                                setSelectedItemId(null);
                                            }}
                                            className="bg-red-900 text-red-200 text-xs py-1 rounded hover:bg-red-800"
                                        >
                                            Delete Item
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-sm italic text-center mt-10">
                            Select an item to edit its properties
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
