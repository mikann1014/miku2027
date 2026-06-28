import * as THREE from 'three';


/**
 * BlueNoteManager
を管理するクラス *
 * ・ミクに追従する視覚ナビゲーション要素
 *
 * モード：
 *  follow / side / orbit / ascend
 *
 * ※ note = 音符オブジェクト
 */


export class BlueNoteManager {
    constructor(scene, spawnManager) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        this.group = new THREE.Group();
        this.group.name = 'blueNoteFollowGroup';
        this.group.renderOrder = 20;

        if (this.scene) {
            this.scene.add(this.group);
        }

        this.note = null;
        this.notes = [];

        this.isActive = false;
        this.elapsed = 0;

        this.forward = new THREE.Vector3(0, 0, -1);
        this.right = new THREE.Vector3(1, 0, 0);

        this.baseColor = new THREE.Color(0x00ccff);
        this.deepColor = new THREE.Color(0x2266ff);

        this.side = 1;
        this.sideDistance = 1.05;
        this.zOffset = -0.45;
        this.heightOffset = 0.32;

        this.bounceSpeed = 3.2;
        this.bounceHeight = 0.22;

        this.spinSpeed = 1.4;

        this.scaleMultiplier = 0.28;

        this.jumpElapsed = 999;
        this.jumpDuration = 0.72;
        this.jumpHeight = 2.45;
        this.jumpBoost = 0.0;

        this.mode = 'follow';

        this.orbitTargetObject = null;
        this.orbitCenter = new THREE.Vector3();

        this.orbitRadius = 2.35;
        this.orbitSpeed = 1.85;
        this.orbitHeight = 1.15;
        this.orbitVerticalWave = 0.45;

        this.ascendDuration = 5.2;
        this.ascendElapsed = 0;
        this.ascendTargetObject = null;
    }

    start(mikuModel, options = {}) {
        if (!mikuModel) {
            return;
        }

        const forceRestart =
            options.forceRestart ?? false;

        if (this.isActive && !forceRestart) {
            return;
        }

        this.clear();

        this.mode = 'follow';
        this.orbitTargetObject = null;
        this.ascendTargetObject = null;

        this.isActive = true;
        this.elapsed = 0;

        const count =
            options.count ?? 1;

        const followBehind =
            options.followBehind ?? false;

        for (let i = 0; i < count; i++) {
            const note =
                this.createNote(
                    mikuModel,
                    i,
                    count,
                    followBehind
                );

            if (!note) {
                continue;
            }

            this.notes.push(note);
        }

        this.note =
            this.notes[0] || null;

        if (this.notes.length === 0) {
            console.warn(
                '[BlueNoteManager] tone.glb is not registered.'
            );

            this.isActive = false;
            return;
        }

        console.log(
            `[BlueNoteManager] Blue notes started. count=${this.notes.length}`
        );
    }

    createNote(mikuModel, index = 0, count = 1, followBehind = false) {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.spawn !== 'function'
        ) {
            return null;
        }

        const sideSign =
            index % 2 === 0 ? -1 : 1;

        const sideLayer =
            Math.floor(index / 2);

        const sideOffset =
            count <= 1
                ? this.side * this.sideDistance
                : sideSign * (0.75 + sideLayer * 0.55);

        const followZOffset =
            followBehind
                ? -(1.15 + index * 0.45)
                : this.zOffset;

        const basePosition =
            mikuModel.position
                .clone()
                .addScaledVector(
                    this.right,
                    sideOffset
                )
                .addScaledVector(
                    this.forward,
                    followZOffset
                );

        basePosition.y +=
            this.heightOffset +
            index * 0.14;

        const note =
            this.spawnManager.spawn(
                'tone',
                basePosition,
                {
                    scaleMultiplier:
                        this.scaleMultiplier *
                        THREE.MathUtils.lerp(
                            0.88,
                            1.08,
                            Math.random()
                        ),
                    randomRotation: true
                }
            );

        if (!note) {
            return null;
        }

        note.name =
            `blue_follow_note_${index}`;

        note.userData.ignorePulse = true;
        note.userData.isBlueInteractiveNote = true;

        note.userData.followIndex = index;
        note.userData.followCount = count;
        note.userData.followBehind = followBehind;

        note.userData.sideOffset = sideOffset;
        note.userData.followZOffset = followZOffset;

        note.userData.heightOffset =
            this.heightOffset + index * 0.14;

        note.userData.phase =
            Math.random() * Math.PI * 2;

        note.renderOrder = 20;

        this.group.add(note);

        this.applyBlueNoteMaterial(note);

        note.userData.baseBlueNoteScale =
            note.scale.clone();

        return note;
    }

    getInteractiveObjects() {
        if (!this.isActive || this.notes.length === 0) {
            return [];
        }

        return this.notes;
    }

    triggerJump() {
        if (!this.isActive || this.notes.length === 0) {
            return;
        }

        this.jumpElapsed = 0;
        this.jumpBoost = 1.0;

        console.log('[BlueNoteManager] Blue notes jump triggered.');
    }

    expandToCount(count = 6, mikuModel = null) {
        if (!mikuModel) {
            return;
        }

        if (!this.isActive) {
            this.start(
                mikuModel,
                {
                    count,
                    followBehind: false,
                    forceRestart: true
                }
            );
            return;
        }

        if (this.notes.length >= count) {
            return;
        }

        const currentCount =
            this.notes.length;

        for (let i = currentCount; i < count; i++) {
            const note =
                this.createNote(
                    mikuModel,
                    i,
                    count,
                    false
                );

            if (note) {
                this.notes.push(note);
            }
        }

        this.note =
            this.notes[0] || null;

        console.log(
            `[BlueNoteManager] Expanded notes. count=${this.notes.length}`
        );
    }

    enterSideBySideMode() {
        if (!this.isActive || this.notes.length === 0) {
            return;
        }

        this.mode = 'side';

        this.bounceHeight =
            Math.max(
                this.bounceHeight,
                0.28
            );

        this.spinSpeed =
            Math.max(
                this.spinSpeed,
                1.65
            );

        console.log(
            '[BlueNoteManager] Side-by-side mode started.'
        );
    }

    enterOrbitMode(target) {
        if (!target) {
            return;
        }

        this.mode = 'orbit';

        if (target.isObject3D) {
            this.orbitTargetObject = target;
            this.orbitCenter.copy(target.position);
        } else if (target.isVector3) {
            this.orbitTargetObject = null;
            this.orbitCenter.copy(target);
        } else if (target.position?.isVector3) {
            this.orbitTargetObject = target;
            this.orbitCenter.copy(target.position);
        }

        this.bounceHeight =
            Math.max(
                this.bounceHeight,
                0.38
            );

        this.spinSpeed =
            Math.max(
                this.spinSpeed,
                2.1
            );

        console.log(
            '[BlueNoteManager] Orbit mode started.'
        );
    }

    exitOrbitMode() {
        this.mode = 'follow';
        this.orbitTargetObject = null;

        console.log(
            '[BlueNoteManager] Orbit mode ended.'
        );
    }

updateAscendNote(note, index, delta, pulse) {
    if (!note) {
        return;
    }

    const t =
        THREE.MathUtils.clamp(
            this.ascendElapsed / this.ascendDuration,
            0,
            1
        );

    const eased =
        THREE.MathUtils.smoothstep(t, 0, 1);

    const startCenter =
        note.userData.ascendStartCenter ||
        note.position.clone();

    const phase =
        note.userData.ascendPhase ?? 0;

    const radius =
        note.userData.ascendRadius ?? 2.4;

    const height =
        note.userData.ascendHeight ?? 20.0;

    const angle =
        phase +
        this.ascendElapsed * 2.4;

    const spiralOffset =
        new THREE.Vector3(
            Math.cos(angle) * radius * (1.0 - t * 0.45),
            height * eased,
            Math.sin(angle) * radius * (1.0 - t * 0.45)
        );

    const target =
        startCenter.clone().add(
            spiralOffset
        );

    note.position.copy(target);

    note.rotation.y +=
        delta * this.spinSpeed * 1.6;

    note.rotation.x =
        Math.sin(this.elapsed * 1.8 + phase) * 0.22;

    note.rotation.z =
        Math.sin(this.elapsed * 2.1 + phase) * 0.28;

    const disappear =
        THREE.MathUtils.smoothstep(
            t,
            0.45,
            1.0
        );

    const scaleFade =
        THREE.MathUtils.lerp(
            1.0,
            0.02,
            disappear
        );

    if (note.userData.ascendStartScale) {
        note.scale
            .copy(note.userData.ascendStartScale)
            .multiplyScalar(scaleFade);
    }

    const opacity =
        1.0 -
        THREE.MathUtils.smoothstep(
            t,
            0.55,
            1.0
        );

    this.setNoteOpacity(
        note,
        opacity
    );

    this.updateNoteEmission(
        note,
        pulse,
        0.9
    );
}

ascendAllNotes(options = {}) {
    if (!this.isActive || this.notes.length === 0) {
        return;
    }

    this.mode = 'ascend';
    this.ascendElapsed = 0;

    this.ascendDuration =
        options.duration ?? 3.0;

    this.ascendTargetObject =
        options.target || null;

    const center =
        this.ascendTargetObject?.position
            ? this.ascendTargetObject.position.clone()
            : this.notes[0].position.clone();

    this.notes.forEach((note, index) => {
        note.userData.ascendStartCenter =
            center.clone();

        note.userData.ascendStartPosition =
            note.position.clone();

        note.userData.ascendPhase =
            index *
            (
                Math.PI * 2 /
                Math.max(1, this.notes.length)
            );

        note.userData.ascendRadius =
            2.0 + index * 0.18;

        note.userData.ascendHeight =
            20.0 + index * 0.65;

        note.userData.ascendIndex =
            index;

        note.userData.ascendStartScale =
            note.scale.clone();
    });

    console.log(
        '[BlueNoteManager] Final six notes ascend started.'
    );
}



    applyBlueNoteMaterial(object) {
        if (!object) {
            return;
        }

        object.traverse(child => {
            if (!child) {
                return;
            }

            child.renderOrder = 20;

            const lineMaterial =
                child.userData?.lineMaterial;

            if (lineMaterial) {
                const clonedLineMaterial =
                    lineMaterial.clone();

                clonedLineMaterial.color.copy(this.baseColor);
                clonedLineMaterial.opacity = 0.95;
                clonedLineMaterial.transparent = true;
                clonedLineMaterial.blending = THREE.AdditiveBlending;

                clonedLineMaterial.depthWrite = false;
                clonedLineMaterial.depthTest = true;

                clonedLineMaterial.toneMapped = false;
                clonedLineMaterial.needsUpdate = true;

                child.userData.lineMaterial =
                    clonedLineMaterial;
            }

            if (
                child.material &&
                child.isMesh &&
                !child.userData?.isWire
            ) {
                const materials =
                    Array.isArray(child.material)
                        ? child.material
                        : [child.material];

                const clonedMaterials =
                    materials.map(material => {
                        const cloned =
                            material.clone();

                        cloned.transparent = true;
                        cloned.opacity = 0.0;

                        cloned.depthWrite = false;
                        cloned.depthTest = true;
                        cloned.colorWrite = false;

                        cloned.needsUpdate = true;

                        return cloned;
                    });

                child.material =
                    Array.isArray(child.material)
                        ? clonedMaterials
                        : clonedMaterials[0];

                child.userData.isBlueNoteHitArea = true;
            }
        });
    }

    update(delta = 0.016, mikuModel = null, beat = 0) {
        if (!this.isActive) {
            return;
        }

        if (!mikuModel && this.mode !== 'ascend') {
            return;
        }

        if (this.notes.length === 0) {
            return;
        }

        this.elapsed += delta;
        this.jumpElapsed += delta;

        this.jumpBoost =
            THREE.MathUtils.lerp(
                this.jumpBoost,
                0.0,
                0.08
            );

        const pulse =
            THREE.MathUtils.clamp(
                beat,
                0,
                1
            );

        if (this.mode === 'ascend') {
    this.ascendElapsed += delta;

    this.notes.forEach((note, index) => {
        this.updateAscendNote(
            note,
            index,
            delta,
            pulse
        );
    });

    if (this.ascendElapsed >= this.ascendDuration) {
        this.clear();

        console.log(
            '[BlueNoteManager] Final notes disappeared.'
        );
    }

    return;
}

        if (this.mode === 'side') {
            this.notes.forEach((note, index) => {
                this.updateSideNote(
                    note,
                    index,
                    delta,
                    mikuModel,
                    pulse
                );
            });

            return;
        }

        if (this.mode === 'orbit') {
            this.notes.forEach((note, index) => {
                this.updateOrbitNote(
                    note,
                    index,
                    delta,
                    mikuModel,
                    pulse
                );
            });

            return;
        }

        this.notes.forEach((note, index) => {
            this.updateSingleNote(
                note,
                index,
                delta,
                mikuModel,
                pulse
            );
        });
    }

    updateSingleNote(note, index, delta, mikuModel, pulse) {
        if (!note) {
            return;
        }

        const phase =
            note.userData.phase ?? 0;

        const bounceWave =
            Math.sin(
                this.elapsed * this.bounceSpeed +
                phase
            );

        const sideWave =
            Math.sin(
                this.elapsed * 1.35 +
                phase
            ) * 0.16;

        const forwardWave =
            Math.sin(
                this.elapsed * 1.1 +
                phase
            ) * 0.12;

        const sideOffset =
            note.userData.sideOffset ?? this.sideDistance;

        const followZOffset =
            note.userData.followZOffset ?? this.zOffset;

        const heightOffset =
            note.userData.heightOffset ?? this.heightOffset;

        const target =
            mikuModel.position
                .clone()
                .addScaledVector(
                    this.right,
                    sideOffset + sideWave
                )
                .addScaledVector(
                    this.forward,
                    followZOffset + forwardWave
                );

        target.y +=
            heightOffset +
            Math.abs(bounceWave) * this.bounceHeight +
            this.calculateJumpOffset();

        note.position.lerp(
            target,
            0.22
        );

        note.rotation.y +=
            delta *
            this.spinSpeed *
            (1.0 + this.jumpBoost * 1.4);

        note.rotation.x =
            Math.sin(
                this.elapsed * 1.3 +
                phase
            ) * 0.12;

        note.rotation.z =
            Math.sin(
                this.elapsed * 1.8 +
                phase
            ) * 0.22 +
            this.jumpBoost * 0.45;

        const scalePulse =
            1.0 +
            pulse * 0.18 +
            Math.abs(bounceWave) * 0.06 +
            this.jumpBoost * 0.22;

        if (note.userData.baseBlueNoteScale) {
            note.scale
                .copy(note.userData.baseBlueNoteScale)
                .multiplyScalar(scalePulse);
        }

        this.updateNoteEmission(
            note,
            pulse,
            Math.abs(bounceWave)
        );
    }

    updateSideNote(note, index, delta, mikuModel, pulse) {
        if (!note || !mikuModel) {
            return;
        }

        const phase =
            note.userData.phase ?? 0;

        const side =
            index % 2 === 0 ? -1 : 1;

        const layer =
            Math.floor(index / 2);

        const target =
            mikuModel.position.clone();

        target.x +=
            side *
            (
                1.25 +
                layer * 0.45
            );

        target.y +=
            0.45 +
            Math.sin(
                this.elapsed * 2.5 + phase
            ) *
            0.12 +
            this.calculateJumpOffset();

        target.z +=
            -0.15;

        note.position.lerp(
            target,
            0.18
        );

        note.rotation.y +=
            delta *
            this.spinSpeed *
            1.1;

        note.rotation.x =
            Math.sin(
                this.elapsed * 1.35 + phase
            ) * 0.1;

        note.rotation.z =
            Math.sin(
                this.elapsed * 1.8 + phase
            ) *
            0.2 +
            this.jumpBoost * 0.35;

        const scalePulse =
            1.0 +
            pulse * 0.16 +
            this.jumpBoost * 0.2;

        if (note.userData.baseBlueNoteScale) {
            note.scale
                .copy(note.userData.baseBlueNoteScale)
                .multiplyScalar(scalePulse);
        }

        this.updateNoteEmission(
            note,
            pulse,
            0.45
        );
    }

    updateOrbitNote(note, index, delta, mikuModel, pulse) {
        if (!note) {
            return;
        }

        const center =
            this.orbitTargetObject?.position
                ? this.orbitTargetObject.position.clone()
                : mikuModel.position.clone();

        const phase =
            note.userData.phase ?? 0;

        const radius =
            this.orbitRadius + index * 0.55;

        const angle =
            this.elapsed * this.orbitSpeed +
            index * Math.PI +
            phase * 0.2;

        const target =
            center.clone();

        target.x +=
            Math.cos(angle) * radius;

        target.z +=
            Math.sin(angle) * radius;

        target.y +=
            this.orbitHeight +
            Math.sin(angle * 2.0 + phase) *
                this.orbitVerticalWave +
            this.calculateJumpOffset();

        note.position.lerp(
            target,
            0.18
        );

        note.rotation.y +=
            delta *
            this.spinSpeed *
            1.35;

        note.rotation.x =
            Math.sin(
                this.elapsed * 1.7 +
                phase
            ) * 0.25;

        note.rotation.z =
            Math.sin(
                this.elapsed * 2.1 +
                phase
            ) * 0.35 +
            this.jumpBoost * 0.5;

        const scalePulse =
            1.08 +
            pulse * 0.2 +
            this.jumpBoost * 0.24;

        if (note.userData.baseBlueNoteScale) {
            note.scale
                .copy(note.userData.baseBlueNoteScale)
                .multiplyScalar(scalePulse);
        }

        this.updateNoteEmission(
            note,
            pulse,
            0.8
        );
    }

    calculateJumpOffset() {
        if (this.jumpElapsed >= this.jumpDuration) {
            return 0;
        }

        const t =
            THREE.MathUtils.clamp(
                this.jumpElapsed / this.jumpDuration,
                0,
                1
            );

        const arc =
            Math.sin(t * Math.PI);

        return arc * this.jumpHeight;
    }

    updateNoteEmission(object, pulse, bounceAmount) {
        if (!object) {
            return;
        }

        const brightness =
            0.8 +
            pulse * 0.75 +
            bounceAmount * 0.2 +
            this.jumpBoost * 1.25;

        const opacity =
            0.6 +
            pulse * 0.3 +
            bounceAmount * 0.14 +
            this.jumpBoost * 0.25;

        const colorMix =
            0.5 +
            Math.sin(this.elapsed * 1.7) *
            0.5;

        const currentColor =
            this.baseColor
                .clone()
                .lerp(
                    this.deepColor,
                    colorMix * 0.35
                )
                .multiplyScalar(brightness);

        object.traverse(child => {
            const lineMaterial =
                child.userData?.lineMaterial;

            if (!lineMaterial) {
                return;
            }

            lineMaterial.color.copy(currentColor);

            lineMaterial.opacity =
                THREE.MathUtils.clamp(
                    opacity,
                    0.25,
                    1.0
                );

            lineMaterial.depthWrite = false;
            lineMaterial.depthTest = true;

            lineMaterial.needsUpdate = true;
        });
    }

    setNoteOpacity(object, opacity) {
        if (!object) {
            return;
        }

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
                if (!material) {
                    return;
                }

                material.transparent = true;

                material.opacity =
                    THREE.MathUtils.clamp(
                        opacity,
                        0,
                        1
                    );

                material.needsUpdate = true;
            });
        });
    }

    stop() {
        this.isActive = false;
    }

    clear() {
        this.notes.forEach(note => {
            note.parent?.remove(note);
        });

        this.notes = [];
        this.note = null;

        this.mode = 'follow';
        this.orbitTargetObject = null;
        this.ascendTargetObject = null;

        this.isActive = false;
        this.elapsed = 0;

        this.jumpElapsed = 999;
        this.jumpBoost = 0.0;

        this.ascendElapsed = 0;
    }
}