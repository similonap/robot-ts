import { useMemo } from 'react';

export function processSharedTypes(sharedTypes: string) {
    return sharedTypes.replace(/export\s+interface\s+Item\s*\{/, 'export interface BaseItem {');
}

export function generateGlobalItemDeclaration(globalModuleContent?: string) {
    const hasCustomItem = globalModuleContent && (globalModuleContent.includes('export interface Item') || globalModuleContent.includes('export type Item'));

    if (hasCustomItem) {
        return `type Item = import("globalModule").Item;`;
    }

    return `interface Item extends BaseItem {}`;
}

export function useTypeInjection(sharedTypes: string, globalModuleContent?: string) {
    return useMemo(() => {
        const internalTypes = processSharedTypes(sharedTypes);
        const itemDeclaration = generateGlobalItemDeclaration(globalModuleContent);

        return {
            processedSharedTypes: `${internalTypes}\n${itemDeclaration}`
        };
    }, [sharedTypes, globalModuleContent]);
}
