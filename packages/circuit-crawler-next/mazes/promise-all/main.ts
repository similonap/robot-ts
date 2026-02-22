import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

interface Url {
    url: string;
}

interface Storage extends Item {
    category: "storage"
    urls: Url[]
}

async function move(steps: number) {
    for (let i = 0; i < steps; i++)
        await robot.moveForward()
}

async function main() {

}