import * as THREE from 'three';
import { SCALES } from '../appState.js';
import { CyberWireMaterialApplier } from '../spawn/CyberWireMaterialApplier.js';
import { WaterRippleController } from '../effects/WaterRippleController.js';
import { PlacedPlantMaterialPolicy } from '../materials/PlacedPlantMaterialPolicy.js';

export class SpawnManager {
    constructor(scene) {
        this.scene = scene;

        this.registry = new Map();

        this.cyberWireMaterialApplier =
            new CyberWireMaterialApplier();

        this.waterRippleController =
            new WaterRippleController(this.scene);

        this.mixCandidates = [
            'Grass1',
            'Grass2',
            'Grass3',
            'Prism1',
            'Prism2',
            'Prism3'
        ];
        this.placedPlantMaterialPolicy =
    new PlacedPlantMaterialPolicy();
    }

    registerAndProcessModel(name, model) {
        if (!name || !model) return;

        model.visible = false;
        this.registry.set(name, model);

        console.log(`[SpawnManager] Registered: ${name}`);
    }

    hasModel(id) {
        return this.registry.has(id);
    }

    spawn(id, position, options = {}) {
    const master =
        this.registry.get(id);

    if (!master) {
        console.warn(
            `[SpawnManager] No registered model: ${id}`
        );

        return null;
    }

    const instance =
        master.clone(true);

    this.makeInstanceMaterialsUnique(
        instance
    );

    instance.visible = true;
    instance.position.copy(position);

    const isPlant =
        this.isDepthSafePlacedPlantId(id);

    if (isPlant) {
        const surfaceNormal =
            options.surfaceNormal
                ? options.surfaceNormal.clone().normalize()
                : new THREE.Vector3(0, 1, 0);

        const plantSurfaceOffset =
            options.plantSurfaceOffset ?? 0.08;

        instance.position.addScaledVector(
            surfaceNormal,
            plantSurfaceOffset
        );
    }

    const baseScale =
        SCALES[id] ?? 1.0;

    const scaleMultiplier =
        options.scaleMultiplier ?? 1.0;

    instance.scale.setScalar(
        baseScale * scaleMultiplier
    );

    if (options.randomRotation ?? true) {
        instance.rotation.y =
            Math.random() * Math.PI * 2;
    }

    /*
     * サイバーwire化。
     * 面は透明、wireのみ表示。
     */
    this.cyberWireMaterialApplier.applyToObject(
        instance,
        id
    );

    if (isPlant) {
        /*
         * 重要:
         * removeOnlyExplicitWireOverlays は呼ばない。
         * これを呼ぶと、せっかく作ったサイバーwireが消える。
         */
        this.enforcePlacedPlantDepthMaterial(
            instance
        );
    }

    const surfaceType =
        options.surfaceType || 'ground';

    instance.userData.spawnId = id;
    instance.userData.surfaceType = surfaceType;

    instance.userData.isFlower =
        id.startsWith('flower');

    if (
        id.startsWith('flower') ||
        id.startsWith('Grass') ||
        id === 'Leaf'
    ) {
        instance.userData.windReactive = true;
    }

    if (isPlant) {
        instance.userData.isWorldFixed = true;
        instance.userData.followMiku = false;

        instance.userData.anchorPosition =
            instance.position.clone();
    }

    if (id.startsWith('Prism')) {
        instance.userData.isPrism = true;
        instance.userData.baseScale =
            instance.scale.clone();

        const color =
            new THREE.Color().setHSL(
                Math.random(),
                0.7,
                0.6
            );

        instance.traverse(child => {
            const materials = [];

            if (child.material) {
                if (Array.isArray(child.material)) {
                    materials.push(...child.material);
                } else {
                    materials.push(child.material);
                }
            }

            if (child.userData?.lineMaterial) {
                materials.push(child.userData.lineMaterial);
            }

            materials.forEach(material => {
                if (!material?.color) {
                    return;
                }

                material.color.copy(color);
                material.needsUpdate = true;
            });
        });
    }

    if (!isPlant) {
        instance.renderOrder = 0;

        instance.traverse(child => {
            child.renderOrder = 0;
        });
    } else {
        instance.renderOrder = 6;
    }

    this.scene.add(instance);

    if (id === 'Leaf') {
        this.spawnWaterRipple(position);
    }

    return instance;
}
    
isDepthSafePlacedPlantId(id, object = null) {
    return this.placedPlantMaterialPolicy.isPlantId(
        id,
        object
    );
}

    /**
     * ワイヤー・輪郭線だけを削除する。
     *
     * 重要:
     * transparent=true という理由だけでは削除しない。
     * 花本体のメッシュまで消えるため。
     */
    removeOnlyExplicitWireOverlays(root) {
        if (!root) return;

        const removeTargets = [];

        root.traverse(child => {
            if (!child || child === root) {
                return;
            }

            const name =
                (child.name || '').toLowerCase();

            const hasLineMaterial =
                !!child.userData?.lineMaterial;

            const isKnownWire =
                child.userData?.isWire === true ||
                child.userData?.isWireOverlay === true ||
                child.userData?.isCyberWire === true ||
                name.includes('wire') ||
                name.includes('outline') ||
                name.includes('line');

            const material =
                child.material;

            const mats = material
                ? Array.isArray(material)
                    ? material
                    : [material]
                : [];

            const hasWireframeMaterial =
                mats.some(mat => {
                    if (!mat) return false;

                    return mat.wireframe === true;
                });

            if (
                hasLineMaterial ||
                isKnownWire ||
                hasWireframeMaterial
            ) {
                removeTargets.push(child);
            }
        });

        removeTargets.forEach(child => {
            if (child.parent) {
                child.parent.remove(child);
            }

            if (child.geometry) {
                child.geometry.dispose();
            }

            if (child.material) {
                const mats =
                    Array.isArray(child.material)
                        ? child.material
                        : [child.material];

                mats.forEach(mat => {
                    mat?.dispose?.();
                });
            }
        });
    }

    restorePlacedPlantCyberMaterial(root) {
    this.placedPlantMaterialPolicy.restore(
        root
    );
}

    /**
     * 花・草・葉のマテリアルを深度安全化する。
     *
     * transparent=false + alphaTest にして、
     * Three.js の透明描画キューに入れない。
     */
   enforcePlacedPlantDepthMaterial(root) {
    this.placedPlantMaterialPolicy.apply(
        root
    );
}

makeInstanceMaterialsUnique(root) {
    if (!root) {
        return;
    }

    const materialCloneMap =
        new Map();

    const cloneMaterial = material => {
        if (!material) {
            return material;
        }

        if (materialCloneMap.has(material)) {
            return materialCloneMap.get(material);
        }

        const clonedMaterial =
            material.clone();

        clonedMaterial.userData = {
            ...(material.userData || {}),
            isInstanceMaterial: true,
            sourceMaterialUuid: material.uuid
        };

        clonedMaterial.needsUpdate = true;

        materialCloneMap.set(
            material,
            clonedMaterial
        );

        return clonedMaterial;
    };

    root.traverse(child => {
        if (!child || !child.material) {
            return;
        }

        if (Array.isArray(child.material)) {
            child.material =
                child.material.map(material => {
                    return cloneMaterial(material);
                });
        } else {
            child.material =
                cloneMaterial(child.material);
        }
    });
}
    spawnMixed(position) {
    if (Math.random() > 0.5) {
        return null;
    }

    const id =
        this.mixCandidates[
            Math.floor(
                Math.random() * this.mixCandidates.length
            )
        ];

    const master =
        this.registry.get(id);

    if (!master) {
        return null;
    }

    const instance =
        master.clone(true);

    this.makeInstanceMaterialsUnique(
        instance
    );

    instance.visible = true;

    instance.position.set(
        position.x + (Math.random() - 0.5) * 4,
        position.y,
        position.z + (Math.random() - 0.5) * 4
    );

    const baseScale =
        SCALES[id] ?? 1.0;

    instance.scale.setScalar(
        baseScale * (0.5 + Math.random() * 0.8)
    );

    instance.rotation.y =
        Math.random() * Math.PI * 2;

    this.cyberWireMaterialApplier.applyToObject(
        instance,
        id
    );

    const isPlant =
        this.isDepthSafePlacedPlantId(id);

    if (isPlant) {
        this.enforcePlacedPlantDepthMaterial(
            instance
        );

        instance.userData.isWorldFixed = true;
        instance.userData.followMiku = false;
        instance.userData.anchorPosition =
            instance.position.clone();
    }

    if (id.startsWith('Prism')) {
        instance.userData.isPrism = true;
        instance.userData.baseScale =
            instance.scale.clone();
    }

    if (!isPlant) {
        instance.renderOrder = 0;

        instance.traverse(child => {
            child.renderOrder = 0;
        });
    } else {
        instance.renderOrder = 6;
    }

    this.scene.add(instance);

    return instance;
}

    spawnWaterRipple(position, options = {}) {
        if (!this.waterRippleController) return null;

        return this.waterRippleController.spawn(
            position,
            options
        );
    }

    update(delta = 0.016, beat = 0) {
        const pulse =
            THREE.MathUtils.clamp(
                beat,
                0,
                1
            );

        this.updatePrismPulse(pulse);

        if (this.waterRippleController) {
            this.waterRippleController.update(delta);
        }
    }

    updatePrismPulse(pulse) {
        this.scene.traverse(obj => {
            if (!obj.userData?.isPrism) return;

            const baseScale =
                obj.userData.baseScale;

            if (baseScale) {
                const scaleBoost =
                    1.0 + pulse * 0.22;

                obj.scale
                    .copy(baseScale)
                    .multiplyScalar(scaleBoost);
            }

            obj.traverse(child => {
                const mat =
                    child.userData?.lineMaterial;

                const baseColor =
                    child.userData?.baseColor;

                if (!mat || !baseColor) return;

                if (obj.userData.ignorePulse) {
                    return;
                }

                const intensity =
                    0.18 + pulse * 2.8;

                mat.color
                    .copy(baseColor)
                    .multiplyScalar(intensity);

                mat.opacity =
                    0.18 + pulse * 0.82;

                mat.transparent = true;
                mat.needsUpdate = true;
            });
        });
    }

    clearEffects() {
        if (this.waterRippleController) {
            this.waterRippleController.clear();
        }
    }
}