import { combineText, getPhraseProgress } from './LyricUtils.js';

export class MikuMotionController {
    constructor(worldRenderer) {
        this.worldRenderer = worldRenderer;

        this.runTriggered = false;
        this.walkBackTriggered = false;
        this.walkToStopTriggered = false;

        this.collapsePrepTriggered = false;
        this.collapseTriggered = false;
    }

    update(context) {
        this.handleRunTrigger(context);
        this.handleWalkBackTrigger(context);
        this.handleWalkToStopTrigger(context);
        this.handleCollapsePrepTrigger(context);
        this.handleCollapseTrigger(context);
    }

    handleRunTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.runTriggered) return;

        const combinedText =
            combineText(
                normalizedPhrase,
                normalizedWord
            );

        const isRunPhrase =
            combinedText.includes('溢れ出した旋律に乗ったオンガクだ') ||
            combinedText.includes('旋律に乗ったオンガクだ') ||
            combinedText.includes('オンガクだ');

        if (!isRunPhrase) {
            return;
        }

        const phraseProgress =
            getPhraseProgress(
                position,
                phrase
            );

        const isDaTiming =
            normalizedWord === 'だ' ||
            normalizedWord.includes('オンガクだ') ||
            phraseProgress >= 0.88;

        if (!isDaTiming) {
            return;
        }

        this.runTriggered = true;

        console.log('[MikuMotion] Trigger: Run at "だ"');

        this.worldRenderer?.setMikuMoveMode?.('run');
    }

    handleWalkBackTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.walkBackTriggered) return;
        if (!this.runTriggered) return;

        const isTargetPhrase =
            normalizedPhrase.includes('ナミダはどんなカタチをしてるの') ||
            normalizedPhrase.includes('涙には決まった形はないよ') ||
            normalizedPhrase.includes('ナミダはどんなカタチ') ||
            normalizedPhrase.includes('涙には');

        if (!isTargetPhrase) {
            return;
        }

        const phraseProgress =
            getPhraseProgress(
                position,
                phrase
            );

        const isNamidaTiming =
            normalizedWord.includes('ナミダ') ||
            normalizedWord.includes('涙');

        const isPhraseStartTiming =
            phraseProgress >= 0.0;

        if (
            !isNamidaTiming &&
            !isPhraseStartTiming
        ) {
            return;
        }

        this.walkBackTriggered = true;

        console.log(
            '[MikuMotion] Trigger: Walk Back at ナミダ phrase',
            {
                normalizedPhrase,
                normalizedWord,
                phraseProgress
            }
        );

        this.worldRenderer?.setMikuMoveMode?.('walk');
    }

    handleWalkToStopTrigger({
        normalizedPhrase
    }) {
        if (this.walkToStopTriggered) return;

        // 「あなたはどんなカタチ」では止めない。
        if (
            normalizedPhrase.includes('あなたはどんなカタチ')
        ) {
            return;
        }

        // 今回の崩壊前停止は collapsePrep に統一する。
    }

    /**
     * 「あなたはもう」で StopB。
     */
    handleCollapsePrepTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.collapsePrepTriggered) return;

        const isTargetPhrase =
            normalizedPhrase.includes('あなたはもう何も言わなかった') ||
            normalizedPhrase.includes('もう何も言わなかった') ||
            normalizedPhrase.includes('何も言わなかった');

        if (!isTargetPhrase) {
            return;
        }

        const phraseProgress =
            getPhraseProgress(
                position,
                phrase
            );

        const isAnataMouTiming =
            normalizedWord.includes('あなた') ||
            normalizedWord.includes('もう') ||
            phraseProgress >= 0.06;

        if (!isAnataMouTiming) {
            return;
        }

        this.collapsePrepTriggered = true;

        console.log(
            '[MikuMotion] Trigger: Collapse Prep at あなたはもう',
            {
                normalizedPhrase,
                normalizedWord,
                phraseProgress
            }
        );

        this.worldRenderer?.setMikuMoveMode?.('collapsePrep');
    }

    /**
     * 「言わなかった」で崩れ落ちる。
     */
    handleCollapseTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.collapseTriggered) return;

        const isTargetPhrase =
            normalizedPhrase.includes('あなたはもう何も言わなかった') ||
            normalizedPhrase.includes('もう何も言わなかった') ||
            normalizedPhrase.includes('何も言わなかった');

        if (!isTargetPhrase) {
            return;
        }

        const phraseProgress =
            getPhraseProgress(
                position,
                phrase
            );

        const isIwanakattaTiming =
            normalizedWord.includes('言わなかった') ||
            normalizedWord.includes('言わ') ||
            normalizedWord.includes('なかった');

        const isPhraseEndFallback =
            phraseProgress >= 0.94;

        if (
            !isIwanakattaTiming &&
            !isPhraseEndFallback
        ) {
            return;
        }

        // 「言わ」を早く拾った場合に備えて、
        // フレーズの後半までは絶対に崩れない。
        if (phraseProgress < 0.78) {
            return;
        }

        this.collapseTriggered = true;

        console.log(
            '[MikuMotion] Trigger: Collapse Now at 言わなかった',
            {
                normalizedPhrase,
                normalizedWord,
                phraseProgress
            }
        );

        this.worldRenderer?.setMikuMoveMode?.('collapseNow');
    }
}