import * as THREE from 'three';

export class EphemeralBloomEffect {
    constructor(scene, spawnManager = null, options = {}) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        this.group = new THREE.Group();
        this.group.name = 'ephemeralBloomEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        this.activeBlooms = [];
        this.activeShards = [];

        this.countMin = options.countMin ?? 10;
        this.countMax = options.countMax ?? 18;

        this.radiusMin = options.radiusMin ?? 1.4;
        this.radiusMax = options.radiusMax ?? 5.4;

        this.lifeDuration = options.lifeDuration ?? 1.65;
        this.scatterTiming = options.scatterTiming ?? 0.62;

        this.scaleMin = options.scaleMin ?? 0.18;
        this.scaleMax = options.scaleMax ?? 0.38;

        this.objectIds = options.objectIds ?? [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ];

        this.shardCountMin = options.shardCountMin ?? 7;
        this.shardCountMax = options.shardCountMax ?? 12;

        this.shardLifeDuration = options.shardLifeDuration ?? 0.72;
        this.shardSpeedMin = options.shardSpeedMin ?? 0.045;
        this.shardSpeedMax = options.shardSpeedMax ?? 0.14;

        this.fallbackTextureCache = new Map();
    }

    spawn(position, options = {}) {
    if (!this.scene || !position) {
        return;
    }

    const count =
        options.count ??
        this.randomInt(
            this.countMin,
            this.countMax
        );

    const surfaceNormal =
        options.surfaceNormal
            ? options.surfaceNormal.clone().normalize()
            : new THREE.Vector3(0, 1, 0);

    const camera =
        options.camera || null;

    const tangentBasis =
        this.createTangentBasis(
            surfaceNormal,
            camera
        );

    let createdCount = 0;
    let attempts = 0;

    const maxAttempts =
        count * 5;

    while (
        createdCount < count &&
        attempts < maxAttempts
    ) {
        attempts++;

        const angle =
            Math.random() * Math.PI * 2;

        const radius =
            THREE.MathUtils.lerp(
                options.radiusMin ?? this.radiusMin,
                options.radiusMax ?? this.radiusMax,
                Math.sqrt(Math.random())
            );

        const offset =
            new THREE.Vector3()
                .addScaledVector(
                    tangentBasis.tangent,
                    Math.cos(angle) * radius
                )
                .addScaledVector(
                    tangentBasis.bitangent,
                    Math.sin(angle) * radius
                );

        const spawnPoint =
            position
                .clone()
                .add(offset)
                .addScaledVector(
                    surfaceNormal,
                    options.yOffset ?? 0.1
                );

        if (
            typeof options.surfaceValidator === 'function' &&
            !options.surfaceValidator(spawnPoint)
        ) {
            continue;
        }

        const bloomObject =
            this.createBloomObject(
                spawnPoint,
                surfaceNormal,
                options
            );

        if (!bloomObject) {
            continue;
        }

        bloomObject.userData.isEphemeralBloomObject = true;
        bloomObject.userData.life = 0;
        bloomObject.userData.delay = Math.random() * 0.18;

        bloomObject.userData.duration =
            options.lifeDuration ?? this.lifeDuration;

        bloomObject.userData.scatterTiming =
            options.scatterTiming ?? this.scatterTiming;

        bloomObject.userData.surfaceNormal =
            surfaceNormal.clone();

        bloomObject.userData.baseScale =
            bloomObject.scale.clone();

        bloomObject.userData.hasScattered = false;

        /*
         * fallback plane は直接 opacity 制御するので、
         * material state を取らない。
         */
        if (!bloomObject.userData.isFallbackEphemeral) {
            this.captureMaterialState(
                bloomObject,
                options
            );
        }

        bloomObject.visible = false;

        bloomObject.scale.copy(
            bloomObject.userData.baseScale
        );

        this.applyOpacity(
            bloomObject,
            0
        );

        this.activeBlooms.push(
            bloomObject
        );

        createdCount++;
    }
}


    createBloomObject(spawnPoint, surfaceNormal, options = {}) {
    if (
        this.spawnManager &&
        typeof this.spawnManager.spawn === 'function'
    ) {
        const id =
            this.pickBloomObjectId();

        const scaleMultiplier =
            THREE.MathUtils.lerp(
                options.scaleMin ?? this.scaleMin,
                options.scaleMax ?? this.scaleMax,
                Math.random()
            );

        const object =
            this.spawnManager.spawn(
                id,
                spawnPoint,
                {
                    scaleMultiplier,
                    randomRotation: true
                }
            );

        if (object) {
            object.name =
                `ephemeral_${id}`;

            object.userData.ignorePulse = true;
            object.userData.isEphemeralBloomObject = true;
            object.userData.ephemeralSourceId = id;
            object.userData.isFallbackEphemeral = false;

            this.prepareRealObjectForEffect(
                object,
                options
            );

            return object;
        }
    }

    /*
     * 実モデルが使えない場合だけ fallback。
     */
    return this.createFallbackBloomPlane(
        spawnPoint,
        surfaceNormal,
        options
    );
}

    pickBloomObjectId() {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.hasModel !== 'function'
        ) {
            return this.objectIds[
                Math.floor(Math.random() * this.objectIds.length)
            ];
        }

        const availableIds =
            this.objectIds.filter(id => {
                return this.spawnManager.hasModel(id);
            });

        if (availableIds.length === 0) {
            return this.objectIds[
                Math.floor(Math.random() * this.objectIds.length)
            ];
        }

        return availableIds[
            Math.floor(Math.random() * availableIds.length)
        ];
    }

    prepareRealObjectForEffect(object, options = {}) {
    object.traverse(child => {
        if (!child) {
            return;
        }

        child.frustumCulled = false;

        /*
         * 高すぎる renderOrder は使わない。
         * 実モデルとして自然に描画する。
         */
        child.renderOrder = 0;

        const lineMaterial =
            child.userData?.lineMaterial;

        if (lineMaterial) {
            lineMaterial.transparent = true;
            lineMaterial.opacity = 0.0;

            lineMaterial.depthWrite = false;
            lineMaterial.depthTest = true;
            lineMaterial.depthFunc = THREE.LessEqualDepth;

            lineMaterial.blending = THREE.NormalBlending;
            lineMaterial.toneMapped = false;
            lineMaterial.needsUpdate = true;
        }

        if (child.material) {
            const materials =
                Array.isArray(child.material)
                    ? child.material
                    : [child.material];

            materials.forEach(material => {
                if (!material) {
                    return;
                }

                /*
                 * 色は触らない。
                 * flower / Grass の元マテリアルを尊重する。
                 */
                material.transparent = true;

                /*
                 * 一時演出なので depthWrite は false。
                 * ただし depthTest は true にして、ミクや手前物体とは自然に前後関係を作る。
                 */
                material.depthWrite = false;
                material.depthTest = true;
                material.depthFunc = THREE.LessEqualDepth;

                /*
                 * AdditiveBlending は白っぽくなるので使わない。
                 */
                material.blending = THREE.NormalBlending;

                material.toneMapped = false;
                material.needsUpdate = true;
            });
        }

        if (child.isMesh || child.isLine) {
            child.raycast = () => {};
        }
    });
}

   captureMaterialState(object, options = {}) {
    const materialStates = [];
    const colorPool = [];
    const seenMaterials = new Set();

    object.traverse(child => {
        const lineMaterial =
            child.userData?.lineMaterial;

        if (
            lineMaterial &&
            !seenMaterials.has(lineMaterial)
        ) {
            seenMaterials.add(lineMaterial);

            const baseColor =
                lineMaterial.color
                    ? lineMaterial.color.clone()
                    : new THREE.Color(0x8ffcff);

            colorPool.push(
                baseColor.clone()
            );

            materialStates.push({
                material: lineMaterial,
                targetOpacity: 1.0,
                baseColor
            });
        }

        if (child.material) {
            const materials =
                Array.isArray(child.material)
                    ? child.material
                    : [child.material];

            materials.forEach(material => {
                if (!material) {
                    return;
                }

                if (seenMaterials.has(material)) {
                    return;
                }

                seenMaterials.add(material);

                const isWire =
                    child.userData?.isWire ||
                    child.userData?.lineMaterial === material;

                const originalOpacity =
                    typeof material.opacity === 'number'
                        ? material.opacity
                        : 1.0;

                const baseColor =
                    material.color
                        ? material.color.clone()
                        : new THREE.Color(0x8ffcff);

                colorPool.push(
                    baseColor.clone()
                );

                materialStates.push({
                    material,
                    targetOpacity: isWire
                        ? 1.0
                        : originalOpacity,
                    baseColor
                });
            });
        }
    });

    if (colorPool.length === 0) {
        colorPool.push(
            new THREE.Color(0x8ffcff)
        );
    }

    object.userData.ephemeralMaterialStates =
        materialStates;

    object.userData.ephemeralColorPool =
        colorPool;
}
    createFallbackBloomPlane(spawnPoint, surfaceNormal, options = {}) {
    const color =
        new THREE.Color(
            options.color ?? 0x8ffcff
        );

    const secondaryColor =
        new THREE.Color(
            options.secondaryColor ?? 0xeaffff
        );

    const texture =
        this.getOrCreateFallbackTexture(
            color,
            secondaryColor
        );

    const material =
        new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff,

            transparent: true,
            opacity: 0.0,

            blending: THREE.NormalBlending,

            depthWrite: false,

            /*
             * 一時 bloom は短命なので、地形との競合を避ける。
             */
            depthTest: false,

            toneMapped: false,
            side: THREE.DoubleSide
        });

    const size =
        THREE.MathUtils.lerp(
            options.scaleMin ?? 0.24,
            options.scaleMax ?? 0.42,
            Math.random()
        );

    const mesh =
        new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            material
        );

    mesh.name = 'ephemeral_fallback_bloom';

    /*
     * 地形から少し浮かせる。
     */
    const safePoint =
        spawnPoint
            .clone()
            .addScaledVector(
                surfaceNormal.clone().normalize(),
                0.28
            );

    mesh.position.copy(
        safePoint
    );

    /*
     * カメラに向ける。
     * 地面に寝かせない。
     */
    if (options.camera) {
        mesh.lookAt(
            options.camera.position
        );

        mesh.userData.billboardCamera =
            options.camera;
    }

    mesh.renderOrder = 9999;

    mesh.frustumCulled = false;
    mesh.userData.isFallbackEphemeral = true;
    mesh.userData.isEphemeralBloomObject = true;
    mesh.raycast = () => {};

    this.group.add(mesh);

    return mesh;
}

    createTangentBasis(normal, camera = null) {
        const up =
            normal.clone().normalize();

        let tangent;

        if (camera) {
            const cameraDirection =
                camera.position
                    .clone()
                    .normalize();

            tangent =
                cameraDirection
                    .cross(up)
                    .normalize();

            if (tangent.lengthSq() < 0.0001) {
                tangent =
                    new THREE.Vector3(1, 0, 0);
            }
        } else {
            tangent =
                new THREE.Vector3(1, 0, 0)
                    .cross(up)
                    .normalize();

            if (tangent.lengthSq() < 0.0001) {
                tangent =
                    new THREE.Vector3(0, 0, 1);
            }
        }

        const bitangent =
            up.clone()
                .cross(tangent)
                .normalize();

        return {
            tangent,
            bitangent
        };
    }

    update(delta = 0.016) {
        this.updateBlooms(delta);
        this.updateShards(delta);
    }

    updateBlooms(delta = 0.016) {
        if (this.activeBlooms.length === 0) {
            return;
        }

        this.activeBlooms =
            this.activeBlooms.filter(object => {
                if (!object) {
                    return false;
                }

                object.userData.life += delta;

                const life =
                    object.userData.life;

                const delay =
                    object.userData.delay ?? 0;

                if (life < delay) {
                    object.visible = false;
                    return true;
                }

                object.visible = true;

                const duration =
                    object.userData.duration ?? this.lifeDuration;

                const t =
                    THREE.MathUtils.clamp(
                        (life - delay) / duration,
                        0,
                        1
                    );

                const scatterTiming =
                    object.userData.scatterTiming ??
                    this.scatterTiming;

                this.updateBloomOpacityOnly(
                    object,
                    t,
                    scatterTiming
                );

                if (
                    !object.userData.hasScattered &&
                    t >= scatterTiming
                ) {
                    object.userData.hasScattered = true;

                    this.spawnColorShardsFromObject(
                        object
                    );

                    this.remove(
                        object
                    );

                    return false;
                }

                if (t >= 1.0) {
                    this.remove(object);
                    return false;
                }

                return true;
            });
    }

    updateBloomOpacityOnly(object, t, scatterTiming) {
    const fadeIn =
        THREE.MathUtils.smoothstep(
            t,
            0,
            0.18
        );

    const hold =
        t < scatterTiming
            ? 1.0
            : 0.0;

    const opacity =
        0.96 * fadeIn * hold;

    object.scale.copy(
        object.userData.baseScale
    );

    /*
     * fallback bloom は常にカメラ方向を向く。
     */
    if (
        object.userData?.isFallbackEphemeral &&
        object.userData?.billboardCamera
    ) {
        object.lookAt(
            object.userData.billboardCamera.position
        );
    }

    this.applyOpacity(
        object,
        opacity
    );
}


    spawnColorShardsFromObject(object) {
        if (!object || !this.scene) {
            return;
        }

        const colorPool =
            object.userData.ephemeralColorPool || [
                new THREE.Color(0x8ffcff)
            ];

        const surfaceNormal =
            object.userData.surfaceNormal ||
            new THREE.Vector3(0, 1, 0);

        const worldPosition =
            new THREE.Vector3();

        object.getWorldPosition(
            worldPosition
        );

        const shardCount =
            this.randomInt(
                this.shardCountMin,
                this.shardCountMax
            );

        for (let i = 0; i < shardCount; i++) {
            const color =
                colorPool[
                    Math.floor(Math.random() * colorPool.length)
                ].clone();

            const shard =
                this.createColorShard(
                    color
                );

            shard.position.copy(
                worldPosition
            );

            const randomDir =
                new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() * 0.7 + 0.25,
                    Math.random() - 0.5
                ).normalize();

            const direction =
                randomDir
                    .addScaledVector(
                        surfaceNormal,
                        0.45
                    )
                    .normalize();

            shard.userData.velocity =
                direction.multiplyScalar(
                    THREE.MathUtils.lerp(
                        this.shardSpeedMin,
                        this.shardSpeedMax,
                        Math.random()
                    )
                );

            shard.userData.life = 0;
            shard.userData.duration =
                this.shardLifeDuration;

            shard.userData.spin =
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.18,
                    (Math.random() - 0.5) * 0.18,
                    (Math.random() - 0.5) * 0.18
                );

            this.group.add(shard);
            this.activeShards.push(shard);
        }
    }

    createColorShard(color) {
        const geometry =
            new THREE.TetrahedronGeometry(
                THREE.MathUtils.lerp(
                    0.045,
                    0.095,
                    Math.random()
                ),
                0
            );

        const material =
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.95,

                /*
                 * 重要:
                 * AdditiveBlending + depthTest:false は Miku を貫通する。
                 */
                blending: THREE.NormalBlending,

                depthWrite: false,
                depthTest: true,
                depthFunc: THREE.LessEqualDepth,

                toneMapped: false
            });

        const shard =
            new THREE.Mesh(
                geometry,
                material
            );

        shard.name =
            'ephemeral_color_prism_shard';

        /*
         * 高い renderOrder にしない。
         */
        shard.renderOrder = 0;

        shard.frustumCulled = false;
        shard.raycast = () => {};

        return shard;
    }

    updateShards(delta = 0.016) {
        if (this.activeShards.length === 0) {
            return;
        }

        this.activeShards =
            this.activeShards.filter(shard => {
                if (!shard || !shard.material) {
                    return false;
                }

                shard.userData.life += delta;

                const duration =
                    shard.userData.duration ??
                    this.shardLifeDuration;

                const t =
                    THREE.MathUtils.clamp(
                        shard.userData.life / duration,
                        0,
                        1
                    );

                shard.position.add(
                    shard.userData.velocity
                );

                shard.rotation.x +=
                    shard.userData.spin.x;

                shard.rotation.y +=
                    shard.userData.spin.y;

                shard.rotation.z +=
                    shard.userData.spin.z;

                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.25,
                        1.0
                    );

                shard.material.opacity =
                    0.95 * fade;

                shard.material.needsUpdate = true;

                if (t >= 1.0) {
                    this.removeShard(shard);
                    return false;
                }

                return true;
            });
    }

    applyOpacity(object, opacity) {
    const materialStates =
        object.userData.ephemeralMaterialStates || [];

    if (materialStates.length === 0) {
        object.traverse(child => {
            if (!child.material) {
                return;
            }

            const materials =
                Array.isArray(child.material)
                    ? child.material
                    : [child.material];

            materials.forEach(material => {
                if (!material) {
                    return;
                }

                material.transparent = true;

                material.opacity =
                    THREE.MathUtils.clamp(
                        opacity,
                        0,
                        1
                    );

                material.depthWrite = false;
                material.depthTest = true;
                material.depthFunc = THREE.LessEqualDepth;

                material.blending = THREE.NormalBlending;
                material.toneMapped = false;
                material.needsUpdate = true;
            });
        });

        return;
    }

    materialStates.forEach(state => {
        const material =
            state.material;

        if (!material) {
            return;
        }

        material.transparent = true;

        material.opacity =
            THREE.MathUtils.clamp(
                opacity * state.targetOpacity,
                0,
                1
            );

        if (material.color && state.baseColor) {
            material.color.copy(
                state.baseColor
            );
        }

        material.depthWrite = false;
        material.depthTest = true;
        material.depthFunc = THREE.LessEqualDepth;

        material.blending = THREE.NormalBlending;
        material.toneMapped = false;
        material.needsUpdate = true;
    });
}

    remove(object) {
        if (!object) {
            return;
        }

        object.parent?.remove(object);

        if (object.userData?.isFallbackEphemeral) {
            if (object.geometry) {
                object.geometry.dispose?.();
            }

            if (object.material) {
                object.material.dispose?.();
            }

            return;
        }

        object.traverse(child => {
            if (!child) {
                return;
            }

            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        material?.dispose?.();
                    });
                } else {
                    child.material.dispose?.();
                }
            }
        });
    }

    removeShard(shard) {
        if (!shard) {
            return;
        }

        shard.parent?.remove(shard);

        if (shard.geometry) {
            shard.geometry.dispose?.();
        }

        if (shard.material) {
            shard.material.dispose?.();
        }
    }

    clear() {
        this.activeBlooms.forEach(object => {
            this.remove(object);
        });

        this.activeShards.forEach(shard => {
            this.removeShard(shard);
        });

        this.activeBlooms = [];
        this.activeShards = [];
    }

    dispose() {
        this.clear();

        this.fallbackTextureCache.forEach(texture => {
            texture.dispose?.();
        });

        this.fallbackTextureCache.clear();
    }

    getOrCreateFallbackTexture(color, secondaryColor) {
        const key =
            `${color.getHexString()}_${secondaryColor.getHexString()}`;

        if (this.fallbackTextureCache.has(key)) {
            return this.fallbackTextureCache.get(key);
        }

        const texture =
            this.createFallbackFlowerTexture(
                color,
                secondaryColor
            );

        this.fallbackTextureCache.set(
            key,
            texture
        );

        return texture;
    }

    createFallbackFlowerTexture(color, secondaryColor) {
        const canvas =
            document.createElement('canvas');

        const context =
            canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 256;

        const cx =
            canvas.width / 2;

        const cy =
            canvas.height / 2;

        const primaryHex =
            `#${color.getHexString()}`;

        const secondaryHex =
            `#${secondaryColor.getHexString()}`;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.save();

        context.shadowColor = primaryHex;
        context.shadowBlur = 28;

        for (let i = 0; i < 7; i++) {
            const angle =
                (i / 7) * Math.PI * 2;

            context.save();

            context.translate(
                cx + Math.cos(angle) * 38,
                cy + Math.sin(angle) * 38
            );

            context.rotate(angle);

            const gradient =
                context.createRadialGradient(
                    0,
                    0,
                    4,
                    0,
                    0,
                    34
                );

            gradient.addColorStop(
                0,
                'rgba(255,255,255,0.95)'
            );

            gradient.addColorStop(
                0.38,
                primaryHex
            );

            gradient.addColorStop(
                1,
                'rgba(0,0,0,0)'
            );

            context.fillStyle = gradient;
            context.globalAlpha = 0.9;

            context.beginPath();

            context.ellipse(
                0,
                0,
                17,
                34,
                0,
                0,
                Math.PI * 2
            );

            context.fill();

            context.restore();
        }

        context.shadowBlur = 18;
        context.fillStyle = secondaryHex;
        context.globalAlpha = 0.95;

        context.beginPath();

        context.arc(
            cx,
            cy,
            18,
            0,
            Math.PI * 2
        );

        context.fill();

        context.restore();

        const texture =
            new THREE.CanvasTexture(canvas);

        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    randomInt(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }
}