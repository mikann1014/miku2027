import { combineText } from './LyricUtils.js';

export class InteractionMotionController {
    constructor(worldRenderer, ui) {
        this.worldRenderer = worldRenderer;
        this.ui = ui;

        this.walkToStopATriggered = false;
        this.handTriggered = false;
        this.hartTriggered = false;

        this.placementUnlocked = false;
        this.walkRestartTriggered = false;

        // currentWord が取れない環境向けの保険。
        // 基本は currentWord 優先。
        this.fallbackProgress = {
            walkToStopA: 0.62,

            // 「手を伸ばしてみたり」は修正前のタイミングに戻す。
            // currentWord が取れる場合は「手を」付近で発火する。
            hand: 0.20,

            hart: 0.08
        };

        // currentWord が取れている場合の微調整。
        this.wordProgressThreshold = {
            walkToStopA: 0.35,

            // 「手」単体で来た場合の保険。
            hand: 0.02
        };
    }

    update(context) {
        if (!context) {
            return;
        }

        this.handleWalkToStopATrigger(context);
        this.handleHandTrigger(context);
        this.handleHartTrigger(context);
        this.handlePlacementUnlockTrigger(context);
        this.handleWalkRestartTrigger(context);
    }

    isCurrentWordTarget(normalizedWord, candidates) {
        if (!normalizedWord) {
            return false;
        }

        return candidates.some(candidate => {
            return normalizedWord.includes(candidate);
        });
    }

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

    handleWalkToStopATrigger({
        normalizedPhrase
    }) {
        // 今回の仕様では、データスモッグの隙間からでは止めない。
        //
        // 1回目：
        // 少しだけデータスモッグの隙間から
        //
        // 2回目：
        // 増えてゆくデータスモッグの隙間から
        //
        // どちらもここでは walkToStopA を出さない。
        // 2回目も「走ったまま」でよい。
        if (this.walkToStopATriggered) {
            return;
        }

        if (!this.isDataSmogGapPhrase(normalizedPhrase)) {
            return;
        }

        console.log(
            '[InteractionMotion] WalkToStopA skipped at data smog gap.',
            {
                normalizedPhrase
            }
        );
    }

    handleHandTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.handTriggered) {
            return;
        }

        const isTargetPhrase =
            normalizedPhrase.includes('手を伸ばしてみたり') ||
            normalizedPhrase.includes('手を伸ばして') ||
            normalizedPhrase.includes('手を伸ばす');

        if (!isTargetPhrase) {
            return;
        }

        const phraseProgress =
            this.getPhraseProgress(
                position,
                phrase
            );

        // 修正前のタイミングに戻す。
        // 「手を」で伸ばし出す。
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

        // TextAlive側で「手」と「を」が分かれる場合の保険。
        const isSplitTeTiming =
            normalizedWord === '手' &&
            phraseProgress >= this.wordProgressThreshold.hand;

        // currentWord が取れない場合だけの保険。
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

        console.log(
            '[InteractionMotion] Trigger: Hand at 手を',
            {
                normalizedPhrase,
                normalizedWord,
                phraseProgress
            }
        );

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode(
                'hand'
            );
        }
    }

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
            this.getPhraseProgress(
                position,
                phrase
            );

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

        console.log(
            '[InteractionMotion] Trigger: Hart at あなたを思ってみたり',
            {
                normalizedPhrase,
                normalizedWord,
                phraseProgress
            }
        );

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode(
                'hart'
            );
        }
    }

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

        console.log('[InteractionMotion] Trigger: Placement Unlock');

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

        console.log('[InteractionMotion] Trigger: Walk Restart');

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode('walk');
        }
    }
}