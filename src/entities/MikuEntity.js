import { MikuMaterialApplier } from '../character/MikuMaterialApplier.js';
import { MikuAnimationController } from '../character/MikuAnimationController.js';

export class MikuEntity {
    constructor(gltf, cameraParams = null, defaultActionName = 'Walk') {
        this.model = gltf.scene;
        this.cameraParams = cameraParams;

        this.model.rotation.set(0, 0, 0);

        this.animationController =
            new MikuAnimationController(
                this.model
            );

        this.materialApplier =
            new MikuMaterialApplier();

        this.animationController.setupBaseAnimation(
            gltf,
            defaultActionName
        );

        this.model.scale.set(
            1.5,
            1.5,
            1.5
        );

        this.materialApplier.apply(
            this.model
        );
    }

    addAnimationFromGLTF(gltf, actionName) {
        this.animationController.addAnimationFromGLTF(
            gltf,
            actionName
        );
    }

    hasAction(name) {
        return this.animationController.hasAction(name);
    }

    findActionName(candidates) {
        return this.animationController.findActionName(
            candidates
        );
    }

    getActionNames() {
        return this.animationController.getActionNames();
    }

    fadeToAction(name, duration = 0.5) {
        this.animationController.fadeToAction(
            name,
            duration
        );
    }

    playOnce(name, duration = 0.2, onFinished = null) {
        this.animationController.playOnce(
            name,
            duration,
            onFinished
        );
    }

    playWalk(duration = 0.35) {
        this.animationController.playWalk(
            duration
        );
    }

    playRun(duration = 0.45) {
        this.animationController.playRun(
            duration
        );
    }

    playWalkToStop(duration = 0.25, onFinished = null) {
        this.animationController.playWalkToStop(
            duration,
            onFinished
        );
    }

    playWalkToStopA(duration = 0.25, onFinished = null) {
        this.animationController.playWalkToStopA(
            duration,
            onFinished
        );
    }

    playWalkToStopB(duration = 0.25, onFinished = null) {
        this.animationController.playWalkToStopB(
            duration,
            onFinished
        );
    }

    playStop(duration = 0.2) {
        this.animationController.playStop(
            duration
        );
    }

    playHand(duration = 0.18, onFinished = null) {
        this.animationController.playHand(
            duration,
            onFinished
        );
    }

    playHart(duration = 0.18, onFinished = null) {
        this.animationController.playHart(
            duration,
            onFinished
        );
    }

    playTurn(duration = 0.16, onFinished = null) {
        this.animationController.playTurn(
            duration,
            onFinished
        );
    }

    playTurnB(duration = 0.18, onFinished = null) {
    this.animationController.playTurnB(
        duration,
        onFinished
    );
}

    playReach(duration = 0.2, onFinished = null) {
        this.animationController.playReach(
            duration,
            onFinished
        );
    }

    playThink(duration = 0.2, onFinished = null) {
        this.animationController.playThink(
            duration,
            onFinished
        );
    }

    playStopToCollapse(duration = 0.12, onFinished = null) {
        this.animationController.playStopToCollapse(
            duration,
            onFinished
        );
    }

    buildRouteFromLoadMesh(loadMeshes) {
        // 現在は CharacterManager / WorldRenderer 側で移動を制御するため空。
    }

    update(delta, landObjects = [], raycaster = null) {
        this.animationController.update(delta);
    }
}