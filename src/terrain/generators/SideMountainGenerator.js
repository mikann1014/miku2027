import * as THREE from 'three';

export class SideMountainGenerator {
    constructor(terrain) {
        this.terrain = terrain;
    }

    create(side) {
    const t = this.terrain;

    const group =
        new THREE.Group();

    group.name =
        `ground_${side}_mountains_follow_group`;

    const isLeft =
        side === 'left';

    const xInner =
        isLeft
            ? -t.halfWaterWidth + 22
            : t.halfWaterWidth - 22;

    const xOuter =
        isLeft
            ? -t.halfWaterWidth - 58
            : t.halfWaterWidth + 58;

    const geometry =
        this.createGeometry({
            xMin: Math.min(xInner, xOuter),
            xMax: Math.max(xInner, xOuter),
            zMin: -t.sideMountainLength * 0.5,
            zMax: t.sideMountainLength * 0.5,
            segmentX: 24,
            segmentZ: 260,
            side
        });

    const material =
        new THREE.MeshBasicMaterial({
            color: 0x050f0d,
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            toneMapped: false
        });

    const mountain =
        new THREE.Mesh(
            geometry,
            material
        );

    mountain.name =
        `ground_${side}_mountains`;

    /*
     * 重要:
     * groundではなくmountain。
     */
    mountain.userData.surfaceType = 'mountain';
    mountain.userData.isMountainSurface = true;
    mountain.userData.isMovingTerrainAnchor = true;

    mountain.frustumCulled = false;

    group.add(
        mountain
    );

    /*
     * 重要:
     * クリック配置対象へ登録。
     */
    if (Array.isArray(t.landObjects)) {
        t.landObjects.push(
            mountain
        );
    }

    const wire =
        t.createWireOverlay(
            mountain.geometry,
            0x00664d,
            0.26,
            THREE.NormalBlending
        );

    wire.name =
        `ground_${side}_mountains_wire`;

    wire.userData.isWire = true;
    wire.userData.surfaceType = 'mountainWire';

    group.add(
        wire
    );

    t.group.add(
        group
    );

    return group;
}

    createGeometry({
        xMin,
        xMax,
        zMin,
        zMax,
        segmentX,
        segmentZ,
        side
    }) {
        const t = this.terrain;

        const vertices = [];
        const indices = [];

        for (let iz = 0; iz <= segmentZ; iz++) {
            const vz = iz / segmentZ;

            const z =
                THREE.MathUtils.lerp(zMax, zMin, vz);

            for (let ix = 0; ix <= segmentX; ix++) {
                const vx = ix / segmentX;

                const x =
                    THREE.MathUtils.lerp(xMin, xMax, vx);

                const edgeShape =
                    this.getShape(vx, side);

                const ridge =
                    this.noise(x, z, side);

                const y =
                    t.sideMountainBaseY +
                    edgeShape *
                    ridge *
                    t.sideMountainHeight;

                vertices.push(x, y, z);
            }
        }

        for (let iz = 0; iz < segmentZ; iz++) {
            for (let ix = 0; ix < segmentX; ix++) {
                const a =
                    iz * (segmentX + 1) + ix;

                const b = a + 1;
                const c = a + segmentX + 1;
                const d = c + 1;

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

    getShape(vx, side) {
        if (side === 'left') {
            return Math.pow(
                THREE.MathUtils.clamp(1.0 - vx, 0, 1),
                0.82
            );
        }

        return Math.pow(
            THREE.MathUtils.clamp(vx, 0, 1),
            0.82
        );
    }

    noise(x, z, side) {
        const seed = side === 'left' ? 1.7 : 3.2;

        const n1 =
            Math.sin(x * 0.075 + z * 0.032 + seed);

        const n2 =
            Math.sin(x * 0.19 - z * 0.047 + seed * 2.1);

        const n3 =
            Math.sin(x * 0.031 + z * 0.085 + seed * 3.7);

        const mixed =
            n1 * 0.48 + n2 * 0.32 + n3 * 0.2;

        return THREE.MathUtils.clamp(
            0.42 + Math.abs(mixed) * 0.78,
            0.18,
            1.15
        );
    }
}