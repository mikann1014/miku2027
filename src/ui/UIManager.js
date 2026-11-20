export class UIManager {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;

        this.screenTitle = document.querySelector('#screen-title');
        this.screenIntro = document.querySelector('#screen-intro');

        this.connectButton = document.querySelector('#btn-title-connect');
        this.startButton = document.querySelector('#btn-intro-start');

        // #status-title はタイトル画面内のステータス表示
        this.titleStatusElement = document.querySelector('#status-title');
        // #intro-status はイントロ画面内のステータス表示
        this.introStatusElement = document.querySelector('#intro-status');
        // #status は画面左上の固定ステータス表示
        this.globalStatusElement = document.querySelector('#status');

        this.waveformPanel = document.querySelector('#waveform-panel');

        this.connectButton?.addEventListener('click', async () => {
            this.connectButton.disabled = true;

            try {
                await this.callbacks.onTitleConnect?.();
            } catch (error) {
                console.error(error);
                this.setTitleStatus(
                    `接続または楽曲の読み込みに失敗しました。${error?.message || ''}`
                );
                this.connectButton.disabled = false;
            }
        });

        this.startButton?.addEventListener('click', async () => {
            this.startButton.disabled = true;

            try {
                await this.callbacks.onIntroStart?.();
            } catch (error) {
                console.error(error);
                this.setIntroStatus(
                    `再生を開始できませんでした。${error?.message || ''}`
                );
                this.startButton.disabled = false;
            }
        });
    }

    showTitleScreen() {
        this.screenTitle?.classList.remove('hidden');
        this.screenIntro?.classList.add('hidden');
    }

    showIntroScreen() {
        this.screenTitle?.classList.add('hidden');
        this.screenIntro?.classList.remove('hidden');
    }

    hideOpeningScreens() {
        this.screenTitle?.classList.add('hidden');
        this.screenIntro?.classList.add('hidden');
    }

    showWaveform() {
        this.waveformPanel?.classList.remove('hidden');
    }

    /**
     * タイトル画面内（#status-title）のステータスメッセージを更新する。
     * main.js の onAppReady / handleTitleConnect から呼ばれる。
     */
    setTitleStatus(message) {
        if (this.titleStatusElement) {
            this.titleStatusElement.textContent = message;
        }
    }

    /**
     * イントロ画面内（#intro-status）のステータスメッセージを更新する。
     */
    setIntroStatus(message) {
        if (this.introStatusElement) {
            this.introStatusElement.textContent = message;
        }
    }

    /**
     * 画面左上の固定ステータス（#status）を更新する。
     * 再生開始後など全画面共通の状態表示に使う。
     */
    setGlobalStatus(message) {
        if (this.globalStatusElement) {
            this.globalStatusElement.textContent = message;
        }
    }

    setStartButtonEnabled(enabled) {
        if (this.startButton) {
            this.startButton.disabled = !enabled;
        }
    }

    setConnectButtonEnabled(enabled) {
        if (this.connectButton) {
            this.connectButton.disabled = !enabled;
        }
    }
}