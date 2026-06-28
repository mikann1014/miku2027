import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


import { SpawnManager } from '../managers/SpawnManager.js';
import { PlacementManager } from '../managers/PlacementManager.js';
import { CharacterManager } from '../managers/CharacterManager.js';
import { CameraController } from '../managers/CameraController.js';
import { ProceduralTerrainManager } from '../managers/ProceduralTerrainManager.js';
import { BlueNoteManager } from '../managers/BlueNoteManager.js';

import { LateActSequenceDirector } from '../experience/LateActSequenceDirector.js';

import { EnvironmentManager } from './EnvironmentManager.js';
import { LyricsManager } from './LyricsManager.js';
import { EffectManager } from './EffectManager.js';
import { InteractionEventManager } from './InteractionEventManager.js';

import { NoteTrailEffect } from '../effects/NoteTrailEffect.js';
import { WorldResonanceEffect } from '../effects/WorldResonanceEffect.js';
import { EndingNoteAscendEffect } from '../effects/EndingNoteAscendEffect.js';
import { ProceduralMountainFlowerField } from '../effects/ProceduralMountainFlowerField.js';
import { PlacedFlowerLightPropagationEffect } from '../effects/PlacedFlowerLightPropagationEffect.js';
import { EndingWorldResponseEffect } from '../effects/EndingWorldResponseEffect.js';
import { MountainFlowerPointService } from '../terrain/MountainFlowerPointService.js';

export class WorldRenderer {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05070a);

        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.5,
            5000
        );

        
this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: false
    })


        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        document.body.appendChild(this.renderer.domElement);

        const directionalLight =
            new THREE.DirectionalLight(
                0xffffff,
                1.2
            );

        directionalLight.position.set(
            5,
            10,
            5
        );

        this.scene.add(directionalLight);

        const ambientLight =
            new THREE.AmbientLight(
                0xffffff,
                0.65
            );

        this.scene.add(ambientLight);

        this.spawnManager =
            new SpawnManager(this.scene);

        this.effectManager =
            new EffectManager();

        this.characterManager =
            new CharacterManager(this.scene);

        this.controls =
            new CameraController(
                this.camera,
                this.characterManager
            );

        this.placementManager =
            new PlacementManager(
                this.scene,
                this.camera,
                this.renderer,
                this.spawnManager
            );

        this.lyricsManager =
            new LyricsManager(
                this.scene,
                this.spawnManager
            );

        this.environment =
            new EnvironmentManager(this.scene);

        this.blueNoteManager =
            new BlueNoteManager(
                this.scene,
                this.spawnManager
            );

        this.noteTrailEffect =
            new NoteTrailEffect(this.scene);

        this.worldResonanceEffect =
            new WorldResonanceEffect(this.scene);

        this.endingNoteAscendEffect =
            new EndingNoteAscendEffect(
                this.scene,
                this.spawnManager
            );

        this.endingWorldResponseEffect =
    new EndingWorldResponseEffect(
        this.scene,
        this.spawnManager
    );

this.effectManager.addEffect(
    this.endingWorldResponseEffect
);


        this.proceduralMountainFlowerField =
            new ProceduralMountainFlowerField(
                this.scene
            );

        
this.proceduralMountainFlowerField.setCamera(
    this.camera
);
    this.mountainFlowerPointService =
    new MountainFlowerPointService({
        defaultCount: 360
    });

        this.placedFlowerLightPropagationEffect =
            new PlacedFlowerLightPropagationEffect();

        this.effectManager.addEffect(
            this.proceduralMountainFlowerField
        );

        this.effectManager.addEffect(
            this.placedFlowerLightPropagationEffect
        );

        this.effectManager.addEffect(
            this.noteTrailEffect
        );

        this.effectManager.addEffect(
            this.worldResonanceEffect
        );

        this.effectManager.addEffect(
            this.endingNoteAscendEffect
        );

        this.interactionEventManager =
            new InteractionEventManager(this);

        this.lateActSequenceDirector =
            new LateActSequenceDirector(this);

        this.characterManager.setOnCollapseFinished(() => {
            this.startLateActBirdSequence();
        });

        this.loader =
            new GLTFLoader();

        this.clock =
            new THREE.Clock();

        this.mikuClickRaycaster =
            new THREE.Raycaster();

        this.blueNoteClickRaycaster =
            new THREE.Raycaster();

        this.textAlivePlayer = null;
        this.landObjects = [];

        this.isPlacementEnabled = false;
        this.isInteractionLocked = false;
        this.isLateActCinematicActive = false;

        this.terrainManager = null;

        this.currentPhase = 'intro';
        this.environmentLerpSpeed = 0.025;

        this.hasBlueKanaTriggered = false;
        this.hasBlueNoteTriggered = false;
        this.hasRebirthBlueNotesTriggered = false;

        this.isMelodyMountainBloomRunning = false;
        this.isLateWalkStopLoopPlaying = false;
        this.isFinalMusicReachPlaying = false;

        this.environment.init();

this.isFinalEndingSequencePlaying = false;
this.finalEndingTimeouts = [];

this.hasFinalEndingSkyAscendStarted = false;
this.hasEndingTurnBPlayed = false;

        window.addEventListener('resize', () => {
            this.onResize();
        });
    }

    setPlayer(playerInstance) {
        this.textAlivePlayer =
            playerInstance;
    }

    getCurrentTime() {
    return this.musicManager?.getCurrentTime?.() ?? 0;
}

    get miku() {
        return this.characterManager.getMiku();
    }

    setPlacementEnabled(enabled) {
        this.isPlacementEnabled =
            !!enabled;

        console.log(
            `[WorldRenderer] Placement ${this.isPlacementEnabled ? 'enabled' : 'disabled'}`
        );
    }

    setInteractionLocked(locked) {
        this.isInteractionLocked =
            !!locked;

        console.log(
            `[WorldRenderer] Interaction ${this.isInteractionLocked ? 'locked' : 'unlocked'}`
        );
    }

    startLateActBirdSequence() {
        this.isInteractionLocked = true;

        // カメラは今まで通り動かせる。
        this.isLateActCinematicActive = false;

        this.setPlacementEnabled(false);

        this.lateActSequenceDirector?.startFromCollapse?.();
    }

    returnBirdToMikuAndResume() {
        if (
            this.lateActSequenceDirector &&
            typeof this.lateActSequenceDirector.beginReturnToMiku === 'function'
        ) {
            this.lateActSequenceDirector.beginReturnToMiku();
        }
    }

    async loadModels(list) {
        for (const name of list) {
            try {
                if (name.toLowerCase() === 'lake2') {
                    this.createProceduralTerrain();
                    continue;
                }

                const gltf =
                    await new Promise((resolve, reject) => {
                        this.loader.load(
                            `./assets/${name}.glb`,
                            resolve,
                            undefined,
                            reject
                        );
                    });

                const model =
                    gltf.scene || gltf;

                if (name === 'MikuWalk') {
                    this.characterManager.setupMiku(gltf);
                } else if (name === 'MikuRun') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'Run'
                    );
                } else if (name === 'MikuWalkToStopA') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'WalkToStopA'
                    );
                } else if (name === 'MikuWalkToStopB') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'WalkToStopB'
                    );
                } else if (name === 'MikuStop') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'Stop'
                    );
                } else if (name === 'MikuStoptoCollapse') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'StoptoCollapse'
                    );
                } else if (name === 'MikuHand') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'Hand'
                    );
                } else if (name === 'MikuHart') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'Hart'
                    );
                } else if (name === 'MikuTurn') {
                    this.characterManager.addMikuAnimation(
                        gltf,
                        'Turn'
                    );
                    } else if (name === 'MikuTurnB') {
    this.characterManager.addMikuAnimation(
        gltf,
        'TurnB'
    );
                } else if (name === 'bird') {
                    this.spawnManager.registerAndProcessModel(
                        name,
                        model
                    );

                    this.lateActSequenceDirector?.registerBirdGLTF?.(
                        gltf
                    );
                } else {
                    this.spawnManager.registerAndProcessModel(
                        name,
                        model
                    );
                }
            } catch (error) {
                console.error(
                    `[WorldRenderer] Load Error: ${name}`,
                    error
                );
            }
        }
    }

clearFinalEndingTimeouts() {
    if (!this.finalEndingTimeouts) {
        this.finalEndingTimeouts = [];
        return;
    }

    this.finalEndingTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });

    this.finalEndingTimeouts = [];

    this.hasFinalEndingSkyAscendStarted = false;
    this.hasEndingTurnBPlayed = false;
}

setSkyPhase(phaseName, lerpSpeed = 0.04) {
    this.currentPhase = phaseName;
    this.environmentLerpSpeed = lerpSpeed;

    console.log(
        `[WorldRenderer] Sky phase: ${phaseName}`
    );
}

triggerSadBlueFlash(duration = 850) {
    if (this._sadBlueFlashActive) {
        return;
    }

    this._sadBlueFlashActive = true;

    const previousPhase =
        this.currentPhase || 'intro';

    const previousSpeed =
        this.environmentLerpSpeed || 0.04;

    this.currentPhase = 'sadBlueFlash';
    this.environmentLerpSpeed = 0.45;

    console.log(
        '[WorldRenderer] Sad blue flash.'
    );

    setTimeout(() => {
        this.currentPhase = previousPhase;
        this.environmentLerpSpeed = previousSpeed;

        this._sadBlueFlashActive = false;

        console.log(
            '[WorldRenderer] Sad blue flash ended.'
        );
    }, duration);
}

startFinalEndingSequenceFromPhrase() {
    if (this.isFinalEndingSequencePlaying) {
        return;
    }

    this.isFinalEndingSequencePlaying = true;

    this.clearFinalEndingTimeouts();

    console.log(
        '[WorldRenderer] Final ending sequence started from phrase.'
    );

    // 音符だけ上げる。カメラは上げない。
    this.startFinalEndingSkyAscend?.();

    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.startEndingCameraReturn?.();
        }, 8000)
    );

    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.startEndingWorldDiscovery?.();
        }, 13000)
    );

    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.startEndingOverviewCamera?.();
            this.startEndingWorldResponse?.();
        }, 21000)
    );

    // ❌ ここでは startEndingStill / startFadeOut は呼ばない
    // タイトル表示後に showEndingTitle() 側で fadeOut する

    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.isFinalEndingSequencePlaying = false;
        }, 45000)
    );
}



    getBlueNoteCenter() {
    const notes =
        this.blueNoteManager?.notes || [];

    if (!notes || notes.length === 0) {
        return null;
    }

    const center =
        new THREE.Vector3();

    notes.forEach(note => {
        center.add(note.position);
    });

    center.divideScalar(notes.length);

    return center;
}

getEndingHorizonTarget() {
    const mikuPosition =
        this.characterManager?.getMikuPosition?.()
            ?.clone() ||
        new THREE.Vector3(0, 0, 0);

    return new THREE.Vector3(
        mikuPosition.x,
        2.0,
        mikuPosition.z - 90
    );
}
getEndingWorldTarget() {
    const mikuPosition =
        this.characterManager?.getMikuPosition?.()
            ?.clone() ||
        new THREE.Vector3(0, 0, 0);

    return new THREE.Vector3(
        mikuPosition.x,
        1.15,
        mikuPosition.z - 18
    );
}

startFinalEndingSkyAscend() {
    const mikuModel =
        this.miku?.model;

    if (!mikuModel) {
        return;
    }

    this.setInteractionLocked?.(true);
    this.setPlacementEnabled?.(false);

    this.currentPhase = 'midIndigo';
    this.environmentLerpSpeed = 0.025;

    this.setMikuMoveMode?.('hand');

    this.blueNoteManager?.expandToCount?.(
        6,
        mikuModel
    );

    this.blueNoteManager?.ascendAllNotes?.({
        duration: 3.0,
        target: mikuModel
    });

    this.controls?.startFinalNoteAscendFollow?.(
        () => this.getBlueNoteCenter?.(),
        {
            rotateDuration: 3.0,

            // 天を向いた後の固定時間
            holdDuration: 4.5,

            // 天を見る角度を強くする
            minUpY: 0.65,
            skyBias: 2.0
        }
    );

    console.log(
        '[WorldRenderer] Final ending sky ascend started.'
    );
}
    createProceduralTerrain() {
        console.log(
            '[WorldRenderer] Creating procedural terrain instead of lake2.glb'
        );

        this.terrainManager =
            new ProceduralTerrainManager(
                this.scene,
                {
                    waterWidth: 170,
                    pathWidth: 7.2,

                    pathY: 0.06,
                    waterY: -0.1,
                    groundY: 0.0,

                    sideMountainBaseY: -0.16,
                    sideMountainHeight: 22.0,

                    horizonMountainBaseY: -0.14,
                    horizonMountainHeight: 13.0,

                    chunkLength: 220,
                    forwardChunkCount: 12,
                    backwardChunkCount: 5,

                    horizonDistance: 950,
                    sideMountainLength: 1800,

                    waterBaseOpacity: 0.34,
                    waterGridBaseOpacity: 0.09,

                    pathBaseOpacity: 0.92,
                    pathGridBaseOpacity: 0.24,
                    pathNeonBaseOpacity: 0.12,

                    groundBaseOpacity: 0.9,
                    groundWireBaseOpacity: 0.28,

                    stoneBaseOpacity: 0.72,
                    stoneWireBaseOpacity: 0.2,

                    fadeFrontStart: 430,
                    fadeFrontEnd: 760,
                    fadeBackStart: 260,
                    fadeBackEnd: 520,

                    mainGridColor: 0x4f5863,
                    waterGridColor: 0x004477,
                    groundGridColor: 0x008866
                }
            );

        this.landObjects =
            this.terrainManager.setup();

        console.log(
            '[WorldRenderer] procedural terrain landObjects:',
            this.landObjects.length
        );
    }

    handleWorldInteraction(event) {
        if (
            this.lateActSequenceDirector &&
            typeof this.lateActSequenceDirector.handlePointerEvent === 'function'
        ) {
            const consumed =
                this.lateActSequenceDirector.handlePointerEvent(event);

            if (consumed) {
                return true;
            }
        }

        const blueNoteHit =
            this.tryHandleBlueNoteClick(event);

        if (blueNoteHit) {
            return true;
        }

        if (this.isInteractionLocked) {
            return true;
        }

        const mikuHit =
            this.tryHandleMikuTurnClick(event);

        if (mikuHit) {
            return true;
        }

        if (
            this.interactionEventManager &&
            typeof this.interactionEventManager.handlePointerEvent === 'function'
        ) {
            return this.interactionEventManager.handlePointerEvent(
                event
            );
        }

        return false;
    }

    tryHandleBlueNoteClick(event) {
        if (!event) {
            return false;
        }

        if (window.__cameraDragged) {
            return false;
        }

        if (
            !this.blueNoteManager ||
            typeof this.blueNoteManager.getInteractiveObjects !== 'function'
        ) {
            return false;
        }

        const objects =
            this.blueNoteManager.getInteractiveObjects();

        if (!objects || objects.length === 0) {
            return false;
        }

        if (!this.blueNoteClickRaycaster) {
            this.blueNoteClickRaycaster =
                new THREE.Raycaster();
        }

        const rect =
            this.renderer.domElement.getBoundingClientRect();

        const pointer =
            new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );

        this.blueNoteClickRaycaster.setFromCamera(
            pointer,
            this.camera
        );

        const hits =
            this.blueNoteClickRaycaster.intersectObjects(
                objects,
                true
            );

        if (!hits || hits.length === 0) {
            return false;
        }

        this.blueNoteManager.triggerJump?.();

        console.log(
            '[WorldRenderer] Blue note clicked. Jump triggered.'
        );

        return true;
    }

    handlePlaceItem(event, id) {
    if (this.isInteractionLocked) {
        return;
    }

    if (!this.isPlacementEnabled) {
        console.log(
            '[WorldRenderer] Placement ignored: placement is disabled.'
        );
        return;
    }

    this.placementManager.handlePlaceItem(
        event,
        id,
        this.landObjects
    );
}

    clearBlueNotes() {
        const manager =
            this.blueNoteManager;

        if (!manager) {
            return;
        }

        if (typeof manager.clear === 'function') {
            manager.clear();
        } else if (typeof manager.stop === 'function') {
            manager.stop();
        }

        this.hasBlueNoteTriggered = false;

        console.log(
            '[WorldRenderer] Blue notes cleared.'
        );
    }

    hideFloatingLyricsForInterlude() {
        if (
            this.lyricsManager &&
            typeof this.lyricsManager.clear === 'function'
        ) {
            this.lyricsManager.clear();

            console.log(
                '[WorldRenderer] Floating lyrics cleared.'
            );

            return;
        }

        console.log(
            '[WorldRenderer] No lyrics clear method found.'
        );
    }

    updateFlowerFollow(mikuPosition, delta) {
    const placedObjects =
        this.placementManager?.getPlacedObjects?.() || [];

    const anchorController =
        this.placementManager?.surfaceAnchorController;

    placedObjects.forEach(object => {
        if (!object) {
            return;
        }

        const metadata =
            object.userData?.placementMetadata || {};

        const id =
            metadata.id ||
            object.userData?.spawnId ||
            '';

        const isPlant =
            id.startsWith('flower') ||
            id.startsWith('Grass') ||
            id === 'Leaf' ||
            object.userData?.isFlower === true ||
            object.userData?.windReactive === true;

        if (!isPlant) {
            return;
        }

        if (
            object.userData?.isEphemeralBloomObject === true ||
            String(object.name || '').includes('ephemeral')
        ) {
            return;
        }

        let anchored = false;

        if (
            object.userData?.useSurfaceAnchor === true &&
            anchorController
        ) {
            anchored =
                anchorController.updateObject(
                    object
                );
        }

        if (!anchored) {
            if (!object.userData.anchorPosition) {
                object.userData.anchorPosition =
                    object.position.clone();
            }

            object.position.copy(
                object.userData.anchorPosition
            );

            object.userData.useSurfaceAnchor = false;
        }

        object.userData.isWorldFixed = true;
        object.userData.followMiku = false;

        this.spawnManager?.restorePlacedPlantCyberMaterial?.(
            object
        );
    });
}

update(player = null, beat = 0) {
    let delta =
        this.clock.getDelta();

    if (delta > 0.1 || delta <= 0) {
        delta = 0.016;
    }

    if (player && !this.textAlivePlayer) {
        this.textAlivePlayer = player;
    }

    this.characterManager.update(
        delta,
        this.textAlivePlayer
    );

    const mikuPosition =
        this.characterManager.getMikuPosition();

    /*
     * 重要:
     * 先に地形を更新する。
     * その後に、山ローカル固定された花のworld座標を再計算する。
     */
    if (
        this.terrainManager &&
        typeof this.terrainManager.update === 'function'
    ) {
        this.terrainManager.update(
            mikuPosition
        );
    }

    this.updateFlowerFollow(
        mikuPosition,
        delta
    );

    let cameraResult = false;

    if (!this.isLateActCinematicActive) {
        cameraResult =
            this.controls.update(
                delta
            );
    }

    if (
        cameraResult === 'skyReached' &&
        !this._finalSkyTriggered
    ) {
        this._finalSkyTriggered = true;

        this.startMeteorShower?.();

        console.log(
            '[WorldRenderer] Final sky reached. Meteor triggered.'
        );
    }

    if (
        this.environment &&
        typeof this.environment.update === 'function'
    ) {
        this.environment.update(
            this.camera.position,
            this.currentPhase,
            this.environmentLerpSpeed
        );
    }

    this.blueNoteManager.update(
        delta,
        this.miku?.model,
        beat
    );

    this.spawnManager.update(
        delta,
        beat
    );

    this.updateMeteor?.(
        delta
    );

    if (
        this.interactionEventManager &&
        typeof this.interactionEventManager.update === 'function'
    ) {
        this.interactionEventManager.update(
            delta
        );
    }

    if (
        this.effectManager &&
        typeof this.effectManager.update === 'function'
    ) {
        this.effectManager.update(
            this.environment,
            delta
        );
    }

    if (
        this.lateActSequenceDirector &&
        typeof this.lateActSequenceDirector.update === 'function'
    ) {
        this.lateActSequenceDirector.update(
            delta
        );
    }

    const currentPosition =
        this.textAlivePlayer?.timer?.position || 0;

    this.lyricsManager.update(
        this.camera,
        currentPosition
    );

    this.renderer.render(
        this.scene,
        this.camera
    );

    this.spawnManager.update(
    delta,
    beat
);

this.stabilizePlacedPlantMaterials();
}

    onResize() {
        this.camera.aspect =
            window.innerWidth / window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }


setMikuMoveMode(mode) {
    if (
        !this.characterManager ||
        typeof this.characterManager.setMoveMode !== 'function'
    ) {
        return;
    }

    const forceModes =
        new Set([
            'collapsePrep',
            'collapseNow',
            'collapse',
            'walkToStop',
            'walkToStopA',
            'walkToStopB',
            'turn',
            'turnB'
        ]);

    if (
        forceModes.has(mode) &&
        typeof this.characterManager.forceSetMoveMode === 'function'
    ) {
        this.characterManager.forceSetMoveMode(
            mode
        );

        return;
    }

    this.characterManager.setMoveMode(
        mode
    );
}

    triggerBlueWord() {
        console.log(
            '[WorldRenderer] Trigger blue word.'
        );

        this.currentPhase = 'midCyber';
        this.environmentLerpSpeed = 0.1;

        if (this.scene) {
            this.scene.background =
                new THREE.Color(0x001a33);
        }

        if (
            this.environment &&
            typeof this.environment.boostBlueHorizon === 'function'
        ) {
            this.environment.boostBlueHorizon();
        }
    }

    triggerBlueNoteOnly() {
        if (this.hasBlueNoteTriggered) {
            return;
        }

        const mikuModel =
            this.miku?.model;

        if (
            this.blueNoteManager &&
            typeof this.blueNoteManager.start === 'function' &&
            mikuModel
        ) {
            this.blueNoteManager.start(
                mikuModel
            );

            this.hasBlueNoteTriggered = true;

            console.log(
                '[WorldRenderer] Blue note only triggered.'
            );
        }
    }

    triggerKanaVanish() {
        console.log(
            '[WorldRenderer] Trigger kana vanish.'
        );

        this.currentPhase = 'intro';
        this.environmentLerpSpeed = 0.08;

        if (this.scene) {
            this.scene.background =
                new THREE.Color(0x020306);
        }
    }

    triggerDataSmog() {
        console.log(
            '[WorldRenderer] Trigger data smog.'
        );

        this.currentPhase = 'midIndigo';
        this.environmentLerpSpeed = 0.08;

        if (
            this.environment &&
            typeof this.environment.clearSmog === 'function'
        ) {
            this.environment.clearSmog();
        }
    }

    prepareMikuDissolveInterlude() {
        console.log(
            '[WorldRenderer] Preparing Miku dissolve interlude.'
        );

        this.setPlacementEnabled?.(false);
        this.setInteractionLocked?.(true);

        this.clearBlueNotes();

        this.hideFloatingLyricsForInterlude();

        if (
            this.ui &&
            typeof this.ui.hideItemMenu === 'function'
        ) {
            this.ui.hideItemMenu();
        }

        console.log(
            '[WorldRenderer] Miku dissolve interlude prepared. Terrain and placed objects remain.'
        );
    }

    
    getTerrainSurfaceYAt(x, z, fallbackY = 0) {
        if (
            !this.landObjects ||
            this.landObjects.length === 0
        ) {
            return fallbackY;
        }

        const raycaster =
            new THREE.Raycaster();

        raycaster.set(
            new THREE.Vector3(
                x,
                220,
                z
            ),
            new THREE.Vector3(
                0,
                -1,
                0
            )
        );

        const hits =
            raycaster.intersectObjects(
                this.landObjects,
                true
            );

        if (!hits || hits.length === 0) {
            return fallbackY;
        }

        return hits[0].point.y;
    }

    isMountainSurfaceObject(object) {
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

        return (
            joined.includes('mountain') ||
            joined.includes('mountains') ||
            joined.includes('ground_right_mountains') ||
            joined.includes('ground_left_mountains') ||
            joined.includes('right_mountains') ||
            joined.includes('left_mountains') ||
            joined.includes('side_mountain') ||
            joined.includes('horizon_mountain')
        );
    }

    getMountainSurfaceObjects() {
        const results = [];

        if (!this.landObjects || this.landObjects.length === 0) {
            return results;
        }

        this.landObjects.forEach(root => {
            root.traverse?.(child => {
                if (
                    child.isMesh &&
                    this.isMountainSurfaceObject(child)
                ) {
                    results.push(child);
                }
            });

            if (
                root.isMesh &&
                this.isMountainSurfaceObject(root)
            ) {
                results.push(root);
            }
        });

        return results;
    }

    getMountainSurfacePointAt(x, z) {
        const mountainObjects =
            this.getMountainSurfaceObjects();

        if (!mountainObjects || mountainObjects.length === 0) {
            return null;
        }

        const raycaster =
            new THREE.Raycaster();

        raycaster.set(
            new THREE.Vector3(
                x,
                280,
                z
            ),
            new THREE.Vector3(
                0,
                -1,
                0
            )
        );

        const hits =
            raycaster.intersectObjects(
                mountainObjects,
                true
            );

        if (!hits || hits.length === 0) {
            return null;
        }

        return hits[0].point.clone();
    }
createAnchoredMountainFlowerBatches(count = 360) {
    if (!this.mountainFlowerPointService) {
        return [];
    }

    const leftMountainGroup =
        this.terrainManager?.leftMountainGroup ||
        null;

    const rightMountainGroup =
        this.terrainManager?.rightMountainGroup ||
        null;

    const batches =
        this.mountainFlowerPointService.createSideMountainBatches({
            leftMountainGroup,
            rightMountainGroup,
            count
        });

    console.log(
        `[WorldRenderer] Anchored mountain flower batches created. batches=${batches.length}, count=${count}`
    );

    return batches;
}
createMountainFlowerPoints(count = 320) {
    const batches =
        this.createAnchoredMountainFlowerBatches(
            count
        );

    const points = [];

    batches.forEach(batch => {
        points.push(
            ...batch.points.map(point => {
                return batch.anchor.localToWorld(
                    point.clone()
                );
            })
        );
    });

    console.log(
        `[WorldRenderer] Mountain flower points created. count=${points.length}`
    );

    return points;
}
stabilizePlacedPlantMaterials() {
    const placedObjects =
        this.placementManager?.getPlacedObjects?.() || [];

    placedObjects.forEach(object => {
        if (!object) {
            return;
        }

        const metadata =
            object.userData?.placementMetadata || {};

        const id =
            metadata.id ||
            object.userData?.spawnId ||
            '';

        const isPlant =
            id.startsWith('flower') ||
            id.startsWith('Grass') ||
            id === 'Leaf' ||
            object.userData?.isFlower === true ||
            object.userData?.windReactive === true;

        if (!isPlant) {
            return;
        }

        this.spawnManager?.restorePlacedPlantCyberMaterial?.(
            object
        );
    });
}

triggerMelodyMountainBloom(options = {}) {
    const count =
        options.count ?? 360;

    const batches =
        this.createAnchoredMountainFlowerBatches(
            count
        );

    if (!batches || batches.length === 0) {
        console.warn(
            '[WorldRenderer] No anchored mountain flower batches. Melody bloom skipped.'
        );
        return;
    }

    this.proceduralMountainFlowerField?.startAnchoredBatches?.(
        batches,
        {
            pointSize:
                options.pointSize ?? 1.55,

            opacity:
                options.opacity ?? 0.96
        }
    );

    this.proceduralMountainFlowerField?.startPropagation?.({
        duration: 3.4,
        delayPerFlower: 0.004
    });

    const total =
        batches.reduce((sum, batch) => {
            return sum + batch.points.length;
        }, 0);

    console.log(
        `[WorldRenderer] Procedural melody mountain flowers created. count=${total}, anchored=true`
    );
}

    triggerPlacedFlowerLightPropagation() {
        const objects =
            this.placementManager?.getPlacedObjects?.() || [];

        const flowers =
            objects.filter(object => {
                const metadata =
                    object.userData?.placementMetadata || {};

                const id =
                    metadata.id || '';

                return (
                    id.startsWith('flower') ||
                    object.userData?.isFlower === true
                );
            });

        if (flowers.length === 0) {
            console.log(
                '[WorldRenderer] No placed flowers for propagation.'
            );
            return;
        }

        flowers.sort((a, b) => {
            return a.position.z - b.position.z;
        });

        this.placedFlowerLightPropagationEffect?.start?.(
            flowers,
            {
                duration: 3.8,
                delayPerObject: 0.11
            }
        );

        console.log(
            `[WorldRenderer] Placed flower light propagation started. count=${flowers.length}`
        );
    }

triggerVoiceEchoNotes() {
    const mikuModel =
        this.miku?.model;

    if (!mikuModel) {
        console.warn(
            '[WorldRenderer] Cannot expand voice echo notes: Miku missing.'
        );
        return;
    }

    this.blueNoteManager?.expandToCount?.(
        6,
        mikuModel
    );

    const sources =
        this.blueNoteManager?.getInteractiveObjects?.() || [];

    this.noteTrailEffect?.start?.(
        sources
    );

    console.log(
        `[WorldRenderer] Voice echo notes expanded. sources=${sources.length}`
    );
}

showEndingTitle() {
    if (this._endingTitleShown) {
        return;
    }

    this._endingTitleShown = true;

    const existing =
        document.getElementById('ending-title-overlay');

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement('div');

    overlay.id =
        'ending-title-overlay';

    overlay.style.position =
        'fixed';

    overlay.style.inset =
        '0';

    overlay.style.zIndex =
        '12000';

    overlay.style.pointerEvents =
        'none';

    overlay.style.display =
        'flex';

    overlay.style.alignItems =
        'center';

    overlay.style.justifyContent =
        'center';

    overlay.style.textAlign =
        'center';

    overlay.style.color =
        'rgba(255, 255, 255, 0.96)';

    overlay.style.opacity =
        '0';

    overlay.style.transition =
        'opacity 3.2s ease';

    overlay.style.background =
        'radial-gradient(circle at 50% 46%, rgba(120, 220, 255, 0.10), rgba(0, 0, 0, 0.0) 42%)';

    overlay.innerHTML = `
        <div style="
            transform: translateY(-2vh);
            text-shadow:
                0 0 24px rgba(150, 230, 255, 0.42),
                0 0 80px rgba(80, 170, 255, 0.22);
        ">
            <div style="
                font-size: clamp(34px, 6vw, 76px);
                letter-spacing: 0.18em;
                text-indent: 0.18em;
                margin-bottom: 28px;
                font-weight: 500;
            ">
                世界最後の音楽隊
            </div>

            <div style="
                font-size: clamp(16px, 2.4vw, 28px);
                letter-spacing: 0.12em;
                margin-bottom: 42px;
                color: rgba(235, 250, 255, 0.88);
            ">
                夏山よつぎ
            </div>

            <div style="
                font-size: clamp(11px, 1.4vw, 16px);
                line-height: 2.0;
                letter-spacing: 0.08em;
                color: rgba(225, 245, 255, 0.74);
            ">
                <div>■Lyrics &amp; Music - 夏山よつぎ</div>
                <div>■Arrangement &amp; Mix - ど〜ぱみん</div>
                <div>■Vocal - 初音ミク</div>
                <div>■Chorus - MEIKO, KAITO, 鏡音リン, 鏡音レン, 巡音ルカ</div>
            </div>
        </div>
    `;

    document.body.appendChild(
        overlay
    );

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
    });

    // タイトルを見せてから終幕フェード
    setTimeout(() => {
        this.startFadeOut?.();
    }, 7200);

    console.log(
        '[WorldRenderer] Ending title shown.'
    );
}

    tryHandleMikuTurnClick(event) {
        if (!event) {
            return false;
        }

        if (
            !this.characterManager ||
            !this.characterManager.canPlayTurnFromClick?.()
        ) {
            return false;
        }

        const miku =
            this.characterManager.getMiku();

        if (!miku || !miku.model) {
            return false;
        }

        if (!this.mikuClickRaycaster) {
            this.mikuClickRaycaster =
                new THREE.Raycaster();
        }

        const rect =
            this.renderer.domElement.getBoundingClientRect();

        const pointer =
            new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );

        this.mikuClickRaycaster.setFromCamera(
            pointer,
            this.camera
        );

        const hits =
            this.mikuClickRaycaster.intersectObjects(
                this.scene.children,
                true
            );

        if (!hits || hits.length === 0) {
            return false;
        }

        const firstHit =
            hits[0];

        if (
            !this.isMikuObject(
                firstHit.object,
                miku.model
            )
        ) {
            return false;
        }

        console.log(
            '[Miku CLICK → Turn]'
        );

        this.characterManager.playTurnFromClick();

        return true;
    }

    isMikuObject(object, root) {
        let current =
            object;

        while (current) {
            if (current === root) {
                return true;
            }

            current =
                current.parent;
        }

        return false;
    }

    startPreload() {
    console.log('loading...');

    this.lyricsManager?.setEnabled?.(
        false
    );
}
startMusic() {
    console.log('music start');

    // ✅ 再生開始直後はtime=0の可能性があるので遅延
    setTimeout(() => {
        const currentTime =
            this.textAlivePlayer?.timer?.position || 0;

        this.lyricsManager?.setEnabled?.(
            true,
            currentTime
        );
    }, 100);
}

    spawnMiku() {
        console.log('miku spawn');
    }

startMeteorShower() {
    if (
        this.meteorActive ||
        this.meteorGroup
    ) {
        return;
    }

    this.meteorGroup =
        new THREE.Group();

    this.meteorGroup.name =
        'endingMeteorShowerGroup';

    this.scene.add(
        this.meteorGroup
    );

    const count = 40;

    for (let i = 0; i < count; i++) {
        const length =
            3.0 + Math.random() * 2.8;

        const geometry =
            new THREE.CylinderGeometry(
                0.075,
                0.18,
                length,
                10,
                1,
                true
            );

        const material =
            new THREE.MeshBasicMaterial({
                color: 0xc8f4ff,
                transparent: true,
                opacity: 0.96,
                depthWrite: false,
                depthTest: true,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            });

        const meteor =
            new THREE.Mesh(
                geometry,
                material
            );

        meteor.position.set(
            (Math.random() - 0.5) * 150,
            36 + Math.random() * 58,
            -45 - Math.random() * 120
        );

        const velocity =
            new THREE.Vector3(
                -18 - Math.random() * 18,
                -10 - Math.random() * 10,
                5 + Math.random() * 10
            );

        meteor.userData.velocity =
            velocity;

        meteor.userData.life = 0;

        // 表示時間を1.5倍
        meteor.userData.maxLife =
            (
                4.5 +
                Math.random() * 3.0
            ) * 1.5;

        const direction =
            velocity.clone().normalize();

        const quaternion =
            new THREE.Quaternion();

        quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction
        );

        meteor.quaternion.copy(
            quaternion
        );

        meteor.renderOrder = 80;

        this.meteorGroup.add(
            meteor
        );
    }

    this.meteorActive = true;

    console.log(
        '[WorldRenderer] Meteor shower started.'
    );
}


updateMeteor(delta) {
    if (
        !this.meteorActive ||
        !this.meteorGroup
    ) {
        return;
    }

    const removeTargets = [];

    this.meteorGroup.children.forEach(meteor => {
        meteor.userData.life += delta;

        meteor.position.addScaledVector(
            meteor.userData.velocity,
            delta
        );

        const lifeRate =
            THREE.MathUtils.clamp(
                meteor.userData.life /
                    meteor.userData.maxLife,
                0,
                1
            );

        if (meteor.material) {
            meteor.material.opacity =
                0.92 * (1.0 - lifeRate);

            meteor.material.needsUpdate = true;
        }

        if (lifeRate >= 1.0) {
            removeTargets.push(
                meteor
            );
        }
    });

    removeTargets.forEach(meteor => {
        meteor.geometry?.dispose?.();
        meteor.material?.dispose?.();

        this.meteorGroup.remove(
            meteor
        );
    });

    if (
        this.meteorGroup &&
        this.meteorGroup.children.length === 0
    ) {
        this.scene.remove(
            this.meteorGroup
        );

        this.meteorGroup = null;
        this.meteorActive = false;

        console.log(
            '[WorldRenderer] Meteor shower completed.'
        );
    }
}

startLyricAttractForRebirth() {
    if (!this.lyricsManager) {
        return;
    }

    const mikuPosition =
        this.characterManager?.getMikuPosition?.()
            ?.clone() ||
        new THREE.Vector3(0, 0, 0);

    const targetPosition =
        new THREE.Vector3(
            mikuPosition.x,
            1.45,
            mikuPosition.z
        );

    const currentTime =
        this.textAlivePlayer?.timer?.position || 0;

    this.lyricsManager.startRebirthLyricGatherSequence(
        targetPosition,
        this.camera,
        currentTime
    );

    console.log(
        '[WorldRenderer] Rebirth lyric gather scheduled at Miku position.',
        targetPosition
    );
}

revealMikuFromAttractedLyrics() {
    const targetPosition =
        this.lyricsManager?.getLastAttractTargetPosition?.() ||
        this.characterManager?.getMikuPosition?.()?.clone() ||
        new THREE.Vector3(0, 0, 0);

    this.lyricsManager?.forceCompleteAttractBeforeReveal?.();
    this.lyricsManager?.clearAttractedLyrics?.();

    const currentMikuPosition =
        this.characterManager?.getMikuPosition?.()
            ?.clone() ||
        new THREE.Vector3(0, 0, 0);

    const spawnPosition =
        currentMikuPosition.clone();

    spawnPosition.x = 0;
    spawnPosition.y = 0;

    const revealed =
        this.characterManager?.revealMikuAt?.(
            spawnPosition,
            'hart'
        );

    if (!revealed) {
        console.warn(
            '[WorldRenderer] Failed to reveal Miku from attracted lyrics.'
        );
        return;
    }

    this.setInteractionLocked?.(false);
    this.setPlacementEnabled?.(true);

    this.currentPhase = 'lastChorus';
    this.environmentLerpSpeed = 0.12;

    console.log(
        '[WorldRenderer] Miku revealed immediately from empty heart phrase.',
        {
            targetPosition,
            spawnPosition
        }
    );
}

playLateMarchRunToWalk() {
    this.setMikuMoveMode?.('run');

    const mikuModel =
        this.miku?.model;

    if (
        this.blueNoteManager &&
        this.blueNoteManager.mode !== 'orbit' &&
        mikuModel
    ) {
        this.blueNoteManager.enterOrbitMode(
            mikuModel
        );
    }

    console.log(
        '[WorldRenderer] Late march: keep running, notes keep orbiting.'
    );
}



    playLateWalkStopLoop() {
        if (this.isLateWalkStopLoopPlaying) {
            return;
        }

        this.isLateWalkStopLoopPlaying = true;

        this.setMikuMoveMode?.('run');

        setTimeout(() => {
            this.setMikuMoveMode?.('walkToStopA');
        }, 950);

        setTimeout(() => {
            this.setMikuMoveMode?.('run');
        }, 2100);

        setTimeout(() => {
            this.setMikuMoveMode?.('walkToStopA');
        }, 3300);

        setTimeout(() => {
            this.isLateWalkStopLoopPlaying = false;
        }, 4600);

        console.log(
            '[WorldRenderer] Late lyric run-stop loop started.'
        );
    }

startEndingCameraReturn() {
    this.controls?.startEndingReturn?.(
        () => this.getEndingHorizonTarget(),
        {
            duration: 5.0
        }
    );

    this.currentPhase = 'dawn';
    this.environmentLerpSpeed = 0.012;

    setTimeout(() => {
        this.setMikuMoveMode?.('walkToStopA');
    }, 900);

    console.log(
        '[WorldRenderer] Ending camera return started.'
    );
}

playEndingMikuTurnB() {
    if (this.hasEndingTurnBPlayed) {
        return;
    }

    this.hasEndingTurnBPlayed = true;

    // TurnBは使わず、自然な回転後にHartへ
    this.setMikuMoveMode?.(
        'endingHart'
    );

    console.log(
        '[WorldRenderer] Ending Hart facing camera started.'
    );
}


startEndingWorldDiscovery() {
    this.controls?.startEndingDiscover?.(
        () => this.getEndingWorldTarget(),
        {
            duration: 8.0
        }
    );

    this.currentPhase = 'dawn';
    this.environmentLerpSpeed = 0.01;

    // =========================
    // カメラがミクを捉える少し前〜直後
    // =========================
    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.playEndingMikuTurnB?.();
        }, 6200)
    );

    console.log(
        '[WorldRenderer] Ending world discovery started.'
    );
}
startEndingWorldResponse() {
    const placedObjects =
        this.placementManager?.getPlacedObjects?.() || [];

    this.endingWorldResponseEffect?.start?.(
        placedObjects,
        {
            duration: 0.5,
            delayPerObject: 0.035
        }
    );

    this.placedFlowerLightPropagationEffect?.start?.(
        placedObjects.filter(object => {
            const id =
                object.userData?.placementMetadata?.id || '';

            return (
                id.startsWith('flower') ||
                object.userData?.isFlower === true
            );
        }),
        {
            duration: 0.5,
            delayPerObject: 0.035
        }
    );

    console.log(
        '[WorldRenderer] Ending world response triggered.'
    );
}

startEndingStill() {
    this.controls?.startEndingStill?.({
        duration: 4.0
    });

    console.log(
        '[WorldRenderer] Ending still started.'
    );
}

    lockCameraBehindMikuForEnding() {
    this.setInteractionLocked?.(true);
    this.setPlacementEnabled?.(false);

    this.controls?.setInputLocked?.(true);

    this.controls?.startReturnBehindMiku?.({
        duration: 2.8,
        targetYaw: 0
    });

    console.log(
        '[WorldRenderer] Camera locked and returning behind Miku for ending.'
    );
}

startEndingOverviewCamera() {
    this.controls?.startEndingOverview?.({
        duration: 8.0,
        forwardDistance: 60,
        upAmount: 0,
        targetFov: 58
    });

    console.log(
        '[WorldRenderer] Ending overview camera started.'
    );
}

startFadeOut() {
    const overlay =
        document.getElementById('ending-fade-overlay') ||
        document.createElement('div');

    overlay.id = 'ending-fade-overlay';

    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';

    // 白飛びではなく、朝焼けに溶ける
    overlay.style.background =
        'linear-gradient(to bottom, rgba(255, 210, 170, 0.0), rgba(255, 238, 218, 1.0))';

    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 4s ease';

    if (!overlay.parentNode) {
        document.body.appendChild(overlay);
    }

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
    });

    console.log(
        '[WorldRenderer] Ending fade out started.'
    );
}

    stopMikuAtCurrentPlace() {
        this.setMikuMoveMode?.('stop');

        console.log(
            '[WorldRenderer] Miku stopped at this place.'
        );
    }

    playMikuFuturePose() {
        this.setMikuMoveMode?.('think');

        this.currentPhase = 'dawn';
        this.environmentLerpSpeed = 0.08;

        console.log(
            '[WorldRenderer] Miku future pose. Dawn begins softly.'
        );
    }

playFinalMusicReach() {


    if (this.isFinalEndingSequencePlaying) {
        console.log(
            '[WorldRenderer] playFinalMusicReach ignored during final ending.'
        );
        return;
    }

    if (this.isFinalMusicReachPlaying) {
        return;
    }

    this.isFinalMusicReachPlaying = true;

    this.setMikuMoveMode?.('turn');

    // =========================
    // ✅ Handに切り替え
    // =========================
    setTimeout(() => {

        const mikuModel =
            this.miku?.model;

        if (mikuModel) {
            this.blueNoteManager?.expandToCount?.(
                6,
                mikuModel
            );
        }

        this.setMikuMoveMode?.('reach'); // ← hand

        // =========================
        // ✅ 音符上昇スタート
        // =========================
        this.blueNoteManager?.ascendAllNotes?.({
            duration: 4.8,
            target: mikuModel
        });

        // =========================
        // ✅ カメラは「さらに遅らせる」
        // =========================
        setTimeout(() => {

            this.controls?.startFinalNoteAscendFollow?.(
                () => this.getBlueNoteCenter?.(),
                {
                    duration: 4.8
                }
            );

            console.log('[Camera] delayed follow after hand');

        }, 700); // ←ここ重要（0.6〜0.9で調整OK）

    }, 1450); // ← turn→handの切替タイミング

    // =========================
    // 状態維持
    // =========================
    setTimeout(() => {
        this.isFinalMusicReachPlaying = false;
    }, 5200);

    this.currentPhase = 'dawn';
    this.environmentLerpSpeed = 0.16;

    console.log(
        '[WorldRenderer] Final music: synced to turn→hand.'
    );
}

    triggerRebirthBlueNotes() {
        const mikuModel =
            this.miku?.model;

        if (
            this.blueNoteManager &&
            typeof this.blueNoteManager.start === 'function' &&
            mikuModel
        ) {
            this.blueNoteManager.start(
                mikuModel,
                {
                    count: 2,
                    followBehind: true,
                    forceRestart: true
                }
            );

            this.hasRebirthBlueNotesTriggered = true;
            this.hasBlueNoteTriggered = true;

            console.log(
                '[WorldRenderer] Rebirth blue notes triggered.'
            );
        }
    }

    playLateDataSmogReachSequence() {
        this.setMikuMoveMode?.('run');

        console.log(
            '[WorldRenderer] Late data smog sequence skipped. Miku keeps running.'
        );
    }

    triggerEndingNoteAscend() {
        const pos =
            this.characterManager.getMikuPosition();

        this.endingNoteAscendEffect.start(
            pos
        );
    }
}

