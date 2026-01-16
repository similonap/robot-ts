'use client';
import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    files: Record<string, string>;
    activeFile: string;
    onChange: (value: string | undefined) => void;
}

export default function CodeEditor({ files, activeFile, onChange }: CodeEditorProps) {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2017,
            allowNonTsExtensions: true,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noLib: false,
            esModuleInterop: true,
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

      interface Robot {
        moveForward(): Promise<boolean>;
        canMoveForward(): Promise<boolean>;
        turnLeft(): Promise<void>;
        turnRight(): Promise<void>;
        pickup(): Promise<boolean>;
        scan(): Promise<Item | null>;
      }

      declare module "robot" {
        const robot: Robot;
        export default robot;
      }
      
      // declare var robot: Robot;  <-- REMOVED GLOBAL

      declare module "readline-sync" {
        export function question(prompt: string): string;
        export function questionInt(prompt: string): number;
        export function questionFloat(prompt: string): number;
      }

      // declare var readline: ... <-- REMOVED GLOBAL
      `,
            'ts:filename/globals.d.ts'
        );
    };

    // Sync files to Monaco models
    useEffect(() => {
        if (!monacoRef.current) return;
        const monaco = monacoRef.current;

        Object.entries(files).forEach(([filename, content]) => {
            const uri = monaco.Uri.parse(`file:///${filename}`);
            let model = monaco.editor.getModel(uri);
            if (!model) {
                model = monaco.editor.createModel(content, 'typescript', uri);
            } else if (model.getValue() !== content) {
                // Avoid cursor jumping by only updating if content is different (e.g. external change)
                // But for active file, the Editor component handles it. 
                // We only need to sync inactive files if they changed externally, which they won't in this app structure yet.
                // However, if we rename support later, this is needed.
                // For now, simple check.
                if (filename !== activeFile) {
                    model.setValue(content);
                }
            }
        });
    }, [files, activeFile]);

    return (
        <div className="h-full w-full border border-gray-700 rounded-md overflow-hidden">
            <Editor
                path={`file:///${activeFile}`}
                height="100%"
                defaultLanguage="typescript"
                theme="vs-dark"
                value={files[activeFile]}
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
