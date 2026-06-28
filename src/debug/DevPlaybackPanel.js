export class DevPlaybackPanel {
    constructor(musicManager) {
        this.musicManager = musicManager;

        this.root = null;
        this.slider = null;
        this.timeLabel = null;

        this.isDragging = false;
        this.isVisible = true;

        this.init();
    }

    init() {
        this.root = document.createElement('div');
        this.root.id = 'dev-playback-panel';

        this.root.style.position = 'fixed';
        this.root.style.left = '50%';
        this.root.style.bottom = '18px';
        this.root.style.transform = 'translateX(-50%)';
        this.root.style.zIndex = '9999';
        this.root.style.display = 'flex';
        this.root.style.alignItems = 'center';
        this.root.style.gap = '8px';
        this.root.style.padding = '10px 14px';
        this.root.style.borderRadius = '14px';
        this.root.style.background = 'rgba(0, 0, 0, 0.72)';
        this.root.style.color = '#ffffff';
        this.root.style.fontFamily = 'sans-serif';
        this.root.style.fontSize = '12px';
        this.root.style.backdropFilter = 'blur(8px)';
        this.root.style.border = '1px solid rgba(255,255,255,0.22)';

        const label = document.createElement('span');
        label.textContent = 'DEV SEEK';
        label.style.letterSpacing = '0.08em';
        label.style.opacity = '0.8';

        const back10Button = this.createButton('-10s');
        back10Button.onclick = event => {
            event.stopPropagation();
            this.seekRelative(-10000);
        };

        const playButton = this.createButton('▶');
        playButton.onclick = event => {
            event.stopPropagation();
            this.musicManager.requestPlay();
        };

        const pauseButton = this.createButton('⏸');
        pauseButton.onclick = event => {
            event.stopPropagation();
            this.musicManager.requestPauseByUser();
        };

        const forward10Button = this.createButton('+10s');
        forward10Button.onclick = event => {
            event.stopPropagation();
            this.seekRelative(10000);
        };

        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.min = '0';
        this.slider.max = '1000';
        this.slider.value = '0';
        this.slider.step = '1';
        this.slider.style.width = '360px';
        this.slider.style.cursor = 'pointer';

        this.slider.addEventListener('pointerdown', event => {
            event.stopPropagation();
            this.isDragging = true;
        });

        this.slider.addEventListener('pointerup', event => {
            event.stopPropagation();
            this.seekBySlider();
            this.isDragging = false;
        });

        this.slider.addEventListener('change', event => {
            event.stopPropagation();
            this.seekBySlider();
            this.isDragging = false;
        });

        this.slider.addEventListener('click', event => {
            event.stopPropagation();
        });

        this.timeLabel = document.createElement('span');
        this.timeLabel.textContent = '00:00 / 00:00';
        this.timeLabel.style.minWidth = '92px';
        this.timeLabel.style.textAlign = 'right';
        this.timeLabel.style.opacity = '0.9';

        this.root.appendChild(label);
        this.root.appendChild(back10Button);
        this.root.appendChild(playButton);
        this.root.appendChild(pauseButton);
        this.root.appendChild(forward10Button);
        this.root.appendChild(this.slider);
        this.root.appendChild(this.timeLabel);

        document.body.appendChild(this.root);

        this.startUpdateLoop();
    }

    createButton(text) {
        const button = document.createElement('button');

        button.textContent = text;
        button.style.padding = '5px 8px';
        button.style.borderRadius = '8px';
        button.style.border = '1px solid rgba(255,255,255,0.35)';
        button.style.background = 'rgba(255,255,255,0.08)';
        button.style.color = '#fff';
        button.style.cursor = 'pointer';
        button.style.fontSize = '12px';

        return button;
    }

    seekBySlider() {
        const duration = this.musicManager.getDuration();

        if (!duration || duration <= 0) {
            return;
        }

        const ratio =
            Number(this.slider.value) / Number(this.slider.max);

        const targetPosition = duration * ratio;

        this.musicManager.seekTo(targetPosition);
    }

    seekRelative(offsetMs) {
        const current = this.musicManager.getPosition();
        const duration = this.musicManager.getDuration();

        const target = Math.max(
            0,
            Math.min(
                current + offsetMs,
                duration || current + offsetMs
            )
        );

        this.musicManager.seekTo(target);
    }

    startUpdateLoop() {
        const update = () => {
            this.update();

            requestAnimationFrame(update);
        };

        update();
    }

    update() {
        if (!this.musicManager || !this.slider || !this.timeLabel) {
            return;
        }

        const duration = this.musicManager.getDuration();
        const position = this.musicManager.getPosition();

        if (
            typeof duration !== 'number' ||
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            this.timeLabel.textContent = '00:00 / 00:00';
            return;
        }

        if (!this.isDragging) {
            const ratio = Math.max(
                0,
                Math.min(position / duration, 1)
            );

            this.slider.value = String(
                Math.round(ratio * Number(this.slider.max))
            );
        }

        this.timeLabel.textContent =
            `${this.formatTime(position)} / ${this.formatTime(duration)}`;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor((ms || 0) / 1000);

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    destroy() {
        if (this.root) {
            this.root.remove();
        }

        this.root = null;
        this.slider = null;
        this.timeLabel = null;
    }
}