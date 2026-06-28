/**
 * 歌詞分割クラス
 * ・長い歌詞を自然に分割する
 * ・意味・区切り・安全位置を考慮
 */
export class LyricSplitter {
    constructor(options = {}) {
        // 自動分割を開始する長さ
        this.maxLengthBeforeSplit =
            options.maxLengthBeforeSplit ?? 22;

        // 大まかな分割サイズ（目安）
        this.chunkSize =
            options.chunkSize ?? 11;

        // 末尾が短すぎるのを防ぐ最小長
        this.minTailLength =
            options.minTailLength ?? 3;
    }

    /**
     * メイン分割処理
     */
    split(text) {
        if (!text) return [];

        // 空白・全角空白除去
        const normalizedText =
            String(text)
                .replace(/\s+/g, '')
                .replace(/　+/g, '')
                .trim();

        if (!normalizedText) {
            return [];
        }

        // 特定フレーズの強制分割（後半用）
        const fixedParts =
            this.splitByKnownLateActPhrases(
                normalizedText
            );

        if (fixedParts) {
            return fixedParts;
        }

        // 句読点ベース分割
        const punctuationParts =
            this.splitByNaturalPunctuation(
                normalizedText
            );

        const finalParts = [];

        punctuationParts.forEach(part => {
            if (!part) return;

            const trimmedPart =
                part.trim();

            if (!trimmedPart) return;

            // 短いならそのまま
            if (
                trimmedPart.length <=
                this.maxLengthBeforeSplit
            ) {
                finalParts.push(trimmedPart);
                return;
            }

            // 意味区切りで分割
            const semanticParts =
                this.splitBySemanticBreaks(
                    trimmedPart
                );

            semanticParts.forEach(semanticPart => {
                if (!semanticPart) return;

                if (
                    semanticPart.length <=
                    this.maxLengthBeforeSplit
                ) {
                    finalParts.push(semanticPart);
                    return;
                }

                // それでも長い場合は安全分割
                this.splitLongTextSafely(
                    semanticPart
                ).forEach(chunk => {
                    finalParts.push(chunk);
                });
            });
        });

        // 空削除して返す
        return finalParts.filter(part => {
            return part.trim() !== '';
        });
    }

    /**
     * 特定フレーズ（終盤演出用）の固定分割
     */
    splitByKnownLateActPhrases(text) {
        if (!text) {
            return null;
        }

        // 歩行ループ
        if (
            text.includes('ちょっと進んで止まってを繰り返して') &&
            text.includes('この場所に立っている')
        ) {
            return [
                'ちょっと進んで',
                '止まってを繰り返して',
                'この場所に立っている'
            ];
        }

        // 未来
        if (
            text.includes('これは私のミライ') &&
            text.includes('あなたのミライを創ったコエ')
        ) {
            return [
                'これは私のミライ',
                'あなたのミライを創ったコエ'
            ];
        }

        // 木霊
        if (
            text.includes('この先もずっとコエは木霊して')
        ) {
            return [
                'この先もずっと',
                'コエは木霊して'
            ];
        }

        // 最終音楽
        if (
            text.includes('このセカイで最後のオンガクになるから')
        ) {
            return [
                'このセカイで',
                '最後のオンガクになるから！'
            ];
        }

        return null;
    }

    /**
     * 句読点による自然分割
     */
    splitByNaturalPunctuation(text) {
        return String(text)
            // 区切り文字の直後で分割
            .split(/(?<=、|。|？|！|\?|!|」|』|\))/);
    }

    /**
     * 意味ベースで分割
     */
    splitBySemanticBreaks(text) {
        if (!text) return [];

        // 分割トリガーキーワード
        const breakPatterns = [
            'そして',
            'けれど',
            'だけど',
            'だから',
            'なのに',
            'それは',
            'これは',
            'この先も',
            'あなたの',
            '私の'
        ];

        let parts = [text];

        breakPatterns.forEach(pattern => {
            const nextParts = [];

            parts.forEach(part => {
                // 短い or 該当しない場合はそのまま
                if (
                    part.length <= this.maxLengthBeforeSplit ||
                    !part.includes(pattern)
                ) {
                    nextParts.push(part);
                    return;
                }

                // キーワードを保持したまま分割
                const splitParts =
                    this.splitKeepingKeyword(
                        part,
                        pattern
                    );

                nextParts.push(...splitParts);
            });

            parts = nextParts;
        });

        return parts;
    }

    /**
     * キーワードを壊さずに分割
     */
    splitKeepingKeyword(text, keyword) {
        const index =
            text.indexOf(keyword);

        if (index <= 0) {
            return [text];
        }

        const before =
            text.slice(0, index);

        const after =
            text.slice(index);

        // どちらかが短すぎる場合は分割しない
        if (
            before.length < this.minTailLength ||
            after.length < this.minTailLength
        ) {
            return [text];
        }

        return [
            before,
            after
        ];
    }

    /**
     * 長文を安全な位置で分割
     */
    splitLongTextSafely(text) {
        if (!text) return [];

        if (text.length <= this.maxLengthBeforeSplit) {
            return [text];
        }

        const chunks = [];

        let current = String(text);

        // chunkSizeを目安に分割
        while (current.length > this.chunkSize) {
            const splitIndex =
                this.findSafeSplitIndex(
                    current,
                    this.chunkSize
                );

            const head =
                current.slice(0, splitIndex);

            const tail =
                current.slice(splitIndex);

            // 極端な短さを防止
            if (
                head.length < this.minTailLength ||
                tail.length < this.minTailLength
            ) {
                break;
            }

            chunks.push(head);
            current = tail;
        }

        // 残り処理
        if (current) {
            if (
                chunks.length > 0 &&
                current.length < this.minTailLength
            ) {
                // 最後に結合
                chunks[chunks.length - 1] += current;
            } else {
                chunks.push(current);
            }
        }

        return chunks;
    }

    /**
     * 安全な分割位置を探す
     * ・句読点や助詞の近くを優先
     */
    findSafeSplitIndex(text, preferredIndex) {
        const safeChars = [
            '、','。','？','！',
            ',','.','?','!',
            'で','に','を','が','は','と',
            'から','まで',
            'て','た','だ','の','も'
        ];

        const searchStart =
            Math.max(
                this.minTailLength,
                preferredIndex - 6
            );

        const searchEnd =
            Math.min(
                text.length - this.minTailLength,
                preferredIndex + 6
            );

        // 近い位置から優先的に探索
        for (let i = searchEnd; i >= searchStart; i--) {
            const before =
                text.slice(0, i);

            const after =
                text.slice(i);

            if (
                before.length < this.minTailLength ||
                after.length < this.minTailLength
            ) {
                continue;
            }

            const prevChar =
                text[i - 1];

            const nextChar =
                text[i];

            // 分割に適した位置
            if (
                safeChars.includes(prevChar) ||
                safeChars.includes(nextChar)
            ) {
                return i;
            }
        }

        // fallback（強制分割）
        return Math.min(
            preferredIndex,
            text.length - this.minTailLength
        );
    }
}