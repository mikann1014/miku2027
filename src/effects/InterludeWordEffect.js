import * as THREE from 'three';
import { WordImpactEffectManager } from './WordImpactEffectManager.js';

export class InterludeWordEffect {
    constructor(worldRenderer, options = {}) {
        this.worldRenderer = worldRenderer;

        this.scene = worldRenderer.scene;
        this.camera = worldRenderer.camera;
        this.renderer = worldRenderer.renderer;

        this.group = new THREE.Group();
        this.group.name = 'interludeWordEffectGroup';
        this.scene.add(this.group);

        this.raycaster = new THREE.Raycaster();

        this.wordImpactManager =
            new WordImpactEffectManager(
                this.worldRenderer
            );

        this.active = false;
        this.mode = 'idle';

        this.elapsed = 0;

        this.words = [
            'ソラ',
            'イロ',
            'カナシミ',
            'ヒカリ',
            'ナミダ',
            'カタチ',
            'オンガク',
        ];

        
this.chorusWords = [
];


        this.wordObjects = [];
        this.clickedWords = new Set();
        this.clickCount = 0;

        this.centerPoint = new THREE.Vector3();

        // 少し待ってから1語目が落ちる。
        this.initialSpawnDelay =
            options.initialSpawnDelay ?? 0.05;

        // 1語ずつ落ちる間隔。
        this.spawnDelayPerWord =
            options.spawnDelayPerWord ?? 1.15;

        // 雨のように真っ直ぐ落ちる時間。
        this.wordFallDuration =
            options.wordFallDuration ?? 5.2;

        // 出現フェード。
        this.wordFadeInDuration =
            options.wordFadeInDuration ?? 0.38;

        // 着水後にクリックできる時間。
        this.clickWindowAfterLanding =
            options.clickWindowAfterLanding ?? 2.8;

        // 解けて消える時間。
        this.wordDissolveDuration =
            options.wordDissolveDuration ?? 1.4;

        this.wordScale =
            options.wordScale ?? 1.15;

        // カメラ前方どれくらいの距離に降らせるか。
        this.frontDistance =
            options.frontDistance ?? 18.0;

        // カメラ正面から左右にどれくらい広げるか。
        this.horizontalSpread =
            options.horizontalSpread ?? 10.5;

        // 奥行き方向のばらつき。
        this.depthSpread =
            options.depthSpread ?? 4.0;

        // 落ち始めの高さ。
        this.startHeightOffset =
            options.startHeightOffset ?? 12.0;

        // 湖面のY。
        this.landingY =
            options.landingY ?? 0.08;

        this.gatherDuration =
            options.gatherDuration ?? 4.2;

        this.onMikuFormed = null;
    }

    start(centerPoint) {
        this.clear();

        this.active = true;
        this.mode = 'fallAndDrift';
        this.elapsed = 0;

        this.centerPoint.copy(centerPoint);

        this.createWords();

        console.log('[InterludeWordEffect] Started.');
    }

    createWords() {
        const allWords = [
            ...this.words,
            
        ];

        const uniqueWords =
            Array.from(new Set(allWords));

        const cameraBasis =
            this.createCameraFrontBasis();

        uniqueWords.forEach((word, index) => {
            const texture =
                this.createWordTexture(word);

            const material =
                new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.0,
                    depthWrite: false,
                    depthTest: true,
                    toneMapped: false,
                    side: THREE.DoubleSide
                });

            const mesh =
                new THREE.Mesh(
                    new THREE.PlaneGeometry(2.8, 1.1),
                    material
                );

            mesh.name =
                `interlude_word_${word}`;

            mesh.renderOrder = 84;
            mesh.frustumCulled = false;

            const lane =
                this.computeRainLane(
                    index,
                    uniqueWords.length,
                    cameraBasis
                );

            const startPosition =
                lane.landingPosition.clone();

            startPosition.y =
                this.camera.position.y +
                this.startHeightOffset +
                Math.random() * 3.0;

            const landingPosition =
                lane.landingPosition.clone();

            landingPosition.y =
                this.landingY;

            const pathPosition =
                this.createPathFormationPoint(
                    index,
                    uniqueWords.length
                );

            mesh.position.copy(startPosition);
            mesh.scale.setScalar(this.wordScale);

            mesh.visible = false;
            mesh.material.opacity = 0.0;

            mesh.userData.word = word;
            mesh.userData.index = index;

            mesh.userData.spawnTime =
                this.initialSpawnDelay +
                index * this.spawnDelayPerWord;

            mesh.userData.startPosition = startPosition;
            mesh.userData.landingPosition = landingPosition;
            mesh.userData.pathPosition = pathPosition;

            mesh.userData.clicked = false;
            mesh.userData.hasSpawned = false;
            mesh.userData.hasLanded = false;
            mesh.userData.landTime = null;

            mesh.userData.seed =
                Math.random() * Math.PI * 2;

            this.group.add(mesh);
            this.wordObjects.push(mesh);
        });
    }

    createCameraFrontBasis() {
        const forward =
            new THREE.Vector3();

        this.camera.getWorldDirection(forward);

        // 雨の位置決めは水平面基準にする。
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

        const base =
            this.camera.position
                .clone()
                .addScaledVector(
                    forward,
                    this.frontDistance
                );

        return {
            forward,
            right,
            base
        };
    }

    computeRainLane(index, total, cameraBasis) {
        const normalized =
            total <= 1
                ? 0
                : index / (total - 1);

        // 左右にきれいに並びすぎないよう、少しだけランダムを足す。
        const sideOffset =
            THREE.MathUtils.lerp(
                -this.horizontalSpread,
                this.horizontalSpread,
                normalized
            ) +
            (Math.random() - 0.5) * 1.8;

        const depthOffset =
            (Math.random() - 0.5) * this.depthSpread;

        const landingPosition =
            cameraBasis.base
                .clone()
                .addScaledVector(
                    cameraBasis.right,
                    sideOffset
                )
                .addScaledVector(
                    cameraBasis.forward,
                    depthOffset
                );

        landingPosition.y =
            this.landingY;

        return {
            landingPosition
        };
    }

    createWordTexture(word) {
        const canvas =
            document.createElement('canvas');

        const context =
            canvas.getContext('2d');

        canvas.width = 768;
        canvas.height = 224;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.font = 'bold 84px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        context.shadowColor =
            'rgba(120, 245, 255, 0.95)';

        context.shadowBlur = 30;

        context.fillStyle =
            'rgba(235, 255, 255, 0.96)';

        context.fillText(
            word,
            canvas.width / 2,
            canvas.height / 2
        );

        context.shadowBlur = 0;
        context.lineWidth = 4;
        context.strokeStyle =
            'rgba(0, 220, 255, 0.48)';

        context.strokeText(
            word,
            canvas.width / 2,
            canvas.height / 2
        );

        const texture =
            new THREE.CanvasTexture(canvas);

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    createPathFormationPoint(index, total) {
        const row =
            index % 5;

        const column =
            Math.floor(index / 5);

        return this.centerPoint.clone().add(
            new THREE.Vector3(
                (row - 2) * 1.2,
                1.2 + column * 0.8,
                -3.0 - column * 0.25
            )
        );
    }

    update(delta = 0.016) {
        this.wordImpactManager?.update?.(delta);

        if (!this.active) {
            return false;
        }

        this.elapsed += delta;

        if (this.mode === 'fallAndDrift') {
            this.updateFallAndDrift();
            return false;
        }

        if (this.mode === 'gatherToPathMiku') {
            return this.updateGatherToPathMiku();
        }

        return false;
    }

    updateFallAndDrift() {
        this.wordObjects.forEach(mesh => {
            const spawnTime =
                mesh.userData.spawnTime || 0;

            const localTime =
                this.elapsed - spawnTime;

            if (localTime < 0) {
                mesh.visible = false;
                mesh.material.opacity = 0.0;
                mesh.position.copy(mesh.userData.startPosition);
                return;
            }

            if (!mesh.userData.hasSpawned) {
                mesh.userData.hasSpawned = true;
                mesh.visible = true;

                console.log(
                    '[InterludeWordEffect] Word appeared:',
                    mesh.userData.word
                );
            }

            mesh.quaternion.copy(
                this.camera.quaternion
            );

            const fallT =
                THREE.MathUtils.clamp(
                    localTime / this.wordFallDuration,
                    0,
                    1
                );

            const fadeT =
                THREE.MathUtils.clamp(
                    localTime / this.wordFadeInDuration,
                    0,
                    1
                );

            const fadeEase =
                THREE.MathUtils.smoothstep(
                    fadeT,
                    0,
                    1
                );

            if (fallT < 1.0) {
                // 雨のように、X/Zは変えずYだけ落とす。
                const start =
                    mesh.userData.startPosition;

                const landing =
                    mesh.userData.landingPosition;

                mesh.position.x =
                    landing.x;

                mesh.position.z =
                    landing.z;

                mesh.position.y =
                    THREE.MathUtils.lerp(
                        start.y,
                        landing.y,
                        fallT
                    );

                const baseOpacity =
                    mesh.userData.clicked ? 1.0 : 0.72;

                mesh.material.opacity =
                    baseOpacity * fadeEase;

                mesh.scale.setScalar(
                    this.wordScale
                );

                return;
            }

            if (!mesh.userData.hasLanded) {
                mesh.userData.hasLanded = true;
                mesh.userData.landTime = this.elapsed;

                mesh.position.copy(
                    mesh.userData.landingPosition
                );

                this.wordImpactManager?.spawnLandingRipple?.(
                    mesh.position.clone()
                );

                console.log(
                    '[InterludeWordEffect] Word landed:',
                    mesh.userData.word
                );
            }

            // 着水後はその場に留まる。
            mesh.position.copy(
                mesh.userData.landingPosition
            );

            const timeAfterLand =
                this.elapsed -
                (
                    mesh.userData.landTime !== null
                        ? mesh.userData.landTime
                        : this.elapsed
                );

            const dissolveT =
                THREE.MathUtils.clamp(
                    (
                        timeAfterLand -
                        this.clickWindowAfterLanding
                    ) / this.wordDissolveDuration,
                    0,
                    1
                );

            const dissolveEase =
                THREE.MathUtils.smoothstep(
                    dissolveT,
                    0,
                    1
                );

            const baseOpacity =
                mesh.userData.clicked ? 1.0 : 0.72;

            mesh.material.opacity =
                baseOpacity *
                (1.0 - dissolveEase);

            const pulse =
                mesh.userData.clicked
                    ? 1.0 +
                        Math.sin(this.elapsed * 5.0) *
                            0.035
                    : 1.0;

            mesh.scale.setScalar(
                this.wordScale *
                    THREE.MathUtils.lerp(
                        pulse,
                        1.35,
                        dissolveEase
                    )
            );

            if (dissolveT >= 1.0) {
                mesh.visible = false;
                mesh.material.opacity = 0.0;
            }
        });
    }

    startGatherToPathMiku(onMikuFormed = null) {
        if (!this.active) {
            return;
        }

        this.mode = 'gatherToPathMiku';
        this.elapsed = 0;
        this.onMikuFormed = onMikuFormed;

        this.wordObjects.forEach(mesh => {
            mesh.visible = true;

            mesh.userData.gatherStart =
                mesh.position.clone();

            mesh.material.opacity =
                Math.max(
                    mesh.material.opacity,
                    0.65
                );
        });

        console.log(
            '[InterludeWordEffect] Gather to path Miku started.',
            this.getInteractionSummary()
        );
    }

    updateGatherToPathMiku() {
        const t =
            THREE.MathUtils.clamp(
                this.elapsed / this.gatherDuration,
                0,
                1
            );

        const ease =
            THREE.MathUtils.smoothstep(
                t,
                0,
                1
            );

        this.wordObjects.forEach(mesh => {
            mesh.visible = true;

            mesh.quaternion.copy(
                this.camera.quaternion
            );

            mesh.position.lerpVectors(
                mesh.userData.gatherStart,
                mesh.userData.pathPosition,
                ease
            );

            mesh.scale.setScalar(
                THREE.MathUtils.lerp(
                    this.wordScale,
                    0.36,
                    ease
                )
            );

            mesh.material.opacity =
                1.0 -
                THREE.MathUtils.smoothstep(
                    t,
                    0.82,
                    1.0
                );
        });

        if (t >= 1.0) {
            this.active = false;
            this.mode = 'completed';

            if (typeof this.onMikuFormed === 'function') {
                this.onMikuFormed(
                    this.getInteractionSummary()
                );
            }

            console.log(
                '[InterludeWordEffect] Miku formed from words.',
                this.getInteractionSummary()
            );

            return true;
        }

        return false;
    }

    handlePointerEvent(event) {
        if (
            !this.active ||
            this.mode !== 'fallAndDrift' ||
            !event
        ) {
            return false;
        }

        const clickableObjects =
            this.wordObjects.filter(mesh => {
                if (
                    !mesh.visible ||
                    !mesh.material ||
                    mesh.material.opacity <= 0.05
                ) {
                    return false;
                }

                if (!mesh.userData.hasLanded) {
                    return false;
                }

                const timeAfterLand =
                    this.elapsed -
                    (
                        mesh.userData.landTime !== null
                            ? mesh.userData.landTime
                            : this.elapsed
                    );

                return (
                    timeAfterLand >= 0 &&
                    timeAfterLand <= this.clickWindowAfterLanding
                );
            });

        if (clickableObjects.length === 0) {
            return false;
        }

        const rect =
            this.renderer.domElement.getBoundingClientRect();

        const pointer =
            new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );

        this.raycaster.setFromCamera(
            pointer,
            this.camera
        );

        const hits =
            this.raycaster.intersectObjects(
                clickableObjects,
                true
            );

        if (!hits || hits.length === 0) {
            return false;
        }

        const mesh =
            hits[0].object;

        const word =
            mesh.userData.word;

        if (!word) {
            return false;
        }

        if (mesh.userData.clicked) {
            return true;
        }

        mesh.userData.clicked = true;
        this.clickedWords.add(word);
        this.clickCount++;

        this.triggerWorldEvent(
            word,
            mesh.position.clone()
        );

        console.log(
            '[InterludeWordEffect] Word clicked:',
            this.getInteractionSummary()
        );

        return true;
    }

    triggerWorldEvent(word, position) {
        if (!this.wordImpactManager) {
            return;
        }

        this.wordImpactManager.applyWordEffect(
            word,
            position
        );
    }

    getInteractionSummary() {
        return {
            clickCount: this.clickCount,
            clickedWords: Array.from(this.clickedWords)
        };
    }

    clear() {
        this.wordObjects.forEach(mesh => {
            if (mesh.material?.map) {
                mesh.material.map.dispose?.();
            }

            mesh.material?.dispose?.();
            mesh.geometry?.dispose?.();
            mesh.parent?.remove(mesh);
        });

        this.wordObjects = [];
        this.clickedWords.clear();
        this.clickCount = 0;

        this.group.clear();

        this.active = false;
        this.mode = 'idle';
        this.elapsed = 0;

        this.wordImpactManager?.clear?.();
    }
}