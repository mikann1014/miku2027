import * as THREE from 'three';

/**
 * ======================================================
 * EndingWorldResponseEffect
 *
 * ✅ 役割
 * ・ワールド内に配置されたオブジェクトの「共鳴演出」
 *
 * ✅ 挙動
 * ・手前 → 奥に順番に発火（zソート）
 * ・スケール微振動（wave）
 * ・発光（opacity + color boost）
 * ・水面なら波紋も自動生成
 *
 * ✅ イメージ
 * 「世界が順に呼吸する / 波紋が伝播する」
 *
 * ✅ 重要
 * ・一度だけの一括演出（ループしない）
 * ======================================================
 */
export class EndingWorldResponseEffect {

    constructor(scene, spawnManager) {

        // --- 外部参照 ---
        this.scene = scene;
        this.spawnManager = spawnManager;

        // --- 状態 ---
        this.active = false;
        this.elapsed = 0;

        // --- 設定（デフォルト） ---
        this.duration = 0.55;          // 各オブジェクトの反応時間
        this.delayPerObject = 0.035;   // 1つずつズラして発火

        // --- 管理配列 ---
        this.entries = [];
    }


    /**
     * エフェクト開始
     * 
     * objects:
     * ・配置済みのワールドオブジェクト群
     */
    start(objects = [], options = {}) {

        // 前回状態クリア
        this.clear();

        if (!objects || objects.length === 0) {
            return;
        }

        // オプション適用
        this.duration = options.duration ?? 0.55;
        this.delayPerObject = options.delayPerObject ?? 0.035;

        // =========================
        // Zでソート（奥→手前 or 手前→奥）
        // =========================
        const sorted =
            [...objects].sort((a, b) => {
                return a.position.z - b.position.z;
            });

        // =========================
        // 各オブジェクトをエントリ化
        // =========================
        this.entries = sorted.map((object, index) => {

            const materials = [];

            // --- マテリアル収集 ---
            object.traverse?.(child => {

                // --- ワイヤー（発光ライン） ---
                if (child.userData?.lineMaterial) {
                    materials.push({
                        material: child.userData.lineMaterial,
                        baseOpacity: child.userData.lineMaterial.opacity ?? 1,
                        baseColor:
                            child.userData.lineMaterial.color?.clone?.()
                            || new THREE.Color(0xffffff)
                    });
                }

                // --- 通常マテリアル ---
                if (child.material) {

                    const mats =
                        Array.isArray(child.material)
                            ? child.material
                            : [child.material];

                    mats.forEach(material => {
                        if (!material) return;

                        materials.push({
                            material,
                            baseOpacity: material.opacity ?? 1,
                            baseColor:
                                material.color?.clone?.()
                                || new THREE.Color(0xffffff)
                        });
                    });
                }
            });

            // --- エントリ作成 ---
            return {
                object,
                index,

                // 発火遅延（波のズレ）
                delay: index * this.delayPerObject,

                // 元スケール保存
                baseScale: object.scale.clone(),

                materials,

                // 水波紋の二重発生防止
                rippleSpawned: false
            };
        });

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[EndingWorldResponseEffect] Started. count=${this.entries.length}`
        );
    }


    /**
     * フレーム更新
     */
    update(delta = 0.016) {

        if (!this.active) {
            return;
        }

        this.elapsed += delta;

        let allDone = true;

        this.entries.forEach(entry => {

            // === 個別の開始時間をずらす ===
            const localTime = this.elapsed - entry.delay;

            // まだ発火していない
            if (localTime < 0) {
                allDone = false;
                return;
            }

            // 進行度（0〜1）
            const t = THREE.MathUtils.clamp(
                localTime / this.duration,
                0,
                1
            );

            if (t < 1) {
                allDone = false;
            }

            // =========================
            // 波関数（ここが演出コア）
            // =========================
            const wave = Math.sin(t * Math.PI);
            // ↑ 0→1→0 の綺麗な山形波
            // → 拡大→戻る

            // =========================
            // スケール変化
            // =========================
            const scale = 1.0 + wave * 0.035;

            if (entry.object && entry.baseScale) {
                entry.object.scale
                    .copy(entry.baseScale)
                    .multiplyScalar(scale);
            }

            // =========================
            // マテリアル変化（発光＋透明度）
            // =========================
            entry.materials.forEach(item => {

                const material = item.material;
                if (!material) return;

                material.transparent = true;

                // --- 明るさ（opacity） ---
                material.opacity = THREE.MathUtils.clamp(
                    item.baseOpacity + wave * 0.28,
                    0,
                    1
                );

                // --- 色の強調 ---
                if (material.color && item.baseColor) {
                    material.color
                        .copy(item.baseColor)
                        .multiplyScalar(1.0 + wave * 0.65);
                }

                material.needsUpdate = true;
            });

            // =========================
            // 水面なら波紋生成（1回だけ）
            // =========================
            const surfaceType =
                entry.object?.userData?.surfaceType ||
                entry.object?.userData?.placementMetadata?.surfaceType;

            if (
                !entry.rippleSpawned &&
                surfaceType === 'water' &&
                this.spawnManager?.spawnWaterRipple
            ) {
                this.spawnManager.spawnWaterRipple(
                    entry.object.position
                );

                entry.rippleSpawned = true;
            }

            // =========================
            // 終了時（リセット）
            // =========================
            if (t >= 1) {

                if (entry.object && entry.baseScale) {
                    entry.object.scale.copy(entry.baseScale);
                }

                entry.materials.forEach(item => {

                    const material = item.material;
                    if (!material) return;

                    material.opacity = item.baseOpacity;

                    if (material.color && item.baseColor) {
                        material.color.copy(item.baseColor);
                    }

                    material.needsUpdate = true;
                });
            }
        });

        // =========================
        // 全完了チェック
        // =========================
        if (allDone) {
            this.active = false;

            console.log(
                '[EndingWorldResponseEffect] Completed.'
            );
        }
    }


    /**
     * 状態リセット（次回用）
     */
    clear() {
        this.active = false;
        this.elapsed = 0;
        this.entries = [];
    }
}