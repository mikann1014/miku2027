import { Player } from 'textalive-app-api';

export class MusicManager {
    constructor(appToken, mediaElementSelector = '#media') {
        this.appToken = appToken || '';
        this.mediaElementSelector = mediaElementSelector;
        this.player = null;

        this.isAppReady = false;
        this.isLoaded = false;
        this.isPrepared = false;
        this.isPreparing = false;
        this.isVocalAmplitudeLoaded = false;
        this.isUserPaused = false;

        this.preparePromise = null;
        this.callbacks = {};
    }

    init(callbacks = {}) {
        this.callbacks = callbacks;

        let mediaElement = document.querySelector(
            this.mediaElementSelector
        );

        if (!mediaElement) {
            mediaElement = document.createElement('div');
            mediaElement.id = this.mediaElementSelector.replace('#', '');
            document.body.appendChild(mediaElement);
        }

        this.player = new Player({
            app: {
                token: this.appToken
            },
            mediaElement,
            mediaBannerPosition: 'bottom right',
            valenceArousalEnabled: false,
            vocalAmplitudeEnabled: true
        });

        this.player.addListener({
            onAppReady: app => {
                this.isAppReady = true;
                console.log('[MusicManager] App ready:', app);
                this.callbacks.onAppReady?.(app);
            },

            onSongLoad: (song, reason) => {
                console.log('[MusicManager] Song loaded:', song);

                if (reason) {
                    console.error('[MusicManager] Song load error:', reason);
                }
            },

            onVocalAmplitudeLoad: (amplitudeData, reason) => {
                this.isVocalAmplitudeLoaded = !reason;

                console.log(
                    '[MusicManager] Vocal amplitude loaded:',
                    this.isVocalAmplitudeLoaded,
                    reason || ''
                );

                if (reason) {
                    console.error(
                        '[MusicManager] Vocal amplitude load failed:',
                        reason
                    );
                }

                this.callbacks.onVocalAmplitudeLoad?.(
                    this.isVocalAmplitudeLoaded
                );
            },

            onVideoReady: video => {
                console.log('[MusicManager] Video ready:', video);

                this.isLoaded = true;
                this.isPrepared = true;

                this.callbacks.onVideoReady?.(video);
                this.callbacks.onLoadComplete?.();
            },

            onTextLoad: () => {
                console.log('[MusicManager] Text loaded.');
                this.callbacks.onTextLoad?.(this.player.video);
            },

            onPlay: () => {
                this.isUserPaused = false;
                console.log('[MusicManager] Playback started.');
                this.callbacks.onPlay?.();
            },

            onPause: () => {
                console.log('[MusicManager] Playback paused.');
                this.callbacks.onPause?.();
            },

            onTimeUpdate: position => {
                if (
                    typeof position !== 'number' ||
                    !Number.isFinite(position)
                ) {
                    return;
                }

                const duration = this.getDuration();
                const progress = duration > 0
                    ? Math.max(0, Math.min(position / duration, 1))
                    : 0;

                this.callbacks.onTimeUpdate?.(
                    position,
                    progress,
                    duration
                );
            }
        });
    }

    async prepareSong() {
        if (!this.player) {
            throw new Error('TextAlive Player is not initialized.');
        }

        if (!this.isAppReady) {
            throw new Error('TextAlive App is not ready yet.');
        }

        if (this.isPrepared && this.player.video) {
            return;
        }

        if (this.preparePromise) {
            return this.preparePromise;
        }

        this.isPreparing = true;
        this.preparePromise = this.prepareSongInternal();

        try {
            await this.preparePromise;
        } catch (error) {
            this.preparePromise = null;
            throw error;
        } finally {
            this.isPreparing = false;
        }
    }

    async prepareSongInternal() {
        const songUrl = 'https://piapro.jp/t/B3yJ';

        console.log('[MusicManager] Loading song:', songUrl);

        try {
            await this.player.createFromSongUrl(songUrl);
            await this.waitUntilSongLoaded();

            console.log('[MusicManager] Song preparation completed.');
        } catch (error) {
            this.isLoaded = false;
            this.isPrepared = false;

            console.error(
                '[MusicManager] Failed to prepare song:',
                error
            );

            throw error;
        }
    }

    waitUntilSongLoaded(timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const interval = setInterval(() => {
                if (
                    this.isLoaded &&
                    this.player &&
                    this.player.video
                ) {
                    clearInterval(interval);
                    resolve();
                    return;
                }

                if (Date.now() - startTime >= timeoutMs) {
                    clearInterval(interval);
                    reject(new Error('Song loading timed out.'));
                }
            }, 100);
        });
    }

    /**
     * 歌詞フレーズの一覧を player.video.phrases から取得する。
     *
     * IVideo.phrases は IPhrase[] の配列として直接アクセスできる。
     * firstPhrase からのリンクリスト走査は不要。
     *
     * @returns {IPhrase[]}
     */
    getLyricsPhrases() {
        const video = this.player?.video;

        if (!video) {
            console.warn('[MusicManager] video is not available.');
            return [];
        }

        // video.phrases の型と中身をログに出してデバッグする
        console.log('[MusicManager] video.phrases type:', typeof video.phrases);
        console.log('[MusicManager] video.phrases isArray:', Array.isArray(video.phrases));
        console.log('[MusicManager] video.phrases value:', video.phrases);
        console.log('[MusicManager] video.phraseCount:', video.phraseCount);
        console.log('[MusicManager] video.firstPhrase:', video.firstPhrase);

        // phrases が配列でない場合（独自のコレクション型など）も考慮して
        // phraseCount と getPhrase() による取得にフォールバックする
        if (Array.isArray(video.phrases) && video.phrases.length > 0) {
            console.log('[MusicManager] Phrase count (array):', video.phrases.length);
            return video.phrases;
        }

        // getPhrase(index) API でのフォールバック
        if (typeof video.phraseCount === 'number' && video.phraseCount > 0) {
            console.log('[MusicManager] Phrase count (getPhrase fallback):', video.phraseCount);
            const phrases = [];
            for (let i = 0; i < video.phraseCount; i++) {
                const p = video.getPhrase(i);
                if (p) {
                    phrases.push(p);
                }
            }
            return phrases;
        }

        console.warn('[MusicManager] No phrase data could be retrieved.');
        return [];
    }

    /**
     * 波形サンプルデータを返す。
     *
     * 歌詞フレーズが取得できている場合は、
     * フレーズ区間外のサンプルを 0 に置き換えることで
     * 「歌声のある部分だけ」が視覚的に浮かび上がる波形を生成する。
     *
     * フレーズ情報が取得できない場合は従来通り全区間を返す。
     *
     * @param {number} sampleCount - サンプル数（デフォルト 700）
     * @returns {number[] | null}
     */
    getWaveformData(sampleCount = 700) {
        if (
            !this.player ||
            !this.player.video ||
            !this.isVocalAmplitudeLoaded
        ) {
            console.warn(
                '[Waveform] Player, video, or amplitude data is not ready.'
            );
            return null;
        }

        const duration     = this.getDuration();
        const maxAmplitude = this.player.getMaxVocalAmplitude();

        console.log('[Waveform] Duration:', duration);
        console.log('[Waveform] Max amplitude:', maxAmplitude);

        if (
            duration <= 0 ||
            !Number.isFinite(maxAmplitude) ||
            maxAmplitude <= 0
        ) {
            console.warn('[Waveform] Invalid duration or maximum amplitude.');
            return null;
        }

        // 歌詞フレーズ一覧を取得する。
        // 空の場合はフレーズ情報なしとみなし、全区間を有効として扱う。
        const phrases      = this.getLyricsPhrases();
        const hasPhraseData = phrases.length > 0;

        if (hasPhraseData) {
            console.log('[Waveform] Applying lyrics phrase mask.');
        } else {
            console.warn(
                '[Waveform] No phrase data available. Using full waveform.'
            );
        }

        const values = [];

        for (let i = 0; i < sampleCount; i++) {
            const time = (i / (sampleCount - 1)) * duration;

            // 歌詞区間マスク：
            // IPhrase.contains(time) を使っていずれかのフレーズ区間に
            // 含まれない時刻の振幅を 0 にする
            if (hasPhraseData && !phrases.some(p => p.contains(time))) {
                values.push(0);
                continue;
            }

            try {
                const amplitude = this.player.getVocalAmplitude(time);

                if (!Number.isFinite(amplitude)) {
                    console.warn(
                        '[Waveform] Invalid amplitude at:',
                        time,
                        amplitude
                    );
                    return null;
                }

                values.push(
                    Math.max(0, Math.min(amplitude / maxAmplitude, 1))
                );
            } catch (error) {
                console.error(
                    '[Waveform] Failed to sample amplitude:',
                    time,
                    error
                );
                return null;
            }
        }

        // ── スムージング（移動平均）──────────────────────────────
        // 隣接サンプル間の急激な変化を緩和する。
        // ただし 0 のサンプル（歌詞なし区間）は平均に含めない。
        // これにより歌詞区間の境界がぼやけず、区間内だけが滑らかになる。
        const smoothed = new Array(values.length);
        const halfWindow = 4; // 前後 4 サンプル（計9点）で平均

        for (let i = 0; i < values.length; i++) {
            // 歌詞なし区間（0）はそのまま
            if (values[i] === 0) {
                smoothed[i] = 0;
                continue;
            }

            let sum   = 0;
            let count = 0;

            for (let j = i - halfWindow; j <= i + halfWindow; j++) {
                if (j < 0 || j >= values.length) {
                    continue;
                }

                // 歌詞なし区間のサンプルは平均に含めない
                if (values[j] === 0) {
                    continue;
                }

                sum += values[j];
                count++;
            }

            smoothed[i] = count > 0 ? sum / count : 0;
        }

        console.log('[Waveform] Sample count:', smoothed.length);
        console.log('[Waveform] First samples:', smoothed.slice(0, 10));

        return smoothed;
    }

    async startPreparedSong() {
        if (!this.player) {
            throw new Error('TextAlive Player is not initialized.');
        }

        if (!this.isPrepared) {
            await this.prepareSong();
        }

        await this.player.requestPlay();
    }

    requestPlay() {
        if (!this.player) {
            return;
        }

        return this.player.requestPlay();
    }

    requestPauseByUser() {
        if (!this.player) {
            return;
        }

        this.isUserPaused = true;
        return this.player.requestPause();
    }

    seekTo(position) {
        if (
            !this.player ||
            typeof position !== 'number' ||
            !Number.isFinite(position)
        ) {
            return;
        }

        const duration = this.getDuration();
        const target = Math.max(
            0,
            Math.min(position, duration > 0 ? duration : position)
        );

        this.callbacks.onSeek?.(target);
        this.player.requestMediaSeek(target);
    }

    getPosition() {
        const position =
            this.player?.timer?.position ??
            this.player?.mediaPosition ??
            0;

        return Number.isFinite(position) ? position : 0;
    }

    getDuration() {
        const duration = this.player?.video?.duration ?? 0;
        return Number.isFinite(duration) ? duration : 0;
    }

    async startAndPlay() {
        await this.prepareSong();
        await this.startPreparedSong();
    }

    getCurrentTime() {
        return this.getPosition();
    }
}