import * as THREE from 'three';

/**
 * CameraController
 *
 * ・キャラクター（主にミク）を中心としたカメラ制御を行う
 * ・通常の追従カメラ（ドラッグ回転対応）を提供
 * ・各種イベント用カメラ演出（エンディング・演出シーケンス）を管理
 *
 * 主な機能：
 * ・マウス / タッチによるカメラ回転操作
 * ・カメラ入力ロック制御
 * ・キャラクター背後に戻る補正カメラ
 * ・演出用カメラ遷移（上昇、発見、俯瞰、静止など）
 * ・空へ移動する最終カメラ演出（前進 → 上昇）
 *
 * 役割：
 * シーン全体の視点演出を一元管理し、
 * 通常操作とイベント演出のカメラ動作を切り替える
 */

export class CameraController {
    constructor(camera, characterManager) {
        this.camera = camera;
        this.characterManager = characterManager;
        this.yaw = 0;
        this.isDragging = false;
        this.prevX = 0;
        this.totalDragDistance = 0;
        this.dragSensitivity = 0.005;
        this.distance = 8;
        this.fixedHeight = 3;
        this.lookAtHeight = 1.2;
        this.dragThreshold = 4;
        this.isCameraInputLocked = false;
        this.returnBehindMikuActive = false;
        this.returnBehindMikuElapsed = 0;
        this.returnBehindMikuDuration = 2.8;
        this.returnBehindStartYaw = 0;
        this.returnBehindTargetYaw = 0;
        this.finalNoteAscendActive = false;
        this.finalNoteAscendElapsed = 0;
        this.finalNoteRotateDuration = 3.0;
        this.finalNoteHoldDuration = 4.5;
        this.finalNoteTargetGetter = null;
        this.ascendStartQuat = new THREE.Quaternion();
        this.ascendTargetQuat = new THREE.Quaternion();
        this.endingReturnActive = false;
        this.endingReturnElapsed = 0;
        this.endingReturnDuration = 5.0;
        this.endingReturnStartQuat = new THREE.Quaternion();
        this.endingReturnTargetQuat = new THREE.Quaternion();
        this.endingDiscoverActive = false;
        this.endingDiscoverElapsed = 0;
        this.endingDiscoverDuration = 8.0;
        this.endingDiscoverStartQuat = new THREE.Quaternion();
        this.endingDiscoverTargetQuat = new THREE.Quaternion();
        this.endingOverviewActive = false;
        this.endingOverviewElapsed = 0;
        this.endingOverviewDuration = 8.0;
        this.endingOverviewStartPosition = new THREE.Vector3();
        this.endingOverviewTargetPosition = new THREE.Vector3();
        this.endingOverviewStartQuat = new THREE.Quaternion();
        this.endingOverviewStartFov = camera.fov;
        this.endingOverviewTargetFov = camera.fov;
        this.endingStillActive = false;
        this.endingStillElapsed = 0;
        this.endingStillDuration = 4.0;
        this.endingStillQuat = new THREE.Quaternion();
        this.finalSkyActive = false;
        this.finalSkyTime = 0;
        this.finalSkyDuration = 12.5;
        this.finalSkyStartPos = new THREE.Vector3();
        this.finalSkyForwardPos = new THREE.Vector3();
        this.finalSkyTargetPos = new THREE.Vector3();
        this.finalSkyForwardDir = new THREE.Vector3(0, 0, -1);
        this.finalSkyRiseTargetPos = new THREE.Vector3();
        this.finalSkyReachedEmitted = false;
        this.initInput();
    }
    initInput() {
        window.addEventListener('mousedown', event => {
            if (this.isUiEvent(event)) {
                return;
            }

            if (this.isCameraInputLocked) {
                this.isDragging = false;
                window.__cameraDragged = false;
                return;
            }

            this.isDragging = true;
            this.prevX = event.clientX;
            this.totalDragDistance = 0;

            window.__cameraDragged = false;
        });

        window.addEventListener('mousemove', event => {
            if (!this.isDragging) {
                return;
            }

            if (this.isCameraInputLocked) {
                this.prevX = event.clientX;
                window.__cameraDragged = false;
                return;
            }

            const dx = event.clientX - this.prevX;

            this.prevX = event.clientX;
            this.totalDragDistance += Math.abs(dx);

            if (this.totalDragDistance > this.dragThreshold) {
                window.__cameraDragged = true;
            }

            this.yaw -= dx * this.dragSensitivity;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;

            setTimeout(() => {
                window.__cameraDragged = false;
            }, 80);
        });

        window.addEventListener('mouseleave', () => {
            this.isDragging = false;

            setTimeout(() => {
                window.__cameraDragged = false;
            }, 80);
        });

        window.addEventListener(
            'touchstart',
            event => {
                if (this.isUiEvent(event)) {
                    return;
                }

                if (!event.touches || event.touches.length === 0) {
                    return;
                }

                if (this.isCameraInputLocked) {
                    this.isDragging = false;
                    window.__cameraDragged = false;
                    return;
                }

                const touch = event.touches[0];

                this.isDragging = true;
                this.prevX = touch.clientX;
                this.totalDragDistance = 0;

                window.__cameraDragged = false;
            },
            { passive: true }
        );

        window.addEventListener(
            'touchmove',
            event => {
                if (!this.isDragging) {
                    return;
                }

                if (!event.touches || event.touches.length === 0) {
                    return;
                }

                const touch = event.touches[0];

                if (this.isCameraInputLocked) {
                    this.prevX = touch.clientX;
                    window.__cameraDragged = false;
                    return;
                }

                const dx = touch.clientX - this.prevX;

                this.prevX = touch.clientX;
                this.totalDragDistance += Math.abs(dx);

                if (this.totalDragDistance > this.dragThreshold) {
                    window.__cameraDragged = true;
                }

                this.yaw -= dx * this.dragSensitivity;
            },
            { passive: true }
        );

        window.addEventListener('touchend', () => {
            this.isDragging = false;

            setTimeout(() => {
                window.__cameraDragged = false;
            }, 120);
        });

        window.addEventListener('touchcancel', () => {
            this.isDragging = false;

            setTimeout(() => {
                window.__cameraDragged = false;
            }, 120);
        });
    }

    isUiEvent(event) {
        const target = event.target;

        if (!target || typeof target.closest !== 'function') {
            return false;
        }

        if (target.closest('#item-menu')) {
            return true;
        }

        if (target.closest('#ui-overlay')) {
            return true;
        }

        if (target.closest('#status')) {
            return true;
        }

        if (target.closest('#dev-playback-panel')) {
            return true;
        }

        return false;
    }

    setInputLocked(locked) {
        this.isCameraInputLocked = !!locked;

        if (this.isCameraInputLocked) {
            this.isDragging = false;
            window.__cameraDragged = false;
        }

        console.log(
            `[CameraController] Input ${this.isCameraInputLocked ? 'locked' : 'unlocked'}`
        );
    }

    startReturnBehindMiku(options = {}) {
        this.returnBehindMikuActive = true;
        this.returnBehindMikuElapsed = 0;

        this.returnBehindMikuDuration =
            options.duration ?? 2.8;

        this.returnBehindStartYaw =
            this.yaw;

        this.returnBehindTargetYaw =
            options.targetYaw ?? 0;

        console.log(
            '[CameraController] Return behind Miku started.'
        );
    }

    updateReturnBehindMiku(delta) {
        if (!this.returnBehindMikuActive) {
            return;
        }

        this.returnBehindMikuElapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.returnBehindMikuElapsed /
                    this.returnBehindMikuDuration,
                0,
                1
            );

        const eased =
            t * t * (3 - 2 * t);

        const diff =
            Math.atan2(
                Math.sin(
                    this.returnBehindTargetYaw -
                        this.returnBehindStartYaw
                ),
                Math.cos(
                    this.returnBehindTargetYaw -
                        this.returnBehindStartYaw
                )
            );

        this.yaw =
            this.returnBehindStartYaw +
            diff * eased;

        if (t >= 1.0) {
            this.yaw = this.returnBehindTargetYaw;
            this.returnBehindMikuActive = false;

            console.log(
                '[CameraController] Return behind Miku completed.'
            );
        }
    }

    smooth01(t) {
        const x =
            THREE.MathUtils.clamp(
                t,
                0,
                1
            );

        return x * x * (3 - 2 * x);
    }

    createLookQuaternion(targetPosition) {
        const matrix =
            new THREE.Matrix4();

        matrix.lookAt(
            this.camera.position,
            targetPosition,
            this.camera.up
        );

        return new THREE.Quaternion()
            .setFromRotationMatrix(matrix);
    }

    startFinalNoteAscendFollow(targetGetter, options = {}) {
        this.finalNoteAscendActive = true;
        this.finalNoteAscendElapsed = 0;

        this.finalNoteRotateDuration =
            options.rotateDuration ??
            options.duration ??
            3.0;

        this.finalNoteHoldDuration =
            options.holdDuration ?? 4.5;

        this.finalNoteTargetGetter =
            typeof targetGetter === 'function'
                ? targetGetter
                : null;

        this.ascendStartQuat.copy(
            this.camera.quaternion
        );

        const noteTarget =
            this.finalNoteTargetGetter?.();

        let targetDirection =
            new THREE.Vector3();

        const minUpY =
            options.minUpY ?? 0.65;

        const skyBias =
            options.skyBias ?? 2.0;

        if (noteTarget) {
            const rawDirection =
                noteTarget.clone()
                    .sub(this.camera.position)
                    .normalize();

            targetDirection
                .set(
                    rawDirection.x,
                    Math.max(rawDirection.y, minUpY),
                    rawDirection.z
                )
                .normalize();
        } else {
            this.camera.getWorldDirection(
                targetDirection
            );

            targetDirection.y =
                Math.max(
                    targetDirection.y,
                    minUpY
                );

            targetDirection.normalize();
        }

        targetDirection.y *= skyBias;
        targetDirection.normalize();

        const targetPosition =
            this.camera.position.clone().add(
                targetDirection.multiplyScalar(100)
            );

        this.ascendTargetQuat.copy(
            this.createLookQuaternion(
                targetPosition
            )
        );

        console.log(
            '[CameraController] Final note ascend angle started.'
        );
    }

    updateFinalNoteAscendFollow(delta) {
        this.finalNoteAscendElapsed += delta;

        const rotateDuration =
            Math.max(
                0.001,
                this.finalNoteRotateDuration
            );

        const holdDuration =
            Math.max(
                0.001,
                this.finalNoteHoldDuration
            );

        const rotateT =
            THREE.MathUtils.clamp(
                this.finalNoteAscendElapsed /
                    rotateDuration,
                0,
                1
            );

        if (rotateT < 1.0) {
            const eased =
                this.smooth01(rotateT);

            this.camera.quaternion
                .copy(this.ascendStartQuat)
                .slerp(
                    this.ascendTargetQuat,
                    eased
                );

            return;
        }

        this.camera.quaternion.copy(
            this.ascendTargetQuat
        );

        const holdElapsed =
            this.finalNoteAscendElapsed -
            rotateDuration;

        if (holdElapsed < holdDuration) {
            return;
        }

        this.camera.quaternion.copy(
            this.ascendTargetQuat
        );
    }

startFinalSkyAdvance(options = {}) {
    this.finalSkyActive = true;
    this.finalSkyTime = 0;

    this.finalSkyDuration =
        options.duration ?? 12.5;

    this.finalNoteAscendActive = false;
    this.endingReturnActive = false;
    this.endingDiscoverActive = false;
    this.endingOverviewActive = false;
    this.endingStillActive = false;

    const forward =
        new THREE.Vector3();

    this.camera.getWorldDirection(
        forward
    );

    forward.y = 0;

    if (forward.lengthSq() < 0.0001) {
        forward.set(0, 0, -1);
    }

    forward.normalize();

    this.finalSkyForwardDir.copy(
        forward
    );

    this.finalSkyStartPos.copy(
        this.camera.position
    );
    this.finalSkyForwardPos.copy(
        this.camera.position
    );

    this.finalSkyForwardPos.addScaledVector(
        forward,
        options.forwardDistance ?? 95
    );

    this.finalSkyTargetPos.copy(
        this.finalSkyForwardPos
    );

    this.finalSkyTargetPos.addScaledVector(
        forward,
        options.riseForwardDistance ?? 70
    );

    this.finalSkyTargetPos.y +=
        options.upAmount ?? 52;

    this.finalSkyReachedEmitted = false;

    console.log(
        '[CameraController] Final sky advance started.',
        {
            start: this.finalSkyStartPos.clone(),
            forward: this.finalSkyForwardPos.clone(),
            target: this.finalSkyTargetPos.clone()
        }
    );
}

updateFinalSky(delta) {
    if (!this.finalSkyActive) {
        return false;
    }

    this.finalSkyTime += delta;

    const t =
        THREE.MathUtils.clamp(
            this.finalSkyTime /
                this.finalSkyDuration,
            0,
            1
        );

    const forwardPhaseEnd = 0.38;

    if (t < forwardPhaseEnd) {
        const localT =
            THREE.MathUtils.clamp(
                t / forwardPhaseEnd,
                0,
                1
            );

        const eased =
            localT * localT * (3 - 2 * localT);

        this.camera.position.lerpVectors(
            this.finalSkyStartPos,
            this.finalSkyForwardPos,
            eased
        );

        const lookTarget =
            this.camera.position
                .clone()
                .addScaledVector(
                    this.finalSkyForwardDir,
                    38
                );

        lookTarget.y +=
            THREE.MathUtils.lerp(
                1.8,
                4.0,
                eased
            );

        this.camera.lookAt(
            lookTarget
        );

        return false;
    }

    const riseT =
        THREE.MathUtils.clamp(
            (t - forwardPhaseEnd) /
                (1.0 - forwardPhaseEnd),
            0,
            1
        );

    const riseEase =
        1.0 -
        Math.pow(
            1.0 - riseT,
            3.0
        );

    this.camera.position.lerpVectors(
        this.finalSkyForwardPos,
        this.finalSkyTargetPos,
        riseEase
    );

    const lookUp =
        THREE.MathUtils.lerp(
            8,
            54,
            riseEase
        );

    const lookForward =
        THREE.MathUtils.lerp(
            36,
            10,
            riseEase
        );

    const lookTarget =
        this.camera.position
            .clone()
            .addScaledVector(
                this.finalSkyForwardDir,
                lookForward
            );

    lookTarget.y +=
        lookUp;

    this.camera.lookAt(
        lookTarget
    );

    if (
        t >= 0.86 &&
        !this.finalSkyReachedEmitted
    ) {
        this.finalSkyReachedEmitted = true;

        return 'skyReached';
    }

    return false;
}
    startEndingReturn(targetGetter, options = {}) {
        this.finalNoteAscendActive = false;

        this.endingReturnActive = true;
        this.endingReturnElapsed = 0;

        this.endingReturnDuration =
            options.duration ?? 5.0;

        this.endingReturnStartQuat.copy(
            this.camera.quaternion
        );

        const target =
            typeof targetGetter === 'function'
                ? targetGetter()
                : null;

        const fallbackTarget =
            this.camera.position.clone().add(
                new THREE.Vector3(
                    0,
                    -0.2,
                    -30
                )
            );

        this.endingReturnTargetQuat.copy(
            this.createLookQuaternion(
                target || fallbackTarget
            )
        );

        console.log(
            '[CameraController] Ending return look started.'
        );
    }

    updateEndingReturn(delta) {
        this.endingReturnElapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.endingReturnElapsed /
                    this.endingReturnDuration,
                0,
                1
            );

        const eased =
            1.0 -
            Math.pow(
                1.0 - t,
                3.0
            );

        this.camera.quaternion
            .copy(this.endingReturnStartQuat)
            .slerp(
                this.endingReturnTargetQuat,
                eased
            );

        if (t >= 1.0) {
            this.endingReturnActive = false;
        }
    }

    startEndingDiscover(targetGetter, options = {}) {
        this.endingDiscoverActive = true;
        this.endingDiscoverElapsed = 0;

        this.endingDiscoverDuration =
            options.duration ?? 8.0;

        this.endingDiscoverStartQuat.copy(
            this.camera.quaternion
        );

        const target =
            typeof targetGetter === 'function'
                ? targetGetter()
                : null;

        const fallbackTarget =
            this.camera.position.clone().add(
                new THREE.Vector3(
                    0,
                    -2.5,
                    -45
                )
            );

        this.endingDiscoverTargetQuat.copy(
            this.createLookQuaternion(
                target || fallbackTarget
            )
        );

        console.log(
            '[CameraController] Ending discovery look started.'
        );
    }

    updateEndingDiscover(delta) {
        this.endingDiscoverElapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.endingDiscoverElapsed /
                    this.endingDiscoverDuration,
                0,
                1
            );

        const eased =
            this.smooth01(t);

        this.camera.quaternion
            .copy(this.endingDiscoverStartQuat)
            .slerp(
                this.endingDiscoverTargetQuat,
                eased
            );

        if (t >= 1.0) {
            this.endingDiscoverActive = false;
        }
    }

    startEndingOverview(options = {}) {
        this.endingOverviewActive = true;
        this.endingOverviewElapsed = 0;

        this.endingOverviewDuration =
            options.duration ?? 8.0;

        this.endingOverviewStartPosition.copy(
            this.camera.position
        );

        this.endingOverviewStartQuat.copy(
            this.camera.quaternion
        );

        this.endingOverviewStartFov =
            this.camera.fov;

        this.endingOverviewTargetFov =
            options.targetFov ??
            Math.min(
                this.camera.fov + 6,
                62
            );

        const forward =
            new THREE.Vector3();

        this.camera.getWorldDirection(
            forward
        );

        forward.y = 0;

        if (forward.lengthSq() < 0.0001) {
            forward.set(0, 0, -1);
        }

        forward.normalize();

        this.endingOverviewTargetPosition.copy(
            this.camera.position
        );

        this.endingOverviewTargetPosition.addScaledVector(
            forward,
            options.forwardDistance ?? 60
        );

        this.endingOverviewTargetPosition.y +=
            options.upAmount ?? 2.5;

        console.log(
            '[CameraController] Ending overview forward move started.'
        );
    }

    updateEndingOverview(delta) {
        this.endingOverviewElapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.endingOverviewElapsed /
                    this.endingOverviewDuration,
                0,
                1
            );

        const eased =
            this.smooth01(t);

        this.camera.position.lerpVectors(
            this.endingOverviewStartPosition,
            this.endingOverviewTargetPosition,
            eased
        );

        this.camera.quaternion.copy(
            this.endingOverviewStartQuat
        );

        this.camera.fov =
            THREE.MathUtils.lerp(
                this.endingOverviewStartFov,
                this.endingOverviewTargetFov,
                eased
            );

        this.camera.updateProjectionMatrix();

        if (t >= 1.0) {
            this.endingOverviewActive = false;
        }
    }

    startEndingStill(options = {}) {
        this.endingStillActive = true;
        this.endingStillElapsed = 0;

        this.endingStillDuration =
            options.duration ?? 4.0;

        this.endingStillQuat.copy(
            this.camera.quaternion
        );

        console.log(
            '[CameraController] Ending still started.'
        );
    }

    updateEndingStill(delta) {
        this.endingStillElapsed += delta;

        this.camera.quaternion.copy(
            this.endingStillQuat
        );

        if (this.endingStillElapsed >= this.endingStillDuration) {
            this.endingStillActive = false;
        }
    }

    update(delta) {
        const miku =
            this.characterManager.getMiku();

        if (!miku || !miku.model) {
            return false;
        }

        if (this.finalSkyActive) {
            return this.updateFinalSky(
                delta
            );
        }

        if (this.finalNoteAscendActive) {
            this.updateFinalNoteAscendFollow(
                delta
            );

            return false;
        }

        if (this.endingReturnActive) {
            this.updateEndingReturn(
                delta
            );

            return false;
        }

        if (this.endingDiscoverActive) {
            this.updateEndingDiscover(
                delta
            );

            return false;
        }

        if (this.endingOverviewActive) {
            this.updateEndingOverview(
                delta
            );

            return false;
        }

        if (this.endingStillActive) {
            this.updateEndingStill(
                delta
            );

            return false;
        }

        this.updateReturnBehindMiku(
            delta
        );

        const mikuPosition =
            miku.model.position;

        const offset =
            new THREE.Vector3(
                Math.sin(this.yaw) * this.distance,
                this.fixedHeight,
                Math.cos(this.yaw) * this.distance
            );

        this.camera.position
            .copy(mikuPosition)
            .add(offset);

        const lookTarget =
            mikuPosition.clone();

        lookTarget.y +=
            this.lookAtHeight;

        this.camera.lookAt(
            lookTarget
        );

        return false;
    }
}