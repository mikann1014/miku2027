export class UIManager {
    constructor(onTitleConnectCallback, onIntroStartCallback) {
        this.statusText = document.querySelector('#status');

        this.openingRoot = document.querySelector('#opening-root');
        this.titleScreen = document.querySelector('#screen-title');
        this.introScreen = document.querySelector('#screen-intro');

        this.titleConnectButton = document.querySelector('#btn-title-connect');
        this.introStartButton = document.querySelector('#btn-intro-start');

        this.itemMenu = document.querySelector('#item-menu');

        this.onTitleConnect = onTitleConnectCallback;
        this.onIntroStart = onIntroStartCallback;

        this.currentScreen = 'title';

        this.init();
    }

    init() {
        if (this.statusText) {
            this.statusText.style.display = 'none';
        }

        if (this.itemMenu) {
            this.itemMenu.style.display = 'none';
        }

        this.showTitleScreen();

        if (this.titleConnectButton) {
            this.titleConnectButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                if (this.currentScreen !== 'title') {
                    return;
                }

                if (typeof this.onTitleConnect === 'function') {
                    this.onTitleConnect();
                }
            });
        }

        if (this.introStartButton) {
            this.introStartButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

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
        if (!this.itemMenu) {
            return;
        }

        const menuButtons =
            this.itemMenu.querySelectorAll('button');

        menuButtons.forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                menuButtons.forEach(target => {
                    target.classList.remove('active');
                });

                button.classList.add('active');
            });
        });
    }

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
            this.introScreen.classList.remove('is-active');
        }
    }

    showIntroScreen() {
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
        if (!this.statusText) {
            return;
        }

        this.statusText.innerText = text;
        this.statusText.style.display = 'block';
    }

    hideStatus() {
        if (!this.statusText) {
            return;
        }

        this.statusText.style.display = 'none';
    }

    showItemMenu() {
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
        if (!this.itemMenu) {
            return;
        }

        this.itemMenu.style.display = 'none';
    }
}