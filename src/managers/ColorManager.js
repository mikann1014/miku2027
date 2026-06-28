import * as THREE from 'three';

/**
 * ColorManager
 *
 * ・パーツ名 / 親IDから色を決定する
 * ・Face用（非表示）とLine用（発光ワイヤ）マテリアルを生成
 *
 * 役割：
 * モデルの見た目カラー統一
 * サイバースタイル（線だけ見せる）
 */
export class ColorManager {

    constructor() {

        // --- カラーパレット ---
        this.colors = {

            // 花
            flower1: 0xCCFF00,
            flower2: 0x0055FF,
            flower3: 0xFF0055,

            // 草
            grass1: 0x00A88F,
            grass2: 0x228B22,
            grass3: 0x66FF66,

            // 葉
            leaves: 0x006400,

            // 汎用
            general: 0x00E5FF
        };
    }


    /**
     * パーツ名 + 親IDから色を決定
     */
    getColor(partName, parentId) {

        const name = (partName || '').toLowerCase();
        const pid = (parentId || '').toLowerCase();

        // --- 葉 ---
        if (name.includes('leaf') || name.includes('leaves')) {
            return this.colors.leaves;
        }

        // === 名前優先 ===

        if (name.includes('grass3')) return this.colors.grass3;
        if (name.includes('grass2')) return this.colors.grass2;
        if (name.includes('grass1')) return this.colors.grass1;

        if (name.includes('flower1')) return this.colors.flower1;
        if (name.includes('flower2')) return this.colors.flower2;
        if (name.includes('flower3')) return this.colors.flower3;

        // === 親ID fallback ===

        if (pid.includes('grass3')) return this.colors.grass3;
        if (pid.includes('grass2')) return this.colors.grass2;
        if (pid.includes('grass1')) return this.colors.grass1;

        if (pid.includes('flower1')) return this.colors.flower1;
        if (pid.includes('flower2')) return this.colors.flower2;
        if (pid.includes('flower3')) return this.colors.flower3;

        // --- デフォルト ---
        return this.colors.general;
    }


    /**
     * パーツ用マテリアル生成
     *
     * ・faceMaterial → 見えない当たり判定用
     * ・lineMaterial → 表示するワイヤ（発光）
     */
    getMaterialsForPart(partName, parentId) {

        const color =
            new THREE.Color(
                this.getColor(
                    partName,
                    parentId
                )
            );

        // =========================
        // Face（非表示）
        // =========================
        const faceMaterial =
            new THREE.MeshBasicMaterial({
                color,

                // 完全不可視
                transparent: true,
                opacity: 0.0,
                colorWrite: false,

                depthWrite: false,
                depthTest: true,

                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                toneMapped: false
            });

        faceMaterial.userData.isCyberInvisibleFace = true;

        // =========================
        // Line（可視ワイヤ）
        // =========================
        const lineMaterial =
            new THREE.MeshBasicMaterial({
                color,

                wireframe: true,

                transparent: true,
                opacity: 1.0,

                blending: THREE.AdditiveBlending,

                /*
                 * 重要:
                 * 地形に隠れないようにする
                 */
                depthTest: false,
                depthWrite: false,

                side: THREE.DoubleSide,
                toneMapped: false
            });

        lineMaterial.userData.isCyberLineMaterial = true;

        return {
            faceMaterial,
            lineMaterial
        };
    }
}