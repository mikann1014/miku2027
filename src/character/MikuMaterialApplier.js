import * as THREE from 'three';

export class MikuMaterialApplier {
            constructor() {
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

    apply(model) {
        if (!model) {
            return;
        }

        this.removeExistingWireMeshes(model);

        const newLinesToAppend = [];
        const lineMaterialsCache = new Map();

        model.traverse(node => {
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

            const sourceMaterial =
                Array.isArray(node.material)
                    ? node.material[0]
                    : node.material;

            const materialName =
                String(sourceMaterial?.name || '').toLowerCase();

            const lineColor =
                this.resolveColorFromMaterialName(materialName);

            // =========================
            // ミク本体
            // 黒・不透明・Zを書く
            // =========================
            node.material = this.createBlackBodyMaterial();

            // 不透明本体は通常描画で先に描く
            node.renderOrder = -100;

            const lineMaterial =
                this.getOrCreateLineMaterial(
                    lineMaterialsCache,
                    lineColor
                );

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

        newLinesToAppend.forEach(item => {
            item.parent.add(item.mesh);
        });
    }

    removeExistingWireMeshes(model) {
        const wires = [];

        model.traverse(node => {
            if (node.userData?.isWire) {
                wires.push(node);
            }
        });

        wires.forEach(node => {
            node.parent?.remove(node);

            if (node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(material => {
                        material.dispose?.();
                    });
                } else {
                    node.material.dispose?.();
                }
            }

            // geometry は本体と共有している可能性があるので dispose しない
        });
    }

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

    resolveColorFromMaterialName(materialName) {
        const name =
            materialName || '';

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

        return 0x00D6FF;
    }

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

    createLineMesh(node, lineMaterial, rootModel) {
        if (!node || !node.geometry) {
            return null;
        }

        const parent =
            node.parent || rootModel;

        if (node.isSkinnedMesh) {
            const skinnedLineMesh =
                new THREE.SkinnedMesh(
                    node.geometry,
                    lineMaterial
                );

            skinnedLineMesh.skeleton =
                node.skeleton;

            skinnedLineMesh.bindMatrix.copy(
                node.bindMatrix
            );

            skinnedLineMesh.bindMatrixInverse.copy(
                node.bindMatrixInverse
            );

            skinnedLineMesh.position.copy(
                node.position
            );

            skinnedLineMesh.rotation.copy(
                node.rotation
            );

            skinnedLineMesh.scale.copy(
                node.scale
            );

            skinnedLineMesh.frustumCulled = false;
            skinnedLineMesh.castShadow = false;
            skinnedLineMesh.receiveShadow = false;

            // ワイヤーは黒本体の上に表示
            skinnedLineMesh.renderOrder = 10;
            skinnedLineMesh.userData.isWire = true;

            return {
                parent,
                mesh: skinnedLineMesh
            };
        }

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