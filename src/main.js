import { ASSETS } from './appState.js';

import { WorldRenderer } from './core/WorldRenderer.js';
import { MusicManager } from './managers/MusicManager.js';
import { UIManager } from './ui/UIManager.js';
import { MotionDirector } from './motion/MotionDirector.js';
import { ExperiencePhaseDirector } from './experience/ExperiencePhaseDirector.js';
import { DevPlaybackPanel } from './debug/DevPlaybackPanel.js';

import { normalizeLyricText } from './motion/LyricUtils.js';
const APP_TOKEN = 'mq3mY1ymOq67ss5i';

/**
 * Application
 *
 * ・アプリケーション全体のシステム（レンダリング・音楽・UI・演出）の統合管理 * ・アプリケーション全体のエントリーポイント
 *
 * 主な機能：
 * ・World / Music / UI / Motion / Experience の初期化
 * ・入力イベントの管理
 * ・再生開始フロー（タイトル → イントロ → 再生）
 * ・歌詞・ビート・タイムライン同期の制御
 * ・フレーム更新（アニメーションループ）
 *
 * 役割：
 * 全てのサブシステムの「起点」となり、
 * ゲームの進行状態と各モジュールを統合する
 */


class Application {
    constructor() {
        console.log('[Main] Initializing Application...');

        this.worldRenderer =
            new WorldRenderer();

        this.musicManager =
            new MusicManager(
                APP_TOKEN,
                '#media'
            );

        this.ui =
            new UIManager(
                () => this.handleTitleConnect(),
                () => this.handleIntroStart()
            );

        this.motionDirector =
            new MotionDirector(
                this.worldRenderer,
                this.ui
            );

        this.experienceDirector =
            new ExperiencePhaseDirector(
                this.worldRenderer,
                this.ui
            );

        this.devPlaybackPanel = null;
        this.enableDevSeek =
    new URLSearchParams(window.location.search)
        .get('debug') === '1';

        this.currentSelectedItemId = 'flower1';

        this.isAssetsLoaded = false;
        this.isMusicLoadStarted = false;
        this.isMusicPrepared = false;
        this.isPlayingStarted = false;

        this.ignoreNextSceneClick = false;

        this.lastTimeUpdatePosition = null;
        this.seekJumpThresholdMs = 2500;

        this._beatStrength = 0;

        // =========================
        // Final ending trigger guard
        // =========================
        this.hasFinalEndingStarted = false;

        this.initInputListeners();
    }

    init() {
        this.musicManager.init({
            onAppReady: () => {
                console.log('[Main] TextAlive App Ready.');
            },

            onVideoReady: () => {
                console.log('[Main] Video Ready!');

                this.ui.hideStatus();

                if (this.musicManager.player) {
                    this.worldRenderer.setPlayer(
                        this.musicManager.player
                    );
                }

                if (
                    this.enableDevSeek &&
                    !this.devPlaybackPanel
                ) {
                    this.devPlaybackPanel =
                        new DevPlaybackPanel(
                            this.musicManager
                        );
                }
            },

            onTextLoad: () => {
                console.log('[Main] Text loaded.');
            },

            onLoadComplete: () => {
                console.log('[Main] Music load complete.');

                this.isMusicPrepared = true;
            },

            onSeek: position => {
                this.syncTimelineToPosition(
                    position
                );
            },

            onTimeUpdate: (
                position,
                progress,
                isChorus,
                currentWord
            ) => {
                this.handleTimeUpdate(
                    position,
                    progress,
                    isChorus,
                    currentWord
                );
            }
        });

        this.preloadAssets();
        this.animate();
    }

    initInputListeners() {
        const menu =
            document.querySelector('#item-menu');

        if (menu) {
            menu.addEventListener(
                'click',
                event => {
                    const button =
                        event.target.closest('button');

                    if (!button) {
                        return;
                    }

                    menu.querySelectorAll('button').forEach(target => {
                        target.classList.remove('active');
                    });

                    button.classList.add('active');

                    const newId =
                        button.getAttribute('data-id');

                    if (!newId) {
                        console.warn('[Main] Button has no data-id.');
                        return;
                    }

                    this.currentSelectedItemId =
                        newId;

                    console.log(
                        '[Main] ID Updated to:',
                        this.currentSelectedItemId
                    );

                    event.stopPropagation();
                },
                true
            );
        }

        window.addEventListener('click', event => {
            if (this.ignoreNextSceneClick) {
                return;
            }

            if (!this.isPlayingStarted) {
                return;
            }

            if (!this.isAssetsLoaded) {
                return;
            }

            if (event.target.closest('#item-menu')) {
                return;
            }

            if (event.target.closest('#opening-root')) {
                return;
            }

            if (event.target.closest('#dev-playback-panel')) {
                return;
            }

            if (window.__cameraDragged) {
                return;
            }

            const interactionConsumed =
                this.worldRenderer?.handleWorldInteraction
                    ? this.worldRenderer.handleWorldInteraction(event)
                    : false;

            if (interactionConsumed) {
                return;
            }

            if (!this.worldRenderer?.isPlacementEnabled) {
                return;
            }

            if (
                this.experienceDirector &&
                !this.experienceDirector.canPlaceAnything() &&
                !this.experienceDirector.canPlaceFlowers()
            ) {
                return;
            }

            if (
                this.currentSelectedItemId === 'Leaf' &&
                this.experienceDirector &&
                !this.experienceDirector.canPlaceLeaf()
            ) {
                return;
            }

            if (this.worldRenderer?.handlePlaceItem) {
                this.worldRenderer.handlePlaceItem(
                    event,
                    this.currentSelectedItemId
                );
            }
        });
    }

    async handleTitleConnect() {
        if (this.isMusicLoadStarted) {
            this.ui.showIntroScreen();
            return;
        }

        this.ignoreNextSceneClick = true;
        this.isMusicLoadStarted = true;

        console.log('[Main] Title connected. Preparing only.');

        this.ui.showLoading('CONNECTING TO MUSIC...');

        this.musicManager.prepareSong()
            .then(() => {
                this.isMusicPrepared = true;

                console.log('[Main] Music prepared.');
            })
            .catch(error => {
                console.error(
                    '[Main] Music preparation failed:',
                    error
                );

                this.ui.showLoading('MUSIC LOAD ERROR');
            });

        setTimeout(() => {
            this.ui.hideStatus();
            this.ui.showIntroScreen();

            this.ignoreNextSceneClick = false;
        }, 900);
    }

    async handleIntroStart() {
        if (this.isPlayingStarted) {
            return;
        }

        this.ignoreNextSceneClick = true;

        console.log('[Main] Intro start. Playback begins now.');

        this.ui.showLoading('STARTING MUSIC...');

        try {
            await this.musicManager.startPreparedSong();

            this.isPlayingStarted = true;

            this.ui.hideStatus();
            this.ui.hideOpeningScreens();

            if (this.musicManager.player) {
                this.worldRenderer.setPlayer(
                    this.musicManager.player
                );
            }

// ✅ ★ここが最重要（これを追加）
const currentTime = this.musicManager.getPosition();

this.worldRenderer.lyricsManager.setEnabled(
    true,
    currentTime
);

        } catch (error) {
            console.error(
                '[Main] Failed to start prepared song:',
                error
            );

            this.ui.showLoading('PLAYBACK ERROR');

            this.isPlayingStarted = false;
        }

        setTimeout(() => {
            this.ignoreNextSceneClick = false;
        }, 300);
    }

    async preloadAssets() {
        try {
            this.ui.showLoading('LOADING WORLD...');

            await this.worldRenderer.loadModels(
                ASSETS
            );

            this.isAssetsLoaded = true;

            this.ui.hideStatus();

            console.log(
                '[Main] All assets loaded:',
                ASSETS
            );
        } catch (error) {
            console.error(
                '[Main] Asset preload failed:',
                error
            );

            this.ui.showLoading('LOAD ERROR');
        }
    }

    handleTimeUpdate(
        position,
        progress,
        isChorus,
        currentWord = null
    ) {
        if (!this.isPlayingStarted) {
            return;
        }

        const player =
            this.musicManager.player;

        if (!player || !player.video) {
            return;
        }

        this.syncTimelineIfJumped(
            position,
            progress,
            currentWord
        );

        this.updateBeatMetrics(
            player,
            position,
            isChorus
        );

        const phrase =
            this.findCurrentPhrase(
                player,
                position
            );

        const phraseText =
            phrase?.text || '';

        const wordText =
            currentWord?.text || '';

        const normalizedPhrase =
            normalizeLyricText(
                phraseText
            );

        const normalizedWord =
            normalizeLyricText(
                wordText
            );

        const context = {
            position,
            progress,
            phrase,
            currentWord,
            phraseText,
            wordText,
            normalizedPhrase,
            normalizedWord
        };

        if (phrase) {
            console.log(
                'PHRASE DETECTED:',
                phrase.text
            );
        }

        // =========================
        // ✅ 最終エンディング開始
        // =========================
        if (
            !this.hasFinalEndingStarted &&
            (
                normalizedPhrase.includes('君は光の中で歌った') ||
                normalizedPhrase.includes('このセカイで最後のオンガクになるから')
            )
        ) {
            this.hasFinalEndingStarted = true;

            console.log(
                '[Main] Final ending trigger matched:',
                phraseText
            );

            this.worldRenderer
                ?.startFinalEndingSequenceFromPhrase
                ?.();

            this.lastTimeUpdatePosition =
                position;

            return;
        }

        this.addPhraseIfNeeded(
            phrase,
            position
        );

        if (this.motionDirector) {
            this.motionDirector.update(
                position,
                phrase,
                currentWord
            );
        }

        if (this.experienceDirector) {
            this.experienceDirector.update(
                context
            );
        }

        this.lastTimeUpdatePosition =
            position;
    }

    syncTimelineIfJumped(
        position,
        progress,
        currentWord
    ) {
        if (
            typeof this.lastTimeUpdatePosition !== 'number'
        ) {
            this.lastTimeUpdatePosition =
                position;
            return;
        }

        const diff =
            Math.abs(
                position - this.lastTimeUpdatePosition
            );

        if (diff < this.seekJumpThresholdMs) {
            return;
        }

        this.syncTimelineToPosition(
            position,
            progress,
            currentWord
        );
    }

    syncTimelineToPosition(
        position,
        progress = null,
        currentWord = null
    ) {
        const player =
            this.musicManager.player;

        if (
            !player ||
            !player.video ||
            !this.motionDirector
        ) {
            return;
        }

        const duration =
            this.musicManager.getDuration();

        const resolvedProgress =
            typeof progress === 'number' &&
            Number.isFinite(progress)
                ? progress
                : (
                    duration > 0
                        ? Math.max(
                            0,
                            Math.min(
                                position / duration,
                                1
                            )
                        )
                        : 0
                );

        this.motionDirector.syncToPosition({
            position,
            progress: resolvedProgress,
            player,
            currentWord
        });

        this.lastTimeUpdatePosition =
            position;
    }

    updateBeatMetrics(player, position, isChorus) {
        let beat = null;

        try {
            beat =
                player.findBeat(
                    position
                );
        } catch {}

        if (beat && this.worldRenderer.environment) {
            const duration =
                beat.duration > 0
                    ? beat.duration
                    : 1;

            const beatProgress =
                (position - beat.startTime) / duration;

            this.worldRenderer.environment.updateBeatMetrics(
                beatProgress,
                isChorus,
                position
            );
        }
    }

    findCurrentPhrase(player, position) {
        try {
            return player.video.findPhrase(
                position
            );
        } catch {
            return null;
        }
    }

    addPhraseIfNeeded(phrase, position) {
        if (
            !phrase ||
            !phrase.text ||
            phrase.text.trim() === '' ||
            phrase._generated
        ) {
            return;
        }

        console.log('ADDING:', phrase.text);

        const mikuPosition =
            this.worldRenderer.miku?.model?.position ||
            { x: 0, y: 0, z: 0 };

        this.worldRenderer.lyricsManager.addPhrase(
            phrase,
            position,
            mikuPosition,
            this.worldRenderer.camera
        );

        phrase._generated = true;
    }

    animate() {
        requestAnimationFrame(() => {
            this.animate();
        });

        const player =
            this.musicManager.player;

        if (
            this.isPlayingStarted &&
            player &&
            player.timer
        ) {
            const time =
                player.timer.position;

            try {
                const beatObject =
                    player.findBeat(
                        time
                    );

                this._beatStrength =
                    beatObject
                        ? 1.0
                        : this._beatStrength * 0.85;
            } catch {
                this._beatStrength *= 0.85;
            }
        } else {
            this._beatStrength *= 0.85;
        }

        this.worldRenderer?.update(
            this.musicManager.player,
            this._beatStrength
        );
    }
}

function startApplication() {
    const app =
        new Application();

    window.appInstance =
        app;

    app.init();
}

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        startApplication
    );
} else {
    startApplication();
}