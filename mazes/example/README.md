# Example Maze Challenge

Welcome to the **Example Maze**!

## Your Mission
Your goal is to collect the apple in the end of the maze.

### Instructions
1.  Analyze the walls around you.
2.  Use the `robot` API to move.
3.  Avoid hitting walls!
4.  Collect the apple.

### Hints

```ts
await robot.moveForward();
```

This will move the robot forward by one step.

```ts
await robot.pickup();
```

want to speed things up?

```ts
robot.setSpeed(100)
```

This will collect the apple if the robot is standing on it.

