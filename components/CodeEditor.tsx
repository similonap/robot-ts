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
         * Turns the robot 90 degrees to the left (counter-clockwise).
         */
        turnLeft(): Promise<void>;

        /**
         * Turns the robot 90 degrees to the right (clockwise).
         */
        turnRight(): Promise<void>;
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
