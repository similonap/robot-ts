const fs = require('fs');
const path = require('path');

const mazesDir = path.join(__dirname, 'mazes');

function traverseDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (file === 'maze.json') {
            processMazeFile(fullPath);
        }
    });
}

function processMazeFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const maze = JSON.parse(data);

        let changed = false;

        if (maze.items) {
            maze.items.forEach(item => {
                if (item.type === 'item') {
                    item.kind = 'item';
                    delete item.type;
                    changed = true;
                }
                if (item.tags) {
                    item.type = item.tags.length > 0 ? item.tags[0] : '';
                    delete item.tags;
                    changed = true;
                }
            });
        }

        if (maze.doors) {
            maze.doors.forEach(door => {
                if (door.type === 'door') {
                    door.kind = 'door';
                    delete door.type;
                    changed = true;
                }
            });
        }

        if (maze.pressurePlates) {
            maze.pressurePlates.forEach(plate => {
                if (plate.type === 'pressure_plate') {
                    plate.kind = 'pressure_plate';
                    delete plate.type;
                    changed = true;
                }
            });
        }

        if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(maze, null, 2), 'utf8');
            console.log(`Updated ${filePath}`);
        }

    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

console.log('Starting migration...');
traverseDir(mazesDir);
console.log('Migration complete.');
