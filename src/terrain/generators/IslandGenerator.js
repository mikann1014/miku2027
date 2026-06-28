/**
 * IslandGenerator
 *
 * ・チャンク内に複数の島（地形メッシュ）を生成する
 * ・楕円ベースのドーム形状＋ノイズで自然な地形を構築
 *
 * 主な機能：
 * ・チャンクごとに複数の島を配置
 * ・楕円形＋高さ補間による地形メッシュ生成
 * ・ノイズによる自然な凹凸の付与
 * ・ワイヤオーバーレイの生成
 * ・フェード対象として登録
 *
 * 役割：
 * シーン内にランダム性のある「島地形」を生成し、
 * 見た目の変化と探索性を向上させる
 */

import * as THREE from 'three';

export class IslandGenerator {
    constructor(terrain) {
        /**
         * 初期化
         *
         * ・Terrainへの参照を保持
         * ・マテリアルや登録処理に使用
         */

        this.terrain = terrain;
    }

    create(chunk) {
        /**
         * チャンク内に複数の島を生成
         *
         * 処理：
         * ・チャンクインデックスを元にシード生成
         * ・事前定義された配置パターンを基に島を生成
         *
         * 特徴：
         * ・少しのsin/cos揺らぎで毎回微妙に位置が変わる
         */

        const t = this.terrain;

        // チャンクごとの疑似ランダムシード
        const seed = chunk.index * 17.13;

        // 島の配置パラメータ
        const configs = [
            {
                x: -38 + Math.sin(seed) * 3,
                z: -t.chunkLength * 0.28,
                rx: 17,
                rz: 25,
                height: 1.1
            },
            {
                x: 40 + Math.cos(seed * 0.7) * 3,
                z: t.chunkLength * 0.22,
                rx: 18,
                rz: 27,
                height: 1.2
            },
            {
                x: -62 + Math.cos(seed * 0.4) * 2,
                z: t.chunkLength * 0.42,
                rx: 20,
                rz: 32,
                height: 1.3
            },
            {
                x: 63 + Math.sin(seed * 0.5) * 2,
                z: -t.chunkLength * 0.4,
                rx: 21,
                rz: 34,
                height: 1.35
            }
        ];

        // 各設定ごとに島を生成
        configs.forEach((config, index) => {
            this.createIsland(
                chunk,
                config,
                index
            );
        });
    }

    createIsland(chunk, config, localIndex) {
        /**
         * 単一の島メッシュを生成
         *
         * 処理：
         * ・楕円ドーム形状のGeometryを生成
         * ・Meshとして配置
         * ・ワイヤオーバーレイ追加
         * ・fade対象として登録
         */

        const t = this.terrain;

        // ジオメトリ生成
        const geometry = this.createOvalGroundGeometry({
            rx: config.rx,     // X方向半径
            rz: config.rz,     // Z方向半径
            height: config.height,
            rings: 8,          // 同心円分割数
            segments: 36,      // 円周分割数
            seed: chunk.index * 1.7 + localIndex * 2.3
        });

        const island = new THREE.Mesh(
            geometry,
            t.groundMaterial.clone()
        );

        // 名前（デバッグ用）
        island.name =
            `ground_island_chunk_${chunk.index}_${localIndex}`;

        // サーフェスタイプ定義（配置判定で使用）
        island.userData.surfaceType = 'ground';

        // ワールド位置
        island.position.set(
            config.x,
            t.groundY,
            config.z
        );

        // 常に描画（地形なので消えないように）
        island.frustumCulled = false;

        // 各管理リストへ登録
        chunk.group.add(island);
        chunk.objects.push(island);
        t.landObjects.push(island);

        // フェード管理対象へ登録
        t.registerFadeTarget(
            chunk,
            island,
            t.groundBaseOpacity
        );

        // =========================
        // ワイヤオーバーレイ生成
        // =========================
        const wire = t.createWireOverlay(
            island.geometry,
            t.groundGridColor,
            t.groundWireBaseOpacity,
            THREE.NormalBlending
        );

        wire.name = `${island.name}_wire`;

        // ワイヤ識別フラグ
        wire.userData.isWire = true;

        // 親と同じ位置に配置
        wire.position.copy(island.position);

        // 描画順調整（地形より少し前）
        wire.renderOrder = 3;

        chunk.group.add(wire);

        // ワイヤもフェード対象
        t.registerFadeTarget(
            chunk,
            wire,
            t.groundWireBaseOpacity
        );
    }

    createOvalGroundGeometry({
        rx,
        rz,
        height,
        rings,
        segments,
        seed
    }) {
        /**
         * 楕円ドーム状の地形ジオメトリを生成
         *
         * 形状構成：
         * ・中心から外周へ向かう同心円構造
         * ・高さは「ドーム関数 + ノイズ」で決定
         *
         * 特徴：
         * ・中央が高く外側に向かって低くなる
         * ・ノイズで自然な凹凸を追加
         */

        const vertices = [];
        const indices = [];

        // =========================
        // 中心頂点
        // =========================
        vertices.push(0, height, 0);

        // =========================
        // リング生成（内側 → 外側）
        // =========================
        for (let r = 1; r <= rings; r++) {
            const t = r / rings;

            for (let s = 0; s < segments; s++) {
                const angle =
                    (s / segments) * Math.PI * 2;

                // 楕円座標
                const x =
                    Math.cos(angle) * rx * t;

                const z =
                    Math.sin(angle) * rz * t;

                // エッジに向かうほど高さを減衰
                const edge = 1.0 - t;

                // ドーム形状（指数カーブ）
                const dome = Math.pow(edge, 0.45);

                // ノイズ（簡易波）
                const noise =
                    Math.sin(x * 0.32 + seed) *
                    Math.sin(z * 0.18 + seed * 2.0) *
                    0.08;

                const y =
                    dome * height + noise;

                vertices.push(x, y, z);
            }
        }

        // =========================
        // 中心から最初のリングへ（三角形）
        // =========================
        for (let s = 0; s < segments; s++) {
            const a = 0;
            const b = 1 + s;
            const c = 1 + ((s + 1) % segments);

            indices.push(a, b, c);
        }

        // =========================
        // リング間を接続（四角を2三角形で分割）
        // =========================
        for (let r = 1; r < rings; r++) {
            const currentStart =
                1 + (r - 1) * segments;

            const nextStart =
                1 + r * segments;

            for (let s = 0; s < segments; s++) {
                const a = currentStart + s;
                const b =
                    currentStart + ((s + 1) % segments);
                const c = nextStart + s;
                const d =
                    nextStart + ((s + 1) % segments);

                // 三角形2枚で四角面を構成
                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }

        // =========================
        // Geometry生成
        // =========================
        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
                vertices,
                3
            )
        );

        geometry.setIndex(indices);

        // 法線計算（ライティング用）
        geometry.computeVertexNormals();

        return geometry;
    }
}