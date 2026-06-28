import * as THREE from 'three';

/**
 * PathChunkGenerator
 *
 * ・道 - ネオンライン追加 * ・道（Path）のチャンクを生成するクラス
 * - フェード対象登録
 *
 * 特徴：
 * 👉 無限スクロール対応（chunk単位）
 * 👉 wire + neon でサイバー感
 */
export class PathChunkGenerator {

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

        /**
         * 床ジオメトリ
         */
        const geometry = new THREE.PlaneGeometry(
            t.pathWidth,
            t.chunkLength,
            8,
            48
        );

        // XZ平面へ
        geometry.rotateX(-Math.PI / 2);

        /**
         * 床メッシュ
         */
        const path = new THREE.Mesh(
            geometry,
            t.pathMaterial.clone()
        );

        path.name = `path_chunk_${chunk.index}`;

        // 重要：Placementで使う
        path.userData.surfaceType = 'path';

        path.position.set(0, t.pathY, 0);

        // 常時描画
        path.frustumCulled = false;

        chunk.group.add(path);
        chunk.objects.push(path);

        // 配置対象
        t.landObjects.push(path);

        // フェード対象
        t.registerFadeTarget(
            chunk,
            path,
            t.pathBaseOpacity
        );

        /**
         * =========================
         * グリッド線（ワイヤ）
         * =========================
         */
        const grid = t.createWireOverlay(
            path.geometry,
            t.mainGridColor,
            t.pathGridBaseOpacity,
            THREE.NormalBlending
        );

        grid.name = `path_chunk_${chunk.index}_grid`;

        grid.userData.isWire = true;

        grid.position.copy(path.position);

        // 描画順（面より上）
        grid.renderOrder = 4;

        chunk.group.add(grid);

        // フェード対象
        t.registerFadeTarget(
            chunk,
            grid,
            t.pathGridBaseOpacity
        );

        /**
         * ネオンライン追加
         */
        this.addNeonLines(chunk);
    }


    /**
     * =========================
     * ✅ ネオンライン
     * =========================
     */
    addNeonLines(chunk) {

        const t = this.terrain;

        const half = t.chunkLength * 0.5;

        /**
         * ライン配置位置
         * - 外側（道路端）
         * - 内側（センター寄り）
         */
        const xs = [
            -t.pathWidth * 0.5,
            -0.65,
            0.65,
            t.pathWidth * 0.5
        ];

        xs.forEach((x, index) => {

            const material =
                new THREE.LineBasicMaterial({
                    color: 0x005f7a,
                    transparent: true,
                    opacity: t.pathNeonBaseOpacity,
                    blending: THREE.NormalBlending,
                    depthWrite: false,
                    depthTest: true
                });

            /**
             * 前後直線ライン
             */
            const points = [
                new THREE.Vector3(
                    x,
                    t.pathY + 0.035,
                    -half
                ),
                new THREE.Vector3(
                    x,
                    t.pathY + 0.035,
                    half
                )
            ];

            const line =
                new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints(points),
                    material
                );

            line.name =
                `path_chunk_${chunk.index}_neon_${index}`;

            line.userData.isWire = true;

            chunk.group.add(line);

            /**
             * フェード対象登録
             */
            t.registerFadeTarget(
                chunk,
                line,
                t.pathNeonBaseOpacity
            );
        });
    }
}