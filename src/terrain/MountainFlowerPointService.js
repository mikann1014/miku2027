import * as THREE from 'three';

export class MountainFlowerPointService {
    constructor(options = {}) {
        this.defaultCount =
            options.defaultCount ?? 360;

        this.minForwardDistance =
            options.minForwardDistance ?? 55;

        this.maxForwardDistance =
            options.maxForwardDistance ?? 620;

        this.minSideDistance =
            options.minSideDistance ?? 46;

        this.maxSideDistance =
            options.maxSideDistance ?? 165;
    }

    createSideMountainBatches({
        leftMountainGroup,
        rightMountainGroup,
        count = this.defaultCount
    } = {}) {
        const batches = [];

        const halfCount =
            Math.floor(count / 2);

        if (leftMountainGroup) {
            batches.push({
                name: 'left_mountain_flower_points',
                anchor: leftMountainGroup,
                points: this.createPointsForSide({
                    side: -1,
                    count: halfCount
                })
            });
        }

        if (rightMountainGroup) {
            batches.push({
                name: 'right_mountain_flower_points',
                anchor: rightMountainGroup,
                points: this.createPointsForSide({
                    side: 1,
                    count: count - halfCount
                })
            });
        }

        return batches.filter(batch => {
            return (
                batch.anchor &&
                Array.isArray(batch.points) &&
                batch.points.length > 0
            );
        });
    }

    createPointsForSide({
        side,
        count
    }) {
        const points = [];

        for (let i = 0; i < count; i++) {
            const distanceFromCenter =
                THREE.MathUtils.lerp(
                    this.minSideDistance,
                    this.maxSideDistance,
                    Math.random()
                );

            /*
             * 山Groupのローカル座標。
             * group.position.z = mikuZ なので、
             * ローカルzは「ミクより前方方向」を負の値で作る。
             */
            const x =
                side * distanceFromCenter;

            const z =
                -THREE.MathUtils.lerp(
                    this.minForwardDistance,
                    this.maxForwardDistance,
                    Math.random()
                );

            const y =
                this.estimateSideMountainY(
                    x,
                    z
                );

            points.push(
                new THREE.Vector3(
                    x,
                    y,
                    z
                )
            );
        }

        return points;
    }

    estimateSideMountainY(x, z) {
        /*
         * SideMountainGenerator の見た目に近い簡易式。
         * Raycastしないので軽い。
         */
        const normalizedSide =
            THREE.MathUtils.clamp(
                (Math.abs(x) - 38) / 150,
                0,
                1
            );

        const ridgeFactor =
            Math.pow(
                normalizedSide,
                0.84
            );

        const wave =
            Math.sin(z * 0.024 + x * 0.038) * 0.8 +
            Math.sin(z * 0.011 - x * 0.077) * 0.45;

        /*
         * 山面より少し上に見えるよう高めにする。
         */
        return (
            1.4 +
            ridgeFactor * 10.5 +
            Math.abs(wave) +
            Math.random() * 1.45
        );
    }
}