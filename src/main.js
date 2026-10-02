import { MusicManager } from './managers/MusicManager.js';
import { UIManager } from './ui/UIManager.js';

const APP_TOKEN = 'mq3mY1ymOq67ss5i';


class Application {
    constructor() {
        console.log('[Main] Initializing Application...');

        // ========================================
        // 音楽
        // ========================================

        this.musicManager = new MusicManager(
            APP_TOKEN,
            '#media'
        );

        // ========================================
        // UI
        // ========================================

        this.ui = new UIManager(
            () => this.handleTitleConnect(),
            () => this.handleIntroStart()
        );

        // ========================================
        // 状態
        // ========================================

        this.isMusicLoadStarted = false;
        this.isPlayingStarted = false;
    }


    // ========================================
    // 初期化
    // ========================================

    init() {
        this.musicManager.init({

            // ------------------------------------
            // TextAlive準備完了
            // ------------------------------------

            onAppReady: () => {
                console.log(
                    '[Main] TextAlive App Ready.'
                );
            },


            // ------------------------------------
            // 動画・楽曲情報準備完了
            // ------------------------------------

            onVideoReady: () => {
                console.log(
                    '[Main] Video Ready.'
                );

                this.ui.hideStatus();
            },


            // ------------------------------------
            // 歌詞読み込み
            // 今回は使用しない
            // ------------------------------------

            onTextLoad: () => {
                console.log(
                    '[Main] Text loaded.'
                );
            },


            // ------------------------------------
            // 楽曲読み込み完了
            // ------------------------------------

            onLoadComplete: () => {
                console.log(
                    '[Main] Music load complete.'
                );
            },


            // ------------------------------------
            // シーク
            // 今回は使用しない
            // ------------------------------------

            onSeek: () => {},


            // ------------------------------------
            // 時間更新
            // 今回は使用しない
            // ------------------------------------

            onTimeUpdate: () => {}
        });
    }


    // ========================================
    // 1画面目
    //
    // 「クリックして接続」
    // ========================================

    async handleTitleConnect() {
        // すでに読み込み開始済みなら
        // 説明画面へ進む
        if (this.isMusicLoadStarted) {
            this.ui.showIntroScreen();
            return;
        }

        this.isMusicLoadStarted = true;

        this.ui.showLoading(
            'CONNECTING TO MUSIC...'
        );

        try {
            // ------------------------------------
            // 楽曲準備
            // ------------------------------------

            await this.musicManager.prepareSong();

            console.log(
                '[Main] Music prepared.'
            );

            // ------------------------------------
            // 説明画面へ
            // ------------------------------------

            this.ui.hideStatus();

            this.ui.showIntroScreen();

        } catch (error) {
            console.error(
                '[Main] Music preparation error:',
                error
            );

            this.isMusicLoadStarted = false;

            this.ui.showLoading(
                'MUSIC LOAD ERROR'
            );
        }
    }


    // ========================================
    // 2画面目
    //
    // 「クリックして歌を聴く」
    // ========================================

    async handleIntroStart() {
        // 二重再生防止
        if (this.isPlayingStarted) {
            return;
        }

        this.ui.showLoading(
            'STARTING MUSIC...'
        );

        try {
            // ------------------------------------
            // 楽曲再生
            // ------------------------------------

            await this.musicManager.startPreparedSong();

            this.isPlayingStarted = true;

            // ------------------------------------
            // オープニング終了
            // ------------------------------------

            this.ui.hideStatus();

            this.ui.hideOpeningScreens();

            console.log(
                '[Main] Music started.'
            );

        } catch (error) {
            console.error(
                '[Main] Playback error:',
                error
            );

            this.ui.showLoading(
                'PLAYBACK ERROR'
            );

            this.isPlayingStarted = false;
        }
    }
}


// ========================================
// アプリケーション起動
// ========================================

const app = new Application();

app.init();