"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const CircuitCrawlerEngine_1 = require("../src/game/CircuitCrawlerEngine");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: npx tsx scripts/cli.ts <maze_dir>");
        process.exit(1);
    }
    const mazeDir = path.resolve(args[0]);
    const mazeJsonPath = path.join(mazeDir, 'maze.json');
    if (!fs.existsSync(mazeJsonPath)) {
        console.error(`Maze not found at ${mazeJsonPath}`);
        process.exit(1);
    }
    const mazeConfig = JSON.parse(fs.readFileSync(mazeJsonPath, 'utf-8'));
    // Load all .ts files in the directory as the "code"
    const files = {};
    const dirFiles = fs.readdirSync(mazeDir);
    for (const file of dirFiles) {
        if (file.endsWith('.ts')) {
            files[file] = fs.readFileSync(path.join(mazeDir, file), 'utf-8');
        }
    }
    if (!files['main.ts']) {
        console.error("No main.ts found in maze directory.");
        process.exit(1);
    }
    console.log(`Loading maze: ${mazeConfig.title || 'Untitled'}`);
    const engine = new CircuitCrawlerEngine_1.CircuitCrawlerEngine({
        maze: mazeConfig,
        onLog: (msg, type) => {
            if (type === 'robot') {
                console.log(`🤖 ${msg}`);
            }
            else {
                console.log(`[SYS] ${msg}`);
            }
        },
        onCompletion: (success, msg) => {
            if (success)
                console.log(`\n✅ SUCCESS: ${msg}`);
            else
                console.log(`\n❌ FAILED: ${msg}`);
            process.exit(success ? 0 : 1);
        },
        onStateChange: () => {
            // Optional: Render grid to console?
        }
    });
    try {
        await engine.run(files);
    }
    catch (e) {
        console.error("Unhandle CLI Error:", e);
    }
}
main();
