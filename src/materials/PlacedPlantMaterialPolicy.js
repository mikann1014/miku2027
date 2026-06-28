import * as THREE from 'three';

/**
 * PlacedPlantMaterialPolicy
 *
 * ・配置された植物（花・草・葉）の描画ポリシー
 * ・Z-fighting / 透過順 / 深度問題を防ぐための最重要層
 *
 * 基本方針：
 *  - Face（面） → 完全不可視（depthだけ使う）
 *  - Wire（線） → 表示 + 加算合成
 */
export class PlacedPlantMaterialPolicy {

    /**
     * 植物判定
     */
    isPlantId(id, object = null) {

        const resolvedId =
            String(id || '');

        return (
            resolvedId.startsWith('flower') ||
            resolvedId.startsWith('Grass') ||
            resolvedId === 'Leaf' ||
            object?.userData?.isFlower === true ||
            object?.userData?.windReactive === true
        );
    }


    /**
     * 適用（メイン入口）
     */
    apply(root) {

        if (!root) {
            return;
        }

        root.traverse(child => {

            if (!child) {
                return;
            }

            // 常に描画（距離で消えない）
            child.frustumCulled = false;

            /**
             * Wire処理
             */
            if (
                child.userData?.isWire === true ||
                child.userData?.isCyberWire === true
            ) {
                this.applyWireMaterial(child);
                return;
            }

            /**
             * Mesh（Face）
             */
            if (
                child.isMesh &&
                child.material
            ) {
                this.applyInvisibleFaceMaterial(child);
            }
        });
    }


    /**
     * 再適用（実質 same）
     */
    restore(root) {
        this.apply(root);
    }


    /**
     * =========================
     * Wireマテリアル
     * =========================
     */
    applyWireMaterial(child) {

        // Faceより前に出す
        child.renderOrder = 8;

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

        const baseColor =
            child.userData?.baseColor;

        materials.forEach(material => {

            if (!material) {
                return;
            }

            // 色復元
            if (baseColor && material.color) {
                material.color.copy(baseColor);
            }

            material.transparent = true;
            material.opacity = 1.0;

            /*
             * 重要：
             * depthTest = true
             * → 奥にあるものは隠れる（ミクの後ろに回る）
             *
             * depthWrite = false
             * → 自分は深度を書かない（重なり破綻防止）
             */
            material.depthTest = true;
            material.depthWrite = false;
            material.depthFunc = THREE.LessEqualDepth;

            // 発光風
            material.blending = THREE.AdditiveBlending;

            material.colorWrite = true;
            material.toneMapped = false;

            material.needsUpdate = true;
        });
    }


    /**
     * =========================
     * Face（不可視）
     * =========================
     */
    applyInvisibleFaceMaterial(child) {

        // Wireの後ろ（でもdepthには影響）
        child.renderOrder = 7;

        const materials =
            Array.isArray(child.material)
                ? child.material
                : [child.material];

        materials.forEach(material => {

            if (!material) {
                return;
            }

            /*
             * Faceは一切描画しない
             * → ただし当たり判定・深度は維持
             */
            material.transparent = true;
            material.opacity = 0.0;
            material.colorWrite = false;

            material.depthWrite = false;
            material.depthTest = true;
            material.depthFunc = THREE.LessEqualDepth;

            material.blending = THREE.NormalBlending;
            material.side = THREE.DoubleSide;
            material.toneMapped = false;

            material.needsUpdate = true;
        });

        // シャドウ無効（軽量化）
        child.castShadow = false;
        child.receiveShadow = false;
    }
}
