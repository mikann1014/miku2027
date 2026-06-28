import * as THREE from 'three';

export class OrbitManager {
    constructor(radius = 116.5, fixedY = 3.8) {
        this.radius = radius;
        this.fixedY = fixedY;
        this.angle = 0;
    }

    /**
     * ミクのモデルを軌道上の正しい位置と向きに更新する
     * @param {THREE.Object3D} model - ミクのモデル
     * @param {number} progress - 0.0 ~ 1.0 の再生進行度
     */
    update(model, progress) {
        if (!model) return;

        this.angle = progress * Math.PI * 2;
        const x = Math.cos(this.angle) * this.radius;
        const z = Math.sin(this.angle) * this.radius;

        model.position.set(x, this.fixedY, z);

        // 次の座標を計算して回転方向を決定
        const nextAngle = this.angle + 0.001;
        const nx = Math.cos(nextAngle) * this.radius;
        const nz = Math.sin(nextAngle) * this.radius;

        const dir = new THREE.Vector3(nx - x, 0, nz - z).normalize();
        model.rotation.set(0, Math.atan2(dir.x, dir.z) + Math.PI, 0);
        model.updateMatrixWorld(true);
    }
}