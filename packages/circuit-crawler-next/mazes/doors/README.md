# Doors Challenge

Welcome to the **Doors Maze**!

## Your Mission
Your goal is to open all doors in the maze and collect the gem.

### Instructions

- Use the `robot` API to move.
- Avoid hitting walls!
- Open doors.
- Collect the gem.

### Hints

- Some doors need to be opened with a password or a specific item.
- Methods you can use:

```ts
import readline from "readline-sync";

// Movement
await robot.moveForward();
await robot.turnLeft();
await robot.turnRight();

// Interaction
const result = await robot.openDoor(); // Try to open without anything
await robot.openDoor("password");      // Open with password
await robot.openDoor(item);            // Open with an item
await robot.pickup();                  // Pick up items (like keys)
const item = robot.inventory[0];       // Access inventory items (0 is the first item)

// Input
const password = readline.question("Enter password: ");
```

- Use loops and custom functions as much as possible to avoid code duplication.
- If you can't open the door you can see what kind of authentication is required by checking the `requiredAuth` property of the `openDoor` result.

Be sure you're standing in front of the door you want to open. 

