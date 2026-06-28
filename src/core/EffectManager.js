/**
 * EffectManager
 * 汎用エフェクトと地形エミッシブ制御を管理するクラス
 */
export class EffectManager {
    constructor() {
        // 汎用エフェクト配列
        this.effects = [];

        // 地形エミッシブ制御対象
        this.landMaterialObjects = [];
    }

    /**
     * エフェクトを登録する
     */
    addEffect(effect) {
        if (!effect) return;

        this.effects.push(effect);
    }

    /**
     * 地形オブジェクトを登録する（エミッシブ制御用）
     */
    registerLandObject(node) {
        if (!node.material) return;

        this.landMaterialObjects.push(node);
    }

    /**
     * エフェクト更新処理
     * @param {Object} environment
     * @param {number} delta
     */
    update(environment, delta = 0.016) {
        // ---- 汎用エフェクト更新 ----
        this.effects.forEach(effect => {
            if (effect && typeof effect.update === 'function') {
                effect.update(delta);
            }
        });

        // ---- 地形エフェクト ----
        if (this.landMaterialObjects.length === 0) return;

        // ビート強度を取得
        const rawIntensity = environment.currentBeatIntensity;
        const pulse = typeof rawIntensity === 'number' ? rawIntensity : 0.0;

        // エミッシブ強度を計算
        const intensity = Math.min(2.0, 0.5 + pulse);

        // 各マテリアルへ反映
        this.landMaterialObjects.forEach(node => {
            if (node.material?.emissiveIntensity !== undefined) {
                node.material.emissiveIntensity = intensity;
            }
        });
    }

    /**
     * 全データを初期化
     */
    clear() {
        this.effects = [];
        this.landMaterialObjects = [];
    }
}