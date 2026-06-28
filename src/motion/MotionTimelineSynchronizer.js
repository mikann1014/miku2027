import {
    normalizeLyricText,
    getPhraseProgress
} from './LyricUtils.js';

/**
 * MotionTimelineSynchronizer
 *
 * ・再生 / Visual を統合 * ・再生位置（position）から「状態スナップショット」を復元する
 * - 最終的に worldRenderer に適用
 *
 * 特徴：
 * 即時状態再構築
 * 完全な再現性
 */

export class MotionTimelineSynchronizer {
    constructor(worldRenderer, ui) {
        this.worldRenderer = worldRenderer;
        this.ui = ui;

        this.interactionProgress = {
            // 「隙間から」で立ち止まる復元位置。
            // シーク復元時は phraseProgress でしか見られないので少し後ろ寄せ。
            walkToStopA: 0.62,

            // 「手を伸ばしてみたり」で手を伸ばす
            hand: 0.05,

            // 「あなたを思ってみたり」で胸に手
            hart: 0.08
        };

        this.collapseProgress = {
            // 「あなたはもう何も言わなかった」フレーズ内で立ち止まる準備
            prep: 0.08,

            // 「言わなかった」付近で崩れ落ちる
            // 早ければ 0.82 / 0.86 に上げる
            now: 0.78
        };
    }

    sync({
        position,
        progress,
        player,
        currentWord = null
    }) {
        if (!player || !player.video) {
            const snapshot = this.createDefaultSnapshot();

            this.applySnapshot(snapshot);

            return snapshot;
        }

        const phrases = this.collectPhrasesUntil(
            player.video,
            position
        );

        const snapshot = this.resolveSnapshot(
            phrases,
            position
        );

        snapshot.phase = this.resolvePhaseByProgress(
            progress
        );

        this.applySnapshot(snapshot);

        return snapshot;
    }

    createDefaultSnapshot() {
        return {
            moveMode: 'walk',

            runTriggered: false,
            walkBackTriggered: false,
            walkToStopTriggered: false,

            collapsePrepTriggered: false,
            collapseTriggered: false,

            walkToStopATriggered: false,
            handTriggered: false,
            hartTriggered: false,

            reachTriggered: false,
            thinkTriggered: false,
            placementUnlocked: false,
            walkRestartTriggered: false,

            blueWordTriggered: false,
            kanaVanishTriggered: false,
            violinSmogTriggered: false,
            hikariNoteTriggered: false,

            phase: 'intro'
        };
    }

    collectPhrasesUntil(video, position) {
        const phrases = [];

        if (!video) {
            return phrases;
        }

        if (video.firstPhrase) {
            let phrase = video.firstPhrase;
            let guard = 0;

            while (phrase && guard < 10000) {
                guard++;

                const startTime =
                    typeof phrase.startTime === 'number'
                        ? phrase.startTime
                        : 0;

                if (startTime > position) {
                    break;
                }

                phrases.push(phrase);

                phrase = phrase.next;
            }

            return phrases;
        }

        return this.collectPhrasesBySampling(
            video,
            position
        );
    }

    collectPhrasesBySampling(video, position) {
        const phrases = [];
        const seen = new Set();

        const step = 500;

        for (let time = 0; time <= position; time += step) {
            let phrase = null;

            try {
                phrase = video.findPhrase(time);
            } catch {
                phrase = null;
            }

            if (!phrase || !phrase.text) {
                continue;
            }

            const key = this.createPhraseKey(phrase);

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            phrases.push(phrase);
        }

        let currentPhrase = null;

        try {
            currentPhrase = video.findPhrase(position);
        } catch {
            currentPhrase = null;
        }

        if (currentPhrase && currentPhrase.text) {
            const key = this.createPhraseKey(currentPhrase);

            if (!seen.has(key)) {
                seen.add(key);
                phrases.push(currentPhrase);
            }
        }

        phrases.sort((a, b) => {
            const aStart = a.startTime ?? 0;
            const bStart = b.startTime ?? 0;

            return aStart - bStart;
        });

        return phrases;
    }

    createPhraseKey(phrase) {
        return [
            phrase.text || '',
            phrase.startTime ?? '',
            phrase.endTime ?? ''
        ].join('|');
    }

    resolveSnapshot(phrases, position) {
        const snapshot = this.createDefaultSnapshot();

        phrases.forEach(phrase => {
            this.applyPhraseToSnapshot(
                snapshot,
                phrase,
                position
            );
        });

        return snapshot;
    }

    applyPhraseToSnapshot(snapshot, phrase, position) {
        if (!phrase || !phrase.text) {
            return;
        }

        const normalizedPhrase =
            normalizeLyricText(phrase.text);

        const phraseProgress =
            getPhraseProgress(
                position,
                phrase
            );

        const phraseEnded =
            typeof phrase.endTime === 'number' &&
            position >= phrase.endTime;

        const effectiveProgress =
            phraseEnded
                ? 1
                : phraseProgress;

        this.applyVisualSnapshot(
            snapshot,
            normalizedPhrase,
            effectiveProgress
        );

        this.applyInteractionSnapshot(
            snapshot,
            normalizedPhrase,
            effectiveProgress
        );

        this.applyMikuMotionSnapshot(
            snapshot,
            normalizedPhrase,
            effectiveProgress
        );
    }

    applyVisualSnapshot(
        snapshot,
        normalizedPhrase,
        phraseProgress
    ) {
        const isBlueKanaPhrase =
            normalizedPhrase.includes('青、かな') ||
            normalizedPhrase.includes('青かな');

        if (isBlueKanaPhrase) {
            if (phraseProgress >= 0.05) {
                snapshot.blueWordTriggered = true;
            }

            if (phraseProgress >= 0.55) {
                snapshot.kanaVanishTriggered = true;
            }
        }

        const shouldStartSmog =
            normalizedPhrase.includes('私は機械の上で踊った') ||
            normalizedPhrase.includes('正しく奇怪なステップで舞った') ||
            normalizedPhrase.includes('データスモッグ');

        if (
            shouldStartSmog &&
            phraseProgress > 0
        ) {
            snapshot.violinSmogTriggered = true;
        }

        const shouldStartBlueNote =
            normalizedPhrase.includes('私はヒカリの中で歌った') ||
            normalizedPhrase.includes('ヒカリの中で歌った') ||
            normalizedPhrase.includes('ヒカリ');

        if (
            shouldStartBlueNote &&
            phraseProgress >= 0.05
        ) {
            snapshot.hikariNoteTriggered = true;
        }
    }

    isHartTargetPhrase(normalizedPhrase) {
        if (!normalizedPhrase) return false;

        return (
            normalizedPhrase.includes('あなたを思ってみたり') ||
            normalizedPhrase.includes('あなたを思って') ||
            normalizedPhrase.includes('思ってみたり')
        );
    }

    applyInteractionSnapshot(
        snapshot,
        normalizedPhrase,
        phraseProgress
    ) {
        const shouldPlayWalkToStopA =
            normalizedPhrase.includes('少しだけデータスモッグの隙間から') ||
            normalizedPhrase.includes('データスモッグの隙間から') ||
            normalizedPhrase.includes('隙間から');

        if (
            shouldPlayWalkToStopA &&
            phraseProgress >= this.interactionProgress.walkToStopA
        ) {
            snapshot.walkToStopATriggered = true;
            snapshot.moveMode = 'walkToStopA';
        }

        const shouldPlayHand =
            normalizedPhrase.includes('手を伸ばしてみたり') ||
            normalizedPhrase.includes('手を伸ばして') ||
            normalizedPhrase.includes('手を伸ばす');

        if (
            shouldPlayHand &&
            phraseProgress >= this.interactionProgress.hand
        ) {
            snapshot.handTriggered = true;
            snapshot.moveMode = 'hand';
        }

        const isHartPhrase =
            this.isHartTargetPhrase(normalizedPhrase);

        if (
            isHartPhrase &&
            phraseProgress >= this.interactionProgress.hart
        ) {
            snapshot.hartTriggered = true;
            snapshot.thinkTriggered = true;
            snapshot.placementUnlocked = true;
            snapshot.moveMode = 'hart';
        }

        const shouldUnlockPlacement =
            this.isHartTargetPhrase(normalizedPhrase) ||
            normalizedPhrase.includes('小さなマーチ');

        if (
            shouldUnlockPlacement &&
            phraseProgress > 0
        ) {
            snapshot.placementUnlocked = true;
        }

        const shouldWalk =
            normalizedPhrase.includes('小さなマーチ');

        if (
            shouldWalk &&
            phraseProgress > 0
        ) {
            snapshot.walkRestartTriggered = true;
            snapshot.moveMode = 'walk';
        }
    }

    applyMikuMotionSnapshot(
        snapshot,
        normalizedPhrase,
        phraseProgress
    ) {
        const isRunPhrase =
            normalizedPhrase.includes('溢れ出した旋律に乗ったオンガクだ') ||
            normalizedPhrase.includes('旋律に乗ったオンガクだ') ||
            normalizedPhrase.includes('オンガクだ');

        if (
            isRunPhrase &&
            phraseProgress >= 0.88
        ) {
            snapshot.runTriggered = true;
            snapshot.moveMode = 'run';
        }

        const isWalkBackPhrase =
            normalizedPhrase.includes('ナミダはどんなカタチをしてるの') ||
            normalizedPhrase.includes('涙には決まった形はないよ') ||
            normalizedPhrase.includes('ナミダはどんなカタチ') ||
            normalizedPhrase.includes('涙には');

        // 「ナミダ」フレーズに入ったらシーク復元時もすぐ walk に戻す。
        if (
            isWalkBackPhrase &&
            phraseProgress >= 0.0
        ) {
            snapshot.walkBackTriggered = true;
            snapshot.moveMode = 'walk';
        }

        const isWalkToStopPhrase =
            normalizedPhrase.includes('ねえ') ||
            normalizedPhrase.includes('あなたはどんなカタチをしてるの') ||
            normalizedPhrase.includes('あなたはどんなカタチ');

        if (
            isWalkToStopPhrase &&
            phraseProgress >= 0.2
        ) {
            snapshot.walkToStopTriggered = true;
            snapshot.moveMode = 'stop';
        }

        const isCollapsePhrase =
            normalizedPhrase.includes('あなたはもう何も言わなかった') ||
            normalizedPhrase.includes('もう何も言わなかった') ||
            normalizedPhrase.includes('何も言わなかった');

        if (!isCollapsePhrase) {
            return;
        }

        // 崩れ落ちる本番。
        // 「言わなかった」付近まで遅らせる。
        if (
            phraseProgress >= this.collapseProgress.now
        ) {
            snapshot.collapsePrepTriggered = true;
            snapshot.collapseTriggered = true;
            snapshot.moveMode = 'collapseNow';
            return;
        }

        // 立ち止まり準備。
        if (
            phraseProgress >= this.collapseProgress.prep
        ) {
            snapshot.collapsePrepTriggered = true;
            snapshot.moveMode = 'collapsePrep';
        }
    }

    resolvePhaseByProgress(progress) {
        const p =
            typeof progress === 'number' &&
            Number.isFinite(progress)
                ? Math.max(
                    0,
                    Math.min(progress, 1)
                )
                : 0;

        if (p < 0.2) {
            return 'intro';
        }

        if (p < 0.4) {
            return 'midCyber';
        }

        if (p < 0.6) {
            return 'midIndigo';
        }

        if (p < 0.85) {
            return 'lastChorus';
        }

        return 'dawn';
    }

    applySnapshot(snapshot) {
        if (!snapshot) {
            return;
        }

        this.applyWorldPhase(snapshot);
        this.applyPlacement(snapshot);
        this.applyMikuMode(snapshot);
        this.applyBlueNoteSnapshot(snapshot);
    }

    applyWorldPhase(snapshot) {
        if (!this.worldRenderer) {
            return;
        }

        this.worldRenderer.currentPhase =
            snapshot.phase || 'intro';

        this.worldRenderer.environmentLerpSpeed = 0.12;
    }

    applyPlacement(snapshot) {
        if (!snapshot.placementUnlocked) {
            return;
        }

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

    applyMikuMode(snapshot) {
        if (!this.worldRenderer) {
            return;
        }

        const characterManager =
            this.worldRenderer.characterManager;

        if (
            characterManager &&
            typeof characterManager.forceSetMoveMode === 'function'
        ) {
            characterManager.forceSetMoveMode(
                snapshot.moveMode
            );

            return;
        }

        if (
            typeof this.worldRenderer.setMikuMoveMode === 'function'
        ) {
            this.worldRenderer.setMikuMoveMode(
                snapshot.moveMode
            );
        }
    }

    applyBlueNoteSnapshot(snapshot) {
        if (!snapshot.hikariNoteTriggered) {
            return;
        }

        if (!this.worldRenderer) {
            return;
        }

        if (
            typeof this.worldRenderer.triggerBlueNoteOnly === 'function'
        ) {
            this.worldRenderer.triggerBlueNoteOnly();
        }
    }
}