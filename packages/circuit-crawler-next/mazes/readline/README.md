# Robot Configuration Wizard

Welcome to the **Robot Configuration Wizard**! In this challenge, you will build an interactive command-line interface (CLI) to configure and spawn a robot into the maze.

## Your Mission

Your goal is to write a program that asks the user for specific details about a robot (name, position, and color) and then creates that robot in the game. You must ensure the user enters valid information!

**how to win?** 

Create a robot named `Robot` at position `7, 7` with color `#ff0000`.

### Instructions

1.  **Ask for the Robot's Name**: It can be any string.
2.  **Ask for the X Coordinate**: It must be an integer between `0` and `13` (inclusive).
    *   If the input is invalid, keep asking until it is valid.
3.  **Ask for the Y Coordinate**: It must be an integer between `0` and `13` (inclusive).
    *   If the input is invalid, keep asking until it is valid.
4.  **Ask for the Robot's Color**: It must be a valid hex code (e.g., `#ff0000`).
    *   It must start with a `#`.
    *   It must be exactly 7 characters long.
    *   It must only contain valid hexadecimal characters (`0-9`, `a-f`, `A-F`).
    *   If the input is invalid, keep asking until it is valid.
5.  **Create the Robot**: Once you have all the valid inputs, use `game.createRobot()` to spawn the robot at the specified location with the given name and color.

### Example interaction

```bash
Enter robot name: Robot
Enter robot X: 7
Enter robot Y: 7
Enter robot color: #ff0000
```

To win this game you need to create a robot named `Robot` at position `7, 7` and color `#ff0000`.

## Hints

### Importing Readline

You will need the `readline-sync` library to get input from the user.

```ts
import readline from "readline-sync";
```

### getting User Input

*   Use `readline.question("Prompt text: ")` to get a string.
*   Use `readline.questionInt("Prompt text: ")` to get an integer.

### Input Validation

To ensure the user enters valid data, you can use a `do...while` loop.

```ts
let value: number = 0;
let isValid: boolean = false;

do {
    value = readline.questionInt("Enter a number: ");
    
    // Check if the value is valid
    if (/* condition */) {
        isValid = true;
    } else {
        console.log("Invalid input. Try again.");
    }
} while (!isValid);
```

### Validating Colors

A helper string can make checking for valid hex characters easier.

```ts
const validHexChars : string = "0123456789abcdefABCDEF";
// You can check if a character exists in this string using .includes()
```

Don't forget to check if the string starts with `#` using `.startsWith("#")` and check the length using `.length`.

### Creating the Robot

Finally, pass your collected variables to the game:

```ts
game.createRobot({
    name: robotName,
    x: robotX,
    y: robotY,
    color: robotColor,
});
```

### Suggested extra challenges

- Use functions to validate the input
- Ask the user if he wants to create another robot and create them in a loop