# MapReduce Challenge

Welcome to the **MapReduce Maze**!

## Your Mission

In this challenge, you will test your array manipulation skills. Scattered throughout the maze are data fragments. You must collect all of them, process the data they carry, and use it to crack the password for the final door!

### Instructions

1.  **Collect the Data**: Navigate your robot to pick up all the items in the central area.
2.  **Analyze the Inventory**: Each item you picked up has custom properties assigned directly to it. These properties include:
    ```ts
    interface Key extends Item {
        secret: string;
        valid: boolean;
        order: number;
    }
    ```
3.  **Process the Data**: You must extract the correct password from your robot's inventory. To do this, you'll need to use standard JavaScript/TypeScript array methods:
    *   **Filter (Type Guard)**: Keep only the items that are Keys using the provided `isKey(item)` function. This also tells TypeScript the item is a `Key`!
    *   **Filter (Valid)**: Keep only the items where `valid` is `true`.
    *   **Sort**: Arrange the items based on their `order` property in ascending order.
    *   **Map**: Extract the `secret` string from each valid item.
    *   **Map (Decode)**: The `secret` string is encoded in Base64! Use the built-in `atob()` function to decode it back into plain text.
    *   **Reduce/Join**: Combine the decoded strings of the remaining valid items into a single password string.
4.  **Open the Door**: Navigate to the locked door and use the calculated password to open it: `robot.openDoor(password)`.
5.  **Win**: Move through the open door and collect the final prize!

### Hints

- To safely narrow down an item to your custom `Key` interface, you can pass the provided `isKey(item)` function directly to `filter`:
  ```ts
  const keysOnly = robot.inventory.filter(isKey);
  // Now TypeScript knows that every item in keysOnly is a Key!
  ```
- You can chain array methods together for a clean solution:
  ```ts
  const password = robot.inventory
    .filter(isKey)
    // ... complete the chain with filter (valid), sort, map (secret), map (atob), and reduce
  ```
- To decode a Base64 string, simply pass it into the built-in `atob()` function:
  ```ts
  const decodedString = atob("SGVsbG8="); // Returns "Hello"
  // You can pass the function directly into map! array.map(atob)
  ```
- Make sure you collect all the necessary items before trying to compute the password! You can use loops to automate the collection process.
- The `Array.prototype.sort()` method expects a comparator function to sort numbers correctly: `(a, b) => a.order - b.order`.
- The `Array.prototype.reduce()` method can be used to concatenate strings: `(prev, curr) => prev + curr`.
