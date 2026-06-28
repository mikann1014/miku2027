import * as THREE from 'three';

export class SteppingStoneGenerator {
    constructor(terrain) {
        this.terrain = terrain;
    }

    create(chunk) {
        const t = this.terrain;

        const count = 5;
        const seed = chunk.index * 3.71;

        for (let i = 0; i < count; i++) {
            const progress = i / Math.max(count - 1, 1);
            const side = i % 2 === 0 ? -1 : 1;

            const x =
                side *
                (
                    13 +
                    Math.sin(seed + i * 1.2) * 4
                );

            const z =
                THREE.MathUtils.lerp(
                    -t.chunkLength * 0.36,
                    t.chunkLength * 0.36,
                    progress
                );

            const radius =
                1.9 + Math.sin(seed + i * 0.8) * 0.28;

            const geometry = new THREE.CylinderGeometry(
                radius,
                radius * 0.92,
                0.16,
                18
            );

            const material = new THREE.MeshBasicMaterial({
                color: 0x0c1717,
                transparent: true,
                opacity: t.stoneBaseOpacity,
                depthWrite: true,
                depthTest: true,
                side: THREE.DoubleSide,
                toneMapped: false
            });

            const stone = new THREE.Mesh(
                geometry,
                material
            );

            stone.name =
                `ground_stepping_stone_chunk_${chunk.index}_${i}`;

            stone.userData.surfaceType = 'ground';

            stone.position.set(
                x,
                t.waterY + 0.1,
                z
            );

            stone.frustumCulled = false;

            chunk.group.add(stone);
            chunk.objects.push(stone);
            t.landObjects.push(stone);

            t.registerFadeTarget(
                chunk,
                stone,
                t.stoneBaseOpacity
            );

            const wire = t.createWireOverlay(
                stone.geometry,
                0x776655,
                t.stoneWireBaseOpacity,
                THREE.NormalBlending
            );

            wire.name = `${stone.name}_wire`;
            wire.userData.isWire = true;
            wire.position.copy(stone.position);
            wire.rotation.copy(stone.rotation);

            chunk.group.add(wire);

            t.registerFadeTarget(
                chunk,
                wire,
                t.stoneWireBaseOpacity
            );
        }
    }
}
``