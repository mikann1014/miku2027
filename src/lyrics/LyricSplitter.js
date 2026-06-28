export class LyricSplitter {
    constructor(options = {}) {
        // 長すぎる歌詞を自然に分ける。
        this.maxLengthBeforeSplit =
            options.maxLengthBeforeSplit ?? 22;

        this.chunkSize =
            options.chunkSize ?? 11;

        this.minTailLength =
            options.minTailLength ?? 3;
    }

    split(text) {
        if (!text) return [];

        const normalizedText =
            String(text)
                .replace(/\s+/g, '')
                .replace(/　+/g, '')
                .trim();

        if (!normalizedText) {
            return [];
        }

        const fixedParts =
            this.splitByKnownLateActPhrases(
                normalizedText
            );

        if (fixedParts) {
            return fixedParts;
        }

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

            if (
                trimmedPart.length <=
                this.maxLengthBeforeSplit
            ) {
                finalParts.push(trimmedPart);
                return;
            }

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

                this.splitLongTextSafely(
                    semanticPart
                ).forEach(chunk => {
                    finalParts.push(chunk);
                });
            });
        });

        return finalParts.filter(part => {
            return part.trim() !== '';
        });
    }

    splitByKnownLateActPhrases(text) {
        if (!text) {
            return null;
        }

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

        if (
            text.includes('これは私のミライ') &&
            text.includes('あなたのミライを創ったコエ')
        ) {
            return [
                'これは私のミライ',
                'あなたのミライを創ったコエ'
            ];
        }

        if (
            text.includes('この先もずっとコエは木霊して')
        ) {
            return [
                'この先もずっと',
                'コエは木霊して'
            ];
        }

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

    splitByNaturalPunctuation(text) {
        return String(text)
            .split(/(?<=、|。|？|！|\?|!|」|』|\))/);
    }

    splitBySemanticBreaks(text) {
        if (!text) return [];

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
                if (
                    part.length <= this.maxLengthBeforeSplit ||
                    !part.includes(pattern)
                ) {
                    nextParts.push(part);
                    return;
                }

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

    splitLongTextSafely(text) {
        if (!text) return [];

        if (text.length <= this.maxLengthBeforeSplit) {
            return [text];
        }

        const chunks = [];

        let current = String(text);

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

            if (
                head.length < this.minTailLength ||
                tail.length < this.minTailLength
            ) {
                break;
            }

            chunks.push(head);
            current = tail;
        }

        if (current) {
            if (
                chunks.length > 0 &&
                current.length < this.minTailLength
            ) {
                chunks[chunks.length - 1] += current;
            } else {
                chunks.push(current);
            }
        }

        return chunks;
    }

    findSafeSplitIndex(text, preferredIndex) {
        const safeChars = [
            '、',
            '。',
            '？',
            '！',
            ',',
            '.',
            '?',
            '!',
            'で',
            'に',
            'を',
            'が',
            'は',
            'と',
            'から',
            'まで',
            'て',
            'た',
            'だ',
            'の',
            'も'
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

            if (
                safeChars.includes(prevChar) ||
                safeChars.includes(nextChar)
            ) {
                return i;
            }
        }

        return Math.min(
            preferredIndex,
            text.length - this.minTailLength
        );
    }
}