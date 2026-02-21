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
    *   **Map/Cast**: Ensure you cast your `Item` objects down to the `Key` interface.
    *   **Sort**: Arrange the items based on their `order` property in ascending order.
    *   **Filter**: Keep only the items where `valid` is `true`.
    *   **Map**: Extract the `secret` string from each valid item.
    *   **Map (Decode)**: The `secret` string is encoded in Base64! Use the built-in `atob()` function to decode it back into plain text.
    *   **Reduce/Join**: Combine the decoded strings of the remaining valid items into a single password string.
4.  **Open the Door**: Navigate to the locked door and use the calculated password to open it: `robot.openDoor(password)`.
5.  **Win**: Move through the open door and collect the final prize!

### Hints

- To get the custom properties from an item you picked up, you can cast it to your custom interface:
  ```ts
  const key = item as Key;
  ```
- You can chain array methods together for a clean solution:
  ```ts
  const password = robot.inventory
    .map((item: any) => item as Key)
    // ... complete the chain with sort, filter, map (to get secret), map (atob), and reduce
  ```
- To decode a Base64 string, simply pass it into the built-in `atob()` function:
  ```ts
  const decodedString = atob("SGVsbG8="); // Returns "Hello"
  // You can pass the function directly into map! array.map(atob)
  ```
- Make sure you collect all the necessary items before trying to compute the password! You can use loops to automate the collection process.
- The `Array.prototype.sort()` method expects a comparator function to sort numbers correctly: `(a, b) => a.order - b.order`.
- The `Array.prototype.reduce()` method can be used to concatenate strings: `(prev, curr) => prev + curr`.
