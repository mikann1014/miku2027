import * as THREE from 'three';

import { MikuDissolveToBirdEffect } from '../effects/MikuDissolveToBirdEffect.js';
import { InterludeWordEffect } from '../effects/InterludeWordEffect.js';
import { LateActTimelineController } from './LateActTimelineController.js';

export class LateActSequenceDirector {
    constructor(worldRenderer) {
        this.worldRenderer = worldRenderer;

        this.scene = worldRenderer.scene;
        this.camera = worldRenderer.camera;

        this.state = 'idle';
        this.elapsed = 0;

        this.hasStarted = false;
        this.hasCompleted = false;

        this.delayAfterCollapseFinished = 0.45;

        this.dissolveEffect =
            new MikuDissolveToBirdEffect(
                this.scene,
                {
                    duration: 2.2,
                    particleCount: 2400,
                    particleSize: 0.03,
                    hideSourceAt: 0.08,
                    fogSpreadRadius: 11.5,
                    fogRiseMin: 1.8,
                    fogRiseMax: 7.2,
                    noiseStrength: 0.85,
                    swirlStrength: 0.7
                }
            );

        this.wordEffect =
            new InterludeWordEffect(
                this.worldRenderer,
                {
                    initialSpawnDelay: 0.05,
                    spawnDelayPerWord: 1.15,
                    wordFallDuration: 5.2,
                    wordFadeInDuration: 0.38,

                    clickWindowAfterLanding: 2.8,
                    wordDissolveDuration: 1.4,

                    frontDistance: 18.0,
                    horizontalSpread: 10.5,
                    depthSpread: 4.0,
                    landingY: 0.08,
                    gatherDuration: 4.2
                }
            );

        this.birdTemplate = null;
        this.birdAnimations = [];

        this.timeline =
            new LateActTimelineController(
                this.worldRenderer
            );
    }

    registerBirdGLTF(gltf) {
        if (!gltf || !gltf.scene) {
            return;
        }

        this.birdTemplate = gltf.scene;
        this.birdAnimations = gltf.animations || [];

        console.log('[LateAct] Bird registered (unused)');
    }

    startFromCollapse() {
        if (this.hasStarted) {
            return;
        }

        this.hasStarted = true;
        this.hasCompleted = false;

        this.state = 'waitAfterCollapse';
        this.elapsed = 0;

        if (this.worldRenderer) {
            this.worldRenderer.isLateActCinematicActive = false;
        }

        console.log('[LateAct] Collapse → wait');
    }

    beginReturnToMiku() {
        console.log('[LateAct] Bird disabled');
    }

    update(delta = 0.016) {
        // =========================
        // 最重要：
        // timeline は hasCompleted 後も更新する
        // =========================
        if (
            this.timeline &&
            typeof this.timeline.update === 'function'
        ) {
            this.timeline.update(delta);
        }

        // =========================
        // LateAct本体が終了していても、
        // timeline は上で動かし続ける
        // =========================
        if (
            this.state === 'idle' ||
            this.hasCompleted
        ) {
            return;
        }

        this.elapsed += delta;

        if (this.state === 'waitAfterCollapse') {
            this.updateWaitAfterCollapse();
        }

        else if (this.state === 'mikuDissolve') {
            this.updateMikuDissolve(delta);
        }

        else if (this.state === 'wordInterlude') {
            this.updateWordInterlude(delta);
        }

        else if (this.state === 'wordGather') {
            this.updateWordInterlude(delta);
        }
    }

    updateWaitAfterCollapse() {
        if (this.elapsed < this.delayAfterCollapseFinished) {
            return;
        }

        this.startMikuDissolve();

        this.state = 'mikuDissolve';
        this.elapsed = 0;
    }

    startMikuDissolve() {
        const mikuModel =
            this.worldRenderer.miku?.model;

        if (!mikuModel) {
            console.warn('[LateAct] Miku missing');
            return;
        }

        this.worldRenderer.setMikuMoveMode?.('stop');
        this.worldRenderer.prepareMikuDissolveInterlude?.();

        const started =
            this.dissolveEffect.start(
                mikuModel
            );

        if (!started) {
            console.warn('[LateAct] dissolve failed');
            return;
        }

        if (this.worldRenderer) {
            this.worldRenderer.isLateActCinematicActive = false;
        }

        console.log('[LateAct] Dissolve start');
    }

    updateMikuDissolve(delta) {
        const completed =
            this.dissolveEffect.update(delta);

        if (!completed) {
            return;
        }

        const mikuPosition =
            this.worldRenderer.characterManager
                ?.getMikuPosition?.()
                ?.clone() ||
            new THREE.Vector3(0, 0, 0);

        this.wordEffect.start(mikuPosition);

        this.state = 'wordInterlude';
        this.elapsed = 0;

        console.log('[LateAct] Word phase start');
    }

    updateWordInterlude(delta) {
        if (
            !this.wordEffect ||
            typeof this.wordEffect.update !== 'function'
        ) {
            return;
        }

        this.wordEffect.update(delta);
    }

    handlePointerEvent(event) {
        if (
            this.state === 'wordInterlude' ||
            this.state === 'wordGather'
        ) {
            return this.wordEffect.handlePointerEvent(event);
        }

        return false;
    }

    startGatherWordsToMiku() {
        if (this.state !== 'wordInterlude') {
            return;
        }

        this.state = 'wordGather';
        this.elapsed = 0;

        this.wordEffect.startGatherToPathMiku(summary => {
            this.reappearMikuFromWords(summary);
        });

        console.log('[LateAct] Gather start');
    }

    reappearMikuFromWords(summary = null) {
        const mikuModel =
            this.worldRenderer.miku?.model;

        if (!mikuModel) {
            console.warn('[LateAct] Miku missing');
            return;
        }

        mikuModel.visible = true;

        this.state = 'mikuReappeared';
        this.hasCompleted = true;

        if (this.worldRenderer) {
            this.worldRenderer.setInteractionLocked?.(false);
            this.worldRenderer.setPlacementEnabled?.(true);
            this.worldRenderer.setMikuMoveMode?.('walk');

            this.worldRenderer.currentPhase = 'lastChorus';
        }

        this.timeline?.start();

        console.log('[LateAct] Miku restored', summary);
    }

    clear() {
        this.dissolveEffect?.clear();
        this.wordEffect?.clear();
        this.timeline?.clear();

        this.state = 'idle';
        this.elapsed = 0;

        this.hasStarted = false;
        this.hasCompleted = false;
    }
}