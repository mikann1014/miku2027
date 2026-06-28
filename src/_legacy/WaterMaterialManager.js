import * as THREE from 'three';

export class WaterMaterialManager {
    constructor(scene = null, options = {}) {
        this.scene = scene;

        this.surfaceColor = options.surfaceColor ?? 0x003f66;
        this.surfaceOpacity = options.surfaceOpacity ?? 0.48;

        this.gridColor = options.gridColor ?? 0x00eaff;
        this.gridOpacity = options.gridOpacity ?? 0.62;

        this.gridSize = options.gridSize ?? 8.0;
        this.gridLineWidth = options.gridLineWidth ?? 1.05;

        // 今は本物のReflector反射は使わない
        // 地形的におかしい映り込みを防ぐため
        this.useReflection = options.useReflection ?? false;

        // 水面をオブジェクトより先に描く
        this.waterRenderOrder = options.waterRenderOrder ?? -5;
    }

    /**
     * lake/water メッシュに半透明水面 + グリッドを適用する
     * @param {THREE.Mesh} node
     */
    applyWaterMaterial(node) {
        if (!node || !node.isMesh) return;
        if (node.userData.waterMaterialApplied) return;

        node.userData.waterMaterialApplied = true;
        node.userData.surfaceType = 'water';

        node.material = this.createWaterMaterial();

        // waterを先に描くことで、後から描画される花・草・Prismが
        // lakeの下に沈んで見える問題を防ぐ
        node.renderOrder = this.waterRenderOrder;

        node.material.transparent = true;

        // 深度は読むが書かない
        // これで他オブジェクトとの前後関係が自然になる
        node.material.depthTest = true;
        node.material.depthWrite = false;
    }

    createWaterMaterial() {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthTest: true,
            depthWrite: false,
            side: THREE.DoubleSide,

            extensions: {
                derivatives: true
            },

            uniforms: {
                uSurfaceColor: {
                    value: new THREE.Color(this.surfaceColor)
                },
                uSurfaceOpacity: {
                    value: this.surfaceOpacity
                },

                uGridColor: {
                    value: new THREE.Color(this.gridColor)
                },
                uGridOpacity: {
                    value: this.gridOpacity
                },

                uGridSize: {
                    value: this.gridSize
                },
                uGridLineWidth: {
                    value: this.gridLineWidth
                }
            },

            vertexShader: `
                varying vec3 vWorldPosition;

                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;

                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,

            fragmentShader: `
                uniform vec3 uSurfaceColor;
                uniform float uSurfaceOpacity;

                uniform vec3 uGridColor;
                uniform float uGridOpacity;

                uniform float uGridSize;
                uniform float uGridLineWidth;

                varying vec3 vWorldPosition;

                float gridLine(vec2 worldXZ) {
                    vec2 coord = worldXZ / uGridSize;

                    vec2 grid = abs(fract(coord - 0.5) - 0.5);
                    vec2 derivative = fwidth(coord);

                    vec2 line = 1.0 - smoothstep(
                        vec2(0.0),
                        derivative * uGridLineWidth,
                        grid
                    );

                    return max(line.x, line.y);
                }

                void main() {
                    float lineStrength = gridLine(vWorldPosition.xz);

                    vec3 finalColor = mix(
                        uSurfaceColor,
                        uGridColor,
                        lineStrength
                    );

                    float alpha = max(
                        uSurfaceOpacity,
                        lineStrength * uGridOpacity
                    );

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `
        });
    }
}