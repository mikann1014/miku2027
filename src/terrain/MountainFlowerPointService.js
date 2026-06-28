import * as THREE from 'three';

/**
 * MountainFlowerPointService
 *
 * ・山（サイドマウンテン）上に配置するポイント群を生成するサービス
 *
 * 役割：
 * - 左右の山に花配置ポイントを生成
 * - 配置位置をローカル座標ベースで作る
 * - Raycastを使わず軽量に高さ推定
 *
 * 特徴：
 * 👉 軽量（近似計算のみ）
 * 👉 anchor（山グループ）と組み合わせて使用
 * 👉 cluster / placement の入力になる
 */
export class MountainFlowerPointService {

    constructor(options = {}) {

        // デフォルト生成数
        this.defaultCount =
            options.defaultCount ?? 360;

        // 前方距離（ミクの進行方向）
        this.minForwardDistance =
            options.minForwardDistance ?? 55;

        this.maxForwardDistance =
            options.maxForwardDistance ?? 620;

        // 横方向距離（山の外側）
        this.minSideDistance =
            options.minSideDistance ?? 46;

        this.maxSideDistance =
            options.maxSideDistance ?? 165;
    }


    /**
     * =========================
     * ✅ 左右山のバッチ生成
     * =========================
     */
    createSideMountainBatches({
        leftMountainGroup,
        rightMountainGroup,
        count = this.defaultCount
    } = {}) {

        const batches = [];

        // 左右で分割
        const halfCount =
            Math.floor(count / 2);

        /**
         * 左側
         */
        if (leftMountainGroup) {

            batches.push({
                name: 'left_mountain_flower_points',
                anchor: leftMountainGroup,
                points: this.createPointsForSide({
                    side: -1,
                    count: halfCount
                })
            });
        }

        /**
         * 右側
         */
        if (rightMountainGroup) {

            batches.push({
                name: 'right_mountain_flower_points',
                anchor: rightMountainGroup,
                points: this.createPointsForSide({
                    side: 1,
                    count: count - halfCount
                })
            });
        }

        /**
         * 無効データ除外
         */
        return batches.filter(batch => {
            return (
                batch.anchor &&
                Array.isArray(batch.points) &&
                batch.points.length > 0
            );
        });
    }


    /**
     * =========================
     * ✅ 片側のポイント生成
     * =========================
     */
    createPointsForSide({
        side,
        count
    }) {

        const points = [];

        for (let i = 0; i < count; i++) {

            /**
             * 中心からの横距離
             */
            const distanceFromCenter =
                THREE.MathUtils.lerp(
                    this.minSideDistance,
                    this.maxSideDistance,
                    Math.random()
                );

            /*
             * 山Groupのローカル座標。
             * group.position.z = mikuZ なので、
             * ローカルzは「ミクより前方方向」を負の値で作る。
             */
            const x =
                side * distanceFromCenter;

            const z =
                -THREE.MathUtils.lerp(
                    this.minForwardDistance,
                    this.maxForwardDistance,
                    Math.random()
                );

            /**
             * 高さ推定（重要）
             * → Raycastなしで山表面に合わせる
             */
            const y =
                this.estimateSideMountainY(
                    x,
                    z
                );

            points.push(
                new THREE.Vector3(
                    x,
                    y,
                    z
                )
            );
        }

        return points;
    }


    /**
     * =========================
     * ✅ 山の高さ近似
     * =========================
     */
    estimateSideMountainY(x, z) {

        /*
         * SideMountainGenerator に近い形状を再現する簡易式
         * （完全一致ではないが軽量）
         */

        /**
         * 外側に行くほど高くなる
         */
        const normalizedSide =
            THREE.MathUtils.clamp(
                (Math.abs(x) - 38) / 150,
                0,
                1
            );

        const ridgeFactor =
            Math.pow(
                normalizedSide,
                0.84
            );

        /**
         * 波形（ランダム起伏）
         */
        const wave =
            Math.sin(z * 0.024 + x * 0.038) * 0.8 +
            Math.sin(z * 0.011 - x * 0.077) * 0.45;

        /*
         * 山面より少し上に見えるよう高めに調整
         */
        return (
            1.4 +
            ridgeFactor * 10.5 +
            Math.abs(wave) +
            Math.random() * 1.45
        );
    }
}
``