import { useState } from 'react';

interface UseFileManagerProps {
    initialFiles?: Record<string, string>;
    initialCode: string;
}

export const useFileManager = ({ initialFiles, initialCode }: UseFileManagerProps) => {
    const [files, setFiles] = useState<Record<string, string>>({
        'main.ts': initialCode,
        ...initialFiles
    });

    const [activeFile, setActiveFile] = useState(() => {
        if (!initialFiles) return 'main.ts';
        if (initialFiles['README']) return 'README';
        if (initialFiles['README.md']) return 'README.md';
        return 'main.ts';
    });

    const handleAddFile = () => {
        const name = prompt("Enter file name (e.g. utils.ts):");
        if (name) {
            if (files[name]) {
                alert("File already exists!");
                return;
            }
            setFiles(prev => ({ ...prev, [name]: '' }));
            setActiveFile(name);
        }
    };

    const handleDeleteFile = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (name === 'main.ts' || name === 'README' || name === 'README.md') return;
        if (confirm(`Delete ${name}?`)) {
            setFiles(prev => {
                const newFiles = { ...prev };
                delete newFiles[name];
                return newFiles;
            });
            if (activeFile === name) {
                setActiveFile('main.ts');
            }
        }
    };

    const changeFile = (file: string, content: string) => {
        setFiles(prev => ({ ...prev, [file]: content }));
    };

    return {
        files,
        setFiles,
        activeFile,
        setActiveFile,
        handleAddFile,
        handleDeleteFile,
        changeFile
    };
};
