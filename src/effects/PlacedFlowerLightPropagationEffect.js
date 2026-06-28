import * as THREE from 'three';

/**
 * PlacedFlowerLightPropagationEffect
 *
 * ・オブジェクト群に対して「光の伝播」演出を行う
 * ・index順に遅延しながら波（sin）で発光が広がる
 * ・color / emissive / opacity を一時的に強調する
 */
export class PlacedFlowerLightPropagationEffect {

    constructor(options = {}) {

        // --- 状態 ---
        this.active = false;
        this.elapsed = 0;

        // エフェクト持続時間
        this.duration =
            options.duration ?? 5.2;

        // オブジェクト間の遅延
        this.delayPerObject =
            options.delayPerObject ?? 0.14;

        // 管理オブジェクト
        this.entries = [];
    }


    /**
     * エフェクト開始
     */
    start(objects = [], options = {}) {

        this.clear();

        // パラメータ上書き
        this.duration =
            options.duration ?? this.duration;

        this.delayPerObject =
            options.delayPerObject ?? this.delayPerObject;

        // 対象生成
        this.entries =
            objects
                .filter(object => !!object)
                .map((object, index) => {
                    return {
                        object,
                        index,

                        // マテリアルの初期状態を保存
                        materialSnapshots:
                            this.captureMaterials(object)
                    };
                });

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[PlacedFlowerLightPropagationEffect] Started. targets=${this.entries.length}`
        );
    }


    /**
     * マテリアル状態のスナップショット取得
     */
    captureMaterials(object) {

        const snapshots = [];
        const seen = new Set(); // 同一マテリアル重複防止

        object.traverse(child => {

            const materials = [];

            // --- 通常マテリアル ---
            if (child.material) {
                if (Array.isArray(child.material)) {
                    materials.push(...child.material);
                } else {
                    materials.push(child.material);
                }
            }

            // --- ラインマテリアル ---
            if (child.userData?.lineMaterial) {
                materials.push(child.userData.lineMaterial);
            }

            materials.forEach(material => {

                if (!material || seen.has(material)) {
                    return;
                }

                seen.add(material);

                snapshots.push({

                    material,

                    // 色
                    baseColor: material.color
                        ? material.color.clone()
                        : null,

                    // 透明度
                    baseOpacity:
                        typeof material.opacity === 'number'
                            ? material.opacity
                            : 1.0,

                    // エミッシブ色
                    baseEmissive:
                        material.emissive
                            ? material.emissive.clone()
                            : null,

                    // エミッシブ強度
                    baseEmissiveIntensity:
                        typeof material.emissiveIntensity === 'number'
                            ? material.emissiveIntensity
                            : 0.0
                });
            });
        });

        return snapshots;
    }


    /**
     * フレーム更新
     */
    update(delta = 0.016) {

        if (!this.active) {
            return;
        }

        this.elapsed += delta;

        let allFinished = true;

        this.entries.forEach(entry => {

            // 個別時間（遅延込み）
            const local =
                this.elapsed -
                entry.index * this.delayPerObject;

            // 正規化進行
            const t =
                THREE.MathUtils.clamp(
                    local / this.duration,
                    0,
                    1
                );

            if (t < 1.0) {
                allFinished = false;
            }

            // 波（0→1→0）
            const wave =
                local <= 0
                    ? 0
                    : Math.sin(t * Math.PI);

            // --- マテリアル更新 ---
            entry.materialSnapshots.forEach(snapshot => {

                const material =
                    snapshot.material;

                if (!material) {
                    return;
                }

                // 強度係数
                const boost =
                    1.0 + wave * 1.9;

                // === カラー強調 ===
                if (
                    material.color &&
                    snapshot.baseColor
                ) {
                    material.color
                        .copy(snapshot.baseColor)
                        .multiplyScalar(boost);
                }

                // === エミッシブ強調 ===
                if (
                    material.emissive &&
                    snapshot.baseEmissive
                ) {
                    material.emissive
                        .copy(snapshot.baseEmissive)
                        .multiplyScalar(1.0 + wave * 2.2);

                    material.emissiveIntensity =
                        snapshot.baseEmissiveIntensity +
                        wave * 1.4;
                }

                // === 透明度 ===
                material.opacity =
                    THREE.MathUtils.clamp(
                        snapshot.baseOpacity +
                        wave * 0.25,
                        0,
                        1
                    );

                material.transparent = true;
                material.needsUpdate = true;
            });
        });

        // 全終了チェック
        if (allFinished) {
            this.finish();
        }
    }


    /**
     * 完了処理（元状態に戻す）
     */
    finish() {

        this.entries.forEach(entry => {

            entry.materialSnapshots.forEach(snapshot => {

                const material =
                    snapshot.material;

                if (!material) {
                    return;
                }

                // === 色戻す ===
                if (
                    material.color &&
                    snapshot.baseColor
                ) {
                    material.color.copy(
                        snapshot.baseColor
                    );
                }

                // === エミッシブ戻す ===
                if (
                    material.emissive &&
                    snapshot.baseEmissive
                ) {
                    material.emissive.copy(
                        snapshot.baseEmissive
                    );

                    material.emissiveIntensity =
                        snapshot.baseEmissiveIntensity;
                }

                // === 透明度戻す ===
                material.opacity =
                    snapshot.baseOpacity;

                material.needsUpdate = true;
            });
        });

        this.clear();

        console.log(
            '[PlacedFlowerLightPropagationEffect] Completed.'
        );
    }


    /**
     * リセット
     */
    clear() {

        this.active = false;
        this.elapsed = 0;
        this.entries = [];
    }
}