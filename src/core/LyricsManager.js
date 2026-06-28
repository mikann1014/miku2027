import { LyricSplitter } from '../lyrics/LyricSplitter.js';
import { LyricRainEffect } from '../effects/LyricRainEffect.js';
import { LyricAttractEffect } from '../effects/LyricAttractEffect.js';

/**
 * LyricsManager
 * 歌詞の生成・出現・演出・吸引をまとめて管理するクラス
 */
export class LyricsManager {
    constructor(scene, spawnManager) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        // 歌詞分割
        this.lyricSplitter = new LyricSplitter();

        // 落下・漂い表示エフェクト
        this.lyricRainEffect = new LyricRainEffect(this.scene, {
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
        });

        // 吸引（集約）エフェクト
        this.lyricAttractEffect = new LyricAttractEffect(this.scene, {
            duration: 2.4
        });

        // 出現待ちの歌詞
        this.pendingPhrases = [];

        // 最大保持数
        this.MAX_PHRASES = 80;

        // 文字ごとの遅延
        this.delayPerChar = 120;

        // 最後の吸引ターゲット位置
        this.lastAttractTargetPosition = null;

        // 特殊演出フラグ
        this.rebirthSeedWordsShown = false;
        this.rebirthGatherStarted = false;

        this.enabled = false;
    }

    /**
     * 歌詞追加
     */
    addPhrase(phrase, currentTime, mikuPos, camera) {
        if (!phrase || !phrase.text) return;
        if (phrase._generated) return;
        if (!camera) return;

        phrase._generated = true;

        const text = String(phrase.text || '');

        // 特殊歌詞（コーラス種）
        if (this.isRebirthSeedWordsLyric(text)) {
            this.scheduleRebirthSeedWords(currentTime, phrase);
            return;
        }

        // 通常歌詞は分割して順番に出す
        const parts = this.lyricSplitter.split(text);

        let accumulatedDelay = 0;

        parts.forEach(part => {
            const delay = part.length * this.delayPerChar;

            this.pendingPhrases.push({
                text: part,
                spawnTime: currentTime + accumulatedDelay,
                mode: 'normal'
            });

            accumulatedDelay += delay;
        });

        this.trimPendingPhrases();
    }

    /**
     * 特殊歌詞判定
     */
    isRebirthSeedWordsLyric(text) {
        const normalized = String(text || '')
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

    /**
     * 特殊歌詞スケジュール
     */
    scheduleRebirthSeedWords(currentTime, phrase = null) {
        if (this.rebirthSeedWordsShown) return;

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

        const duration = endTime - startTime;
        const interval = duration / words.length;

        words.forEach((word, index) => {
            this.pendingPhrases.push({
                text: word,
                spawnTime: startTime + index * interval,
                mode: 'nearCenterSeed',
                index
            });
        });

        this.trimPendingPhrases();

        console.log('[LyricsManager] Rebirth seed scheduled', {
            startTime,
            endTime,
            interval
        });
    }

    /**
     * 前面表示強制
     */
    forceLyricsInFront() {
        const apply = object => {
            if (!object) return;

            object.renderOrder = 9999;
            object.frustumCulled = false;

            const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];

            materials.forEach(m => {
                if (!m) return;

                m.transparent = true;
                m.depthTest = false;
                m.depthWrite = false;
                m.needsUpdate = true;
            });
        };

        this.lyricRainEffect?.group?.traverse?.(apply);
        this.lyricAttractEffect?.group?.traverse?.(apply);
    }

    /**
     * 更新処理
     */
    update(camera, currentTime) {
        if (!this.enabled) return;

        this.updatePendingPhrases(camera, currentTime);

        if (this.lyricRainEffect?.update) {
            this.lyricRainEffect.update(camera);
        }

        if (this.lyricAttractEffect?.update) {
            this.lyricAttractEffect.update(0.016, camera);
        }

        this.forceLyricsInFront();
    }

    /**
     * 出現待ち歌詞処理
     */
    updatePendingPhrases(camera, currentTime) {
        if (!camera) return;

        this.pendingPhrases =
            this.pendingPhrases.filter(pending => {
                if (currentTime < pending.spawnTime) {
                    return true;
                }

                // 中央付近種
                if (pending.mode === 'nearCenterSeed') {
                    if (this.lyricRainEffect?.spawnAttractSeed) {
                        this.lyricRainEffect.spawnAttractSeed(
                            pending.text,
                            camera,
                            {
                                placement: 'nearCenter',
                                index: pending.index ?? 0
                            }
                        );
                    } else {
                        this.lyricRainEffect.spawn(
                            pending.text,
                            camera
                        );
                    }

                    return false;
                }

                // 集約開始トリガー
                if (pending.mode === 'startGather') {
                    this.startLyricAttract(
                        this.lastAttractTargetPosition
                    );
                    return false;
                }

                // 通常生成
                this.lyricRainEffect.spawn(
                    pending.text,
                    camera
                );

                return false;
            });
    }

    /**
     * コーラス集約シーケンス開始
     */
    startRebirthLyricGatherSequence(targetPosition, camera, currentTime = 0) {
        if (!targetPosition || !camera) return;
        if (this.rebirthGatherStarted) return;

        this.rebirthGatherStarted = true;

        this.lastAttractTargetPosition = targetPosition.clone();

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
    }

    /**
     * 吸引開始
     */
    startLyricAttract(targetPosition, onCompleted = null) {
        if (!targetPosition) return;
        if (!this.lyricRainEffect) return;

        let phrases = [];

        if (this.lyricRainEffect.getAttractSeedPhraseObjects) {
            phrases =
                this.lyricRainEffect.getAttractSeedPhraseObjects();
        }

        this.lastAttractTargetPosition = targetPosition.clone();

        this.lyricAttractEffect?.start?.(
            phrases,
            targetPosition,
            onCompleted
        );

        console.log(`[LyricsManager] attract started: ${phrases.length}`);
    }

    /**
     * 吸引強制完了
     */
    forceCompleteAttractBeforeReveal() {
        this.lyricAttractEffect?.finishAndHide?.();
    }

    /**
     * 吸引後クリア
     */
    clearAttractedLyrics() {
        const effect = this.lyricAttractEffect;
        if (!effect) return;

        effect.phrases.forEach(entry => {
            if (!entry.phrase) return;

            this.lyricRainEffect?.removePhraseObject?.(entry.phrase);
        });

        effect.clear();
    }

    /**
     * 最後の吸引位置取得
     */
    getLastAttractTargetPosition() {
        return this.lastAttractTargetPosition
            ? this.lastAttractTargetPosition.clone()
            : null;
    }

    /**
     * pending削減
     */
    trimPendingPhrases() {
        if (this.pendingPhrases.length <= this.MAX_PHRASES) {
            return;
        }

        this.pendingPhrases =
            this.pendingPhrases.slice(
                -this.MAX_PHRASES
            );
    }

    /**
     * 有効化制御
     */
    setEnabled(enabled, currentTime = 0) {
        const wasEnabled = this.enabled;

        this.enabled = !!enabled;

        if (this.enabled && !wasEnabled) {
            if (!currentTime || currentTime <= 0) {
                currentTime = 0;
            }

            let offset = 0;

            this.pendingPhrases.forEach(p => {
                p.spawnTime = currentTime + offset;

                if (p.mode === 'nearCenterSeed') {
                    offset += 120;
                } else {
                    offset += Math.max(
                        120,
                        String(p.text || '').length * 80
                    );
                }
            });
        }

        console.log(
            `[LyricsManager] ${this.enabled ? 'enabled' : 'disabled'}`
        );
    }

    /**
     * 初期化
     */
    clear() {
        this.pendingPhrases = [];

        this.lyricRainEffect?.clear?.();
        this.lyricAttractEffect?.clear?.();

        this.lastAttractTargetPosition = null;

        this.rebirthSeedWordsShown = false;
        this.rebirthGatherStarted = false;
    }
}