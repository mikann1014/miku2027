import * as THREE from 'three';
import { SurfaceClassifier } from './SurfaceClassifier.js';
import { PathMaterialManager } from './PathMaterialManager.js';
import { WaterMaterialManager } from './WaterMaterialManager.js';
import { GroundMaterialManager } from './GroundMaterialManager.js';

export class LakeTerrainManager {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.model = null;
        this.landObjects = [];

        this.position = options.position instanceof THREE.Vector3
            ? options.position.clone()
            : new THREE.Vector3(0, 0.6, 0);

        this.scale = options.scale ?? 20;

        this.surfaceClassifier =
            options.surfaceClassifier || new SurfaceClassifier();

        this.pathMaterialManager =
            options.pathMaterialManager ||
            new PathMaterialManager({
                wireColor: options.path?.wireColor ?? 0x00ffff,
                wireOpacity: options.path?.wireOpacity ?? 1.0
            });

        this.waterMaterialManager =
            options.waterMaterialManager ||
            new WaterMaterialManager(this.scene, {
                // ✅ 最後の俯瞰時にオレンジに寄りすぎないよう、
                // 水面そのものを青緑寄りにする
                surfaceColor: options.water?.surfaceColor ?? 0x005f7a,

                // ✅ 透明すぎると空のオレンジを拾いすぎるので、
                // 少し不透明度を上げる
                surfaceOpacity: options.water?.surfaceOpacity ?? 0.72,

                // ✅ グリッドはサイバー感を残すためシアン
                gridColor: options.water?.gridColor ?? 0x00eaff,
                gridOpacity: options.water?.gridOpacity ?? 0.70,

                gridSize: options.water?.gridSize ?? 8.0,
                gridLineWidth: options.water?.gridLineWidth ?? 1.05,

                // ✅ 地形的に不自然な映り込みを避けるため反射はOFF
                useReflection: options.water?.useReflection ?? false,

                reflectionTextureSize: options.water?.reflectionTextureSize ?? 512,
                reflectionColor: options.water?.reflectionColor ?? 0x000204
            });

        this.groundMaterialManager =
            options.groundMaterialManager ||
            new GroundMaterialManager({
                color: options.ground?.color ?? 0x0b1414,

                roughness: options.ground?.roughness ?? 0.95,
                metalness: options.ground?.metalness ?? 0.0,

                emissive: options.ground?.emissive ?? 0x000000,
                emissiveIntensity: options.ground?.emissiveIntensity ?? 0.0,

                useEdgeLines: options.ground?.useEdgeLines ?? true,
                edgeColor: options.ground?.edgeColor ?? 0x1f7777,
                edgeOpacity: options.ground?.edgeOpacity ?? 0.28
            });
    }

    setup(model) {
        if (!model) {
            console.warn('[LakeTerrainManager] setup failed: model is null.');
            return this.landObjects;
        }

        this.model = model;
        this.landObjects = [];

        this.applyTransform(model);
        this.scene.add(model);

        this.registerTerrainMeshes(model);

        console.log(
            `[LakeTerrainManager] setup complete. landObjects=${this.landObjects.length}`
        );

        return this.landObjects;
    }

    applyTransform(model) {
        model.position.copy(this.position);

        if (typeof this.scale === 'number') {
            model.scale.set(this.scale, this.scale, this.scale);
        } else if (this.scale instanceof THREE.Vector3) {
            model.scale.copy(this.scale);
        } else {
            model.scale.set(20, 20, 20);
        }

        model.updateMatrixWorld(true);
    }

    registerTerrainMeshes(model) {
        model.traverse(node => {
            if (!node.isMesh) return;
            if (node.userData?.isWire) return;
            if (node.userData?.isWaterReflector) return;

            const surfaceType = this.surfaceClassifier.classify(node);

            node.userData.surfaceType = surfaceType;

            this.landObjects.push(node);

            if (surfaceType === 'path') {
                this.pathMaterialManager.applyWireOnly(node);
            }

            if (surfaceType === 'water') {
                this.waterMaterialManager.applyWaterMaterial(node);
            }

            if (surfaceType === 'ground') {
                this.groundMaterialManager.applyGroundMaterial(node);
            }
        });
    }

    getLandObjects() {
        return this.landObjects;
    }

    getModel() {
        return this.model;
    }

    clearLandObjects() {
        this.landObjects = [];
    }
}