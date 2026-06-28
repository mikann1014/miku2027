import { LyricSplitter } from '../lyrics/LyricSplitter.js';
import { LyricRainEffect } from '../effects/LyricRainEffect.js';
import { LyricAttractEffect } from '../effects/LyricAttractEffect.js';

export class LyricsManager {
    constructor(scene, spawnManager) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        this.lyricSplitter = new LyricSplitter();

        this.lyricRainEffect = new LyricRainEffect(
            this.scene,
            {
                spawnDistance: 38,
                verticalOffset: 9.8,
                horizontalSpread: 9.5,
                verticalSpread: 3.2,

                fontSize: 58,
                lineHeight: 76,
                planeWidth: 12.2,

                maxTextWidth: 920,
                minCanvasWidth: 720,
                maxCanvasWidth: 1280,

                driftSpeed: 0.016,
                riseSpeed: 0.005,
                lifeIncrease: 0.0056,

                minOpacity: 0.0
            }
        );

        this.lyricAttractEffect =
            new LyricAttractEffect(
                this.scene,
                {
                    duration: 2.4
                }
            );

        this.pendingPhrases = [];

        this.MAX_PHRASES = 80;
        this.delayPerChar = 120;

        this.lastAttractTargetPosition = null;

        this.rebirthSeedWordsShown = false;
        this.rebirthGatherStarted = false;

        this.enabled = false;
    }

    addPhrase(phrase, currentTime, mikuPos, camera) {

        if (!phrase || !phrase.text) {
            return;
        }

        if (phrase._generated) {
            return;
        }

        if (!camera) {
            return;
        }

        phrase._generated = true;

        const text =
            String(phrase.text || '');

        // =========================
        // カナシミも、クルシミも、キズも、イラダチも、サミシサも、
        //
        // 通常表示しない。
        // 一塊で表示しない。
        // 単語ごとに中心付近へ順番に出す。
        // 霧散しない。
        // 横に漂い続ける。
        // 後で中央に集める対象にする。
        // =========================
        if (this.isRebirthSeedWordsLyric(text)) {
    this.scheduleRebirthSeedWords(
        currentTime,
        phrase
    );

    return;
}

        // =========================
        // 悲しみから寂しさが終わり、
        // あなたの全てを受け止められたのは
        //
        // これは通常歌詞表示に戻す。
        // ここでは抑制しない。
        // =========================
        const parts =
            this.lyricSplitter.split(
                text
            );

        let accumulatedDelay = 0;

        parts.forEach(part => {
            const delay =
                part.length * this.delayPerChar;

            this.pendingPhrases.push({
                text: part,
                spawnTime: currentTime + accumulatedDelay,
                mode: 'normal'
            });

            accumulatedDelay += delay;
        });

        this.trimPendingPhrases();
    }

    isRebirthSeedWordsLyric(text) {
        const normalized =
            String(text || '')
                .replace(/\s/g, '')
                .replace(/　/g, '');

        return (
            normalized.includes('カナシミも') &&
            normalized.includes('クルシミも') &&
            normalized.includes('キズも') &&
            normalized.includes('イラダチも') &&
            normalized.includes('サミシサも')
        );
    }

scheduleRebirthSeedWords(currentTime, phrase = null) {
    if (this.rebirthSeedWordsShown) {
        return;
    }

    this.rebirthSeedWordsShown = true;

    const words = [
        'カナシミも',
        'クルシミも',
        'キズも',
        'イラダチも',
        'サミシサも'
    ];

    const startTime =
        typeof phrase?.startTime === 'number'
            ? phrase.startTime
            : currentTime;

    const endTime =
        typeof phrase?.endTime === 'number' &&
        phrase.endTime > startTime
            ? phrase.endTime
            : startTime + 2600;

    const duration =
        endTime - startTime;

    const interval =
        duration / words.length;

    words.forEach((word, index) => {
        this.pendingPhrases.push({
            text: word,
            spawnTime: startTime + index * interval,
            mode: 'nearCenterSeed',
            index
        });
    });

    this.trimPendingPhrases?.();

    console.log(
        '[LyricsManager] Rebirth seed words scheduled separately.',
        {
            startTime,
            endTime,
            interval
        }
    );
}

forceLyricsInFront() {
    const applyToObject = object => {
        if (!object) {
            return;
        }

        object.renderOrder = 9999;
        object.frustumCulled = false;

        const materials = [];

        if (object.material) {
            if (Array.isArray(object.material)) {
                materials.push(...object.material);
            } else {
                materials.push(object.material);
            }
        }

        materials.forEach(material => {
            if (!material) {
                return;
            }

            material.transparent = true;
            material.depthTest = false;
            material.depthWrite = false;
            material.needsUpdate = true;
        });
    };

    if (this.lyricRainEffect?.group) {
        this.lyricRainEffect.group.traverse(
            applyToObject
        );
    }

    if (this.lyricAttractEffect?.group) {
        this.lyricAttractEffect.group.traverse(
            applyToObject
        );
    }
}

   
update(camera, currentTime) {
    if (!this.enabled) {
        return;
    }

    this.updatePendingPhrases(
        camera,
        currentTime
    );

    if (
        this.lyricRainEffect &&
        typeof this.lyricRainEffect.update === 'function'
    ) {
        this.lyricRainEffect.update(
            camera
        );
    }

    if (
        this.lyricAttractEffect &&
        typeof this.lyricAttractEffect.update === 'function'
    ) {
        this.lyricAttractEffect.update(
            0.016,
            camera
        );
    }

    this.forceLyricsInFront();
}

    

    updatePendingPhrases(camera, currentTime) {
        if (!camera) {
            return;
        }

        this.pendingPhrases =
            this.pendingPhrases.filter(pending => {
                if (currentTime < pending.spawnTime) {
                    return true;
                }

                if (pending.mode === 'nearCenterSeed') {
                    if (
                        this.lyricRainEffect &&
                        typeof this.lyricRainEffect.spawnAttractSeed === 'function'
                    ) {
                        this.lyricRainEffect.spawnAttractSeed(
                            pending.text,
                            camera,
                            {
                                placement: 'nearCenter',
                                index: pending.index ?? 0
                            }
                        );
                    } else {
                        console.warn(
                            '[LyricsManager] spawnAttractSeed is not implemented. Falling back to normal spawn.'
                        );

                        this.lyricRainEffect.spawn(
                            pending.text,
                            camera
                        );
                    }

                    return false;
                }

                if (pending.mode === 'startGather') {
                    this.startLyricAttract(
                        this.lastAttractTargetPosition
                    );

                    return false;
                }

                this.lyricRainEffect.spawn(
                    pending.text,
                    camera
                );

                return false;
            });
    }

   startRebirthLyricGatherSequence(targetPosition, camera, currentTime = 0) {
    if (!targetPosition || !camera) {
        return;
    }

    if (this.rebirthGatherStarted) {
        return;
    }

    this.rebirthGatherStarted = true;

    this.lastAttractTargetPosition =
        targetPosition.clone();

    // まだ出現待ちのコーラス単語がある場合は、
    // すぐ出し切ってから集め始める。
    let acceleratedIndex = 0;

    this.pendingPhrases.forEach(pending => {
        if (
            pending.mode === 'nearCenterSeed' &&
            pending.spawnTime > currentTime
        ) {
            pending.spawnTime =
                currentTime + acceleratedIndex * 90;

            acceleratedIndex++;
        }
    });

    const gatherDelay =
        acceleratedIndex > 0
            ? acceleratedIndex * 90 + 160
            : 120;

    this.pendingPhrases.push({
        text: '__START_REBIRTH_GATHER__',
        spawnTime: currentTime + gatherDelay,
        mode: 'startGather'
    });

    this.trimPendingPhrases();

    console.log(
        '[LyricsManager] Rebirth chorus-only gather scheduled with slower spiral.'
    );
}

    startLyricAttract(targetPosition, onCompleted = null) {
        if (!targetPosition) {
            return;
        }

        if (!this.lyricRainEffect) {
            return;
        }

        let phrases = [];

        if (
            typeof this.lyricRainEffect.getAttractSeedPhraseObjects === 'function'
        ) {
            phrases =
                this.lyricRainEffect.getAttractSeedPhraseObjects();
        } else {
            console.warn(
                '[LyricsManager] getAttractSeedPhraseObjects is not implemented.'
            );
        }

        this.lastAttractTargetPosition =
            targetPosition.clone();

        if (
            this.lyricAttractEffect &&
            typeof this.lyricAttractEffect.start === 'function'
        ) {
            this.lyricAttractEffect.start(
                phrases,
                targetPosition,
                onCompleted
            );
        }

        console.log(
            `[LyricsManager] Chorus words attract started. targets=${phrases.length}`
        );
    }

    forceCompleteAttractBeforeReveal() {
        if (
            this.lyricAttractEffect &&
            typeof this.lyricAttractEffect.finishAndHide === 'function'
        ) {
            this.lyricAttractEffect.finishAndHide();
        }
    }

    clearAttractedLyrics() {
        const attractEffect =
            this.lyricAttractEffect;

        if (!attractEffect) {
            return;
        }

        attractEffect.phrases.forEach(entry => {
            if (!entry.phrase) {
                return;
            }

            if (
                this.lyricRainEffect &&
                typeof this.lyricRainEffect.removePhraseObject === 'function'
            ) {
                this.lyricRainEffect.removePhraseObject(
                    entry.phrase
                );
            }
        });

        attractEffect.clear();
    }

    getLastAttractTargetPosition() {
        return this.lastAttractTargetPosition
            ? this.lastAttractTargetPosition.clone()
            : null;
    }

    trimPendingPhrases() {
        if (
            this.pendingPhrases.length <=
            this.MAX_PHRASES
        ) {
            return;
        }

        this.pendingPhrases =
            this.pendingPhrases.slice(
                -this.MAX_PHRASES
            );
    }

    setEnabled(enabled, currentTime = 0) {
    const wasEnabled = this.enabled;

    this.enabled = !!enabled;

    if (this.enabled && !wasEnabled) {
        // ✅ currentTimeが無い場合の保険
        if (!currentTime || currentTime <= 0) {
           currentTime = 0
        }

        let offset = 0;

        this.pendingPhrases.forEach(pending => {

            pending.spawnTime = currentTime + offset;

            if (pending.mode === 'nearCenterSeed') {
                offset += 120;
            } else {
                offset += Math.max(
                    120,
                    String(pending.text || '').length * 80
                );
            }
        });

        console.log('[LyricsManager] pending rebased', {
            currentTime,
            count: this.pendingPhrases.length
        });
    }

    console.log(
        `[LyricsManager] ${this.enabled ? 'enabled' : 'disabled'}`
    );
}
    clear() {
        this.pendingPhrases = [];

        if (
            this.lyricRainEffect &&
            typeof this.lyricRainEffect.clear === 'function'
        ) {
            this.lyricRainEffect.clear();
        }

        if (
            this.lyricAttractEffect &&
            typeof this.lyricAttractEffect.clear === 'function'
        ) {
            this.lyricAttractEffect.clear();
        }

        this.lastAttractTargetPosition = null;

        this.rebirthSeedWordsShown = false;
        this.rebirthGatherStarted = false;
    }
}