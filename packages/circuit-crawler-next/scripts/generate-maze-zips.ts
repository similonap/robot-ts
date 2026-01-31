import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const MAZES_DIR = path.join(process.cwd(), 'mazes');
const PUBLIC_MAZES_DIR = path.join(process.cwd(), 'public', 'challenges');

async function generateMazeZips() {
    if (!fs.existsSync(PUBLIC_MAZES_DIR)) {
        fs.mkdirSync(PUBLIC_MAZES_DIR, { recursive: true });
    }

    const mazeDirs = fs.readdirSync(MAZES_DIR).filter(file => {
        return fs.statSync(path.join(MAZES_DIR, file)).isDirectory();
    });

    for (const mazeDirName of mazeDirs) {
        const mazePath = path.join(MAZES_DIR, mazeDirName);
        const zip = new JSZip();

        console.log(`Generating zip for ${mazeDirName}...`);

        addDirectoryToZip(zip, mazePath, '');

        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        const zipFilePath = path.join(PUBLIC_MAZES_DIR, `${mazeDirName}.zip`);
        fs.writeFileSync(zipFilePath, zipContent);
        console.log(`Saved ${zipFilePath}`);
    }
}

function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const relativeZipPath = path.join(zipPath, file);

        if (file === 'solution' || file === 'node_modules' || file === '.DS_Store') {
            continue;
        }

        if (stats.isDirectory()) {
            const folder = zip.folder(file);
            if (folder) {
                addDirectoryToZip(folder, filePath, '');
            }
        } else {
            const content = fs.readFileSync(filePath);
            zip.file(file, content);
        }
    }
}

generateMazeZips().catch(console.error);
