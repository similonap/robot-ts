
import { useState, useEffect } from 'react';

export const useExternalTypes = (files: Record<string, string>) => {
    const [externalModules, setExternalModules] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchTypes = async () => {
            const imports = new Set<string>();
            const regex = /import\s+(?:(?:[\w{}\s,*]+)\s+from\s+)?['"]([^'"]+)['"]/g;

            Object.values(files).forEach(content => {
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const lib = match[1];
                    if (!lib.startsWith('.') && lib !== 'circuit-crawler' && lib !== 'readline-sync') {
                        imports.add(lib);
                    }
                }
            });

            const newModules: Record<string, string> = { ...externalModules };
            let hasNew = false;

            await Promise.all(Array.from(imports).map(async (lib) => {
                if (newModules[lib]) return; // Already fetched

                try {
                    // 1. Get the redirect URL which contains the version and types header
                    const headersRes = await fetch(`https://esm.sh/${lib}`, { method: 'HEAD' });
                    const typeHeader = headersRes.headers.get('X-TypeScript-Types');

                    if (typeHeader) {
                        // 2. Fetch the actual .d.ts content
                        // The header is usually a full URL or relative path. 
                        // esm.sh usually returns absolute or relative to the domain.
                        const typeUrl = new URL(typeHeader, 'https://esm.sh').toString();

                        const typeRes = await fetch(typeUrl);
                        if (typeRes.ok) {
                            const typeContent = await typeRes.text();
                            newModules[lib] = typeContent;
                            hasNew = true;
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch types for ${lib}:`, e);
                }
            }));

            if (hasNew) {
                setExternalModules(newModules);
            }
        };

        // Debounce
        const timeout = setTimeout(fetchTypes, 1000);
        return () => clearTimeout(timeout);
    }, [files]);

    return externalModules;
};
