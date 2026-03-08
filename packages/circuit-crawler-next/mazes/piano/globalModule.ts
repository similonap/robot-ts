import { superdough, initAudio, registerSynthSounds, getAudioContextCurrentTime, registerWorklet } from 'superdough';
import { Item } from 'circuit-crawler';

// Note name → frequency (Hz) mapping
const NOTE_FREQUENCIES: Record<string, number> = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
};

// Semitone multiplier: freq × this = one semitone up (sharp)
const SEMITONE = Math.pow(2, 1 / 12);

let audioReady = false;

async function ensureAudio() {
    if (audioReady) return;
    try {
        registerWorklet('/superdough-worklets.mjs');
        await initAudio();
        await registerSynthSounds();
        audioReady = true;
    } catch (e) {
        console.error("Audio init failed", e);
    }
}

async function playNote(note: string, sharp = false, instrument = 'sine') {
    await ensureAudio();
    let freq = NOTE_FREQUENCIES[note];
    if (!freq) return;
    if (sharp) freq *= SEMITONE;
    const t = getAudioContextCurrentTime() + 0.01;
    superdough({ s: instrument, freq, gain: 0.15 }, t, 0.5);
}

interface Note extends Item {
    play: (sharp: boolean, instrument?: string) => Promise<void>;
}

// Attach play(sharp?, instrument?) to each note item
for (const note of Object.keys(NOTE_FREQUENCIES)) {
    const item = game.getItem(`item-${note}`);
    if (item) {
        Object.assign(item, { play: (sharp = false, instrument = 'sine') => playNote(note, sharp, instrument) });
    }
}