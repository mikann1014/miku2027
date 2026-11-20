import { MusicManager }      from './managers/MusicManager.js';
import { UIManager }         from './ui/UIManager.js';
import { TerrainRenderer }   from './rendering/TerrainRenderer.js';
import { CharacterRenderer } from './rendering/CharacterRenderer.js';
import { GameManager }       from './game/GameManager.js';
import { LyricsManager }     from './game/LyricsManager.js';

const APP_TOKEN = 'mq3mY1ymOq67ss5i';

// ─── インスタンス生成 ─────────────────────────────────────────
const musicManager    = new MusicManager(APP_TOKEN, '#media');
const terrainRenderer = new TerrainRenderer('#waveform-canvas');
const charRenderer    = new CharacterRenderer();
const gameManager     = new GameManager();
const lyricsManager   = new LyricsManager();

terrainRenderer.setGameManager(gameManager);
terrainRenderer.setCharacterRenderer(charRenderer);
terrainRenderer.setLyricsManager(lyricsManager);

const placeholder = document.querySelector('#waveform-placeholder');
const timeLabel   = document.querySelector('#waveform-time');

let uiManager;

// ─── 波形データ読み込み管理 ───────────────────────────────────
let duration              = 0;
let waveformReady         = false;
let waveformAttempts      = 0;
let waveformRetryTimer    = null;
let isVocalAmplitudeReady = false;
let isTextReady           = false;

const MAX_WAVEFORM_ATTEMPTS   = 60;
const WAVEFORM_RETRY_INTERVAL = 500;

// ─── UI 初期化 ────────────────────────────────────────────────
let selectedSong = null;

uiManager = new UIManager({
    onSongSelect:  handleSongSelect,
    onIntroStart:  handleIntroStart
});

uiManager.showTitleScreen();

console.log('[Main] Initializing Application...');

// ─── MusicManager イベント ────────────────────────────────────
musicManager.init({
    onAppReady: () => {
        console.log('[Main] TextAlive App Ready.');
        uiManager.setTitleStatus('接続しました。「クリックして接続」を押してください。');
        uiManager.setConnectButtonEnabled(true);
    },

    onVideoReady: (video) => {
        duration = musicManager.getDuration();
        console.log('[Main] Video Ready. Duration:', duration);
        updateTimeLabel(0, duration);
        // onTextLoad より先に phrases が使える場合に備えて渡す
        if (video?.phrases?.length) {
            lyricsManager.setPhrases(video.phrases);
            console.log('[Main] Phrases from onVideoReady:', video.phrases.length);
        }
    },

    onTextLoad: (video) => {
        console.log('[Main] Text loaded.');
        isTextReady = true;
        if (video?.phrases?.length) {
            lyricsManager.setPhrases(video.phrases);
            console.log('[Main] Phrases from onTextLoad:', video.phrases.length);
        }
        tryBuildWaveform();
    },

    onLoadComplete: () => {
        duration = musicManager.getDuration();
        console.log('[Main] Music load complete.');
        tryBuildWaveform();
    },

    onVocalAmplitudeLoad: loaded => {
        console.log('[Main] Vocal amplitude callback:', loaded);
        if (loaded) {
            isVocalAmplitudeReady = true;
            waveformAttempts = 0;
            tryBuildWaveform();
        } else {
            showWaveformMessage('歌声の振幅データを取得できませんでした。Consoleを確認してください。');
        }
    },

    onPlay: () => {
        console.log('[Main] Playback started.');
        uiManager.setGlobalStatus('PLAYING');
        terrainRenderer.play();
    },

    onPause: () => {
        console.log('[Main] Playback paused.');
        uiManager.setGlobalStatus('PAUSED');
        terrainRenderer.pause();
    },

    onSeek: position => {
        const currentDuration = musicManager.getDuration();
        terrainRenderer.setPosition(position, currentDuration);
        gameManager.setPosition(position, currentDuration);
        terrainRenderer.drawOnce();
        updateTimeLabel(position, currentDuration);
    },

    onTimeUpdate: (position, progress, currentDuration) => {
        duration = currentDuration;
        terrainRenderer.setPosition(position, currentDuration);
        gameManager.setPosition(position, currentDuration);
        updateTimeLabel(position, duration);

        // 歌詞管理を更新してレンダラーに状態を渡す
        const canvas = document.querySelector('#waveform-canvas');
        if (canvas) {
            lyricsManager.update(position, 16, canvas.clientWidth, canvas.clientHeight);
        }
        const lyricsState = lyricsManager.getState();
        terrainRenderer.setLyricsState(lyricsState);
        // isFinished は state から取得するので setFinished は不要
        terrainRenderer.setFinished(lyricsState.isFinished);

        // 曲終了判定（残り1秒以内）
        if (currentDuration > 0 && position >= currentDuration - 1000) {
            lyricsManager.setFinished();
        }
    }
});

// ─── 画面遷移ハンドラ ─────────────────────────────────────────

async function handleSongSelect(song) {
    selectedSong = song;
    uiManager.showIntroScreen(song);
    uiManager.setIntroStatus('楽曲を読み込んでいます…');
    uiManager.setStartButtonEnabled(false);

    // MusicManager の songUrl を差し替えて準備
    musicManager.setSongUrl(song.url);

    if (!musicManager.isAppReady) {
        // AppReady 待ち（onAppReady 後に再試行）
        musicManager._pendingSong = song;
        return;
    }

    await _prepareSong();
}

async function _prepareSong() {
    uiManager.setIntroStatus('楽曲を読み込んでいます…');
    await musicManager.prepareSong();
    duration = musicManager.getDuration();
    console.log('[Main] Music prepared.');

    uiManager.setIntroStatus('波形データを準備しています…');
    uiManager.setStartButtonEnabled(true);
    uiManager.showWaveform();
    terrainRenderer.resize();
    updateTimeLabel(0, duration);
    tryBuildWaveform();
}

async function handleIntroStart() {
    uiManager.setIntroStatus('再生を開始しています…');
    await musicManager.startPreparedSong();
    console.log('[Main] Music started.');

    uiManager.hideOpeningScreens();
    uiManager.showWaveform();
    terrainRenderer.resize();
    syncVisibleBars();
    terrainRenderer.drawOnce();
}

// ─── 波形データ構築 ───────────────────────────────────────────

function tryBuildWaveform() {
    if (waveformReady) { terrainRenderer.drawOnce(); return; }

    if (!musicManager.isLoaded) {
        console.log('[Waveform] Waiting for video data.');
        scheduleWaveformRetry();
        return;
    }
    if (!isVocalAmplitudeReady) {
        console.log('[Waveform] Waiting for vocal amplitude data.');
        scheduleWaveformRetry();
        return;
    }
    if (!isTextReady) {
        console.log('[Waveform] Waiting for lyrics phrase data.');
        scheduleWaveformRetry();
        return;
    }

    const values = musicManager.getWaveformData(4800);

    if (!values || values.length < 2) {
        console.warn('[Waveform] Amplitude samples are not ready.');
        scheduleWaveformRetry();
        return;
    }

    waveformReady = true;
    if (waveformRetryTimer !== null) { clearTimeout(waveformRetryTimer); waveformRetryTimer = null; }
    console.log('[Waveform] Build complete.');
    if (placeholder) { placeholder.classList.add('hidden'); }

    terrainRenderer.setWaveformData(values);
    gameManager.setWaveformData(values);

    const panel = document.querySelector('#waveform-panel');
    if (panel && !panel.classList.contains('hidden')) {
        terrainRenderer.resize();
    } else {
        terrainRenderer.drawOnce();
    }
}

function scheduleWaveformRetry() {
    if (waveformReady || waveformRetryTimer !== null) return;
    if (waveformAttempts >= MAX_WAVEFORM_ATTEMPTS) {
        showWaveformMessage('波形データを取得できませんでした。Consoleのエラーを確認してください。');
        console.error('[Waveform] Retry limit reached.');
        return;
    }
    waveformAttempts++;
    waveformRetryTimer = setTimeout(() => { waveformRetryTimer = null; tryBuildWaveform(); }, WAVEFORM_RETRY_INTERVAL);
}

function showWaveformMessage(message) {
    if (placeholder) { placeholder.textContent = message; placeholder.classList.remove('hidden'); }
}

// ─── 時間表示 ─────────────────────────────────────────────────

function updateTimeLabel(position, totalDuration) {
    if (!timeLabel) return;
    timeLabel.textContent = `${formatTime(position)} / ${formatTime(totalDuration)}`;
}

function formatTime(ms) {
    const s = Math.max(0, Math.floor((ms || 0) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── 入力（ジャンプ） ─────────────────────────────────────────

// キーボード
window.addEventListener('keydown', e => {
    // W / Space でジャンプ
    if (e.code === 'KeyW' || e.code === 'Space') {
        e.preventDefault();
        gameManager.jump();
    }
    // A で左移動、D で右移動
    if (e.code === 'KeyA') { e.preventDefault(); gameManager.setMoveLeft(true);  }
    if (e.code === 'KeyD') { e.preventDefault(); gameManager.setMoveRight(true); }
});

window.addEventListener('keyup', e => {
    if (e.code === 'KeyA') gameManager.setMoveLeft(false);
    if (e.code === 'KeyD') gameManager.setMoveRight(false);
});

// ─── タッチコントローラー ──────────────────────────────────────

function setupTouchBtn(id, onStart, onEnd) {
    const btn = document.querySelector(id);
    if (!btn) return;

    const start = e => { e.preventDefault(); btn.classList.add('pressed'); onStart(); };
    const end   = e => { e.preventDefault(); btn.classList.remove('pressed'); if (onEnd) onEnd(); };

    btn.addEventListener('touchstart',  start, { passive: false });
    btn.addEventListener('touchend',    end,   { passive: false });
    btn.addEventListener('touchcancel', end,   { passive: false });
    btn.addEventListener('mousedown',   start);
    btn.addEventListener('mouseup',     end);
    btn.addEventListener('mouseleave',  end);
}

setupTouchBtn('#btn-left',  () => gameManager.setMoveLeft(true),  () => gameManager.setMoveLeft(false));
setupTouchBtn('#btn-right', () => gameManager.setMoveRight(true), () => gameManager.setMoveRight(false));
setupTouchBtn('#btn-jump',  () => gameManager.jump(), null);

// Canvas タップでもジャンプ（スマホで誤操作防止のため移動ボタン以外の場所に限定）
document.querySelector('#waveform-canvas')?.addEventListener('pointerdown', e => {
    e.preventDefault();
    gameManager.jump();
});

// ─── リサイズ ─────────────────────────────────────────────────

window.addEventListener('resize', () => {
    terrainRenderer.resize();
    // TerrainRenderer の visibleBars を GameManager に同期
    gameManager.setVisibleBars(terrainRenderer._visibleBars);
});

// 初期同期
function syncVisibleBars() {
    if (terrainRenderer._visibleBars) {
        gameManager.setVisibleBars(terrainRenderer._visibleBars);
    }
}