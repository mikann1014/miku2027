/**
 * BackgroundRenderer
 *
 * 再生位置（progress 0〜1）に連動してスクロールする
 * 都市シルエット視差背景を描画する。
 *
 * レイヤー構成（遠→近の順に描画）:
 *   Layer 0: 遠景（非常にゆっくり）— 細いビル群、低透明度
 *   Layer 1: 中景（中速）         — 中サイズのビル群
 *   Layer 2: 近景（速い）         — 大きいビル群、高透明度
 *
 * 公開 API:
 *   renderer.draw(ctx, width, height, progress)
 */
export class BackgroundRenderer {
    // ─── レイヤー定義 ────────────────────────────────────────
    // TERRAIN_WINDOW は TerrainRenderer.DISPLAY_WINDOW と揃える。
    // 波形が totalSamples(4800) を流すとき、近景が totalWidth を1周する速度を計算する。
    // 近景オフセット = progress * totalSamples / TERRAIN_WINDOW * barSpacing * visibleBars
    //               = progress * (totalSamples / TERRAIN_WINDOW) * width
    // → parallaxScale = totalSamples / TERRAIN_WINDOW = 4800 / 300 = 16
    static TERRAIN_SAMPLE_TOTAL  = 4800;
    static TERRAIN_DISPLAY_WINDOW = 300;
    // parallaxScale: 波形1画面分が流れる間に背景が何画面分動くか
    static get PARALLAX_SCALE() {
        return BackgroundRenderer.TERRAIN_SAMPLE_TOTAL
             / BackgroundRenderer.TERRAIN_DISPLAY_WINDOW;
    }

    static LAYERS = [
        {
            // 遠景（近景の 1/8 の速度）
            parallaxRatio: 0.125,
            buildingW:   [12, 28],
            buildingH:   [0.08, 0.20],
            gap:         [6, 14],
            yBase:       0.82,
            color:       'rgba(40, 55, 110, 0.55)',
            seed:        1,
        },
        {
            // 中景（近景の 1/3 の速度）
            parallaxRatio: 0.33,
            buildingW:   [18, 42],
            buildingH:   [0.12, 0.30],
            gap:         [4, 10],
            yBase:       0.86,
            color:       'rgba(25, 38, 90, 0.75)',
            seed:        2,
        },
        {
            // 近景（波形と同速）
            parallaxRatio: 1.0,
            buildingW:   [28, 60],
            buildingH:   [0.18, 0.40],
            gap:         [2, 8],
            yBase:       0.90,
            color:       'rgba(15, 22, 65, 0.88)',
            seed:        3,
        },
    ];

    constructor() {
        // レイヤーごとのビルデータをキャッシュ（リサイズ時に再生成）
        this._layers = null;
        this._lastWidth = 0;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} width
     * @param {number} height
     * @param {number} progress  0〜1
     */
    draw(ctx, width, height, progress) {
        // キャンバスサイズが変わったらビルデータを再生成
        if (width !== this._lastWidth) {
            this._buildLayers(width, height);
            this._lastWidth = width;
        }

        // ── 夜空グラデーション ──
        this._drawSky(ctx, width, height);

        // ── 星 ──
        this._drawStars(ctx, width, height, progress);

        // ── 都市レイヤー（遠→近） ──
        for (let li = 0; li < BackgroundRenderer.LAYERS.length; li++) {
            const def       = BackgroundRenderer.LAYERS[li];
            const buildings = this._layers[li];
            const totalW    = buildings.totalWidth;

            // 近景（parallaxRatio=1.0）が波形と同速になるよう計算する。
            // 波形は progress が 1 進むと PARALLAX_SCALE 画面分スクロールする。
            // → rawOffset = progress * PARALLAX_SCALE * width * parallaxRatio
            const rawOffset = progress
                * BackgroundRenderer.PARALLAX_SCALE
                * width
                * def.parallaxRatio;

            const offset = rawOffset % totalW;

            this._drawCityLayer(ctx, width, height, def, buildings.data, offset, totalW);
        }
    }

    // ─── 内部実装 ─────────────────────────────────────────────

    _drawSky(ctx, width, height) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0,    '#050810');
        grad.addColorStop(0.45, '#0c1228');
        grad.addColorStop(0.75, '#111a3a');
        grad.addColorStop(1,    '#1a2550');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    _drawStars(ctx, width, height, progress) {
        // 星は2層（速さ違い）でゆっくり流れる
        // 星は遠景より遅く（parallaxRatio 0.04〜0.08 相当）
        const starDefs = [
            { count: 60, speed: 0.04, size: 1.0, alpha: 0.5 },
            { count: 30, speed: 0.08, size: 1.5, alpha: 0.7 },
        ];

        for (const def of starDefs) {
            const rng = this._rng(42 + def.speed * 100);

            for (let i = 0; i < def.count; i++) {
                const baseX  = rng() * width;
                const y      = rng() * height * 0.75;
                const offset = (progress * BackgroundRenderer.PARALLAX_SCALE * width * def.speed) % width;
                const x      = ((baseX - offset) % width + width) % width;

                // 星のまたたき
                const twinkle = 0.7 + 0.3 * Math.sin(i * 2.3 + progress * 20);

                ctx.fillStyle = `rgba(200, 220, 255, ${def.alpha * twinkle})`;
                ctx.beginPath();
                ctx.arc(x, y, def.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /** レイヤーごとのビルデータを事前生成してキャッシュ */
    _buildLayers(width, height) {
        this._layers = BackgroundRenderer.LAYERS.map((def, li) => {
            const rng      = this._rng(def.seed * 1000 + li);
            const buildings = [];
            let x = 0;

            // 画面幅の 2.5 倍分のビルを生成してループに備える
            const targetWidth = width * 2.5;

            while (x < targetWidth) {
                const bw = this._lerp(def.buildingW[0], def.buildingW[1], rng());
                const bh = this._lerp(def.buildingH[0], def.buildingH[1], rng()) * height;
                const gap = this._lerp(def.gap[0], def.gap[1], rng());

                // ビルに窓をランダムに
                const windowRows = Math.floor(bh / 12);
                const windowCols = Math.floor(bw / 8);
                const windows    = [];

                for (let wr = 0; wr < windowRows; wr++) {
                    for (let wc = 0; wc < windowCols; wc++) {
                        if (rng() > 0.45) {
                            windows.push({ row: wr, col: wc, lit: rng() > 0.4 });
                        }
                    }
                }

                buildings.push({ x, w: bw, h: bh, gap, windows });
                x += bw + gap;
            }

            return { data: buildings, totalWidth: x };
        });
    }

    _drawCityLayer(ctx, width, height, def, buildings, offset, totalWidth) {
        const groundY = def.yBase * height;

        ctx.save();

        for (const b of buildings) {
            // オフセットを引いてループ表示
            let bx = b.x - offset;

            // 画面外左にはみ出したら右側に繰り返す
            if (bx + b.w < 0) {
                bx += totalWidth;
            }

            // 画面右端を超えたら描画しない
            if (bx > width) {
                continue;
            }

            const by = groundY - b.h;

            // ── ビル本体 ──
            ctx.fillStyle = def.color;
            ctx.fillRect(bx, by, b.w, b.h + 2); // +2 は地面との接合

            // ── 屋上ライン（淡いハイライト） ──
            ctx.fillStyle = 'rgba(100, 140, 220, 0.18)';
            ctx.fillRect(bx, by, b.w, 2);

            // ── 窓（光っている窓のみ描画） ──
            const winW = Math.max(2, b.w / (Math.floor(b.w / 8) + 1) - 1);
            const winH = Math.max(2, 5);

            for (const win of b.windows) {
                if (!win.lit) continue;

                const wx = bx + win.col * (winW + 1) + 1;
                const wy = by + win.row * (winH + 3) + 4;

                if (wy + winH > groundY) continue;

                ctx.fillStyle = 'rgba(255, 240, 180, 0.35)';
                ctx.fillRect(wx, wy, winW, winH);
            }
        }

        ctx.restore();
    }

    // ── ユーティリティ ────────────────────────────────────────

    /** シードベースの簡易乱数生成器（再現性のある建物形状のため） */
    _rng(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            return (s >>> 0) / 0xffffffff;
        };
    }

    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
}