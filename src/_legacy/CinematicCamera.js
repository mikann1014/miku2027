import * as THREE from 'three';

export class CinematicCamera {
    constructor(camera) {
        this.camera = camera;

        this.started = false;

        this.startPos = new THREE.Vector3();   // ✅ 固定
        this.passAngle = 0;
    }

    update(progress, startProgress, endProgress, mikuModel, mikuAngle) {
        if (!mikuModel) return;

        const rawT = THREE.MathUtils.clamp(
            (progress - startProgress) / (endProgress - startProgress),
            0,
            1
        );

        const t = THREE.MathUtils.clamp(rawT * 1.4, 0, 1);

        const ORBIT_RADIUS = 116.5;

        if (!this.started) {
            this.started = true;

            // ✅ ★ ここが超重要（始点固定）
            this.startPos.copy(this.camera.position);
        }

        let pos;
        let target;

        // =========================
        // 🟢 突き抜け（完全停止）
        // =========================
        if (t < 0.25) {

            const phaseT = t / 0.25;

            const nextAngle = mikuAngle + 0.02;

            const current = mikuModel.position.clone();
            const next = new THREE.Vector3(
                Math.cos(nextAngle) * ORBIT_RADIUS,
                current.y,
                Math.sin(nextAngle) * ORBIT_RADIUS
            );

            const dir = next.sub(current).normalize();

            const passTarget = new THREE.Vector3()
                .copy(mikuModel.position)
                .addScaledVector(dir, 60);

            passTarget.y = current.y + 5;

            // ✅ ★ 始点は固定（これで直線バグ消える）
            pos = new THREE.Vector3().lerpVectors(
                this.startPos,
                passTarget,
                phaseT
            );

            // ✅ ★ 円に完全一致させる
            if (phaseT >= 0.98) {
                this.passAngle = Math.atan2(
                    passTarget.z,
                    passTarget.x
                );
            }

            target = mikuModel.position;
        }

        // =========================
        // 🟡 即円（遅延ゼロ）
        // =========================
        else if (t < 0.65) {

            const phaseT = (t - 0.25) / 0.4;

            const angle = this.passAngle + phaseT * Math.PI * 2;

            pos = new THREE.Vector3(
                Math.cos(angle) * ORBIT_RADIUS,
                mikuModel.position.y + 6,
                Math.sin(angle) * ORBIT_RADIUS
            );

            target = mikuModel.position.clone();
        }

        // =========================
        // 🔵 俯瞰
        // =========================
        else {

            const phaseT = (t - 0.65) / 0.35;
            const eased = phaseT * phaseT;

            if (phaseT > 0.3) {
                mikuModel.visible = false;
            }

            const angle =
                this.passAngle +
                Math.PI * 2 +
                eased * Math.PI * 1.5;

            const HEIGHT = 180;
            const RADIUS = 80;

            const offset = new THREE.Vector3(20, 0, -10);

            const top = new THREE.Vector3(
                Math.cos(angle) * RADIUS,
                HEIGHT,
                Math.sin(angle) * RADIUS
            );

            pos = top.add(offset);

            target = new THREE.Vector3(0, 0, 0);
        }

        this.camera.position.copy(pos);
        this.camera.lookAt(target);
    }
}