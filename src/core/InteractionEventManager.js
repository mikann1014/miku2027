import * as THREE from 'three';

import { PrismBurstEffect } from '../effects/PrismBurstEffect.js';
import { MarchStepEffect } from '../effects/MarchStepEffect.js';
import { EphemeralBloomEffect } from '../effects/EphemeralBloomEffect.js';
import { PlacedBloomEchoEffect } from '../effects/PlacedBloomEchoEffect.js';
import { LeafDriftEffect } from '../effects/LeafDriftEffect.js';

/**
 * InteractionEventManager
 * ポインター入力に応じて各種エフェクトを発火させる管理クラス
 */
export class InteractionEventManager {
    constructor(worldRenderer) {
        this.worldRenderer = worldRenderer;

        this.scene = worldRenderer.scene;
        this.camera = worldRenderer.camera;
        this.renderer = worldRenderer.renderer;

        // レイキャスト
        this.raycaster = new THREE.Raycaster();

        // 各種エフェクト
        this.prismBurstEffect =
            new PrismBurstEffect(
                worldRenderer.spawnManager,
                {
                    count: 8,
                    scaleMultiplier: 0.24,
                    lifeDecrease: 0.05,
                    moveSpeed: 0.18,
                    rotationSpeed: 0.085,
                    color: new THREE.Color(0.85, 1.15, 1.65)
                }
            );

        this.marchStepEffect =
            new MarchStepEffect(
                this.scene,
                {
                    stepCount: 7,
                    stepInterval: 0.68,
                    sideOffset: 0.34,
                    color: 0x7ffcff
                }
            );

        this.ephemeralBloomEffect =
            new EphemeralBloomEffect(
                this.scene,
                worldRenderer.spawnManager,
                {
                    countMin: 12,
                    countMax: 18,
                    radiusMin: 1.15,
                    radiusMax: 4.25,
                    lifeDuration: 2.25,
                    scaleMin: 0.16,
                    scaleMax: 0.34,
                    riseSpeedMin: 0.12,
                    riseSpeedMax: 0.34
                }
            );

        this.placedBloomEchoEffect =
            new PlacedBloomEchoEffect({
                radius: 4.4,
                duration: 0.72,
                maxScaleBoost: 0.34,
                colorBoost: 1.85
            });

        this.leafDriftEffect =
            new LeafDriftEffect(
                worldRenderer.spawnManager,
                {
                    distance: 1.85,
                    duration: 1.45,
                    rippleInterval: 0.28
                }
            );

        // クールダウン設定（ms）
        this.waterClickCooldownMs = 120;
        this.pathClickCooldownMs = 180;
        this.noteClickCooldownMs = 220;
        this.groundClickCooldownMs = 140;
        this.placedClickCooldownMs = 180;
        this.leafClickCooldownMs = 220;

        // 最終クリック時刻
        this.lastWaterClickTime = 0;
        this.lastPathClickTime = 0;
        this.lastNoteClickTime = 0;
        this.lastGroundClickTime = 0;
        this.lastPlacedClickTime = 0;
        this.lastLeafClickTime = 0;
    }

    /**
     * ポインターイベント処理
     */
    handlePointerEvent(event) {
        if (!event) return false;
        if (!this.camera || !this.renderer) return false;

        const pointer =
            this.getPointerFromEvent(event);

        if (!pointer) return false;

        const now = performance.now();

        // レイキャスト設定
        this.raycaster.setFromCamera(
            pointer,
            this.camera
        );

        // ノートクリック判定
        const noteConsumed =
            this.tryHandleBlueNoteClick(now);

        if (noteConsumed) {
            return true;
        }

        // 設置オブジェクト判定
        const placedConsumed =
            this.tryHandlePlacedObjectClick(now);

        if (placedConsumed) {
            return true;
        }

        // 地形クリック処理
        const surfaceResult =
            this.tryHandleTerrainClick(now);

        return surfaceResult.consumed;
    }

    /**
     * PointerEvent/TouchEventから正規化座標を取得
     */
    getPointerFromEvent(event) {
        const clientX =
            event.clientX ??
            event.touches?.[0]?.clientX;

        const clientY =
            event.clientY ??
            event.touches?.[0]?.clientY;

        if (
            clientX === undefined ||
            clientY === undefined
        ) {
            return null;
        }

        const domElement =
            this.renderer.domElement;

        if (!domElement) return null;

        const rect =
            domElement.getBoundingClientRect();

        return new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    /**
     * 石・島などの判定
     */
    isSteppingStoneLikeObject(object) {
        if (!object) {
            return false;
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

            current = current.parent;
        }

        const joined =
            names.join(' ').toLowerCase();

        return (
            joined.includes('stepping_stone') ||
            joined.includes('steppingstone') ||
            joined.includes('stone_chunk') ||
            joined.includes('island') ||
            joined.includes('islet') ||
            joined.includes('rock')
        );
    }

    /**
     * ノートクリック処理
     */
    tryHandleBlueNoteClick(now) {
        if (
            now - this.lastNoteClickTime <
            this.noteClickCooldownMs
        ) {
            return false;
        }

        const blueNoteManager =
            this.worldRenderer.blueNoteManager;

        if (
            !blueNoteManager ||
            typeof blueNoteManager.getInteractiveObjects !== 'function'
        ) {
            return false;
        }

        const targets =
            blueNoteManager.getInteractiveObjects();

        if (!targets || targets.length === 0) {
            return false;
        }

        const hits =
            this.raycaster.intersectObjects(
                targets,
                true
            );

        if (!hits || hits.length === 0) {
            return false;
        }

        this.lastNoteClickTime = now;

        if (
            typeof blueNoteManager.triggerJump === 'function'
        ) {
            blueNoteManager.triggerJump();
        }

        return true;
    }

    /**
     * 設置オブジェクトクリック処理
     */
    tryHandlePlacedObjectClick(now) {
        const placedObjects =
            this.getPlacedObjects();

        if (
            !Array.isArray(placedObjects) ||
            placedObjects.length === 0
        ) {
            return false;
        }

        const hits =
            this.raycaster.intersectObjects(
                placedObjects,
                true
            );

        if (!hits || hits.length === 0) {
            return false;
        }

        const rootObject =
            this.findPlacedRootObject(
                hits[0].object,
                placedObjects
            );

        if (!rootObject) {
            return false;
        }

        const metadata =
            rootObject.userData?.placementMetadata;

        const id =
            metadata?.id || '';

        // 葉オブジェクトの場合
        if (id === 'Leaf') {
            return this.handleLeafClick(
                rootObject,
                now
            );
        }

        // ブルーム対象オブジェクトの場合
        if (this.isBloomablePlacedObject(id)) {
            return this.handlePlacedBloomClick(
                rootObject,
                now
            );
        }

        return false;
    }

    /**
     * ヒットしたオブジェクトからルートオブジェクトを探索
     */
    findPlacedRootObject(hitObject, placedObjects) {
        let current = hitObject;

        while (current) {
            if (placedObjects.includes(current)) {
                return current;
            }

            current = current.parent;
        }

        return null;
    }

    /**
     * 設置ブルーム処理
     */
    handlePlacedBloomClick(rootObject, now) {
        if (
            now - this.lastPlacedClickTime <
            this.placedClickCooldownMs
        ) {
            return true;
        }

        this.lastPlacedClickTime = now;

        const placedObjects =
            this.getPlacedObjects();

        this.placedBloomEchoEffect.trigger(
            rootObject,
            placedObjects
        );

        return true;
    }

    /**
     * 葉クリック処理
     */
    handleLeafClick(rootObject, now) {
        if (
            now - this.lastLeafClickTime <
            this.leafClickCooldownMs
        ) {
            return true;
        }

        this.lastLeafClickTime = now;

        const direction =
            this.getCameraForwardOnGround();

        this.leafDriftEffect.trigger(
            rootObject,
            direction
        );

        return true;
    }

    /**
     * 地形クリック処理
     */
    tryHandleTerrainClick(now) {
        const terrainTargets =
            this.getTerrainInteractionTargets();

        if (
            !Array.isArray(terrainTargets) ||
            terrainTargets.length === 0
        ) {
            return {
                consumed: false
            };
        }

        this.scene.updateMatrixWorld(true);

        const hits =
            this.raycaster.intersectObjects(
                terrainTargets,
                false
            );

        if (!hits || hits.length === 0) {
            return {
                consumed: false
            };
        }

        const validHit =
            this.findBestTerrainHit(hits);

        if (!validHit) {
            return {
                consumed: false
            };
        }

        const surfaceType =
            this.resolveSurfaceType(
                validHit.object
            );

        // mountain はクリックを消費しない
        if (surfaceType === 'mountain') {
            return {
                consumed: false
            };
        }

        if (surfaceType === 'ground') {
            this.handleGroundClick(
                validHit,
                now
            );

            return {
                consumed: false
            };
        }

        if (surfaceType === 'water') {
            this.handleWaterClick(
                validHit,
                now
            );

            return {
                consumed: false
            };
        }

        if (surfaceType === 'path') {
            const consumed =
                this.handlePathClick(
                    validHit,
                    now
                );

            return {
                consumed
            };
        }

        return {
            consumed: false
        };
    }

    /**
     * 地形インタラクション対象取得
     */
    getTerrainInteractionTargets() {
        const targets = [];
        const seen = new Set();

        const addTarget = object => {
            if (!object) return;
            if (!object.isMesh) return;
            if (seen.has(object)) return;

            if (object.userData?.isWire) return;
            if (object.userData?.isWaterReflector) return;
            if (object.userData?.isEphemeralBloomObject) return;

            const name =
                (object.name || '').toLowerCase();

            if (name.includes('wire')) return;
            if (name.includes('grid')) return;
            if (name.includes('edge')) return;
            if (name.includes('neon')) return;
            if (name.includes('ephemeral')) return;

            const surfaceType =
                this.resolveSurfaceType(object);

            if (
                surfaceType !== 'water' &&
                surfaceType !== 'path' &&
                surfaceType !== 'ground' &&
                surfaceType !== 'mountain'
            ) {
                return;
            }

            object.userData.surfaceType = surfaceType;

            seen.add(object);
            targets.push(object);
        };

        if (this.scene) {
            this.scene.traverse(object => {
                addTarget(object);
            });
        }

        return targets;
    }

    /**
     * バリデーション用地形対象
     */
    getTerrainValidationTargets() {
        return this.getTerrainInteractionTargets()
            .filter(object => {
                const surfaceType =
                    this.resolveSurfaceType(object);

                return (
                    surfaceType === 'water' ||
                    surfaceType === 'path' ||
                    surfaceType === 'ground'
                );
            });
    }

    /**
     * サーフェスタイプ判定
     */
    resolveSurfaceType(object) {
        if (!object) {
            return 'unknown';
        }

        const existing =
            object.userData?.surfaceType;

        if (
            existing === 'water' ||
            existing === 'path' ||
            existing === 'ground' ||
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

            current = current.parent;
        }

        const material =
            Array.isArray(object.material)
                ? object.material[0]
                : object.material;

        if (material?.name) {
            names.push(material.name);
        }

        const combinedName =
            names.join(' ').toLowerCase();

        if (
            combinedName.includes('water') ||
            combinedName.includes('lake')
        ) {
            return 'water';
        }

        if (
            combinedName.includes('path') ||
            combinedName.includes('road') ||
            combinedName.includes('load')
        ) {
            return 'path';
        }

        if (
            combinedName.includes('mountain') ||
            combinedName.includes('mountains') ||
            combinedName.includes('side_mountain') ||
            combinedName.includes(
                'horizon_mountain'
            ) ||
            combinedName.includes(
                'ground_left_mountains'
            ) ||
            combinedName.includes(
                'ground_right_mountains'
            )
        ) {
            return 'mountain';
        }

        if (
            combinedName.includes('ground') ||
            combinedName.includes('land') ||
            combinedName.includes('island') ||
            combinedName.includes('stone')
        ) {
            return 'ground';
        }

        return 'unknown';
    }
    
    findBestTerrainHit(hits) {
    const validHits =
        hits.filter(hit => {
            if (!hit || !hit.object) return false;

            if (hit.object.userData?.isWire) return false;
            if (hit.object.userData?.isEphemeralBloomObject) return false;

            const surfaceType =
                this.resolveSurfaceType(hit.object);

            return (
                surfaceType === 'water' ||
                surfaceType === 'path' ||
                surfaceType === 'ground' ||
                surfaceType === 'mountain'
            );
        });

    if (validHits.length === 0) {
        return null;
    }

    const pathHit =
        validHits.find(hit => {
            return this.resolveSurfaceType(hit.object) === 'path';
        });

    if (pathHit) {
        return pathHit;
    }

    const mountainHit =
        validHits.find(hit => {
            return this.resolveSurfaceType(hit.object) === 'mountain';
        });

    if (mountainHit) {
        return mountainHit;
    }

    const groundHit =
        validHits.find(hit => {
            return this.resolveSurfaceType(hit.object) === 'ground';
        });

    if (groundHit) {
        return groundHit;
    }

    const waterHit =
        validHits.find(hit => {
            return this.resolveSurfaceType(hit.object) === 'water';
        });

    if (waterHit) {
        return waterHit;
    }

    return validHits[0];
}

    sampleTopSurfaceFromObjects(
        x,
        z,
        referenceY,
        targets,
        options = {}
    ) {
        if (
            !Array.isArray(targets) ||
            targets.length === 0
        ) {
            return null;
        }

        const startHeight =
            options.startHeight ?? 160;

        const rayLength =
            options.rayLength ?? 500;

        const origin =
            new THREE.Vector3(
                x,
                referenceY + startHeight,
                z
            );

        const direction =
            new THREE.Vector3(0, -1, 0);

        const sampler =
            new THREE.Raycaster(
                origin,
                direction,
                0,
                rayLength
            );

        const hits =
            sampler.intersectObjects(
                targets,
                false
            );

        if (!hits || hits.length === 0) {
            return null;
        }

        const validHits =
            hits.filter(hit => {
                if (!hit || !hit.object) return false;
                if (hit.object.userData?.isWire) return false;
                if (hit.object.userData?.isEphemeralBloomObject) return false;

                const surfaceType =
                    this.resolveSurfaceType(hit.object);

                return (
                    surfaceType === 'water' ||
                    surfaceType === 'path' ||
                    surfaceType === 'ground'
                );
            });

        if (validHits.length === 0) {
            return null;
        }

        const topHit =
            validHits[0];

        return {
            point: topHit.point.clone(),
            object: topHit.object,
            surfaceType: this.resolveSurfaceType(topHit.object)
        };
    }

    handleWaterClick(hit, now) {
        if (
            now - this.lastWaterClickTime <
            this.waterClickCooldownMs
        ) {
            return;
        }

        this.lastWaterClickTime = now;

        const point =
            hit.point.clone();

        const phase =
            this.worldRenderer.currentPhase || 'intro';

        const color =
            this.resolveWaterRippleColor(phase);

        const validationTargets =
            this.getTerrainValidationTargets();

        const pathOverlap =
            this.doesAreaContainSurfaceType({
                center: point,
                radius: 2.35,
                surfaceType: 'path',
                targets: validationTargets,
                referenceY: point.y,
                sampleCount: 16
            });

        if (
            !pathOverlap &&
            this.worldRenderer.spawnManager &&
            typeof this.worldRenderer.spawnManager.spawnWaterRipple === 'function'
        ) {
            this.worldRenderer.spawnManager.spawnWaterRipple(
                point,
                {
                    color,
                    opacity: 0.38,
                    innerRadius: 0.55,
                    outerRadius: 0.74,
                    startScale: 0.58,
                    endScale: 2.25,
                    duration: 1.05,
                    yOffset: 0.065
                }
            );

            setTimeout(() => {
                this.worldRenderer.spawnManager.spawnWaterRipple(
                    point,
                    {
                        color,
                        opacity: 0.18,
                        innerRadius: 0.78,
                        outerRadius: 0.96,
                        startScale: 0.62,
                        endScale: 2.85,
                        duration: 1.25,
                        yOffset: 0.07
                    }
                );
            }, 120);
        }

        if (this.prismBurstEffect) {
            const burstPoint =
                point.clone();

            burstPoint.y += 0.18;

            this.prismBurstEffect.spawn(
                burstPoint
            );
        }
    }

    handlePathClick(hit, now) {
        if (
            now - this.lastPathClickTime <
            this.pathClickCooldownMs
        ) {
            return true;
        }

        this.lastPathClickTime = now;

        const point =
            hit.point.clone();

        const validationTargets =
            this.getTerrainValidationTargets();

        const lakeOverlap =
            this.doesAreaContainSurfaceType({
                center: point,
                radius: 2.4,
                surfaceType: 'water',
                targets: validationTargets,
                referenceY: point.y,
                sampleCount: 12
            });

        if (lakeOverlap) {
            return true;
        }

        let forward =
            new THREE.Vector3(0, 0, -1);

        const miku =
            this.worldRenderer.miku?.model;

        if (miku) {
            forward = new THREE.Vector3(0, 0, -1)
                .applyQuaternion(miku.quaternion)
                .setY(0)
                .normalize();

            if (forward.lengthSq() < 0.0001) {
                forward.set(0, 0, -1);
            }
        }

        if (this.marchStepEffect) {
            this.marchStepEffect.spawn(
                point,
                forward,
                {
                    color: this.resolveMarchColor(),
                    yOffset: 0.11
                }
            );
        }

        return true;
    }

    handleGroundClick(hit, now) {
    if (
        now - this.lastGroundClickTime <
        this.groundClickCooldownMs
    ) {
        return;
    }

    this.lastGroundClickTime = now;

    const clickedSurfaceType =
        this.resolveSurfaceType(
            hit.object
        );

    if (clickedSurfaceType !== 'ground') {
        return;
    }

    const isSteppingStone =
        this.isSteppingStoneLikeObject(
            hit.object
        );

    const point =
        hit.point.clone();

    const validationTargets =
        isSteppingStone
            ? [hit.object]
            : this.getTerrainValidationTargets();

    const colors =
        this.resolveGroundBloomColors();

    const normal =
        isSteppingStone
            ? new THREE.Vector3(0, 1, 0)
            : this.getHitWorldNormal(hit);

    this.ephemeralBloomEffect.spawn(
        point,
        {
            color: colors.primary,
            secondaryColor: colors.secondary,

            count: isSteppingStone ? 10 : 16,

            radiusMin: isSteppingStone ? 0.35 : 1.15,
            radiusMax: isSteppingStone ? 1.15 : 4.25,

            scaleMin: isSteppingStone ? 0.11 : 0.16,
            scaleMax: isSteppingStone ? 0.24 : 0.34,

            yOffset: isSteppingStone ? 0.16 : 0.12,

            surfaceNormal: normal,
            camera: this.camera,
            lifeDuration: 2.25,

            surfaceValidator: candidatePoint => {
                if (isSteppingStone) {
                    const distance =
                        Math.hypot(
                            candidatePoint.x - point.x,
                            candidatePoint.z - point.z
                        );

                    return distance <= 1.25;
                }

                const candidateHit =
                    this.sampleTopSurfaceFromObjects(
                        candidatePoint.x,
                        candidatePoint.z,
                        point.y,
                        validationTargets,
                        {
                            startHeight: 180,
                            rayLength: 620
                        }
                    );

                return !!candidateHit &&
                    candidateHit.surfaceType === 'ground';
            }
        }
    );

    console.log(
        '[InteractionEventManager] Ground bloom spawned:',
        {
            objectName: hit.object?.name || '',
            surfaceType: clickedSurfaceType,
            isSteppingStone,
            point: {
                x: point.x.toFixed(2),
                y: point.y.toFixed(2),
                z: point.z.toFixed(2)
            }
        }
    );
}

forceGroundBloomOpaque() {
    // ここでは何もしない。
    // bloom / ephemeral の material を書き換えない。
}

    doesAreaContainSurfaceType({
        center,
        radius,
        surfaceType,
        targets,
        referenceY,
        sampleCount = 12
    }) {
        if (!center) return false;

        const points = [];

        points.push(center.clone());

        for (let i = 0; i < sampleCount; i++) {
            const angle =
                (i / sampleCount) * Math.PI * 2;

            points.push(
                new THREE.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                )
            );
        }

        for (const point of points) {
            const hit =
                this.sampleTopSurfaceFromObjects(
                    point.x,
                    point.z,
                    referenceY,
                    targets,
                    {
                        startHeight: 180,
                        rayLength: 620
                    }
                );

            if (
                hit &&
                hit.surfaceType === surfaceType
            ) {
                return true;
            }
        }

        return false;
    }

    getHitWorldNormal(hit) {
        if (!hit || !hit.face || !hit.object) {
            return new THREE.Vector3(0, 1, 0);
        }

        const normalMatrix =
            new THREE.Matrix3().getNormalMatrix(
                hit.object.matrixWorld
            );

        return hit.face.normal
            .clone()
            .applyMatrix3(normalMatrix)
            .normalize();
    }

    getPlacedObjects() {
        if (
            this.worldRenderer.placementManager &&
            typeof this.worldRenderer.placementManager.getPlacedObjects === 'function'
        ) {
            return this.worldRenderer.placementManager.getPlacedObjects();
        }

        return [];
    }

    getCameraForwardOnGround() {
        const direction =
            new THREE.Vector3();

        this.camera.getWorldDirection(
            direction
        );

        direction.y = 0;

        if (direction.lengthSq() < 0.0001) {
            direction.set(0, 0, -1);
        }

        direction.normalize();

        return direction;
    }

    isBloomablePlacedObject(id) {
        return [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ].includes(id);
    }

    resolveWaterRippleColor(phase) {
        switch (phase) {
            case 'midCyber':
                return 0x00d6ff;

            case 'midIndigo':
                return 0x3366ff;

            case 'lastChorus':
                return 0x9beeff;

            case 'dawn':
                return 0xbffcff;

            case 'intro':
            default:
                return 0x7feeff;
        }
    }

    resolveMarchColor() {
        const phase =
            this.worldRenderer.currentPhase || 'intro';

        if (phase === 'lastChorus') {
            return 0xaafcff;
        }

        if (phase === 'dawn') {
            return 0xd8ffff;
        }

        return 0x7ffcff;
    }

    resolveGroundBloomColors() {
        const phase =
            this.worldRenderer.currentPhase || 'intro';

        switch (phase) {
            case 'midCyber':
                return {
                    primary: 0x00eaff,
                    secondary: 0xeaffff
                };

            case 'midIndigo':
                return {
                    primary: 0x6688ff,
                    secondary: 0xddf0ff
                };

            case 'lastChorus':
                return {
                    primary: 0x8ffcff,
                    secondary: 0xffd19a
                };

            case 'dawn':
                return {
                    primary: 0xd8ffff,
                    secondary: 0xffc8e8
                };

            case 'intro':
            default:
                return {
                    primary: 0x7feeff,
                    secondary: 0xeaffff
                };
        }
    }

    update(delta = 0.016) {
    this.marchStepEffect?.update(delta);
    this.ephemeralBloomEffect?.update(delta);
    this.placedBloomEchoEffect?.update(delta);
    this.leafDriftEffect?.update(delta);

    this.forceGroundBloomOpaque();
}

    clear() {
        this.marchStepEffect?.clear();
        this.ephemeralBloomEffect?.clear();
        this.placedBloomEchoEffect?.clear();
        this.leafDriftEffect?.clear();
    }
}