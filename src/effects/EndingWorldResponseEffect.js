import * as THREE from 'three';

export class EndingWorldResponseEffect {
    constructor(scene, spawnManager) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        this.active = false;
        this.elapsed = 0;

        this.duration = 0.55;
        this.delayPerObject = 0.035;

        this.entries = [];
    }

    start(objects = [], options = {}) {
        this.clear();

        if (!objects || objects.length === 0) {
            return;
        }

        this.duration =
            options.duration ?? 0.55;

        this.delayPerObject =
            options.delayPerObject ?? 0.035;

        const sorted =
            [...objects].sort((a, b) => {
                return a.position.z - b.position.z;
            });

        this.entries =
            sorted.map((object, index) => {
                const materials = [];

                object.traverse?.(child => {
                    if (child.userData?.lineMaterial) {
                        materials.push({
                            material: child.userData.lineMaterial,
                            baseOpacity:
                                child.userData.lineMaterial.opacity ?? 1,
                            baseColor:
                                child.userData.lineMaterial.color?.clone?.()
                                    || new THREE.Color(0xffffff)
                        });
                    }

                    if (child.material) {
                        const mats =
                            Array.isArray(child.material)
                                ? child.material
                                : [child.material];

                        mats.forEach(material => {
                            if (!material) return;

                            materials.push({
                                material,
                                baseOpacity:
                                    material.opacity ?? 1,
                                baseColor:
                                    material.color?.clone?.()
                                        || new THREE.Color(0xffffff)
                            });
                        });
                    }
                });

                return {
                    object,
                    index,
                    delay: index * this.delayPerObject,
                    baseScale: object.scale.clone(),
                    materials,
                    rippleSpawned: false
                };
            });

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[EndingWorldResponseEffect] Started. count=${this.entries.length}`
        );
    }

    update(delta = 0.016) {
        if (!this.active) {
            return;
        }

        this.elapsed += delta;

        let allDone = true;

        this.entries.forEach(entry => {
            const localTime =
                this.elapsed - entry.delay;

            if (localTime < 0) {
                allDone = false;
                return;
            }

            const t =
                THREE.MathUtils.clamp(
                    localTime / this.duration,
                    0,
                    1
                );

            if (t < 1) {
                allDone = false;
            }

            const wave =
                Math.sin(t * Math.PI);

            const scale =
                1.0 + wave * 0.035;

            if (entry.object && entry.baseScale) {
                entry.object.scale
                    .copy(entry.baseScale)
                    .multiplyScalar(scale);
            }

            entry.materials.forEach(item => {
                const material =
                    item.material;

                if (!material) return;

                material.transparent = true;

                material.opacity =
                    THREE.MathUtils.clamp(
                        item.baseOpacity + wave * 0.28,
                        0,
                        1
                    );

                if (material.color && item.baseColor) {
                    material.color
                        .copy(item.baseColor)
                        .multiplyScalar(
                            1.0 + wave * 0.65
                        );
                }

                material.needsUpdate = true;
            });

            const surfaceType =
                entry.object?.userData?.surfaceType ||
                entry.object?.userData?.placementMetadata?.surfaceType;

            if (
                !entry.rippleSpawned &&
                surfaceType === 'water' &&
                this.spawnManager?.spawnWaterRipple
            ) {
                this.spawnManager.spawnWaterRipple(
                    entry.object.position
                );

                entry.rippleSpawned = true;
            }

            if (t >= 1) {
                if (entry.object && entry.baseScale) {
                    entry.object.scale.copy(
                        entry.baseScale
                    );
                }

                entry.materials.forEach(item => {
                    const material =
                        item.material;

                    if (!material) return;

                    material.opacity =
                        item.baseOpacity;

                    if (material.color && item.baseColor) {
                        material.color.copy(
                            item.baseColor
                        );
                    }

                    material.needsUpdate = true;
                });
            }
        });

        if (allDone) {
            this.active = false;

            console.log(
                '[EndingWorldResponseEffect] Completed.'
            );
        }
    }

    clear() {
        this.active = false;
        this.elapsed = 0;
        this.entries = [];
    }
}