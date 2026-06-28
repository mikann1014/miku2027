import * as THREE from 'three';

export class PathChunkGenerator {
    constructor(terrain) {
        this.terrain = terrain;
    }

    create(chunk) {
        const t = this.terrain;

        const geometry = new THREE.PlaneGeometry(
            t.pathWidth,
            t.chunkLength,
            8,
            48
        );

        geometry.rotateX(-Math.PI / 2);

        const path = new THREE.Mesh(
            geometry,
            t.pathMaterial.clone()
        );

        path.name = `path_chunk_${chunk.index}`;
        path.userData.surfaceType = 'path';
        path.position.set(0, t.pathY, 0);
        path.frustumCulled = false;

        chunk.group.add(path);
        chunk.objects.push(path);
        t.landObjects.push(path);

        t.registerFadeTarget(
            chunk,
            path,
            t.pathBaseOpacity
        );

        const grid = t.createWireOverlay(
            path.geometry,
            t.mainGridColor,
            t.pathGridBaseOpacity,
            THREE.NormalBlending
        );

        grid.name = `path_chunk_${chunk.index}_grid`;
        grid.userData.isWire = true;
        grid.position.copy(path.position);
        grid.renderOrder = 4;

        chunk.group.add(grid);

        t.registerFadeTarget(
            chunk,
            grid,
            t.pathGridBaseOpacity
        );

        this.addNeonLines(chunk);
    }

    addNeonLines(chunk) {
        const t = this.terrain;

        const half = t.chunkLength * 0.5;

        const xs = [
            -t.pathWidth * 0.5,
            -0.65,
            0.65,
            t.pathWidth * 0.5
        ];

        xs.forEach((x, index) => {
            const material = new THREE.LineBasicMaterial({
                color: 0x005f7a,
                transparent: true,
                opacity: t.pathNeonBaseOpacity,
                blending: THREE.NormalBlending,
                depthWrite: false,
                depthTest: true
            });

            const points = [
                new THREE.Vector3(
                    x,
                    t.pathY + 0.035,
                    -half
                ),
                new THREE.Vector3(
                    x,
                    t.pathY + 0.035,
                    half
                )
            ];

            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(points),
                material
            );

            line.name = `path_chunk_${chunk.index}_neon_${index}`;
            line.userData.isWire = true;

            chunk.group.add(line);

            t.registerFadeTarget(
                chunk,
                line,
                t.pathNeonBaseOpacity
            );
        });
    }
}