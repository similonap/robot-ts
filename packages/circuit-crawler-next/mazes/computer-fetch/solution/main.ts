import { game } from "circuit-crawler";

interface PasswordResponse {
    value: string,
    type: string
}

async function main() {
    const robot = game.getRobot("Robot 1");

    let item = await robot.scan();

    if (item.type === "item") {
        let computer: Item = item;
        let response = await fetch(computer.value);
        let json: PasswordResponse = await response.json();

        console.log(json);

    }
}