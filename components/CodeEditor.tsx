'use client';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
    const handleEditorDidMount = (editor: any, monaco: any) => {
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            `
      interface Position {
        x: number;
        y: number;
      }

      interface Item {
        id: string;
        name: string;
        emoji: string;
        type: string;
        position: Position;
      }

      /**
       * The main robot controller.
       * Use this global object to control your robot in the maze.
       */
      interface Robot {
        /**
         * Moves the robot forward one step in the current direction.
         * @returns {Promise<boolean>} Resolves to true if moved, false if blocked by a wall.
         */
        moveForward(): Promise<boolean>;

        /**
         * Checks if the robot can move forward without actually moving.
         * @returns {Promise<boolean>} Resolves to true if the path is clear, false if blocked by a wall.
         */
        canMoveForward(): Promise<boolean>;

        /**
         * Turns the robot 90 degrees to the left (counter-clockwise).
         */
        turnLeft(): Promise<void>;

        /**
         * Turns the robot 90 degrees to the right (clockwise).
         */
        turnRight(): Promise<void>;

        /**
         * Picks up an item at the current location.
         * @returns {Promise<boolean>} True if item collected, false if nothing to pickup.
         */
        pickup(): Promise<boolean>;

        /**
         * Scans the item at the current location.
         * @returns {Promise<Item | null>} The item object found, or null if nothing found.
         */
        scan(): Promise<Item | null>;
      }

      /**
       * The global robot instance.
       */
      declare var robot: Robot;

      declare var readline: {
        /**
         * Ask the user a question via the terminal.
         * The execution will pause until you answer.
         * @param prompt The question to display.
         * @returns The user's input.
         */
        question(prompt: string): string;
      };
      
      // Fetch is usually available, but we can ensure it is typed if needed
      // declare function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
      `,
            'ts:filename/globals.d.ts'
        );
    };

    return (
        <div className="h-full w-full border border-gray-700 rounded-md overflow-hidden">
            <Editor
                height="100%"
                defaultLanguage="typescript"
                theme="vs-dark"
                value={code}
                onChange={onChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
            />
        </div>
    );
}
