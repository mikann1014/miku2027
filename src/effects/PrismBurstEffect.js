import * as THREE from 'three';

/**
 * プリズム破片バーストエフェクト
 * ・指定位置から複数のプリズムを生成
 * ・ランダム方向へ飛散
 * ・徐々に透明になりながら消滅
 */
export class PrismBurstEffect {
    constructor(spawnManager, options = {}) {
        this.spawnManager = spawnManager;

        // 生成数
        this.count = options.count ?? 6;

        // スケール倍率
        this.scaleMultiplier =
            options.scaleMultiplier ?? 0.6;

        // ライフ減少速度
        this.lifeDecrease =
            options.lifeDecrease ?? 0.04;

        // 移動速度
        this.moveSpeed =
            options.moveSpeed ?? 0.4;

        // 回転速度
        this.rotationSpeed =
            options.rotationSpeed ?? 0.15;

        // 色（発光寄り）
        this.color =
            options.color ||
            new THREE.Color(1.5, 1.5, 2.0);
    }

    /**
     * バースト生成
     */
    spawn(position) {
        if (!this.spawnManager || !position) return;

        for (let i = 0; i < this.count; i++) {
            // ランダムなプリズムID取得
            const id = this.getRandomPrismId();

            // プリズム生成
            const prism = this.spawnManager.spawn(
                id,
                position.clone(),
                {
                    scaleMultiplier: this.scaleMultiplier
                }
            );

            if (!prism) continue;

            // 他エフェクトの影響を受けないようにフラグ
            prism.userData.ignorePulse = true;

            // 飛散方向
            const direction = this.createRandomDirection();

            // アニメーション開始
            this.animatePrism(prism, direction);
        }
    }

    /**
     * プリズムIDをランダム選択
     */
    getRandomPrismId() {
        return `Prism${Math.floor(Math.random() * 3) + 1}`;
    }

    /**
     * ランダム方向ベクトル生成
     */
    createRandomDirection() {
        return new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() * 1.2, // 上方向をやや強め
            Math.random() - 0.5
        ).normalize();
    }

    /**
     * プリズムのアニメーション制御
     * ・移動
     * ・回転
     * ・フェードアウト
     */
    animatePrism(prism, direction) {
        let life = 1.0; // ライフ（1→0）

        const animate = () => {
            // 無効なら終了
            if (!prism || !prism.parent) {
                return;
            }

            // ライフ減少
            life -= this.lifeDecrease;

            // 移動
            prism.position.addScaledVector(
                direction,
                this.moveSpeed
            );

            // 回転
            prism.rotation.x += this.rotationSpeed;
            prism.rotation.y += this.rotationSpeed;

            // マテリアル更新（透明度・色）
            this.updatePrismMaterial(prism, life);

            // 終了判定
            if (life <= 0) {
                prism.parent?.remove(prism);
                return;
            }

            // 次フレームへ
            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * プリズムのマテリアル更新
     * ・透明度フェード
     * ・色設定
     */
    updatePrismMaterial(prism, life) {
        prism.traverse(child => {
            // lineMaterialのみ対象（ワイヤー系）
            const material =
                child.userData?.lineMaterial;

            if (!material) return;

            // ライフに応じて透明度変化
            material.opacity = life;

            // 色を設定
            material.color.setRGB(
                this.color.r,
                this.color.g,
                this.color.b
            );

            material.needsUpdate = true;
        });
    }
}