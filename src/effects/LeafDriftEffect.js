import * as THREE from 'three';

/**
 * 葉っぱが流れるように移動するエフェクト
 * ・一定距離を滑るように移動
 * ・上下に軽く浮く
 * ・移動中に水のリップル（波紋）を発生
 */
export class LeafDriftEffect {
    constructor(spawnManager, options = {}) {
        this.spawnManager = spawnManager;

        // 現在動作中の葉っぱ一覧
        this.activeLeaves = [];

        // 移動距離
        this.distance = options.distance ?? 1.85;

        // 移動時間
        this.duration = options.duration ?? 1.45;

        // リップル生成間隔
        this.rippleInterval = options.rippleInterval ?? 0.28;

        // 上下の浮遊量
        this.floatAmplitude = options.floatAmplitude ?? 0.045;
    }

    /**
     * 葉っぱの移動を開始
     * @param {THREE.Object3D} leafObject 対象オブジェクト
     * @param {THREE.Vector3} direction 移動方向
     */
    trigger(leafObject, direction, options = {}) {
        if (!leafObject || !direction) return;

        // Y軸を無視した平面方向を取得
        const flatDirection = direction.clone().setY(0);

        // ほぼゼロベクトルならデフォルト方向に設定
        if (flatDirection.lengthSq() < 0.0001) {
            flatDirection.set(0, 0, -1);
        }

        flatDirection.normalize();

        // 既に動作中ならリセット
        const existing = this.activeLeaves.find(item => {
            return item.object === leafObject;
        });

        if (existing) {
            existing.life = 0;
            existing.startPosition.copy(leafObject.position);
            existing.direction.copy(flatDirection);
            return;
        }

        // 新規登録
        this.activeLeaves.push({
            object: leafObject,
            startPosition: leafObject.position.clone(),
            direction: flatDirection,
            life: 0,
            duration: options.duration ?? this.duration,
            distance: options.distance ?? this.distance,

            // リップル管理
            lastRippleTime: -999,

            // 回転初期値
            baseRotationY: leafObject.rotation.y,
            baseRotationZ: leafObject.rotation.z
        });
    }

    /**
     * フレーム更新
     */
    update(delta = 0.016) {
        if (this.activeLeaves.length === 0) return;

        this.activeLeaves = this.activeLeaves.filter(item => {
            const object = item.object;

            // 無効オブジェクトは削除
            if (!object || !object.parent) {
                return false;
            }

            item.life += delta;

            // 進行度 (0〜1)
            const t = THREE.MathUtils.clamp(
                item.life / item.duration,
                0,
                1
            );

            // イージング（減速）
            const eased = 1.0 - Math.pow(1.0 - t, 3.0);

            // 移動距離
            const travel = item.distance * eased;

            // 位置更新
            object.position
                .copy(item.startPosition)
                .addScaledVector(item.direction, travel);

            // 上下揺れ（浮遊）
            object.position.y +=
                Math.sin(t * Math.PI) * this.floatAmplitude;

            // Y回転（揺らぎ）
            object.rotation.y =
                item.baseRotationY +
                Math.sin(t * Math.PI * 2.0) * 0.35;

            // Z回転（傾き）
            object.rotation.z =
                item.baseRotationZ +
                Math.sin(t * Math.PI) * 0.22;

            // 移動中リップル
            this.spawnTrailRippleIfNeeded(item, t);

            // 終了時処理
            if (t >= 1.0) {
                this.spawnRipple(object.position, {
                    opacity: 0.16,
                    endScale: 1.45,
                    duration: 0.8
                });

                return false;
            }

            return true;
        });
    }

    /**
     * 一定間隔でリップルを発生させる
     */
    spawnTrailRippleIfNeeded(item, t) {
        if (
            item.life - item.lastRippleTime <
            this.rippleInterval
        ) {
            return;
        }

        item.lastRippleTime = item.life;

        const position = item.object.position.clone();

        this.spawnRipple(position, {
            opacity: THREE.MathUtils.lerp(0.18, 0.08, t),
            innerRadius: 0.32,
            outerRadius: 0.46,
            startScale: 0.55,
            endScale: 1.25,
            duration: 0.75,
            yOffset: 0.045
        });
    }

    /**
     * リップル生成（spawnManagerに委譲）
     */
    spawnRipple(position, options = {}) {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.spawnWaterRipple !== 'function'
        ) {
            return;
        }

        this.spawnManager.spawnWaterRipple(position, {
            color: options.color ?? 0x9ffcff,
            opacity: options.opacity ?? 0.14,
            innerRadius: options.innerRadius ?? 0.36,
            outerRadius: options.outerRadius ?? 0.52,
            startScale: options.startScale ?? 0.55,
            endScale: options.endScale ?? 1.35,
            duration: options.duration ?? 0.75,
            yOffset: options.yOffset ?? 0.045
        });
    }

    /**
     * 全リセット
     */
    clear() {
        this.activeLeaves = [];
    }
}