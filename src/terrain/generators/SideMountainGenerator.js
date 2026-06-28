/**
 * SideMountainGenerator
 *
 * ・ステージ左右にの生成 * ・ステージ左右に連続する「側面山地形」を生成する
 * ・X方向（内→外）に応じた傾斜形状の制御
 * ・ノイズによる自然な凹凸の付与
 * ・ワイヤオーバーレイ生成
 * ・配置・クリック対象として登録
 *
 * 役割：
 * プレイヤーの進行路両側に「囲い＋背景」となる山を生成し、
 * 空間のスケール感と没入感を強化する
 */

import * as THREE from 'three';

export class SideMountainGenerator {
    constructor(terrain) {
        /**
         * 初期化
         *
         * ・Terrain参照を保持（サイズ・設定・登録処理で使用）
         */

        this.terrain = terrain;
    }

    create(side) {
        /**
         * 指定側（left / right）の山帯を生成
         *
         * 処理：
         * ・内側と外側のX範囲を決定
         * ・広いグリッド地形を生成
         * ・Mesh + Wire を生成してグループ化
         * ・配置対象として登録
         */

        const t = this.terrain;

        const group =
            new THREE.Group();

        group.name =
            `ground_${side}_mountains_follow_group`;

        const isLeft =
            side === 'left';

        // =========================
        // 山の横方向範囲
        // =========================

        // 内側（プレイヤー寄り）
        const xInner =
            isLeft
                ? -t.halfWaterWidth + 22
                : t.halfWaterWidth - 22;

        // 外側（遠景側）
        const xOuter =
            isLeft
                ? -t.halfWaterWidth - 58
                : t.halfWaterWidth + 58;

        // 地形ジオメトリ生成
        const geometry =
            this.createGeometry({
                xMin: Math.min(xInner, xOuter),
                xMax: Math.max(xInner, xOuter),
                zMin: -t.sideMountainLength * 0.5,
                zMax: t.sideMountainLength * 0.5,
                segmentX: 24,
                segmentZ: 260,
                side
            });

        // 見た目用マテリアル（暗いベース）
        const material =
            new THREE.MeshBasicMaterial({
                color: 0x050f0d,
                transparent: true,
                opacity: 0.88,

                depthWrite: false,
                depthTest: true,

                side: THREE.DoubleSide,
                toneMapped: false
            });

        const mountain =
            new THREE.Mesh(
                geometry,
                material
            );

        mountain.name =
            `ground_${side}_mountains`;

        /*
         * 重要:
         * groundではなくmountain扱い。
         * PlacementRulesや判定系で使用される。
         */
        mountain.userData.surfaceType = 'mountain';
        mountain.userData.isMountainSurface = true;

        // 移動地形アンカーとして扱う（スクロール等で使用）
        mountain.userData.isMovingTerrainAnchor = true;

        // 常に描画（地形なので消さない）
        mountain.frustumCulled = false;

        group.add(mountain);

        /*
         * 重要:
         * クリック配置対象として登録。
         * SurfacePickerなどの判定対象になる。
         */
        if (Array.isArray(t.landObjects)) {
            t.landObjects.push(mountain);
        }

        // =========================
        // ワイヤオーバーレイ
        // =========================
        const wire =
            t.createWireOverlay(
                mountain.geometry,
                0x00664d,
                0.26,
                THREE.NormalBlending
            );

        wire.name =
            `ground_${side}_mountains_wire`;

        wire.userData.isWire = true;

        // ワイヤも独自surfaceTypeを持つ
        wire.userData.surfaceType = 'mountainWire';

        group.add(wire);

        // Terrainのルートへ追加
        t.group.add(group);

        return group;
    }

    createGeometry({
        xMin,
        xMax,
        zMin,
        zMax,
        segmentX,
        segmentZ,
        side
    }) {
        /**
         * 山地形メッシュを生成
         *
         * 構造：
         * ・XZグリッドベースの頂点生成
         * ・各頂点の高さを「形状関数 × ノイズ」で決定
         *
         * 特徴：
         * ・横方向（X）に応じた斜面形成
         * ・Z方向に伸びる連続地形
         */

        const t = this.terrain;

        const vertices = [];
        const indices = [];

        // =========================
        // 頂点生成（グリッド）
        // =========================
        for (let iz = 0; iz <= segmentZ; iz++) {
            const vz = iz / segmentZ;

            const z =
                THREE.MathUtils.lerp(zMax, zMin, vz);

            for (let ix = 0; ix <= segmentX; ix++) {
                const vx = ix / segmentX;

                const x =
                    THREE.MathUtils.lerp(xMin, xMax, vx);

                // 横方向の形状（斜面の強さ）
                const edgeShape =
                    this.getShape(vx, side);

                // ノイズ（細かな凹凸）
                const ridge =
                    this.noise(x, z, side);

                // 最終高さ
                const y =
                    t.sideMountainBaseY +
                    edgeShape *
                    ridge *
                    t.sideMountainHeight;

                vertices.push(x, y, z);
            }
        }

        // =========================
        // インデックス生成（面構築）
        // =========================
        for (let iz = 0; iz < segmentZ; iz++) {
            for (let ix = 0; ix < segmentX; ix++) {
                const a =
                    iz * (segmentX + 1) + ix;

                const b = a + 1;
                const c = a + segmentX + 1;
                const d = c + 1;

                // 四角を2つの三角形に分割
                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
                vertices,
                3
            )
        );

        geometry.setIndex(indices);

        // 法線計算（陰影・ライティング）
        geometry.computeVertexNormals();

        return geometry;
    }

    getShape(vx, side) {
        /**
         * 横方向の地形形状を決定
         *
         * 役割：
         * ・内側（プレイヤー側）から外側に向けて高さを変化
         *
         * 特徴：
         * ・powでカーブをつけて自然な傾斜
         * ・左右で方向が反転
         */

        if (side === 'left') {
            return Math.pow(
                THREE.MathUtils.clamp(1.0 - vx, 0, 1),
                0.82
            );
        }

        return Math.pow(
            THREE.MathUtils.clamp(vx, 0, 1),
            0.82
        );
    }

    noise(x, z, side) {
        /**
         * 地形の高さノイズ生成
         *
         * 処理：
         * ・複数のsin波を合成して複雑な形状を作る
         * ・左右でseedを変えて見た目を変化
         *
         * 戻り値：
         * ・高さ倍率（clampで制限）
         */

        const seed = side === 'left' ? 1.7 : 3.2;

        const n1 =
            Math.sin(x * 0.075 + z * 0.032 + seed);

        const n2 =
            Math.sin(x * 0.19 - z * 0.047 + seed * 2.1);

        const n3 =
            Math.sin(x * 0.031 + z * 0.085 + seed * 3.7);

        const mixed =
            n1 * 0.48 + n2 * 0.32 + n3 * 0.2;

        return THREE.MathUtils.clamp(
            0.42 + Math.abs(mixed) * 0.78,
            0.18,
            1.15
        );
    }
}