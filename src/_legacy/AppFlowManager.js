export class AppFlowManager {
    constructor(worldRenderer) {
        console.log('AppFlowManager created');

        this.worldRenderer = worldRenderer;
        this.state = 'title';

        this.ui = document.getElementById('overlay-ui');

        this.onClick = this.handleClick.bind(this);

        window.addEventListener('pointerdown', this.onClick);

        this.renderTitle();
    }

    handleClick() {
        if (this.state === 'title') {
            this.startLoading();
            return;
        }

        if (this.state === 'intro') {
            this.startGame();
            return;
        }
    }

    renderTitle() {
        this.state = 'title';

        this.worldRenderer.lyricsManager?.setEnabled(false, 0);

        this.ui.innerHTML = `
            <div class="screen">
                <div class="title-main">
                    世界最後の音楽隊
                </div>

                <div class="subtitle">
                    初音ミク「マジカルミライ 2026」楽曲コンテスト応募作品
                </div>

                <div class="credits">
                    <div>Lyrics & Music / 夏山よつぎ</div>
                    <div>Arrangement & Mix / ど〜ぱみん</div>
                    <div>Vocal / 初音ミク</div>
                    <div>Chorus / MEIKO / KAITO / 鏡音リン / 鏡音レン / 巡音ルカ</div>
                </div>

                <div class="hint">
                    クリックして接続
                </div>
            </div>
        `;
    }

    startLoading() {
        this.state = 'loading';

        this.fadeScreen(() => {
            this.worldRenderer.startPreload?.();
            this.renderIntro();
        });
    }

    renderIntro() {
        this.state = 'intro';

        this.worldRenderer.lyricsManager?.setEnabled(false, 0);

        this.ui.innerHTML = `
            <div class="screen">
                <div class="intro-text">
                    <p>この世界は、音楽とともに少しずつ姿を変えていきます。</p>
                    <p>歌声や歩みに合わせて、空や景色も移ろっていきます。</p>
                    <p>気になったものがあれば、どうぞ触れてみてください。</p>
                    <p>その小さな応答もまた、この世界を形づくる一部です。</p>
                </div>

                <div class="hint">
                    クリックして歌を聴く
                </div>
            </div>
        `;
    }

    startGame() {
        this.state = 'playing';

        this.fadeScreen(() => {
            this.ui.innerHTML = '';

            window.removeEventListener(
                'pointerdown',
                this.onClick
            );
        });
    }

    fadeScreen(callback) {
        const screen = this.ui.firstElementChild;

        if (!screen) {
            callback?.();
            return;
        }

        screen.classList.add('fade-out');

        setTimeout(() => {
            callback?.();
        }, 800);
    }
}