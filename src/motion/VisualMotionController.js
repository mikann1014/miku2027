/**
 * VisualMotionController
 *
 * ・歌詞の進行に応： * ・歌詞の進行に応じたビジュアル演出（エフェクト）を制御する
 * ・「青、かな」シーケンス（青→かな消失）
 * ・データスモッグ（霧演出）
 * ・ヒカリ（青い音符）出現演出
 *
 * 役割：
 * 歌詞の内容とタイミングに応じて、
 * 見た目の演出（Renderer側トリガー）を制御する
 */

import { combineText, getPhraseProgress } from './LyricUtils.js';

export class VisualMotionController {
    constructor(worldRenderer) {
        /**
         * 初期化
         *
         * ・Rendererへの参照を保持
         * ・各演出のトリガー済み状態を管理
         */

        this.worldRenderer = worldRenderer;

        // 「青」発火済み
        this.blueWordTriggered = false;

        // 「かな」消失発火済み
        this.kanaVanishTriggered = false;

        // スモッグ発火済み
        this.violinSmogTriggered = false;

        // ヒカリ（青い音符）発火済み
        this.hikariNoteTriggered = false;
    }

    update(context) {
        /**
         * フレーム更新処理
         *
         * 処理内容：
         * ・各演出ハンドラを順に実行
         *
         * context:
         * ・position       : 再生時間
         * ・phrase         : 現在フレーズ
         * ・normalizedText : 正規化済み歌詞
         */

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
        /**
         * 「青、かな」演出
         *
         * シーケンス：
         * ・「青」で発光演出
         * ・「かな」で文字消失
         *
         * 判定：
         * ・フレーズに「青かな」が含まれるか
         * ・単語 or 進行度でタイミングを判断
         */

        const combinedText = combineText(
            normalizedPhrase,
            normalizedWord
        );

        // 対象フレーズ判定
        const isBlueKanaPhrase =
            combinedText.includes('青、かな') ||
            combinedText.includes('青かな');

        if (!isBlueKanaPhrase) {
            return;
        }

        // フレーズ進行度（0〜1）
        const phraseProgress = getPhraseProgress(
            position,
            phrase
        );

        // =========================
        // 「青」タイミング
        // =========================
        const isBlueTiming =
            normalizedWord.includes('青') ||
            phraseProgress >= 0.05;

        if (
            !this.blueWordTriggered &&
            isBlueTiming
        ) {
            this.blueWordTriggered = true;

            console.log('[VisualMotion] Trigger: Blue word');

            // Renderer側へ通知
            if (
                this.worldRenderer &&
                typeof this.worldRenderer.triggerBlueWord === 'function'
            ) {
                this.worldRenderer.triggerBlueWord();
            }
        }

        // =========================
        // 「かな」タイミング
        // =========================
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

            // Renderer側へ通知
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
        /**
         * データスモッグ演出
         *
         * 条件：
         * ・特定フレーズ出現で一度だけ発火
         *
         * 対象：
         * ・機械 / 奇怪ステップ / データスモッグ関連歌詞
         */

        // 既に発火済みなら処理しない
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

        // Rendererへ通知
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
        /**
         * ヒカリ（青い音符）演出
         *
         * 条件：
         * ・「私はヒカリの中で歌った」付近で発火
         *
         * タイミング：
         * ・単語一致 または フレーズ進行度で判定
         */

        // 既に発火済みならスキップ
        if (this.hikariNoteTriggered) return;

        const combinedText = combineText(
            normalizedPhrase,
            normalizedWord
        );

        // 対象フレーズ判定
        const isTargetPhrase =
            combinedText.includes('私はヒカリの中で歌った') ||
            combinedText.includes('ヒカリの中で歌った') ||
            combinedText.includes('ヒカリ');

        if (!isTargetPhrase) return;

        // フレーズ進行度
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

        // Rendererへ通知
        if (
            this.worldRenderer &&
            typeof this.worldRenderer.triggerBlueNoteOnly === 'function'
        ) {
            this.worldRenderer.triggerBlueNoteOnly();
        }
    }
}
