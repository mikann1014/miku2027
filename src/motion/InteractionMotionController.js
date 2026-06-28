import { combineText } from './LyricUtils.js';

/**
 * InteractionMotionController
 *
 * ・歌詞（TextAlive）の進行に応じてモーションを発火する
 *
 * 役割：
 * - 歌詞（phrase / word）を解析
 * - 特定フレーズでモーション切替
 * - UIや配置の解禁制御
 *
 * フロー：
 * update()
 *   ↓
 * 各トリガ関数
 */
export class InteractionMotionController {

    constructor(worldRenderer, ui) {

        this.worldRenderer = worldRenderer;
        this.ui = ui;

        // --- 状態フラグ（多重発火防止） ---
        this.walkToStopATriggered = false;
        this.handTriggered = false;
        this.hartTriggered = false;

        this.placementUnlocked = false;
        this.walkRestartTriggered = false;

        /**
         * currentWordが使えない場合のフォールバック
         */
        this.fallbackProgress = {
            walkToStopA: 0.62,

            // 手の動作（旧タイミング）
            hand: 0.20,

            hart: 0.08
        };

        /**
         * wordベース判定の微調整
         */
        this.wordProgressThreshold = {
            walkToStopA: 0.35,

            // 「手」が分割されたケース
            hand: 0.02
        };
    }


    /**
     * 毎フレーム更新
     */
    update(context) {

        if (!context) return;

        this.handleWalkToStopATrigger(context);
        this.handleHandTrigger(context);
        this.handleHartTrigger(context);
        this.handlePlacementUnlockTrigger(context);
        this.handleWalkRestartTrigger(context);
    }


    /**
     * 単語一致チェック
     */
    isCurrentWordTarget(normalizedWord, candidates) {

        if (!normalizedWord) {
            return false;
        }

        return candidates.some(candidate => {
            return normalizedWord.includes(candidate);
        });
    }


    /**
     * フレーズ進行率
     */
    getPhraseProgress(position, phrase) {

        const startTime = phrase?.startTime;
        const endTime = phrase?.endTime;

        if (
            typeof startTime !== 'number' ||
            typeof endTime !== 'number' ||
            endTime <= startTime
        ) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                (position - startTime) / (endTime - startTime),
                1
            )
        );
    }


    /**
     * 汎用時間付きオブジェクト進行率
     */
    getTimedObjectProgress(position, timedObject) {

        const startTime = timedObject?.startTime;
        const endTime = timedObject?.endTime;

        if (
            typeof startTime !== 'number' ||
            typeof endTime !== 'number' ||
            endTime <= startTime
        ) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                (position - startTime) / (endTime - startTime),
                1
            )
        );
    }


    /**
     * ハート対象フレーズ判定
     */
    isHartTargetPhrase(normalizedPhrase) {

        if (!normalizedPhrase) {
            return false;
        }

        return (
            normalizedPhrase.includes('あなたを思ってみたり') ||
            normalizedPhrase.includes('あなたを思って') ||
            normalizedPhrase.includes('思ってみたり')
        );
    }


    /**
     * データスモッグ対象
     */
    isDataSmogGapPhrase(normalizedPhrase) {

        if (!normalizedPhrase) {
            return false;
        }

        return (
            normalizedPhrase.includes('少しだけデータスモッグの隙間から') ||
            normalizedPhrase.includes('増えてゆくデータスモッグの隙間から') ||
            normalizedPhrase.includes('データスモッグの隙間から') ||
            normalizedPhrase.includes('隙間から')
        );
    }


    /**
     * WalkToStopA（今回は無効）
     */
    handleWalkToStopATrigger({
        normalizedPhrase
    }) {

        // データスモッグでは止めない仕様
        if (this.walkToStopATriggered) {
            return;
        }

        if (!this.isDataSmogGapPhrase(normalizedPhrase)) {
            return;
        }

        // あえて何もせずログのみ
        console.log(
            '[InteractionMotion] WalkToStopA skipped at data smog gap.',
            {
                normalizedPhrase
            }
        );
    }


    /**
     * 手を伸ばす
     */
    handleHandTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {

        if (this.handTriggered) {
            return;
        }

        // 対象判定
        const isTargetPhrase =
            normalizedPhrase.includes('手を伸ばしてみたり') ||
            normalizedPhrase.includes('手を伸ばして') ||
            normalizedPhrase.includes('手を伸ばす');

        if (!isTargetPhrase) {
            return;
        }

        const phraseProgress =
            this.getPhraseProgress(position, phrase);

        /**
         * 「手を」で発火（最優先）
         */
        const isTeWoTiming =
            this.isCurrentWordTarget(
                normalizedWord,
                [
                    '手を',
                    '手を伸ばしてみたり',
                    '手を伸ばして',
                    '手を伸ばす'
                ]
            );

        /**
         * 「手」と「を」が分かれる場合
         */
        const isSplitTeTiming =
            normalizedWord === '手' &&
            phraseProgress >= this.wordProgressThreshold.hand;

        /**
         * fallback
         */
        const isFallbackTiming =
            !normalizedWord &&
            phraseProgress >= this.fallbackProgress.hand;

        const shouldPlayHand =
            isTeWoTiming ||
            isSplitTeTiming ||
            isFallbackTiming;

        if (!shouldPlayHand) {
            return;
        }

        this.handTriggered = true;

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode('hand');
        }
    }


    /**
     * ハート
     */
    handleHartTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {

        if (this.hartTriggered) {
            return;
        }

        const isTargetPhrase =
            this.isHartTargetPhrase(normalizedPhrase);

        if (!isTargetPhrase) {
            return;
        }

        const isExactWordTiming =
            this.isCurrentWordTarget(
                normalizedWord,
                [
                    'あなたを',
                    'あなた'
                ]
            );

        const phraseProgress =
            this.getPhraseProgress(position, phrase);

        const isFallbackTiming =
            !normalizedWord &&
            phraseProgress >= this.fallbackProgress.hart;

        const shouldPlayHart =
            isExactWordTiming ||
            isFallbackTiming;

        if (!shouldPlayHart) {
            return;
        }

        this.hartTriggered = true;

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode('hart');
        }
    }


    /**
     * 配置解禁
     */
    handlePlacementUnlockTrigger({
        normalizedPhrase,
        normalizedWord
    }) {

        if (this.placementUnlocked) {
            return;
        }

        const combinedText =
            combineText(
                normalizedPhrase,
                normalizedWord
            );

        const shouldUnlockPlacement =
            this.isHartTargetPhrase(normalizedPhrase) ||
            combinedText.includes('小さなマーチ');

        if (!shouldUnlockPlacement) {
            return;
        }

        this.placementUnlocked = true;

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setPlacementEnabled === 'function'
        ) {
            this.worldRenderer.setPlacementEnabled(true);
        }

        if (
            this.ui &&
            typeof this.ui.showItemMenu === 'function'
        ) {
            this.ui.showItemMenu();
        }
    }


    /**
     * Walk再開
     */
    handleWalkRestartTrigger({
        normalizedPhrase,
        normalizedWord
    }) {

        if (this.walkRestartTriggered) {
            return;
        }

        const word =
            normalizedWord || '';

        const phraseText =
            normalizedPhrase || '';

        const shouldWalk =
            word.includes('小さな') ||
            word.includes('マーチ') ||
            phraseText.includes('小さなマーチ');

        if (!shouldWalk) {
            return;
        }

        this.walkRestartTriggered = true;

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode('walk');
        }
    }
}