import { Player } from 'textalive-app-api';

export class MusicManager {
    constructor(appToken, mediaElementSelector) {
        this.appToken = appToken || '';
        this.mediaElementSelector = mediaElementSelector || '#media';

        this.player = null;

        this.isAppReady = false;
        this.isLoaded = false;
        this.isPrepared = false;
        this.isPreparing = false;
        this.isUserPaused = false;

        this.preparePromise = null;

        this.callbacks = {};
    }

    init(callbacks) {
        this.callbacks = callbacks || {};

        let audioElement =
            document.querySelector(
                this.mediaElementSelector
            );

        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = this.mediaElementSelector.replace('#', '');
            audioElement.controls = false;
            audioElement.style.position = 'absolute';
            audioElement.style.opacity = '0';
            audioElement.style.pointerEvents = 'none';
            document.body.appendChild(audioElement);
        }

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

        this.player.addListener({
            onAppReady: () => {
                console.log('[MusicManager] App Ready');

                this.isAppReady = true;

                this.callbacks.onAppReady?.();
            },

            onSongLoad: song => {
                const songTitle =
                    song && typeof song.title === 'string'
                        ? song.title
                        : 'Success';

                console.log(
                    '[MusicManager] Song loaded:',
                    songTitle
                );

                this.isLoaded = true;
            },

            onVideoReady: video => {
                console.log(
                    '[MusicManager] Video Ready:',
                    video ? video.title : ''
                );

                this.callbacks.onVideoReady?.(video);
            },

            onTextLoad: () => {
                console.log('[MusicManager] Lyrics loaded');

                this.callbacks.onTextLoad?.(
                    this.player.video
                );
            },

            onPlay: () => {
                console.log('[MusicManager] Playback started');

                this.isUserPaused = false;
            },

            onPause: () => {
                console.log('[MusicManager] Playback paused');
            },

            onTimeUpdate: position => {
                if (
                    typeof position !== 'number' ||
                    !Number.isFinite(position)
                ) {
                    return;
                }

                if (!this.player || !this.player.video) {
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

                try {
                    isChorus = !!this.player.findChorus(position);
                } catch {}

                let currentWord = null;

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

    async prepareSong() {
        if (!this.player) {
            console.warn('[MusicManager] prepareSong ignored: player is null.');
            return;
        }

        if (!this.isAppReady) {
            console.warn('[MusicManager] prepareSong ignored: app is not ready.');
            return;
        }

        if (this.isPrepared) {
            console.log('[MusicManager] Song already prepared.');
            return;
        }

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

    async prepareSongInternal() {
        const hideAbortError = event => {
            if (
                event.reason &&
                event.reason.name === 'AbortError'
            ) {
                console.log(
                    '[MusicManager] Muted internal browser AbortError safely.'
                );

                event.preventDefault();
            }
        };

        window.addEventListener(
            'unhandledrejection',
            hideAbortError
        );

        try {
            console.log('[MusicManager] Preparing song URL...');

            await this.player.createFromSongUrl(
                'https://piapro.jp/t/B3yJ/20251215061727'
            );

            await this.waitUntilSongLoaded();

            await new Promise(resolve => {
                setTimeout(resolve, 250);
            });

            this.isPrepared = true;

            this.callbacks.onLoadComplete?.();

            console.log(
                '[MusicManager] Song prepared. Waiting for user start.'
            );
        } catch (error) {
            console.error(
                '[MusicManager] Song preparation failed:',
                error
            );

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

    async startPreparedSong() {
        if (!this.player) {
            console.warn('[MusicManager] startPreparedSong ignored: player is null.');
            return;
        }

        if (!this.isPrepared) {
            console.log('[MusicManager] Song not prepared. Preparing first.');
            await this.prepareSong();
        }

        console.log('[MusicManager] Requesting play...');

        try {
            await this.player.requestPlay();

            console.log('[MusicManager] requestPlay success');
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(
                    '[MusicManager] requestPlay interrupted. Retrying in 300ms...'
                );

                await new Promise(resolve => {
                    setTimeout(resolve, 300);
                });

                await this.player.requestPlay();

                console.log('[MusicManager] Retry requestPlay success');
                return;
            }

            console.error(
                '[MusicManager] requestPlay failed:',
                error
            );

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

    seekTo(position) {
        if (!this.player) return;

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
                    duration > 0 ? duration : position
                )
            );

        this.callbacks.onSeek?.(target);

        try {
            this.player.requestMediaSeek(target);
        } catch (error) {
            console.warn(
                '[MusicManager] seekTo failed:',
                error
            );
        }
    }

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

    getDuration() {
        const duration =
            this.player?.video?.duration;

        return typeof duration === 'number' &&
            Number.isFinite(duration)
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
