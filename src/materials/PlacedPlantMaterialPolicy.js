import * as THREE from 'three';

export class PlacedPlantMaterialPolicy {
    isPlantId(id, object = null) {
        const resolvedId =
            String(id || '');

        return (
            resolvedId.startsWith('flower') ||
            resolvedId.startsWith('Grass') ||
            resolvedId === 'Leaf' ||
            object?.userData?.isFlower === true ||
            object?.userData?.windReactive === true
        );
    }

    apply(root) {
        if (!root) {
            return;
        }

        root.traverse(child => {
            if (!child) {
                return;
            }

            child.frustumCulled = false;

            if (
                child.userData?.isWire === true ||
                child.userData?.isCyberWire === true
            ) {
                this.applyWireMaterial(
                    child
                );

                return;
            }

            if (
                child.isMesh &&
                child.material
            ) {
                this.applyInvisibleFaceMaterial(
                    child
                );
            }
        });
    }

    restore(root) {
        this.apply(
            root
        );
    }

    applyWireMaterial(child) {
        child.renderOrder = 8;

        const materials = [];

        if (child.material) {
            if (Array.isArray(child.material)) {
                materials.push(
                    ...child.material
                );
            } else {
                materials.push(
                    child.material
                );
            }
        }

        if (child.userData?.lineMaterial) {
            materials.push(
                child.userData.lineMaterial
            );
        }

        const baseColor =
            child.userData?.baseColor;

        materials.forEach(material => {
            if (!material) {
                return;
            }

            if (
                baseColor &&
                material.color
            ) {
                material.color.copy(
                    baseColor
                );
            }

            material.transparent = true;
            material.opacity = 1.0;

            /*
             * 重要:
             * depthTest=true にすることで、ミクの奥にあるwireはミクに隠れる。
             * depthWrite=false にすることで、wire自身は深度を書き込まない。
             */
            material.depthTest = true;
            material.depthWrite = false;
            material.depthFunc = THREE.LessEqualDepth;

            material.blending = THREE.AdditiveBlending;
            material.colorWrite = true;
            material.toneMapped = false;

            material.needsUpdate = true;
        });
    }

    applyInvisibleFaceMaterial(child) {
        child.renderOrder = 7;

        const materials =
            Array.isArray(child.material)
                ? child.material
                : [child.material];

        materials.forEach(material => {
            if (!material) {
                return;
            }

            /*
             * face は描画しない。
             * Mesh は raycast / bounds / transform 用に残す。
             */
            material.transparent = true;
            material.opacity = 0.0;
            material.colorWrite = false;

            material.depthWrite = false;
            material.depthTest = true;
            material.depthFunc = THREE.LessEqualDepth;

            material.blending = THREE.NormalBlending;
            material.side = THREE.DoubleSide;
            material.toneMapped = false;

            material.needsUpdate = true;
        });

        child.castShadow = false;
        child.receiveShadow = false;
    }
}