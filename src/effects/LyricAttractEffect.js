import * as THREE from 'three';

/**
 * 歌詞（フレーズ）を中心に吸い寄せるエフェクト
 * ・螺旋軌道で中心へ収束
 * ・徐々に縮小しながらフェードアウト
 */
export class LyricAttractEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        // エフェクト用グループ
        this.group = new THREE.Group();
        this.group.name = 'lyricAttractEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        // 状態管理
        this.active = false;
        this.completed = false;

        // 経過時間
        this.elapsed = 0;

        // 全体時間
        this.duration = options.duration ?? 1.15;

        // 吸引先（中心位置）
        this.targetPosition = new THREE.Vector3();

        // 管理対象フレーズ
        this.phrases = [];

        // 完了時コールバック
        this.onCompleted = null;
    }

    /**
     * エフェクト開始
     * @param {Array} phraseObjects フレーズオブジェクト配列
     * @param {THREE.Vector3} targetPosition 集合位置
     * @param {Function|null} onCompleted 完了時コールバック
     */
    start(phraseObjects = [], targetPosition, onCompleted = null) {
        this.active = true;
        this.completed = false;
        this.elapsed = 0;

        if (targetPosition) {
            this.targetPosition.copy(targetPosition);
        }

        this.onCompleted =
            typeof onCompleted === 'function'
                ? onCompleted
                : null;

        // フレーズ初期化とパラメータ計算
        this.phrases = phraseObjects
            .filter(phrase => phrase?.mesh)
            .map((phrase, index) => {
                // 外部制御モードに移行
                phrase.externalControlled = true;
                phrase.freezeScatterForAttract = true;
                phrase.noScatter = true;
                phrase.isDissolving = false;
                phrase.hasScattered = true;

                const mesh = phrase.mesh;

                const startPosition = mesh.position.clone();
                const offset = startPosition.clone().sub(this.targetPosition);

                // 開始時の半径（XZ距離）
                const startRadius = Math.max(
                    0.8,
                    Math.sqrt(offset.x * offset.x + offset.z * offset.z)
                );

                // 開始角度
                const startAngle = Math.atan2(offset.z, offset.x);

                return {
                    phrase,
                    mesh,
                    material: phrase.material,

                    // 初期状態
                    startPosition,
                    startScale: mesh.scale.clone(),
                    startOffset: offset,
                    startRadius,
                    startAngle,
                    startY: offset.y,

                    // 個別ランダム性
                    seed: Math.random() * Math.PI * 2,

                    index
                };
            });

        console.log(
            `[LyricAttractEffect] Chorus spiral gather started. phrases=${this.phrases.length}`
        );
    }

    /**
     * フレーム更新
     */
    update(delta = 0.016, camera = null) {
        if (!this.active) return false;

        this.elapsed += delta;

        // 進行度（0〜1）
        const t = THREE.MathUtils.clamp(
            this.elapsed / this.duration,
            0,
            1
        );

        // 強めのイージング（早く中心へ吸引）
        const moveEase = 1.0 - Math.pow(1.0 - t, 3.2);

        // フレーズ更新
        this.updatePhrases(moveEase, t, camera);

        if (t >= 1.0) {
            this.finishAndHide();

            console.log(
                '[LyricAttractEffect] Chorus spiral gather completed.'
            );

            if (this.onCompleted) {
                this.onCompleted(this.targetPosition.clone());
            }

            return true;
        }

        return false;
    }

    /**
     * 各フレーズの位置・スケール・透明度を更新
     */
    updatePhrases(moveEase, t, camera) {
        this.phrases.forEach(entry => {
            const {
                mesh,
                material,
                startScale,
                startRadius,
                startAngle,
                startY,
                seed,
                index
            } = entry;

            if (!mesh) return;

            // カメラビルボード（常に正面を向く）
            if (camera) {
                mesh.quaternion.copy(camera.quaternion);
            }

            // 回転数（インデックスごとに微妙に変化）
            const turns = 1.65 + index * 0.08;

            // 現在角度（螺旋）
            const angle =
                startAngle +
                t * Math.PI * 2.0 * turns +
                seed * 0.18;

            // 半径縮小
            const radius = THREE.MathUtils.lerp(
                startRadius,
                0.04,
                moveEase
            );

            // 高さ変化（揺らぎ付き）
            const heightOffset =
                THREE.MathUtils.lerp(startY, 0.0, moveEase) +
                Math.sin(t * Math.PI * 2.0 + seed) *
                0.42 *
                (1.0 - moveEase);

            // 目標座標計算
            const target = this.targetPosition.clone();

            target.x += Math.cos(angle) * radius;
            target.z += Math.sin(angle) * radius;
            target.y += heightOffset;

            mesh.position.copy(target);

            // スケール縮小
            const scale = THREE.MathUtils.lerp(
                1.0,
                0.08,
                moveEase
            );

            mesh.scale
                .copy(startScale)
                .multiplyScalar(scale);

            // フェードアウト
            if (material) {
                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.46,
                        0.74
                    );

                material.opacity = 0.95 * fade;
                material.transparent = true;
                material.needsUpdate = true;
            }
        });
    }

    /**
     * 完了処理（完全収束＋非表示化）
     */
    finishAndHide() {
        this.phrases.forEach(entry => {
            const { mesh, material, startScale } = entry;

            if (mesh) {
                mesh.position.copy(this.targetPosition);

                mesh.scale
                    .copy(startScale)
                    .multiplyScalar(0.04);
            }

            if (material) {
                material.opacity = 0.0;
                material.transparent = true;
                material.needsUpdate = true;
            }

            // 状態維持（外部制御）
            if (entry.phrase) {
                entry.phrase.externalControlled = true;
                entry.phrase.noScatter = true;
                entry.phrase.isDissolving = false;
            }
        });

        this.active = false;
        this.completed = true;
        this.elapsed = this.duration;
    }

    /**
     * 強制リセット
     */
    clear() {
        this.active = false;
        this.completed = false;
        this.elapsed = 0;

        this.phrases.forEach(entry => {
            if (entry.phrase) {
                entry.phrase.externalControlled = false;
            }
        });

        this.phrases = [];
    }
}