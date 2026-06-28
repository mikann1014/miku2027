import * as THREE from 'three';

export class LyricAttractEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'lyricAttractEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        this.active = false;
        this.completed = false;

        this.elapsed = 0;

        this.duration = options.duration ?? 1.15;

        this.targetPosition = new THREE.Vector3();

        this.phrases = [];

        this.onCompleted = null;
    }

    start(phraseObjects = [], targetPosition, onCompleted = null) {
        this.active = true;
        this.completed = false;
        this.elapsed = 0;

        if (targetPosition) {
            this.targetPosition.copy(targetPosition);
        }

        this.onCompleted =
            typeof onCompleted === 'function'
                ? onCompleted
                : null;

        this.phrases = phraseObjects
            .filter(phrase => phrase?.mesh)
            .map((phrase, index) => {
                phrase.externalControlled = true;
                phrase.freezeScatterForAttract = true;
                phrase.noScatter = true;
                phrase.isDissolving = false;
                phrase.hasScattered = true;

                const mesh = phrase.mesh;

                const startPosition =
                    mesh.position.clone();

                const offset =
                    startPosition
                        .clone()
                        .sub(this.targetPosition);

                const startRadius =
                    Math.max(
                        0.8,
                        Math.sqrt(
                            offset.x * offset.x +
                            offset.z * offset.z
                        )
                    );

                const startAngle =
                    Math.atan2(
                        offset.z,
                        offset.x
                    );

                return {
                    phrase,
                    mesh,
                    material: phrase.material,
                    startPosition,
                    startScale: mesh.scale.clone(),
                    startOffset: offset,
                    startRadius,
                    startAngle,
                    startY: offset.y,
                    seed: Math.random() * Math.PI * 2,
                    index
                };
            });

        console.log(
            `[LyricAttractEffect] Chorus spiral gather started. phrases=${this.phrases.length}`
        );
    }

    update(delta = 0.016, camera = null) {
        if (!this.active) {
            return false;
        }

        this.elapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.elapsed / this.duration,
                0,
                1
            );

        // 速く中央へ向かうが、渦の軌道は見える。
        const moveEase =
            1.0 -
            Math.pow(
                1.0 - t,
                3.2
            );

        this.updatePhrases(
            moveEase,
            t,
            camera
        );

        if (t >= 1.0) {
            this.finishAndHide();

            console.log(
                '[LyricAttractEffect] Chorus spiral gather completed.'
            );

            if (this.onCompleted) {
                this.onCompleted(
                    this.targetPosition.clone()
                );
            }

            return true;
        }

        return false;
    }

    updatePhrases(moveEase, t, camera) {
        this.phrases.forEach(entry => {
            const {
                mesh,
                material,
                startScale,
                startRadius,
                startAngle,
                startY,
                seed,
                index
            } = entry;

            if (!mesh) {
                return;
            }

            if (camera) {
                mesh.quaternion.copy(
                    camera.quaternion
                );
            }

            const turns =
                1.65 + index * 0.08;

            const angle =
                startAngle +
                t * Math.PI * 2.0 * turns +
                seed * 0.18;

            const radius =
                THREE.MathUtils.lerp(
                    startRadius,
                    0.04,
                    moveEase
                );

            const heightOffset =
                THREE.MathUtils.lerp(
                    startY,
                    0.0,
                    moveEase
                ) +
                Math.sin(
                    t * Math.PI * 2.0 + seed
                ) *
                0.42 *
                (1.0 - moveEase);

            const target =
                this.targetPosition.clone();

            target.x +=
                Math.cos(angle) *
                radius;

            target.z +=
                Math.sin(angle) *
                radius;

            target.y +=
                heightOffset;

            mesh.position.copy(
                target
            );

            const scale =
                THREE.MathUtils.lerp(
                    1.0,
                    0.08,
                    moveEase
                );

            mesh.scale
                .copy(startScale)
                .multiplyScalar(scale);

            if (material) {
                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.46,
                        0.74
                    );

                material.opacity =
                    0.95 * fade;

                material.transparent = true;
                material.needsUpdate = true;
            }
        });
    }

    finishAndHide() {
        this.phrases.forEach(entry => {
            const {
                mesh,
                material,
                startScale
            } = entry;

            if (mesh) {
                mesh.position.copy(
                    this.targetPosition
                );

                mesh.scale
                    .copy(startScale)
                    .multiplyScalar(0.04);
            }

            if (material) {
                material.opacity = 0.0;
                material.transparent = true;
                material.needsUpdate = true;
            }

            if (entry.phrase) {
                entry.phrase.externalControlled = true;
                entry.phrase.noScatter = true;
                entry.phrase.isDissolving = false;
            }
        });

        this.active = false;
        this.completed = true;
        this.elapsed = this.duration;
    }

    clear() {
        this.active = false;
        this.completed = false;
        this.elapsed = 0;

        this.phrases.forEach(entry => {
            if (entry.phrase) {
                entry.phrase.externalControlled = false;
            }
        });

        this.phrases = [];
    }
}

