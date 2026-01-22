'use client';
import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    files: Record<string, string>;
    activeFile: string;
    onChange: (value: string) => void;
    sharedTypes: string;
    modules?: Record<string, string>;
}

export default function CodeEditor({ files, activeFile, onChange, sharedTypes, modules = {} }: CodeEditorProps) {
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
            allowSyntheticDefaultImports: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
        });

        let libContent = sharedTypes.replace(/export /g, '');


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
        // Sync Dynamic Modules (as node_modules)
        Object.entries(modules).forEach(([moduleName, content]) => {
            const uri = monaco.Uri.parse(`file:///node_modules/${moduleName}/index.ts`);
            let model = monaco.editor.getModel(uri);
            if (!model) {
                model = monaco.editor.createModel(content, 'typescript', uri);
            } else if (model.getValue() !== content) {
                model.setValue(content);
            }
        });
    }, [files, activeFile, modules]);

    return (
        <div className="h-full w-full border border-gray-700 overflow-hidden">
            <Editor
                path={`file:///${activeFile}`}
                height="100%"
                defaultLanguage="typescript"
                theme="vs-dark"
                value={files[activeFile]}
                onChange={(value) => {
                    if (!value) return;
                    onChange(value);
                }}
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
