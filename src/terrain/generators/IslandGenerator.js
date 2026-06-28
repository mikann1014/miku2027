import * as THREE from 'three';

export class IslandGenerator {
    constructor(terrain) {
        this.terrain = terrain;
    }

    create(chunk) {
        const t = this.terrain;
        const seed = chunk.index * 17.13;

        const configs = [
            {
                x: -38 + Math.sin(seed) * 3,
                z: -t.chunkLength * 0.28,
                rx: 17,
                rz: 25,
                height: 1.1
            },
            {
                x: 40 + Math.cos(seed * 0.7) * 3,
                z: t.chunkLength * 0.22,
                rx: 18,
                rz: 27,
                height: 1.2
            },
            {
                x: -62 + Math.cos(seed * 0.4) * 2,
                z: t.chunkLength * 0.42,
                rx: 20,
                rz: 32,
                height: 1.3
            },
            {
                x: 63 + Math.sin(seed * 0.5) * 2,
                z: -t.chunkLength * 0.4,
                rx: 21,
                rz: 34,
                height: 1.35
            }
        ];

        configs.forEach((config, index) => {
            this.createIsland(
                chunk,
                config,
                index
            );
        });
    }

    createIsland(chunk, config, localIndex) {
        const t = this.terrain;

        const geometry = this.createOvalGroundGeometry({
            rx: config.rx,
            rz: config.rz,
            height: config.height,
            rings: 8,
            segments: 36,
            seed: chunk.index * 1.7 + localIndex * 2.3
        });

        const island = new THREE.Mesh(
            geometry,
            t.groundMaterial.clone()
        );

        island.name =
            `ground_island_chunk_${chunk.index}_${localIndex}`;

        island.userData.surfaceType = 'ground';
        island.position.set(
            config.x,
            t.groundY,
            config.z
        );

        island.frustumCulled = false;

        chunk.group.add(island);
        chunk.objects.push(island);
        t.landObjects.push(island);

        t.registerFadeTarget(
            chunk,
            island,
            t.groundBaseOpacity
        );

        const wire = t.createWireOverlay(
            island.geometry,
            t.groundGridColor,
            t.groundWireBaseOpacity,
            THREE.NormalBlending
        );

        wire.name = `${island.name}_wire`;
        wire.userData.isWire = true;
        wire.position.copy(island.position);
        wire.renderOrder = 3;

        chunk.group.add(wire);

        t.registerFadeTarget(
            chunk,
            wire,
            t.groundWireBaseOpacity
        );
    }

    createOvalGroundGeometry({
        rx,
        rz,
        height,
        rings,
        segments,
        seed
    }) {
        const vertices = [];
        const indices = [];

        vertices.push(0, height, 0);

        for (let r = 1; r <= rings; r++) {
            const t = r / rings;

            for (let s = 0; s < segments; s++) {
                const angle =
                    (s / segments) * Math.PI * 2;

                const x =
                    Math.cos(angle) * rx * t;

                const z =
                    Math.sin(angle) * rz * t;

                const edge = 1.0 - t;
                const dome = Math.pow(edge, 0.45);

                const noise =
                    Math.sin(x * 0.32 + seed) *
                    Math.sin(z * 0.18 + seed * 2.0) *
                    0.08;

                const y =
                    dome * height + noise;

                vertices.push(x, y, z);
            }
        }

        for (let s = 0; s < segments; s++) {
            const a = 0;
            const b = 1 + s;
            const c = 1 + ((s + 1) % segments);

            indices.push(a, b, c);
        }

        for (let r = 1; r < rings; r++) {
            const currentStart =
                1 + (r - 1) * segments;

            const nextStart =
                1 + r * segments;

            for (let s = 0; s < segments; s++) {
                const a = currentStart + s;
                const b =
                    currentStart + ((s + 1) % segments);
                const c = nextStart + s;
                const d =
                    nextStart + ((s + 1) % segments);

                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
                vertices,
                3
            )
        );

        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
    }
}