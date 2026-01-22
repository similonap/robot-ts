import { game } from "robot-maze";

async function runRobot(robotName: string) {
    const robot = game.getRobot(robotName);
    while (true) {
        // STRATEGY: RIGHT-HAND RULE

        // 1. Commit to the strategy: Turn Right to face the "ideal" path.
        await robot.turnRight();

        // 2. Scan for an opening. 
        // Logic: Is Right blocked? If yes, Turn Left (to face Forward). 
        // Is Forward blocked? If yes, Turn Left (to face Left).
        // Is Left blocked? If yes, Turn Left (to face Back).
        while (!(await robot.canMoveForward())) {
            await robot.turnLeft();
        }

        // 3. We found an open path (either Right, Forward, Left, or Back). Move!
        await robot.moveForward();
    }
}

async function main() {
    runRobot("Robot 1");
    runRobot("Robot 2");
}