import * as THREE from 'three';


/**
 * WordImpactEffectManager
 *
 * ・単語クリック時の各フェクトを同時進行させる * ・単語クリック時の各種エフェクトを管理するクラス
 *
 * 主な特徴：
 * - 単語ごとに異なる演出をトリガー
 * - update内で時間進行＆自動破棄
 * - 一部オブジェクト（イロ花）は永続管理
 */


export class WordImpactEffectManager {
    constructor(worldRenderer) {
        this.worldRenderer = worldRenderer;
        this.scene = worldRenderer.scene;
        this.group = new THREE.Group();
        this.group.name = 'wordImpactEffectGroup';
        this.scene.add(this.group);
        this.effects = [];
        this.persistentFlowers = [];
        this.hasIroBloomed = false;
        this.windEnabled = false;
        this.iroBloomQueue = null;
        this.iroBloomTerrainMeshesCache = null;
        this.iroBloomObjectLifetime = 6.0;
        this.iroBloomObjectFadeDuration = 2.0;
    }

    update(delta = 0.016) {
        this.updateIroBloomQueue(delta);
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];

            effect.elapsed += delta;

            if (typeof effect.update === 'function') {
                effect.update(delta, effect.elapsed);
            }

            if (effect.elapsed >= effect.duration) {
                if (typeof effect.dispose === 'function') {
                    effect.dispose();
                }

                this.effects.splice(i, 1);
            }
        }
    }

    clear() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];

            if (typeof effect.dispose === 'function') {
                effect.dispose();
            }
        }

        this.effects = [];

        while (this.group.children.length > 0) {
            const child = this.group.children[0];

            this.disposeTemporaryObject(child);
            child.parent?.remove(child);
        }
    }

    applyWordEffect(word, position) {
    const handlers = {
        ソラ: () => this.spawnDistantMeteorShower(position),
        イロ: () => this.bloomWithExistingFlower(position),
        カナシミ: () => this.spawnSadnessBlue(position),
        ヒカリ: () => this.spawnAurora(),
        ナミダ: () => this.spawnRain(position),
        カタチ: () => this.spawnWideTransparentPrisms(position),
        オンガク: () => this.spawnToneObjectsOnPath(position)
    };

    if (handlers[word]) {
    handlers[word]();
    return;
}

    this.spawnSpark(position, 0xeaffff, 18);
}
spawnAurora() {
    this.scene.background = new THREE.Color(0x003366);
    const light = new THREE.HemisphereLight(
        0x33ccff,   // 空
        0x001122,   // 地面
        1.4
    );

    this.scene.add(light);
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(200),
            new THREE.MeshBasicMaterial({
                color: 0x00ccff,
                transparent: true,
                opacity: 0.25,
                side: THREE.BackSide
            })
        );

    const camera = this.worldRenderer.camera;
    flash.position.copy(camera.position);

    this.scene.add(flash);

    this.effects.push({
        elapsed: 0,
        duration: 1.5,
        update: (delta, elapsed) => {
            flash.material.opacity =
                0.25 * (1.0 - elapsed / 1.5);
        },
        dispose: () => {
            flash.parent?.remove(flash);
            flash.geometry.dispose();
            flash.material.dispose();
        }
    });

    console.log('[WordImpactEffect] HIKARI VISIBLE CHANGE');
}



activateWind() {
    if (this.windEnabled) return;

    this.windEnabled = true;

    console.log('[WordImpactEffect] Wind activated');

    this.spawnHeartPulse(
        this.worldRenderer.camera.position.clone()
    );
}
    spawnLandingRipple(position) {
        this.spawnRipple(
            new THREE.Vector3(
                position.x,
                0.08,
                position.z
            ),
            {
                color: 0x9fefff,
                opacity: 0.32,
                startScale: 0.4,
                endScale: 6.0,
                duration: 1.6
            }
        );
    }

    spawnRipple(position, options = {}) {
        const color = options.color ?? 0x9fefff;
        const opacity = options.opacity ?? 0.3;
        const startScale = options.startScale ?? 0.5;
        const endScale = options.endScale ?? 4.0;
        const duration = options.duration ?? 1.4;

        const geometry =
            new THREE.RingGeometry(
                0.85,
                0.92,
                96
            );

        const material =
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

        const ring =
            new THREE.Mesh(
                geometry,
                material
            );

        ring.name = 'word_ripple';
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(position);
        ring.scale.setScalar(startScale);
        ring.renderOrder = 92;

        this.group.add(ring);

        this.effects.push({
            elapsed: 0,
            duration,
            update: (delta, elapsed) => {
                const t =
                    THREE.MathUtils.clamp(
                        elapsed / duration,
                        0,
                        1
                    );

                const ease =
                    THREE.MathUtils.smoothstep(
                        t,
                        0,
                        1
                    );

                ring.scale.setScalar(
                    THREE.MathUtils.lerp(
                        startScale,
                        endScale,
                        ease
                    )
                );

                material.opacity =
                    opacity *
                    (
                        1.0 -
                        THREE.MathUtils.smoothstep(
                            t,
                            0.55,
                            1.0
                        )
                    );
            },
            dispose: () => {
                ring.parent?.remove(ring);
                geometry.dispose();
                material.dispose();
            }
        });
    }

    spawnDistantMeteorShower(position) {
        const basis =
            this.getCameraHorizontalBasis();

        const camera =
            this.worldRenderer.camera;

        const skyBase =
            camera.position
                .clone()
                .addScaledVector(
                    basis.forward,
                    180
                );

        skyBase.y += 42;

        const meteorCount = 14;

        for (let i = 0; i < meteorCount; i++) {
            const start =
                skyBase.clone()
                    .addScaledVector(
                        basis.right,
                        (Math.random() - 0.5) * 70
                    )
                    .addScaledVector(
                        basis.forward,
                        (Math.random() - 0.5) * 20
                    );

            start.y +=
                (Math.random() - 0.5) * 12;

            const end =
                start.clone()
                    .addScaledVector(
                        basis.right,
                        -4.0 - Math.random() * 5.0
                    )
                    .addScaledVector(
                        basis.forward,
                        2.0 + Math.random() * 4.0
                    );

            end.y -=
                6.0 + Math.random() * 4.5;

            const geometry =
                new THREE.BufferGeometry()
                    .setFromPoints([
                        start,
                        start
                    ]);

            const material =
                new THREE.LineBasicMaterial({
                    color: 0xbfe7ff,
                    transparent: true,
                    opacity: 0.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

            const line =
                new THREE.Line(
                    geometry,
                    material
                );

            line.name = 'sora_distant_meteor';
            line.renderOrder = 96;

            this.group.add(line);

            const delay =
                i * 0.11;

            const duration =
                1.25 + Math.random() * 0.55;

            this.effects.push({
                elapsed: -delay,
                duration,
                update: (delta, elapsed) => {
                    if (elapsed < 0) {
                        return;
                    }

                    const t =
                        THREE.MathUtils.clamp(
                            elapsed / duration,
                            0,
                            1
                        );

                    const ease =
                        THREE.MathUtils.smoothstep(
                            t,
                            0,
                            1
                        );

                    const current =
                        start.clone().lerp(
                            end,
                            ease
                        );

                    const tail =
                        start.clone().lerp(
                            end,
                            Math.max(
                                0,
                                ease - 0.18
                            )
                        );

                    geometry.setFromPoints([
                        tail,
                        current
                    ]);

                    geometry.attributes.position.needsUpdate = true;

                    const fadeIn =
                        THREE.MathUtils.smoothstep(
                            t,
                            0.0,
                            0.18
                        );

                    const fadeOut =
                        1.0 -
                        THREE.MathUtils.smoothstep(
                            t,
                            0.7,
                            1.0
                        );

                    material.opacity =
                        0.62 * fadeIn * fadeOut;
                },
                dispose: () => {
                    line.parent?.remove(line);
                    geometry.dispose();
                    material.dispose();
                }
            });
        }

        console.log(
            '[WordImpactEffect] SORA distant meteor shower.'
        );
    }

bloomWithExistingFlower(position) {
    if (this.hasIroBloomed) return;

    this.hasIroBloomed = true;

    const spawnManager = this.worldRenderer.spawnManager;

    if (!spawnManager) {
        console.warn('[WordImpactEffect] SpawnManager not found.');
        return;
    }

    const terrainMeshes =
        this.getCachedIroBloomTerrainMeshes();

    if (terrainMeshes.length === 0) {
        console.warn(
            '[WordImpactEffect] No terrain meshes found for IRO bloom.'
        );
        return;
    }

    this.iroBloomQueue = {
        centerPosition: position.clone(),
        terrainMeshes,
        raycaster: new THREE.Raycaster(),
        candidates: [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ],
        targetCount: 240,
        spawnedCount: 0,
        attempts: 0,
        maxAttempts: 240 * 14
    };

    console.log('[WordImpactEffect] IRO bloom queued.');
}
updateIroBloomQueue(delta = 0.016) {
    if (!this.iroBloomQueue) return;

    const queue = this.iroBloomQueue;
    const spawnManager = this.worldRenderer.spawnManager;

    if (!spawnManager) {
        this.iroBloomQueue = null;
        return;
    }
    const spawnBudgetPerFrame = 8;
    const attemptBudgetPerFrame = 40;

    let spawnedThisFrame = 0;
    let attemptsThisFrame = 0;

    while (
        queue.spawnedCount < queue.targetCount &&
        queue.attempts < queue.maxAttempts &&
        spawnedThisFrame < spawnBudgetPerFrame &&
        attemptsThisFrame < attemptBudgetPerFrame
    ) {
        queue.attempts++;
        attemptsThisFrame++;

        const id =
            queue.candidates[
                Math.floor(
                    Math.random() * queue.candidates.length
                )
            ];

        const candidateXZ =
            this.createIroBloomCandidateXZ(
                queue.centerPosition
            );

        const hit =
            this.pickTopTerrainHit(
                candidateXZ,
                queue.terrainMeshes,
                queue.raycaster
            );

        if (!hit) {
            continue;
        }

        const surfaceType =
            this.getSurfaceTypeHint(hit.object);
        if (surfaceType !== 'ground') {
            continue;
        }

        const spawnPosition =
            hit.point.clone();

        spawnPosition.y += 0.025;

        const isFlower =
            id === 'flower1' ||
            id === 'flower2' ||
            id === 'flower3';

        const scaleMultiplier = isFlower
            ? 0.12 + Math.random() * 0.16
            : 0.07 + Math.random() * 0.08;

        const obj = spawnManager.spawn(
            id,
            spawnPosition,
            {
                scaleMultiplier,
                randomRotation: false
            }
        );

        if (!obj) {
            continue;
        }

        this.keepBloomObjectUpright(
            obj
        );

        obj.rotation.y =
            Math.random() * Math.PI * 2;

        obj.userData.windReactive = true;
obj.userData.iroBloomObject = true;

this.persistentFlowers.push(obj);
this.scheduleTemporaryBloomObjectRemoval(
    obj,
    this.iroBloomObjectLifetime + Math.random() * 6.0,
    this.iroBloomObjectFadeDuration
);

queue.spawnedCount++;
spawnedThisFrame++;
    }

    if (
        queue.spawnedCount >= queue.targetCount ||
        queue.attempts >= queue.maxAttempts
    ) {
        console.log(
            `[WordImpactEffect] IRO bloom completed: ${queue.spawnedCount}/${queue.targetCount}, attempts=${queue.attempts}`
        );

        this.iroBloomQueue = null;
    }
}
keepBloomObjectUpright(object) {
    if (!object) return;
    object.rotation.x = 0;
    object.rotation.z = 0;
    object.scale.x = Math.abs(object.scale.x);
    object.scale.y = Math.abs(object.scale.y);
    object.scale.z = Math.abs(object.scale.z);
}

getCachedIroBloomTerrainMeshes() {
    if (
        this.iroBloomTerrainMeshesCache &&
        this.iroBloomTerrainMeshesCache.length > 0
    ) {
        return this.iroBloomTerrainMeshesCache;
    }

    this.iroBloomTerrainMeshesCache =
        this.collectBloomTerrainMeshes();

    return this.iroBloomTerrainMeshesCache;
}

collectBloomTerrainMeshes() {
    const meshes = [];

    this.scene.traverse(object => {
        if (!object || !object.isMesh) {
            return;
        }

        if (object.userData?.iroBloomObject) {
            return;
        }

        const surfaceType =
            this.getSurfaceTypeHint(object);

        if (
            surfaceType === 'ground' ||
            surfaceType === 'water' ||
            surfaceType === 'path' ||
            surfaceType === 'road' ||
            surfaceType === 'stone'
        ) {
            meshes.push(object);
        }
    });

    return meshes;
}

createIroBloomCandidateXZ(centerPosition) {
    const radius =
        8 + Math.random() * 95;

    const angle =
        Math.random() * Math.PI * 2;

    return new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * radius,
        0,
        centerPosition.z + Math.sin(angle) * radius
    );
}

pickTopTerrainHit(candidateXZ, terrainMeshes, raycaster) {
    const rayOrigin =
        new THREE.Vector3(
            candidateXZ.x,
            160,
            candidateXZ.z
        );

    raycaster.set(
        rayOrigin,
        new THREE.Vector3(0, -1, 0)
    );

    raycaster.far = 260;

    const hits =
        raycaster.intersectObjects(
            terrainMeshes,
            false
        );

    if (!hits || hits.length === 0) {
        return null;
    }

    return hits[0];
}

getSurfaceTypeHint(object) {
    const values = [];

    let current = object;

    while (current) {
        if (current.userData?.surfaceType) {
            values.push(
                String(current.userData.surfaceType)
            );
        }

        if (current.name) {
            values.push(current.name);
        }

        current = current.parent;
    }

    const material = object.material;

    if (Array.isArray(material)) {
        material.forEach(mat => {
            if (mat?.name) {
                values.push(mat.name);
            }
        });
    } else if (material?.name) {
        values.push(material.name);
    }

    const text =
        values
            .join(' ')
            .toLowerCase();

    if (
        text.includes('water') ||
        text.includes('lake')
    ) {
        return 'water';
    }

    if (
        text.includes('path') ||
        text.includes('road')
    ) {
        return 'path';
    }

    if (
        text.includes('stone')
    ) {
        return 'stone';
    }

    if (
        text.includes('ground') ||
        text.includes('island') ||
        text.includes('mountain') ||
        text.includes('side_mountain') ||
        text.includes('horizon_mountain')
    ) {
        return 'ground';
    }

    return 'unknown';
}


alignObjectToSurface(object, hit) {
    if (!object || !hit) {
        return;
    }

    if (!hit.face || !hit.object) {
        return;
    }

    const normal =
        hit.face.normal
            .clone()
            .transformDirection(
                hit.object.matrixWorld
            )
            .normalize();

    const up =
        new THREE.Vector3(0, 1, 0);

    const quaternion =
        new THREE.Quaternion()
            .setFromUnitVectors(
                up,
                normal
            );

    object.quaternion.copy(quaternion);
}

    spawnSadnessBlue(position) {
        this.spawnRipple(
            new THREE.Vector3(
                position.x,
                0.09,
                position.z
            ),
            {
                color: 0x336dff,
                opacity: 0.38,
                startScale: 1.0,
                endScale: 9.0,
                duration: 2.4
            }
        );

        this.spawnParticleCloud(
            position,
            0x5f8dff,
            80,
            {
                radius: 18,
                height: 4,
                duration: 5.5
            }
        );
    }

    spawnSoftWideLightPillars(position) {
        const basis =
            this.getCameraHorizontalBasis();

        const camera =
            this.worldRenderer.camera;

        const base =
            camera.position
                .clone()
                .addScaledVector(
                    basis.forward,
                    24
                );

        const pillarOffsets = [
            { side: -13.5, depth: -4.0 },
            { side: -6.5, depth: 3.0 },
            { side: 0.0, depth: -1.5 },
            { side: 6.5, depth: 4.5 },
            { side: 13.5, depth: -3.0 }
        ];

        pillarOffsets.forEach(offset => {
            const pillarPosition =
                base.clone()
                    .addScaledVector(
                        basis.right,
                        offset.side
                    )
                    .addScaledVector(
                        basis.forward,
                        offset.depth
                    );

            pillarPosition.y = 0.08;

            this.spawnLightColumn(
                pillarPosition,
                0xbfdfff,
                0.16,
                10.5,
                3.4
            );

            const pointLight =
                new THREE.PointLight(
                    0xdff7ff,
                    0.45,
                    18
                );

            pointLight.name = 'hikari_soft_point_light';
            pointLight.position.copy(pillarPosition);
            pointLight.position.y += 4.0;

            this.group.add(pointLight);

            this.effects.push({
                elapsed: 0,
                duration: 3.4,
                update: (delta, elapsed) => {
                    const t =
                        THREE.MathUtils.clamp(
                            elapsed / 3.4,
                            0,
                            1
                        );

                    pointLight.intensity =
                        0.45 *
                        (
                            1.0 -
                            THREE.MathUtils.smoothstep(
                                t,
                                0.62,
                                1.0
                            )
                        );
                },
                dispose: () => {
                    pointLight.parent?.remove(pointLight);
                }
            });
        });

        console.log(
            '[WordImpactEffect] HIKARI soft wide pillars.'
        );
    }

    scheduleTemporaryBloomObjectRemoval(object, lifetime = 22.0, fadeDuration = 5.0) {
    if (!object) return;

    const materialSnapshots =
        this.prepareObjectMaterialsForFade(object);

    const baseScale =
        object.scale.clone();

    this.effects.push({
        elapsed: 0,
        duration: lifetime + fadeDuration,
        update: (delta, elapsed) => {
            if (!object.parent) {
                return;
            }

            if (elapsed < lifetime) {
                return;
            }

            const fadeT =
                THREE.MathUtils.clamp(
                    (elapsed - lifetime) / fadeDuration,
                    0,
                    1
                );

            const ease =
                THREE.MathUtils.smoothstep(
                    fadeT,
                    0,
                    1
                );

            materialSnapshots.forEach(snapshot => {
                if (!snapshot.material) return;

                snapshot.material.opacity =
                    snapshot.baseOpacity * (1.0 - ease);

                snapshot.material.transparent = true;
                snapshot.material.needsUpdate = true;
            });

            object.scale
                .copy(baseScale)
                .multiplyScalar(
                    THREE.MathUtils.lerp(
                        1.0,
                        0.72,
                        ease
                    )
                );
        },
        dispose: () => {
            object.parent?.remove(object);

            materialSnapshots.forEach(snapshot => {
                if (
                    snapshot.material &&
                    snapshot.material.userData?.wordImpactOwnedMaterial
                ) {
                    snapshot.material.map?.dispose?.();
                    snapshot.material.dispose?.();
                }
            });
        }
    });
}

prepareObjectMaterialsForFade(object) {
    const snapshots = [];
    const seenMaterials = new Set();

    object.traverse(child => {
        if (!child) return;

        if (child.material) {
            const originalMaterials =
                Array.isArray(child.material)
                    ? child.material
                    : [child.material];

            const clonedMaterials =
                originalMaterials.map(material => {
                    const cloned =
                        material.clone();

                    cloned.transparent = true;
                    cloned.depthWrite = false;
                    cloned.opacity =
                        typeof material.opacity === 'number'
                            ? material.opacity
                            : 1.0;

                    cloned.userData.wordImpactOwnedMaterial = true;
                    cloned.needsUpdate = true;

                    if (!seenMaterials.has(cloned)) {
                        seenMaterials.add(cloned);

                        snapshots.push({
                            material: cloned,
                            baseOpacity: cloned.opacity
                        });
                    }

                    return cloned;
                });

            child.material =
                Array.isArray(child.material)
                    ? clonedMaterials
                    : clonedMaterials[0];
        }

        if (child.userData?.lineMaterial) {
            const originalLineMaterial =
                child.userData.lineMaterial;

            const clonedLineMaterial =
                originalLineMaterial.clone();

            clonedLineMaterial.transparent = true;
            clonedLineMaterial.depthWrite = false;
            clonedLineMaterial.opacity =
                typeof originalLineMaterial.opacity === 'number'
                    ? originalLineMaterial.opacity
                    : 1.0;

            clonedLineMaterial.userData.wordImpactOwnedMaterial = true;
            clonedLineMaterial.needsUpdate = true;

            child.userData.lineMaterial = clonedLineMaterial;

            if (!seenMaterials.has(clonedLineMaterial)) {
                seenMaterials.add(clonedLineMaterial);

                snapshots.push({
                    material: clonedLineMaterial,
                    baseOpacity: clonedLineMaterial.opacity
                });
            }
        }
    });

    return snapshots;
}
    spawnHeartPulse(position) {
        for (let i = 0; i < 3; i++) {
            setTimeout(
                () => {
                    this.spawnRipple(
                        new THREE.Vector3(
                            position.x,
                            0.1,
                            position.z
                        ),
                        {
                            color: 0xffb8cc,
                            opacity: 0.32,
                            startScale: 0.55,
                            endScale: 6.5,
                            duration: 1.6
                        }
                    );
                },
                i * 480
            );
        }

        const light =
            new THREE.PointLight(
                0xffb8cc,
                1.4,
                18
            );

        light.position.copy(position);
        light.position.y += 2.8;

        this.group.add(light);

        this.effects.push({
            elapsed: 0,
            duration: 3.0,
            update: (delta, elapsed) => {
                light.intensity =
                    0.7 +
                    Math.sin(
                        elapsed * Math.PI * 3.0
                    ) *
                        0.7;
            },
            dispose: () => {
                light.parent?.remove(light);
            }
        });
    }

    spawnRain(position) {
        const rainGroup =
            new THREE.Group();

        rainGroup.name = 'namida_rain_group';

        const drops = [];

        for (let i = 0; i < 120; i++) {
            const geometry =
                new THREE.CylinderGeometry(
                    0.012,
                    0.012,
                    0.75,
                    6
                );

            const material =
                new THREE.MeshBasicMaterial({
                    color: 0x99ddff,
                    transparent: true,
                    opacity: 0.62,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });

            const drop =
                new THREE.Mesh(
                    geometry,
                    material
                );

            drop.position.copy(position);
            drop.position.x +=
                (Math.random() - 0.5) * 30;
            drop.position.y +=
                8 + Math.random() * 12;
            drop.position.z +=
                (Math.random() - 0.5) * 30;

            rainGroup.add(drop);

            drops.push({
                drop,
                geometry,
                material
            });
        }

        this.group.add(rainGroup);

        this.effects.push({
            elapsed: 0,
            duration: 5.0,
            update: delta => {
                drops.forEach(entry => {
                    entry.drop.position.y -=
                        delta * 8.5;

                    if (entry.drop.position.y < 0.2) {
                        entry.drop.position.y =
                            8 + Math.random() * 10;
                    }
                });
            },
            dispose: () => {
                rainGroup.parent?.remove(rainGroup);

                drops.forEach(entry => {
                    entry.geometry.dispose();
                    entry.material.dispose();
                });
            }
        });
    }

    spawnWideTransparentPrisms(position) {
    const spawnManager =
        this.worldRenderer.spawnManager;

    if (!spawnManager) {
        console.warn('[WordImpactEffect] SpawnManager not found for KATACHI prisms.');
        return;
    }

    const basis =
        this.getCameraHorizontalBasis();

    const camera =
        this.worldRenderer.camera;

    const base =
        camera.position
            .clone()
            .addScaledVector(
                basis.forward,
                18
            );

    const prismIds = [
        'Prism1',
        'Prism2',
        'Prism3'
    ];

    const prismCount = 18;

    for (let i = 0; i < prismCount; i++) {
        const id =
            prismIds[
                Math.floor(
                    Math.random() * prismIds.length
                )
            ];

        const sideOffset =
            (Math.random() - 0.5) * 24;

        const depthOffset =
            (Math.random() - 0.5) * 22;

        const prismPosition =
            base.clone()
                .addScaledVector(
                    basis.right,
                    sideOffset
                )
                .addScaledVector(
                    basis.forward,
                    depthOffset
                );

        prismPosition.y =
            0.9 + Math.random() * 5.0;
        const scaleMultiplier =
            0.38 + Math.random() * 0.18;

        const prism =
            spawnManager.spawn(
                id,
                prismPosition,
                {
                    scaleMultiplier,
                    randomRotation: true
                }
            );

        if (!prism) {
            continue;
        }

        prism.name =
            `katachi_random_model_prism_${id}`;

        prism.userData.ignorePulse = true;
        prism.userData.katachiEffectPrism = true;

        prism.renderOrder = 91;

        const color =
            new THREE.Color().setHSL(
                Math.random(),
                0.85,
                0.62
            );

        this.applyEffectColorToObject(
            prism,
            color,
            0.62
        );

        this.group.add(prism);

        const baseScale =
            prism.scale.clone();

        const floatSpeed =
            0.18 + Math.random() * 0.22;

        this.effects.push({
            elapsed: 0,
            duration: 7.0,
            update: (delta, elapsed) => {
                prism.rotation.x +=
                    delta * 0.32;

                prism.rotation.y +=
                    delta * 0.48;

                prism.position.y +=
                    Math.sin(
                        elapsed * 1.25 + i
                    ) *
                    delta *
                    floatSpeed;

                const t =
                    THREE.MathUtils.clamp(
                        elapsed / 7.0,
                        0,
                        1
                    );

                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.72,
                        1.0
                    );

                prism.scale
                    .copy(baseScale)
                    .multiplyScalar(
                        THREE.MathUtils.lerp(
                            1.0,
                            0.82,
                            1.0 - fade
                        )
                    );

                this.setObjectOpacity(
                    prism,
                    0.62 * fade
                );
            },
            dispose: () => {
                prism.parent?.remove(prism);

                this.disposeOwnedMaterialsOnly(prism);
            }
        });
    }

    console.log(
        '[WordImpactEffect] KATACHI random Prism1/2/3 spawned.'
    );
}

applyEffectColorToObject(object, color, opacity = 1.0) {
    object.traverse(child => {
        if (!child) return;

        if (child.material) {
            const originalMaterials =
                Array.isArray(child.material)
                    ? child.material
                    : [child.material];

            const clonedMaterials =
                originalMaterials.map(material => {
                    const cloned =
                        material.clone();

                    if (cloned.color) {
                        cloned.color.copy(color);
                    }

                    if (cloned.emissive) {
                        cloned.emissive.copy(color);
                        cloned.emissiveIntensity = 0.9;
                    }

                    cloned.transparent = true;
                    cloned.opacity = opacity;
                    cloned.depthWrite = false;
                    cloned.blending = THREE.AdditiveBlending;
                    cloned.userData.wordImpactOwnedMaterial = true;
                    cloned.needsUpdate = true;

                    return cloned;
                });

            child.material =
                Array.isArray(child.material)
                    ? clonedMaterials
                    : clonedMaterials[0];
        }

        if (child.userData?.lineMaterial) {
            const clonedLineMaterial =
                child.userData.lineMaterial.clone();

            clonedLineMaterial.color.copy(color);
            clonedLineMaterial.transparent = true;
            clonedLineMaterial.opacity = opacity;
            clonedLineMaterial.depthWrite = false;
            clonedLineMaterial.blending = THREE.AdditiveBlending;
            clonedLineMaterial.userData.wordImpactOwnedMaterial = true;
            clonedLineMaterial.needsUpdate = true;

            child.userData.lineMaterial =
                clonedLineMaterial;
        }
    });
}

setObjectOpacity(object, opacity) {
    object.traverse(child => {
        if (!child) return;

        const materials = [];

        if (child.material) {
            if (Array.isArray(child.material)) {
                materials.push(...child.material);
            } else {
                materials.push(child.material);
            }
        }

        if (child.userData?.lineMaterial) {
            materials.push(child.userData.lineMaterial);
        }

        materials.forEach(material => {
            if (!material) return;

            material.transparent = true;
            material.opacity = opacity;
            material.needsUpdate = true;
        });
    });
}

disposeOwnedMaterialsOnly(object) {
    object.traverse(child => {
        const materials = [];

        if (child.material) {
            if (Array.isArray(child.material)) {
                materials.push(...child.material);
            } else {
                materials.push(child.material);
            }
        }

        if (child.userData?.lineMaterial) {
            materials.push(child.userData.lineMaterial);
        }

        materials.forEach(material => {
            if (!material?.userData?.wordImpactOwnedMaterial) {
                return;
            }

            material.map?.dispose?.();
            material.dispose?.();
        });
    });
}

    spawnToneObjectsOnPath(position) {
    const spawnManager = this.worldRenderer.spawnManager;
    if (!spawnManager) return;

    const basis = this.getCameraHorizontalBasis();
    const base = this.worldRenderer.camera.position;

    const count = 7;

    for (let i = 0; i < count; i++) {

        const pos = base.clone()
            .addScaledVector(basis.forward, 5 + i * 2)
            .addScaledVector(basis.right, (Math.random() - 0.5) * 4);

        pos.y = 0.6;

        const scale = 0.2 + Math.random() * 0.3;

        const tone = spawnManager.spawn('tone', pos, {
            scaleMultiplier: scale,
            randomRotation: true
        });

        if (!tone) continue;

        const color = new THREE.Color().setHSL(
            Math.random(),
            0.9,
            0.6
        );

        tone.traverse(child => {
            if (child.material && child.material.color) {
                child.material = child.material.clone();
                child.material.color.copy(color);
                child.material.transparent = true;
                child.material.opacity = 1.0;
            }

            if (child.userData?.lineMaterial) {
                child.userData.lineMaterial.color.copy(color);
                child.userData.lineMaterial.needsUpdate = true;
            }
        });

        this.group.add(tone);

        this.effects.push({
            elapsed: 0,
            duration: 6.0,
            update: (delta, elapsed) => {

                tone.rotation.y += delta * 1.2;

                tone.position.y +=
                    Math.sin(elapsed * 2.2 + i) * 0.01;
            },
            dispose: () => {
                tone.parent?.remove(tone);
            }
        });
    }

    console.log('[WordImpactEffect] ONGAKU random tones');
}
    spawnLightColumn(position, color, opacity, height, duration) {
        const geometry =
            new THREE.CylinderGeometry(
                0.08,
                0.42,
                height,
                24,
                1,
                true
            );

        const material =
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

        const column =
            new THREE.Mesh(
                geometry,
                material
            );

        column.position.copy(position);
        column.position.y += height / 2;
        column.renderOrder = 90;

        this.group.add(column);

        this.effects.push({
            elapsed: 0,
            duration,
            update: (delta, elapsed) => {
                const t =
                    elapsed / duration;

                material.opacity =
                    opacity *
                    (
                        1.0 -
                        THREE.MathUtils.smoothstep(
                            t,
                            0.65,
                            1.0
                        )
                    );
            },
            dispose: () => {
                column.parent?.remove(column);
                geometry.dispose();
                material.dispose();
            }
        });
    }

    spawnParticleCloud(position, color, count, options = {}) {
        const radius =
            options.radius ?? 10;

        const height =
            options.height ?? 5;

        const duration =
            options.duration ?? 4;

        const particles = [];

        for (let i = 0; i < count; i++) {
            const geometry =
                new THREE.SphereGeometry(
                    0.045,
                    8,
                    8
                );

            const material =
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.75,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

            const particle =
                new THREE.Mesh(
                    geometry,
                    material
                );

            particle.position.copy(position);
            particle.position.x +=
                (Math.random() - 0.5) * radius;
            particle.position.y +=
                Math.random() * height;
            particle.position.z +=
                (Math.random() - 0.5) * radius;

            this.group.add(particle);

            particles.push({
                particle,
                geometry,
                material,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.35,
                    0.08 + Math.random() * 0.18,
                    (Math.random() - 0.5) * 0.35
                )
            });
        }

        this.effects.push({
            elapsed: 0,
            duration,
            update: (delta, elapsed) => {
                const t =
                    elapsed / duration;

                particles.forEach(entry => {
                    entry.particle.position.addScaledVector(
                        entry.velocity,
                        delta
                    );

                    entry.material.opacity =
                        0.75 *
                        (
                            1.0 -
                            THREE.MathUtils.smoothstep(
                                t,
                                0.65,
                                1.0
                            )
                        );
                });
            },
            dispose: () => {
                particles.forEach(entry => {
                    entry.particle.parent?.remove(entry.particle);
                    entry.geometry.dispose();
                    entry.material.dispose();
                });
            }
        });
    }

    spawnSpark(position, color, count) {
        for (let i = 0; i < count; i++) {
            const geometry =
                new THREE.SphereGeometry(
                    0.045,
                    8,
                    8
                );

            const material =
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

            const spark =
                new THREE.Mesh(
                    geometry,
                    material
                );

            spark.position.copy(position);

            spark.position.x +=
                (Math.random() - 0.5) * 1.8;
            spark.position.y +=
                (Math.random() - 0.5) * 1.4;
            spark.position.z +=
                (Math.random() - 0.5) * 1.8;

            this.group.add(spark);

            this.effects.push({
                elapsed: 0,
                duration: 1.4,
                update: (delta, elapsed) => {
                    const t =
                        elapsed / 1.4;

                    spark.position.y +=
                        delta * 0.8;

                    material.opacity =
                        0.9 *
                        (
                            1.0 -
                            THREE.MathUtils.smoothstep(
                                t,
                                0.45,
                                1.0
                            )
                        );
                },
                dispose: () => {
                    spark.parent?.remove(spark);
                    geometry.dispose();
                    material.dispose();
                }
            });
        }
    }

    spawnFallbackToneSymbol(position, color) {
        const texture =
            this.createTextTexture('♪');

        const material =
            new THREE.MeshBasicMaterial({
                map: texture,
                color,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

        const mesh =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    0.85,
                    0.85
                ),
                material
            );

        mesh.name = 'ongaku_fallback_tone';
        mesh.position.copy(position);
        mesh.renderOrder = 95;

        this.group.add(mesh);

        this.effects.push({
            elapsed: 0,
            duration: 4.5,
            update: (delta, elapsed) => {
                mesh.quaternion.copy(
                    this.worldRenderer.camera.quaternion
                );

                mesh.position.y +=
                    Math.sin(
                        elapsed * 2.2
                    ) *
                    delta *
                    0.5;

                const t =
                    elapsed / 4.5;

                material.opacity =
                    0.95 *
                    (
                        1.0 -
                        THREE.MathUtils.smoothstep(
                            t,
                            0.72,
                            1.0
                        )
                    );
            },
            dispose: () => {
                mesh.parent?.remove(mesh);
                texture.dispose();
                material.dispose();
                mesh.geometry.dispose();
            }
        });
    }

    getToneTemplateFromBlueNoteManager() {
        const blueNoteManager =
            this.worldRenderer.blueNoteManager;

        if (!blueNoteManager) {
            return null;
        }

        const candidatePropertyNames = [
            'toneTemplate',
            'toneModel',
            'tone',
            'noteTemplate',
            'noteModel',
            'blueNoteTemplate',
            'blueNoteModel',
            'template',
            'model'
        ];

        for (const propertyName of candidatePropertyNames) {
            const value =
                blueNoteManager[propertyName];

            if (!value) {
                continue;
            }

            if (value.scene) {
                return value.scene;
            }

            if (value.isObject3D) {
                return value;
            }
        }

        const candidateMethodNames = [
            'getToneTemplate',
            'getToneModel',
            'getNoteTemplate',
            'getNoteModel',
            'getTemplate',
            'getModel'
        ];

        for (const methodName of candidateMethodNames) {
            if (typeof blueNoteManager[methodName] !== 'function') {
                continue;
            }

            let value = null;

            try {
                value = blueNoteManager;

            } catch (error) {
                value = null;
            }

            if (!value) {
                continue;
            }

            if (value.scene) {
                return value.scene;
            }

            if (value.isObject3D) {
                return value;
            }
        }

        return null;
    }

    getCameraHorizontalBasis() {
        const forward =
            new THREE.Vector3();

        this.worldRenderer.camera.getWorldDirection(
            forward
        );

        forward.y = 0;

        if (forward.lengthSq() < 0.0001) {
            forward.set(0, 0, -1);
        }

        forward.normalize();

        const right =
            new THREE.Vector3()
                .crossVectors(
                    forward,
                    new THREE.Vector3(0, 1, 0)
                )
                .normalize();

        return {
            forward,
            right
        };
    }

    getRegisteredModelTemplate(name) {
    const spawnManager =
        this.worldRenderer.spawnManager;

    if (!spawnManager) {
        return null;
    }
    if (typeof spawnManager.getModel === 'function') {
        const result = spawnManager.getModel(name);

        if (!result) return null;

        return result.scene || result;
    }
    if (spawnManager.registry instanceof Map) {
        const result = spawnManager.registry.get(name);

        if (result) {
            return result.scene || result;
        }
    }

    const storeNames = [
        'models',
        'modelMap',
        'registeredModels',
        'processedModels',
        'templates',
        'assets'
    ];

    for (const storeName of storeNames) {
        const store = spawnManager[storeName];

        if (!store) continue;

        if (store instanceof Map) {
            const result = store.get(name);
            if (result) return result.scene || result;

        } else if (typeof store === 'object') {
            const result = store[name];
            if (result) return result.scene || result;
        }
    }

    if (spawnManager.registry instanceof Map) {
        const keys = Array.from(
            spawnManager.registry.keys()
        );

        for (const key of keys) {
            if (key.toLowerCase() === name.toLowerCase()) {
                const result = spawnManager.registry.get(key);
                return result.scene || result;
            }
        }
    }

    return null;
}

    applyRandomColorToObject(object, color) {
        object.traverse(child => {
            if (!child.material) {
                return;
            }

            const originalMaterial =
                child.material;

            const materials =
                Array.isArray(originalMaterial)
                    ? originalMaterial
                    : [originalMaterial];

            const clonedMaterials =
                materials.map(material => {
                    const cloned =
                        material.clone();

                    if (cloned.color) {
                        cloned.color.copy(color);
                    }

                    if (cloned.emissive) {
                        cloned.emissive.copy(color);
                        cloned.emissiveIntensity = 0.85;
                    }

                    cloned.transparent = true;
                    cloned.opacity = 1.0;
                    cloned.needsUpdate = true;

                    return cloned;
                });

            child.material =
                Array.isArray(originalMaterial)
                    ? clonedMaterials
                    : clonedMaterials[0];
        });
    }

    createTextTexture(text) {
        const canvas =
            document.createElement('canvas');

        const context =
            canvas.getContext('2d');

        canvas.width = 128;
        canvas.height = 128;

        context.clearRect(
            0,
            0,
            128,
            128
        );

        context.font = 'bold 80px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'rgba(230, 255, 255, 0.95)';
        context.shadowColor = 'rgba(120, 245, 255, 0.9)';
        context.shadowBlur = 18;

        context.fillText(
            text,
            64,
            64
        );

        const texture =
            new THREE.CanvasTexture(canvas);

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    disposeTemporaryObject(object) {
        if (!object) {
            return;
        }

        object.traverse?.(child => {
            if (child.geometry) {
                child.geometry.dispose?.();
            }

            if (child.material) {
                const materials =
                    Array.isArray(child.material)
                        ? child.material
                        : [child.material];

                materials.forEach(material => {
                    material.map?.dispose?.();
                    material.dispose?.();
                });
            }
        });
    }
}