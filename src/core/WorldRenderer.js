import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// ===== 各種マネージャ（Three.jsシーン内の役割ごとの管理クラス） =====
import { SpawnManager } from '../managers/SpawnManager.js';
import { PlacementManager } from '../managers/PlacementManager.js';
import { CharacterManager } from '../managers/CharacterManager.js';
import { CameraController } from '../managers/CameraController.js';
import { ProceduralTerrainManager } from '../managers/ProceduralTerrainManager.js';
import { BlueNoteManager } from '../managers/BlueNoteManager.js';

// ===== 物語後半（終盤）の演出シーケンスを担当するディレクター =====
import { LateActSequenceDirector } from '../experience/LateActSequenceDirector.js';

// ===== このフォルダ内の補助マネージャ =====
import { EnvironmentManager } from './EnvironmentManager.js';
import { LyricsManager } from './LyricsManager.js';
import { EffectManager } from './EffectManager.js';
import { InteractionEventManager } from './InteractionEventManager.js';

// ===== 個別エフェクト（視覚効果）クラス =====
import { NoteTrailEffect } from '../effects/NoteTrailEffect.js';
import { WorldResonanceEffect } from '../effects/WorldResonanceEffect.js';
import { EndingNoteAscendEffect } from '../effects/EndingNoteAscendEffect.js';
import { ProceduralMountainFlowerField } from '../effects/ProceduralMountainFlowerField.js';
import { PlacedFlowerLightPropagationEffect } from '../effects/PlacedFlowerLightPropagationEffect.js';
import { EndingWorldResponseEffect } from '../effects/EndingWorldResponseEffect.js';
import { MountainFlowerPointService } from '../terrain/MountainFlowerPointService.js';

/**
 * ======================================================
 * WorldRenderer
 *
 * ✅ このクラスの役割
 * - Three.jsシーン全体の統合管理
 * - マネージャ・エフェクト・演出のハブ
 * - フレーム更新ループの中核
 *
 * ✅ やっていること
 * - Scene / Camera / Renderer 生成
 * - 各Manager初期化
 * - 演出トリガー管理
 * - 入力処理
 * - updateループ制御
 *
 * ✅ 設計思想
 * - 責務はManagerに分離
 * - WorldRendererは「オーケストレーター」
 *   （自分では細かい処理をせず、各Managerに指示を出す司令塔）
 * ======================================================
 */

export class WorldRenderer {
    constructor() {
        // --------------------------------------------------
        // 1. Three.js の基本3要素（Scene / Camera / Renderer）
        // --------------------------------------------------

        // シーン本体。背景色は深い藍色に近い黒。
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05070a);

        // 透視投影カメラ（FOV=50度, near=0.5, far=5000）
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.5,
            5000
        );


        // WebGLレンダラー本体。アンチエイリアス有効。
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            logarithmicDepthBuffer: false
        })


        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        // レンダラーの<canvas>をページに追加して画面に表示する
        document.body.appendChild(this.renderer.domElement);

        // --------------------------------------------------
        // 2. ライティング（光源）
        // --------------------------------------------------

        // 平行光源（太陽光のような、方向を持つ光）
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

        // 環境光（全体を均一に明るくする光、影を作らない）
        const ambientLight =
            new THREE.AmbientLight(
                0xffffff,
                0.65
            );

        this.scene.add(ambientLight);

        // --------------------------------------------------
        // 3. 各種マネージャの初期化
        // （それぞれが特定の役割に責任を持つ）
        // --------------------------------------------------

        // オブジェクトの出現・管理を担当
        this.spawnManager =
            new SpawnManager(this.scene);

        // 複数のエフェクトをまとめて更新するための管理クラス
        this.effectManager =
            new EffectManager();

        // 主人公キャラクター（ミク）の状態・アニメーションを管理
        this.characterManager =
            new CharacterManager(this.scene);

        // カメラの動き（追従・演出時のカメラワーク）を管理
        this.controls =
            new CameraController(
                this.camera,
                this.characterManager
            );

        // ユーザーがオブジェクト（花など）をワールドに設置する処理を管理
        this.placementManager =
            new PlacementManager(
                this.scene,
                this.camera,
                this.renderer,
                this.spawnManager
            );

        // 歌詞をワールド内に表示する処理を管理
        this.lyricsManager =
            new LyricsManager(
                this.scene,
                this.spawnManager
            );

        // 空の色や環境演出（フェーズに応じた見た目変化）を管理
        this.environment =
            new EnvironmentManager(this.scene);

        // 「青い音符」オブジェクト群の生成・移動・演出を管理
        this.blueNoteManager =
            new BlueNoteManager(
                this.scene,
                this.spawnManager
            );

        // --------------------------------------------------
        // 4. 視覚エフェクト群の初期化
        // （EffectManagerに登録すると、毎フレーム自動でupdateされる）
        // --------------------------------------------------

        // 音符が軌跡を残しながら飛ぶエフェクト
        this.noteTrailEffect =
            new NoteTrailEffect(this.scene);

        // ワールド全体が音楽に反応して脈動するようなエフェクト
        this.worldResonanceEffect =
            new WorldResonanceEffect(this.scene);

        // エンディング時、音符が空に上昇していくエフェクト
        this.endingNoteAscendEffect =
            new EndingNoteAscendEffect(
                this.scene,
                this.spawnManager
            );

        // エンディング時、配置済みオブジェクト（花など）がワールドに反応するエフェクト
        this.endingWorldResponseEffect =
    new EndingWorldResponseEffect(
        this.scene,
        this.spawnManager
    );

this.effectManager.addEffect(
    this.endingWorldResponseEffect
);


        // 山に咲くプロシージャル（自動生成）な花畑エフェクト
        this.proceduralMountainFlowerField =
            new ProceduralMountainFlowerField(
                this.scene
            );


// 花畑エフェクトに現在のカメラを渡しておく（カメラ依存の描画調整のため）
this.proceduralMountainFlowerField.setCamera(
    this.camera
);

    // 山の表面に咲く花の「配置座標」を計算するサービス（実際の描画は別エフェクトが担当）
    this.mountainFlowerPointService =
    new MountainFlowerPointService({
        defaultCount: 360
    });

        // ユーザーが設置した花から光が伝播していくエフェクト
        this.placedFlowerLightPropagationEffect =
            new PlacedFlowerLightPropagationEffect();

        // ↓ ここから、毎フレーム自動更新してほしいエフェクトをEffectManagerへ登録していく
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

        // --------------------------------------------------
        // 5. 入力・演出ディレクターの初期化
        // --------------------------------------------------

        // クリックなどのユーザー操作イベントを受け取って処理するマネージャ
        this.interactionEventManager =
            new InteractionEventManager(this);

        // 物語後半（終盤）の専用演出シーケンスを進行させるディレクター
        this.lateActSequenceDirector =
            new LateActSequenceDirector(this);

        // ミクが「崩れ落ちる」アニメーションが終わったタイミングで、
        // 終盤の鳥の演出シーケンスを開始する
        this.characterManager.setOnCollapseFinished(() => {
            this.startLateActBirdSequence();
        });

        // --------------------------------------------------
        // 6. その他のユーティリティ・状態変数
        // --------------------------------------------------

        // GLB（3Dモデル）読み込み用のローダー
        this.loader =
            new GLTFLoader();

        // フレーム間の経過時間（delta）計測用クロック
        this.clock =
            new THREE.Clock();

        // クリック判定用レイキャスター（ミククリック検出に使用）
        this.mikuClickRaycaster =
            new THREE.Raycaster();

        // クリック判定用レイキャスター（青い音符クリック検出に使用）
        this.blueNoteClickRaycaster =
            new THREE.Raycaster();

        // TextAlive（音楽同期ライブラリ）のプレイヤーインスタンス。setPlayer()で後から設定される。
        this.textAlivePlayer = null;

        // 地形・地面オブジェクトの配列（当たり判定や花の配置に利用）
        this.landObjects = [];

        // --- 状態フラグ群 ---
        this.isPlacementEnabled = false;     // ユーザーがオブジェクトを設置できるか
        this.isInteractionLocked = false;    // クリックなどの入力操作を無効化するか
        this.isLateActCinematicActive = false; // 終盤のカメラ自動演出中かどうか

        // 地形管理クラス（procedural terrain）。loadModels()内で実際に生成される。
        this.terrainManager = null;

        // 現在の「空・環境演出フェーズ」と、その変化速度（補間スピード）
        this.currentPhase = 'intro';
        this.environmentLerpSpeed = 0.025;

        // 各種「一度だけ実行したい演出」が既に発火したかどうかのフラグ
        this.hasBlueKanaTriggered = false;
        this.hasBlueNoteTriggered = false;
        this.hasRebirthBlueNotesTriggered = false;

        // 同様に、二重実行を防ぐためのフラグ群
        this.isMelodyMountainBloomRunning = false;
        this.isLateWalkStopLoopPlaying = false;
        this.isFinalMusicReachPlaying = false;

        // 環境演出マネージャの初期化処理を実行
        this.environment.init();

// エンディング全体シーケンスが再生中かどうかのフラグ
this.isFinalEndingSequencePlaying = false;

// エンディングシーケンス内で発行したsetTimeoutのIDを保持する配列
// （途中で演出を中断したい場合に、まとめてclearTimeoutできるようにするため）
this.finalEndingTimeouts = [];

// エンディング内の各サブ演出が「すでに開始したか」を示すフラグ
this.hasFinalEndingSkyAscendStarted = false;
this.hasEndingTurnBPlayed = false;

        // ウィンドウサイズが変わったらカメラ・レンダラーを再調整する
        window.addEventListener('resize', () => {
            this.onResize();
        });
    }

    /**
     * TextAlive（音楽同期）プレイヤーのインスタンスを外部から登録する。
     */
    setPlayer(playerInstance) {
        this.textAlivePlayer =
            playerInstance;
    }

    /**
     * 現在の音楽再生時間（秒）を取得する。
     * musicManagerが未設定の場合は0を返す（安全に呼べるようにオプショナルチェイニング使用）。
     */
    getCurrentTime() {
    return this.musicManager?.getCurrentTime?.() ?? 0;
}

    /**
     * ミク（主人公キャラクター）の本体情報を取得するショートカット。
     */
    get miku() {
        return this.characterManager.getMiku();
    }

    /**
     * ユーザーによるオブジェクト設置の有効・無効を切り替える。
     */
    setPlacementEnabled(enabled) {
        this.isPlacementEnabled =
            !!enabled;

        console.log(
            `[WorldRenderer] Placement ${this.isPlacementEnabled ? 'enabled' : 'disabled'}`
        );
    }

    /**
     * クリックなどのユーザー入力操作を一時的にロック（無効化）する。
     * 演出中など、ユーザー操作を受け付けたくないタイミングで使用。
     */
    setInteractionLocked(locked) {
        this.isInteractionLocked =
            !!locked;

        console.log(
            `[WorldRenderer] Interaction ${this.isInteractionLocked ? 'locked' : 'unlocked'}`
        );
    }

    /**
     * 終盤、ミクが崩れ落ちた直後に開始する「鳥」演出シーケンスのトリガー。
     * 入力をロックし、設置機能を止めてからディレクターに処理を委ねる。
     */
    startLateActBirdSequence() {
        this.isInteractionLocked = true;

        // カメラは今まで通り動かせる。
        this.isLateActCinematicActive = false;

        this.setPlacementEnabled(false);

        this.lateActSequenceDirector?.startFromCollapse?.();
    }

    /**
     * 鳥をミクの元へ戻し、通常状態へ復帰させる演出を開始する。
     */
    returnBirdToMikuAndResume() {
        if (
            this.lateActSequenceDirector &&
            typeof this.lateActSequenceDirector.beginReturnToMiku === 'function'
        ) {
            this.lateActSequenceDirector.beginReturnToMiku();
        }
    }

    /**
     * 指定された名前のリストに従って、3Dモデル（.glb）を非同期で順番に読み込む。
     * モデル名ごとに「ミクのどのアニメーションか」「地形か」「鳥か」などを判定し、
     * 各マネージャへ適切に登録していく。
     */
    async loadModels(list) {
        for (const name of list) {
            try {
                // "lake2" という名前だけは特別扱い：
                // 実モデルを読み込まず、プロシージャル（自動生成）地形を作る
                if (name.toLowerCase() === 'lake2') {
                    this.createProceduralTerrain();
                    continue;
                }

                // 通常モデルの読み込み（GLTFLoaderをPromiseでラップして待機）
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

                // ↓ モデル名に応じて振り分け：
                // ミク本体・各アニメーションクリップはCharacterManagerへ登録
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
                    // 鳥モデルはSpawnManagerに登録した上で、
                    // 終盤演出ディレクターにも参照を渡しておく
                    this.spawnManager.registerAndProcessModel(
                        name,
                        model
                    );

                    this.lateActSequenceDirector?.registerBirdGLTF?.(
                        gltf
                    );
                } else {
                    // その他のモデル（設置可能な装飾物など）はSpawnManagerへ登録
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

/**
 * エンディング演出用に発行されたsetTimeoutを全てクリアし、
 * 関連する「開始済みフラグ」もリセットする。
 * エンディングを最初から再生し直したい場合などに使用。
 */
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

/**
 * 空・環境演出の「フェーズ」を切り替える。
 * @param {string} phaseName - 新しいフェーズ名（EnvironmentManagerが解釈する）
 * @param {number} lerpSpeed - フェーズ変化の補間速度（大きいほど速く切り替わる）
 */
setSkyPhase(phaseName, lerpSpeed = 0.04) {
    this.currentPhase = phaseName;
    this.environmentLerpSpeed = lerpSpeed;

    console.log(
        `[WorldRenderer] Sky phase: ${phaseName}`
    );
}

/**
 * 一瞬だけ画面を「悲しい青色」にフラッシュさせる演出。
 * 多重発火を防ぎつつ、指定時間後に元のフェーズへ自動的に復帰する。
 * @param {number} duration - フラッシュの持続時間（ミリ秒）
 */
triggerSadBlueFlash(duration = 850) {
    if (this._sadBlueFlashActive) {
        return;
    }

    this._sadBlueFlashActive = true;

    // 復帰先として、フラッシュ前のフェーズと速度を保存しておく
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
        // フラッシュ終了後、元のフェーズ・速度に戻す
        this.currentPhase = previousPhase;
        this.environmentLerpSpeed = previousSpeed;

        this._sadBlueFlashActive = false;

        console.log(
            '[WorldRenderer] Sad blue flash ended.'
        );
    }, duration);
}

/**
 * 楽曲終盤のフレーズをきっかけに、エンディング全体の演出シーケンスを開始する。
 * 複数のサブ演出（空への音符上昇 → カメラ戻り → ワールド発見 → 俯瞰カメラ等）を
 * setTimeoutで時間差発火させ、最終的に「タイトル表示＋フェードアウト」へつながる。
 * （タイトル表示とフェードアウトの開始は showEndingTitle() 側に委ねている）
 */
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

    // 約8秒後：カメラをミクの背後・地平線方向へ戻す
    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.startEndingCameraReturn?.();
        }, 8000)
    );

    // 約13秒後：カメラがワールド（設置物など）を発見するように動く
    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.startEndingWorldDiscovery?.();
        }, 13000)
    );

    // 約21秒後：俯瞰カメラ演出と、ワールドが反応するエフェクトを同時に開始
    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.startEndingOverviewCamera?.();
            this.startEndingWorldResponse?.();
        }, 21000)
    );

    // 約45秒後：シーケンス全体の「実行中フラグ」をオフに戻す
    this.finalEndingTimeouts.push(
        setTimeout(() => {
            this.isFinalEndingSequencePlaying = false;
        }, 45000)
    );
}



    /**
     * 現在存在する全ての「青い音符」の中心座標（重心）を計算して返す。
     * 音符が1つも無い場合はnullを返す。
     */
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

/**
 * エンディングでカメラが見つめる「地平線方向」の目標座標を計算する。
 * ミクの位置から少し奥（z軸方向に-90）かつ低い高さを見るように設定。
 */
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

/**
 * エンディングでカメラが見つめる「ワールド（足元の世界）」側の目標座標を計算する。
 * 地平線ターゲットよりも近く・低い位置を見るように設定。
 */
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

/**
 * エンディング演出の最初のステップ：音符を空へ上昇させる。
 * 入力をロックし、ミクの動作モードを「手を挙げる」に切り替え、
 * 音符を6個まで増やしてから上昇アニメーションを開始する。
 * カメラも音符の重心を追いながら、天を見上げるように動く。
 */
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

    // 音符の数を6個まで増やす
    this.blueNoteManager?.expandToCount?.(
        6,
        mikuModel
    );

    // 全ての音符を上昇させるアニメーションを開始
    this.blueNoteManager?.ascendAllNotes?.({
        duration: 3.0,
        target: mikuModel
    });

    // カメラを音符の重心に追従させつつ、天を向くように動かす
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
    /**
     * "lake2" モデルの代わりに、コードで自動生成する地形（道・水面・山など）を構築する。
     * ProceduralTerrainManager に各種パラメータ（幅・高さ・色・透明度・フェード距離等）を渡し、
     * 生成された地形オブジェクト群を landObjects に保存する。
     */
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

    /**
     * 画面上でのクリック/タップなどの操作イベントを受け取り、
     * 優先順位を付けながら各処理に振り分ける入口（エントリーポイント）。
     *
     * 優先順位:
     *   1. 終盤演出ディレクターが消費するか
     *   2. 青い音符のクリックか
     *   3. 入力ロック中なら以降を処理しない
     *   4. ミクのクリック（ターン演出）か
     *   5. それ以外は通常のInteractionEventManagerに委ねる
     *
     * @returns {boolean} イベントが何らかの処理によって「消費」されたかどうか
     */
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

    /**
     * クリック座標から青い音符オブジェクトへレイを飛ばし、
     * ヒットしていれば音符を「ジャンプ」させる。
     * @returns {boolean} 音符をクリックしていたかどうか
     */
    tryHandleBlueNoteClick(event) {
        if (!event) {
            return false;
        }

        // カメラ操作（ドラッグ）中のクリックは誤クリックとして無視する
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

        // クリック座標(ピクセル)を、Three.jsの正規化デバイス座標(-1〜1)に変換
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

    /**
     * ユーザーがアイテム（花など）をワールドに設置しようとした際の処理。
     * 入力ロック中、または設置機能が無効な場合は何もしない。
     * @param {Event} event - クリック/タップイベント
     * @param {string} id - 設置するアイテムのID
     */
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

    /**
     * 現在表示されている青い音符を全て消去（または停止）する。
     */
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

    /**
     * 間奏（インタールード）に入る際、画面に浮かぶ歌詞表示を非表示にする。
     */
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

    /**
     * 設置済みの「植物系」オブジェクト（花・草・葉など）の位置を、
     * 毎フレーム正しい場所に固定し続けるための処理。
     *
     * 表面アンカー（山の斜面に沿わせる仕組み）が有効なオブジェクトは
     * SurfaceAnchorControllerに位置を更新させ、
     * それ以外は最初に記録した固定位置（anchorPosition）に戻す。
     *
     * これにより、地形更新やミクの移動に関わらず、
     * 設置した花が地形に貼り付いたまま動かないようにしている。
     */
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

        // 名前やフラグから「これは植物系オブジェクトか」を判定する
        const isPlant =
            id.startsWith('flower') ||
            id.startsWith('Grass') ||
            id === 'Leaf' ||
            object.userData?.isFlower === true ||
            object.userData?.windReactive === true;

        if (!isPlant) {
            return;
        }

        // 一時的な「演出用の花」（ephemeral）は対象外
        if (
            object.userData?.isEphemeralBloomObject === true ||
            String(object.name || '').includes('ephemeral')
        ) {
            return;
        }

        let anchored = false;

        // 表面アンカー機能が有効なら、地形の起伏に合わせて位置を更新する
        if (
            object.userData?.useSurfaceAnchor === true &&
            anchorController
        ) {
            anchored =
                anchorController.updateObject(
                    object
                );
        }

        // アンカー更新がされなかった場合は、最初に記録した固定座標に戻す
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

        // この花はワールド座標に固定され、ミクに追従しないことを明示するフラグ
        object.userData.isWorldFixed = true;
        object.userData.followMiku = false;

        // 配置済み植物のマテリアル（見た目）が崩れていないか復元する
        this.spawnManager?.restorePlacedPlantCyberMaterial?.(
            object
        );
    });
}

/**
 * ======================================================
 * メインの毎フレーム更新処理。
 * requestAnimationFrameのループから毎フレーム呼び出されることを想定。
 *
 * 処理の流れ（順序が重要）:
 *   1. deltaTime（前フレームからの経過時間）を取得
 *   2. キャラクター（ミク）を更新
 *   3. 地形を更新 → その後に花の位置を地形に追従させる
 *      （地形の更新が先でないと、花の座標がズレるため順序が重要）
 *   4. カメラを更新
 *   5. 環境（空の色など）を更新
 *   6. 音符・出現オブジェクト・隕石などのエフェクトを更新
 *   7. 入力イベント・各種エフェクト・終盤演出ディレクターを更新
 *   8. 歌詞表示を更新
 *   9. 実際の描画（render）を実行
 *  10. 設置済み植物のマテリアルを最終的に安定化
 * ======================================================
 */
update(player = null, beat = 0) {
    let delta =
        this.clock.getDelta();

    // deltaが異常値（タブが非アクティブだった等）の場合は、
    // 固定値（60fps相当の約0.016秒）にフォールバックして暴走を防ぐ
    if (delta > 0.1 || delta <= 0) {
        delta = 0.016;
    }

    // 外部からplayerが渡されたが、まだ内部に保存されていない場合は保存する
    if (player && !this.textAlivePlayer) {
        this.textAlivePlayer = player;
    }

    // --- 1. キャラクター（ミク）の更新 ---
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
    // --- 2. 地形の更新（ミクの位置に応じてチャンクを生成/破棄など） ---
    if (
        this.terrainManager &&
        typeof this.terrainManager.update === 'function'
    ) {
        this.terrainManager.update(
            mikuPosition
        );
    }

    // --- 3. 地形更新後に、設置済みの花の位置を追従・固定する ---
    this.updateFlowerFollow(
        mikuPosition,
        delta
    );

    let cameraResult = false;

    // --- 4. カメラの更新（終盤の自動演出カメラが動いている間は通常更新をスキップ） ---
    if (!this.isLateActCinematicActive) {
        cameraResult =
            this.controls.update(
                delta
            );
    }

    // カメラが「最終的な空の位置」に到達したら、一度だけ隕石群の演出を開始する
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

    // --- 5. 環境（空の色・霧など）の更新 ---
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

    // --- 6. 各種オブジェクト・エフェクトの更新 ---

    // 青い音符の更新（位置・アニメーション・ビートに応じた反応など）
    this.blueNoteManager.update(
        delta,
        this.miku?.model,
        beat
    );

    // 出現済みオブジェクト群の更新
    this.spawnManager.update(
        delta,
        beat
    );

    // 隕石（メテオシャワー）エフェクトの更新
    this.updateMeteor?.(
        delta
    );

    // ユーザー入力イベントに関連する継続処理の更新
    if (
        this.interactionEventManager &&
        typeof this.interactionEventManager.update === 'function'
    ) {
        this.interactionEventManager.update(
            delta
        );
    }

    // EffectManagerに登録された全エフェクトを一括更新
    if (
        this.effectManager &&
        typeof this.effectManager.update === 'function'
    ) {
        this.effectManager.update(
            this.environment,
            delta
        );
    }

    // 終盤演出ディレクターの内部状態を更新
    if (
        this.lateActSequenceDirector &&
        typeof this.lateActSequenceDirector.update === 'function'
    ) {
        this.lateActSequenceDirector.update(
            delta
        );
    }

    // --- 7. 歌詞表示の更新（現在の再生位置に応じて歌詞を出し入れ） ---
    const currentPosition =
        this.textAlivePlayer?.timer?.position || 0;

    this.lyricsManager.update(
        this.camera,
        currentPosition
    );

    // --- 8. 実際の描画を実行 ---
    this.renderer.render(
        this.scene,
        this.camera
    );

    // 出現済みオブジェクトの更新（描画後にもう一度呼ばれている：既存実装のまま維持）
    this.spawnManager.update(
    delta,
    beat
);

// --- 9. 設置済み植物のマテリアル状態を最終的に安定化させる ---
this.stabilizePlacedPlantMaterials();
}

    /**
     * ウィンドウサイズ変更時に、カメラのアスペクト比とレンダラーの描画サイズを再調整する。
     */
    onResize() {
        this.camera.aspect =
            window.innerWidth / window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }


/**
 * ミクの移動・アニメーションモードを切り替える。
 * 一部の特殊モード（崩れ落ち・停止・ターンなど）は、
 * 通常の遷移ルールを無視して強制的に切り替える必要があるため、
 * forceSetMoveMode を使って即時反映する。
 */
setMikuMoveMode(mode) {
    if (
        !this.characterManager ||
        typeof this.characterManager.setMoveMode !== 'function'
    ) {
        return;
    }

    // 強制的にモードを切り替えるべき特殊モード一覧
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

    /**
     * 「青い言葉」演出のトリガー。環境フェーズを切り替え、
     * 背景色を青系に変更し、地平線の青みを強調する。
     */
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

    /**
     * 青い音符だけを単独で出現させる（一度だけ実行される）。
     */
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

    /**
     * 「カナ消失」演出のトリガー。フェーズを序盤（intro）に戻し、
     * 背景色を暗い色に変える。
     */
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

    /**
     * 「データスモッグ（霧のような視覚効果）」演出のトリガー。
     * フェーズを切り替え、環境マネージャに霧をクリアさせる。
     */
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

    /**
     * ミクが消える（溶けるように消える）間奏演出の準備処理。
     * 設置・入力を無効化し、青い音符と浮遊歌詞をクリアする。
     * 地形と設置済みオブジェクトはそのまま残す。
     */
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


    /**
     * 指定したワールド座標(x, z)の真上から下方向にレイを飛ばし、
     * 地形オブジェクトと衝突した高さ（地表のY座標）を返す。
     * 地形が無い場合はフォールバック値を返す。
     */
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

    /**
     * 渡されたオブジェクト（メッシュ等）が「山の表面」に属するものかどうかを判定する。
     * オブジェクト自身〜親階層の名前・surfaceType・マテリアル名を辿り、
     * "mountain" 等のキーワードが含まれているかをチェックする。
     */
    isMountainSurfaceObject(object) {
        if (!object) {
            return false;
        }

        const names = [];

        let current = object;

        // 親階層をすべて遡りながら、名前・surfaceType・マテリアル名を収集する
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

        // 収集した名前の中に「山」を示すキーワードが含まれているかをチェック
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

    /**
     * landObjects全体を走査し、isMountainSurfaceObject()がtrueになる
     * メッシュ（山の表面に該当するもの）だけを集めて配列で返す。
     */
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

    /**
     * 指定したワールド座標(x, z)の真上から、山の表面オブジェクトのみを対象に
     * レイキャストを行い、衝突した座標（Vector3）を返す。
     * 山に当たらなかった場合はnullを返す。
     */
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

/**
 * 左右の山オブジェクトを対象に、MountainFlowerPointServiceを使って
 * 「山の斜面に固定された花」の配置バッチ（グループ）を生成する。
 * @param {number} count - 生成したい花の総数（目安）
 * @returns {Array} バッチ（anchor情報＋座標群）の配列
 */
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

/**
 * createAnchoredMountainFlowerBatches() で得たバッチを、
 * それぞれのアンカー（親オブジェクト）のローカル座標からワールド座標へ変換し、
 * 1つの配列（全花のワールド座標）として返す。
 */
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

/**
 * 設置済みの植物オブジェクト（花・草・葉）のマテリアル（見た目）を、
 * 崩れていないか確認しながら復元・安定化させる。
 * updateFlowerFollow() とは別に、毎フレーム終盤でも呼ばれている安全策。
 */
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

/**
 * 「メロディーが山に花を咲かせる」演出を開始する。
 * 山の表面に固定された花のバッチを生成し、
 * ProceduralMountainFlowerField に渡して描画＋光の伝播アニメーションを開始する。
 * @param {Object} options.count - 花の数
 * @param {Object} options.pointSize - 花（点）の見た目サイズ
 * @param {Object} options.opacity - 花の不透明度
 */
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

    /**
     * ユーザーが設置した花（placementManager経由）を対象に、
     * z座標（奥行き）順に並べ替えてから、光が順番に伝わっていく演出を開始する。
     * 設置された花が無い場合は何もしない。
     */
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

/**
 * ミクの声に反応するように音符を6個まで増やし、
 * その音符たちを起点として軌跡エフェクト（NoteTrailEffect）を開始する。
 * ミクが存在しない場合は処理をスキップする。
 */
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

/**
 * エンディングのタイトル・クレジット表示用オーバーレイをDOM上に生成し、
 * フェードインさせる。一度だけ表示され、表示後一定時間でフェードアウト演出（startFadeOut）を
 * 自動的に呼び出す。
 */
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

    /**
     * クリック座標からレイを飛ばし、ミク本体にヒットしていれば
     * 「クリックで振り向く」アニメーションを再生する。
     * ミクのターン演出を再生できる状態でなければ何もしない。
     * @returns {boolean} ミクをクリックしていたかどうか
     */
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

    /**
     * 指定したオブジェクトが、ミクのモデル(root)自身か、
     * その子要素（親をルートまで遡って一致するか）であるかを判定する。
     */
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

    /**
     * プリロード（読み込み準備）開始時の処理。
     * この間は浮遊歌詞の表示を無効化しておく。
     */
    startPreload() {
    console.log('loading...');

    this.lyricsManager?.setEnabled?.(
        false
    );
}

/**
 * 音楽再生が開始したタイミングの処理。
 * 再生直後はtimer.positionが0のままになっている可能性があるため、
 * 少し（100ms）待ってから歌詞表示を有効化する。
 */
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

    /**
     * ミク出現時に呼ばれるログ用フック（現状はログ出力のみ）。
     */
    spawnMiku() {
        console.log('miku spawn');
    }

/**
 * エンディング演出用の「流れ星（隕石）」群を生成する。
 * すでに発生中なら何もしない。
 * 各隕石は円柱(Cylinder)ジオメトリで表現され、
 * ランダムな初期位置・速度・寿命を持って斜め下方向に飛んでいく。
 */
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

        // 隕石1本の見た目：先端が細く、根本が太い円柱（流れ星のような形）
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

        // 画面の遠方上空にランダムな位置で出現させる
        meteor.position.set(
            (Math.random() - 0.5) * 150,
            36 + Math.random() * 58,
            -45 - Math.random() * 120
        );

        // 左下方向へ流れる速度ベクトル（ランダムな揺らぎあり）
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

        // 円柱の向きを「速度ベクトルの方向」に合わせて回転させる
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


/**
 * 隕石群を毎フレーム更新する処理。
 * 各隕石を速度に従って移動させ、寿命に応じて透明度をフェードアウトさせる。
 * 寿命が尽きた隕石はジオメトリ/マテリアルを破棄してグループから削除し、
 * 全ての隕石が消えたらグループ自体もシーンから削除する。
 */
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

        // 寿命に対する経過割合（0〜1）を計算
        const lifeRate =
            THREE.MathUtils.clamp(
                meteor.userData.life /
                    meteor.userData.maxLife,
                0,
                1
            );

        if (meteor.material) {
            // 寿命が尽きるにつれて徐々に透明にする
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

    // 寿命が尽きた隕石をメモリリークしないよう破棄してから削除する
    removeTargets.forEach(meteor => {
        meteor.geometry?.dispose?.();
        meteor.material?.dispose?.();

        this.meteorGroup.remove(
            meteor
        );
    });

    // 全ての隕石が消えたら、グループごとシーンから取り除く
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

/**
 * 「再生（リバース）」演出の一部：
 * 画面上の歌詞をミクの位置に向かって引き寄せる（収束させる）アニメーションを
 * LyricsManagerに依頼する。
 */
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

/**
 * 引き寄せられた歌詞が収束した場所から、ミクを再び出現（リビール）させる演出。
 * 歌詞の収束アニメーションを強制完了させてからクリアし、
 * ミクをワールド原点付近（x=0, y=0）に出現させ、入力・設置を再度有効化する。
 */
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

/**
 * 終盤の「行進（マーチ）」演出：ミクは走り続けたまま、
 * 音符をミクの周りを回る「軌道（オービット）モード」へ切り替える。
 */
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



    /**
     * 終盤の歌詞に合わせて「走る → 立ち止まる」を繰り返すループ演出。
     * 多重起動防止フラグ付きで、一連の動作をsetTimeoutで時間差再生する。
     */
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

/**
 * エンディング演出のステップ：カメラをミクの背後・地平線方向へ戻す。
 * 同時にフェーズを「夜明け（dawn）」に切り替え、
 * 少し遅れてミクの動作を「歩いて停止」に変える。
 */
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

/**
 * エンディング終盤：ミクがカメラの方を向く「Hart」モーションへの切り替え。
 * 一度だけ再生されるよう、フラグでガードしている。
 * （TurnBモーションは使わず、自然な回転後にHartへ繋ぐ仕様）
 */
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


/**
 * エンディング演出のステップ：カメラがワールド（足元の景色）を発見するように移動する。
 * 移動の途中（約6.2秒後）に、ミクがカメラを向く演出（playEndingMikuTurnB）を発火させる。
 */
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

/**
 * エンディング演出のステップ：これまでに設置されたオブジェクト（花など）が
 * ワールドに反応するエフェクトと、設置済み花の光伝播エフェクトを同時に開始する。
 */
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

/**
 * エンディング演出のステップ：カメラを完全に静止させる演出。
 */
startEndingStill() {
    this.controls?.startEndingStill?.({
        duration: 4.0
    });

    console.log(
        '[WorldRenderer] Ending still started.'
    );
}

    /**
     * カメラをミクの背後に戻し、エンディングに向けて固定する。
     * 入力・設置を無効化し、カメラ入力もロックする。
     */
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

/**
 * エンディング演出のステップ：カメラを少し引いた俯瞰視点に切り替える演出。
 */
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

/**
 * 画面全体を朝焼け色のグラデーションで覆い、徐々に画面をホワイトアウト（暖色フェード）させる。
 * 既に存在するオーバーレイ要素があれば再利用する。
 */
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

    /**
     * ミクをその場で完全に停止させる。
     */
    stopMikuAtCurrentPlace() {
        this.setMikuMoveMode?.('stop');

        console.log(
            '[WorldRenderer] Miku stopped at this place.'
        );
    }

    /**
     * ミクを「未来を見据える（考える）」ポーズに切り替え、
     * 同時に環境フェーズを夜明け（dawn）へ穏やかに移行させる。
     */
    playMikuFuturePose() {
        this.setMikuMoveMode?.('think');

        this.currentPhase = 'dawn';
        this.environmentLerpSpeed = 0.08;

        console.log(
            '[WorldRenderer] Miku future pose. Dawn begins softly.'
        );
    }

/**
 * 楽曲のクライマックス（「手を伸ばす」演出）を再生する。
 * ミクが振り向く(turn) → 一定時間後に手を伸ばす(reach)モーションへ切替 →
 * 音符を空へ上昇させる → カメラを少し遅れて音符に追従させる、という
 * 時間差の連携演出。エンディング全体シーケンスの実行中は呼ばれないようガードしている。
 */
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

    /**
     * 「再生（リバース/リバース誕生）」演出用の青い音符を出現させる。
     * 通常の音符演出とは異なるオプション（数2個・ミクの後方追従・強制再起動）で開始する。
     */
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

    /**
     * 終盤の「データスモッグ到達」シーケンス。
     * 現状はミクを走らせ続けるだけで、追加の演出は行わない（簡略化された実装）。
     */
    playLateDataSmogReachSequence() {
        this.setMikuMoveMode?.('run');

        console.log(
            '[WorldRenderer] Late data smog sequence skipped. Miku keeps running.'
        );
    }

    /**
     * ミクの現在位置を起点に、エンディング用の音符上昇エフェクトを開始する。
     */
    triggerEndingNoteAscend() {
        const pos =
            this.characterManager.getMikuPosition();

        this.endingNoteAscendEffect.start(
            pos
        );
    }
}
