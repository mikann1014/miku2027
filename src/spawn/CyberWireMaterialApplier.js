/**
 * CyberWireMaterialApplier
 *
 * ・オブジェクトにサイバーワイヤ表現を適用する
 * ・Face（非表示）＋Wire（発光線）の2層構造を生成
 *
 * 主な機能：
 * ・Meshに対して専用マテリアルを適用
 * ・ワイヤフレーム用メッシュを自動生成・追加
 * ・ColorManagerと連携して色を決定
 * ・Prism系は専用カラー（ランダムHSL）で生成
 *
 * 役割：
 * モデルの見た目を「サイバースタイル（線のみ発光）」に統一し、
 * シーン全体のビジュアル表現を制御する
 */

import * as THREE from 'three';
import { ColorManager } from '../managers/ColorManager.js';

export class CyberWireMaterialApplier {
    constructor(colorManager = null) {
        /**
         * 初期化
         *
         * ・ColorManagerを受け取る（未指定なら内部生成）
         */

        this.colorManager =
            colorManager || new ColorManager();
    }

    applyToObject(object, id) {
        /**
         * オブジェクト全体にサイバーワイヤ表現を適用
         *
         * 処理内容：
         * ・対象オブジェクトを再帰的に探索
         * ・Meshノードのみ抽出
         * ・Face材質 + Wireメッシュを適用
         *
         * 除外：
         * ・既にWireとして生成されたオブジェクト
         */

        if (!object) {
            return;
        }

        const meshTargets = [];

        // 再帰的にMeshを収集
        object.traverse(node => {
            if (!node) return;

            // Mesh以外はスキップ
            if (!node.isMesh) return;

            // 既存ワイヤは除外
            if (node.userData?.isWire) return;

            meshTargets.push(node);
        });

        meshTargets.forEach(node => {
            // マテリアル生成
            const {
                faceMaterial,
                lineMaterial
            } = this.createMaterialsForNode(
                node,
                id
            );

            // Face（非表示）を適用
            node.material = faceMaterial;

            // Wireメッシュを生成して子として追加
            const wire =
                this.createWireMesh(
                    node,
                    id,
                    lineMaterial
                );

            node.add(wire);
        });
    }

    createMaterialsForNode(node, id) {
        /**
         * ノードごとのマテリアル生成
         *
         * ルール：
         * ・Prism系 → 専用ランダムカラー
         * ・それ以外 → ColorManagerに委譲
         */

        if (id.startsWith('Prism')) {
            return this.createPrismMaterials();
        }

        return this.colorManager.getMaterialsForPart(
            node.name || '',
            id
        );
    }

    createPrismMaterials() {
        /**
         * Prism専用マテリアル生成
         *
         * 特徴：
         * ・Faceは完全透明（描画しない）
         * ・Wireは高彩度カラー＋加算合成で発光
         */

        const color =
            new THREE.Color().setHSL(
                Math.random(), // 色相ランダム
                0.95,           // 高彩度
                0.65            // 明るやや高め
            );

        // =========================
        // Face（不可視）
        // =========================
        const faceMaterial =
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.0,
                colorWrite: false, // 色を書き込まない

                depthWrite: false,
                depthTest: true,
                depthFunc: THREE.LessEqualDepth,

                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                toneMapped: false
            });

        faceMaterial.userData.isCyberInvisibleFace = true;

        // =========================
        // Wire（発光線）
        // =========================
        const lineMaterial =
            new THREE.MeshBasicMaterial({
                color,

                wireframe: true,
                transparent: true,
                opacity: 1.0,

                // 加算合成で明るく発光させる
                blending: THREE.AdditiveBlending,

                depthWrite: false,
                depthTest: true,
                depthFunc: THREE.LessEqualDepth,

                side: THREE.DoubleSide,
                toneMapped: false
            });

        lineMaterial.userData.isCyberLineMaterial = true;

        return {
            faceMaterial,
            lineMaterial
        };
    }

    createWireMesh(node, id, lineMaterial) {
        /**
         * ワイヤフレーム用メッシュを生成
         *
         * 処理：
         * ・元のgeometryを共有してMeshを作成
         * ・親Meshの子として追加する前提
         *
         * 特徴：
         * ・raycast無効（クリック対象にしない）
         * ・加算合成で発光
         * ・常に描画されるように調整
         */

        const wire =
            new THREE.Mesh(
                node.geometry,
                lineMaterial
            );

        // 名前設定（デバッグ用）
        wire.name =
            `${node.name || id}_wire`;

        // 各種フラグ
        wire.userData.isWire = true;
        wire.userData.isCyberWire = true;
        wire.userData.lineMaterial = lineMaterial;

        // 元の色を保持（アニメーション等で使用可能）
        wire.userData.baseColor =
            lineMaterial.color.clone();

        // Raycast無効（インタラクションから除外）
        wire.raycast = () => {};

        // 描画優先度調整
        wire.renderOrder = 8;

        // 視錐台カリング無効（常に描画）
        wire.frustumCulled = false;

        if (wire.material) {
            wire.material.transparent = true;
            wire.material.opacity = 1.0;

            wire.material.depthTest = true;
            wire.material.depthWrite = false;
            wire.material.depthFunc = THREE.LessEqualDepth;

            wire.material.blending = THREE.AdditiveBlending;

            // 色書き込みは有効
            wire.material.colorWrite = true;

            // トーンマッピング無効で純色表現
            wire.material.toneMapped = false;

            wire.material.needsUpdate = true;
        }

        return wire;
    }
}