import * as THREE from 'three';
import { MikuEntity } from '../entities/MikuEntity.js';

export class CharacterManager {
    constructor(scene) {
        this.scene = scene;

        this.miku = null;

        this.mikuPosition =
            new THREE.Vector3(0, 0, 0);

        this.forwardDirection =
            new THREE.Vector3(0, 0, -1);

        this.mikuForwardRotationY = 0;

        this.walkSpeed = 2.0;
        this.runSpeed = 5.0;

        this.currentSpeed = this.walkSpeed;
        this.targetSpeed = this.walkSpeed;

        this.speedLerpRate = 0.045;

        this.moveMode = 'walk';

        this.isMovementEnabled = true;
        this.isTurnPlaying = false;

        this.lockedY = null;
        this.shouldLockY = false;

        this.onCollapseFinished = null;

        // =========================
        // Collapse sequence control
        // =========================
        this.collapsePrepFinished = false;
        this.collapseNowRequested = false;
        this.isCollapseSequenceRunning = false;

        this.isPostTurnBHart = false;
        this.isEndingHartFacingCamera = false;

        this.rotationLerpActive = false;
this.rotationLerpElapsed = 0;
this.rotationLerpDuration = 0.9;
this.rotationLerpStartY = 0;
this.rotationLerpTargetY = 0;
this.rotationLerpOnComplete = null;
    }

    setupMiku(gltf) {
    this.miku =
        new MikuEntity(
            gltf,
            null,
            'Walk'
        );

    this.miku.model.position.copy(
        this.mikuPosition
    );

    this.applyMikuRotation();

    this.scene.add(
        this.miku.model
    );

    console.log(
        '[CharacterManager] Miku setup complete.'
    );
}

    addMikuAnimation(gltf, actionName) {
        if (!this.miku) {
            console.warn(
                `[CharacterManager] Cannot add animation ${actionName}: Miku is not ready.`
            );
            return;
        }

        this.miku.addAnimationFromGLTF?.(
            gltf,
            actionName
        );
    }

    setOnCollapseFinished(callback) {
        this.onCollapseFinished =
            typeof callback === 'function'
                ? callback
                : null;
    }

    getMiku() {
        return this.miku;
    }

    getMikuPosition() {
        return this.mikuPosition;
    }

    forceSetMoveMode(mode) {
        this.moveMode = null;
        this.setMoveMode(mode);
    }

    applyMikuRotation() {
        if (!this.miku || !this.miku.model) {
            return;
        }

        this.miku.model.rotation.set(
            0,
            this.mikuForwardRotationY,
            0
        );
    }

    canPlayTurnFromClick() {
        return (
            !!this.miku &&
            this.moveMode === 'walk' &&
            !this.isTurnPlaying
        );
    }

    playTurnFromClick() {
        if (!this.canPlayTurnFromClick()) {
            return false;
        }

        this.setMoveMode('turn');
        return true;
    }

    setMoveMode(mode) {
        if (this.moveMode === mode) {
            return;
        }

        this.moveMode = mode;

        if (mode === 'walk') {
            this.isTurnPlaying = false;
            this.isMovementEnabled = true;

            this.targetSpeed = this.walkSpeed;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playWalk(
                0.45
            );

            console.log(
                '[CharacterManager] Move mode: walk'
            );
            return;
        }

        if (mode === 'run') {
            this.isTurnPlaying = false;
            this.isMovementEnabled = true;

            this.targetSpeed = this.runSpeed;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playRun(
                0.45
            );

            console.log(
                '[CharacterManager] Move mode: run'
            );
            return;
        }

        if (mode === 'turn') {
            this.isTurnPlaying = true;
            this.isMovementEnabled = false;

            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.shouldLockY = true;
            this.lockedY = this.mikuPosition.y;

            this.miku?.playTurn(
                0.16,
                () => {
                    this.isTurnPlaying = false;

                    this.shouldLockY = false;
                    this.lockedY = null;

                    this.setMoveMode('walk');
                }
            );

            console.log(
                '[CharacterManager] Move mode: turn'
            );
            return;
        }

        if (mode === 'turnB') {
    this.isTurnPlaying = true;
    this.isMovementEnabled = false;

    this.targetSpeed = 0;
    this.currentSpeed = 0;

    const currentY =
        this.miku?.model?.position?.y ??
        this.mikuPosition.y;

    this.lockedY = currentY;
    this.shouldLockY = true;

    this.mikuPosition.y = currentY;

    this.miku?.playTurnB(
        0.18,
        () => {
            this.isTurnPlaying = false;

            this.shouldLockY = false;
            this.lockedY = null;

            this.isPostTurnBHart = true;

            this.forceSetMoveMode(
                'hart'
            );
        }
    );

    console.log(
        '[CharacterManager] Move mode: turnB'
    );

    return;
}
        if (mode === 'walkToStop') {
            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.isMovementEnabled = false;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playWalkToStop(
                0.2,
                () => {
                    this.setMoveMode('stop');
                }
            );

            console.log(
                '[CharacterManager] Move mode: walkToStop'
            );
            return;
        }

        if (mode === 'walkToStopA') {
            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.isMovementEnabled = false;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playWalkToStopA(
                0.18,
                null
            );

            console.log(
                '[CharacterManager] Move mode: walkToStopA'
            );
            return;
        }

        if (mode === 'walkToStopB') {
            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.isMovementEnabled = false;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playWalkToStopB(
                0.15,
                null
            );

            console.log(
                '[CharacterManager] Move mode: walkToStopB'
            );
            return;
        }

        if (mode === 'hand') {
            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.isMovementEnabled = false;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playHand(
                0.18,
                null
            );

            console.log(
                '[CharacterManager] Move mode: hand'
            );
            return;
        }

        if (mode === 'hart') {
    this.targetSpeed = 0;
    this.currentSpeed = 0;

    this.isMovementEnabled = false;

    this.shouldLockY = false;
    this.lockedY = null;

    if (this.isPostTurnBHart) {
        this.mikuForwardRotationY = Math.PI;
        this.isPostTurnBHart = false;
    }

    this.applyMikuRotation();

    this.miku?.playHart(
        0.18,
        null
    );

    console.log(
        '[CharacterManager] Move mode: hart'
    );

    return;
}
        if (mode === 'endingHart') {
    this.targetSpeed = 0;
    this.currentSpeed = 0;

    this.isMovementEnabled = false;
    this.isTurnPlaying = false;

    this.shouldLockY = false;
    this.lockedY = null;

    // まずはStop姿勢でゆっくり180度回転
    this.miku?.playStop(
        0.18
    );

    this.startRotationLerpTo(
        Math.PI,
        0.9,
        () => {
            // 回転が終わってからHartへ
            this.forceSetMoveMode(
                'hart'
            );
        }
    );

    console.log(
        '[CharacterManager] Move mode: endingHart rotation.'
    );

    return;
}

        if (mode === 'stop') {
            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.isMovementEnabled = false;

            this.shouldLockY = false;
            this.lockedY = null;

            this.miku?.playStop(
                0.15
            );

            console.log(
                '[CharacterManager] Move mode: stop'
            );
            return;
        }

        // =========================
        // 「あなたはもう」
        // StopB / WalkToStopB を必ず先に入れる
        // =========================
        if (mode === 'collapsePrep') {
            this.isTurnPlaying = false;
            this.isMovementEnabled = false;

            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.shouldLockY = false;
            this.lockedY = null;

            this.collapsePrepFinished = false;
            this.collapseNowRequested = false;
            this.isCollapseSequenceRunning = true;

            this.miku?.playWalkToStopB(
                0.15,
                () => {
                    this.collapsePrepFinished = true;

                    console.log(
                        '[CharacterManager] Collapse prep finished.'
                    );

                    if (this.collapseNowRequested) {
                        this.playCollapseNowInternal();
                    }
                }
            );

            console.log(
                '[CharacterManager] Move mode: collapsePrep'
            );

            return;
        }

        // =========================
        // 「言わなかった」
        // StopB が終わっていなければ待つ
        // =========================
        if (mode === 'collapseNow') {
            this.isTurnPlaying = false;
            this.isMovementEnabled = false;

            this.targetSpeed = 0;
            this.currentSpeed = 0;

            this.shouldLockY = false;
            this.lockedY = null;

            this.collapseNowRequested = true;

            if (!this.collapsePrepFinished) {
                console.log(
                    '[CharacterManager] Collapse requested. Waiting for StopB.'
                );
                return;
            }

            this.playCollapseNowInternal();

            return;
        }

        if (mode === 'reach') {
            this.setMoveMode('hand');
            return;
        }

        if (mode === 'think') {
            this.setMoveMode('hart');
            return;
        }

        if (mode === 'collapse') {
            this.forceSetMoveMode('collapsePrep');

            setTimeout(() => {
                this.forceSetMoveMode('collapseNow');
            }, 650);

            console.log(
                '[CharacterManager] Move mode: collapse sequence'
            );
            return;
        }
    }

    playCollapseNowInternal() {
        if (!this.miku) {
            return;
        }

        this.isCollapseSequenceRunning = true;

        this.isTurnPlaying = false;
        this.isMovementEnabled = false;

        this.targetSpeed = 0;
        this.currentSpeed = 0;

        this.shouldLockY = false;
        this.lockedY = null;

        this.miku.playStopToCollapse(
            0.12,
            () => {
                console.log(
                    '[CharacterManager] Collapse finished.'
                );

                this.isCollapseSequenceRunning = false;

                if (typeof this.onCollapseFinished === 'function') {
                    this.onCollapseFinished();
                }
            }
        );

        console.log(
            '[CharacterManager] Move mode: collapseNow'
        );
    }

    stopMovement() {
        this.setMoveMode(
            'stop'
        );
    }

    showEndingStopFacingCamera() {
        if (!this.miku || !this.miku.model) {
            return;
        }

        this.isTurnPlaying = false;
        this.isMovementEnabled = false;

        this.targetSpeed = 0;
        this.currentSpeed = 0;

        this.shouldLockY = false;
        this.lockedY = null;

        this.mikuForwardRotationY = Math.PI;

        this.miku?.fadeToAction(
            'Stop',
            0.0
        );

        this.applyMikuRotation();

        console.log(
            '[CharacterManager] Ending stop facing camera.'
        );
    }

    startRotationLerpTo(targetY, duration = 0.9, onComplete = null) {
    this.rotationLerpActive = true;
    this.rotationLerpElapsed = 0;
    this.rotationLerpDuration = Math.max(0.001, duration);

    this.rotationLerpStartY =
        this.mikuForwardRotationY;

    this.rotationLerpTargetY =
        targetY;

    this.rotationLerpOnComplete =
        typeof onComplete === 'function'
            ? onComplete
            : null;
}

updateRotationLerp(delta) {
    if (!this.rotationLerpActive) {
        return;
    }

    this.rotationLerpElapsed += delta;

    const t =
        THREE.MathUtils.clamp(
            this.rotationLerpElapsed /
                this.rotationLerpDuration,
            0,
            1
        );

    const eased =
        t * t * (3 - 2 * t);

    const diff =
        Math.atan2(
            Math.sin(
                this.rotationLerpTargetY -
                    this.rotationLerpStartY
            ),
            Math.cos(
                this.rotationLerpTargetY -
                    this.rotationLerpStartY
            )
        );

    this.mikuForwardRotationY =
        this.rotationLerpStartY +
        diff * eased;

    if (t >= 1.0) {
        this.mikuForwardRotationY =
            this.rotationLerpTargetY;

        this.rotationLerpActive = false;

        const callback =
            this.rotationLerpOnComplete;

        this.rotationLerpOnComplete = null;

        callback?.();
    }
}

forceMikuOpaque() {
    if (!this.miku || !this.miku.model) {
        return;
    }

    this.miku.model.traverse(object => {
        object.visible = true;

        // 重要:
        // renderOrderを上げない。
        // ここを10にすると、透明地形・Bloom・Wireと干渉しやすい。
        object.renderOrder = 0;

        const materials = [];

        if (object.material) {
            if (Array.isArray(object.material)) {
                materials.push(...object.material);
            } else {
                materials.push(object.material);
            }
        }

        if (object.userData?.lineMaterial) {
            materials.push(object.userData.lineMaterial);
        }

        materials.forEach(material => {
            if (!material) {
                return;
            }

            material.visible = true;

            material.transparent = false;
            material.opacity = 1.0;

            material.depthTest = true;
            material.depthWrite = true;
            material.depthFunc = THREE.LessEqualDepth;

            material.blending = THREE.NormalBlending;
            material.colorWrite = true;

            // まずは完全不透明検証を優先
            material.alphaTest = 0;

            material.needsUpdate = true;
        });
    });
}
    revealMikuAt(position, mode = 'hart') {
    if (
        !this.miku ||
        !this.miku.model ||
        !position
    ) {
        return false;
    }

    this.mikuPosition.copy(
        position
    );

    this.miku.model.position.copy(
        this.mikuPosition
    );

    this.miku.model.visible = true;


    this.miku.model.traverse(object => {
        object.visible = true;

        if (!object.material) {
            return;
        }

        const materials =
            Array.isArray(object.material)
                ? object.material
                : [object.material];

        materials.forEach(material => {
            if (!material) {
                return;
            }

            material.visible = true;

            if (typeof material.opacity === 'number') {
                material.opacity = 1;
            }

            if (
                material.transparent === true &&
                typeof material.opacity === 'number' &&
                material.opacity >= 1
            ) {
                material.transparent = false;
            }

            material.depthWrite = true;
            material.needsUpdate = true;
        });
    });

    this.isTurnPlaying = false;
    this.isMovementEnabled = false;

    this.currentSpeed = 0;
    this.targetSpeed = 0;

    this.shouldLockY = false;
    this.lockedY = null;

    this.mikuForwardRotationY = 0;
    this.isPostTurnBHart = false;

    this.applyMikuRotation();

    if (mode) {
        this.forceSetMoveMode(
            mode
        );
    }

    console.log(
        '[CharacterManager] Miku revealed at lyric attract point.',
        this.mikuPosition
    );

    return true;
}

    update(delta, player = null) {
        if (!this.miku) {
            return;
        }

        this.currentSpeed =
            THREE.MathUtils.lerp(
                this.currentSpeed,
                this.targetSpeed,
                this.speedLerpRate
            );

        if (
            this.isMovementEnabled &&
            this.currentSpeed > 0.001
        ) {
            this.mikuPosition.z -=
                this.currentSpeed * delta;
        }

        this.miku.update(
            delta
        );

        this.updateRotationLerp(
    delta
);

        if (
            this.shouldLockY &&
            this.lockedY !== null
        ) {
            this.mikuPosition.y =
                this.lockedY;
        }

        this.miku.model.position.copy(
            this.mikuPosition
        );

        if (
            this.shouldLockY &&
            this.lockedY !== null
        ) {
            this.miku.model.position.y =
                this.lockedY;
        }

        this.applyMikuRotation();
    }
}