import * as THREE from 'three';
import { ColorManager } from '../managers/ColorManager.js';

export class CyberWireMaterialApplier {
    constructor(colorManager = null) {
        this.colorManager =
            colorManager || new ColorManager();
    }

    applyToObject(object, id) {
        if (!object) {
            return;
        }

        const meshTargets = [];

        object.traverse(node => {
            if (!node) {
                return;
            }

            if (!node.isMesh) {
                return;
            }

            if (node.userData?.isWire) {
                return;
            }

            meshTargets.push(node);
        });

        meshTargets.forEach(node => {
            const {
                faceMaterial,
                lineMaterial
            } = this.createMaterialsForNode(
                node,
                id
            );

            node.material = faceMaterial;

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
        if (id.startsWith('Prism')) {
            return this.createPrismMaterials();
        }

        return this.colorManager.getMaterialsForPart(
            node.name || '',
            id
        );
    }

    createPrismMaterials() {
        const color =
            new THREE.Color().setHSL(
                Math.random(),
                0.95,
                0.65
            );

        const faceMaterial =
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.0,
                colorWrite: false,

                depthWrite: false,
                depthTest: true,
                depthFunc: THREE.LessEqualDepth,

                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                toneMapped: false
            });

        faceMaterial.userData.isCyberInvisibleFace = true;

        const lineMaterial =
            new THREE.MeshBasicMaterial({
                color,

                wireframe: true,
                transparent: true,
                opacity: 1.0,

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
    const wire =
        new THREE.Mesh(
            node.geometry,
            lineMaterial
        );

    wire.name =
        `${node.name || id}_wire`;

    wire.userData.isWire = true;
    wire.userData.isCyberWire = true;
    wire.userData.lineMaterial = lineMaterial;
    wire.userData.baseColor =
        lineMaterial.color.clone();

    wire.raycast = () => {};

    wire.renderOrder = 8;
    wire.frustumCulled = false;

    if (wire.material) {
        wire.material.transparent = true;
        wire.material.opacity = 1.0;

        wire.material.depthTest = true;
        wire.material.depthWrite = false;
        wire.material.depthFunc = THREE.LessEqualDepth;

        wire.material.blending = THREE.AdditiveBlending;
        wire.material.colorWrite = true;
        wire.material.toneMapped = false;
        wire.material.needsUpdate = true;
    }

    return wire;
}
}