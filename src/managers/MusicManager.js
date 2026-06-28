import { Player } from 'textalive-app-api';

/**
 * MusicManager
 *
 * ・TextAlive Player のラッパークラス
 * ・楽曲のロード / 再生 / シーク / 解析（歌詞・コーラス）を管理
 *
 * フロー：
 *   init → prepareSong → startPreparedSong → update
 */
export class MusicManager {

    constructor(appToken, mediaElementSelector) {

        this.appToken = appToken || '';
        this.mediaElementSelector = mediaElementSelector || '#media';

        this.player = null;

        // --- 状態 ---
        this.isAppReady = false;
        this.isLoaded = false;
        this.isPrepared = false;
        this.isPreparing = false;
        this.isUserPaused = false;

        this.preparePromise = null;

        // コールバック
        this.callbacks = {};
    }


    /**
     * 初期化
     */
    init(callbacks) {

        this.callbacks = callbacks || {};

        // --- audio要素取得 or 生成 ---
        let audioElement =
            document.querySelector(this.mediaElementSelector);

        if (!audioElement) {
            audioElement = document.createElement('audio');

            audioElement.id = this.mediaElementSelector.replace('#', '');
            audioElement.controls = false;

            // 見えないようにする
            audioElement.style.position = 'absolute';
            audioElement.style.opacity = '0';
            audioElement.style.pointerEvents = 'none';

            document.body.appendChild(audioElement);
        }

        // --- Player生成 ---
        this.player = new Player({
            app: {
                token: this.appToken
            },
            mediaElement: audioElement,
            mediaBannerPosition: 'bottom right',
            valenceArousalEnabled: false,
            vocalAmplitudeEnabled: false,
            mediaAutoplay: false
        });

        // --- イベント登録 ---
        this.player.addListener({

            onAppReady: () => {
                this.isAppReady = true;
                this.callbacks.onAppReady?.();
            },

            onSongLoad: song => {
                this.isLoaded = true;
            },

            onVideoReady: video => {
                this.callbacks.onVideoReady?.(video);
            },

            onTextLoad: () => {
                this.callbacks.onTextLoad?.(
                    this.player.video
                );
            },

            onPlay: () => {
                this.isUserPaused = false;
            },

            onPause: () => {},

            /**
             * 時間更新（最重要）
             */
            onTimeUpdate: position => {

                if (
                    typeof position !== 'number' ||
                    !Number.isFinite(position)
                ) return;

                if (!this.player || !this.player.video) return;

                const rawDuration =
                    this.player.video.duration;

                const duration =
                    typeof rawDuration === 'number' &&
                    Number.isFinite(rawDuration) &&
                    rawDuration > 0
                        ? rawDuration
                        : 1;

                // 進行率（0〜1）
                const progress =
                    Math.max(
                        0,
                        Math.min(position / duration, 1)
                    );

                let isChorus = false;
                let currentWord = null;

                // コーラス判定
                try {
                    isChorus = !!this.player.findChorus(position);
                } catch {}

                // 単語取得
                try {
                    currentWord = this.player.findWord(position);
                } catch {}

                this.callbacks.onTimeUpdate?.(
                    position,
                    progress,
                    isChorus,
                    currentWord
                );
            }
        });
    }


    /**
     * 楽曲準備
     */
    async prepareSong() {

        if (!this.player) return;
        if (!this.isAppReady) return;

        if (this.isPrepared) return;

        if (this.preparePromise) {
            return this.preparePromise;
        }

        this.isPreparing = true;
        this.preparePromise = this.prepareSongInternal();

        try {
            await this.preparePromise;
        } finally {
            this.isPreparing = false;
        }
    }


    /**
     * 内部準備処理
     */
    async prepareSongInternal() {

        // AbortErrorを無視
        const hideAbortError = event => {

            if (
                event.reason &&
                event.reason.name === 'AbortError'
            ) {
                event.preventDefault();
            }
        };

        window.addEventListener(
            'unhandledrejection',
            hideAbortError
        );

        try {
            // 楽曲ロード
            await this.player.createFromSongUrl(
                'https://piapro.jp/t/B3yJ/20251215061727'
            );

            await this.waitUntilSongLoaded();

            // 少し待つ（安定化）
            await new Promise(resolve => {
                setTimeout(resolve, 250);
            });

            this.isPrepared = true;

            this.callbacks.onLoadComplete?.();

        } catch (error) {

            this.isPrepared = false;
            this.preparePromise = null;

            throw error;

        } finally {

            setTimeout(() => {
                window.removeEventListener(
                    'unhandledrejection',
                    hideAbortError
                );
            }, 1000);
        }
    }


    /**
     * ロード待機
     */
    waitUntilSongLoaded() {

        return new Promise(resolve => {

            const interval = setInterval(() => {

                if (
                    this.isLoaded &&
                    this.player &&
                    this.player.video
                ) {
                    clearInterval(interval);
                    resolve();
                }

            }, 50);
        });
    }


    /**
     * 再生開始
     */
    async startPreparedSong() {

        if (!this.player) return;

        if (!this.isPrepared) {
            await this.prepareSong();
        }

        try {

            await this.player.requestPlay();

        } catch (error) {

            if (error.name === 'AbortError') {

                // リトライ
                await new Promise(resolve => {
                    setTimeout(resolve, 300);
                });

                await this.player.requestPlay();

                return;
            }

            throw error;
        }
    }


    requestPlay() {
        if (!this.player) return;
        this.player.requestPlay();
    }

    requestPauseByUser() {
        if (!this.player) return;

        this.isUserPaused = true;
        this.player.requestPause();
    }


    /**
     * シーク
     */
    seekTo(position) {

        if (!this.player) return;

        if (
            typeof position !== 'number' ||
            !Number.isFinite(position)
        ) return;

        const duration = this.getDuration();

        const target =
            Math.max(
                0,
                Math.min(
                    position,
                    duration > 0 ? duration : position
                )
            );

        this.callbacks.onSeek?.(target);

        try {
            this.player.requestMediaSeek(target);
        } catch {}
    }


    /**
     * 再生位置取得
     */
    getPosition() {

        const position =
            this.player?.timer?.position ??
            this.player?.mediaPosition ??
            0;

        return typeof position === 'number' &&
            Number.isFinite(position)
            ? position
            : 0;
    }


    /**
     * 再生時間取得
     */
    getDuration() {

        const duration =
            this.player?.video?.duration;

        return typeof duration === 'number' &&
            Number.isFinite(duration)
            ? duration
            : 0;
    }


    /**
     * フル開始
     */
    async startAndPlay() {

        await this.prepareSong();
        await this.startPreparedSong();
    }


    /**
     * 現在時間（別名）
     */
    getCurrentTime() {
        return this.getPosition();
    }
}