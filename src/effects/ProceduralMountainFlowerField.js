import * as THREE from 'three';


/**
 * ProceduralMountainFlowerField
 *
 * ・山に配置された多数の花（Points）を管理するクラス
 * ・Canvasテクスチャで花の粒子を描画
 * ・色ベースで発光のような演出を行う
 *
 * 主な機能：
 * - バッチごとの生成（anchor対応）
 * - 全体伝播（Propagation）
 * - 全体パルス（Pulse）
 */


export class ProceduralMountainFlowerField {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.rootGroup = new THREE.Group();
        this.rootGroup.name = 'proceduralMountainFlowerFieldRoot';

        if (this.scene) {
            this.scene.add(this.rootGroup);
        }

        this.entries = [];

        this.active = false;

        this.texture = null;
        this.camera = null;

        this.defaultPointSize =
            options.pointSize ?? 1.45;

        this.defaultOpacity =
            options.opacity ?? 0.95;

        this.propagationActive = false;
        this.propagationElapsed = 0;

        this.propagationDuration =
            options.propagationDuration ?? 3.4;

        this.propagationDelayPerFlower =
            options.propagationDelayPerFlower ?? 0.004;

        this.pulseActive = false;
        this.pulseElapsed = 0;

        this.pulseDuration =
            options.pulseDuration ?? 3.0;
    }

    setCamera(camera) {
        /*
         * PointsMaterial は常にスクリーン向きの点として描画される。
         * 現状では camera は保持だけしておく。
         */
        this.camera = camera || null;
    }

    start(points = [], options = {}) {
        /*
         * 互換用。
         * anchor 指定がない場合は rootGroup に配置する。
         */
        this.startAnchoredBatches(
            [
                {
                    name: 'world_mountain_flower_points',
                    anchor: this.rootGroup,
                    points
                }
            ],
            options
        );
    }

    startAnchoredBatches(batches = [], options = {}) {
        this.clear();

        if (!Array.isArray(batches) || batches.length === 0) {
            return;
        }

        this.texture =
            this.createFlowerDotTexture();

        let totalCount = 0;

        batches.forEach(batch => {
            if (
                !batch ||
                !batch.anchor ||
                !Array.isArray(batch.points) ||
                batch.points.length === 0
            ) {
                return;
            }

            const entry =
                this.createEntry(
                    batch,
                    options
                );

            if (!entry) {
                return;
            }

            batch.anchor.add(
                entry.pointsObject
            );

            this.entries.push(
                entry
            );

            totalCount += entry.count;
        });

        this.active =
            this.entries.length > 0;

        console.log(
            `[ProceduralMountainFlowerField] Started. count=${totalCount}, batches=${this.entries.length}`
        );
    }

    createEntry(batch, options = {}) {
        const points =
            batch.points;

        const count =
            points.length;

        if (count <= 0) {
            return null;
        }

        const positions =
            new Float32Array(count * 3);

        const colors =
            new Float32Array(count * 3);

        const baseColors =
            new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const point =
                points[i];

            const ix =
                i * 3;

            positions[ix] =
                point.x;

            positions[ix + 1] =
                point.y;

            positions[ix + 2] =
                point.z;

            const color =
                this.createVisibleFlowerColor();

            colors[ix] =
                color.r;

            colors[ix + 1] =
                color.g;

            colors[ix + 2] =
                color.b;

            baseColors[ix] =
                color.r;

            baseColors[ix + 1] =
                color.g;

            baseColors[ix + 2] =
                color.b;
        }

        const geometry =
            new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                positions,
                3
            )
        );

        geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(
                colors,
                3
            )
        );

        const material =
            new THREE.PointsMaterial({
                size:
                    options.pointSize ??
                    this.defaultPointSize,

                map:
                    this.texture,

                vertexColors:
                    true,

                transparent:
                    true,

                opacity:
                    options.opacity ??
                    this.defaultOpacity,

                /*
                 * 背景山の発光花なので、地形への埋まりより視認性優先。
                 */
                depthWrite:
                    false,

                depthTest:
                    false,

                blending:
                    THREE.AdditiveBlending,

                sizeAttenuation:
                    true,

                toneMapped:
                    false
            });

        const pointsObject =
            new THREE.Points(
                geometry,
                material
            );

        pointsObject.name =
            batch.name ||
            'procedural_mountain_flower_points';

        pointsObject.frustumCulled = false;
        pointsObject.renderOrder = 48;

        return {
            anchor: batch.anchor,
            pointsObject,
            geometry,
            material,
            count,
            baseColors
        };
    }

    createFlowerDotTexture() {
        const canvas =
            document.createElement('canvas');

        const context =
            canvas.getContext('2d');

        canvas.width = 128;
        canvas.height = 128;

        const cx = 64;
        const cy = 64;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const gradient =
            context.createRadialGradient(
                cx,
                cy,
                1,
                cx,
                cy,
                58
            );

        gradient.addColorStop(
            0.0,
            'rgba(255,255,255,1.0)'
        );

        gradient.addColorStop(
            0.22,
            'rgba(255,255,255,0.96)'
        );

        gradient.addColorStop(
            0.58,
            'rgba(255,255,255,0.36)'
        );

        gradient.addColorStop(
            1.0,
            'rgba(255,255,255,0.0)'
        );

        context.fillStyle = gradient;

        context.beginPath();

        context.arc(
            cx,
            cy,
            58,
            0,
            Math.PI * 2
        );

        context.fill();

        const texture =
            new THREE.CanvasTexture(
                canvas
            );

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    createVisibleFlowerColor() {
        const palette = [
            0xff4fa8,
            0xff7ad9,
            0xffdc4f,
            0x52f7ff,
            0x7ffcff,
            0xa977ff,
            0xff9f4f
        ];

        const hex =
            palette[
                Math.floor(
                    Math.random() * palette.length
                )
            ];

        const color =
            new THREE.Color(hex);

        color.multiplyScalar(
            THREE.MathUtils.lerp(
                1.15,
                1.75,
                Math.random()
            )
        );

        color.r =
            Math.min(
                color.r,
                1.0
            );

        color.g =
            Math.min(
                color.g,
                1.0
            );

        color.b =
            Math.min(
                color.b,
                1.0
            );

        return color;
    }

    startPropagation(options = {}) {
        if (!this.active || this.entries.length === 0) {
            return;
        }

        this.propagationDuration =
            options.duration ??
            this.propagationDuration;

        this.propagationDelayPerFlower =
            options.delayPerFlower ??
            this.propagationDelayPerFlower;

        this.propagationElapsed = 0;
        this.propagationActive = true;

        console.log(
            '[ProceduralMountainFlowerField] Light propagation started.'
        );
    }

    pulseAll(options = {}) {
        if (!this.active || this.entries.length === 0) {
            return;
        }

        this.pulseDuration =
            options.duration ??
            this.pulseDuration;

        this.pulseElapsed = 0;
        this.pulseActive = true;
    }

    update(arg1 = 0.016, arg2 = undefined) {
        if (!this.active) {
            return;
        }

        let delta =
            typeof arg1 === 'number'
                ? arg1
                : arg2;

        if (
            typeof delta !== 'number' ||
            !Number.isFinite(delta) ||
            delta <= 0 ||
            delta > 0.1
        ) {
            delta = 0.016;
        }

        if (this.propagationActive) {
            this.updatePropagation(
                delta
            );
        }

        if (this.pulseActive) {
            this.updatePulse(
                delta
            );
        }
    }

    updatePropagation(delta) {
        this.propagationElapsed += delta;

        let globalIndexOffset = 0;
        let totalCount = 0;

        this.entries.forEach(entry => {
            const colorAttribute =
                entry.geometry.getAttribute('color');

            if (!colorAttribute) {
                return;
            }

            for (let i = 0; i < entry.count; i++) {
                const localTime =
                    this.propagationElapsed -
                    (globalIndexOffset + i) *
                    this.propagationDelayPerFlower;

                const t =
                    THREE.MathUtils.clamp(
                        localTime / this.propagationDuration,
                        0,
                        1
                    );

                const wave =
                    localTime <= 0
                        ? 0
                        : Math.sin(t * Math.PI);

                const boost =
                    1.0 + wave * 0.9;

                const ix =
                    i * 3;

                colorAttribute.array[ix] =
                    Math.min(
                        entry.baseColors[ix] * boost,
                        1.0
                    );

                colorAttribute.array[ix + 1] =
                    Math.min(
                        entry.baseColors[ix + 1] * boost,
                        1.0
                    );

                colorAttribute.array[ix + 2] =
                    Math.min(
                        entry.baseColors[ix + 2] * boost,
                        1.0
                    );
            }

            colorAttribute.needsUpdate = true;

            globalIndexOffset += entry.count;
            totalCount += entry.count;
        });

        const maxTime =
            this.propagationDuration +
            totalCount *
            this.propagationDelayPerFlower;

        if (this.propagationElapsed >= maxTime) {
            this.propagationActive = false;
            this.restoreBaseColors();
        }
    }

    updatePulse(delta) {
        this.pulseElapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.pulseElapsed / this.pulseDuration,
                0,
                1
            );

        const wave =
            Math.sin(t * Math.PI);

        const boost =
            1.0 + wave * 0.8;

        this.entries.forEach(entry => {
            const colorAttribute =
                entry.geometry.getAttribute('color');

            if (!colorAttribute) {
                return;
            }

            for (let i = 0; i < entry.count; i++) {
                const ix =
                    i * 3;

                colorAttribute.array[ix] =
                    Math.min(
                        entry.baseColors[ix] * boost,
                        1.0
                    );

                colorAttribute.array[ix + 1] =
                    Math.min(
                        entry.baseColors[ix + 1] * boost,
                        1.0
                    );

                colorAttribute.array[ix + 2] =
                    Math.min(
                        entry.baseColors[ix + 2] * boost,
                        1.0
                    );
            }

            colorAttribute.needsUpdate = true;
        });

        if (t >= 1.0) {
            this.pulseActive = false;
            this.restoreBaseColors();
        }
    }

    restoreBaseColors() {
        this.entries.forEach(entry => {
            const colorAttribute =
                entry.geometry.getAttribute('color');

            if (!colorAttribute) {
                return;
            }

            colorAttribute.array.set(
                entry.baseColors
            );

            colorAttribute.needsUpdate = true;
        });
    }

    clear() {
        this.entries.forEach(entry => {
            entry.pointsObject?.parent?.remove(
                entry.pointsObject
            );

            entry.geometry?.dispose?.();

            /*
             * texture は this.texture で共有しているため、
             * material.dispose のみ行う。
             */
            entry.material?.dispose?.();
        });

        this.entries = [];

        if (this.texture) {
            this.texture.dispose?.();
        }

        this.texture = null;

        this.active = false;

        this.propagationActive = false;
        this.pulseActive = false;

        this.propagationElapsed = 0;
        this.pulseElapsed = 0;
    }
}