import * as THREE from 'three';

export class WorldResonanceEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.active = false;
        this.elapsed = 0;

        this.duration = options.duration ?? 4.2;

        this.targets = [];

        this.maxSway = options.maxSway ?? 0.11;
        this.scaleBoost = options.scaleBoost ?? 0.18;
        this.colorBoost = options.colorBoost ?? 1.25;
    }

    start(objects = [], options = {}) {
        this.clear();

        this.duration =
            options.duration ?? this.duration;

        this.targets =
            objects
                .map(entry => {
                    if (!entry) return null;

                    if (entry.isObject3D) return entry;

                    if (entry.object?.isObject3D) {
                        return entry.object;
                    }

                    return null;
                })
                .filter(obj => !!obj)
                .map(object => ({
                    object,
                    baseRotation: object.rotation.clone(),
                    baseScale: object.scale.clone(),
                    phase: Math.random() * Math.PI * 2,
                    materialSnapshots:
                        this.captureMaterials(object)
                }));

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[WorldResonanceEffect] Started. targets=${this.targets.length}`
        );
    }

    captureMaterials(object) {
        const snapshots = [];
        const seen = new Set();

        object.traverse(child => {
            const materials = [];

            if (child.material) {
                if (Array.isArray(child.material)) {
                    materials.push(...child.material);
                } else {
                    materials.push(child.material);
                }
            }

            if (child.userData?.lineMaterial) {
                materials.push(child.userData.lineMaterial);
            }

            materials.forEach(material => {
                if (!material || seen.has(material)) return;

                seen.add(material);

                snapshots.push({
                    material,
                    baseColor: material.color
                        ? material.color.clone()
                        : null,
                    baseOpacity:
                        typeof material.opacity === 'number'
                            ? material.opacity
                            : 1.0
                });
            });
        });

        return snapshots;
    }

    update(delta = 0.016) {
        if (!this.active) return;

        this.elapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.elapsed / this.duration,
                0,
                1
            );

        const envelope =
            Math.sin(t * Math.PI);

        this.targets.forEach(entry => {
            const {
                object,
                baseRotation,
                baseScale,
                phase,
                materialSnapshots
            } = entry;

            if (!object || !object.parent) return;

            const wave =
                Math.sin(
                    this.elapsed * 5.0 + phase
                ) * envelope;

            object.rotation.x =
                baseRotation.x +
                wave * this.maxSway * 0.55;

            object.rotation.z =
                baseRotation.z +
                wave * this.maxSway;

            object.scale
                .copy(baseScale)
                .multiplyScalar(
                    1.0 + envelope * this.scaleBoost
                );

            materialSnapshots.forEach(snapshot => {
                const material = snapshot.material;

                if (!material) return;

                if (
                    material.color &&
                    snapshot.baseColor
                ) {
                    material.color
                        .copy(snapshot.baseColor)
                        .multiplyScalar(
                            1.0 +
                            envelope * this.colorBoost
                        );
                }

                material.opacity =
                    THREE.MathUtils.clamp(
                        snapshot.baseOpacity +
                            envelope * 0.28,
                        0,
                        1
                    );

                material.transparent = true;
                material.needsUpdate = true;
            });
        });

        if (t >= 1.0) {
            this.finish();
        }
    }

    finish() {
        this.targets.forEach(entry => {
            const {
                object,
                baseRotation,
                baseScale,
                materialSnapshots
            } = entry;

            if (object) {
                object.rotation.copy(baseRotation);
                object.scale.copy(baseScale);
            }

            materialSnapshots.forEach(snapshot => {
                const material = snapshot.material;

                if (!material) return;

                if (
                    material.color &&
                    snapshot.baseColor
                ) {
                    material.color.copy(
                        snapshot.baseColor
                    );
                }

                material.opacity =
                    snapshot.baseOpacity;

                material.needsUpdate = true;
            });
        });

        this.active = false;
        this.elapsed = 0;
    }

    clear() {
        if (this.active) {
            this.finish();
        }

        this.targets = [];
        this.active = false;
        this.elapsed = 0;
    }
}
``