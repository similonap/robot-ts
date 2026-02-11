# JSON Read Challenge

Welcome to the **JSON Read Maze**!

## Your Mission

Your goal is to import a list of passwords from a JSON file, find the valid ones, and use them to open the doors.

### Instructions

1.  **Import Passwords**: Import the `passwords.json` file.
2.  **Define Interface**: Create a TypeScript interface for the password object to ensure type safety.
3.  **Filter Expired**: Filter out any passwords that are marked as `expired: true`.
4.  **Scan Doors**: As you move, scan the doors to get their `name`.
5.  **Match Password**: Find the password in your filtered list that matches the door's name.
6.  **Open Door**: Use the correct password to open the door and proceed.

### Example Data

The `passwords.json` file looks like this:

```json
[
    {
        "name": "Door 1",
        "expired": true,
        "password": "huntrixgo"
    },
    {
        "name": "Door 1",
        "expired": false,
        "password": "hunter2"
    }
]
```

### Hints

- You can import JSON files directly:
  ```ts
  import passwords from "./passwords.json";
  ```
- Use `Array.filter` to get only valid passwords.
- Use `robot.scan()` to find out which door is in front of you.
  ```ts
  const entity = await robot.scan();
  if (entity && entity.type === 'door') {
      console.log("Door name:", entity.name);
  }
  ```
- Use `Array.find` to get the specific password for the door you are facing.
