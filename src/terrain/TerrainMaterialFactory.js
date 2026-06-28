import * as THREE from 'three';

export class TerrainMaterialFactory {
    constructor(options = {}) {
        this.options = options;
    }

    createMaterials() {
        return {
            waterMaterial: this.createWaterMaterial(),
            pathMaterial: this.createPathMaterial(),
            groundMaterial: this.createGroundMaterial(),
            horizonMountainMaterial: this.createHorizonMountainMaterial()
        };
    }

    createWaterMaterial() {
        return new THREE.MeshBasicMaterial({
            color: this.options.waterColor ?? 0x00142f,
            transparent: true,
            opacity: this.options.waterBaseOpacity ?? 0.34,

            // 透明な水面は深度を書かない。
            // これで音符・花・草が水面の下に沈んだように見える問題を抑える。
            depthWrite: false,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }

    createPathMaterial() {
        return new THREE.MeshBasicMaterial({
            color: this.options.pathColor ?? 0x11141b,
            transparent: true,
            opacity: this.options.pathBaseOpacity ?? 0.92,

            // 透明な道面が深度を書き込むと、
            // 手前の半透明面が奥のオブジェクトを隠すことがある。
            depthWrite: false,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }

    createGroundMaterial() {
        return new THREE.MeshBasicMaterial({
            color: this.options.groundColor ?? 0x06130f,
            transparent: true,
            opacity: this.options.groundBaseOpacity ?? 0.9,

            // 透明地面も深度を書かない。
            // サイバー系ワイヤー表示を優先する。
            depthWrite: false,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }

    createHorizonMountainMaterial() {
        return new THREE.MeshBasicMaterial({
            color: this.options.horizonMountainColor ?? 0x030708,
            transparent: true,
            opacity: this.options.horizonMountainOpacity ?? 0.94,

            // 遠景山は背景として使うので、基本は深度を書いてOK。
            depthWrite: true,
            depthTest: true,

            side: THREE.DoubleSide,
            toneMapped: false
        });
    }
}