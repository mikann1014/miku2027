import { MikuMaterialApplier } from '../character/MikuMaterialApplier.js';
import { MikuAnimationController } from '../character/MikuAnimationController.js';

/**
 * MikuEntity
 *
 * ・ミクモデルのエンティティ管理クラス
 * ・アニメーション制御とマテリアル適用を統合
 * ・外部からは「アクション操作インターフェース」として扱う
 */
export class MikuEntity {

    constructor(gltf, cameraParams = null, defaultActionName = 'Walk') {

        // --- モデル本体 ---
        this.model = gltf.scene;

        // --- カメラ関連パラメータ（外部連携用） ---
        this.cameraParams = cameraParams;

        // 初期回転
        this.model.rotation.set(0, 0, 0);

        // --- アニメーションコントローラ ---
        this.animationController =
            new MikuAnimationController(this.model);

        // --- マテリアル適用 ---
        this.materialApplier =
            new MikuMaterialApplier();

        // 基本アニメーションセットアップ
        this.animationController.setupBaseAnimation(
            gltf,
            defaultActionName
        );

        // 初期スケール
        this.model.scale.set(
            1.5,
            1.5,
            1.5
        );

        // マテリアル適用
        this.materialApplier.apply(this.model);
    }


    /**
     * 追加アニメーション登録
     */
    addAnimationFromGLTF(gltf, actionName) {
        this.animationController.addAnimationFromGLTF(
            gltf,
            actionName
        );
    }


    /**
     * アクション存在確認
     */
    hasAction(name) {
        return this.animationController.hasAction(name);
    }


    /**
     * 候補から一致するアクション名を探す
     */
    findActionName(candidates) {
        return this.animationController.findActionName(candidates);
    }


    /**
     * 全アクション名取得
     */
    getActionNames() {
        return this.animationController.getActionNames();
    }


    /**
     * フェード遷移
     */
    fadeToAction(name, duration = 0.5) {
        this.animationController.fadeToAction(
            name,
            duration
        );
    }


    /**
     * 単発再生
     */
    playOnce(name, duration = 0.2, onFinished = null) {
        this.animationController.playOnce(
            name,
            duration,
            onFinished
        );
    }


    /**
     * 歩く
     */
    playWalk(duration = 0.35) {
        this.animationController.playWalk(duration);
    }


    /**
     * 走る
     */
    playRun(duration = 0.45) {
        this.animationController.playRun(duration);
    }


    /**
     * 歩き → 停止
     */
    playWalkToStop(duration = 0.25, onFinished = null) {
        this.animationController.playWalkToStop(
            duration,
            onFinished
        );
    }


    /**
     * 歩き → 停止（パターンA）
     */
    playWalkToStopA(duration = 0.25, onFinished = null) {
        this.animationController.playWalkToStopA(
            duration,
            onFinished
        );
    }


    /**
     * 歩き → 停止（パターンB）
     */
    playWalkToStopB(duration = 0.25, onFinished = null) {
        this.animationController.playWalkToStopB(
            duration,
            onFinished
        );
    }


    /**
     * 停止
     */
    playStop(duration = 0.2) {
        this.animationController.playStop(duration);
    }


    /**
     * 手アクション
     */
    playHand(duration = 0.18, onFinished = null) {
        this.animationController.playHand(
            duration,
            onFinished
        );
    }


    /**
     * ハートアクション
     */
    playHart(duration = 0.18, onFinished = null) {
        this.animationController.playHart(
            duration,
            onFinished
        );
    }


    /**
     * ターン
     */
    playTurn(duration = 0.16, onFinished = null) {
        this.animationController.playTurn(
            duration,
            onFinished
        );
    }


    /**
     * ターン（別パターン）
     */
    playTurnB(duration = 0.18, onFinished = null) {
        this.animationController.playTurnB(
            duration,
            onFinished
        );
    }


    /**
     * 手を伸ばす
     */
    playReach(duration = 0.2, onFinished = null) {
        this.animationController.playReach(
            duration,
            onFinished
        );
    }


    /**
     * 思考
     */
    playThink(duration = 0.2, onFinished = null) {
        this.animationController.playThink(
            duration,
            onFinished
        );
    }


    /**
     * 停止 → 崩れ
     */
    playStopToCollapse(duration = 0.12, onFinished = null) {
        this.animationController.playStopToCollapse(
            duration,
            onFinished
        );
    }


    /**
     * 移動ルート生成（現在未使用）
     */
    buildRouteFromLoadMesh(loadMeshes) {
        // 現在は CharacterManager / WorldRenderer 側で移動を制御するため未使用
    }


    /**
     * フレーム更新
     */
    update(delta, landObjects = [], raycaster = null) {
        this.animationController.update(delta);
    }
}