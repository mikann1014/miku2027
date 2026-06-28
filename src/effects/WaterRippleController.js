import * as THREE from 'three';

/**
 * 水面リップル（波紋）を管理するクラス
 * ・リング形状を生成
 * ・時間経過で拡大＋フェードアウト
 */
export class WaterRippleController {
    constructor(scene) {
        this.scene = scene;

        // 現在アクティブなリップル一覧
        this.activeRipples = [];
    }

    /**
     * リップル生成
     * @param {THREE.Vector3} position 発生位置
     */
    spawn(position, options = {}) {
        if (!this.scene || !position) return null;

        // リングジオメトリ（内径・外径で輪を作る）
        const geometry = new THREE.RingGeometry(
            options.innerRadius ?? 0.75,
            options.outerRadius ?? 0.92,
            options.segments ?? 56
        );

        // マテリアル（加算合成で発光風）
        const material = new THREE.MeshBasicMaterial({
            color: options.color ?? 0x8feeff,
            transparent: true,
            opacity: options.opacity ?? 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            toneMapped: false
        });

        const ripple = new THREE.Mesh(
            geometry,
            material
        );

        // 水面に水平配置
        ripple.rotation.x = -Math.PI / 2;

        // 位置設定（少し浮かせる）
        ripple.position.copy(position);
        ripple.position.y += options.yOffset ?? 0.045;

        // 状態データ
        ripple.userData.effectType = 'waterRipple';
        ripple.userData.life = 0;
        ripple.userData.duration = options.duration ?? 0.9;

        ripple.userData.startScale = options.startScale ?? 0.75;
        ripple.userData.endScale = options.endScale ?? 1.85;

        ripple.userData.baseOpacity =
            options.baseOpacity ?? 0.32;

        // 初期スケール設定
        ripple.scale.setScalar(
            ripple.userData.startScale
        );

        this.scene.add(ripple);
        this.activeRipples.push(ripple);

        return ripple;
    }

    /**
     * 全リップル更新
     */
    update(delta = 0.016) {
        if (this.activeRipples.length === 0) return;

        this.activeRipples =
            this.activeRipples.filter(ripple => {
                if (!ripple) return false;

                // ライフ更新
                ripple.userData.life =
                    (ripple.userData.life || 0) + delta;

                const duration =
                    ripple.userData.duration || 1.0;

                // 進行度 (0〜1)
                const progress = THREE.MathUtils.clamp(
                    ripple.userData.life / duration,
                    0,
                    1
                );

                // 個別更新
                this.updateRipple(
                    ripple,
                    progress
                );

                // 終了処理
                if (progress >= 1) {
                    this.remove(ripple);
                    return false;
                }

                return true;
            });
    }

    /**
     * リップルのスケール・透明度更新
     */
    updateRipple(ripple, progress) {
        if (!ripple) return;

        const startScale =
            ripple.userData.startScale ?? 1.0;

        const endScale =
            ripple.userData.endScale ?? 2.0;

        // イージング（加速→減速）
        const eased =
            1.0 - Math.pow(1.0 - progress, 3.0);

        // スケール補間
        const scale = THREE.MathUtils.lerp(
            startScale,
            endScale,
            eased
        );

        ripple.scale.setScalar(scale);

        const baseOpacity =
            ripple.userData.baseOpacity ?? 0.32;

        // フェードアウト（後半で強く消える）
        const opacity =
            baseOpacity *
            Math.pow(1.0 - progress, 1.35);

        if (ripple.material) {
            ripple.material.opacity = opacity;
            ripple.material.needsUpdate = true;
        }
    }

    /**
     * リップル削除
     */
    remove(ripple) {
        if (!ripple) return;

        // シーンから削除
        ripple.parent?.remove(ripple);

        // メモリ解放（geometry / material）
        ripple.traverse(node => {
            if (!node) return;

            if (node.geometry) {
                node.geometry.dispose?.();
            }

            if (node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(material => {
                        material?.dispose?.();
                    });
                } else {
                    node.material.dispose?.();
                }
            }
        });
    }

    /**
     * 全削除
     */
    clear() {
        this.activeRipples.forEach(ripple => {
            this.remove(ripple);
        });

        this.activeRipples = [];
    }
}