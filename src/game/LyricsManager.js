/**
 * LyricsManager
 *
 * フレーズの流れ:
 *   1. フレーズ開始 → 白テキストで表示
 *   2. 次フレーズ開始の FALL_AHEAD_MS 前 → 表示文字がオレンジに変わり落下
 *   3. 次フレーズ開始 → 新テキストを白で表示
 */
export class LyricsManager {
    static FALL_SPEED_MIN      = 0.00010;
    static FALL_SPEED_MAX      = 0.00022;
    static WORD_SIZE_RATIO     = 0.048;
    static MAX_DISPLAY_PHRASES = 2;
    static PHRASE_LINGER_MS    = 8000;
    // 次フレーズ開始の何ms前に落下を開始するか
    static FALL_AHEAD_MS       = 600;

    constructor() {
        this._phrases        = [];
        this._fallingChars   = [];
        this._score          = 0;
        this._processed      = new Set();
        this._fallingQueued  = new Set(); // 落下処理済みフレーズ
        this._isFinished     = false;
        this._displayPhrases = []; // { text, addedAt, alpha, startTime, endTime }
    }

    setPhrases(phrases) {
        this._phrases = phrases;
        console.log('[LyricsManager] Phrases set:', phrases.length);
    }

    update(position, deltaMs, canvasW, canvasH) {
        this._checkNewPhrases(position, canvasW, canvasH);
        this._checkFallTrigger(position, canvasW, canvasH);
        this._updateDisplayPhrases(position);
        this._updateFallingChars(deltaMs, canvasH);
    }

    checkHit(charX, charY, charW, charH) {
        let hits = 0;
        this._fallingChars = this._fallingChars.filter(fc => {
            const hw = fc.w / 2;
            const hh = fc.h / 2;
            const hit =
                charX < fc.x + hw && charX + charW > fc.x - hw &&
                charY < fc.y + hh && charY + charH > fc.y - hh;
            if (hit) { this._score++; hits++; }
            return !hit;
        });
        return hits;
    }

    getScore()    { return this._score; }
    setFinished() { this._isFinished = true; }

    getState() {
        return {
            displayPhrases: this._displayPhrases,
            fallingChars:   this._fallingChars,
            score:          this._score,
            isFinished:     this._isFinished,
        };
    }

    // ─── 内部 ─────────────────────────────────────────────────

    _checkNewPhrases(position, canvasW, canvasH) {
        for (const phrase of this._phrases) {
            if (this._processed.has(phrase.startTime)) continue;
            if (position < phrase.startTime)           continue;

            this._processed.add(phrase.startTime);

            const text = this._getPhraseText(phrase);
            if (!text.trim()) continue;

            console.log('[LyricsManager] Phrase:', text.slice(0, 20));

            // 次のフレーズの startTime を探す
            const idx      = this._phrases.indexOf(phrase);
            const nextPhrase = this._phrases[idx + 1];
            const endTime  = nextPhrase?.startTime
                ?? (phrase.endTime || phrase.startTime + 4000);

            this._displayPhrases.push({
                text,
                addedAt:   position,
                alpha:     0,
                startTime: phrase.startTime,
                endTime,
                falling:   false, // 落下開始済みフラグ
            });

            if (this._displayPhrases.length > LyricsManager.MAX_DISPLAY_PHRASES) {
                this._displayPhrases.shift();
            }
        }
    }

    /**
     * 次フレーズ開始の FALL_AHEAD_MS 前になったら落下を開始する
     */
    _checkFallTrigger(position, canvasW, canvasH) {
        for (const p of this._displayPhrases) {
            if (p.falling) continue;
            const timeToEnd = p.endTime - position;
            if (timeToEnd <= LyricsManager.FALL_AHEAD_MS) {
                p.falling = true;
                this._spawnFallingChars(p, canvasW, canvasH);
                p.text = ''; // 表示から消す
            }
        }
    }

    /**
     * フレーズの表示文字を位置付きで落下させる
     */
    _spawnFallingChars(phrase, canvasW, canvasH) {
        const fontSize   = canvasH * LyricsManager.WORD_SIZE_RATIO;
        const charW      = fontSize * 0.92;
        const areaTopY   = canvasH * 0.04;
        const lineHeight = fontSize * 1.6;
        const centerX    = canvasW * 0.5;

        // このフレーズが何番目かを調べる
        const pi     = this._displayPhrases.indexOf(phrase);
        const lineY  = areaTopY + pi * lineHeight + fontSize * 0.5;
        const chars  = [...phrase.text].filter(c => c.trim());
        const totalW = chars.length * charW;
        const startX = centerX - totalW / 2;

        for (let ci = 0; ci < chars.length; ci++) {
            this._fallingChars.push({
                text:  chars[ci],
                x:     startX + ci * charW + charW / 2,
                y:     lineY,
                startY: lineY,
                speed: LyricsManager.FALL_SPEED_MIN +
                       Math.random() * (LyricsManager.FALL_SPEED_MAX - LyricsManager.FALL_SPEED_MIN),
                w:     charW,
                h:     fontSize * 1.2,
                fallProgress: 0,
            });
        }
    }

    _updateDisplayPhrases(position) {
        this._displayPhrases = this._displayPhrases.filter(
            p => position - p.addedAt < LyricsManager.PHRASE_LINGER_MS
        );
        for (const p of this._displayPhrases) {
            p.alpha = Math.min(1, p.alpha + 0.08);
        }
    }

    _updateFallingChars(deltaMs, canvasH) {
        const groundPx = canvasH * 0.80; // 地面より下には行かせない
        this._fallingChars = this._fallingChars.filter(fc => {
            fc.y            += fc.speed * deltaMs * canvasH;
            fc.fallProgress  = Math.min(1, Math.max(0, fc.y / canvasH));
            return fc.y < groundPx;      // 地面に達したら消える
        });
    }

    // ─── テキスト取得 ─────────────────────────────────────────

    _getPhraseText(phrase) {
        if (typeof phrase.text === 'string' && phrase.text.trim()) {
            return phrase.text.trim();
        }
        try {
            let t = '';
            if (Array.isArray(phrase.words) && phrase.words.length > 0) {
                for (const w of phrase.words) t += this._getWordText(w);
                if (t.trim()) return t.trim();
            }
            if (phrase.firstWord) {
                let w = phrase.firstWord;
                while (w) { t += this._getWordText(w); w = w.next; }
                if (t.trim()) return t.trim();
            }
        } catch (e) { /* ignore */ }
        return '';
    }

    _getWordText(word) {
        try {
            let t = '';
            if (Array.isArray(word.chars)) {
                for (const c of word.chars) t += c.text || '';
            } else if (word.firstChar) {
                let c = word.firstChar;
                while (c) { t += c.text || ''; c = c.next; }
            }
            return t;
        } catch (e) { return ''; }
    }
}