import * as THREE from 'three';

export class ClusterQueueProcessor {
    constructor(options = {}) {
        this.spawnManager = options.spawnManager;
        this.surfacePicker = options.surfacePicker;
        this.clusterPlacement = options.clusterPlacement;
        this.registry = options.registry;
        this.aligner = options.aligner;

        this.registerPlacedObject = options.registerPlacedObject;

        this.yOffset = options.yOffset ?? 0.03;
        this.waterYOffset = options.waterYOffset ?? 0.06;

        this.placePerFrame = options.placePerFrame ?? 3;

        // クラスター内の距離判定は通常配置より緩くする。
        // これが大きすぎると中心オブジェクトの周囲が全部弾かれて1個だけになる。
        this.clusterMinSpacing = options.clusterMinSpacing ?? 0.18;

        this.queue = [];
        this.isProcessing = false;
    }

    pushTasks(tasks) {
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return;
        }

        this.queue.push(...tasks);
        this.process();
    }

    process() {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        const processFrame = () => {
            let processedThisFrame = 0;

            while (
                this.queue.length > 0 &&
                processedThisFrame < this.placePerFrame
            ) {
                const task =
                    this.queue.shift();

                if (task) {
                    this.placeTask(task);
                }

                processedThisFrame++;
            }

            if (this.queue.length > 0) {
                requestAnimationFrame(processFrame);
            } else {
                this.isProcessing = false;
            }
        };

        requestAnimationFrame(processFrame);
    }

    placeTask(task) {
    if (!task) {
        return;
    }

    if (task.type === 'water') {
        this.placeWaterTask(task);
        return;
    }

    if (task.type === 'mountain') {
        this.placeGroundTask(task, 'mountain');
        return;
    }

    this.placeGroundTask(task, 'ground');
}

    placeGroundTask(task, requiredSurfaceType = 'ground') {
    const {
        placementData,
        centerPoint,
        landObjects,
        placedPositions
    } = task;

    if (!this.hasRequiredDependencies()) {
        console.warn(
            '[ClusterQueueProcessor] Missing dependency.'
        );
        return;
    }

    const surfaceHit =
        this.surfacePicker.sampleTopSurfaceAt(
            placementData.position.x,
            placementData.position.z,
            centerPoint.y,
            landObjects
        );

    if (
        !surfaceHit ||
        surfaceHit.surfaceType !== requiredSurfaceType
    ) {
        return;
    }

    const spawnPoint =
        surfaceHit.point.clone();

    if (
        this.isTooCloseToExistingPlacedObjects(
            spawnPoint,
            this.clusterMinSpacing
        )
    ) {
        return;
    }

    if (
        this.clusterPlacement.isTooCloseToCluster(
            spawnPoint,
            placedPositions
        )
    ) {
        return;
    }

    const object =
        this.spawnManager.spawn(
            placementData.id,
            spawnPoint,
            {
                scaleMultiplier:
                    placementData.scaleMultiplier,
                randomRotation: true,
                surfaceType: requiredSurfaceType
            }
        );

    if (!object) {
        return;
    }

    this.aligner.alignObjectBottomToSurface(
        object,
        spawnPoint,
        this.yOffset
    );

    object.userData.surfaceType =
        requiredSurfaceType;

    this.registerPlacedObject(
        object,
        {
            id: placementData.id,
            surfaceType: requiredSurfaceType,
            bloomable: true,
            isCenter: false,
            surfaceAnchorObject: surfaceHit.object
        }
    );

    placedPositions.push(
        spawnPoint.clone()
    );
}

    placeWaterTask(task) {
    const {
        placementData,
        centerPoint,
        landObjects,
        placedPositions
    } = task;

    if (!this.hasRequiredDependencies()) {
        console.warn(
            '[ClusterQueueProcessor] Missing dependency.'
        );
        return;
    }

    const surfaceHit =
        this.surfacePicker.sampleTopSurfaceAt(
            placementData.position.x,
            placementData.position.z,
            centerPoint.y,
            landObjects
        );

    if (
        !surfaceHit ||
        surfaceHit.surfaceType !== 'water'
    ) {
        return;
    }

    const spawnPoint =
        surfaceHit.point.clone();

    if (
        this.isTooCloseToExistingPlacedObjects(
            spawnPoint,
            this.clusterMinSpacing
        )
    ) {
        return;
    }

    if (
        this.clusterPlacement.isTooCloseToCluster(
            spawnPoint,
            placedPositions
        )
    ) {
        return;
    }

    const object =
        this.spawnManager.spawn(
            placementData.id,
            spawnPoint,
            {
                scaleMultiplier:
                    placementData.scaleMultiplier,
                randomRotation: true,
                surfaceType: 'water'
            }
        );

    if (!object) {
        return;
    }

    this.aligner.alignObjectBottomToSurface(
        object,
        spawnPoint,
        this.waterYOffset
    );

    object.userData.surfaceType = 'water';

    this.registerPlacedObject(
        object,
        {
            id: placementData.id,
            surfaceType: 'water',
            bloomable: true,
            isCenter: false,
            surfaceAnchorObject: surfaceHit.object
        }
    );

    placedPositions.push(
        spawnPoint.clone()
    );
}

    hasRequiredDependencies() {
        return !!(
            this.spawnManager &&
            this.surfacePicker &&
            this.clusterPlacement &&
            this.registry &&
            this.aligner &&
            typeof this.registerPlacedObject === 'function'
        );
    }

    isTooCloseToExistingPlacedObjects(targetPoint, minSpacing) {
        const objects =
            typeof this.registry.getAll === 'function'
                ? this.registry.getAll()
                : [];

        for (const existingObject of objects) {
            if (!existingObject) continue;

            const dx =
                existingObject.position.x - targetPoint.x;

            const dz =
                existingObject.position.z - targetPoint.z;

            const distance =
                Math.sqrt(dx * dx + dz * dz);

            if (distance < minSpacing) {
                return true;
            }
        }

        return false;
    }

    clear() {
        this.queue = [];
        this.isProcessing = false;
    }
}