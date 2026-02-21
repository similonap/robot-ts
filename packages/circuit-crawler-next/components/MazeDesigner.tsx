"use client"

import { useState, useEffect } from 'react';
import { MazeConfig, Position, Item, Door, InitialRobotConfig, PressurePlate } from 'circuit-crawler';
import CodeEditor from './CodeEditor';
import MazeItemDisplay from './game/display/MazeItemDisplay';
import MazePressurePlateDisplay from './game/display/MazePressurePlateDisplay';
import ResizableSplit from './ResizableSplit';

const INITIAL_WIDTH = 15;
const INITIAL_HEIGHT = 15;
const DEFAULT_STEP_CODE = `// Check conditions every step
// Available: game
export { robot, game, Robot };

/*
if (game.items.length === 0) {
    game.win("All items collected!");
}
*/
`;

const ITEM_TYPES = [
    { name: 'Apple', icon: '🍎', tags: ['Food'] },
    { name: 'Battery', icon: '🔋', tags: ['Energy'] },
    { name: 'Gem', icon: '💎', tags: ['Treasure'] },
    { name: 'Key', icon: '🗝️', tags: ['Tool'] },
    { name: 'Potion', icon: '🧪', tags: ['Consumable'] },
    { name: 'Coin', icon: '🪙', tags: ['Treasure'] },
    { name: 'Map', icon: '🗺️', tags: ['Tool'] },
];

type Tool = 'wall' | 'path' | 'robot' | 'item' | 'door' | 'pressure_plate' | null;

export default function MazeDesigner({ sharedTypes }: { sharedTypes: string }) {
    const [width, setWidth] = useState(INITIAL_WIDTH);
    const [height, setHeight] = useState(INITIAL_HEIGHT);
    const [walls, setWalls] = useState<boolean[][]>(
        Array(INITIAL_HEIGHT).fill(null).map(() => Array(INITIAL_WIDTH).fill(false))
    );
    const [initialRobots, setInitialRobots] = useState<InitialRobotConfig[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [doors, setDoors] = useState<Door[]>([]);
    const [pressurePlates, setPressurePlates] = useState<PressurePlate[]>([]);
    const [globalModule, setGlobalModule] = useState(DEFAULT_STEP_CODE);
    const [zoom, setZoom] = useState(1);

    // UI State
    const [selectedTool, setSelectedTool] = useState<Tool>('wall');
    const [selectedItemTemplate, setSelectedItemTemplate] = useState({ name: 'Apple', icon: '🍎', tags: ['Food'] });
    // ... (existing state)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null); // Items or Doors
    const [tempName, setTempName] = useState(''); // Temp state for name editing
    const [isDragging, setIsDragging] = useState(false);

    // Sync tempName when selection changes
    useEffect(() => {
        if (selectedItemId) {
            const robot = initialRobots.find(r => r.name === selectedItemId);
            if (robot) setTempName(robot.name);
        }
    }, [selectedItemId, initialRobots]);



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
        setItems(prev => prev.filter(i => i.position && i.position.x < newW && i.position.y < newH));
        setDoors(prev => prev.filter(d => d.position.x < newW && d.position.y < newH));
        setPressurePlates(prev => prev.filter(p => p.position.x < newW && p.position.y < newH));

        // Reset start if OOB - Removed
        // if (start.x >= newW || start.y >= newH) {
        //    setStart({ x: 1, y: 1 });
        // }
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
        // Priority: If entity exists at this position, select it regardless of tool
        const existingItem = items.find(i => i.position?.x === x && i.position?.y === y);
        const existingDoor = doors.find(d => d.position.x === x && d.position.y === y);
        const existingRobot = initialRobots.find(r => r.position.x === x && r.position.y === y);
        const existingPlate = pressurePlates.find(p => p.position.x === x && p.position.y === y);

        if (existingItem || existingDoor || existingRobot || existingPlate) {
            // Implicit Selection Logic
            setSelectedItemId(existingItem?.id || existingDoor?.id || existingRobot?.name || existingPlate?.id || null);
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
            setItems(prev => prev.filter(i => i.position?.x !== x || i.position?.y !== y));
            setDoors(prev => prev.filter(d => d.position.x !== x || d.position.y !== y));
            setInitialRobots(prev => prev.filter(r => r.position.x !== x || r.position.y !== y));
            setPressurePlates(prev => prev.filter(p => p.position.x !== x || p.position.y !== y));
        } else if (selectedTool === 'path') {
            const newWalls = [...walls];
            newWalls[y] = [...newWalls[y]];
            newWalls[y][x] = false;
            setWalls(newWalls);
        } else if (selectedTool === 'robot') {
            // Remove existing items at pos
            const filteredItems = items.filter(i => i.position?.x !== x || i.position?.y !== y);
            const filteredDoors = doors.filter(d => d.position.x !== x || d.position.y !== y);
            const filteredRobots = initialRobots.filter(r => r.position.x !== x || r.position.y !== y);
            // Pressure plates are allowed under robots

            let baseName = `Robot ${filteredRobots.length + 1}`;
            let name = baseName;
            let counter = 1;
            while (filteredRobots.some(r => r.name === name)) {
                counter++;
                name = `${baseName} (${counter})`;
            }

            const newRobot: InitialRobotConfig = {
                position: { x, y },
                direction: 'East',
                name: name,
                color: '#38bdf8'
            };

            setItems(filteredItems);
            setDoors(filteredDoors);
            setInitialRobots([...filteredRobots, newRobot]);
            // Do not clear plates
            setSelectedItemId(newRobot.name);

            // Ensure path
            const newWalls = [...walls];
            newWalls[y][x] = false;
            setWalls(newWalls);

        } else if (selectedTool === 'item') {
            // Remove existing entities at pos
            const filteredRobots = initialRobots.filter(r => r.position.x !== x || r.position.y !== y);
            const filteredItems = items.filter(i => i.position?.x !== x || i.position?.y !== y);
            // Allow items on pressure plates

            const newItem: Item = {
                id: `item-${Date.now()}`,
                type: 'item',
                name: selectedItemTemplate.name,
                icon: selectedItemTemplate.icon,
                tags: [...selectedItemTemplate.tags],
                position: { x, y }
            };

            setItems([...filteredItems, newItem]);
            setInitialRobots(filteredRobots);
            // Do not clear plates
            // Auto-select new item
            setSelectedItemId(newItem.id);

            // Ensure path
            const newWalls = [...walls];
            newWalls[y][x] = false;
            setWalls(newWalls);
        } else if (selectedTool === 'door') {
            // Remove existing item/door at pos
            const filteredItems = items.filter(i => i.position?.x !== x || i.position?.y !== y);
            const filteredDoors = doors.filter(d => d.position.x !== x || d.position.y !== y);
            const filteredRobots = initialRobots.filter(r => r.position.x !== x || r.position.y !== y);
            const filteredPlates = pressurePlates.filter(p => p.position.x !== x || p.position.y !== y);

            const newDoor: Door = {
                id: `door-${Date.now()}`,
                type: 'door',
                isOpen: false, // Default closed
                name: 'Door',
                position: { x, y }
            };

            setItems(filteredItems);
            setDoors([...filteredDoors, newDoor]);
            setInitialRobots(filteredRobots);
            setPressurePlates(filteredPlates);
            setSelectedItemId(newDoor.id);

            // Ensure path (doors are placed on paths, effectively)
            const newWalls = [...walls];
            newWalls[y][x] = false;
            setWalls(newWalls);
        } else if (selectedTool === 'pressure_plate') {
            // Remove existing entities? Allow distinct items/robots on top.
            // But if we are placing a plate, we probably want to keep existing items/robots?
            // Let's decide: Placing a plate *under* an item is useful.
            // So do NOT clear items or robots.

            const filteredDoors = doors.filter(d => d.position.x !== x || d.position.y !== y);
            const filteredPlates = pressurePlates.filter(p => p.position.x !== x || p.position.y !== y);

            const newPlate: PressurePlate = {
                id: `plate-${Date.now()}`,
                type: 'pressure_plate',
                position: { x, y }
            };

            // Keep items and robots
            setDoors(filteredDoors);
            // Keep items and robots
            setPressurePlates([...filteredPlates, newPlate]);
            setSelectedItemId(newPlate.id);

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
            initialRobots,
            walls,
            items,
            doors,
            pressurePlates,
            globalModule
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "maze.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string) as MazeConfig;

                // Basic validation
                if (typeof json.width === 'number' && typeof json.height === 'number' && Array.isArray(json.walls)) {
                    setWidth(json.width);
                    setHeight(json.height);
                    setWalls(json.walls);

                    if (json.initialRobots) {
                        setInitialRobots(json.initialRobots);
                    } else if ((json as any).start) {
                        // Legacy support: Convert start to single robot
                        // Legacy support: Convert start to single robot
                        setInitialRobots([{
                            position: (json as any).start,
                            direction: 'East',
                            color: '#38bdf8',
                            name: 'Robot 1'
                        }]);
                    } else {
                        // Default
                        // Default
                        setInitialRobots([{
                            position: { x: 1, y: 1 },
                            direction: 'East',
                            name: 'Robot 1',
                            color: '#38bdf8'
                        }]);
                    }

                    setItems(json.items || []);
                    setDoors(json.doors || []);
                    setPressurePlates(json.pressurePlates || []);
                    setGlobalModule(json.globalModule || DEFAULT_STEP_CODE);
                } else {
                    alert('Invalid maze file format');
                }
            } catch (err) {
                console.error('Failed to parse maze file:', err);
                alert('Failed to parse maze file');
            }
        };
        reader.readAsText(file);
        // Reset input value so same file can be selected again if needed
        e.target.value = '';
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            <header className="flex justify-between items-center border-b border-gray-700 pb-4">
                <div className="flex items-center gap-3">
                    <img src="/robot-icon.svg" alt="Robot Icon" className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">🏗️ Maze Designer</h1>
                </div>
                <div className="flex gap-4">
                    <label className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
                        Import JSON
                        <input
                            type="file"
                            accept=".json"
                            onChange={importJson}
                            className="hidden"
                        />
                    </label>
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
                                onClick={() => setSelectedTool(prev => prev === 'robot' ? null : 'robot')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'robot' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-cyan-500 rounded-full border border-cyan-300"></div> Robot
                            </button>
                            <button
                                onClick={() => setSelectedTool(prev => prev === 'door' ? null : 'door')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'door' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-yellow-900 border border-yellow-700"></div> Door
                            </button>
                            <button
                                onClick={() => setSelectedTool(prev => prev === 'pressure_plate' ? null : 'pressure_plate')}
                                className={`px-4 py-2 rounded text-left flex items-center gap-2 ${selectedTool === 'pressure_plate' ? 'bg-gray-700 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                            >
                                <div className="w-4 h-4 bg-green-900 border border-green-700"></div> Pressure Plate
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

                {/* Grid Editor & Code */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <ResizableSplit
                        id="designer-split"
                        isVertical={true}
                        initialSplit={70}
                        minSplit={20}
                        maxSplit={90}
                        first={
                            <div
                                className="w-full h-full bg-gray-900 border border-gray-700 rounded overflow-auto flex justify-center items-start pt-12 relative"
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
                                            const robotAtPos = initialRobots.find(r => r.position.x === x && r.position.y === y);
                                            const item = items.find(i => i.position?.x === x && i.position?.y === y);
                                            const door = doors.find(d => d.position.x === x && d.position.y === y);
                                            const plate = pressurePlates.find(p => p.position.x === x && p.position.y === y);

                                            const isSelected = (item && selectedItemId === item.id) ||
                                                (door && selectedItemId === door.id) ||
                                                (plate && selectedItemId === plate.id) ||
                                                (robotAtPos && selectedItemId === robotAtPos.name);

                                            return (
                                                <div
                                                    key={`${x}-${y}`}
                                                    onMouseDown={() => handleCellClick(x, y)}
                                                    onMouseEnter={() => handleCellEnter(x, y)}
                                                    className={`w-8 h-8 flex items-center justify-center cursor-pointer
                                                ${isWall ? 'bg-gray-600' : 'bg-gray-800 hover:bg-gray-750'}
                                                ${robotAtPos ? 'ring-2 ring-inset ring-cyan-500' : ''}
                                                ${isSelected ? 'ring-2 ring-yellow-400 bg-gray-700' : ''}
                                                ${!selectedTool && !isSelected ? 'hover:ring-1 hover:ring-gray-400' : ''}
                                            `}
                                                >
                                                    {robotAtPos && <div className="w-4 h-4 bg-cyan-500 rounded-full border border-cyan-300" title={robotAtPos.name} />}

                                                    {plate && !robotAtPos && !item && (
                                                        <div className="w-full h-full flex items-center justify-center pointer-events-none absolute">
                                                            <svg width="32" height="32" viewBox="0 0 32 32">
                                                                <g transform={`translate(${-(plate.position.x * 32)}, ${-(plate.position.y * 32)})`}>
                                                                    <MazePressurePlateDisplay plate={plate} isActive={false} cellSize={32} />
                                                                </g>
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {item && !robotAtPos && (
                                                        <div className="w-full h-full flex items-center justify-center pointer-events-none relative z-10">
                                                            <svg width="32" height="32" viewBox="0 0 32 32">
                                                                <g transform={`translate(${-(item.position?.x ?? 0) * 32}, ${-(item.position?.y ?? 0) * 32})`}>
                                                                    <MazeItemDisplay item={item} cellSize={32} />
                                                                </g>
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {door && !robotAtPos && (
                                                        <div className={`w-6 h-6 border-2 transition-colors ${door.isOpen ? 'border-yellow-500 border-dashed' : 'bg-yellow-900 border-yellow-700'}`}>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        }
                        second={
                            /* Level Logic Editor */
                            <div className="w-full h-full bg-gray-900 border border-gray-700 rounded p-2 flex flex-col">
                                <h3 className="text-sm font-bold text-gray-400 mb-2">Level Logic (Runs every step)</h3>
                                <div className="flex-1 border border-gray-700">
                                    <CodeEditor
                                        files={{ 'logic.ts': globalModule }}
                                        activeFile="logic.ts"
                                        onChange={(val) => setGlobalModule(val || '')}
                                        sharedTypes={sharedTypes}
                                    />
                                </div>
                            </div>
                        }
                    />
                </div>

                {/* Right Sidebar: Properties */}
                <div className="w-64 bg-gray-900 p-4 rounded border border-gray-700 overflow-y-auto">
                    <h3 className="font-bold mb-4 text-gray-400 uppercase text-xs">Properties</h3>

                    {selectedItemId && (items.find(i => i.id === selectedItemId) || doors.find(d => d.id === selectedItemId) || pressurePlates.find(p => p.id === selectedItemId) || initialRobots.find(r => r.name === selectedItemId)) ? (
                        <div className="flex flex-col gap-4">
                            {(() => {
                                const item = items.find(i => i.id === selectedItemId);
                                const door = doors.find(d => d.id === selectedItemId);
                                const plate = pressurePlates.find(p => p.id === selectedItemId);
                                const robot = initialRobots.find(r => r.name === selectedItemId);

                                if (robot) {
                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-2 items-center text-cyan-500 font-bold border-b border-gray-700 pb-2">
                                                <span>🤖 Robot</span>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Name (Unique, Enter to save)</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    onBlur={() => {
                                                        const val = tempName.trim();
                                                        if (!val) {
                                                            setTempName(robot.name); // Revert
                                                            return;
                                                        }
                                                        if (val !== robot.name) {
                                                            // Check uniqueness?
                                                            if (initialRobots.some(r => r.name === val)) {
                                                                alert('Name already exists!');
                                                                setTempName(robot.name);
                                                                return;
                                                            }
                                                            setInitialRobots(prev => prev.map(r => r.name === robot.name ? { ...r, name: val } : r));
                                                            setSelectedItemId(val);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Direction</label>
                                                <select
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                                    value={robot.direction}
                                                    onChange={(e) => {
                                                        const val = e.target.value as any;
                                                        setInitialRobots(prev => prev.map(r => r.name === robot.name ? { ...r, direction: val } : r));
                                                    }}
                                                >
                                                    <option value="North">North</option>
                                                    <option value="East">East</option>
                                                    <option value="South">South</option>
                                                    <option value="West">West</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Color (Hex)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        className="w-8 h-8 rounded cursor-pointer bg-transparent"
                                                        value={robot.color || '#38bdf8'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setInitialRobots(prev => prev.map(r => r.name === robot.name ? { ...r, color: val } : r));
                                                        }}
                                                    />
                                                    <input
                                                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm font-mono text-white"
                                                        value={robot.color || '#38bdf8'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setInitialRobots(prev => prev.map(r => r.name === robot.name ? { ...r, color: val } : r));
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setInitialRobots(prev => prev.filter(r => r.name !== robot.name));
                                                    setSelectedItemId(null);
                                                }}
                                                className="bg-red-900 text-red-200 text-xs py-1 rounded hover:bg-red-800 mt-4"
                                            >
                                                Remove Robot
                                            </button>
                                        </div>
                                    );
                                }

                                if (door) {
                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-2 items-center text-yellow-500 font-bold border-b border-gray-700 pb-2">
                                                <span>🚪 Door</span>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">ID</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono"
                                                    value={door.id}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDoors(prev => prev.map(d => d.id === door.id ? { ...d, id: val } : d));
                                                        if (selectedItemId === door.id) setSelectedItemId(val);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Name</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                                    value={door.name || 'Door'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDoors(prev => prev.map(d => d.id === door.id ? { ...d, name: val } : d));
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">State</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDoors(prev => prev.map(d => d.id === door.id ? { ...d, isOpen: true } : d))}
                                                        className={`flex-1 px-2 py-1 rounded text-sm border ${door.isOpen ? 'bg-green-900 border-green-500 text-green-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                                    >
                                                        Open
                                                    </button>
                                                    <button
                                                        onClick={() => setDoors(prev => prev.map(d => d.id === door.id ? { ...d, isOpen: false } : d))}
                                                        className={`flex-1 px-2 py-1 rounded text-sm border ${!door.isOpen ? 'bg-red-900 border-red-500 text-red-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                                    >
                                                        Closed
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-700 pt-3 mt-1">
                                                <label className="text-xs text-gray-400 font-bold block mb-2">Lock Configuration</label>

                                                <div className="flex flex-col gap-2 mb-3">
                                                    <label className="text-xs text-gray-500">Lock Type</label>
                                                    <select
                                                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                                        value={door.lock?.type || 'none'}
                                                        onChange={(e) => {
                                                            const type = e.target.value;
                                                            setDoors(prev => prev.map(d => {
                                                                if (d.id !== door.id) return d;
                                                                if (type === 'none') {
                                                                    const { lock, ...rest } = d;
                                                                    return rest;
                                                                }
                                                                if (type === 'password') {
                                                                    return { ...d, lock: { type: 'password', value: '' } };
                                                                }
                                                                if (type === 'item') {
                                                                    return { ...d, lock: { type: 'item', itemIds: [] } };
                                                                }
                                                                return d;
                                                            }));
                                                        }}
                                                    >
                                                        <option value="none">None (Unlocked)</option>
                                                        <option value="password">Password</option>
                                                        <option value="item">Items</option>
                                                    </select>
                                                </div>

                                                {door.lock?.type === 'password' && (
                                                    <div>
                                                        <label className="text-xs text-gray-500">Password</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-yellow-300 font-mono"
                                                            placeholder="Enter password..."
                                                            value={door.lock.value}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setDoors(prev => prev.map(d => d.id === door.id ? { ...d, lock: { type: 'password', value: val } } : d));
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {door.lock?.type === 'item' && (
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-xs text-gray-500">Required Items</label>
                                                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-1">
                                                            {items.length === 0 && <span className="text-xs text-gray-600 p-1">No items in maze.</span>}
                                                            {items.map(i => {
                                                                const isSelected = (door.lock as any).itemIds.includes(i.id);
                                                                return (
                                                                    <label key={i.id} className="flex items-center gap-2 text-xs p-1 hover:bg-gray-800 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                const checked = e.target.checked;
                                                                                setDoors(prev => prev.map(d => {
                                                                                    if (d.id !== door.id || d.lock?.type !== 'item') return d;
                                                                                    const currentIds = d.lock.itemIds;
                                                                                    const newIds = checked
                                                                                        ? [...currentIds, i.id]
                                                                                        : currentIds.filter(id => id !== i.id);
                                                                                    return { ...d, lock: { ...d.lock, itemIds: newIds } };
                                                                                }));
                                                                            }}
                                                                            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0"
                                                                        />
                                                                        <span className="text-lg leading-none">{i.icon}</span>
                                                                        <span className="truncate">{i.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setDoors(prev => prev.filter(d => d.id !== door.id));
                                                    setSelectedItemId(null);
                                                }}
                                                className="bg-red-900 text-red-200 text-xs py-1 rounded hover:bg-red-800 mt-4"
                                            >
                                                Delete Door
                                            </button>
                                        </div>
                                    );
                                }

                                if (item) {
                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-xs text-gray-400">ID</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono"
                                                    value={item.id}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, id: val } : i));
                                                        if (selectedItemId === item.id) setSelectedItemId(val);
                                                    }}
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
                                                    <label className="text-xs text-gray-400">Tags</label>
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {item.tags.map((tag, idx) => (
                                                            <span key={idx} className="bg-gray-800 text-xs px-2 py-1 rounded flex items-center gap-1 border border-gray-700">
                                                                {tag}
                                                                <button
                                                                    onClick={() => {
                                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, tags: i.tags.filter((_, tIdx) => tIdx !== idx) } : i));
                                                                    }}
                                                                    className="text-gray-500 hover:text-red-400"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <input
                                                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                                                            placeholder="Add tag..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = e.currentTarget.value.trim();
                                                                    if (val && !item.tags.includes(val)) {
                                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, tags: [...i.tags, val] } : i));
                                                                        e.currentTarget.value = '';
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <label className="text-xs text-gray-400">Image URL (Overrides Icon)</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-blue-300"
                                                    placeholder="https://..."
                                                    value={item.imageUrl || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, imageUrl: val } : i));
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-2">
                                                <label className="text-xs text-gray-400 flex justify-between">
                                                    <span>Value (JSON)</span>
                                                    {(() => {
                                                        if (!item.value) return null;
                                                        try {
                                                            JSON.parse(typeof item.value === 'string' ? item.value : JSON.stringify(item.value));
                                                            return <span className="text-green-500">Valid JSON</span>;
                                                        } catch (e) {
                                                            return <span className="text-red-500">Invalid JSON</span>;
                                                        }
                                                    })()}
                                                </label>
                                                <textarea
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-blue-300 font-mono resize-y min-h-[80px]"
                                                    placeholder='{"key": "value"}'
                                                    value={typeof item.value === 'string' ? item.value : (item.value ? JSON.stringify(item.value, null, 2) : '')}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setItems(prev => prev.map(i => i.id === item.id ? { ...i, value: val } : i));
                                                    }}
                                                    onBlur={e => {
                                                        const val = e.target.value;
                                                        if (!val.trim()) {
                                                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, value: undefined } : i));
                                                            return;
                                                        }
                                                        try {
                                                            const parsed = JSON.parse(val);
                                                            // Store as parsed object to match what we expect in the engine if needed, 
                                                            // or just keep as string. Let's keep as parsed object if it's valid JSON,
                                                            // otherwise keep as string so they don't lose data while typing.
                                                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, value: parsed } : i));
                                                        } catch (err) {
                                                            // Invalid JSON, leave as string representation
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="border-t border-gray-700 pt-3 mt-1 mb-3">
                                                {/* Removed Damage Properties */}
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

                                            <div className="border-t border-gray-700 pt-3 mt-1">
                                                <label className="text-xs text-gray-400 font-bold block mb-2">Visibility</label>
                                                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0"
                                                        checked={item.isRevealed !== false}
                                                        onChange={(e) => {
                                                            const isRevealed = e.target.checked;
                                                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, isRevealed } : i));
                                                        }}
                                                    />
                                                    Revealed from start?
                                                </label>
                                            </div>

                                        </div>
                                    );
                                }

                                if (plate) {
                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-2 items-center text-green-500 font-bold border-b border-gray-700 pb-2">
                                                <span>🔳 Pressure Plate</span>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">ID</label>
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono"
                                                    value={plate.id}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setPressurePlates(prev => prev.map(p => p.id === plate.id ? { ...p, id: val } : p));
                                                        if (selectedItemId === plate.id) setSelectedItemId(val);
                                                    }}
                                                />
                                            </div>

                                            <div className="bg-gray-800 p-2 rounded text-xs text-gray-400">
                                                <p>Pressure plates trigger 'activate' and 'deactivate' events.</p>
                                                <p className="mt-1">Connect to doors via ID in code or global module.</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setPressurePlates(prev => prev.filter(p => p.id !== plate.id));
                                                    setSelectedItemId(null);
                                                }}
                                                className="bg-red-900 text-red-200 text-xs py-1 rounded hover:bg-red-800 mt-4"
                                            >
                                                Delete Plate
                                            </button>
                                        </div>
                                    );
                                }
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
