
export class UIManager {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;

        this.screenTitle = document.querySelector('#screen-title');
        this.screenIntro = document.querySelector('#screen-intro');

        this.connectButton = document.querySelector('#btn-title-connect');
        this.startButton = document.querySelector('#btn-intro-start');

        this.statusElement = document.querySelector('#status');
        this.introStatusElement = document.querySelector('#intro-status');

        this.waveformPanel = document.querySelector('#waveform-panel');

        this.connectButton?.addEventListener('click', async () => {
            this.connectButton.disabled = true;

            try {
                await this.callbacks.onTitleConnect?.();
            } catch (error) {
                console.error(error);
                this.setStatus(
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

    setStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }

    setIntroStatus(message) {
        if (this.introStatusElement) {
            this.introStatusElement.textContent = message;
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