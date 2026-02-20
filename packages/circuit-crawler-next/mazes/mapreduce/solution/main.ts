import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

interface ItemValue {
    value: string;
    valid: boolean;
    order: number;
}

async function moveAndPickup(steps: number) {
    for (let i = 0; i < steps; i++) {
        await robot.moveForward();
        await robot.pickup();
    }
}

async function main() {
    robot.setSpeed(20);
    await moveAndPickup(9);
    await robot.turnLeft();
    await moveAndPickup(8);
    await robot.turnLeft();
    await moveAndPickup(8);
    await robot.turnLeft();
    await moveAndPickup(8);

    let password: string = robot.inventory
        .map((v): ItemValue => v.value)
        .sort((a, b) => a.order - b.order)
        .filter((v) => v.valid)
        .map(v => v.value)
        .map(atob)
        .reduce((prev, curr) => prev + curr)

    console.log(password);

    await robot.turnLeft();
    await moveAndPickup(6);
    await robot.turnLeft();
    await moveAndPickup(4);

    await robot.turnLeft();
    await robot.openDoor(password);

    await moveAndPickup(2);


}