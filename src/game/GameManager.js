/**
 * GameManager
 */
export class GameManager {
    static GRAVITY           = 0.000011;
    static JUMP_VELOCITY     = -0.0025;
    static MAX_FALL_SPEED    = 0.025;
    static MOVE_SPEED        = 0.0004;
    static CHAR_X_MIN        = 0.03;
    static CHAR_X_MAX        = 0.97;
    static GROUND_RATIO      = 0.80;
    static MAX_HEIGHT_RATIO  = 0.95;
    static DISPLAY_WINDOW    = 30;
    static CHAR_SIZE_RATIO   = 0.09;
    static PUSH_BACK_SPEED    = 0.0020;  // 移動速度の5倍
    static PUSH_BACK_DURATION = 250;

    constructor() {
        this._waveformData   = null;
        this._progress       = 0;
        this._centerSampleF  = 0;
        this._visibleBars    = 48;

        // 初期位置：地面（GROUND_RATIO）からキャラ高さ分上
        this._charX          = 0.50;
        this._charY          = GameManager.GROUND_RATIO - GameManager.CHAR_SIZE_RATIO;
        this._velocityY      = 0;
        this._isOnGround     = true;
        this._isJumping      = false;
        this._jumpQueued     = false;
        this._moveLeft       = false;
        this._moveRight      = false;
        this._pushBackTimer  = 0;

        console.log('[GameManager] Initialized.');
    }

    setWaveformData(values) {
        this._waveformData  = values;
        this._centerSampleF = 0;
    }

    setPosition(position, duration) {
        if (!this._waveformData?.length || duration <= 0) {
            this._centerSampleF = 0;
            this._progress = 0;
            return;
        }
        const ratio         = position / duration;
        this._centerSampleF = ratio * (this._waveformData.length - 1);
        this._progress      = ratio;
    }

    setProgress(progress) { this._progress = progress; }
    setVisibleBars(n)      { this._visibleBars = Math.max(1, n); }

    jump() {
        if (this._isOnGround) {
            this._velocityY  = GameManager.JUMP_VELOCITY;
            this._isOnGround = false;
            this._isJumping  = true;
            this._jumpQueued = false;
        } else {
            this._jumpQueued = true;
        }
    }

    setMoveLeft(on)  { this._moveLeft  = on; }
    setMoveRight(on) { this._moveRight = on; }

    update(deltaMs, canvasWidth, canvasHeight) {
        if (!canvasWidth || !canvasHeight) return;

        const charH    = GameManager.CHAR_SIZE_RATIO;
        const groundY  = GameManager.GROUND_RATIO;

        // ── 1. 重力 ───────────────────────────────────────────
        this._velocityY = Math.min(
            this._velocityY + GameManager.GRAVITY * deltaMs,
            GameManager.MAX_FALL_SPEED
        );
        let nextY = this._charY + this._velocityY * deltaMs;
        if (nextY < 0) { nextY = 0; this._velocityY = 0; }

        // ── 2. 水平移動 ───────────────────────────────────────
        let dx = 0;
        if (this._moveLeft)  dx -= GameManager.MOVE_SPEED;
        if (this._moveRight) dx += GameManager.MOVE_SPEED;
        if (this._pushBackTimer > 0) {
            this._pushBackTimer -= deltaMs;
            dx -= GameManager.PUSH_BACK_SPEED;
        }
        const nextX = Math.max(GameManager.CHAR_X_MIN,
            Math.min(GameManager.CHAR_X_MAX,
                this._charX + dx * deltaMs));

        // ── 3. 現在地・移動先のバー頂点を取得（正規化） ───────
        const curTop  = this._getTerrainTop(this._charX);
        const nextTop = this._getTerrainTop(nextX);

        // ── 4. 横壁判定 ───────────────────────────────────────
        // stepUp > 0 → 移動先のバーが現在地より高い（壁の可能性）
        // ただし現在すでにバーの上に乗っている場合（curTop < groundY）は
        // 同程度の高さのバーへの移動は許可する
        const stepUp       = curTop - nextTop;  // 正 = 移動先が高い
        const onBar        = curTop < groundY - 0.01; // 現在バーの上にいる
        // 移動先が現在地より「キャラ高さの半分以上」高い場合のみ壁
        const wallHit = stepUp > charH * 0.5;

        const resolvedX = wallHit ? this._charX : nextX;
        if (wallHit) {
            this._pushBackTimer = GameManager.PUSH_BACK_DURATION;
        }

        // ── 5. 着地判定 ───────────────────────────────────────
        // 解決済みXのバー頂点と地面の低い方が着地面
        const landTop = this._getTerrainTop(resolvedX);
        // landTop = バー頂点のY（上が小さい）
        // キャラ底面がlandTopに接するようにする → charY = landTop - charH
        // groundY = 波形なし区間の着地面（0.80）
        // 実際の着地Y = landTop - charH（バー上）か groundY - charH（地面）の低い方（大きい方）
        const floorTop = landTop - charH;

        if (nextY >= floorTop) {
            nextY            = floorTop;
            this._velocityY  = 0;
            this._isOnGround = true;
            this._isJumping  = false;
            if (this._jumpQueued) {
                this._jumpQueued = false;
                this.jump();
            }
        } else {
            this._isOnGround = false;
        }

        this._charX = resolvedX;
        this._charY = nextY;
    }

    getCharacterState(canvasWidth, canvasHeight) {
        const size = canvasHeight * GameManager.CHAR_SIZE_RATIO;
        return {
            x:          canvasWidth  * this._charX,
            y:          canvasHeight * this._charY,
            w:          size,
            h:          size,
            isJumping:  this._isJumping,
            isOnGround: this._isOnGround,
        };
    }

    // ─── 内部実装 ─────────────────────────────────────────────

    /**
     * 指定したX位置（canvas幅比）のバー頂点をcanvas高さ比で返す。
     * バーがない区間は GROUND_RATIO を返す。
     */
    _getTerrainTop(charXRatio) {
        if (!this._waveformData?.length) return GameManager.GROUND_RATIO;

        const groundY       = GameManager.GROUND_RATIO;
        const maxH          = groundY * GameManager.MAX_HEIGHT_RATIO;
        const samplesPerBar = GameManager.DISPLAY_WINDOW / this._visibleBars;

        // screenBar: 画面上の何番目のバーか（canvas幅比→バーインデックス）
        const screenBar    = Math.floor(charXRatio * this._visibleBars);
        const playheadBar  = Math.floor(0.50 * this._visibleBars);
        const dataIndex    = Math.floor(
            this._centerSampleF + (screenBar - playheadBar) * samplesPerBar
        );

        const amplitude =
            dataIndex >= 0 && dataIndex < this._waveformData.length
                ? this._waveformData[dataIndex]
                : 0;

        // 振幅が非常に小さい（歌詞なし区間）は地面とみなす
        if (amplitude < 0.01) return GameManager.GROUND_RATIO;

        const terrainH = Math.max(3 / 600, amplitude * maxH);
        return groundY - terrainH;
    }
}