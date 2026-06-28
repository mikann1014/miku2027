import * as THREE from 'three';

import { MikuDissolveToBirdEffect } from '../effects/MikuDissolveToBirdEffect.js';
import { InterludeWordEffect } from '../effects/InterludeWordEffect.js';
import { LateActTimelineController } from './LateActTimelineController.js';

/**
 * LateActSequenceDirector
 *
 * ・後半演出（LateAct）の進行制御クラス
 * ・ミク崩壊 → ワード演出 → 再構成 → タイムライン発火
 *
 * 主な責務：
 * - 状態遷移（state管理）
 * - 各演出エフェクトの起動・更新
 * - Timelineの開始・継続更新
 */
export class LateActSequenceDirector {

    constructor(worldRenderer) {

        this.worldRenderer = worldRenderer;

        this.scene = worldRenderer.scene;
        this.camera = worldRenderer.camera;

        // --- 状態 ---
        this.state = 'idle';
        this.elapsed = 0;

        this.hasStarted = false;
        this.hasCompleted = false;

        // 崩壊後の待機時間
        this.delayAfterCollapseFinished = 0.45;

        // --- ミク分解エフェクト ---
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

        // --- ワード演出 ---
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

        // --- 鳥モデル（現在未使用） ---
        this.birdTemplate = null;
        this.birdAnimations = [];

        // --- タイムライン ---
        this.timeline =
            new LateActTimelineController(
                this.worldRenderer
            );
    }


    /**
     * 鳥GLTF登録（現時点では未使用）
     */
    registerBirdGLTF(gltf) {

        if (!gltf || !gltf.scene) {
            return;
        }

        this.birdTemplate = gltf.scene;
        this.birdAnimations = gltf.animations || [];

        console.log('[LateAct] Bird registered (unused)');
    }


    /**
     * 崩壊後から開始
     */
    startFromCollapse() {

        if (this.hasStarted) {
            return;
        }

        this.hasStarted = true;
        this.hasCompleted = false;

        // 最初は待機
        this.state = 'waitAfterCollapse';
        this.elapsed = 0;

        if (this.worldRenderer) {
            this.worldRenderer.isLateActCinematicActive = false;
        }

        console.log('[LateAct] Collapse → wait');
    }


    /**
     * （未使用フック）
     */
    beginReturnToMiku() {
        console.log('[LateAct] Bird disabled');
    }


    /**
     * メイン更新
     */
    update(delta = 0.016) {

        // =========================
        // timeline は常に更新
        // =========================
        if (
            this.timeline &&
            typeof this.timeline.update === 'function'
        ) {
            this.timeline.update(delta);
        }

        // LateAct終了後は本体処理しない
        if (
            this.state === 'idle' ||
            this.hasCompleted
        ) {
            return;
        }

        this.elapsed += delta;

        // === 状態分岐 ===
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


    /**
     * 崩壊後ウェイト
     */
    updateWaitAfterCollapse() {

        if (this.elapsed < this.delayAfterCollapseFinished) {
            return;
        }

        this.startMikuDissolve();

        this.state = 'mikuDissolve';
        this.elapsed = 0;
    }


    /**
     * ミク分解開始
     */
    startMikuDissolve() {

        const mikuModel =
            this.worldRenderer.miku?.model;

        if (!mikuModel) {
            console.warn('[LateAct] Miku missing');
            return;
        }

        // 移動停止
        this.worldRenderer.setMikuMoveMode?.('stop');

        // 準備フック
        this.worldRenderer.prepareMikuDissolveInterlude?.();

        const started =
            this.dissolveEffect.start(mikuModel);

        if (!started) {
            console.warn('[LateAct] dissolve failed');
            return;
        }

        if (this.worldRenderer) {
            this.worldRenderer.isLateActCinematicActive = false;
        }

        console.log('[LateAct] Dissolve start');
    }


    /**
     * 分解更新
     */
    updateMikuDissolve(delta) {

        const completed =
            this.dissolveEffect.update(delta);

        if (!completed) {
            return;
        }

        // ミク位置取得
        const mikuPosition =
            this.worldRenderer.characterManager
                ?.getMikuPosition?.()
                ?.clone() ||
            new THREE.Vector3(0, 0, 0);

        // ワード開始
        this.wordEffect.start(mikuPosition);

        this.state = 'wordInterlude';
        this.elapsed = 0;

        console.log('[LateAct] Word phase start');
    }


    /**
     * ワード演出更新
     */
    updateWordInterlude(delta) {

        if (
            !this.wordEffect ||
            typeof this.wordEffect.update !== 'function'
        ) {
            return;
        }

        this.wordEffect.update(delta);
    }


    /**
     * クリックイベント
     */
    handlePointerEvent(event) {

        if (
            this.state === 'wordInterlude' ||
            this.state === 'wordGather'
        ) {
            return this.wordEffect.handlePointerEvent(event);
        }

        return false;
    }


    /**
     * ワード収束開始
     */
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


    /**
     * ミク再構成
     */
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

        // --- 状態復帰 ---
        if (this.worldRenderer) {
            this.worldRenderer.setInteractionLocked?.(false);
            this.worldRenderer.setPlacementEnabled?.(true);
            this.worldRenderer.setMikuMoveMode?.('walk');

            this.worldRenderer.currentPhase = 'lastChorus';
        }

        // タイムライン開始
        this.timeline?.start();

        console.log('[LateAct] Miku restored', summary);
    }


    /**
     * リセット
     */
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