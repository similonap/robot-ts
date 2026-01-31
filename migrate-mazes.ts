
import fs from 'fs';
import path from 'path';

const mazesDir = path.join(process.cwd(), 'packages/circuit-crawler-next/mazes');

if (!fs.existsSync(mazesDir)) {
    console.error(`Mazes directory not found at ${mazesDir}`);
    process.exit(1);
}

const entries = fs.readdirSync(mazesDir, { withFileTypes: true });

entries.forEach(entry => {
    if (entry.isDirectory()) {
        const mazePath = path.join(mazesDir, entry.name, 'maze.json');
        if (fs.existsSync(mazePath)) {
            try {
                const mazeContent = fs.readFileSync(mazePath, 'utf-8');
                const mazeJson = JSON.parse(mazeContent);

                if (mazeJson.globalModule) {
                    const globalModuleContent = mazeJson.globalModule;
                    const globalModulePath = path.join(mazesDir, entry.name, 'globalModule.ts');

                    console.log(`Migrating ${entry.name}...`);

                    // Write globalModule.ts
                    fs.writeFileSync(globalModulePath, globalModuleContent);
                    console.log(`  Created globalModule.ts`);

                    // Remove globalModule from maze.json
                    delete mazeJson.globalModule;
                    fs.writeFileSync(mazePath, JSON.stringify(mazeJson, null, 2));
                    console.log(`  Updated maze.json`);
                } else {
                    console.log(`Skipping ${entry.name} (no globalModule)`);
                }
            } catch (e) {
                console.error(`Error processing ${entry.name}:`, e);
            }
        }
    }
});

console.log('Migration complete.');
