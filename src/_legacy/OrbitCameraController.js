import * as THREE from 'three';

export class OrbitCameraController {
    constructor(camera) {
        this.camera = camera;

        // ✅ 横回転だけ残す
        this.cameraYaw = 0;

        // ❌ もう使わない
        this.cameraPitch = 0;  

        this.mouseSensitivity = 0.0025;

        this.isDragging = false;
        this.prevMouse = { x: 0, y: 0 };

        this.prevPosition = new THREE.Vector3();
        this.initialized = false;

        this.setupEvents();
    }

    setupEvents() {
        window.addEventListener("mousedown", (e) => {
            this.isDragging = true;
            this.prevMouse.x = e.clientX;
            this.prevMouse.y = e.clientY;
        });

        window.addEventListener("mousemove", (e) => {
            if (!this.isDragging) return;

            const dx = e.clientX - this.prevMouse.x;

            // ✅ 横だけ
            this.cameraYaw += dx * this.mouseSensitivity;

            // ❌ 縦操作完全削除
            // const dy = e.clientY - this.prevMouse.y;
            // this.cameraPitch += dy * this.mouseSensitivity;

            this.prevMouse.x = e.clientX;
            this.prevMouse.y = e.clientY;
        });

        window.addEventListener("mouseup", () => {
            this.isDragging = false;
        });
    }

    update(mikuModel) {
        if (!mikuModel) return;

        const currentPos = mikuModel.position.clone();

        if (!this.initialized) {
            this.prevPosition.copy(currentPos);
            this.initialized = true;
        }

        const moveDir = new THREE.Vector3()
            .subVectors(currentPos, this.prevPosition);

        if (moveDir.lengthSq() < 0.00001) {
            return;
        }

        moveDir.normalize();

        // ✅ ミクの後ろ方向
        const backward = moveDir.clone().multiplyScalar(-1);

        // ✅ ユーザーによる左右回転
        backward.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.cameraYaw
        );

        const distance = 17;

        const pos = new THREE.Vector3()
            .copy(currentPos)
            .addScaledVector(backward, distance);

        // ✅ 高さ固定（ここが最重要）
        pos.y = 8;

        this.camera.position.copy(pos);

        // ✅ ミクを見る（少し上を見る）
        this.camera.lookAt(
    currentPos.clone().add(new THREE.Vector3(0, 0.8, 0))
);
        this.prevPosition.copy(currentPos);
    }
}