import { game } from "circuit-crawler";
import passwordsJson from "./passwords.json";

interface Password {
    name: string;
    expired: boolean;
    password: string;
}

async function move(n: number) {
    const robot = game.getRobot("robot");
    if (!robot) return;
    for (let i: number = 0; i < n; i++) {
        await robot.moveForward();
    }
}

async function main() {
    const passwords: Password[] = passwordsJson;
    const robot = game.getRobot("robot");
    if (!robot) return;

    const nonExpiredPasswords: Password[] = passwords.filter(password => !password.expired);

    let running: boolean = true;
    do {
        await move(2);
        let scannedObject = await robot.scan();
        if (scannedObject && scannedObject.kind === "door") {
            let door = scannedObject;
            let password: string = nonExpiredPasswords.find(password => password.name === door.name)?.password || '';
            await robot.openDoor(password);
            await robot.moveForward();
            running = true;
        } else {
            running = false;
        }
    } while (running)
    await move(1);
    await robot.pickup();
}



