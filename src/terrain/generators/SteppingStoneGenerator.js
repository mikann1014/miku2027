import * as THREE from 'three';

/**
 * SteppingStoneGenerator
 *
 * ・水面に配置される踏み石（ステッピングストーン）を生成
 *
 * 役割：
 * - 道の横にジャンプ可能な足場を配置
 * - 視覚的なバリエーション追加
 * - 水面エリアのアクセント
 *
 * 特徴：
 * 👉 疑似ランダム配置（seedベース）
 * 👉 左右交互に配置
 * 👉 微妙に形・サイズが揺れる
 */
export class SteppingStoneGenerator {

    constructor(terrain) {
        this.terrain = terrain;
    }


    /**
     * =========================
     * ✅ チャンク生成
     * =========================
     */
    create(chunk) {

        const t = this.terrain;

        // 1チャンクあたりの石数
        const count = 5;

        // seed（チャンクごとに変化）
        const seed = chunk.index * 3.71;

        for (let i = 0; i < count; i++) {

            /**
             * 0〜1の進行率（前後位置用）
             */
            const progress = i / Math.max(count - 1, 1);

            /**
             * 左右交互配置
             */
            const side = i % 2 === 0 ? -1 : 1;

            /**
             * X位置（道から少し外側）
             * sinで左右に揺らす
             */
            const x =
                side *
                (
                    13 +
                    Math.sin(seed + i * 1.2) * 4
                );

            /**
             * Z位置（チャンク内に均等配置）
             */
            const z =
                THREE.MathUtils.lerp(
                    -t.chunkLength * 0.36,
                    t.chunkLength * 0.36,
                    progress
                );

            /**
             * 半径（微妙に変化）
             */
            const radius =
                1.9 + Math.sin(seed + i * 0.8) * 0.28;

            /**
             * 円柱ジオメトリ（少し潰した形）
             */
            const geometry =
                new THREE.CylinderGeometry(
                    radius,
                    radius * 0.92,
                    0.16,
                    18
                );

            /**
             * マテリアル（暗め）
             */
            const material =
                new THREE.MeshBasicMaterial({
                    color: 0x0c1717,
                    transparent: true,
                    opacity: t.stoneBaseOpacity,
                    depthWrite: true,
                    depthTest: true,
                    side: THREE.DoubleSide,
                    toneMapped: false
                });

            /**
             * 石メッシュ
             */
            const stone =
                new THREE.Mesh(
                    geometry,
                    material
                );

            stone.name =
                `ground_stepping_stone_chunk_${chunk.index}_${i}`;

            /**
             * surfaceType = ground（重要）
             * → Placement可能になる
             */
            stone.userData.surfaceType = 'ground';

            /**
             * 水面より少し上
             */
            stone.position.set(
                x,
                t.waterY + 0.1,
                z
            );

            // 常時描画
            stone.frustumCulled = false;

            chunk.group.add(stone);
            chunk.objects.push(stone);

            // 配置対象に登録
            t.landObjects.push(stone);

            /**
             * フェード対象登録
             */
            t.registerFadeTarget(
                chunk,
                stone,
                t.stoneBaseOpacity
            );

            /**
             * =========================
             * ワイヤオーバーレイ
             * =========================
             */
            const wire =
                t.createWireOverlay(
                    stone.geometry,
                    0x776655,
                    t.stoneWireBaseOpacity,
                    THREE.NormalBlending
                );

            wire.name = `${stone.name}_wire`;

            wire.userData.isWire = true;

            wire.position.copy(stone.position);
            wire.rotation.copy(stone.rotation);

            chunk.group.add(wire);

            t.registerFadeTarget(
                chunk,
                wire,
                t.stoneWireBaseOpacity
            );
        }
    }
}