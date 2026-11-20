import { SONGS } from '../songs.js';

export class UIManager {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;

        this.screenTitle  = document.querySelector('#screen-title');
        this.screenSelect = document.querySelector('#screen-select');
        this.screenIntro  = document.querySelector('#screen-intro');

        this.btnToSelect  = document.querySelector('#btn-to-select');
        this.startButton  = document.querySelector('#btn-intro-start');

        this.titleStatusElement  = document.querySelector('#status-title');
        this.selectStatusElement = document.querySelector('#status-select');
        this.introStatusElement  = document.querySelector('#intro-status');
        this.globalStatusElement = document.querySelector('#status');

        this.waveformPanel = document.querySelector('#waveform-panel');

        // 曲選択画面を生成
        this._buildSongList();

        // タイトル → 選択画面
        this.btnToSelect?.addEventListener('click', () => {
            this.showSelectScreen();
        });

        // スタートボタン
        this.startButton?.addEventListener('click', async () => {
            this.startButton.disabled = true;
            try {
                await this.callbacks.onIntroStart?.();
            } catch (error) {
                console.error(error);
                this.setIntroStatus(`再生を開始できませんでした。${error?.message || ''}`);
                this.startButton.disabled = false;
            }
        });
    }

    _buildSongList() {
        const list = document.querySelector('#song-list');
        if (!list) return;

        SONGS.forEach((song, i) => {
            const card = document.createElement('button');
            card.className = 'song-card';
            card.type = 'button';
            card.innerHTML = `
                <span class="song-icon">🎵</span>
                <div class="song-info">
                    <p class="song-name">${song.title}</p>
                    <p class="song-meta">${song.artist} feat. ${song.vocal}</p>
                </div>
                <span class="song-arrow">▶</span>
            `;
            card.addEventListener('click', () => {
                // 選択中カードをハイライト
                list.querySelectorAll('.song-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.callbacks.onSongSelect?.(song);
            });
            list.appendChild(card);
        });
    }

    showTitleScreen() {
        this.screenTitle?.classList.remove('hidden');
        this.screenSelect?.classList.add('hidden');
        this.screenIntro?.classList.add('hidden');
    }

    showSelectScreen() {
        this.screenTitle?.classList.add('hidden');
        this.screenSelect?.classList.remove('hidden');
        this.screenIntro?.classList.add('hidden');
    }

    showIntroScreen(song) {
        this.screenTitle?.classList.add('hidden');
        this.screenSelect?.classList.add('hidden');
        this.screenIntro?.classList.remove('hidden');

        if (song) {
            const awardEl  = document.querySelector('#intro-award');
            const titleEl  = document.querySelector('#intro-title');
            const artistEl = document.querySelector('#intro-artist');
            const headEl   = document.querySelector('#playing-title');
            if (awardEl)  awardEl.textContent  = `マジカルミライ 2026 ${song.award}`;
            if (titleEl)  titleEl.textContent   = song.title;
            if (artistEl) artistEl.textContent  = `${song.artist} feat. ${song.vocal}`;
            if (headEl)   headEl.textContent    = song.title;
        }
    }

    hideOpeningScreens() {
        this.screenTitle?.classList.add('hidden');
        this.screenSelect?.classList.add('hidden');
        this.screenIntro?.classList.add('hidden');
    }

    showWaveform() { this.waveformPanel?.classList.remove('hidden'); }

    setTitleStatus(msg)  { if (this.titleStatusElement)  this.titleStatusElement.textContent  = msg; }
    setSelectStatus(msg) { if (this.selectStatusElement) this.selectStatusElement.textContent = msg; }
    setIntroStatus(msg)  { if (this.introStatusElement)  this.introStatusElement.textContent  = msg; }
    setGlobalStatus(msg) { if (this.globalStatusElement) this.globalStatusElement.textContent = msg; }

    setStartButtonEnabled(enabled) {
        if (this.startButton) this.startButton.disabled = !enabled;
    }
}