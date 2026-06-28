/**
 * SkyShader
 *
 * ・空のグラデーションを描画するシェーダ
 * ・下（地平線）→中間→上空 の3層カラー
 * ・地平線に発光帯（夕焼け）を追加
 *
 * 特徴：
 * - シンプルな方向ベクトルベース
 * - smoothstepで滑らかな遷移
 * - horizonGlowで雰囲気調整可能
 */
export const SkyShader = {

    /**
     * =========================
     * ✅ Vertex Shader
     * =========================
     */
    vertexShader: `
        varying vec3 vDirection;

        void main() {

            /**
             * position を正規化して方向情報として渡す
             * → 空球（スカイドーム）前提
             */
            vDirection = normalize(position);

            // 通常の頂点変換
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    /**
     * =========================
     * ✅ Fragment Shader
     * =========================
     */
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonGlowColor;

        uniform float exponent;
        uniform float horizonGlowStrength;

        varying vec3 vDirection;

        void main() {

            // 正規化方向（念のため）
            vec3 dir = normalize(vDirection);

            /**
             * dir.y は -1.0 〜 1.0
             * → 0.0 〜 1.0 に変換
             */
            float h = dir.y * 0.5 + 0.5;

            /**
             * =========================
             * グラデーション計算
             * =========================
             */

            // 下→中間
            float lowerMix = smoothstep(0.0, 0.62, h);

            // 中間→上（指数でカーブ調整）
            float upperMix = smoothstep(0.32, 1.0, pow(h, exponent));

            // 各カラー混合
            vec3 lowerColor = mix(bottomColor, midColor, lowerMix);
            vec3 upperColor = mix(midColor, topColor, upperMix);

            // 最終グラデーション
            vec3 finalColor = mix(
                lowerColor,
                upperColor,
                smoothstep(0.25, 0.95, h)
            );

            /**
             * =========================
             * 地平線グロウ（夕焼け）
             * =========================
             */

            // 地平線付近強度（y=0付近が最大）
            float horizon = 1.0 - abs(dir.y);

            horizon = pow(
                clamp(horizon, 0.0, 1.0),
                3.0
            );

            /**
             * 下空限定マスク
             * → 上空に影響させない
             */
            float lowSkyMask =
                1.0 - smoothstep(0.42, 0.82, h);

            // 加算合成（発光）
            finalColor +=
                horizonGlowColor *
                horizon *
                lowSkyMask *
                horizonGlowStrength;

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};