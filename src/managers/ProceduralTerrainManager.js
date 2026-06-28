import * as THREE from 'three';

import { WireOverlayFactory } from '../terrain/utils/WireOverlayFactory.js';
import { TerrainMaterialFactory } from '../terrain/TerrainMaterialFactory.js';
import { TerrainFadeController } from '../terrain/TerrainFadeController.js';
import { BackgroundMountainController } from '../terrain/BackgroundMountainController.js';

import { WaterChunkGenerator } from '../terrain/generators/WaterChunkGenerator.js';
import { PathChunkGenerator } from '../terrain/generators/PathChunkGenerator.js';
import { IslandGenerator } from '../terrain/generators/IslandGenerator.js';
import { SteppingStoneGenerator } from '../terrain/generators/SteppingStoneGenerator.js';
import { SideMountainGenerator } from '../terrain/generators/SideMountainGenerator.js';
import { HorizonMountainGenerator } from '../terrain/generators/HorizonMountainGenerator.js';

export class ProceduralTerrainManager {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'proceduralTerrainRoot';

        this.landObjects = [];

        this.waterWidth = options.waterWidth ?? 170;
        this.halfWaterWidth = this.waterWidth * 0.5;

        this.pathWidth = options.pathWidth ?? 7.2;

        this.pathY = options.pathY ?? 0.06;
        this.waterY = options.waterY ?? -0.1;
        this.groundY = options.groundY ?? 0.0;

        this.mainGridColor = options.mainGridColor ?? 0x4f5863;
        this.waterGridColor = options.waterGridColor ?? 0x004477;
        this.groundGridColor = options.groundGridColor ?? 0x008866;

        this.pathMaterial = null;
        this.waterMaterial = null;
        this.groundMaterial = null;
        this.horizonMountainMaterial = null;

        this.chunkLength = options.chunkLength ?? 220;
        this.forwardChunkCount = options.forwardChunkCount ?? 12;
        this.backwardChunkCount = options.backwardChunkCount ?? 5;

        this.terrainChunks = [];
        this.lastBaseIndex = null;

        this.fadeFrontStart = options.fadeFrontStart ?? 430;
        this.fadeFrontEnd = options.fadeFrontEnd ?? 760;

        this.fadeBackStart = options.fadeBackStart ?? 260;
        this.fadeBackEnd = options.fadeBackEnd ?? 520;

        this.minFarOpacity = options.minFarOpacity ?? 0.0;

        this.waterBaseOpacity = options.waterBaseOpacity ?? 0.34;
        this.waterGridBaseOpacity = options.waterGridBaseOpacity ?? 0.09;

        this.pathBaseOpacity = options.pathBaseOpacity ?? 0.92;
        this.pathGridBaseOpacity = options.pathGridBaseOpacity ?? 0.24;
        this.pathNeonBaseOpacity = options.pathNeonBaseOpacity ?? 0.12;

        this.groundBaseOpacity = options.groundBaseOpacity ?? 0.9;
        this.groundWireBaseOpacity = options.groundWireBaseOpacity ?? 0.28;

        this.stoneBaseOpacity = options.stoneBaseOpacity ?? 0.72;
        this.stoneWireBaseOpacity = options.stoneWireBaseOpacity ?? 0.2;

        this.horizonDistance = options.horizonDistance ?? 950;
        this.sideMountainLength = options.sideMountainLength ?? 1800;

        this.sideMountainBaseY = options.sideMountainBaseY ?? -0.16;
        this.sideMountainHeight = options.sideMountainHeight ?? 22.0;

        this.horizonMountainBaseY = options.horizonMountainBaseY ?? -0.14;
        this.horizonMountainHeight = options.horizonMountainHeight ?? 13.0;

        this.frontHorizonGroup = null;
        this.backHorizonGroup = null;

        this.leftMountainGroup = null;
        this.rightMountainGroup = null;

        this.wireOverlayFactory = new WireOverlayFactory();

        this.terrainMaterialFactory = new TerrainMaterialFactory({
            waterBaseOpacity: this.waterBaseOpacity,
            pathBaseOpacity: this.pathBaseOpacity,
            groundBaseOpacity: this.groundBaseOpacity
        });

        this.terrainFadeController = new TerrainFadeController({
            fadeFrontStart: this.fadeFrontStart,
            fadeFrontEnd: this.fadeFrontEnd,
            fadeBackStart: this.fadeBackStart,
            fadeBackEnd: this.fadeBackEnd,
            minFarOpacity: this.minFarOpacity
        });

        this.backgroundMountainController =
            new BackgroundMountainController({
                horizonDistance: this.horizonDistance
            });

        this.waterChunkGenerator =
            new WaterChunkGenerator(this);

        this.pathChunkGenerator =
            new PathChunkGenerator(this);

        this.islandGenerator =
            new IslandGenerator(this);

        this.steppingStoneGenerator =
            new SteppingStoneGenerator(this);

        this.sideMountainGenerator =
            new SideMountainGenerator(this);

        this.horizonMountainGenerator =
            new HorizonMountainGenerator(this);
    }

    setup() {
        this.landObjects = [];
        this.terrainChunks = [];

        this.createMaterials();

        this.createScrollingTerrainChunks();

        this.leftMountainGroup =
            this.sideMountainGenerator.create('left');

        this.rightMountainGroup =
            this.sideMountainGenerator.create('right');

        this.frontHorizonGroup =
            this.horizonMountainGenerator.create('front');

        this.backHorizonGroup =
            this.horizonMountainGenerator.create('back');

        this.scene.add(this.group);

        console.log('[ProceduralTerrainManager] setup complete:', {
            landObjects: this.landObjects.length,
            chunks: this.terrainChunks.length
        });

        return this.landObjects;
    }

    createMaterials() {
        const materials =
            this.terrainMaterialFactory.createMaterials();

        this.waterMaterial =
            materials.waterMaterial;

        this.pathMaterial =
            materials.pathMaterial;

        this.groundMaterial =
            materials.groundMaterial;

        this.horizonMountainMaterial =
            materials.horizonMountainMaterial;
    }

    createScrollingTerrainChunks() {
        const startIndex = -this.backwardChunkCount;
        const endIndex = this.forwardChunkCount;

        for (let i = startIndex; i <= endIndex; i++) {
            const centerZ = -i * this.chunkLength;

            const chunk = this.createTerrainChunk(
                i,
                centerZ
            );

            this.terrainChunks.push(chunk);
        }
    }

    createTerrainChunk(index, centerZ) {
        const chunkGroup = new THREE.Group();

        chunkGroup.name = `terrain_chunk_${index}`;
        chunkGroup.position.set(0, 0, centerZ);

        this.group.add(chunkGroup);

        const chunk = {
            index,
            centerZ,
            group: chunkGroup,
            objects: [],
            fadeTargets: []
        };

        this.waterChunkGenerator.create(chunk);
        this.pathChunkGenerator.create(chunk);
        this.islandGenerator.create(chunk);
        this.steppingStoneGenerator.create(chunk);

        return chunk;
    }

    registerFadeTarget(chunk, object, baseOpacity) {
    if (!chunk || !object || !object.material) return;

    const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

    materials.forEach(material => {
        if (!material) return;

        material.transparent = true;
        material.opacity = baseOpacity;

        material.depthTest = true;
        material.depthWrite = false;
        material.needsUpdate = true;

        chunk.fadeTargets.push({
            material,
            baseOpacity
        });
    });
}


    update(mikuPosition) {
        if (!mikuPosition) return;

        this.updateScrollingChunks(mikuPosition.z);
        this.updateChunkFades(mikuPosition.z);
        this.updateBackgroundMountains(mikuPosition.z);
    }

    updateScrollingChunks(mikuZ) {
        if (
            !this.terrainChunks ||
            this.terrainChunks.length === 0
        ) {
            return;
        }

        const baseIndex =
            Math.floor(-mikuZ / this.chunkLength);

        const startIndex =
            baseIndex - this.backwardChunkCount;

        if (this.lastBaseIndex === baseIndex) {
            return;
        }

        this.lastBaseIndex = baseIndex;

        for (let i = 0; i < this.terrainChunks.length; i++) {
            const chunk = this.terrainChunks[i];

            const logicalIndex =
                startIndex + i;

            const centerZ =
                -logicalIndex * this.chunkLength;

            chunk.index = logicalIndex;
            chunk.centerZ = centerZ;

            chunk.group.position.z = centerZ;
            chunk.group.updateMatrixWorld(true);
        }
    }

    updateChunkFades(mikuZ) {
        this.terrainFadeController.updateChunks(
            this.terrainChunks,
            mikuZ
        );
    }

    updateBackgroundMountains(mikuZ) {
        this.backgroundMountainController.update({
            mikuZ,
            frontHorizonGroup: this.frontHorizonGroup,
            backHorizonGroup: this.backHorizonGroup,
            leftMountainGroup: this.leftMountainGroup,
            rightMountainGroup: this.rightMountainGroup
        });
    }

    createWireOverlay(
        geometry,
        color,
        opacity,
        blending = THREE.NormalBlending
    ) {
        return this.wireOverlayFactory.create(
            geometry,
            color,
            opacity,
            blending
        );
    }

    getLandObjects() {
        return this.landObjects;
    }

    getRoot() {
        return this.group;
    }
}