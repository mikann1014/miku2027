/**
 * TerrainFadeController
 *
 * ・地形チャンク計算 * ・地形チャンクに対して距離ベースのフェード（透明度制御）を行う
 * ・前方 / 後方距離によるフェード制御
 * ・フェード対象（fadeTargets）への適用
 *
 * 役割：
 * 視界外の地形を自然に消すことで描画負荷を軽減しつつ、
 * シーンの奥行きと視覚的な滑らかさを保つ
 */

import * as THREE from 'three';

export class TerrainFadeController {
    constructor(options = {}) {
        /**
         * 初期化
         *
         * ・前方向・後方向それぞれのフェード開始 / 終了距離を設定
         * ・最小透明度を設定
         */

        // 前方（ミクより前）のフェード開始距離
        this.fadeFrontStart = options.fadeFrontStart ?? 430;

        // 前方フェード終了距離（完全に消える距離）
        this.fadeFrontEnd = options.fadeFrontEnd ?? 760;

        // 後方（通り過ぎた地形）のフェード開始距離
        this.fadeBackStart = options.fadeBackStart ?? 260;

        // 後方フェード終了距離
        this.fadeBackEnd = options.fadeBackEnd ?? 520;

        // 完全に消えず最低限残す透明度（0なら完全消滅）
        this.minFarOpacity = options.minFarOpacity ?? 0.0;
    }

    updateChunks(terrainChunks, mikuZ) {
        /**
         * 全チャンクのフェード更新
         *
         * 処理：
         * ・各チャンクに対してフェード値を計算
         * ・その値をチャンク内オブジェクトへ適用
         *
         * 引数：
         * ・terrainChunks : 地形チャンク配列
         * ・mikuZ         : ミクの現在Z位置
         */

        if (
            !Array.isArray(terrainChunks) ||
            terrainChunks.length === 0
        ) {
            return;
        }

        terrainChunks.forEach(chunk => {
            const fade = this.calculateFade(
                chunk,
                mikuZ
            );

            this.applyFadeToChunk(
                chunk,
                fade
            );
        });
    }

    calculateFade(chunk, mikuZ) {
        /**
         * チャンクごとのフェード係数を計算
         *
         * 処理：
         * ・ミクとの前後距離を計算
         * ・前方向と後方向で別々にフェードを評価
         * ・より強くフェードする側を採用
         *
         * 戻り値：
         * ・0.0〜1.0 のフェード係数
         */

        if (!chunk) {
            return 1.0;
        }

        // ミクから見た前方向距離
        const forwardDistance =
            mikuZ - chunk.centerZ;

        // ミクから見た後方向距離
        const backwardDistance =
            chunk.centerZ - mikuZ;

        let fade = 1.0;

        // =========================
        // 前方向フェード
        // =========================
        if (forwardDistance > this.fadeFrontStart) {
            fade = 1.0 - THREE.MathUtils.smoothstep(
                forwardDistance,
                this.fadeFrontStart,
                this.fadeFrontEnd
            );
        }

        // =========================
        // 後方向フェード
        // =========================
        if (backwardDistance > this.fadeBackStart) {
            const backFade =
                1.0 - THREE.MathUtils.smoothstep(
                    backwardDistance,
                    this.fadeBackStart,
                    this.fadeBackEnd
                );

            // 前後どちらか強くフェードする方を採用
            fade = Math.min(
                fade,
                backFade
            );
        }

        // 最小値でクランプ
        return THREE.MathUtils.clamp(
            fade,
            this.minFarOpacity,
            1.0
        );
    }

    applyFadeToChunk(chunk, fade) {
        /**
         * チャンク内オブジェクトへフェード適用
         *
         * 処理：
         * ・fadeTargets 配列の各オブジェクトに適用
         * ・baseOpacity を基準に乗算
         *
         * 注意：
         * ・material.opacity を直接更新
         * ・needsUpdate を立てて反映
         */

        if (
            !chunk ||
            !Array.isArray(chunk.fadeTargets)
        ) {
            return;
        }

        chunk.fadeTargets.forEach(target => {
            if (!target.material) {
                return;
            }

            // 元の透明度にフェード係数をかける
            target.material.opacity =
                target.baseOpacity * fade;

            // マテリアル更新
            target.material.needsUpdate = true;
        });
    }
}
