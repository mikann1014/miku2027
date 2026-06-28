/**
 * LateActTimelineController
 *
 * ・LateAct後半の時間ベースイベント制御
 * ・指定時刻（time）に action を順番に実行
 *
 * 特徴：
 * - シンプルなタイムライン方式
 * - フレーム更新で経過時間を進める
 * - 指定時間に達したら順次イベント発火
 */
export class LateActTimelineController {

    constructor(world) {

        this.world = world;

        // 現在のステップ
        this.currentStep = 0;

        // タイムライン配列
        this.steps = [];

        // 経過時間
        this.elapsed = 0;
    }


    /**
     * タイムライン開始
     */
    start() {

        this.currentStep = 0;
        this.elapsed = 0;

        this.steps = this.buildSteps();

        console.log('[LateActTimelineController] Started.');
    }


    /**
     * タイムライン定義
     */
    buildSteps() {

        return [

            // =========================
            // プレイヤー復帰
            // =========================
            {
                time: 0,
                action: () => {
                    this.world.setInteractionLocked(false);
                    this.world.setPlacementEnabled(true);
                    this.world.setMikuMoveMode('walk');
                }
            },

            // ラストコーラス
            {
                time: 3,
                action: () => {
                    this.world.currentPhase = 'lastChorus';
                }
            },

            // データスモッグ
            {
                time: 6,
                action: () => {
                    this.world.triggerDataSmog();
                }
            },

            // 夜明けへ移行
            {
                time: 10,
                action: () => {
                    this.world.currentPhase = 'dawn';
                }
            },

            // 共鳴フェーズ
            {
                time: 16,
                action: () => {

                    const noteSources =
                        this.world.blueNoteManager?.getInteractiveObjects?.() || [];

                    this.world.noteTrailEffect?.start?.(
                        noteSources
                    );

                    const allPlaced =
                        this.world.placementManager?.getPlacedObjects?.() || [];

                    this.world.worldResonanceEffect?.start?.(
                        allPlaced
                    );
                }
            },

            // =========================
            // 静寂へ
            // =========================
            {
                time: 22,
                action: () => {
                    this.world.environment?.enterSilence?.();
                }
            },

            // =========================
            // フェーズ① + ②
            // 音符上昇 + 空の静寂
            // =========================
            {
                time: 30,
                action: () => {
                    this.world.startFinalEndingSkyAscend?.();
                }
            },

            // =========================
            // フェーズ③
            // 視線が戻る
            // =========================
            {
                time: 36,
                action: () => {
                    this.world.startEndingCameraReturn?.();
                }
            },

            // =========================
            // フェーズ④
            // 世界の再発見
            // =========================
            {
                time: 41,
                action: () => {
                    this.world.startEndingWorldDiscovery?.();
                }
            },

            // =========================
            // フェーズ⑤
            // 世界の応答と広がり
            // =========================
            {
                time: 49,
                action: () => {
                    this.world.startEndingOverviewCamera?.();
                    this.world.startEndingWorldResponse?.();
                }
            },

            // =========================
            // フェーズ⑥
            // 完全静止
            // =========================
            {
                time: 57,
                action: () => {
                    this.world.startEndingStill?.();
                }
            },

            // =========================
            // フェーズ⑦
            // フェードアウト
            // =========================
            {
                time: 61,
                action: () => {
                    this.world.startFadeOut?.();
                }
            }
        ];
    }


    /**
     * フレーム更新
     */
    update(delta) {

        this.elapsed += delta;

        // 現在時間に到達したステップを順次実行
        while (
            this.currentStep < this.steps.length &&
            this.elapsed >= this.steps[this.currentStep].time
        ) {

            this.steps[this.currentStep].action();
            this.currentStep++;
        }
    }


    /**
     * リセット
     */
    clear() {
        this.currentStep = 0;
        this.elapsed = 0;
        this.steps = [];
    }
}