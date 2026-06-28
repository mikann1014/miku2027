import { combineText, getPhraseProgress } from './LyricUtils.js';

export class VisualMotionController {
    constructor(worldRenderer) {
        this.worldRenderer = worldRenderer;

        this.blueWordTriggered = false;
        this.kanaVanishTriggered = false;
        this.violinSmogTriggered = false;

        // tone / 青い音符の出現は
        // 「私はヒカリの中で歌った」で発火させる。
        this.hikariNoteTriggered = false;
    }

    update(context) {
        this.handleBlueKanaSequence(context);
        this.handleViolinSmogTrigger(context);
        this.handleHikariNoteTrigger(context);
    }

    handleBlueKanaSequence({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        const combinedText = combineText(
            normalizedPhrase,
            normalizedWord
        );

        const isBlueKanaPhrase =
            combinedText.includes('青、かな') ||
            combinedText.includes('青かな');

        if (!isBlueKanaPhrase) {
            return;
        }

        const phraseProgress = getPhraseProgress(
            position,
            phrase
        );

        const isBlueTiming =
            normalizedWord.includes('青') ||
            phraseProgress >= 0.05;

        if (
            !this.blueWordTriggered &&
            isBlueTiming
        ) {
            this.blueWordTriggered = true;

            console.log('[VisualMotion] Trigger: Blue word');

            if (
                this.worldRenderer &&
                typeof this.worldRenderer.triggerBlueWord === 'function'
            ) {
                this.worldRenderer.triggerBlueWord();
            }
        }

        const isKanaTiming =
            normalizedWord.includes('かな') ||
            normalizedWord.includes('な') ||
            phraseProgress >= 0.55;

        if (
            !this.kanaVanishTriggered &&
            isKanaTiming
        ) {
            this.kanaVanishTriggered = true;

            console.log('[VisualMotion] Trigger: Kana vanish');

            if (
                this.worldRenderer &&
                typeof this.worldRenderer.triggerKanaVanish === 'function'
            ) {
                this.worldRenderer.triggerKanaVanish();
            }
        }
    }

    handleViolinSmogTrigger({
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.violinSmogTriggered) return;

        const combinedText = combineText(
            normalizedPhrase,
            normalizedWord
        );

        const shouldStartSmog =
            combinedText.includes('私は機械の上で踊った') ||
            combinedText.includes('正しく奇怪なステップで舞った') ||
            combinedText.includes('データスモッグ');

        if (!shouldStartSmog) return;

        this.violinSmogTriggered = true;

        console.log('[VisualMotion] Trigger: Data Smog');

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.triggerDataSmog === 'function'
        ) {
            this.worldRenderer.triggerDataSmog();
        }
    }

    handleHikariNoteTrigger({
        position,
        phrase,
        normalizedPhrase,
        normalizedWord
    }) {
        if (this.hikariNoteTriggered) return;

        const combinedText = combineText(
            normalizedPhrase,
            normalizedWord
        );

        const isTargetPhrase =
            combinedText.includes('私はヒカリの中で歌った') ||
            combinedText.includes('ヒカリの中で歌った') ||
            combinedText.includes('ヒカリ');

        if (!isTargetPhrase) return;

        const phraseProgress = getPhraseProgress(
            position,
            phrase
        );

        const isHikariTiming =
            normalizedWord.includes('ヒカリ') ||
            normalizedWord.includes('光') ||
            phraseProgress >= 0.05;

        if (!isHikariTiming) return;

        this.hikariNoteTriggered = true;

        console.log('[VisualMotion] Trigger: Blue note at 私はヒカリの中で歌った');

        if (
            this.worldRenderer &&
            typeof this.worldRenderer.triggerBlueNoteOnly === 'function'
        ) {
            this.worldRenderer.triggerBlueNoteOnly();
        }
    }
}
``