import * as THREE from 'three';

export class ClusterPlacement {
    constructor(spawnManager, options = {}) {
        this.spawnManager = spawnManager;

        // 中央に置く代表オブジェクトの大きさ
        this.centerScale = options.centerScale ?? 1.25;

        // 周囲に置く小さいオブジェクト数
        // 代表1個 + 周囲 min/max 個
        this.minCount = options.minCount ?? 5;
        this.maxCount = options.maxCount ?? 8;

        // 群生の広がり
        this.minRadius = options.minRadius ?? 0.85;
        this.maxRadius = options.maxRadius ?? 3.2;

        // 周囲オブジェクトのサイズ
        this.smallScaleMin = options.smallScaleMin ?? 0.32;
        this.smallScaleMax = options.smallScaleMax ?? 0.62;

        // 周囲オブジェクトに「選択中オブジェクト」が出る割合
        // 約1/3
        this.selectedRatio = options.selectedRatio ?? 1 / 3;

        // 群生内部の最小間隔
        this.internalSpacing = options.internalSpacing ?? 0.34;

        this.clusterObjectIds = options.clusterObjectIds ?? [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ];
    }

    createClusterTasks(centerPoint, selectedId, count = null) {
        const actualCount =
            count ??
            this.randomInt(
                this.minCount,
                this.maxCount
            );

        const tasks = [];
        const localPositions = [];

        let attempts = 0;
        const maxAttempts = actualCount * 8;

        while (
            tasks.length < actualCount &&
            attempts < maxAttempts
        ) {
            attempts++;

            const placementData =
                this.createRandomClusterPlacement(
                    centerPoint,
                    selectedId
                );

            if (
                this.isTooCloseToCluster(
                    placementData.position,
                    localPositions
                )
            ) {
                continue;
            }

            localPositions.push(
                placementData.position.clone()
            );

            tasks.push(
                placementData
            );
        }

        return tasks;
    }

    createRandomClusterPlacement(centerPoint, selectedId) {
        const angle =
            Math.random() * Math.PI * 2;

        const radius =
            THREE.MathUtils.lerp(
                this.minRadius,
                this.maxRadius,
                Math.sqrt(Math.random())
            );

        const position =
            new THREE.Vector3(
                centerPoint.x + Math.cos(angle) * radius,
                centerPoint.y,
                centerPoint.z + Math.sin(angle) * radius
            );

        const id =
            this.chooseClusterObjectId(
                selectedId
            );

        const scaleMultiplier =
            THREE.MathUtils.lerp(
                this.smallScaleMin,
                this.smallScaleMax,
                Math.random()
            );

        return {
            id,
            position,
            scaleMultiplier
        };
    }

    chooseClusterObjectId(selectedId) {
        const availableIds =
            this.getAvailableClusterObjectIds();

        if (availableIds.length === 0) {
            return selectedId;
        }

        const selectedAvailable =
            availableIds.includes(selectedId);

        // 約1/3は選択中オブジェクト
        if (
            selectedAvailable &&
            Math.random() < this.selectedRatio
        ) {
            return selectedId;
        }

        // 残り約2/3は選択中以外からランダム
        const otherIds =
            availableIds.filter(id => {
                return id !== selectedId;
            });

        if (otherIds.length === 0) {
            return selectedAvailable
                ? selectedId
                : availableIds[
                    Math.floor(Math.random() * availableIds.length)
                ];
        }

        return otherIds[
            Math.floor(Math.random() * otherIds.length)
        ];
    }

    getAvailableClusterObjectIds() {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.hasModel !== 'function'
        ) {
            return [...this.clusterObjectIds];
        }

        return this.clusterObjectIds.filter(id => {
            return this.spawnManager.hasModel(id);
        });
    }

    isTooCloseToCluster(targetPoint, placedPositions) {
        if (!Array.isArray(placedPositions)) {
            return false;
        }

        for (const point of placedPositions) {
            if (!point) continue;

            const dx =
                point.x - targetPoint.x;

            const dz =
                point.z - targetPoint.z;

            const distance =
                Math.sqrt(dx * dx + dz * dz);

            if (distance < this.internalSpacing) {
                return true;
            }
        }

        return false;
    }

    randomInt(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }
}