import { game, Robot } from "circuit-crawler";
import readline from "readline-sync";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

type Direction = 'North' | 'South' | 'East' | 'West';

interface Note extends Item {
    play: (sharp: boolean) => Promise<void>;
}

interface CD extends Item {
    instrument: string;
    melody: MelodyNote[];
}

function isNote(item: any): item is Note {
    return item && item.type === "item" && item.category === "Note";
}

function isCD(item: any): item is CD {
    return item && item.type === "item" && item.category === "CD";
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

async function playMelodyNote(robot: any, noteId: string, sharp: boolean, instrument: string) {
    const item = game.getItem(`item-${noteId}`);
    if (!item || !item.position) return;

    await moveToColumn(robot, item.position.x);
    await faceDirection(robot, noteId.endsWith('4') ? 'North' : 'South');

    const scanned = await robot.scan();
    if (scanned && scanned.play) {
        await scanned.play(sharp, instrument);
    }
}

async function playSong(instrument: string, melody: MelodyNote[]) {
    const musician = game.getRobot("Musician");
    if (!musician) return;
    musician.setSpeed(10);
    for (const entry of melody) {
        if (entry === null) {
            await sleep(250);
        } else {
            const [noteId, sharp, beatMs] = entry;
            const start = Date.now();
            await playMelodyNote(musician, noteId, sharp, instrument);
            const elapsed = Date.now() - start;
            // Sleep only the remaining beat time — keeps a steady cadence
            await sleep(Math.max(0, beatMs - elapsed));
        }
    }
    await faceDirection(musician, 'West');
    await moveToColumn(musician, 1);
    await faceDirection(musician, 'North');

}

async function moveToCD(robot: Robot, cd: number) {
    for (let i = robot.position.x; i < cd; i++) {
        let canMoveForward: boolean = await robot.canMoveForward();
        if (canMoveForward) {
            await robot.moveForward();
        } else {
            await robot.turnLeft();
            await robot.turnLeft();
            await robot.moveForward();
        }
    }

    await robot.turnLeft();
}


async function main() {
    const robot = game.getRobot("Robot");
    if (!robot) return;

    robot.setSpeed(10);

    let maxRange: number = await robot.echo();

    let cd: number = -1;
    do {
        cd = readline.questionInt("What CD do you want to play? ");

        await moveToCD(robot, cd);

        let item = await robot.scan();
        if (isCD(item)) {
            await playSong(item.instrument, item.melody);
        }

        await moveToColumn(robot, 1);

        await faceDirection(robot, 'East');

    } while (cd !== -1);

}