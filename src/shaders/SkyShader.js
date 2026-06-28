export const SkyShader = {
    vertexShader: `
        varying vec3 vDirection;

        void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonGlowColor;

        uniform float exponent;
        uniform float horizonGlowStrength;

        varying vec3 vDirection;

        void main() {
            vec3 dir = normalize(vDirection);

            // dir.y は -1.0 〜 1.0
            // それを 0.0 〜 1.0 に変換
            float h = dir.y * 0.5 + 0.5;

            // 地平線〜中間色へのグラデーション
            float lowerMix = smoothstep(0.0, 0.62, h);

            // 中間色〜上空色へのグラデーション
            float upperMix = smoothstep(0.32, 1.0, pow(h, exponent));

            vec3 lowerColor = mix(bottomColor, midColor, lowerMix);
            vec3 upperColor = mix(midColor, topColor, upperMix);

            vec3 finalColor = mix(
                lowerColor,
                upperColor,
                smoothstep(0.25, 0.95, h)
            );

            // 地平線付近のオレンジ発光
            // 低い位置に広めの夕焼け帯を作る
            float horizon = 1.0 - abs(dir.y);
            horizon = pow(clamp(horizon, 0.0, 1.0), 3.0);

            // 地平線より少し上までオレンジが伸びるようにする
            float lowSkyMask = 1.0 - smoothstep(0.42, 0.82, h);

            finalColor += horizonGlowColor * horizon * lowSkyMask * horizonGlowStrength;

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};