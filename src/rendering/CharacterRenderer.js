/**
 * CharacterRenderer
 *
 * GameManager から受け取った状態をもとに
 * Canvas 上にピクセルアート風のキャラクターを描画する。
 *
 * 公開 API:
 *   renderer.draw(ctx, state, canvasHeight)
 *     state = { x, y, isJumping, isOnGround }
 */
export class CharacterRenderer {
    // キャラクターサイズ（canvas高さに対する比率で決める）
    static SIZE_RATIO = 0.09; // canvas高さの約9%

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ x: number, y: number, isJumping: boolean, isOnGround: boolean }} state
     * @param {number} canvasHeight
     */
    draw(ctx, state, canvasHeight) {
        const size = Math.max(24, Math.floor(canvasHeight * CharacterRenderer.SIZE_RATIO));
        const { x, y, isJumping } = state;

        ctx.save();

        // ── 影（地面との距離感） ──────────────────────────────
        // isJumping のとき影を薄く小さくする
        const shadowAlpha = isJumping ? 0.15 : 0.3;
        const shadowW     = isJumping ? size * 0.4 : size * 0.7;
        const shadowH     = isJumping ? size * 0.07 : size * 0.12;

        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(
            x,
            y + size + size * 0.05,
            shadowW / 2,
            shadowH / 2,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // ── ボディ（丸いピクセルアート風） ───────────────────
        const bodyColor  = isJumping ? '#f4d35e' : '#ffffff';
        const glowColor  = isJumping ? 'rgba(244,211,94,0.4)' : 'rgba(112,214,255,0.3)';
        const glowRadius = size * 0.9;

        // 外光
        const grd = ctx.createRadialGradient(x, y + size / 2, 0, x, y + size / 2, glowRadius);
        grd.addColorStop(0,   glowColor);
        grd.addColorStop(1,   'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y + size / 2, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // メインボディ（角丸の四角形でマリオっぽく）
        const bx = x - size / 2;
        const by = y;
        const bw = size;
        const bh = size;
        const r  = size * 0.25;

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fill();

        // ── 目 ───────────────────────────────────────────────
        const eyeY  = by + bh * 0.35;
        const eyeR  = size * 0.09;
        const eyeOX = size * 0.2;

        ctx.fillStyle = '#10121c';
        ctx.beginPath();
        ctx.arc(x - eyeOX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + eyeOX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        // ハイライト
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - eyeOX + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOX + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // ── ジャンプ中の星エフェクト ──────────────────────────
        if (isJumping) {
            this._drawStars(ctx, x, y, size);
        }

        ctx.restore();
    }

    _drawStars(ctx, cx, cy, size) {
        const positions = [
            { dx: -size * 0.7, dy: -size * 0.3 },
            { dx:  size * 0.7, dy: -size * 0.3 },
            { dx: -size * 0.5, dy: -size * 0.8 },
            { dx:  size * 0.5, dy: -size * 0.7 },
        ];

        ctx.fillStyle = 'rgba(244, 211, 94, 0.85)';

        for (const { dx, dy } of positions) {
            const sx = cx + dx;
            const sy = cy + size / 2 + dy;
            const sr = size * 0.06;

            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
