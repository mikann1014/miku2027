import * as THREE from 'three';

export class PlacementRules {
    constructor(options = {}) {
        this.allowAllObjectsOnWater =
            options.allowAllObjectsOnWater ?? true;

        this.maxSlopeDegrees =
            options.maxSlopeDegrees ?? 55;

        this.clusterObjectIds = options.clusterObjectIds ?? [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ];
    }

    canPlaceOnWater(id) {
        if (this.allowAllObjectsOnWater) {
            return true;
        }

        return id === 'Leaf';
    }

    canUseClusterPlacement(id) {
        return this.clusterObjectIds.includes(id);
    }

    validateInitialSurface(hit, id) {
        if (!hit || !hit.object) {
            return {
                ok: false,
                reason: 'No surface hit.'
            };
        }

        const surfaceType = hit.object.userData.surfaceType;

        if (surfaceType === 'path') {
            return {
                ok: false,
                reason: 'Top surface is path.'
            };
        }

        if (surfaceType === 'water') {
            if (!this.canPlaceOnWater(id)) {
                return {
                    ok: false,
                    reason: `${id} cannot be placed on water.`
                };
            }

            return {
                ok: true,
                surfaceType
            };
        }

        if (surfaceType === 'ground') {
            if (id === 'Leaf') {
                return {
                    ok: false,
                    reason: 'Leaf can only be placed on water.'
                };
            }

            if (!this.isSlopePlaceable(hit)) {
                return {
                    ok: false,
                    reason: 'Slope is too steep.'
                };
            }

            return {
                ok: true,
                surfaceType
            };
        }

        return {
            ok: false,
            reason: `Unsupported surface type: ${surfaceType}`
        };
    }

    isSlopePlaceable(hit) {
        if (!hit || !hit.face || !hit.object) {
            return true;
        }

        const localNormal = hit.face.normal.clone();

        const normalMatrix = new THREE.Matrix3().getNormalMatrix(
            hit.object.matrixWorld
        );

        const worldNormal = localNormal
            .applyMatrix3(normalMatrix)
            .normalize();

        const up = new THREE.Vector3(0, 1, 0);

        const dot = THREE.MathUtils.clamp(
            worldNormal.dot(up),
            -1,
            1
        );

        const slopeRadians = Math.acos(dot);
        const slopeDegrees = THREE.MathUtils.radToDeg(slopeRadians);

        return slopeDegrees <= this.maxSlopeDegrees;
    }
}