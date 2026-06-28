import * as THREE from 'three';


/**
 * LyricRainEffect
 *
 * ・歌詞フレーズをカメラ前方に生成するエフェクト
 * ・ゆっくり漂いながら消滅し、途中で花びら状に分解される
 * ・分解されたシャードは独立して飛散しフェードアウトする
*/


export class LyricRainEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'floatingLyricEffectGroup';

        this.shardGroup = new THREE.Group();
        this.shardGroup.name = 'lyricDissolvePetalShardGroup';

        if (this.scene) {
            this.scene.add(this.group);
            this.scene.add(this.shardGroup);
        }

        this.activePhrases = [];
        this.activeShards = [];

        this.fontSize = options.fontSize ?? 42;
        this.lineHeight = options.lineHeight ?? 58;

        this.canvasPaddingX = options.canvasPaddingX ?? 72;
        this.canvasPaddingY = options.canvasPaddingY ?? 42;

        this.maxTextWidth = options.maxTextWidth ?? 760;
        this.minCanvasWidth = options.minCanvasWidth ?? 512;
        this.maxCanvasWidth = options.maxCanvasWidth ?? 1024;

        this.spawnDistance = options.spawnDistance ?? 38;

        this.verticalOffset = options.verticalOffset ?? 9.5;

        this.horizontalSpread = options.horizontalSpread ?? 9.5;
        this.verticalSpread = options.verticalSpread ?? 3.2;

        this.planeWidth = options.planeWidth ?? 8.8;

        this.driftSpeed = options.driftSpeed ?? 0.018;
        this.riseSpeed = options.riseSpeed ?? 0.006;

        this.lifeIncrease = options.lifeIncrease ?? 0.0065;
        this.minOpacity = options.minOpacity ?? 0.0;

        this.maxActivePhrases = options.maxActivePhrases ?? 18;

        this.baseColor = options.baseColor ?? '#eaffff';
        this.shadowColor = options.shadowColor ?? 'rgba(0, 214, 255, 0.65)';

        this.scatterStartLife = options.scatterStartLife ?? 0.62;
        this.scatterFadeDuration = options.scatterFadeDuration ?? 0.075;

        this.scatterShardCount = options.scatterShardCount ?? 82;

        this.scatterShardLifeDuration =
            options.scatterShardLifeDuration ?? 1.08;

        this.scatterShardSpeedMin =
            options.scatterShardSpeedMin ?? 0.035;

        this.scatterShardSpeedMax =
            options.scatterShardSpeedMax ?? 0.135;

        this.scatterShardSizeMin =
            options.scatterShardSizeMin ?? 0.035;

        this.scatterShardSizeMax =
            options.scatterShardSizeMax ?? 0.105;

        this.scatterDepthSpread =
            options.scatterDepthSpread ?? 0.36;

        this.scatterVerticalBias =
            options.scatterVerticalBias ?? 0.28;

        this.scatterAreaWidthMultiplier =
            options.scatterAreaWidthMultiplier ?? 1.04;

        this.scatterAreaHeightMultiplier =
            options.scatterAreaHeightMultiplier ?? 0.98;

        this.petalTextureCache = new Map();
    }

    spawn(text, camera) {
        if (!text || !camera) return null;

        const {
            canvas,
            texture
        } = this.createTextTexture(text);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            depthTest: true,
            toneMapped: false,
            side: THREE.DoubleSide
        });

        const aspect =
            canvas.height / canvas.width;

        const planeHeight =
            this.planeWidth * aspect;

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(
                this.planeWidth,
                planeHeight
            ),
            material
        );

        const forward = new THREE.Vector3();

        camera.getWorldDirection(
            forward
        );

        forward.normalize();

        const right = new THREE.Vector3()
            .crossVectors(
                forward,
                camera.up
            )
            .normalize();

        const up = camera.up
            .clone()
            .normalize();

        const horizontalOffset =
            (Math.random() - 0.5) *
            this.horizontalSpread;

        const verticalOffset =
            this.verticalOffset +
            (Math.random() - 0.5) *
            this.verticalSpread;

        const basePosition =
            camera.position
                .clone()
                .addScaledVector(
                    forward,
                    this.spawnDistance
                )
                .addScaledVector(
                    right,
                    horizontalOffset
                )
                .addScaledVector(
                    up,
                    verticalOffset
                );

        mesh.position.copy(
            basePosition
        );

        mesh.quaternion.copy(
            camera.quaternion
        );

        mesh.renderOrder = 35;
        mesh.frustumCulled = false;
        mesh.raycast = () => {};

        this.group.add(mesh);

        const driftDirection =
            this.createDriftDirection(
                right,
                up
            );

        const phraseObject = {
            mesh,
            material,
            velocity: driftDirection.multiplyScalar(
                this.driftSpeed
            ),
            riseVelocity: this.riseSpeed,

            life: 0,
            fadeInProgress: 0,
            scatterElapsed: 0,

            rotationSeed: Math.random() * Math.PI * 2,
            baseScale: mesh.scale.clone(),

            planeWidth: this.planeWidth,
            planeHeight,

            hasScattered: false,
            isDissolving: false,

            externalControlled: false,
            freezeScatterForAttract: false,
            noScatter: false,
            attractSeed: false
        };

        this.activePhrases.push(
            phraseObject
        );

        this.trimActivePhrases();

        return phraseObject;
    }

    spawnAttractSeed(text, camera, options = {}) {
    const phraseObject =
        this.spawn(
            text,
            camera
        );

    if (!phraseObject) {
        return null;
    }

    phraseObject.noScatter = true;
    phraseObject.attractSeed = true;
    phraseObject.freezeScatterForAttract = true;

    phraseObject.life = 0;
    phraseObject.scatterElapsed = 0;
    phraseObject.hasScattered = true;
    phraseObject.isDissolving = false;

    const placement =
        options.placement ?? 'driftRight';

    const index =
        options.index ?? 0;

    const forward =
        new THREE.Vector3();

    camera.getWorldDirection(
        forward
    );

    forward.normalize();

    const right =
        new THREE.Vector3()
            .crossVectors(
                forward,
                camera.up
            )
            .normalize();

    const up =
        camera.up
            .clone()
            .normalize();

    phraseObject.velocity.multiplyScalar(0);
    phraseObject.riseVelocity = 0.0;

    if (placement === 'driftRight') {
        phraseObject.velocity
            .addScaledVector(
                right,
                0.008 + Math.random() * 0.006
            )
            .addScaledVector(
                up,
                (Math.random() - 0.5) * 0.002
            );
    }

    if (placement === 'nearCenter') {
        const center =
            camera.position
                .clone()
                .addScaledVector(
                    forward,
                    24
                );

        center.y += 4.2;

        // ✅ 密集回避：円形にランダム散布
        const angle =
            index * 2.399963229728653 +
            (Math.random() - 0.5) * 0.65;

        const radius =
            2.8 + Math.random() * 5.8;

        const verticalJitter =
            (Math.random() - 0.5) * 2.6;

        phraseObject.mesh.position.copy(
            center
                .clone()
                .addScaledVector(
                    right,
                    Math.cos(angle) * radius
                )
                .addScaledVector(
                    up,
                    Math.sin(angle) * radius * 0.42 + verticalJitter
                )
        );

        // ✅ 横へ漂い続ける
        const driftSide =
            Math.random() < 0.5 ? -1 : 1;

        phraseObject.velocity
            .addScaledVector(
                right,
                driftSide * (0.004 + Math.random() * 0.004)
            )
            .addScaledVector(
                up,
                (Math.random() - 0.5) * 0.0018
            );
    }

    if (placement === 'offscreen') {
        const side =
            index % 2 === 0 ? -1 : 1;

        const start =
            camera.position
                .clone()
                .addScaledVector(
                    forward,
                    28
                )
                .addScaledVector(
                    right,
                    side * (20 + Math.random() * 10)
                );

        start.y +=
            3.0 + Math.random() * 5.5;

        phraseObject.mesh.position.copy(
            start
        );

        phraseObject.velocity
            .addScaledVector(
                right,
                -side * (0.032 + Math.random() * 0.018)
            )
            .addScaledVector(
                up,
                (Math.random() - 0.5) * 0.004
            );
    }

    if (phraseObject.material) {
        phraseObject.material.opacity = 0.0;
        phraseObject.material.transparent = true;
        phraseObject.material.needsUpdate = true;
    }

    console.log(
        '[LyricRainEffect] Attract seed lyric spawned:',
        text,
        placement
    );

    return phraseObject;
}
    createTextTexture(text) {
        const normalizedText =
            String(text || '').trim();

        const measureCanvas =
            document.createElement('canvas');

        const measureContext =
            measureCanvas.getContext('2d');

        measureContext.font =
            `bold ${this.fontSize}px sans-serif`;

        const lines =
            this.wrapText(
                measureContext,
                normalizedText,
                this.maxTextWidth
            );

        let measuredWidth = 0;

        lines.forEach(line => {
            const width =
                measureContext.measureText(line).width;

            measuredWidth =
                Math.max(
                    measuredWidth,
                    width
                );
        });

        const canvasWidth =
            THREE.MathUtils.clamp(
                Math.ceil(
                    measuredWidth +
                    this.canvasPaddingX * 2
                ),
                this.minCanvasWidth,
                this.maxCanvasWidth
            );

        const canvasHeight =
            this.canvasPaddingY * 2 +
            this.lineHeight * Math.max(lines.length, 1);

        const canvas =
            document.createElement('canvas');

        const context =
            canvas.getContext('2d');

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.font =
            `bold ${this.fontSize}px sans-serif`;

        context.textAlign = 'center';
        context.textBaseline = 'middle';

        context.shadowColor = this.shadowColor;
        context.shadowBlur = 18;

        lines.forEach((line, index) => {
            const x =
                canvas.width / 2;

            const y =
                this.canvasPaddingY +
                index * this.lineHeight +
                this.lineHeight * 0.5;

            context.fillStyle =
                'rgba(120, 245, 255, 0.24)';

            context.fillText(
                line,
                x + 3,
                y + 3
            );

            context.fillStyle =
                this.baseColor;

            context.fillText(
                line,
                x,
                y
            );
        });

        const texture =
            new THREE.CanvasTexture(
                canvas
            );

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return {
            canvas,
            texture
        };
    }

    wrapText(context, text, maxWidth) {
        if (!text) {
            return [];
        }

        const result = [];

        const hasWhitespace =
            /\s/.test(text);

        if (hasWhitespace) {
            const words =
                text.split(/\s+/);

            let line = '';

            words.forEach(word => {
                const testLine =
                    line
                        ? `${line} ${word}`
                        : word;

                const width =
                    context.measureText(testLine).width;

                if (
                    width > maxWidth &&
                    line
                ) {
                    result.push(line);
                    line = word;
                    return;
                }

                line = testLine;
            });

            if (line) {
                result.push(line);
            }

            return result;
        }

        let line = '';

        Array.from(text).forEach(char => {
            const testLine =
                line + char;

            const width =
                context.measureText(testLine).width;

            if (
                width > maxWidth &&
                line
            ) {
                result.push(line);
                line = char;
                return;
            }

            line = testLine;
        });

        if (line) {
            result.push(line);
        }

        return result;
    }

    createDriftDirection(right, up) {
        const horizontal =
            (Math.random() - 0.5) * 1.2;

        const vertical =
            0.25 + Math.random() * 0.45;

        return new THREE.Vector3()
            .addScaledVector(
                right,
                horizontal
            )
            .addScaledVector(
                up,
                vertical
            )
            .normalize();
    }

    update(camera) {
        if (!camera) return;

        this.updatePhrases(
            camera
        );

        this.updateShards();
    }

    updatePhrases(camera) {
        if (this.activePhrases.length === 0) {
            return;
        }

        this.activePhrases =
            this.activePhrases.filter(phraseObject => {
                const {
                    mesh,
                    material,
                    velocity
                } = phraseObject;

                if (!mesh || !material) {
                    return false;
                }

                if (phraseObject.externalControlled) {
                    mesh.quaternion.copy(
                        camera.quaternion
                    );

                    material.transparent = true;
                    material.needsUpdate = true;

                    return true;
                }

                mesh.quaternion.copy(
                    camera.quaternion
                );

                mesh.position.add(
                    velocity
                );

                mesh.position.y +=
                    phraseObject.riseVelocity;

                phraseObject.life +=
                    phraseObject.noScatter
                        ? 0.0
                        : this.lifeIncrease;

                phraseObject.fadeInProgress =
                    Math.min(
                        phraseObject.fadeInProgress + 0.035,
                        1.0
                    );

                const fadeIn =
                    THREE.MathUtils.smoothstep(
                        phraseObject.fadeInProgress,
                        0,
                        1
                    );

                if (
                    !phraseObject.noScatter &&
                    !phraseObject.freezeScatterForAttract &&
                    !phraseObject.hasScattered &&
                    phraseObject.life >= this.scatterStartLife
                ) {
                    phraseObject.hasScattered = true;
                    phraseObject.isDissolving = true;
                    phraseObject.scatterElapsed = 0;

                    this.spawnDissolvePetalsFromPhrase(
                        phraseObject
                    );
                }

                let opacity = fadeIn;

                if (phraseObject.isDissolving) {
                    phraseObject.scatterElapsed += this.lifeIncrease;

                    const dissolveT =
                        THREE.MathUtils.clamp(
                            phraseObject.scatterElapsed /
                            this.scatterFadeDuration,
                            0,
                            1
                        );

                    opacity =
                        fadeIn *
                        (
                            1.0 -
                            THREE.MathUtils.smoothstep(
                                dissolveT,
                                0,
                                1
                            )
                        );
                }

                material.opacity =
                    Math.max(
                        this.minOpacity,
                        opacity
                    );

                const floatScale =
                    1.0 +
                    Math.sin(
                        phraseObject.fadeInProgress * 8.0 +
                        phraseObject.rotationSeed
                    ) * 0.025;

                mesh.scale
                    .copy(phraseObject.baseScale)
                    .multiplyScalar(floatScale);

                if (
                    phraseObject.isDissolving &&
                    material.opacity <= 0.001
                ) {
                    this.removePhrase(
                        phraseObject
                    );

                    return false;
                }

                return true;
            });
    }

    getActivePhraseObjects() {
        return this.activePhrases.filter(phrase => {
            return !!phrase?.mesh && !!phrase?.material;
        });
    }

    getAttractSeedPhraseObjects() {
        return this.activePhrases.filter(phrase => {
            return (
                !!phrase?.mesh &&
                !!phrase?.material &&
                phrase.attractSeed
            );
        });
    }

    removePhraseObject(phraseObject) {
        this.removePhrase(
            phraseObject
        );

        this.activePhrases =
            this.activePhrases.filter(
                phrase => phrase !== phraseObject
            );
    }

    spawnDissolvePetalsFromPhrase(phraseObject) {
        if (!phraseObject?.mesh) {
            return;
        }

        const mesh =
            phraseObject.mesh;

        mesh.updateMatrixWorld(true);

        const width =
            (phraseObject.planeWidth || this.planeWidth) *
            this.scatterAreaWidthMultiplier;

        const height =
            (phraseObject.planeHeight || this.planeWidth * 0.35) *
            this.scatterAreaHeightMultiplier;

        const right =
            new THREE.Vector3(1, 0, 0)
                .applyQuaternion(mesh.quaternion)
                .normalize();

        const up =
            new THREE.Vector3(0, 1, 0)
                .applyQuaternion(mesh.quaternion)
                .normalize();

        const forward =
            new THREE.Vector3(0, 0, 1)
                .applyQuaternion(mesh.quaternion)
                .normalize();

        for (let i = 0; i < this.scatterShardCount; i++) {
            const localX =
                (Math.random() - 0.5) * width;

            const localY =
                (Math.random() - 0.5) * height;

            const localDepth =
                (Math.random() - 0.5) *
                this.scatterDepthSpread;

            const shardPosition =
                mesh.position
                    .clone()
                    .addScaledVector(
                        right,
                        localX
                    )
                    .addScaledVector(
                        up,
                        localY
                    )
                    .addScaledVector(
                        forward,
                        localDepth
                    );

            const color =
                this.pickPetalColor();

            const shard =
                this.createPetalShard(
                    color
                );

            shard.position.copy(
                shardPosition
            );

            shard.quaternion.copy(
                mesh.quaternion
            );

            shard.rotation.z +=
                Math.random() * Math.PI * 2;

            const scatterDirection =
                new THREE.Vector3()
                    .addScaledVector(
                        right,
                        (Math.random() - 0.5) * 1.35
                    )
                    .addScaledVector(
                        up,
                        this.scatterVerticalBias + Math.random() * 0.85
                    )
                    .addScaledVector(
                        forward,
                        (Math.random() - 0.5) * 0.8
                    )
                    .normalize();

            shard.userData.velocity =
                scatterDirection.multiplyScalar(
                    THREE.MathUtils.lerp(
                        this.scatterShardSpeedMin,
                        this.scatterShardSpeedMax,
                        Math.random()
                    )
                );

            shard.userData.life = 0;

            shard.userData.duration =
                this.scatterShardLifeDuration *
                THREE.MathUtils.lerp(
                    0.75,
                    1.35,
                    Math.random()
                );

            shard.userData.spin =
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.09,
                    (Math.random() - 0.5) * 0.09,
                    (Math.random() - 0.5) * 0.18
                );

            shard.userData.baseScale =
                shard.scale.clone();

            this.shardGroup.add(
                shard
            );

            this.activeShards.push(
                shard
            );
        }
    }

    createPetalShard(color) {
        const texture =
            this.getOrCreatePetalTexture(
                color
            );

        const size =
            THREE.MathUtils.lerp(
                this.scatterShardSizeMin,
                this.scatterShardSizeMax,
                Math.random()
            );

        const geometry =
            new THREE.PlaneGeometry(
                size,
                size * THREE.MathUtils.lerp(
                    1.45,
                    2.05,
                    Math.random()
                )
            );

        const material =
            new THREE.MeshBasicMaterial({
                map: texture,
                color,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false,
                toneMapped: false,
                side: THREE.DoubleSide
            });

        const shard =
            new THREE.Mesh(
                geometry,
                material
            );

        shard.name = 'lyric_dissolve_petal_shard';
        shard.renderOrder = 92;
        shard.frustumCulled = false;
        shard.raycast = () => {};

        shard.scale.setScalar(
            THREE.MathUtils.lerp(
                0.8,
                1.35,
                Math.random()
            )
        );

        return shard;
    }

    getOrCreatePetalTexture(color) {
        const key =
            color.getHexString();

        if (this.petalTextureCache.has(key)) {
            return this.petalTextureCache.get(key);
        }

        const canvas =
            document.createElement('canvas');

        const context =
            canvas.getContext('2d');

        canvas.width = 128;
        canvas.height = 192;

        const cx =
            canvas.width / 2;

        const cy =
            canvas.height / 2;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const hex =
            `#${color.getHexString()}`;

        context.save();

        context.shadowColor = hex;
        context.shadowBlur = 20;

        const gradient =
            context.createRadialGradient(
                cx,
                cy,
                4,
                cx,
                cy,
                72
            );

        gradient.addColorStop(
            0,
            'rgba(255,255,255,0.96)'
        );

        gradient.addColorStop(
            0.36,
            hex
        );

        gradient.addColorStop(
            1,
            'rgba(0,0,0,0)'
        );

        context.fillStyle = gradient;
        context.globalAlpha = 0.92;

        context.beginPath();
        context.ellipse(
            cx,
            cy,
            28,
            68,
            0,
            0,
            Math.PI * 2
        );
        context.fill();

        context.globalCompositeOperation = 'destination-out';
        context.globalAlpha = 0.18;

        context.beginPath();
        context.ellipse(
            cx - 12,
            cy + 6,
            9,
            46,
            -0.18,
            0,
            Math.PI * 2
        );
        context.fill();

        context.restore();

        const texture =
            new THREE.CanvasTexture(
                canvas
            );

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        this.petalTextureCache.set(
            key,
            texture
        );

        return texture;
    }

    pickPetalColor() {
        const colors = [
            0xeaffff,
            0xd8ffff,
            0x9ffcff,
            0x7feeff,
            0xbfdfff,
            0xffffff
        ];

        return new THREE.Color(
            colors[
                Math.floor(
                    Math.random() * colors.length
                )
            ]
        );
    }

    updateShards() {
        if (this.activeShards.length === 0) {
            return;
        }

        this.activeShards =
            this.activeShards.filter(shard => {
                if (!shard || !shard.material) {
                    return false;
                }

                shard.userData.life += 0.016;

                const duration =
                    shard.userData.duration ??
                    this.scatterShardLifeDuration;

                const t =
                    THREE.MathUtils.clamp(
                        shard.userData.life / duration,
                        0,
                        1
                    );

                if (shard.userData.velocity) {
                    shard.position.add(
                        shard.userData.velocity
                    );
                }

                if (shard.userData.spin) {
                    shard.rotation.x +=
                        shard.userData.spin.x;

                    shard.rotation.y +=
                        shard.userData.spin.y;

                    shard.rotation.z +=
                        shard.userData.spin.z;
                }

                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.18,
                        1.0
                    );

                const scaleFade =
                    THREE.MathUtils.lerp(
                        1.0,
                        0.22,
                        THREE.MathUtils.smoothstep(
                            t,
                            0.25,
                            1.0
                        )
                    );

                shard.material.opacity =
                    0.95 * fade;

                if (shard.userData.baseScale) {
                    shard.scale
                        .copy(shard.userData.baseScale)
                        .multiplyScalar(
                            scaleFade
                        );
                }

                shard.material.needsUpdate = true;

                if (t >= 1.0) {
                    this.removeShard(
                        shard
                    );

                    return false;
                }

                return true;
            });
    }

    trimActivePhrases() {
        if (
            this.activePhrases.length <=
            this.maxActivePhrases
        ) {
            return;
        }

        const overflow =
            this.activePhrases.length -
            this.maxActivePhrases;

        const targets =
            this.activePhrases.splice(
                0,
                overflow
            );

        targets.forEach(phraseObject => {
            this.removePhrase(
                phraseObject
            );
        });
    }

    removePhrase(phraseObject) {
        if (!phraseObject) return;

        const {
            mesh,
            material
        } = phraseObject;

        if (mesh) {
            mesh.parent?.remove(mesh);

            if (mesh.geometry) {
                mesh.geometry.dispose?.();
            }
        }

        if (material) {
            if (material.map) {
                material.map.dispose?.();
            }

            material.dispose?.();
        }
    }

    removeShard(shard) {
        if (!shard) return;

        shard.parent?.remove(shard);

        if (shard.geometry) {
            shard.geometry.dispose?.();
        }

        if (shard.material) {
            shard.material.dispose?.();
        }
    }

    clear() {
        this.activePhrases.forEach(phraseObject => {
            this.removePhrase(
                phraseObject
            );
        });

        this.activeShards.forEach(shard => {
            this.removeShard(
                shard
            );
        });

        this.activePhrases = [];
        this.activeShards = [];
    }

    dispose() {
        this.clear();

        this.petalTextureCache.forEach(texture => {
            texture.dispose?.();
        });

        this.petalTextureCache.clear();
    }
}