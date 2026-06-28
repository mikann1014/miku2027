import * as THREE from 'three';

export class WaterChunkGenerator {
    constructor(terrain) {
        this.terrain = terrain;
    }

    create(chunk) {
        const t = this.terrain;

        const geometry = new THREE.PlaneGeometry(
            t.waterWidth,
            t.chunkLength,
            48,
            48
        );

        geometry.rotateX(-Math.PI / 2);

        const water = new THREE.Mesh(
            geometry,
            t.waterMaterial.clone()
        );

        water.name = `water_chunk_${chunk.index}`;
        water.userData.surfaceType = 'water';
        water.position.set(0, t.waterY, 0);
        water.renderOrder = -20;
        water.frustumCulled = false;

        chunk.group.add(water);
        chunk.objects.push(water);
        t.landObjects.push(water);

        t.registerFadeTarget(
            chunk,
            water,
            t.waterBaseOpacity
        );

        const grid = t.createWireOverlay(
            water.geometry,
            t.waterGridColor,
            t.waterGridBaseOpacity,
            THREE.NormalBlending
        );

        grid.name = `water_chunk_${chunk.index}_grid`;
        grid.userData.isWire = true;
        grid.position.copy(water.position);
        grid.renderOrder = -19;

        chunk.group.add(grid);

        t.registerFadeTarget(
            chunk,
            grid,
            t.waterGridBaseOpacity
        );
    }
}