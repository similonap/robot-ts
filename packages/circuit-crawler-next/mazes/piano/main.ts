import { game } from "circuit-crawler";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

type Direction = 'North' | 'South' | 'East' | 'West';

interface Note extends Item {
    play: (sharp: boolean) => Promise<void>;
}

function isNote(item: any): item is Note {
    return item.type === "item" && item.category === "Note";
}

async function faceDirection(robot: Robot, target: Direction) {
    const order: Direction[] = ['North', 'East', 'South', 'West'];
    const current = order.indexOf(robot.direction);
    const desired = order.indexOf(target);
    const diff = (desired - current + 4) % 4;

    if (diff === 1) await robot.turnRight();
    else if (diff === 2) { await robot.turnRight(); await robot.turnRight(); }
    else if (diff === 3) await robot.turnLeft();
}

async function moveToColumn(robot: Robot, targetX: number) {
    const dx = targetX - robot.position.x;
    if (dx === 0) return;
    await faceDirection(robot, dx > 0 ? 'East' : 'West');
    for (let i = 0; i < Math.abs(dx); i++) await robot.moveForward();
}

// Each entry: [noteId, sharp?, durationMs] or null for rest
type MelodyNote = [string, boolean, number] | null;

async function playMelodyNote(robot: any, noteId: string, sharp: boolean) {
    const item = game.getItem(`item-${noteId}`);
    if (!item || !item.position) return;

    await moveToColumn(robot, item.position.x);
    await faceDirection(robot, noteId.endsWith('4') ? 'North' : 'South');

    const scanned = await robot.scan();
    if (scanned && scanned.play) {
        await scanned.play(sharp);
    }
}

async function main() {
    const robot = game.getRobot("Robot");
    if (!robot) return;

    robot.setSpeed(10);

    // Tempo constants (ms)
    const e = 150;   // eighth note
    const q = 300;   // quarter note
    const dq = 450;  // dotted quarter
    const h = 600;   // half note
    const t = 100;   // triplet eighth

    // Super Mario Bros — Full Overworld Theme
    // [note, sharp?, duration]  |  null = rest
    const melody: MelodyNote[] = [

        // ===== INTRO =====
        ['E5', false, e], ['E5', false, q], ['E5', false, q],
        ['C5', false, e], ['E5', false, q],
        ['G5', false, h],
        ['G4', false, h],

        // ===== PART A (first pass) =====
        ['C5', false, dq], ['G4', false, dq], ['E4', false, dq],
        ['A4', false, q], ['B4', false, q],
        ['A4', true, e], ['A4', false, q],           // Bb → A#
        ['G4', false, t], ['E5', false, t], ['G5', false, t],
        ['A5', false, q], ['F5', false, e], ['G5', false, q],
        ['E5', false, q], ['C5', false, e], ['D5', false, e], ['B4', false, dq],

        // ===== PART A (second pass) =====
        ['C5', false, dq], ['G4', false, dq], ['E4', false, dq],
        ['A4', false, q], ['B4', false, q],
        ['A4', true, e], ['A4', false, q],
        ['G4', false, t], ['E5', false, t], ['G5', false, t],
        ['A5', false, q], ['F5', false, e], ['G5', false, q],
        ['E5', false, q], ['C5', false, e], ['D5', false, e], ['B4', false, dq],

        // ===== PART B: Bridge (phrase 1) =====
        null,
        ['G5', false, e], ['F5', true, e], ['F5', false, e], ['D5', true, q],  // F#5, D#5
        ['E5', false, q],
        ['G4', true, e], ['A4', false, e], ['C5', false, q],                   // G#4
        ['A4', false, e], ['C5', false, e], ['D5', false, q],

        // ===== PART B: Bridge (phrase 2) =====
        null,
        ['G5', false, e], ['F5', true, e], ['F5', false, e], ['D5', true, q],
        ['E5', false, q],
        ['C5', false, e], ['C5', false, e], ['C5', false, h],
        null,

        // ===== PART B: Bridge (phrase 3) =====
        null,
        ['G5', false, e], ['F5', true, e], ['F5', false, e], ['D5', true, q],
        ['E5', false, q],
        ['G4', true, e], ['A4', false, e], ['C5', false, q],
        ['A4', false, e], ['C5', false, e], ['D5', false, q],

        // ===== PART B: Resolution =====
        null,
        ['D5', true, dq], ['D5', false, dq], ['C5', false, h],
        null,

        // ===== PART A (third pass — da capo) =====
        ['C5', false, dq], ['G4', false, dq], ['E4', false, dq],
        ['A4', false, q], ['B4', false, q],
        ['A4', true, e], ['A4', false, q],
        ['G4', false, t], ['E5', false, t], ['G5', false, t],
        ['A5', false, q], ['F5', false, e], ['G5', false, q],
        ['E5', false, q], ['C5', false, e], ['D5', false, e], ['B4', false, dq],

        // ===== PART A (fourth pass) =====
        ['C5', false, dq], ['G4', false, dq], ['E4', false, dq],
        ['A4', false, q], ['B4', false, q],
        ['A4', true, e], ['A4', false, q],
        ['G4', false, t], ['E5', false, t], ['G5', false, t],
        ['A5', false, q], ['F5', false, e], ['G5', false, q],
        ['E5', false, q], ['C5', false, e], ['D5', false, e], ['B4', false, dq],
    ];

    for (const entry of melody) {
        if (entry === null) {
            await sleep(250);
        } else {
            const [noteId, sharp, beatMs] = entry;
            const start = Date.now();
            await playMelodyNote(robot, noteId, sharp);
            const elapsed = Date.now() - start;
            // Sleep only the remaining beat time — keeps a steady cadence
            await sleep(Math.max(0, beatMs - elapsed));
        }
    }
}