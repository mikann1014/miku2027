import * as THREE from 'three';

/**
 * MikuMaterialApplier
 * モデルに対してマテリアルを適用し、
 * 黒ベース + ワイヤーフレーム構成に変換するクラス
 */
export class MikuMaterialApplier {
    constructor() {
        // 部位ごとのカラー定義
        this.mikuColors = {
            tie: 0x00D6FF,
            skin: 0xFFB6C1,
            hair: 0x00FFBC,
            hairAccessary: 0xFF0055,
            glove: 0x0055FF,
            glove2: 0x00D6FF,
            clothes: 0x0088FF,
            socks: 0x0055FF,
            shoes: 0x0055FF,
            skirt: 0x0055FF,
            shoes2: 0x00D6FF,
            skirt2: 0x0033FF,
            belt: 0x0033FF,
            tiePin: 0x0011FF
        };
    }

    /**
     * モデルに対してマテリアル適用処理を行う
     */
    apply(model) {
        if (!model) {
            return;
        }

        // 既存のワイヤーメッシュを削除
        this.removeExistingWireMeshes(model);

        const newLinesToAppend = [];
        const lineMaterialsCache = new Map();

        model.traverse(node => {
            // Mesh以外 / マテリアル無し / ワイヤー用ノードはスキップ
            if (
                !node.isMesh ||
                !node.material ||
                node.userData?.isWire
            ) {
                return;
            }

            node.frustumCulled = false;
            node.castShadow = false;
            node.receiveShadow = false;

            // マテリアル取得（配列の場合は先頭）
            const sourceMaterial =
                Array.isArray(node.material)
                    ? node.material[0]
                    : node.material;

            // マテリアル名を小文字で取得
            const materialName =
                String(sourceMaterial?.name || '').toLowerCase();

            // 名前から色を決定
            const lineColor =
                this.resolveColorFromMaterialName(materialName);

            // 本体メッシュは黒マテリアルに置き換え
            node.material = this.createBlackBodyMaterial();

            // 本体を先に描画
            node.renderOrder = -100;

            // ワイヤーフレーム用マテリアルを取得または生成
            const lineMaterial =
                this.getOrCreateLineMaterial(
                    lineMaterialsCache,
                    lineColor
                );

            // ワイヤーメッシュ生成
            const lineMesh =
                this.createLineMesh(
                    node,
                    lineMaterial,
                    model
                );

            if (lineMesh) {
                newLinesToAppend.push(lineMesh);
            }
        });

        // 親にワイヤーメッシュを追加
        newLinesToAppend.forEach(item => {
            item.parent.add(item.mesh);
        });
    }

    /**
     * 既存のワイヤーメッシュを削除する
     */
    removeExistingWireMeshes(model) {
        const wires = [];

        model.traverse(node => {
            if (node.userData?.isWire) {
                wires.push(node);
            }
        });

        wires.forEach(node => {
            node.parent?.remove(node);

            // マテリアルの解放
            if (node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(material => {
                        material.dispose?.();
                    });
                } else {
                    node.material.dispose?.();
                }
            }

            // geometry は共有の可能性があるため破棄しない
        });
    }

    /**
     * 黒の本体マテリアルを生成
     */
    createBlackBodyMaterial() {
        return new THREE.MeshBasicMaterial({
            color: 0x000000,

            transparent: false,
            opacity: 1.0,

            depthTest: true,
            depthWrite: true,
            depthFunc: THREE.LessEqualDepth,

            colorWrite: true,

            blending: THREE.NormalBlending,

            side: THREE.DoubleSide,

            toneMapped: false
        });
    }

    /**
     * マテリアル名から対応するカラーを取得
     */
    resolveColorFromMaterialName(materialName) {
        const name = materialName || '';

        if (
            name.includes('hairaccessary') ||
            name.includes('hair_accessary')
        ) {
            return this.mikuColors.hairAccessary;
        }

        if (name.includes('tiepin')) {
            return this.mikuColors.tiePin;
        }

        if (name.includes('glove2')) {
            return this.mikuColors.glove2;
        }

        if (name.includes('shoes2')) {
            return this.mikuColors.shoes2;
        }

        if (name.includes('skirt2')) {
            return this.mikuColors.skirt2;
        }

        if (name.includes('tie')) {
            return this.mikuColors.tie;
        }

        if (name.includes('skin')) {
            return this.mikuColors.skin;
        }

        if (name.includes('hair')) {
            return this.mikuColors.hair;
        }

        if (name.includes('glove')) {
            return this.mikuColors.glove;
        }

        if (name.includes('clothes')) {
            return this.mikuColors.clothes;
        }

        if (name.includes('socks')) {
            return this.mikuColors.socks;
        }

        if (name.includes('shoes')) {
            return this.mikuColors.shoes;
        }

        if (name.includes('skirt')) {
            return this.mikuColors.skirt;
        }

        if (name.includes('belt')) {
            return this.mikuColors.belt;
        }

        // デフォルトカラー
        return 0x00D6FF;
    }

    /**
     * ワイヤーフレーム用マテリアルを取得または生成
     */
    getOrCreateLineMaterial(cache, color) {
        if (!cache.has(color)) {
            cache.set(
                color,
                new THREE.MeshBasicMaterial({
                    wireframe: true,

                    color,

                    transparent: true,
                    opacity: 1.0,

                    blending: THREE.AdditiveBlending,

                    depthTest: true,
                    depthWrite: false,
                    depthFunc: THREE.LessEqualDepth,

                    toneMapped: false,
                    side: THREE.DoubleSide
                })
            );
        }

        return cache.get(color);
    }

    /**
     * ワイヤーフレームメッシュを生成
     */
    createLineMesh(node, lineMaterial, rootModel) {
        if (!node || !node.geometry) {
            return null;
        }

        const parent = node.parent || rootModel;

        // スキンメッシュの場合
        if (node.isSkinnedMesh) {
            const skinnedLineMesh =
                new THREE.SkinnedMesh(
                    node.geometry,
                    lineMaterial
                );

            skinnedLineMesh.skeleton = node.skeleton;

            skinnedLineMesh.bindMatrix.copy(node.bindMatrix);
            skinnedLineMesh.bindMatrixInverse.copy(node.bindMatrixInverse);

            skinnedLineMesh.position.copy(node.position);
            skinnedLineMesh.rotation.copy(node.rotation);
            skinnedLineMesh.scale.copy(node.scale);

            skinnedLineMesh.frustumCulled = false;
            skinnedLineMesh.castShadow = false;
            skinnedLineMesh.receiveShadow = false;

            skinnedLineMesh.renderOrder = 10;
            skinnedLineMesh.userData.isWire = true;

            return {
                parent,
                mesh: skinnedLineMesh
            };
        }

        // 通常メッシュの場合
        const lineMesh =
            new THREE.Mesh(
                node.geometry,
                lineMaterial
            );

        lineMesh.position.copy(node.position);
        lineMesh.rotation.copy(node.rotation);
        lineMesh.scale.copy(node.scale);

        lineMesh.frustumCulled = false;
        lineMesh.castShadow = false;
        lineMesh.receiveShadow = false;

        lineMesh.renderOrder = 10;
        lineMesh.userData.isWire = true;

        return {
            parent,
            mesh: lineMesh
        };
    }
}