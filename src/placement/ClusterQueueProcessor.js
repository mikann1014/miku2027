import * as THREE from 'three';

/**
 * ClusterQueueProcessor
 *
 * ・クラスタ配置をフレーム分割して安全に行う
 *
 * 役割：
 * - 一度に大量spawnしない（パフォーマンス保護）
 * - requestAnimationFrameで分割処理
 * - 配置距離・密度制御
 *
 * 特徴：
 * キュー型非同期配置
 * 地形に応じて water / ground / mountain 分岐
 */
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

        // 1フレームで何個置くか
        this.placePerFrame = options.placePerFrame ?? 3;

        /**
         * クラスタ内部間隔
         * 通常配置より緩い
         */
        this.clusterMinSpacing = options.clusterMinSpacing ?? 0.18;

        this.queue = [];
        this.isProcessing = false;
    }


    /**
     * タスク追加
     */
    pushTasks(tasks) {

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return;
        }

        this.queue.push(...tasks);

        this.process();
    }


    /**
     * =========================
     * フレーム分割処理
     * =========================
     */
    process() {

        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        const processFrame = () => {

            let processedThisFrame = 0;

            // ---- フレーム内処理 ----
            while (
                this.queue.length > 0 &&
                processedThisFrame < this.placePerFrame
            ) {

                const task = this.queue.shift();

                if (task) {
                    this.placeTask(task);
                }

                processedThisFrame++;
            }

            // ---- 継続 ----
            if (this.queue.length > 0) {
                requestAnimationFrame(processFrame);
            } else {
                this.isProcessing = false;
            }
        };

        requestAnimationFrame(processFrame);
    }


    /**
     * タスク振り分け
     */
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

        // default = ground
        this.placeGroundTask(task, 'ground');
    }


    /**
     * =========================
     * 地面／山タスク
     * =========================
     */
    placeGroundTask(task, requiredSurfaceType = 'ground') {

        const {
            placementData,
            centerPoint,
            landObjects,
            placedPositions
        } = task;

        if (!this.hasRequiredDependencies()) {
            console.warn('[ClusterQueueProcessor] Missing dependency.');
            return;
        }

        // --- 地形サンプリング ---
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

        /**
         * 既存オブジェクトとの距離チェック
         */
        if (
            this.isTooCloseToExistingPlacedObjects(
                spawnPoint,
                this.clusterMinSpacing
            )
        ) {
            return;
        }

        /**
         * クラスタ内部距離チェック
         */
        if (
            this.clusterPlacement.isTooCloseToCluster(
                spawnPoint,
                placedPositions
            )
        ) {
            return;
        }

        // --- 生成 ---
        const object =
            this.spawnManager.spawn(
                placementData.id,
                spawnPoint,
                {
                    scaleMultiplier: placementData.scaleMultiplier,
                    randomRotation: true,
                    surfaceType: requiredSurfaceType
                }
            );

        if (!object) {
            return;
        }

        // --- 地形フィット ---
        this.aligner.alignObjectBottomToSurface(
            object,
            spawnPoint,
            this.yOffset
        );

        object.userData.surfaceType =
            requiredSurfaceType;

        // --- 登録（非常に重要） ---
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

        placedPositions.push(spawnPoint.clone());
    }


    /**
     * =========================
     * 水面タスク
     * =========================
     */
    placeWaterTask(task) {

        const {
            placementData,
            centerPoint,
            landObjects,
            placedPositions
        } = task;

        if (!this.hasRequiredDependencies()) {
            console.warn('[ClusterQueueProcessor] Missing dependency.');
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
                    scaleMultiplier: placementData.scaleMultiplier,
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

        placedPositions.push(spawnPoint.clone());
    }


    /**
     * 依存チェック
     */
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


    /**
     * 既存配置との距離チェック
     */
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


    /**
     * キュークリア
     */
    clear() {

        this.queue = [];
        this.isProcessing = false;
    }
}