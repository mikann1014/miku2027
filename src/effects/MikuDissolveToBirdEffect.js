import * as THREE from 'three';

export class MikuDissolveToBirdEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'mikuDissolveFogOnlyEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        this.active = false;
        this.completed = false;

        this.points = null;
        this.geometry = null;
        this.material = null;

        this.elapsed = 0;

        this.duration = options.duration ?? 2.2;
        this.particleCount = options.particleCount ?? 2400;
        this.particleSize = options.particleSize ?? 0.03;

        this.hideSourceAt = options.hideSourceAt ?? 0.08;

        this.fogSpreadRadius = options.fogSpreadRadius ?? 11.5;
        this.fogRiseMin = options.fogRiseMin ?? 1.8;
        this.fogRiseMax = options.fogRiseMax ?? 7.2;
        this.noiseStrength = options.noiseStrength ?? 0.85;
        this.swirlStrength = options.swirlStrength ?? 0.7;

        this.sourceModel = null;
        this.sourceWasVisible = true;
        this.hasHiddenSource = false;

        this.positions = null;
        this.startPositions = null;
        this.endPositions = null;
        this.seeds = null;
    }

    start(sourceModel) {
        if (!sourceModel || !this.scene) {
            return false;
        }

        this.clear();

        this.active = true;
        this.completed = false;
        this.elapsed = 0;

        this.sourceModel = sourceModel;
        this.sourceWasVisible = sourceModel.visible;
        this.hasHiddenSource = false;

        const samples =
            this.sampleModelSurfacePoints(
                sourceModel,
                this.particleCount
            );

        if (samples.length === 0) {
            console.warn('[MikuDissolveToBirdEffect] No sample points.');
            return false;
        }

        const count = samples.length;

        this.positions = new Float32Array(count * 3);
        this.startPositions = new Float32Array(count * 3);
        this.endPositions = new Float32Array(count * 3);
        this.seeds = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const point = samples[i];
            const ix = i * 3;

            this.positions[ix] = point.x;
            this.positions[ix + 1] = point.y;
            this.positions[ix + 2] = point.z;

            this.startPositions[ix] = point.x;
            this.startPositions[ix + 1] = point.y;
            this.startPositions[ix + 2] = point.z;

            const angle = Math.random() * Math.PI * 2;
            const radius =
                Math.pow(Math.random(), 0.45) *
                this.fogSpreadRadius;

            const rise =
                THREE.MathUtils.lerp(
                    this.fogRiseMin,
                    this.fogRiseMax,
                    Math.random()
                );

            this.endPositions[ix] =
                point.x + Math.cos(angle) * radius;

            this.endPositions[ix + 1] =
                point.y + rise;

            this.endPositions[ix + 2] =
                point.z + Math.sin(angle) * radius;

            this.seeds[ix] = Math.random() * Math.PI * 2;
            this.seeds[ix + 1] = Math.random() * Math.PI * 2;
            this.seeds[ix + 2] = Math.random() * Math.PI * 2;
        }

        this.geometry = new THREE.BufferGeometry();

        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(this.positions, 3)
        );

        this.material = new THREE.PointsMaterial({
            color: 0xeaffff,
            size: this.particleSize,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });

        this.points = new THREE.Points(
            this.geometry,
            this.material
        );

        this.points.name = 'miku_dissolve_fog_only_particles';
        this.points.renderOrder = 96;
        this.points.frustumCulled = false;

        this.group.add(this.points);

        console.log('[MikuDissolveToBirdEffect] Fog dissolve started.');

        return true;
    }

    sampleModelSurfacePoints(model, count) {
        const meshPoints = [];

        model.updateMatrixWorld(true);

        model.traverse(child => {
            if (!child || !child.isMesh || !child.geometry) {
                return;
            }

            const positionAttribute =
                child.geometry.attributes.position;

            if (!positionAttribute) {
                return;
            }

            const vertex = new THREE.Vector3();
            const vertexCount = positionAttribute.count;

            const sampleCount =
                Math.max(
                    64,
                    Math.floor(count / 7)
                );

            for (let i = 0; i < sampleCount; i++) {
                const index =
                    Math.floor(Math.random() * vertexCount);

                vertex.fromBufferAttribute(
                    positionAttribute,
                    index
                );

                child.localToWorld(vertex);

                meshPoints.push(vertex.clone());
            }
        });

        if (meshPoints.length === 0) {
            return [];
        }

        const result = [];

        for (let i = 0; i < count; i++) {
            result.push(
                meshPoints[
                    Math.floor(Math.random() * meshPoints.length)
                ].clone()
            );
        }

        return result;
    }

    update(delta = 0.016) {
        if (!this.active || !this.points || !this.geometry) {
            return false;
        }

        this.elapsed += delta;

        if (
            !this.hasHiddenSource &&
            this.elapsed >= this.hideSourceAt
        ) {
            this.hasHiddenSource = true;

            if (this.sourceModel) {
                this.sourceModel.visible = false;
            }
        }

        const t =
            THREE.MathUtils.clamp(
                this.elapsed / this.duration,
                0,
                1
            );

        const ease =
            THREE.MathUtils.smoothstep(t, 0, 1);

        const count =
            this.positions.length / 3;

        const time =
            this.elapsed * 2.8;

        for (let i = 0; i < count; i++) {
            const ix = i * 3;

            const sx = this.startPositions[ix];
            const sy = this.startPositions[ix + 1];
            const sz = this.startPositions[ix + 2];

            const ex = this.endPositions[ix];
            const ey = this.endPositions[ix + 1];
            const ez = this.endPositions[ix + 2];

            const seedX = this.seeds[ix];
            const seedY = this.seeds[ix + 1];
            const seedZ = this.seeds[ix + 2];

            const fogPower = 1.0 - ease;

            const swirl =
                Math.sin(time + seedX) *
                this.swirlStrength *
                fogPower;

            const noiseX =
                Math.sin(time * 1.6 + seedY) *
                this.noiseStrength *
                fogPower;

            const noiseY =
                Math.sin(time * 1.2 + seedZ) *
                0.32 *
                fogPower;

            const noiseZ =
                Math.cos(time * 1.4 + seedX) *
                this.noiseStrength *
                fogPower;

            this.positions[ix] =
                THREE.MathUtils.lerp(sx, ex, ease) +
                noiseX +
                swirl;

            this.positions[ix + 1] =
                THREE.MathUtils.lerp(sy, ey, ease) +
                noiseY;

            this.positions[ix + 2] =
                THREE.MathUtils.lerp(sz, ez, ease) +
                noiseZ -
                swirl;
        }

        this.geometry.attributes.position.needsUpdate = true;

        const fadeIn =
            THREE.MathUtils.smoothstep(t, 0.0, 0.1);

        const fadeOut =
            1.0 -
            THREE.MathUtils.smoothstep(t, 0.55, 1.0);

        this.material.opacity =
            0.82 * fadeIn * fadeOut;

        if (t >= 1.0) {
            this.active = false;
            this.completed = true;

            console.log('[MikuDissolveToBirdEffect] Fog dissolve completed.');

            return true;
        }

        return false;
    }

    clear() {
        if (this.points) {
            this.points.parent?.remove(this.points);
        }

        this.geometry?.dispose?.();
        this.material?.dispose?.();

        this.points = null;
        this.geometry = null;
        this.material = null;

        this.positions = null;
        this.startPositions = null;
        this.endPositions = null;
        this.seeds = null;

        this.active = false;
        this.completed = false;
        this.elapsed = 0;

        this.sourceModel = null;
    }
}