import { game } from "circuit-crawler";

interface PasswordResponse {
    value: string,
    type: string
}

async function main() {
    const robot = game.getRobot("Robot 1");
    if (!robot) return;

    let item = await robot.scan();

    if (item && item.type === "item") {
        let computer = item;
        let response = await fetch(computer.url);
        let json: PasswordResponse = await response.json();

        console.log(json);

    }
}