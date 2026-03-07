import { superdough, initAudio, registerSynthSounds, getAudioContextCurrentTime, registerWorklet } from 'superdough';

const ProgressBar = ({ progress }: { progress: number }) => {
    const bars = Math.floor(progress / 5);
    const barStr = '█'.repeat(bars) + ' '.repeat(20 - bars);

    return (
        <span style= {{ color: 'white', whiteSpace: 'pre', display: 'inline-block', fontFamily: 'monospace' }
}>
    {`DOWNLOADING... [${barStr}] ${progress.toString().padStart(3, ' ')}%`}
</span>
    );
}

function sleep(ms: number) {
    return new Promise((res, rej) => setTimeout(res, ms));
}

async function activate() {
    try {
        game.addLog("Accessing http://localhost:3001");
        let controller = game.addLog("", ProgressBar, { progress: 0 });

        try {
            registerWorklet('/superdough-worklets.mjs');
            await initAudio();
            await registerSynthSounds();
        } catch (e) {
            console.error("Audio init failed", e);
        }

        // Helper: wait for a phase to play, bail if game stopped
        const waitPhase = async (durationMs: number) => {
            const steps = Math.ceil(durationMs / 50);
            for (let i = 0; i < steps; i++) {
                if (!game.isRunning()) return false;
                await sleep(50);
            }
            return true;
        };

        // ============================================================
        //  V.90 / 56K MODEM HANDSHAKE
        //  Skips dial-tone & DTMF — starts at the answering modem
        //  Sounds are scheduled phase-by-phase so stopping cancels
        //  future phases.
        // ============================================================

        let t: number;

        // ── 1. CNG calling tone (1100 Hz short burst from caller)
        t = getAudioContextCurrentTime() + 0.05;
        superdough({ s: 'sine', freq: 1100, gain: 0.08 }, t, 0.5);
        if (!await waitPhase(700)) return;

        // ── 2. ANSam answer tone (2100 Hz + 15 Hz AM)
        t = getAudioContextCurrentTime() + 0.05;
        const ansamDur = 2.5;
        superdough({ s: 'sine', freq: 2100, gain: 0.08 }, t, ansamDur);
        superdough({ s: 'sine', freq: 2085, gain: 0.02 }, t, ansamDur);
        superdough({ s: 'sine', freq: 2115, gain: 0.02 }, t, ansamDur);
        for (let i = 0; i < 5; i++) {
            superdough({ s: 'white', gain: 0.04, hcutoff: 8000 }, t + 0.45 * (i + 1), 0.006);
        }
        if (!await waitPhase(2700)) return;

        // ── 3. V.8 handshake tones — "bong... BONG-bong"
        t = getAudioContextCurrentTime() + 0.05;

        // First "bong" (low)
        superdough({ s: 'sine', freq: 980, gain: 0.07 }, t, 0.25);
        superdough({ s: 'sine', freq: 1180, gain: 0.04 }, t, 0.25);
        t += 0.4;

        // "BONG-bong" pair (high-low)
        superdough({ s: 'sine', freq: 1650, gain: 0.07 }, t, 0.2);
        superdough({ s: 'sine', freq: 1850, gain: 0.04 }, t, 0.2);
        t += 0.25;
        superdough({ s: 'sine', freq: 980, gain: 0.07 }, t, 0.2);
        superdough({ s: 'sine', freq: 1180, gain: 0.04 }, t, 0.2);
        t += 0.35;

        // Second "bong... BONG-bong" (response)
        superdough({ s: 'sine', freq: 1650, gain: 0.06 }, t, 0.25);
        superdough({ s: 'sine', freq: 1850, gain: 0.035 }, t, 0.25);
        t += 0.4;
        superdough({ s: 'sine', freq: 980, gain: 0.06 }, t, 0.2);
        superdough({ s: 'sine', freq: 1180, gain: 0.035 }, t, 0.2);
        t += 0.25;
        superdough({ s: 'sine', freq: 1650, gain: 0.06 }, t, 0.2);
        superdough({ s: 'sine', freq: 1850, gain: 0.035 }, t, 0.2);
        if (!await waitPhase(2200)) return;

        // ── 4. THE SCREECH — V.34 training sequence (split into 2 halves)
        t = getAudioContextCurrentTime() + 0.05;
        const halfScreech = 2.0;

        // First half of screech
        superdough({ s: 'sawtooth', freq: 1800, gain: 0.035, distort: 0.6 }, t, halfScreech);
        superdough({ s: 'sawtooth', freq: 1400, gain: 0.025, distort: 0.5 }, t, halfScreech);
        superdough({ s: 'sawtooth', freq: 2200, gain: 0.025, distort: 0.5 }, t, halfScreech);
        superdough({ s: 'square', freq: 600, gain: 0.015 }, t, halfScreech);
        superdough({ s: 'square', freq: 1000, gain: 0.02 }, t, halfScreech);
        superdough({ s: 'square', freq: 2600, gain: 0.015 }, t, halfScreech);
        superdough({ s: 'square', freq: 3000, gain: 0.01 }, t, halfScreech);
        superdough({ s: 'white', gain: 0.02, hcutoff: 3400 }, t, halfScreech);
        for (let i = 0; i < 3; i++) {
            const wt = t + i * 0.65;
            superdough({ s: 'sine', freq: 2400, gain: 0.03 }, wt, 0.12);
            superdough({ s: 'sine', freq: 1200, gain: 0.03 }, wt + 0.12, 0.12);
        }
        if (!await waitPhase(2000)) return;

        // Second half of screech
        t = getAudioContextCurrentTime() + 0.05;
        superdough({ s: 'sawtooth', freq: 1800, gain: 0.035, distort: 0.6 }, t, halfScreech);
        superdough({ s: 'sawtooth', freq: 1400, gain: 0.025, distort: 0.5 }, t, halfScreech);
        superdough({ s: 'sawtooth', freq: 2200, gain: 0.025, distort: 0.5 }, t, halfScreech);
        superdough({ s: 'square', freq: 600, gain: 0.015 }, t, halfScreech);
        superdough({ s: 'square', freq: 1000, gain: 0.02 }, t, halfScreech);
        superdough({ s: 'square', freq: 2600, gain: 0.015 }, t, halfScreech);
        superdough({ s: 'square', freq: 3000, gain: 0.01 }, t, halfScreech);
        superdough({ s: 'white', gain: 0.02, hcutoff: 3400 }, t, halfScreech);
        for (let i = 0; i < 3; i++) {
            const wt = t + i * 0.65;
            superdough({ s: 'sine', freq: 2400, gain: 0.03 }, wt, 0.12);
            superdough({ s: 'sine', freq: 1200, gain: 0.03 }, wt + 0.12, 0.12);
        }
        if (!await waitPhase(2100)) return;

        // ── 5. Transition tones
        t = getAudioContextCurrentTime() + 0.05;
        superdough({ s: 'sine', freq: 1800, gain: 0.06 }, t, 0.3);
        t += 0.35;
        superdough({ s: 'sine', freq: 1200, gain: 0.05 }, t, 0.2);
        superdough({ s: 'sine', freq: 2400, gain: 0.04 }, t, 0.2);
        if (!await waitPhase(650)) return;

        // ── 6. KSSSHHHHH — scrambled data
        t = getAudioContextCurrentTime() + 0.05;
        const staticDur = 2.5;
        superdough({ s: 'white', gain: 0.05, hcutoff: 3400 }, t, staticDur);
        superdough({ s: 'sawtooth', freq: 1800, gain: 0.01, distort: 0.2 }, t, staticDur);
        t += staticDur;

        // Speaker mute click
        superdough({ s: 'white', gain: 0.05, hcutoff: 5000 }, t, 0.08);
        if (!await waitPhase(2600)) return;

        for (let i = 0; i <= 100; i++) {
            if (!game.isRunning()) return;
            await sleep(100);
            controller.updateProps({ progress: i });
        }
    } catch (e) {
        console.log(e);
    }
}

Object.assign(game.getItem("item-laptop"), { activate: activate });
