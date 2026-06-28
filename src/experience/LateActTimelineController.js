export class LateActTimelineController {
    constructor(world) {
        this.world = world;

        this.currentStep = 0;
        this.steps = [];

        this.elapsed = 0;
    }

    start() {
        this.currentStep = 0;
        this.elapsed = 0;

        this.steps = this.buildSteps();

        console.log('[LateActTimelineController] Started.');
    }

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

        {
            time: 3,
            action: () => {
                this.world.currentPhase = 'lastChorus';
            }
        },

        {
            time: 6,
            action: () => {
                this.world.triggerDataSmog();
            }
        },

        {
            time: 10,
            action: () => {
                this.world.currentPhase = 'dawn';
            }
        },

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
        // 30〜36秒
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
        // 36〜41秒
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
        // 41〜49秒
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
        // 49〜57秒
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
        // 57〜61秒
        // =========================
        {
            time: 57,
            action: () => {
                this.world.startEndingStill?.();
            }
        },

        // =========================
        // フェーズ⑦
        // 光に溶けるフェード
        // 61〜65秒
        // =========================
        {
            time: 61,
            action: () => {
                this.world.startFadeOut?.();
            }
        }
    ];
}


    update(delta) {
        this.elapsed += delta;

        while (
            this.currentStep < this.steps.length &&
            this.elapsed >= this.steps[this.currentStep].time
        ) {
            this.steps[this.currentStep].action();
            this.currentStep++;
        }
    }

    clear() {
        this.currentStep = 0;
        this.elapsed = 0;
        this.steps = [];
    }
}