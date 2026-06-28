import * as THREE from 'three';

export class PlacedBloomEchoEffect {
    constructor(options = {}) {
        this.activeEchoes = [];

        this.radius = options.radius ?? 4.2;
        this.duration = options.duration ?? 0.72;
        this.maxScaleBoost = options.maxScaleBoost ?? 0.36;

        this.echoDelayPerMeter =
            options.echoDelayPerMeter ?? 0.055;

        this.colorBoost =
            options.colorBoost ?? 1.9;
    }

    trigger(centerObject, placedObjects = []) {
        if (!centerObject) return;

        const centerPosition =
            centerObject.position.clone();

        const targets = [];

        placedObjects.forEach(object => {
            if (!object) return;

            const metadata =
                object.userData?.placementMetadata;

            if (!metadata) return;

            if (!this.isBloomableId(metadata.id)) {
                return;
            }

            const distance =
                object.position.distanceTo(
                    centerPosition
                );

            if (distance > this.radius) {
                return;
            }

            targets.push({
                object,
                distance
            });
        });

        if (
            targets.length === 0 &&
            this.isBloomableId(
                centerObject.userData?.placementMetadata?.id
            )
        ) {
            targets.push({
                object: centerObject,
                distance: 0
            });
        }

        targets
            .sort((a, b) => a.distance - b.distance)
            .forEach(target => {
                this.createEcho(
                    target.object,
                    target.distance
                );
            });
    }

    createEcho(object, distance) {
        if (!object) return;

        const baseScale =
            object.userData.bloomEchoBaseScale
                ? object.userData.bloomEchoBaseScale.clone()
                : object.scale.clone();

        object.userData.bloomEchoBaseScale =
            baseScale.clone();

        const materialSnapshots =
            this.captureLineMaterials(object);

        this.activeEchoes.push({
            object,
            baseScale,
            materialSnapshots,
            life: 0,
            delay: distance * this.echoDelayPerMeter,
            duration: this.duration
        });
    }

    captureLineMaterials(object) {
        const snapshots = [];

        object.traverse(child => {
            const material =
                child.userData?.lineMaterial ||
                child.material;

            if (!material || !material.color) {
                return;
            }

            // 面マテリアルの透明0は対象外にする
            if (
                child.isMesh &&
                !child.userData?.isWire &&
                material.opacity === 0
            ) {
                return;
            }

            snapshots.push({
                material,
                baseColor: material.color.clone(),
                baseOpacity:
                    typeof material.opacity === 'number'
                        ? material.opacity
                        : 1.0
            });
        });

        return snapshots;
    }

    update(delta = 0.016) {
        if (this.activeEchoes.length === 0) return;

        this.activeEchoes =
            this.activeEchoes.filter(echo => {
                const {
                    object,
                    baseScale,
                    materialSnapshots
                } = echo;

                if (!object) {
                    return false;
                }

                echo.life += delta;

                if (echo.life < echo.delay) {
                    return true;
                }

                const t =
                    THREE.MathUtils.clamp(
                        (echo.life - echo.delay) /
                        echo.duration,
                        0,
                        1
                    );

                const wave =
                    Math.sin(t * Math.PI);

                const scaleBoost =
                    1.0 + wave * this.maxScaleBoost;

                object.scale
                    .copy(baseScale)
                    .multiplyScalar(scaleBoost);

                materialSnapshots.forEach(snapshot => {
                    const intensity =
                        1.0 + wave * this.colorBoost;

                    snapshot.material.color
                        .copy(snapshot.baseColor)
                        .multiplyScalar(intensity);

                    snapshot.material.opacity =
                        THREE.MathUtils.clamp(
                            snapshot.baseOpacity +
                            wave * 0.45,
                            0,
                            1
                        );

                    snapshot.material.needsUpdate = true;
                });

                if (t >= 1.0) {
                    object.scale.copy(baseScale);

                    materialSnapshots.forEach(snapshot => {
                        snapshot.material.color.copy(
                            snapshot.baseColor
                        );

                        snapshot.material.opacity =
                            snapshot.baseOpacity;

                        snapshot.material.needsUpdate = true;
                    });

                    return false;
                }

                return true;
            });
    }

    isBloomableId(id) {
        if (!id) return false;

        return [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ].includes(id);
    }

    clear() {
        this.activeEchoes.forEach(echo => {
            if (!echo.object) return;

            echo.object.scale.copy(
                echo.baseScale
            );

            echo.materialSnapshots.forEach(snapshot => {
                snapshot.material.color.copy(
                    snapshot.baseColor
                );

                snapshot.material.opacity =
                    snapshot.baseOpacity;

                snapshot.material.needsUpdate = true;
            });
        });

        this.activeEchoes = [];
    }
}