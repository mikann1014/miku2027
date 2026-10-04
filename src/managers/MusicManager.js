import { Player } from 'textalive-app-api';

export class MusicManager {
    constructor(appToken, mediaElementSelector) {
        this.appToken = appToken || '';
        this.mediaElementSelector =
            mediaElementSelector || '#media';

        this.player = null;

        this.isAppReady = false;
        this.isLoaded = false;
        this.isPrepared = false;
        this.isPreparing = false;
        this.isUserPaused = false;

        this.preparePromise = null;
        this.callbacks = {};
    }

    init(callbacks = {}) {
        this.callbacks = callbacks;

        let mediaElement =
            document.querySelector(
                this.mediaElementSelector
            );

        if (!mediaElement) {
            mediaElement =
                document.createElement('div');

            mediaElement.id =
                this.mediaElementSelector.replace(
                    '#',
                    ''
                );

            document.body.appendChild(
                mediaElement
            );
        }

        this.player = new Player({
            app: {
                token: this.appToken
            },

            mediaElement,

            mediaBannerPosition: 'bottom right',

            valenceArousalEnabled: false,
            vocalAmplitudeEnabled: false,
            mediaAutoplay: false
        });

        this.player.addListener({
            onAppReady: app => {
                this.isAppReady = true;

                console.log(
                    '[MusicManager] App ready:',
                    app
                );

                this.callbacks.onAppReady?.(
                    app
                );
            },

            onSongLoad: song => {
                console.log(
                    '[MusicManager] Song loaded:',
                    song
                );
            },

            onVideoReady: video => {
                console.log(
                    '[MusicManager] Video ready:',
                    video
                );

                this.isLoaded = true;
                this.isPrepared = true;

                this.callbacks.onVideoReady?.(
                    video
                );

                this.callbacks.onLoadComplete?.();
            },

            onTextLoad: () => {
                console.log(
                    '[MusicManager] Text loaded.'
                );

                this.callbacks.onTextLoad?.(
                    this.player.video
                );
            },

            onPlay: () => {
                this.isUserPaused = false;

                console.log(
                    '[MusicManager] Playback started.'
                );
            },

            onPause: () => {
                console.log(
                    '[MusicManager] Playback paused.'
                );
            },

            onTimeUpdate: position => {
                if (
                    typeof position !== 'number' ||
                    !Number.isFinite(position)
                ) {
                    return;
                }

                if (
                    !this.player ||
                    !this.player.video
                ) {
                    return;
                }

                const rawDuration =
                    this.player.video.duration;

                const duration =
                    typeof rawDuration === 'number' &&
                    Number.isFinite(rawDuration) &&
                    rawDuration > 0
                        ? rawDuration
                        : 1;

                const progress =
                    Math.max(
                        0,
                        Math.min(
                            position / duration,
                            1
                        )
                    );

                let isChorus = false;
                let currentWord = null;

                try {
                    isChorus =
                        !!this.player.findChorus(
                            position
                        );
                } catch {}

                try {
                    currentWord =
                        this.player.findWord(
                            position
                        );
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

    async prepareSong() {
        if (!this.player) {
            throw new Error(
                'TextAlive Player is not initialized.'
            );
        }

        if (!this.isAppReady) {
            throw new Error(
                'TextAlive App is not ready yet.'
            );
        }

        if (this.isPrepared) {
            return;
        }

        if (this.preparePromise) {
            return this.preparePromise;
        }

        this.isPreparing = true;

        this.preparePromise =
            this.prepareSongInternal();

        try {
            await this.preparePromise;
        } finally {
            this.isPreparing = false;
        }
    }

    async prepareSongInternal() {
        const songUrl =
            'https://piapro.jp/t/B3yJ';

        console.log(
            '[MusicManager] Loading song:',
            songUrl
        );

        try {
            await this.player.createFromSongUrl(
                songUrl
            );

            await this.waitUntilSongLoaded();

            console.log(
                '[MusicManager] Song preparation completed.'
            );
        } catch (error) {
            this.isLoaded = false;
            this.isPrepared = false;
            this.preparePromise = null;

            console.error(
                '[MusicManager] Failed to prepare song:',
                error
            );

            throw error;
        }
    }

    waitUntilSongLoaded(timeoutMs = 30000) {
        return new Promise(
            (resolve, reject) => {
                const startTime =
                    Date.now();

                const interval =
                    setInterval(() => {
                        if (
                            this.isLoaded &&
                            this.player &&
                            this.player.video
                        ) {
                            clearInterval(
                                interval
                            );

                            resolve();
                            return;
                        }

                        if (
                            Date.now() - startTime >=
                            timeoutMs
                        ) {
                            clearInterval(
                                interval
                            );

                            reject(
                                new Error(
                                    'Song loading timed out.'
                                )
                            );
                        }
                    }, 50);
            }
        );
    }

    async startPreparedSong() {
        if (!this.player) {
            throw new Error(
                'TextAlive Player is not initialized.'
            );
        }

        if (!this.isPrepared) {
            await this.prepareSong();
        }

        try {
            await this.player.requestPlay();
        } catch (error) {
            if (error?.name === 'AbortError') {
                await new Promise(resolve => {
                    setTimeout(
                        resolve,
                        300
                    );
                });

                await this.player.requestPlay();

                return;
            }

            throw error;
        }
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
        if (!this.player) {
            return;
        }

        if (
            typeof position !== 'number' ||
            !Number.isFinite(position)
        ) {
            return;
        }

        const duration =
            this.getDuration();

        const target =
            Math.max(
                0,
                Math.min(
                    position,
                    duration > 0
                        ? duration
                        : position
                )
            );

        this.callbacks.onSeek?.(
            target
        );

        try {
            this.player.requestMediaSeek(
                target
            );
        } catch {}
    }

    getPosition() {
        const position =
            this.player?.timer?.position ??
            this.player?.mediaPosition ??
            0;

        return (
            typeof position === 'number' &&
            Number.isFinite(position)
        )
            ? position
            : 0;
    }

    getDuration() {
        const duration =
            this.player?.video?.duration;

        return (
            typeof duration === 'number' &&
            Number.isFinite(duration)
        )
            ? duration
            : 0;
    }

    async startAndPlay() {
        await this.prepareSong();
        await this.startPreparedSong();
    }

    getCurrentTime() {
        return this.getPosition();
    }
}