
import { MusicManager } from './managers/MusicManager.js';
import { UIManager } from './ui/UIManager.js';

// 現在利用しているTextAliveのアプリトークンを設定してください。
const APP_TOKEN = 'mq3mY1ymOq67ss5i';

const musicManager = new MusicManager(APP_TOKEN, '#media');

const canvas = document.querySelector('#waveform-canvas');
const placeholder = document.querySelector('#waveform-placeholder');
const timeLabel = document.querySelector('#waveform-time');
const ctx = canvas?.getContext('2d');

let uiManager;

let waveformData = null;
let currentProgress = 0;
let duration = 0;
let waveformReady = false;
let waveformAttempts = 0;
let waveformRetryTimer = null;

const MAX_WAVEFORM_ATTEMPTS = 60;
const WAVEFORM_RETRY_INTERVAL = 500;

uiManager = new UIManager({
    onTitleConnect: handleTitleConnect,
    onIntroStart: handleIntroStart
});

uiManager.showTitleScreen();

console.log('[Main] Initializing Application...');

musicManager.init({
    onAppReady: () => {
        console.log('[Main] TextAlive App Ready.');
        uiManager.setTitleStatus(
            '接続しました。「クリックして接続」を押してください。'
        );
        uiManager.setConnectButtonEnabled(true);
    },

    onVideoReady: () => {
        duration = musicManager.getDuration();

        console.log('[Main] Video Ready. Duration:', duration);

        updateTimeLabel(0, duration);
    },

    onTextLoad: () => {
        console.log('[Main] Text loaded.');
    },

    onLoadComplete: () => {
        duration = musicManager.getDuration();

        console.log('[Main] Music load complete.');
        console.log(
            '[Main] Vocal amplitude loaded:',
            musicManager.isVocalAmplitudeLoaded
        );

        uiManager.setIntroStatus('波形データを準備しています…');
        uiManager.setStartButtonEnabled(true);
        uiManager.showWaveform();

        resizeCanvas();
        updateTimeLabel(0, duration);

        tryBuildWaveform();
    },

    onVocalAmplitudeLoad: loaded => {
        console.log('[Main] Vocal amplitude callback:', loaded);

        if (loaded) {
            waveformAttempts = 0;
            tryBuildWaveform();
        } else {
            showWaveformMessage(
                '歌声の振幅データを取得できませんでした。Consoleを確認してください。'
            );
        }
    },

    onPlay: () => {
        console.log('[Main] Playback started.');
    },

    onPause: () => {
        console.log('[Main] Playback paused.');
    },

    onSeek: position => {
        const currentDuration = musicManager.getDuration();

        currentProgress = currentDuration > 0
            ? position / currentDuration
            : 0;

        drawWaveform();
        updateTimeLabel(position, currentDuration);
    },

    onTimeUpdate: (position, progress, currentDuration) => {
        currentProgress = progress;
        duration = currentDuration;

        drawWaveform();
        updateTimeLabel(position, duration);
    }
});

async function handleTitleConnect() {
    uiManager.setTitleStatus('楽曲を読み込んでいます…');

    await musicManager.prepareSong();

    duration = musicManager.getDuration();

    console.log('[Main] Music prepared.');

    uiManager.showIntroScreen();
    uiManager.setIntroStatus('波形データを準備しています…');
    uiManager.setStartButtonEnabled(true);
    uiManager.showWaveform();

    resizeCanvas();
    updateTimeLabel(0, duration);
    tryBuildWaveform();
}

async function handleIntroStart() {
    uiManager.setIntroStatus('再生を開始しています…');

    await musicManager.startPreparedSong();

    console.log('[Main] Music started.');

    uiManager.hideOpeningScreens();
    uiManager.showWaveform();

    resizeCanvas();
    drawWaveform();
}

function tryBuildWaveform() {
    if (waveformReady) {
        drawWaveform();
        return;
    }

    if (!musicManager.isLoaded) {
        console.log('[Waveform] Waiting for video data.');
        scheduleWaveformRetry();
        return;
    }

    if (!musicManager.isVocalAmplitudeLoaded) {
        console.log('[Waveform] Waiting for vocal amplitude data.');
        scheduleWaveformRetry();
        return;
    }

    const values = musicManager.getWaveformData(700);

    if (!values || values.length < 2) {
        console.warn('[Waveform] Amplitude samples are not ready.');
        scheduleWaveformRetry();
        return;
    }

    waveformData = values;
    waveformReady = true;

    if (waveformRetryTimer !== null) {
        clearTimeout(waveformRetryTimer);
        waveformRetryTimer = null;
    }

    console.log('[Waveform] Drawing completed.');

    if (placeholder) {
        placeholder.classList.add('hidden');
    }

    resizeCanvas();
    drawWaveform();
}

function scheduleWaveformRetry() {
    if (waveformReady || waveformRetryTimer !== null) {
        return;
    }

    if (waveformAttempts >= MAX_WAVEFORM_ATTEMPTS) {
        showWaveformMessage(
            '波形データを取得できませんでした。Consoleのエラーを確認してください。'
        );
        console.error('[Waveform] Retry limit reached.');
        return;
    }

    waveformAttempts++;

    waveformRetryTimer = setTimeout(() => {
        waveformRetryTimer = null;
        tryBuildWaveform();
    }, WAVEFORM_RETRY_INTERVAL);
}

function showWaveformMessage(message) {
    if (placeholder) {
        placeholder.textContent = message;
        placeholder.classList.remove('hidden');
    }
}

function resizeCanvas() {
    if (!canvas || !ctx) {
        console.error('[Waveform] Canvas element or context is missing.');
        return;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
        console.warn('[Waveform] Canvas has no visible dimensions.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * pixelRatio);
    canvas.height = Math.floor(rect.height * pixelRatio);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    drawWaveform();
}

function drawWaveform() {
    if (!canvas || !ctx) {
        return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width <= 0 || height <= 0) {
        return;
    }

    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (!waveformReady || !waveformData?.length) {
        return;
    }

    const barCount = Math.min(
        waveformData.length,
        Math.max(1, Math.floor(width / 3))
    );

    const step = waveformData.length / barCount;
    const barWidth = Math.max(1, width / barCount - 1);
    const maxBarHeight = height * 0.43;

    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.min(
            waveformData.length - 1,
            Math.floor(i * step)
        );

        const amplitude = waveformData[dataIndex];

        // 小さい振幅も視認できるように最小の高さを設定
        const barHeight = Math.max(
            2,
            amplitude * maxBarHeight
        );

        const x = i * (width / barCount);
        const isPlayed = i / Math.max(1, barCount - 1) <= currentProgress;

        ctx.fillStyle = isPlayed ? '#f4d35e' : '#70d6ff';

        ctx.fillRect(
            x,
            centerY - barHeight,
            barWidth,
            barHeight
        );

        ctx.fillRect(
            x,
            centerY,
            barWidth,
            barHeight
        );
    }

    const playheadX = Math.max(
        0,
        Math.min(width, currentProgress * width)
    );

    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function updateTimeLabel(position, totalDuration) {
    if (!timeLabel) {
        return;
    }

    timeLabel.textContent =
        `${formatTime(position)} / ${formatTime(totalDuration)}`;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.max(
        0,
        Math.floor((milliseconds || 0) / 1000)
    );

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

window.addEventListener('resize', resizeCanvas);
