import * as THREE from 'three';

export class HorizonMountainGenerator {
    constructor(terrain) {
        this.terrain = terrain;
    }

   create(direction) {
    const t = this.terrain;

    const group = new THREE.Group();

    group.name =
        `horizon_${direction}_mountain_group`;

    const geometry =
        this.createWideGeometry({
            xMin: -t.halfWaterWidth - 90,
            xMax: t.halfWaterWidth + 90,
            zNear: -65,
            zFar: 65,
            segmentX: 120,
            segmentZ: 18
        });

    const mountain =
        new THREE.Mesh(
            geometry,
            t.horizonMountainMaterial.clone()
        );

    mountain.name =
        `ground_${direction}_horizon_mountains`;

    mountain.userData.surfaceType = 'mountain';
    mountain.userData.isMountainSurface = true;
    mountain.userData.isMovingTerrainAnchor = true;

    mountain.frustumCulled = false;

    group.add(mountain);

    /*
     * Horizon mountain も配置対象として登録する。
     */
    t.landObjects.push(
        mountain
    );

    const wire =
        t.createWireOverlay(
            mountain.geometry,
            0x112222,
            0.14,
            THREE.NormalBlending
        );

    wire.name =
        `ground_${direction}_horizon_mountains_wire`;

    wire.userData.isWire = true;
    wire.userData.surfaceType = 'mountainWire';

    group.add(wire);

    const ridge =
        this.createRidgeLine(
            direction,
            geometry
        );

    group.add(ridge);

    t.group.add(group);

    return group;
}

    createWideGeometry({
        xMin,
        xMax,
        zNear,
        zFar,
        segmentX,
        segmentZ
    }) {
        const t = this.terrain;

        const vertices = [];
        const indices = [];

        for (let iz = 0; iz <= segmentZ; iz++) {
            const vz = iz / segmentZ;

            const z =
                THREE.MathUtils.lerp(zNear, zFar, vz);

            for (let ix = 0; ix <= segmentX; ix++) {
                const vx = ix / segmentX;

                const x =
                    THREE.MathUtils.lerp(xMin, xMax, vx);

                const sideRise = Math.pow(
                    Math.abs(vx - 0.5) * 2.0,
                    1.45
                );

                const broad =
                    Math.sin(vx * Math.PI * 1.15 + 0.4) * 0.35 +
                    Math.sin(vx * Math.PI * 2.1 + 1.7) * 0.18;

                const ridgeHeight =
                    t.horizonMountainHeight *
                    THREE.MathUtils.clamp(
                        0.28 + sideRise * 0.55 + broad,
                        0.12,
                        1.0
                    );

                const depthShape =
                    Math.pow(vz, 0.85);

                const y =
                    t.horizonMountainBaseY +
                    ridgeHeight * depthShape;

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

    createRidgeLine(direction, geometry) {
        const position = geometry.attributes.position;
        const points = [];

        const segmentX = 120;
        const segmentZ = 18;
        const row = segmentZ;

        for (let ix = 0; ix <= segmentX; ix++) {
            const index =
                row * (segmentX + 1) + ix;

            const x = position.getX(index);
            const y = position.getY(index) + 0.08;
            const z = position.getZ(index);

            points.push(
                new THREE.Vector3(x, y, z)
            );
        }

        const material = new THREE.LineBasicMaterial({
            color: 0x1a3030,
            transparent: true,
            opacity: 0.14,
            blending: THREE.NormalBlending,
            depthWrite: false,
            depthTest: true
        });

        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            material
        );

        line.name =
            `ground_${direction}_horizon_ridge_line`;

        line.userData.isWire = true;

        return line;
    }
}