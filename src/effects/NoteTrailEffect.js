import * as THREE from 'three';

/**
 * 音符トレイルエフェクト
 * ・指定オブジェクトから音符パーティクルを連続生成
 * ・上方向に漂いながらフェードアウト
 */
export class NoteTrailEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        // エフェクト描画用グループ
        this.group = new THREE.Group();
        this.group.name = 'noteTrailEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        // 有効フラグ
        this.enabled = false;

        // 発生源となるオブジェクト
        this.sources = [];

        // 管理中トレイル
        this.trails = [];

        // パーティクル生成間隔
        this.spawnInterval =
            options.spawnInterval ?? 0.055;

        this.elapsedSinceSpawn = 0;

        // 寿命
        this.lifeDuration =
            options.lifeDuration ?? 0.9;

        // 基本サイズ
        this.baseSize =
            options.baseSize ?? 0.12; // 少し大きく

        // 色
        this.color =
            new THREE.Color(
                options.color ?? 0x9ffcff
            );

        // 音符テクスチャを一度だけ生成
        this.texture = this.createNoteTexture(this.color);
    }

    /**
     * トレイル発生源の設定
     */
    setSources(objects = []) {
        this.sources =
            objects.filter(object => !!object);
    }

    /**
     * エフェクト開始
     */
    start(objects = []) {
        this.setSources(objects);
        this.enabled = true;
        this.elapsedSinceSpawn = 0;

        console.log(
            `[NoteTrailEffect] Started. sources=${this.sources.length}`
        );
    }

    /**
     * エフェクト停止
     */
    stop() {
        this.enabled = false;
    }

    /**
     * フレーム更新
     */
    update(delta = 0.016) {
        // 有効時のみ生成処理
        if (this.enabled) {
            this.elapsedSinceSpawn += delta;

            if (
                this.elapsedSinceSpawn >= this.spawnInterval
            ) {
                this.elapsedSinceSpawn = 0;
                this.spawnTrailParticles();
            }
        }

        // 常に既存パーティクル更新
        this.updateTrails(delta);
    }

    /**
     * 音符パーティクル生成
     */
    spawnTrailParticles() {
        this.sources.forEach(source => {
            if (!source || !source.parent) {
                return;
            }

            // 音符描画用プレーン
            const geometry =
                new THREE.PlaneGeometry(
                    this.baseSize,
                    this.baseSize
                );

            const material =
                new THREE.MeshBasicMaterial({
                    map: this.texture,
                    transparent: true,
                    opacity: 0.55,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    toneMapped: false
                });

            const particle =
                new THREE.Mesh(
                    geometry,
                    material
                );

            // ワールド座標取得
            const worldPosition =
                new THREE.Vector3();

            source.getWorldPosition(worldPosition);

            particle.position.copy(worldPosition);

            // ライフ設定
            particle.userData.life = 0;

            particle.userData.duration =
                this.lifeDuration *
                THREE.MathUtils.lerp(
                    0.75,
                    1.25,
                    Math.random()
                );

            // 速度（ふわっと上昇）
            particle.userData.velocity =
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    0.025 + Math.random() * 0.02,
                    (Math.random() - 0.5) * 0.02
                );

            // 初期スケール保存
            particle.userData.baseScale =
                particle.scale.clone();

            this.group.add(particle);

            // 管理配列へ登録
            this.trails.push({
                particle,
                geometry,
                material
            });
        });
    }

    /**
     * 音符テクスチャ生成（Canvas）
     */
    createNoteTexture(color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 128;
        canvas.height = 128;

        const hex = `#${color.getHexString()}`;

        ctx.clearRect(0, 0, 128, 128);

        ctx.fillStyle = hex;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = hex;
        ctx.shadowBlur = 12;

        // 音符：丸部分
        ctx.beginPath();
        ctx.arc(48, 88, 18, 0, Math.PI * 2);
        ctx.fill();

        // 音符：棒
        ctx.fillRect(60, 24, 8, 64);

        // 音符：フラッグ部分
        ctx.beginPath();
        ctx.moveTo(68, 24);
        ctx.quadraticCurveTo(110, 40, 78, 60);
        ctx.lineTo(68, 60);
        ctx.fill();

        const texture =
            new THREE.CanvasTexture(canvas);

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    /**
     * トレイル更新
     */
    updateTrails(delta) {
        if (this.trails.length === 0) {
            return;
        }

        this.trails =
            this.trails.filter(entry => {
                const particle =
                    entry.particle;

                if (!particle) {
                    return false;
                }

                // ライフ進行
                particle.userData.life += delta;

                const duration =
                    particle.userData.duration ??
                    this.lifeDuration;

                const t =
                    THREE.MathUtils.clamp(
                        particle.userData.life / duration,
                        0,
                        1
                    );

                // 移動
                if (particle.userData.velocity) {
                    particle.position.addScaledVector(
                        particle.userData.velocity,
                        delta * 60
                    );
                }

                // 回転（浮遊演出）
                particle.rotation.z += 0.05;

                // フェードアウト
                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.15,
                        1.0
                    );

                entry.material.opacity =
                    0.55 * fade;

                // スケール縮小
                const scale =
                    THREE.MathUtils.lerp(
                        1.0,
                        0.18,
                        THREE.MathUtils.smoothstep(
                            t,
                            0.25,
                            1.0
                        )
                    );

                if (particle.userData.baseScale) {
                    particle.scale
                        .copy(
                            particle.userData.baseScale
                        )
                        .multiplyScalar(scale);
                }

                entry.material.needsUpdate = true;

                // 寿命終了で削除
                if (t >= 1.0) {
                    this.disposeTrail(entry);
                    return false;
                }

                return true;
            });
    }

    /**
     * 単体トレイル破棄
     */
    disposeTrail(entry) {
        entry.particle?.parent?.remove(
            entry.particle
        );

        entry.geometry?.dispose?.();
        entry.material?.dispose?.();
    }

    /**
     * 全削除
     */
    clear() {
        this.trails.forEach(entry => {
            this.disposeTrail(entry);
        });

        this.trails = [];
        this.sources = [];
        this.enabled = false;
        this.elapsedSinceSpawn = 0;
    }
}