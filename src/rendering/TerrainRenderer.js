import { BackgroundRenderer } from './BackgroundRenderer.js';
import { LyricsRenderer }     from './LyricsRenderer.js';

export class TerrainRenderer {
    static PLAYHEAD_RATIO    = 0.50;
    static GROUND_RATIO      = 0.80;
    static MAX_HEIGHT_RATIO  = 0.95;
    static BAR_PX            = 14;
    static MIN_BAR_PX        = 10;
    static DISPLAY_WINDOW    = 30;   // 小さいほど解像度が高くシャープ
    static RENDER_SMOOTH     = 1;    // 前後1サンプルのみ平均

    constructor(canvasSelector = '#waveform-canvas') {
        this._canvas        = document.querySelector(canvasSelector);
        this._ctx           = this._canvas?.getContext('2d') ?? null;
        this._waveformData  = null;
        this._smoothed      = null;   // 描画用スムージング済み配列
        this._progress      = 0;
        this._centerSampleF = 0;
        this._visibleBars   = 300;
        this._isPlaying     = false;
        this._rafId         = null;
        this._gameManager   = null;
        this._charRenderer  = null;
        this._bgRenderer    = new BackgroundRenderer();
        this._lyricsRenderer = new LyricsRenderer();
        this._lyricsState   = null;
        this._isFinished    = false;
        this._lastTimestamp = null;

        if (!this._canvas || !this._ctx) {
            console.error('[TerrainRenderer] Canvas not found:', canvasSelector);
        }
    }

    // ─── 公開 API ─────────────────────────────────────────────

    setWaveformData(values) {
        this._waveformData = values;
        this._buildSmoothed(values);
    }

    setPosition(position, duration) {
        if (!this._waveformData?.length || duration <= 0) {
            this._centerSampleF = 0;
            this._progress = 0;
            return;
        }
        const ratio = position / duration;
        this._centerSampleF = ratio * (this._waveformData.length - 1);
        this._progress = ratio;
    }

    setProgress(progress) { this._progress = progress; }
    setGameManager(gm)       { this._gameManager = gm; }
    setCharacterRenderer(cr) { this._charRenderer = cr; }
    setLyricsState(state)    { this._lyricsState = state; }
    setFinished(v)           { this._isFinished = v; }

    play() { this._isPlaying = true; this._startLoop(); }
    pause() { this._isPlaying = false; }

    resize() {
        if (!this._canvas || !this._ctx) return;
        const rect = this._canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            console.warn('[TerrainRenderer] Canvas has no visible dimensions.');
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        this._canvas.width  = Math.floor(rect.width  * dpr);
        this._canvas.height = Math.floor(rect.height * dpr);
        this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._visibleBars = Math.max(10, Math.floor(rect.width / TerrainRenderer.BAR_PX));
        this._bgRenderer._lastWidth = 0;
        this.drawOnce();
    }

    drawOnce() { this._draw(null); }

    // ─── 内部実装 ─────────────────────────────────────────────

    /**
     * 描画用スムージング済み配列を事前生成する。
     * MusicManager 側のスムージングに加えて、ここでさらに平均化することで
     * 隣接サンプル間の振幅差を小さくし、地形のカクカクを防ぐ。
     */
    _buildSmoothed(raw) {
        if (!raw?.length) { this._smoothed = null; return; }
        const half   = TerrainRenderer.RENDER_SMOOTH;
        const result = new Float32Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - half); j <= Math.min(raw.length - 1, i + half); j++) {
                sum += raw[j]; count++;
            }
            result[i] = sum / count;
        }
        this._smoothed = result;
        console.log('[TerrainRenderer] Smoothed waveform built:', result.length, 'samples');
    }

    _startLoop() {
        if (this._rafId !== null) return;
        const loop = (timestamp) => {
            const deltaMs = this._lastTimestamp !== null
                ? Math.min(timestamp - this._lastTimestamp, 50) : 16;
            this._lastTimestamp = timestamp;
            this._draw(deltaMs);
            if (this._isPlaying) {
                this._rafId = requestAnimationFrame(loop);
            } else {
                this._rafId = null;
                this._lastTimestamp = null;
            }
        };
        this._rafId = requestAnimationFrame(loop);
    }

    _draw(deltaMs) {
        const canvas = this._canvas;
        const ctx    = this._ctx;
        if (!canvas || !ctx) return;
        const width  = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width <= 0 || height <= 0) return;

        if (deltaMs !== null && this._isPlaying && this._gameManager) {
            this._gameManager.update(deltaMs, width, height);
        }

        ctx.clearRect(0, 0, width, height);
        this._bgRenderer.draw(ctx, width, height, this._progress);

        const groundY = height * TerrainRenderer.GROUND_RATIO;

        if (!this._smoothed?.length) {
            this._drawGroundLine(ctx, width, groundY);
            return;
        }

        this._drawTerrain(ctx, width, height, groundY);
        this._drawPlayhead(ctx, width, height);

        if (this._gameManager && this._charRenderer) {
            const state = this._gameManager.getCharacterState(width, height);
            this._charRenderer.draw(ctx, state, height);

            // 歌詞との当たり判定
            if (this._lyricsManager) {
                this._lyricsManager.checkHit(
                    state.x - state.w / 2,
                    state.y,
                    state.w,
                    state.h
                );
            }
        }

        // 歌詞描画（キャラの手前）
        if (this._lyricsState) {
            this._lyricsRenderer.draw(
                ctx,
                this._lyricsState,
                width,
                height,
                deltaMs ?? 16
            );
        }
    }

    setLyricsManager(lm) { this._lyricsManager = lm; }

    _drawGroundLine(ctx, width, groundY) {
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.strokeStyle = 'rgba(112, 214, 255, 0.3)';
        ctx.lineWidth   = 1;
        ctx.stroke();
    }

    _drawTerrain(ctx, width, height, groundY) {
        const data         = this._smoothed;
        const totalSamples = data.length;

        const barSpacing       = Math.max(1, Math.floor(width / this._visibleBars));
        const barWidth         = Math.max(TerrainRenderer.MIN_BAR_PX, barSpacing - 1);
        const maxTerrainHeight = groundY * TerrainRenderer.MAX_HEIGHT_RATIO;

        // 再生位置に対応する「右端」のサンプルインデックス
        const rightEdgeIndex   = this._centerSampleF;
        const playheadX        = width * TerrainRenderer.PLAYHEAD_RATIO;
        const playheadBarIndex = Math.floor(playheadX / barSpacing);

        for (let screenBar = 0; screenBar <= this._visibleBars; screenBar++) {
            const dataIndex = Math.round(
                rightEdgeIndex + (screenBar - playheadBarIndex)
            );

            const amplitude =
                dataIndex >= 0 && dataIndex < totalSamples ? data[dataIndex] : 0;

            const terrainHeight = Math.max(3, amplitude * maxTerrainHeight);
            const x             = screenBar * barSpacing;
            const isPast        = screenBar < playheadBarIndex;
            const topY          = groundY - terrainHeight;

            if (terrainHeight > 3) {
                const grad = ctx.createLinearGradient(x, topY, x, groundY);
                if (isPast) {
                    grad.addColorStop(0,    'rgba(244,211,94,1.0)');
                    grad.addColorStop(0.35, 'rgba(220,170,50,0.85)');
                    grad.addColorStop(0.7,  'rgba(160,100,20,0.6)');
                    grad.addColorStop(1,    'rgba(80,50,5,0.4)');
                } else {
                    grad.addColorStop(0,    'rgba(140,230,255,1.0)');
                    grad.addColorStop(0.3,  'rgba(80,200,255,0.9)');
                    grad.addColorStop(0.65, 'rgba(40,120,220,0.65)');
                    grad.addColorStop(1,    'rgba(10,50,160,0.4)');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(x, topY, barWidth, terrainHeight);

                const glowGrad = ctx.createLinearGradient(x - 2, topY, x - 2, groundY);
                if (isPast) {
                    glowGrad.addColorStop(0, 'rgba(244,211,94,0.25)');
                    glowGrad.addColorStop(1, 'rgba(244,211,94,0.0)');
                } else {
                    glowGrad.addColorStop(0, 'rgba(112,214,255,0.3)');
                    glowGrad.addColorStop(1, 'rgba(112,214,255,0.0)');
                }
                ctx.fillStyle = glowGrad;
                ctx.fillRect(x - 2, topY, barWidth + 8, terrainHeight);

                ctx.fillStyle = isPast ? 'rgba(255,245,180,0.95)' : 'rgba(220,245,255,0.95)';
                ctx.fillRect(x, topY, barWidth, 2);
            } else {
                ctx.fillStyle = isPast ? 'rgba(244,211,94,0.08)' : 'rgba(112,214,255,0.06)';
                ctx.fillRect(x, groundY - 2, barWidth, 2);
            }

            ctx.fillStyle = isPast ? 'rgba(244,211,94,0.06)' : 'rgba(30,80,160,0.18)';
            ctx.fillRect(x, groundY, barWidth, height - groundY);
        }

        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.strokeStyle = 'rgba(112,214,255,0.25)';
        ctx.lineWidth   = 1;
        ctx.stroke();
    }

    _drawPlayhead(_ctx, _width, _height) {
        // プレイヘッド縦線は非表示
    }
}