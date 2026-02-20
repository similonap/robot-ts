# MapReduce Challenge

Welcome to the **MapReduce Maze**!

## Your Mission

In this challenge, you will test your array manipulation skills. Scattered throughout the maze are data fragments. You must collect all of them, process the data they carry, and use it to crack the password for the final door!

### Instructions

1.  **Collect the Data**: Navigate your robot to pick up all the items in the central area.
2.  **Analyze the Inventory**: Each item you picked up has a special `value` property. This property contains a JSON object with the following structure:
    ```ts
    interface ItemValue {
        value: string;
        valid: boolean;
        order: number;
    }
    ```
3.  **Process the Data**: You must extract the correct password from your robot's inventory. To do this, you'll need to use standard JavaScript/TypeScript array methods:
    *   **Map**: Extract the `ItemValue` object from each `Item` in the inventory.
    *   **Sort**: Arrange the items based on their `order` property in ascending order.
    *   **Filter**: Keep only the items where `valid` is `true`.
    *   **Reduce/Join**: Combine the `value` strings of the remaining valid items into a single password string.
4.  **Open the Door**: Navigate to the locked door and use the calculated password to open it: `robot.openDoor(password)`.
5.  **Win**: Move through the open door and collect the final prize!

### Hints

- To get the `ItemValue` object from an item you picked up, you can access its `value` property.
  ```ts
  const itemValue = item.value as ItemValue;
  ```
- You can chain array methods together for a clean solution:
  ```ts
  const password = robot.inventory
    .map(item => item.value)
    // ... complete the chain with sort, filter, and reduce
  ```
- Make sure you collect all the necessary items before trying to compute the password! You can use loops to automate the collection process.
- The `Array.prototype.sort()` method expects a comparator function to sort numbers correctly: `(a, b) => a.order - b.order`.
- The `Array.prototype.reduce()` method can be used to concatenate strings: `(prev, curr) => prev + curr`.
