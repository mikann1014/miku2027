import { SurfacePicker } from '../placement/SurfacePicker.js';
import { PlacementRules } from '../placement/PlacementRules.js';
import { ClusterPlacement } from '../placement/ClusterPlacement.js';
import { PlacedObjectRegistry } from '../placement/PlacedObjectRegistry.js';
import { BloomController } from '../placement/BloomController.js';
import { PlacementAligner } from '../placement/PlacementAligner.js';
import { ClusterQueueProcessor } from '../placement/ClusterQueueProcessor.js';
import { SurfaceAnchorController } from '../placement/SurfaceAnchorController.js';


/**
ジェクト配置の中枢管理クラス * PlacementManager
 * ・地形判定 → 配置方式選択 → 登録 → 補正
 *
 * 主な責務：
 * - surface判定（ground / water / island / mountain）
 * - 単体 or クラスタ配置
 * - registry登録
 * - anchor / depth補正
 */


export class PlacementManager {
    constructor(scene, camera, renderer, spawnManager) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.spawnManager = spawnManager;

        this.minSpacing = 0.75;

        this.yOffset = 0.03;
        this.waterYOffset = 0.06;

        this.footprintSampleRadiusRatio = 0.35;

        this.clusterEnabled = true;
        this.clusterPlacePerFrame = 3;

        this.surfaceAnchorController =
    new SurfaceAnchorController();


        this.surfacePicker =
            new SurfacePicker(
                this.camera,
                this.renderer,
                {
                    sampleRayStartHeight: 80,
                    sampleRayLength: 300
                }
            );

        this.rules =
            new PlacementRules({
                allowAllObjectsOnWater: true,
                maxSlopeDegrees: 55
            });

        this.clusterPlacement =
    new ClusterPlacement(
        this.spawnManager,
        {
            centerScale: 1.1,
            minCount: 7,
            maxCount: 12,
            minRadius: 0.75,
            maxRadius: 3.6,
            smallScaleMin: 0.24,
            smallScaleMax: 0.48,

            selectedRatio: 1 / 3,

            internalSpacing: 0.26
        }
    );

        this.registry =
            new PlacedObjectRegistry({
                minSpacing: this.minSpacing
            });

        this.bloomController =
            new BloomController();

        this.aligner =
            new PlacementAligner(
                this.surfacePicker,
                {
                    footprintSampleRadiusRatio: this.footprintSampleRadiusRatio
                }
            );

        this.clusterQueueProcessor =
            new ClusterQueueProcessor({
                spawnManager: this.spawnManager,
                surfacePicker: this.surfacePicker,
                clusterPlacement: this.clusterPlacement,
                registry: this.registry,
                aligner: this.aligner,

                yOffset: this.yOffset,
                waterYOffset: this.waterYOffset,
                placePerFrame: this.clusterPlacePerFrame,
                clusterMinSpacing: 0.18,

                registerPlacedObject: (object, metadata) => {
                    this.registerPlacedObject(
                        object,
                        metadata
                    );
                }
            });
    }

    handlePlaceItem(event, id, landObjects) {
    const hit =
        this.surfacePicker.pickFromPointer(
            event,
            landObjects
        );

    if (!hit) {
        console.log('[Placement Denied] No surface hit.');
        return;
    }

    const resolvedSurfaceType =
        this.resolveSurfaceTypeFromHit(
            hit,
            'ground'
        );

    if (resolvedSurfaceType === 'water') {
        this.placeOnWater(
            hit,
            id,
            landObjects
        );

        return;
    }

    if (resolvedSurfaceType === 'island') {
        this.placeOnIsland(
            hit,
            id,
            landObjects
        );

        return;
    }

    if (
        resolvedSurfaceType === 'ground' ||
        resolvedSurfaceType === 'mountain' ||
        resolvedSurfaceType === 'path'
    ) {
        this.placeOnGround(
            hit,
            id,
            landObjects,
            resolvedSurfaceType
        );

        return;
    }

    console.log(
        `[Placement Denied] Unsupported surface: ${resolvedSurfaceType}`
    );
}
applyPlacedObjectMaterialRules(object, metadata = {}) {
    // ここでは何もしない。
    // 花の material は元モデルの設定に任せる。
    // ミク透過問題は MikuMaterialApplier 側で解決する。
}

placeOnIsland(hit, id, landObjects = []) {
    const targetPoint =
        hit.point.clone();

    if (
        this.registry.isTooClose(
            targetPoint
        )
    ) {
        return;
    }

    const isFlower =
        String(id || '').startsWith('flower');

    const object =
        this.spawnManager.spawn(
            id,
            targetPoint,
            {
                randomRotation: true,
                surfaceType: 'island',
                scaleMultiplier: isFlower ? 0.85 : 1.0
            }
        );

    if (!object) {
        return;
    }

    this.aligner.alignObjectBottomToSurface(
        object,
        targetPoint,
        this.yOffset
    );

    object.userData.surfaceType = 'island';

    this.registerPlacedObject(
        object,
        {
            id,
            surfaceType: 'island',
            bloomable: this.rules.canUseClusterPlacement(id),
            isCenter: true,
            persistent: true,
            surfaceAnchorObject: hit.object
        }
    );

    this.applyPlacedObjectMaterialRules(
        object,
        {
            id,
            surfaceType: 'island'
        }
    );

    console.log(
        `[Placement Approved] Placed ${id} on island.`
    );
}

    placeOnGround(hit, id, landObjects, resolvedSurfaceType = 'ground') {
    if (
        this.clusterEnabled &&
        this.rules.canUseClusterPlacement(id)
    ) {
        this.placeClusterOnGround(
            hit,
            id,
            landObjects,
            resolvedSurfaceType
        );

        return;
    }

    this.placeSingleOnGround(
        hit,
        id,
        landObjects,
        resolvedSurfaceType
    );
}

    placeOnWater(hit, id, landObjects) {
        if (id === 'Leaf') {
            this.placeSingleOnWater(
                hit,
                id,
                true,
                landObjects
            );
            return;
        }

        if (
            this.clusterEnabled &&
            this.rules.canUseClusterPlacement(id)
        ) {
            this.placeClusterOnWater(
                hit,
                id,
                landObjects
            );
            return;
        }

        this.placeSingleOnWater(
            hit,
            id,
            true,
            landObjects
        );
    }

placeSingleOnGround(hit, id, landObjects, resolvedSurfaceType = 'ground') {
    const targetPoint =
        hit.point.clone();

    if (
        this.registry.isTooClose(
            targetPoint
        )
    ) {
        return;
    }

    const surfaceType =
        resolvedSurfaceType === 'mountain'
            ? 'mountain'
            : this.resolveSurfaceTypeFromHit(
                hit,
                'ground'
            );

    const objectName =
        String(hit.object?.name || '').toLowerCase();

    const parentName =
        String(hit.object?.parent?.name || '').toLowerCase();

    const joinedName =
        `${objectName} ${parentName}`;

    const isExactSurface =
        surfaceType === 'island' ||
        joinedName.includes('stepping_stone') ||
        joinedName.includes('steppingstone') ||
        joinedName.includes('stone_chunk') ||
        joinedName.includes('island') ||
        joinedName.includes('islet') ||
        joinedName.includes('rock');

    const finalSurfaceType =
        isExactSurface
            ? 'island'
            : surfaceType;

    const isFlower =
        String(id || '').startsWith('flower');

    const object =
        this.spawnManager.spawn(
            id,
            targetPoint,
            {
                randomRotation: true,
                surfaceType: finalSurfaceType,
                scaleMultiplier: isFlower ? 0.7 : 1.0
            }
        );

    if (!object) {
        return;
    }

    if (
        finalSurfaceType === 'island' ||
        finalSurfaceType === 'mountain'
    ) {
        this.aligner.alignObjectBottomToSurface(
            object,
            targetPoint,
            this.yOffset
        );
    } else {
        this.aligner.alignObjectBottomToBestGroundHeight(
            object,
            targetPoint,
            landObjects,
            this.yOffset
        );
    }

    object.userData.surfaceType =
        finalSurfaceType;

    this.registerPlacedObject(
        object,
        {
            id,
            surfaceType: finalSurfaceType,
            bloomable: this.rules.canUseClusterPlacement(id),
            isCenter: true,
            persistent: true,

            /*
             * 最重要:
             * 花を山/小島/水面メッシュのローカル座標に固定する。
             */
            surfaceAnchorObject: hit.object
        }
    );

    console.log(
        `[Placement Approved] Placed ${id} on ${finalSurfaceType}.`
    );
}
    placeClusterOnGround(hit, selectedId, landObjects, resolvedSurfaceType = 'ground') {
    const centerPoint =
        hit.point.clone();

    if (
        this.registry.isTooClose(
            centerPoint
        )
    ) {
        return;
    }

    const surfaceType =
        resolvedSurfaceType === 'mountain'
            ? 'mountain'
            : this.resolveSurfaceTypeFromHit(
                hit,
                'ground'
            );

    const placedPositions = [];

    const centerObject =
        this.spawnManager.spawn(
            selectedId,
            centerPoint,
            {
                scaleMultiplier: this.clusterPlacement.centerScale,
                randomRotation: true,
                surfaceType
            }
        );

    if (centerObject) {
        if (surfaceType === 'mountain') {
            this.aligner.alignObjectBottomToSurface(
                centerObject,
                centerPoint,
                this.yOffset
            );
        } else {
            this.aligner.alignObjectBottomToBestGroundHeight(
                centerObject,
                centerPoint,
                landObjects,
                this.yOffset
            );
        }

        centerObject.userData.surfaceType =
            surfaceType;

        this.registerPlacedObject(
            centerObject,
            {
                id: selectedId,
                surfaceType,
                bloomable: true,
                isCenter: true,
                surfaceAnchorObject: hit.object
            }
        );

        placedPositions.push(
            centerPoint.clone()
        );
    }

    const tasks =
        this.clusterPlacement
            .createClusterTasks(
                centerPoint,
                selectedId
            )
            .map(placementData => ({
                type: surfaceType === 'mountain'
                    ? 'mountain'
                    : 'ground',
                placementData,
                centerPoint: centerPoint.clone(),
                landObjects,
                placedPositions
            }));

    this.clusterQueueProcessor.pushTasks(
        tasks
    );

    console.log(
        `[Placement Approved] ${surfaceType} cluster started. selected=${selectedId}, planned=${tasks.length + 1}`
    );
}

placeSingleOnWater(hit, id, shouldSpawnRipple = true, landObjects = []) {
    const targetPoint =
        hit.point.clone();

    if (
        this.registry.isTooClose(
            targetPoint
        )
    ) {
        return;
    }

    const isFlower =
        String(id || '').startsWith('flower');

    const object =
        this.spawnManager.spawn(
            id,
            targetPoint,
            {
                randomRotation: true,
                surfaceType: 'water',
                scaleMultiplier: isFlower ? 0.3 : 1.0
            }
        );

    if (!object) {
        return;
    }

    this.aligner.alignObjectBottomToSurface(
        object,
        targetPoint,
        this.waterYOffset
    );

    object.userData.surfaceType = 'water';

    this.registerPlacedObject(
        object,
        {
            id,
            surfaceType: 'water',
            bloomable: this.rules.canUseClusterPlacement(id),
            isCenter: true,
            persistent: true,
            surfaceAnchorObject: hit.object
        }
    );

    if (shouldSpawnRipple) {
        this.spawnRepresentativeRipple(
            targetPoint,
            id,
            landObjects
        );
    }

    console.log(
        `[Placement Approved] Placed ${id} on water.`
    );
}
    placeClusterOnWater(hit, selectedId, landObjects) {
        const centerPoint =
            hit.point.clone();

        if (
            this.registry.isTooClose(
                centerPoint
            )
        ) {
            return;
        }

        const placedPositions = [];

        const centerObject =
            this.spawnManager.spawn(
                selectedId,
                centerPoint,
                {
                    scaleMultiplier: this.clusterPlacement.centerScale,
                    randomRotation: true
                }
            );

        if (centerObject) {
            this.aligner.alignObjectBottomToSurface(
                centerObject,
                centerPoint,
                this.waterYOffset
            );

            this.registerPlacedObject(
                centerObject,
                {
                    id: selectedId,
                    surfaceType: 'water',
                    bloomable: true,
                    isCenter: true
                }
            );

            placedPositions.push(
                centerPoint.clone()
            );

            this.spawnRepresentativeRipple(
                centerPoint,
                selectedId,
                landObjects
            );
        }

        const tasks =
            this.clusterPlacement
                .createClusterTasks(
                    centerPoint,
                    selectedId
                )
                .map(placementData => ({
                    type: 'water',
                    placementData,
                    centerPoint: centerPoint.clone(),
                    landObjects,
                    placedPositions
                }));

        this.clusterQueueProcessor.pushTasks(
            tasks
        );

        console.log(
            `[Placement Approved] Water cluster started. selected=${selectedId}, planned=${tasks.length + 1}`
        );
    }

    registerPlacedObject(object, metadata = {}) {
    if (!object) {
        return;
    }

    object.userData.placementMetadata = {
        ...(object.userData.placementMetadata || {}),
        ...metadata
    };

    object.userData.surfaceType =
        metadata.surfaceType ||
        object.userData.surfaceType ||
        'ground';

    object.userData.persistent =
        metadata.persistent ??
        object.userData.persistent ??
        true;

    const id =
        metadata.id ||
        object.userData.spawnId ||
        '';

    const isPlant =
        this.isDepthSafePlacedPlantId(
            id,
            object
        );

    if (isPlant) {
        if (
            id.startsWith('flower') ||
            object.userData.isFlower
        ) {
            object.userData.isFlower = true;
        }

        object.userData.windReactive = true;
        object.userData.isWorldFixed = true;
        object.userData.followMiku = false;

        this.applyFinalPlacedPlantDepthAnchor(
            object,
            metadata
        );
    } else if (!object.userData.anchorPosition) {
        object.userData.anchorPosition =
            object.position.clone();
    }

    this.registry.add(
        object,
        metadata
    );

    this.bloomController.register(
        object,
        metadata
    );

    this.applyPlacedObjectMaterialRules(
        object,
        metadata
    );

    this.spawnManager?.restorePlacedPlantCyberMaterial?.(
        object
    );
}
resolveSurfaceTypeFromHit(hit, fallback = 'ground') {
    const object =
        hit?.object;

    if (!object) {
        return fallback;
    }

    const existing =
        object.userData?.surfaceType;

    if (
        existing === 'water' ||
        existing === 'path' ||
        existing === 'ground' ||
        existing === 'island' ||
        existing === 'mountain'
    ) {
        return existing;
    }

    const names = [];

    let current = object;

    while (current) {
        if (current.name) {
            names.push(current.name);
        }

        if (current.userData?.surfaceType) {
            names.push(current.userData.surfaceType);
        }

        const material =
            current.material;

        if (material) {
            if (Array.isArray(material)) {
                material.forEach(mat => {
                    if (mat?.name) {
                        names.push(mat.name);
                    }
                });
            } else if (material.name) {
                names.push(material.name);
            }
        }

        current = current.parent;
    }

    const joined =
        names.join(' ').toLowerCase();

    if (
        joined.includes('water') ||
        joined.includes('lake') ||
        joined.includes('river')
    ) {
        return 'water';
    }

    if (
        joined.includes('stepping_stone') ||
        joined.includes('steppingstone') ||
        joined.includes('stone_chunk') ||
        joined.includes('island') ||
        joined.includes('islet') ||
        joined.includes('rock')
    ) {
        return 'island';
    }

    if (
        joined.includes('mountain') ||
        joined.includes('mountains') ||
        joined.includes('side_mountain') ||
        joined.includes('horizon_mountain')
    ) {
        return 'mountain';
    }

    if (
        joined.includes('path') ||
        joined.includes('road') ||
        joined.includes('load')
    ) {
        return 'path';
    }

    if (
        joined.includes('ground') ||
        joined.includes('terrain') ||
        joined.includes('land')
    ) {
        return 'ground';
    }

    return fallback;
}

applySurfaceBehaviorToObject(object, metadata = {}) {
    if (!object) {
        return;
    }

    const surfaceType =
        metadata.surfaceType || 'ground';

    object.userData.surfaceType =
        surfaceType;

    const id =
        metadata.id || '';

    const isPlant =
        this.isDepthSafePlacedPlantId(
            id,
            object
        );

    object.userData.isFlower =
        id.startsWith('flower') ||
        object.userData?.isFlower === true;

    /*
     * 重要:
     * 花・草・葉は、ground / mountain / island / water のどこでも
     * 基本的に配置後はworld固定にする。
     *
     * ここで island や water を followMiku=true に戻すと、
     * anchorPositionとの整合が崩れて表示が不安定になる。
     */
    if (isPlant) {
        object.userData.isWorldFixed = true;
        object.userData.followMiku = false;

        this.applyFinalPlacedPlantDepthAnchor(
            object,
            metadata
        );

        return;
    }

    /*
     * 非植物だけ従来挙動。
     */
    if (
        surfaceType === 'mountain' ||
        surfaceType === 'ground'
    ) {
        object.userData.isWorldFixed = true;
        object.userData.followMiku = false;
    }

    if (
        surfaceType === 'water' ||
        surfaceType === 'island'
    ) {
        object.userData.isWorldFixed = false;
        object.userData.followMiku = true;
    }
}

isDepthSafePlacedPlantId(id, object = null) {
    const resolvedId =
        String(id || '');

    return (
        resolvedId.startsWith('flower') ||
        resolvedId.startsWith('Grass') ||
        resolvedId === 'Leaf' ||
        object?.userData?.isFlower === true ||
        object?.userData?.windReactive === true
    );
}



applyFinalPlacedPlantDepthAnchor(object, metadata = {}) {
    if (!object) {
        return;
    }

    const id =
        metadata.id ||
        object.userData?.placementMetadata?.id ||
        object.userData?.spawnId ||
        '';

    const isPlant =
        this.isDepthSafePlacedPlantId(
            id,
            object
        );

    if (!isPlant) {
        return;
    }

    if (
        object.userData?.isEphemeralBloomObject === true ||
        String(object.name || '').includes('ephemeral')
    ) {
        return;
    }

    const surfaceType =
        metadata.surfaceType ||
        object.userData?.surfaceType ||
        'ground';

    let surfaceLift;

    if (typeof metadata.plantSurfaceOffset === 'number') {
        surfaceLift =
            metadata.plantSurfaceOffset;
    } else if (surfaceType === 'water') {
        surfaceLift = 0.08;
    } else if (surfaceType === 'island') {
        surfaceLift = 0.12;
    } else if (surfaceType === 'mountain') {
        surfaceLift = 0.18;
    } else {
        surfaceLift = 0.14;
    }

    /*
     * align後に一度だけ持ち上げる。
     * これにより地形とのZ-fightingを減らす。
     */
    if (object.userData._finalPlantDepthAnchorApplied !== true) {
        object.position.y += surfaceLift;

        object.userData._finalPlantDepthAnchorApplied = true;
        object.userData.finalPlantSurfaceLift = surfaceLift;
    }

    object.updateMatrixWorld(true);

    const surfaceAnchorObject =
        metadata.surfaceAnchorObject ||
        metadata.anchorObject ||
        null;

    const shouldUseSurfaceAnchor =
        this.shouldUseSurfaceAnchorForPlacedObject(
            {
                ...metadata,
                surfaceType
            },
            surfaceAnchorObject
        );

    /*
     * mountain のみ local anchor。
     * ground / water / island は world固定。
     *
     * これにより、走り出した時に terrain chunk が再利用されても
     * 配置オブジェクトが奥へワープしない。
     */
    if (
        shouldUseSurfaceAnchor &&
        this.surfaceAnchorController
    ) {
        const attached =
            this.surfaceAnchorController.attach(
                object,
                surfaceAnchorObject
            );

        if (!attached) {
            object.userData.useSurfaceAnchor = false;
            object.userData.surfaceAnchorObject = null;
            object.userData.surfaceAnchorLocalPosition = null;

            object.userData.anchorPosition =
                object.position.clone();
        }
    } else {
        object.userData.useSurfaceAnchor = false;
        object.userData.surfaceAnchorObject = null;
        object.userData.surfaceAnchorLocalPosition = null;

        object.userData.anchorPosition =
            object.position.clone();
    }

    object.userData.isWorldFixed = true;
    object.userData.followMiku = false;
}

    spawnRepresentativeRipple(position, id = null, landObjects = []) {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.spawnWaterRipple !== 'function'
        ) {
            return;
        }

        if (id === 'Leaf') {
            return;
        }

        this.spawnManager.spawnWaterRipple(
            position
        );
    }

    bloomAllPlacedObjects() {
        this.bloomController.bloomAll();
    }

    getPlacedObjects() {
        return this.registry.getAll();
    }

    shouldUseSurfaceAnchorForPlacedObject(metadata = {}, surfaceAnchorObject = null) {
    const surfaceType =
        metadata.surfaceType || 'ground';

    /*
     * 重要:
     * ground / water / island / path は terrain chunk の再利用で
     * mesh 自体が前後に再配置されるため local anchor 禁止。
     *
     * mountain だけは背景山と一緒に動いてよいので local anchor 許可。
     */
    if (surfaceType !== 'mountain') {
        return false;
    }

    if (
        !surfaceAnchorObject ||
        !surfaceAnchorObject.isObject3D
    ) {
        return false;
    }

    if (
        surfaceAnchorObject.userData?.isMountainSurface === true ||
        surfaceAnchorObject.userData?.isMovingTerrainAnchor === true
    ) {
        return true;
    }

    const objectName =
        String(surfaceAnchorObject.name || '').toLowerCase();

    return (
        objectName.includes('mountain') ||
        objectName.includes('mountains')
    );
}

clearObjects(options = {}) {

    const preservePersistent =
        options.preservePersistent ?? true;

    const objects = this.registry.getAll();

    const kept = [];

    objects.forEach(obj => {

        const isPersistent =
            obj.userData?.persistent === true;

        if (
            preservePersistent &&
            isPersistent
        ) {
            kept.push(obj);
            return;
        }

        obj.parent?.remove(obj);
    });

    this.registry.clear();

    kept.forEach(obj => {
        this.registry.add(obj, obj.userData || {});
    });

    this.bloomController.clear();

    if (
        this.clusterQueueProcessor &&
        typeof this.clusterQueueProcessor.clear === 'function'
    ) {
        this.clusterQueueProcessor.clear();
    }

    console.log(
        '[PlacementManager] clearObjects (safe) executed.'
    );
}
}