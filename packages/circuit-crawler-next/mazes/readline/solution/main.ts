import { game } from "circuit-crawler";
import readline from "readline-sync";

async function main() {
    // 1. Get Robot Name
    const robotName: string = readline.question("Enter robot name: ");

    // 2. Get Robot X (Inline Logic)
    let robotX: number = -1;
    let xValid: boolean = false;
    do {
        robotX = readline.questionInt("Enter robot X: ");
        if (robotX >= 0 && robotX < 14) {
            xValid = true;
        } else {
            console.log("Invalid input. Please try again.");
        }
    } while (!xValid);

    // 3. Get Robot Y (Inline Logic)
    let robotY: number = -1;
    let yValid: boolean = false;
    do {
        robotY = readline.questionInt("Enter robot Y: ");
        if (robotY >= 0 && robotY < 14) {
            yValid = true;
        } else {
            console.log("Invalid input. Please try again.");
        }
    } while (!yValid);

    // 4. Get Robot Color (Inline Logic including Hex validation)
    let robotColor: string = "";
    let colorValid: boolean = false;
    const validHexChars: string = "0123456789abcdefABCDEF";

    do {
        robotColor = readline.question("Enter robot color (#RRGGBB): ");

        // Reset check for this iteration
        let currentStringIsValid = true;

        // Check 1: Start with # and length
        if (!robotColor.startsWith("#") || robotColor.length !== 7) {
            currentStringIsValid = false;
        } else {
            // Check 2: Validate individual characters
            for (let i = 1; i < 7; i++) {
                if (!validHexChars.includes(robotColor[i])) {
                    currentStringIsValid = false;
                    break;
                }
            }
        }

        if (currentStringIsValid) {
            colorValid = true;
        } else {
            console.log("Invalid input. Please try again.");
        }
    } while (!colorValid);

    // 5. Create Robot
    game.createRobot({
        name: robotName,
        x: robotX,
        y: robotY,
        color: robotColor,
    });
}