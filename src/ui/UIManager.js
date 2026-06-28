/**
 * UIManager
 *
 * ・タイトル / イントロ / プレイ画面のUI制御を行う
 * ・ボタン入力と画面遷移を管理
 * ・アイテムメニューやステータス表示の表示状態を制御
 *
 * 主な機能：
 * ・タイトル画面とイントロ画面の切り替え
 * ・開始ボタン押下時のコールバック実行
 * ・ローディング表示（ステータス表示）
 * ・アイテムメニューの表示制御と選択状態管理
 *
 * 役割：
 * HTMLベースのUI状態を一元管理し、
 * ゲームの進行（開始・演出・操作可能状態）と同期させる
 */

export class UIManager {
    constructor(onTitleConnectCallback, onIntroStartCallback) {
        /**
         * 初期化
         *
         * ・各DOM要素を取得
         * ・外部コールバックを保持
         * ・初期画面状態をセット
         */

        // ステータス表示（LOADINGなど）
        this.statusText = document.querySelector('#status');

        // オープニングUIルート
        this.openingRoot = document.querySelector('#opening-root');

        // 各画面
        this.titleScreen = document.querySelector('#screen-title');
        this.introScreen = document.querySelector('#screen-intro');

        // ボタン
        this.titleConnectButton = document.querySelector('#btn-title-connect');
        this.introStartButton = document.querySelector('#btn-intro-start');

        // アイテムメニュー
        this.itemMenu = document.querySelector('#item-menu');

        // コールバック（外部処理）
        this.onTitleConnect = onTitleConnectCallback;
        this.onIntroStart = onIntroStartCallback;

        // 現在の画面状態
        this.currentScreen = 'title';

        this.init();
    }

    init() {
        /**
         * 初期UI状態とイベント設定
         *
         * 処理：
         * ・不要UIを非表示
         * ・タイトル画面表示
         * ・ボタンイベント登録
         * ・メニューのボタン処理初期化
         */

        if (this.statusText) {
            this.statusText.style.display = 'none';
        }

        if (this.itemMenu) {
            this.itemMenu.style.display = 'none';
        }

        // 初期はタイトル画面
        this.showTitleScreen();

        // =========================
        // タイトル接続ボタン
        // =========================
        if (this.titleConnectButton) {
            this.titleConnectButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                // タイトル画面以外では無効
                if (this.currentScreen !== 'title') {
                    return;
                }

                // 外部処理呼び出し
                if (typeof this.onTitleConnect === 'function') {
                    this.onTitleConnect();
                }
            });
        }

        // =========================
        // イントロ開始ボタン
        // =========================
        if (this.introStartButton) {
            this.introStartButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                // イントロ画面以外では無効
                if (this.currentScreen !== 'intro') {
                    return;
                }

                if (typeof this.onIntroStart === 'function') {
                    this.onIntroStart();
                }
            });
        }

        this.initItemMenuButtons();
    }

    initItemMenuButtons() {
        /**
         * アイテムメニューのボタン制御
         *
         * 処理：
         * ・クリック時に active クラスを付与
         * ・他のボタンの active を解除
         */

        if (!this.itemMenu) {
            return;
        }

        const menuButtons =
            this.itemMenu.querySelectorAll('button');

        menuButtons.forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                // すべて非アクティブにする
                menuButtons.forEach(target => {
                    target.classList.remove('active');
                });

                // 選択されたボタンのみアクティブ
                button.classList.add('active');
            });
        });
    }

    showTitleScreen() {
        /**
         * タイトル画面を表示
         *
         * 処理：
         * ・タイトルを表示
         * ・イントロを非表示
         * ・UI操作を有効化
         */

        this.currentScreen = 'title';

        if (this.openingRoot) {
            this.openingRoot.style.display = 'block';
            this.openingRoot.style.pointerEvents = 'auto';
        }

        if (this.titleScreen) {
            this.titleScreen.classList.add('is-active');
        }

        if (this.introScreen) {
            this.introScreen.classList.remove('is-active');
        }
    }

    showIntroScreen() {
        /**
         * イントロ画面を表示
         *
         * 処理：
         * ・イントロを表示
         * ・タイトルを非表示
         * ・UI操作を有効化
         */

        this.currentScreen = 'intro';

        if (this.openingRoot) {
            this.openingRoot.style.display = 'block';
            this.openingRoot.style.pointerEvents = 'auto';
        }

        if (this.titleScreen) {
            this.titleScreen.classList.remove('is-active');
        }

        if (this.introScreen) {
            this.introScreen.classList.add('is-active');
        }
    }

    hideOpeningScreens() {
        /**
         * オープニング画面を非表示にしてゲーム状態へ移行
         *
         * 処理：
         * ・タイトル/イントロ両方を非アクティブ化
         * ・ポインター操作を無効化
         * ・一定時間後にDOMごと非表示
         *
         * 注意：
         * ・タイミング遅延でフェードアウト演出を前提としている
         */

        this.currentScreen = 'playing';

        if (this.titleScreen) {
            this.titleScreen.classList.remove('is-active');
        }

        if (this.introScreen) {
            this.introScreen.classList.remove('is-active');
        }

        if (this.openingRoot) {
            this.openingRoot.style.pointerEvents = 'none';

            setTimeout(() => {
                if (this.currentScreen === 'playing') {
                    this.openingRoot.style.display = 'none';
                }
            }, 800);
        }
    }

    showLoading(text = 'LOADING...') {
        /**
         * ローディング状態を表示
         *
         * ・任意テキスト表示可能
         */

        if (!this.statusText) {
            return;
        }

        this.statusText.innerText = text;
        this.statusText.style.display = 'block';
    }

    hideStatus() {
        /**
         * ステータス表示を非表示
         */

        if (!this.statusText) {
            return;
        }

        this.statusText.style.display = 'none';
    }

    showItemMenu() {
        /**
         * アイテムメニュー表示
         *
         * 注意：
         * ・CSSの display を強制上書き（important）
         */

        if (!this.itemMenu) {
            return;
        }

        this.itemMenu.style.setProperty(
            'display',
            'flex',
            'important'
        );
    }

    hideItemMenu() {
        /**
         * アイテムメニュー非表示
         */

        if (!this.itemMenu) {
            return;
        }

        this.itemMenu.style.display = 'none';
    }
}