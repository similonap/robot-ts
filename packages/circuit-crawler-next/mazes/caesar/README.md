# Caesar Cipher Challenge

Welcome to the **Caesar Cipher Challenge**! In this mission, your robot's navigation system has been encrypted. You need to decode the commands to get the robot to the target.

## Your Mission

Your goal is to write a function that decrypts a list of commands encrypted with a **ROT13** cipher (a Caesar cipher with a shift of 13) and executes them. The robot must collect the gem to win.

**How to win?**

- Decrypt the provided list of commands using ROT13.
- Execute the decrypted commands to navigate the robot to the gem.
- `PICKUP` the gem.

### Instructions

1.  **Analyze the Encrypted Commands**: You are given an array of strings like `"SBEJNEQ"`, `"YRSG"`, etc.
2.  **Implement ROT13**: Create a function that shifts each letter in a string by 13 positions in the alphabet.
    -   `A` becomes `N`, `B` becomes `O`, ..., `N` becomes `A`.
    -   The cipher wraps around: `Z` is followed by `A`.
3.  **Translate and Execute**: Loop through the encrypted commands, translate them, and pass the result to `await robot.executePath(translatedCommands)`.
4.  **Pickup**: After executing the commands, collect the gem with `await robot.pickup()`.  

### Example

- `"SBEJNEQ"` -> `"FORWARD"`
- `"YRSG"` -> `"LEFT"`
- `"EVTUG"` -> `"RIGHT"`

## Hints

### What is ROT13?

ROT13 ("rotate by 13 places") is a simple letter substitution cipher that replaces a letter with the 13th letter after it in the alphabet. Because the basic Latin alphabet has 26 letters, applying ROT13 twice restores the original text.

### Character Codes

You can use ASCII character codes to help with the shift.
- `String.fromCharCode(code)` creates a character from a code.
- `'A'.charCodeAt(0)` gives you the code for 'A' (65).

### The Modulo Operator (%)

The modulo operator is very useful for wrapping around the alphabet.
`index = (index + 13) % 26`

### Suggested Implementation

```ts
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function translate(command: string) {
    // Your implementation here
}
```
