declare module 'superdough' {
    export function superdough(params: any, time?: number, duration?: number): any;
    export function initAudioOnFirstClick(options?: any): Promise<void>;
    export function initAudio(options?: any): Promise<void>;
    export function registerSynthSounds(): Promise<void>;
    export function registerWorklet(url: string): void;
    export function getAudioContextCurrentTime(): number;
}
