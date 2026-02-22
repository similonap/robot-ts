const fs = require('fs');
const path = require('path');

const mazesDir = path.join(__dirname, '..', 'circuit-crawler-next', 'mazes');

function updateMazeFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let modified = false;

    if (data.items) {
        data.items.forEach(item => {
            if (item.kind !== undefined) {
                item.type = item.kind;
                delete item.kind;
                modified = true;
            }
            if (item.type !== undefined && item.type !== 'item' && item.type !== 'door' && item.type !== 'pressure_plate' && item.type !== 'wall') {
                // If it's the old 'type' (the user defined class), we need to rename it to 'category'
                // Wait, if we just renamed 'kind' to 'type', item.type is now 'item'. 
                // We should rename the *old* 'type' to 'category' first!
            }
        });
    }

    // Let's do it safer:
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (file === 'maze.json') {
            const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            let modified = false;

            if (data.items) {
                data.items.forEach(item => {
                    if (item.type && !item.category && item.type !== 'item') {
                        item.category = item.type;
                        delete item.type;
                        modified = true;
                    }
                    if (item.kind) {
                        item.type = item.kind;
                        delete item.kind;
                        modified = true;
                    }
                });
            }

            if (data.doors) {
                data.doors.forEach(door => {
                    if (door.kind) {
                        door.type = door.kind;
                        delete door.kind;
                        modified = true;
                    } // Door doesn't have former `type` as item class
                });
            }

            if (data.pressurePlates) {
                data.pressurePlates.forEach(plate => {
                    if (plate.kind) {
                        plate.type = plate.kind;
                        delete plate.kind;
                        modified = true;
                    }
                });
            }

            if (data.walls) {
                // walls is just a boolean[][], but if it were objects we'd update them
            }

            if (modified) {
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                console.log('Updated:', fullPath);
            }
        }
    }
}

processDirectory(mazesDir);
console.log('Done updating mazes.');
