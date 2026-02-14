# Drop Item Challenge

Welcome to the **Drop Item Maze**!

## Your Mission

Your goal is to collect the **Gem** hidden behind the locked door. The door is controlled by a **Pressure Plate**, but you can't be in two places at once!

### Instructions

1.  **Analyze the Map**: Locate the **Pressure Plate**, the **Door**, and any movable **Items** (like the Apple).
2.  **Pick Up**: Pilot your robot to the Apple and pick it up using `robot.pickup()`.
3.  **Activate Plate**: Move to the Pressure Plate.
4.  **Drop Item**: Use `robot.drop(item)` to leave the Apple on the pressure plate. The weight of the item will keep the plate pressed!
5.  **Enter**: Now that the door is held open by the item, move your robot through the door.
6.  **Win**: Collect the Gem to complete the level.

### Hints

- You can pick up items when you are on top of them:
  ```ts
  const item = await robot.pickup();
  ```
- You can drop an item you are carrying at your current location:
  ```ts
  await robot.drop(item);
  ```
- Pressure plates stay active as long as *something* (a robot or an item) is on top of them.
