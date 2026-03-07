import { game } from "circuit-crawler";
import readline from "readline-sync";

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

    // ==========================================
    // SONGS LIBRARY
    // ==========================================

    // 1. Super Mario Bros — Overworld Theme
    const m_e = 150, m_q = 300, m_dq = 450, m_h = 600, m_t = 100;
    const mario: MelodyNote[] = [
        ['E5', false, m_e], ['E5', false, m_q], ['E5', false, m_q], ['C5', false, m_e], ['E5', false, m_q], ['G5', false, m_h], ['G4', false, m_h],
        ['C5', false, m_dq], ['G4', false, m_dq], ['E4', false, m_dq], ['A4', false, m_q], ['B4', false, m_q], ['A4', true, m_e], ['A4', false, m_q],
        ['G4', false, m_t], ['E5', false, m_t], ['G5', false, m_t], ['A5', false, m_q], ['F5', false, m_e], ['G5', false, m_q], ['E5', false, m_q], ['C5', false, m_e], ['D5', false, m_e], ['B4', false, m_dq],
    ];

    // 2. Tetris (Korobeiniki)
    // Famous Russian folk song! Note the harmonic G# in the minor scale
    const t_e = 200, t_q = 400, t_dq = 600, t_h = 800;
    const tetris: MelodyNote[] = [
        ['E5', false, t_q], ['B4', false, t_e], ['C5', false, t_e], ['D5', false, t_q], ['C5', false, t_e], ['B4', false, t_e],
        ['A4', false, t_q], ['A4', false, t_e], ['C5', false, t_e], ['E5', false, t_q], ['D5', false, t_e], ['C5', false, t_e],
        ['G4', true, t_dq], ['C5', false, t_e], ['D5', false, t_q], ['E5', false, t_q],
        ['C5', false, t_q], ['A4', false, t_q], ['A4', false, t_h], null,

        ['D5', false, t_dq], ['F5', false, t_e], ['A5', false, t_q], ['G5', false, t_e], ['F5', false, t_e],
        ['E5', false, t_dq], ['C5', false, t_e], ['E5', false, t_q], ['D5', false, t_e], ['C5', false, t_e],
        ['G4', true, t_q], ['G4', true, t_e], ['C5', false, t_e], ['D5', false, t_q], ['E5', false, t_q],
        ['C5', false, t_q], ['A4', false, t_q], ['A4', false, t_h], null
    ];

    // 3. Megalovania (Undertale)
    // Transposed to C# minor to completely fit the robot's 2-octave range
    const s_s = 120, s_e = 240;
    const megaRiff: MelodyNote[] = [
        ['E5', false, s_e], ['B4', false, s_e + s_s], null,
        ['A4', true, s_e], ['A4', false, s_e], ['G4', false, s_e], ['E4', false, s_s], ['G4', false, s_s], ['A4', false, s_e]
    ];
    const megalovania: MelodyNote[] = [
        ['E4', false, s_s], ['E4', false, s_s], ...megaRiff,
        ['D4', false, s_s], ['D4', false, s_s], ...megaRiff,
        ['C4', true, s_s], ['C4', true, s_s], ...megaRiff,
        ['C4', false, s_s], ['C4', false, s_s], ...megaRiff,
    ];

    // 4. Ode to Joy (Beethoven)
    const o_q = 400, o_dq = 600, o_e = 200, o_h = 800;
    const odeToJoy: MelodyNote[] = [
        ['E5', false, o_q], ['E5', false, o_q], ['F5', false, o_q], ['G5', false, o_q],
        ['G5', false, o_q], ['F5', false, o_q], ['E5', false, o_q], ['D5', false, o_q],
        ['C5', false, o_q], ['C5', false, o_q], ['D5', false, o_q], ['E5', false, o_q],
        ['E5', false, o_dq], ['D5', false, o_e], ['D5', false, o_h],
    ];

    // ==========================================
    // Interactive Song Selection
    // ==========================================
    const songNames = [
        "Super Mario Bros — Overworld Theme",
        "Tetris (Korobeiniki)",
        "Megalovania (Undertale)",
        "Ode To Joy (Beethoven)"
    ];
    const songMelodies = [mario, tetris, megalovania, odeToJoy];

    const selectedIndex = await readline.keyInSelect(songNames, "Which song should the robot play?");

    if (selectedIndex === -1) {
        console.log("No song selected. Stopping the robot.");
        return;
    }

    const melody: MelodyNote[] = songMelodies[selectedIndex];
    console.log(`Now playing: ${songNames[selectedIndex]}`);

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