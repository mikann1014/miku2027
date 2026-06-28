import * as THREE from 'three';

/**
 * TerrainMaterialFactory
 *
 * ・地形用マテリアルを生成するファクトリクラス
 *
 * 役割：
 * - 水 / 道 / 地面 / 遠景山 のマテリアル統一生成
 * - 深度・透明描画のルールを一元管理
 *
 * 特徴：
 * 👉 基本は MeshBasicMaterial（軽量・非ライティング）
 * 👉 depthWrite 制御で透明描画破綻を防ぐ
 */
export class TerrainMaterialFactory {

    constructor(options = {}) {
        this.options = options;
    }


    /**
     * =========================
     * ✅ 一括生成
     * =========================
     */
    createMaterials() {
        return {
            waterMaterial: this.createWaterMaterial(),
            pathMaterial: this.createPathMaterial(),
            groundMaterial: this.createGroundMaterial(),
            horizonMountainMaterial: this.createHorizonMountainMaterial()
        };
    }


    /**
     * =========================
     * ✅ 水マテリアル
     * =========================
     */
    createWaterMaterial() {

        return new THREE.MeshBasicMaterial({
            color: this.options.waterColor ?? 0x00142f,
            transparent: true,
            opacity: this.options.waterBaseOpacity ?? 0.34,

            /**
             * 透明な水面は深度を書かない。
             * → 水の下にあるオブジェクトが消えてしまう問題を防ぐ
             */
            depthWrite: false,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }


    /**
     * =========================
     * ✅ 道マテリアル
     * =========================
     */
    createPathMaterial() {

        return new THREE.MeshBasicMaterial({
            color: this.options.pathColor ?? 0x11141b,
            transparent: true,
            opacity: this.options.pathBaseOpacity ?? 0.92,

            /**
             * 透明な道は深度を書かない。
             * → 半透明レイヤ同士の重なり破綻防止
             */
            depthWrite: false,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }


    /**
     * =========================
     * ✅ 地面マテリアル
     * =========================
     */
    createGroundMaterial() {

        return new THREE.MeshBasicMaterial({
            color: this.options.groundColor ?? 0x06130f,
            transparent: true,
            opacity: this.options.groundBaseOpacity ?? 0.9,

            /**
             * 地面も深度を書かない
             * → ワイヤーやエフェクトを優先表示
             */
            depthWrite: false,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }


    /**
     * =========================
     * ✅ 遠景山マテリアル
     * =========================
     */
    createHorizonMountainMaterial() {

        return new THREE.MeshBasicMaterial({
            color: this.options.horizonMountainColor ?? 0x030708,
            transparent: true,
            opacity: this.options.horizonMountainOpacity ?? 0.94,

            /**
             * 遠景は“背景”
             * → 深度を書いてOK（正しい奥行きを維持）
             */
            depthWrite: true,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }
}