import * as THREE from 'three';

/**
 * ======================================================
 * EphemeralBloomEffect
 *
 * ✅ このクラスの役割
 * - 「一時的に咲いて、すぐに弾けて消える花（ephemeral bloom）」の演出を管理する
 * - 花が消える瞬間に、色のついた破片（シャード）を周囲に飛び散らせる
 *
 * ✅ 演出の流れ（1つの花のライフサイクル）
 *   1. spawn() で花オブジェクトを生成（実モデル優先、無ければ平面のfallback）
 *   2. update() で毎フレーム、フェードイン → 保持 → 弾ける、を進行させる
 *   3. 「弾ける」タイミングで花を消し、代わりに小さな色付きシャードを撒き散らす
 *   4. シャードも時間経過でフェードアウトして消える
 *
 * ✅ 設計思想
 * - 実際のモデル（花・草など）が使えるなら、それを使って自然に見せる
 * - 使えない場合のみ、テクスチャ付きの平面（fallback）で代用する
 * - 深度書き込み(depthWrite)はオフにしつつ深度テスト(depthTest)はオンにすることで、
 *   ミクや地形などの手前の物体と自然な前後関係を保ちつつ、半透明描画の競合を避けている
 * ======================================================
 */
export class EphemeralBloomEffect {
    /**
     * @param {THREE.Scene} scene - エフェクトを追加する対象のシーン
     * @param {SpawnManager|null} spawnManager - 実モデル（花・草など）を取得するためのマネージャ
     * @param {Object} options - 各種パラメータの初期値（省略時はデフォルト値を使用）
     */
    constructor(scene, spawnManager = null, options = {}) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        // このエフェクト専用のグループ。生成した花・シャードは全てここに追加される。
        this.group = new THREE.Group();
        this.group.name = 'ephemeralBloomEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        // 現在アクティブな「咲いている花」と「飛び散ったシャード」のリスト
        this.activeBlooms = [];
        this.activeShards = [];

        // --- 花の出現パラメータ ---
        this.countMin = options.countMin ?? 10;   // 一度に咲かせる花の最小数
        this.countMax = options.countMax ?? 18;   // 一度に咲かせる花の最大数

        this.radiusMin = options.radiusMin ?? 1.4; // 中心からの最小距離
        this.radiusMax = options.radiusMax ?? 5.4; // 中心からの最大距離

        this.lifeDuration = options.lifeDuration ?? 1.65;     // 花1つあたりの寿命（秒）
        this.scatterTiming = options.scatterTiming ?? 0.62;  // 寿命のうち何割の時点で弾けるか(0〜1)

        this.scaleMin = options.scaleMin ?? 0.18; // 花の縮小スケール（最小）
        this.scaleMax = options.scaleMax ?? 0.38; // 花の縮小スケール（最大）

        // 実モデルを使う場合に、ランダムに選ばれる候補オブジェクトID
        this.objectIds = options.objectIds ?? [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ];

        // --- シャード（破片）パラメータ ---
        this.shardCountMin = options.shardCountMin ?? 7;   // 1回の弾けで生成するシャードの最小数
        this.shardCountMax = options.shardCountMax ?? 12;  // 1回の弾けで生成するシャードの最大数

        this.shardLifeDuration = options.shardLifeDuration ?? 0.72; // シャードの寿命（秒）
        this.shardSpeedMin = options.shardSpeedMin ?? 0.045;        // シャードの飛散速度（最小）
        this.shardSpeedMax = options.shardSpeedMax ?? 0.14;         // シャードの飛散速度（最大）

        // fallback（平面）用テクスチャのキャッシュ。色の組み合わせごとに再利用する。
        this.fallbackTextureCache = new Map();
    }

    /**
     * 指定した位置を中心に、複数の「一時的な花」を出現させる。
     * 各花はランダムな角度・距離（タンジェント平面上）に配置され、
     * 表面の法線方向に沿って少し浮かせた位置に置かれる。
     *
     * @param {THREE.Vector3} position - 花を咲かせる中心位置
     * @param {Object} options.count - 咲かせる花の数（省略時はcountMin〜countMaxからランダム）
     * @param {THREE.Vector3} options.surfaceNormal - 設置面の法線（省略時は真上(0,1,0)）
     * @param {THREE.Camera} options.camera - fallback花をビルボード（カメラ正面向き）にするためのカメラ
     * @param {Function} options.surfaceValidator - 生成座標が有効か判定する関数（falseなら再抽選）
     * @param {number} options.yOffset - 表面法線方向への浮き上がり量
     */
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

    // 法線に対して垂直な平面（タンジェント・バイタンジェント）を作り、
    // その平面上で円形にランダム配置するための基底ベクトルを得る
    const tangentBasis =
        this.createTangentBasis(
            surfaceNormal,
            camera
        );

    let createdCount = 0;
    let attempts = 0;

    // surfaceValidatorで弾かれ続けるケースを想定し、試行回数に上限を設ける
    const maxAttempts =
        count * 5;

    while (
        createdCount < count &&
        attempts < maxAttempts
    ) {
        attempts++;

        const angle =
            Math.random() * Math.PI * 2;

        // 中心に密集しすぎないよう、sqrt(random)で半径方向の分布を均等化している
        const radius =
            THREE.MathUtils.lerp(
                options.radiusMin ?? this.radiusMin,
                options.radiusMax ?? this.radiusMax,
                Math.sqrt(Math.random())
            );

        // タンジェント平面上の円周上にオフセットを計算
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

        // 中心位置 + オフセット + 法線方向への浮き上がり、で最終的な出現座標を決定
        const spawnPoint =
            position
                .clone()
                .add(offset)
                .addScaledVector(
                    surfaceNormal,
                    options.yOffset ?? 0.1
                );

        // 呼び出し元が座標の妥当性チェック（例：地形の上か等）を渡している場合、それに従う
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

        // --- このオブジェクトのライフサイクル管理用データを設定 ---
        bloomObject.userData.isEphemeralBloomObject = true;
        bloomObject.userData.life = 0;
        bloomObject.userData.delay = Math.random() * 0.18; // 出現タイミングを少しずらす

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
            // 実モデルの場合は、元のマテリアル状態（色・目標不透明度）を記録しておく。
            // これにより、フェードインの際に「元の見た目」へ正しく戻せる。
            this.captureMaterialState(
                bloomObject,
                options
            );
        }

        // 生成直後は非表示にしておき、update()側でフェードインさせる
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


    /**
     * 1つの花オブジェクトを生成する。
     * SpawnManagerから実モデル（花・草など）を取得できればそれを使い、
     * 取得できない場合のみ平面のfallbackオブジェクトを生成する。
     */
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

            // このオブジェクトは「一時的な演出専用」であることを示すフラグ群
            object.userData.ignorePulse = true;
            object.userData.isEphemeralBloomObject = true;
            object.userData.ephemeralSourceId = id;
            object.userData.isFallbackEphemeral = false;

            // マテリアルの透明設定・描画順などをエフェクト用に調整する
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

    /**
     * 出現させる花/草のオブジェクトIDを1つランダムに選ぶ。
     * SpawnManagerが「モデルを持っているか」を判定できる場合は、
     * 実際に利用可能なIDの中からのみ選ぶ（無いモデルを誤って選ばないようにする）。
     */
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

    /**
     * SpawnManagerから取得した「実モデル」を、このエフェクトで使うために調整する。
     * - フラスタムカリングを無効化（演出中に不意に消えないように）
     * - 描画順序(renderOrder)を通常に戻す
     * - マテリアルを半透明対応にしつつ、深度テストは有効、深度書き込みは無効にする
     *   （手前の物体と自然な前後関係を保ちつつ、重ね描画の破綻を避ける）
     * - AdditiveBlendingは使わず、元の色味を保つためNormalBlendingに統一する
     * - レイキャスト対象から外す（クリック判定などに干渉しないようにする）
     */
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
            // クリックなどのレイキャスト判定に引っかからないよう、無効化する
            child.raycast = () => {};
        }
    });
}

   /**
    * オブジェクトが持つ各マテリアルの「元の状態」（目標とする不透明度・元の色）を記録する。
    * これは applyOpacity() でフェードイン/アウトする際に、
    * 「どの不透明度まで戻すべきか」「どの色を保つべきか」の基準として使われる。
    * また、シャード生成時に使う色（colorPool）もここで集めている。
    */
   captureMaterialState(object, options = {}) {
    const materialStates = [];
    const colorPool = [];
    const seenMaterials = new Set();

    object.traverse(child => {
        const lineMaterial =
            child.userData?.lineMaterial;

        // ワイヤーフレーム的な線専用マテリアルがある場合、優先的に記録する
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
                    // ワイヤー系は常に完全表示(1.0)、それ以外は元の不透明度を目標値とする
                    targetOpacity: isWire
                        ? 1.0
                        : originalOpacity,
                    baseColor
                });
            });
        }
    });

    // 色が1つも見つからなかった場合のフォールバック色
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
    /**
     * 実モデルが使用できない場合の代替表現として、
     * 花のように見えるテクスチャを貼った1枚の平面（Plane）を生成する。
     * カメラが渡されていれば、常にカメラへ正面を向ける（ビルボード）ようにする。
     */
    createFallbackBloomPlane(spawnPoint, surfaceNormal, options = {}) {
    const color =
        new THREE.Color(
            options.color ?? 0x8ffcff
        );

    const secondaryColor =
        new THREE.Color(
            options.secondaryColor ?? 0xeaffff
        );

    // 同じ色の組み合わせのテクスチャはキャッシュを再利用し、生成コストを抑える
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

        // 毎フレームのビルボード更新（updateBloomOpacityOnly内）で参照するために保持しておく
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

    /**
     * 指定した法線(normal)に対して垂直な平面上で円形配置するための、
     * 2つの基底ベクトル（tangent・bitangent）を計算する。
     * カメラが渡されている場合は、カメラ視線方向を考慮してtangentを決定する
     * （ビルボード的な花の配置を自然に見せるため）。
     */
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

            // 法線とカメラ方向がほぼ平行な場合、外積がゼロベクトルに近くなるため、
            // 代わりに固定のX軸を使ってフォールバックする
            if (tangent.lengthSq() < 0.0001) {
                tangent =
                    new THREE.Vector3(1, 0, 0);
            }
        } else {
            tangent =
                new THREE.Vector3(1, 0, 0)
                    .cross(up)
                    .normalize();

            // 同様に、法線がX軸とほぼ平行な場合のフォールバック
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

    /**
     * 毎フレーム呼び出されるエントリーポイント。
     * 「咲いている花」と「飛び散ったシャード」の両方を更新する。
     */
    update(delta = 0.016) {
        this.updateBlooms(delta);
        this.updateShards(delta);
    }

    /**
     * 全ての「咲いている花」を1フレーム分進行させる。
     * 各花は delay（出現待ち）→ フェードイン・保持 → scatterTiming到達で弾ける、
     * という流れを辿り、寿命(duration)を超えても弾けなかった場合は静かに消える。
     * filter()を使い、生存している花だけを次フレームのactiveBloomsとして残す。
     */
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

                // まだ出現タイミング（delay）に達していない間は非表示のまま待機
                if (life < delay) {
                    object.visible = false;
                    return true;
                }

                object.visible = true;

                const duration =
                    object.userData.duration ?? this.lifeDuration;

                // delay分を引いた「表示開始後の経過時間」を 0〜1 に正規化
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

                // scatterTimingに到達した瞬間に一度だけ「弾ける」処理を実行する
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

                // 弾けずに寿命が尽きた場合も、静かに削除する
                if (t >= 1.0) {
                    this.remove(object);
                    return false;
                }

                return true;
            });
    }

    /**
     * 花1つの「見た目（不透明度・向き）」だけを、進行度tに応じて更新する。
     * - 0〜0.18の間でフェードイン（smoothstep）
     * - scatterTimingに到達するまでは完全表示を保持（hold）
     * - scatterTiming以降は即座に不透明度0（＝この直後に弾けて消えるため）
     */
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


    /**
     * 1つの花が「弾けた」タイミングで、その位置から色付きの小さなシャード（破片）を
     * ランダムな個数・方向・速度で飛び散らせる。
     * シャードの色は、花のマテリアルから記録しておいたcolorPoolからランダムに選ばれる。
     */
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

            // ランダムな方向（やや上向きに偏らせる）に、表面法線方向の成分を加えて
            // 「表面から浮き上がるように飛び散る」自然な軌道を作る
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

            // 飛んでいる間、ランダムにゆっくり回転させるための角速度
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

    /**
     * 1個分の色付きシャード（四面体メッシュ）を生成する。
     * AdditiveBlendingは使わず、NormalBlending + depthTest有効にすることで、
     * ミクなどの手前の物体を貫通して表示されないようにしている。
     */
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

    /**
     * 全ての「飛び散ったシャード」を1フレーム分進行させる。
     * 速度に従って移動・回転させ、寿命の後半（0.25〜1.0）でフェードアウトさせる。
     * 寿命が尽きたシャードは破棄してリストから除外する。
     */
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

                // t=0.25〜1.0の範囲でなめらかに不透明度を0へ近づける
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

    /**
     * オブジェクト配下の全マテリアルに対して、指定した不透明度を適用する。
     *
     * - captureMaterialState() で記録済みの状態（ephemeralMaterialStates）がある場合は、
     *   各マテリアルの「目標不透明度（targetOpacity）」と「元の色」を踏まえて適用する
     *   （= 単純に0〜1ではなく、マテリアルごとの最終的な見た目を尊重する）。
     * - 記録が無い場合（fallback平面など）は、traverseして見つかった全マテリアルに
     *   そのままopacityを適用する。
     *
     * いずれの場合も、半透明描画のための基本設定
     * （transparent / depthWrite無効 / depthTest有効 / NormalBlending等）を統一して付与している。
     */
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

        // 全体のopacityに、そのマテリアル固有の目標不透明度(targetOpacity)を掛け合わせる
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

    /**
     * 花オブジェクトをシーンから取り除き、必要に応じてリソースを解放する。
     * fallback平面の場合はこのクラスが生成したgeometry/materialなので、
     * ここで明示的にdispose()してメモリを解放する。
     * 実モデルの場合はSpawnManager側が管理しているリソースかもしれないため、
     * シーンからは外すが、ここでのdisposeは行わない（誤って共有リソースを破棄しないため）。
     */
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

    /**
     * シャードをシーンから取り除き、geometry/materialを解放する。
     * シャードは全てこのクラスが生成した専用オブジェクトなので、
     * 常に安全にdispose()してよい。
     */
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

    /**
     * 現在アクティブな花・シャードを全て即座に削除する。
     * シーン切り替えや演出の中断時などに使用する。
     */
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

    /**
     * このエフェクトが保持する全てのリソース（花・シャード・fallbackテクスチャ）を解放する。
     * エフェクト自体を完全に破棄する際に呼び出す。
     */
    dispose() {
        this.clear();

        this.fallbackTextureCache.forEach(texture => {
            texture.dispose?.();
        });

        this.fallbackTextureCache.clear();
    }

    /**
     * 指定した色の組み合わせに対応するfallback用テクスチャを取得する。
     * 既に生成済みであればキャッシュから返し、無ければ新規生成してキャッシュに保存する。
     */
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

    /**
     * Canvas APIを使って、花のように見えるテクスチャ画像を動的に生成する。
     * 7枚の花びら（楕円形のグラデーション）を中心の周りに円形に配置し、
     * 中心には副色（secondaryColor）の円（花芯）を描く。
     * 実モデルが用意できない環境でも、それらしい花の見た目を表現するための代替手段。
     */
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

        // 中心の周りに7枚の花びらを等間隔で描画する
        for (let i = 0; i < 7; i++) {
            const angle =
                (i / 7) * Math.PI * 2;

            context.save();

            context.translate(
                cx + Math.cos(angle) * 38,
                cy + Math.sin(angle) * 38
            );

            context.rotate(angle);

            // 花びら1枚分のグラデーション（中心は白っぽく、外側は透明に抜ける）
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

        // 花の中心（花芯）部分を副色で描く
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

    /**
     * min以上max以下（両端含む）のランダムな整数を返す簡易ユーティリティ。
     */
    randomInt(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }
}
