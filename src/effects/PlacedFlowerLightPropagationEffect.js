import * as THREE from 'three';

export class PlacedFlowerLightPropagationEffect {
    constructor(options = {}) {
        this.active = false;
        this.elapsed = 0;

        this.duration =
            options.duration ?? 5.2;

        this.delayPerObject =
            options.delayPerObject ?? 0.14;

        this.entries = [];
    }

    start(objects = [], options = {}) {
        this.clear();

        this.duration =
            options.duration ?? this.duration;

        this.delayPerObject =
            options.delayPerObject ?? this.delayPerObject;

        this.entries =
            objects
                .filter(object => !!object)
                .map((object, index) => {
                    return {
                        object,
                        index,
                        materialSnapshots:
                            this.captureMaterials(object)
                    };
                });

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[PlacedFlowerLightPropagationEffect] Started. targets=${this.entries.length}`
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
                if (!material || seen.has(material)) {
                    return;
                }

                seen.add(material);

                snapshots.push({
                    material,
                    baseColor: material.color
                        ? material.color.clone()
                        : null,
                    baseOpacity:
                        typeof material.opacity === 'number'
                            ? material.opacity
                            : 1.0,
                    baseEmissive:
                        material.emissive
                            ? material.emissive.clone()
                            : null,
                    baseEmissiveIntensity:
                        typeof material.emissiveIntensity === 'number'
                            ? material.emissiveIntensity
                            : 0.0
                });
            });
        });

        return snapshots;
    }

    update(delta = 0.016) {
        if (!this.active) {
            return;
        }

        this.elapsed += delta;

        let allFinished = true;

        this.entries.forEach(entry => {
            const local =
                this.elapsed -
                entry.index * this.delayPerObject;

            const t =
                THREE.MathUtils.clamp(
                    local / this.duration,
                    0,
                    1
                );

            if (t < 1.0) {
                allFinished = false;
            }

            const wave =
                local <= 0
                    ? 0
                    : Math.sin(t * Math.PI);

            entry.materialSnapshots.forEach(snapshot => {
                const material =
                    snapshot.material;

                if (!material) {
                    return;
                }

                const boost =
                    1.0 + wave * 1.9;

                if (
                    material.color &&
                    snapshot.baseColor
                ) {
                    material.color
                        .copy(snapshot.baseColor)
                        .multiplyScalar(boost);
                }

                if (
                    material.emissive &&
                    snapshot.baseEmissive
                ) {
                    material.emissive
                        .copy(snapshot.baseEmissive)
                        .multiplyScalar(1.0 + wave * 2.2);

                    material.emissiveIntensity =
                        snapshot.baseEmissiveIntensity +
                        wave * 1.4;
                }

                material.opacity =
                    THREE.MathUtils.clamp(
                        snapshot.baseOpacity +
                        wave * 0.25,
                        0,
                        1
                    );

                material.transparent = true;
                material.needsUpdate = true;
            });
        });

        if (allFinished) {
            this.finish();
        }
    }

    finish() {
        this.entries.forEach(entry => {
            entry.materialSnapshots.forEach(snapshot => {
                const material =
                    snapshot.material;

                if (!material) {
                    return;
                }

                if (
                    material.color &&
                    snapshot.baseColor
                ) {
                    material.color.copy(
                        snapshot.baseColor
                    );
                }

                if (
                    material.emissive &&
                    snapshot.baseEmissive
                ) {
                    material.emissive.copy(
                        snapshot.baseEmissive
                    );

                    material.emissiveIntensity =
                        snapshot.baseEmissiveIntensity;
                }

                material.opacity =
                    snapshot.baseOpacity;

                material.needsUpdate = true;
            });
        });

        this.clear();

        console.log(
            '[PlacedFlowerLightPropagationEffect] Completed.'
        );
    }

    clear() {
        this.active = false;
        this.elapsed = 0;
        this.entries = [];
    }
}
``