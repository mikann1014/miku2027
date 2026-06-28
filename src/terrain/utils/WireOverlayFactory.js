import * as THREE from 'three';

/**
 * WireOverlayFactory
 *
 * ・任意のジオメトリに対してワイヤーフレーム表示を生成する
 *
 * 役割：
 * - 装飾用のワイヤーライン生成
 * - サイバー風ビジュアル強化
 * - 深度制御による正しい重なり表現
 *
 * 特徴：
 * 👉 WireframeGeometryを使用
 * 👉 depthWrite = false（重要）
 * 👉 depthTest 切り替え可能
 */
export class WireOverlayFactory {

    create(
        geometry,
        color,
        opacity,
        blending = THREE.NormalBlending,
        options = {}
    ) {

        if (!geometry) return null;

        /**
         * 元ジオメトリ → ワイヤーフレーム化
         */
        const wireGeometry =
            new THREE.WireframeGeometry(
                geometry
            );

        /**
         * ワイヤーマテリアル
         */
        const wireMaterial =
            new THREE.LineBasicMaterial({

                color,
                transparent: true,
                opacity,
                blending,

                /*
                 * wire は深度を書かない。
                 * → 重なり順を壊さないため
                 */
                depthWrite: false,

                /*
                 * 重要:
                 * false にすると常に前面に来る。
                 * → 花や他オブジェクトに隠れてほしいので true。
                 */
                depthTest: options.depthTest ?? true,

                // 標準的な深度比較（<=）
                depthFunc: THREE.LessEqualDepth
            });

        /**
         * LineSegmentsとして生成
         */
        const wire =
            new THREE.LineSegments(
                wireGeometry,
                wireMaterial
            );

        /**
         * フラグ（他クラスで利用）
         */
        wire.userData.isWire = true;

        /*
         * wire は装飾レイヤなので低めのrenderOrder
         */
        wire.renderOrder =
            options.renderOrder ?? 1;

        // 常時描画（遠距離カット防止）
        wire.frustumCulled = false;

        return wire;
    }
}