export class UIManager {
    constructor(
        onTitleConnectCallback,
        onIntroStartCallback
    ) {
        // ========================================
        // DOM取得
        // ========================================

        this.statusText =
            document.querySelector('#status');

        this.openingRoot =
            document.querySelector('#opening-root');

        this.titleScreen =
            document.querySelector('#screen-title');

        this.introScreen =
            document.querySelector('#screen-intro');

        this.titleConnectButton =
            document.querySelector('#btn-title-connect');

        this.introStartButton =
            document.querySelector('#btn-intro-start');


        // ========================================
        // Callback
        // ========================================

        this.onTitleConnect =
            onTitleConnectCallback;

        this.onIntroStart =
            onIntroStartCallback;


        // ========================================
        // 状態
        // ========================================

        this.currentScreen = 'title';


        // ========================================
        // 初期化
        // ========================================

        this.init();
    }


    // ========================================
    // 初期化
    // ========================================

    init() {
        this.hideStatus();

        this.showTitleScreen();


        // ========================================
        // タイトル画面
        // 「クリックして接続」
        // ========================================

        if (this.titleConnectButton) {
            this.titleConnectButton.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        this.currentScreen !== 'title'
                    ) {
                        return;
                    }

                    if (
                        typeof this.onTitleConnect ===
                        'function'
                    ) {
                        this.onTitleConnect();
                    }
                }
            );
        }


        // ========================================
        // 説明画面
        // 「クリックして歌を聴く」
        // ========================================

        if (this.introStartButton) {
            this.introStartButton.addEventListener(
                'click',
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        this.currentScreen !== 'intro'
                    ) {
                        return;
                    }

                    if (
                        typeof this.onIntroStart ===
                        'function'
                    ) {
                        this.onIntroStart();
                    }
                }
            );
        }
    }


    // ========================================
    // タイトル画面表示
    // ========================================

    showTitleScreen() {
        this.currentScreen = 'title';

        if (this.openingRoot) {
            this.openingRoot.style.display = 'block';
            this.openingRoot.style.pointerEvents = 'auto';
        }

        if (this.titleScreen) {
            this.titleScreen.classList.add('is-active');
        }

        if (this.introScreen) {
            this.introScreen.classList.remove(
                'is-active'
            );
        }
    }


    // ========================================
    // 説明画面表示
    // ========================================

    showIntroScreen() {
        this.currentScreen = 'intro';

        if (this.openingRoot) {
            this.openingRoot.style.display = 'block';
            this.openingRoot.style.pointerEvents = 'auto';
        }

        if (this.titleScreen) {
            this.titleScreen.classList.remove(
                'is-active'
            );
        }

        if (this.introScreen) {
            this.introScreen.classList.add(
                'is-active'
            );
        }
    }


    // ========================================
    // オープニング画面を消す
    // ========================================

    hideOpeningScreens() {
        this.currentScreen = 'playing';

        if (this.titleScreen) {
            this.titleScreen.classList.remove(
                'is-active'
            );
        }

        if (this.introScreen) {
            this.introScreen.classList.remove(
                'is-active'
            );
        }

        if (this.openingRoot) {
            this.openingRoot.style.pointerEvents =
                'none';

            setTimeout(() => {
                if (
                    this.currentScreen ===
                    'playing'
                ) {
                    this.openingRoot.style.display =
                        'none';
                }
            }, 800);
        }
    }


    // ========================================
    // ローディング表示
    // ========================================

    showLoading(
        text = 'LOADING...'
    ) {
        if (!this.statusText) {
            return;
        }

        this.statusText.innerText = text;

        this.statusText.style.display =
            'block';
    }


    // ========================================
    // ローディング非表示
    // ========================================

    hideStatus() {
        if (!this.statusText) {
            return;
        }

        this.statusText.style.display =
            'none';
    }
}