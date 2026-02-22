import { processSharedTypes, generateGlobalItemDeclaration } from './useTypeInjection';

describe('useTypeInjection utilities', () => {
    describe('processSharedTypes', () => {
        it('should replace standalone Item with BaseItem', () => {
            const sharedTypes = `
                export interface Item {
                    id: string;
                    type: 'item';
                    name: string;
                    icon: string;
                    type: string;
                    position?: Position;
                    isRevealed?: boolean;
                    imageUrl?: string;
                }
                export interface Robot { inventory: Item[]; }
                export interface ItemControl { collect(): void; }
                export interface SharedWorldState { isItemCollected(id: string): boolean; }
            `;
            const result = processSharedTypes(sharedTypes);

            expect(result).toContain('export interface BaseItem');
            expect(result).toContain('inventory: Item[]');
            expect(result).toContain('export interface ItemControl'); // Should not change
            expect(result).toContain('isItemCollected'); // Should not change
        });
    });

    describe('generateGlobalItemDeclaration', () => {
        it('should use import when globalModule has export interface Item', () => {
            const globalModule = `
                export interface Item {
                    customProp: string;
                }
            `;
            const result = generateGlobalItemDeclaration(globalModule);
            expect(result).toBe('type Item = import("globalModule").Item;');
        });

        it('should use import when globalModule has export type Item', () => {
            const globalModule = `
                import { BaseItem } from 'circuit-crawler';
                export type Item = BaseItem & { customProp: string; }
            `;
            const result = generateGlobalItemDeclaration(globalModule);
            expect(result).toBe('type Item = import("globalModule").Item;');
        });

        it('should use BaseItem when globalModule does not export Item', () => {
            const globalModule = `
                export interface Door {
                    customProp: string;
                }
            `;
            const result = generateGlobalItemDeclaration(globalModule);
            expect(result).toBe('interface Item extends BaseItem {}');
        });

        it('should use BaseItem when globalModule is undefined', () => {
            const result = generateGlobalItemDeclaration(undefined);
            expect(result).toBe('interface Item extends BaseItem {}');
        });
    });
});
