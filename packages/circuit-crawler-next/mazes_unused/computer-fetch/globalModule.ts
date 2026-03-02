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
    let controller = game.addLog("", ProgressBar, { progress: 0 });

    for (let i = 0; i <= 100; i++) {
        await sleep(100);
        controller.updateProps({ progress: i });
    }

}

Object.assign(game.getItem("item-laptop"), { activate: activate });
