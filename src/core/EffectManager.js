export class EffectManager {
    constructor() {
        // 🔹 汎用エフェクト
        this.effects = [];

        // 🔹 地形パルス用
        this.landMaterialObjects = [];
    }

    // ✅ 追加（今回のエラー修正）
    addEffect(effect) {
        if (!effect) return;

        this.effects.push(effect);
    }

    // 既存
    registerLandObject(node) {
        if (!node.material) return;

        this.landMaterialObjects.push(node);
    }

    // ✅ updateも拡張
    update(environment, delta = 0.016) {

        // ---- 汎用エフェクト更新 ----
        this.effects.forEach(effect => {
            if (effect && typeof effect.update === 'function') {
                effect.update(delta);
            }
        });

        // ---- 地形エフェクト ----
        if (this.landMaterialObjects.length === 0) return;

        const rawIntensity = environment.currentBeatIntensity;
        const pulse = typeof rawIntensity === 'number' ? rawIntensity : 0.0;

        const intensity = Math.min(2.0, 0.5 + pulse);

        this.landMaterialObjects.forEach(node => {
            if (node.material?.emissiveIntensity !== undefined) {
                node.material.emissiveIntensity = intensity;
            }
        });
    }

    clear() {
        this.effects = [];
        this.landMaterialObjects = [];
    }
}
