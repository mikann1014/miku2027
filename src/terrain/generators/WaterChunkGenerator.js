/**
 * WaterChunkGenerator
 *
 * ・チャンク単位でワイヤグリッドを重ねて視覚化 * ・チャンク単位で水面（プレイフィールド）を生成する
 *
 * 主な機能：
 * ・水面メッシュの生成と配置
 * ・ワイヤグリッドのオーバーレイ生成
 * ・クリック判定対象（landObjects）として登録
 * ・フェード対象として管理システムに登録
 *
 * 役割：
 * シーンの基盤となる「水面レイヤー」を提供し、
 * 他オブジェクトの配置・判定・視覚演出の土台となる
 */

import * as THREE from 'three';

export class WaterChunkGenerator {
    constructor(terrain) {
        /**
         * 初期化
         *
         * ・Terrainへの参照を保持
         * ・サイズ・マテリアル・登録処理に使用
         */

        this.terrain = terrain;
    }

    create(chunk) {
        /**
         * 単一チャンクの水面を生成
         *
         * 処理内容：
         * ・PlaneGeometryで水面を生成
         * ・XZ平面に回転配置
         * ・Mesh + Grid（ワイヤ）を追加
         * ・描画順・フェード・判定対象として登録
         */

        const t = this.terrain;

        // =========================
        // 水面ジオメトリ
        // =========================
        const geometry = new THREE.PlaneGeometry(
            t.waterWidth,   // 横幅
            t.chunkLength,  // 奥行き（チャンク長）
            48,             // X分割数
            48              // Z分割数
        );

        // XY → XZ平面へ変換（水平面にする）
        geometry.rotateX(-Math.PI / 2);

        const water = new THREE.Mesh(
            geometry,
            t.waterMaterial.clone()
        );

        water.name = `water_chunk_${chunk.index}`;

        // サーフェスタイプ（水面）
        water.userData.surfaceType = 'water';

        // ワールド位置
        water.position.set(0, t.waterY, 0);

        // 描画順（かなり奥に描画する）
        water.renderOrder = -20;

        // 常に描画（消えないように）
        water.frustumCulled = false;

        // =========================
        // 登録処理
        // =========================
        chunk.group.add(water);
        chunk.objects.push(water);

        // SurfacePicker / PlacementRules 用
        t.landObjects.push(water);

        // フェード対象として登録
        t.registerFadeTarget(
            chunk,
            water,
            t.waterBaseOpacity
        );

        // =========================
        // ワイヤグリッド
        // =========================
        const grid = t.createWireOverlay(
            water.geometry,
            t.waterGridColor,
            t.waterGridBaseOpacity,
            THREE.NormalBlending
        );

        grid.name = `water_chunk_${chunk.index}_grid`;

        grid.userData.isWire = true;

        // Meshと同じ位置
        grid.position.copy(water.position);

        // 水面より少し前に描画
        grid.renderOrder = -19;

        chunk.group.add(grid);

        // グリッドもフェード対象
        t.registerFadeTarget(
            chunk,
            grid,
            t.waterGridBaseOpacity
        );
    }
}
