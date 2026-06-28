import { combineText, getPhraseProgress } from './LyricUtils.js';

/**
 * MikuMotionController
 *
 * ・歌詞タイミングに応じてミクのモーションを制御
 *
 * 主な流れ：
 *   walk → run → walk → collapsePrep → collapseNow
 *
 * 役割：
 * ・楽曲のストーリー進行をモーションとして表現
 */
export class MikuMotionController {

    constructor(worldRenderer) {

        this.worldRenderer = worldRenderer;

        // --- 状態フラグ（多重発火防止） ---
        this.runTriggered = false;
        this.walkBackTriggered = false;
        this.walkToStopTriggered = false;

        this.collapsePrepTriggered = false;
        this.collapseTriggered = false;
    }


    /**
     * 毎フレーム更新
     */
    update(context) {

        this.handleRunTrigger(context);
        this.handleWalkBackTrigger(context);
        this.handleWalkToStopTrigger(context);
        this.handleCollapsePrepTrigger(context);
        this.handleCollapseTrigger(context);
    }


    /**
     * =========================
     * 走り出す（Run）
     * 「オンガクだ」
     * =========================
     */
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
            getPhraseProgress(position, phrase);

        /**
         * 「だ」で走り出す
         */
        const isDaTiming =
            normalizedWord === 'だ' ||
            normalizedWord.includes('オンガクだ') ||
            phraseProgress >= 0.88;

        if (!isDaTiming) {
            return;
        }

        this.runTriggered = true;

        this.worldRenderer?.setMikuMoveMode?.('run');
    }


    /**
     * =========================
     * 歩きに戻る（Walk）
     * ナミダ系フレーズ
     * =========================
     */
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
            getPhraseProgress(position, phrase);

        const isNamidaTiming =
            normalizedWord.includes('ナミダ') ||
            normalizedWord.includes('涙');

        /**
         * フレーズ開始でもOK（確実に戻す）
         */
        const isPhraseStartTiming =
            phraseProgress >= 0.0;

        if (
            !isNamidaTiming &&
            !isPhraseStartTiming
        ) {
            return;
        }

        this.walkBackTriggered = true;

        this.worldRenderer?.setMikuMoveMode?.('walk');
    }


    /**
     * =========================
     * 停止（今回は未使用）
     * =========================
     */
    handleWalkToStopTrigger({
        normalizedPhrase
    }) {

        if (this.walkToStopTriggered) return;

        // 「あなたはどんなカタチ」では止めない
        if (
            normalizedPhrase.includes('あなたはどんなカタチ')
        ) {
            return;
        }

        // 停止は collapsePrep に統一
    }


    /**
     * =========================
     * 崩壊準備（StopB）
     * 「あなたはもう」
     * =========================
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
            getPhraseProgress(position, phrase);

        /**
         * 「あなた」または「もう」で停止開始
         */
        const isAnataMouTiming =
            normalizedWord.includes('あなた') ||
            normalizedWord.includes('もう') ||
            phraseProgress >= 0.06;

        if (!isAnataMouTiming) {
            return;
        }

        this.collapsePrepTriggered = true;

        this.worldRenderer?.setMikuMoveMode?.('collapsePrep');
    }


    /**
     * =========================
     * 崩壊（Collapse）
     * 「言わなかった」
     * =========================
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
            getPhraseProgress(position, phrase);

        const isIwanakattaTiming =
            normalizedWord.includes('言わなかった') ||
            normalizedWord.includes('言わ') ||
            normalizedWord.includes('なかった');

        /**
         * フレーズ終端 fallback
         */
        const isPhraseEndFallback =
            phraseProgress >= 0.94;

        if (
            !isIwanakattaTiming &&
            !isPhraseEndFallback
        ) {
            return;
        }

        /**
         * 早発火防止（ここ重要）
         */
        if (phraseProgress < 0.78) {
            return;
        }

        this.collapseTriggered = true;

        this.worldRenderer?.setMikuMoveMode?.('collapseNow');
    }
}