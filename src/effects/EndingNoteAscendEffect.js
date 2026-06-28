import * as THREE from 'three';

/**
 * ======================================================
 * EndingNoteAscendEffect
 *
 * ✅ 役割
 * ・エンディングで音符が上昇していく演出
 *
 * ✅ 挙動
 * ・ミク周辺に音符を生成
 * ・らせん＋上昇＋拡散
 * ・時間経過でフェードアウト
 *
 * ✅ ポイント
 * ・spawnManagerで既存toneモデルを使用
 * ・GPU負荷を抑えるため加算合成＋depthWriteオフ
 * ======================================================
 */
export class EndingNoteAscendEffect {

    constructor(scene, spawnManager, options = {}) {

        // --- 外部参照 ---
        this.scene = scene;
        this.spawnManager = spawnManager;

        // --- このエフェクト専用グループ ---
        this.group = new THREE.Group();
        this.group.name = 'endingNoteAscendEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        // --- 状態 ---
        this.active = false;
        this.elapsed = 0;

        // --- 設定 ---
        this.duration = options.duration ?? 7.5;
        this.count = options.count ?? 14;

        // --- 音符配列 ---
        this.notes = [];
    }


    /**
     * エフェクト開始
     */
    start(originPosition, options = {}) {

        // 前回の残骸をクリア
        this.clear();

        if (!originPosition) {
            return;
        }

        this.duration = options.duration ?? this.duration;
        this.count = options.count ?? this.count;

        // 音符を複数生成
        for (let i = 0; i < this.count; i++) {

            const note = this.createNote(originPosition, i);

            if (note) {
                this.notes.push(note);
            }
        }

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[EndingNoteAscendEffect] Started. count=${this.notes.length}`
        );
    }


    /**
     * 音符1個生成
     */
    createNote(originPosition, index) {

        // spawn不可なら終了
        if (!this.spawnManager || typeof this.spawnManager.spawn !== 'function') {
            return null;
        }

        // --- 円形ランダム配置 ---
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.6 + Math.random() * 3.5;

        const position =
            originPosition.clone().add(
                new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0.8 + Math.random() * 1.6,
                    Math.sin(angle) * radius
                )
            );

        // tone生成（既存モデル）
        const note =
            this.spawnManager.spawn(
                'tone',
                position,
                {
                    scaleMultiplier: 0.28 + Math.random() * 0.2,
                    randomRotation: true
                }
            );

        if (!note) {
            return null;
        }

        note.name = `ending_ascending_note_${index}`;

        this.group.add(note);

        // --- 色（シアン寄り） ---
        const color = new THREE.Color().setHSL(
            0.52 + Math.random() * 0.1,
            0.9,
            0.7
        );

        this.applyNoteMaterial(note, color);

        // --- 初期データ ---
        note.userData.startPosition = note.position.clone();

        // らせん位相
        note.userData.phase = Math.random() * Math.PI * 2;

        // 上昇速度
        note.userData.ascendSpeed = 7.0 + Math.random() * 5.0;

        // 横ドリフト
        note.userData.sideDrift = new THREE.Vector3(
            (Math.random() - 0.5) * 2.4,
            0,
            (Math.random() - 0.5) * 2.4
        );

        // 元スケール
        note.userData.baseScale = note.scale.clone();

        return note;
    }


    /**
     * マテリアル適用
     * 
     * ✅ ワイヤー：発光
     * ✅ メッシュ：不可視（輪郭のみ）
     */
    applyNoteMaterial(object, color) {

        object.traverse(child => {

            if (!child) return;

            // --- ワイヤーマテリアル ---
            const lineMaterial = child.userData?.lineMaterial;

            if (lineMaterial) {

                const cloned = lineMaterial.clone();

                cloned.color.copy(color);
                cloned.opacity = 0.95;
                cloned.transparent = true;
                cloned.depthWrite = false;
                cloned.blending = THREE.AdditiveBlending;
                cloned.toneMapped = false;
                cloned.needsUpdate = true;

                child.userData.lineMaterial = cloned;
            }

            // --- メッシュ本体は透明化 ---
            if (
                child.material &&
                child.isMesh &&
                !child.userData?.isWire
            ) {

                const materials =
                    Array.isArray(child.material)
                        ? child.material
                        : [child.material];

                const clonedMaterials = materials.map(material => {

                    const cloned = material.clone();

                    cloned.transparent = true;
                    cloned.opacity = 0.0;     // 完全透明
                    cloned.depthWrite = false;
                    cloned.colorWrite = false;
                    cloned.needsUpdate = true;

                    return cloned;
                });

                child.material =
                    Array.isArray(child.material)
                        ? clonedMaterials
                        : clonedMaterials[0];
            }
        });
    }


    /**
     * フレーム更新
     */
    update(delta = 0.016) {

        if (!this.active) {
            return;
        }

        this.elapsed += delta;

        // 進行率 0〜1
        const t = THREE.MathUtils.clamp(
            this.elapsed / this.duration,
            0,
            1
        );

        this.notes.forEach(note => {

            if (!note) return;

            const phase = note.userData.phase ?? 0;
            const start = note.userData.startPosition;

            const sideDrift =
                note.userData.sideDrift || new THREE.Vector3();

            const ascendSpeed =
                note.userData.ascendSpeed ?? 8;

            // --- らせん運動 ---
            const spiral = new THREE.Vector3(
                Math.cos(this.elapsed * 1.8 + phase),
                0,
                Math.sin(this.elapsed * 1.8 + phase)
            ).multiplyScalar(
                0.8 * (1.0 - t)
            );

            // --- 基準位置に戻す ---
            note.position.copy(start);

            // --- 上昇 ---
            note.position.y += ascendSpeed * this.elapsed;

            // --- 横拡散 ---
            note.position.addScaledVector(sideDrift, t);

            // --- らせん追加 ---
            note.position.add(spiral);

            // --- 回転 ---
            note.rotation.y += delta * 1.8;
            note.rotation.z += delta * 0.9;

            // --- スケール縮小 ---
            const scaleFade = THREE.MathUtils.lerp(
                1.0,
                0.15,
                THREE.MathUtils.smoothstep(t, 0.55, 1.0)
            );

            if (note.userData.baseScale) {
                note.scale
                    .copy(note.userData.baseScale)
                    .multiplyScalar(scaleFade);
            }

            // --- フェードアウト ---
            this.setOpacity(
                note,
                1.0 - THREE.MathUtils.smoothstep(t, 0.68, 1.0)
            );
        });

        // --- 終了 ---
        if (t >= 1.0) {
            this.clear();
        }
    }


    /**
     * オブジェクト全体の透明度変更
     */
    setOpacity(object, opacity) {

        object.traverse(child => {

            const materials = [];

            if (child.material) {
                if (Array.isArray(child.material)) {
                    materials.push(...child.material);
                } else {
                    materials.push(child.material);
                }
            }

            if (child.userData?.lineMaterial) {
                materials.push(child.userData.lineMaterial);
            }

            materials.forEach(material => {

                if (!material) return;

                material.transparent = true;
                material.opacity = opacity;
                material.needsUpdate = true;
            });
        });
    }


    /**
     * 完全削除（メモリ解放）
     */
    clear() {

        this.notes.forEach(note => {

            note.parent?.remove(note);

            note.traverse?.(child => {

                // --- 通常マテリアル破棄 ---
                if (child.material) {

                    const materials =
                        Array.isArray(child.material)
                            ? child.material
                            : [child.material];

                    materials.forEach(material => {
                        material.dispose?.();
                    });
                }

                // --- ラインマテリアル破棄 ---
                if (child.userData?.lineMaterial) {
                    child.userData.lineMaterial.dispose?.();
                }
            });
        });

        this.notes = [];
        this.active = false;
        this.elapsed = 0;
    }
}