/**
 * LyricsRenderer — 単語単位の落下歌詞を描画する
 */
export class LyricsRenderer {
    constructor() {}

    draw(ctx, state, canvasW, canvasH, deltaMs = 16) {
        const { displayPhrases, fallingChars, score, isFinished } = state;

        this._drawDisplayPhrases(ctx, displayPhrases, canvasW, canvasH);
        this._drawFallingChars(ctx, fallingChars ?? [], canvasH, canvasH);
        this._drawScore(ctx, score, canvasW);

        if (isFinished) {
            this._drawResult(ctx, score, canvasW, canvasH);
        }
    }

    /**
     * 直近3〜5フレーズを上から順に縦並びで表示する。
     * 最新フレーズが一番下、古いものほど上・薄くなる。
     */
    _drawDisplayPhrases(ctx, phrases, canvasW, canvasH) {
        if (!phrases?.length) return;

        const fontSize   = Math.max(14, canvasH * 0.034);
        const lineHeight = fontSize * 1.6;
        const count      = phrases.length;

        // 表示エリアの縦中央Y（上部1/5あたりに集める）
        const areaTopY = canvasH * 0.04;

        ctx.save();
        ctx.font         = `bold ${fontSize}px "Helvetica Neue", Arial, "Noto Sans JP", sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign    = 'center';  // 中央揃え

        for (let i = 0; i < count; i++) {
            const p         = phrases[i];
            const ageFactor = i / Math.max(1, count - 1); // 0=最古 1=最新
            const alpha     = p.alpha * (0.35 + 0.65 * ageFactor);
            const y         = areaTopY + i * lineHeight;

            ctx.globalAlpha = alpha;
            ctx.shadowColor = 'rgba(112,214,255,0.7)';
            ctx.shadowBlur  = ageFactor > 0.6 ? 12 : 4;
            ctx.fillStyle   = 'rgba(220,245,255,1.0)';
            ctx.fillText(p.text, canvasW * 0.5, y);
        }

        ctx.restore();
    }

    _drawFallingChars(ctx, words, canvasH, _canvasH) {
        for (const fw of words) {
            const fontSize = fw.h / 1.2;

            ctx.save();
            ctx.font         = `bold ${fontSize}px "Helvetica Neue", Arial, "Noto Sans JP", sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';

            if (fw.isPenalty) {
                // ── 減点文字：黒背景＋赤グロー ──────────────
                // 背景の丸
                ctx.fillStyle = 'rgba(20,0,0,0.85)';
                ctx.beginPath();
                ctx.arc(fw.x, fw.y, fontSize * 0.65, 0, Math.PI * 2);
                ctx.fill();

                // 赤い枠
                ctx.strokeStyle = 'rgba(220,40,40,0.8)';
                ctx.lineWidth   = 1.5;
                ctx.stroke();

                // 文字
                ctx.shadowColor = 'rgba(255,60,60,0.9)';
                ctx.shadowBlur  = 10;
                ctx.fillStyle   = '#ff4040';
                ctx.fillText(fw.text, fw.x, fw.y);

                // −10 ラベル（小さく）
                ctx.font      = `bold ${fontSize * 0.45}px "Helvetica Neue", Arial, sans-serif`;
                ctx.fillStyle = 'rgba(255,100,100,0.9)';
                ctx.shadowBlur = 0;
                ctx.fillText('-10', fw.x, fw.y + fontSize * 0.8);
            } else {
                // ── 通常文字：白→オレンジ ───────────────────
                const startFrac = (fw.startY ?? 0) / (canvasH || 1);
                const t = Math.min(1, Math.max(0,
                    (fw.fallProgress - startFrac) / Math.max(0.01, 0.75 - startFrac)
                ));

                const r = Math.round(220 + t * (255 - 220));
                const g = Math.round(245 - t * (245 - 140));
                const b = Math.round(255 - t * 255);
                const color     = `rgb(${r},${g},${b})`;
                const glowColor = `rgba(${r},${g},${b},0.65)`;

                ctx.shadowColor = glowColor;
                ctx.shadowBlur  = 12 + t * 6;
                ctx.fillStyle   = color;
                ctx.fillText(fw.text, fw.x, fw.y);
            }

            ctx.restore();
        }
    }

    _drawScore(ctx, score, canvasW) {
        ctx.save();
        ctx.font         = 'bold 13px "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle    = 'rgba(244,211,94,0.9)';
        ctx.fillText(`SCORE  ${String(score).padStart(4, '0')}`, canvasW - 14, 12);
        ctx.restore();
    }

    _drawResult(ctx, score, canvasW, canvasH) {
        ctx.save();
        ctx.fillStyle = 'rgba(5,8,16,0.78)';
        ctx.fillRect(0, 0, canvasW, canvasH);

        const cx = canvasW / 2;
        const cy = canvasH / 2;

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        ctx.font      = `bold ${Math.max(18, canvasH * 0.044)}px "Helvetica Neue", Arial, sans-serif`;
        ctx.shadowColor = 'rgba(112,214,255,0.8)';
        ctx.shadowBlur  = 20;
        ctx.fillStyle   = '#ffffff';
        ctx.fillText('RESULT', cx, cy - canvasH * 0.08);

        ctx.font      = `bold ${Math.max(36, canvasH * 0.10)}px "Helvetica Neue", Arial, sans-serif`;
        ctx.shadowColor = 'rgba(244,211,94,0.9)';
        ctx.shadowBlur  = 24;
        ctx.fillStyle   = '#f4d35e';
        ctx.fillText(`${score}`, cx, cy + canvasH * 0.02);

        ctx.font      = `${Math.max(12, canvasH * 0.027)}px "Helvetica Neue", Arial, sans-serif`;
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(174,179,199,0.9)';
        ctx.fillText('歌詞キャッチ数', cx, cy + canvasH * 0.10);

        ctx.restore();
    }
}