import * as THREE from 'three';

/**
して「波のような発光エコー」を発生させる * PlacedBloomEchoEffect
 * ・中心から距離順に発火（遅延付き）
 * ・スケールと色・透明度を一時的に変化させる
 */
export class PlacedBloomEchoEffect {

    constructor(options = {}) {

        // 現在アクティブなエコー
        this.activeEchoes = [];

        // 影響範囲
        this.radius = options.radius ?? 4.2;

        // 1つのエコーの持続時間
        this.duration = options.duration ?? 0.72;

        // スケール拡大量
        this.maxScaleBoost = options.maxScaleBoost ?? 0.36;

        // 距離に応じた遅延
        this.echoDelayPerMeter =
            options.echoDelayPerMeter ?? 0.055;

        // 色の強調倍率
        this.colorBoost =
            options.colorBoost ?? 1.9;
    }


    /**
     * エコー発火
     * centerObject を中心に、対象オブジェクトへ波を広げる
     */
    trigger(centerObject, placedObjects = []) {

        if (!centerObject) return;

        const centerPosition =
            centerObject.position.clone();

        const targets = [];

        // 対象抽出
        placedObjects.forEach(object => {
            if (!object) return;

            const metadata =
                object.userData?.placementMetadata;

            if (!metadata) return;

            // 対象IDチェック
            if (!this.isBloomableId(metadata.id)) {
                return;
            }

            const distance =
                object.position.distanceTo(centerPosition);

            // 範囲外
            if (distance > this.radius) {
                return;
            }

            targets.push({
                object,
                distance
            });
        });

        // 対象がいない場合は中心を対象にする
        if (
            targets.length === 0 &&
            this.isBloomableId(
                centerObject.userData?.placementMetadata?.id
            )
        ) {
            targets.push({
                object: centerObject,
                distance: 0
            });
        }

        // 距離順に処理
        targets
            .sort((a, b) => a.distance - b.distance)
            .forEach(target => {
                this.createEcho(
                    target.object,
                    target.distance
                );
            });
    }


    /**
     * 個別エコー生成
     */
    createEcho(object, distance) {

        if (!object) return;

        // 基準スケール保持
        const baseScale =
            object.userData.bloomEchoBaseScale
                ? object.userData.bloomEchoBaseScale.clone()
                : object.scale.clone();

        // 常に保存しておく
        object.userData.bloomEchoBaseScale =
            baseScale.clone();

        // マテリアルのスナップショット取得
        const materialSnapshots =
            this.captureLineMaterials(object);

        // エコー登録
        this.activeEchoes.push({
            object,
            baseScale,
            materialSnapshots,
            life: 0,
            delay: distance * this.echoDelayPerMeter,
            duration: this.duration
        });
    }


    /**
     * マテリアル状態の保存
     */
    captureLineMaterials(object) {

        const snapshots = [];

        object.traverse(child => {

            const material =
                child.userData?.lineMaterial ||
                child.material;

            // colorを持たないマテリアルは無視
            if (!material || !material.color) {
                return;
            }

            // 完全透明メッシュは除外
            if (
                child.isMesh &&
                !child.userData?.isWire &&
                material.opacity === 0
            ) {
                return;
            }

            snapshots.push({
                material,
                baseColor: material.color.clone(),
                baseOpacity:
                    typeof material.opacity === 'number'
                        ? material.opacity
                        : 1.0
            });
        });

        return snapshots;
    }


    /**
     * フレーム更新
     */
    update(delta = 0.016) {

        if (this.activeEchoes.length === 0) return;

        this.activeEchoes =
            this.activeEchoes.filter(echo => {

                const {
                    object,
                    baseScale,
                    materialSnapshots
                } = echo;

                if (!object) {
                    return false;
                }

                // 時間進行
                echo.life += delta;

                // 遅延中
                if (echo.life < echo.delay) {
                    return true;
                }

                // 正規化時間
                const t =
                    THREE.MathUtils.clamp(
                        (echo.life - echo.delay) /
                        echo.duration,
                        0,
                        1
                    );

                // 波形（0→1→0）
                const wave =
                    Math.sin(t * Math.PI);

                // === スケール変化 ===
                const scaleBoost =
                    1.0 + wave * this.maxScaleBoost;

                object.scale
                    .copy(baseScale)
                    .multiplyScalar(scaleBoost);

                // === マテリアル変化 ===
                materialSnapshots.forEach(snapshot => {

                    const intensity =
                        1.0 + wave * this.colorBoost;

                    // 色をブースト
                    snapshot.material.color
                        .copy(snapshot.baseColor)
                        .multiplyScalar(intensity);

                    // 透明度調整
                    snapshot.material.opacity =
                        THREE.MathUtils.clamp(
                            snapshot.baseOpacity +
                            wave * 0.45,
                            0,
                            1
                        );

                    snapshot.material.needsUpdate = true;
                });

                // === 終了処理 ===
                if (t >= 1.0) {

                    // 元に戻す
                    object.scale.copy(baseScale);

                    materialSnapshots.forEach(snapshot => {

                        snapshot.material.color.copy(
                            snapshot.baseColor
                        );

                        snapshot.material.opacity =
                            snapshot.baseOpacity;

                        snapshot.material.needsUpdate = true;
                    });

                    return false;
                }

                return true;
            });
    }


    /**
     * エコー対象か判定
     */
    isBloomableId(id) {

        if (!id) return false;

        return [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ].includes(id);
    }


    /**
     * 全エコー初期化
     */
    clear() {

        this.activeEchoes.forEach(echo => {

            if (!echo.object) return;

            // スケール復元
            echo.object.scale.copy(
                echo.baseScale
            );

            // マテリアル復元
            echo.materialSnapshots.forEach(snapshot => {

                snapshot.material.color.copy(
                    snapshot.baseColor
                );

                snapshot.material.opacity =
                    snapshot.baseOpacity;

                snapshot.material.needsUpdate = true;
            });
        });

        this.activeEchoes = [];
    }
}