'use client';
import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    files: Record<string, string>;
    activeFile: string;
    onChange: (value: string | undefined) => void;
    sharedTypes?: string;
}

export default function CodeEditor({ files, activeFile, onChange, sharedTypes }: CodeEditorProps) {
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

        // sharedTypes now contains EVERYTHING (interfaces, declared vars, modules) from lib/types.ts
        // We just need to ensure 'export' keywords don't prevent them from being seen as global in the editor.

        let libContent = '';

        if (sharedTypes) {
            const globalTypes = sharedTypes.replace(/export /g, '');
            libContent = globalTypes;
        } else {
            // Fallback minimal types if something goes wrong with reading the file
            libContent = `
              interface Position { x: number; y: number; }
              interface Item { id: string; type: 'item'; name: string; icon: string; tags: string[]; position: Position; }
              interface Door { id: string; position: Position; type: 'door'; isOpen: boolean; }
              // ... simplistic fallback
              declare var robot: any;
              declare var game: any;
              declare var maze: any;
              `;
        }

        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            libContent,
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
